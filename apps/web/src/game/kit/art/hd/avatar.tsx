// Avatar HD: personaje estilizado de formas suaves en UNA sola malla con huesos (una llamada de dibujo), con
// cara dibujada en lienzo, ropa por atlas y animación procedural mezclada. Lee `state` en cada cuadro.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../../../../core/store';
import type { AvatarConfig, AvatarState } from '../../../../core/types';
import { calidadEfectiva } from '../../../quality';
import { textTexture } from '../../core';
import { Exagera, Globito } from '../exagera';
import type { AvatarProps } from '../types';
import { ANIMS, type Ctx, PN, POSES } from './anim';
import { avatarGeometry, B, NB, PARENT, REST } from './avatarGeo';
import { avatarMaterial } from './avatarMat';
import { configKey } from './avatarTex';

/** el párpado gira hacia arriba sobre el ojo: abierto queda escondido bajo el párpado fijo */
const LID_OPEN = -1.05;
/** distancia a la cámara desde la que se usa la malla liviana, por calidad */
const LOD_M = { baja: 3.5, media: 7, alta: 11 } as const;
const _wp = new THREE.Vector3(),
  _lp = new THREE.Vector3(),
  _inv = new THREE.Matrix4();
/** gesto de la cara por animación: [sonrisa, boca abierta, cejas] (negativo = comisuras o cejas abajo) */
const GESTO: Partial<Record<string, readonly [number, number, number]>> = {
  celebrate: [1, 0.75, 0.6],
  victoria: [1, 0.9, 0.7],
  gol: [1, 1, 0.8],
  dance: [0.8, 0.2, 0.3],
  dance2: [0.8, 0.25, 0.35],
  wave: [0.75, 0.15, 0.35],
  clap: [0.85, 0.35, 0.4],
  asombro: [0, 1, 1],
  choque: [-0.4, 0.55, -0.7],
  mareo: [-0.3, 0.3, -0.5],
  kick: [0, 0.15, -0.45],
  throw: [0, 0.15, -0.4],
};
/** a menos de esta distancia de la cámara (y en calidad alta) los ojos la siguen un poco */
const LOOK_M = 4.5;
const tmp = new Float32Array(PN),
  acc = new Float32Array(PN);
