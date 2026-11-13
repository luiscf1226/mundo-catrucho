// Viaje compartido (MC-31): sala `viaje:<id>`. Quien arranca el viaje maneja y manda el estado del vehículo; los de
// la sala que se suben van de pasajeros y ven el mismo recorrido, paradas y eventos (misma semilla). Si el chofer
// se va, el volante pasa al pasajero que lleva más tiempo. Cada uno paga su pasaje y cobra su bono en Convex
// (`salirDeViaje` / `llegarViaje`). Sin salas en vivo, `salirDeViajeCompartido` es el viaje de siempre.
import { create } from 'zustand';
import { Canal, mutar } from './juntos';
import { EN_VIVO, net } from './net';
import { useGame } from './store';
import type { Vehiculo } from './types';

export interface RutaCompartida {
  veh: string;
  de: string;
  a: string;
  /** semilla de los eventos del camino: la misma para todos */
  semilla: number;
}
/** Estado del vehículo que manda el chofer: posición lateral, velocidad, distancia, segundos y choques. */
export interface Auto {
  x: number;
  v: number;
  d: number;
  e: number;
  h: number;
}
export interface EstadoViajeJuntos {
  rol: null | 'chofer' | 'pasajero';
  /** saliendo (chofer) o conectando (pasajero): todavía no arranca la escena del viaje */
  fase: 'nada' | 'saliendo' | 'conectando' | 'en-viaje';
  sala: string | null;
  yo: string | null;
  chofer: string | null;
  gente: { id: string; nombre: string }[];
  ruta: RutaCompartida | null;
}
const VACIO: EstadoViajeJuntos = { rol: null, fase: 'nada', sala: null, yo: null, chofer: null, gente: [], ruta: null };
export const useViajeJuntos = create<EstadoViajeJuntos>(() => ({ ...VACIO }));
let canal: Canal | null = null,
  remoto: (Auto & { t: number }) | null = null,
  ultimoEnvio = 0,
  plazoSalida: ReturnType<typeof setTimeout> | undefined;
/** si la sala del viaje no contesta en esto, el chofer sale solo (sin invitar) */
const SALIDA_MAX_MS = 3000;
/** veces por segundo que el chofer manda el vehículo */
const AUTO_HZ = 10;

const idNuevo = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');

/**
 * Sale de viaje desde la terminal. Con salas en vivo, primero entra a la sala del viaje (así maneja él y nadie se
 * le adelanta), después invita a los de la sala de la zona y arranca.
 */
export function salirDeViajeCompartido(veh: Vehiculo, a: string) {
  const g = useGame.getState();
  if (!EN_VIVO) return g.startViaje(veh, a);
  if (useViajeJuntos.getState().fase !== 'nada') return false;
  const sc = g.scene,
    de = sc.kind === 'dept' ? sc.id : 'franciscomorazan',
    sala = `viaje:${idNuevo()}`,
    semilla = Math.floor(Math.random() * 1_000_000);
  useViajeJuntos.setState({ ...VACIO, rol: 'chofer', fase: 'saliendo', sala, ruta: { veh, de, a, semilla } });
  conectar(sala);
  plazoSalida = setTimeout(() => arrancar(false), SALIDA_MAX_MS);
  return true;
}
/** El chofer ya está en la sala del viaje (o se cansó de esperar): invita y arranca la escena. */
function arrancar(invitar: boolean) {
  clearTimeout(plazoSalida);
  const s = useViajeJuntos.getState();
  if (s.fase !== 'saliendo' || !s.ruta || !s.sala) return;
  // la invitación sale antes de dejar la sala de la zona
  if (invitar) net.sendInvite({ tipo: 'viaje', sala: s.sala, veh: s.ruta.veh, a: s.ruta.a });
  if (!useGame.getState().startViaje(s.ruta.veh as Vehiculo, s.ruta.a, s.ruta.de)) return salirDelViajeCompartido();
  useViajeJuntos.setState({ fase: 'en-viaje' });
}

/** Se sube a un viaje compartido (invitación de la sala o código de amigo). El pasaje lo cobra Convex. */
export function unirseAViaje(sala: string) {
  if (!EN_VIVO || useViajeJuntos.getState().fase !== 'nada') return false;
  useViajeJuntos.setState({ ...VACIO, rol: 'pasajero', fase: 'conectando', sala });
  conectar(sala);
  return true;
}

export function salirDelViajeCompartido() {
  clearTimeout(plazoSalida);
  canal?.cerrar();
  canal = null;
  remoto = null;
  useViajeJuntos.setState({ ...VACIO });
}

function conectar(sala: string) {
  canal?.cerrar();
  remoto = null;
  const c = new Canal(
    sala,
    async () => {
      const p = await mutar<{ ok: true; pase: string } | { ok: false }>('salas:paseViaje', {
        sala,
        nombre: useGame.getState().profile.name,
      });
      return p?.ok ? p : null;
    },
    recibir,
    () => {
      if (canal !== c) return;
      const s = useViajeJuntos.getState();
      if (s.fase === 'conectando') useGame.getState().toast('Ese viaje ya salió', '🚌');
      // el viaje sigue solo: sin chofer remoto, maneja cada uno
      salirDelViajeCompartido();
      // sin sala de viaje, el chofer sale igual (solo)
      if (s.fase === 'saliendo' && s.ruta) useGame.getState().startViaje(s.ruta.veh as Vehiculo, s.ruta.a, s.ruta.de);
      if (s.rol === 'pasajero' && s.fase === 'en-viaje')
        useGame.getState().toast('Se cortó el viaje: ahora manejás vos', '🚌');
    },
  );
  canal = c;
  void c.abrir();
}

