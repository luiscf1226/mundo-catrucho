import { useRef, useState } from 'react';
import type { Group } from 'three';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Interactable, Label, useTick } from '../../kit';
import { reaccionLocura } from '../../reacciones';
import puntos from './santabarbara-puntos.json';

/** Las tres locuras de Santa Bárbara: una chimenea de papel con tenis, un sombrero que crece y una ventana con cejas. */
function Locura({ indice: i, altura }: { indice: number; altura: number }) {
  const p = puntos[i],
    [hecho, hacer] = useState(false),
    reloj = useRef(-1),
    figura = useRef<Group>(null),
    brazo = useRef<Group>(null),
    sombrero = useRef<Group>(null),
    cejas = useRef<Group[]>([]);
  useTick((dt, t) => {
    if (reloj.current >= 0) reloj.current += dt;
    const k = reloj.current < 0 ? 0 : Math.min(1, reloj.current / 4);
    if (figura.current) {
      // camina de un lado al otro del escenario vacío, con pasitos
      figura.current.position.x = -1 + Math.sin(k * Math.PI) * 2 * (k > 0 ? 1 : 0);
      figura.current.position.y = k > 0 && k < 1 ? Math.abs(Math.sin(t * 9)) * 0.12 : 0;
    }
    if (brazo.current) brazo.current.rotation.z = k > 0 ? 0.6 + Math.sin(t * 8) * 0.6 : 0.2;
    if (sombrero.current) {
      const e = 0.5 + k * 2.2;
      sombrero.current.scale.set(e, 1 + k * 0.4, e);
    }
    // las cejas siguen la perspectiva: suben o se fruncen según desde dónde mirás la maqueta
    const lado = Math.atan2(player.pos[0] - p.pos[0], player.pos[2] - p.pos[1]);
    cejas.current.forEach((c, j) => {
      if (c) c.rotation.z = (j ? -1 : 1) * (Math.sin(lado) * 0.5 + (hecho ? Math.sin(t * 5) * 0.25 : 0));
    });
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
        <Cyl pos={[0, 0.05, 0]} r={1.5} h={0.1} color={hecho ? '#9bc693' : '#e8d28a'} mat="wood" solid={false} />
        <Label pos={[0, 3, 0]} text={`✨ ${p.nombre}`} h={0.26} />
        {i === 0 && (
          <>
            {/* escenario despejado, sin público */}
            <Block pos={[0, 0.15, -0.6]} size={[3, 0.1, 0.9]} color="#8a5a34" mat="wood" solid={false} />
            <group ref={figura} position={[-1, 0, -0.6]}>
              <Cyl pos={[0, 0.75, 0]} r={0.28} rTop={0.2} h={0.9} color="#e63946" mat="cloth" solid={false} sides={8} />
              <Ball pos={[0, 1.4, 0]} r={0.24} color="#fdf0d5" mat="cloth" />
              <Cyl pos={[0, 1.7, 0]} r={0.05} rTop={0.3} h={0.3} color="#2a9d8f" mat="cloth" solid={false} sides={8} />
              <group ref={brazo} position={[0.25, 1.05, 0]}>
                <Block pos={[0.25, 0, 0]} size={[0.5, 0.08, 0.08]} color="#f4a261" mat="cloth" solid={false} />
              </group>
              {[-0.12, 0.12].map((x) => (
                <Block
                  key={x}
                  pos={[x, 0.27, 0.06]}
                  size={[0.14, 0.12, 0.3]}
                  color="#ffffff"
                  mat="cloth"
                  solid={false}
                />
              ))}
            </group>
          </>
        )}
        {i === 1 && (
          <>
            <Block pos={[0, 0.6, 0]} size={[1.6, 0.08, 1]} color="#8a5a34" mat="wood" solid={false} />
            {[-0.7, 0.7].map((x) =>
              [-0.4, 0.4].map((z) => (
                <Block
                  key={`${x}${z}`}
                  pos={[x, 0.3, z]}
                  size={[0.08, 0.6, 0.08]}
                  color="#5a3d26"
                  mat="wood"
                  solid={false}
                />
              )),
            )}
            <group ref={sombrero} position={[0, 1.4, 0]} scale={[0.5, 1, 0.5]}>
              <Cyl pos={[0, 0, 0]} r={0.7} h={0.04} color="#e8d28a" mat="cloth" solid={false} sides={20} />
              <Cyl pos={[0, 0.16, 0]} r={0.28} rTop={0.24} h={0.3} color="#d8c27a" mat="cloth" solid={false} />
              <Cyl pos={[0, 0.06, 0]} r={0.29} h={0.06} color="#b5523b" mat="cloth" solid={false} />
            </group>
          </>
        )}
        {i === 2 && (
          <>
            <Block pos={[0, 0.8, -0.3]} size={[1.8, 1.4, 0.5]} color="#c9b79c" mat="stone" solid={false} />
            <Block pos={[0, 1.65, -0.3]} size={[2, 0.3, 0.6]} color="#a39171" mat="stone" solid={false} />
            {[-0.45, 0.45].map((x, j) => (
              <group key={x}>
                <Block pos={[x, 0.9, -0.03]} size={[0.4, 0.5, 0.04]} color="#3d405b" mat="glass" solid={false} />
                <group
                  position={[x, 1.25, 0]}
                  ref={(g) => {
                    if (g) cejas.current[j] = g;
                  }}
                >
                  <Block pos={[0, 0, 0]} size={[0.46, 0.08, 0.03]} color="#f4efe6" mat="cloth" solid={false} />
                </group>
              </group>
            ))}
            {hecho && <Label pos={[0, 2.3, 0]} text="Se admira desde afuera" h={0.2} />}
          </>
        )}
      </group>
      <Interactable
        pos={pos}
        radius={1.9}
        label={i === 0 ? 'Ponele los tenis' : i === 1 ? 'Tejé otra vuelta' : 'Cambiá de perspectiva'}
        icon="✨"
        onUse={usar}
      />
    </>
  );
}
export function SantaBarbaraDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <Locura key={p.id} indice={i} altura={altura(p.pos[0], p.pos[1])} />
      ))}
    </>
  );
}
