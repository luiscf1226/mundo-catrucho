import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { P } from '../kit';
import { DEPTOS, deptAt, groundAt, rng } from './terrain';

interface Batch {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
}
export function Forest() {
  const root = useRef<THREE.Group>(null),
    [batches, setBatches] = useState<Batch[]>([]);
  useEffect(() => {
    const g = root.current;
    if (!g) return;
    g.updateWorldMatrix(true, true);
    const groups = new Map<string, Batch>();
    g.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
      const key = o.geometry.uuid + o.material.uuid;
      let b = groups.get(key);
      if (!b) {
        b = { geometry: o.geometry, material: o.material, matrices: [] };
        groups.set(key, b);
      }
      b.matrices.push(o.matrixWorld.clone());
    });
    setBatches([...groups.values()]);
  }, []);
  return (
    <>
      <group ref={root} visible={false}>
        {DEPTOS.flatMap((d) => {
          const r = rng(d.i * 97 + 4),
            trees = [];
          const count = d.biome === 'selva' ? 150 : d.biome === 'sur' ? 12 : 45;
          for (let j = 0; j < count * 4 && trees.length < count; j++) {
            const x = d.box[0] + r() * (d.box[2] - d.box[0]),
              z = d.box[1] + r() * (d.box[3] - d.box[1]);
            if (
              deptAt(x, z) !== d.i ||
              Math.hypot(x - d.c[0], z - d.c[1]) < 7 ||
              Math.hypot((x + 92.5) / 5, (z + 16.8) / 8) < 1.2
            )
              continue;
            const Tree =
              d.biome === 'costa' || d.biome === 'isla'
                ? P.Palm
                : d.biome === 'montana' || d.biome === 'bosque'
                  ? P.Pine
                  : P.Tree;
            trees.push(
              <Tree
                key={`${d.id}-${j}`}
                pos={[x, groundAt(x, z), z]}
                scale={d.biome === 'selva' ? 1.2 + r() : 0.7 + r() * 0.7}
                seed={j % 3}
                solid={false}
              />,
            );
          }
          return trees;
        })}
      </group>
      {batches.map((b, i) => (
        <instancedMesh
          key={i}
          args={[b.geometry, b.material, b.matrices.length]}
          ref={(m) => {
            if (m) {
              b.matrices.forEach((matrix, j) => m.setMatrixAt(j, matrix));
              m.instanceMatrix.needsUpdate = true;
            }
          }}
          receiveShadow
        />
      ))}
    </>
  );
}
