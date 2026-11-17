import { useRef, useState } from 'react';
import type { Group } from 'three';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Interactable, Label, Plate, useTick } from '../../kit';
import { reaccionLocura } from '../../reacciones';
import puntos from './graciasadios-puntos.json';

const CONFETI = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#f78c6b', '#c77dff'];
/** Puntitos de la nube de utilería: ángulo, altura y radio fijos; el estornudo los abre. */
const NUBE = Array.from({ length: 14 }, (_, k) => ({ a: k * 2.4, y: 1.5 + (k % 4) * 0.18, r: 0.35 + (k % 3) * 0.12 }));

/**
 * Las tres locuras de Gracias a Dios: una nube de puntos de utilería que estornuda, una brújula de decorado que se
 * marea y una hoja de cartón que se vuelve sombrilla del muñeco. Todo es ficción del juego, sin restos ni ritos.
 */
function Locura({ indice: i, altura }: { indice: number; altura: number }) {
  const p = puntos[i],
    [hecho, hacer] = useState(false),
    reloj = useRef(-1),
    nube = useRef<(Group | null)[]>([]),
    aguja = useRef<Group>(null),
    hoja = useRef<Group>(null);
  useTick((dt, t) => {
    if (reloj.current >= 0) reloj.current += dt;
    const k = reloj.current;
    // el estornudo: los puntos salen disparados y vuelven a su nube
    const abre = k >= 0 && k < 3 ? Math.sin((k / 3) * Math.PI) * 1.4 : 0;
    nube.current.forEach((g, j) => {
      if (!g) return;
      const d = NUBE[j];
      g.position.set(
        Math.cos(d.a) * d.r * (1 + abre),
        d.y + abre * 0.3 * Math.sin(d.a * 3),
        Math.sin(d.a) * d.r * (1 + abre),
      );
    });
    // la brújula da vueltas exageradas y termina apuntando a cualquier lado
    if (aguja.current) aguja.current.rotation.y = k >= 0 && k < 4 ? t * 14 : Math.sin(t * 0.8) * 0.3;
    // la hoja de cartón sube y acompaña al muñeco como sombrilla por unos segundos
    if (hoja.current) {
      const sombrilla = k >= 0 && k < 7;
      if (sombrilla) {
        hoja.current.position.set(
          player.pos[0] - p.pos[0],
          player.pos[1] - altura + 2.4 + Math.sin(t * 3) * 0.05,
          player.pos[2] - p.pos[1],
        );
        hoja.current.rotation.set(0, t * 0.6, 0.12);
      } else {
        hoja.current.position.set(0, 0.95, 0);
        hoja.current.rotation.set(-1.1, 0, 0);
      }
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
        <Cyl pos={[0, 0.05, 0]} r={1.6} h={0.1} color={hecho ? '#9bc693' : '#d7c59a'} mat="dirt" solid={false} />
        <Label pos={[0, 3.3, 0]} text={`✨ ${p.nombre}`} h={0.26} />
        {i === 0 && (
          <>
            {/* trípode del escáner de utilería */}
            {[0, 2.1, 4.2].map((a) => (
              <Cyl
                key={a}
                pos={[Math.cos(a) * 0.25 - 0.9, 0.5, Math.sin(a) * 0.25]}
                r={0.03}
                h={1}
                color="#495057"
                solid={false}
              />
            ))}
            <Block pos={[-0.9, 1.05, 0]} size={[0.35, 0.22, 0.25]} color="#212529" solid={false} />
            {NUBE.map((d, j) => (
              <group
                key={j}
                ref={(g) => {
                  nube.current[j] = g;
                }}
                position={[Math.cos(d.a) * d.r, d.y, Math.sin(d.a) * d.r]}
              >
                <Ball pos={[0, 0, 0]} r={0.07} color={CONFETI[j % CONFETI.length]} />
              </group>
            ))}
          </>
        )}
        {i === 1 && (
          <>
            <Cyl pos={[0, 0.45, 0]} r={0.12} h={0.9} color="#8d5a2b" mat="wood" solid={false} />
            <Cyl pos={[0, 0.95, 0]} r={0.75} h={0.12} color="#e9ecef" solid={false} />
            <group ref={aguja} position={[0, 1.05, 0]}>
              <Block pos={[0, 0, -0.3]} size={[0.1, 0.05, 0.6]} color="#e63946" solid={false} />
              <Block pos={[0, 0, 0.3]} size={[0.1, 0.05, 0.6]} color="#457b9d" solid={false} />
            </group>
            <Plate pos={[0, 0.55, 0.13]} text="Compará carta y viento" h={0.22} bg="#1d3557" />
          </>
        )}
        {i === 2 && (
          <>
            <Block pos={[0, 0.4, 0]} size={[1.2, 0.8, 0.08]} color="#a98467" mat="wood" solid={false} />
            <Plate pos={[0, 0.55, 0.05]} text="Aula del dosel" h={0.2} bg="#386641" />
            <group ref={hoja} position={[0, 0.95, 0]} rotation={[-1.1, 0, 0]}>
              <Block pos={[0, 0, 0]} size={[1.6, 0.04, 0.9]} color="#52b788" mat="leaf" solid={false} />
              <Block pos={[0, 0.02, 0]} size={[1.5, 0.02, 0.05]} color="#2d6a4f" solid={false} />
              <Cyl pos={[0, -0.45, 0]} r={0.03} h={0.9} color="#b08968" solid={false} />
            </group>
          </>
        )}
      </group>
      <Interactable
        pos={pos}
        radius={1.8}
        label={i === 0 ? 'Prendé el escáner' : i === 1 ? 'Mirá la brújula' : 'Abrí la sombrilla'}
        icon="✨"
        onUse={usar}
      />
    </>
  );
}
export function GraciasADiosDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <Locura key={p.id} indice={i} altura={altura(p.pos[0], p.pos[1])} />
      ))}
    </>
  );
}
export const cercaDeLocura = (x: number, z: number) => puntos.some((p) => Math.hypot(x - p.pos[0], z - p.pos[1]) < 4.5);
