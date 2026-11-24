import { useRef } from 'react';
import type { Group } from 'three';
import { Ball, Block, Cyl, Label, useTick } from '../../kit';
import { useLocuraCerca } from '../../reacciones';
import puntos from './olancho-puntos.json';

/** Las tres locuras de Olancho: el pastel y su machete de goma, el tapado con techo y los cristales de Talgua. */
function Locura({ indice: i, altura }: { indice: number; altura: number }) {
  const p = puntos[i],
    [x, z] = p.pos,
    g = useRef<Group>(null);
  useLocuraCerca(x, z, undefined, { title: p.nombre, text: p.texto });
  useTick((_dt, t) => {
    if (!g.current) return;
    if (i === 0) g.current.rotation.z = -0.4 + Math.abs(Math.sin(t * 1.5)) * 0.9;
    if (i === 1) g.current.rotation.x = -0.2 - Math.abs(Math.sin(t * 0.9)) * 0.9;
    if (i === 2) g.current.rotation.y = t * 0.6;
  });
  return (
    <group position={[x, altura, z]}>
      <Cyl pos={[0, 0.04, 0]} r={1.6} h={0.08} color="#e2c27e" mat="sand" solid={false} />
      <Label pos={[0, 2.6, 0]} text={`✨ ${p.nombre}`} h={0.26} />
      {i === 0 && (
        <>
          <Block pos={[0, 0.4, 0]} size={[1.2, 0.8, 0.8]} color="#8a6a48" mat="wood" solid={false} />
          <Cyl pos={[0, 0.95, 0]} r={0.45} h={0.3} color="#f6e7c8" mat="cloth" solid={false} />
          <Ball pos={[0, 1.15, 0]} r={0.08} color="#e0475b" />
          <group ref={g} position={[0.75, 1.2, 0]}>
            <Block pos={[0, 0.55, 0]} size={[0.12, 1.1, 0.03]} color="#5fbf6a" mat="plastic" solid={false} />
            <Block pos={[0, -0.05, 0]} size={[0.14, 0.3, 0.1]} color="#3a2c22" mat="wood" solid={false} />
          </group>
        </>
      )}
      {i === 1 && (
        <>
          <Cyl pos={[0, 0.45, 0]} r={0.5} rTop={0.55} h={0.7} color="#6b4a35" mat="stone" solid={false} />
          {[-1, 0, 1].map((k) => (
            <Ball key={k} pos={[k * 0.22, 0.85, 0]} r={0.13} color={['#e8a03b', '#7fb04a', '#d9c37a'][k + 1]} />
          ))}
          <group ref={g} position={[0, 0.82, -0.5]}>
            <Block pos={[0, 0.04, 0.5]} size={[1.25, 0.08, 1.1]} color="#a3402c" mat="wood" solid={false} />
          </group>
        </>
      )}
      {i === 2 && (
        <>
          <Block pos={[0, 0.3, 0]} size={[1.2, 0.6, 1.2]} color="#a8a294" mat="stone" solid={false} />
          <group ref={g} position={[0, 0.6, 0]}>
            {[0, 1, 2, 3, 4].map((k) => (
              <Block
                key={k}
                pos={[Math.cos(k * 1.26) * 0.35, 0.25 + (k % 2) * 0.15, Math.sin(k * 1.26) * 0.35]}
                size={[0.12, 0.5 + (k % 3) * 0.15, 0.12]}
                color="#cfefff"
                mat="glass"
                solid={false}
              />
            ))}
          </group>
        </>
      )}
    </group>
  );
}
export function OlanchoDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <Locura key={p.id} indice={i} altura={altura(p.pos[0], p.pos[1])} />
      ))}
    </>
  );
}
