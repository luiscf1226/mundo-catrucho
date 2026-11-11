import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { SHOP } from '../../../core/data';
import { art, Ball, Block, Cyl, Label, P, useTick } from '../../kit';
import type { Accion } from './agenda';
import { useCamino } from './state';

function Conos() {
  return (
    <>
      {[-5, -2, 1].map((x) => (
        <P.Cone key={x} pos={[x, 0, 2.5]} scale={1.4} solid={false} />
      ))}
    </>
  );
}
function Agente() {
  return (
    <group position={[3.5, 0, 1]} scale={1.3}>
      <art.Avatar config={SHOP.defaultAvatar} state={{ anim: 'wave', speed: 0 }} />
      <Block pos={[0, 1.1, 0]} size={[0.9, 0.55, 0.55]} color="#e8e85b" solid={false} />
    </group>
  );
}
function Ganado() {
  const hato = useRef<Group>(null);
  useTick((_, t) => {
    if (hato.current) hato.current.position.x = Math.sin(t * 0.65) * 2;
  });
  return (
    <group ref={hato}>
      {[-1, 1].map((i) => (
        <group key={i} position={[i * 2.6, 0, i * 1.4]} scale={1.25}>
          <Block pos={[0, 1.2, 0]} size={[2.4, 1.2, 1]} color="#eee3cd" solid={false} />
          <Block pos={[-0.5, 1.5, 0.51]} size={[0.85, 0.6, 0.03]} color="#644c39" solid={false} />
          <Block pos={[1.35, 1.6, 0]} size={[0.8, 0.85, 0.75]} color="#765840" solid={false} />
          <Block pos={[1.75, 1.35, 0]} size={[0.45, 0.4, 0.8]} color="#c39c85" solid={false} />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Cyl pos={[1.3, 2.15, side * 0.32]} r={0.08} h={0.55} color="#fff5d6" solid={false} />
              <Ball pos={[1.65, 1.8, side * 0.38]} r={0.07} color="#171e24" />
              {[-0.8, 0.8].map((x) => (
                <Block key={x} pos={[x, 0.45, side * 0.36]} size={[0.22, 0.9, 0.22]} color="#644c39" solid={false} />
              ))}
            </group>
          ))}
          <Block pos={[-1.3, 1, 0]} size={[0.12, 1.1, 0.12]} color="#644c39" solid={false} />
        </group>
      ))}
    </group>
  );
}
function Lluvia() {
  const gotas = useRef<Group>(null);
  const vertices = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 180 }, (_, i) => {
          const x = (((i * 37) % 101) / 101) * 34 - 17;
          const y = (((i * 23) % 97) / 97) * 18;
          const z = (-((i * 53) % 103) / 103) * 42 + 14;
          return [x, y, z, x + 0.15, y - 1.1, z];
        }).flat(),
      ),
    [],
  );
  useTick((_, t) => {
    if (gotas.current) gotas.current.position.y = -((t * 12) % 6);
  });
  return (
    <>
      <group ref={gotas}>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[vertices, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#c4e6f2" transparent opacity={0.75} />
        </lineSegments>
      </group>
      {[-4, 1, 5].map((x) => (
        <group key={x} position={[x, 0.055, 1]} scale={[1.4, 0.018, 3.5]}>
          <Ball pos={[0, 0, 0]} r={1} color="#7cabb6" mat="water" />
        </group>
      ))}
    </>
  );
}
function Decoracion({ nombre, accion }: { nombre: string; accion: Accion }) {
  if (nombre === 'Ganado cruzando') return <Ganado />;
  if (accion === 'lluvia') return <Lluvia />;
  if (accion === 'neblina') return <P.Sign pos={[-6, 0, 2]} text="LUCES BAJAS" w={3.5} solid={false} />;
  if (nombre === 'Bache marcado')
    return (
      <>
        <Block pos={[-2, 0.05, 0]} size={[5, 0.04, 4]} color="#917153" mat="dirt" solid={false} />
        <Block pos={[-2, 0.08, 0]} size={[3.8, 0.04, 2.8]} color="#16242a" solid={false} />
        <Conos />
      </>
    );
  if (accion === 'rodear')
    return (
      <>
        <Block pos={[-2.5, 0.18, -1]} size={[8, 0.3, 7]} color="#96613d" mat="dirt" solid={false} />
        {[
          [-4, 0, -1],
          [-1, 0, 0],
          [-2.5, 0, -3],
        ].map(([x, y, z], i) => (
          <P.Rock key={i} pos={[x, y, z]} scale={2.8 - i * 0.4} solid={false} />
        ))}
        <Conos />
      </>
    );
  if (accion === 'frenar')
    return (
      <>
        <Block pos={[0, 0.2, 0]} size={[14, 0.4, 2]} color="#e8b628" solid={false} />
        {[-6, -4, -2, 0, 2, 4, 6].map((x) => (
          <Block key={x} pos={[x, 0.41, 0]} size={[0.8, 0.03, 2]} color="#253039" solid={false} />
        ))}
      </>
    );
  if (accion === 'pagar')
    return (
      <>
        <P.Kiosk pos={[-6, 0, -1]} scale={1.4} solid={false} />
        <Block pos={[0, 4.7, -1]} size={[15, 0.5, 4]} color="#267c81" solid={false} />
        {[-7, 7].map((x) => (
          <Block key={x} pos={[x, 2.3, -1]} size={[0.4, 4.6, 0.4]} color="#d6ddd4" solid={false} />
        ))}
        <Block pos={[0, 1.4, 1]} size={[12, 0.25, 0.25]} color="#f6f1dc" solid={false} />
        {[-5, -3, -1, 1, 3, 5].map((x) => (
          <Block key={x} pos={[x, 1.4, 1.02]} size={[0.65, 0.27, 0.28]} color="#d35138" solid={false} />
        ))}
      </>
    );
  if (accion === 'documentos' || nombre === 'Alto por obras')
    return (
      <>
        <Conos />
        <Agente />
        <P.Sign
          pos={[-5, 0, -1]}
          text={accion === 'documentos' ? 'CONTROL · ALTO' : 'OBRAS · ALTO'}
          w={4}
          solid={false}
        />
        {nombre === 'Alto por obras' && (
          <Block pos={[-2, 0.6, -2]} size={[5, 1.2, 2]} color="#ad764b" mat="dirt" solid={false} />
        )}
      </>
    );
  if (nombre === 'Puente de un carril')
    return (
      <>
        <Block pos={[0, 0.07, -7]} size={[7, 0.1, 22]} color="#8b9492" solid={false} />
        {[-4, 4].map((x) => (
          <Block key={x} pos={[x, 1, -7]} size={[0.3, 2, 22]} color="#ddd2ab" solid={false} />
        ))}
        <Conos />
        <P.Sign pos={[6, 0, 0]} text="ESPERÁ TURNO" w={3} solid={false} />
      </>
    );
  if (accion === 'amarres' || accion === 'equipaje')
    return (
      <group position={[4, 0, 0]}>
        {[0, 1, 2].map((i) => (
          <P.Crate key={i} pos={[(i % 2) * 1.6, Math.floor(i / 2) * 1.4, 0]} scale={1.4} solid={false} />
        ))}
        <Block pos={[0.8, 1.5, 0]} size={[3.5, 0.12, 0.12]} color="#efd668" solid={false} />
      </group>
    );
  if (accion === 'mirador')
    return (
      <>
        <P.Sign pos={[6, 0, 0]} text="MIRADOR →" w={5} solid={false} />
        <Block pos={[10, 0.25, -4]} size={[7, 0.5, 8]} color="#be9c71" mat="wood" solid={false} />
        <Block pos={[10, 1.3, -8]} size={[7, 0.2, 0.2]} color="#ede0bc" solid={false} />
      </>
    );
  if (nombre === 'Oleaje y espera')
    return (
      <>
        {[0, 1, 2].map((i) => (
          <Block key={i} pos={[0, 0.4, -i * 4]} size={[16, 0.6, 0.8]} color="#d3f2ef" mat="water" solid={false} />
        ))}
      </>
    );
  return (
    <P.Sign
      pos={[6, 0, 0]}
      text={accion === 'radio' ? '♫ RADIO DEL CAMINO' : accion === 'ventilar' ? 'AGUA · SOMBRA' : 'PRÓXIMA PARADA'}
      w={5}
      solid={false}
    />
  );
}
export function EscenaCamino() {
  const detenido = useCamino((s) => s.velocidad < 0.1);
  const cita = useCamino((s) => s.activa);
  if (!cita) return null;
  return (
    <group position={[0, 0, -7]}>
      {cita.accion === 'comprar' ? (
        <>
          <group position={detenido ? [5.8, 0.9, 7] : [7.5, 0, 0]}>
            <art.Avatar config={SHOP.defaultAvatar} state={{ anim: 'wave', speed: 0 }} />
          </group>
          <P.Stall pos={[10, 0, -2]} sign={cita.nombre} solid={false} />
          <Label pos={[7, 3, 0]} text="¡Parada, compa!" h={0.45} />
        </>
      ) : (
        <Decoracion nombre={cita.nombre} accion={cita.accion} />
      )}
    </group>
  );
}
