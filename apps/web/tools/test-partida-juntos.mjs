// MC-23, MC-25 y MC-31 de punta a punta: dos pestañas del juego compilado con VITE_SALAS_URL y VITE_CONVEX_URL
// contra la sala local (wrangler dev) y un Convex de mentira que firma pases y actas, verifica el recibo y paga con
// las mismas funciones de @mundo-catrucho/reglas que el Convex de verdad. Nada sale de 127.0.0.1.
//   1. MC-23: Ana sola en el mapa tiene 3 bots marcados que no cuentan; entra Beto y se va uno. El mapa muestra
//      los conectados de verdad que la sala le avisó a Convex.
//   2. MC-25: Ana abre «Jugar con alguien de la sala», Beto acepta la invitación y juegan la rosquilla con el
//      mismo reloj y semilla, viendo el marcador del otro. Al final el recibo de la sala paga una sola vez.
//   3. MC-31: Ana sale en bus y maneja; Beto se sube de pasajero y ve el mismo recorrido. Ana se baja y el volante
//      pasa a Beto.
//   node apps/web/tools/test-partida-juntos.mjs      (capturas en capturas/mc-23/, mc-25/ y mc-31/)
// La partida dura el reloj real del motor (70 s). Sin GPU no cabe en GitHub: con MC_GPU=0 dice SALTA salvo que
// pongás MC_JUNTOS_CPU=1 (y MC_LENTO=N si hace falta).
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { createServer as servidorTcp } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decidirRecibo,
  firmarActa,
  firmarPase,
  leerFirmado,
  PARTIDA,
  PASAJES,
  partirSala,
  verificarRecibo,
} from '@mundo-catrucho/reglas';
import { launch } from './harness.mjs';

