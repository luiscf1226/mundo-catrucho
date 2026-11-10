// Prueba de apodos (MC-59): clubes, Selección y marcas van con apodo, nunca con su nombre oficial.
// 1. Busca en src/ y shared/ cada nombre real de shared/data/apodos.json (`busca`) y la lista `vigilar`.
//    Solo se ignoran los ids internos de artículos (at_*, camisa_*), que viven en partidas guardadas.
// 2. Revisa que la tienda use los apodos de apodos.json.
// 3. Abre el juego, va a la tienda → Atuendos → Clubes y → la Bicolor, se prueba cada camiseta, saca capturas y
//    revisa que el texto visible (y las etiquetas de accesibilidad) no tengan nombres reales.
// Uso: node tools/test-apodos.mjs <mundo-catrucho-hd.html> [carpeta-capturas]

import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './harness.mjs';

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [file, out = resolve(web, '../../capturas/mc-59')] = process.argv.slice(2);
if (!file) {
  console.error('uso: node tools/test-apodos.mjs <html> [carpeta-capturas]');
  process.exit(2);
}
const ok = (c, m) => {
  if (!c) throw new Error(m);
};
const APODOS = JSON.parse(readFileSync(join(web, 'shared/data/apodos.json'), 'utf8'));
const prohibidos = [
  ...APODOS.equipos.map((e) => [e.real, new RegExp(e.busca, 'iu')]),
  ...[...APODOS.vigilar.clubes, ...APODOS.vigilar.marcas].map((b) => [b, new RegExp(b, 'iu')]),
];
const ids = APODOS.equipos.flatMap((e) => [...e.atuendos, ...e.camisas]);
const sinIds = (s) => ids.reduce((t, id) => t.replaceAll(id, '·'), s);

// ---- 1. búsqueda en el código y los datos
const archivos = [];
const recorrer = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) {
      if (relative(web, p) !== join('src', 'generated')) recorrer(p);
    } else if (/\.(tsx?|json|css|html|mjs)$/.test(n) && relative(web, p) !== join('shared', 'data', 'apodos.json'))
      archivos.push(p);
  }
};
recorrer(join(web, 'src'));
recorrer(join(web, 'shared'));
const hallazgos = [];
for (const p of archivos) {
  readFileSync(p, 'utf8')
    .split('\n')
    .forEach((linea, i) => {
      const l = sinIds(linea);
      for (const [real, re] of prohibidos)
        if (re.test(l)) hallazgos.push(`${relative(web, p)}:${i + 1} «${real}»: ${linea.trim().slice(0, 120)}`);
      if (/\.real\b/.test(l) && /apodos/.test(readFileSync(p, 'utf8')))
        hallazgos.push(`${relative(web, p)}:${i + 1} lee el campo interno «real»`);
    });
}
ok(!hallazgos.length, `nombres reales en el juego:\n  ${hallazgos.join('\n  ')}`);
console.log(`Búsqueda limpia: ${archivos.length} archivos, ${prohibidos.length} nombres vigilados.`);

// ---- 2. la tienda usa los apodos
const SHOP = JSON.parse(readFileSync(join(web, 'shared/data/shop.json'), 'utf8'));
const item = (id) => SHOP.items.find((i) => i.id === id);
for (const e of APODOS.equipos) {
  for (const id of e.atuendos) {
    const it = item(id);
    ok(it, `falta el atuendo ${id} de ${e.apodo}`);
    if (e.tipo === 'club') ok(it.name === e.apodo, `${id} se llama «${it.name}», no «${e.apodo}»`);
    else ok(it.name.includes(e.apodo.replace(/^La /, '')), `${id} («${it.name}») no lleva el apodo ${e.apodo}`);
    ok(it.grupo === e.tipo, `${id} no está en el grupo ${e.tipo}`);
  }
  for (const id of e.camisas) {
    ok(item(id), `falta la camisa ${id} de ${e.apodo}`);
    if (e.camiseta) ok(item(id).name === e.camiseta, `${id} se llama «${item(id).name}», no «${e.camiseta}»`);
  }
}
console.log('La tienda usa los apodos de apodos.json.');

// ---- 3. en el juego
const S = 'window.__mc.store.getState()';
const real = (txt) => prohibidos.filter(([, re]) => re.test(txt)).map(([r]) => r);
const textoVisible = () =>
  `(()=>{const p=document.querySelector('[data-testid=panel-tienda]');return p.innerText+'\\n'+[...p.querySelectorAll('[aria-label]')].map(e=>e.getAttribute('aria-label')).join('\\n')})()`;
