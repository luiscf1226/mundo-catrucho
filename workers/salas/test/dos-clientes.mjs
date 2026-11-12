// Prueba de la sala: levanta `wrangler dev` con un secreto aleatorio y firma pases con la misma función que usa
// Convex. Comprueba que sin pase (o vencido, o de otra sala) no se entra, que dos jugadores se ven entrar, moverse,
// hacer emotes y salir, que el jugador 25 cae al tramo 2 y que la misma cuenta en otra pestaña reemplaza a la vieja.
// MC-22: el chat llega filtrado y firmado, el ritmo corta la ráfaga y un bloqueado no recibe ni manda.
// MC-23: bots de relleno con poca gente y ocupación firmada a un Convex de mentira. MC-25: sala de partida con
// reloj, semilla, puntajes acotados y recibo firmado. MC-31: viaje compartido con chofer y pasajero.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer as servidorHttp } from 'node:http';
import { createServer } from 'node:net';
import {
  CHAT,
  duracionPartida,
  firmarActa,
  firmarPase,
  leerFirmado,
  mensajeAutentico,
  PARTIDA,
  SALA,
  verificarRecibo,
} from '@mundo-catrucho/reglas';

/** Un puerto libre: 8799 puede estar ocupado por `pnpm dev` u otra copia del repo. */
const libre = () =>
  new Promise((res) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
// Convex de mentira: recibe los avisos de ocupación (MC-23) y guarda los que traen buena firma
const ocupaciones = [];
let ocupacionesMalas = 0;
const convex = servidorHttp((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    const d = req.url === '/salas/ocupacion' ? await leerFirmado('ocupacion', body, SECRETO) : null;
    if (d) ocupaciones.push(d);
    else ocupacionesMalas++;
    res.writeHead(d ? 200 : 401).end();
  });
});
await new Promise((r) => convex.listen(0, '127.0.0.1', r));
/** segundos del reloj de las partidas en esta prueba (el de verdad es de 60 a 120) */
const RELOJ = 4;
const PORT = await libre(),
  INSPECTOR = await libre(),
  BASE = `127.0.0.1:${PORT}`,
  SECRETO = randomBytes(32).toString('hex');
