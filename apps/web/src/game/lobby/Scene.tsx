import { useLayoutEffect, useState } from 'react';
import { phys } from '../../core/phys';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import type { V3 } from '../../core/types';
import { DecoracionEventos } from '../eventos/Decoracion';
import { art, Interactable, Label, P, Spawn } from '../kit';
import { enterVehicle } from '../PlayerController';
import { Baked } from './Baked';
import { Forest } from './Forest';
import { MapaHonduras } from './Mapa';
import { MapBoard } from './MapBoard';
import { Paseo } from './Paseo';
import { groundAt, LIMIT, SPAWN } from './terrain';
import { Vista } from './Vista';
import { World } from './World';
export function LobbyScene() {
  useLayoutEffect(() => {
    phys.limit = LIMIT;
    phys.ground = groundAt;
    phys.killY = -8;
  }, []);
  const [taxi, setTaxi] = useState<{ pos: V3; yaw: number; parked: boolean }>({
    pos: [-23, 0.18, 119],
    yaw: 0,
    parked: true,
  });
  return (
    <>
      <art.SkyRig time="auto" weather="despejado" fogFar={650} shadowRadius={65} />
      <Spawn pos={SPAWN} />
      <World />
      <DecoracionEventos dept={null} pos={SPAWN} />
      <Vista />
      <MapBoard />
      <MapaHonduras />
      <Forest />
      {art.GroundCover && <art.GroundCover />}
      <Paseo />
      <Baked>
        <P.Bus pos={[-72, 0.18, 111]} color="#eebc36" solid={false} />
        <group position={[-61, 0.18, 111]} scale={[0.7, 0.85, 0.7]}>
          <P.Bus pos={[0, 0, 0]} color="#e9e4d5" solid={false} />
        </group>
        <P.Car pos={[-34, 0.18, 111]} color="#ffd33d" solid={false} />
        <P.Stall pos={[-16, 0.18, 131]} sign="Tienda" solid={false} />
        <P.House pos={[-33, 0.18, 134]} w={5} d={4} sign="Ropero" color="#d6a775" solid={false} />
        <P.Sign pos={[-77, 0.18, 122]} text="Mapa de Honduras" w={6} />
        <P.Flag pos={[-85, 0.18, 117]} height={8} />
      </Baked>
      <Label pos={[-60, 6.8, 111]} text="TERMINAL DE BUSES" h={1.4} />
      <Label pos={[-61, 4.7, 111]} text="Rapidito · taxi · bus amarillo" h={0.7} />
      {[-72, -61, -34].map((x) => (
        <Interactable
          key={x}
          pos={[x, 0.18, 115]}
          radius={2.8}
          label="Viajar"
          icon="🚌"
          onUse={() => useGame.getState().openPanel('transporte')}
        />
      ))}
      <Interactable
        pos={[-77, 0.18, 124]}
        radius={2.5}
        label="Ver mapa de Honduras"
        icon="🗺️"
        onUse={() => useGame.getState().openPanel('mapa')}
      />
      <Interactable
        pos={[-16, 0.18, 134]}
        radius={2.5}
        label="Entrar a la tienda"
        icon="🛍️"
        onUse={() => useGame.getState().openPanel('tienda')}
      />
      <Interactable
        pos={[-33, 0.18, 138]}
        radius={2.5}
        label="Abrir el ropero"
        icon="👕"
        onUse={() => useGame.getState().openPanel('personaje')}
      />
      {taxi.parked && (
        <>
          <P.Mototaxi pos={taxi.pos} rot={taxi.yaw} solid={false} />
          <Interactable
            pos={[taxi.pos[0] + 2, taxi.pos[1], taxi.pos[2]]}
            radius={1.8}
            label="Manejar el mototaxi"
            onUse={() => {
              player.teleport(...taxi.pos, taxi.yaw);
              setTaxi({ ...taxi, parked: false });
              enterVehicle('Mototaxi', () => {
                const pos: V3 = [
                  player.pos[0] - Math.cos(player.yaw) * 2,
                  groundAt(player.pos[0], player.pos[2]),
                  player.pos[2] + Math.sin(player.yaw) * 2,
                ];
                setTaxi({ pos, yaw: player.yaw, parked: true });
              });
            }}
          />
        </>
      )}
    </>
  );
}