function recibir(m: Record<string, unknown>) {
  const s = useViajeJuntos.getState();
  if (m.t === 'hola') {
    const yo = String(m.id),
      chofer = String(m.chofer),
      ruta = (m.ruta as RutaCompartida | null) ?? null,
      gente = ((m.jugadores as { id: string; nombre: string }[]) ?? []).map((j) => ({ id: j.id, nombre: j.nombre }));
    if (m.auto) remoto = { ...(m.auto as Auto), t: performance.now() };
    useViajeJuntos.setState({ yo, chofer, gente, rol: chofer === yo ? 'chofer' : 'pasajero' });
    if (s.rol === 'chofer' && !ruta && s.ruta) canal?.enviar({ t: 'ruta', ...s.ruta });
    if (s.fase === 'saliendo') {
      // alguien se adelantó al volante (no debería: la sala es nueva): sale solo
      if (chofer !== yo) {
        const r = s.ruta;
        salirDelViajeCompartido();
        if (r) useGame.getState().startViaje(r.veh as Vehiculo, r.a, r.de);
        return;
      }
      return arrancar(true);
    }
    if (s.fase === 'conectando') {
      if (!ruta) return salirDelViajeCompartido();
      useViajeJuntos.setState({ ruta });
      // el pasaje se cobra como en cualquier viaje; sin pisto no se sube
      if (!useGame.getState().startViaje(ruta.veh as Vehiculo, ruta.a, ruta.de)) return salirDelViajeCompartido();
      useViajeJuntos.setState({ fase: 'en-viaje' });
      useGame.getState().toast(`Vas de pasajero · maneja ${nombreDe(chofer)}`, '🚌');
    }
  } else if (m.t === 'entra') {
    useViajeJuntos.setState({
      gente: [...s.gente.filter((j) => j.id !== m.id), { id: String(m.id), nombre: String(m.nombre) }],
    });
    if (s.rol === 'chofer') useGame.getState().toast(`${String(m.nombre)} se subió`, '🚌');
  } else if (m.t === 'sale') {
    useViajeJuntos.setState({ gente: s.gente.filter((j) => j.id !== m.id) });
  } else if (m.t === 'ruta' && !s.ruta) {
    useViajeJuntos.setState({
      ruta: { veh: String(m.veh), de: String(m.de), a: String(m.a), semilla: Number(m.semilla) },
    });
  } else if (m.t === 'auto') {
    remoto = { x: Number(m.x), v: Number(m.v), d: Number(m.d), e: Number(m.e), h: Number(m.h), t: performance.now() };
  } else if (m.t === 'chofer') {
    const yo = m.id === s.yo;
    useViajeJuntos.setState({ chofer: String(m.id), rol: yo ? 'chofer' : 'pasajero' });
    useGame
      .getState()
      .toast(yo ? 'El chofer se bajó: ¡te toca el volante!' : `Ahora maneja ${nombreDe(String(m.id))}`, '🚌');
  }
}
const nombreDe = (id: string) => useViajeJuntos.getState().gente.find((j) => j.id === id)?.nombre ?? 'alguien';

/**
 * Para el pasajero: el vehículo como lo manda el chofer, adelantado hasta medio segundo desde el último envío.
 * null si este navegador maneja.
 */
export function leerAuto(): Auto | null {
  const s = useViajeJuntos.getState();
  if (s.rol !== 'pasajero' || s.fase !== 'en-viaje') return null;
  if (!remoto) return { x: 0, v: 0, d: 0, e: 0, h: 0 };
  const dt = Math.min(0.5, (performance.now() - remoto.t) / 1000);
  return { x: remoto.x, v: remoto.v, d: remoto.d + remoto.v * dt, e: remoto.e + dt, h: remoto.h };
}
/** Para el chofer: manda el vehículo a los pasajeros `AUTO_HZ` veces por segundo. */
export function enviarAuto(a: { x: number; speed: number; distance: number; elapsed: number; hits: number }) {
  const s = useViajeJuntos.getState(),
    ahora = performance.now();
  if (s.rol !== 'chofer' || !canal || ahora - ultimoEnvio < 1000 / AUTO_HZ) return;
  ultimoEnvio = ahora;
  const r = (v: number) => Math.round(v * 100) / 100;
  canal.enviar({ t: 'auto', x: r(a.x), v: r(a.speed), d: r(a.distance), e: r(a.elapsed), h: a.hits });
}

if (net.online)
  // al llegar (o salir del viaje de cualquier forma) se deja la sala del viaje
  useGame.subscribe((g) => {
    if (useViajeJuntos.getState().fase === 'en-viaje' && g.scene.kind !== 'viaje') salirDelViajeCompartido();
  });
