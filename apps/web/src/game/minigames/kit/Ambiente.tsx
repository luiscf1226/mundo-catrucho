import { useThree } from '@react-three/fiber';
import { createContext, useContext, useLayoutEffect } from 'react';
import { player } from '../../../core/player';
import type { MinigameId } from '../../../core/types';
import { Block, Cyl, P } from '../../kit';
import type { MatKind } from '../../kit/art/types';
import { Escenario, type Fondo } from '../corte/common';

const fondos: Record<string, Fondo> = {
  rosquilla: 'pueblo',
  baleada: 'mercado',
  artesania: 'pueblo',
  repartidor: 'ciudad',
  niebla: 'montana',
  batea: 'rio',
  arreo: 'finca',
  calcita: 'cueva',
  cuajada: 'finca',
  postura: 'montana',
  tablas: 'finca',
  chuco: 'mercado',
  gruas: 'costa',
  cortina: 'rio',
  garitas: 'ruinas',
  merendon: 'montana',
  cusuco: 'selva',
  topo: 'ciudad',
};
export function fondoMotor(id: MinigameId, tema: unknown, fondo?: Fondo): Fondo {
  if (
    typeof tema === 'string' &&
    [
      'costa',
      'montana',
      'valle',
      'pueblo',
      'ciudad',
      'lago',
      'selva',
      'cueva',
      'estadio',
      'mar',
      'rio',
      'finca',
      'mercado',
      'ruinas',
      'feria',
    ].includes(tema)
  )
    return tema as Fondo;
  return fondo ?? fondos[id.split('.')[1]] ?? 'pueblo';
}
export const AmbienteContext = createContext<Fondo>('pueblo');
export function useMesaMaterial(): { mat: MatKind; color: string } {
  const fondo = useContext(AmbienteContext);
  if (fondo === 'costa' || fondo === 'ciudad') return { mat: 'concrete', color: '#94a8ad' };
  if (fondo === 'cueva' || fondo === 'ruinas' || fondo === 'rio') return { mat: 'stone', color: '#a4b5b1' };
  if (fondo === 'montana' || fondo === 'selva' || fondo === 'finca') return { mat: 'grass', color: '#83a168' };
  return { mat: 'wood', color: '#d3a367' };
}
export function Ambiente({ fondo }: { fondo: Fondo }) {
  const { size } = useThree();
  useLayoutEffect(() => {
    const aspecto = size.width / size.height;
    const distancia = Math.max(13.8, 6.4 / (Math.tan(Math.PI / 8) * aspecto));
    player.control = false;
    player.visible = false;
    player.fixedCam = { pos: [0, 1 + distancia * 0.74, distancia * 0.67], target: [0, 1, 0], fov: 45 };
    return () => {
      player.control = true;
      player.visible = true;
      player.fixedCam = null;
    };
  }, [size.width, size.height]);
  return (
    <>
      <Escenario fondo={fondo} deck={false} />
      {fondo !== 'ciudad' &&
        fondo !== 'mercado' &&
        fondo !== 'pueblo' &&
        fondo !== 'cueva' &&
        [-1, 0, 1].map((i) => (
          <Cyl
            key={i}
            pos={[i * 18, 2, -29 - Math.abs(i) * 3]}
            r={14}
            rTop={2}
            h={11 + Math.abs(i) * 4}
            color={fondo === 'costa' ? '#639c9c' : '#628879'}
            mat="stone"
            solid={false}
            cast={false}
          />
        ))}
      {(fondo === 'pueblo' || fondo === 'mercado') && (
        <>
          <P.Stall pos={[-7, 0, -5]} scale={0.8} solid={false} />
          <P.Crate pos={[5, 0, 4]} solid={false} />
        </>
      )}
      {fondo === 'finca' && (
        <>
          <P.Fence pos={[-5, 0, -6]} length={9} solid={false} />
          <P.Fence pos={[5, 0, -6]} length={6} solid={false} />
        </>
      )}
      {fondo === 'rio' && (
        <>
          <Block pos={[-9, 0.1, -2]} size={[4, 0.12, 30]} color="#65b8c8" mat="water" solid={false} />
          <P.Rock pos={[-6, 0, -5]} scale={1.5} solid={false} />
        </>
      )}
      {fondo === 'costa' && (
        <>
          <P.Boat pos={[1, 0, -12]} scale={1.2} solid={false} />
          <P.Barrel pos={[5, 0, 3]} solid={false} />
        </>
      )}
    </>
  );
}
