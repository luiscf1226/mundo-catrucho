import { useLayoutEffect, useMemo, useRef } from 'react';
import { audio } from '../../core/audio';
import { deptById } from '../../core/data';
import { useGame } from '../../core/store';
import type { Vehiculo } from '../../core/types';
import { DrivingScene } from './DrivingScene';
import type { DriveConfig } from './model';
import { lineaDeViaje, resolverRuta } from './routes';
import { RADIOS, useViaje } from './state';
export function Viaje({ veh, to }: { veh: Vehiculo; to: string }) {
  const dept = deptById(to),
    done = useRef(false),
    clock = useRef(0);
  const scene = useGame((s) => s.scene);
  const from = scene.kind === 'viaje' ? scene.from : 'franciscomorazan';
  const ruta = useMemo(() => resolverRuta(from, to), [from, to]);
  const linea = useViaje((s) => s.linea);
  const config = useMemo<DriveConfig>(
    () => ({ veh, via: 'carretera', difficulty: 0.35, trip: true, seed: 504 }),
    [veh],
  );
  useLayoutEffect(() => {
    const radio = veh === 'taxi' ? 2 : veh === 'bus' ? 3 : 0;
    useViaje.setState({ progress: 0, hits: 0, speed: 0, radio, ruta, linea: ruta ? lineaDeViaje(ruta, 0) : null });
    audio.music(RADIOS[radio].track);
  }, [veh, ruta]);
  return (
    <DrivingScene
      config={config}
      destination={dept?.name ?? to}
      biome={linea?.tramo?.paisaje ?? dept?.biome}
      tramo={linea?.tramo ?? undefined}
      onStep={(s, dt) => {
        clock.current += dt;
        const track = RADIOS[useViaje.getState().radio].track;
        if (audio.track !== track) audio.music(track);
        if (!ruta) return;
        const linea = lineaDeViaje(ruta, s.elapsed);
        const progress = linea.posicion;
        if (clock.current > 0.12) {
          clock.current = 0;
          useViaje.setState({ linea, progress, hits: s.hits, speed: Math.round(s.speed * 3.6) });
        }
        if (progress >= 1 && !done.current) {
          done.current = true;
          useGame.getState().llegarViaje(Math.max(0, 30 - s.hits * 5));
        }
      }}
    />
  );
}
