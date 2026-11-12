// Jugar con gente de la sala: invitaciones (MC-25, MC-31), espera y marcador de una partida entre dos, y quién va
// en un viaje compartido. Solo aparece con salas en vivo.
import { useEffect, useState } from 'react';
import { deptById, juegoById } from '../core/data';
import {
  type JugadorJuntos,
  juegoParaJuntos,
  jugarConAlguien,
  quitarInvitacion,
  salirDePartida,
  unirseAPartida,
  useInvitaciones,
  usePartida,
} from '../core/juntos';
import { EN_VIVO, useSala } from '../core/net';
import { useGame } from '../core/store';
import { unirseAViaje, useViajeJuntos } from '../core/viajeJuntos';
import { Btn } from './components/kit';
import { cx, g } from './lib';

/** En el panel de salas: abre una partida y le avisa a la gente de la sala. */
export function JugarConAlguien() {
  const otros = useSala((s) => s.otros),
    estado = usePartida((s) => s.estado),
    scene = useGame((s) => s.scene);
  // depende de la escena: el primer juego del kit del departamento donde andás
  const juego = scene.kind === 'viaje' ? undefined : juegoParaJuntos();
  if (!EN_VIVO || !juego) return null;
  return (
    <div className="mc-card mt-3 flex flex-wrap items-center gap-2 p-3">
      <div className="min-w-0 flex-1">
        <div className="mc-label">Jugar con alguien de la sala</div>
        <b className="block truncate">
          {juego.icon} {juego.name}
        </b>
      </div>
      <Btn
        id="pj-jugar"
        tone="play"
        icon="users"
        disabled={estado !== 'nada'}
        onClick={() => {
          g().closePanel();
          void jugarConAlguien(juego.id);
        }}
      >
        {otros > 0 ? 'Invitar a la sala' : 'Abrir y esperar'}
      </Btn>
    </div>
  );
}

/** Invitaciones que llegaron por la sala: jugar juntos o subirse a un viaje. */
export function Invitaciones() {
  const lista = useInvitaciones((s) => s.lista);
  if (!lista.length) return null;
  return (
    <div
      data-testid="inv-lista"
      className="pointer-events-auto absolute bottom-24 left-3 z-20 flex max-w-[22rem] flex-col gap-2"
    >
      {lista.map((i) => {
        const viaje = i.tipo === 'viaje';
        const que = viaje
          ? `sale en ${i.veh ?? 'bus'} a ${i.a ? deptById(i.a).name : 'otro lado'}`
          : `te invita a jugar «${(i.juego && juegoById(i.juego)?.name) || 'un juego'}»`;
        return (
          <div key={i.sala} data-testid={`inv-${i.tipo}`} className="mc-panel flex items-center gap-2 p-2.5 anim-up">
            <span className="text-2xl" aria-hidden>
              {viaje ? '🚌' : '🎮'}
            </span>
            <p className="min-w-0 flex-1 text-sm leading-snug">
              <b>{i.de}</b> {que}
            </p>
            <Btn
              id={viaje ? 'inv-subir' : 'inv-aceptar'}
              tone="play"
              size="sm"
              onClick={() => {
                quitarInvitacion(i.sala);
                if (viaje) unirseAViaje(i.sala);
                else void unirseAPartida(i.sala.slice('juego:'.length));
              }}
            >
              {viaje ? 'Subirme' : 'Jugar'}
            </Btn>
            <Btn
              id="inv-no"
              tone="neutral"
              size="sm"
              icon="x"
              title="No, gracias"
              onClick={() => quitarInvitacion(i.sala)}
            />
          </div>
        );
      })}
    </div>
  );
}

