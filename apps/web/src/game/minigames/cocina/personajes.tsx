// Personajes del puesto: el perro flaco «aguacatero» y la doña gordita del delantal. Piezas del kit, con vida propia.
import { useRef } from 'react';
import * as THREE from 'three';
import { Ball, Block, Cyl, Label, useTick } from '../../kit';

const S = { solid: false, cast: false } as const;

export interface PerroS { x: number; z: number; yaw: number; modo: 'espera' | 'corre' | 'come' | 'vuelve'; t: number; tx: number; tz: number; hx: number; hz: number; sit: number }
export const nuevoPerro = (x: number, z: number): PerroS => ({ x, z, yaw: Math.PI * 0.8, modo: 'espera', t: 2, tx: x, tz: z, hx: x, hz: z, sit: 0 });

/** Perro callejero: flaco, costillas a la vista, cola que no para. Mira a −Z en su propio sistema. */
export function Perro({ d }: { d: PerroS }) {
  const g = useRef<THREE.Group>(null), cola = useRef<THREE.Group>(null), cabeza = useRef<THREE.Group>(null), cuerpo = useRef<THREE.Group>(null), pat = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  useTick((dt, t) => {
    // comportamiento
    let v = 0;
    if (d.modo === 'espera') { d.t -= dt; d.sit = Math.min(1, d.sit + dt * 2); if (d.t <= 0) { d.t = 5 + Math.random() * 5; d.tx = d.hx + (Math.random() - 0.5) * 1.6; d.tz = d.hz + (Math.random() - 0.5) * 1.2; d.modo = 'vuelve'; } }
    if (d.modo === 'corre' || d.modo === 'vuelve') {
      d.sit = Math.max(0, d.sit - dt * 4);
      const dx = d.tx - d.x, dz = d.tz - d.z, dd = Math.hypot(dx, dz), sp = d.modo === 'corre' ? 6 : 1.6;
      if (dd > 0.12) { const m = Math.min(dd, sp * dt); d.x += dx / dd * m; d.z += dz / dd * m; d.yaw = Math.atan2(-dx, -dz); v = d.modo === 'corre' ? 1 : 0.4; }
      else if (d.modo === 'corre') { d.modo = 'come'; d.t = 1.3; } else { d.modo = 'espera'; d.t = 4; }
    }
    if (d.modo === 'come') { d.t -= dt; if (d.t <= 0) { d.modo = 'vuelve'; d.tx = d.hx; d.tz = d.hz; } }
    const o = g.current; if (!o) return;
    o.position.set(d.x, Math.abs(Math.sin(t * 14)) * 0.05 * v, d.z); o.rotation.y = d.yaw;
    pat.forEach((p, i) => { if (p.current) p.current.rotation.x = Math.sin(t * 14 + (i % 2 ? Math.PI : 0)) * 0.7 * v; });
    if (cola.current) cola.current.rotation.y = Math.sin(t * (d.modo === 'espera' ? 7 : 16)) * (d.modo === 'come' ? 0.9 : 0.5);
    if (cabeza.current) cabeza.current.rotation.x = d.modo === 'come' ? 0.7 + Math.sin(t * 12) * 0.1 : d.modo === 'espera' ? -0.1 + Math.sin(t * 1.5) * 0.12 : 0.05;
    if (cuerpo.current) cuerpo.current.position.y = -0.2 * d.sit * 0.5; // se sienta un poco
  });
  const pelo = '#c79a5a', oscuro = '#8d6a3a';
  return (
    <group ref={g}>
      <group ref={cuerpo}>
        <Block pos={[0, 0.52, 0.05]} size={[0.24, 0.24, 0.62]} color={pelo} mat="cloth" {...S} />
        <Block pos={[0, 0.5, 0.34]} size={[0.26, 0.26, 0.24]} color={pelo} mat="cloth" {...S} />
        {[-0.14, -0.02, 0.1].map(z => <Block key={z} pos={[0, 0.5, z]} size={[0.255, 0.035, 0.05]} color={oscuro} {...S} />)}
        <Block pos={[0, 0.7, -0.3]} size={[0.14, 0.22, 0.14]} color={pelo} mat="cloth" {...S} />
        <group ref={cabeza} position={[0, 0.78, -0.36]}>
          <Block pos={[0, 0.02, -0.1]} size={[0.2, 0.18, 0.24]} color={pelo} mat="cloth" {...S} />
          <Block pos={[0, -0.03, -0.26]} size={[0.12, 0.1, 0.16]} color="#e3c795" mat="cloth" {...S} />
          <Ball pos={[0, 0, -0.35]} r={0.04} color="#111111" cast={false} />
          <Ball pos={[0.07, 0.06, -0.2]} r={0.028} color="#111111" cast={false} /><Ball pos={[-0.07, 0.06, -0.2]} r={0.028} color="#111111" cast={false} />
          <Block pos={[0.11, 0.13, -0.05]} size={[0.05, 0.18, 0.1]} color={oscuro} rot={0.3} {...S} /><Block pos={[-0.11, 0.1, -0.05]} size={[0.05, 0.18, 0.1]} color={oscuro} rot={-0.3} {...S} />
          <Block pos={[0, -0.1, -0.24]} size={[0.05, 0.03, 0.1]} color="#f08aa0" {...S} />
        </group>
        <group ref={cola} position={[0, 0.62, 0.46]}><Block pos={[0, 0.08, 0.12]} size={[0.035, 0.035, 0.34]} color={oscuro} rot={0} {...S} /></group>
      </group>
      {[[-0.09, -0.2], [0.09, -0.2], [-0.09, 0.34], [0.09, 0.34]].map(([x, z], i) => (
        <group key={i} ref={pat[i]} position={[x, 0.42, z]}><Cyl pos={[0, -0.21, 0]} r={0.032} h={0.42} color={oscuro} {...S} /></group>
      ))}
      <Label pos={[0, 1.25, 0]} text="Aguacatero" h={0.26} fg="#ffe082" />
    </group>
  );
}

