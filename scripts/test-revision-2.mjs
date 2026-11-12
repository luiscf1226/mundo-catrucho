import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseEnv, promisify } from 'node:util';
import { firmarMensaje, firmarRecibo, PARTIDA, verificarPase } from '@mundo-catrucho/reglas';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';

const { CONVEX_URL } = parseEnv(readFileSync('.env.local', 'utf8'));
const c = new ConvexHttpClient(CONVEX_URL, { logger: false });
const cli = (nombre, args) => {
  const salida = execFileSync('npx', ['convex', 'run', nombre, JSON.stringify(args)], {
    encoding: 'utf8',
    env: { ...process.env, CI: '1' },
  }).trim();
  return salida ? JSON.parse(salida) : null;
};
const secreto = execFileSync('npx', ['convex', 'env', 'get', 'SALA_SECRETO'], {
  encoding: 'utf8',
  env: { ...process.env, CI: '1' },
}).trim();
const usuarios = Array.from({ length: 202 }, () => randomBytes(32).toString('hex'));
const [ana, beto, carla] = usuarios;
const usados = new Set();
const mutar = (nombre, invitado, args = {}) => {
  usados.add(invitado);
  return c.mutation(makeFunctionReference(nombre), { invitado, ...args });
};
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const abrir = (u) => mutar('partidas:abrirJuntos', u, { juegoId: 'franciscomorazan.rosquilla-satelite' });
const solo = (u) => mutar('partidas:abrirPartida', u, { motor: 'trivia', etapa: 0 });
const unir = (u, p) => mutar('partidas:unirseJuntos', u, { partidaId: p.partidaId });
const pase = (u) => mutar('salas:pase', u, { sala: 'mapa:39' });
try {
  await pase(ana);
  const pb = await pase(beto),
    pc = await pase(carla);
  const p = await abrir(ana);
  assert(p.ok);
  assert.equal((await abrir(ana)).motivo, 'muy seguido');
  assert.equal((await solo(ana)).motivo, 'muy seguido');
  await pausa(1050);
  const s = await solo(ana);
  assert(s.ok);
  assert.equal((await unir(beto, p)).ok, false, 'la sola venció la de dos');
  await pausa(1050);
  const p2 = await abrir(ana);
  assert(p2.ok);
  assert.equal(
    (await mutar('partidas:cerrarPartida', ana, { partidaId: s.id, puntos: 0, estrellas: 0, gano: false })).ok,
    false,
  );
  const propia = await abrir(beto);
  assert(propia.ok);
  await pausa(1050);
  assert((await unir(beto, p2)).ok);
  assert.equal((await unir(carla, propia)).ok, false, 'unirse venció la anterior');
  assert((await mutar('amigos:bloquear', ana, { id: pc.id })).ok);
  const pcPartida = await abrir(carla);
  assert(pcPartida.ok);
  assert.equal((await unir(ana, pcPartida)).motivo, 'bloqueado');
  await pausa(1050);
  const otra = await abrir(ana);
  assert(otra.ok);
  assert.equal((await unir(carla, otra)).motivo, 'bloqueado');
  const sala = `viaje:${randomBytes(10).toString('hex')}`;
  assert((await mutar('salas:paseViaje', ana, { sala })).ok);
  assert.equal((await mutar('salas:paseViaje', carla, { sala })).motivo, 'bloqueado');
  const sala2 = `viaje:${randomBytes(10).toString('hex')}`;
  assert((await mutar('salas:paseViaje', carla, { sala: sala2 })).ok);
  assert.equal((await mutar('salas:paseViaje', ana, { sala: sala2 })).motivo, 'bloqueado');
  const m = { id: 'm1', de: pb.id, sala: 'mapa:39', ts: Date.now(), texto: 'hola' };
  for (const cambio of [
    { sala: 'no' },
    { id: 'id|falso' },
    { de: 'id|falso' },
    { ts: -1 },
    { texto: 'x'.repeat(141) },
  ]) {
    const mensaje = { ...m, ...cambio };
    const r = await mutar('moderacion:reportar', ana, {
      motivo: 'otro',
      mensaje: { ...mensaje, firma: await firmarMensaje(mensaje, secreto) },
    });
    assert.equal(r.motivo, 'mensaje');
  }
  // 200 cuentas reales: no se trunca ni el primer bloqueo y el 201 se rechaza.
  const ids = [];
  for (const u of usuarios.slice(1)) {
    const p = await pase(u);
    ids.push(p.id);
  }
  for (const id of ids.slice(0, 200)) assert((await mutar('amigos:bloquear', ana, { id })).ok);
  assert.equal((await mutar('amigos:bloquear', ana, { id: ids[200] })).motivo, 'tope-bloqueos');
  const todos = await pase(ana);
  const v = await verificarPase(todos.pase, secreto, 'mapa:39');
  assert(v.ok);
  assert.equal(v.pase.bloqueados.length, 200);
  assert(v.pase.bloqueados.includes(pc.id));
  const zona = 'dept:graciasadios:39',
    momento = Date.now();
  const datos = () =>
    JSON.parse(
      execFileSync('npx', ['convex', 'data', 'salas', '--format', 'json'], {
        encoding: 'utf8',
        env: { ...process.env, CI: '1' },
      }),
    ).find((f) => f.tipo === 'dept' && f.deptId === 'graciasadios' && f.tramo === 39);
  cli('salas:reportar', { sala: zona, momento, ocupacion: 7 });
  const inicial = datos();
  assert.equal(inicial.visto, momento);
  for (const t of [momento, momento - 1, Date.now() + 60000, Date.now() - 80000]) {
    cli('salas:reportar', { sala: zona, momento: t, ocupacion: 999 });
    assert.deepEqual(datos(), inicial);
  }
  // La tarea programada vence la invitación sin depender del navegador.
  const pendiente = await abrir(beto);
  assert(pendiente.ok);
  const recibo = await firmarRecibo(
    {
      partidaId: pendiente.partidaId,
      motor: pendiente.motor,
      etapa: 0,
      etapas: 3,
      duracion: 70,
      momento: Date.now(),
      resultados: [],
    },
    secreto,
  );
  await pausa(PARTIDA.esperaMaxMs + 1500);
  assert.equal(
    (await mutar('partidas:cerrarJuntos', beto, { partidaId: pendiente.partidaId, recibo })).motivo,
    'cerrada',
  );
  console.log(
    'PASA revisión 2: apertura única, ritmo, bloqueos de partida/viaje en ambos sentidos, 200 bloqueos completos, reportes con forma válida, avisos sin repetición y vencimiento programado',
  );
} catch (error) {
  console.error('FALLA revisión 2:', error);
  throw error;
} finally {
  const ejecutar = promisify(execFile);
  const pendientes = [...usados];
  await Promise.all(
    Array.from({ length: 2 }, async () => {
      for (let invitado = pendientes.pop(); invitado; invitado = pendientes.pop()) {
        for (const nombre of ['moderacion:olvidarSocial', 'progreso:olvidarInvitado']) {
          for (let intento = 0; ; intento++) {
            try {
              await ejecutar('npx', ['convex', 'run', nombre, JSON.stringify({ invitado })], {
                env: { ...process.env, CI: '1' },
              });
              break;
            } catch (error) {
              if (intento >= 3) throw error;
              await pausa(1000);
            }
          }
        }
      }
    }),
  );
}
