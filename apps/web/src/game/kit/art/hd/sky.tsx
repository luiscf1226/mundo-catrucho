// Cielo, luz y clima del paquete HD.
//  - cúpula con shader propio: degradado físico aproximado, sol, luna, estrellas y nubes que se mueven
//  - una sola luz direccional con sombras suaves que sigue al jugador (sol de día, luna de noche)
//  - luz de relleno hemisférica + mapa de entorno generado del mismo cielo (reflejos en metal, agua, oro)
//  - niebla con el color del horizonte (perspectiva aérea)
//  - time="auto": ciclo completo de día y noche;  weather="auto": despejado → nublado → lluvia → escampa
// Escribe env.hour y env.weather en cada cuadro. Para pruebas: #hora=18 fija la hora inicial del ciclo y
// #ciclo=rapido acelera el día (48 s) y el clima.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { env } from '../../../../core/env';
import { player } from '../../../../core/player';
import { isPaused } from '../../../../core/store';
import type { SkyRigProps } from '../types';
import { G } from './materials';

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
interface Key {
  h: number;
  zen: RGB;
  hor: RGB;
  sun: RGB;
  sunI: number;
  hs: RGB;
  hg: RGB;
  hemiI: number;
  envI: number;
  exp: number;
  stars: number;
  cl: RGB;
  cd: RGB;
}
const K = (
  h: number,
  zen: string,
  hor: string,
  sun: string,
  sunI: number,
  hs: string,
  hg: string,
  hemiI: number,
  envI: number,
  exp: number,
  stars: number,
  cl: string,
  cd: string,
): Key => ({
  h,
  zen: hex(zen),
  hor: hex(hor),
  sun: hex(sun),
  sunI,
  hs: hex(hs),
  hg: hex(hg),
  hemiI,
  envI,
  exp,
  stars,
  cl: hex(cl),
  cd: hex(cd),
});
// hora, cenit, horizonte, luz, intensidad, hemisferio cielo/suelo, int. hemisferio, int. entorno, exposición, estrellas, nube clara/oscura
const KEYS: Key[] = [
  K(0, '#070c22', '#1b2a52', '#9db8ff', 0.85, '#5066a8', '#232a44', 1.25, 0.55, 1.12, 1, '#3a4670', '#141a33'),
  K(4.6, '#0a1130', '#22335e', '#9db8ff', 0.8, '#5066a8', '#232a44', 1.25, 0.55, 1.12, 1, '#3d4a74', '#161c36'),
  K(5.6, '#27407e', '#e0876a', '#ffb48a', 0.5, '#8d90c0', '#4a4250', 1.1, 0.6, 1.06, 0.25, '#f0a58c', '#5a4a6e'),
  K(6.4, '#3d78c4', '#ffc38d', '#ffb877', 1.9, '#b9c6e6', '#7a6a58', 0.95, 0.7, 1, 0, '#ffe1c2', '#b98a86'),
  K(8, '#3388e2', '#c4e3f8', '#ffe9c8', 2.9, '#cfe2ff', '#8c8266', 0.9, 0.8, 1, 0, '#ffffff', '#b7c4d6'),
  K(11, '#2a7be0', '#b4dcfb', '#fff4de', 3.3, '#d4e6ff', '#94896a', 0.9, 0.85, 1, 0, '#ffffff', '#b9c6d8'),
  K(15, '#2a7be0', '#b6dcf8', '#fff1d6', 3.2, '#d4e6ff', '#94896a', 0.9, 0.85, 1, 0, '#ffffff', '#b9c6d8'),
  K(16.8, '#3478cf', '#ffe0ad', '#ffcf94', 2.9, '#d9d6e6', '#96825e', 0.9, 0.8, 1, 0, '#fff0d6', '#c8a998'),
  K(17.8, '#3a5aa8', '#ff9a55', '#ff9450', 2.2, '#c9aecd', '#8a6a52', 0.95, 0.75, 1.02, 0, '#ffc79a', '#a86a78'),
  K(18.6, '#28306e', '#e0647a', '#ff7a55', 0.7, '#9a86c0', '#544660', 1.05, 0.65, 1.06, 0.3, '#f08a8e', '#5e4474'),
  K(19.4, '#0d1436', '#3a3a70', '#9db8ff', 0.35, '#5a6aa8', '#262c48', 1.2, 0.55, 1.1, 0.85, '#4e4a7c', '#1a1d3a'),
  K(20.2, '#070c22', '#1b2a52', '#9db8ff', 0.85, '#5066a8', '#232a44', 1.25, 0.55, 1.12, 1, '#3a4670', '#141a33'),
  K(24, '#070c22', '#1b2a52', '#9db8ff', 0.85, '#5066a8', '#232a44', 1.25, 0.55, 1.12, 1, '#3a4670', '#141a33'),
];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (o: RGB, a: RGB, b: RGB, t: number) => {
  o[0] = lerp(a[0], b[0], t);
  o[1] = lerp(a[1], b[1], t);
  o[2] = lerp(a[2], b[2], t);
  return o;
};
const sstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const cur: Key = {
  ...KEYS[0],
  zen: [0, 0, 0],
  hor: [0, 0, 0],
  sun: [0, 0, 0],
  hs: [0, 0, 0],
  hg: [0, 0, 0],
  cl: [0, 0, 0],
  cd: [0, 0, 0],
};
function sample(hour: number) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].h <= hour) i++;
  const a = KEYS[i],
    b = KEYS[i + 1],
    t = sstep(0, 1, (hour - a.h) / (b.h - a.h));
  lerp3(cur.zen, a.zen, b.zen, t);
  lerp3(cur.hor, a.hor, b.hor, t);
  lerp3(cur.sun, a.sun, b.sun, t);
  lerp3(cur.hs, a.hs, b.hs, t);
  lerp3(cur.hg, a.hg, b.hg, t);
  lerp3(cur.cl, a.cl, b.cl, t);
  lerp3(cur.cd, a.cd, b.cd, t);
  cur.sunI = lerp(a.sunI, b.sunI, t);
  cur.hemiI = lerp(a.hemiI, b.hemiI, t);
  cur.envI = lerp(a.envI, b.envI, t);
  cur.exp = lerp(a.exp, b.exp, t);
  cur.stars = lerp(a.stars, b.stars, t);
  return cur;
}

