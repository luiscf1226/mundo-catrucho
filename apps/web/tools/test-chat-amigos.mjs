// MC-22 y MC-24 de punta a punta contra el Convex de desarrollo y una sala local (wrangler dev con el mismo
// SALA_SECRETO que tiene ese Convex). Dos pestañas: Ana crea un código en Olancho; con su sala llena Beto recibe el
// aviso, y al liberarse un cupo entra a esa sala exacta desde otro tramo. Chatean con filtro, se hacen amigos, se
// mandan un directo, se reportan (los reportes aparecen en la cola de moderación), Ana bloquea a Beto y, con el chat
// apagado, Beto no ve nada. También revisa que sin salas en vivo el panel lo diga y no haya peticiones.
//   node apps/web/tools/test-chat-amigos.mjs        (capturas en capturas/mc-22/)
// Sin .env.local dice SALTA. Sin GPU (MC_GPU=0) dice SALTA salvo con MC_CHAT_CPU=1: en GitHub no cabe.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { firmarPase, SALA } from '@mundo-catrucho/reglas';
import { launch } from './harness.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const envPath = join(raiz, '.env.local');
if (!existsSync(envPath)) {
  console.log('SALTA chat-amigos: no hay .env.local');
  process.exit(0);
}
if (process.env.MC_GPU === '0' && process.env.MC_CHAT_CPU !== '1') {
  console.log('SALTA chat-amigos: sin GPU no cabe en GitHub; corrélo con GPU o con MC_CHAT_CPU=1');
  process.exit(0);
}
const { CONVEX_URL } = parseEnv(readFileSync(envPath, 'utf8'));
if (!CONVEX_URL) throw new Error('Falta CONVEX_URL en .env.local');
const convexCli = (...args) => execFileSync('npx', ['convex', ...args], { cwd: raiz, encoding: 'utf8' });
// el mismo secreto que usa el Convex de desarrollo para firmar pases; nunca se imprime
const SECRETO = convexCli('env', 'get', 'SALA_SECRETO').trim();
if (SECRETO.length < 32) throw new Error('El Convex de desarrollo no tiene SALA_SECRETO');
const capturas = join(raiz, 'capturas/mc-22');
mkdirSync(capturas, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const libre = () =>
  new Promise((res) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
const PW = await libre(),
  PI = await libre();
const wrangler = spawn(
  'pnpm',
  ['exec', 'wrangler', 'dev', '--port', String(PW), '--inspector-port', String(PI), '--var', `SALA_SECRETO:${SECRETO}`],
  { cwd: join(raiz, 'workers/salas'), stdio: 'ignore', detached: true },
);
const out = mkdtempSync(join(tmpdir(), 'mc-chat-'));
const pestanas = [],
  bots = [],
  secretos = [];
const sufijo = String(randomInt(1000, 9999));
const NOMBRES = { ana: `Ana${sufijo}`, beto: `Beto${sufijo}` };

async function bot(sala, i) {
  const pase = await firmarPase({ id: `bot${sufijo}${i}`, nombre: `Vecino ${i}`, sala }, SECRETO);
  const ws = new WebSocket(`ws://127.0.0.1:${PW}/sala/${sala}?pase=${encodeURIComponent(pase)}`);
  await new Promise((res, rej) => {
    ws.onmessage = () => res();
    ws.onclose = (e) => rej(new Error(`bot ${i} rechazado (${e.code})`));
  });
  bots.push(ws);
  return ws;
}

let ok = false;
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PW}/`)).ok) break;
    } catch {}
    if (i > 150) throw new Error('wrangler dev no arrancó');
    await sleep(200);
  }
  // ---------------------------------------------------------------- 0. sin salas en vivo: el panel lo dice, sin red
  execFileSync('node', ['apps/web/tools/build.mjs', 'hd', '--out', join(out, 'local')], { cwd: raiz, stdio: 'ignore' });
  {
    const t = await launch(join(out, 'local/mundo-catrucho-hd.html'), { hash: '#test,go', width: 960, height: 600 });
    pestanas.push(t);
    t.nombre = 'local';
    await t.waitFor('!!window.__mc?.store', 30000, 'el juego cargó');
    await t.ev(`window.__mc.store.getState().enterWorld()`);
    await t.ev(`window.__mc.store.getState().openPanel('amigos')`);
    await t.waitFor(`!!document.querySelector('[data-testid=amigos-sin-red]')`, 10000, 'aviso sin red');
    assert.equal(await t.exists('chat-sala'), false, 'sin salas no hay chat');
    await t.shot(join(capturas, '0-sin-salas.png'));
    // Google Fonts es la única excepción a cero red
    const pedidas = t.requests.filter((u) => !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u));
    assert.deepEqual(pedidas, [], `peticiones sin salas: ${pedidas.join(', ')}`);
    assert.deepEqual(t.errors, []);
    await t.close();
    pestanas.length = 0;
  }

  // ---------------------------------------------------------------- juego con Convex de desarrollo y la sala local
  execFileSync('node', ['apps/web/tools/build.mjs', 'hd', '--out', out], {
    cwd: raiz,
    stdio: 'ignore',
    env: { ...process.env, VITE_SALAS_URL: `http://127.0.0.1:${PW}`, VITE_CONVEX_URL: CONVEX_URL },
  });
  const html = join(out, 'mundo-catrucho-hd.html');
  const origen = new URL(CONVEX_URL).origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const red = new RegExp(`^((http|ws)://127\\.0\\.0\\.1:${PW}/|${origen}/)`);
  const abrir = async (quien) => {
    const t = await launch(html, { hash: '#test', red, width: 1100, height: 680 });
    pestanas.push(t);
    t.nombre = NOMBRES[quien];
    await t.waitFor('!!window.__mc?.store', 30000, 'el juego cargó');
    await t.ev(`window.__mc.store.setState((s) => ({ profile: { ...s.profile, name: '${t.nombre}' } }))`);
    await t.ev(`window.__mc.store.getState().enterWorld()`);
    if (await t.exists('ed-done')) await t.click('ed-done');
    await t.waitFor(`!window.__mc.store.getState().panel`, 10000, 'sin paneles');
    await t.waitFor(`!!localStorage.getItem('mundo-catrucho-invitado')`, 10000, 'identidad');
    secretos.push(await t.ev(`localStorage.getItem('mundo-catrucho-invitado')`));
    // escribir en un campo de React
    await t.ev(`window.escribir=(tid,v)=>{const el=document.querySelector('[data-testid="'+tid+'"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);
      el.dispatchEvent(new Event('input',{bubbles:true}))}`);
    return t;
  };
  const S = 'window.__mc.store.getState()';
  const enSala = (t, sala, ms = 30000) =>
    t.waitFor(
      `(()=>{const s=window.__mc.sala?.getState();return s&&s.estado==='en-sala'&&s.sala==='${sala}'})()`,
      ms,
      `${t.nombre} en ${sala}`,
    );
  const mensajes = (t) => t.ev(`JSON.stringify(window.__mc.chat?.getState().mensajes??[])`).then(JSON.parse);
  const decir = async (t, texto) => {
    await t.ev(`escribir('chat-input', ${JSON.stringify(texto)})`);
    await t.click('chat-enviar');
  };
  const verChat = (t, re, label) =>
    t.waitFor(
      `[...document.querySelectorAll('[data-testid=chat-texto]')].some(e=>${re}.test(e.innerText))`,
      15000,
      label,
    );
  /** el menú de un autor en el chat (el último mensaje suyo) */
  const menuDe = (t, nombre) =>
    t.ev(
      `(()=>{const b=[...document.querySelectorAll('[data-testid=chat-autor]')].filter(b=>b.innerText==='${nombre}').at(-1);b.click();return !!b})()`,
    );
  const cola = () => JSON.parse(convexCli('run', 'moderacion:cola', JSON.stringify({ limite: 200 })));
  const foto = async (t, archivo) => {
    await t.ev(`window.__mc.store.setState({toasts:[]})`);
    await sleep(150);
    await t.shot(join(capturas, archivo));
  };

  // 1. Ana entra y viaja a Olancho; Beto se queda en el mapa
  const ana = await abrir('ana');
  await ana.ev(`${S}.travel('olancho')`);
  await enSala(ana, 'dept:olancho:0');
  const beto = await abrir('beto');
  await enSala(beto, 'mapa:0');

  // 2. MC-24: Ana crea su código (5 letras, sin confusiones)
  await ana.ev(`${S}.openPanel('amigos')`);
  await ana.click('amigos-tab-codigo');
  await ana.click('codigo-crear');
  await ana.waitFor(`!!document.querySelector('[data-testid=codigo-mio]')`, 15000, 'código de Ana');
  const codigo = await ana.text('codigo-mio');
  assert.match(codigo, /^[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{5}$/);
  await foto(ana, '1-codigo.png');
  await ana.ev(`${S}.closePanel()`);

  // 3. con la sala de Ana llena de verdad (24) Beto recibe el aviso y queda en el tramo que toca
  for (let i = 0; i < SALA.cupo - 1; i++) await bot('dept:olancho:0', i);
  await beto.ev(`${S}.openPanel('amigos')`);
  await beto.click('amigos-tab-codigo');
  await beto.ev(`escribir('codigo-input', '${codigo.toLowerCase()}')`);
  await beto.click('codigo-unirme');
  await beto.waitFor(`window.__mc.chat.getState().union?.r==='llena'`, 30000, 'aviso de sala llena');
  await enSala(beto, 'dept:olancho:1');
  // el viaje cerró el panel: al abrirlo otra vez está el aviso
  await beto.ev(`${S}.openPanel('amigos')`);
  await beto.click('amigos-tab-codigo');
  await beto.waitFor(
    `document.querySelector('[data-testid=codigo-estado]')?.dataset.r==='llena'`,
    10000,
    'aviso en el panel',
  );
  await foto(beto, '2-sala-llena.png');
  await beto.ev(`escribir('codigo-input', '${codigo}')`);

  // 4. se va un vecino: con el mismo código Beto pasa del tramo 2 a la sala exacta de Ana
  bots.shift().close();
  await beto.click('codigo-unirme');
  await beto.waitFor(`window.__mc.chat.getState().union?.r==='ok'`, 30000, 'unirse');
  await enSala(beto, 'dept:olancho:0');
  for (const b of bots.splice(0)) b.close();
  await ana.waitFor(`window.__mc.net.players().some(p=>p.name==='${NOMBRES.beto}')`, 15000, 'Ana ve a Beto');
  await beto.ev(`${S}.closePanel()`);

  // 5. MC-22: chat de sala filtrado (datos y groserías); el que manda ve su mensaje como «Vos»
  await decir(beto, 'hola Ana, mi cel es +504 9988-7766 jaja');
  await verChat(ana, /^hola Ana, \*\*\*$/, 'Ana ve el chat de Beto filtrado');
  await decir(ana, 'qué onda c3r0t3, vamos a Juticalpa');
  await verChat(beto, /^qué onda \*\*\*, vamos a Juticalpa$/, 'Beto ve el chat de Ana filtrado');
  assert.equal((await mensajes(beto)).find((m) => m.texto.startsWith('hola Ana')).mio, true);
  assert.ok(!(await ana.ev(`document.body.innerText`)).includes('9988'), 'el teléfono llegó a la pantalla');
  // aviso antes de mandar: el navegador avisa que se tapó algo
  assert.match(await beto.text('chat-aviso'), /Se tapó/);
  // el ritmo corta la ráfaga en el navegador y en la sala
  for (let i = 0; i < 8; i++) await decir(ana, `ráfaga ${i}`);
  await ana.waitFor(
    `/despacio/.test(document.querySelector('[data-testid=chat-aviso]')?.innerText)`,
    5000,
    'aviso de ritmo',
  );
  await sleep(800);
  const rafaga = (await mensajes(beto)).filter((m) => m.texto.startsWith('ráfaga')).length;
  assert.ok(rafaga >= 3 && rafaga <= 5, `pasaron ${rafaga} de la ráfaga de 8`);
  await foto(beto, '3-chat-sala.png');

  // 6. después de jugar juntos, Beto pide amistad desde el chat y Ana acepta
  await menuDe(beto, NOMBRES.ana);
  await beto.click('chat-amistad');
  await ana.ev(`${S}.openPanel('amigos')`);
  await ana.waitFor(
    `document.querySelector('[data-testid=amigo][data-estado=recibida]')?.innerText.includes('${NOMBRES.beto}')`,
    15000,
    'pedido de Beto',
  );
  await foto(ana, '4-pedido.png');
  await ana.click('amigo-aceptar');
  await ana.waitFor(`!!document.querySelector('[data-testid=amigo][data-estado=amigos]')`, 15000, 'son amigos');

  // 7. directo de Ana a Beto, filtrado; Beto lo lee (sondeo) y lo reporta
  await ana.click('amigo-escribir');
  await ana.ev(`escribir('directo-input', 'nos vemos en el parque, pendejo')`);
  await ana.click('directo-enviar');
  await ana.waitFor(
    `document.querySelector('[data-testid=directo-msg]')?.innerText==='nos vemos en el parque, ***'`,
    15000,
    'directo enviado',
  );
  await beto.ev(`${S}.openPanel('amigos')`);
  await beto.waitFor(`!!document.querySelector('[data-testid=amigo-escribir]')`, 15000, 'Beto ve a su amiga');
  await beto.click('amigo-escribir');
  await beto.waitFor(
    `document.querySelector('[data-testid=directo-msg][data-mio=false]')?.innerText==='nos vemos en el parque, ***'`,
    15000,
    'Beto lee el directo',
  );
  await beto.ev(`escribir('directo-input', 'cheque, allá nos vemos')`);
  await beto.click('directo-enviar');
  await ana.waitFor(
    `[...document.querySelectorAll('[data-testid=directo-msg][data-mio=false]')].some(e=>e.innerText==='cheque, allá nos vemos')`,
    15000,
    'Ana lee la respuesta',
  );
  await foto(beto, '5-directo.png');
  await beto.click('directo-reportar');
  await beto.click('directo-reportar-groseria');
  await beto.waitFor(`/moderación/.test(document.body.innerText)`, 15000, 'reporte del directo');
  await ana.ev(`${S}.closePanel()`);
  await beto.ev(`${S}.closePanel()`);

  // 8. Ana reporta el mensaje de sala de Beto (cita el texto que firmó la sala)
  await menuDe(ana, NOMBRES.beto);
  await ana.click('chat-reportar');
  await ana.click('chat-reportar-datos');
  await ana.waitFor(`/moderación/.test(document.body.innerText)`, 15000, 'reporte del chat');
  const reportes = cola().filter((r) => [NOMBRES.ana, NOMBRES.beto].includes(r.reporta));
  const deSala = reportes.find((r) => r.reporta === NOMBRES.ana);
  const deDirecto = reportes.find((r) => r.reporta === NOMBRES.beto);
  assert.ok(deSala && deDirecto, `la cola no tiene los dos reportes: ${JSON.stringify(reportes)}`);
  assert.equal(deSala.texto, 'hola Ana, ***');
  assert.equal(deSala.donde, 'dept:olancho:0');
  assert.equal(deSala.motivo, 'datos');
  assert.equal(deSala.reportado, NOMBRES.beto);
  assert.equal(deDirecto.texto, 'nos vemos en el parque, ***');
  assert.equal(deDirecto.donde, 'directo');
  assert.equal(deDirecto.reportado, NOMBRES.ana);

  // 9. Ana bloquea a Beto: ya no se leen, la amistad se va y su código ya no le sirve a Beto
  await menuDe(ana, NOMBRES.beto);
  await ana.click('chat-bloquear');
  await ana.waitFor(`window.__mc.chat.getState().social?.bloqueados.length===1`, 15000, 'bloqueo guardado');
  await decir(beto, '¿me ves, Ana?');
  await verChat(beto, /^¿me ves, Ana\?$/, 'Beto manda');
  await decir(ana, 'adiós Beto');
  await verChat(ana, /^adiós Beto$/, 'Ana manda');
  await sleep(1500);
  assert.ok(!(await mensajes(ana)).some((m) => m.texto.includes('me ves')), 'Ana bloqueó a Beto y lo leyó');
  assert.ok(!(await mensajes(beto)).some((m) => m.texto.includes('adiós')), 'Beto leyó a quien lo bloqueó');
  await ana.ev(`${S}.openPanel('amigos')`);
  await ana.waitFor(`!document.querySelector('[data-testid=amigo]')`, 15000, 'sin amistad');
  await ana.click('amigos-tab-bloqueados');
  await ana.waitFor(`document.querySelector('[data-testid=bloqueado]')?.innerText.includes('${NOMBRES.beto}')`, 15000);
  await foto(ana, '6-bloqueados.png');
  await beto.ev(`${S}.openPanel('amigos')`);
  await beto.click('amigos-tab-codigo');
  await beto.ev(`escribir('codigo-input', '${codigo}')`);
  await beto.click('codigo-unirme');
  await beto.waitFor(
    `document.querySelector('[data-testid=codigo-estado]')?.dataset.r==='codigo'`,
    15000,
    'código bloqueado',
  );
  await beto.ev(`${S}.closePanel()`);

  // 10. Ana desbloquea; Beto apaga el chat en Ajustes: no ve ni manda nada
  await ana.click('bloqueado-quitar');
  await ana.waitFor(`window.__mc.chat.getState().social?.bloqueados.length===0`, 15000, 'desbloqueo');
  await ana.ev(`${S}.closePanel()`);
  await beto.ev(`${S}.openPanel('ajustes')`);
  await beto.click('set-chat');
  assert.equal(await beto.ev(`${S}.profile.settings.chat`), false);
  await foto(beto, '7-ajustes-chat.png');
  await beto.ev(`${S}.closePanel()`);
  assert.equal(await beto.exists('chat-sala'), false, 'chat apagado y se ve');
  // contar lo que Beto manda de chat a la sala desde aquí
  await beto.ev(
    `(()=>{const o=WebSocket.prototype.send;window.__chatN=0;WebSocket.prototype.send=function(d){if(String(d).includes('"chat"'))window.__chatN++;return o.call(this,d)}})()`,
  );
  await beto.press('t');
  await decir(ana, 'ya te desbloqueé');
  await verChat(ana, /^ya te desbloqueé$/, 'Ana manda');
  await sleep(1500);
  assert.equal((await mensajes(beto)).length, 0, 'con el chat apagado le llegaron mensajes');
  assert.equal(await beto.exists('chat-sala'), false, 'la T abrió el chat apagado');
  assert.equal(await beto.ev('window.__chatN'), 0, 'con el chat apagado mandó algo');
  await foto(beto, '8-chat-apagado.png');
  await foto(ana, '9-ana-final.png');

  for (const t of pestanas) assert.deepEqual(t.errors, [], `${t.nombre}: ${t.errors.join(' | ')}`);
  console.log(`  código ${codigo}; ráfaga de 8 → ${rafaga}; reportes en la cola: ${reportes.length}`);
  ok = true;
} catch (e) {
  console.log(`FALLA chat-amigos: ${e.message}`);
  for (const [i, t] of pestanas.entries()) {
    try {
      await t.shot(join(tmpdir(), `mc-fail-chat-${i}.png`));
      console.log(`  captura: ${join(tmpdir(), `mc-fail-chat-${i}.png`)}`);
      if (t.errors.length) console.log(`  errores ${t.nombre}: ${t.errors.slice(0, 6).join(' | ')}`);
    } catch {}
  }
} finally {
  for (const b of bots) b.close();
  for (const t of pestanas) await t.close();
  try {
    process.kill(-wrangler.pid, 'SIGKILL');
  } catch {}
  rmSync(out, { recursive: true, force: true });
  // no deja invitados, amistades ni reportes de prueba en el entorno de desarrollo
  for (const s of secretos)
    for (const fn of ['moderacion:olvidarSocial', 'progreso:olvidarInvitado'])
      try {
        convexCli('run', fn, JSON.stringify({ invitado: s }));
      } catch {}
}
console.log(
  ok
    ? 'PASA chat-amigos: código de 5 letras a la misma sala (y aviso si está llena), chat filtrado con ritmo, amistad, directo, reportes en la cola, bloqueo y chat apagado'
    : 'NO PASA chat-amigos',
);
process.exit(ok ? 0 : 1);
