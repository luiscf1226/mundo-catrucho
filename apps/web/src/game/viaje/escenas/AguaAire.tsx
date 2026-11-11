import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { Ball, Block, Ground, P, useTick } from '../../kit';

function RioAereo() {
  const vertices = useMemo(() => {
    const v: number[] = [];
    for (let i = 0; i < 40; i++) {
      const z = 60 - i * 14;
      const x = Math.sin(i * 0.38) * 38 - 12;
      const nx = Math.sin((i + 1) * 0.38) * 38 - 12;
      v.push(
        x - 5,
        -17.7,
        z,
        x + 5,
        -17.7,
        z,
        nx - 5,
        -17.7,
        z - 14,
        nx - 5,
        -17.7,
        z - 14,
        x + 5,
        -17.7,
        z,
        nx + 5,
        -17.7,
        z - 14,
      );
    }
    return new Float32Array(v);
  }, []);
  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
      </bufferGeometry>
      <meshBasicMaterial color="#48b6ba" />
    </mesh>
  );
}
export function Estela({ ancho, velocidad }: { ancho: number; velocidad: () => number }) {
  const espuma = useRef<Group>(null);
  useTick((_, t) => {
    if (!espuma.current) return;
    espuma.current.visible = velocidad() > 0.5;
    espuma.current.scale.set(1 + Math.sin(t * 4) * 0.06, 1, 1 + Math.sin(t * 3) * 0.08);
  });
  return (
    <group ref={espuma}>
      {[-1, 1].flatMap((side) =>
        [0, 1, 2].map((i) => (
          <Block
            key={`${side}-${i}`}
            pos={[side * (ancho + i * 0.6), 0.04, 3 + i * 3]}
            size={[0.4 + i * 0.18, 0.04, 5]}
            rot={side * 0.22}
            color={i % 2 ? '#94d8df' : '#e5f9ef'}
            mat="water"
            solid={false}
          />
        )),
      )}
    </group>
  );
}
export function AguaAire({ aire, rio, distance }: { aire: boolean; rio: boolean; distance: () => number }) {
  const olas = useRef<Group>(null);
  useTick((_, t) => {
    if (olas.current) {
      olas.current.position.y = aire ? 0 : Math.sin(t * 1.7) * 0.12;
      olas.current.position.z = distance() % (aire ? 24 : 15);
    }
  });
  return (
    <>
      <Ground size={1600} y={aire ? -18 : -0.1} mat={aire ? 'grass' : 'water'} color={aire ? '#427c50' : '#218fa9'} />
      {aire && (
        <>
          <RioAereo />
          <Ground size={[700, 1300]} pos={[410, 0, -300]} y={-17.8} mat="water" color="#239aaf" />
          <group>
            {Array.from({ length: 24 }, (_, i) => (
              <group
                key={i}
                position={[-110 + ((i * 47) % 210), -19, 30 - i * 17]}
                scale={[16 + (i % 4) * 3, 5 + (i % 3), 18]}
              >
                <Ball pos={[0, 0, 0]} r={1} color={i % 2 ? '#326b49' : '#538954'} mat="grass" />
              </group>
            ))}
          </group>
        </>
      )}
      <group ref={olas}>
        {Array.from({ length: aire ? 8 : 18 }, (_, i) =>
          aire ? (
            <group key={i} position={[(i % 2 ? -1 : 1) * (30 + i * 7), 4 + (i % 3), -60 - i * 25]} scale={[7, 1.4, 4]}>
              <Ball pos={[0, 0, 0]} r={1} color="#f4f7f3" mat="cloth" />
            </group>
          ) : (
            <Block
              key={i}
              pos={[((i % 3) - 1) * 18, 0, -i * 15]}
              size={[5, 0.08, 0.35]}
              color="#a8e5e3"
              mat="water"
              solid={false}
            />
          ),
        )}
      </group>
      {!aire &&
        [-1, 1].map((side) => (
          <group key={side} position={[side * (rio ? 32 : 110), -2, -85]} rotation-y={side * 0.18}>
            <group scale={[rio ? 22 : 45, 3, rio ? 240 : 60]}>
              <Ball pos={[0, 0, 0]} r={1} color="#d3c087" mat="sand" />
            </group>
            {[0, 1, 2, 3].map((i) => (
              <P.Palm key={i} pos={[Math.sin(i * 2) * 5, 2, 30 - i * 28]} scale={1.8} solid={false} />
            ))}
          </group>
        ))}
    </>
  );
}