const w = spawn(
  'pnpm',
  [
    'exec',
    'wrangler',
    'dev',
    '--port',
    String(PORT),
    '--inspector-port',
    String(INSPECTOR),
    '--var',
    `SALA_SECRETO:${SECRETO}`,
    '--var',
    `CONVEX_SITE_URL:http://127.0.0.1:${convex.address().port}`,
    '--var',
    'OCUPACION_MS:400',
    '--var',
    `PARTIDA_SEGUNDOS:${RELOJ}`,
  ],
  {
    stdio: 'ignore',
    detached: true,
  },
);
const fin = (code) => {
  try {
    process.kill(-w.pid, 'SIGKILL');
  } catch {}
  convex.close();
  process.exit(code);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SECRETO_FIRMA = SECRETO;
const pase = (sala, id, nombre, extra = {}) =>
  firmarPase({ id, nombre, sala, avatar: { shirtColor: '#e63946', skin: '#8d5524' }, ...extra }, SECRETO, extra.ahora);
/** Conecta y espera el primer mensaje («hola») o el cierre. Devuelve { ws, cola, cierre }. */
const abrir = (sala, p, extra = '') =>
  new Promise((res, rej) => {
    const ws = new WebSocket(
        `ws://${BASE}/sala/${sala}${p === undefined ? '' : `?pase=${encodeURIComponent(p)}`}${extra}`,
      ),
      c = { ws, cola: [], cierre: null };
    ws.onmessage = (e) => {
      c.cola.push(JSON.parse(e.data));
      res(c);
    };
    ws.onclose = (e) => {
      c.cierre = e.code;
      res(c);
    };
    ws.onerror = () => {};
    setTimeout(() => rej(new Error(`sin respuesta de ${sala}`)), 5000);
  });
const espera = async (c, t, ms = 3000) => {
  const s = Date.now();
  for (;;) {
    const m = c.cola.find((x) => x.t === t);
    if (m) return m;
    if (Date.now() - s > ms) throw new Error(`no llegó «${t}»: ${JSON.stringify(c.cola)}`);
    await sleep(30);
  }
};
const esperaCierre = async (c, ms = 3000) => {
  const s = Date.now();
  while (c.cierre === null) {
    if (Date.now() - s > ms) throw new Error('no se cerró');
    await sleep(30);
  }
  return c.cierre;
};
const rechazo = async (sala, p, codigo, que) => {
  const c = await abrir(sala, p);
  const cod = await esperaCierre(c);
  if (cod !== codigo) throw new Error(`${que}: cerró con ${cod}, se esperaba ${codigo}`);
  if (c.cola.some((m) => m.t === 'hola')) throw new Error(`${que}: le dieron la bienvenida`);
};
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(`http://${BASE}/`)).ok) break;
    } catch {}
    if (i > 150) throw new Error('wrangler dev no arrancó');
    await sleep(200);
  }
  const sala = 'dept:olancho:0';
  // --- MC-18: sin pase, vencido, de otra sala o con otro secreto: rechazado
  await rechazo(sala, undefined, SALA.cierre.pase, 'sin pase');
  await rechazo(sala, 'basura.basura', SALA.cierre.pase, 'pase roto');
  await rechazo(
    sala,
    await pase(sala, 'v1', 'Vieja', { ahora: Date.now() - SALA.paseMs - 1000 }),
    SALA.cierre.pase,
    'vencido',
  );
  await rechazo(sala, await pase('dept:olancho:1', 'o1', 'Otra'), SALA.cierre.otraSala, 'otra sala');
  await rechazo(
    sala,
    await firmarPase({ id: 'f', nombre: 'F', sala }, randomBytes(32).toString('hex')),
    SALA.cierre.pase,
    'otro secreto',
  );
  if ((await fetch(`http://${BASE}/sala/juego:x`)).status !== 404) throw new Error('aceptó una sala inválida');

  // --- MC-19: dos jugadores se ven
  const a = await abrir(sala, await pase(sala, 'ana1', 'Ana'));
  const holaA = await espera(a, 'hola');
  if (holaA.id !== 'ana1') throw new Error('el id no salió del pase');
  const b = await abrir(sala, await pase(sala, 'beto1', 'Beto <b>'));
  const holaB = await espera(b, 'hola');
  if (
    holaB.jugadores.length !== 1 ||
    holaB.jugadores[0].nombre !== 'Ana' ||
    holaB.jugadores[0].avatar.skin !== '#8d5524'
  )
    throw new Error(`Beto no vio a Ana al entrar: ${JSON.stringify(holaB)}`);
  const entra = await espera(a, 'entra');
  if (entra.nombre !== 'Beto b' || entra.id !== 'beto1')
    throw new Error(`Ana no supo que entró Beto: ${JSON.stringify(entra)}`);
  b.ws.send(JSON.stringify({ t: 'pos', x: 3, y: 0, z: -7.5, yaw: 1, anim: 'run' }));
  const pos = await espera(a, 'pos');
  if (pos.id !== holaB.id || pos.x !== 3 || pos.z !== -7.5 || pos.anim !== 'run')
    throw new Error(`posición mal repartida: ${JSON.stringify(pos)}`);
  b.ws.send(JSON.stringify({ t: 'pos', x: 1e9, anim: 'volar' }));
  await sleep(150);
  const lim = a.cola.filter((x) => x.t === 'pos').at(-1);
  if (lim.x !== 1000 || lim.anim !== 'idle') throw new Error(`no limitó valores raros: ${JSON.stringify(lim)}`);

  // --- MC-21: un emote le llega al otro; uno inventado no
  b.ws.send(JSON.stringify({ t: 'emote', id: '<script>' }));
  b.ws.send(JSON.stringify({ t: 'emote', id: 'emote_punta' }));
  const em = await espera(a, 'emote');
  if (em.id !== 'beto1' || em.emote !== 'emote_punta') throw new Error(`emote mal repartido: ${JSON.stringify(em)}`);
  if (a.cola.filter((x) => x.t === 'emote').length !== 1) throw new Error('pasó un emote inventado');

  // --- ritmo: una ráfaga de 150 mensajes de golpe; pasan los de la cubeta y lo demás se ignora
  await sleep(SALA.ritmo.rafaga * (1000 / SALA.ritmo.porSegundo));
  const antes = a.cola.length;
  for (let i = 0; i < 150; i++) b.ws.send(JSON.stringify({ t: 'pos', x: i, y: 0, z: 0, yaw: 0, anim: 'walk' }));
  await sleep(800);
  const rafaga = a.cola.slice(antes).filter((x) => x.t === 'pos').length;
  if (rafaga > SALA.ritmo.rafaga + 15 || rafaga < SALA.ritmo.rafaga / 2)
    throw new Error(`ritmo: pasaron ${rafaga} de 150 (cubeta de ${SALA.ritmo.rafaga})`);
  const oc = await (await fetch(`http://${BASE}/sala/${sala}`)).json();
  if (oc.ocupacion !== 2) throw new Error(`ocupación ${oc.ocupacion}`);

  // --- la misma cuenta desde otra pestaña: la vieja se cierra y los demás la ven salir y volver
  const b2 = await abrir(sala, await pase(sala, 'beto1', 'Beto'));
  await espera(b2, 'hola');
  if ((await esperaCierre(b)) !== SALA.cierre.reemplazado) throw new Error('no cerró la pestaña vieja');
  await espera(a, 'sale');
  if ((await (await fetch(`http://${BASE}/sala/${sala}`)).json()).ocupacion !== 2) throw new Error('contó doble');
  b2.ws.close();
  await sleep(200);
  a.ws.close();

  // --- MC-20: 24 llenan el tramo 0; el 25 cae al tramo 1
  const zona = 'dept:copan',
    llenos = [];
  const libre0 = await (await fetch(`http://${BASE}/libre/${zona}`)).json();
  if (libre0.sala !== `${zona}:0`) throw new Error(`primer tramo libre: ${JSON.stringify(libre0)}`);
  for (let i = 0; i < SALA.cupo; i++) {
    const c = await abrir(`${zona}:0`, await pase(`${zona}:0`, `j${i}`, `Jugador ${i}`));
    await espera(c, 'hola');
    llenos.push(c);
  }
  await rechazo(`${zona}:0`, await pase(`${zona}:0`, 'j24', 'Jugador 24'), SALA.cierre.llena, 'sala llena');
  const libre = await (await fetch(`http://${BASE}/libre/${zona}`)).json();
  if (libre.sala !== `${zona}:1` || libre.ocupacion !== 0)
    throw new Error(`no abrió otro tramo: ${JSON.stringify(libre)}`);
  const j25 = await abrir(libre.sala, await pase(libre.sala, 'j24', 'Jugador 24'));
  const hola25 = await espera(j25, 'hola');
  if (hola25.sala !== `${zona}:1` || hola25.jugadores.length !== 0)
    throw new Error('el 25 no quedó solo en el tramo 2');
  if (!(await fetch(`http://${BASE}/libre/${zona}`)).headers.get('access-control-allow-origin'))
    throw new Error('sin CORS: el juego no puede preguntar la ocupación');
  // al salir uno del tramo 0 vuelve a haber espacio ahí
  llenos[0].ws.close();
  await sleep(300);
  const libre2 = await (await fetch(`http://${BASE}/libre/${zona}`)).json();
  if (libre2.sala !== `${zona}:0`) throw new Error(`no liberó el cupo: ${JSON.stringify(libre2)}`);
  for (const c of llenos) c.ws.close();
  j25.ws.close();

  // --- MC-22: chat de sala filtrado y firmado; bloqueos (del pase y en vivo); ritmo
  const yoro = 'dept:yoro:0';
  const carla = await abrir(yoro, await pase(yoro, 'carla1', 'Carla'));
  await espera(carla, 'hola');
  const paseDani = await pase(yoro, 'dani1', 'Dani');
  let dani = await abrir(yoro, paseDani);
  await espera(dani, 'hola');
  // Eli ya traía bloqueada a Carla desde Convex (en el pase)
  const eli = await abrir(
    yoro,
    await pase(yoro, 'eli1', 'Eli', {
      bloqueados: ['carla1', ...Array.from({ length: 199 }, (_, i) => `bloqueado${i}`)],
    }),
  );
  const holaEli = await espera(eli, 'hola');
  if (JSON.stringify(holaEli).includes('bloqueados'))
    throw new Error('la bienvenida cuenta a quién bloqueó cada quien');
  const chats = (c) => c.cola.filter((x) => x.t === 'chat');
  carla.ws.send(JSON.stringify({ t: 'chat', texto: 'sos un p3nd3jo, mi cel es +504 9988-7766' }));
  carla.ws.send(JSON.stringify({ t: 'chat', texto: '<img src=x onerror=alert(1)>hola Yoro' }));
  await sleep(400);
  const [c1, c2] = chats(dani);
  if (!c1 || c1.texto !== 'sos un ***, ***' || !c1.tapado || c1.de !== 'carla1' || c1.nombre !== 'Carla')
    throw new Error(`chat sin filtrar: ${JSON.stringify(c1)}`);
  if (c2?.texto !== 'hola Yoro' || c2.tapado) throw new Error(`HTML en el chat: ${JSON.stringify(c2)}`);
  if (!(await mensajeAutentico(c1, c1.firma, SECRETO))) throw new Error('el mensaje no viene firmado por la sala');
  if (chats(carla).length !== 2) throw new Error('Carla no ve su propio mensaje filtrado');
  if (chats(eli).length) throw new Error('Eli bloqueó a Carla y le llegó su chat');
  eli.ws.send(JSON.stringify({ t: 'chat', texto: 'hola, soy Eli' }));
  await sleep(300);
  if (chats(carla).some((m) => m.de === 'eli1')) throw new Error('a Carla le llegó el chat de quien la bloqueó');
  if (!chats(dani).some((m) => m.de === 'eli1')) throw new Error('a Dani no le llegó el chat de Eli');
  // Dani bloquea a Eli en vivo: ya no se leen; desbloquea y vuelve
  dani.ws.send(JSON.stringify({ t: 'bloquear', id: 'eli1', si: true }));
  await sleep(100);
  dani = await abrir(yoro, paseDani);
  await espera(dani, 'hola');
  eli.ws.send(JSON.stringify({ t: 'chat', texto: 'otra vez Eli' }));
  dani.ws.send(JSON.stringify({ t: 'chat', texto: 'solo Carla me lee' }));
  await sleep(300);
  if (chats(dani).some((m) => m.texto === 'otra vez Eli')) throw new Error('Dani bloqueó a Eli y le llegó');
  if (chats(eli).some((m) => m.de === 'dani1')) throw new Error('Eli recibió a quien la bloqueó');
  if (!chats(carla).some((m) => m.texto === 'solo Carla me lee')) throw new Error('Carla no recibió a Dani');
  dani.ws.send(JSON.stringify({ t: 'bloquear', id: 'eli1', si: false }));
  await sleep(100);
  eli.ws.send(JSON.stringify({ t: 'chat', texto: 'ya me ves' }));
  await sleep(300);
  if (!chats(dani).some((m) => m.texto === 'ya me ves')) throw new Error('desbloquear no devolvió el chat');
  // ritmo: una ráfaga de 15 de Dani; pasan los de la cubeta y Dani recibe el aviso
  await sleep((1000 / CHAT.ritmo.porSegundo) * CHAT.ritmo.rafaga);
  const antesChat = chats(carla).length;
  for (let i = 0; i < 15; i++) dani.ws.send(JSON.stringify({ t: 'chat', texto: `mensaje ${i}` }));
  await sleep(500);
  const pasaron = chats(carla).length - antesChat;
  if (pasaron !== CHAT.ritmo.rafaga) throw new Error(`ritmo del chat: pasaron ${pasaron} de 15`);
  if (!dani.cola.some((m) => m.t === 'chat-no' && m.motivo === 'ritmo')) throw new Error('sin aviso de ritmo');
  const dani2 = await abrir(yoro, await pase(yoro, 'dani1', 'Dani'));
  dani2.ws.send(JSON.stringify({ t: 'chat', texto: 'reconecté para saltarme el ritmo' }));
  await espera(dani2, 'chat-no');
  if (chats(carla).some((m) => m.texto === 'reconecté para saltarme el ritmo'))
    throw new Error('reconectar llenó la cubeta');
  carla.ws.send(JSON.stringify({ t: 'invita', tipo: 'viaje', sala: 'viaje:prueba123' }));
  eli.ws.send(JSON.stringify({ t: 'invita', tipo: 'viaje', sala: 'viaje:prueba456' }));
  await sleep(200);
  if (
    eli.cola.some((m) => m.t === 'invita' && m.id === 'carla1') ||
    carla.cola.some((m) => m.t === 'invita' && m.id === 'eli1')
  )
    throw new Error('invitación entre bloqueados');
  if (!dani2.cola.some((m) => m.t === 'invita')) throw new Error('no llegó invitación permitida');
  dani2.ws.close();
  for (const c of [carla, dani, eli]) c.ws.close();

  // --- MC-23: con poca gente hay bots marcados; se van cuando entra gente y vuelven cuando se va
  const lem = 'dept:lempira:0',
    gente = [];
  const conBots = async (i) => {
    const c = await abrir(lem, await pase(lem, `l${i}`, `Lenca ${i}`));
    const h = await espera(c, 'hola');
    gente.push(c);
    return h;
  };
  const h1 = await conBots(0);
  if (h1.jugadores.length !== 0 || h1.bots.length !== 3 || !h1.bots.every((b) => b.bot && b.ruta.length > 2))
    throw new Error(`solo, sin 3 bots marcados: ${JSON.stringify(h1)}`);
  const h2 = await conBots(1);
  if (h2.bots.length !== 2 || h2.jugadores.length !== 1) throw new Error(`con 2 personas: ${JSON.stringify(h2)}`);
  const seFue = await espera(gente[0], 'sale');
  if (!seFue.bot || seFue.id !== 'bot-2') throw new Error(`no se fue un bot al entrar gente: ${JSON.stringify(seFue)}`);
  await conBots(2);
  const h4 = await conBots(3);
  if (h4.bots.length !== 0) throw new Error(`con 4 personas siguen ${h4.bots.length} bots`);
  await sleep(200);
  const salidos = gente[0].cola.filter((m) => m.t === 'sale' && m.bot).map((m) => m.id);
  if (salidos.sort().join() !== 'bot-0,bot-1,bot-2') throw new Error(`bots que se fueron: ${salidos}`);
  if ((await (await fetch(`http://${BASE}/sala/${lem}`)).json()).ocupacion !== 4) throw new Error('contó bots');
  // la ocupación (sin bots) le llega firmada a Convex
  for (let i = 0; !ocupaciones.some((o) => o.sala === lem && o.ocupacion === 4); i++) {
    if (i > 60) throw new Error(`Convex no recibió la ocupación: ${JSON.stringify(ocupaciones)}`);
    await sleep(100);
  }
  if (ocupacionesMalas) throw new Error(`${ocupacionesMalas} avisos de ocupación sin firma`);
  gente.pop().ws.close();
  for (let i = 0; !gente[0].cola.some((m) => m.t === 'entra' && m.bot); i++) {
    if (i > 60) throw new Error('no volvió ningún bot');
    await sleep(50);
  }
  const vuelve = gente[0].cola.find((m) => m.t === 'entra' && m.bot);
  if (!vuelve.bot || vuelve.id !== 'bot-0' || !vuelve.ruta)
    throw new Error(`no volvió un bot: ${JSON.stringify(vuelve)}`);
  for (const c of gente) c.ws.close();
  for (let i = 0; !ocupaciones.some((o) => o.sala === lem && o.ocupacion === 0); i++) {
    if (i > 60) throw new Error('la sala vacía no avisó 0');
    await sleep(100);
  }

  // --- MC-25: sala de partida con reloj, semilla, puntajes acotados y recibo firmado
  const partidaId = `p${randomBytes(6).toString('hex')}`,
    juego = `juego:${partidaId}`,
    motor = 'franciscomorazan.rosquilla';
  const acta = (vence = Date.now() + PARTIDA.actaMs) =>
    firmarActa({ partidaId, motor, etapa: 0, etapas: 4, semilla: 777, cupo: 2, vence }, SECRETO_FIRMA);
  const conActa = async (a) => `&acta=${encodeURIComponent(await (a ?? acta()))}`;
  await rechazo(juego, await pase(juego, 'ana2', 'Ana'), SALA.cierre.pase, 'partida sin acta');
  const vieja = await abrir(juego, await pase(juego, 'ana2', 'Ana'), await conActa(acta(Date.now() - 1)));
  if ((await esperaCierre(vieja)) !== SALA.cierre.pase) throw new Error('aceptó un acta vencida');
  const pa = await abrir(juego, await pase(juego, 'ana2', 'Ana'), await conActa());
  const hpa = await espera(pa, 'hola');
  if (hpa.partida.fase !== 'espera' || hpa.partida.semilla !== 777) throw new Error(`hola: ${JSON.stringify(hpa)}`);
  const pb = await abrir(juego, await pase(juego, 'beto2', 'Beto'), await conActa());
  await espera(pb, 'hola');
  const [ra, rb] = [await espera(pa, 'reloj'), await espera(pb, 'reloj')];
  if (ra.inicio !== rb.inicio || ra.fin !== rb.fin || ra.semilla !== 777 || rb.semilla !== 777)
    throw new Error(`relojes distintos: ${JSON.stringify([ra, rb])}`);
  if (ra.inicio - ra.ahora !== PARTIDA.cuentaMs || ra.fin - ra.inicio !== RELOJ * 1000)
    throw new Error(`reloj raro: ${JSON.stringify(ra)}`);
  // un tercero ya no entra a una partida empezada
  const colado = await abrir(juego, await pase(juego, 'colado', 'Colado'), await conActa());
  if ((await esperaCierre(colado)) !== SALA.cierre.llena) throw new Error('entró un tercero a la partida empezada');
  // puntos antes del inicio no cuentan
  pa.ws.send(JSON.stringify({ t: 'puntos', puntos: 50 }));
  await sleep(Math.max(0, ra.inicio - Date.now()) + 600);
  pa.ws.send(JSON.stringify({ t: 'puntos', puntos: 1e6 }));
  pb.ws.send(JSON.stringify({ t: 'puntos', puntos: 30 }));
  const marcadorA = await espera(pb, 'marcador');
  const tope = 20 * (1 + 2 + 1);
  if (marcadorA.id !== 'ana2' || marcadorA.puntos > tope || marcadorA.puntos < 1)
    throw new Error(`puntaje imposible sin acotar: ${JSON.stringify(marcadorA)}`);
  await sleep(150);
  if (!pa.cola.some((m) => m.t === 'marcador' && m.id === 'beto2' && m.puntos === 30))
    throw new Error('Ana no ve el marcador de Beto');
  // Beto se va a medias: la partida sigue y cuenta con lo que llevaba
  pb.ws.close();
  await espera(pa, 'sale');
  const finA = await espera(pa, 'fin', (RELOJ + 5) * 1000);
  const recibo = await verificarRecibo(finA.recibo, SECRETO);
  if (!recibo || recibo.partidaId !== partidaId || recibo.duracion !== RELOJ)
    throw new Error(`recibo no verifica: ${JSON.stringify(recibo)}`);
  const fa = recibo.resultados.find((f) => f.id === 'ana2'),
    fb = recibo.resultados.find((f) => f.id === 'beto2');
  if (!fa || fa.puntos > tope || !fb || fb.puntos !== 30 || !fb.salio)
    throw new Error(`resultados: ${JSON.stringify(recibo.resultados)}`);
  if (await verificarRecibo(finA.recibo, randomBytes(32).toString('hex'))) throw new Error('verificó con otra llave');
  // quien vuelve después del fin recibe el mismo recibo
  const pb2 = await abrir(juego, await pase(juego, 'beto2', 'Beto'), await conActa());
  const finalVuelta = (await espera(pb2, 'hola')).partida;
  if (finalVuelta.recibo !== finA.recibo) throw new Error('sin recibo al volver');
  if (JSON.stringify(finalVuelta.resultados) !== JSON.stringify(finA.resultados))
    throw new Error('sin resultados completos al volver');
  pa.ws.close();
  pb2.ws.close();
  if (duracionPartida(motor, 0, 4) < 60) throw new Error('el reloj de verdad es de 60 s o más');

  // --- MC-31: viaje compartido: el primero maneja, el pasajero ve su estado; si el chofer se va, pasa el volante
  const vj = `viaje:v${randomBytes(6).toString('hex')}`;
  const chofer = await abrir(vj, await pase(vj, 'chofer1', 'Chofer'));
  const hc = await espera(chofer, 'hola');
  if (hc.chofer !== 'chofer1') throw new Error(`el primero no maneja: ${JSON.stringify(hc)}`);
  chofer.ws.send(JSON.stringify({ t: 'ruta', veh: 'bus', de: 'franciscomorazan', a: 'olancho', semilla: 9 }));
  chofer.ws.send(JSON.stringify({ t: 'auto', x: 1.5, v: 20, d: 300, e: 12.5, h: 1 }));
  await sleep(150);
  const pasajero = await abrir(vj, await pase(vj, 'pasajero1', 'Pasajera'));
  const hp = await espera(pasajero, 'hola');
  if (hp.chofer !== 'chofer1' || hp.ruta?.a !== 'olancho' || hp.ruta.semilla !== 9 || hp.auto?.d !== 300)
    throw new Error(`el pasajero no recibió la ruta y el estado: ${JSON.stringify(hp)}`);
  chofer.ws.send(JSON.stringify({ t: 'auto', x: 99, v: 21, d: 320, e: 13.5, h: 2 }));
  const auto = await espera(pasajero, 'auto');
  if (auto.d !== 320 || auto.x !== 10 || auto.h !== 2) throw new Error(`estado del chofer: ${JSON.stringify(auto)}`);
  // el pasajero no puede manejar
  pasajero.ws.send(JSON.stringify({ t: 'auto', x: 0, v: 0, d: 0, e: 0, h: 0 }));
  await sleep(200);
  if (chofer.cola.some((m) => m.t === 'auto')) throw new Error('el pasajero manejó');
  chofer.ws.close();
  const volante = await espera(pasajero, 'chofer');
  if (volante.id !== 'pasajero1') throw new Error(`no pasó el volante: ${JSON.stringify(volante)}`);
  pasajero.ws.close();
  console.log(
    `PASA sala: sin pase, vencido, de otra sala y con otro secreto rechazados; dos jugadores se ven entrar, moverse, hacer emotes y salir; ráfaga recortada a ${rafaga} de 150; el 25 cae a ${libre.sala}; chat filtrado, firmado, con ritmo (${pasaron} de 15) y bloqueos; bots de relleno y ocupación firmada; partida con el mismo reloj y semilla, puntaje acotado a ${marcadorA.puntos} y recibo que verifica; viaje con chofer, pasajero y cambio de volante`,
  );
  fin(0);
} catch (e) {
  console.log('FALLA', e.message);
  fin(1);
}
