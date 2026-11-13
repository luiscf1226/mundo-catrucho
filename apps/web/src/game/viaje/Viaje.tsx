import { useLayoutEffect, useMemo, useRef } from 'react';
import { audio } from '../../core/audio';
import { deptById } from '../../core/data';
import { useGame } from '../../core/store';
import type { Vehiculo } from '../../core/types';
import { enviarAuto, leerAuto, useViajeJuntos } from '../../core/viajeJuntos';
import { Label } from '../kit';
import { DrivingScene } from './DrivingScene';
import { EscenaCamino } from './eventos/EscenaCamino';
import { iniciarCamino, pasoCamino, useCamino } from './eventos/state';
import type { DriveConfig } from './model';
import { rutaParaVehiculo } from './opciones';
import { lineaDeViaje } from './routes';
import { RADIOS, useViaje } from './state';
export function Viaje({ veh, to }: { veh: Vehiculo; to: string }) {
  const dept = deptById(to),
    done = useRef(false),
    clock = useRef(0);
  const scene = useGame((s) => s.scene);
  const from = scene.kind === 'viaje' ? scene.from : 'franciscomorazan';
  const ruta = useMemo(() => rutaParaVehiculo(veh, from, to), [veh, from, to]);
  const clima = useCamino((s) => s.activa?.accion);
  const linea = useViaje((s) => s.linea);
  const medio = (useViaje.getState().ruta === ruta ? linea?.tramo?.medio : null) ?? ruta?.tramos[0]?.medio;
  const activo = medio === 'carretera' && ['ferry', 'lancha', 'avioneta'].includes(veh) ? 'taxi' : veh;
  const via =
    medio === 'avioneta'
      ? 'cielo'
      : medio === 'ferry' || medio === 'lancha'
        ? 'mar'
        : veh === 'cayuco'
          ? 'rio'
          : ['bicitaxi', 'mototaxi'].includes(veh)
            ? 'ciudad'
            : 'carretera';
  const config = useMemo<DriveConfig>(
    () => ({ veh: activo, via, difficulty: 0.35, trip: true, seed: 504 }),
    [activo, via],
  );
  // MC-31: en un viaje compartido todos ven los mismos eventos (la semilla del chofer)
  const compartido = useViajeJuntos((s) => (s.fase === 'en-viaje' ? s.ruta : null));
  const rol = useViajeJuntos((s) => s.rol),
    gente = useViajeJuntos((s) => s.gente),
    yo = useGame((s) => s.profile.name);
  useLayoutEffect(() => {
    iniciarCamino(ruta, compartido ? (compartido.semilla % 19) + 1 : undefined);
    const radio = veh === 'taxi' ? 2 : veh === 'bus' ? 3 : 0;
    useViaje.setState({
      progress: 0,
      hits: 0,
      speed: 0,
      x: 0,
      radio,
      ruta,
      linea: ruta ? lineaDeViaje(ruta, 0) : null,
    });
    audio.music(RADIOS[radio].track);
  }, [veh, ruta]);
  return (
    <DrivingScene
      config={config}
      camino={<EscenaCamino />}
      clima={clima === 'lluvia' || clima === 'neblina' ? clima : undefined}
      onRoadStep={(s, dt) => pasoCamino(s, dt, veh)}
      remoto={leerAuto}
      encima={
        rol && (
          <Label
            pos={[0, 2.95, 1.2]}
            text={`🚌 ${[yo, ...gente.map((g) => g.nombre)].join(' · ')}`}
            h={0.36}
            bg="rgba(23,120,90,0.88)"
          />
        )
      }
      destination={dept?.name ?? to}
      biome={linea?.tramo?.paisaje ?? dept?.biome}
      tramo={linea?.tramo ?? undefined}
      onStep={(s, dt) => {
        enviarAuto(s);
        clock.current += dt;
        const track = RADIOS[useViaje.getState().radio].track;
        if (audio.track !== track) audio.music(track);
        if (!ruta) return;
        const linea = lineaDeViaje(ruta, s.elapsed);
        const progress = linea.posicion;
        if (clock.current > 0.12) {
          clock.current = 0;
          useViaje.setState({ linea, progress, hits: s.hits, x: s.x, speed: Math.round(s.speed * 3.6) });
        }
        if (progress >= 1 && !done.current) {
          done.current = true;
          useGame.getState().llegarViaje(Math.max(0, 30 - s.hits * 5));
        }
      }}
    />
  );
}
