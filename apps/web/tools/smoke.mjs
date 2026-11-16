// Prueba de humo de punta a punta (versión 3D): menú → crear personaje → mapa gigante → caminar → mapa 2D → departamento →
// un juego de cada motor arranca → terminal y viaje simulado → tienda → guardado.
// Uso: node tools/smoke.mjs <archivo.html> [carpeta-capturas]
import { run } from './harness.mjs';

const file = process.argv[2],
  shots = process.argv[3];
if (!file) {
  console.error('uso: node tools/smoke.mjs <html> [capturas]');
  process.exit(2);
}
const S = `window.__mc.store.getState()`;
// un juego del catálogo por cada motor viejo (sin punto = motor sin juego en el catálogo: se abre con startMinigame)
const JUEGOS = [
  'olancho.pastel',
  'olancho.jaripeo',
  'atlantida.punta-en-sambo-creek',
  'lapaz.estanzuela',
  'cortes.pesca-en-yojoa',
  'yoro.lluvia',
  'lapaz.ticucos',
  'lapaz.catacion',
  'franciscomorazan.rapidito',
  'ocotepeque.tresfronteras',
  'lapaz.feriamarcala',
  'lapaz.pintadas',
  'franciscomorazan.pulperia',
  'carrera',
  'lempira.barro-de-la-campa',
  'lempira.opalo-de-erandique',
  'lempira.la-montana-reparte-agua',
  'lempira.geometria-del-fuerte-san-cristobal',
  'lempira.colohete-por-capas',
  'lempira.cana-al-trapiche',
  'lempira.la-pausa-tambien-cuenta',
  // El Paraíso
  'elparaiso.danli-pregunta-por-su-maiz',
  'elparaiso.montuca-de-danli',
  'elparaiso.maiz-convertido-en-carroza',
  'elparaiso.plata-bajo-yuscaran',
  'elparaiso.tapisca-de-jamastran',
  'elparaiso.yuscaran-por-sus-aleros',
  'elparaiso.el-sello-va-antes',
  'elparaiso.cafe-que-no-se-riega',
  // Valle
  'valle.curiles-entre-raices',
  'valle.bicitaxi-de-amapala',
  'valle.lancha-lista-de-coyolito',
  'valle.el-tigre-desde-el-golfo',
  'valle.cayuco-entre-raices',
  'valle.jocotes-con-sal-pareja',
  'valle.el-manglar-sostiene-al-golfo',
  'valle.el-punche-no-va-de-frente',
  // Choluteca
  'choluteca.el-puente-y-el-cauce',
  'choluteca.noche-de-punta-raton',
  'choluteca.estanques-de-marcovia',
  'choluteca.sombra-al-mediodia',
  'choluteca.miel-dentro-de-la-rosquilla',
  'choluteca.cuero-que-queda-parejo',
  'choluteca.bus-sureno-con-brisa',
  'choluteca.cedeno-deja-tres-marcas',
];
const ok = await run('smoke', file, { hash: '#test' }, async (t) => {
  await t.ev(`localStorage.clear()`);
  await t.ev(`location.reload()`);
  await t.sleep(1500);
  await t.waitFor(`!!document.querySelector('[data-testid=menu]')`);
  if (await t.exists('btn-minijuegos')) throw new Error('el menú todavía tiene el botón de minijuegos');
  if (shots) await t.shot(`${shots}/01-menu.png`);
  await t.click('btn-jugar');
  await t.waitFor(
    `!!document.querySelector('[data-testid=panel-personaje]')`,
    8000,
    'editor de personaje en la primera entrada',
  );
  if (shots) await t.shot(`${shots}/02-personaje.png`);
  await t.click('ed-done');
  await t.waitFor(`${S}.profile.created && !${S}.panel`);
  await t.waitFor(`!!document.querySelector('canvas')`);
  await t.sleep(1500);
  if (await t.exists('hud-btn-minijuegos')) throw new Error('el HUD todavía tiene el botón de minijuegos');
  // Se espera por lo que pasa y no por tiempo fijo: sin GPU (GitHub Actions) el juego corre a pocos cuadros por segundo.
  const P = 'window.__mc.player.pos';
  const p0 = (await t.state()).pos;
  await t.holdUntil('w', `Math.hypot(${P}[0] - (${p0[0]}), ${P}[2] - (${p0[2]})) >= 1.5`, 30000).catch(async () => {
    throw new Error(`el personaje no se movió con W: ${p0} → ${(await t.state()).pos}`);
  });
  const y0 = (await t.state()).pos[1];
  await t.holdUntil(' ', `${P}[1] - (${y0}) >= 0.25`, 15000).catch(async () => {
    throw new Error(`el salto no levantó al personaje: y=${(await t.state()).pos[1]}`);
  });
  if (shots) await t.shot(`${shots}/03-lobby.png`);
  console.log('lobby fps', await t.fps());
  // mapa 2D: ficha con juegos y viaje directo
  await t.click('hud-btn-mapa');
  await t.click('map-dept-olancho');
  const n = await t.text('map-juegos');
  if (!/\d+ juegos/.test(n ?? '')) throw new Error(`la ficha del mapa no muestra los juegos: ${n}`);
  if (shots) await t.shot(`${shots}/04-mapa.png`);
  await t.click('map-go');
  await t.waitFor(`${S}.scene.id==='olancho'`);
  await t.sleep(1200);
  if (shots) await t.shot(`${shots}/05-olancho.png`);
  console.log('olancho fps', await t.fps());
  // un juego por motor
  const motores = new Set();
  for (const id of JUEGOS) {
    await t.ev(id.includes('.') ? `${S}.startJuego('${id}')` : `${S}.startMinigame('${id}')`);
    await t.waitFor(`!!document.querySelector('[data-testid=mg-intro]')`, 8000, `intro de ${id}`);
    if (id === 'olancho.pastel') {
      if (shots) await t.shot(`${shots}/06-intro.png`);
      await t.click('mg-modo-duo');
      if ((await t.ev(`${S}.mg.modo`)) !== 'duo') throw new Error('no cambió el modo');
      await t.click('mg-modo-solo');
    }
    await t.click('mg-start');
    await t.waitFor(`${S}.mg?.phase==='playing'`);
    motores.add(await t.ev(`${S}.mg.id`));
    await t.sleep(1300);
    if (shots) await t.shot(`${shots}/mg-${id.replace('.', '-')}.png`);
    console.log(id.padEnd(28), 'fps', await t.fps());
    await t.ev(`${S}.exitMinigame()`);
    await t.waitFor(id.includes('.') ? `${S}.scene.kind==='dept' && !${S}.mg` : `!${S}.mg`, 8000, `volver de ${id}`);
    await t.sleep(250);
  }
  if (motores.size !== JUEGOS.length)
    throw new Error(`la lista no prueba un motor distinto por juego: ${[...motores]}`);
  // terminal: viaje simulado
  await t.ev(`${S}.goLobby()`);
  await t.sleep(600);
  await t.ev(`${S}.openPanel('transporte')`);
  await t.click('tr-veh-rapidito');
  await t.click('tr-to-copan');
  const c0 = (await t.state()).coins;
  await t.click('tr-go');
  await t.waitFor(`${S}.scene.kind==='viaje'`, 8000, 'empezar el viaje');
  await t.sleep(2500);
  if ((await t.state()).coins >= c0) throw new Error('el pasaje no se cobró');
  if (shots) await t.shot(`${shots}/07-viaje.png`);
  console.log('viaje fps', await t.fps());
  await t.click('viaje-skip');
  await t.waitFor(`${S}.scene.kind==='dept' && ${S}.scene.id==='copan'`, 8000, 'llegar a Copán');
  await t.sleep(900);
  if (shots) await t.shot(`${shots}/08-copan.png`);
  // tras tantos cambios de escena (lobby, departamentos, 14 motores, viaje) el cielo activo sigue dueño de la escena.
  // El entorno se genera unos cuadros después de montar el cielo: se espera (sin GPU van a ~1 cuadro por segundo).
  const cielo = `(()=>{const s=window.__mc.scene;return JSON.stringify({fog:!!s.fog,fondo:!!s.background,entorno:!!s.environment})})()`;
  await t.waitFor(`${cielo}==='{"fog":true,"fondo":true,"entorno":true}'`, 15000).catch(async () => {
    throw new Error(`la escena quedó sin cielo completo: ${await t.ev(cielo)}`);
  });
  // tienda y guardado
  await t.ev(`${S}.addCoins(500)`);
  await t.click('hud-btn-tienda');
  await t.sleep(400);
  if (shots) await t.shot(`${shots}/09-tienda.png`);
  await t.click('panel-close');
  const bought = await t.ev(
    `(()=>{const s=${S};const c=s.profile.coins;const r=s.buy('gorra');return JSON.stringify([r,c,${S}.profile.coins])})()`,
  );
  console.log('compra', bought);
  await t.ev(`location.reload()`);
  await t.sleep(1500);
  await t.waitFor(`!!window.__mc?.store`, 15000, 'el juego después de recargar');
  const saved = await t.ev(`${S}.profile.visited.includes('copan') && ${S}.profile.visited.includes('olancho')`);
  if (!saved) throw new Error('el progreso no se guardó tras recargar');
});
process.exit(ok ? 0 : 1);
