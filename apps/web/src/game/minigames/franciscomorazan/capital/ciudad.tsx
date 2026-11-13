// Tegucigalpa de bolsillo: una cuadrícula de calles que comparten el taxi y el asaltante.
import { memo, useLayoutEffect } from 'react';
import { phys } from '../../../../core/phys';
import { player } from '../../../../core/player';
import { useGame } from '../../../../core/store';
import type { V3 } from '../../../../core/types';
import { art, Block, Cyl, Ground, Label, P, Spawn, useTick } from '../../../kit';

/** calles cada 24 m, de -48 a 48 en x y en z; las cuadras quedan en ±12 y ±36 */
export const CALLES = [-48, -24, 0, 24, 48];
export const CUADRAS = [-36, -12, 12, 36];
export const ANCHO_CALLE = 9;
export const BORDE = 54;
const MEDIA_CUADRA = (24 - ANCHO_CALLE) / 2;

export interface Lugar {
  nombre: string;
  /** punto en la calle frente al lugar */
  x: number;
  z: number;
  color: string;
}
/** cada lugar está en la calle al sur de su cuadra (cuadra + 12 en z) */
const lugar = (nombre: string, cx: number, cz: number, color: string): Lugar => ({ nombre, x: cx, z: cz + 12, color });
export const LUGARES: Lugar[] = [
  lugar('Parque Central', -12, -12, '#ffd166'),
  lugar('Estadio Nacional', 36, -36, '#4cc9f0'),
  lugar('Mercado San Isidro', -36, 36, '#f77f00'),
  lugar('Bulevar Morazán', 36, 12, '#c77dff'),
  lugar('Colonia Kennedy', -36, -36, '#80ed99'),
  lugar('Ciudad Universitaria', 12, 36, '#ff6b6b'),
  lugar('Paseo Liquidámbar', -12, 12, '#f4a261'),
  lugar('Basílica de Suyapa', 36, 36, '#90e0ef'),
  lugar('Barrio La Hoya', 12, -36, '#e9c46a'),
  lugar('El Obelisco', -36, 12, '#ade8f4'),
];
const ESPECIALES = new Set(['-12,-12', '36,-36', '-36,36', '36,36']);

/** ¿el punto cae dentro del edificio de una cuadra? (sirve para que los NPC no atraviesen paredes) */
export function enEdificio(x: number, z: number, margen = 0.6) {
  const m = MEDIA_CUADRA - 1.2 + margen;
  return CUADRAS.some((cx) => Math.abs(x - cx) < m) && CUADRAS.some((cz) => Math.abs(z - cz) < m);
}
/** Punto al azar sobre una calle, lejos de los cruces: `x, z` en el carril y `ax, az` en la acera de al lado. */
export function parada(r: () => number) {
  const linea = CALLES[Math.floor(r() * CALLES.length)],
    lado = r() < 0.5 ? -1 : 1;
  let largo = 0;
  for (let i = 0; i < 12; i++) {
    largo = -BORDE + 6 + r() * (BORDE * 2 - 12);
    if (CALLES.every((c) => Math.abs(c - largo) > ANCHO_CALLE / 2 + 2)) break;
  }
  return r() < 0.5
    ? { x: linea + lado * 2.2, z: largo, ax: linea + lado * 5.6, az: largo }
    : { x: largo, z: linea + lado * 2.2, ax: largo, az: linea + lado * 5.6 };
}
export const rumbo = (dx: number, dz: number) => {
  const a = (Math.atan2(dx, -dz) * 180) / Math.PI;
  const nombres = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
  return nombres[Math.round(((a + 360) % 360) / 45) % 8];
};

const PALETA = ['#f1e3c8', '#e9c46a', '#a8dadc', '#f4a261', '#e5e5e5', '#cdb4db', '#b7e4c7', '#ffd6a5'];
type Edificio = { pos: V3; size: V3; color: string; mat: 'stucco' | 'concrete' | 'brick' | 'glass' };
function edificios(): Edificio[] {
  const lista: Edificio[] = [];
  let i = 0;
  for (const cx of CUADRAS)
    for (const cz of CUADRAS) {
      i++;
      if (ESPECIALES.has(`${cx},${cz}`)) continue;
      const alto = 5 + ((i * 7) % 6) * 2.4,
        lado = 2 * (MEDIA_CUADRA - 1.2),
        mat = (['stucco', 'concrete', 'brick', 'glass'] as const)[i % 4];
      if (i % 3 === 0) {
        // dos edificios en la cuadra: uno alto y uno bajo
        lista.push({
          pos: [cx - lado / 4, alto * 0.65, cz],
          size: [lado / 2, alto * 1.3, lado],
          color: PALETA[i % 8],
          mat,
        });
        lista.push({
          pos: [cx + lado / 4, 2.4, cz],
          size: [lado / 2, 4.8, lado],
          color: PALETA[(i + 3) % 8],
          mat: 'stucco',
        });
      } else lista.push({ pos: [cx, alto / 2, cz], size: [lado, alto, lado], color: PALETA[i % 8], mat });
    }
  return lista;
}
const EDIFICIOS = edificios();

