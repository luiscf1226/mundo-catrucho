// MC-58 · Animaciones exageradas: caída (aplastado y mareo), choque contra una pared, celebraciones (nivel nuevo,
// minijuego ganado y ganado con oro), los seis emotes (cada uno con su animación) y el asombro de una locura.
// Lee el grupo del muñeco del jugador (escala de aplastar y estirar) y los huesos (pose) en cada cuadro, y saca una
// captura por caso en capturas/mc-58/. Anima cuadro a cuadro: con MC_GPU=0 se salta.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { run } from './harness.mjs';

if (process.env.MC_GPU === '0') {
  console.log('SALTA test-animaciones: anima cuadro a cuadro y saca muchas capturas; corrélo con GPU');
  process.exit(0);
}
const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const shots = fileURLToPath(new URL('../../../capturas/mc-58/', import.meta.url));
const valle = JSON.parse(readFileSync(new URL('../src/game/dept/zones/valle-puntos.json', import.meta.url)));
const S = 'window.__mc.store.getState()',
  P = 'window.__mc.player',
  A = 'window.__anim';
const EMOTES = {
  emote_saludar: 'wave',
  emote_punta: 'dance',
  emote_celebrar: 'celebrate',
  emote_aplaudir: 'clap',
  emote_gol: 'gol',
  emote_sique: 'dance2',
};

// Muestreo en la página: por cada animación visible guarda cuánto se deformó el muñeco (escala) y cuánto se alejó
// su pose de la pose quieta (suma de diferencias de ángulo de los huesos).
const MUESTREO = `(() => {
  const A = (window.__anim = { quieto: null, vistos: {}, ahora: null });
  let g = null, malla = null, n = 0;
  const enEscena = (o) => { while (o.parent) o = o.parent; return o === window.__mc.scene; };
  const buscar = () => {
    g = null;
    window.__mc.scene.traverse((o) => {
      if (o.name === 'avatar-cuerpo' && o.userData.state === window.__mc.player.state) g = o;
    });
    malla = null;
    g?.traverse((o) => { if (o.isSkinnedMesh) malla = o; });
  };
  const paso = () => {
    if (!g || !enEscena(g) || n++ % 30 === 0) buscar();
    if (g && malla) {
      const ex = g.userData.exagera,
        pose = malla.skeleton.bones.slice(0, 14).flatMap((b) => [b.rotation.x, b.rotation.y, b.rotation.z, b.position.y]);
      let globito = false;
      g.traverse((o) => { if (o.name === 'globito' && o.visible) globito = true; });
      const est = window.__mc.player.state.anim;
      if (ex.vis === 'idle' && est === 'idle' && !A.quieto && ex.tl > 0.6) A.quieto = pose;
      const d = A.quieto ? pose.reduce((s, v, i) => s + Math.abs(v - A.quieto[i]), 0) : 0;
      const e = Math.max(Math.abs(g.scale.x - 1), Math.abs(g.scale.y - 1), Math.abs(g.scale.z - 1));
      const v = (A.vistos[ex.vis] ??= { n: 0, escala: 0, pose: 0, globito: false, iconos: [] });
      v.n++;
      v.escala = Math.max(v.escala, e);
      v.pose = Math.max(v.pose, d);
      v.globito ||= globito;
      if (ex.icono && !v.iconos.includes(ex.icono)) v.iconos.push(ex.icono);
      A.ahora = { vis: ex.vis, tl: ex.tl, sy: g.scale.y, caida: ex.caida, globito };
    }
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
})()`;

/** cámara fija delante del muñeco (mira hacia -z con yaw 0), para ver la cara */
const frente = (dist = 3.6, alto = 1.1, mira = 0.9) =>
  `(() => { const p = ${P}.pos, y = ${P}.yaw, fx = -Math.sin(y) + Math.cos(y) * 0.35, fz = -Math.cos(y) - Math.sin(y) * 0.35;
    ${P}.fixedCam = { pos: [p[0] + fx * ${dist}, p[1] + ${alto}, p[2] + fz * ${dist}], target: [p[0], p[1] + ${mira}, p[2]], fov: 50 }; })()`;
