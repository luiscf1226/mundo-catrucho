import { useLayoutEffect, useMemo, useRef } from 'react';
import { audio } from '../../core/audio';
import { deptById } from '../../core/data';
import { useGame } from '../../core/store';
import type { Vehiculo } from '../../core/types';
import { DrivingScene } from './DrivingScene';
import type { DriveConfig } from './model';
import { RADIOS, useViaje } from './state';
export function Viaje({ veh, to }: { veh: Vehiculo; to: string }) {
  const dept = deptById(to),
    done = useRef(false),
    clock = useRef(0);
  const config = useMemo<DriveConfig>(
    () => ({
      veh,
      via:
        dept?.biome === 'capital'
          ? 'ciudad'
          : dept?.biome === 'montana'
            ? 'montana'
            : dept?.biome === 'costa' || dept?.biome === 'isla'
              ? 'costa'
              : 'carretera',
      difficulty: 0.35,
      trip: true,
      seed: 504,
    }),
    [veh, to],
  );
  useLayoutEffect(() => {
    const radio = veh === 'taxi' ? 2 : veh === 'bus' ? 3 : 0;
    useViaje.setState({ progress: 0, hits: 0, speed: 0, radio });
    audio.music(RADIOS[radio].track);
  }, [veh]);
  return (
    <DrivingScene
      config={config}
      destination={dept?.name ?? to}
      biome={dept?.biome}
      onStep={(s, dt) => {
        clock.current += dt;
        const track = RADIOS[useViaje.getState().radio].track;
        if (audio.track !== track) audio.music(track);
        const duration = Math.min(50, (veh === 'taxi' ? 35 : veh === 'bus' ? 47 : 41) + s.hits * 0.65);
        const progress = Math.min(1, s.elapsed / duration);
        if (clock.current > 0.12) {
          clock.current = 0;
          useViaje.setState({ progress, hits: s.hits, speed: Math.round(s.speed * 3.6) });
        }
        if (progress >= 1 && !done.current) {
          done.current = true;
          useGame.getState().llegarViaje(Math.max(0, 30 - s.hits * 5));
        }
      }}
    />
  );
}
