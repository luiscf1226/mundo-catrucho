export type VehicleKind =
  | 'rapidito'
  | 'taxi'
  | 'bus'
  | 'mototaxi'
  | 'lancha'
  | 'pickup'
  | 'bici'
  | 'cayuco'
  | 'moto'
  | 'camion';
export type RoadKind = 'ciudad' | 'carretera' | 'montana' | 'mar' | 'rio' | 'costa';
export const vehicles = {
  rapidito: { speed: 26, steer: 8.2, mass: 1, color: '#ef476f', length: 4.8 },
  taxi: { speed: 29, steer: 9, mass: 1, color: '#f6d44b', length: 3.8 },
  bus: { speed: 19, steer: 4.4, mass: 4, color: '#edb72c', length: 6.6 },
  pickup: { speed: 23, steer: 6.5, mass: 2, color: '#298dba', length: 4.5 },
  mototaxi: { speed: 20, steer: 8, mass: 0.6, color: '#c62c32', length: 2.6 },
  moto: { speed: 29, steer: 10, mass: 0.4, color: '#ee7338', length: 2.2 },
  bici: { speed: 17, steer: 9, mass: 0.3, color: '#65ca8a', length: 2 },
  camion: { speed: 20, steer: 4, mass: 5, color: '#c36a34', length: 7 },
  lancha: { speed: 25, steer: 6, mass: 1, color: '#f2f0dc', length: 4.5 },
  cayuco: { speed: 18, steer: 5, mass: 0.5, color: '#9e6337', length: 4.8 },
};
export function vehicleKind(v: unknown): VehicleKind {
  if (typeof v === 'string' && Object.hasOwn(vehicles, v)) return v as VehicleKind;
  return typeof v === 'string' && /bus|micro/.test(v) ? 'rapidito' : 'pickup';
}
export function roadKind(v: unknown): RoadKind {
  return v === 'ciudad' || v === 'montana' || v === 'mar' || v === 'rio' || v === 'costa' ? v : 'carretera';
}
export type ObstacleKind =
  | 'taxi'
  | 'rapidito'
  | 'moto'
  | 'bus'
  | 'camion'
  | 'vaca'
  | 'perro'
  | 'bache'
  | 'tumulo'
  | 'tronco'
  | 'ola'
  | 'lancha';
export interface Traffic {
  kind: ObstacleKind;
  x: number;
  z: number;
  lane: number;
  speed: number;
  hit: boolean;
  yield: number;
}
export interface DriveConfig {
  veh: VehicleKind;
  via: RoadKind;
  difficulty: number;
  trip: boolean;
  seed: number;
}
export interface DriveState {
  x: number;
  speed: number;
  distance: number;
  elapsed: number;
  hits: number;
  collected: number;
  shake: number;
  cooldown: number;
  horn: number;
  traffic: Traffic[];
  stops: { distance: number; taken: boolean; dwell: number }[];
}
export function createDrive(c: DriveConfig): DriveState {
  const water = c.via === 'mar' || c.via === 'rio';
  const kinds: ObstacleKind[] = water
    ? ['tronco', 'lancha', 'ola', 'lancha']
    : c.via === 'ciudad'
      ? ['taxi', 'rapidito', 'moto', 'bus', 'bache', 'camion', 'tumulo']
      : ['taxi', 'vaca', 'bache', 'camion', 'perro', 'tumulo', 'rapidito'];
  return {
    x: 0,
    speed: vehicles[c.veh].speed * 0.72,
    distance: 0,
    elapsed: 0,
    hits: 0,
    collected: 0,
    shake: 0,
    cooldown: 0,
    horn: 0,
    traffic: Array.from({ length: 7 }, (_, i) => ({
      kind: kinds[i % kinds.length],
      x: [-3.4, 0, 3.4][(i + (c.seed % 3)) % 3],
      lane: [-3.4, 0, 3.4][(i + (c.seed % 3)) % 3],
      z: -32 - i * 25,
      speed: 3 + (i % 3) * 2,
      hit: false,
      yield: 0,
    })),
    stops: [160, 410, 660].map((distance) => ({ distance, taken: false, dwell: 0 })),
  };
}
export function stepDrive(s: DriveState, c: DriveConfig, dt: number, steer: number, pedal: number, horn: boolean) {
  const v = vehicles[c.veh];
  s.elapsed += dt;
  s.cooldown = Math.max(0, s.cooldown - dt);
  s.shake = Math.max(0, s.shake - dt * 2);
  s.horn = Math.max(0, s.horn - dt);
  const target = pedal > 0.15 ? 0 : pedal < -0.15 ? v.speed : v.speed * 0.72;
  s.speed += Math.max(-v.speed * 1.6 * dt, Math.min(v.speed * 0.45 * dt, target - s.speed));
  s.x = Math.max(-6.9, Math.min(6.9, s.x + steer * v.steer * dt * (0.2 + (0.8 * s.speed) / v.speed)));
  s.distance += s.speed * dt;
  if (horn && !s.horn) {
    s.horn = 0.6;
    for (const a of s.traffic)
      if (a.z < 0 && a.z > -65 && Math.abs(a.x - s.x) < 2.5 && !['bache', 'tumulo', 'tronco', 'ola'].includes(a.kind))
        a.yield = s.x > 0 ? -5.5 : 5.5;
  }
  let collision = false,
    pickup = false;
  for (const a of s.traffic) {
    const fixed = ['bache', 'tumulo', 'vaca', 'perro', 'tronco', 'ola'].includes(a.kind);
    a.z += (s.speed - (fixed ? 0 : a.speed)) * dt;
    const weaving = a.kind === 'rapidito' || a.kind === 'moto';
    const tx =
      a.yield || a.lane + (weaving ? Math.sin(s.elapsed * (1.2 + c.difficulty) + a.speed) * (1 + c.difficulty) : 0);
    a.x += (tx - a.x) * Math.min(1, dt * 2);
    const half = a.kind === 'moto' || a.kind === 'perro' ? 0.55 : 1.1;
    if (!a.hit && Math.abs(a.z) < v.length / 2 + 1.7 && Math.abs(a.x - s.x) < half + 0.9 && !s.cooldown) {
      a.hit = true;
      s.hits++;
      collision = true;
      s.shake = 1;
      s.cooldown = 1;
      s.speed *= c.veh === 'bus' || c.veh === 'camion' ? 0.88 : 0.35;
      a.x += (a.x >= s.x ? 1 : -1) * 2.5;
      a.z -= 2;
    }
    if (a.z > 20 || a.z < -240) {
      a.z = -165 - a.speed * 5;
      a.hit = false;
      a.yield = 0;
    }
  }
  if (!c.trip)
    for (const stop of s.stops) {
      if (!stop.taken && Math.abs(stop.distance - s.distance) < 13 && s.x > 5 && s.speed < 6) {
        stop.dwell += dt;
        if (stop.dwell > 0.65) {
          stop.taken = true;
          s.collected++;
          pickup = true;
        }
      } else stop.dwell = 0;
    }
  return { collision, pickup };
}
