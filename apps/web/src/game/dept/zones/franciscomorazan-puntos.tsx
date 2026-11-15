import { useState } from 'react';
import { useGame } from '../../../core/store';
import type { V3 } from '../../../core/types';
import { Ball, Block, Cyl, Interactable, Label } from '../../kit';
import puntos from './franciscomorazan-puntos.json';
export function PuntosFM({ altura }: { altura: (x: number, z: number) => number }) {
  return (
    <>
      {puntos.map((p, i) => p.tipo === 'locura' && <Punto key={p.id} p={p} i={i} pos={[p.x, altura(p.x, p.z), p.z]} />)}
    </>
  );
}
function Punto({ p, i, pos }: { p: (typeof puntos)[number]; i: number; pos: V3 }) {
  const [activo, activar] = useState(false);
  return (
    <group position={pos}>
      <Cyl pos={[0, 0.15, 0]} r={1.5} h={0.3} color="#ddb970" mat="stone" solid={false} />
      <Label pos={[0, 3.3, 0]} text={p.nombre} h={0.35} />
      {p.tipo === 'lugar' ? (
        <>
          <Block pos={[0, 0.9, 0]} size={[1.7, 1.5, 0.2]} color="#31664f" mat="wood" solid={false} />
          <Label pos={[0, 1.3, 0.15]} text="Acercate y conocé" h={0.22} />
        </>
      ) : i === 6 ? (
        <>
          <Cyl pos={[0, 1, 0]} r={0.35} h={1.6} color="#e9a2cf" mat="plastic" solid={false} />
          <Label pos={[0, 2.2, 0]} text={activo ? 'Topogigio' : 'Charamusca'} h={0.3} />
          <Block
            pos={[0, 1.9, 0]}
            size={[0.8, 0.2, 0.7]}
            color={activo ? '#60cbe9' : '#ffc857'}
            mat="cloth"
            solid={false}
          />
        </>
      ) : i === 7 ? (
        <>
          <Cyl pos={[0, 0.65, 0]} r={0.55} h={0.8} color="#f4efe4" mat="plastic" solid={false} />
          <group position={activo ? [0, 1.1, 0] : [1, 1.7, 0]}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
              <Ball
                key={j}
                pos={[Math.sin((j * Math.PI) / 4) * 0.4, 0, Math.cos((j * Math.PI) / 4) * 0.4]}
                r={0.15}
                color="#ca904b"
                mat="sand"
              />
            ))}
          </group>
        </>
      ) : (
        <group rotation-z={activo ? 0 : 0.16}>
          {[-0.7, 0, 0.7].map((x, j) => (
            <Block
              key={x}
              pos={[x, 0.8 + j * 0.25, 0]}
              size={[0.5, 1.3 + j * 0.5, 0.5]}
              color="#b5cbdf"
              mat="cloth"
              solid={false}
            />
          ))}
        </group>
      )}
      <Interactable
        pos={[pos[0], pos[1], pos[2] + 1]}
        marker={false}
        radius={2.2}
        label={`${p.tipo === 'locura' ? 'Activar' : 'Conocer'}: ${p.nombre}`}
        icon={p.tipo === 'locura' ? '✨' : '📍'}
        onUse={() => {
          activar(!activo);
          useGame.getState().showDialog({ title: p.nombre, text: p.texto, icon: p.tipo === 'locura' ? '✨' : '📍' });
        }}
      />
    </group>
  );
}
