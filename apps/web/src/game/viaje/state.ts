import { create } from 'zustand';
import { audio, type Track } from '../../core/audio';
import type { LineaViaje, RutaViaje } from './routes';
export const RADIOS: { track: Track; name: string }[] = [
  { track: 'viajePunta', name: 'Punta encendida' },
  { track: 'viajeDembow', name: 'Dembow del barrio' },
  { track: 'viajeTrap', name: 'Trap de la ruta' },
  { track: 'viajeBanda', name: 'Banda del camino' },
];
export const useViaje = create<{
  progress: number;
  hits: number;
  speed: number;
  x: number;
  radio: number;
  ruta: RutaViaje | null;
  linea: LineaViaje | null;
}>(() => ({
  ruta: null,
  linea: null,
  progress: 0,
  hits: 0,
  speed: 0,
  x: 0,
  radio: 0,
}));
export function changeRadio() {
  const radio = (useViaje.getState().radio + 1) % RADIOS.length;
  useViaje.setState({ radio });
  audio.music(RADIOS[radio].track);
}
