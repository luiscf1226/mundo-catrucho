import { useLayoutEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { audio } from '../../core/audio';
import { SHOP } from '../../core/data';
import { input } from '../../core/input';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import { bx, cy, type Pc } from '../dept/lib';
import { art, Ball, Block, Ground, Label, P, Plate, useTick } from '../kit';
import type { HillDef } from '../kit/art/types';
import { Fundido, type Rotulo, Rotulos } from '../minigames/kit/fundido';
import { Objeto } from '../minigames/kit/objetos';
import { AguaAire, Estela } from './escenas/AguaAire';
import { COPIAS, marcas, Orilla, TRAMO, Z0 } from './escenas/Orilla';
import { usePruebaCamino } from './eventos/usePruebaCamino';
import {
  createDrive,
  type DriveConfig,
  type DriveState,
  type ObstacleKind,
  stepDrive,
  type VehicleKind,
  vehicles,
} from './model';
import type { TramoRuta } from './routes';
import { Carro, Estorbo } from './vehiculos/Carros';
import { Nuevos, PasajerosPickup } from './vehiculos/Nuevos';

export function Vehicle({ kind, bot = false }: { kind: VehicleKind; bot?: boolean }) {
  if (['ferry', 'avioneta', 'bicitaxi', 'mototaxi'].includes(kind)) return <Nuevos kind={kind} />;
  const v = vehicles[kind];
  return (
    <group>
      {art.fused ? <Carro kind={kind} /> : <Sencillo kind={kind} />}
      {kind === 'rapidito' && (
        <>
          <Plate pos={[0, 2.62, -v.length / 2 - 0.06]} text="DIOS ES AMOR" h={0.22} rot={Math.PI} bg="#661c45" />
          <Plate pos={[0, 1.25, v.length / 2 + 0.06]} text="EL CHELE · RUTA 504" h={0.24} bg="#451738" />
        </>
      )}
      {kind === 'bus' && <Plate pos={[0, 2.62, v.length / 2 + 0.05]} text="ESCOLAR · HONDURAS" h={0.24} bg="#25221b" />}
      {kind === 'pickup' && <PasajerosPickup />}
      {bot && <Label pos={[0, 3.4, 0]} text="🤖 Compa" h={0.36} />}
    </group>
  );
}
/** Sin malla fusionada (Roblox): la caja de siempre con cabina y focos. */
function Sencillo({ kind }: { kind: VehicleKind }) {
  const v = vehicles[kind],
    water = kind === 'lancha' || kind === 'cayuco',
    two = kind === 'moto' || kind === 'bici',
    width = two ? 0.65 : 2.1,
    tall = kind === 'bus' || kind === 'rapidito' || kind === 'camion';
  if (water) return <Block pos={[0, 0.35, 0]} size={[1.8, 0.5, v.length]} color={v.color} mat="wood" solid={false} />;
  return (
    <group>
      <Block pos={[0, 0.8, 0]} size={[width, 0.75, v.length]} color={v.color} mat="metal" solid={false} />
      <Block
        pos={[0, tall ? 1.8 : 1.35, -0.1]}
        size={[width * 0.92, tall ? 1.5 : 0.7, v.length * 0.7]}
        color={v.color}
        mat="metal"
        solid={false}
      />
      {two && <Ball pos={[0, 1.8, 0]} r={0.38} color="#e5be97" />}
    </group>
  );
}
function Obstacle({ kind }: { kind: ObstacleKind }) {
  if (kind === 'ola')
    return art.fused ? (
      <Estorbo kind="ola" />
    ) : (
      <Block pos={[0, 0.2, 0]} size={[3.5, 0.4, 0.7]} color="#d3f5ee" mat="water" solid={false} />
    );
  if (kind === 'bache' || kind === 'tumulo' || kind === 'tronco' || kind === 'vaca' || kind === 'perro')
    return art.fused ? (
      <Estorbo kind={kind} />
    ) : (
      <Block pos={[0, 0.2, 0]} size={[2.4, 0.4, 1.2]} color="#73482e" mat="wood" solid={false} />
    );
  return <Vehicle kind={kind} />;
}
/** Rótulo de una parada: poste, tablero y su letrero (dos llamadas). */
function SenalParada({ text }: { text: string }) {
  const pcs = useMemo<Pc[]>(
    () => [
      cy(0, 1.4, 0, 0.07, 2.8, 'metal', '#9aa0a6', { n: 8, solid: false }),
      bx(0, 2.7, 0, 2.6, 0.8, 0.06, 'metal', '#1b5e8c', { solid: false }),
      bx(0, 2.7, -0.04, 2.7, 0.9, 0.04, 'metal', '#e9ecef', { solid: false }),
    ],
    [],
  );
  const rot = useMemo<Rotulo[]>(
    () => [{ p: [0, 2.7, 0.04], w: 2.4, h: 0.62, text, fg: '#ffffff', bg: '#1b5e8c', letra: 'senal' }],
    [text],
  );
  return (
    <>
      <Fundido pcs={pcs} />
      <Rotulos items={rot} />
    </>
  );
}
/** Cerros con relieve a los dos lados de la vía (quietos: están tan lejos que no se mueven). */
function cerrosVia(city: boolean, monte: boolean): HillDef[] {
  const out: HillDef[] = [];
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const alto = city ? 1.3 : monte ? 1.6 : 1;
      out.push({
        p: [side * (66 + (i % 2) * 28 + (i % 3) * 6), -2, -40 - i * 42],
        r: 48 + i * 6 + (i % 2) * 10,
        h: (10 + (i % 3) * 5) * alto,
        c: ['#5f8a5a', '#6d9363', '#557f55'][i % 3],
        seed: i * 7 + (side > 0 ? 3 : 0),
      });
    }
  return out;
}
export function DrivingScene({
  config,
  destination,
  biome = 'valle',
  cargo = 'pasajeros',
  onStep,
  modo = 'solo',
  tramo,
  onRoadStep,
  camino,
  clima,
  remoto,
  encima,
}: {
  config: DriveConfig;
  /** MC-31: pasajero de un viaje compartido; el vehículo sigue lo que manda el chofer (null: maneja este navegador) */
  remoto?: () => { x: number; v: number; d: number; e: number; h: number } | null;
  /** lo que va encima del vehículo (nombres de quienes viajan) */
  encima?: import('react').ReactNode;
  clima?: 'lluvia' | 'neblina';
  camino?: import('react').ReactNode;
  onRoadStep?: (s: DriveState, dt: number) => void;
  tramo?: TramoRuta;
  destination: string;
  biome?: string;
  cargo?: string;
  modo?: string;
  onStep: (s: DriveState, dt: number) => void;
}) {
  const estado = useRef<DriveState | null>(null);
  if (!estado.current) estado.current = createDrive(config);
  const s = estado.current;
  const medioAnterior = useRef(config.via);
  if (medioAnterior.current !== config.via) {
    s.traffic = createDrive(config).traffic;
    s.speed = vehicles[config.veh].speed * 0.72;
    medioAnterior.current = config.via;
  }
  const car = useRef<Group>(null),
    road = useRef<Group>(null),
    quien = useRef<Group>(null),
    sparks = useRef<Group>(null);
  const traffic = useRef<(Group | null)[]>([]),
    stops = useRef<(Group | null)[]>([]);
  const water = config.via === 'mar' || config.via === 'rio',
    aire = config.via === 'cielo',
    city = tramo ? tramo.paisaje === 'ciudad' : config.via === 'ciudad';
  const coastal = ['costa', 'isla', 'sur'].includes(biome) || config.via === 'costa';
  const rayas = useMemo(() => marcas(water || aire), [water, aire]),
    cerros = useMemo(() => cerrosVia(city, config.via === 'montana'), [city, config.via]);
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
  usePruebaCamino(s, config, onRoadStep, onStep);
  useTick((dt) => {
    if (!config.trip && useGame.getState().mg?.phase !== 'playing') return;
    const r = remoto?.() ?? null,
      mx = r ? 0 : input.mx,
      honk = r ? false : input.take('fire'),
      choques = s.hits,
      ev = stepDrive(s, config, dt, mx, r ? 0 : input.mz, honk);
    if (r) {
      // de pasajero: el tráfico se mueve aquí, pero el vehículo, el reloj y los choques son los del chofer
      s.x = r.x;
      s.speed = r.v;
      s.distance = r.d;
      s.elapsed = r.e;
      s.hits = r.h;
      ev.collision = r.h > choques;
      ev.pickup = false;
    }
    onRoadStep?.(s, dt);
    if (honk) {
      if (['bicitaxi', 'cayuco', 'lancha', 'ferry', 'avioneta'].includes(config.veh))
        audio.tone(
          config.veh === 'bicitaxi' ? 880 : config.veh === 'cayuco' ? 180 : config.veh === 'avioneta' ? 120 : 90,
          0.25,
          { gain: 0.05 },
        );
      else audio.sfx('horn');
    }
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
      car.current.rotation.z = (water ? Math.sin(s.elapsed * 1.7) * 0.045 : 0) + (-mx * 0.035 * s.speed) / 20;
      car.current.rotation.y = -mx * 0.07;
      car.current.position.y = Math.sin(s.elapsed * 12) * (water || aire ? 0.15 : 0.018) + s.shake * 0.13;
    }
    if (road.current) road.current.position.z = s.distance % TRAMO;
    // el que espera en la parada camina con el tramo y da la vuelta lejos, en la bruma
    if (quien.current) quien.current.position.z = Z0 - 44 - TRAMO * (COPIAS - 1) + (s.distance % (TRAMO * COPIAS));
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
      <art.SkyRig
        key={clima ?? 'despejado'}
        time="auto"
        weather={clima ?? (biome === 'montana' ? 'neblina' : 'despejado')}
        fogFar={clima === 'neblina' ? 130 : clima ? 100 : water ? 360 : aire ? 650 : 155}
        shadowRadius={32}
      />
      {!water && !aire && (biome === 'lago' || biome === 'puente') && (
        <>
          <Block
            pos={[biome === 'puente' ? 0 : -35, 0.005, -48]}
            size={[biome === 'puente' ? 140 : 45, 0.01, 40]}
            color="#258fa7"
            mat="water"
            solid={false}
          />
          {biome === 'puente' &&
            [-8, 8].map((x) => (
              <Block key={x} pos={[x, 1, -48]} size={[0.3, 1.8, 42]} color="#c7c9c5" mat="concrete" solid={false} />
            ))}
        </>
      )}
      {water || aire ? (
        <AguaAire aire={aire} rio={config.via === 'rio'} distance={() => s.distance} />
      ) : (
        <>
          <Ground
            size={380}
            color={city ? '#6f6c64' : coastal ? '#c4ba7e' : '#648d46'}
            mat={city ? 'concrete' : coastal ? 'sand' : 'grass'}
          />
          <Ground
            size={[15.5, 310]}
            pos={[0, 0, -115]}
            y={0.018}
            color={config.via === 'montana' ? '#977255' : '#3d4448'}
            mat={config.via === 'montana' ? 'dirt' : 'asphalt'}
          />
          <group ref={road}>
            <Fundido pcs={rayas} sombra={false} />
            <Orilla
              city={city}
              monte={config.via === 'montana'}
              biome={biome}
              coastal={coastal}
              letreros={[
                tramo ? `${tramo.carretera} · ${tramo.nombre}` : `Bienvenidos a ${destination}`,
                tramo ? `${tramo.salida} → ${tramo.llegada}` : 'Bajá la velocidad · Hay túmulos',
              ]}
            />
          </group>
          <group ref={quien} position={[city ? 9.6 : -10.6, city ? 0.16 : 0, Z0 - 44]} rotation-y={city ? -1.2 : 1.2}>
            <art.Avatar config={SHOP.defaultAvatar} state={{ anim: 'wave', speed: 0 }} />
          </group>
          {tramo && <Plate pos={[-10, 2.5, -10]} text={tramo.carretera} h={0.42} bg="#176c45" />}
          {art.Hills ? (
            <art.Hills hills={cerros} />
          ) : (
            !city &&
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
            ))
          )}
        </>
      )}
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
            <group position={[9.4, 0, 0]}>
              <SenalParada text={`PARADA ${i + 1} · ${cargo}`} />
            </group>
            <Label pos={[6.7, 3.8, 0]} text="Orillate y frená ↓" h={0.65} bg="#125b49" />
            {cargo === 'pasajeros' || cargo === 'clientes' ? (
              <group position={[9, 0, 3]}>
                <art.Avatar config={SHOP.defaultAvatar} state={{ anim: 'wave', speed: 0 }} />
              </group>
            ) : (
              <Objeto k="caja" pos={[9, 0, 3]} scale={1.6} />
            )}
          </group>
        ))}
      {camino}
      <group ref={car} userData={{ vehiculo: config.veh }}>
        <Vehicle kind={config.veh} />
        {encima}
        {water && <Estela ancho={config.veh === 'ferry' ? 2.2 : 0.9} velocidad={() => s.speed} />}
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
