// Utilidades comunes de la utilería HD: caché de geometría, colisionadores con el mismo tamaño que el paquete
// base, malla fusionada con el material compartido y rótulos de texto iluminados.
import * as THREE from 'three';
import { boxCol, cylCol, useCollider } from '../../core';
import type { PropBase } from '../types';
import { propMaterial } from './materials';

const geos = new Map<string, THREE.BufferGeometry>();
/** geometría cacheada por clave (cada pieza se construye una sola vez por combinación de parámetros) */
export function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry { let g = geos.get(key); if (!g) { g = make(); geos.set(key, g); } return g; }

export const solidCyl = (a: PropBase, r: number, h: number) => useCollider(() => cylCol([a.pos[0], a.pos[1] + (h * (a.scale ?? 1)) / 2, a.pos[2]], r * (a.scale ?? 1), h * (a.scale ?? 1), { solid: a.solid !== false }), [`${a.pos}|${a.scale}|${a.solid}`]);
export const solidBox = (a: PropBase, w: number, h: number, d: number) => useCollider(() => { const k = a.scale ?? 1, c = Math.abs(Math.cos(a.rot ?? 0)), s = Math.abs(Math.sin(a.rot ?? 0)); return boxCol([a.pos[0], a.pos[1] + (h * k) / 2, a.pos[2]], [(w * c + d * s) * k, h * k, (w * s + d * c) * k], { solid: a.solid !== false }); }, [`${a.pos}|${a.scale}|${a.rot}|${a.solid}`]);

/** malla de utilería fusionada: una sola llamada de dibujo con el material compartido */
export function Merged({ g, two = false, cast = true }: { g: THREE.BufferGeometry; two?: boolean; cast?: boolean }) { return <mesh geometry={g} material={propMaterial(two)} castShadow={cast} receiveShadow />; }

const textMats = new Map<THREE.Texture, THREE.Material>();
/** material iluminado para un rótulo de texto (se lee de día y de noche) */
export function textMaterial(tex: THREE.Texture): THREE.Material {
  let m = textMats.get(tex); if (!m) { m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.75, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.3 }); textMats.set(tex, m); } return m;
}
const planes = new Map<string, THREE.PlaneGeometry>();
export function TextPlane({ tex, w, h, pos, ry = 0 }: { tex: THREE.Texture; w: number; h: number; pos: [number, number, number]; ry?: number }) {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}`; let g = planes.get(key); if (!g) { g = new THREE.PlaneGeometry(w, h); planes.set(key, g); }
  return <mesh position={pos} rotation-y={ry} geometry={g} material={textMaterial(tex)} />;
}
/** textura de halo radial (brillos aditivos de faroles, gemas y portales) */
let halo: THREE.CanvasTexture | null = null;
export function haloTexture() {
  if (halo) return halo;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d')!, g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.55)'); g.addColorStop(0.45, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  halo = new THREE.CanvasTexture(cv); return halo;
}
