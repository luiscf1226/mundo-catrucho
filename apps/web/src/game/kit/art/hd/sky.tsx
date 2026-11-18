// Cielo, luz y clima del paquete HD.
//  - cúpula con shader propio: degradado físico aproximado, sol, luna, estrellas y nubes que se mueven
//  - una sola luz direccional con sombras suaves que sigue al jugador (sol de día, luna de noche)
//  - luz de relleno hemisférica + mapa de entorno generado del mismo cielo (reflejos en metal, agua, oro)
//  - niebla con el color del horizonte (perspectiva aérea)
//  - time="auto": ciclo completo de día y noche;  weather="auto": despejado → nublado → lluvia → escampa
// Escribe env.hour y env.weather en cada cuadro. Para pruebas: #hora=18 fija la hora del ciclo (también si se
// cambia el hash sin recargar), #clima=lluvia|despejado|neblina|nublado fija el clima y #ciclo=rapido acelera el
// día (48 s) y el clima.

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { env } from '../../../../core/env';
import { player } from '../../../../core/player';
import { isPaused, useGame } from '../../../../core/store';
import { COMPACT_QUALITY, calidadEfectiva } from '../../../quality';
import type { SkyRigProps } from '../types';
import { G } from './materials';

// Revelado: ACES y encima un poco de saturación y una curva en S suave (contraste en los medios tonos). Son unas
// pocas operaciones por píxel dentro del mismo shader de cada material, sin pasada extra: vale en todas las calidades.
// El cielo y la niebla van en espacio de pantalla y no pasan por aquí (así el horizonte y la niebla coinciden).
const GRADE_GLSL = /* glsl */ `vec3 CustomToneMapping( vec3 color ) {
  vec3 c = ACESFilmicToneMapping( color );
  float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  c = max( vec3( l ) + ( c - vec3( l ) ) * 1.12, 0.0 );
  vec3 p = sqrt( min( c, 1.0 ) );
  p = mix( p, p * p * ( 3.0 - 2.0 * p ), 0.22 );
  return p * p;
}`;
const TM_DEFAULT = 'vec3 CustomToneMapping( vec3 color ) { return color; }';
const GRADE = THREE.ShaderChunk.tonemapping_pars_fragment.includes(TM_DEFAULT);
if (GRADE)
  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
    TM_DEFAULT,
    GRADE_GLSL,
  );