/** Doña del comal: gordita, con delantal; voltea tortillas. Mira a −Z; rotala desde afuera. */
export function Dona({ frase }: { frase: string }) {
  const brazo = useRef<THREE.Group>(null), cuerpo = useRef<THREE.Group>(null), torti = useRef<THREE.Group>(null), cabeza = useRef<THREE.Group>(null);
  useTick((_, t) => {
    const k = (t % 3.2) / 3.2;
    if (cuerpo.current) { cuerpo.current.rotation.z = Math.sin(t * 1.6) * 0.03; cuerpo.current.position.y = Math.sin(t * 3.2) * 0.012; }
    if (brazo.current) brazo.current.rotation.x = -0.9 + (k < 0.2 ? Math.sin(k / 0.2 * Math.PI) * 0.7 : Math.sin(t * 5) * 0.08);
    if (cabeza.current) cabeza.current.rotation.y = Math.sin(t * 0.7) * 0.25;
    if (torti.current) { const u = k < 0.2 ? k / 0.2 : 0; torti.current.position.set(0.1, 0.95 + Math.sin(u * Math.PI) * 0.8, -0.85); torti.current.rotation.x = u * Math.PI * 2; }
  });
  return (
    <group>
      <group ref={cuerpo}>
        <Cyl pos={[0, 0.42, 0]} r={0.55} rTop={0.42} h={0.84} color="#6a3d7c" mat="cloth" {...S} />
        <group scale={[1.15, 1, 1.02]}><Ball pos={[0, 1.2, 0]} r={0.6} color="#e8604c" mat="cloth" cast={false} /></group>
        {/* delantal */}
        <Block pos={[0, 1.0, -0.52]} size={[0.86, 0.95, 0.1]} color="#fff4e0" mat="cloth" {...S} />
        <Block pos={[0, 0.58, -0.53]} size={[0.9, 0.09, 0.11]} color="#e53935" {...S} />
        <Block pos={[0, 1.35, -0.45]} size={[0.5, 0.1, 0.1]} color="#fff4e0" mat="cloth" {...S} />
        <Block pos={[0.18, 0.88, -0.585]} size={[0.3, 0.22, 0.02]} color="#f3d9a8" mat="cloth" {...S} />
        <group ref={cabeza} position={[0, 1.95, 0]}>
          <Ball pos={[0, 0, 0]} r={0.3} color="#c68a5b" cast={false} />
          <group scale={[1, 0.62, 1]}><Ball pos={[0, 0.2, 0.05]} r={0.32} color="#2b2321" cast={false} /></group>
          <Ball pos={[0, 0.38, 0.14]} r={0.15} color="#2b2321" cast={false} />
          <Ball pos={[0.1, 0.03, -0.27]} r={0.035} color="#111111" cast={false} /><Ball pos={[-0.1, 0.03, -0.27]} r={0.035} color="#111111" cast={false} />
          <Ball pos={[0.17, -0.06, -0.24]} r={0.05} color="#e8908a" cast={false} /><Ball pos={[-0.17, -0.06, -0.24]} r={0.05} color="#e8908a" cast={false} />
          <Block pos={[0, -0.12, -0.28]} size={[0.14, 0.03, 0.03]} color="#8e2f2f" {...S} />
        </group>
        <group position={[-0.68, 1.5, 0]}><Cyl pos={[0, -0.3, 0]} r={0.14} h={0.7} color="#e8604c" mat="cloth" {...S} /><Ball pos={[0, -0.68, 0]} r={0.12} color="#c68a5b" cast={false} /></group>
        <group ref={brazo} position={[0.68, 1.5, 0]}><Cyl pos={[0, -0.3, 0]} r={0.14} h={0.7} color="#e8604c" mat="cloth" {...S} /><Ball pos={[0, -0.68, 0]} r={0.12} color="#c68a5b" cast={false} /><Block pos={[0, -0.9, -0.1]} size={[0.05, 0.05, 0.5]} color="#8d6e63" mat="wood" {...S} /></group>
      </group>
      <group ref={torti} position={[0.1, 0.95, -0.85]}><Cyl pos={[0, 0, 0]} r={0.24} h={0.03} color="#ecd29a" mat="cloth" {...S} /></group>
      <Label pos={[0, 2.8, 0]} text={frase} h={0.36} />
    </group>
  );
}
