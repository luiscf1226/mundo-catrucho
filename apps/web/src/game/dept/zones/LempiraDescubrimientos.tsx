import { useRef, useState } from 'react';
import type { Group } from 'three';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Interactable, Label, useTick } from '../../kit';
import puntos from './lempira-puntos.json';

const juegos = [
  'barro-de-la-campa',
  '',
  '',
  'la-pausa-tambien-cuenta',
  '',
  'colohete-por-capas',
  'sendero-de-celaque',
  'opalo-de-erandique',
  'la-olla-salio-con-cintura',
  'la-pausa-tambien-cuenta',
  'colohete-por-capas',
];
export const posicionLempira = (i: number): [number, number, number] => [puntos[i].pos[0], 0, puntos[i].pos[1]];
function Punto({ indice: i, altura }: { indice: number; altura: number }) {
  const p = puntos[i],
    pos = posicionLempira(i),
    [visto, ver] = useState(false),
    [paso, avanzar] = useState(0),
    g = useRef<Group>(null),
    viaje = useRef(-1),
    vista = useRef(false);
  pos[1] = altura;
  useTick((dt, t) => {
    if (vista.current && !useGame.getState().dialog) {
      player.fixedCam = null;
      vista.current = false;
    }
    if (viaje.current >= 0) {
      viaje.current += dt;
      const f = Math.min(1, viaje.current / 5);
      player.teleport(
        pos[0] + Math.sin(f * Math.PI) * 3,
        pos[1] + Math.sin(f * Math.PI) * 3,
        pos[2] - Math.sin(f * Math.PI) * 3,
      );
      if (f === 1) {
        viaje.current = -1;
        player.control = true;
        avanzar(1);
        useGame.getState().toast('¡Recorrido con guía listo! Sacá tu postal.', '📷');
      }
    }
    if (g.current && i >= 8) {
      g.current.rotation.y = t * 0.4;
      if (i === 8) g.current.scale.y = 1 + Math.sin(t * 3) * 0.2;
    }
    if (visto || useGame.getState().dialog || Math.hypot(player.pos[0] - pos[0], player.pos[2] - pos[2]) > 1.5) return;
    ver(true);
    useGame.getState().showDialog({ title: p.nombre, text: p.texto, icon: i < 8 ? '📍' : '✨' });
  });
  function usar() {
    if (juegos[i]) {
      useGame.getState().startJuego(`lempira.${juegos[i]}`);
      return;
    }
    avanzar(paso + 1);
    if (i === 1) useGame.getState().toast('¡Decoración temporal lista, afuera del templo!', '🎨');
    if (i === 2) {
      if (paso === 0) {
        viaje.current = 0;
        player.control = false;
      }
      player.play('wave', 1);
      useGame
        .getState()
        .toast(paso === 0 ? 'Guía listo. Seguí el cable virtual hasta el mirador.' : '¡Postal del cañón lista!', '📷');
    }
    if (i === 4) {
      player.fixedCam = { pos: [18, 23, 25], target: [0, 8, -20], fov: 55 };
      vista.current = true;
      useGame.getState().showDialog({
        title: 'Vista desde el fuerte',
        text: 'Buscaste el ángulo de Gracias. Cerrá y seguí caminando.',
        icon: '📷',
      });
    }
  }
  return (
    <>
      <group position={pos}>
        <Cyl pos={[0, 0.05, 0]} r={0.9} h={0.1} color={visto ? '#9bc693' : '#eccd83'} mat="sand" solid={false} />
        <Label pos={[0, 2.2, 0]} text={`${visto ? '✓' : '📍'} ${p.nombre}`} h={0.2} />
        <group ref={g}>
          {i === 0 || i === 8 ? (
            <Cyl pos={[0, 0.7, 0]} r={0.45} rTop={0.25} h={0.8} color="#b77c55" mat="stone" solid={false} />
          ) : i === 3 || i === 9 ? (
            <Ball pos={[0, 0.8, 0]} r={0.45} color="#a5e3df" mat="glass" />
          ) : i === 7 ? (
            <Ball pos={[0, 0.8, 0]} r={0.4} color="#a48ade" mat="glass" />
          ) : (
            <Block
              pos={[0, 0.7, 0]}
              size={[1, 0.6, 0.2]}
              color={paso ? '#bd8069' : '#e4cf98'}
              mat="cloth"
              solid={false}
            />
          )}
        </group>
        {i === 2 && <Block pos={[0, 2.8, 0]} size={[0.05, 0.05, 3]} color="#5f6868" mat="metal" solid={false} />}
        {i === 9 && <Label pos={[0, 1.4, 0]} text="Medalla de jabón" h={0.2} />}
        {i === 10 && <Block pos={[0.8, 1.2, 0]} size={[0.15, 0.9, 0.15]} color="#af8051" mat="wood" solid={false} />}
      </group>
      <Interactable
        pos={pos}
        radius={1.6}
        label={
          juegos[i]
            ? 'Probá el taller'
            : i === 1
              ? 'Prepará la decoración'
              : i === 2
                ? paso
                  ? 'Fotografiá el cañón'
                  : 'Recorré con guía'
                : 'Buscá el ángulo'
        }
        icon="✨"
        onUse={usar}
      />
    </>
  );
}
export function LempiraDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <Punto key={p.id} indice={i} altura={altura(p.pos[0], p.pos[1])} />
      ))}
    </>
  );
}
