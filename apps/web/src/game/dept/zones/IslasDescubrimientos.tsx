import { useRef, useState } from 'react';
import type * as THREE from 'three';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label, Plate, useTick } from '../../kit';
import puntos from './islas-puntos.json';

/** Selfie con el tiburón ballena… a distancia: el palito, el teléfono y la flecha que te frena. */
function Selfie() {
  return (
    <>
      <group position={[-0.4, 0, 0]} rotation-z={0.35}>
        <Cyl pos={[0, 1, 0]} r={0.03} h={1.6} color="#2b2b2b" mat="metal" solid={false} />
        <Block pos={[0, 1.85, 0]} size={[0.32, 0.55, 0.05]} color="#1d3557" mat="plastic" solid={false} />
      </group>
      <Block pos={[1.1, 1.3, 0]} size={[1.6, 0.18, 0.08]} color="#ef476f" mat="plastic" solid={false} />
      {[-1, 1].map((l) => (
        <group key={l} position={[1.1 + l * 0.85, 1.3, 0]} rotation-z={Math.PI / 4}>
          <Block pos={[0, 0, 0]} size={[0.3, 0.3, 0.08]} color="#ef476f" mat="plastic" solid={false} />
        </group>
      ))}
      <Plate pos={[1.1, 1.75, 0.05]} text="¡4 metros!" h={0.26} bg="#ef476f" />
      <group position={[3.2, 0.25, 0.6]} scale={[1.4, 0.32, 0.5]}>
        <Ball pos={[0, 0, 0]} r={1} color="#3f5f78" />
      </group>
      {[0, 1, 2, 3].map((i) => (
        <Ball key={i} pos={[2.6 + i * 0.4, 0.55, 0.5 + (i % 2) * 0.2]} r={0.06} color="#f4f7f8" cast={false} />
      ))}
    </>
  );
}
/** Pino de cartón que se estira para caber en la postal. */
function PinoDeCarton() {
  const pino = useRef<THREE.Group>(null);
  useTick((_dt, t) => {
    const g = pino.current;
    if (!g) return;
    g.scale.y = 1 + Math.sin(t * 1.6) * 0.18;
    g.rotation.z = Math.sin(t * 1.1) * 0.12;
  });
  return (
    <>
      <Block pos={[0, 1.5, -0.3]} size={[2.6, 2.6, 0.08]} color="#fefae0" mat="plastic" solid={false} />
      <Block pos={[0, 1.5, -0.25]} size={[2.3, 2.3, 0.04]} color="#8ecae6" mat="plastic" solid={false} cast={false} />
      <group ref={pino} position={[0, 0.4, 0]}>
        <Block pos={[0, 0.35, 0]} size={[0.18, 0.7, 0.05]} color="#9c6644" mat="cloth" solid={false} />
        {[0, 1, 2].map((i) => (
          <Block
            key={i}
            pos={[0, 0.9 + i * 0.5, 0]}
            size={[1.4 - i * 0.4, 0.55, 0.05]}
            color={['#2d6a4f', '#40916c', '#52b788'][i]}
            mat="cloth"
            solid={false}
          />
        ))}
      </group>
      <Plate pos={[0, 3, -0.2]} text="Postal de Guanaja" h={0.24} bg="#2d6a4f" />
    </>
  );
}
/** El semáforo de burbujas del instructor: verde flotás, amarillo ojo, rojo fondo. */
function Semaforo() {
  const luz = useRef(0);
  const [, pintar] = useState(0);
  useTick((dt) => {
    const antes = Math.floor(luz.current);
    luz.current = (luz.current + dt * 0.8) % 3;
    if (Math.floor(luz.current) !== antes) pintar((n) => n + 1);
  });
  const encendida = Math.floor(luz.current);
  return (
    <>
      <Cyl pos={[0, 0.8, 0]} r={0.06} h={1.6} color="#3a3a3a" mat="metal" solid={false} />
      <Block pos={[0, 2.1, 0]} size={[0.6, 1.5, 0.3]} color="#1d1d1f" mat="plastic" solid={false} />
      {['#7ae582', '#ffd166', '#ef476f'].map((c, i) => (
        <Ball
          key={c}
          pos={[0, 2.6 - i * 0.48, 0.17]}
          r={0.17}
          color={encendida === i ? c : '#3a3a3a'}
          mat={encendida === i ? 'neon' : 'plastic'}
          cast={false}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Ball
          key={i}
          pos={[0.5 + (i % 2) * 0.2, 1.2 + i * 0.35, 0.2]}
          r={0.08 + i * 0.02}
          color="#dff6ff"
          mat="glass"
          cast={false}
        />
      ))}
      {[-1, 1].map((l) => (
        <Block
          key={l}
          pos={[-0.9 + l * 0.18, 0.04, 0.4]}
          size={[0.25, 0.05, 0.6]}
          color="#ffd166"
          mat="plastic"
          solid={false}
        />
      ))}
    </>
  );
}
function Punto({ indice, y }: { indice: number; y: number }) {
  const p = puntos[indice];
  const [visto, descubrir] = useState(false);
  const cerca = useRef(false);
  const loco = p.id.includes('locura');
  useTick(() => {
    if (
      useGame.getState().dialog ||
      visto ||
      cerca.current ||
      Math.hypot(player.pos[0] - p.x, player.pos[2] - p.z) > 2.5
    )
      return;
    cerca.current = true;
    descubrir(true);
    useGame.getState().showDialog({ title: p.nombre, text: p.texto, icon: loco ? '✨' : '📍' });
  });
  return (
    <group position={[p.x, y, p.z]}>
      <Cyl pos={[0, 0.04, 0]} r={2} h={0.08} mat="sand" color={visto ? '#91c786' : '#ffda75'} solid={false} />
      <Block pos={[0, 1, -1]} size={[0.12, 2, 0.12]} mat="wood" color="#795333" solid={false} />
      <Label pos={[0, 2.5, -1]} text={`${visto ? '✓' : loco ? '✨' : '📍'} ${p.nombre}`} h={0.32} />
      {p.id === 'islas.locura-1' && (
        <group position={[0, 0, 0.6]}>
          <Selfie />
        </group>
      )}
      {p.id === 'islas.locura-2' && (
        <group position={[0, 0, 0.4]}>
          <PinoDeCarton />
        </group>
      )}
      {p.id === 'islas.locura-3' && (
        <group position={[0.8, 0, 0.4]}>
          <Semaforo />
        </group>
      )}
    </group>
  );
}
/** Los lugares y locuras de Islas de la Bahía: se descubren al caminar cerca. `altura` es el suelo de la zona. */
export function IslasDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <Punto key={p.id} indice={i} y={Math.max(0, altura(p.x, p.z))} />
      ))}
    </>
  );
}
