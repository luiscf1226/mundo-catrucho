import { useMemo, useRef } from 'react';
import { useGame } from '../../core/store';
import { Ball, Label } from '../kit';
import { DrivingScene } from '../viaje/DrivingScene';
import { type DriveConfig, type DriveState, roadKind, vehicleKind } from '../viaje/model';
import { finish, type Guia, partida, setHud, starsFor } from './api';
export const guia: Guia = {
  goal: 'Orillate a la derecha, frená en las paradas y llegá sin choques.',
  keys: [
    ['A / D', 'girar'],
    ['W / S', 'acelerar / frenar'],
    ['F / clic', 'claxon: abrí paso'],
  ],
  touch: [
    ['Palanca', 'girar, acelerar y frenar'],
    ['🎯', 'claxon'],
  ],
  metas: () => ['120 pts', '240 pts', '360 pts'],
};
/** la nube tapa el retrovisor: las cámaras laterales avisan qué va al lado del rapidito */
function camaras(s: DriveState) {
  const lado = (signo: number) => {
    const cerca = s.traffic
      .filter((t) => !t.hit && Math.abs(t.z) < 16 && (t.x - s.x) * signo > 1.2)
      .sort((a, b) => Math.abs(a.z) - Math.abs(b.z))[0];
    return cerca ? `${cerca.kind} a ${Math.round(Math.abs(cerca.z))} m` : 'libre';
  };
  return `📹 Izq: ${lado(-1)} · Der: ${lado(1)} · el retrovisor solo ve nube`;
}
export function Manejo() {
  const P = useMemo(partida, []),
    done = useRef(false),
    hud = useRef(0),
    phrase = useRef(0);
  const via = roadKind(P.tema.via);
  const config = useMemo<DriveConfig>(
    () => ({
      veh:
        via === 'mar' || via === 'rio'
          ? P.tema.veh === 'cayuco'
            ? 'cayuco'
            : 'lancha'
          : vehicleKind(P.tema.veh ?? 'rapidito'),
      via,
      difficulty: P.dif,
      trip: false,
      seed: P.seed,
    }),
    [P, via],
  );
  const cargo = Array.isArray(P.tema.recoge) && typeof P.tema.recoge[0] === 'string' ? P.tema.recoge[0] : 'pasajeros';
  const destino = typeof P.tema.destino === 'string' ? P.tema.destino : 'La terminal';
  /** «¡Va vacío, cabe una nube!»: la nube viaja encima y tapa el retrovisor; manejás con cámaras laterales */
  const nube = P.tema.variante === 'va-vacio--cabe-una-nube';
  const gotitas = useRef(0),
    descargas = useRef(0);
  return (
    <DrivingScene
      config={config}
      destination={destino}
      biome={P.dept?.biome}
      cargo={cargo}
      modo={P.modo}
      clima={nube ? 'neblina' : undefined}
      encima={
        nube ? (
          <group position={[0, 3.2, 0.4]}>
            {[-0.9, -0.3, 0.3, 0.9].map((x, i) => (
              <Ball key={x} pos={[x, i % 2 ? 0.25 : 0, 0]} r={0.65} color="#f4f8fb" mat="cloth" />
            ))}
            <Label pos={[0, 1.2, 0]} text="☁️ La nube también paga" h={0.32} />
          </group>
        ) : undefined
      }
      onStep={(s, dt) => {
        hud.current += dt;
        phrase.current += dt;
        const limit = 95 - P.dif * 15,
          target = 850 + P.dif * 180,
          choque = Math.round(15 + 20 * P.dif); // en la última etapa cada choque pesa más
        const next = s.stops.find((a) => !a.taken && a.distance > s.distance - 13);
        const score = Math.max(0, s.collected * 120 + (s.distance >= target ? 120 : 0) - s.hits * choque);
        if (nube && s.collected > descargas.current) {
          // en cada parada la nube descarga y el cobrador de cartón cuenta sus gotitas
          descargas.current = s.collected;
          gotitas.current += 7 + s.collected * 3;
          useGame.getState().toast(`Parada de descarga: el cobrador contó ${gotitas.current} gotitas`, '💧');
        }
        if (hud.current > 0.15) {
          hud.current = 0;
          setHud({
            timer: Math.max(0, limit - s.elapsed),
            score: `${score} pts · ${s.collected}/3`,
            objective: next
              ? `Recogé ${cargo} · parada a ${Math.max(0, Math.round(next.distance - s.distance))} m`
              : `Llegá a ${destino}`,
            lines: [
              ...(nube ? [camaras(s)] : []),
              `${Math.round(s.speed * 3.6)} km/h · ${s.hits} choques · ${Math.round(s.distance)}/${target} m`,
              `Orillate a la derecha + S / palanca abajo. Frená hasta recoger.`,
              `Carril ${s.x.toFixed(1)} · Etapa ${P.etapa + 1}/${P.etapas}`,
            ],
          });
        }
        if (phrase.current > 18 && Array.isArray(P.tema.frases)) {
          phrase.current = 0;
          const f = P.tema.frases[Math.floor(s.elapsed / 18) % P.tema.frases.length];
          if (typeof f === 'string') useGame.getState().toast(f, '📣');
        }
        if (!done.current && ((s.distance >= target && s.elapsed >= 60) || s.elapsed >= limit)) {
          done.current = true;
          const won = s.distance >= target && s.collected >= 1 && score >= 120;
          finish({
            won,
            stars: won ? starsFor(score, 120, 240, 360) : 0,
            score,
            label: `${score} pts`,
            stats: { recogidos: s.collected, choques: s.hits, ...(nube ? { gotitas: gotitas.current } : {}) },
          });
        }
      }}
    />
  );
}
