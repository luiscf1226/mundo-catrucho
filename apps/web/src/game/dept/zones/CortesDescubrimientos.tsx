import { useRef, useState } from 'react';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label, useTick } from '../../kit';
import puntos from './cortes-puntos.json';

function Punto({ indice }: { indice: number }) {
  const p = puntos[indice];
  const [visto, descubrir] = useState(false);
  const cerca = useRef(false);
  const x = -40 + (indice % 6) * 15;
  const z = indice < 6 ? 9 : 24;
  const loco = indice >= 9;
  useTick(() => {
    if (useGame.getState().dialog || visto || cerca.current || Math.hypot(player.pos[0] - x, player.pos[2] - z) > 2.5)
      return;
    cerca.current = true;
    descubrir(true);
    useGame.getState().showDialog({ title: p.nombre, text: p.texto, icon: loco ? '✨' : '📍' });
  });
  return (
    <group position={[x, 0, z]}>
      <Cyl pos={[0, 0.04, 0]} r={2} h={0.08} mat="sand" color={visto ? '#91c786' : '#ffda75'} solid={false} />
      <Block pos={[0, 1, -1]} size={[0.12, 2, 0.12]} mat="wood" color="#795333" solid={false} />
      <Label pos={[0, 2.5, -1]} text={`${visto ? '✓' : loco ? '✨' : '📍'} ${p.nombre}`} h={0.32} />
      {indice === 9 && (
        <>
          <Block pos={[-0.6, 1, 0]} size={[0.7, 1.1, 0.3]} mat="glass" color="#ed8bac" solid={false} />
          <Block pos={[0.6, 1, 0]} size={[0.7, 1.1, 0.3]} mat="glass" color="#c5efce" solid={false} />
          <Label pos={[0, 1.9, 0]} text="¡Topogigio!   ¡Charamusca!" h={0.23} />
        </>
      )}
      {indice === 10 && (
        <>
          <Cyl pos={[0, 0.3, 0]} r={1.1} h={0.2} mat="plastic" color="#ffedbe" solid={false} />
          <Block pos={[0, 0.5, 0]} size={[1.7, 0.16, 0.7]} mat="water" color="#f2cf87" solid={false} />
          <Ball pos={[0, 0.8, 0]} r={0.3} mat="sand" color="#e4b641" />
        </>
      )}
      {indice === 11 && (
        <>
          <Block pos={[0, 0.7, 0]} size={[1.8, 1.1, 1]} mat="metal" color="#4cb5af" solid={false} />
          {[-1, 1].map((i) => (
            <Block
              key={i}
              pos={[i * 0.45, 1.5, 0]}
              size={[0.5, 0.1, 0.4]}
              rot={i * 0.4}
              mat="cloth"
              color="#f7e4b7"
              solid={false}
            />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <Ball
              key={i}
              pos={[-0.8 + i * 0.4, 1.9 + (i % 2) * 0.3, 0]}
              r={0.07}
              mat="cloth"
              color={i % 2 ? '#ffdc73' : '#ee78b5'}
            />
          ))}
        </>
      )}
    </group>
  );
}
export function CortesDescubrimientos() {
  return (
    <>
      {puntos.map((p, i) => (
        <Punto key={p.id} indice={i} />
      ))}
    </>
  );
}
