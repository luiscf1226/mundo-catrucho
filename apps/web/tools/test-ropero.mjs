// Prueba del ropero: cuerpo de mujer, piel y atuendo inicial; tienda → Atuendos → comprar, equipar y guardar.
// Además saca hojas con todos los atuendos (frente, lado caminando y espalda) en los dos cuerpos.
// Uso: node tools/test-ropero.mjs <mundo-catrucho-hd.html> [carpeta-hojas]

import { readFileSync, rmSync } from 'node:fs';
import { launch } from './harness.mjs';

const [file, out = '/tmp/claude-1000/mc-ropero/hojas'] = process.argv.slice(2);
if (!file) {
  console.error('uso: node tools/test-ropero.mjs <html> [carpeta]');
  process.exit(2);
}
const S = 'window.__mc.store.getState()';
const ok = (c, m) => {
  if (!c) throw new Error(m);
};
const t = await launch(file, { hash: '#test', width: 1280, height: 720 });
let fail = null;
try {
  await t.waitFor(`!!document.querySelector('[data-testid=btn-jugar]')`);
  await t.click('btn-jugar');
  await t.waitFor(`!!document.querySelector('[data-testid=ed-body-m]')`);
  await t.click('ed-body-m');
  await t.click('ed-skin-4');
  await t.click('shop-tab-atuendo');
  await t.click('shop-item-at_cancha');
  const av0 = JSON.parse(await t.ev(`JSON.stringify(${S}.profile.avatar)`));
  ok(
    av0.body === 'm' && av0.pants === 'short_futbol' && av0.hat === 'gorra',
    `el editor no aplicó cuerpo y atuendo: ${JSON.stringify(av0)}`,
  );
  ok(av0.hair === 'pelo_largo', `peinado sugerido para mujer no aplicado: ${av0.hair}`);
  await t.click('ed-done');
  await t.waitFor(`${S}.profile.created && !${S}.panel`, 15000, 'terminar creación');
  await t.ev(`${S}.addCoins(5000)`);
  await t.ev(`${S}.openPanel('tienda')`);
  await t.click('shop-tab-atuendo');
  await t.click('filter-grupo-club');
  ok(
    !(await t.exists('shop-item-at_lenca')) && (await t.exists('shop-item-at_motagua')),
    'el filtro de grupo no filtra',
  );
  ok(!(await t.exists('shop-item-camisa_motagua')), 'una pieza soloSet aparece a la venta');
  await t.click('shop-try-at_motagua');
  await t.waitFor(`!!document.querySelector('[data-testid=shop-nota]')`, 4000, 'nota del atuendo');
  const coins0 = await t.ev(`${S}.profile.coins`);
  await t.click('shop-item-at_motagua');
  await t.waitFor(`${S}.profile.owned.includes('at_motagua')`, 4000, 'compra');
  const p = JSON.parse(await t.ev(`JSON.stringify(${S}.profile)`));
  ok(p.coins === coins0 - 230, 'cobro incorrecto');
  ok(p.owned.includes('camisa_motagua'), 'no entregó las piezas');
  ok(
    p.avatar.shirt === 'camisa_motagua' && p.avatar.pants === 'short_futbol' && p.avatar.body === 'm',
    `no se equipó: ${JSON.stringify(p.avatar)}`,
  );
  ok(
    (await t.ev(`document.querySelector('[data-testid=shop-item-at_motagua]').dataset.state`)) === 'puesto',
    'el botón no dice puesto',
  );
  await t.sleep(600);
  const saved = await t.ev(
    `JSON.stringify(Object.keys(localStorage).map(k=>localStorage.getItem(k)).filter(v=>v&&v.includes('camisa_motagua')).length)`,
  );
  ok(+saved > 0, 'el avatar no quedó guardado');
  await t.shot(`${out}/tienda.png`);
  // equipar otro ya comprado desde el editor
  await t.click('filter-grupo-folclor');
  await t.click('shop-item-at_lenca');
  await t.waitFor(`${S}.profile.avatar.hat === 'panuelo_lenca'`, 4000, 'equipar lenca');
  ok(!t.errors.length, `errores: ${t.errors.join(' | ')}`);
  console.log('Flujo del ropero bien.');

  // ---- hojas: todos los atuendos, dos cuerpos, frente / lado caminando / espalda
  await t.click('filter-grupo-todos');
  const all = JSON.parse(
    await t.ev(
      `JSON.stringify([...document.querySelectorAll('[data-testid^=shop-card-at_]')].map(e=>e.dataset.testid.slice(10)))`,
    ),
  );
  ok(all.length >= 20, `pocos atuendos: ${all.length}`);
  await t.ev(
    `window.__mc.store.setState(s=>({profile:{...s.profile,owned:[...new Set([...s.profile.owned, ...${JSON.stringify(all)}])]}}));1`,
  );
  const clip = JSON.parse(
    await t.ev(
      `(()=>{const b=document.querySelector('[data-testid=avatar-view]').getBoundingClientRect();return JSON.stringify({x:b.left+b.width*0.3,y:b.top+b.height*0.06,width:b.width*0.4,height:b.height*0.8})})()`,
    ),
  );
  const views = [
      [-0.35, 'idle'],
      [Math.PI / 2, 'walk'],
      [Math.PI, 'idle'],
    ],
    tmp = `${out}/_celda.png`,
    cells = {};
  for (const body of ['m', 'h']) {
    await t.ev(`${S}.setAvatar({ body: '${body}', hair: '${body === 'm' ? 'pelo_largo' : 'pelo_corto'}' })`);
    for (const id of all) {
      await t.ev(`${S}.equip('${id}')`);
      for (const [yaw, anim] of views) {
        await t.ev(`window.__mcAvView={yaw:${yaw},anim:'${anim}'};1`);
        await t.sleep(anim === 'walk' ? 300 : 160);
        await t.shot(tmp, clip);
        (cells[body + id] ??= []).push(readFileSync(tmp).toString('base64'));
      }
    }
  }
  ok(!t.errors.length, `errores: ${t.errors.join(' | ')}`);
  const half = Math.ceil(all.length / 2);
  for (const body of ['m', 'h'])
    for (let h = 0; h < 2; h++) {
      const part = all.slice(h * half, (h + 1) * half);
      const html =
        `<body style="margin:0;background:#20303c;font:bold 13px sans-serif;color:#fff;display:grid;grid-template-columns:repeat(5,1fr);gap:3px">` +
        part
          .map(
            (id) =>
              `<div style="background:#2b3f4e;text-align:center">${cells[body + id].map((b) => `<img src="data:image/png;base64,${b}" style="height:200px">`).join('')}<div style="height:15px">${id}</div></div>`,
          )
          .join('') +
        '</body>';
      await t.ev(`(()=>{document.open();document.write(${JSON.stringify(html)});document.close();return 1})()`);
      await t.sleep(500);
      await t.shot(`${out}/hoja-${body}-${h + 1}.png`);
    }
  rmSync(tmp, { force: true });
} catch (e) {
  fail = e;
}
await t.close();
if (fail) {
  console.error('FALLA:', fail.message);
  process.exit(1);
}
console.log('PASA');
