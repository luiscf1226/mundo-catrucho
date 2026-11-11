import { useRef } from 'react';
import type { Group } from 'three';
import { Ball, Block, Ground, P, useTick } from '../../kit';

export function AguaAire({ aire, rio, distance }: { aire: boolean; rio: boolean; distance: () => number }) {
  const olas = useRef<Group>(null);
  useTick((_, t) => {
    if (olas.current) {
      olas.current.position.y = Math.sin(t * 1.7) * 0.12;
      olas.current.position.z = distance() % (aire ? 24 : 15);
    }
  });
  return (
    <>
      <Ground size={380} y={aire ? -24 : -0.1} mat={aire ? 'grass' : 'water'} color={aire ? '#568f65' : '#218fa9'} />
      <group ref={olas}>
        {Array.from({ length: 18 }, (_, i) =>
          aire ? (
            <group
              key={i}
              position={[(i % 2 ? -1 : 1) * (14 + (i % 4) * 5), 4 + (i % 3), -20 - i * 12]}
              scale={[5, 1.4, 2.5]}
            >
              <Ball pos={[0, 0, 0]} r={1} color="#f4f7f3" mat="cloth" />
            </group>
          ) : (
            <Block
              key={i}
              pos={[((i % 3) - 1) * 9, 0, -i * 15]}
              size={[5, 0.08, 0.35]}
              color="#a8e5e3"
              mat="water"
              solid={false}
            />
          ),
        )}
      </group>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (rio ? 18 : 55), aire ? -24 : 0, -65]}>
          <Block pos={[0, -0.45, 0]} size={[rio ? 18 : 45, 1, 240]} color="#d3c087" mat="sand" solid={false} />
          {[0, 1, 2, 3].map((i) => (
            <P.Palm key={i} pos={[0, 0, -i * 35]} scale={1.8} solid={false} />
          ))}
        </group>
      ))}
    </>
  );
}
