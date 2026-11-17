import { useRef, useState } from 'react';
import type { Group } from 'three';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Interactable, Label, useTick } from '../../kit';
import { reaccionLocura } from '../../reacciones';
import puntos from './intibuca-puntos.json';

function Punto({ indice }: { indice: number }) {
  const p = puntos[indice];
  const [x, y, z] = p.pos;
  const [hecho, hacer] = useState(false);
  const g = useRef<Group>(null);
  const calma = useRef(0);
  const anterior = useRef<[number, number]>([0, 0]);
  useTick((_dt, t) => {
    const cerca = Math.hypot(player.pos[0] - x, player.pos[2] - z) < 3;
    const quieto = Math.hypot(player.pos[0] - anterior.current[0], player.pos[2] - anterior.current[1]) < 0.01;
    calma.current = cerca && quieto ? calma.current + _dt : 0;
    anterior.current = [player.pos[0], player.pos[2]];
    if (g.current && hecho) {
      g.current.rotation.y = Math.sin(t) * 0.25;
      if (indice === 5) g.current.position.x = Math.sin(t) * 1.5;
    }
  });
  const usar = () => {
    if (indice === 1 && calma.current < 2) {
      useGame.getState().toast('Quedate quieto y esperá a que se calme el reflejo.', '📷');
      return;
    }
    hacer(true);
    if (p.id.includes('locura')) reaccionLocura();
    if (indice === 3) useGame.getState().startJuego('intibuca.tela-del-mercado-lenca');
    else
      useGame.getState().showDialog({
        title: p.nombre,
        text:
          indice === 2
            ? 'El instructor identificó esta porción virtual. ¡Probala solo aquí!'
            : indice === 5
              ? '¡Decorado listo! Acompañá la comparsa virtual.'
              : indice === 4 || indice === 7
                ? 'Relato de Chiligatoro: el toro de sombra saluda desde su maqueta. Es una leyenda.'
                : indice === 8
                  ? 'La ficha va al experto. Nunca decidás consumo de hongos reales.'
                  : indice === 9
                    ? '¡Patrón completo! La bufanda fantástica abraza la mesa.'
                    : '¡Postal virtual lista! Mirá las dos plazas desde el altiplano.',
        icon: '✨',
      });
  };
  return (
    <>
      <group position={[x, y, z]}>
        <Cyl pos={[0, 0.04, 0]} r={1.5} h={0.08} color={hecho ? '#8cb88a' : '#d7b978'} solid={false} />
        <Label pos={[0, 2.8, -0.5]} text={p.nombre} h={0.28} />
        <Block pos={[0, 0.7, 0]} size={[2, 0.2, 1.6]} color="#b18b66" mat="wood" solid={false} />
        {indice === 1 && (
          <>
            <Cyl pos={[0, 0.03, -3]} r={3} h={0.08} color="#6495ac" mat="water" solid={false} />
            <Label pos={[0, 1.5, -3]} text={hecho ? 'Postal del reflejo ✓' : 'Esperá quieto · 2 segundos'} h={0.25} />
          </>
        )}
        <group ref={g}>
          {indice === 4 || indice === 7 ? (
            <>
              <Block pos={[0, 1.1, 0]} size={[1.3, 0.2, 1]} color="#5a93ac" mat="water" solid={false} />
              {hecho && (
                <>
                  <Ball pos={[0, 1.5, 0]} r={0.38} color="#252c39" />
                  {[-1, 1].map((i) => (
                    <Block key={i} pos={[i * 0.25, 1.8, 0]} size={[0.1, 0.3, 0.1]} color="#dad8cf" solid={false} />
                  ))}
                  <Label pos={[0, 2.3, 0]} text="Leyenda · ¡Hola!" h={0.24} />
                </>
              )}
            </>
          ) : indice === 8 || indice === 2 ? (
            <>
              <Cyl pos={[0, 1.1, 0]} r={0.16} h={0.7} color="#f0e3d1" solid={false} />
              <group scale={[1, 0.35, 1]}>
                <Ball pos={[0, 4.2, 0]} r={0.6} color="#d49d63" />
              </group>
              {hecho && <Label pos={[0.5, 2, 0]} text="Ficha al experto" h={0.25} />}
            </>
          ) : indice === 3 || indice === 9 ? (
            <>
              <Block pos={[0, 1, 0]} size={[1.6, 0.08, 0.7]} color="#9868a7" mat="cloth" solid={false} />
              {hecho && <Block pos={[0, 0.7, 0.8]} size={[2.3, 0.5, 0.15]} color="#9868a7" mat="cloth" solid={false} />}
            </>
          ) : (
            <Block pos={[0, 1.1, 0]} size={[0.8, 0.5, 0.7]} color="#afc6be" solid={false} />
          )}
        </group>
      </group>
      <Interactable
        pos={[x, y, z + 1.5]}
        radius={2}
        label={
          indice === 3
            ? 'Probá frente y reverso'
            : indice === 4
              ? 'Animá el relato (opcional)'
              : indice === 5
                ? 'Montá el decorado'
                : indice === 2
                  ? 'Probá la porción virtual'
                  : 'Prepará tu postal o maqueta'
        }
        icon="✨"
        onUse={usar}
      />
    </>
  );
}
export function IntibucaDescubrimientos() {
  return <>{puntos.map((p, i) => i >= 7 && <Punto key={p.id} indice={i} />)}</>;
}
