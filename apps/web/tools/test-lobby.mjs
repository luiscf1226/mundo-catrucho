import {run} from './harness.mjs';
const file=process.argv[2]||'/tmp/claude-1000/mc-lobby/mundo-catrucho-hd.html';
const dir='/tmp/claude-1000/mc-lobby/shots';
let passed=true;
for(const [name,hour] of [['dia',10],['tarde',17.6]]){
 const ok=await run(`lobby-${name}`,file,{hash:`#go,hora=${hour}`,width:1600,height:900},async t=>{
  await t.waitFor(`window.__mc.store.getState().screen==='world'`);await t.sleep(1500);
  const assert=async(expr,msg)=>{if(!await t.ev(expr))throw Error(msg);};
  await assert(`[...window.__mc.interactions].filter(i=>i.label.startsWith('Entrar a ')&&!i.label.includes('tienda')).length===18`,'18 portales de departamentos');
  await assert(`![...window.__mc.interactions].some(i=>i.label.startsWith('Jugar '))`,'sin portales directos a minijuegos');
  await assert(`[...window.__mc.interactions].filter(i=>i.label.startsWith('Conocer:')).length===12`,'12 placas del paseo');
  // Vista de llegada con escala humana; vista elevada para comprobar geografía y biomas.
  await t.ev(`window.__mc.player.fixedCam={pos:[-49,14,145],target:[-40,4,53],fov:61}`);await t.sleep(700);await t.shot(`${dir}/${name}-llegada.png`);
  await t.ev(`window.__mc.player.fixedCam={pos:[0,255,100],target:[0,0,5],fov:62}`);await t.sleep(700);await t.shot(`${dir}/${name}-mapa.png`);
  const calls=await t.calls(),fps=await t.fps();console.log(name,'mapa',JSON.stringify(calls),'fps',fps);if(calls.calls>350)throw Error(`Llamadas: ${calls.calls}`);if(fps<55)throw Error(`FPS: ${fps}`);
  if(name==='tarde')return;
  await t.ev(`window.__mc.player.fixedCam=null`);
  const approach=async label=>{
   await t.ev(`(()=>{const s=window.__mc.store.getState();s.closePanel();s.closeDialog();const i=[...window.__mc.interactions].find(i=>i.label===${JSON.stringify(label)});if(!i)throw Error('Falta ${label}');window.__mc.player.teleport(i.x,window.__mc.phys.ground(i.x,i.z+4),i.z+4,0);})()`);
   await t.hold('w',450);await t.sleep(100);await t.press('e');await t.sleep(200);
  };
  for(const [label,panel] of [['Viajar','transporte'],['Ver mapa de Honduras','mapa'],['Entrar a la tienda','tienda'],['Abrir el ropero','personaje']]){await approach(label);await t.waitFor(`!!document.querySelector('[data-testid="panel-${panel}"]')`);await t.ev(`window.__mc.store.getState().closePanel()`);}
  await approach('Conocer: Copán: piedra y memoria');await assert(`!!window.__mc.store.getState().dialog`,'placa informativa');await t.ev(`window.__mc.store.getState().closeDialog()`);
  await approach('Manejar el mototaxi');await assert(`!!window.__mc.player.vehicle`,'mototaxi disponible');const start=(await t.state()).pos;await t.hold('w',1000);const end=(await t.state()).pos; if(Math.hypot(end[0]-start[0],end[2]-start[2])<2)throw Error('mototaxi no avanza');await t.press('e');
  await approach('Entrar a Comayagua');await assert(`window.__mc.store.getState().scene.kind==='dept'&&window.__mc.store.getState().scene.id==='comayagua'`,'entrar caminando a Comayagua');
 });passed&&=ok;
}
process.exit(passed?0:1);
