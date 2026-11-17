import { useRef, useState } from 'react';
import type { Group } from 'three';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Interactable, Label, Plate, useTick } from '../../kit';
import { reaccionLocura } from '../../reacciones';
import puntos from './lapaz-puntos.json';

const AROMAS: [string, string][] = [
  ['Chocolate', '#6b3f22'],
  ['Panela', '#c98a3a'],
  ['Cítrico', '#f2c14e'],
  ['Floral', '#d78fd0'],
  ['Frutos rojos', '#c0392b'],
];
/** La taza sorbe y despliega su mapa de aromas en abanico, con una lupa encima. */
function TazaConLupa({ activa }: { activa: boolean }) {
  const mapa = useRef<Group>(null),
    k = useRef(0);
  useTick((dt, t) => {
    k.current = Math.min(1, Math.max(0, k.current + (activa ? dt : -dt) * 0.8));
    const g = mapa.current;
    if (!g) return;
    g.scale.setScalar(0.05 + k.current * 0.95);
    g.rotation.y = activa ? Math.sin(t * 0.8) * 0.2 : 0;
  });
  return (
    <>
      <Cyl pos={[0, 0.5, -1]} r={0.7} rTop={0.9} h={1} color="#f4efe6" mat="plastic" solid={false} />
      <Cyl pos={[0, 0.99, -1]} r={0.82} h={0.04} color="#4a2a17" solid={false} />
      <group ref={mapa} position={[0, 1.4, -1]}>
        {AROMAS.map(([nombre, color], i) => {
          const a = ((i - 2) / 2) * 1.1;
          return (
            <group key={nombre} position={[Math.sin(a) * 1.6, 0.6 + Math.cos(a) * 0.9, 0]}>
              <Ball pos={[0, 0, 0]} r={0.28} color={color} />
              <Label pos={[0, 0.5, 0]} text={nombre} h={0.22} />
            </group>
          );
        })}
        <Cyl pos={[0, 1.7, 0.3]} r={0.45} h={0.08} color="#cfe8f2" mat="glass" solid={false} />
        <Block pos={[0.5, 1.25, 0.3]} size={[0.1, 0.7, 0.1]} color="#6b4a2e" mat="wood" solid={false} />
      </group>
    </>
  );
}
/** Un grano de utilería sobre su puesto hace reverencia y le llueve confeti. */
function GranoAplaudido({ activa }: { activa: boolean }) {
  const grano = useRef<Group>(null),
    confeti = useRef<Group>(null);
  useTick((_dt, t) => {
    if (grano.current) grano.current.rotation.x = activa ? Math.max(0, Math.sin(t * 2.5)) * 0.8 : 0;
    const c = confeti.current;
    if (!c) return;
    c.visible = activa;
    c.children.forEach((p, i) => {
      p.position.y = 3.2 - ((t * 1.2 + i * 0.37) % 3);
      p.rotation.z = t * 3 + i;
    });
  });
  return (
    <>
      <Block pos={[0, 0.5, -1]} size={[2.4, 1, 1.2]} color="#a5523b" mat="wood" solid={false} />
      <Block pos={[0, 2.3, -1]} size={[2.8, 0.1, 1.6]} color="#f4d35e" mat="cloth" solid={false} />
      {[-1.3, 1.3].map((x) => (
        <Cyl key={x} pos={[x, 1.2, -1.7]} r={0.05} h={2.2} color="#6b4a2e" mat="wood" solid={false} />
      ))}
      <group ref={grano} position={[0, 1, -1]}>
        <Ball pos={[0, 0.45, 0]} r={0.45} color="#5a3620" />
        <Block pos={[0, 0.45, 0.4]} size={[0.06, 0.6, 0.1]} color="#2b1a10" solid={false} />
      </group>
      <group ref={confeti} position={[0, 0, -1]}>
        {Array.from({ length: 10 }, (_, i) => (
          <Block
            key={i}
            pos={[((i * 7) % 10) / 4 - 1.2, 2, ((i * 3) % 5) / 4 - 0.5]}
            size={[0.14, 0.02, 0.1]}
            color={['#e63946', '#2a9d8f', '#f4a261', '#7b2cbf', '#ffd23f'][i % 5]}
            solid={false}
          />
        ))}
      </group>
      {activa && <Plate pos={[0, 3.6, -1]} text="👏 ¡Bravo, cafecito!" h={0.26} bg="#7f5539" />}
    </>
  );
}
/** La niebla se abre como telón cuando te quedás quieto y callado cerca; adentro espera un pájaro del bosque nublado. */
function BrumaTelon({ x, z }: { x: number; z: number }) {
  const izq = useRef<Group>(null),
    der = useRef<Group>(null),
    quieto = useRef(0),
    abierto = useRef(0),
    avisado = useRef(false);
  useTick((dt) => {
    const cerca = player.distTo(x, z) < 4.5,
      v = player.body.vel,
      calma = cerca && Math.hypot(v[0], v[2]) < 0.2;
    quieto.current = calma ? quieto.current + dt : 0;
    const abrir = quieto.current > 1.2;
    abierto.current = Math.min(1, Math.max(0, abierto.current + (abrir ? dt : -dt) * 0.7));
    if (abrir && !avisado.current) {
      avisado.current = true;
      reaccionLocura();
    }
    if (!cerca) avisado.current = false;
    if (izq.current) izq.current.position.x = -0.8 - abierto.current * 1.6;
    if (der.current) der.current.position.x = 0.8 + abierto.current * 1.6;
  });
  return (
    <>
      <Block pos={[0, 3.3, -1.4]} size={[4.6, 0.2, 0.3]} color="#6b4a2e" mat="wood" solid={false} />
      <Cyl pos={[0, 1.4, -1.8]} r={0.12} h={2.8} color="#6b4a2e" mat="wood" solid={false} />
      <Ball pos={[0.1, 2.2, -1.6]} r={0.28} color="#2a9d8f" />
      <Ball pos={[0.32, 2.28, -1.5]} r={0.1} color="#e9c46a" />
      {[izq, der].map((ref, i) => (
        <group key={i} ref={ref} position={[i ? 0.8 : -0.8, 0, -1.3]}>
          <Block pos={[0, 1.65, 0]} size={[1.6, 3.2, 0.2]} color="#e8eef0" mat="glass" solid={false} />
        </group>
      ))}
    </>
  );
}
function Punto({ indice: i }: { indice: number }) {
  const p = puntos[i],
    [x, z] = p.pos,
    [activa, activar] = useState(false);
  return (
    <>
      <group position={[x, 0, z]}>
        <Cyl pos={[0, 0.03, 0]} r={2.2} h={0.06} color="#c9a56b" mat="dirt" solid={false} />
        <Label pos={[0, 4, 0]} text={`✨ ${p.nombre}`} h={0.3} />
        {i === 0 ? (
          <TazaConLupa activa={activa} />
        ) : i === 1 ? (
          <GranoAplaudido activa={activa} />
        ) : (
          <BrumaTelon x={x} z={z} />
        )}
      </group>
      <Interactable
        pos={[x, 0, z + 1.2]}
        radius={2}
        label={`Activar: ${p.nombre}`}
        icon="✨"
        onUse={() => {
          activar(true);
          reaccionLocura();
          useGame.getState().showDialog({ title: p.nombre, text: p.texto, icon: '✨' });
        }}
      />
    </>
  );
}
/** Las tres locuras de La Paz; los lugares para explorar los pone el turismo de la zona. */
export function LaPazDescubrimientos() {
  return (
    <>
      {puntos.map((p, i) => (
        <Punto key={p.id} indice={i} />
      ))}
    </>
  );
}
/** Para dejar libre de matas y árboles el lugar de cada locura. */
export const cercaDeLocura = (x: number, z: number) => puntos.some((p) => Math.hypot(x - p.pos[0], z - p.pos[1]) < 4.5);
