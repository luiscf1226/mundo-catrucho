import { useLayoutEffect } from 'react';
import { type DriveConfig, type DriveState, stepDrive } from '../model';
import { VIAJES } from '../routes';
import { useViaje } from '../state';
import { acciones } from './agenda';
import { useCamino } from './state';
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
        evento: (indice: number) => {
          const evento = VIAJES.eventosDeCarretera[indice];
          const accion = acciones[indice];
          const tramo = useViaje.getState().ruta?.tramos[0];
          if (!evento || !accion || !tramo) return;
          useCamino.setState({
            activa: {
              id: `prueba-${indice}`,
              tipo: 'evento',
              nombre: evento.nombre,
              texto: evento.queEs,
              accion,
              tramo,
              km: null,
              segundo: s.elapsed,
            },
            inicio: s.elapsed,
          });
        },
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
