// Materiales HD: MeshStandardMaterial con texturas procedurales proyectadas en tres planos (triplanar) en el
// espacio del objeto sin su giro, de modo que la textura mantiene su escala en cualquier tamaño de bloque.
import * as THREE from 'three';
import type { MatKind } from '../types';
import { LAYERS, type LayerName, layerIndex, layerTextures, TILE, texCalidad } from './tex';

/** Uniformes globales que actualiza el SkyRig en cada cuadro. */
export const G = {
  uTime: { value: 0 },
  /** 0..1 superficies mojadas por la lluvia */ uWet: { value: 0 },
  /** 0..1 faroles y ventanas encendidos */ uNight: { value: 0 },
  /** color del cielo (lineal) para el brillo del agua y el vidrio */ uSky: { value: new THREE.Color('#9fd0ff') },
};

const KIND: Record<MatKind, { l: LayerName; r: number; m: number }> = {
  plastic: { l: 'plastic', r: 0.42, m: 0 },
  grass: { l: 'grass', r: 0.95, m: 0 },
  dirt: { l: 'dirt', r: 0.96, m: 0 },
  sand: { l: 'sand', r: 0.92, m: 0 },
  stone: { l: 'stone', r: 0.85, m: 0 },
  cobble: { l: 'cobble', r: 0.8, m: 0 },
  brick: { l: 'brick', r: 0.88, m: 0 },
  wood: { l: 'wood', r: 0.72, m: 0 },
  metal: { l: 'metal', r: 0.36, m: 0.9 },
  tile: { l: 'tile', r: 0.3, m: 0 },
  stucco: { l: 'stucco', r: 0.93, m: 0 },
  roof: { l: 'roof', r: 0.8, m: 0 },
  water: { l: 'water', r: 0.08, m: 0 },
  neon: { l: 'plastic', r: 0.4, m: 0 },
  glass: { l: 'plastic', r: 0.06, m: 0 },
  cloth: { l: 'cloth', r: 0.96, m: 0 },
  asphalt: { l: 'asphalt', r: 0.9, m: 0 },
  concrete: { l: 'concrete', r: 0.9, m: 0 },
  leaf: { l: 'leaf', r: 0.72, m: 0 },
  gold: { l: 'gold', r: 0.24, m: 1 },
};
/** capa + rugosidad + metal de cada tipo, para la utilería fusionada */
export const kindInfo = (k: MatKind | LayerName) =>
  (KIND as any)[k] as { l: LayerName; r: number; m: number } | undefined;

const NL = LAYERS.length,
  MACRO = layerIndex('macro'),
  GRASS = layerIndex('grass');
/** cuánto varía el tono a escala de decenas de metros (rompe la repetición en pisos grandes) */
const MAC: Partial<Record<LayerName, number>> = {
  grass: 0.5,
  dirt: 0.42,
  sand: 0.3,
  stone: 0.34,
  cobble: 0.3,
  asphalt: 0.36,
  concrete: 0.34,
  stucco: 0.26,
  roof: 0.3,
  brick: 0.26,
  wood: 0.24,
  bark: 0.24,
  straw: 0.24,
  leaf: 0.24,
};
/** suciedad al pie de las paredes y chorreados (solo caras verticales) */
const GRIME: Partial<Record<LayerName, number>> = {
  stucco: 0.75,
  concrete: 0.6,
  brick: 0.5,
  stone: 0.45,
  wood: 0.35,
  cobble: 0.3,
};
const arr = (n: string, f: (l: LayerName) => number) =>
  `const float ${n}[${NL}] = float[${NL}](${LAYERS.map((l) => f(l).toFixed(2)).join(', ')});`;
const tileArr = [
  arr('TRI_TILE', (l) => TILE[l]),
  arr('TRI_MAC', (l) => MAC[l] ?? 0.14),
  arr('TRI_GRIME', (l) => GRIME[l] ?? 0),
].join('\n');