class Rig {
  mesh: THREE.SkinnedMesh;
  bones: THREE.Bone[] = [];
  skeleton: THREE.Skeleton;
  w = new Float32Array(ANIMS.length);
  t0 = new Float32Array(ANIMS.length);
  cur = -1;
  ph = Math.random() * 6;
  seed = Math.random() * 10;
  blinkAt = 1 + Math.random() * 3;
  /** gesto actual (sonrisa, boca, cejas) y mirada (giro, cabeceo) con su objetivo y movimientos chiquitos */
  face = [0, 0, 0];
  gaze = [0, 0];
  aim = [0, 0];
  sacc = [0, 0];
  saccAt = 0.5 + Math.random() * 2;
  /** posiciones de reposo de los huesos de la cara (relativas a la cabeza) */
  base: THREE.Vector3[] = [];
  /** centro entre los ojos en el espacio de la cabeza */
  eyeMid = new THREE.Vector3();
  alta = false;
  mv = 0;
  air = 0;
  lastT = -1;
  /** aplastar y estirar, golpe al caer y mareo (MC-58) */
  ex = new Exagera();
  globito = new Globito(0.6);
  full: THREE.BufferGeometry;
  lite: THREE.BufferGeometry | null = null;
  constructor(private cfg: AvatarConfig) {
    for (let i = 0; i < NB; i++) {
      const b = new THREE.Bone(),
        p = PARENT[i],
        r = REST[i];
      if (p >= 0) {
        const q = REST[p];
        b.position.set(r[0] - q[0], r[1] - q[1], r[2] - q[2]);
        this.bones[p].add(b);
      }
      this.bones.push(b);
    }
    this.bones[0].updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.bones);
    this.full = avatarGeometry(cfg);
    this.mesh = new THREE.SkinnedMesh(this.full, avatarMaterial(cfg));
    this.mesh.add(this.bones[0]);
    this.mesh.bind(this.skeleton, new THREE.Matrix4());
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    // la malla se deforma con los huesos: se usa una esfera fija y holgada para el descarte por cámara
    this.mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 1.9);
    this.bones[B.lid].rotation.x = LID_OPEN;
    this.bones[B.head].add(this.globito.sprite);
    this.base = this.bones.map((b) => b.position.clone());
    const h = REST[B.head],
      e = REST[B.eyeL];
    this.eyeMid.set(0, e[1] - h[1], e[2] - h[2]);
  }
  /** los ojos siguen un poco a la cámara cuando está cerca y de frente (solo en calidad alta) */
  look(cam: THREE.Vector3) {
    this.aim[0] = this.aim[1] = 0;
    if (!this.alta || _wp.setFromMatrixPosition(this.mesh.matrixWorld).distanceTo(cam) > LOOK_M) return;
    _inv.copy(this.bones[B.head].matrixWorld).invert();
    _lp.copy(cam).applyMatrix4(_inv).sub(this.eyeMid);
    const flat = Math.hypot(_lp.x, _lp.z);
    // de lado o por detrás no se fuerza la mirada: los ojos vuelven al frente
    if (_lp.z < flat * 0.35) return;
    const k = 1 - Math.max(0, (_wp.distanceTo(cam) - LOOK_M * 0.7) / (LOOK_M * 0.3));
    this.aim[0] = Math.max(-0.42, Math.min(0.42, Math.atan2(_lp.x, _lp.z) * 0.8)) * k;
    this.aim[1] = Math.max(-0.28, Math.min(0.22, Math.atan2(_lp.y, flat) * 0.8)) * k;
  }
  /** malla completa de cerca, liviana de lejos (mismos huesos y material; cambia solo la geometría) */
  lod(cam: THREE.Vector3) {
    const q = calidadEfectiva(useGame.getState().profile.settings),
      m = LOD_M[q];
    this.alta = q === 'alta';
    const d = _wp.setFromMatrixPosition(this.mesh.matrixWorld).distanceTo(cam),
      lite = this.mesh.geometry === this.full ? d > m * 1.1 : d > m;
    const g = lite ? (this.lite ??= avatarGeometry(this.cfg, true)) : this.full;
    if (this.mesh.geometry !== g) this.mesh.geometry = g;
  }
  update(state: AvatarState, t: number, dt: number) {
    const anim = this.ex.update(state.anim, t, dt);
    this.globito.update(this.ex, t);
    const w = this.w,
      idx = Math.max(0, ANIMS.indexOf(anim)),
      sp = state.speed || 0;
    if (idx !== this.cur) {
      if (this.cur < 0) w[idx] = 1;
      this.cur = idx;
      this.t0[idx] = t;
    }
    const k = 1 - Math.exp(-dt * 12);
    let sum = 0;
    for (let i = 0; i < w.length; i++) {
      w[i] += ((i === idx ? 1 : 0) - w[i]) * k;
      if (w[i] < 0.003 && i !== idx) w[i] = 0;
      sum += w[i];
    }
    this.ph += dt * (anim === 'run' ? 7.5 + sp * 0.85 : 5.5 + sp * 0.9);
    const ctx: Ctx = { t, tl: 0, ph: this.ph, speed: sp, seed: this.seed };
    acc.fill(0);
    for (let i = 0; i < w.length; i++) {
      if (!w[i]) continue;
      tmp.fill(0);
      ctx.tl = t - this.t0[i];
      POSES[i](tmp, ctx);
      const f = w[i] / sum;
      for (let j = 0; j < PN; j++) acc[j] += tmp[j] * f;
    }
    const bn = this.bones;
    bn[0].position.set(acc[0], acc[1], acc[2]);
    for (let i = 0; i < 14; i++) bn[i].rotation.set(acc[3 + i * 3], acc[4 + i * 3], acc[5 + i * 3]);
    // --- la cara: gesto según la animación (sonrisa, boca, cejas) y la mirada
    const gs = GESTO[anim],
      fk = 1 - Math.exp(-dt * 7),
      fc = this.face;
    fc[0] += ((gs?.[0] ?? 0) - fc[0]) * fk;
    fc[1] += ((gs?.[1] ?? 0) * (anim === 'asombro' ? 1 : 0.72 + 0.28 * Math.sin(t * 9 + this.seed)) - fc[1]) * fk;
    fc[2] += ((gs?.[2] ?? 0) - fc[2]) * fk;
    const [smile, jaw, brow] = fc,
      bs = this.base;
    bn[B.jaw].rotation.x = 0.12 * Math.max(0, jaw);
    bn[B.brow].position.set(bs[B.brow].x, bs[B.brow].y + 0.0034 * brow, bs[B.brow].z + 0.0006 * Math.max(0, brow));
    bn[B.mouth].position.set(bs[B.mouth].x, bs[B.mouth].y + 0.0024 * smile, bs[B.mouth].z - 0.0008 * Math.abs(smile));
    bn[B.mouth].scale.set(1 + 0.08 * smile, 1, 1);
    if (t > this.saccAt) {
      // movimientos chiquitos de los ojos para que no se vean fijos
      this.sacc[0] = (Math.random() - 0.5) * 0.16;
      this.sacc[1] = (Math.random() - 0.5) * 0.08;
      this.saccAt = t + 0.6 + Math.random() * 2.2;
    }
    const gk = 1 - Math.exp(-dt * 14),
      gz = this.gaze;
    gz[0] += (this.aim[0] + this.sacc[0] - gz[0]) * gk;
    gz[1] += (this.aim[1] + this.sacc[1] - gz[1]) * gk;
    for (const e of [B.eyeL, B.eyeR]) bn[e].rotation.set(-gz[1], gz[0], 0);
    // párpado: entrecierra los ojos al sonreír; parpadea de vez en cuando
    const open = LID_OPEN * (1 - 0.2 * Math.max(0, smile));
    bn[B.lid].rotation.x = open;
    if (t > this.blinkAt) {
      const u = (t - this.blinkAt) / 0.2;
      bn[B.lid].rotation.x = u >= 1 ? open : open * (1 - Math.sin(u * Math.PI) ** 0.6);
      if (u >= 1) this.blinkAt = t + 1.6 + Math.random() * 3.6;
    }
    // --- movimiento secundario: capa, falda, coleta
    const moving = anim === 'walk' || anim === 'run' || anim === 'carry' ? Math.min(1, sp / 8) : 0,
      inAir = anim === 'fall' || anim === 'jump' || anim === 'victoria' || anim === 'gol' ? 1 : 0,
      dance =
        anim === 'dance' || anim === 'dance2' || anim === 'celebrate' || anim === 'asombro' || anim === 'mareo' ? 1 : 0;
    this.mv += (moving - this.mv) * Math.min(1, dt * 5);
    this.air += (inAir - this.air) * Math.min(1, dt * 6);
    const m = this.mv + this.air * 0.5,
      s = this.seed,
      fl = 1 + m * 2.2 + dance;
    bn[B.cape1].rotation.set(
      0.1 + m * 0.7 - this.air * 0.2 + Math.sin(t * 4.6 + s) * 0.045 * fl,
      0,
      Math.sin(t * 2.3 + s) * 0.03 * fl,
    );
    bn[B.cape2].rotation.set(
      0.05 + m * 0.28 + this.air * 0.9 + Math.sin(t * 4.6 + s - 1) * 0.08 * fl,
      0,
      Math.sin(t * 2.9 + s) * 0.05 * fl,
    );
    bn[B.cape3].rotation.set(
      0.04 + m * 0.1 + this.air * 0.6 + Math.sin(t * 4.6 + s - 2) * 0.12 * fl,
      0,
      Math.sin(t * 3.4 + s) * 0.06 * fl,
    );
    const hy = acc[3 + B.hips * 3 + 1],
      hz = acc[3 + B.hips * 3 + 2];
    bn[B.skirt].rotation.set(
      m * 0.1 + Math.sin(t * 1.9 + s) * 0.02 - this.air * 0.5,
      -hy * 0.6 + Math.sin(t * 6 + s) * 0.12 * dance,
      Math.sin(t * 1.3 + s) * 0.03 - hz * 0.8 + Math.sin(this.ph) * 0.08 * this.mv,
    );
    const sk = 1 + this.air * 0.25 + dance * 0.06 * (1 + Math.sin(t * 6.2));
    bn[B.skirt].scale.set(sk, 1, sk);
    bn[B.tail].rotation.set(
      0.05 + m * 0.55 + this.air * 0.9 + Math.sin(t * 2.1 + s) * 0.04,
      0,
      Math.sin(this.ph) * 0.22 * this.mv + Math.sin(t * 1.4 + s) * 0.05 + hz * 1.2,
    );
  }
}

