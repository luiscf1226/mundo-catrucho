// Prueba de la interfaz completa y del audio.
// Uso: node tools/test-ui.mjs <archivo.html> [carpeta-capturas] [--hq]
//   Recorre el menú, la creación de personaje, el HUD y todos los paneles, mapa, tienda, misiones, ajustes (con
//   recarga), salas, emotes, pausa y el flujo de un minijuego; revisa el audio; y repite lo esencial en pantalla
//   táctil a 844×390 y 390×844. Con carpeta de capturas guarda una imagen de cada pantalla (--hq = sin #test, a
//   calidad completa). Termina con código 0 e imprime PASA.
import { launch } from './harness.mjs';

const args = process.argv.slice(2),
  file = args.find((a) => a.endsWith('.html')),
  shots = args.find((a) => !a.endsWith('.html') && !a.startsWith('--'));
if (!file) {
  console.error('uso: node tools/test-ui.mjs <html> [capturas] [--hq]');
  process.exit(2);
}
const HASH = `#${[args.includes('--hq') ? '' : 'test', process.env.MC_UI2 ? 'ui2' : ''].filter(Boolean).join(',')}`;
const variant = file.includes('-hd') ? 'hd' : 'roblox';
const PANELS = [
  'mapa',
  'minijuegos',
  'personaje',
  'tienda',
  'misiones',
  'emotes',
  'pausa',
  'ajustes',
  'logros',
  'clasificacion',
  'salas',
  'controles',
  'proyecto',
];
const q = (tid) => `document.querySelector('[data-testid="${tid}"]')`;
const S = `window.__mc.store.getState()`;
let failures = 0;