/** las capturas sin los avisos grandes del juego (subir de nivel, logros), para que se vea el muñeco */
const sinAvisos = `document.querySelectorAll('[data-testid=celebration]').forEach((e) => (e.style.visibility = 'hidden'))`;
const limpiar = `${S}.toasts.forEach((t) => ${S}.dropToast(t.id))`;
const reiniciar = (anim) => `(${A}.vistos[${JSON.stringify(anim)}] = undefined)`;
const visto = (anim) => `${A}.vistos[${JSON.stringify(anim)}]`;

const ok = await run('animaciones', file, { hash: '#test', width: 1280, height: 800 }, async (t) => {
  await t.click('btn-jugar');
  await t.click('ed-done');
  await t.waitFor(`${S}.profile.created && !${S}.panel && ${S}.scene.kind==='lobby'`);
  await t.waitFor("!document.querySelector('[data-testid=celebration]')", 20000);
  await t.ev(limpiar);
  await t.ev(MUESTREO);
  await t.waitFor(`!!${A}.quieto`, 15000, 'pose quieta del muñeco');
  const base = await t.ev(`[...${P}.pos]`);

  // --- caída: de 14 m cae aplastado, rebota y queda mareado con estrellitas
  await t.ev(frente(4.4, 1.2));
  await t.ev(`${P}.teleport(${base[0]}, ${base[1] + 14}, ${base[2]}, 0)`);
  await t.waitFor(`${A}.ahora?.vis === 'mareo' && ${A}.ahora.tl > 0.45`, 15000, 'mareo después de la caída');
  await t.shot(`${shots}/caida-mareo.png`);
  const mareo = await t.ev(visto('mareo'));
  const caida = await t.ev(`${A}.ahora.caida`);
  assert.ok(caida > 0.8, `cayó ${caida} s`);
  assert.ok(mareo.escala > 0.2, `el aterrizaje no aplastó al muñeco (escala ${mareo.escala})`);
  assert.ok(mareo.pose > 1, `el mareo no cambió la pose (${mareo.pose})`);
  assert.ok(mareo.iconos.includes('💫') && mareo.globito, 'sin estrellitas de mareo');
  assert.ok((await t.ev(visto('fall'))).escala > 0.05, 'al caer no se estira');
  // caminar le quita el mareo
  await t.waitFor(`${A}.ahora?.vis === 'idle'`, 8000, 'se le pasa el mareo');
  console.log(`PASA caída: ${caida.toFixed(2)} s en el aire, aplastado ${mareo.escala.toFixed(2)}, mareo y 💫`);

  // --- choque: corriendo de frente contra una pared se da el golpe (la física no cambia)
  const g = await t.ev(`(() => { const p = ${P}.pos; return [p[0], p[1], p[2]]; })()`);
  await t.ev(
    `window.__pared = window.__mc.phys.box([${g[0]}, ${g[1] + 1.5}, ${g[2] - 4}], [8, 3, 0.6]); ${P}.teleport(${g[0]}, ${g[1]}, ${g[2]}, 0)`,
  );
  await t.ev(
    `${P}.fixedCam = { pos: [${g[0] + 3.4}, ${g[1] + 1.6}, ${g[2] - 1.4}], target: [${g[0]}, ${g[1] + 0.9}, ${g[2] - 3.2}], fov: 50 }`,
  );
  await t.ev(reiniciar('choque'));
  await t.holdUntil('w', `${A}.ahora?.vis === 'choque'`, 10000);
  await t.waitFor(`${A}.ahora?.vis === 'choque' && ${A}.ahora.tl > 0.18 || ${visto('choque')}?.n > 12`, 5000);
  await t.shot(`${shots}/choque.png`);
  const choque = await t.ev(visto('choque'));
  const quedo = await t.ev(`${P}.pos[2]`);
  await t.ev(`window.__mc.phys.remove(window.__pared)`);
  assert.ok(quedo > g[2] - 4, 'atravesó la pared');
  assert.ok(choque.escala > 0.2, `el choque no aplastó (escala ${choque.escala})`);
  assert.ok(choque.pose > 1, `el choque no cambió la pose (${choque.pose})`);
  console.log(`PASA choque: aplastado ${choque.escala.toFixed(2)}, pose ${choque.pose.toFixed(1)}`);

  // --- emotes: cada uno con su animación propia
  await t.ev(`${P}.teleport(${base[0]}, ${base[1] + 0.2}, ${base[2]}, 0)`);
  await t.waitFor(`${A}.ahora?.vis === 'idle'`, 8000);
  await t.ev(
    `window.__mc.store.setState((s) => ({ profile: { ...s.profile, emotes: ${JSON.stringify(Object.keys(EMOTES))} } }))`,
  );
  await t.ev(frente());
  const poses = {};
  for (const [id, anim] of Object.entries(EMOTES)) {
    await t.ev(limpiar);
    await t.ev(reiniciar(anim));
    await t.press('b');
    await t.click(`emote-${id}`);
    await t
      .waitFor(`${A}.ahora?.vis === '${anim}' && ${A}.ahora.tl > (${anim === 'gol' ? 2.5 : 1.1})`, 10000, id)
      .catch(async (e) => {
        const est = await t.ev(
          `JSON.stringify({ panel: ${S}.panel, emote: ${P}.emote, anim: ${P}.state.anim, ahora: ${A}.ahora, ov: ${P}.override })`,
        );
        throw new Error(`${e.message} · ${est}`);
      });
    await t.ev(sinAvisos);
    await t.shot(`${shots}/emote-${id.replace('emote_', '')}.png`);
    const v = await t.ev(visto(anim));
    assert.ok(v.pose > 1.2, `${id}: la pose casi no cambia (${v.pose})`);
    assert.ok(v.escala > 0.04, `${id}: no se aplasta ni se estira (${v.escala})`);
    poses[id] = anim;
    await t.ev(`${P}.emote = null`);
    await t.waitFor(`${A}.ahora?.vis === 'idle'`, 8000);
  }
  assert.equal(new Set(Object.values(poses)).size, 6, 'dos emotes comparten animación');
  console.log('PASA 6 emotes, cada uno con su animación');

  // --- celebración: subir de nivel en el mapa es victoria (agacharse, salto con vuelta, aterrizaje aplastado)
  await t.ev(reiniciar('victoria'));
  await t.ev(frente(5.6, 1.6, 1.6));
  await t.ev(`window.__mc.store.setState((s) => ({ profile: { ...s.profile, level: s.profile.level + 1 } }))`);
  await t.waitFor(`${A}.ahora?.vis === 'victoria' && ${A}.ahora.tl > 0.62`, 8000, 'victoria al subir de nivel');
  await t.ev(sinAvisos);
  await t.shot(`${shots}/victoria-nivel.png`);
  await t.waitFor(`${A}.ahora?.vis === 'victoria' && ${A}.ahora.tl > 1.4`, 8000);
  const vic = await t.ev(visto('victoria'));
  assert.ok(vic.escala > 0.25, `la victoria no se aplasta ni se estira (${vic.escala})`);
  assert.ok(vic.pose > 2, `la victoria casi no cambia la pose (${vic.pose})`);
  assert.ok(vic.iconos.includes('⭐'), 'sin estrella de victoria');
  await t.ev(`${P}.override = null`);
  console.log(`PASA victoria por nivel: escala ${vic.escala.toFixed(2)}, pose ${vic.pose.toFixed(1)}`);

  // --- minijuego: ganar celebra, ganar con oro es victoria, perder no celebra. Nivel alto: que no suba de nivel aquí
  await t.ev(`window.__mc.store.setState((s) => ({ profile: { ...s.profile, level: 30, xp: 0 } }))`);
  await t.ev('new Promise((r) => setTimeout(r, 60))');
  await t.ev(`${P}.override = null`);
  for (const [res, esperado] of [
    [{ won: true, stars: 3 }, 'victoria'],
    [{ won: true, stars: 1 }, 'celebrate'],
    [{ won: false, stars: 0 }, null],
  ]) {
    await t.ev(`${S}.startMinigame('futbol')`);
    await t.waitFor(`${S}.mg?.phase === 'intro'`, 15000);
    await t.click('mg-start');
    await t.waitFor(`${S}.mg?.phase === 'playing'`);
    // como en la pulpería: una animación de la escena (cargar) sigue viva al terminar; la victoria igual gana
    await t.ev(res.won ? `${P}.play('carry', 5)` : `${P}.override = null`);
    await t.ev(`${S}.finishMinigame(${JSON.stringify({ ...res, score: 1, label: 'prueba' })})`);
    await t.waitFor(`${S}.mg?.phase === 'ended'`);
    await t.ev('new Promise((r) => setTimeout(r, 60))');
    const o = await t.ev(`${P}.override?.anim ?? null`);
    assert.equal(await t.ev(`${S}.profile.level`), 30, 'subió de nivel en la prueba del minijuego');
    assert.equal(o, esperado, `resultado ${JSON.stringify(res)}`);
    if (esperado === 'victoria') {
      await t.waitFor(`${A}.ahora?.vis === 'victoria'`, 8000, 'el muñeco hace la victoria');
    }
    await t.ev(`${S}.exitMinigame()`);
    await t.waitFor(`!${S}.mg`, 15000);
  }
  console.log('PASA minijuego: oro = victoria, ganar = celebrar, perder = nada');

  // --- locura: activar una locura de Valle da el asombro (susto y carcajada)
  await t.ev(`${S}.travel('valle')`);
  await t.waitFor("window.__mcTest?.dept?.id === 'valle'", 30000);
  await t.waitFor("!document.querySelector('[data-testid=celebration]')", 20000);
  const [x, z] = valle[0].pos;
  await t.ev(limpiar);
  await t.ev(`${P}.teleport(${x}, (window.__mc.phys.ground?.(${x}, ${z + 3}) ?? 0) + 0.3, ${z + 3}, 0)`);
  await t.holdUntil(
    'w',
    `Math.hypot(${P}.pos[0] - (${x}), ${P}.pos[2] - (${z})) < 1.5 && document.querySelector('[data-testid=prompt]')?.textContent.includes('✨')`,
  );
  await t.ev(reiniciar('asombro'));
  await t.press('e');
  await t.waitFor(`${S}.dialog?.title === ${JSON.stringify(valle[0].nombre)}`);
  await t.waitFor(`${A}.ahora?.vis === 'asombro'`, 5000, 'asombro detrás de la ficha');
  await t.click('dialog-close');
  await t.ev(frente(3.6, 1.2));
  await t.waitFor(`${A}.ahora?.vis === 'asombro' && ${A}.ahora.tl > 1`, 5000, 'sigue el asombro al cerrar la ficha');
  await t.shot(`${shots}/locura-asombro.png`);
  const asombro = await t.ev(visto('asombro'));
  assert.ok(asombro.pose > 1.5, `el asombro casi no cambia la pose (${asombro.pose})`);
  assert.ok(asombro.escala > 0.15, `el asombro no se estira (${asombro.escala})`);
  assert.ok(asombro.iconos.includes('❗'), 'sin ❗ del susto');
  console.log(`PASA locura: asombro con pose ${asombro.pose.toFixed(1)} y escala ${asombro.escala.toFixed(2)}`);

  // rendimiento: el globito es una sola llamada de dibujo y solo mientras se ve
  await t.ev(`${P}.fixedCam = null`);
  const dibujo = await t.calls();
  assert.ok(dibujo.calls < 350, `${dibujo.calls} llamadas de dibujo`);
});
process.exit(ok ? 0 : 1);
