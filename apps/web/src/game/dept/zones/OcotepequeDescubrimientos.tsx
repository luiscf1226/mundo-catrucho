import { useRef, useState } from 'react';
import type { Group } from 'three';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Interactable, Label, Plate, useTick } from '../../kit';
import { reaccionLocura } from '../../reacciones';
import puntos from './ocotepeque-puntos.json';

/** Las tres locuras de Ocotepeque: tres flechas que saludan al cerro, un repollo mandadero y una nube con suéter. */
function Locura({ indice: i, altura }: { indice: number; altura: number }) {
  const p = puntos[i],
    [hecho, hacer] = useState(false),
    reloj = useRef(-1),
    flechas = useRef<(Group | null)[]>([]),
    repollo = useRef<Group>(null),
    lista = useRef<Group>(null),
    nube = useRef<Group>(null),
    sueter = useRef<Group>(null);
  useTick((dt, t) => {
    if (reloj.current >= 0) reloj.current += dt;
    const k = reloj.current < 0 ? 0 : Math.min(1, reloj.current / 2.5);
    // las tres flechas se inclinan juntas hacia la cumbre, una y otra vez
    flechas.current.forEach((f, j) => {
      if (f) f.rotation.x = k > 0 ? -0.5 - Math.max(0, Math.sin(t * 3)) * 0.5 : -0.15;
    });
    if (repollo.current) {
      repollo.current.position.x = -0.9 + k * 1.8;
      repollo.current.position.y = k > 0 && k < 1 ? Math.abs(Math.sin(t * 9)) * 0.25 : 0;
    }
    if (lista.current) lista.current.scale.x = 1 + k * 2.6;
    if (nube.current) {
      nube.current.position.y = 2.2 - k * 1.05 + Math.sin(t * 1.5) * 0.05;
      nube.current.position.z = -0.1 + k * 0.25;
    }
    if (sueter.current) sueter.current.scale.setScalar(Math.max(0.001, k));
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
        <Cyl pos={[0, 0.05, 0]} r={1.5} h={0.1} color={hecho ? '#9bc693' : '#d7c59a'} mat="dirt" solid={false} />
        <Label pos={[0, 2.9, 0]} text={`✨ ${p.nombre}`} h={0.26} />
        {i === 0 && (
          <>
            <Cyl pos={[0, 0.5, 0]} r={0.6} rTop={0.08} h={0.8} color="#4f7a43" mat="grass" solid={false} />
            {[0, 1, 2].map((j) => {
              const a = (j * Math.PI * 2) / 3;
              return (
                <group key={j} position={[Math.sin(a) * 1.1, 0.1, Math.cos(a) * 1.1]} rotation={[0, a + Math.PI, 0]}>
                  <group
                    ref={(g) => {
                      flechas.current[j] = g;
                    }}
                  >
                    <Block pos={[0, 0.45, 0]} size={[0.08, 0.9, 0.08]} color="#f2efe6" solid={false} />
                    <Block
                      pos={[0, 0.95, 0]}
                      size={[0.3, 0.22, 0.06]}
                      color={['#00bce4', '#4997d0', '#0f47af'][j]}
                      solid={false}
                    />
                  </group>
                </group>
              );
            })}
          </>
        )}
        {i === 1 && (
          <>
            <Block pos={[0, 0.5, -0.7]} size={[2.2, 0.08, 0.7]} color="#c08552" mat="wood" solid={false} />
            {[-1, 1].map((x) => (
              <Block key={x} pos={[x, 0.25, -0.7]} size={[0.08, 0.5, 0.08]} color="#8d5a2b" solid={false} />
            ))}
            <group ref={repollo}>
              <Ball pos={[0, 0.4, 0.2]} r={0.35} color="#9bc47a" />
              <Ball pos={[0.12, 0.5, 0.48]} r={0.06} color="#1b1b1b" />
              <Ball pos={[-0.12, 0.5, 0.48]} r={0.06} color="#1b1b1b" />
              {/* la lista se desenrolla hasta quedar más larga que el repollo */}
              <group ref={lista} position={[0.3, 0.45, 0.45]}>
                <Block pos={[0.25, 0, 0]} size={[0.5, 0.32, 0.02]} color="#ffffff" solid={false} />
                <Block pos={[0.25, 0.06, 0.012]} size={[0.4, 0.03, 0.01]} color="#457b9d" solid={false} />
                <Block pos={[0.25, -0.06, 0.012]} size={[0.4, 0.03, 0.01]} color="#457b9d" solid={false} />
              </group>
            </group>
          </>
        )}
        {i === 2 && (
          <>
            <Block pos={[0, 0.55, 0]} size={[0.08, 1.1, 0.08]} color="#8d5a2b" solid={false} />
            <Plate pos={[0, 1.2, 0.06]} text="🗺️ Mapita del sendero" h={0.32} bg="#386641" />
            <group ref={nube} position={[0, 2.2, -0.1]}>
              {[-0.35, 0, 0.35].map((x, j) => (
                <Ball key={x} pos={[x, j === 1 ? 0.12 : 0, 0]} r={j === 1 ? 0.32 : 0.25} color="#f8f9fa" />
              ))}
              <group ref={sueter} position={[0, -0.12, 0]}>
                <Block pos={[0, 0, 0]} size={[0.95, 0.2, 0.5]} color="#c1121f" mat="cloth" solid={false} />
                <Block pos={[0, 0, 0.26]} size={[0.95, 0.05, 0.02]} color="#fefae0" mat="cloth" solid={false} />
              </group>
            </group>
          </>
        )}
      </group>
      <Interactable
        pos={pos}
        radius={1.8}
        label={i === 0 ? 'Saludá al cerro' : i === 1 ? 'Mandá al repollo' : 'Arropá la nube'}
        icon="✨"
        onUse={usar}
      />
    </>
  );
}
export function OcotepequeDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <Locura key={p.id} indice={i} altura={altura(p.pos[0], p.pos[1])} />
      ))}
    </>
  );
}
