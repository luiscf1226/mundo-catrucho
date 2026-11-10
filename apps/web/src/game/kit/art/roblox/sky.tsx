// Cielo y luz estilo Roblox: cúpula con degradado, sol (o luna y estrellas), nubes de bloques, un solo sol con
// sombras que sigue al jugador, luz de relleno y niebla suave. Lluvia = cielo gris + gotas.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { player } from '../../../../core/player';
import { env } from '../../../../core/env';
import type { SkyRigProps } from '../types';
import { Build, rng } from './geo';
import { ENVK, setNight, SUN, touchTime } from './mats';

interface Preset { top: string; mid: string; low: string; sun: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number; dir: [number, number, number]; envk: [number, number, number]; cloud: string; cloudShade: string; disc: string; discSize: number; hour: number }
const PRESETS: Record<string, Preset> = {
  dia: { top: '#1b7cf2', mid: '#62b5ff', low: '#d3ecff', sun: '#fff3d6', sunI: 2.05, hemiSky: '#eaf5ff', hemiGround: '#a9b89a', hemiI: 1.55, dir: [30, 50, 20], envk: [1, 1, 1], cloud: '#ffffff', cloudShade: '#c9dcf2', disc: '#fffbe0', discSize: 70, hour: 10 },
  tarde: { top: '#3f63c8', mid: '#f58f6c', low: '#ffd08a', sun: '#ffb672', sunI: 1.9, hemiSky: '#ffd9c2', hemiGround: '#9a8a86', hemiI: 1.3, dir: [44, 24, 20], envk: [1, 0.78, 0.62], cloud: '#ffd9c4', cloudShade: '#d98a8a', disc: '#ffd27a', discSize: 95, hour: 17.5 },
  noche: { top: '#050a1e', mid: '#12204a', low: '#2a3f78', sun: '#a9c2ff', sunI: 0.75, hemiSky: '#6f86c8', hemiGround: '#39405c', hemiI: 0.95, dir: [-26, 46, 18], envk: [0.16, 0.22, 0.42], cloud: '#3b4a78', cloudShade: '#222c50', disc: '#eef2ff', discSize: 44, hour: 22 },
};
const RAIN: Partial<Preset> = { top: '#6f8096', mid: '#9aa8b6', low: '#c3ccd4', sun: '#e6edf5', sunI: 0.75, hemiSky: '#dfe6ee', hemiGround: '#9aa39a', hemiI: 1.75, envk: [0.62, 0.66, 0.72], cloud: '#aab3bf', cloudShade: '#7f8997' };

