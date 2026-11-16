import { useRef, useState } from 'react';
import type { Group } from 'three';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Interactable, Label, useTick } from '../../kit';
import { reaccionLocura } from '../../reacciones';
import puntos from './valle-puntos.json';

/** Las tres locuras de Valle: una concha con ventanita, un punche de papel que corre el marco y un marco que se estira. */
function Locura({ indice: i, altura }: { indice: number; altura: number }) {
  const p = puntos[i],
    [hecho, hacer] = useState(false),
    reloj = useRef(-1),
    tapa = useRef<Group>(null),
    punche = useRef<Group>(null),
    marco = useRef<Group>(null);
  useTick((dt, t) => {
    if (reloj.current >= 0) reloj.current += dt;
    const k = reloj.current < 0 ? 0 : Math.min(1, reloj.current / 3);
    if (tapa.current) tapa.current.rotation.x = -k * 1.4;
    if (punche.current) {
      // camina de lado: avanza en X mientras mira hacia +Z, y al llegar empuja el marco
      punche.current.position.x = -1.6 + Math.min(k * 1.25, 1) * 1.6;
      punche.current.rotation.z = Math.sin(t * 14) * 0.08 * (k > 0 && k < 1 ? 1 : 0);
    }
    if (marco.current) {
      if (i === 1) marco.current.position.x = 0.6 + Math.max(0, k - 0.8) * 3;
      if (i === 2) marco.current.scale.x = 0.45 + k * 0.75 + (k === 1 ? Math.sin(t * 2) * 0.03 : 0);
    }
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
        <Cyl pos={[0, 0.05, 0]} r={1.4} h={0.1} color={hecho ? '#9bc693' : '#eccd83'} mat="sand" solid={false} />
        <Label pos={[0, 2.6, 0]} text={`✨ ${p.nombre}`} h={0.26} />
        {i === 0 && (
          <>
            <group scale={[1, 0.45, 0.8]}>
              <Ball pos={[0, 0.9, 0]} r={0.6} color="#2e2622" mat="stone" />
            </group>
            <group ref={tapa} position={[0, 0.55, -0.35]}>
              <Block pos={[0, 0.05, 0.3]} size={[0.5, 0.06, 0.5]} color="#4a3b33" mat="stone" solid={false} />
            </group>
            {hecho && <Label pos={[0, 1.6, 0.2]} text="🔓 Ficha: curil · los chiquitos se quedan" h={0.2} />}
          </>
        )}
        {i === 1 && (
          <>
            <group ref={punche}>
              <Block pos={[0, 0.45, 0]} size={[0.6, 0.35, 0.03]} color="#c0392b" mat="cloth" solid={false} />
              {[-1, 1].map((l) => (
                <Block
                  key={l}
                  pos={[l * 0.36, 0.7, 0]}
                  size={[0.16, 0.16, 0.03]}
                  color="#e74c3c"
                  mat="cloth"
                  solid={false}
                />
              ))}
            </group>
            <group ref={marco} position={[0.6, 0, 0]}>
              {[-0.5, 0.5].map((x) => (
                <Block key={x} pos={[x, 0.6, 0]} size={[0.06, 1.2, 0.06]} color="#d4a373" mat="wood" solid={false} />
              ))}
              <Block pos={[0, 1.2, 0]} size={[1.06, 0.06, 0.06]} color="#d4a373" mat="wood" solid={false} />
            </group>
          </>
        )}
        {i === 2 && (
          <>
            <Cyl pos={[0, 0.55, -0.4]} r={0.9} rTop={0.15} h={0.9} color="#5b6b4e" mat="grass" solid={false} />
            <group ref={marco} position={[0, 0, 0.2]}>
              {[-1, 1].map((x) => (
                <Block key={x} pos={[x, 0.65, 0]} size={[0.08, 1.1, 0.08]} color="#ffffff" solid={false} />
              ))}
              {[0.12, 1.18].map((y) => (
                <Block key={y} pos={[0, y, 0]} size={[2.08, 0.08, 0.08]} color="#ffffff" solid={false} />
              ))}
            </group>
          </>
        )}
      </group>
      <Interactable
        pos={pos}
        radius={1.8}
        label={i === 0 ? 'Decí la contraseña' : i === 1 ? 'Soltá al punche de papel' : 'Estirá el marco'}
        icon="✨"
        onUse={usar}
      />
    </>
  );
}
export function ValleDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <Locura key={p.id} indice={i} altura={altura(p.pos[0], p.pos[1])} />
      ))}
    </>
  );
}
