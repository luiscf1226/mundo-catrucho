import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { art, Block } from '../kit';
import { DEPTOS } from './terrain';
export function MapBoard() {
  const geos = useMemo(
    () =>
      DEPTOS.map(
        (d) =>
          new THREE.ShapeGeometry(
            d.rings.map(
              (r) => new THREE.Shape(r.map(([x, z]) => new THREE.Vector2((x / 340) * 5.6, (-z / 340) * 5.6))),
            ),
          ),
      ),
    [],
  );
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  return (
    <group position={[-77, 4.7, 122]}>
      <Block pos={[0, 0, -0.1]} size={[6.2, 4, 0.2]} color="#287c97" mat="metal" solid={false} />
      {DEPTOS.map((d, i) => (
        <mesh key={d.id} geometry={geos[i]} material={art.material('plastic', d.color)} position={[0, 0, 0.02]} />
      ))}
    </group>
  );
}
