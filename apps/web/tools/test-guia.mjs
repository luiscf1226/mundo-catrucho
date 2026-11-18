// Guía de primeros pasos y misiones con atajo: un jugador nuevo sigue los cuatro pasos (caminar, viajar, jugar y ver
// las misiones) sin saber nada del juego, y cada misión dice dónde se hace. Quien ya jugaba no ve la guía.
// Uso: node tools/test-guia.mjs <archivo.html> [carpeta de capturas]
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { run } from './harness.mjs';

const [file, outArg = 'capturas/guia'] = process.argv.slice(2);
if (!file) {
  console.error('uso: node tools/test-guia.mjs <html> [carpeta]');
  process.exit(2);
}
const out = resolve(outArg);
mkdirSync(out, { recursive: true });
const S = `window.__mc.store.getState()`;
const paso = (t) => t.ev(`${S}.profile.guia`);
const espera = (t, n, que) => t.waitFor(`${S}.profile.guia >= ${n}`, 20000, que);

const nuevo = await run('guia-nuevo', file, { hash: '#test', width: 1280, height: 720 }, async (t) => {
  await t.ev(`localStorage.clear()`);
  await t.ev(`location.reload()`);
  await t.waitFor(`!!document.querySelector('[data-testid=menu]')`);
  await t.click('btn-jugar');
  await t.waitFor(`!!document.querySelector('[data-testid=panel-personaje]')`, 8000, 'editor de personaje');
  await t.click('ed-done');
  await t.waitFor(`${S}.profile.created && !${S}.panel`);
  await t.waitFor(`document.querySelector('[data-testid=guia]')?.dataset.paso === '0'`, 8000, 'la guía en el paso 1');
  await t.waitFor(`!document.querySelector('[data-testid=celebration]')`, 8000, 'fin de la celebración');
  await t.shot(`${out}/01-caminar.png`);
  // 1. caminar: se cumple al moverse unos metros
  await t.holdUntil(['w'], `${S}.profile.guia >= 1`, 20000);
  await t.sleep(300);
  await t.shot(`${out}/02-viajar.png`);
  // 2. viajar: el botón abre el mapa
  await t.click('guia-ir');
  await t.waitFor(`${S}.panel === 'mapa'`, 5000, 'el mapa desde la guía');
  await t.click('map-dept-olancho');
  await t.click('map-go');
  await t.waitFor(`${S}.scene.id === 'olancho'`, 10000, 'llegar a Olancho');
  await espera(t, 2, 'paso de viajar');
  await t.sleep(1500);
  await t.shot(`${out}/03-jugar.png`);
  const txt = await t.text('guia');
  if (!/acercate/.test(txt)) throw Error(`la pista del paso 3 no explica los puestos: ${txt}`);
  // 3. jugar: el botón entra a un juego del departamento
  await t.click('guia-ir');
  await t.waitFor(`${S}.mg?.phase === 'intro' && ${S}.mg.juego?.startsWith('olancho.')`, 8000, 'juego de Olancho');
  if (await t.exists('guia')) throw Error('la guía no debe verse dentro del minijuego');
  await t.click('mg-start');
  await t.waitFor(`${S}.mg?.phase === 'playing'`);
  await t.ev(`${S}.finishMinigame({ won: false, score: 1, stars: 0, label: '1 pts' })`);
  await espera(t, 3, 'paso de jugar');
  // lo guardado también avanzó (el commit de la partida no pisa el de la guía)
  await t.waitFor(
    `JSON.parse(localStorage.getItem('mundo-catrucho-v1')).guia === 3`,
    3000,
    'guía guardada en el paso 4',
  );
  await t.ev(`${S}.exitMinigame()`);
  await t.waitFor(`${S}.scene.kind === 'dept' && !${S}.mg`, 8000, 'volver del minijuego');
  await t.waitFor(`document.querySelector('[data-testid=guia]')?.dataset.paso === '3'`, 5000, 'paso 4 visible');
  await t.shot(`${out}/04-misiones.png`);
  // 4. misiones: abrir el panel termina la guía y avisa
  await t.click('guia-ir');
  await t.waitFor(`${S}.panel === 'misiones'`, 5000, 'misiones desde la guía');
  await espera(t, 4, 'guía terminada');
  await t.waitFor(`${S}.toasts.some(x => x.text.startsWith('¡Ya sabés lo básico'))`, 5000, 'aviso de guía terminada');
  // cada misión sin hacer explica dónde se hace; las que tienen atajo, lo ofrecen
  const misiones = await t.ev(`JSON.stringify(${S}.profile.daily.missions.map(m => m.id))`);
  for (const id of JSON.parse(misiones)) {
    if (
      !(await t.exists(`mission-como-${id}`)) &&
      !(await t.ev(`${S}.profile.daily.missions.find(m=>m.id==='${id}').progress > 0`))
    )
      throw Error(`la misión ${id} no dice cómo se hace`);
  }
  await t.sleep(400);
  await t.shot(`${out}/05-panel-misiones.png`);
  await t.ev(`${S}.closePanel()`);
  await t.sleep(300);
  if (await t.exists('guia')) throw Error('la guía sigue después de terminarla');
  if ((await paso(t)) !== 4) throw Error('la guía no quedó guardada como terminada');
  // misiones fijas para probar atajos y aviso: la feria abre un juego de feria de Santa Bárbara
  await t.ev(
    `window.__mc.store.setState(s=>({profile:{...s.profile,daily:{...s.profile.daily,missions:['m_feria','m_monedas','m_emote'].map(id=>({id,progress:0,claimed:false}))}}}))`,
  );
  await t.ev(`${S}.openPanel('misiones')`);
  for (const id of ['m_feria', 'm_monedas', 'm_emote'])
    await t.waitFor(`!!document.querySelector('[data-testid=mission-ir-${id}]')`, 3000, `atajo de ${id}`);
  await t.click('mission-ir-m_feria');
  await t.waitFor(
    `${S}.mg?.id === 'feria' && ${S}.mg.juego?.startsWith('santabarbara.')`,
    8000,
    'el atajo de la feria abre la feria',
  );
  await t.ev(`${S}.exitMinigame()`);
  await t.waitFor(`!${S}.mg`, 8000, 'salir de la feria');
  // una misión que se cumple avisa una sola vez
  await t.ev(`(()=>{const s=${S};s.bump('emote',3);s.bump('emote',1);})()`);
  await t.sleep(300);
  const avisos = await t.ev(`${S}.toasts.filter(x=>x.text.startsWith('Misión lista: Usá 3 emotes')).length`);
  if (avisos !== 1) throw Error(`la misión lista debe avisar una vez, avisó ${avisos}`);
});

