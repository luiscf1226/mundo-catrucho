import { useLayoutEffect } from 'react';
import { type DriveConfig, type DriveState, stepDrive } from '../model';
export function usePruebaCamino(
  s: DriveState,
  config: DriveConfig,
  onRoadStep: ((s: DriveState, dt: number) => void) | undefined,
  onStep: (s: DriveState, dt: number) => void,
) {
  useLayoutEffect(() => {
    if (!config.trip || !location.hash.includes('test')) return;
    Object.assign(window, {
      __mcCamino: {
        estado: () => ({ speed: s.speed, distance: s.distance, elapsed: s.elapsed, x: s.x }),
        avanzar: (segundos: number, x?: number) => {
          if (x !== undefined) s.x = x;
          for (let t = 0; t < Math.min(240, segundos); t += 0.05) {
            stepDrive(s, config, 0.05, 0, 0, false);
            onRoadStep?.(s, 0.05);
            onStep(s, 0.05);
          }
        },
      },
    });
    return () => {
      Reflect.deleteProperty(window, '__mcCamino');
    };
  }, [s, config, onRoadStep, onStep]);
}
