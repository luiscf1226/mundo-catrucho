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
      await t.waitFor(
        `${S}.scene.id === 'olancho' && !document.querySelector('[data-testid=scene-loading]')`,
        20000,
        'Olancho',
      );
      const mal2 = await t.ev(choques);
      if (mal2) throw Error(`${w}x${h} Olancho: ${mal2}`);
      // lo que salió del HUD se abre desde Pausa
      for (const [boton, panel] of [
        ['pause-amigos', 'amigos'],
        ['pause-postales', 'recuerdos'],
        ['pause-memes', 'memes'],
      ]) {
        await t.click('hud-btn-pausa');
        await t.waitFor(`${S}.panel === 'pausa'`, 5000, 'pausa');
        await t.click(boton);
        await t.waitFor(`${S}.panel === '${panel}'`, 5000, `${boton} abre ${panel}`);
        await t.ev(`${S}.closePanel()`);
      }
    })) && ok;

process.exit(ok ? 0 : 1);
