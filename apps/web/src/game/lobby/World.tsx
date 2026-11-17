import { useMemo } from 'react';
import * as THREE from 'three';
import { art, Ground, Label, Plate } from '../kit';
import { Kit, Static } from './static';
import { DEPTOS, groundAt, mapPoint } from './terrain';

function Region({ points }: { points: number[][] }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z))),
      g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.19, 0);
    return g;
  }, [points]);
  return <mesh geometry={geo} material={art.material('sand', '#b6b499')} receiveShadow />;
}
function WaterLabel({
  text,
  x,
  z,
  h = 4,
  land = false,
}: {
  text: string;
  x: number;
  z: number;
  h?: number;
  land?: boolean;
}) {
  return (
    <group position={[x, 0.23, z]} rotation-x={-Math.PI / 2}>
      <Plate pos={[0, 0, 0]} text={text} h={h} bg="rgba(0,0,0,0)" fg={land ? '#405a50' : '#e3f6ef'} />
    </group>
  );
}
export function World() {
  const kit = useMemo(() => {
    const k = new Kit();
    // El paseo rodea el mapa y conecta con la plaza de llegada.
    k.flat([0, 0.16, 129], [390, 0.14, 24], '#d4c398', 'stone');
    k.flat([-185, 0.16, 0], [18, 0.14, 250], '#d4c398', 'stone');
    k.flat([185, 0.16, 0], [18, 0.14, 250], '#d4c398', 'stone');
    k.flat([0, 0.16, -115], [390, 0.14, 16], '#d4c398', 'stone');
    k.flat([-49, 0.17, 108], [65, 0.15, 30], '#d4c398', 'stone');
    k.flat([-48, 0.17, 113], [62, 0.18, 9], '#5d6265', 'asphalt');
    for (let x = -77; x < -21; x += 7) k.flat([x, 0.28, 113], [3, 0.03, 0.18], '#f6e5b1', 'concrete');
    for (const d of DEPTOS) {
      if (d.biome === 'valle' || d.biome === 'sur') {
        for (let j = 0; j < 6; j++) {
          const x = d.c[0] + 10 + j * 0.7,
            z = d.c[1];
          if (x > d.box[2] - 2) continue;
          k.flat([x, groundAt(x, z) + 0.05, z], [0.32, 0.1, 6], d.biome === 'sur' ? '#b18e43' : '#dae089', 'grass');
        }
      }
    }
    for (const d of DEPTOS.filter((d) => d.biome === 'valle')) {
      const x = d.c[0] + 11,
        z = d.c[1] + 9,
        y = groundAt(x, z);
      if (x > d.box[2] - 6) continue;
      for (const side of [-1, 1]) {
        k.deco([x + side * 4, y + 0.7, z], [0.12, 0.15, 8], '#c4aa78', 'wood');
        k.deco([x, y + 0.7, z + side * 4], [8, 0.15, 0.12], '#c4aa78', 'wood');
      }
      for (const dx of [-1.5, 1.5]) {
        k.ball([x + dx, y + 0.6, z], 0.6, '#e7d9b9', 'cloth', [1.2, 0.65, 0.6]);
        k.ball([x + dx + 0.6, y + 0.9, z], 0.3, '#78553b', 'cloth');
        for (const leg of [-0.3, 0.3]) k.deco([x + dx + leg, y + 0.25, z], [0.12, 0.5, 0.12], '#78553b', 'wood');
      }
    }
    // Agua de Yojoa y Río Plátano, en miniatura, fuera de los portales.
    const [lx, lz] = mapPoint(228, 250);
    k.flat([lx, 0.23, lz], [8, 0.12, 13], '#409ba9', 'water');
    for (let j = 0; j < 14; j++) {
      const x = 74 + Math.sin(j * 0.6) * 4,
        z = -47 + j * 3;
      k.flat([x, groundAt(x, z) + 0.06, z], [2.6, 0.1, 4], '#4cb4be', 'water');
    }
    for (let j = 0; j < 20; j++) {
      const x = -173 + j * 18;
      k.deco([x, 0.7, 144], [1, 1, 1], '#a07c50', 'stone');
    }
    return k;
  }, []);
  return (
    <>
      <Ground size={[400, 285]} pos={[0, 0, 10]} y={0.1} color="#328fa5" mat="water" />
      <Region
        points={[
          [-180, -59],
          [-161, -59],
          [-142, 0],
          [-153, 28],
          [-180, 55],
        ]}
      />
      <Region
        points={[
          [-153, 28],
          [-116, 32],
          [-66, 70],
          [-40, 101],
          [-155, 102],
        ]}
      />
      <Region
        points={[
          [-32, 94],
          [15, 34],
          [63, 1],
          [110, 9],
          [170, 15],
          [177, 104],
          [10, 104],
        ]}
      />
      <Static kit={kit} />
      <WaterLabel text="MAR CARIBE" x={57} z={-91} h={5} />
      <WaterLabel text="GOLFO DE FONSECA" x={-94} z={88} h={2.2} />
      <WaterLabel text="GUATEMALA" x={-164} z={-12} h={3} land />
      <WaterLabel text="EL SALVADOR" x={-122} z={64} h={3} land />
      <WaterLabel text="NICARAGUA" x={82} z={75} h={4} land />
      <Label pos={[-49, 14, 103]} text="MUNDO CATRUCHO" h={2.5} bg="#164c49" />
      <Label pos={[-49, 11, 103]} text="Caminá Honduras · elegí tu departamento" h={1} />
      <Label pos={[65, 5, 136]} text="Paseo Honduras · conocé lo nuestro" h={1.4} />
    </>
  );
}
