// MC-02 y MC-57: vista desde arriba del mapa gigante (rueda, botón, toque para volver) y el juego con mando.
// Uso: node tools/test-camara-mando.mjs <archivo.html> [carpeta-capturas]
import { run } from './harness.mjs';

const file = process.argv[2],
  shots = process.argv[3] ?? '../../capturas/mc-02-57';
if (!file) {
  console.error('uso: node tools/test-camara-mando.mjs <html> [capturas]');
  process.exit(2);
}
const S = `window.__mc.store.getState()`,
  P = `window.__mc.player`;
const wheel = (dy, n) =>
  `(()=>{const c=document.querySelector('canvas');for(let i=0;i<${n};i++)c.dispatchEvent(new WheelEvent('wheel',{deltaY:${dy},bubbles:true,cancelable:true}))})()`;
const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
};
// botón con el foco (el panel también tiene data-testid y recibe el foco al abrirse; ese no cuenta)
const focused = `(document.activeElement?.tagName==='BUTTON' && document.activeElement.dataset.testid) || ''`;

const ok = await run('camara-mando', file, { hash: '#go' }, async (t) => {
  await t.waitFor(`!!document.querySelector('[data-testid=hud]') && !!document.querySelector('canvas')`);
  await t.waitFor(`${S}.scene.kind==='lobby' && !${S}.panel`);
  await t.sleep(800);

  // ---------- MC-02: rueda hasta la vista desde arriba
  await t.ev(wheel(120, 30));
  await t.waitFor(`${P}.overview`, 5000, 'la rueda lleva a la vista desde arriba');
  await t.waitFor(`${P}.overviewT >= 1`, 8000);
  await t.sleep(600);
  await t.shot(`${shots}/01-vista-arriba.png`);
  const rot = await t.ev(`window.__mcTest.vista.rotulos()`);
  if (rot.length !== 18) throw new Error(`se esperaban 18 rótulos, hay ${rot.length}`);
  const fuera = rot.filter((r) => !r.dentro).map((r) => r.id);
  if (fuera.length) throw new Error(`rótulos fuera de pantalla: ${fuera.join(', ')}`);
  const chicos = rot.filter((r) => r.h < 14).map((r) => `${r.id}=${r.h.toFixed(1)}px`);
  if (chicos.length) throw new Error(`rótulos muy chiquitos: ${chicos.join(', ')}`);
  const choques = [];
  for (let i = 0; i < rot.length; i++)
    for (let j = i + 1; j < rot.length; j++) {
      const a = rot[i],
        b = rot[j];
      const ox = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2),
        oy = Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2);
      if (ox > 4 && oy > 4) choques.push(`${a.id}/${b.id}`);
    }
  if (choques.length) throw new Error(`rótulos encimados: ${choques.join(', ')}`);
  console.log(
    `18 rótulos dentro; alto ${Math.min(...rot.map((r) => r.h)).toFixed(0)}–${Math.max(...rot.map((r) => r.h)).toFixed(0)} px`,
  );
  if (!(await t.exists('hud-vista-volver'))) throw new Error('falta el botón para volver al muñeco');
  console.log('vista fps', await t.fps(), 'llamadas', JSON.stringify(await t.calls()));
  // un toque (clic sin arrastrar) en el mapa vuelve al muñeco
  await t.mouse(640, 300);
  await t.waitFor(`!${P}.overview && ${P}.overviewT === 0`, 6000, 'un toque vuelve al muñeco');
  await t.shot(`${shots}/02-de-vuelta.png`);
  // con el botón del HUD, ida y vuelta
  await t.click('hud-btn-vista');
  await t.waitFor(`${P}.overviewT >= 1`, 8000, 'el botón lleva a la vista desde arriba');
  await t.click('hud-vista-volver');
  await t.waitFor(`${P}.overviewT === 0`, 6000, 'el botón vuelve al muñeco');
  // rueda hacia adelante también vuelve
  await t.click('hud-btn-vista');
  await t.waitFor(`${P}.overview`);
  await t.ev(wheel(-120, 1));
  await t.waitFor(`!${P}.overview`, 3000, 'la rueda hacia adelante vuelve');

  // pellizco con dos dedos: juntarlos aleja hasta la vista de arriba; separarlos vuelve
  const pinch = (from, to) =>
    t.ev(`(async()=>{const c=document.querySelector('canvas'),f=(t,id,x)=>c.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',clientX:x,clientY:360,bubbles:true}));
      const n=12,raf=()=>new Promise(r=>requestAnimationFrame(r));f('pointerdown',11,640-${from});f('pointerdown',12,640+${from});
      for(let i=1;i<=n;i++){const d=${from}+(${to}-${from})*i/n;f('pointermove',11,640-d);f('pointermove',12,640+d);await raf();}
      f('pointerup',11,640-${to});f('pointerup',12,640+${to});})()`);
  await pinch(220, 10);
  await t.waitFor(`${P}.overview`, 5000, 'el pellizco lleva a la vista desde arriba');
  await pinch(10, 120);
  await t.waitFor(`!${P}.overview`, 5000, 'separar los dedos vuelve al muñeco');
  await t.waitFor(`${P}.overviewT === 0`, 6000);

  // ---------- MC-57: mando simulado
  await t.ev(`(()=>{window.__pad={id:'Mando de prueba (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',timestamp:0,
    axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
    navigator.getGamepads=()=>[window.__pad];})()`);
  const btn = (b, on) =>
    t.ev(`(()=>{const x=window.__pad.buttons[${BTN[b]}];x.pressed=${on};x.value=${on ? 1 : 0}})()`);
  const axis = (i, v) => t.ev(`window.__pad.axes[${i}]=${v}`);
  // espera dos cuadros de la página para que el sondeo del mando vea el cambio
  const frames = () =>
    t.ev(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))))`);
  const tap = async (b) => {
    await btn(b, true);
    await frames();
    await btn(b, false);
    await frames();
  };
  await tap('X'); // cualquier botón lo detecta
  await t.waitFor(`window.__mc.input.pad`, 3000, 'se detecta el mando');
  await t.waitFor(`document.querySelector('.mc-ui')?.dataset.pad==='true'`);
  // mover con el stick izquierdo
  const p0 = await t.ev(`${P}.pos.slice()`);
  await axis(1, -1);
  await t.waitFor(`Math.hypot(${P}.pos[0]-(${p0[0]}),${P}.pos[2]-(${p0[2]}))>=1.5`, 20000).catch(() => {
    throw new Error('el stick izquierdo no movió al muñeco');
  });
  await axis(1, 0);
  // saltar con A
  await t.waitFor(`${P}.body.grounded`, 5000);
  const y0 = await t.ev(`${P}.pos[1]`);
  await btn('A', true);
  await t.waitFor(`${P}.pos[1]-(${y0})>=0.25`, 8000, 'A salta');
  await btn('A', false);
  // girar la cámara con el stick derecho
  const yaw0 = await t.ev(`${P}.camYaw`);
  await axis(2, 1);
  await t.waitFor(`Math.abs(${P}.camYaw-(${yaw0}))>0.3`, 8000, 'el stick derecho gira la cámara');
  await axis(2, 0);
  // RB aleja hasta la vista desde arriba; A vuelve
  await btn('RB', true);
  await t.waitFor(`${P}.overview`, 10000, 'RB lleva a la vista desde arriba');
  await btn('RB', false);
  await t.waitFor(`${P}.overviewT >= 1`, 8000);
  await t.shot(`${shots}/03-vista-mando.png`);
  await tap('A');
  await t.waitFor(`!${P}.overview`, 3000, 'A vuelve al muñeco');
  // X = usar, RT = disparar (llegan a input)
  await t.ev(`window.__mc.input.pressed.clear()`);
  await btn('RT', true);
  await t.waitFor(`window.__mc.input.pressed.has('fire')`, 3000, 'RT dispara');
  await btn('RT', false);
  // Start abre la pausa, la cruceta mueve el foco, A pulsa, B vuelve
  await tap('START');
  await t.waitFor(`${S}.panel==='pausa'`, 3000, 'Start abre la pausa');
  await tap('DOWN');
  await t.waitFor(`${focused}!==''`, 3000, 'la cruceta pone el foco en un botón');
  // Seguir (ancho) → abajo: Reaparecer → derecha: Controles
  const f1 = await t.ev(focused);
  if (f1 === 'pause-resume') await tap('DOWN');
  const f2 = await t.ev(focused);
  await tap('RIGHT');
  console.log('foco pausa:', f1, '→', f2, '→', await t.ev(focused));
  if ((await t.ev(focused)) !== 'pause-controls') throw new Error(`no llegó a Controles: ${await t.ev(focused)}`);
  const ring = await t.ev(`getComputedStyle(document.activeElement).outlineStyle`);
  if (ring === 'none') throw new Error('el foco del mando no se ve');
  await t.shot(`${shots}/04-pausa-foco.png`);
  await tap('A');
  await t.waitFor(`${S}.panel==='controles'`, 3000, 'A pulsa el botón enfocado');
  await t.waitFor(`!!document.querySelector('[data-testid=ctl-mando]')`, 3000, 'Controles abre en la pestaña Mando');
  await t.shot(`${shots}/05-controles-mando.png`);
  await tap('B');
  await t.waitFor(`${S}.panel==='pausa'`, 3000, 'B vuelve a la pausa');
  await tap('B');
  await t.waitFor(`!${S}.panel`, 3000, 'B cierra la pausa');
  // Select abre el mapa; B lo cierra
  await tap('SELECT');
  await t.waitFor(`${S}.panel==='mapa'`, 3000, 'Select abre el mapa');
  await tap('RIGHT');
  await t.waitFor(`${focused}!==''`, 3000);
  await tap('B');
  await t.waitFor(`!${S}.panel`, 3000);
  // menú principal con foco: A con el foco en Jugar entra al mundo
  await t.ev(`${S}.goMenu()`);
  await t.waitFor(`!!document.querySelector('[data-testid=menu]')`);
  await tap('DOWN');
  await t.waitFor(`${focused}!==''`, 3000, 'foco en el menú');
  for (let i = 0; i < 8 && (await t.ev(focused)) !== 'btn-jugar'; i++) await tap('UP');
  if ((await t.ev(focused)) !== 'btn-jugar') throw new Error(`el foco no llegó a Jugar: ${await t.ev(focused)}`);
  await t.shot(`${shots}/06-menu-foco.png`);
  await tap('A');
  await t.waitFor(`${S}.screen==='world'`, 5000, 'A en Jugar entra al mundo');
  // minijuego: A enfoca Empezar, A otra vez lo empieza; el stick llega a input
  await t.ev(`${S}.startJuego('comayagua.mangos')`);
  await t.waitFor(`!!document.querySelector('[data-testid=mg-intro]')`, 8000);
  await tap('A');
  await t.waitFor(`${focused}==='mg-start'`, 3000, 'A enfoca Empezar');
  await tap('A');
  await t.waitFor(`${S}.mg?.phase==='playing'`, 5000, 'A empieza el minijuego');
  await axis(0, 1);
  await t.waitFor(`window.__mc.input.mx>0.9`, 3000, 'el stick llega al minijuego');
  await t.shot(`${shots}/07-minijuego.png`);
  await axis(0, 0);
  await t.ev(`${S}.exitMinigame?.() ?? ${S}.goLobby()`);
  await t.waitFor(`!${S}.mg`, 5000);
  // viaje: Y cambia la radio
  await t.ev(`${S}.addCoins(50)`);
  await t.ev(`${S}.startViaje('bus','olancho')`);
  await t.waitFor(`!!document.querySelector('[data-testid=viaje-radio]')`, 8000);
  const r0 = await t.text('viaje-radio');
  await tap('Y');
  await t.waitFor(
    `document.querySelector('[data-testid=viaje-radio]').innerText!==${JSON.stringify(r0)}`,
    3000,
    'Y cambia la radio',
  );
  console.log('fps', await t.fps());
});
process.exit(ok ? 0 : 1);