/** Toma la cámara de seguir al jugador y encierra la ciudad. `noche` cambia el cielo. */
export function useCiudad() {
  useLayoutEffect(() => {
    phys.limit = { minX: -BORDE, maxX: BORDE, minZ: -BORDE, maxZ: BORDE };
    phys.killY = -20;
    player.fixedCam = null;
    player.visible = true;
    player.camDist = 9;
    player.camPitch = 0.42;
    return () => {
      phys.limit = null;
    };
  }, []);
  // el jugador solo se mueve cuando corre el reloj (no en la tarjeta ni en la cuenta regresiva)
  useTick(() => {
    const mg = useGame.getState().mg;
    if (mg?.phase !== 'playing') {
      player.control = false;
      if (player.vehicle) player.vehicle.speed = 0;
    }
  });
}

export const Ciudad = memo(function Ciudad({ noche = false, spawn }: { noche?: boolean; spawn: [V3, number] }) {
  return (
    <>
      <Spawn pos={spawn[0]} yaw={spawn[1]} />
      <art.SkyRig time={noche ? 'noche' : 'dia'} weather="despejado" shadowRadius={40} />
      {/* calles y aceras */}
      <Ground size={260} color="#5b6b4c" mat="grass" />
      <Ground size={BORDE * 2 + 6} y={0.02} color="#4b4f57" mat="asphalt" />
      {CUADRAS.flatMap((cx) =>
        CUADRAS.map((cz) => (
          <Block
            key={`${cx},${cz}`}
            pos={[cx, 0.1, cz]}
            size={[2 * MEDIA_CUADRA, 0.2, 2 * MEDIA_CUADRA]}
            color={ESPECIALES.has(`${cx},${cz}`) ? '#d9d2c2' : '#a7a39b'}
            mat={ESPECIALES.has(`${cx},${cz}`) ? 'tile' : 'concrete'}
            solid={false}
            cast={false}
          />
        )),
      )}
      {/* rayas del centro de la calle */}
      {CALLES.map((c) => (
        <group key={c}>
          <Block
            pos={[c, 0.05, 0]}
            size={[0.25, 0.02, BORDE * 2]}
            color="#f2d14b"
            mat="plastic"
            solid={false}
            cast={false}
          />
          <Block
            pos={[0, 0.05, c]}
            size={[BORDE * 2, 0.02, 0.25]}
            color="#f2d14b"
            mat="plastic"
            solid={false}
            cast={false}
          />
        </group>
      ))}
      {EDIFICIOS.map((e, i) => (
        <Block key={i} pos={e.pos} size={e.size} color={e.color} mat={e.mat} />
      ))}
      {/* Parque Central con la Catedral */}
      <Block pos={[-12, 3, -16]} size={[8, 6, 4]} color="#f4f1ea" mat="stucco" />
      <Cyl pos={[-15, 5, -16]} r={1.1} h={10} color="#f4f1ea" mat="stucco" />
      <Cyl pos={[-9, 5, -16]} r={1.1} h={10} color="#f4f1ea" mat="stucco" />
      <Cyl pos={[-12, 7.2, -16]} r={1.6} rTop={0.2} h={2.6} color="#c9a227" mat="roof" />
      <P.Fountain pos={[-12, 0.2, -9]} />
      <P.Statue pos={[-7, 0.2, -8]} />
      <P.Tree pos={[-16.5, 0.2, -7]} seed={2} />
      {/* Estadio Nacional */}
      <Cyl pos={[36, 3, -36]} r={6.6} h={6} color="#d9d9d9" mat="concrete" sides={20} />
      <Cyl pos={[36, 6.2, -36]} r={6.9} rTop={7.4} h={0.5} color="#2a6fdb" mat="plastic" solid={false} sides={20} />
      {/* Mercado San Isidro */}
      <P.Stall pos={[-40, 0.2, 38]} sign="Mercado" />
      <P.Stall pos={[-33, 0.2, 38]} />
      <Block pos={[-36, 2.5, 32]} size={[11, 5, 4]} color="#e76f51" mat="brick" />
      {/* Basílica de Suyapa */}
      <Block pos={[36, 4, 34]} size={[7, 8, 7]} color="#f8f9fa" mat="stucco" />
      <Cyl pos={[33, 7, 38]} r={0.9} rTop={0.1} h={14} color="#f8f9fa" mat="stucco" />
      <Cyl pos={[39, 7, 38]} r={0.9} rTop={0.1} h={14} color="#f8f9fa" mat="stucco" />
      {/* rótulos de los lugares, sobre la acera, mirando a la calle */}
      {LUGARES.map((l) => (
        <Label key={l.nombre} pos={[l.x, 7.5, l.z - 4.8]} text={l.nombre} h={0.75} fg={l.color} />
      ))}
      {/* cerros que rodean el valle, con el Cristo del Picacho */}
      {[
        [-80, -90, 34],
        [0, -110, 42],
        [90, -80, 30],
        [110, 20, 26],
        [-110, 30, 28],
        [-60, 110, 24],
        [60, 110, 26],
      ].map(([x, z, h], i) => (
        <Cyl
          key={i}
          pos={[x, h / 2 - 1, z]}
          r={h * 1.4}
          rTop={h * 0.15}
          h={h}
          color={i % 2 ? '#6c8a5b' : '#7d9a64'}
          mat="grass"
          solid={false}
          cast={false}
        />
      ))}
      <P.Statue pos={[0, 41, -110]} scale={3} solid={false} />
      {[-30, 0, 30].map((x) => (
        <P.Lamp key={x} pos={[x + 5.2, 0.2, -5.2]} />
      ))}
    </>
  );
});
