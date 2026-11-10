import { useLayoutEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { audio } from '../../core/audio';
import { SHOP } from '../../core/data';
import { input } from '../../core/input';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import { art, Ball, Block, Ground, Label, P, Plate, useTick } from '../kit';
import {
  createDrive,
  type DriveConfig,
  type DriveState,
  type ObstacleKind,
  stepDrive,
  type VehicleKind,
  vehicles,
} from './model';

export function Vehicle({ kind, bot = false }: { kind: VehicleKind; bot?: boolean }) {
  const v = vehicles[kind],
    water = kind === 'lancha' || kind === 'cayuco';
  const two = kind === 'moto' || kind === 'bici',
    width = two ? 0.65 : kind === 'mototaxi' ? 1.5 : 2.1;
  const tall = kind === 'bus' || kind === 'rapidito' || kind === 'camion';
  if (water)
    return (
      <group>
        <Block pos={[0, 0.35, 0]} size={[1.8, 0.5, v.length]} color={v.color} mat="wood" solid={false} />
        <Block pos={[0, 0.65, -1.8]} size={[1, 0.35, 1]} color={v.color} mat="wood" rot={0.3} solid={false} />
        <Block pos={[0, 0.7, 0]} size={[1.3, 0.15, 2]} color="#694226" mat="wood" solid={false} />
        <Block pos={[0.8, 1, 0.2]} size={[0.12, 0.12, 3]} rot={0.7} color="#dfc596" mat="wood" solid={false} />
        {kind === 'lancha' && (
          <Block pos={[0, 1.8, 0]} size={[2, 0.18, 2.7]} color="#37a9b4" mat="cloth" solid={false} />
        )}
      </group>
    );
  return (
    <group>
      <Block pos={[0, 0.8, 0]} size={[width, 0.75, v.length]} color={v.color} mat="metal" solid={false} />
      <Block
        pos={[0, tall ? 1.8 : 1.35, kind === 'pickup' ? -0.9 : -0.1]}
        size={[width * 0.92, tall ? 1.5 : 0.7, kind === 'pickup' ? 1.6 : v.length * 0.7]}
        color={v.color}
        mat="metal"
        solid={false}
      />
      <Block
        pos={[0, tall ? 2 : 1.55, -v.length * 0.355 - 0.02]}
        size={[width * 0.78, tall ? 0.65 : 0.45, 0.08]}
        color="#234f62"
        mat="glass"
        solid={false}
      />
      <Block
        pos={[0, tall ? 2 : 1.5, v.length * 0.355 + 0.02]}
        size={[width * 0.78, 0.5, 0.08]}
        color="#254c5c"
        mat="glass"
        solid={false}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            pos={[side * width * 0.51, 1.7, 0]}
            size={[0.06, tall ? 0.62 : 0.32, v.length * 0.46]}
            color="#295466"
            mat="glass"
            solid={false}
          />
          {[-1, 1].map((end) => (
            <Block
              key={end}
              pos={[side * width * 0.48, 0.45, end * v.length * 0.31]}
              size={[0.32, 0.7, 0.72]}
              color="#202c38"
              mat="plastic"
              solid={false}
            />
          ))}
          <Block
            pos={[side * width * 0.32, 0.83, -v.length / 2 - 0.04]}
            size={[0.35, 0.25, 0.08]}
            color="#fff5b8"
            mat="neon"
            solid={false}
          />
          <Block
            pos={[side * width * 0.32, 0.83, v.length / 2 + 0.04]}
            size={[0.3, 0.22, 0.08]}
            color="#ff4444"
            mat="neon"
            solid={false}
          />
        </group>
      ))}
      {kind === 'taxi' && (
        <Block pos={[0, 1.9, -0.1]} size={[0.7, 0.25, 0.45]} color="#fff2b8" mat="neon" solid={false} />
      )}
      {kind === 'rapidito' && (
        <>
          <Plate pos={[0, 2.65, -v.length * 0.36 - 0.06]} text="DIOS ES AMOR" h={0.24} rot={Math.PI} bg="#661c45" />
          <Plate pos={[0, 1.25, v.length / 2 + 0.06]} text="EL CHELE · RUTA 504" h={0.26} bg="#451738" />
          <Block pos={[0, 2.67, 0]} size={[2.18, 0.1, 3.8]} color="#46e7ed" mat="neon" solid={false} />
        </>
      )}
      {kind === 'bus' && <Plate pos={[0, 2.6, v.length / 2 + 0.05]} text="ESCOLAR · HONDURAS" h={0.24} bg="#25221b" />}
      {kind === 'pickup' && <P.Crate pos={[0, 1.2, 1.2]} scale={0.8} solid={false} />}
      {two && <Ball pos={[0, 1.8, 0]} r={0.38} color="#e5be97" />}
      {bot && <Label pos={[0, 3.4, 0]} text="🤖 Compa" h={0.36} />}
    </group>
  );
}
function Obstacle({ kind }: { kind: ObstacleKind }) {
  if (kind === 'bache')
    return <Block pos={[0, 0.03, 0]} size={[2.4, 0.04, 1.7]} color="#171f22" mat="dirt" solid={false} />;
  if (kind === 'tumulo')
    return <Block pos={[0, 0.15, 0]} size={[3, 0.3, 0.8]} color="#e4b633" mat="plastic" solid={false} />;
  if (kind === 'ola')
    return <Block pos={[0, 0.2, 0]} size={[3.5, 0.4, 0.7]} color="#d3f5ee" mat="water" solid={false} />;
  if (kind === 'tronco')
    return <Block pos={[0, 0.25, 0]} size={[3.5, 0.6, 0.7]} rot={0.4} color="#73482e" mat="wood" solid={false} />;
  if (kind === 'vaca' || kind === 'perro')
    return (
      <group scale={kind === 'perro' ? 0.55 : 1}>
        <Block
          pos={[0, 0.9, 0]}
          size={[1.8, 0.8, 0.8]}
          color={kind === 'vaca' ? '#eee3c8' : '#a0693d'}
          mat="cloth"
          solid={false}
        />
        <Block pos={[0.9, 1.2, 0]} size={[0.6, 0.65, 0.6]} color="#433c35" mat="cloth" solid={false} />
        {[-0.6, 0.6].flatMap((x) =>
          [-0.26, 0.26].map((z) => (
            <Block
              key={`${x}${z}`}
              pos={[x, 0.3, z]}
              size={[0.17, 0.65, 0.17]}
              color="#483e36"
              mat="wood"
              solid={false}
            />
          )),
        )}
      </group>
    );
  return <Vehicle kind={kind} />;
}
export function DrivingScene({
  config,
  destination,
  biome = 'valle',
  cargo = 'pasajeros',
  onStep,
  modo = 'solo',
}: {
  config: DriveConfig;
  destination: string;
  biome?: string;
  cargo?: string;
  modo?: string;
  onStep: (s: DriveState, dt: number) => void;
}) {
  const s = useMemo(() => createDrive(config), [config]);
  const car = useRef<Group>(null),
    road = useRef<Group>(null),
    sparks = useRef<Group>(null);
  const traffic = useRef<(Group | null)[]>([]),
    stops = useRef<(Group | null)[]>([]);
  const water = config.via === 'mar' || config.via === 'rio',
    city = config.via === 'ciudad';
  const coastal = ['costa', 'isla', 'sur'].includes(biome) || config.via === 'costa';
  useLayoutEffect(() => {
    player.control = false;
    player.visible = false;
    player.fixedCam = { pos: [0, 7.5, 14], target: [0, 1, -16], fov: 57 };
    return () => {
      player.control = true;
      player.visible = true;
      player.fixedCam = null;
    };
  }, []);
  useTick((dt) => {
    if (!config.trip && useGame.getState().mg?.phase !== 'playing') return;
    const honk = input.take('fire'),
      ev = stepDrive(s, config, dt, input.mx, input.mz, honk);
    if (honk) audio.sfx('horn');
    if (ev.collision) {
      audio.sfx('hit');
      useGame.getState().toast(water ? '¡Cuidado con la lancha!' : '¡Suave, maje!', '💥');
    }
    if (ev.pickup) {
      audio.sfx('pickup');
      useGame.getState().toast(`¡Subieron ${cargo}!`, '✅');
    }
    if (config.veh === 'rapidito' && Math.floor(s.elapsed / 11) !== Math.floor((s.elapsed - dt) / 11))
      useGame
        .getState()
        .toast(
          ['¡Suba, suba, va vacío!', '¡Centro, Centro! ¡Hay puesto!', '¡Agarrate bien, maje!'][
            Math.floor(s.elapsed / 11) % 3
          ],
          '📣',
        );
    if (car.current) {
      car.current.position.x = s.x;
      car.current.rotation.z = (-input.mx * 0.035 * s.speed) / 20;
      car.current.rotation.y = -input.mx * 0.07;
      car.current.position.y = Math.sin(s.elapsed * 12) * (water ? 0.08 : 0.018) + s.shake * 0.13;
    }
    if (road.current) road.current.position.z = s.distance % 32;
    s.traffic.forEach((a, i) => {
      const g = traffic.current[i];
      if (g) {
        g.position.set(a.x, 0, a.z);
        g.rotation.y = a.yield ? (a.yield - a.x) * -0.07 : 0;
      }
    });
    s.stops.forEach((a, i) => {
      const g = stops.current[i];
      if (g) {
        g.position.z = s.distance - a.distance;
        g.visible = !a.taken && Math.abs(g.position.z) < 120;
      }
    });
    if (sparks.current) {
      sparks.current.visible = s.shake > 0.3;
      sparks.current.position.set(s.x, 1, -2);
      sparks.current.rotation.y += dt * 9;
    }
    if (player.fixedCam) {
      player.fixedCam.pos = [
        s.x * 0.3 + Math.sin(s.elapsed * 71) * s.shake * 0.3,
        7.5 + Math.cos(s.elapsed * 61) * s.shake * 0.25,
        14,
      ];
      player.fixedCam.target = [s.x * 0.4, 1, -16];
    }
    onStep(s, dt);
  });
  return (
    <>
      <art.SkyRig time="dia" weather="despejado" fogFar={155} shadowRadius={32} />
      <Ground size={380} color={coastal ? '#c4ba7e' : '#648d46'} mat={coastal ? 'sand' : 'grass'} />
      <Ground
        size={[15.5, 310]}
        pos={[0, 0, -115]}
        y={0.018}
        color={water ? '#258fa7' : config.via === 'montana' ? '#977255' : '#3a4349'}
        mat={water ? 'water' : config.via === 'montana' ? 'dirt' : 'asphalt'}
      />
      {!water &&
        [-7.4, 7.4].map((x) => (
          <Block key={x} pos={[x, 0.04, -100]} size={[0.14, 0.035, 260]} color="#faf0c9" solid={false} />
        ))}
      <group ref={road}>
        {Array.from({ length: 9 }, (_, i) => (
          <group key={i} position={[0, 0, -i * 32]}>
            {!water &&
              [-1.8, 1.8].map((x) => (
                <Block key={x} pos={[x, 0.04, -8]} size={[0.12, 0.035, 7]} color="#f7dc85" solid={false} />
              ))}
            {[-1, 1].map((side) => (
              <group key={side}>
                {city ? (
                  <>
                    <Block
                      pos={[side * (14 + (i % 3) * 3), 3 + (i % 2) * 2, -8]}
                      size={[7, 6 + (i % 2) * 4, 10]}
                      color={['#dca46e', '#a1bdad', '#e9c39a'][i % 3]}
                      mat="stucco"
                      solid={false}
                    />
                    <Block
                      pos={[side * (14 + (i % 3) * 3), 2.7, -2.9]}
                      size={[4.7, 1.7, 0.1]}
                      color="#557b88"
                      mat="glass"
                      solid={false}
                    />
                    <Block
                      pos={[side * (10.45 + (i % 3) * 3), 3.5, -8]}
                      size={[0.12, 1.4, 7]}
                      color="#365966"
                      mat="glass"
                      solid={false}
                    />
                    <Block
                      pos={[side * (10.45 + (i % 3) * 3), 0.95, -7]}
                      size={[0.12, 1.9, 1.3]}
                      color="#78553d"
                      mat="wood"
                      solid={false}
                    />
                    <Block
                      pos={[side * (10.4 + (i % 3) * 3), 5, -8]}
                      size={[0.18, 0.18, 10]}
                      color="#f2dcc1"
                      mat="concrete"
                      solid={false}
                    />
                  </>
                ) : coastal || water ? (
                  <P.Palm pos={[side * (12 + (i % 3) * 4), 0, -9]} scale={1.1} solid={false} />
                ) : (
                  <P.Pine pos={[side * (13 + (i % 3) * 5), 0, -8]} scale={1.2} solid={false} />
                )}
                {!water && (
                  <Block pos={[side * 8.7, 0.5, -9]} size={[0.18, 1, 3]} color="#e6ddd0" mat="concrete" solid={false} />
                )}
              </group>
            ))}
          </group>
        ))}
        <group position={[8.7, 0, -38]} rotation-y={-0.8}>
          <art.Avatar config={SHOP.defaultAvatar} state={{ anim: 'wave', speed: 0 }} />
        </group>
        <P.Stall pos={[10, 0, -40]} sign={city ? 'BALEADAS · L 15' : 'CAFÉ DEL CAMINO'} solid={false} />
        <P.Sign pos={[-10, 0, -58]} text={`Bienvenidos a ${destination}`} w={6} solid={false} />
        <P.Sign
          pos={[10, 0, -115]}
          text={water ? 'Cuidá el río' : 'Bajá la velocidad · Hay túmulos'}
          w={5}
          solid={false}
        />
      </group>
      {!city &&
        [-1, 1].map((side) => (
          <group key={side}>
            {[0, 1, 2, 3].map((i) => (
              <group
                key={i}
                position={[side * (38 + (i % 2) * 17), -3, -45 - i * 40]}
                scale={[17 + i * 3, 20 + i * 4, 23]}
              >
                <Ball pos={[0, 0, 0]} r={1} mat="grass" color={i % 2 ? '#638768' : '#71966f'} />
              </group>
            ))}
          </group>
        ))}
      {s.traffic.map((a, i) => (
        <group
          key={i}
          ref={(g) => {
            traffic.current[i] = g;
          }}
          position={[a.x, 0, a.z]}
        >
          <Obstacle kind={a.kind} />
        </group>
      ))}
      {!config.trip &&
        s.stops.map((a, i) => (
          <group
            key={i}
            ref={(g) => {
              stops.current[i] = g;
            }}
            position={[0, 0, -a.distance]}
          >
            <Block pos={[6.4, 0.06, 0]} size={[2.5, 0.1, 20]} color="#61cdb0" mat="neon" solid={false} />
            <P.Sign pos={[9, 0, 0]} text={`PARADA ${i + 1} · ${cargo}`} w={4.5} solid={false} />
            <Label pos={[6.7, 3.8, 0]} text="Orillate y frená ↓" h={0.65} bg="#125b49" />
            {cargo === 'pasajeros' || cargo === 'clientes' ? (
              <group position={[9, 0, 3]}>
                <art.Avatar config={SHOP.defaultAvatar} state={{ anim: 'wave', speed: 0 }} />
              </group>
            ) : (
              <P.Crate pos={[9, 0, 3]} solid={false} />
            )}
          </group>
        ))}
      <group ref={car}>
        <Vehicle kind={config.veh} />
      </group>
      <group ref={sparks} visible={false}>
        {Array.from({ length: 7 }, (_, i) => (
          <Block
            key={i}
            pos={[Math.sin(i * 3) * 1.7, (i % 3) * 0.35, Math.cos(i * 3)]}
            size={[0.12, 0.12, 0.5]}
            color={i % 2 ? '#ffe463' : '#ff742a'}
            mat="neon"
            solid={false}
          />
        ))}
      </group>
      {modo !== 'solo' && (
        <group position={[-5.5, 0, -24]}>
          <Vehicle kind="taxi" bot />
        </group>
      )}
      {modo === 'abierto' && (
        <group position={[4, 0, -48]}>
          <Vehicle kind="pickup" bot />
        </group>
      )}
    </>
  );
}
