import { type ReactNode, useLayoutEffect } from 'react';
import { input } from '../../../core/input';
import { player } from '../../../core/player';
import { art, Block, Ground, Label, Spawn } from '../../kit';
export function Mesa({ nombre, aviso, children }: { nombre: string; aviso: string; children: ReactNode }) {
  useLayoutEffect(() => {
    player.control = false;
    player.fixedCam = { pos: [0, 11, 15], target: [0, 1, 0], fov: 52 };
    return () => {
      player.control = true;
      player.fixedCam = null;
    };
  }, []);
  return (
    <>
      <art.SkyRig time="dia" shadowRadius={22} />
      <Ground size={60} color="#66896a" mat="grass" />
      <Spawn pos={[-6, 0, 3]} />
      <Block pos={[0, 0.5, 0]} size={[9, 1, 7]} mat="wood" color="#694b35" solid={false} />
      <Label pos={[0, 5, -3]} text={nombre} h={0.6} />
      <Label pos={[0, 4, -3]} text={aviso} h={0.32} fg="#ffe9a1" />
      {children}
    </>
  );
}

export const cursorInicial = () => ({ x: input.px, y: input.py });
export function movioPuntero(cursor: { x: number; y: number }) {
  const cambio = cursor.x !== input.px || cursor.y !== input.py || input.pointerDown;
  cursor.x = input.px;
  cursor.y = input.py;
  return cambio && Math.abs(input.mx) < 0.1 && Math.abs(input.mz) < 0.1;
}
