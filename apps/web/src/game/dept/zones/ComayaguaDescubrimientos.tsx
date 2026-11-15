import { useRef } from 'react';
import type * as THREE from 'three';
import { Block, Cyl, Label, P, Plate, useTick } from '../../kit';
import puntos from './comayagua-puntos.json';

/** Esténcil de práctica con bigotes que le pintó el viento, y el remolino con su pincel. */
function VientoConPincel() {
  const remolino = useRef<THREE.Group>(null);
  useTick((dt) => {
    if (remolino.current) remolino.current.rotation.y += dt * 2.4;
  });
  return (
    <>
      <Block pos={[0, 0.06, 0]} size={[2.4, 0.04, 1.6]} color="#f2e6cf" mat="cloth" solid={false} />
      {['#7b3fa0', '#f6c744', '#3d8b40', '#e63946'].map((c, i) => (
        <Block
          key={c}
          pos={[-0.75 + i * 0.5, 0.1, -0.2]}
          size={[0.42, 0.04, 0.6]}
          color={c}
          mat="sand"
          solid={false}
          cast={false}
        />
      ))}
      {[-1, 1].map((l) => (
        <group key={l} position={[l * 0.32, 0.14, 0.42]} rotation-y={l * 0.35}>
          <Block pos={[0, 0, 0]} size={[0.6, 0.03, 0.1]} color="#1d1d1f" mat="sand" solid={false} cast={false} />
        </group>
      ))}
      <group ref={remolino} position={[1.6, 0, 0.2]}>
        {[0, 1, 2].map((i) => (
          <group key={i} rotation-y={(i * Math.PI * 2) / 3}>
            <Block
              pos={[0.35, 0.7 + i * 0.35, 0]}
              size={[0.5, 0.05, 0.14]}
              color="#dff3ff"
              mat="cloth"
              solid={false}
              cast={false}
            />
          </group>
        ))}
        <group position={[0.3, 1.6, 0]} rotation-z={0.6}>
          <Cyl pos={[0, 0, 0]} r={0.035} h={0.8} color="#8a5a32" mat="wood" solid={false} cast={false} />
          <Cyl
            pos={[0, -0.45, 0]}
            r={0.07}
            rTop={0.03}
            h={0.18}
            color="#1d1d1f"
            mat="cloth"
            solid={false}
            cast={false}
          />
        </group>
      </group>
      <Plate pos={[0, 1.1, -0.85]} text="Esténcil de práctica" h={0.24} bg="#7a3b1f" />
    </>
  );
}
/** La réplica del reloj de taller que estira las agujas como brazos. */
function RelojConRecreo() {
  const brazos = useRef<THREE.Group>(null);
  useTick((_dt, t) => {
    const g = brazos.current;
    if (!g) return;
    g.children[0].rotation.z = 0.9 + Math.sin(t * 3) * 0.5;
    g.children[1].rotation.z = -0.9 - Math.sin(t * 3 + 1) * 0.5;
  });
  return (
    <>
      <Block pos={[0, 0.7, 0]} size={[0.9, 1.4, 0.5]} color="#8a5a32" mat="wood" solid={false} />
      <group position={[0, 1.9, 0.05]} rotation-x={Math.PI / 2}>
        <Cyl pos={[0, 0, 0]} r={0.55} h={0.1} color="#fffdf2" mat="plastic" solid={false} />
      </group>
      <group ref={brazos} position={[0, 1.9, 0.14]}>
        <group>
          <Block pos={[0, 0.5, 0]} size={[0.06, 1, 0.04]} color="#1d1d1f" mat="metal" solid={false} cast={false} />
        </group>
        <group>
          <Block pos={[0, 0.38, 0]} size={[0.08, 0.76, 0.04]} color="#1d1d1f" mat="metal" solid={false} cast={false} />
        </group>
      </group>
      <Label pos={[0, 3.2, 0]} text="¡Quiero recreo!" h={0.3} bg="#c0392b" />
      <Plate pos={[0, 0.9, 0.27]} text="Réplica de taller" h={0.16} bg="#5b3a24" />
    </>
  );
}
/** El eco chismoso: tres bocadillos que se agrandan cada vez que repiten el saludo. */
function CuevaChismosa() {
  const globos = useRef<THREE.Group>(null);
  useTick((_dt, t) => {
    const g = globos.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      c.position.y = 1.4 + i * 0.55 + Math.sin(t * 2 + i) * 0.12;
    });
  });
  return (
    <>
      <P.Rock pos={[-1, 0, -0.3]} scale={1.4} solid={false} />
      <P.Rock pos={[1, 0, -0.3]} scale={1.4} solid={false} />
      <Block pos={[0, 1.6, -0.3]} size={[2.6, 0.5, 1]} color="#6e6258" mat="stone" solid={false} />
      <Block pos={[0, 0.7, -0.35]} size={[1.1, 1.3, 0.2]} color="#1d1a18" mat="stone" solid={false} cast={false} />
      <group ref={globos} position={[0, 0, 0.5]}>
        {[0.26, 0.34, 0.44].map((h, i) => (
          <group key={h} position={[(i - 1) * 0.7, 1.4 + i * 0.55, 0]}>
            <Label pos={[0, 0, 0]} text="💬 ¡hola!" h={h} />
          </group>
        ))}
      </group>
    </>
  );
}
function Punto({ indice }: { indice: number }) {
  const p = puntos[indice];
  const loco = p.id.includes('locura');

  return (
    <group position={[p.x, 0, p.z]}>
      <Cyl pos={[0, 0.04, 0]} r={2} h={0.08} mat="sand" color="#ffda75" solid={false} />
      <Block pos={[0, 1, -1]} size={[0.12, 2, 0.12]} mat="wood" color="#795333" solid={false} />
      <Label pos={[0, 2.5, -1]} text={`${loco ? '✨' : '📍'} ${p.nombre}`} h={0.32} />
      {p.id === 'comayagua.locura-1' && (
        <group position={[0, 0, 0.5]}>
          <VientoConPincel />
        </group>
      )}
      {p.id === 'comayagua.locura-2' && (
        <group position={[0.9, 0, 0.3]}>
          <RelojConRecreo />
        </group>
      )}
      {p.id === 'comayagua.locura-3' && (
        <group position={[0, 0, -0.2]}>
          <CuevaChismosa />
        </group>
      )}
    </group>
  );
}
/** Los lugares y locuras de Comayagua: se descubren al caminar cerca, alrededor de la plaza. */
export function ComayaguaDescubrimientos() {
  return <>{puntos.map((p, i) => p.id.includes('locura') && <Punto key={p.id} indice={i} />)}</>;
}
