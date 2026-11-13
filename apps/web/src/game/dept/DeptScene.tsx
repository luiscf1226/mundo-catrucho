// Escena de un departamento en exploración libre: escenario generado por datos + bus, vecino, recuerdo y monedas.
import { useEffect, useMemo } from 'react';
import { DEPARTMENTS, deptById } from '../../core/data';
import { DecoracionEventos } from '../eventos/Decoracion';
import { Spawn } from '../kit';
import { MuroMemes } from './muro';
import { Lugares } from './stations';
import { Turismo } from './turismo';
import { ZoneLife, ZoneScenery } from './zone';
import { zoneOf } from './zones';

export function DeptScene({ id }: { id: string }) {
  const d = deptById(id),
    spec = useMemo(() => zoneOf(d), [d]);
  // solo para pruebas automáticas: posiciones de los puntos de interés
  useEffect(() => {
    if (location.hash.includes('test'))
      ((window as any).__mcTest ??= {}).dept = {
        id,
        spawn: spec.spawn,
        npc: spec.npc.pos,
        gem: spec.gem.pos,
        bus: spec.bus.use,
        coins: spec.coins,
        pieces: spec.pcs.length,
        allFinds: () =>
          DEPARTMENTS.map((x) => {
            const f = zoneOf(x).finds ?? [];
            return { id: x.id, n: f.length, names: f.map((o) => o.name), ys: f.map((o) => o.pos[1]) };
          }),
      };
  }, [id, spec]);
  return (
    <>
      <Spawn pos={spec.spawn} yaw={spec.yaw} />
      <ZoneScenery spec={spec} />
      <DecoracionEventos dept={id} pos={spec.spawn} />
      <ZoneLife d={d} spec={spec} />
      <Lugares d={d} spec={spec} />
      <MuroMemes d={d} spec={spec} />
      <Turismo dept={id} spec={spec} />
    </>
  );
}