if (process.env.MC_GPU === '0' && process.env.MC_JUNTOS_CPU !== '1') {
  console.log('SALTA partida-juntos: sin GPU una partida de 70 s no cabe en GitHub; corrélo con GPU o MC_JUNTOS_CPU=1');
  process.exit(0);
}
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const fotos = { 23: join(raiz, 'capturas/mc-23'), 25: join(raiz, 'capturas/mc-25'), 31: join(raiz, 'capturas/mc-31') };
for (const d of Object.values(fotos)) mkdirSync(d, { recursive: true });
const SECRETO = randomBytes(32).toString('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- Convex de mentira
const catalogo = JSON.parse(readFileSync(join(raiz, 'apps/web/shared/data/catalogo/centro.json'), 'utf8'));
const juegoDe = (juegoId) => {
  const [dept, id] = juegoId.split('.');
  const t = catalogo[dept]?.juegos.find((j) => j[0] === id);
  return t && { motor: t[2], etapas: typeof t[8] === 'number' ? t[8] : 3 };
};
const COLORES = { Ana: ['#e63946', '#1b1b1b'], Beto: ['#ffd23f', '#0d47a1'] };
const idDe = (invitado) => createHash('sha256').update(invitado).digest('hex').slice(0, 12);
const nombres = {},
  saldos = {},
  partidas = {},
  ocupaciones = {},
  llamadas = [],
  rechazos = [];
const saldo = (id) => ({ monedas: (saldos[id] ??= 100), xp: 0, nivel: 1 });
let nId = 0;
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
    // la sala avisa su ocupación (acción HTTP de Convex)
    if (req.url === '/salas/ocupacion') {
      const d = await leerFirmado('ocupacion', body, SECRETO);
      if (d) ocupaciones[d.sala] = { n: d.ocupacion, t: Date.now() };
      return res.writeHead(d ? 204 : 401).end();
    }
    const responder = (o) => res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(o));
    const ok = (value) => responder({ status: 'success', value });
    try {
      const { path, args } = JSON.parse(body || '{}');
      const a = args?.[0] ?? {};
      llamadas.push(path);
      const yo = a.invitado ? idDe(a.invitado) : null;
      if (yo && a.nombre) nombres[yo] = a.nombre;
      const pase = (sala) => {
        const [shirtColor, hairColor] = COLORES[a.nombre] ?? ['#17a673', '#1b1b1b'];
        return firmarPase(
          { id: yo, nombre: a.nombre, sala, avatar: { shirtColor, hairColor, hat: 'sin_sombrero' } },
          SECRETO,
        );
      };
      if (path === 'tienda:entrar') return ok({ ...saldo(yo), avatar: {}, comprados: [] });
      if (path === 'salas:pase') return ok({ ok: true, pase: await pase(a.sala), id: yo });
      if (path === 'salas:conectados') {
        const depts = {};
        let mapa = 0;
        for (const [sala, o] of Object.entries(ocupaciones))
          if (Date.now() - o.t < 75_000) {
            const z = partirSala(sala)?.zona;
            if (z === 'mapa') mapa += o.n;
            else if (z) depts[z.slice(5)] = (depts[z.slice(5)] ?? 0) + o.n;
          }
        return ok({ mapa, depts, total: mapa + Object.values(depts).reduce((x, y) => x + y, 0) });
      }
      if (path === 'partidas:abrirJuntos') {
        const j = juegoDe(a.juegoId);
        if (!j) return ok({ ok: false, motivo: 'juego desconocido' });
        const id = `p${randomBytes(8).toString('hex')}`;
        partidas[id] = {
          ...j,
          juegoId: a.juegoId,
          etapa: 0,
          semilla: 4242,
          jugadores: [yo],
          estado: 'abierta',
          inicio: Date.now(),
        };
        return ok({ ok: true, partidaId: id, juegoId: a.juegoId, motor: j.motor, etapa: 0, semilla: 4242 });
      }
      if (path === 'partidas:unirseJuntos') {
        const p = partidas[a.partidaId];
        if (!p || p.estado !== 'abierta') return ok({ ok: false, motivo: 'ya no está' });
        if (!p.jugadores.includes(yo)) p.jugadores.push(yo);
        return ok({
          ok: true,
          partidaId: a.partidaId,
          juegoId: p.juegoId,
          motor: p.motor,
          etapa: 0,
          semilla: p.semilla,
        });
      }
      if (path === 'salas:paseJuego') {
        const p = partidas[a.partidaId];
        if (!p?.jugadores.includes(yo)) return ok({ ok: false, motivo: 'ajena' });
        const acta = await firmarActa(
          {
            partidaId: a.partidaId,
            motor: p.motor,
            etapa: 0,
            etapas: p.etapas,
            semilla: p.semilla,
            cupo: PARTIDA.cupo,
            vence: Date.now() + PARTIDA.actaMs,
          },
          SECRETO,
        );
        return ok({ ok: true, pase: await pase(`juego:${a.partidaId}`), acta, id: yo });
      }
      if (path === 'partidas:cerrarJuntos') {
        const p = partidas[a.partidaId];
        if (!p?.jugadores.includes(yo)) return ok({ ok: false, motivo: 'ajena' });
        const mio = () => p.pagos.find((x) => x.usuarioId === yo) ?? { monedas: 0, xp: 0 };
        if (p.estado === 'cerrada') return ok({ ok: true, ya: true, ...mio(), saldo: saldo(yo) });
        const recibo = await verificarRecibo(a.recibo, SECRETO);
        // Convex corre las mutaciones una tras otra: el segundo ve la partida ya cerrada
        if (p.estado === 'cerrada') return ok({ ok: true, ya: true, ...mio(), saldo: saldo(yo) });
        if (!recibo) {
          rechazos.push(`recibo que no verifica: ${String(a.recibo).slice(0, 40)}`);
          return ok({ ok: false, motivo: 'recibo' });
        }
        const d = decidirRecibo({
          partidaId: a.partidaId,
          recibo,
          partida: { ...p, jugadores: p.jugadores.map((u) => ({ usuarioId: u, idPublico: u })) },
          ahora: Date.now(),
        });
        if (d.tipo === 'error') {
          rechazos.push(`${d.motivo}: ${JSON.stringify(recibo)}`);
          return ok({ ok: false, motivo: d.motivo });
        }
        p.estado = 'cerrada';
        p.recibo = recibo;
        p.pagos = d.pagos.map((x) => ({
          usuarioId: x.usuarioId,
          monedas: x.premio?.monedas ?? 0,
          xp: x.premio?.xp ?? 0,
        }));
        for (const x of p.pagos) saldos[x.usuarioId] = saldo(x.usuarioId).monedas + x.monedas;
        return ok({ ok: true, ya: false, ...mio(), saldo: saldo(yo) });
      }
      if (path === 'salas:paseViaje') return ok({ ok: true, pase: await pase(a.sala), id: yo });
      if (path === 'progreso:salirDeViaje') {
        saldos[yo] = saldo(yo).monedas - PASAJES[a.veh];
        return ok({ ok: true, viajeId: `v${++nId}`, precio: PASAJES[a.veh], saldo: saldo(yo), subidas: 0, logros: [] });
      }
      if (path === 'progreso:llegarViaje') return ok({ ok: true, bono: 0, saldo: saldo(yo), subidas: 0, logros: [] });
      responder({ status: 'error', errorMessage: `sin ${path} en la prueba` });
    } catch (e) {
      responder({ status: 'error', errorMessage: String(e) });
    }
  });
});
await new Promise((r) => convex.listen(0, '127.0.0.1', r));
const PC = convex.address().port;

