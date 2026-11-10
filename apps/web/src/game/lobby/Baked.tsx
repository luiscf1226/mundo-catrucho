import { type ReactNode, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface Part {
  geo: THREE.BufferGeometry;
  material: THREE.Material;
}
/** Fusiona utilería inmóvil del kit, conservando sus materiales y colisiones originales. */
export function Baked({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null),
    [parts, setParts] = useState<Part[]>([]);
  useEffect(() => {
    const group = root.current;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    const materials = new Map<THREE.Material, THREE.BufferGeometry[]>();
    group.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh || !o.visible || Array.isArray(o.material))
        return;
      let geo = o.geometry.clone();
      if (geo.index) {
        const flat = geo.toNonIndexed();
        geo.dispose();
        geo = flat;
      }
      geo.applyMatrix4(o.matrixWorld);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (!geo.attributes.uv)
        geo.setAttribute(
          'uv',
          new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2),
        );
      const arr = materials.get(o.material) || [];
      arr.push(geo);
      materials.set(o.material, arr);
    });
    const built: Part[] = [];
    for (const [material, geos] of materials) {
      const geo = mergeGeometries(geos, false);
      if (geo) {
        built.push({ geo, material });
        geos.forEach((g) => g.dispose());
      }
    }
    setParts(built);
    group.visible = false;
    return () => built.forEach((p) => p.geo.dispose());
  }, []);
  return (
    <>
      <group ref={root}>{children}</group>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geo} material={p.material} receiveShadow />
      ))}
    </>
  );
}