const saltar = await run('guia-saltar', file, { hash: '#test', width: 390, height: 844, touch: true }, async (t) => {
  await t.ev(`localStorage.clear()`);
  await t.ev(`location.reload()`);
  await t.waitFor(`!!document.querySelector('[data-testid=menu]')`);
  await t.ev(`${S}.enterWorld()`);
  await t.waitFor(`${S}.panel === 'personaje'`);
  await t.ev(`${S}.finishCreation(); ${S}.closePanel()`);
  await t.waitFor(`!!document.querySelector('[data-testid=guia]')`, 8000, 'la guía en celular');
  await t.waitFor(`!document.querySelector('[data-testid=celebration]')`, 8000, 'fin de la celebración');
  const txt = await t.text('guia');
  if (!/palanca/.test(txt)) throw Error(`en celular la pista debe hablar de la palanca: ${txt}`);
  // no tapa la palanca ni los botones táctiles
  const choca = await t.ev(`(()=>{const a=document.querySelector('[data-testid=guia]').getBoundingClientRect();
    return [...document.querySelectorAll('[data-testid^=touch-]')].filter(e=>{const b=e.getBoundingClientRect();
    return b.width&&!(b.right<a.left||b.left>a.right||b.bottom<a.top||b.top>a.bottom)}).map(e=>e.dataset.testid).join(',')})()`);
  if (choca) throw Error(`la guía tapa ${choca}`);
  await t.shot(`${out}/06-celular.png`);
  await t.click('guia-saltar');
  await t.waitFor(`${S}.profile.guia === 4 && !document.querySelector('[data-testid=guia]')`, 5000, 'saltar la guía');
  // quien ya jugaba antes de la guía no la ve
  await t.ev(
    `(()=>{const p=JSON.parse(localStorage.getItem('mundo-catrucho-v1'));delete p.guia;localStorage.setItem('mundo-catrucho-v1',JSON.stringify(p));location.reload()})()`,
  );
  await t.waitFor(`!!document.querySelector('[data-testid=menu]')`);
  if ((await paso(t)) !== 4) throw Error('un perfil viejo debe arrancar con la guía terminada');
});

// celular acostado: la guía va compacta en la fila de chips y no tapa la palanca, con las misiones abiertas o cerradas
let acostado = true;
for (const [w, h] of [
  [844, 390],
  [639, 360],
  [640, 360],
  [568, 320],
])
  acostado =
    (await run(`guia-acostado-${w}x${h}`, file, { hash: '#test', width: w, height: h, touch: true }, async (t) => {
      await t.ev(`localStorage.clear()`);
      await t.ev(`location.reload()`);
      await t.waitFor(`!!document.querySelector('[data-testid=menu]')`);
      await t.ev(`${S}.enterWorld()`);
      await t.waitFor(`${S}.panel === 'personaje'`);
      await t.ev(`${S}.finishCreation(); ${S}.closePanel(); ${S}.pasoGuia(1)`);
      await t.waitFor(`!!document.querySelector('[data-testid=guia-ir]')`, 8000, 'la guía compacta');
      // con la lista de misiones abierta la guía cede su lugar y vuelve al cerrarla
      for (const abierto of [false, true, false]) {
        if (
          (await t.ev(`document.querySelector('[data-testid=hud-missions-toggle]').getAttribute('aria-expanded')`)) !==
          String(abierto)
        )
          await t.click('hud-missions-toggle');
        await t.sleep(300);
        if (abierto) {
          if (await t.exists('guia')) throw Error(`${w}x${h}: la guía no cede su lugar a la lista de misiones`);
          continue;
        }
        const mal = await t.ev(`(()=>{const out=[],caja=e=>e.getBoundingClientRect();
          const tapa=(a,b)=>!(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom);
          const g=caja(document.querySelector('[data-testid=guia]'));
          for(const id of ['guia-ir','guia-saltar']){const b=caja(document.querySelector('[data-testid='+id+']'));
            if(b.left<0||b.top<0||b.right>innerWidth||b.bottom>innerHeight||b.width<30)out.push(id+' fuera o aplastado');}
          if(caja(document.querySelector('[data-testid=guia] b')).width<120)out.push('título aplastado');
          for(const e of document.querySelectorAll('[data-testid^=touch-],[data-testid=hud-missions]')){const b=caja(e);
            if(b.width&&tapa(g,b))out.push('tapa '+e.dataset.testid);}
          return out.join(', ')})()`);
        if (mal) throw Error(`${w}x${h} misiones ${abierto ? 'abiertas' : 'cerradas'}: ${mal}`);
        await t.shot(`${out}/acostado-${w}x${h}.png`);
      }
      await t.click('guia-saltar');
      await t.waitFor(`${S}.profile.guia === 4`, 5000, 'saltar en compacto');
    })) && acostado;

process.exit(nuevo && saltar && acostado ? 0 : 1);