// --- reloj del mundo: sobrevive a los cambios de escena
const hashNum = (k: string) => {
  const m = typeof location !== 'undefined' ? new RegExp(`${k}=([0-9.]+)`).exec(location.hash) : null;
  return m ? parseFloat(m[1]) : null;
};
const FAST = typeof location !== 'undefined' && location.hash.includes('ciclo=rapido');
export const world = { hour: hashNum('hora') ?? 9, wt: 0, cover: 0.3, rain: 0, fog: 0, wet: 0 };
/** duración real de un día completo en segundos; la noche pasa más rápido que el día */
const DAY_SECONDS = FAST ? 48 : 420;
function advance(dt: number) {
  const night = world.hour < 5 || world.hour > 19.5;
  world.hour = (world.hour + ((dt * 24) / DAY_SECONDS) * (night ? 1.7 : 0.82)) % 24;
  world.wt += dt * (FAST ? 12 : 1);
}
// línea de tiempo del clima automático (segundos): [duración, nubes, lluvia]
const WX: [number, number, number][] = [
  [170, 0.28, 0],
  [45, 0.6, 0],
  [40, 0.95, 0],
  [110, 1, 1],
  [45, 0.8, 0],
  [70, 0.45, 0],
];
const WX_TOTAL = WX.reduce((s, w) => s + w[0], 0);
function autoWeather(): [number, number] {
  let t = world.wt % WX_TOTAL;
  for (const w of WX) {
    if (t < w[0]) return [w[1], w[2]];
    t -= w[0];
  }
  return [0.3, 0];
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); gl_Position = p.xyww; }
`;
const SKY_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uZen, uHor, uSunCol, uSunDir, uMoonDir, uCloudC, uCloudD;
uniform float uTime, uStars, uCover, uSunVis, uMoonVis;
varying vec3 vDir;
float hash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float hash3( vec3 p ) { p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) ); p += dot( p, p.yxz + 33.33 ); return fract( ( p.x + p.y ) * p.z ); }
float noise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f ); return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), f.x ), mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), f.x ), f.y ); }
float fbm( vec2 p ) { float s = 0.0, a = 0.5; for ( int i = 0; i < 5; i++ ) { s += a * noise( p ); p = p * 2.03 + vec2( 17.1, 3.7 ); a *= 0.5; } return s; }
void main() {
  vec3 d = normalize( vDir );
  float h = max( d.y, 0.0 );
  vec3 col = mix( uHor, uZen, pow( h, 0.48 ) );
  col = mix( col, uHor * 0.94, smoothstep( 0.0, -0.25, d.y ) );
  float s = max( dot( d, uSunDir ), 0.0 ), m = max( dot( d, uMoonDir ), 0.0 );
  // halo del sol: más ancho y cálido cerca del horizonte
  vec3 glow = uSunCol * ( pow( s, 420.0 ) * 0.9 + pow( s, 28.0 ) * 0.28 + pow( s, 5.0 ) * 0.22 * pow( 1.0 - h, 5.0 ) );
  col += glow * uSunVis;
  col = mix( col, vec3( 1.0, 0.98, 0.9 ), smoothstep( 0.99935, 0.99965, s ) * uSunVis );
  // estrellas
  vec3 sp = d * 95.0, ic = floor( sp ), fc = fract( sp ) - 0.5; float hs = hash3( ic );
  float star = step( 0.986, hs ) * smoothstep( 0.2, 0.02, length( fc ) ) * ( 0.65 + 0.35 * sin( uTime * 2.5 + hs * 97.0 ) );
  col += vec3( 0.95, 0.97, 1.0 ) * star * uStars * smoothstep( 0.02, 0.2, d.y );
  // luna
  float md = smoothstep( 0.99895, 0.99915, m );
  vec3 moonC = vec3( 0.95, 0.96, 1.0 ) * ( 0.86 + 0.14 * noise( d.xy * 70.0 ) - 0.1 * smoothstep( 0.4, 0.6, noise( d.zy * 160.0 ) ) );
  col += vec3( 0.55, 0.65, 0.9 ) * ( pow( m, 260.0 ) * 0.35 + pow( m, 20.0 ) * 0.08 ) * uMoonVis;
  col = mix( col, moonC, md * uMoonVis );
  // nubes: ruido proyectado en un plano alto, iluminado desde el lado del sol
  vec2 cuv = d.xz / ( h + 0.09 ) * 0.75 + uTime * vec2( 0.011, 0.005 );
  float n = fbm( cuv ), th = mix( 0.74, 0.22, uCover );
  float cl = smoothstep( th, th + 0.3, n ) * smoothstep( 0.0, 0.16, d.y );
  vec3 ld = uSunVis > 0.01 ? uSunDir : uMoonDir;
  float n2 = fbm( cuv + ld.xz * 0.14 );
  float lit = clamp( 0.6 + ( n - n2 ) * 2.4 - cl * 0.25 * uCover, 0.0, 1.0 );
  vec3 cc = mix( uCloudD, uCloudC, lit ) + uSunCol * pow( s, 7.0 ) * 0.3 * uSunVis;
  col = mix( col, cc, cl * 0.94 );
  col += ( hash( gl_FragCoord.xy ) - 0.5 ) / 200.0;
  gl_FragColor = vec4( col, 1.0 );
}
`;
// escena mínima para el mapa de entorno (valores lineales)
const ENV_FRAG = /* glsl */ `
uniform vec3 uZen, uHor, uGround, uSunCol, uSunDir; varying vec3 vDir;
void main() {
  vec3 d = normalize( vDir ); float h = max( d.y, 0.0 );
  vec3 col = mix( uHor, uZen, pow( h, 0.5 ) );
  col = mix( col, uGround, smoothstep( 0.02, -0.2, d.y ) );
  float s = max( dot( d, uSunDir ), 0.0 );
  col += uSunCol * ( pow( s, 60.0 ) * 6.0 + pow( s, 6.0 ) * 0.35 );
  gl_FragColor = vec4( col, 1.0 );
}
`;
const RAIN_VERT = /* glsl */ `
attribute float aEnd; uniform vec3 uCam; uniform float uTime, uRain; varying float vA;
void main() {
  const float W = 34.0, H = 20.0;
  float seed = fract( position.x * 91.7 + position.z * 37.3 );
  vec3 p;
  p.x = mod( position.x * W - uCam.x, W ) - W * 0.5 + uCam.x;
  p.z = mod( position.z * W - uCam.z, W ) - W * 0.5 + uCam.z;
  p.y = mod( position.y * H - uTime * ( 19.0 + seed * 9.0 ) - uCam.y, H ) - H * 0.3 + uCam.y;
  p += aEnd * vec3( 0.07, 0.5 + seed * 0.35, 0.03 );
  vec4 mv = viewMatrix * vec4( p, 1.0 );
  vA = step( seed, uRain * 1.05 ) * ( 0.22 + 0.3 * seed ) * smoothstep( 0.6, 3.0, - mv.z ) * ( 1.0 - smoothstep( 12.0, 17.0, - mv.z ) ) * ( 1.0 - aEnd * 0.7 );
  gl_Position = projectionMatrix * mv;
}
`;
const RAIN_FRAG = /* glsl */ `
uniform vec3 uCol; varying float vA; void main() { gl_FragColor = vec4( uCol, vA ); }
`;
const SPLASH_VERT = /* glsl */ `
uniform vec3 uCam; uniform float uTime, uRain, uGround, uScale; varying float vA; varying float vPh;
void main() {
  const float W = 26.0;
  float seed = fract( position.x * 51.3 + position.z * 17.9 );
  float t = uTime * ( 1.3 + seed ) + seed * 9.0; vPh = fract( t ); float cyc = floor( t );
  vec3 p; vec2 jit = vec2( fract( sin( cyc * 12.9 + seed * 78.2 ) * 437.5 ), fract( sin( cyc * 39.3 + seed * 11.1 ) * 917.3 ) );
  p.x = mod( ( position.x + jit.x ) * W - uCam.x, W ) - W * 0.5 + uCam.x;
  p.z = mod( ( position.z + jit.y ) * W - uCam.z, W ) - W * 0.5 + uCam.z;
  p.y = uGround + 0.04;
  vec4 mv = viewMatrix * vec4( p, 1.0 );
  vA = step( seed, uRain ) * ( 1.0 - vPh ) * 0.55 * ( 1.0 - smoothstep( 9.0, 13.0, - mv.z ) );
  gl_PointSize = uScale * ( 0.1 + 0.3 * vPh ) / max( 0.5, - mv.z );
  gl_Position = projectionMatrix * mv;
}
`;
const SPLASH_FRAG = /* glsl */ `
uniform vec3 uCol; varying float vA; varying float vPh;
void main() { vec2 q = ( gl_PointCoord - 0.5 ) * vec2( 2.0, 4.4 ); float r = length( q ); float ring = smoothstep( 0.55, 0.8, r ) * ( 1.0 - smoothstep( 0.85, 1.0, r ) ); if ( ring * vA < 0.01 ) discard; gl_FragColor = vec4( uCol, ring * vA ); }
`;

