// MC-18 a MC-21 de punta a punta: dos pestañas del juego compilado con VITE_SALAS_URL y VITE_CONVEX_URL contra la
// sala local (wrangler dev) se ven moverse, ven el emote del otro y cambian de sala al viajar. El pase lo firma un
// Convex de mentira (solo `salas:pase` y `tienda:entrar`) con la misma función de @mundo-catrucho/reglas que usa
// el Convex de verdad, y un secreto aleatorio que también recibe la sala. Nada sale de 127.0.0.1.
//   node apps/web/tools/test-salas-vivo.mjs      (capturas en capturas/mc-19/)
// Espera por lo que pasa, no por tiempo. Sin GPU pasa, pero tarda unos 5 min a 2 cuadros por segundo y en GitHub
// (~1 cuadro por segundo) no cabe: con MC_GPU=0 dice SALTA salvo que pongás MC_SALAS_CPU=1 (y MC_LENTO=N si hace falta).
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { createServer as servidorTcp } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firmarPase, SALA } from '@mundo-catrucho/reglas';
import { launch } from './harness.mjs';

if (process.env.MC_GPU === '0' && process.env.MC_SALAS_CPU !== '1') {
  console.log('SALTA salas-vivo: sin GPU no cabe en GitHub; corrélo con GPU o con MC_SALAS_CPU=1');
  process.exit(0);
}
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const capturas = join(raiz, 'capturas/mc-19');
const SECRETO = randomBytes(32).toString('hex');
const GPU = process.env.MC_GPU !== '0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(capturas, { recursive: true });

// ---------------------------------------------------------------- Convex de mentira
const COLORES = { Ana: ['#e63946', '#1b1b1b'], Beto: ['#ffd23f', '#0d47a1'] };
const PERFIL = { monedas: 100, xp: 0, nivel: 1, avatar: {}, comprados: [] };
const pases = [];
const convex = createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    const responder = (o) => res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(o));
    try {
      const { path, args } = JSON.parse(body || '{}');
      const a = args?.[0] ?? {};
      if (path === 'tienda:entrar') return responder({ status: 'success', value: PERFIL });
      if (path === 'salas:pase') {
        const id = createHash('sha256').update(a.invitado).digest('hex').slice(0, 12);
        const [shirtColor, hairColor] = COLORES[a.nombre] ?? ['#17a673', '#1b1b1b'];
        const pase = await firmarPase(
          { id, nombre: a.nombre, sala: a.sala, avatar: { shirtColor, hairColor, hat: 'sin_sombrero' } },
          SECRETO,
        );
        pases.push(a.sala);
        return responder({ status: 'success', value: { ok: true, pase, id } });
      }
      responder({ status: 'error', errorMessage: `sin ${path} en la prueba` });
    } catch (e) {
      responder({ status: 'error', errorMessage: String(e) });
    }
  });
});
await new Promise((r) => convex.listen(0, '127.0.0.1', r));
const PC = convex.address().port;

