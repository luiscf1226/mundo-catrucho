import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { player } from '../../../../core/player';
import { Block, Label, P, Plate } from '../../../kit';
import { BORDE, CALLES } from './calles';

export interface Carro {
  eje: 'x' | 'z';
  linea: number;
  t: number;
  dir: 1 | -1;
  vel: number;
  color: string;
}
const COLORES = ['#e63946', '#f1faee', '#457b9d', '#2a9d8f', '#e9c46a', '#6d6875', '#ffffff', '#264653'];
export function crearTrafico(n: number, r: () => number, vel: number): Carro[] {
  return Array.from({ length: n }, (_, i) => ({
    eje: i % 2 ? 'x' : 'z',
    linea: CALLES[Math.floor(r() * CALLES.length)],
    t: -BORDE + r() * BORDE * 2,
    dir: r() < 0.5 ? 1 : -1,
    vel: vel * (0.8 + r() * 0.4),
    color: COLORES[i % COLORES.length],
  }));
}
/** posición [x, z] y rumbo de un carro; maneja por la derecha */
export function dondeCarro(c: Carro): [number, number, number] {
  if (c.eje === 'z') return [c.linea - 2.2 * c.dir, c.t, c.dir < 0 ? 0 : Math.PI];
  return [c.t, c.linea + 2.2 * c.dir, c.dir > 0 ? -Math.PI / 2 : Math.PI / 2];
}
export function moverTrafico(carros: Carro[], dt: number) {
  for (const c of carros) {
    c.t += c.vel * c.dir * dt;
    if (c.t > BORDE + 4) c.t = -BORDE - 4;
    if (c.t < -BORDE - 4) c.t = BORDE + 4;
  }
}
export function Trafico({ carros }: { carros: Carro[] }) {
  return (
    <>
      {carros.map((c, i) => {
        const [x, z, rot] = dondeCarro(c);
        return <P.Car key={i} pos={[x, 0, z]} rot={rot} color={c.color} solid={false} />;
      })}
    </>
  );
}

/** Flecha flotante sobre el jugador que apunta hacia el objetivo. */
export function Flecha({ hacia, color }: { hacia: [number, number] | null; color: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const grupo = g.current;
    if (!grupo) return;
    grupo.visible = !!hacia;
    if (!hacia) return;
    const [x, y, z] = player.pos;
    grupo.position.set(x, y + (player.vehicle ? 4.8 : 3.8), z);
    grupo.rotation.y = Math.atan2(-(hacia[0] - x), -(hacia[1] - z));
  });
  return (
    <group ref={g}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -0.5]}>
        <coneGeometry args={[0.55, 1.2, 4]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 0, 0.45]}>
        <boxGeometry args={[0.32, 0.18, 1]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

/** Columna de luz que marca dónde parar, con su rótulo. */
export function Marca({
  x,
  z,
  color,
  texto,
  r = 4,
}: {
  x: number;
  z: number;
  color: string;
  texto?: string;
  r?: number;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[r, r, 8, 24, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} side={2} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[r - 0.35, r, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {texto && <Label pos={[0, 9, 0]} text={texto} h={0.7} fg={color} />}
    </group>
  );
}

/** Rótulo que sigue al jugador (cuenta regresiva, carga, avisos). */
export function SobreJugador({ texto, alto, fg, bg }: { texto: string; alto: number; fg?: string; bg?: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const [x, y, z] = player.pos;
    g.current?.position.set(x, y + alto, z);
  });
  return (
    <group ref={g}>
      <Label pos={[0, 0, 0]} text={texto} h={0.5} fg={fg} bg={bg} />
    </group>
  );
}

/** Rótulo amarillo de TAXI en el techo del carro del jugador; gira con el carro. */
export function LuzTaxi({ turbo }: { turbo: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const grupo = g.current;
    if (!grupo) return;
    const [x, y, z] = player.pos;
    grupo.position.set(x, y, z);
    grupo.rotation.y = player.yaw;
    grupo.visible = !!player.vehicle;
  });
  return (
    <group ref={g}>
      <Block
        pos={[0, 2.12, -0.35]}
        size={[0.95, 0.34, 0.5]}
        color={turbo ? '#ff7b00' : '#ffd23c'}
        mat="neon"
        solid={false}
      />
      <Plate pos={[0, 2.12, -0.09]} text="TAXI" h={0.26} fg="#1b1b1b" bg="#ffd23c" />
      <Plate pos={[0, 2.12, -0.61]} rot={Math.PI} text="TAXI" h={0.26} fg="#1b1b1b" bg="#ffd23c" />
    </group>
  );
}

export interface Aviso {
  texto: string;
  t: number;
}
/** «+45» que sube sobre el jugador y se apaga en un segundo y medio. */
export function AvisoFlotante({ aviso, alto, fg = '#ffe066' }: { aviso: Aviso; alto: number; fg?: string }) {
  if (aviso.t <= 0) return null;
  return <SobreJugador texto={aviso.texto} alto={alto + (1.5 - aviso.t) * 0.8} fg={fg} />;
}
