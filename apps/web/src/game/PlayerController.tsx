// Controlador en tercera persona: lee la entrada, mueve el cuerpo con la física, anima el avatar y lleva la cámara.
// También maneja vehículos (mototaxi, bus) y las cámaras fijas que piden algunos minijuegos.
import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { art } from './kit/art';
import { input } from '../core/input';
import { phys, stepBody } from '../core/phys';
import { player } from '../core/player';
import { nearest } from '../core/interact';
import { isPaused, useGame } from '../core/store';
import { audio } from '../core/audio';
import type { Anim } from '../core/types';

const tmp = new THREE.Vector3(), look = new THREE.Vector3();
const EMOTE_ANIM: Record<string, Anim> = { emote_saludar: 'wave', emote_punta: 'dance', emote_celebrar: 'celebrate', emote_aplaudir: 'clap', emote_gol: 'celebrate', emote_sique: 'dance2' };
/** Lanza un emote del jugador (lo usa la rueda de emotes de la interfaz). */
export function playEmote(id: string) {
  if (!useGame.getState().useEmote(id)) return false;
  player.emote = { anim: EMOTE_ANIM[id] ?? 'dance', until: performance.now() + 4200 }; return true;
}

export function PlayerController() {
  const group = useRef<THREE.Group>(null), veh = useRef<THREE.Group>(null);
  const avatar = useGame(s => s.profile.avatar), name = useGame(s => s.profile.name);
  const camera = useThree(s => s.camera) as THREE.PerspectiveCamera;
  const st = useRef({ coyote: 0, buffer: 0, stepT: 0, wasGround: true, camPos: new THREE.Vector3(0, 6, 10) });
  const [vehicleKind, setVehicleKind] = useState('');
  const Vehicle = (art.props as any)[vehicleKind] as undefined | ((p: any) => any);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05), s = st.current, b = player.body, now = performance.now(), paused = isPaused();
    const sens = useGame.getState().profile.settings, g = group.current;
    // --- cámara: giro con arrastre, zoom con rueda
    if (!player.fixedCam) {
      player.camYaw -= input.lookX * 0.005 * sens.sens;
      player.camPitch = Math.max(-0.15, Math.min(1.25, player.camPitch + input.lookY * 0.004 * sens.sens * (sens.invertY ? -1 : 1)));
      player.camDist = Math.max(3.5, Math.min(16, player.camDist + input.zoom * 0.8));
    }
    input.lookX = input.lookY = input.zoom = 0;

    if (!paused) {
      const v = player.vehicle;
      if (v) {
        // --- vehículo: W/S acelera y frena, A/D gira
        const acc = -input.mz, steer = -input.mx;
        v.speed += acc * 16 * dt; v.speed *= 1 - Math.min(1, dt * (acc === 0 ? 1.6 : 0.5)); v.speed = Math.max(-v.maxSpeed * 0.4, Math.min(v.maxSpeed, v.speed));
        player.yaw += steer * dt * 1.9 * Math.max(-1, Math.min(1, v.speed / 4));
        b.vel[0] = -Math.sin(player.yaw) * v.speed; b.vel[2] = -Math.cos(player.yaw) * v.speed;
        const px = b.pos[0], pz = b.pos[2]; stepBody(b, dt);
        if (Math.hypot(b.pos[0] - px, b.pos[2] - pz) < Math.abs(v.speed) * dt * 0.5) v.speed *= 0.5; // chocó
        player.camYaw += (player.yaw - player.camYaw) * Math.min(1, dt * 2.5);
        player.state.anim = 'drive'; player.state.speed = 0;
        if (input.take('use')) { const exit = v.onExit; player.vehicle = null; b.radius = 0.42; b.pos[0] += Math.cos(player.yaw) * 1.8; b.pos[2] -= Math.sin(player.yaw) * 1.8; exit?.(); }
        input.take('jump');
      } else {
        // --- a pie
        const ctl = player.control;
        let mx = ctl ? input.mx : 0, mz = ctl ? input.mz : 0; const len = Math.hypot(mx, mz);
        if (len > 1) { mx /= len; mz /= len; }
        const run = input.run || len > 0.92, speed = (run ? player.sprint : player.walk) * player.speedMul;
        const cy = Math.cos(player.camYaw), sy = Math.sin(player.camYaw);
        const wx = mx * cy + mz * sy, wz = -mx * sy + mz * cy;
        const k = Math.min(1, dt * (b.grounded ? 14 : 5));
        b.vel[0] += (wx * speed - b.vel[0]) * k; b.vel[2] += (wz * speed - b.vel[2]) * k;
        if (len > 0.05) { const target = Math.atan2(-wx, -wz); let d = target - player.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); player.yaw += d * Math.min(1, dt * 12); }
        s.coyote = b.grounded ? 0.12 : s.coyote - dt;
        if (ctl && input.take('jump')) s.buffer = 0.14; else s.buffer -= dt;
        if (!ctl) input.pressed.delete('jump');
        if (s.buffer > 0 && s.coyote > 0) { b.vel[1] = player.jumpV * player.jumpMul; b.grounded = false; s.coyote = 0; s.buffer = 0; audio.sfx('jump'); if (player.emote) player.emote = null; }
        stepBody(b, dt);
        if (b.grounded && !s.wasGround) audio.sfx('land'); s.wasGround = b.grounded;
        if (b.pos[1] < phys.killY) player.respawn();
        // --- animación
        const hs = Math.hypot(b.vel[0], b.vel[2]);
        let anim: Anim = !b.grounded ? (b.vel[1] > 0 ? 'jump' : 'fall') : hs > 6.4 ? 'run' : hs > 0.6 ? 'walk' : 'idle';
        if (player.emote) { if (anim !== 'idle' || now > player.emote.until) player.emote = null; else anim = player.emote.anim; }
        if (player.override) { if (now > player.override.until) player.override = null; else anim = player.override.anim; }
        player.state.anim = anim; player.state.speed = hs;
        if (b.grounded && hs > 1) { s.stepT -= dt * hs; if (s.stepT <= 0) { s.stepT = 2.4; audio.sfx('step'); } }
        // --- interacción cercana
        const near = ctl ? nearest(b.pos[0], b.pos[1], b.pos[2]) : null;
        useGame.getState().setPrompt(near ? { label: near.label, icon: near.icon } : null);
        if (near && input.take('use')) { audio.sfx('click'); near.onUse(); }
      }
    }
    // --- colocar modelo
    if (g) { g.position.set(b.pos[0], b.pos[1], b.pos[2]); g.rotation.y = player.yaw + Math.PI; g.visible = player.visible; }
    const vk = player.vehicle?.kind ?? ''; if (vk !== vehicleKind) setVehicleKind(vk);
    // --- cámara
    const fc = player.fixedCam;
    if (fc) {
      tmp.set(fc.pos[0], fc.pos[1], fc.pos[2]); s.camPos.lerp(tmp, Math.min(1, dt * 5)); camera.position.copy(s.camPos);
      look.set(fc.target[0], fc.target[1], fc.target[2]); camera.lookAt(look);
      const fov = fc.fov ?? 60; if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }
    } else {
      const dist = player.camDist * (player.vehicle ? 1.35 : 1), cp = Math.cos(player.camPitch), sp = Math.sin(player.camPitch);
      const tx = b.pos[0], ty = b.pos[1] + 1.5, tz = b.pos[2];
      tmp.set(tx + Math.sin(player.camYaw) * cp * dist, Math.max(phys.ground(tx, tz) + 0.4, ty + sp * dist), tz + Math.cos(player.camYaw) * cp * dist);
      s.camPos.lerp(tmp, Math.min(1, dt * 12)); camera.position.copy(s.camPos); look.set(tx, ty, tz); camera.lookAt(look);
      if (Math.abs(camera.fov - 60) > 0.1) { camera.fov += (60 - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }
    }
  }, -10);

  return <group ref={group}>
    <group ref={veh} rotation-y={Math.PI}>{Vehicle && <Vehicle pos={[0, 0, 0]} solid={false} />}</group>
    <group position={[0, vehicleKind ? 0.55 : 0, 0]}><art.Avatar config={avatar} state={player.state} name={name} /></group>
  </group>;
}

/** Sube al jugador a un vehículo. `kind` es una pieza de utilería del arte: 'Mototaxi', 'Bus', 'Car'. */
export function enterVehicle(kind: 'Mototaxi' | 'Bus' | 'Car', onExit?: () => void) {
  player.vehicle = { kind, speed: 0, maxSpeed: kind === 'Bus' ? 13 : 16, radius: 1.3, onExit }; player.body.radius = 1.3; player.emote = null;
  useGame.getState().setPrompt({ label: 'Bajarse', icon: '🚪' });
}