const VERT_PARS = /* glsl */ `
varying vec3 vTriPos; varying vec3 vTriN; varying mat3 vTriM;
#ifdef TRI_ATTR
attribute vec4 aMat; attribute vec3 aCol; varying vec4 vMat; varying vec3 vCol; varying vec2 vTriUv;
#endif
`;
const VERT_MAIN = /* glsl */ `
{
  vec4 triW = vec4( transformed, 1.0 ); mat3 triR = mat3( modelMatrix ); mat3 triNM = normalMatrix;
  #ifdef USE_INSTANCING
    triW = instanceMatrix * triW; triR = triR * mat3( instanceMatrix ); triNM = normalMatrix * mat3( instanceMatrix );
  #endif
  triW = modelMatrix * triW;
  vec3 tc0 = normalize( triR[0] ), tc1 = normalize( triR[1] ), tc2 = normalize( triR[2] );
  vTriPos = vec3( dot( tc0, triW.xyz ), dot( tc1, triW.xyz ), dot( tc2, triW.xyz ) );
  vTriN = objectNormal; vTriM = triNM;
  #ifdef TRI_ATTR
    vMat = aMat; vCol = aCol; vTriUv = uv;
  #endif
}
`;
const FRAG_PARS = /* glsl */ `
uniform sampler2DArray tAlb; uniform sampler2DArray tNrm;
uniform float uWet; uniform float uTime; uniform float uNight; uniform vec3 uSky;
varying vec3 vTriPos; varying vec3 vTriN; varying mat3 vTriM;
${tileArr}
const mat2 TRI_ROT = mat2( 0.8, 0.6, -0.6, 0.8 );
#ifdef TRI_ATTR
  varying vec4 vMat; varying vec3 vCol; varying vec2 vTriUv;
#else
  uniform vec4 uMat;
#endif
vec3 triNp; vec3 triTan; float triRough; float triRoughMul; bool triUvMode; vec3 triTint;
mat3 triTBN( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
  vec3 q0 = dFdx( eye_pos.xyz ), q1 = dFdy( eye_pos.xyz ); vec2 st0 = dFdx( uv.st ), st1 = dFdy( uv.st );
  vec3 N = surf_norm, q1perp = cross( q1, N ), q0perp = cross( N, q0 );
  vec3 T = q1perp * st0.x + q0perp * st1.x, B = q1perp * st0.y + q0perp * st1.y;
  float det = max( dot( T, T ), dot( B, B ) ); float sc = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
  return mat3( T * sc, B * sc, N );
}
vec3 triUnpack( vec4 s, float k ) { vec2 xy = ( s.xy * 2.0 - 1.0 ) * k; return vec3( xy, sqrt( max( 0.05, 1.0 - dot( xy, xy ) ) ) ); }
`;
const FRAG_MAP = /* glsl */ `
{
  #ifdef TRI_ATTR
    float tl = vMat.x; triUvMode = tl > 99.5; if ( triUvMode ) tl -= 100.0; tl = floor( tl + 0.5 );
    float ts = 1.0 / TRI_TILE[ int( tl ) ]; const float tk = 1.0;
    triTint = vCol;
  #else
    float tl = uMat.x; float ts = uMat.y; float tk = uMat.z; triUvMode = false;
    triTint = diffuseColor.rgb;
  #endif
  vec3 tn0 = normalize( vTriN );
  vec3 tw = pow( abs( tn0 ), vec3( 8.0 ) ); tw /= ( tw.x + tw.y + tw.z );
  vec3 tp = vTriPos * ts;
  #ifdef TRI_ATTR
    vec2 uvX = triUvMode ? vTriUv : tp.zy, uvY = triUvMode ? vTriUv : tp.xz, uvZ = triUvMode ? vTriUv : tp.xy;
  #else
    vec2 uvX = tp.zy, uvY = tp.xz, uvZ = tp.xy;
  #endif
  #ifdef TRI_WATER
    vec2 wo = uTime * vec2( 0.045, 0.03 );
    vec4 nX = 0.5 * ( texture( tNrm, vec3( uvX + wo, tl ) ) + texture( tNrm, vec3( uvX * 1.9 - wo.yx * 1.6, tl ) ) );
    vec4 nY = 0.5 * ( texture( tNrm, vec3( uvY + wo, tl ) ) + texture( tNrm, vec3( uvY * 1.9 - wo.yx * 1.6, tl ) ) );
    vec4 nZ = 0.5 * ( texture( tNrm, vec3( uvZ + wo, tl ) ) + texture( tNrm, vec3( uvZ * 1.9 - wo.yx * 1.6, tl ) ) );
    vec4 ta = vec4( 1.0 );
  #else
    vec4 aY = texture( tAlb, vec3( uvY, tl ) );
    #ifndef TRI_LOW
      // piso: una segunda lectura girada y corrida se alterna por zonas de varios metros, así la cuadrícula
      // del mosaico (la misma grieta cada 3 m) deja de verse
      vec2 uvY2 = TRI_ROT * uvY + vec2( 0.37, 0.71 );
      float bomb = 0.0;
      if ( tw.y > 0.02 ) {
        bomb = smoothstep( 0.4, 0.6, texture( tAlb, vec3( vTriPos.xz * 0.045 + vec2( 0.13, 0.57 ), ${MACRO}.0 ) ).r );
        if ( bomb > 0.0 ) aY = mix( aY, texture( tAlb, vec3( uvY2, tl ) ), bomb );
      }
    #endif
    vec4 ta = texture( tAlb, vec3( uvX, tl ) ) * tw.x + aY * tw.y + texture( tAlb, vec3( uvZ, tl ) ) * tw.z;
  #endif
  #if defined( TRI_LOW ) && !defined( TRI_WATER )
    // calidad baja: sin mapas de normales (tres lecturas menos por píxel); rugosidad pareja
    vec4 tnb = vec4( 0.5 ); triTan = vec3( 0.0, 0.0, 1.0 ); triNp = tn0;
  #else
    #ifndef TRI_WATER
      vec4 nX = texture( tNrm, vec3( uvX, tl ) ), nY = texture( tNrm, vec3( uvY, tl ) ), nZ = texture( tNrm, vec3( uvZ, tl ) );
      if ( bomb > 0.0 ) {
        vec4 n2 = texture( tNrm, vec3( uvY2, tl ) );
        n2.xy = transpose( TRI_ROT ) * ( n2.xy - 0.5 ) + 0.5;
        nY = mix( nY, n2, bomb );
      }
    #endif
    vec4 tnb = nX * tw.x + nY * tw.y + nZ * tw.z;
    vec3 tx = triUnpack( nX, tk ), ty = triUnpack( nY, tk ), tz = triUnpack( nZ, tk );
    triTan = tz;
    tx = vec3( tx.xy + tn0.zy, abs( tx.z ) * tn0.x ); ty = vec3( ty.xy + tn0.xz, abs( ty.z ) * tn0.y ); tz = vec3( tz.xy + tn0.xy, abs( tz.z ) * tn0.z );
    triNp = normalize( tx.zyx * tw.x + ty.xzy * tw.y + tz.xyz * tw.z );
  #endif
  int li = int( tl );
  #if !defined( TRI_LOW ) && !defined( TRI_WATER )
  {
    // antirrepetición en el plano del piso: la misma capa a otra escala y girada, usada como variación de tono
    vec3 big = texture( tAlb, vec3( mat2( 0.8, -0.6, 0.6, 0.8 ) * uvY * 0.29 + vec2( 0.37, 0.71 ), tl ) ).rgb;
    vec3 avg = max( textureLod( tAlb, vec3( 0.5, 0.5, tl ), 12.0 ).rgb, vec3( 0.04 ) );
    ta.rgb *= mix( vec3( 1.0 ), clamp( big / avg, vec3( 0.65 ), vec3( 1.35 ) ), 0.5 * tw.y );
  }
  #endif
  float macro = texture( tAlb, vec3( vTriPos.xz * 0.025 + vTriPos.y * 0.013, ${MACRO}.0 ) ).r;
  float macro2 = texture( tAlb, vec3( vTriPos.xz * 0.0063 + vec2( 0.5, 0.25 ), ${MACRO}.0 ) ).r;
  float mv = macro * 0.6 + macro2 * 0.4;
  vec3 alb = ta.rgb * mix( vec3( 1.0 ), triTint, ta.a ) * ( 1.0 + TRI_MAC[ li ] * ( mv - 0.45 ) * 1.6 );
  if ( li == ${GRASS} ) {
    // zacate: zonas secas amarillentas, zonas húmedas más verdes y algún parche pelón
    float dry = smoothstep( 0.56, 0.22, mv ), lush = smoothstep( 0.5, 0.8, mv );
    alb *= mix( vec3( 1.0 ), vec3( 1.3, 1.1, 0.55 ), dry * 0.75 ) * mix( vec3( 1.0 ), vec3( 0.74, 0.92, 0.78 ), lush * 0.6 );
    float pm = texture( tAlb, vec3( vTriPos.xz * 0.06 + vec2( 0.21, 0.63 ), ${MACRO}.0 ) ).r;
    float bare = smoothstep( 0.66, 0.84, pm ) * smoothstep( 0.62, 0.32, mv ) * tw.y;
    alb = mix( alb, vec3( 0.2, 0.14, 0.08 ) * ( 0.7 + 0.5 * ta.g ), bare * 0.65 );
  }
  float gk = TRI_GRIME[ li ];
  if ( gk > 0.0 ) {
    // paredes: tierra salpicada abajo (desde el suelo, y ≈ 0) y chorreados de lluvia hacia abajo
    float wall = 1.0 - smoothstep( 0.3, 0.7, abs( tn0.y ) );
    float foot = 1.0 - smoothstep( 0.0, 0.9 + 0.7 * macro, vTriPos.y );
    float streak = texture( tAlb, vec3( ( vTriPos.x + vTriPos.z ) * 0.09, vTriPos.y * 0.012, ${MACRO}.0 ) ).r;
    float gr = wall * gk * ( foot * 0.8 + smoothstep( 0.5, 0.85, streak ) * 0.3 );
    alb *= mix( vec3( 1.0 ), vec3( 0.58, 0.52, 0.44 ), clamp( gr, 0.0, 1.0 ) );
  }
  float wetK = uWet * ( 0.35 + 0.65 * smoothstep( 0.2, 0.9, tn0.y ) ) * ( 0.5 + 0.5 * smoothstep( 0.25, 0.6, macro ) );
  alb *= 1.0 - 0.3 * wetK;
  triRoughMul = mix( 1.0, 0.22, wetK ); triRough = tnb.b;
  diffuseColor.rgb = alb;
}
`;
const FRAG_ROUGH = /* glsl */ `
#ifdef TRI_ATTR
  float roughnessFactor = clamp( vMat.y * ( 0.5 + triRough ) * triRoughMul, 0.045, 1.0 );
#else
  float roughnessFactor = clamp( roughness * ( 0.5 + triRough ) * triRoughMul, 0.045, 1.0 );
#endif
`;
const FRAG_METAL = /* glsl */ `
#ifdef TRI_ATTR
  float metalnessFactor = vMat.z;
#else
  float metalnessFactor = metalness;
#endif
`;
const FRAG_NORMAL = /* glsl */ `
#ifdef TRI_ATTR
  if ( triUvMode ) { mat3 tb = triTBN( - vViewPosition, normal, vTriUv ); normal = normalize( tb * triTan ); } else
#endif
  { normal = normalize( vTriM * triNp ) * faceDirection; }
`;
const FRAG_EMIS = /* glsl */ `
#ifdef TRI_ATTR
  totalEmissiveRadiance += vMat.w > 0.0 ? vec3( 1.0, 0.72, 0.36 ) * vMat.w * uNight : triTint * ( - vMat.w );
#endif
`;
/** brillo de Fresnel para agua y vidrio: más opaco y con reflejo del cielo en ángulos rasantes */
const FRAG_FRESNEL = /* glsl */ `
{
  float fres = pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 3.0 );
  diffuseColor.a = mix( diffuseColor.a, 1.0, fres * 0.85 );
  outgoingLight += uSky * fres * 0.4;
}
#include <opaque_fragment>
`;

