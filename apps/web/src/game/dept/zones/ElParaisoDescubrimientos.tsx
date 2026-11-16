import { useRef, useState } from 'react';
import type { Group } from 'three';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Interactable, Label, useTick } from '../../kit';
import puntos from './elparaiso-puntos.json';

// Las tres locuras de El Paraíso. Los siete lugares para explorar los pone dept/turismo.tsx desde contenido.json.
const EXAMEN = [
  '¿Qué es una rigua? ¡Pan de yuca! …No, perdón: tortilla gruesa de elote. Revisá la ficha.',
  '¿Cuándo es el Festival del Maíz? ¡En marzo! …Mentira, es en agosto. Hasta yo me equivoco.',
  '¿Qué es tapiscar? ¡Cosechar el maíz! Esta sí me la sabía.',
];
const ACCION = ['Activá el examen', 'Acomodale la corbata', 'Buscale parqueo'];
function Locura({ indice: i, altura }: { indice: number; altura: number }) {
  const p = puntos[i],
    [x, z] = p.pos,
    [veces, usar] = useState(0),
    g = useRef<Group>(null),
    visto = useRef(false);
  useTick((_dt, t) => {
    const s = useGame.getState();
    if (!visto.current && !s.dialog && !s.panel && Math.hypot(player.pos[0] - x, player.pos[2] - z) < 2.2) {
      visto.current = true;
      s.showDialog({ title: p.nombre, text: p.texto, icon: '✨' });
    }
    if (!g.current) return;
    if (i === 0) g.current.rotation.y = Math.sin(t * 1.5) * 0.4;
    if (i === 1) g.current.rotation.z = veces % 2 ? Math.sin(t * 6) * 0.15 : 0;
    if (i === 2) g.current.scale.y = veces % 2 ? 0.55 : 1 + Math.sin(t * 3) * 0.04;
  });
  function accion() {
    usar(veces + 1);
    const s = useGame.getState();
    if (i === 0) s.toast(EXAMEN[veces % EXAMEN.length], '🌽');
    if (i === 1)
      s.toast(veces % 2 ? 'Corbata guardada hasta el desfile.' : '¡Corbata de tusa lista para el desfile!', '👔');
    if (i === 2)
      s.toast(
        veces % 2
          ? 'El caballito se estiró otra vez. ¡Quiere su parqueo!'
          : 'Se dobló para caber en su parqueo de juguete.',
        '🐴',
      );
  }
  return (
    <>
      <group position={[x, altura, z]}>
        <Cyl pos={[0, 0.05, 0]} r={1.1} h={0.1} color="#f6d55c" mat="sand" solid={false} />
        <Label pos={[0, 3, 0]} text={`✨ ${p.nombre}`} h={0.3} />
        <group ref={g}>
          {i === 0 && (
            <>
              <Cyl pos={[0, 1, 0]} r={0.42} rTop={0.28} h={1.6} color="#f6d55c" mat="plastic" solid={false} />
              <Block pos={[-0.38, 0.8, 0]} size={[0.12, 1.2, 0.5]} color="#6aa842" mat="leaf" solid={false} />
              <Block pos={[0.38, 0.8, 0]} size={[0.12, 1.2, 0.5]} color="#6aa842" mat="leaf" solid={false} />
              <Ball pos={[-0.13, 1.45, 0.36]} r={0.07} color="#222222" />
              <Ball pos={[0.13, 1.45, 0.36]} r={0.07} color="#222222" />
              <Block pos={[0.75, 1.3, 0.2]} size={[0.6, 0.45, 0.04]} color="#ffffff" mat="cloth" solid={false} />
              <Label pos={[0.75, 1.3, 0.3]} text="¿?" h={0.25} fg="#1d1d1f" bg="rgba(255,255,255,0)" />
            </>
          )}
          {i === 1 && (
            <>
              <Block pos={[0, 0.55, 0]} size={[0.9, 0.7, 0.6]} color="#cfe39a" mat="leaf" solid={false} />
              <Block pos={[0, 0.6, 0.31]} size={[0.16, 0.5, 0.04]} color="#c9b27a" mat="cloth" solid={false} />
              <Block pos={[0, 0.88, 0.31]} size={[0.32, 0.12, 0.04]} color="#c9b27a" mat="cloth" solid={false} />
              <Ball pos={[-0.18, 0.75, 0.31]} r={0.05} color="#222222" />
              <Ball pos={[0.18, 0.75, 0.31]} r={0.05} color="#222222" />
            </>
          )}
          {i === 2 && (
            <>
              <Block pos={[0, 0.7, 0]} size={[0.08, 1.4, 0.08]} color="#a0703c" mat="wood" solid={false} />
              <Block pos={[0.15, 1.45, 0]} size={[0.45, 0.25, 0.22]} color="#8d5a3a" mat="wood" solid={false} />
              <Block pos={[0, 1.55, -0.05]} size={[0.06, 0.3, 0.2]} color="#2b2b2b" mat="cloth" solid={false} />
            </>
          )}
        </group>
        {i === 2 && (
          <>
            <Block pos={[1.2, 0.03, 0]} size={[0.9, 0.04, 1.4]} color="#3a3f45" mat="asphalt" solid={false} />
            <Label pos={[1.2, 0.6, 0]} text="P" h={0.3} fg="#ffffff" bg="#1d70d6" />
          </>
        )}
      </group>
      <Interactable pos={[x, altura, z + 1]} radius={2} label={ACCION[i]} icon="✨" onUse={accion} />
    </>
  );
}
export function ElParaisoDescubrimientos({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => (
        <Locura key={p.id} indice={i} altura={altura(p.pos[0], p.pos[1])} />
      ))}
    </>
  );
}
