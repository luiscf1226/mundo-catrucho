// Tegucigalpa de bolsillo en 3D: la ciudad que comparten el taxi y el asaltante (la cuadrícula está en calles.ts).
import { memo, useLayoutEffect, useRef } from 'react';
import { phys } from '../../../../core/phys';
import { player } from '../../../../core/player';
import { useGame } from '../../../../core/store';
import type { V3 } from '../../../../core/types';
import { Build } from '../../../dept/lib';
import { art, Block, Cyl, Ground, Label, P, Spawn, useTick } from '../../../kit';
import type { HillDef } from '../../../kit/art/types';
import { BORDE, CALLES, CUADRAS, ESPECIALES, LUGARES, MEDIA_CUADRA } from './calles';
import { type Edificio, obrasCiudad } from './obras';

const PALETA = ['#f1e3c8', '#e9c46a', '#a8dadc', '#f4a261', '#e5e5e5', '#cdb4db', '#b7e4c7', '#ffd6a5'];
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

/** Toma la cámara de seguir al jugador y encierra la ciudad. `esperando` = todavía corre la cuenta regresiva. */
export function useCiudad(esperando: () => boolean) {
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
  // el jugador no se mueve en la tarjeta ni durante la cuenta regresiva: el carro queda clavado en su sitio
  const fijo = useRef<[number, number] | null>(null);
  useTick(() => {
    if (useGame.getState().mg?.phase === 'playing' && !esperando()) {
      fijo.current = null;
      return;
    }
    player.control = false;
    const v = player.vehicle;
    if (!v) return;
    v.speed = 0;
    fijo.current ??= [player.pos[0], player.pos[2]];
    player.pos[0] = fijo.current[0];
    player.pos[2] = fijo.current[1];
  });
}

/** En HD: la ciudad con detalle (obras.ts) en una sola malla; las colisiones son las mismas de antes. */
const OBRAS = art.fused ? obrasCiudad(EDIFICIOS) : null;
const CERROS_HD: HillDef[] = [
  [-80, -90, 34],
  [0, -110, 42],
  [90, -80, 30],
  [110, 20, 26],
  [-110, 30, 28],
  [-60, 110, 24],
  [60, 110, 26],
].map(([x, z, h], i) => ({ p: [x, -1, z], r: h * 1.4, h, c: i % 2 ? '#6c8a5b' : '#7d9a64', seed: i * 13 + 5 }));
/** la ciudad de siempre (paquete sin malla fusionada) */
function Sencilla() {
  return (
    <>
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
    </>
  );
}

export const Ciudad = memo(function Ciudad({ noche = false, spawn }: { noche?: boolean; spawn: [V3, number] }) {
  return (
    <>
      <Spawn pos={spawn[0]} yaw={spawn[1]} />
      <art.SkyRig time={noche ? 'noche' : 'dia'} weather="despejado" shadowRadius={40} />
      {/* calles y aceras */}
      <Ground size={260} color="#5b6b4c" mat="grass" />
      <Ground size={BORDE * 2 + 6} y={0.02} color="#4b4f57" mat="asphalt" />
      {OBRAS ? (
        <>
          <Build pieces={OBRAS} />
          <P.Fountain pos={[-12, 0.2, -9]} />
          <P.Statue pos={[-7, 0.2, -8]} />
          <P.Tree pos={[-16.5, 0.2, -7]} seed={2} />
          <P.Stall pos={[-40, 0.2, 38]} sign="Mercado" />
          <P.Stall pos={[-33, 0.2, 38]} />
        </>
      ) : (
        <Sencilla />
      )}
      {/* rótulos de los lugares, sobre la acera, mirando a la calle */}
      {LUGARES.map((l) => (
        <Label key={l.nombre} pos={[l.x, 7.5, l.z - 4.8]} text={l.nombre} h={0.75} fg={l.color} />
      ))}
      {/* cerros que rodean el valle, con el Cristo del Picacho */}
      {OBRAS && art.Hills && <art.Hills hills={CERROS_HD} />}
      {!(OBRAS && art.Hills) &&
        [
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