function shared(sh: { uniforms: Record<string, any> }) {
  const t = layerTextures();
  sh.uniforms.tAlb = { value: t.alb };
  sh.uniforms.tNrm = { value: t.nrm };
  sh.uniforms.uWet = G.uWet;
  sh.uniforms.uTime = G.uTime;
  sh.uniforms.uNight = G.uNight;
  sh.uniforms.uSky = G.uSky;
}
/** Convierte un MeshStandardMaterial en triplanar. `attr` = capa/color por vértice (utilería fusionada). */
export function triplanar<T extends THREE.MeshStandardMaterial>(
  mat: T,
  o: { attr?: boolean; layer?: LayerName; water?: boolean; fresnel?: boolean; nk?: number } = {},
): T {
  const uMat = {
    value: new THREE.Vector4(layerIndex(o.layer ?? 'plastic'), 1 / TILE[o.layer ?? 'plastic'], o.nk ?? 1, 0),
  };
  const low = texCalidad() === 'baja';
  mat.defines = {
    ...(mat.defines ?? {}),
    ...(o.attr ? { TRI_ATTR: '' } : {}),
    ...(o.water ? { TRI_WATER: '' } : {}),
    ...(low ? { TRI_LOW: '' } : {}),
  };
  mat.onBeforeCompile = (sh) => {
    shared(sh);
    sh.uniforms.uMat = uMat;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${VERT_MAIN}`);
    let f = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_PARS}`)
      .replace('#include <map_fragment>', FRAG_MAP)
      .replace('#include <roughnessmap_fragment>', FRAG_ROUGH)
      .replace('#include <metalnessmap_fragment>', FRAG_METAL)
      .replace('#include <normal_fragment_maps>', FRAG_NORMAL)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${FRAG_EMIS}`);
    if (o.fresnel) f = f.replace('#include <opaque_fragment>', FRAG_FRESNEL);
    sh.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => `tri|${o.attr ? 1 : 0}|${o.water ? 1 : 0}|${o.fresnel ? 1 : 0}|${low ? 1 : 0}`;
  return mat;
}

const cache = new Map<string, THREE.Material>();
/** material cacheado por (tipo, color) */
export function hdMaterial(kind: MatKind, color: string): THREE.Material {
  const key = `${kind}|${color}`;
  let m = cache.get(key);
  if (m) return m;
  const k = KIND[kind] ?? KIND.plastic;
  if (kind === 'neon') {
    const c = new THREE.Color(color);
    m = new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  } else if (kind === 'water')
    m = triplanar(
      new THREE.MeshStandardMaterial({
        color,
        roughness: k.r,
        metalness: 0,
        transparent: true,
        opacity: 0.74,
        envMapIntensity: 1.6,
      }),
      { layer: 'water', water: true, fresnel: true, nk: 0.55 },
    );
  else if (kind === 'glass')
    m = triplanar(
      new THREE.MeshStandardMaterial({
        color,
        roughness: k.r,
        metalness: 0,
        transparent: true,
        opacity: 0.4,
        envMapIntensity: 1.6,
      }),
      { layer: 'plastic', fresnel: true, nk: 0 },
    );
  else
    m = triplanar(
      new THREE.MeshStandardMaterial({
        color,
        roughness: k.r,
        metalness: k.m,
        envMapIntensity: kind === 'gold' || kind === 'metal' ? 1.25 : 1,
      }),
      { layer: k.l },
    );
  m.name = `hd:${kind}`;
  cache.set(key, m);
  return m;
}

let _prop: THREE.MeshStandardMaterial | null = null,
  _prop2: THREE.MeshStandardMaterial | null = null;
/** Material único de la utilería fusionada: lee capa/rugosidad/metal/emisión (aMat) y color (aCol) por vértice. */
export function propMaterial(doubleSided = false) {
  if (doubleSided)
    return (_prop2 ??= triplanar(
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, shadowSide: THREE.DoubleSide }),
      { attr: true },
    ));
  return (_prop ??= triplanar(new THREE.MeshStandardMaterial(), { attr: true }));
}
