// HUD en celular acostado: los botones redondos van en una fila, no se montan sobre la billetera, los chips, la guía
// ni los controles táctiles, y lo que no cabe (amigos, postales, memes) se abre desde Pausa.
// Uso: node tools/test-hud-celular.mjs <archivo.html> [carpeta de capturas]
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from './harness.mjs';

const [file, outArg = 'capturas/hud-celular'] = process.argv.slice(2);
if (!file) {
  console.error('uso: node tools/test-hud-celular.mjs <html> [carpeta]');
  process.exit(2);
}
const out = resolve(outArg),
  fotos = process.env.MC_GPU !== '0';
mkdirSync(out, { recursive: true });
const S = `window.__mc.store.getState()`;
// todo lo que se puede tocar en el HUD, con su caja
const choques = `(()=>{const caja=e=>e.getBoundingClientRect(),out=[];
  const tapa=(a,b)=>!(a.right<=b.left+1||a.left>=b.right-1||a.bottom<=b.top+1||a.top>=b.bottom-1);
  const vis=[...document.querySelectorAll('[data-testid^=hud-btn-],[data-testid=hud-level],[data-testid=hud-coins],[data-testid=hud-room],[data-testid=hud-missions-toggle],[data-testid=guia],[data-testid^=touch-]')]
    .filter(e=>caja(e).width>0);
  for(const e of vis){const b=caja(e);if(b.left<0||b.top<0||b.right>innerWidth||b.bottom>innerHeight)out.push('fuera: '+e.dataset.testid);}
  const botones=vis.filter(e=>e.dataset.testid.startsWith('hud-btn-'));
  for(const a of botones)for(const b of vis)if(a!==b&&!b.dataset.testid.startsWith('hud-btn-')&&tapa(caja(a),caja(b)))out.push(a.dataset.testid+' tapa '+b.dataset.testid);
  return out.join(', ')})()`;

// Toque fiable sin GPU: el botón tiene que ser lo que está encima en su centro (nada lo tapa) y se activa en el DOM.
// El toque sintético de CDP a veces se pierde cuando el hilo principal está ocupado dibujando (GitHub, sin GPU).
const tocar = async (t, tid) => {
  await t.waitFor(`!!document.querySelector('[data-testid="${tid}"]')`, 10000, `data-testid=${tid}`);
  const r =
    await t.ev(`(()=>{const e=document.querySelector('[data-testid="${tid}"]');e.scrollIntoView({block:'center'});
    const b=e.getBoundingClientRect(),en=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
    if(!en||!(e.contains(en)||en.contains(e)))return 'tapado por '+(en?.dataset?.testid||en?.className||en?.tagName);e.click();return 'ok'})()`);
  if (r !== 'ok') throw Error(`no se puede tocar ${tid}: ${r}`);
};

const escenaLista = async (t) => {
  const sinCarga = `!document.querySelector('[data-testid=scene-loading]') && !!window.__mc.gl`;
  await t.waitFor(sinCarga, 60000, 'sin pantalla de carga');
  const f0 = await t.ev('window.__mc.gl.info.render.frame');
  await t.waitFor(`${sinCarga} && window.__mc.gl.info.render.frame > ${f0 + 3}`, 60000, 'la escena dibujando');
};

let ok = true;
for (const [w, h] of [
  [844, 390],
  [640, 360],
  [568, 320],
])
  ok =
    (await run(`hud-celular-${w}x${h}`, file, { hash: '#test', width: w, height: h, touch: true }, async (t) => {
      await t.ev(`localStorage.clear()`);
      await t.ev(`location.reload()`);
      await t.waitFor(`!!document.querySelector('[data-testid=menu]')`);
      await t.ev(`${S}.enterWorld()`);
      await t.waitFor(`${S}.panel === 'personaje'`);
      await t.ev(`${S}.finishCreation(); ${S}.closePanel(); ${S}.pasoGuia(1)`);
      await t.waitFor(`!!document.querySelector('[data-testid=hud-btn-vista]')`, 8000, 'HUD del lobby');
      for (const id of ['mapa', 'personaje', 'tienda', 'misiones', 'pausa'])
        if (!(await t.exists(`hud-btn-${id}`))) throw Error(`${w}x${h}: falta hud-btn-${id}`);
      const mal = await t.ev(choques);
      if (mal) throw Error(`${w}x${h} lobby: ${mal}`);
      if (fotos) await t.shot(`${out}/lobby-${w}x${h}.png`);
      // en un departamento (sin el botón de vista) tampoco
      await t.ev(`${S}.travel('olancho')`);
      // la pantalla de carga sale un momento después de viajar y tapa el HUD: se espera que Olancho ya esté
      // dibujando sin ella
      await t.waitFor(`${S}.scene.id === 'olancho'`, 20000, 'Olancho');
      await escenaLista(t);
      const mal2 = await t.ev(choques);
      if (mal2) throw Error(`${w}x${h} Olancho: ${mal2}`);
      // lo que salió del HUD se abre desde Pausa
      for (const [boton, panel] of [
        ['pause-amigos', 'amigos'],
        ['pause-postales', 'recuerdos'],
        ['pause-memes', 'memes'],
      ]) {
        await tocar(t, 'hud-btn-pausa');
        await t.waitFor(`${S}.panel === 'pausa'`, 15000, 'pausa');
        await tocar(t, boton);
        await t.waitFor(`${S}.panel === '${panel}'`, 15000, `${boton} abre ${panel}`);
        await t.ev(`${S}.closePanel()`);
      }
    })) && ok;

process.exit(ok ? 0 : 1);
