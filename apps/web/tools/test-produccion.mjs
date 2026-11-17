// Prueba de humo contra el juego publicado (no corre en `pnpm test`: usa la red de verdad).
// Dos navegadores abren la URL de producción, cargan el mapa de Honduras, entran a la misma sala en vivo, se ven y
// viajan juntos a un departamento. Usa el Convex y la sala de producción reales, con jugadores invitados.
//   node apps/web/tools/test-produccion.mjs [url]      (capturas en capturas/produccion/)
//   MC_PROD_URL=https://… también sirve. Por defecto: https://mundo-catrucho-web.luiscf1226.workers.dev
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './harness.mjs';

if (process.env.MC_GPU === '0') {
  console.log('SALTA produccion: corréla con GPU, contra la red de verdad');
  process.exit(0);
}
const url = process.argv[2] ?? process.env.MC_PROD_URL ?? 'https://mundo-catrucho-web.luiscf1226.workers.dev/';
const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const capturas = join(raiz, 'capturas/produccion');
mkdirSync(capturas, { recursive: true });
// solo el propio sitio, su sala y su Convex
const red = /^(https|wss):\/\/([a-z0-9-]+\.luiscf1226\.workers\.dev|[a-z0-9-]+\.convex\.(cloud|site))\//;
const DEPT = process.env.MC_PROD_DEPT ?? 'olancho';
const pestanas = [];
let ok = false;
try {
  const abrir = async (nombre) => {
    const t = await launch('produccion', { url, publico: true, hash: '#test', red, width: 1280, height: 720 });
    pestanas.push(t);
    t.nombre = nombre;
    await t.waitFor('!!window.__mc?.store', 60000, `${nombre}: el juego cargó`);
    await t.ev(`window.__mc.store.setState((s) => ({ profile: { ...s.profile, name: '${nombre}' } }))`);
    await t.ev(`window.__mc.store.getState().enterWorld()`);
    if (await t.exists('ed-done')) await t.click('ed-done');
    await t.waitFor(`!window.__mc.store.getState().panel`, 15000, `${nombre}: sin paneles`);
    return t;
  };
  const enSala = (t, prefijo, otros, ms = 60000) =>
    t.waitFor(
      `(()=>{const s=window.__mc.sala?.getState();return !!s&&s.estado==='en-sala'&&s.sala.startsWith('${prefijo}')&&s.otros>=${otros}})()`,
      ms,
      `${t.nombre} en ${prefijo} con al menos ${otros} más`,
    );
  const sala = async (t) => JSON.parse(await t.ev(`JSON.stringify(window.__mc.sala.getState())`));
  const ve = (t, nombre) =>
    t.waitFor(
      `(()=>{const r=window.__mc.net.players().find(p=>p.name==='${nombre}');return !!r&&r.listo})()`,
      60000,
      `${t.nombre} ve a ${nombre}`,
    );
  /** pone a `b` al lado de `a` en un claro sin choques cerca y saca la foto con una cámara fija desde arriba */
  const juntos = async (a, b, archivo) => {
    const q = JSON.parse(
      await a.ev(`(()=>{const {phys,player}=window.__mc;const cs=[...phys.colliders];const p=player.pos;
        const lejos=(x,z)=>cs.every(c=>c.type==='cyl'?Math.hypot(c.x-x,c.z-z)-c.r>2.5:Math.hypot(Math.max(c.min[0]-x,0,x-c.max[0]),Math.max(c.min[2]-z,0,z-c.max[2]))>2.5);
        const plano=(x,z)=>Math.abs(phys.ground(x,z)-p[1])<1&&Math.abs(phys.ground(x,z)-phys.ground(x+2.4,z+8))<0.3;
        let mejor=null;
        for(let r=4;r<50&&!mejor;r+=2)for(let k=0;k<16&&!mejor;k++){const x=p[0]+r*Math.cos(k*Math.PI/8),z=p[2]+r*Math.sin(k*Math.PI/8);
          let ok=plano(x,z);for(let dz=-2;dz<=8&&ok;dz+=1.5)for(let dx=-1.5;dx<=4;dx+=1.1)ok=ok&&lejos(x+dx,z+dz);if(ok)mejor=[x,phys.ground(x,z),z]}
        return JSON.stringify(mejor??p)})()`),
    );
    // al llegar a una zona el juego puede ignorar un teleport un rato: se repite hasta que pega
    const mover = (t, x) =>
      t.waitFor(
        `(()=>{const p=window.__mc.player;if(Math.abs(p.pos[0]-(${x}))<0.2&&Math.abs(p.pos[2]-(${q[2]}))<0.2)return true;
        p.teleport(${x}, ${q[1]}, ${q[2]}, Math.PI);return false})()`,
        60000,
        `${t.nombre} llega al claro`,
      );
    await mover(a, q[0]);
    await mover(b, q[0] + 2.4);
    await a.waitFor(
      `(()=>{const r=window.__mc.net.players().find(p=>p.name==='${b.nombre}');return !!r&&Math.hypot(r.pos[0]-(${q[0] + 2.4}),r.pos[2]-(${q[2]}))<2})()`,
      60000,
      `${a.nombre} ve a ${b.nombre} a su lado`,
    );
    await a.ev(`(()=>{if(!document.getElementById('foto')){const e=document.createElement('style');e.id='foto';
      e.textContent='[data-testid=hud-banner],[data-testid=toast]{display:none!important}';document.head.append(e)}
      window.__mc.store.setState({toasts:[]});
      window.__mc.player.fixedCam={pos:[${q[0] + 1.2},${q[1] + 3.2},${q[2] + 6.5}],target:[${q[0] + 1.2},${q[1] + 1},${q[2]}],fov:50}})()`);
    await a.waitFor(
      `new Promise(r=>{let n=0;const f=()=>++n>40?r(true):requestAnimationFrame(f);requestAnimationFrame(f)})`,
      30000,
      'cámara en su sitio',
    );
    await a.shot(join(capturas, archivo));
    await a.ev('window.__mc.player.fixedCam=null');
  };

  // 1. el mapa de Honduras carga en producción
  const ana = await abrir('Ana');
  await ana.waitFor(`window.__mc.store.getState().scene.kind==='lobby'`, 60000, 'Ana en el mapa');
  await enSala(ana, 'mapa:', 0);
  await ana.shot(join(capturas, '1-mapa-produccion.png'));
  console.log(`PASA mapa: ${url} carga el mapa de Honduras y Ana entra a ${(await sala(ana)).sala}`);

  // 2. un segundo jugador entra a la misma sala y se ven
  const beto = await abrir('Beto');
  await enSala(beto, 'mapa:', 1);
  await enSala(ana, 'mapa:', 1);
  const [sa, sb] = [await sala(ana), await sala(beto)];
  assert.equal(sa.sala, sb.sala, `misma sala: ${sa.sala} y ${sb.sala}`);
  await ve(ana, 'Beto');
  await ve(beto, 'Ana');
  await juntos(ana, beto, '2-dos-jugadores-mapa.png');
  console.log(`PASA sala: Ana y Beto en ${sa.sala}, cada uno ve al otro`);

  // 3. viajan juntos a un departamento y siguen en la misma sala
  for (const t of [ana, beto]) await t.ev(`window.__mc.store.getState().travel('${DEPT}')`);
  await enSala(ana, `dept:${DEPT}:`, 1, 120000);
  await enSala(beto, `dept:${DEPT}:`, 1, 120000);
  assert.equal((await sala(ana)).sala, (await sala(beto)).sala, 'misma sala en el departamento');
  await ve(beto, 'Ana');
  await juntos(beto, ana, `3-dos-jugadores-${DEPT}.png`);
  console.log(`PASA viaje: los dos en ${(await sala(beto)).sala}`);

  for (const t of pestanas) assert.deepEqual(t.errors, [], `${t.nombre}: errores en la página`);
  ok = true;
  console.log('PASA produccion');
} catch (e) {
  console.error('FALLA produccion:', e?.message ?? e);
  for (const t of pestanas)
    console.error(
      t.nombre,
      await t
        .ev(`JSON.stringify({yo:window.__mc.player.pos,otros:window.__mc.net.players().map(p=>[p.name,p.pos])})`)
        .catch(() => ''),
    );
  for (const t of pestanas) if (t.errors?.length) console.error(`${t.nombre}:`, t.errors.slice(0, 5));
  for (const [i, t] of pestanas.entries()) await t.shot(join(capturas, `falla-${i}.png`)).catch(() => {});
} finally {
  for (const t of pestanas) await t.close();
}
process.exit(ok ? 0 : 1);