async function session(name, opts, fn) {
  const t = await launch(file, { hash: HASH, ...opts }),
    size = `${opts.width ?? 1280}x${opts.height ?? 720}`;
  const shot = async (n) => {
    if (shots) {
      await t.sleep(args.includes('--hq') ? 650 : 250);
      await t.shot(`${shots}/${variant}-${size}-${n}.png`);
    }
  };
  const ok = (cond, msg) => {
    if (!cond) throw new Error(msg);
  };
  const has = (tid) => t.exists(tid);
  const need = async (tid, ms = 6000) => t.waitFor(`!!${q(tid)}`, ms, `data-testid=${tid}`);
  const gone = async (tid, ms = 4000) =>
    t.waitFor(`!${q(tid)}`, ms, `que desaparezca ${tid}`).catch(async (e) => {
      throw new Error(
        e.message +
          ' · estado: ' +
          (await t.ev(
            `JSON.stringify({panel:${S}.panel,screen:${S}.screen,foco:document.activeElement?.dataset?.testid||document.activeElement?.tagName,fps:0})`,
          )),
      );
    });
  const st = (expr) =>
    t.ev(`JSON.stringify((s => (${expr}))(${S}))`).then((v) => (v === undefined ? undefined : JSON.parse(v)));
  const setInput = (tid, value) =>
    t.ev(
      `(()=>{const e=${q(tid)};const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');d.set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
  /** el panel cabe en la pantalla y la página no se desborda */
  const fits = async (tid) => {
    await t.ev(
      `Promise.all([${q(tid)}, ...${q(tid)}.querySelectorAll('.mc-panel')].flatMap(e => e.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => 0)))).then(() => 1)`,
    );
    const r = JSON.parse(
      await t.ev(
        `(()=>{const b=${q(tid)}.getBoundingClientRect();return JSON.stringify({l:b.left,t:b.top,r:b.right,b:b.bottom,w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})})()`,
      ),
    );
    ok(r.sw <= r.w && r.sh <= r.h, `${name}: la página se desborda con ${tid} (${r.sw}x${r.sh} > ${r.w}x${r.h})`);
    ok(
      r.l >= -0.5 && r.t >= -0.5 && r.r <= r.w + 0.5 && r.b <= r.h + 0.5,
      `${name}: ${tid} se sale de la pantalla ${JSON.stringify(r)}`,
    );
  };
  /** ningún control visible queda cortado por la derecha o por abajo, y los botones tienen tamaño táctil */
  const controlsOk = async (scope, min = 0) => {
    const bad = JSON.parse(
      await t.ev(
        `(()=>{const out=[];for(const e of ${q(scope)}.querySelectorAll('button,input,[role=button]')){const b=e.getBoundingClientRect();if(!b.width||!b.height)continue;const sc=e.closest('.mc-scroll,.mc-scroll-x');if(sc)continue;const n=e.dataset.testid||e.getAttribute('aria-label')||e.textContent.slice(0,20);if(b.left<-1||b.top<-1||b.right>innerWidth+1||b.bottom>innerHeight+1)out.push('fuera: '+n);else if(${min}&&e.tagName==='BUTTON'){const a=getComputedStyle(e,'::after'),eh=a.content!=='none'&&a.position==='absolute'?b.height+2*Math.abs(parseFloat(a.top)||0):b.height;if(Math.max(b.height,eh)<${min}-0.5)out.push('pequeño ('+Math.round(b.width)+'x'+Math.round(b.height)+'): '+n);}}return JSON.stringify(out)})()`,
      ),
    );
    ok(!bad.length, `${name}: controles con problema en ${scope}: ${bad.join(' | ')}`);
  };
  // Con la emulación táctil de Chromium, Input.dispatchMouseEvent (t.click / t.drag del arnés) nunca responde, así que
  // en las sesiones táctiles los toques se envían como PointerEvent de tipo 'touch' al elemento que de verdad está
  // encima en ese punto (elementFromPoint): si algo lo tapa, el toque no llega y la prueba falla.
  const tap = async (tid, timeout = 8000) => {
    await t.waitFor(`!!${q(tid)}`, timeout, `data-testid=${tid}`);
    const hit = await t.ev(
      `(()=>{const e=${q(tid)};e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2,el=document.elementFromPoint(x,y);if(!el||!(e.contains(el)||el.contains(e)))return 'tapado por '+(el?(el.dataset.testid||el.className||el.tagName):'nada');const o={bubbles:true,cancelable:true,composed:true,clientX:x,clientY:y,pointerId:7,pointerType:'touch',isPrimary:true,button:0,buttons:1};el.dispatchEvent(new PointerEvent('pointerdown',o));el.dispatchEvent(new PointerEvent('pointerup',{...o,buttons:0}));el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,composed:true,clientX:x,clientY:y}));return 'ok'})()`,
    );
    if (hit !== 'ok') throw new Error(`${name}: no se puede tocar ${tid}: ${hit}`);
    await t.sleep(60);
  };
  /** arrastre táctil sostenido sobre un elemento (la palanca): baja el dedo en el centro, lo mueve y lo mantiene */
  const touchDrag = (tid, dx, dy, ms) =>
    t.ev(
      `(async()=>{const e=${q(tid)},b=e.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2,o={bubbles:true,cancelable:true,composed:true,pointerId:9,pointerType:'touch',isPrimary:true,button:0,buttons:1};e.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:x,clientY:y}));const t0=performance.now();while(performance.now()-t0<${ms}){const k=Math.min(1,(performance.now()-t0)/150);e.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:x+${dx}*k,clientY:y+${dy}*k}));await new Promise(r=>setTimeout(r,16));}e.dispatchEvent(new PointerEvent('pointerup',{...o,buttons:0,clientX:x+${dx},clientY:y+${dy}}));})()`,
    );
  const click = opts.touch ? tap : t.click;
  let good = true;
  try {
    await fn({ t, shot, ok, has, need, gone, st, setInput, fits, controlsOk, click, touchDrag });
  } catch (e) {
    good = false;
    console.log(`FALLA ${name}: ${e.message}`);
    if (process.env.MC_TRACE)
      console.log(
        e.stack
          .split('\n')
          .filter((l) => l.includes('test-ui'))
          .slice(0, 3)
          .join('\n'),
      );
    try {
      await t.shot(`/tmp/claude-1000/mc-fail-ui-${variant}-${name}.png`);
      console.log(`  captura: /tmp/claude-1000/mc-fail-ui-${variant}-${name}.png`);
    } catch {}
  }
  if (t.errors.length) {
    good = false;
    console.log(`ERRORES en ${name} (${t.errors.length}):\n  ${[...new Set(t.errors)].slice(0, 12).join('\n  ')}`);
  }
  const net = t.requests.filter((u) => !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u));
  if (net.length) {
    good = false;
    console.log(`RED en ${name}: ${net.slice(0, 5).join(', ')}`);
  }
  await t.close();
  console.log(`${good ? 'ok  ' : 'MAL '} ${name}`);
  if (!good) failures++;
}

// ====================================================================== escritorio: recorrido completo
if (!process.env.MC_ONLY || process.env.MC_ONLY === 'escritorio')
  await session(
    'escritorio',
    { width: 1280, height: 720 },
    async ({ t, shot, ok, has, need, gone, st, setInput, fits, controlsOk }) => {
      await t.ev(`localStorage.clear()`);
      await t.ev(`location.reload()`);
      await t.sleep(1500);
      await need('menu');
      ok(
        (await t.ev(`document.querySelector('.mc-ui')?.dataset.variant`)) === variant,
        'falta data-variant en la raíz de la interfaz',
      );
      for (const b of [
        'btn-jugar',
        'btn-explorar',
        'btn-minijuegos',
        'btn-personaje',
        'btn-tienda',
        'btn-ajustes',
        'btn-controles',
        'btn-salas',
        'btn-proyecto',
        'menu-profile',
      ])
        ok(await has(b), `falta en el menú: ${b}`);
      ok((await t.ev(`window.__mc.audio.state`)) === 'none', 'el audio no debe arrancar antes del primer gesto');
      await t.sleep(900);
      await shot('01-menu');
      // --- menú: paneles pequeños; el primer clic despierta el audio
      await t.click('btn-ajustes');
      await need('panel-ajustes');
      await t.waitFor(`window.__mc.audio.state === 'running'`, 4000, 'AudioContext en running tras el primer clic');
      await t.click('panel-close');
      await gone('panel-ajustes');
      await t.click('btn-controles');
      await need('panel-controles');
      await shot('20-controles');
      await t.click('ctl-tab-tactil');
      await need('ctl-tactil');
      await shot('21-controles-tactil');
      await t.press('Escape');
      await gone('panel-controles');
      await t.click('btn-salas');
      await need('panel-salas');
      await t.click('panel-close');
      await gone('panel-salas');
      await t.click('btn-proyecto');
      await need('panel-proyecto');
      await fits('panel-proyecto');
      await shot('22-proyecto');
      if (variant === 'hd')
        ok(
          (await t.ev(`document.querySelectorAll('[data-testid=plan-section]').length`)) >= 3,
          'el plan técnico no muestra sus secciones',
        );
      else {
        ok(await has('proj-guide'), 'falta la guía del proyecto Roblox');
        await t.click('proj-tab-archivos');
        await t.sleep(200);
        const n = await t.ev(`document.querySelectorAll('[data-testid^="proj-file-"]').length`);
        if (n) {
          await t.ev(`document.querySelector('[data-testid^="proj-file-"]').click()`);
          await need('proj-code');
          await t.click('proj-copy');
          await t.sleep(200);
          await shot('23-proyecto-codigo');
        } else {
          ok(await has('proj-empty'), 'proyecto vacío sin aviso');
          await shot('23-proyecto-vacio');
        }
      }
      await t.click('panel-close');
      await gone('panel-proyecto');
      // --- creación obligatoria de personaje
      await t.click('btn-explorar');
      await need('panel-personaje');
      ok(!(await has('panel-close')), 'la creación de personaje no debe poder cerrarse');
      await t.press('Escape');
      await t.sleep(250);
      await need('panel-personaje');
      await setInput('ed-name', 'Lempirita');
      ok((await st(`s.profile.name`)) === 'Lempirita', 'el nombre no se guardó');
      await t.click('ed-skin-4');
      ok((await st(`s.profile.avatar.skin`)) === '#7a4a2b', 'el tono de piel no cambió');
      await t.click('shop-tab-cabello');
      await t.click('shop-item-pelo_rizado');
      ok((await st(`s.profile.avatar.hair`)) === 'pelo_rizado', 'el cabello no cambió');
      await t.click('color-#6b3a1a');
      ok((await st(`s.profile.avatar.hairColor`)) === '#6b3a1a', 'el color de cabello no cambió');
      await t.click('shop-tab-camisa');
      await t.click('color-#e63946');
      ok((await st(`s.profile.avatar.shirtColor`)) === '#e63946', 'el color de camisa no cambió');
      await t.click('ed-anim-dance');
      await t.sleep(args.includes('--hq') ? 900 : 300);
      await fits('panel-personaje');
      await shot('02-crear-personaje');
      const before = await st(`s.profile.avatar`);
      let changed = false;
      for (let i = 0; i < 4 && !changed; i++) {
        await t.click('ed-random');
        changed = JSON.stringify(await st(`s.profile.avatar`)) !== JSON.stringify(before);
      }
      ok(changed, 'el botón al azar no cambió nada');
      await t.click('ed-skin-2');
      await t.click('shop-tab-camisa');
      await t.click('shop-item-camisa_basica');
      await t.click('color-#00a3d7');
      await t.click('ed-done');
      await t.waitFor(`${S}.profile.created && !${S}.panel`, 5000, 'terminar la creación');
      ok(
        !(await has('mg-intro')) && (await st(`s.scene.kind`)) === 'lobby',
        'tras crear el personaje debe quedar en el lobby',
      );
      await need('toast');
      await need('celebration', 3000);
      await shot('03-logro');
      // --- HUD
      for (const id of ['hud', 'hud-coins', 'hud-level', 'hud-xp', 'hud-room', 'hud-missions-toggle'])
        ok(await has(id), `falta en el HUD: ${id}`);
      ok((await t.text('hud-xp')).includes('XP'), 'hud-xp sin texto');
      ok(
        (await t.ev(`${q('hud-coins')}.dataset.value`)) === String(await st(`s.profile.coins`)),
        'hud-coins no coincide con el perfil',
      );
      await t.waitFor(`!${q('celebration')}`, 6000, 'fin de la celebración');
      await t.sleep(700);
      await shot('04-hud');
      for (const [i, id] of ['mapa', 'minijuegos', 'personaje', 'tienda', 'misiones', 'emotes', 'pausa'].entries()) {
        await t.click(`hud-btn-${id}`);
        await need(`panel-${id}`);
        await fits(`panel-${id}`);
        await controlsOk(`panel-${id}`);
        await shot(`1${i}-panel-${id}`);
        if (i % 2) await t.press('Escape');
        else await t.click('panel-close');
        await gone(`panel-${id}`);
      }
      await t.click('hud-room');
      await need('panel-salas');
      await t.press('Escape');
      await gone('panel-salas');
      if (!(await has('hud-missions'))) await t.click('hud-missions-toggle');
      await need('hud-missions');
      await t.click('hud-missions-toggle');
      await gone('hud-missions');
      // --- mapa: elegir, viajar, volver
      await t.press('m');
      await need('panel-mapa');
      for (const d of [
        'atlantida',
        'choluteca',
        'colon',
        'comayagua',
        'copan',
        'cortes',
        'elparaiso',
        'franciscomorazan',
        'graciasadios',
        'intibuca',
        'islas',
        'lapaz',
        'lempira',
        'ocotepeque',
        'olancho',
        'santabarbara',
        'valle',
        'yoro',
      ])
        ok(await has(`map-dept-${d}`), `falta el departamento ${d}`);
      await t.click('map-dept-copan');
      ok(
        (await t.text('map-sel-name')).trim() === 'Copán',
        `la ficha no muestra Copán: ${await t.text('map-sel-name')}`,
      );
      ok(
        (await t.ev(`${q('map-fact')}.dataset.known`)) === 'false' && (await t.text('map-fact')).includes('Visítalo'),
        'el dato cultural debe estar oculto antes de visitar',
      );
      await shot('05-mapa-copan');
      const c0 = await st(`s.profile.coins`);
      await t.click('map-go');
      await t.waitFor(`${S}.scene.id === 'copan' && !${S}.panel`, 5000, 'viaje a Copán');
      ok((await st(`s.profile.visited`)).includes('copan'), 'Copán no quedó visitado');
      ok((await st(`s.profile.coins`)) === c0 + 15, 'la primera visita debe dar 15');
      await need('hud-banner');
      ok((await t.text('hud-banner')).includes('Copán'), 'el rótulo no dice Copán');
      await t.sleep(600);
      await shot('06-rotulo-copan');
      await t.click('hud-btn-mapa');
      await need('map-fact');
      ok(
        (await t.ev(`${q('map-fact')}.dataset.known`)) === 'true' && (await t.text('map-fact')).includes('Jeroglífica'),
        'el dato cultural debe verse tras visitar',
      );
      ok(
        (await t.text('map-progress')).includes('Visitados 1/18'),
        `progreso del mapa incorrecto: ${await t.text('map-progress')}`,
      );
      await shot('07-mapa-visitado');
      await t.click('map-lobby');
      await t.waitFor(`${S}.scene.kind === 'lobby' && !${S}.panel`, 5000, 'volver al lobby');
      // --- tienda: probar, comprar, sin fondos, poner
      await t.click('hud-btn-tienda');
      await need('panel-tienda');
      await t.click('shop-tab-sombrero');
      const c1 = await st(`s.profile.coins`);
      await t.click('shop-try-gorra');
      await need('shop-trying');
      ok(
        (await st(`s.profile.coins`)) === c1 && !(await st(`s.profile.owned`)).includes('gorra'),
        'probarse algo no debe comprarlo',
      );
      await shot('08-tienda-probar');
      await t.click('shop-item-gorra');
      ok((await st(`s.profile.coins`)) === c1 - 50, 'la gorra debe costar 50');
      ok(
        (await st(`s.profile.owned`)).includes('gorra') && (await st(`s.profile.avatar.hat`)) === 'gorra',
        'la gorra comprada debe quedar puesta',
      );
      await t.click('shop-item-corona_carnaval');
      await need('shop-short');
      ok(
        (await st(`s.profile.coins`)) === c1 - 50 && !(await st(`s.profile.owned`)).includes('corona_carnaval'),
        'no debe comprar sin fondos',
      );
      ok(
        Number(await t.text('shop-missing')) === 200 - (c1 - 50),
        `lo que falta está mal calculado: ${await t.text('shop-missing')}`,
      );
      ok((await t.text('shop-short')).includes('minijuegos'), 'falta la pista de jugar minijuegos');
      await shot('09-tienda-sin-fondos');
      await t.click('shop-item-sin_sombrero');
      ok((await st(`s.profile.avatar.hat`)) === 'sin_sombrero', 'no se quitó el sombrero');
      await t.click('shop-item-gorra');
      ok(
        (await st(`s.profile.avatar.hat`)) === 'gorra' && (await st(`s.profile.coins`)) === c1 - 50,
        'ponerse algo propio no debe cobrar',
      );
      await t.click('shop-tab-emote');
      await need('shop-item-emote_gol');
      await shot('09b-tienda-emotes');
      await t.click('panel-close');
      await gone('panel-tienda');
      await t.click('hud-btn-personaje');
      await t.click('shop-tab-sombrero');
      await t.click('shop-item-sin_sombrero');
      ok((await st(`s.profile.avatar.hat`)) === 'sin_sombrero', 'equipar en el editor falló');
      await t.click('shop-item-gorra');
      await t.click('filter-trad');
      await shot('09c-editor');
      await t.click('ed-done');
      await gone('panel-personaje');
      // --- misiones: avanzar con las acciones públicas y cobrar
      await t.ev(
        `(()=>{const s=${S};for(const ty of ['play','win','goals','visit','pickup','emote','collect','score'])for(const tg of [undefined,'carrera','pulperia','feria'])s.bump(ty,ty==='score'?999:1,tg);for(let i=0;i<25;i++){s.bump('pickup',1);}s.bump('goals',5);s.bump('emote',5);s.bump('visit',5);s.bump('play',5);})()`,
      );
      await t.click('hud-btn-misiones');
      const mid = (await st(`s.profile.daily.missions`))[0].id;
      await need(`mission-claim-${mid}`);
      await shot('16b-misiones-listas');
      const c2 = await st(`s.profile.coins`);
      await t.click(`mission-claim-${mid}`);
      ok(
        (await st(`s.profile.daily.missions[0].claimed`)) === true && (await st(`s.profile.coins`)) > c2,
        'cobrar la misión no pagó',
      );
      ok(!(await has(`mission-claim-${mid}`)), 'la misión cobrada sigue ofreciendo cobrar');
      await t.click('panel-close');
      // --- pausa → ajustes (y "volver"), con recarga para comprobar que se guardan
      await t.press('Escape');
      await need('panel-pausa');
      await t.click('pause-settings');
      await need('panel-ajustes');
      await fits('panel-ajustes');
      await setInput('set-music', 0.25);
      await setInput('set-sfx', 0.5);
      await setInput('set-sens', 1.5);
      await t.click('set-quality-media');
      await t.click('set-invert');
      const want = { music: 0.25, sfx: 0.5, quality: 'media', sens: 1.5, invertY: true };
      ok(
        JSON.stringify(await st(`s.profile.settings`)) === JSON.stringify(want),
        `ajustes no aplicados: ${JSON.stringify(await st(`s.profile.settings`))}`,
      );
      await t.click('set-reset');
      await need('set-reset-confirm');
      await shot('24-ajustes-confirmar');
      await t.click('set-reset-cancel');
      await gone('set-reset-confirm');
      ok((await st(`s.profile.created`)) === true, 'cancelar no debe borrar nada');
      await shot('24b-ajustes');
      await t.click('panel-back');
      await need('panel-pausa');
      await t.ev(`location.reload()`);
      await t.sleep(1500);
      await need('menu');
      ok(
        JSON.stringify(await st(`s.profile.settings`)) === JSON.stringify(want),
        'los ajustes no sobrevivieron la recarga',
      );
      ok(
        (await st(`s.profile.name`)) === 'Lempirita' && (await st(`s.profile.owned`)).includes('gorra'),
        'el perfil no sobrevivió la recarga',
      );
      await t.click('btn-jugar');
      await need('hud');
      ok(!(await st(`s.panel`)), 'con personaje creado, Jugar entra directo');
      await t.sleep(400);
      await setInput('set-music', 0.6).catch(() => {});
      await t.ev(`${S}.setSettings({ music: 0.6, sfx: 0.8, quality: 'alta' })`);
      // --- salas
      await t.press('Escape');
      await t.click('pause-salas');
      await need('panel-salas');
      await t.click('room-create-privada');
      await t.waitFor(
        `${S}.profile.room.mode === 'privada' && ${S}.profile.room.code.length === 5`,
        3000,
        'sala privada',
      );
      const code = await st(`s.profile.room.code`);
      ok(
        (await t.text('room-current')).includes(code) && (await t.text('room-current')).includes('Privada'),
        'la sala actual no muestra el código',
      );
      await t.click('room-copy');
      await t.sleep(250);
      await shot('25-salas');
      await setInput('room-join-input', 'TEGUS');
      await t.click('room-join');
      await t.waitFor(`${S}.profile.room.code === 'TEGUS'`, 3000, 'unirse por código');
      await setInput('room-join-input', '??');
      ok((await t.ev(`${q('room-join-input')}.value`)) === '', 'el código debe aceptar solo letras y números');
      await t.click('room-CEIBA');
      ok((await st(`s.profile.room.code`)) === 'CEIBA', 'entrar a una sala pública de la lista');
      await t.click('room-create-publica');
      await t.waitFor(
        `${S}.profile.room.mode === 'publica' && ${S}.profile.room.code !== 'CEIBA'`,
        3000,
        'sala pública',
      );
      await t.click('room-solo');
      ok((await st(`s.profile.room.mode`)) === 'solo', 'modo solo');
      ok((await t.text('panel-salas')).includes('simulados'), 'falta la nota de jugadores simulados');
      await t.click('panel-close');
      ok((await t.text('hud-room')).includes('Solo'), 'el HUD no muestra la sala');
      // --- emotes
      await t.press('b');
      await need('panel-emotes');
      await t.click('emote-emote_punta');
      await gone('panel-emotes');
      ok((await t.ev(`window.__mc.player.emote?.anim`)) === 'dance', 'el emote no llegó al jugador');
      ok((await st(`s.profile.stats.emotes`)) >= 1, 'el emote no se contó');
      // --- pausa: seguir y accesos
      await t.press('Escape');
      await need('panel-pausa');
      ok(!(await has('pause-restart')), 'Reiniciar solo aparece dentro de un minijuego');
      await t.click('pause-resume');
      await gone('panel-pausa');
      for (const [b, p] of [
        ['pause-controls', 'controles'],
        ['pause-logros', 'logros'],
        ['pause-proyecto', 'proyecto'],
        ['pause-settings', 'ajustes'],
        ['pause-salas', 'salas'],
      ]) {
        await t.press('Escape');
        await need('panel-pausa');
        await t.click(b);
        await need(`panel-${p}`);
        await fits(`panel-${p}`);
        if (p === 'logros') await shot('26-logros');
        await t.click('panel-back');
        await need('panel-pausa');
        await t.click('pause-resume');
        await gone('panel-pausa');
      }
      // --- diálogo
      await t.ev(
        `${S}.showDialog({ title: 'Dato curioso', text: 'La guara roja es el ave nacional de Honduras.', icon: '🦜' })`,
      );
      await need('dialog');
      await shot('27-dialogo');
      await t.click('dialog-close');
      await gone('dialog');
      await t.ev(`${S}.showDialog({ title: 'Otro', text: 'Se cierra con Esc.' })`);
      await need('dialog');
      await t.press('Escape');
      await gone('dialog');
      // --- minijuego: tarjeta → jugar → resultado forzado → otra vez → salir
      await t.click('hud-btn-minijuegos');
      for (const id of ['carrera', 'futbol', 'feria', 'exploradores', 'pulperia'])
        ok(await has(`mg-card-${id}`), `falta la tarjeta de ${id}`);
      await t.click('mg-card-carrera');
      await need('mg-intro');
      await fits('mg-intro');
      ok(
        (await t.text('mg-intro')).includes('Carrera Catrucha') && (await t.text('mg-best')).includes('Aún'),
        'tarjeta de inicio incompleta',
      );
      await t.sleep(500);
      await shot('30-mg-intro');
      await t.click('mg-start');
      await t.waitFor(`${S}.mg?.phase === 'playing'`, 4000, 'empezar minijuego');
      await need('mg-hud');
      await need('mg-timer', 5000);
      ok(
        /^\d+:\d\d$/.test((await t.text('mg-timer')).trim()),
        `cronómetro sin formato m:ss: ${await t.text('mg-timer')}`,
      );
      ok(
        (await has('hud-btn-pausa')) && !(await has('hud-btn-mapa')),
        'en un minijuego el HUD solo deja pausa y emotes',
      );
      await t.sleep(600);
      await shot('31-mg-jugando');
      await t.press('Escape');
      await need('pause-restart');
      await shot('31b-mg-pausa');
      await t.click('pause-resume');
      const p0 = await st(`({ coins: s.profile.coins, xp: s.profile.xp, level: s.profile.level })`);
      await t.ev(`${S}.finishMinigame({ won: true, stars: 3, score: 700, label: '0:50' })`);
      await need('mg-result');
      ok(
        (await t.ev(`${q('mg-result')}.dataset.won`)) === 'true' &&
          (await t.text('mg-result-title')).includes('Ganaste'),
        'resultado: debe decir que ganó',
      );
      ok((await t.text('mg-result-label')).trim() === '0:50', 'resultado: etiqueta incorrecta');
      ok(
        (await t.ev(`${q('mg-result-rewards')}.dataset.coins`)) === '100' &&
          (await t.ev(`${q('mg-result-rewards')}.dataset.xp`)) === '120',
        'resultado: premios incorrectos',
      );
      const rw = await st(`s.mg.rewards`);
      ok((await has('mg-levelup')) === rw.leveledUp, 'resultado: aviso de nivel no coincide');
      ok(await has('mg-record'), 'resultado: falta la nueva marca');
      ok(await has('mg-result-rank'), 'resultado: falta la posición');
      for (const a of rw.newAchievements) ok(await has(`mg-ach-${a}`), `resultado: falta el logro ${a}`);
      ok(
        (await t.ev(`${q('mg-result')}.querySelectorAll('.anim-star').length`)) === 3,
        'resultado: deben verse 3 estrellas ganadas',
      );
      await t.sleep(1900);
      ok(
        (await t.text('mg-result-rewards')).replace(/\s+/g, ' ').includes('+100') &&
          (await t.text('mg-result-rewards')).includes('+120'),
        `resultado: el conteo no llegó al valor final: ${await t.text('mg-result-rewards')}`,
      );
      await fits('mg-result');
      await shot('32-mg-ganaste');
      await t.click('mg-replay');
      await t.waitFor(`${S}.mg?.phase === 'intro' && ${S}.mg.run === 1`, 4000, 'otra vez');
      await need('mg-intro');
      ok((await t.text('mg-best')).includes('0:50'), 'la tarjeta debe mostrar la mejor marca');
      await t.click('mg-start');
      await t.waitFor(`${S}.mg?.phase === 'playing'`);
      const c3 = await st(`s.profile.coins`);
      await t.ev(`${S}.finishMinigame({ won: false, stars: 0, score: 0, label: 'Sin tiempo' })`);
      await need('mg-result');
      ok(
        (await t.ev(`${q('mg-result')}.dataset.won`)) === 'false' && (await t.text('mg-result-title')).includes('Casi'),
        'resultado: debe decir Casi…',
      );
      ok((await st(`s.profile.coins`)) === c3 + 10 && !(await has('mg-record')), 'resultado de derrota incorrecto');
      await t.sleep(1200);
      await shot('33-mg-casi');
      await t.click('mg-exit');
      await t.waitFor(`${S}.scene.kind === 'lobby' && !${S}.mg`, 4000, 'salir al lobby');
      ok((await st(`s.profile.coins`)) > p0.coins, 'las monedas del minijuego no llegaron');
      await t.click('hud-btn-minijuegos');
      await t.click('open-clasificacion');
      await need('lb-you');
      ok(
        (await t.text('lb-you')).includes('Lempirita') && (await t.text('panel-clasificacion')).includes('simulados'),
        'clasificación sin tu fila o sin la nota',
      );
      await shot('34-clasificacion');
      await t.click('lb-tab-futbol');
      ok(!(await has('lb-you')) && (await has('lb-play')), 'en fútbol aún no hay marca');
      await t.click('panel-close');
      // --- audio: estado, música de cada pista y cada efecto
      ok((await t.ev(`window.__mc.audio.state`)) === 'running', 'AudioContext no está en running');
      const tracks = await t.ev(`JSON.stringify(window.__mc.audio.tracks)`).then(JSON.parse),
        sfx = await t.ev(`JSON.stringify(window.__mc.audio.sfxNames)`).then(JSON.parse);
      ok(
        tracks.length === 8 && sfx.length === 24,
        `listas de audio incompletas: ${tracks.length} pistas, ${sfx.length} efectos`,
      );
      for (const tr of tracks) {
        const a = await t
          .ev(`(()=>{const a=window.__mc.audio;a.music(${JSON.stringify(tr)});return JSON.stringify(a.stats)})()`)
          .then(JSON.parse);
        await t.sleep(700);
        const b = await t.ev(`JSON.stringify(window.__mc.audio.stats)`).then(JSON.parse);
        ok(b.steps > a.steps && b.nodes > a.nodes, `la pista ${tr} no programó notas`);
        ok(b.errors === 0, `la pista ${tr} dio errores`);
        ok((await t.ev(`window.__mc.audio.track`)) === tr, 'audio.track no cambió');
      }
      for (const n of sfx) {
        const r = await t
          .ev(
            `(()=>{const a=window.__mc.audio,s0=a.stats.sfx,n0=a.stats.nodes;a.sfx(${JSON.stringify(n)});return JSON.stringify({d:a.stats.sfx-s0,n:a.stats.nodes-n0,e:a.stats.errors})})()`,
          )
          .then(JSON.parse);
        ok(r.d === 1 && r.n >= 1 && r.e === 0, `el efecto ${n} no sonó: ${JSON.stringify(r)}`);
        await t.sleep(40);
      }
      await t.ev(`(()=>{const a=window.__mc.audio;a.init();a.init();a.refresh();a.music('none');a.music('lobby');})()`);
      ok(
        (await t.ev(`window.__mc.audio.state`)) === 'running' && (await t.ev(`window.__mc.audio.stats.errors`)) === 0,
        'init/refresh repetidos dieron errores',
      );
      // --- salir al menú y borrar el progreso (confirmación en dos pasos)
      await t.press('Escape');
      await t.click('pause-menu');
      await need('menu');
      ok(!(await has('hud')), 'el HUD sigue en el menú');
      await t.sleep(500);
      await shot('35-menu-con-progreso');
      await t.click('btn-ajustes');
      await t.click('set-reset');
      await t.click('set-reset-confirm');
      await t.waitFor(`!${S}.profile.created && ${S}.profile.coins === 100 && !${S}.panel`, 3000, 'borrar progreso');
    },
  );

// ====================================================================== táctil: horizontal y vertical
for (const [w, h] of [
  [844, 390],
  [390, 844],
])
  if (!process.env.MC_ONLY || process.env.MC_ONLY === `${w}x${h}`)
    await session(
      `tactil-${w}x${h}`,
      { width: w, height: h, touch: true },
      async ({ t, shot, ok, has, need, gone, st, fits, controlsOk, click, touchDrag }) => {
        await t.ev(`localStorage.clear()`);
        await t.ev(`location.reload()`);
        await t.sleep(1500);
        await need('menu');
        await fits('menu');
        await controlsOk('menu', 44);
        await t.sleep(900);
        await shot('01-menu');
        await click('btn-jugar');
        await need('panel-personaje');
        await fits('panel-personaje');
        await controlsOk('panel-personaje', 44);
        await t.sleep(400);
        await shot('02-crear-personaje');
        await click('ed-skin-1');
        ok((await st(`s.profile.avatar.skin`)) === '#e8b98a', 'el tono de piel no cambió (táctil)');
        await click('ed-done');
        await t.waitFor(`${S}.profile.created && !${S}.panel`, 5000, 'terminar la creación');
        for (const id of ['touch-joy', 'touch-jump', 'touch-use', 'touch-fire', 'touch-emote']) await need(id);
        await fits('hud');
        await controlsOk('hud', 44);
        await controlsOk('touch', 44);
        await t.waitFor(`!${q('celebration')}`, 6000, 'fin de la celebración');
        await t.sleep(1200);
        await shot('04-hud');
        // la palanca mueve al jugador
        const a = (await t.state()).pos;
        await touchDrag('touch-joy', 6, -70, 1300);
        await t.sleep(80);
        const b = (await t.state()).pos;
        ok(Math.hypot(b[0] - a[0], b[2] - a[2]) > 1.5, `la palanca no movió al jugador: ${a} → ${b}`);
        ok(await t.ev(`window.__mc.input.jx === 0 && window.__mc.input.jz === 0`), 'la palanca no volvió al centro');
        // el botón de salto levanta al jugador
        await t.sleep(500);
        await click('touch-jump');
        await t.sleep(120);
        let y = 0;
        for (let i = 0; i < 6; i++) {
          y = Math.max(y, (await t.state()).pos[1]);
          await t.sleep(40);
        }
        ok(y > 0.3, `el botón de saltar no levantó al jugador: y=${y}`);
        await click('touch-emote');
        await need('panel-emotes');
        await fits('panel-emotes');
        await click('emote-emote_saludar');
        await gone('panel-emotes');
        ok(await has('touch-joy'), 'los controles táctiles deben volver al cerrar el panel');
        // todos los paneles caben
        for (const id of PANELS) {
          await t.ev(`${S}.openPanel('${id}')`);
          await need(`panel-${id}`);
          await t.sleep(120);
          await fits(`panel-${id}`);
          await controlsOk(`panel-${id}`, 44);
          ok(!(await has('touch-joy')), 'los controles táctiles deben ocultarse con un panel abierto');
          await shot(`1-panel-${id}`);
          await click('panel-close');
          await gone(`panel-${id}`);
        }
        await t.ev(`${S}.openPanel('mapa')`);
        await click('map-dept-olancho');
        ok((await t.text('map-sel-name')).trim() === 'Olancho', 'tocar un departamento en el mapa');
        await shot('1-panel-mapa-olancho');
        await click('panel-close');
        await t.ev(`${S}.openPanel('tienda')`);
        await click('shop-tab-accesorio');
        await click('shop-item-capa_bandera');
        await need('shop-short');
        await fits('panel-tienda');
        await shot('1-panel-tienda-sin-fondos');
        await click('panel-close');
        await t.ev(
          `${S}.showDialog({ title: 'Dato curioso', text: 'La guara roja es el ave nacional de Honduras.', icon: '🦜' })`,
        );
        await need('dialog');
        await fits('dialog');
        await shot('2-dialogo');
        await click('dialog-close');
        // minijuego
        await t.ev(`${S}.startMinigame('futbol')`);
        await need('mg-intro');
        await fits('mg-intro');
        await controlsOk('mg-intro', 44);
        await t.sleep(400);
        await shot('3-mg-intro');
        await click('mg-start');
        await need('mg-hud');
        await t.ev(
          `${S}.setMgHud({ timer: 75, score: '2 - 1', objective: 'Mete más goles que el otro equipo', lines: ['Segundo tiempo'] })`,
        );
        await t.sleep(300);
        await fits('mg-hud');
        await need('touch-fire');
        await shot('3-mg-jugando');
        await t.ev(`${S}.finishMinigame({ won: true, stars: 2, score: 3, label: '3 - 1', stats: { goals: 3 } })`);
        await need('mg-result');
        await t.sleep(1900);
        await fits('mg-result');
        await controlsOk('mg-result', 44);
        await shot('3-mg-resultado');
        await click('mg-exit');
        await t.waitFor(`${S}.scene.kind === 'lobby' && !${S}.mg`, 4000, 'salir al lobby');
        await t.ev(`${S}.setPrompt({ label: 'Hablar con Doña Toña', icon: '🏪' })`);
        await t.sleep(50);
        if (await has('prompt')) {
          await fits('prompt');
          await shot('4-aviso-interaccion');
        }
      },
    );

console.log(failures ? `NO PASA test-ui (${variant}): ${failures} sesión(es) con fallas` : `PASA test-ui (${variant})`);
process.exit(failures ? 1 : 0);
