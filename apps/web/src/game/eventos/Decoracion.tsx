import type { V3 } from '../../core/types';
import { Ball, Block, Label, P } from '../kit';
import { eventosEn } from './calendario';
import { useFecha } from './fecha';

export function DecoracionEventos({ dept, pos }: { dept: string | null; pos: V3 }) {
  const eventos = eventosEn(useFecha(), dept);
  return eventos.map((e, i) => (
    <group key={e.id} name={`evento-${e.id}`}>
      <Label pos={[pos[0] + i * 11, pos[1] + 4.8, pos[2] - 9]} text={e.nombre} h={0.65} fg="#fff8dc" bg="#163c46" />
      <group position={[pos[0] + i * 11, pos[1], pos[2] - 9]}>
        <P.Flag pos={[-3, 0, 0]} height={4} solid={false} />
        {e.estilo === 'feria' ? (
          <P.Stall
            pos={[1, 0, 0]}
            sign={e.id === 'maiz' ? '¡Elotes y montucas!' : '¡Vení a la feria!'}
            color={e.color}
            solid={false}
          />
        ) : e.estilo === 'alfombra' ? (
          <>
            <Block pos={[1, 0.025, 0]} size={[4, 0.04, 6]} color={e.color} mat="cloth" solid={false} />
            {[-2, 0, 2].map((z) => (
              <Block key={z} pos={[1, 0.06, z]} size={[2.6, 0.03, 0.7]} color="#f6d55c" mat="cloth" solid={false} />
            ))}
          </>
        ) : (
          <P.Flag pos={[3, 0, 0]} height={4} solid={false} />
        )}
        {[-3, -1.5, 0, 1.5, 3].map((x, j) => (
          <Ball
            key={x}
            pos={[x, 3.5 + Math.abs(x) * 0.15, 0]}
            r={0.18}
            color={j % 2 ? '#fff3bb' : e.color}
            mat="neon"
          />
        ))}
      </group>
    </group>
  ));
}
