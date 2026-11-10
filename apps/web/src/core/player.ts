// El jugador como objeto mutable (no es estado de React): lo mueve game/PlayerController y lo leen las escenas.

import type { Body } from './phys';
import type { Anim, AvatarState, V3 } from './types';

export interface Vehicle {
  kind: string;
  speed: number;
  maxSpeed: number;
  radius: number;
  onExit?: () => void;
}
export const player = {
  body: { pos: [0, 0, 0], vel: [0, 0, 0], radius: 0.42, height: 1.75, grounded: true, on: null } as Body,
  get pos() {
    return this.body.pos;
  },
  /** hacia dónde mira el personaje (radianes, 0 = hacia -z) */ yaw: 0,
  camYaw: 0,
  camPitch: 0.35,
  camDist: 8,
  /** vista desde arriba del mapa gigante (solo en el lobby). La cambia setOverview; la cámara la suaviza. */
  overview: false,
  /** 0 = siguiendo al muñeco, 1 = vista de arriba completa (lo anima PlayerController) */
  overviewT: 0,
  overviewSubs: new Set<() => void>(),
  setOverview(v: boolean) {
    if (this.overview === v) return;
    this.overview = v;
    for (const f of this.overviewSubs) f();
  },
  /** el estado de animación que lee el avatar */ state: { anim: 'idle', speed: 0 } as AvatarState,
  /** false = el jugador no responde a la entrada (cinemáticas, puestos de feria) */ control: true,
  speedMul: 1,
  jumpMul: 1,
  walk: 5.2,
  sprint: 8.2,
  jumpV: 9.4,
  visible: true,
  spawn: [0, 0, 0] as V3,
  spawnYaw: 0,
  /** cámara fija opcional: si existe, la cámara va ahí en vez de seguir al jugador */
  fixedCam: null as null | { pos: V3; target: V3; fov?: number },
  /** animación forzada por una escena (patear, lanzar, cargar); se limpia sola al vencer `until` */
  override: null as null | { anim: Anim; until: number },
  emote: null as null | { anim: Anim; until: number },
  vehicle: null as null | Vehicle,
  teleport(x: number, y: number, z: number, yaw?: number) {
    const b = this.body;
    b.pos[0] = x;
    b.pos[1] = y;
    b.pos[2] = z;
    b.vel[0] = b.vel[1] = b.vel[2] = 0;
    b.grounded = false;
    if (yaw !== undefined) {
      this.yaw = yaw;
      this.camYaw = yaw;
    }
  },
  setSpawn(p: V3, yaw = 0) {
    this.spawn = [...p] as V3;
    this.spawnYaw = yaw;
    this.teleport(p[0], p[1], p[2], yaw);
  },
  respawn() {
    this.teleport(this.spawn[0], this.spawn[1], this.spawn[2], this.spawnYaw);
  },
  play(anim: Anim, seconds: number) {
    this.override = { anim, until: performance.now() + seconds * 1000 };
  },
  /** valores por defecto al cambiar de escena */
  resetForScene() {
    this.control = true;
    this.speedMul = 1;
    this.jumpMul = 1;
    this.visible = true;
    this.fixedCam = null;
    this.override = null;
    this.emote = null;
    this.vehicle = null;
    this.camPitch = 0.35;
    this.camDist = 8;
    this.setOverview(false);
    this.overviewT = 0;
    this.body.radius = 0.42;
  },
  distTo(x: number, z: number) {
    return Math.hypot(this.body.pos[0] - x, this.body.pos[2] - z);
  },
};