const pasa = await run('apodos', resolve(file), { hash: '#test', width: 1920, height: 1080 }, async (t) => {
  await t.waitFor(`!!document.querySelector('[data-testid=btn-jugar]')`);
  await t.click('btn-jugar');
  await t.waitFor(`!!document.querySelector('[data-testid=ed-done]')`);
  await t.click('ed-done');
  await t.waitFor(`${S}.profile.created && !${S}.panel`, 15000, 'terminar creación');
  await t.ev(`${S}.addCoins(5000)`);
  await t.ev(`${S}.openPanel('tienda')`);
  await t.click('shop-tab-atuendo');
  const seleccion = APODOS.equipos.find((e) => e.id === 'seleccion');
  const etiqueta = await t.ev(`document.querySelector('[data-testid=filter-grupo-seleccion]').innerText`);
  ok(etiqueta.includes(seleccion.apodo), `el filtro de la Selección dice «${etiqueta}»`);
  const clip = JSON.parse(
    await t.ev(
      `(()=>{const b=document.querySelector('[data-testid=avatar-view]').getBoundingClientRect();return JSON.stringify([{x:b.left+b.width*0.3,y:b.top+b.height*0.14,width:b.width*0.4,height:b.height*0.72},{x:b.left+b.width*0.38,y:b.top+b.height*0.4,width:b.width*0.24,height:b.height*0.16}])})()`,
    ),
  );
  const pecho = [];
  const celdas = [],
    tmp = join(out, '_celda.png');
  for (const grupo of ['club', 'seleccion']) {
    await t.click(`filter-grupo-${grupo}`);
    await t.sleep(300);
    const lista = JSON.parse(
      await t.ev(
        `JSON.stringify([...document.querySelectorAll('[data-testid^=shop-card-at_]')].map(e=>[e.dataset.testid.slice(10),e.querySelector('b').innerText]))`,
      ),
    );
    ok(lista.length >= (grupo === 'club' ? 6 : 3), `pocos atuendos en ${grupo}: ${lista.length}`);
    for (const [id, nombre] of lista) {
      await t.click(`shop-try-${id}`);
      await t.waitFor(`!!document.querySelector('[data-testid=shop-trying]')`, 4000, `probarse ${id}`);
      const malos = real(await t.ev(textoVisible()));
      ok(!malos.length, `al probarse ${id} se ve: ${malos.join(', ')}`);
      const vistas = [];
      for (const yaw of [0, Math.PI]) {
        await t.ev(`window.__mcAvView={yaw:${yaw},anim:'idle'};1`);
        await t.sleep(400);
        await t.shot(tmp, clip[0]);
        vistas.push(readFileSync(tmp).toString('base64'));
        if (yaw === 0) {
          await t.shot(tmp, clip[1]);
          pecho.push([nombre, readFileSync(tmp).toString('base64')]);
        }
      }
      celdas.push([nombre, vistas]);
    }
    await t.ev(`window.__mcAvView={yaw:-0.35,anim:'idle'};1`);
    await t.click(`shop-try-${lista[0][0]}`);
    await t.sleep(400);
    await t.shot(join(out, `tienda-${grupo}.png`));
    const malos = real(await t.ev(textoVisible()));
    ok(!malos.length, `en la tienda (${grupo}) se ve: ${malos.join(', ')}`);
  }
  // camisetas sueltas de la Bicolor (pestaña Camisa)
  await t.click('shop-tab-camisa');
  await t.click('shop-try-camisa_h');
  await t.sleep(400);
  await t.shot(join(out, 'tienda-camisas.png'));
  ok(!real(await t.ev(textoVisible())).length, 'nombres reales en la pestaña Camisa');
  ok(!t.errors.length, `errores: ${t.errors.join(' | ')}`);
  // hojas con todas las camisetas (frente y espalda) y los escudos de cerca, rotuladas con el nombre que ve el jugador
  const hoja = async (html, png) => {
    await t.ev(`(()=>{document.open();document.write(${JSON.stringify(html)});document.close();return 1})()`);
    await t.sleep(500);
    await t.shot(join(out, png));
  };
  await hoja(
    `<body style="margin:0;background:#20303c;font:bold 18px sans-serif;color:#fff;display:grid;grid-template-columns:repeat(5,1fr);gap:4px">` +
      pecho
        .map(
          ([n, b]) =>
            `<div style="background:#2b3f4e;text-align:center"><img src="data:image/png;base64,${b}" style="height:455px"><div>${n}</div></div>`,
        )
        .join('') +
      '</body>',
    'escudos.png',
  );
  const html =
    `<body style="margin:0;background:#20303c;font:bold 15px sans-serif;color:#fff;display:grid;grid-template-columns:repeat(5,1fr);gap:4px">` +
    celdas
      .map(
        ([n, v]) =>
          `<div style="background:#2b3f4e;text-align:center">${v.map((b) => `<img src="data:image/png;base64,${b}" style="height:380px">`).join('')}<div style="height:20px">${n}</div></div>`,
      )
      .join('') +
    '</body>';
  await hoja(html, 'hoja-camisetas.png');
  rmSync(tmp, { force: true });
  console.log(`Capturas en ${out}`);
});
process.exit(pasa ? 0 : 1);