const v3 = (c: RGB) => new THREE.Vector3(c[0], c[1], c[2]);
const tmpC = new THREE.Color(),
  sunDir = new THREE.Vector3(),
  moonDir = new THREE.Vector3(),
  lightDir = new THREE.Vector3(),
  tA = new THREE.Vector3(),
  tB = new THREE.Vector3(),
  tC = new THREE.Vector3();
const zen: RGB = [0, 0, 0],
  hor: RGB = [0, 0, 0],
  grayS: RGB = [0, 0, 0];

export function SkyRig({
  time = 'dia',
  weather = 'despejado',
  shadowRadius = 45,
  indoor = false,
  fogColor,
  fogFar = 260,
}: SkyRigProps) {
  const sun = useRef<THREE.DirectionalLight>(null),
    hemi = useRef<THREE.HemisphereLight>(null),
    dome = useRef<THREE.Mesh>(null),
    rain = useRef<THREE.LineSegments>(null),
    splash = useRef<THREE.Points>(null);
  const scene = useThree((s) => s.scene),
    gl = useThree((s) => s.gl);
  const fogC = useMemo(() => (fogColor ? hex(`#${new THREE.Color(fogColor).getHexString()}`) : null), [fogColor]);

  const R = useMemo(() => {
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        uZen: { value: new THREE.Vector3() },
        uHor: { value: new THREE.Vector3() },
        uSunCol: { value: new THREE.Vector3() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
        uCloudC: { value: new THREE.Vector3() },
        uCloudD: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uStars: { value: 0 },
        uCover: { value: 0.3 },
        uSunVis: { value: 1 },
        uMoonVis: { value: 0 },
      },
    });
    const skyGeo = new THREE.SphereGeometry(1, 32, 20);
    // entorno
    const envMat = new THREE.ShaderMaterial({
      vertexShader:
        'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
      fragmentShader: ENV_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uZen: { value: new THREE.Color() },
        uHor: { value: new THREE.Color() },
        uGround: { value: new THREE.Color() },
        uSunCol: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      },
    });
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 14), envMat));
    const cubeRT = new THREE.WebGLCubeRenderTarget(64, { type: THREE.HalfFloatType, generateMipmaps: false }),
      cubeCam = new THREE.CubeCamera(0.1, 50, cubeRT);
    const pmrem = new THREE.PMREMGenerator(gl);
    // lluvia
    const N = 1500,
      rp = new Float32Array(N * 6),
      re = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = Math.random(),
        y = Math.random(),
        z = Math.random();
      rp.set([x, y, z, x, y, z], i * 6);
      re[i * 2 + 1] = 1;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    rainGeo.setAttribute('aEnd', new THREE.BufferAttribute(re, 1));
    const rainMat = new THREE.ShaderMaterial({
      vertexShader: RAIN_VERT,
      fragmentShader: RAIN_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        uCam: { value: new THREE.Vector3() },
        uTime: G.uTime,
        uRain: { value: 0 },
        uCol: { value: new THREE.Vector3(0.8, 0.86, 0.95) },
      },
    });
    const M = 260,
      sp = new Float32Array(M * 3);
    for (let i = 0; i < M * 3; i++) sp[i] = Math.random();
    const splashGeo = new THREE.BufferGeometry();
    splashGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const splashMat = new THREE.ShaderMaterial({
      vertexShader: SPLASH_VERT,
      fragmentShader: SPLASH_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        uCam: rainMat.uniforms.uCam,
        uTime: G.uTime,
        uRain: rainMat.uniforms.uRain,
        uGround: { value: 0 },
        uScale: { value: 600 },
        uCol: rainMat.uniforms.uCol,
      },
    });
    return {
      skyMat,
      skyGeo,
      envMat,
      envScene,
      cubeRT,
      cubeCam,
      pmrem,
      pmremRT: null as THREE.WebGLRenderTarget | null,
      rainGeo,
      rainMat,
      splashGeo,
      splashMat,
      envSig: -1,
      envT: -99,
      fog: new THREE.Fog('#b4dcfb', 60, fogFar),
      first: true,
    };
  }, [gl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prevFog = scene.fog,
      prevBg = scene.background,
      prevEnv = scene.environment,
      prevExp = gl.toneMappingExposure;
    scene.fog = R.fog;
    scene.background = new THREE.Color('#b4dcfb');
    return () => {
      scene.fog = prevFog;
      scene.background = prevBg;
      scene.environment = prevEnv;
      scene.environmentIntensity = 1;
      gl.toneMappingExposure = prevExp;
      R.skyMat.dispose();
      R.skyGeo.dispose();
      R.envMat.dispose();
      R.cubeRT.dispose();
      R.pmrem.dispose();
      R.pmremRT?.dispose();
      R.rainGeo.dispose();
      R.rainMat.dispose();
      R.splashGeo.dispose();
      R.splashMat.dispose();
    };
  }, [R, scene, gl]);

  useFrame((st, rawDt) => {
    const dt = Math.min(rawDt, 0.1),
      paused = isPaused(),
      cam = st.camera,
      T = st.clock.elapsedTime;
    if (!paused && time === 'auto') advance(dt);
    else if (!paused) world.wt += dt * (FAST ? 12 : 1);
    const hour = indoor ? 12 : time === 'auto' ? world.hour : time === 'noche' ? 22 : time === 'tarde' ? 17.6 : 10.5;
    // --- clima: valores objetivo y suavizado
    let tc = 0.28,
      tr = 0,
      tf = 0;
    if (weather === 'lluvia') {
      tc = 1;
      tr = 1;
    } else if (weather === 'neblina') {
      tc = 0.55;
      tf = 1;
    } else if (weather === 'auto') {
      [tc, tr] = autoWeather();
      tf = time === 'auto' ? sstep(5, 6.2, hour) * (1 - sstep(7.2, 8.6, hour)) * 0.85 : 0;
    }
    if (indoor) {
      tc = 0;
      tr = 0;
      tf = 0;
    }
    const k = R.first ? 1 : 1 - Math.exp(-dt * (FAST ? 2.5 : 0.35));
    world.cover += (tc - world.cover) * k;
    world.rain += (tr - world.rain) * k;
    world.fog += (tf - world.fog) * k;
    world.wet +=
      ((world.rain > 0.25 ? 1 : 0) - world.wet) *
      (R.first ? 1 : 1 - Math.exp(-dt * (world.rain > 0.25 ? (FAST ? 2 : 0.25) : FAST ? 0.6 : 0.05)));
    R.first = false;
    const over = sstep(0.55, 1, world.cover),
      rainK = world.rain;
    env.hour = hour;
    env.weather = rainK > 0.3 ? 'lluvia' : world.fog > 0.5 ? 'neblina' : 'despejado';
    G.uTime.value = T;
    G.uWet.value = indoor ? 0 : world.wet;
    G.uNight.value = indoor ? 0.7 : Math.max(sstep(18.1, 18.9, hour), 1 - sstep(5.2, 5.9, hour), over * rainK * 0.5);

    // --- astros
    const ang = ((hour - 6) / 12) * Math.PI;
    sunDir.set(Math.cos(ang) * 0.86, Math.sin(ang), 0.42 * Math.cos(ang * 0.5 - 0.6) + 0.18).normalize();
    moonDir.set(-Math.cos(ang) * 0.8, -Math.sin(ang), -0.45).normalize();
    if (moonDir.y < 0.25 && sunDir.y < 0) {
      moonDir.y = Math.max(moonDir.y, 0.25 * sstep(0, -0.2, sunDir.y) + moonDir.y * (1 - sstep(0, -0.2, sunDir.y)));
      moonDir.normalize();
    }
    const c = sample(hour),
      useSun = sunDir.y > -0.06;
    // cielo nublado: todo tiende a un gris con la luminosidad de la hora
    const lum = c.hor[0] * 0.3 + c.hor[1] * 0.5 + c.hor[2] * 0.2;
    grayS[0] = lum * 0.82;
    grayS[1] = lum * 0.87;
    grayS[2] = lum * 0.93;
    const ov = over * (0.55 + 0.4 * rainK);
    lerp3(zen, c.zen, grayS, ov * 0.9);
    lerp3(hor, c.hor, grayS, ov * 0.75);
    if (world.fog > 0.01) {
      const fg: RGB = [lum * 0.95 + 0.05, lum * 0.97 + 0.03, lum + 0.0];
      lerp3(hor, hor, fg, world.fog * 0.8);
      lerp3(zen, zen, fg, world.fog * 0.45);
    }
    if (fogC) {
      const b = Math.min(1.1, lum / 0.82);
      hor[0] = fogC[0] * b;
      hor[1] = fogC[1] * b;
      hor[2] = fogC[2] * b;
    }

    const sunVis = sstep(-0.1, 0.02, sunDir.y),
      moonVis = sstep(-0.02, 0.12, moonDir.y) * (1 - sstep(-0.12, 0.05, sunDir.y));
    const u = R.skyMat.uniforms;
    u.uZen.value.set(zen[0], zen[1], zen[2]);
    u.uHor.value.set(hor[0], hor[1], hor[2]);
    u.uSunCol.value.set(c.sun[0], c.sun[1], c.sun[2]).multiplyScalar(1 - ov * 0.8);
    u.uSunDir.value.copy(sunDir);
    u.uMoonDir.value.copy(moonDir);
    u.uTime.value = T;
    u.uStars.value = c.stars * (1 - over);
    u.uCover.value = world.cover;
    u.uSunVis.value = sunVis;
    u.uMoonVis.value = moonVis;
    const cd = 1 - ov * 0.45;
    u.uCloudC.value.set(
      lerp(c.cl[0], grayS[0] * 0.95, ov),
      lerp(c.cl[1], grayS[1] * 0.95, ov),
      lerp(c.cl[2], grayS[2] * 0.95, ov),
    );
    u.uCloudD.value.set(c.cd[0] * cd, c.cd[1] * cd, c.cd[2] * cd);
    if (dome.current) {
      dome.current.position.copy(cam.position);
      dome.current.visible = !indoor;
    }

    // --- niebla y fondo
    const far = fogFar * (1 - 0.45 * rainK) * (1 - 0.78 * world.fog),
      fog = R.fog;
    if (indoor) {
      fog.color.set(fogColor ?? '#1c1612');
      fog.near = fogFar * 0.5;
      fog.far = fogFar * 1.5;
    } else {
      fog.color.setRGB(hor[0], hor[1], hor[2], THREE.SRGBColorSpace);
      fog.far = far;
      fog.near = far * lerp(0.28, 0.04, Math.max(world.fog, rainK * 0.5));
    }
    (scene.background as THREE.Color).copy(fog.color);

    // --- luces
    const L = sun.current,
      H = hemi.current;
    if (L && H) {
      if (indoor) {
        lightDir.set(0.25, 1, 0.35).normalize();
        L.color.set('#ffe2b8');
        L.intensity = 1.6;
        H.color.set('#ffe8c8');
        H.groundColor.set('#5a4636');
        H.intensity = 2.1;
        L.shadow.radius = 4;
      } else {
        lightDir.copy(useSun ? sunDir : moonDir);
        lightDir.y = Math.max(lightDir.y, 0.24);
        lightDir.normalize();
        const fade = useSun ? sstep(-0.06, 0.1, sunDir.y) : sstep(0.06, 0.2, -sunDir.y);
        L.color.setRGB(c.sun[0], c.sun[1], c.sun[2], THREE.SRGBColorSpace);
        L.intensity = c.sunI * fade * (1 - ov * 0.78);
        H.color.setRGB(
          lerp(c.hs[0], grayS[0] + 0.1, ov * 0.7),
          lerp(c.hs[1], grayS[1] + 0.1, ov * 0.7),
          lerp(c.hs[2], grayS[2] + 0.1, ov * 0.7),
          THREE.SRGBColorSpace,
        );
        H.groundColor.setRGB(c.hg[0], c.hg[1], c.hg[2], THREE.SRGBColorSpace);
        H.intensity = c.hemiI * (1 + ov * 0.25);
        L.shadow.radius = 2.2 + ov * 4;
        L.shadow.intensity = 1 - ov * 0.45;
      }
      // la luz sigue al jugador; el centro se ajusta a la rejilla del mapa de sombras para que no tiemblen
      const p = player.pos,
        texel = (shadowRadius * 2) / L.shadow.mapSize.x;
      tA.set(0, 1, 0);
      tB.crossVectors(tA, lightDir).normalize();
      tC.crossVectors(lightDir, tB).normalize();
      tA.set(p[0], p[1], p[2]);
      const sx = Math.round(tA.dot(tB) / texel) * texel,
        sy = Math.round(tA.dot(tC) / texel) * texel,
        sz = tA.dot(lightDir);
      tA.set(0, 0, 0).addScaledVector(tB, sx).addScaledVector(tC, sy).addScaledVector(lightDir, sz);
      L.target.position.copy(tA);
      L.position.copy(tA).addScaledVector(lightDir, 90);
      L.target.updateMatrixWorld();
    }
    gl.toneMappingExposure = indoor ? 1 : c.exp * (1 - ov * 0.06);

    // --- mapa de entorno: se regenera solo cuando el cielo cambió lo suficiente
    const sig = indoor
      ? -5
      : zen[0] +
        zen[1] * 3 +
        zen[2] * 7 +
        hor[0] * 11 +
        hor[1] * 13 +
        hor[2] * 17 +
        sunDir.x * 0.6 +
        sunDir.y * 0.9 +
        L!.intensity * 0.2;
    if (Math.abs(sig - R.envSig) > 0.06 && T - R.envT > (R.envSig === -1 ? -1 : 1.5)) {
      R.envSig = sig;
      R.envT = T;
      const e = R.envMat.uniforms;
      if (indoor) {
        e.uZen.value.set('#8a6a4a');
        e.uHor.value.set('#6a5038');
        e.uGround.value.set('#3a2c20');
        e.uSunCol.value.set('#000000');
      } else {
        e.uZen.value.setRGB(zen[0], zen[1], zen[2], THREE.SRGBColorSpace);
        e.uHor.value.setRGB(hor[0], hor[1], hor[2], THREE.SRGBColorSpace);
        e.uGround.value.setRGB(c.hg[0], c.hg[1], c.hg[2], THREE.SRGBColorSpace).multiplyScalar(0.9);
        e.uSunCol.value
          .setRGB(c.sun[0], c.sun[1], c.sun[2], THREE.SRGBColorSpace)
          .multiplyScalar((useSun ? sunVis : moonVis * 0.25) * (1 - ov * 0.85));
        e.uSunDir.value.copy(useSun ? sunDir : moonDir);
      }
      const rt = gl.getRenderTarget();
      R.cubeCam.update(gl, R.envScene);
      R.pmremRT = R.pmrem.fromCubemap(R.cubeRT.texture, R.pmremRT as any) as THREE.WebGLRenderTarget;
      gl.setRenderTarget(rt);
      scene.environment = R.pmremRT.texture;
    }
    scene.environmentIntensity = indoor ? 0.9 : c.envI;
    tmpC.setRGB(lerp(zen[0], hor[0], 0.5), lerp(zen[1], hor[1], 0.5), lerp(zen[2], hor[2], 0.5), THREE.SRGBColorSpace);
    G.uSky.value.copy(tmpC);

    // --- lluvia
    const ru = R.rainMat.uniforms;
    ru.uCam.value.copy(cam.position);
    ru.uRain.value = rainK;
    const b = 0.5 + lum * 0.5;
    ru.uCol.value.set(0.78 * b, 0.84 * b, 0.95 * b);
    R.splashMat.uniforms.uGround.value = player.pos[1];
    R.splashMat.uniforms.uScale.value = st.size.height * st.viewport.dpr * 1.1;
    if (rain.current) rain.current.visible = rainK > 0.02;
    if (splash.current) splash.current.visible = rainK > 0.02;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#d4e6ff', '#94896a', 0.9]} />
      <directionalLight
        ref={sun}
        intensity={3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadowRadius}
        shadow-camera-right={shadowRadius}
        shadow-camera-top={shadowRadius}
        shadow-camera-bottom={-shadowRadius}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-bias={-0.0005}
        shadow-normalBias={0.045}
      />
      <mesh ref={dome} geometry={R.skyGeo} material={R.skyMat} scale={400} frustumCulled={false} renderOrder={-1000} />
      <lineSegments
        ref={rain}
        geometry={R.rainGeo}
        material={R.rainMat}
        frustumCulled={false}
        visible={false}
        renderOrder={900}
      />
      <points
        ref={splash}
        geometry={R.splashGeo}
        material={R.splashMat}
        frustumCulled={false}
        visible={false}
        renderOrder={901}
      />
    </>
  );
}
