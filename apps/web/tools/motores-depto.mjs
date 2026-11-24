// Revisión de los motores propios de un departamento, como la de Yoro (MC-43): cada juego del catálogo se gana con
// oro en todas sus etapas y el resultado pasa los TOPES del servidor; en cada motor no jugar y machacar F pierden
// y sin tema también se gana.
// Con MC_GPU=0 solo se juegan las dos primeras etapas (SALTA el resto) y no se sacan capturas.
import assert from 'node:assert/strict';
import { validarResultado } from '../../../packages/reglas/src/topes.ts';

const S = 'window.__mc.store.getState()',
  M = 'window.__mcTest.motor',
  cuadro = 'new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))';
const sinGpu = process.env.MC_GPU === '0';

export async function abrir(t, juego, motor, modo = 'solo') {
  await t.ev(
    `window.__mc.input.reset();window.__mc.input.px=0;window.__mc.input.py=0;navigator.getGamepads=()=>[];${S}.setModo('${modo}');${S}.${juego ? 'startJuego' : 'startMinigame'}('${juego ?? motor}')`,
  );
  await t.waitFor(`${M}?.estado().id==='${motor}' && ${S}.mg.phase==='intro'`);
  await t.click('mg-start');
  await t.ev(`window.__mc.input.reset();${M}.avanzar(3.1)`);
}

/**
 * Juega todas las etapas de los juegos del kit (`juegos` en el formato del catálogo) con el bot y exige oro dentro de
 * los TOPES. Devuelve la lista de motores revisados. `shots` (opcional) guarda una captura por juego en la etapa 1.
 */
export async function etapasConOro(t, { depto, juegos, shots }) {
  const etapas = sinGpu ? 2 : Number.POSITIVE_INFINITY;
  for (const j of juegos) {
    const id = `${depto}.${j[0]}`;
    for (let etapa = 0; etapa < Math.min(j[8], etapas); etapa++) {
      await abrir(t, id, j[2], etapa === 1 ? 'duo' : etapa > 1 ? 'abierto' : 'solo');
      assert.equal(await t.ev(`${M}.estado().etapa`), etapa, `${id} abre la etapa ${etapa + 1}`);
      const duracion = await t.ev(`${M}.estado().duracion`);
      await t.ev(`${M}.jugarBot();${M}.avanzar(12)`);
      if (etapa === 0 && !sinGpu) {
        await t.ev(cuadro);
        const render = await t.calls();
        assert.ok(render.calls < 350, `${id} ${render.calls} llamadas`);
        if (shots) {
          await t.ev(`${S}.toasts.forEach(t=>${S}.dropToast(t.id))`);
          await t.shot(`${shots}/${j[0]}.png`);
        }
      }
      await t.ev(`${M}.avanzar(123)`);
      const r = await t.ev(`${S}.mg.result`);
      const veredicto = validarResultado({
        motor: j[2],
        puntos: r.score,
        estrellas: r.stars,
        duracion,
        etapa,
        etapas: j[8],
        gano: r.won,
        tema: j[7],
      });
      assert.ok(veredicto.ok, `${id} etapa ${etapa + 1}: ${veredicto.motivos.join(', ')}`);
      assert.equal(r.stars, 3, `Oro en ${id}, etapa ${etapa + 1}: ${r.score} pts`);
    }
    console.log(
      `PASA ${id}: ${Math.min(j[8], etapas)} etapas con oro y dentro de los topes${sinGpu && j[8] > 2 ? ` (SALTA ${j[8] - 2} en CPU)` : ''}`,
    );
  }
  return [...new Set(juegos.map((j) => j[2]))];
}

/**
 * En cada motor: no jugar pierde, machacar F pierde y sin tema hay oro. Si el motor publica `stats.x` (cursor de
 * elección), A/D y el stick derecho lo mueven; los demás prueban sus controles en la prueba del departamento.
 */
export async function motoresHonestos(t, motores) {
  for (const motor of motores) {
    await abrir(t, null, motor);
    await t.ev(`${M}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${motor}: no jugar pierde`);
    await abrir(t, null, motor);
    await t.ev(`for(let i=0;i<${M}.estado().duracion*20+5;i++){window.__mc.input.press('fire');${M}.avanzar(0.05)}`);
    assert.equal(await t.ev(`${S}.mg.result.won`), false, `${motor}: machacar F pierde`);
    await abrir(t, null, motor);
    const x0 = await t.ev(`${M}.estado().stats.x`);
    if (typeof x0 === 'number') {
      await t.holdUntil(x0 > 0 ? 'a' : 'd', `Math.abs(${M}.estado().stats.x-(${x0}))>0.05`);
      const x1 = await t.ev(`${M}.estado().stats.x`);
      await t.ev(
        `window.__pad={id:'Mando de prueba',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,${x1 > 0 ? -1 : 1},0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__pad]`,
      );
      await t.waitFor(`Math.abs(${M}.estado().stats.x-(${x1}))>0.03`);
      await t.ev('window.__pad.connected=false;navigator.getGamepads=()=>[]');
    }
    await t.ev(`${M}.jugarBot();${M}.avanzar(123)`);
    assert.equal(await t.ev(`${S}.mg.result.stars`), 3, `${motor} sin tema jugable`);
    console.log(
      `PASA ${motor}: inacción y machaque pierden${typeof x0 === 'number' ? '; teclado y mando mueven la elección' : ''}; sin tema hay oro`,
    );
  }
}
