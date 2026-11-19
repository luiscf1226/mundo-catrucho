import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { SHOP } from '../../../core/data';
import { art, Ball, Label, P, useTick } from '../../kit';
import type { Accion } from './agenda';
import { Decorado, Olas } from './decorado';
import { useCamino } from './state';

// el agente de tránsito o de la cuadrilla: camisa de chaleco amarillo y gorra
const AGENTE = {
  ...SHOP.defaultAvatar,
  shirtColor: '#d9ea2f',
  pantsColor: '#27313b',
  hat: 'gorra',
  hatColor: '#f2f2ee',
};
function Agente() {
  return (
    <group position={[3.5, 0, 1]} scale={1.3}>
      <art.Avatar config={AGENTE} state={{ anim: 'wave', speed: 0 }} />
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
      <Decorado k="hato" />
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
  if (nombre === 'Bache marcado') return <Decorado k="bache" />;
  if (accion === 'rodear') return <Decorado k="derrumbe" />;
  if (accion === 'frenar') return <Decorado k="tumulo" />;
  if (accion === 'pagar')
    return (
      <>
        <P.Kiosk pos={[-6, 0, -1]} scale={1.4} solid={false} />
        <Decorado k="peaje" />
      </>
    );
  if (accion === 'documentos' || nombre === 'Alto por obras')
    return (
      <>
        <Decorado k="conos" />
        <Agente />
        <P.Sign
          pos={[-5, 0, -1]}
          text={accion === 'documentos' ? 'CONTROL · ALTO' : 'OBRAS · ALTO'}
          w={4}
          solid={false}
        />
        {nombre === 'Alto por obras' && <Decorado k="obra" />}
      </>
    );
  if (nombre === 'Puente de un carril')
    return (
      <>
        <Decorado k="puente" />
        <P.Sign pos={[6, 0, 0]} text="ESPERÁ TURNO" w={3} solid={false} />
      </>
    );
  if (accion === 'amarres' || accion === 'equipaje')
    return (
      <group position={[4, 0, 0]}>
        <Decorado k={accion === 'equipaje' ? 'maletas' : 'sacos'} />
      </group>
    );
  if (accion === 'mirador')
    return (
      <>
        <P.Sign pos={[6, 0, 0]} text="MIRADOR →" w={5} solid={false} />
        <Decorado k="mirador" />
      </>
    );
  if (nombre === 'Oleaje y espera') return <Olas />;
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
