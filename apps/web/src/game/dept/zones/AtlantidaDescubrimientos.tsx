import { useRef } from 'react';
import type * as THREE from 'three';
import { player } from '../../../core/player';
import { Ball, Block, Cyl, Label, Plate, useTick } from '../../kit';
import { useLocuraCerca } from '../../reacciones';
import puntos from './atlantida-puntos.json';

const CARN = ['#e63946', '#ffd166', '#19b5c8', '#7b2cbf', '#2ea44f'];
/** Una cajita que se abre y despliega una carroza de fantasía dentro de su espacio marcado. */
function CarrozaDeBolsillo() {
  const carroza = useRef<THREE.Group>(null);
  const tapa = useRef<THREE.Group>(null);
  useTick((_dt, t) => {
    const k = Math.min(1, Math.max(0, Math.sin(t * 0.7) * 1.4 + 0.4));
    if (carroza.current) carroza.current.scale.setScalar(0.05 + k * 0.95);
    if (tapa.current) tapa.current.rotation.x = -k * 1.9;
  });
  return (
    <>
      {[-1, 1].map((l) => (
        <Block key={l} pos={[l * 1.6, 0.03, 0]} size={[0.08, 0.04, 2.4]} color="#ffffff" mat="plastic" solid={false} />
      ))}
      <Block pos={[0, 0.25, 1.4]} size={[0.6, 0.5, 0.6]} color="#c9a66b" mat="wood" solid={false} />
      <group ref={tapa} position={[0, 0.5, 1.1]}>
        <Block pos={[0, 0, 0.3]} size={[0.62, 0.05, 0.62]} color="#a7794a" mat="wood" solid={false} />
      </group>
      <group ref={carroza} position={[0, 0, 0]}>
        <Block pos={[0, 0.45, 0]} size={[2.6, 0.5, 1.8]} color="#7b2cbf" mat="plastic" solid={false} />
        {CARN.map((c, i) => (
          <Block
            key={c}
            pos={[-1 + i * 0.5, 1, 0]}
            size={[0.35, 0.6 + (i % 2) * 0.4, 0.35]}
            color={c}
            mat="cloth"
            solid={false}
          />
        ))}
        <Cyl pos={[0, 1.7, 0]} r={0.06} h={1.6} color="#e0e0e0" mat="metal" solid={false} />
        <Block pos={[0.35, 2.3, 0]} size={[0.6, 0.4, 0.04]} color="#ffd166" mat="cloth" solid={false} />
      </group>
      <Plate pos={[0, 2.9, -0.6]} text="Espacio reservado" h={0.22} bg="#7b2cbf" />
    </>
  );
}
/** Icono de manatí: al acercarte, tu muñeco se sienta a esperar en silencio. */
function ManatiConPausa({ x, z }: { x: number; z: number }) {
  const listo = useRef(false);
  useTick(() => {
    const cerca = Math.hypot(player.pos[0] - x, player.pos[2] - z) < 2.6;
    if (cerca && !listo.current) {
      listo.current = true;
      player.play('sit', 2.5);
    } else if (!cerca && Math.hypot(player.pos[0] - x, player.pos[2] - z) > 5) listo.current = false;
  });
  return (
    <>
      <Cyl pos={[0, 0.9, 0]} r={0.06} h={1.8} color="#3a3a3a" mat="metal" solid={false} />
      <group position={[0, 2.2, 0]} rotation-x={Math.PI / 2}>
        <Cyl pos={[0, 0, 0]} r={0.7} h={0.08} color="#5aa9b5" mat="plastic" solid={false} />
      </group>
      {/* el icono: cuerpo redondo, cola de paleta y un ojito, sobre el letrero */}
      <group position={[0, 2.2, 0.06]}>
        <group scale={[1.25, 0.6, 0.25]}>
          <Ball pos={[0, 0, 0]} r={0.36} color="#6c7a7d" cast={false} />
        </group>
        <group position={[-0.52, 0, 0]} scale={[0.5, 0.7, 0.2]}>
          <Ball pos={[0, 0, 0]} r={0.3} color="#5b686b" cast={false} />
        </group>
        <Ball pos={[0.3, 0.06, 0.08]} r={0.04} color="#1b1b1f" cast={false} />
      </group>
      <Plate pos={[0, 3.1, 0]} text="🤫 Esperá en silencio" h={0.3} bg="#1d6f7a" />
    </>
  );
}
/** Plantas de cartón que hacen la ola cuando pasás cerca. */
function BambuConSaludo({ x, z }: { x: number; z: number }) {
  const tallos = useRef<(THREE.Group | null)[]>([]);
  const ola = useRef(0);
  useTick((dt, t) => {
    const cerca = Math.hypot(player.pos[0] - x, player.pos[2] - z) < 6;
    ola.current = Math.max(0, Math.min(1, ola.current + (cerca ? dt * 2 : -dt)));
    tallos.current.forEach((g, i) => {
      if (g) g.rotation.z = Math.sin(t * 5 - i * 0.9) * 0.35 * ola.current;
    });
  });
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <group
          key={i}
          ref={(g) => {
            tallos.current[i] = g;
          }}
          position={[-1.6 + i * 0.8, 0, -0.2]}
        >
          <Block pos={[0, 1.1, 0]} size={[0.14, 2.2, 0.04]} color="#9cbf6b" mat="cloth" solid={false} />
          <Block pos={[0.2, 1.8, 0]} size={[0.5, 0.14, 0.03]} color="#6a994e" mat="cloth" solid={false} />
          <Block pos={[-0.2, 1.3, 0]} size={[0.5, 0.14, 0.03]} color="#6a994e" mat="cloth" solid={false} />
        </group>
      ))}
      <Plate pos={[0, 2.8, -0.2]} text="Cartón · no es de la colección" h={0.2} bg="#386641" />
    </>
  );
}
function Punto({ indice, y }: { indice: number; y: number }) {
  const p = puntos[indice];
  const loco = p.id.includes('locura');
  useLocuraCerca(p.x, p.z);

  return (
    <group position={[p.x, y, p.z]}>
      <Cyl pos={[0, 0.04, 0]} r={2} h={0.08} mat="sand" color="#ffda75" solid={false} />
      <Block pos={[0, 1, -1]} size={[0.12, 2, 0.12]} mat="wood" color="#795333" solid={false} />
      <Label pos={[0, 2.5, -1]} text={`${loco ? '✨' : '📍'} ${p.nombre}`} h={0.32} />
      {p.id === 'atlantida.locura-1' && (
        <group position={[0, 0, -2.6]}>
          <CarrozaDeBolsillo />
        </group>
      )}
      {p.id === 'atlantida.locura-2' && (
        <group position={[1.4, 0, -1.6]}>
          <ManatiConPausa x={p.x} z={p.z} />
        </group>
      )}
      {p.id === 'atlantida.locura-3' && (
        <group position={[0, 0, -2.4]}>
          <BambuConSaludo x={p.x} z={p.z} />
        </group>
      )}
    </group>
  );
}
/** Los lugares y locuras de Atlántida: se descubren al caminar cerca. `altura` es el suelo de la zona. */
export function AtlantidaDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map(
        (p, i) => p.id.includes('locura') && <Punto key={p.id} indice={i} y={Math.max(0, altura(p.x, p.z))} />,
      )}
    </>
  );
}