// Perspectiva aérea: además de la niebla de siempre (que funde lo lejano con el horizonte), una bruma azulada que
// crece con la distancia y pesa más abajo que arriba: los cerros lejanos se azulan y el monte cercano no se lava.
// Va en el fragmento de niebla de three, así que vale para todos los materiales con niebla y no suma pasadas.
const C = THREE.ShaderChunk;
if (C.fog_vertex.includes('vFogDepth = - mvPosition.z;') && !C.fog_vertex.includes('vFogH')) {
  C.fog_pars_vertex = C.fog_pars_vertex.replace(
    'varying float vFogDepth;',
    'varying float vFogDepth; varying float vFogH;',
  );
  // altura del punto en el mundo: la columna «arriba» de la vista aplicada a la posición en la vista
  C.fog_vertex = C.fog_vertex.replace(
    'vFogDepth = - mvPosition.z;',
    'vFogDepth = - mvPosition.z; vFogH = dot( mvPosition.xyz, viewMatrix[ 1 ].xyz ) + cameraPosition.y;',
  );
  C.fog_pars_fragment = C.fog_pars_fragment.replace(
    'varying float vFogDepth;',
    'varying float vFogDepth; varying float vFogH;',
  );
  C.fog_fragment = C.fog_fragment.replace(
    'gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );',
    `#ifndef FOG_EXP2
      float fogAer = ( 1.0 - exp( - vFogDepth / ( fogFar * 0.5 ) ) ) * exp( - max( vFogH, 0.0 ) * 0.02 );
      gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor * vec3( 0.84, 0.93, 1.06 ), fogAer * 0.5 );
    #endif
    gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );`,
  );
}
/** Mapeo de tonos del arte HD (si una versión nueva de three cambia el fragmento, queda ACES a secas). */
const TONE = GRADE ? THREE.CustomToneMapping : THREE.ACESFilmicToneMapping;

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
// La noche es de luna: azulada pero clara (relleno fuerte y exposición alta) para que el muñeco, los caminos y los
// rótulos se lean. Hacia las 18:10 el sol se va y entra la luna; el relleno sube para que no haya un bache oscuro.
// De las 18:15 a las 5:45 la «luz» de la tabla es la de la luna.
const NOCHE = [
  '#0c1a42',
  '#2e4a82',
  '#aac4ff',
  1.45,
  '#7c94d4',
  '#3e4a6e',
  1.6,
  1.7,
  1.17,
  1,
  '#56648f',
  '#1f2848',
] as const;
// De día el relleno (hemisferio + entorno) es bajo frente al sol cálido: la sombra se nota y queda azulada como
// afuera de verdad. El rebote del suelo es verde tierra (monte y potrero), no gris.
const KEYS: Key[] = [
  K(0, ...NOCHE),
  K(4.8, '#0e1d48', '#33508a', '#aac4ff', 1.4, '#7c94d4', '#3e4a6e', 1.6, 1.7, 1.16, 1, '#5a6894', '#21294a'),
  K(5.5, '#1f3672', '#8a74a6', '#b8c2ff', 1.2, '#8c94cc', '#4a4a6e', 1.6, 1.4, 1.16, 0.5, '#c79aaa', '#4a4470'),
  K(6.3, '#3570c0', '#ffc08a', '#ffb070', 2.3, '#aebfe6', '#6e6a4c', 0.95, 0.62, 1.04, 0, '#ffe1c2', '#b98a86'),
  K(8, '#2470d4', '#cfe5f4', '#ffe4bc', 3.4, '#b6cdf2', '#6f7a4a', 0.6, 0.6, 0.95, 0, '#ffffff', '#b2c0d4'),
  K(11, '#1762cc', '#c6e0f2', '#fff0d8', 3.8, '#b9d0f4', '#738050', 0.58, 0.58, 0.93, 0, '#ffffff', '#b4c2d6'),
  K(15, '#1964c8', '#cce2f0', '#ffe8c8', 3.7, '#bccff0', '#7a7e4e', 0.6, 0.6, 0.94, 0, '#ffffff', '#b8c2d4'),
  K(16.8, '#2560bc', '#f6dcb2', '#ffc890', 3.4, '#c4c8e6', '#84764c', 0.68, 0.62, 0.97, 0, '#fff0d6', '#c8a998'),
  K(17.6, '#3858a6', '#ffa862', '#ffa25c', 3, '#d0b8c4', '#8a6c48', 0.86, 0.7, 1.03, 0, '#ffc89a', '#b07a80'),
  K(18.2, '#34407e', '#ff8a5c', '#ff9a5c', 1.3, '#bca4c0', '#6e5a62', 1.5, 1, 1.1, 0.1, '#f8948a', '#6a4a78'),
  K(18.8, '#1c2b64', '#9a6c94', '#b4bcff', 1.25, '#8e90cc', '#4a4a6c', 1.65, 1.4, 1.16, 0.5, '#9a7aa8', '#2c2c58'),
  K(19.6, ...NOCHE),
  K(24, ...NOCHE),
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
export const world = { hour: hashNum('hora') ?? 9, wt: 0, cover: 0.3, rain: 0, fog: 0, wet: 0, pud: 0 };
type Clima = 'despejado' | 'lluvia' | 'neblina' | 'nublado';
const hashClima = (): Clima | null => {
  const m = typeof location !== 'undefined' ? /clima=(despejado|lluvia|neblina|nublado)/.exec(location.hash) : null;
  return m ? (m[1] as Clima) : null;
};
let climaFijo = hashClima();
// en pruebas, cambiar #hora=N o #clima=… sin recargar mueve el reloj o el clima
if (typeof window !== 'undefined')
  window.addEventListener('hashchange', () => {
    const h = hashNum('hora');
    if (h !== null) world.hour = h % 24;
    climaFijo = hashClima();
  });
/** segundos reales por hora del juego: el día dura unos 6 min, la tarde y el atardecer 2.5 min (se disfrutan),
 * la noche 2.5 min y el amanecer 1 min. Un día completo dura unos 12 min; con #ciclo=rapido, 48 s. */
const RITMO: [number, number][] = [
  [0, 16],
  [4.8, 16],
  [5.4, 30],
  [7, 30],
  [7.4, 38],
  [16.4, 38],
  [16.8, 50],
  [19.4, 50],
  [19.8, 16],
  [24, 16],
];
const DIA_REAL = (() => {
  let s = 0;
  for (let h = 0; h < 24; h += 0.01) s += secPerHour(h) * 0.01;
  return s;
})();
function secPerHour(h: number) {
  let i = 0;
  while (i < RITMO.length - 2 && RITMO[i + 1][0] <= h) i++;
  const [h0, s0] = RITMO[i],
    [h1, s1] = RITMO[i + 1];
  return lerp(s0, s1, (h - h0) / (h1 - h0));
}
function advance(dt: number) {
  const k = FAST ? 48 / DIA_REAL : 1;
  world.hour = (world.hour + dt / (secPerHour(world.hour) * k)) % 24;
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
  // el azul se hace hondo al subir y queda una franja ancha de bruma clara sobre el horizonte
  vec3 col = mix( uHor, uZen, pow( h, 0.56 ) );
  col = mix( col, uHor * 0.94, smoothstep( 0.0, -0.25, d.y ) );
  float s = max( dot( d, uSunDir ), 0.0 ), m = max( dot( d, uMoonDir ), 0.0 );
  // halo del sol: más ancho y cálido cerca del horizonte
  vec3 glow = uSunCol * ( pow( s, 420.0 ) * 0.9 + pow( s, 28.0 ) * 0.28 + pow( s, 5.0 ) * 0.22 * pow( 1.0 - h, 5.0 ) );
  #ifdef SKY_HQ
    // halo ancho de la bruma (dispersión hacia adelante) y aureola alrededor del disco
    glow += uSunCol * ( pow( s, 2.5 ) * 0.07 + pow( s, 90.0 ) * 0.22 ) * ( 0.6 + 0.4 * ( 1.0 - h ) );
  #endif
  col += glow * uSunVis;
  // el disco siempre más claro que su halo (sin tono, lo que pasa de 1 queda blanco)
  col = mix( col, max( col, vec3( 1.0, 0.98, 0.9 ) ) * 1.15, smoothstep( 0.99935, 0.99965, s ) * uSunVis );
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
  #ifdef SKY_HQ
    // cirros altos: vetas finas y estiradas detrás de los cúmulos, teñidas por el sol al atardecer
    vec2 hu = d.xz / ( h + 0.25 ) * vec2( 0.35, 1.6 ) + uTime * vec2( 0.004, 0.0015 );
    float ci = smoothstep( 0.52, 0.85, fbm( hu + vec2( 3.1, 7.7 ) ) ) * smoothstep( 0.04, 0.3, d.y ) * ( 1.0 - 0.6 * uCover );
    col = mix( col, mix( uCloudC, uSunCol * 1.1, 0.35 * ( 1.0 - h ) ) * 0.98, ci * 0.42 );
    // cúmulos con volumen: densidad hacia el sol (dos muestras) con caída de Beer y «polvo» en los bordes; base
    // más oscura, cima encendida, borde plateado a contraluz y color del sol bajo en las caras que lo ven
    float n2 = fbm( cuv + ld.xz * 0.09 ), n3 = fbm( cuv + ld.xz * 0.22 );
    float dens = max( n2 - th, 0.0 ) * 2.2 + max( n3 - th, 0.0 ) * 1.6;
    float beer = exp( -dens * 1.7 ), powder = 1.0 - exp( -max( n - th, 0.0 ) * 9.0 );
    float lit = clamp( 0.32 + beer * mix( 1.0, powder * 2.0, 0.45 ) * 0.85 - cl * 0.2 * uCover, 0.0, 1.0 );
    // centro grueso un poco más azulado y oscuro que los bordes (la luz del cielo lo rellena)
    float core = smoothstep( th + 0.05, th + 0.4, n );
    vec3 cc = mix( uCloudD, uCloudC, lit );
    cc = mix( cc, cc * vec3( 0.9, 0.93, 1.0 ), core * 0.35 );
    float lowSun = 1.0 - smoothstep( 0.05, 0.45, uSunDir.y );
    cc += uSunCol * ( pow( s, 6.0 ) * 0.5 * ( 1.0 - cl * 0.7 ) + lit * lowSun * 0.25 ) * uSunVis;
    col = mix( col, cc, cl * 0.95 );
  #else
    float n2 = fbm( cuv + ld.xz * 0.14 );
    float lit = clamp( 0.6 + ( n - n2 ) * 2.4 - cl * 0.25 * uCover, 0.0, 1.0 );
    vec3 cc = mix( uCloudD, uCloudC, lit ) + uSunCol * pow( s, 7.0 ) * 0.3 * uSunVis;
    col = mix( col, cc, cl * 0.94 );
  #endif
  col += ( hash( gl_FragCoord.xy ) - 0.5 ) / 200.0;
  gl_FragColor = vec4( col, 1.0 );
}
`;
// escena mínima para el mapa de entorno (valores lineales)
// lleva una silueta de cerros y monte lejano sobre el horizonte: el agua, los carros y los vidrios la reflejan
const ENV_FRAG = /* glsl */ `
uniform vec3 uZen, uHor, uGround, uSunCol, uSunDir, uLand; varying vec3 vDir;
void main() {
  vec3 d = normalize( vDir ); float h = max( d.y, 0.0 );
  vec3 col = mix( uHor, uZen, pow( h, 0.5 ) );
  col = mix( col, uGround, smoothstep( 0.02, -0.2, d.y ) );
  float az = atan( d.z, d.x );
  float ridge = 0.05 + 0.035 * sin( az * 3.0 + 1.0 ) + 0.02 * sin( az * 7.0 + 2.0 ) + 0.01 * sin( az * 19.0 );
  col = mix( col, uLand, smoothstep( ridge + 0.012, ridge - 0.012, d.y ) * smoothstep( -0.3, -0.04, d.y ) );
  float s = max( dot( d, uSunDir ), 0.0 );
  col += uSunCol * ( pow( s, 60.0 ) * 6.0 + pow( s, 6.0 ) * 0.35 );
  gl_FragColor = vec4( col, 1.0 );
}
`;
const RAIN_VERT = /* glsl */ `
attribute float aEnd; uniform vec3 uCam, uCol, uSunDir, uSunCol; uniform float uTime, uRain; varying float vA; varying vec3 vC;
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
  // a contraluz las gotas se encienden (la luz las atraviesa hacia la cámara)
  float fs = pow( max( dot( normalize( p - uCam ), uSunDir ), 0.0 ), 5.0 );
  fs *= min( 1.0, dot( uSunCol, vec3( 0.6 ) ) );
  vC = uCol + uSunCol * fs * 1.4; vA = min( vA * ( 1.0 + fs * 1.6 ), 1.0 );
  gl_Position = projectionMatrix * mv;
}
`;
const RAIN_FRAG = /* glsl */ `
varying float vA; varying vec3 vC; void main() { gl_FragColor = vec4( vC, vA ); }
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
  vA = step( seed, uRain ) * ( 1.0 - vPh ) * 0.6 * ( 1.0 - smoothstep( 9.0, 13.0, - mv.z ) );
  gl_PointSize = uScale * ( 0.1 + 0.3 * vPh ) / max( 0.5, - mv.z );
  gl_Position = projectionMatrix * mv;
}
`;
const SPLASH_FRAG = /* glsl */ `
uniform vec3 uCol; varying float vA; varying float vPh;
void main() {
  vec2 q = ( gl_PointCoord - 0.5 ) * vec2( 2.0, 4.4 ); float r = length( q );
  float ring = smoothstep( 0.55, 0.8, r ) * ( 1.0 - smoothstep( 0.85, 1.0, r ) );
  // el golpe de la gota: una coronita que salta al principio, arriba del anillo
  vec2 qc = ( gl_PointCoord - vec2( 0.5, 0.38 ) ) * vec2( 2.6, 1.6 );
  float crown = ( 1.0 - smoothstep( 0.0, 0.3, vPh ) ) * smoothstep( 0.5, 0.15, length( qc ) ) * ( 0.6 + 0.4 * step( 0.5, fract( qc.x * 3.0 + 0.5 ) ) );
  float a = max( ring, crown * 0.8 ) * vA;
  if ( a < 0.01 ) discard;
  gl_FragColor = vec4( uCol * ( 1.0 + crown * 0.3 ), a );
}
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
  // en alta, mapa de sombras de 4096: sombras nítidas cerca del jugador (misma luz, mismas llamadas de dibujo)
  const calidad = useGame((s) => calidadEfectiva(s.profile.settings)),
    sombra = calidad === 'alta' ? 4096 : 2048;
  const fogC = useMemo(() => (fogColor ? hex(`#${new THREE.Color(fogColor).getHexString()}`) : null), [fogColor]);

  const R = useMemo(() => {
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      // nubes con volumen y halo ancho fuera de baja (dos lecturas de ruido más por píxel del cielo)
      defines: calidad === 'baja' ? {} : { SKY_HQ: '' },
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
        uLand: { value: new THREE.Color() },
      },
    });
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 24, 14), envMat));
    const cubeRT = new THREE.WebGLCubeRenderTarget(COMPACT_QUALITY ? 32 : 64, {
        type: THREE.HalfFloatType,
        generateMipmaps: false,
      }),
      cubeCam = new THREE.CubeCamera(0.1, 50, cubeRT);
    const pmrem = new THREE.PMREMGenerator(gl);
    // lluvia
    // en alta, más gotas (aguacero de verdad) y más salpicadas
    const N = COMPACT_QUALITY ? 400 : calidad === 'alta' ? 2800 : 1500,
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
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunCol: { value: new THREE.Vector3() },
      },
    });
    const M = calidad === 'alta' ? 700 : 260,
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
  }, [gl, calidad]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prevFog = scene.fog,
      prevBg = scene.background,
      prevEnv = scene.environment,
      prevExp = gl.toneMappingExposure;
    scene.fog = R.fog;
    scene.background = new THREE.Color('#b4dcfb');
    // para las pruebas: lluvia, piso mojado y charcos del momento
    const mc = (window as Window & { __mc?: Record<string, unknown> }).__mc;
    if (mc) mc.clima = world;
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
    const wx = climaFijo ?? weather;
    if (wx === 'nublado') tc = 0.75;
    else if (wx === 'lluvia') {
      tc = 1;
      tr = 1;
    } else if (wx === 'neblina') {
      tc = 0.55;
      tf = 1;
    } else if (wx === 'auto') {
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
    // los charcos se llenan después de que el piso se moja (≈ 10 s) y son lo último en secarse (≈ 40 s)
    world.pud +=
      ((world.rain > 0.4 ? world.wet : 0) - world.pud) *
      (R.first ? 1 : 1 - Math.exp(-dt * (world.rain > 0.4 ? (FAST ? 1 : 0.1) : FAST ? 0.3 : 0.025)));
    R.first = false;
    const over = sstep(0.55, 1, world.cover),
      rainK = world.rain;
    env.hour = hour;
    env.weather = rainK > 0.3 ? 'lluvia' : world.fog > 0.5 ? 'neblina' : 'despejado';
    G.uTime.value = T;
    G.uWet.value = indoor ? 0 : world.wet;
    G.uPuddle.value = indoor ? 0 : world.pud;
    G.uRain.value = indoor ? 0 : world.rain;
    G.uNight.value = indoor ? 0.7 : Math.max(sstep(18.1, 18.9, hour), 1 - sstep(5.2, 5.9, hour), over * rainK * 0.5);

    // --- astros
    const ang = ((hour - 6) / 12) * Math.PI;
    sunDir.set(Math.cos(ang) * 0.86, Math.sin(ang), 0.42 * Math.cos(ang * 0.5 - 0.6) + 0.18).normalize();
    // la luna va por el sur como el sol: alumbra lo que mira la cámara (hacia −Z) y no lo deja a contraluz
    moonDir.set(-Math.cos(ang) * 0.8, -Math.sin(ang), 0.4).normalize();
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
    G.uSunDir.value.copy(sunDir);
    G.uSunCol.value.setRGB(c.sun[0], c.sun[1], c.sun[2], THREE.SRGBColorSpace).multiplyScalar(sunVis * (1 - ov * 0.85));
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
    // con lluvia la cortina de agua cierra la vista: niebla más cerca y más densa
    const far = fogFar * (1 - 0.58 * rainK) * (1 - 0.78 * world.fog),
      fog = R.fog;
    if (indoor) {
      fog.color.set(fogColor ?? '#1c1612');
      fog.near = fogFar * 0.5;
      fog.far = fogFar * 1.5;
    } else {
      fog.color.setRGB(hor[0], hor[1], hor[2], THREE.SRGBColorSpace);
      fog.far = far;
      fog.near = far * lerp(0.28, 0.03, Math.max(world.fog, rainK * 0.7));
    }
    // Con escenas que cargan perezosamente, el cielo anterior puede desmontarse después de que monta este y
    // restaurar su niebla y su fondo viejos (o null): el cielo activo los reafirma en cada cuadro.
    if (scene.fog !== fog) scene.fog = fog;
    if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
    scene.background.copy(fog.color);

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
        // cambio corto de sol a luna (pocos segundos reales) para que las sombras no salten a plena luz
        const fade = useSun ? sstep(-0.06, -0.01, sunDir.y) : sstep(0.06, 0.12, -sunDir.y);
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
        // de noche las sombras son más suaves: la luna no deja nada negro
        L.shadow.intensity = (1 - ov * 0.45) * (1 - 0.22 * Math.max(sstep(18.2, 19.4, hour), 1 - sstep(4.8, 6, hour)));
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
    if (gl.toneMapping !== TONE) gl.toneMapping = TONE;
    gl.toneMappingExposure = indoor ? 1 : c.exp * (1 - ov * 0.14);

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
    if (Math.abs(sig - R.envSig) > 0.06 && T - R.envT > (R.envSig === -1 ? -1 : COMPACT_QUALITY ? 10 : 1.5)) {
      R.envSig = sig;
      R.envT = T;
      const e = R.envMat.uniforms;
      if (indoor) {
        e.uZen.value.set('#8a6a4a');
        e.uHor.value.set('#6a5038');
        e.uGround.value.set('#3a2c20');
        e.uSunCol.value.set('#000000');
        e.uLand.value.set('#3a2c20');
      } else {
        e.uZen.value.setRGB(zen[0], zen[1], zen[2], THREE.SRGBColorSpace);
        e.uHor.value.setRGB(hor[0], hor[1], hor[2], THREE.SRGBColorSpace);
        e.uGround.value.setRGB(c.hg[0], c.hg[1], c.hg[2], THREE.SRGBColorSpace).multiplyScalar(0.9);
        e.uSunCol.value
          .setRGB(c.sun[0], c.sun[1], c.sun[2], THREE.SRGBColorSpace)
          .multiplyScalar((useSun ? sunVis : moonVis * 0.6) * (1 - ov * 0.85));
        e.uSunDir.value.copy(useSun ? sunDir : moonDir);
        // monte lejano: verde del rebote del suelo, oscuro y con la bruma del horizonte encima
        e.uLand.value
          .setRGB(c.hg[0] * 0.42, c.hg[1] * 0.55, c.hg[2] * 0.36, THREE.SRGBColorSpace)
          .lerp(tmpC.setRGB(hor[0], hor[1], hor[2], THREE.SRGBColorSpace), 0.3);
      }
      const rt = gl.getRenderTarget();
      R.cubeCam.update(gl, R.envScene);
      R.pmremRT = R.pmrem.fromCubemap(R.cubeRT.texture, R.pmremRT as any) as THREE.WebGLRenderTarget;
      gl.setRenderTarget(rt);
      scene.environment = R.pmremRT.texture;
    }
    // igual que la niebla y el fondo: el cielo anterior pudo restaurar su entorno al desmontarse después
    if (R.pmremRT && scene.environment !== R.pmremRT.texture) scene.environment = R.pmremRT.texture;
    scene.environmentIntensity = indoor ? 0.9 : c.envI;
    tmpC.setRGB(lerp(zen[0], hor[0], 0.5), lerp(zen[1], hor[1], 0.5), lerp(zen[2], hor[2], 0.5), THREE.SRGBColorSpace);
    G.uSky.value.copy(tmpC);

    // --- lluvia
    const ru = R.rainMat.uniforms;
    ru.uCam.value.copy(cam.position);
    ru.uRain.value = rainK;
    const b = 0.5 + lum * 0.5;
    ru.uCol.value.set(0.78 * b, 0.84 * b, 0.95 * b);
    ru.uSunDir.value.copy(sunDir);
    ru.uSunCol.value.set(c.sun[0], c.sun[1], c.sun[2]).multiplyScalar(sunVis * (1 - ov * 0.55) * 0.6);
    R.splashMat.uniforms.uGround.value = player.pos[1];
    R.splashMat.uniforms.uScale.value = st.size.height * st.viewport.dpr * 1.1;
    if (rain.current) rain.current.visible = rainK > 0.02;
    if (splash.current) splash.current.visible = rainK > 0.02;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#d4e6ff', '#94896a', 0.9]} />
      <directionalLight
        key={sombra}
        ref={sun}
        intensity={3}
        castShadow
        shadow-mapSize={[sombra, sombra]}
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
