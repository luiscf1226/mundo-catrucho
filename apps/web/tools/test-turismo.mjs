import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { run } from './harness.mjs';

const file = process.argv[2] ?? 'apps/web/dist/mundo-catrucho-hd.html';
const shots = fileURLToPath(new URL('../../../capturas/mc-35/', import.meta.url));
const datos = JSON.parse(readFileSync(new URL('../../../docs/generador/contenido.json', import.meta.url)));
const S = 'window.__mc.store.getState()',
  P = 'window.__mc.player',
  T = 'window.__mcTest.turismo';
const ok = await run('turismo', file, { hash: '#test,go' }, async (t) => {
  // La marca distingue la página vieja de la recargada: sin ella, en máquinas lentas se seguía antes de recargar.
  await t.ev('window.__recargando = true; localStorage.clear(); location.reload()');
  await t.waitFor(`!window.__recargando && !!window.__mc && ${S}.screen==='world'`, 30000);
  const enter = async (id) => {
    await t.ev(`${S}.travel('${id}')`);
    await t.waitFor(`window.__mcTest?.turismo?.dept==='${id}'`, 20000);
  };
  for (const [id, d] of Object.entries(datos)) {
    await enter(id);
    const n = await t.ev(`${T}.puntos.length`);
    if (n !== d.turismo.length) throw Error(`${id}: ${n} puntos`);
    await t.ev(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    const calls = await t.calls();
    console.log(`${id}: ${n} puntos conectados · ${calls.calls} dibujos`);
    if (calls.calls > 350) throw Error(`${id}: ${calls.calls} dibujos`);
  }
  const completados = [];
  for (const [dept, tipo] of [
    ['franciscomorazan', 'mirador'],
    ['atlantida', 'naturaleza'],
    ['cortes', 'comida'],
    ['comayagua', 'festividad'],
  ]) {
    await enter(dept);
    const p = await t.ev(`${T}.puntos.find(p=>p.lugar.tipo==='${tipo}')`);
    if (!p) throw Error(`${dept} sin ${tipo}`);
    // Ubicamos al jugador en el sendero de acceso y caminamos los últimos metros con la física real.
    const ruta = p.camino,
      inicio = ruta[Math.max(0, ruta.length - 4)];
    await t.ev(`${P}.teleport(${inicio[0]},${inicio[1] + 0.1},${inicio[2]})`);
    // W se mantiene hasta llegar (o pasarse), no por un tiempo fijo: sin GPU el juego va a ~1 cuadro por segundo y una
    // pulsación de 100 ms casi nunca abarca un cuadro, así que el muñeco no avanzaba y parecía un camino bloqueado.
    // Si de verdad algo tapa el paso, holdUntil agota su espera y la prueba falla igual.
    for (const target of ruta.slice(Math.max(1, ruta.length - 3))) {
      for (let tries = 0; ; tries++) {
        const pos = await t.ev(`${P}.pos`),
          dx = target[0] - pos[0],
          dz = target[2] - pos[2],
          d = Math.hypot(dx, dz);
        if (d < 0.6) break;
        if (tries > 8) throw Error(`no se detiene en el punto ${dept}: ${pos} → ${target}`);
        await t.ev(`${P}.camYaw=${Math.atan2(-dx, -dz)}`);
        const llego = `(()=>{const p=${P}.pos,x=${target[0]}-p[0],z=${target[2]}-p[2];return Math.hypot(x,z)<0.6||x*${dx / d}+z*${dz / d}<0})()`;
        try {
          await t.holdUntil('w', llego, 20000);
        } catch {
          throw Error(`camino bloqueado ${dept}: ${await t.ev(`${P}.pos`)} → ${target}`);
        }
      }
    }
    await t.waitFor(`${S}.profile.turismo.some(r=>r.id==='${p.lugar.id}')`);
    if (dept === 'franciscomorazan') {
      await t.waitFor(`${S}.toasts.length === 0`);
      await t.shot(`${shots}punto.png`);
    }
    await t.waitFor(`${S}.prompt?.label===${JSON.stringify(`Explorá: ${p.lugar.nombre}`)}`);
    await t.press('e');
    await t.waitFor(`!!document.querySelector('[data-testid=turismo-actividad]')`);
    if (dept === 'franciscomorazan') await t.shot(`${shots}actividad.png`);
    const tipoActividad = await t.ev(`document.querySelector('[data-testid=turismo-actividad]').dataset.tipo`);
    if (tipoActividad === 'foto') {
      await t.click('turismo-foto');
      if (await t.ev(`${S}.profile.turismo.find(r=>r.id==='${p.lugar.id}').completa`))
        throw Error('aceptó foto fuera de cuadro');
      await t.ev(
        `(()=>{const e=document.querySelector('[data-testid=turismo-encuadre]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'50');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
      );
      await t.click('turismo-foto');
    } else {
      await t.click('turismo-paso-2');
      if (await t.ev(`${S}.profile.turismo.find(r=>r.id==='${p.lugar.id}').completa`))
        throw Error('aceptó secuencia incorrecta');
      for (let i = 0; i < 3; i++) await t.click(`turismo-paso-${i}`);
    }
    await t.waitFor(`${S}.profile.turismo.find(r=>r.id==='${p.lugar.id}')?.completa`);
    await t.click('turismo-album');
    await t.waitFor(
      `document.querySelector('[data-testid="recuerdo-${p.lugar.id}"]')?.innerText.includes('Postal guardada')`,
    );
    const texto = await t.text(`recuerdo-${p.lugar.id}`);
    if (!texto.includes(p.lugar.dato) || !texto.includes(new URL(p.lugar.fuente).hostname.replace(/^www\./, '')))
      throw Error('álbum sin dato o fuente');
    completados.push(p.lugar.id);
    console.log(`${dept}: caminó · ${tipoActividad} completada · álbum con dato y fuente`);
    await t.click('panel-close');
  }
  await t.ev('location.reload()');
  await t.waitFor(`!!window.__mc && ${S}.screen==='world'`);
  await t.ev(`${S}.openPanel('recuerdos')`);
  for (const id of completados)
    await t.waitFor(`document.querySelector('[data-testid="recuerdo-${id}"]')?.innerText.includes('Postal guardada')`);
  await t.shot(`${shots}album.png`);
  console.log(
    `4 recuerdos completos sobreviven una recarga; ${Object.keys(datos).length} departamentos y ${Object.values(datos).reduce((n, d) => n + d.turismo.length, 0)} puntos`,
  );
});
process.exit(ok ? 0 : 1);