const SKY_VS = /* glsl */`varying vec3 vDir; void main() { vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`;
const SKY_FS = /* glsl */`
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uLow; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uStars; varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
void main() {
  vec3 d = normalize(vDir); float h = d.y;
  vec3 c = mix(uLow, uMid, smoothstep(-0.02, 0.22, h)); c = mix(c, uTop, smoothstep(0.16, 0.75, h));
  c = mix(c, uLow * 0.92, smoothstep(0.0, -0.25, h));
  float s = max(dot(d, uSunDir), 0.0);
  c += uSunCol * (pow(s, 6.0) * 0.16 + pow(s, 60.0) * 0.3);
  if (uStars > 0.0 && h > 0.0) { vec3 g = floor(d * 170.0); float r = hash(g); float tw = step(0.9965, r) * smoothstep(0.0, 0.25, h); c += vec3(0.9, 0.95, 1.0) * tw * uStars * (0.5 + 0.5 * fract(r * 71.0)); }
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

function discTexture(soft: boolean) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d')!;
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  if (soft) { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
  else { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.42, 'rgba(255,255,255,1)'); g.addColorStop(0.47, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  if (!soft) { c.fillStyle = 'rgba(150,165,200,0.35)'; for (const [x, y, r] of [[50, 52, 9], [74, 70, 6], [60, 80, 4], [78, 48, 5]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** nubes de bloques fusionadas en una sola malla; el color sale del sombreado por cara (arriba claro, abajo oscuro) */
function cloudGeometry(n: number, seed: number) {
  const b = new Build(), r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, dist = 70 + r() * 300, cx = Math.cos(a) * dist, cz = Math.sin(a) * dist, cy = 78 + r() * 46, s = 0.8 + r() * 1.3;
    const parts = 3 + Math.floor(r() * 3);
    for (let j = 0; j < parts; j++) {
      const w = (16 + r() * 16) * s, h = (4.5 + r() * 4) * s, d = (11 + r() * 10) * s;
      b.box([cx + (j - (parts - 1) / 2) * 11 * s + (r() - 0.5) * 6, cy + (j % 2 ? h * 0.42 : 0) + (r() - 0.5) * 1.5, cz + (r() - 0.5) * 12 * s], [w, h, d], '#ffffff');
    }
  }
  const g = b.done('color'), nrm = g.attributes.normal, col = g.attributes.color;
  for (let i = 0; i < nrm.count; i++) { const y = nrm.getY(i), k = y > 0.5 ? 1 : y < -0.5 ? 0 : 0.62; col.setXYZ(i, k, k, k); }
  return g;
}

const RAIN_N = 520, RAIN_BOX = [44, 26, 44];
function Rain() {
  const ref = useRef<THREE.LineSegments>(null);
  const { geo, seeds } = useMemo(() => {
    const geo = new THREE.BufferGeometry(), r = rng(7), seeds = new Float32Array(RAIN_N * 4);
    for (let i = 0; i < RAIN_N; i++) { seeds[i * 4] = r() * RAIN_BOX[0]; seeds[i * 4 + 1] = r() * RAIN_BOX[1]; seeds[i * 4 + 2] = r() * RAIN_BOX[2]; seeds[i * 4 + 3] = 0.8 + r() * 0.5; }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAIN_N * 6), 3)); geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    return { geo, seeds };
  }, []);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: '#dcecff', transparent: true, opacity: 0.6, fog: false, toneMapped: false, depthWrite: false }), []);
  useFrame(({ camera, clock }) => {
    const p = geo.attributes.position as THREE.BufferAttribute, a = p.array as Float32Array, t = clock.elapsedTime, [bx, by, bz] = RAIN_BOX, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
    for (let i = 0; i < RAIN_N; i++) {
      const sp = seeds[i * 4 + 3], wrap = (v: number, c: number, s: number) => c + ((((v - c) % s) + s * 1.5) % s) - s / 2;
      const x = wrap(seeds[i * 4] - t * 1.6, cx, bx), y = wrap(seeds[i * 4 + 1] - t * 24 * sp, cy + 6, by), z = wrap(seeds[i * 4 + 2], cz, bz);
      a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = z; a[i * 6 + 3] = x + 0.045; a[i * 6 + 4] = y + 0.7 * sp; a[i * 6 + 5] = z;
    }
    p.needsUpdate = true;
  });
  return <lineSegments ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />;
}

export function SkyRig({ time = 'dia', weather = 'despejado', shadowRadius = 45, indoor = false, fogColor, fogFar = 260 }: SkyRigProps) {
  const tm = time === 'tarde' || time === 'noche' ? time : 'dia';
  const rain = weather === 'lluvia', mist = weather === 'neblina';
  const P: Preset = useMemo(() => ({ ...PRESETS[tm], ...(rain ? (tm === 'noche' ? { cloud: '#2c3550', cloudShade: '#1c2238', sunI: 0.5 } : RAIN) : {}) }), [tm, rain]);
  const scene = useThree(s => s.scene);
  const sun = useRef<THREE.DirectionalLight>(null), dome = useRef<THREE.Mesh>(null), disc = useRef<THREE.Sprite>(null), clouds = useRef<THREE.Mesh>(null);
  const dir = useMemo(() => new THREE.Vector3(...P.dir).normalize(), [P]);

  useEffect(() => {
    const bg = indoor ? '#2a2018' : P.low;
    const prevBg = scene.background, prevFog = scene.fog;
    scene.background = new THREE.Color(bg);
    const far = mist ? Math.min(fogFar, 90) : rain ? fogFar * 0.75 : fogFar;
    scene.fog = new THREE.Fog(fogColor ?? (indoor ? bg : mist ? '#dfe7ea' : P.low), mist ? 6 : far * (rain ? 0.2 : 0.42), far);
    setNight(tm === 'noche' && !indoor ? 1 : 0); env.hour = P.hour; env.weather = rain ? 'lluvia' : mist ? 'neblina' : 'despejado';
    SUN.value.copy(dir); ENVK.value.set(...(indoor ? [0.55, 0.5, 0.45] as [number, number, number] : P.envk));
    return () => { scene.background = prevBg; scene.fog = prevFog; };
  }, [scene, P, indoor, fogColor, fogFar, rain, mist, dir]);

  const skyMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false,
    uniforms: { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uLow: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uStars: { value: 0 } },
  }), []);
  useEffect(() => {
    const u = skyMat.uniforms; u.uTop.value.set(P.top); u.uMid.value.set(P.mid); u.uLow.value.set(P.low); u.uSunDir.value.copy(dir); u.uSunCol.value.set(rain ? '#000000' : P.sun); u.uStars.value = tm === 'noche' && !rain ? 1 : 0;
  }, [skyMat, P, dir, rain, tm]);
  const discTex = useMemo(() => discTexture(tm !== 'noche'), [tm]);
  const cloudGeo = useMemo(() => cloudGeometry(rain ? 34 : 20, rain ? 5 : 3), [rain]);
  const cloudMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false, transparent: true, opacity: tm === 'noche' ? 0.85 : 0.96 });
    const a = new THREE.Color(P.cloud), s = new THREE.Color(P.cloudShade);
    m.onBeforeCompile = sh => { sh.uniforms.cA = { value: a }; sh.uniforms.cS = { value: s }; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 cA; uniform vec3 cS;').replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(cS, cA, vColor.r);'); };
    m.customProgramCacheKey = () => 'rbxcloud';
    return m;
  }, [P, tm]);
  useEffect(() => () => { cloudGeo.dispose(); }, [cloudGeo]);
  useEffect(() => () => { cloudMat.dispose(); }, [cloudMat]);

  useFrame(({ camera, clock }) => {
    touchTime();
    const l = sun.current, p = player.pos;
    if (l) { l.position.set(p[0] + dir.x * 70, p[1] + dir.y * 70, p[2] + dir.z * 70); l.target.position.set(p[0], p[1], p[2]); l.target.updateMatrixWorld(); }
    if (dome.current) dome.current.position.copy(camera.position);
    if (disc.current) disc.current.position.copy(camera.position).addScaledVector(dir, 420);
    if (clouds.current) { const drift = (clock.elapsedTime * 1.4) % 120; clouds.current.position.set(camera.position.x * 0.9 + drift, 0, camera.position.z * 0.9); }
  });

  return <>
    <hemisphereLight args={indoor ? ['#fff1dc', '#7a6a58', 1.9] : [P.hemiSky, P.hemiGround, P.hemiI]} />
    <directionalLight ref={sun} intensity={indoor ? 1.3 : P.sunI} color={indoor ? '#ffe9c8' : P.sun} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-shadowRadius} shadow-camera-right={shadowRadius} shadow-camera-top={shadowRadius} shadow-camera-bottom={-shadowRadius} shadow-camera-near={1} shadow-camera-far={170} shadow-bias={-0.0004} shadow-normalBias={0.035} />
    {!indoor && <>
      <mesh ref={dome} material={skyMat} frustumCulled={false} renderOrder={-10}><sphereGeometry args={[300, 24, 14]} /></mesh>
      {!rain && <sprite ref={disc} scale={[P.discSize, P.discSize, 1]} renderOrder={-9}><spriteMaterial map={discTex} color={P.disc} transparent depthWrite={false} fog={false} toneMapped={false} blending={tm === 'noche' ? THREE.NormalBlending : THREE.AdditiveBlending} /></sprite>}
      <mesh ref={clouds} geometry={cloudGeo} material={cloudMat} frustumCulled={false} renderOrder={-8} />
      {rain && <Rain />}
    </>}
  </>;
}
