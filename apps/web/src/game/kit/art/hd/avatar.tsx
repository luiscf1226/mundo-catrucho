// Avatar HD: personaje estilizado de formas suaves en UNA sola malla con huesos (una llamada de dibujo), con
// cara dibujada en lienzo, ropa por atlas y animación procedural mezclada. Lee `state` en cada cuadro.
import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { textTexture } from '../../core';
import type { AvatarConfig, AvatarState } from '../../../../core/types';
import type { AvatarProps } from '../types';
import { ANIMS, PN, POSES, type Ctx } from './anim';
import { B, NB, PARENT, REST, avatarGeometry } from './avatarGeo';
import { avatarAtlas, avatarORM, configKey } from './avatarTex';
import { G } from './materials';

const mats = new Map<string, THREE.MeshStandardMaterial>();
function avatarMaterial(cfg: AvatarConfig) {
  const key = configKey(cfg); let m = mats.get(key); if (m) return m;
  const orm = avatarORM();
  m = new THREE.MeshStandardMaterial({ map: avatarAtlas(cfg), roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1 });
  // luz de contorno suave con el color del cielo: separa al personaje del fondo
  m.onBeforeCompile = sh => { sh.uniforms.uSky = G.uSky; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSky;').replace('#include <opaque_fragment>', '{ float rimK = pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 3.0 ); outgoingLight += diffuseColor.rgb * uSky * rimK * 0.8; }\n#include <opaque_fragment>'); };
  m.customProgramCacheKey = () => 'hd-avatar';
  mats.set(key, m); return m;
}

const tmp = new Float32Array(PN), acc = new Float32Array(PN);
class Rig {
  mesh: THREE.SkinnedMesh; bones: THREE.Bone[] = []; skeleton: THREE.Skeleton;
  w = new Float32Array(ANIMS.length); t0 = new Float32Array(ANIMS.length); cur = -1; ph = Math.random() * 6; seed = Math.random() * 10;
  blinkAt = 1 + Math.random() * 3; mv = 0; air = 0; lastT = -1;
  constructor(cfg: AvatarConfig) {
    for (let i = 0; i < NB; i++) { const b = new THREE.Bone(), p = PARENT[i], r = REST[i]; if (p >= 0) { const q = REST[p]; b.position.set(r[0] - q[0], r[1] - q[1], r[2] - q[2]); this.bones[p].add(b); } this.bones.push(b); }
    this.bones[0].updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.bones);
    this.mesh = new THREE.SkinnedMesh(avatarGeometry(cfg), avatarMaterial(cfg));
    this.mesh.add(this.bones[0]); this.mesh.bind(this.skeleton, new THREE.Matrix4());
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    // la malla se deforma con los huesos: se usa una esfera fija y holgada para el descarte por cámara
    this.mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 1.9);
    this.bones[B.lid].scale.y = 0.03;
  }
  update(state: AvatarState, t: number, dt: number) {
    const w = this.w, idx = Math.max(0, ANIMS.indexOf(state.anim)), sp = state.speed || 0;
    if (idx !== this.cur) { if (this.cur < 0) w[idx] = 1; this.cur = idx; this.t0[idx] = t; }
    const k = 1 - Math.exp(-dt * 12); let sum = 0;
    for (let i = 0; i < w.length; i++) { w[i] += ((i === idx ? 1 : 0) - w[i]) * k; if (w[i] < 0.003 && i !== idx) w[i] = 0; sum += w[i]; }
    this.ph += dt * (state.anim === 'run' ? 7.5 + sp * 0.85 : 5.5 + sp * 0.9);
    const ctx: Ctx = { t, tl: 0, ph: this.ph, speed: sp, seed: this.seed };
    acc.fill(0);
    for (let i = 0; i < w.length; i++) { if (!w[i]) continue; tmp.fill(0); ctx.tl = t - this.t0[i]; POSES[i](tmp, ctx); const f = w[i] / sum; for (let j = 0; j < PN; j++) acc[j] += tmp[j] * f; }
    const bn = this.bones; bn[0].position.set(acc[0], acc[1], acc[2]);
    for (let i = 0; i < 14; i++) bn[i].rotation.set(acc[3 + i * 3], acc[4 + i * 3], acc[5 + i * 3]);
    // --- movimiento secundario: parpadeo, capa, falda, coleta
    if (t > this.blinkAt) { const u = (t - this.blinkAt) / 0.2; bn[B.lid].scale.y = u >= 1 ? 0.03 : 0.03 + 0.97 * Math.sin(u * Math.PI) ** 0.6; if (u >= 1) this.blinkAt = t + 1.6 + Math.random() * 3.6; }
    const moving = state.anim === 'walk' || state.anim === 'run' || state.anim === 'carry' ? Math.min(1, sp / 8) : 0, inAir = state.anim === 'fall' || state.anim === 'jump' ? 1 : 0, dance = state.anim === 'dance' || state.anim === 'dance2' || state.anim === 'celebrate' ? 1 : 0;
    this.mv += (moving - this.mv) * Math.min(1, dt * 5); this.air += (inAir - this.air) * Math.min(1, dt * 6);
    const m = this.mv + this.air * 0.5, s = this.seed, fl = 1 + m * 2.2 + dance;
    bn[B.cape1].rotation.set(0.1 + m * 0.7 - this.air * 0.2 + Math.sin(t * 4.6 + s) * 0.045 * fl, 0, Math.sin(t * 2.3 + s) * 0.03 * fl);
    bn[B.cape2].rotation.set(0.05 + m * 0.28 + this.air * 0.9 + Math.sin(t * 4.6 + s - 1) * 0.08 * fl, 0, Math.sin(t * 2.9 + s) * 0.05 * fl);
    bn[B.cape3].rotation.set(0.04 + m * 0.1 + this.air * 0.6 + Math.sin(t * 4.6 + s - 2) * 0.12 * fl, 0, Math.sin(t * 3.4 + s) * 0.06 * fl);
    const hy = acc[3 + B.hips * 3 + 1], hz = acc[3 + B.hips * 3 + 2];
    bn[B.skirt].rotation.set(m * 0.1 + Math.sin(t * 1.9 + s) * 0.02 - this.air * 0.5, -hy * 0.6 + Math.sin(t * 6 + s) * 0.12 * dance, Math.sin(t * 1.3 + s) * 0.03 - hz * 0.8 + Math.sin(this.ph) * 0.08 * this.mv);
    const sk = 1 + this.air * 0.25 + dance * 0.06 * (1 + Math.sin(t * 6.2)); bn[B.skirt].scale.set(sk, 1, sk);
    bn[B.tail].rotation.set(0.05 + m * 0.55 + this.air * 0.9 + Math.sin(t * 2.1 + s) * 0.04, 0, Math.sin(this.ph) * 0.22 * this.mv + Math.sin(t * 1.4 + s) * 0.05 + hz * 1.2);
  }
}