// ---------------------------------------------------------------- sala local
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
  [
    'exec',
    'wrangler',
    'dev',
    '--port',
    String(PW),
    '--inspector-port',
    String(PI),
    '--var',
    `SALA_SECRETO:${SECRETO}`,
    '--var',
    `CONVEX_SITE_URL:http://127.0.0.1:${PC}`,
    '--var',
    'OCUPACION_MS:500',
  ],
  { cwd: join(raiz, 'workers/salas'), stdio: 'ignore', detached: true },
);
const out = mkdtempSync(join(tmpdir(), 'mc-juntos-'));
const pestanas = [];
const cerrar = async () => {
  for (const t of pestanas) await t.close();
  try {
    process.kill(-wrangler.pid, 'SIGKILL');
  } catch {}
  convex.close();
  rmSync(out, { recursive: true, force: true });
};

let ok = false,
  resumen = '';
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
    await t.ev(`window.__mc.store.setState((s) => ({ profile: { ...s.profile, name: '${nombre}' } }))`);
    await t.ev(`window.__mc.store.getState().enterWorld()`);
    if (await t.exists('ed-done')) await t.click('ed-done');
    await t.waitFor(`!window.__mc.store.getState().panel`, 10000, 'sin paneles');
    return t;
  };
  const enSala = (t, nombre, otros, ms = 30000) =>
    t.waitFor(
      `(()=>{const s=window.__mc.sala?.getState();return s&&s.estado==='en-sala'&&s.sala==='${nombre}'&&s.otros===${otros}})()`,
      ms,
      `${t.nombre} en ${nombre} con ${otros} más`,
    );
  const bots = (t) => t.ev(`window.__mc.net.players().filter(p=>p.bot).length`);
  const g = (t, e) => t.ev(`(()=>{const s=window.__mc.store.getState();return ${e}})()`);
  /** foto sin avisos, con una cámara fija alta sobre `centro` */
  const foto = async (t, archivo, centro, lejos = 12, alto = 7) => {
    await t.ev(`(()=>{window.__mc.store.setState({toasts:[]});
      window.__mc.player.fixedCam={pos:[${centro[0]},${centro[1] + alto},${centro[2] + lejos}],target:[${centro[0]},${centro[1] + 0.9},${centro[2] - 3}],fov:55}})()`);
    await t.waitFor(
      `new Promise(r=>{let n=0;const f=()=>++n>24?r(true):requestAnimationFrame(f);requestAnimationFrame(f)})`,
      60000,
      'cámara en su sitio',
    );
    await t.shot(archivo);
    await t.ev('window.__mc.player.fixedCam=null');
  };

  // 1. MC-23: Ana sola en el mapa: 3 bots marcados que no cuentan como gente
  const ana = await abrir('Ana');
  await enSala(ana, 'mapa:0', 0);
  await ana.waitFor(`window.__mc.net.players().filter(p=>p.bot).length===3`, 15000, 'Ana con 3 bots');
  assert.ok(
    await ana.ev(`window.__mc.net.players().filter(p=>p.bot).every(p=>p.name.includes('bot'))`),
    'cada bot lleva su distintivo',
  );
  const spawn = JSON.parse(await ana.ev('JSON.stringify(window.__mc.player.spawn)'));
  await ana.waitFor(
    `window.__mc.scene.getObjectByName('en-vivo')?.children.filter(o=>o.userData.bot&&o.visible).length===3`,
    15000,
    'Ana dibuja los 3 bots',
  );
  // caminan: dos lecturas de la posición de un bot dibujado son distintas
  const p0 = await ana.ev(`window.__mc.scene.getObjectByName('en-vivo').children.find(o=>o.userData.bot).position.x`);
  await sleep(600);
  const p1 = await ana.ev(`window.__mc.scene.getObjectByName('en-vivo').children.find(o=>o.userData.bot).position.x`);
  assert.notEqual(p0, p1, 'los bots caminan');
  await foto(ana, join(fotos[23], '1-mapa-bots-de-relleno.png'), spawn, 15, 14);
  const beto = await abrir('Beto');
  await enSala(beto, 'mapa:0', 1);
  await enSala(ana, 'mapa:0', 1);
  await ana.waitFor(`window.__mc.net.players().filter(p=>p.bot).length===2`, 15000, 'se fue un bot al entrar Beto');
  assert.equal(await bots(beto), 2);
  await ana.ev(`window.__mc.store.getState().openPanel('salas')`);
  await ana.waitFor(`!!document.querySelector('[data-testid=room-bots]')`, 10000, 'el panel dice cuántos bots');
  assert.match(await ana.text('room-gente'), /beto/i);
  assert.doesNotMatch(await ana.text('room-gente'), /bot/i);
  await ana.shot(join(fotos[23], '2-panel-salas.png'));

  // 2. MC-25: Ana invita desde el panel de salas; Beto acepta; mismo reloj y semilla; marcador en vivo
  await ana.click('pj-jugar');
  await ana.waitFor(`!!document.querySelector('[data-testid=pj-espera]')`, 15000, 'Ana espera');
  await ana.shot(join(fotos[25], '1-ana-espera.png'));
  await beto.waitFor(`!!document.querySelector('[data-testid=inv-juego]')`, 15000, 'a Beto le llega la invitación');
  await beto.shot(join(fotos[25], '2-beto-invitacion.png'));
  await beto.click('inv-aceptar');
  for (const t of [ana, beto])
    await t.waitFor(`window.__mc.store.getState().mg?.phase==='playing'`, 20000, `${t.nombre} juega`);
  const [sa, sb] = [await g(ana, 's.mg.juntos.semilla'), await g(beto, 's.mg.juntos.semilla')];
  assert.equal(sa, sb, 'la misma semilla');
  assert.equal(await g(ana, 's.mg.juego'), await g(beto, 's.mg.juego'), 'el mismo juego');
  for (const t of [ana, beto]) {
    await t.waitFor(`!!window.__mcTest?.motor`, 20000, 'motor de prueba');
    await t.ev('window.__mcTest.motor.jugarBot(true)');
  }
  // el reloj lo manda la sala: los dos van por el mismo segundo
  await ana.waitFor(`window.__mcTest.motor.estado().tiempo>3`, 30000, 'arrancó el reloj');
  const tiempos = await Promise.all([ana, beto].map((t) => t.ev('window.__mcTest.motor.estado().tiempo')));
  assert.ok(Math.abs(tiempos[0] - tiempos[1]) < 1.5, `relojes distintos: ${tiempos}`);
  const duracion = await ana.ev('window.__mcTest.motor.estado().duracion');
  assert.equal(duracion, await beto.ev('window.__mcTest.motor.estado().duracion'));
  // cada uno ve el marcador del otro moverse
  const idA = await ana.ev(`document.querySelector('[data-testid=pj-fila][data-yo=true]').dataset.id`);
  const idB = await beto.ev(`document.querySelector('[data-testid=pj-fila][data-yo=true]').dataset.id`);
  await ana.waitFor(
    `Number(document.querySelector('[data-testid=pj-fila][data-id="${idB}"]')?.dataset.puntos)>0`,
    60000,
    'Ana ve los puntos de Beto',
  );
  await beto.waitFor(
    `Number(document.querySelector('[data-testid=pj-fila][data-id="${idA}"]')?.dataset.puntos)>0`,
    60000,
    'Beto ve los puntos de Ana',
  );
  await ana.ev(`window.__mc.store.setState({toasts:[]})`);
  await ana.shot(join(fotos[25], '3-ana-juega-con-marcador.png'));
  await beto.ev(`window.__mc.store.setState({toasts:[]})`);
  await beto.shot(join(fotos[25], '4-beto-juega-con-marcador.png'));
  // al terminar el reloj, la sala firma el recibo y se paga una vez
  for (const t of [ana, beto]) {
    await t.waitFor(`window.__mc.store.getState().mg?.phase==='ended'`, (duracion + 20) * 1000, `${t.nombre} terminó`);
    await t.waitFor(
      `document.querySelector('[data-testid=pj-pago]')?.dataset.pago==='pagado'`,
      20000,
      `${t.nombre} cobró`,
    );
    await t.waitFor(`window.__mc.store.getState().mg.pago==='pagado'`, 10000, 'resultado pagado');
  }
  const partida = Object.values(partidas)[0];
  assert.equal(partida.estado, 'cerrada');
  assert.equal(llamadas.filter((l) => l === 'partidas:cerrarJuntos').length, 2, 'los dos mandan el recibo');
  assert.equal(partida.pagos.length, 2, 'paga a los dos');
  assert.ok(
    partida.pagos.every((p) => p.monedas > 0),
    JSON.stringify(partida.pagos),
  );
  // lo que cada uno ve al final es lo del recibo
  const finalA = await ana.ev(
    `Number(document.querySelector('[data-testid=pj-fila][data-id="${idB}"]').dataset.puntos)`,
  );
  assert.equal(finalA, partida.recibo.resultados.find((f) => f.id === idB).puntos);
  assert.equal(await g(ana, 's.mg.rewards.coins'), partida.pagos.find((p) => p.usuarioId === idA).monedas);
  // que terminen de contar las monedas del resultado
  await sleep(1500);
  await ana.ev(`window.__mc.store.setState({toasts:[]})`);
  await ana.shot(join(fotos[25], '5-ana-resultado-pagado.png'));
  await beto.shot(join(fotos[25], '6-beto-resultado-pagado.png'));
  resumen += `partida de ${duracion} s: ${partida.recibo.resultados.map((f) => `${nombres[f.id]} ${f.puntos}`).join(' vs ')}; `;

  // 3. Los dos salen al departamento: el mapa muestra los conectados de verdad (sin bots)
  for (const t of [ana, beto]) await t.ev('window.__mc.store.getState().exitMinigame()');
  await enSala(ana, 'dept:franciscomorazan:0', 1);
  await enSala(beto, 'dept:franciscomorazan:0', 1);
  for (let i = 0; ; i++) {
    await ana.ev(`window.__mc.store.getState().closePanel()`);
    await ana.ev(`window.__mc.store.getState().openPanel('mapa')`);
    await sleep(800);
    const v = await ana.ev(
      `(()=>{const e=document.querySelector('[data-testid=map-online]');return e&&e.dataset.fuente==='servidor'?e.innerText:''})()`,
    );
    if (/\b2\b/.test(v)) break;
    if (i > 20) throw new Error(`el mapa no muestra los 2 conectados: «${v}»`);
  }
  await ana.shot(join(fotos[23], '3-mapa-conectados-de-verdad.png'));
  await ana.ev(`window.__mc.store.getState().closePanel()`);

  // 4. MC-31: Ana sale en bus a Olancho y maneja; Beto se sube de pasajero
  await ana.ev(`window.__mc.store.getState().openPanel('transporte')`);
  await ana.click('tr-to-olancho');
  await ana.click('tr-veh-bus');
  await ana.click('tr-go');
  await ana.waitFor(`window.__mc.store.getState().scene.kind==='viaje'`, 15000, 'Ana sale de viaje');
  await ana.waitFor(`document.querySelector('[data-testid=vj-rol]')?.dataset.rol==='chofer'`, 15000, 'Ana maneja');
  await beto.waitFor(`!!document.querySelector('[data-testid=inv-viaje]')`, 15000, 'a Beto le llega el viaje');
  await beto.ev(`window.__mc.store.setState({toasts:[]})`);
  await beto.shot(join(fotos[31], '1-beto-invitacion-al-bus.png'));
  await beto.click('inv-subir');
  await beto.waitFor(`window.__mc.store.getState().scene.kind==='viaje'`, 15000, 'Beto se sube');
  await beto.waitFor(
    `document.querySelector('[data-testid=vj-rol]')?.dataset.rol==='pasajero'`,
    15000,
    'Beto va de pasajero',
  );
  assert.equal(await g(beto, 's.scene.to'), 'olancho');
  assert.equal(await g(beto, 's.scene.veh'), 'bus');
  assert.ok(llamadas.filter((l) => l === 'progreso:salirDeViaje').length >= 2, 'cada uno paga su pasaje');
  // Ana maneja hacia la izquierda; Beto ve lo mismo: misma distancia, segundo y carril
  await ana.down('a');
  await sleep(1500);
  await ana.up('a');
  await sleep(600);
  const [ea, eb] = await Promise.all(
    [ana, beto].map((t) => t.ev('JSON.stringify(window.__mcCamino.estado())').then(JSON.parse)),
  );
  assert.ok(ea.elapsed > 2, `el viaje no avanza: ${JSON.stringify(ea)}`);
  assert.ok(Math.abs(ea.elapsed - eb.elapsed) < 1, `segundos distintos: ${ea.elapsed} / ${eb.elapsed}`);
  assert.ok(Math.abs(ea.distance - eb.distance) < 25, `distancia distinta: ${ea.distance} / ${eb.distance}`);
  assert.ok(Math.abs(ea.x - eb.x) < 0.8 && ea.x < -0.5, `carril distinto: ${ea.x} / ${eb.x}`);
  for (const [t, n] of [
    [ana, '2-ana-maneja.png'],
    [beto, '3-beto-de-pasajero.png'],
  ]) {
    await t.ev(`window.__mc.store.setState({toasts:[]})`);
    await t.shot(join(fotos[31], n));
  }
  // Ana se baja: el volante pasa a Beto
  await ana.ev('window.__mc.store.getState().goLobby()');
  await beto.waitFor(
    `document.querySelector('[data-testid=vj-rol]')?.dataset.rol==='chofer'`,
    15000,
    'Beto agarra el volante',
  );
  const e1 = await beto.ev('window.__mcCamino.estado().elapsed');
  await sleep(1500);
  assert.ok((await beto.ev('window.__mcCamino.estado().elapsed')) > e1 + 0.5, 'el viaje sigue con Beto al volante');
  await beto.shot(join(fotos[31], '4-beto-al-volante.png'));
  resumen += `viaje: pasajero a ${Math.abs(ea.elapsed - eb.elapsed).toFixed(2)} s y ${Math.abs(ea.distance - eb.distance).toFixed(1)} m del chofer`;

  for (const t of pestanas) assert.deepEqual(t.errors, [], `${t.nombre}: ${t.errors.join(' | ')}`);
  ok = true;
} catch (e) {
  console.log(`FALLA partida-juntos: ${e.message}`);
  if (rechazos.length) console.log(`  el Convex de mentira rechazó: ${rechazos.join(' | ')}`);
  for (const [i, t] of pestanas.entries()) {
    try {
      await t.shot(join(tmpdir(), `mc-fail-juntos-${i}.png`));
      console.log(`  captura: ${join(tmpdir(), `mc-fail-juntos-${i}.png`)}`);
      if (t.errors.length) console.log(`  errores ${t.nombre}: ${t.errors.slice(0, 6).join(' | ')}`);
    } catch {}
  }
} finally {
  await cerrar();
}
console.log(ok ? `PASA partida-juntos: bots de relleno y conectados de verdad; ${resumen}` : 'NO PASA partida-juntos');
process.exit(ok ? 0 : 1);
