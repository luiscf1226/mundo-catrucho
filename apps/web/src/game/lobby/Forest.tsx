import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGame } from '../../core/store';
import { art, P } from '../kit';
import type { FloraItem, FloraKind } from '../kit/art/types';
import { calidadEfectiva } from '../quality';
import { DEPTOS, deptAt, groundAt, rng } from './terrain';

interface Batch {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
}
/** Árboles del mapa: pinos en montaña y bosque, palmas en costa e islas, selva y matorral seco en el sur. */
export function Forest() {
  return art.Flora ? <FloraForest /> : <PropForest />;
}
function FloraForest() {
  const items = useMemo(() => {
    const out: FloraItem[] = [];
    const q = calidadEfectiva(useGame.getState().profile.settings);
    for (const d of DEPTOS) {
      const r = rng(d.i * 97 + 4);
      // en baja va la mitad del bosque
      const count = Math.round((d.biome === 'selva' ? 150 : d.biome === 'sur' ? 26 : 45) * (q === 'baja' ? 0.55 : 1));
      let n = 0;
      for (let j = 0; j < count * 4 && n < count; j++) {
        const x = d.box[0] + r() * (d.box[2] - d.box[0]),
          z = d.box[1] + r() * (d.box[3] - d.box[1]);
        if (
          deptAt(x, z) !== d.i ||
          Math.hypot(x - d.c[0], z - d.c[1]) < 7 ||
          Math.hypot((x + 92.5) / 5, (z + 16.8) / 8) < 1.2
        )
          continue;
        n++;
        const v = r(),
          k: FloraKind =
            d.biome === 'costa' || d.biome === 'isla'
              ? v < 0.6
                ? 'palm'
                : v < 0.8
                  ? 'tree'
                  : 'oilpalm'
              : d.biome === 'montana' || d.biome === 'bosque'
                ? v < 0.82
                  ? 'pine'
                  : 'tree'
                : d.biome === 'selva'
                  ? v < 0.45
                    ? 'jungle'
                    : v < 0.6
                      ? 'banana'
                      : v < 0.66
                        ? 'giant'
                        : 'tree'
                  : d.biome === 'sur'
                    ? v < 0.7
                      ? 'dry'
                      : 'tree'
                    : v < 0.7
                      ? 'tree'
                      : 'pine';
        const s = k === 'giant' ? 0.45 + r() * 0.2 : d.biome === 'selva' ? 0.9 + r() * 0.6 : 0.65 + r() * 0.6;
        out.push({
          k,
          p: [x, groundAt(x, z), z],
          s,
          c: d.biome === 'sur' ? '#8a9a3a' : d.biome === 'selva' ? '#2f7d3c' : undefined,
          seed: j,
        });
        // matas al pie de algunos árboles
        if (r() < 0.35) {
          const bx = x + (r() - 0.5) * 3,
            bz = z + (r() - 0.5) * 3;
          if (deptAt(bx, bz) === d.i)
            out.push({
              k: d.biome === 'selva' ? 'fern' : 'bush',
              p: [bx, groundAt(bx, bz), bz],
              s: 0.8 + r() * 0.5,
              seed: j + 7,
            });
        }
      }
    }
    return out;
  }, []);
  return art.Flora ? <art.Flora items={items} /> : null;
}
function PropForest() {
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
