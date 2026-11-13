import { create } from 'zustand';
import { useGame } from '../../../core/store';
import type { DriveState } from '../model';
import { comidaDe } from '../paradas/comida';
import type { RutaViaje } from '../routes';
import { type Cita, crearAgenda, limiteDeEvento } from './agenda';
export const useCamino = create<{
  agenda: Cita[];
  activa: Cita | null;
  atendidas: string[];
  compradas: string[];
  energia: number;
  inicio: number;
  velocidad: number;
}>(() => ({ agenda: [], activa: null, atendidas: [], compradas: [], energia: 0, inicio: 0, velocidad: 0 }));
/** `semilla`: la del viaje compartido (MC-31), para que todos vean los mismos eventos. */
export function iniciarCamino(ruta: RutaViaje | null, semilla?: number) {
  const s = semilla ?? (location.hash.includes('test') ? 0 : Math.floor(Math.random() * 20));
  useCamino.setState({
    agenda: ruta ? crearAgenda(ruta, s) : [],
    activa: null,
    atendidas: [],
    compradas: [],
    energia: 0,
    inicio: 0,
    velocidad: 0,
  });
}
export function seguirCamino() {
  useCamino.setState({ activa: null });
}
export function comprarComida(id: string) {
  const s = useCamino.getState();
  if (!s.activa || s.activa.accion !== 'comprar' || s.compradas.includes(id) || s.velocidad > 0.1) return;
  const comida = comidaDe(s.activa).find((c) => c.id === id);
  const g = useGame.getState();
  if (!comida) return;
  if (g.profile.coins < comida.precio) {
    g.toast('No te ajusta el pisto', '🪙');
    return;
  }
  useCamino.setState({ compradas: [...s.compradas, id], energia: s.energia + 10 });
  g.addCoins(-comida.precio);
  g.toast(`¡Qué rico! ${comida.nombre} · +10 energía del viaje`, '🥙');
}
export function pagarPeaje() {
  const s = useCamino.getState(),
    g = useGame.getState();
  if (s.activa?.accion !== 'pagar' || s.velocidad > 0.1) return;
  if (g.profile.coins < 2) {
    g.toast('Pasá por el carril asistido, sin cobro', '🛣️');
  } else {
    g.addCoins(-2);
    g.toast('Peaje pagado · L 2', '🛣️');
  }
  seguirCamino();
}
export function pasoCamino(s: DriveState, dt: number, veh: string) {
  let camino = useCamino.getState();
  if (camino.activa && s.elapsed - camino.inicio > 7) {
    seguirCamino();
    camino = useCamino.getState();
  }
  const cita = camino.agenda.find((c) => c.segundo <= s.elapsed && !camino.atendidas.includes(c.id));
  if (!camino.activa && cita) {
    const activa =
      cita.tipo === 'parada' && veh !== 'bus' && veh !== 'rapidito'
        ? { ...cita, nombre: `Comedor · ${cita.nombre}` }
        : cita;
    useCamino.setState({ activa, inicio: s.elapsed, atendidas: [...camino.atendidas, cita.id], velocidad: s.speed });
    camino = useCamino.getState();
  }
  if (camino.energia > 0) s.shake = Math.max(0, s.shake - dt * camino.energia * 0.05);
  const activa = camino.activa;
  // en el aire nada detiene la avioneta: ningún evento frena un tramo aéreo
  if (!activa || activa.tramo.medio === 'avioneta') return;
  const antes = s.speed;
  const limite = limiteDeEvento(activa.accion, s.x);
  s.speed = Math.min(s.speed, Math.max(limite, s.speed - 22 * dt));
  s.distance -= (antes - s.speed) * dt;
  if (activa.accion === 'comprar') s.x += (5.8 - s.x) * Math.min(1, dt * 2);
  if (Math.abs(camino.velocidad - s.speed) > 0.1) useCamino.setState({ velocidad: s.speed });
}
