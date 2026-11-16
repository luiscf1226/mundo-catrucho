import { useRef, useState } from 'react';
import type { Group } from 'three';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Interactable, Label, Plate, useTick } from '../../kit';
import puntos from './choluteca-puntos.json';

/** La sombra del visitante saca abanico y pide turno bajo el toldo. */
function SombraConAbanico({ activa }: { activa: boolean }) {
  const abanico = useRef<Group>(null);
  useTick((_dt, t) => {
    if (abanico.current) abanico.current.rotation.z = Math.sin(t * (activa ? 14 : 3)) * 0.6;
  });
  return (
    <>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Cyl
            key={`${x}${z}`}
            pos={[x * 1.2, 1.1, z * 0.9 - 1]}
            r={0.05}
            h={2.2}
            color="#795333"
            mat="wood"
            solid={false}
          />
        )),
      )}
      <Block pos={[0, 2.25, -1]} size={[2.8, 0.08, 2.2]} color="#e76f51" mat="cloth" solid={false} />
      <Block pos={[2.6, 0.03, -1]} size={[1.8, 0.02, 0.7]} color="#23262e" solid={false} />
      <Ball pos={[1.6, 0.05, -1]} r={0.3} color="#23262e" />
      <group ref={abanico} position={[2.2, 0.06, -0.3]}>
        <Block pos={[0.25, 0, 0]} size={[0.5, 0.02, 0.4]} color="#c9a0dc" mat="cloth" solid={false} />
      </group>
      {activa && <Plate pos={[2.6, 1.2, -1]} text="🪭 ¿Me das turno?" h={0.26} bg="#3b3f4a" />}
    </>
  );
}
/** La linterna se pone lentes oscuros y baja sola el foco hacia el suelo. */
function LinternaEducada({ activa }: { activa: boolean }) {
  const cabeza = useRef<Group>(null);
  useTick((dt) => {
    const g = cabeza.current;
    if (!g) return;
    const meta = activa ? 1.1 : 0;
    g.rotation.x += (meta - g.rotation.x) * Math.min(1, dt * 2);
  });
  return (
    <>
      <Cyl pos={[0, 0.6, -1]} r={0.08} h={1.2} color="#5e6670" mat="metal" solid={false} />
      <group ref={cabeza} position={[0, 1.25, -1]}>
        <Cyl pos={[0, 0, 0.25]} r={0.22} rTop={0.3} h={0.6} color="#d9d2c1" mat="plastic" solid={false} />
        <Block pos={[0, 0.12, 0.22]} size={[0.5, 0.1, 0.08]} color="#111318" solid={false} />
      </group>
      <Block pos={[0, 0.05, 0.4]} size={[0.15, 0.04, 1]} color="#ffd23f" mat="neon" solid={false} />
      {[-0.6, 0.1, 0.7].map((x, i) => (
        <Ball key={i} pos={[x, 0.12, 1.4 + i * 0.25]} r={0.12} color="#6b4f2f" />
      ))}
      {activa && <Plate pos={[0, 2.2, -1]} text="🕶️ ⬇ Foco al suelo" h={0.26} bg="#2c2f36" />}
    </>
  );
}
/** Fachadas de postal que se desperezan cuando llega la luz suave. */
function FachadasQuePosan({ activa }: { activa: boolean }) {
  const fachadas = useRef<(Group | null)[]>([]);
  useTick((_dt, t) => {
    fachadas.current.forEach((g, i) => {
      if (g) g.scale.y = activa ? 1 + Math.max(0, Math.sin(t * 2 + i)) * 0.25 : 1;
    });
  });
  return (
    <>
      {['#f2c4a4', '#ffe0a8', '#a8d5ba'].map((color, i) => (
        <group
          key={color}
          position={[(i - 1) * 1.3, 0, -1.2]}
          ref={(g) => {
            fachadas.current[i] = g;
          }}
        >
          <Block pos={[0, 0.9, 0]} size={[1.2, 1.8, 0.2]} color={color} mat="stucco" solid={false} />
          <Block pos={[0, 0.5, 0.11]} size={[0.4, 0.8, 0.03]} color="#6b4423" mat="wood" solid={false} />
          <Block pos={[0, 1.85, 0]} size={[1.3, 0.12, 0.3]} color="#b5523b" mat="roof" solid={false} />
        </group>
      ))}
      <Ball pos={[2.4, activa ? 2.6 : 0.6, -1.6]} r={0.3} color="#ffd9a0" mat="glass" />
      {activa && <Plate pos={[0, 2.8, -1.2]} text="☀️ ¡Buenos días, postal!" h={0.26} bg="#b5523b" />}
    </>
  );
}
function Punto({ indice: i, y }: { indice: number; y: number }) {
  const p = puntos[i],
    [x, z] = p.pos,
    [activa, activar] = useState(false);
  return (
    <>
      <group position={[x, y, z]}>
        <Cyl pos={[0, 0.03, 0]} r={2.2} h={0.06} color="#e7c98a" mat="sand" solid={false} />
        <Label pos={[0, 3.3, 0]} text={`✨ ${p.nombre}`} h={0.3} />
        {i === 0 ? (
          <SombraConAbanico activa={activa} />
        ) : i === 1 ? (
          <LinternaEducada activa={activa} />
        ) : (
          <FachadasQuePosan activa={activa} />
        )}
      </group>
      <Interactable
        pos={[x, y, z + 1.2]}
        radius={2}
        label={`Activar: ${p.nombre}`}
        icon="✨"
        onUse={() => {
          activar(true);
          useGame.getState().showDialog({ title: p.nombre, text: p.texto, icon: '✨' });
        }}
      />
    </>
  );
}
/** Las tres locuras de Choluteca; los lugares para explorar los pone el turismo de la zona. */
export function CholutecaDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <Punto key={p.id} indice={i} y={Math.max(0, altura(p.pos[0], p.pos[1]))} />
      ))}
    </>
  );
}
/** Para dejar libre de matas y piedras el lugar de cada locura. */
export const cercaDeLocura = (x: number, z: number) => puntos.some((p) => Math.hypot(x - p.pos[0], z - p.pos[1]) < 4.5);