const SIT_TAG = 2.12;
export function Avatar({ config, state, name, scale = 1 }: AvatarProps) {
  const key = configKey(config);
  const rig = useMemo(() => new Rig(config), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { rig.skeleton.dispose(); }, [rig]);
  const tag = useMemo(() => (name ? textTexture(name, { fg: '#ffffff', bg: 'rgba(12,22,34,0.8)' }) : null), [name]);
  useFrame((st, dt) => rig.update(state, st.clock.elapsedTime, Math.min(dt, 0.1)));
  const tall = config.hat === 'tocado_plumas' ? 0.4 : config.hat === 'corona_carnaval' ? 0.3 : config.hat === 'panuelo_garifuna' || config.hat === 'panuelo_punta' ? 0.16 : config.hat === 'flores_pelo' ? 0.02 : config.hat === 'sombrero_vaquero' || config.hat === 'sombrero_junco' ? 0.14 : config.hat !== 'sin_sombrero' || config.hair === 'pelo_afro' ? 0.08 : 0;
  return <group scale={scale}>
    <primitive object={rig.mesh} scale={config.body === 'm' ? 0.965 : 1} />
    {tag && <sprite position={[0, SIT_TAG + tall, 0]} scale={[0.3 * (tag as any).aspect, 0.3, 1]}><spriteMaterial map={tag} transparent /></sprite>}
  </group>;
}
