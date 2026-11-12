import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { DURACION_MAX_S, duracionPartida, firmarRecibo, VIAJE } from '@mundo-catrucho/reglas';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';

const { CONVEX_URL } = parseEnv(readFileSync('.env.local', 'utf8'));
const c = new ConvexHttpClient(CONVEX_URL, { logger: false });
const cli = (nombre, args) => {
  const salida = execFileSync('npx', ['convex', 'run', nombre, JSON.stringify(args)], { encoding: 'utf8' }).trim();
  return salida ? JSON.parse(salida) : null;
};
const datos = (tabla) =>
  JSON.parse(
    execFileSync('npx', ['convex', 'data', tabla, '--format', 'json'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }),
  );
const secreto = execFileSync('npx', ['convex', 'env', 'get', 'SALA_SECRETO'], { encoding: 'utf8' }).trim();
const usuarios = Array.from({ length: 10 }, () => randomBytes(32).toString('hex'));
const [a, b] = usuarios;
const mutar = (n, u, args = {}) => c.mutation(makeFunctionReference(n), { invitado: u, ...args });
const solo = (u) => mutar('partidas:abrirPartida', u, { motor: 'trivia', etapa: 0 });
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const pa = await mutar('salas:pase', a, { sala: 'mapa:38' });
  const pb = await mutar('salas:pase', b, { sala: 'mapa:38' });
  const p = await mutar('partidas:abrirJuntos', a, { juegoId: 'franciscomorazan.rosquilla-satelite' });
  assert(p.ok);
  assert((await mutar('partidas:unirseJuntos', b, { partidaId: p.partidaId })).ok);
  const inicio = Date.now();
  await pausa(1100);
  const nueva = await solo(a);
  assert(nueva.ok);
  assert.equal((await mutar('salas:paseJuego', a, { partidaId: p.partidaId })).motivo, 'abandonada');
  assert((await mutar('salas:paseJuego', b, { partidaId: p.partidaId })).ok);
  const rapido = await solo(a);
  assert.equal(rapido.motivo, 'muy seguido');
  assert(rapido.reintentarMs > 0 && rapido.reintentarMs <= 1000);
  const filas = datos('partidas');
  const f = filas.find((x) => x._id === nueva.id);
  const compartida = filas.find((x) => x._id === p.partidaId);
  const duracion = duracionPartida(p.motor, compartida.etapa, compartida.etapas);
  assert.equal(f.estado, 'abierta');
  const tareas = datos('_scheduled_functions');
  assert(
    tareas.some(
      (t) =>
        t.name === 'partidas.js:vencerPartida' &&
        t.args[0]?.partidaId === nueva.id &&
        Math.abs(t.scheduledTime - (f.inicio + DURACION_MAX_S * 1000 + 1)) < 100,
    ),
    'vencimiento del servidor programado',
  );
  cli('partidas:vencerPartida', { partidaId: nueva.id });
  assert.equal(datos('partidas').find((x) => x._id === nueva.id).estado, 'abierta', 'no vence antes de tiempo');
  const sala = `viaje:${randomBytes(10).toString('hex')}`;
  for (const u of usuarios.slice(0, VIAJE.cupo)) assert((await mutar('salas:paseViaje', u, { sala })).ok);
  assert((await mutar('salas:paseViaje', a, { sala })).ok, 'reconexión con cupo lleno');
  assert.equal((await mutar('salas:paseViaje', usuarios[8], { sala })).motivo, 'llena');
  const viaje = datos('viajesCompartidos').find((x) => x.sala === sala);
  assert.equal(viaje.jugadores.length, VIAJE.cupo);
  assert(viaje.vence > Date.now());
  cli('salas:borrarViaje', { viajeId: viaje._id });
  assert(
    datos('viajesCompartidos').some((x) => x._id === viaje._id),
    'no borra antes de tiempo',
  );
  assert((await mutar('amigos:bloquear', a, { id: pb.id })).ok);
  assert.equal((await mutar('salas:paseViaje', a, { sala })).motivo, 'bloqueado', 'restricción conocida al reconectar');
  await mutar('amigos:desbloquear', a, { id: pb.id });
  assert((await mutar('salas:paseViaje', a, { sala })).ok);
  cli('pruebasVerificacion:vencerFilas', { partidaId: nueva.id, viajeId: viaje._id });
  for (let i = 0; i < 15; i++) {
    if (
      datos('partidas').find((x) => x._id === nueva.id)?.estado === 'vencida' &&
      !datos('viajesCompartidos').some((x) => x._id === viaje._id)
    )
      break;
    await pausa(200);
  }
  assert.equal(
    datos('partidas').find((x) => x._id === nueva.id)?.estado,
    'vencida',
    'el scheduler vence la partida abandonada',
  );
  assert(!datos('viajesCompartidos').some((x) => x._id === viaje._id), 'el scheduler borra el viaje vencido');
  await pausa(Math.max(0, duracion * 1000 - (Date.now() - inicio)));
  const recibo = await firmarRecibo(
    {
      partidaId: p.partidaId,
      motor: p.motor,
      etapa: compartida.etapa,
      etapas: compartida.etapas,
      duracion,
      momento: Date.now(),
      resultados: [
        { id: pa.id, nombre: 'Ana', salio: true, puntos: 0, estrellas: 0, gano: false },
        { id: pb.id, nombre: 'Beto', salio: false, puntos: 0, estrellas: 0, gano: false },
      ],
    },
    secreto,
  );
  const saldoA = await c.query(makeFunctionReference('tienda:miPerfil'), { invitado: a });
  const r = await mutar('partidas:cerrarJuntos', b, { partidaId: p.partidaId, recibo });
  assert(r.ok && r.monedas > 0, JSON.stringify(r));
  assert.equal(
    (await c.query(makeFunctionReference('tienda:miPerfil'), { invitado: a })).monedas,
    saldoA.monedas,
    'quien abandonó no cobra',
  );
  assert.equal((await mutar('partidas:cerrarJuntos', b, { partidaId: p.partidaId, recibo })).ya, true);
  assert((await mutar('salas:paseJuego', b, { partidaId: p.partidaId })).ok, 'cerrada admite reconexión');
  await pausa(1100);
  const vieja = await solo(a);
  await pausa(1100);
  assert((await solo(a)).ok);
  assert.equal(
    (await mutar('partidas:cerrarPartida', a, { partidaId: vieja.id, puntos: 0, estrellas: 0, gano: false })).motivo,
    'cerrada',
  );
  const vencida = await mutar('partidas:abrirJuntos', usuarios[8], { juegoId: p.juegoId });
  assert(vencida.ok);
  await pausa(1100);
  assert((await solo(usuarios[8])).ok);
  assert.equal((await mutar('salas:paseJuego', usuarios[8], { partidaId: vencida.partidaId })).motivo, 'cerrada');
  const rechazada = await mutar('partidas:abrirJuntos', usuarios[9], { juegoId: p.juegoId });
  assert(rechazada.ok);
  cli('pruebasVerificacion:rechazarPartida', { partidaId: rechazada.partidaId });
  assert.equal((await mutar('salas:paseJuego', usuarios[9], { partidaId: rechazada.partidaId })).motivo, 'cerrada');
  console.log(
    'PASA revisión 3: turnos, abandono individual y cobro del compañero, vencimiento programado sin barrido global, cupo y plazo del viaje, reconexión y bloqueo',
  );
} finally {
  for (const invitado of usuarios) {
    cli('moderacion:olvidarSocial', { invitado });
    cli('progreso:olvidarInvitado', { invitado });
  }
}
