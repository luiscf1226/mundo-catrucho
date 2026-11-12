// Prueba de la sala: levanta `wrangler dev` con un secreto aleatorio y firma pases con la misma función que usa
// Convex. Comprueba que sin pase (o vencido, o de otra sala) no se entra, que dos jugadores se ven entrar, moverse,
// hacer emotes y salir, que el jugador 25 cae al tramo 2 y que la misma cuenta en otra pestaña reemplaza a la vieja.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { firmarPase, SALA } from '@mundo-catrucho/reglas';

/** Un puerto libre: 8799 puede estar ocupado por `pnpm dev` u otra copia del repo. */
const libre = () =>
  new Promise((res) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
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
  process.exit(code);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pase = (sala, id, nombre, extra = {}) =>
  firmarPase({ id, nombre, sala, avatar: { shirtColor: '#e63946', skin: '#8d5524' }, ...extra }, SECRETO, extra.ahora);
/** Conecta y espera el primer mensaje («hola») o el cierre. Devuelve { ws, cola, cierre }. */
const abrir = (sala, p) =>
  new Promise((res, rej) => {
    const ws = new WebSocket(`ws://${BASE}/sala/${sala}${p === undefined ? '' : `?pase=${encodeURIComponent(p)}`}`),
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
  console.log(
    `PASA sala: sin pase, vencido, de otra sala y con otro secreto rechazados; dos jugadores se ven entrar, moverse, hacer emotes y salir; ráfaga recortada a ${rafaga} de 150; el 25 cae a ${libre.sala}`,
  );
  fin(0);
} catch (e) {
  console.log('FALLA', e.message);
  fin(1);
}
