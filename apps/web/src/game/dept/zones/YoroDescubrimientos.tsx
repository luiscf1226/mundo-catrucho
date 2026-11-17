import { useRef, useState } from 'react';
import type { Group } from 'three';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Interactable, Label, useTick } from '../../kit';
import { reaccionLocura } from '../../reacciones';
import puntos from './yoro-puntos.json';

/** Las tres locuras de Yoro: una nube que da el pronóstico, un Jamo con la cola apurada y un tren con hipo. */
function Locura({ indice: i, altura }: { indice: number; altura: number }) {
  const p = puntos[i],
    [hecho, hacer] = useState(false),
    reloj = useRef(-1),
    peces = useRef<Group>(null),
    cola = useRef<Group>(null),
    cabeza = useRef<Group>(null),
    tren = useRef<Group>(null),
    pompas = useRef<(Group | null)[]>([]);
  useTick((dt, t) => {
    if (reloj.current >= 0) reloj.current += dt;
    const k = reloj.current < 0 ? 0 : Math.min(1, reloj.current / 2.5);
    // los peces bajan con sus paraguas, meciéndose
    if (peces.current) {
      peces.current.position.y = 2.6 - k * 1.6 + (k > 0 ? Math.sin(t * 3) * 0.08 : 0);
      peces.current.rotation.z = k > 0 ? Math.sin(t * 2) * 0.12 : 0;
    }
    // la cola dobla primero; la cabeza la alcanza después
    if (cola.current) cola.current.rotation.y = -Math.min(1, k * 2) * 1.4;
    if (cabeza.current) cabeza.current.rotation.y = -Math.max(0, k * 2 - 1) * 1.4;
    // el tren da saltitos de hipo y suelta pompas
    const hipo = k > 0 ? Math.max(0, Math.sin(t * 6)) ** 8 : 0;
    if (tren.current) tren.current.position.y = hipo * 0.18;
    pompas.current.forEach((b, j) => {
      if (!b) return;
      const f = k > 0 ? (t * 0.6 + j / 4) % 1 : 0;
      b.position.set(0.7 + Math.sin(j * 2 + t) * 0.2, 1.3 + f * 1.4, 0);
      b.scale.setScalar(k > 0 ? 0.4 + f * 0.8 : 0.001);
    });
  });
  function usar() {
    hacer(true);
    reloj.current = 0;
    reaccionLocura();
    useGame.getState().showDialog({ title: p.nombre, text: p.texto, icon: '✨' });
  }
  const pos: [number, number, number] = [p.pos[0], altura, p.pos[1]];
  return (
    <>
      <group position={pos}>
        <Cyl pos={[0, 0.05, 0]} r={1.5} h={0.1} color={hecho ? '#9bc693' : '#d7c59a'} mat="dirt" solid={false} />
        <Label pos={[0, 3.2, 0]} text={`✨ ${p.nombre}`} h={0.26} />
        {i === 0 && (
          <>
            {/* la nube presentadora con su pantallita */}
            {[-0.45, 0, 0.45].map((x) => (
              <Ball key={x} pos={[x, 2.4 + (x === 0 ? 0.15 : 0), -0.6]} r={x === 0 ? 0.45 : 0.35} color="#f8f9fa" />
            ))}
            <Ball pos={[-0.15, 2.5, -0.2]} r={0.05} color="#1d1d1f" />
            <Ball pos={[0.15, 2.5, -0.2]} r={0.05} color="#1d1d1f" />
            <Block pos={[0, 0.7, -0.7]} size={[1.4, 0.9, 0.08]} color="#264653" mat="plastic" solid={false} />
            <Label pos={[0, 0.75, -0.6]} text="🐟☂️ 100 %" h={0.22} />
            <group ref={peces}>
              {[-0.6, 0.6].map((x) => (
                <group key={x} position={[x, 0, 0.2]}>
                  <Cyl pos={[0, 0.45, 0]} r={0.35} rTop={0.02} h={0.25} color="#e63946" mat="cloth" solid={false} />
                  <Block pos={[0, 0.2, 0]} size={[0.02, 0.45, 0.02]} color="#3d3d3d" solid={false} />
                  <Ball pos={[0, -0.05, 0]} r={0.16} color="#b0c4de" />
                  <Block pos={[0.2, -0.05, 0]} size={[0.14, 0.14, 0.04]} rot={0.8} color="#8fb8d0" solid={false} />
                </group>
              ))}
            </group>
          </>
        )}
        {i === 1 && (
          <>
            {/* esquina de caseta y el Jamo de utilería: la cola gira primero */}
            <Block pos={[0.9, 0.6, -0.9]} size={[0.8, 1.2, 0.8]} color="#f4a261" mat="cloth" solid={false} />
            <group ref={cabeza} position={[-0.4, 0, 0.2]}>
              <Ball pos={[-0.5, 0.55, 0]} r={0.3} color="#3a7d44" />
              <Ball pos={[-0.7, 0.75, 0.15]} r={0.06} color="#ffffff" />
              <Cyl pos={[0, 0.5, 0]} r={0.22} h={0.8} color="#4c956c" mat="cloth" solid={false} />
            </group>
            <group ref={cola} position={[0.2, 0, 0.2]}>
              {[0, 1, 2, 3].map((j) => (
                <Ball key={j} pos={[0.25 + j * 0.3, 0.45 - j * 0.04, 0]} r={0.18 - j * 0.03} color="#5aa469" />
              ))}
            </group>
          </>
        )}
        {i === 2 && (
          <>
            {/* rieles y locomotora de maqueta */}
            {[-0.25, 0.25].map((z) => (
              <Block key={z} pos={[0, 0.14, z]} size={[2.4, 0.05, 0.05]} color="#6c757d" mat="metal" solid={false} />
            ))}
            <group ref={tren}>
              <Block pos={[-0.2, 0.55, 0]} size={[1.2, 0.6, 0.6]} color="#1d3557" mat="metal" solid={false} />
              <Cyl pos={[0.6, 0.55, 0]} r={0.28} h={0.7} color="#2b2d42" mat="metal" solid={false} />
              <Cyl pos={[0.7, 1.0, 0]} r={0.1} h={0.35} color="#3d3d3d" mat="metal" solid={false} />
              <Block pos={[-0.55, 1.0, 0]} size={[0.5, 0.35, 0.62]} color="#e63946" mat="metal" solid={false} />
              {[-0.5, 0.1, 0.6].map((x) => (
                <Cyl key={x} pos={[x, 0.25, 0.32]} r={0.16} h={0.06} color="#1d1d1f" mat="metal" solid={false} />
              ))}
            </group>
            {[0, 1, 2, 3].map((j) => (
              <group
                key={j}
                ref={(g) => {
                  pompas.current[j] = g;
                }}
              >
                <mesh>
                  <sphereGeometry args={[0.18, 10, 8]} />
                  <meshBasicMaterial color="#e0fbfc" transparent opacity={0.55} depthWrite={false} />
                </mesh>
              </group>
            ))}
          </>
        )}
      </group>
      <Interactable
        pos={pos}
        radius={1.8}
        label={i === 0 ? 'Oí el pronóstico' : i === 1 ? 'Mirá la esquina' : 'Asustá al tren'}
        icon="✨"
        onUse={usar}
      />
    </>
  );
}
export function YoroDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <Locura key={p.id} indice={i} altura={altura(p.pos[0], p.pos[1])} />
      ))}
    </>
  );
}