/** En vez de la tarjeta de inicio: espera al otro jugador y la cuenta de la sala. */
export function JuntosEspera() {
  const { estado, jugadores, juegoId, motivo } = usePartida();
  const otros = jugadores.filter((j) => j.id !== usePartida.getState().yo && !j.salio);
  const juego = juegoId ? juegoById(juegoId) : undefined;
  const texto =
    estado === 'abriendo'
      ? 'Abriendo la partida…'
      : estado === 'cancelada'
        ? 'Nadie se unió a tiempo.'
        : estado === 'error'
          ? motivo === 'llena'
            ? 'La partida ya empezó sin vos.'
            : 'Sin conexión con la sala.'
          : otros.length
            ? `¡${otros.map((j) => j.nombre).join(', ')} ya está! Arrancando…`
            : 'Esperando a alguien de la sala…';
  return (
    <div className="mc-overlay pad-safe-sm pointer-events-auto absolute inset-0 z-20 flex items-center justify-center">
      <div
        data-testid="pj-espera"
        data-estado={estado}
        className="mc-panel flex w-full max-w-sm flex-col gap-3 p-5 text-center"
      >
        <div className="mc-bigicon" aria-hidden>
          🎮
        </div>
        <h3 className="font-display text-2xl font-bold leading-tight">{juego?.name ?? 'Partida entre dos'}</h3>
        <p className="text-[15px]">{texto}</p>
        <p className="mc-label">El mismo reloj y la misma semilla para los dos. Gana quien haga más puntos.</p>
        <Btn
          id="pj-salir"
          tone="neutral"
          icon="back"
          onClick={() => {
            salirDePartida();
            g().exitMinigame();
          }}
        >
          Salir
        </Btn>
      </div>
    </div>
  );
}

function filas(jugadores: JugadorJuntos[], yo: string | null) {
  return [...jugadores]
    .sort((a, b) => b.puntos - a.puntos)
    .map((j) => (
      <div
        key={j.id}
        data-testid="pj-fila"
        data-id={j.id}
        data-yo={j.id === yo}
        data-puntos={j.puntos}
        className={cx('flex items-center justify-between gap-3', j.id === yo && 'font-bold')}
      >
        <span className={j.salio ? 'opacity-50' : ''}>
          {j.id === yo ? 'Vos' : j.nombre}
          {j.salio ? ' (se fue)' : ''}
        </span>
        <b className="mc-num">{j.puntos} pts</b>
      </div>
    ));
}

/** Marcador en vivo de los dos jugadores, arriba a la derecha mientras se juega. */
export function MarcadorJuntos() {
  const { jugadores, yo, estado } = usePartida();
  if (!jugadores.length) return null;
  return (
    <div
      data-testid="pj-marcador"
      data-estado={estado}
      className="mc-panel pointer-events-none absolute right-3 top-16 z-10 flex min-w-[11rem] flex-col gap-1 p-2.5 text-sm"
    >
      <div className="mc-label">Marcador en vivo</div>
      {filas(jugadores, yo)}
    </div>
  );
}

/** En los resultados: quién ganó según el recibo de la sala y si ya se cobró. */
export function FinalJuntos() {
  const { jugadores, yo, estado, pago } = usePartida();
  const orden = [...jugadores].sort((a, b) => b.puntos - a.puntos);
  const empate = orden.length > 1 && orden[0].puntos === orden[1].puntos;
  return (
    <div
      data-testid="pj-final"
      data-estado={estado}
      className="mc-card flex w-full flex-col gap-0.5 px-3 py-1.5 text-left text-sm"
    >
      <div className="mc-label">
        {estado !== 'fin'
          ? 'Esperando el recibo de la sala…'
          : empate
            ? '¡Empate!'
            : orden[0]?.id === yo
              ? '¡Le ganaste!'
              : `¡Ganó ${orden[0]?.nombre}!`}
      </div>
      {filas(jugadores, yo)}
      <div
        data-testid="pj-pago"
        data-pago={typeof pago === 'object' && pago ? 'pagado' : (pago ?? '')}
        className="mc-label mt-1"
      >
        {pago === 'pendiente'
          ? 'Cobrando el recibo…'
          : pago === 'rechazado'
            ? 'El servidor no pagó esta partida'
            : pago
              ? `Recibo de la sala pagado: +${pago.monedas} · +${pago.xp} XP`
              : ''}
      </div>
    </div>
  );
}

/** Quién maneja y quiénes van en el viaje compartido. */
export function ViajeJuntosHud() {
  const { rol, gente, chofer, yo } = useViajeJuntos();
  const [, pintar] = useState(0);
  useEffect(() => {
    const t = setInterval(() => pintar((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!rol) return null;
  const quien = chofer === yo ? 'Vos' : (gente.find((j) => j.id === chofer)?.nombre ?? '…');
  return (
    <div
      data-testid="vj-rol"
      data-rol={rol}
      className="mc-panel pointer-events-none absolute left-3 top-28 z-10 max-w-[12.5rem] px-2.5 py-1.5 text-xs"
    >
      {rol === 'chofer' ? '🚌 Manejás vos' : `🧍 Vas de pasajero · maneja ${quien}`}
      {gente.length > 0 && ` · ${gente.length + 1} a bordo`}
    </div>
  );
}
