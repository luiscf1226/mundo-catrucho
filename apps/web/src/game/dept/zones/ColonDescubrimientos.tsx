import { useRef, useState } from 'react';
import type { Group } from 'three';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Interactable, Label, Plate, useTick } from '../../kit';
import { reaccionLocura } from '../../reacciones';
import puntos from './colon-puntos.json';

/** Un disco de casabe de utilería sobre la mesa de práctica, con su abanico de palma. */
function CasabeConAbanico({ activa }: { activa: boolean }) {
  const abanico = useRef<Group>(null);
  useTick((_dt, t) => {
    if (abanico.current) abanico.current.rotation.z = Math.sin(t * (activa ? 16 : 2.5)) * 0.5;
  });
  return (
    <>
      <Block pos={[0, 0.45, 0]} size={[2.2, 0.9, 1.2]} color="#8d6e4a" mat="wood" solid={false} />
      <Cyl pos={[-0.6, 0.95, 0]} r={0.55} h={0.08} color="#3b3b3b" mat="metal" solid={false} />
      <Cyl pos={[-0.6, 1.01, 0]} r={0.45} h={0.04} color="#efe2c2" mat="plastic" solid={false} />
      <Ball pos={[-0.75, 1.06, 0.1]} r={0.04} color="#2b2b2b" />
      <Ball pos={[-0.45, 1.06, 0.1]} r={0.04} color="#2b2b2b" />
      <group ref={abanico} position={[-0.6, 1.1, -0.2]}>
        <Block pos={[0.35, 0.35, 0]} size={[0.06, 0.7, 0.06]} color="#c9a05a" mat="wood" solid={false} />
        <Block pos={[0.35, 0.85, 0]} size={[0.6, 0.45, 0.04]} color="#d9b77a" mat="cloth" solid={false} />
      </group>
      <Block pos={[0.6, 1.0, 0]} size={[0.5, 0.2, 0.5]} color="#c8a165" mat="cloth" solid={false} />
      {activa && <Plate pos={[-0.6, 2.6, 0]} text="🪭 ¡Qué calor en el comal!" h={0.26} bg="#8a3b12" />}
    </>
  );
}
/** Réplica de museo de la fortaleza: al sacarle la foto cierra dos ventanas como ojos. */
function CastilloQueParpadea({ activa }: { activa: boolean }) {
  const parpados = useRef<Group>(null),
    reloj = useRef(0);
  useTick((dt) => {
    reloj.current += dt;
    if (!parpados.current) return;
    // parpadea seguido después de la foto y de vez en cuando si no
    const ciclo = activa ? reloj.current % 0.9 : reloj.current % 4;
    parpados.current.scale.y = ciclo < 0.18 ? 1 : 0.05;
  });
  return (
    <>
      <Block pos={[0, 0.4, 0]} size={[2.4, 0.8, 1.6]} color="#a89f8c" mat="stone" solid={false} />
      {[-1, 1].map((x) => (
        <Block key={x} pos={[x * 1.1, 1.05, 0.7]} size={[0.4, 0.5, 0.4]} color="#b8b2a4" mat="stone" solid={false} />
      ))}
      {[-0.45, 0.45].map((x) => (
        <Block key={x} pos={[x, 0.55, 0.81]} size={[0.32, 0.32, 0.04]} color="#1d1d1f" solid={false} />
      ))}
      <group ref={parpados} position={[0, 0.71, 0.84]}>
        {[-0.45, 0.45].map((x) => (
          <Block key={x} pos={[x, -0.16, 0]} size={[0.34, 0.34, 0.03]} color="#a89f8c" mat="stone" solid={false} />
        ))}
      </group>
      <group position={[0, 0, 2.6]}>
        {[-0.25, 0.25].map((x) => (
          <Cyl key={x} pos={[x, 0.55, 0]} r={0.03} h={1.1} color="#2b2b2b" mat="metal" solid={false} />
        ))}
        <Block pos={[0, 1.2, 0]} size={[0.5, 0.32, 0.3]} color="#3b3f4a" mat="metal" solid={false} />
        <Cyl pos={[0, 1.2, -0.2]} r={0.1} h={0.1} color="#7fd1ff" mat="glass" solid={false} />
      </group>
      {activa && <Plate pos={[0, 2.2, 0]} text="📸 ¡Salí con los ojos cerrados!" h={0.24} bg="#3b3f4a" />}
    </>
  );
}
const GORROS = [
  { nombre: 'paja: agua dulce', color: '#e9c46a', alto: 0.3 },
  { nombre: 'marinero: salada', color: '#f4f4f4', alto: 0.5 },
  { nombre: 'mitad y mitad: mezcla', color: '#4a90d9', alto: 0.4 },
];
/** El agua de la maqueta cambia de gorro según la mezcla. */
function LagunaConSombrero({ gorro }: { gorro: number }) {
  const g = GORROS[gorro % GORROS.length];
  return (
    <>
      <Cyl pos={[0, 0.3, 0]} r={1.3} h={0.6} color="#8a7f6c" mat="stone" solid={false} />
      <Cyl pos={[0, 0.62, 0]} r={1.15} h={0.06} color={gorro === 1 ? '#1f6fb5' : '#3f8fa6'} mat="water" solid={false} />
      <Cyl pos={[0, 0.7, 0]} r={0.9} h={0.04} color={g.color} mat="cloth" solid={false} />
      <Cyl pos={[0, 0.72 + g.alto / 2, 0]} r={0.5} rTop={0.35} h={g.alto} color={g.color} mat="cloth" solid={false} />
      {gorro === 1 && <Ball pos={[0, 0.8 + g.alto, 0]} r={0.12} color="#c0392b" />}
      <Plate pos={[0, 2.1, 0]} text={`🎩 Gorro de ${g.nombre}`} h={0.22} bg="#2a5c8a" />
    </>
  );
}
function Punto({ indice: i, y }: { indice: number; y: number }) {
  const p = puntos[i],
    [x, z] = p.pos,
    [activa, activar] = useState(false),
    [gorro, cambiar] = useState(0);
  return (
    <>
      <group position={[x, y, z]}>
        <Cyl pos={[0, 0.03, 0]} r={2.2} h={0.06} color="#e7c98a" mat="sand" solid={false} />
        <Label pos={[0, 3.3, 0]} text={`✨ ${p.nombre}`} h={0.3} />
        {i === 0 ? (
          <CasabeConAbanico activa={activa} />
        ) : i === 1 ? (
          <CastilloQueParpadea activa={activa} />
        ) : (
          <LagunaConSombrero gorro={gorro} />
        )}
      </group>
      <Interactable
        pos={[x, y, z + 1.2]}
        radius={2}
        label={`${i === 1 ? 'Sacá la foto' : i === 2 ? 'Cambiá la mezcla' : 'Mirá'}: ${p.nombre}`}
        icon="✨"
        onUse={() => {
          activar(true);
          cambiar((n) => n + 1);
          reaccionLocura();
          useGame.getState().showDialog({ title: p.nombre, text: p.texto, icon: '✨' });
        }}
      />
    </>
  );
}
/** Las tres locuras de Colón; los lugares para explorar los pone el turismo de la zona. */
export function ColonDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <Punto key={p.id} indice={i} y={Math.max(0, altura(p.pos[0], p.pos[1]))} />
      ))}
    </>
  );
}
export const cercaDeLocura = (x: number, z: number) => puntos.some((p) => Math.hypot(x - p.pos[0], z - p.pos[1]) < 4.5);