const SIT_TAG = 2.12;
export function Avatar({ config, state, name, scale = 1 }: AvatarProps) {
  const key = configKey(config);
  const rig = useMemo(() => new Rig(config), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      rig.skeleton.dispose();
      rig.globito.dispose();
    },
    [rig],
  );
  const cuerpo = useRef<THREE.Group>(null),
    sube = useRef<THREE.Group>(null);
  const tag = useMemo(() => (name ? textTexture(name, { fg: '#ffffff', bg: 'rgba(12,22,34,0.8)' }) : null), [name]);
  useFrame((st, dt) => {
    rig.update(state, st.clock.elapsedTime, Math.min(dt, 0.1));
    rig.lod(st.camera.position);
    rig.look(st.camera.position);
    cuerpo.current?.scale.set(rig.ex.sx, rig.ex.sy, rig.ex.sz);
    // el nombre sube con el muñeco cuando brinca (victoria, gol, susto)
    if (sube.current) sube.current.position.y = Math.max(0, rig.bones[0].position.y) * rig.ex.sy;
  });
  // lo que el sombrero o el pelo suben sobre la coronilla, para que el nombre no lo tape
  const tall =
    config.hat === 'tocado_plumas'
      ? 0.2
      : config.hat === 'corona_carnaval'
        ? 0.13
        : config.hat === 'panuelo_garifuna' || config.hat === 'panuelo_punta'
          ? 0.08
          : config.hat === 'flores_pelo'
            ? 0
            : config.hat === 'sombrero_vaquero' || config.hat === 'sombrero_junco'
              ? 0.05
              : config.hat !== 'sin_sombrero' || config.hair === 'pelo_afro'
                ? 0.04
                : 0;
  return (
    <group scale={scale}>
      <group ref={cuerpo} name="avatar-cuerpo" userData={{ exagera: rig.ex, state }}>
        <primitive object={rig.mesh} scale={config.body === 'm' ? 0.965 : 1} />
      </group>
      {tag && (
        <group ref={sube}>
          <sprite position={[0, SIT_TAG + tall, 0]} scale={[0.3 * (tag as any).aspect, 0.3, 1]}>
            <spriteMaterial map={tag} transparent />
          </sprite>
        </group>
      )}
    </group>
  );
}