// ---------------------------------------------------------------- sala local
/** Puertos libres: 8799 puede estar ocupado por `pnpm dev` u otra copia del repo. */
const libre = () =>
  new Promise((res) => {
    const s = servidorTcp().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
const PW = await libre(),
  PI = await libre();
const wrangler = spawn(
  'pnpm',
  ['exec', 'wrangler', 'dev', '--port', String(PW), '--inspector-port', String(PI), '--var', `SALA_SECRETO:${SECRETO}`],
  { cwd: join(raiz, 'workers/salas'), stdio: 'ignore', detached: true },
);
const out = mkdtempSync(join(tmpdir(), 'mc-salas-'));
const pestanas = [],
  bots = [];
const cerrar = async () => {
  for (const b of bots) b.close();
  for (const t of pestanas) await t.close();
  try {
    process.kill(-wrangler.pid, 'SIGKILL');
  } catch {}
  convex.close();
  rmSync(out, { recursive: true, force: true });
};

/** Un jugador de mentira (sin navegador) en una sala, para llenarla. */
async function bot(sala, i, x, z) {
  const pase = await firmarPase(
    { id: `bot${i}`, nombre: `Vecino ${i}`, sala, avatar: { shirtColor: ['#ff7a3d', '#7b2cbf', '#2a9d8f'][i % 3] } },
    SECRETO,
  );
  const ws = new WebSocket(`ws://127.0.0.1:${PW}/sala/${sala}?pase=${encodeURIComponent(pase)}`);
  await new Promise((res, rej) => {
    ws.onmessage = () => res();
    ws.onclose = (e) => rej(new Error(`bot ${i} rechazado (${e.code})`));
  });
  ws.send(JSON.stringify({ t: 'pos', x, y: 0, z, yaw: Math.PI, anim: i % 4 === 0 ? 'dance' : 'idle' }));
  bots.push(ws);
  return ws;
}

let ok = false;
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PW}/`)).ok) break;
    } catch {}
    if (i > 150) throw new Error('wrangler dev no arrancó');
    await sleep(200);
  }
  execFileSync('node', ['apps/web/tools/build.mjs', 'hd', '--out', out], {
    cwd: raiz,
    stdio: 'ignore',
    env: { ...process.env, VITE_SALAS_URL: `http://127.0.0.1:${PW}`, VITE_CONVEX_URL: `http://127.0.0.1:${PC}` },
  });
  const html = join(out, 'mundo-catrucho-hd.html');
  const red = new RegExp(`^(http|ws)://127\\.0\\.0\\.1:(${PW}|${PC})/`);
  const abrir = async (nombre) => {
    const t = await launch(html, { hash: '#test', red, width: 960, height: 600 });
    pestanas.push(t);
    t.nombre = nombre;
    await t.waitFor('!!window.__mc?.store', 30000, 'el juego cargó');
    // contar cuántas posiciones manda (MC-19: 15 por segundo)
    await t.ev(
      `(()=>{const o=WebSocket.prototype.send;window.__envios=[];WebSocket.prototype.send=function(d){if(String(d).includes('"pos"'))window.__envios.push(performance.now());return o.call(this,d)}})()`,
    );
    await t.ev(`window.__mc.store.setState((s) => ({ profile: { ...s.profile, name: '${nombre}' } }))`);
    await t.ev(
      `window.remoto=(id)=>window.__mc.scene.getObjectByName('en-vivo')?.children.find(o=>o.userData.id===id)`,
    );
    await t.ev(`window.__mc.store.getState().enterWorld()`);
    // la primera vez se abre el creador de personaje
    if (await t.exists('ed-done')) await t.click('ed-done');
    await t.waitFor(`!window.__mc.store.getState().panel`, 10000, 'sin paneles');
    return t;
  };
  const sala = (t) => t.ev(`JSON.stringify(window.__mc.sala.getState())`).then(JSON.parse);
  const enSala = (t, nombre, otros, ms = 30000) =>
    t.waitFor(
      `(()=>{const s=window.__mc.sala?.getState();return s&&s.estado==='en-sala'&&s.sala==='${nombre}'&&s.otros===${otros}})()`,
      ms,
      `${t.nombre} en ${nombre} con ${otros} más`,
    );
  /** el avatar remoto de `id` que dibuja la pestaña t: posición en pantalla y si se ve */
  const dibujado = (t, id) =>
    t
      .ev(`(()=>{const o=remoto('${id}');const r=window.__mc.net.players().find(p=>p.id==='${id}');
      return o&&r?JSON.stringify({x:o.position.x,z:o.position.z,visible:o.visible,anim:r.anim,emote:r.emote&&r.emote.id,hijos:o.children.length}):null})()`)
      .then((v) => v && JSON.parse(v));
  const pos = (t) => t.ev('JSON.stringify(window.__mc.player.pos)').then(JSON.parse);
  /** foto limpia: sin avisos ni el título de la zona, con una cámara fija alta que encuadra `centro` */
  const foto = async (t, archivo, centro, lejos = 9, alto = lejos * 0.6) => {
    await t.ev(`(()=>{if(!document.getElementById('foto')){const e=document.createElement('style');e.id='foto';
      e.textContent='[data-testid=hud-banner],[data-testid=toast]{display:none!important}';document.head.append(e)}
      window.__mc.store.setState({toasts:[]});
      window.__mc.player.fixedCam={pos:[${centro[0]},${centro[1] + alto},${centro[2] + lejos}],target:[${centro[0]},${centro[1] + 0.9},${centro[2]}],fov:50}})()`);
    // la cámara llega en unos 20 cuadros (se acerca un 25 % por cuadro)
    await t.waitFor(
      `new Promise(r=>{let n=0;const f=()=>++n>24?r(true):requestAnimationFrame(f);requestAnimationFrame(f)})`,
      60000,
      'cámara en su sitio',
    );
    await t.shot(join(capturas, archivo));
    await t.ev('window.__mc.player.fixedCam=null');
  };
  /** la cámara de `ve` mira a `visto`: lo pone 5 m delante (yaw 0 mira a −Z) */
  const ponerDelante = async (ve, visto, dx = 0) => {
    const p = await pos(ve);
    await visto.ev(`window.__mc.player.teleport(${p[0] + dx}, ${p[1]}, ${p[2] - 5}, Math.PI)`);
    await ve.ev(`window.__mc.player.teleport(${p[0]}, ${p[1]}, ${p[2]}, 0)`);
  };

  // 1. Ana entra al mapa; 22 vecinos llenan casi todo el tramo 0; Beto entra y queda en el mismo tramo (24)
  const ana = await abrir('Ana');
  await enSala(ana, 'mapa:0', 0);
  const pa = await pos(ana);
  for (let i = 0; i < SALA.cupo - 2; i++)
    await bot('mapa:0', i, pa[0] - 6 + (i % 6) * 2.4, pa[2] - 4 - Math.floor(i / 6) * 2.2);
  const beto = await abrir('Beto');
  await enSala(beto, 'mapa:0', SALA.cupo - 1);
  await enSala(ana, 'mapa:0', SALA.cupo - 1);
  const ida = await beto.ev(`window.__mc.net.players().find(p=>p.name==='Ana').id`);
  const idb = await ana.ev(`window.__mc.net.players().find(p=>p.name==='Beto').id`);
  assert.ok(ida && idb && ida !== idb, 'cada pestaña es otro jugador');
  // sin bots simulados en la plaza: la llenan los de verdad
  assert.equal(await beto.ev(`window.__mc.scene.getObjectsByProperty('name','lobby-bot').length`), 0);
  // Beto mira a la multitud: 23 avatares con nombre y menos de ~350 llamadas de dibujo
  await beto.ev(`window.__mc.player.teleport(${pa[0]}, ${pa[1]}, ${pa[2] + 4}, 0)`);
  await beto.waitFor(
    `window.__mc.scene.getObjectByName('en-vivo')?.children.filter(o=>o.visible).length===${SALA.cupo - 1}`,
    30000,
    'Beto dibuja a los 23',
  );
  await beto.waitFor(
    `new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))`,
    10000,
    'dos cuadros',
  );
  const calls = await beto.calls();
  assert.ok(calls.calls < 350, `llamadas de dibujo con 24 en la sala: ${calls.calls}`);
  await foto(beto, '1-mapa-24-jugadores.png', [pa[0], pa[1], pa[2] - 4], 11);
  const llamadas24 = calls.calls;

  // 2. MC-20: Beto sale (juega solo), entra un vecino más y el tramo 0 queda lleno: Beto cae al tramo 1
  await beto.ev(`window.__mc.store.getState().setRoom('solo')`);
  await beto.waitFor(`window.__mc.sala.getState().estado==='apagada'`, 15000, 'Beto juega solo');
  await enSala(ana, 'mapa:0', SALA.cupo - 2);
  await bot('mapa:0', SALA.cupo - 2, pa[0] + 8, pa[2] - 12);
  await enSala(ana, 'mapa:0', SALA.cupo - 1);
  await beto.ev(`window.__mc.store.getState().setRoom('publica')`);
  await enSala(beto, 'mapa:1', 0);
  await beto.ev(`window.__mc.store.getState().openPanel('salas')`);
  await beto.waitFor(`document.querySelector('[data-testid=room-current]')?.innerText.includes('tramo 2')`, 10000);
  await beto.shot(join(capturas, '2-tramo-2.png'));
  await beto.ev(`window.__mc.store.getState().closePanel()`);
  for (const b of bots.splice(0)) b.close();
  await enSala(ana, 'mapa:0', 0);

  // 3. los dos viajan a Olancho: cambian de sala solos y se ven
  for (const t of [ana, beto]) await t.ev(`window.__mc.store.getState().travel('olancho')`);
  await enSala(ana, 'dept:olancho:0', 1);
  await enSala(beto, 'dept:olancho:0', 1);
  await beto.waitFor(
    `window.__mc.store.getState().scene.kind==='dept' && !!window.__mc.scene.getObjectByName('en-vivo')`,
  );
  await sleep(300);
  await ponerDelante(beto, ana, -2);
  await beto.waitFor(
    `(()=>{const r=window.__mc.net.players().find(p=>p.id==='${ida}');return r&&r.listo&&Math.abs(r.pos[0]-(${(await pos(beto))[0] - 2}))<0.5})()`,
    20000,
    'Beto ve a Ana delante',
  );

  // 4. MC-19: Ana camina; manda ~15 posiciones por segundo y Beto la ve moverse suavizada
  const antes = await dibujado(beto, ida);
  await ana.ev('window.__envios.length=0');
  const t0 = Date.now();
  await ana.down('d');
  const trazo = await beto.ev(`new Promise(r=>{const out=[];const o=remoto('${ida}');
    const f=()=>{out.push(o.position.x);
    if(out.length<40)requestAnimationFrame(f);else r(JSON.stringify(out))};requestAnimationFrame(f)})`);
  await ana.up('d');
  const segundos = (Date.now() - t0) / 1000;
  // ritmo medido con las horas de envío de la propia página (no con el reloj de la prueba)
  const envios = JSON.parse(await ana.ev('JSON.stringify(window.__envios)'));
  const xs = JSON.parse(trazo);
  const pasos = xs.slice(1).map((x, i) => Math.abs(x - xs[i]));
  const distintos = new Set(xs.map((x) => x.toFixed(3))).size;
  const hz = envios.length > 1 ? ((envios.length - 1) * 1000) / (envios.at(-1) - envios[0]) : 0;
  assert.ok(segundos > 0 && envios.length > 5, `mandó solo ${envios.length} posiciones al caminar`);
  assert.ok(hz <= SALA.envioHz + 1.5, `manda ${hz.toFixed(1)} por segundo (máximo ${SALA.envioHz})`);
  if (GPU) assert.ok(hz >= SALA.envioHz * 0.7, `manda solo ${hz.toFixed(1)} por segundo`);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 1, `Beto no vio moverse a Ana: ${xs[0]} → ${xs.at(-1)}`);
  // suavizado: cambia de posición en casi todos los cuadros, no a saltos de 15 por segundo
  if (GPU) assert.ok(distintos > 25, `solo ${distintos} posiciones distintas en 40 cuadros`);
  await ana.waitFor(
    `Math.hypot(window.__mc.player.body.vel[0],window.__mc.player.body.vel[2])<0.05`,
    10000,
    'Ana se detiene',
  );
  await beto.waitFor(
    `(()=>{const r=window.__mc.net.players().find(p=>p.id==='${ida}');const p=${JSON.stringify(await pos(ana))};return Math.hypot(r.pos[0]-p[0],r.pos[2]-p[2])<0.2})()`,
    10000,
    'Beto ve a Ana donde se quedó',
  );
  const despues = await dibujado(beto, ida);
  assert.ok(Math.abs(despues.x - antes.x) > 1, 'el avatar remoto se movió');
  // para la foto: lado a lado en un claro (sin nada que choque cerca ni entre ellos y la cámara), mirando a la cámara
  const q = JSON.parse(
    await beto.ev(`(()=>{const {phys,player}=window.__mc;const cs=[...phys.colliders];const p=player.pos;
      const lejos=(x,z)=>cs.every(c=>c.type==='cyl'?Math.hypot(c.x-x,c.z-z)-c.r>2.2:Math.hypot(Math.max(c.min[0]-x,0,x-c.max[0]),Math.max(c.min[2]-z,0,z-c.max[2]))>2.2);
      const plano=(x,z)=>Math.abs(phys.ground(x,z)-phys.ground(x+2.4,z+7))<0.3;
      let mejor=null;
      for(let r=0;r<40&&!mejor;r+=2)for(let a=0;a<16&&!mejor;a++){const x=p[0]+r*Math.cos(a*Math.PI/8),z=p[2]+r*Math.sin(a*Math.PI/8);
        let ok=plano(x,z);for(let dz=0;dz<=7&&ok;dz+=1.5)for(let dx=-1;dx<=3.4&&ok;dx+=1.1)ok=lejos(x+dx,z+dz);if(ok)mejor=[x,phys.ground(x,z),z]}
      return JSON.stringify(mejor??p)})()`),
  );
  await beto.ev(`window.__mc.player.teleport(${q[0] + 2.4}, ${q[1]}, ${q[2]}, Math.PI)`);
  await ana.ev(`window.__mc.player.teleport(${q[0]}, ${q[1]}, ${q[2]}, Math.PI)`);
  await beto.waitFor(
    `(()=>{const r=window.__mc.net.players().find(p=>p.id==='${ida}');return Math.abs(remoto('${ida}').position.x-(${q[0]}))<0.05&&r.listo})()`,
    10000,
    'Beto ve a Ana a su lado',
  );
  await ana.waitFor(`Math.abs(remoto('${idb}').position.x-(${q[0] + 2.4}))<0.05`, 10000, 'Ana ve a Beto a su lado');
  const medio = [q[0] + 1.2, q[1], q[2]];
  await foto(beto, '3-olancho-beto-ve-a-ana.png', medio, 5.5, 1.6);
  await foto(ana, '4-olancho-ana-ve-a-beto.png', medio, 5.5, 1.6);

  // 5. MC-21: Ana saluda desde la rueda de emotes y Beto la ve saludar con la burbuja encima
  await ana.ev(`window.__mc.store.getState().openPanel('emotes')`);
  await ana.click('emote-emote_saludar');
  await beto.waitFor(
    `(()=>{const r=window.__mc.net.players().find(p=>p.id==='${ida}');return r&&r.emote&&r.emote.id==='emote_saludar'&&r.anim==='wave'})()`,
    15000,
    'Beto ve el emote de Ana',
  );
  await beto.waitFor(`remoto('${ida}')?.children.length===3`, 10000, 'burbuja del emote');
  await foto(beto, '5-emote-saludo.png', medio, 6.5, 1.8);

  // 6. Ana entra a un minijuego: sale de la sala y Beto deja de verla
  await ana.ev(`window.__mc.store.getState().startMinigame('corte')`);
  await ana.waitFor(`window.__mc.sala.getState().estado==='apagada'`, 15000, 'Ana sale de la sala');
  await enSala(beto, 'dept:olancho:0', 0);

  for (const t of pestanas) assert.deepEqual(t.errors, [], `${t.nombre}: ${t.errors.join(' | ')}`);
  assert.ok(pases.includes('mapa:1') && pases.includes('dept:olancho:0'), `pases pedidos: ${pases.join(', ')}`);
  console.log(
    `  ${llamadas24} llamadas con 24 jugadores; Ana mandó ${hz.toFixed(1)} posiciones/s; Beto la dibujó en ${distintos} posiciones distintas en 40 cuadros (paso máximo ${Math.max(...pasos).toFixed(2)} m)`,
  );
  ok = true;
} catch (e) {
  console.log(`FALLA salas-vivo: ${e.message}`);
  for (const [i, t] of pestanas.entries()) {
    try {
      await t.shot(join(tmpdir(), `mc-fail-salas-${i}.png`));
      console.log(`  captura: ${join(tmpdir(), `mc-fail-salas-${i}.png`)}`);
      if (t.errors.length) console.log(`  errores ${t.nombre}: ${t.errors.slice(0, 6).join(' | ')}`);
    } catch {}
  }
} finally {
  await cerrar();
}
console.log(
  ok
    ? 'PASA salas-vivo: dos pestañas se ven moverse y hacer emotes; tramos de 24; cambio de sala al viajar'
    : 'NO PASA salas-vivo',
);
process.exit(ok ? 0 : 1);
