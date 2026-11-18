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
  /** 0..1 cuánto llueve ahora (gotas en los charcos) */ uRain: { value: 0 },
  /** 0..1 cuánta agua junta el piso: se llena después de mojarse y se seca de último */ uPuddle: { value: 0 },
  /** dirección hacia el sol (mundo) y su color: cáusticos, rayos y lluvia a contraluz */
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },
  uSunCol: { value: new THREE.Color('#fff0d8') },
  /** 1 mientras el posproceso dibuja la escena en su objetivo: el alfa lleva luz ambiental y reflejo (ver FRAG_SPLIT) */
  uSplit: { value: 0 },
  /** alturas del terreno de la zona para saber la hondura del agua: textura, caja (x0, z0, lado, activa) y nivel
   *  de los dos planos de agua de la zona */
  tShore: { value: null as THREE.Texture | null },
  uShoreBox: { value: new THREE.Vector4(0, 0, 1, 0) },
  uShoreY: { value: new THREE.Vector2(-999, -999) },
};

/** Le dice al agua dónde está el fondo: la rejilla de alturas de la zona (n × n puntos cada `cell` m, centrada en
 *  el origen) y los niveles de sus planos de agua. Sin esto (lobby, pilas, fuentes) el agua sigue como siempre. */
export function setShore(data: Float32Array | null, n = 0, cell = 1, levels: number[] = []) {
  const old = G.tShore.value;
  G.tShore.value = null;
  G.uShoreBox.value.w = 0;
  old?.dispose();
  if (!data || n < 2) return;
  const half = ((n - 1) * cell) / 2,
    h16 = new Uint16Array(n * n);
  for (let i = 0; i < h16.length; i++) h16[i] = THREE.DataUtils.toHalfFloat(data[i]);
  const t = new THREE.DataTexture(h16, n, n, THREE.RedFormat, THREE.HalfFloatType);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  G.tShore.value = t;
  // el centro del texel i cae en x = −half + i·cell
  G.uShoreBox.value.set(-half - cell / 2, -half - cell / 2, n * cell, 1);
  G.uShoreY.value.set(levels[0] ?? -999, levels[1] ?? -999);
}
// textura vacía para que el sampler siempre tenga algo
const SHORE0 = new THREE.DataTexture(new Uint16Array([0]), 1, 1, THREE.RedFormat, THREE.HalfFloatType);
SHORE0.needsUpdate = true;

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
/** cuánto junta agua y brilla mojado cada capa (el zacate y la tela casi no; el asfalto y el concreto mucho) */
const PUD: Partial<Record<LayerName, number>> = {
  asphalt: 1,
  concrete: 0.9,
  cobble: 0.9,
  tile: 0.8,
  stone: 0.75,
  dirt: 0.7,
  roof: 0.35,
  metal: 0.5,
  wood: 0.3,
  plastic: 0.4,
  sand: 0.25,
  brick: 0.4,
  stucco: 0.3,
};
const tileArr = [
  arr('TRI_TILE', (l) => TILE[l]),
  arr('TRI_PUD', (l) => PUD[l] ?? 0),
  arr('TRI_MAC', (l) => MAC[l] ?? 0.14),
  arr('TRI_GRIME', (l) => GRIME[l] ?? 0),
].join('\n');

const VERT_PARS = /* glsl */ `
varying vec3 vTriPos; varying vec3 vTriN; varying mat3 vTriM;
#ifdef TRI_ATTR
attribute vec4 aMat; attribute vec3 aCol; varying vec4 vMat; varying vec3 vCol; varying vec2 vTriUv;
#endif
#ifdef TRI_WATER
varying vec3 vTriW;
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
  #ifdef TRI_WATER
    vTriW = triW.xyz;
  #endif
  #ifdef TRI_ATTR
    vMat = aMat; vCol = aCol; vTriUv = uv;
  #endif
}
`;
const FRAG_PARS = /* glsl */ `
uniform sampler2DArray tAlb; uniform sampler2DArray tNrm;
uniform float uWet; uniform float uTime; uniform float uNight; uniform vec3 uSky;
uniform float uRain, uPuddle, uSplit; uniform vec3 uSunDir, uSunCol;
varying vec3 vTriPos; varying vec3 vTriN; varying mat3 vTriM;
#ifdef TRI_WATER
  varying vec3 vTriW; uniform sampler2D tShore; uniform vec4 uShoreBox; uniform vec2 uShoreY;
  float triFoam; float triShallow; float triKnown;
  // cáusticos baratos: dos ondas cruzadas y deformadas; donde se anulan quedan las líneas de luz del fondo
  float triCaus( vec2 p, float t ) {
    vec2 q = p + vec2( sin( p.y * 1.3 + t ), cos( p.x * 1.1 - t * 0.8 ) ) * 0.55;
    vec2 r = p * 1.6 + vec2( cos( p.y * 0.9 - t * 0.5 ), sin( p.x * 1.2 + t * 0.6 ) ) * 0.7;
    float a = abs( sin( q.x * 2.1 + t * 0.7 ) + sin( q.y * 2.3 - t * 0.6 ) );
    float b = abs( sin( r.x * 1.9 - t * 0.4 ) + sin( r.y * 2.0 + t * 0.5 ) );
    return smoothstep( 0.3, 0.0, a ) * 0.6 + smoothstep( 0.24, 0.0, b ) * 0.5;
  }
#endif
// gotas de lluvia en los charcos: anillos que se abren en celdas al azar (dos capas desfasadas)
vec2 triRipple( vec2 p, float t ) {
  vec2 acc = vec2( 0.0 );
  for ( int k = 0; k < 2; k++ ) {
    vec2 q = p * 2.6 + float( k ) * vec2( 0.37, 0.61 ), c = floor( q ), f = fract( q ) - 0.5;
    float h = fract( sin( dot( c, vec2( 12.9898, 78.233 ) ) + float( k ) * 7.0 ) * 43758.5453 );
    vec2 d = f - ( vec2( fract( h * 13.1 ), fract( h * 7.7 ) ) - 0.5 ) * 0.5;
    float r = length( d ), ph = fract( t * 1.3 + h ), rr = ph * 0.42;
    acc += d / max( r, 1e-3 ) * ( 1.0 - ph ) * smoothstep( 0.07, 0.0, abs( r - rr ) ) * sin( ( r - rr ) * 70.0 );
  }
  return acc;
}
${tileArr}
const mat2 TRI_ROT = mat2( 0.8, 0.6, -0.6, 0.8 );
#ifdef TRI_ATTR
  varying vec4 vMat; varying vec3 vCol; varying vec2 vTriUv;
#else
  uniform vec4 uMat;
#endif
vec3 triNp; vec3 triTan; float triRough; float triRoughMul; bool triUvMode; vec3 triTint; float triPud; float triRefl;
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
    // hondura: nivel del agua menos la altura del terreno debajo (solo en los planos grandes de la zona)
    float wD = 0.0; triKnown = 0.0; triFoam = 0.0; triShallow = 0.0;
    #ifndef TRI_LOW
      if ( uShoreBox.w > 0.5 && min( abs( vTriW.y - uShoreY.x ), abs( vTriW.y - uShoreY.y ) ) < 0.03 ) {
        vec2 suv = ( vTriW.xz - uShoreBox.xy ) / uShoreBox.z;
        if ( suv.x > 0.0 && suv.y > 0.0 && suv.x < 1.0 && suv.y < 1.0 ) {
          wD = vTriW.y - texture( tShore, suv ).r; triKnown = 1.0;
        }
      }
    #endif
    // tres capas de olas en direcciones distintas: marejada lenta, ola media y rizo fino; de lejos se aplana
    // (sin centelleo) y el rizo pesa menos
    vec2 wo = uTime * vec2( 0.045, 0.03 ), ws = uTime * vec2( -0.012, 0.021 );
    float wFar = smoothstep( 18.0, 80.0, length( vViewPosition ) );
    #define TRI_WN( uv ) ( texture( tNrm, vec3( uv * 0.29 + ws, tl ) ) * 0.42 + texture( tNrm, vec3( uv + wo, tl ) ) * 0.36 + texture( tNrm, vec3( uv * 2.1 - wo.yx * 1.6, tl ) ) * 0.22 )
    vec4 nX = TRI_WN( uvX ), nY = TRI_WN( uvY ), nZ = TRI_WN( uvZ );
    // mar abierto (hondo): olas más grandes, con una marejada ancha más; cerca de la orilla el agua se calma
    float wDeep = triKnown * smoothstep( 1.5, 7.0, wD );
    #ifdef TRI_HIGH
      if ( wDeep > 0.01 ) {
        vec4 sw = texture( tNrm, vec3( uvY * 0.085 + ws * 0.7, tl ) );
        nY = mix( nY, nY * 0.45 + sw * 0.55, wDeep );
      }
    #endif
    tk *= ( 1.6 - 0.9 * wFar ) * ( 1.0 + 0.75 * wDeep ) * ( 1.0 - 0.45 * triKnown * ( 1.0 - smoothstep( 0.0, 1.2, wD ) ) );
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
    // salpicado de tierra solo en el primer palmo (≈ 0.3–0.6 m) y chorreados apenas marcados: sutil, sin manchones
    float foot = 1.0 - smoothstep( 0.0, 0.3 + 0.3 * macro, vTriPos.y );
    float streak = texture( tAlb, vec3( ( vTriPos.x + vTriPos.z ) * 0.09, vTriPos.y * 0.012, ${MACRO}.0 ) ).r;
    float gr = wall * gk * ( foot * foot * 0.7 + smoothstep( 0.6, 0.9, streak ) * 0.12 );
    alb *= mix( vec3( 1.0 ), vec3( 0.66, 0.6, 0.52 ), clamp( gr, 0.0, 1.0 ) );
  }
  // mojado: cuánto mira hacia arriba en el mundo (los planos del piso vienen girados) y cuánto agua aguanta la capa;
  // al secarse, las partes altas del ruido grande se secan primero (manchas, no un fundido parejo)
  float triUp = dot( normalize( vTriM * tn0 ), viewMatrix[ 1 ].xyz );
  float wetP = smoothstep( 0.0, 0.35, uWet * 1.35 - mv * 0.7 );
  float wetK = wetP * ( 0.35 + 0.65 * smoothstep( 0.2, 0.9, triUp ) ) * ( 0.55 + 0.45 * TRI_PUD[ li ] );
  alb *= 1.0 - ( 0.22 + 0.2 * TRI_PUD[ li ] ) * wetK;
  triRoughMul = mix( 1.0, mix( 0.5, 0.16, TRI_PUD[ li ] ), wetK ); triRough = tnb.b;
  triPud = 0.0; triRefl = 0.0;
  #if !defined( TRI_LOW ) && !defined( TRI_WATER )
    // charcos en los bajos del piso: crecen mientras llueve y se encogen al secarse
    if ( uPuddle > 0.002 && triUp > 0.86 && TRI_PUD[ li ] > 0.0 ) {
      float pn = texture( tAlb, vec3( vTriPos.xz * 0.06 + vec2( 0.71, 0.29 ), ${MACRO}.0 ) ).r * 0.7
        + texture( tAlb, vec3( vTriPos.xz * 0.21 + vec2( 0.33, 0.81 ), ${MACRO}.0 ) ).r * 0.3;
      float th = mix( 0.82, 0.5, uPuddle * TRI_PUD[ li ] );
      triPud = smoothstep( th, th + 0.05, pn ) * smoothstep( 0.86, 0.95, triUp );
      alb *= 1.0 - 0.6 * triPud;
      triRoughMul = mix( triRoughMul, 0.05, triPud );
    }
    triRefl = max( triPud, wetK * TRI_PUD[ li ] * 0.6 * smoothstep( 0.6, 0.95, triUp ) );
  #endif
  #ifdef TRI_WATER
    alb *= 0.82;
    if ( triKnown > 0.5 ) {
      // agua poco honda: más clara y con el fondo a la vista; honda: más oscura
      triShallow = 1.0 - smoothstep( 0.05, 1.8, wD );
      alb = mix( alb * mix( 1.0, 0.72, smoothstep( 2.0, 10.0, wD ) ), alb * 1.25 + vec3( 0.05, 0.07, 0.04 ), triShallow * 0.6 );
      // espuma en la orilla: una franja que respira y líneas que llegan con cada ola, rotas por ruido
      float fn = texture( tAlb, vec3( vTriW.xz * 0.3 + uTime * vec2( 0.012, 0.008 ), ${MACRO}.0 ) ).r;
      float fn2 = texture( tAlb, vec3( vTriW.xz * 1.1 - uTime * vec2( 0.02, 0.015 ), ${MACRO}.0 ) ).r;
      float band = 1.0 - smoothstep( 0.0, 0.12 + 0.07 * sin( uTime * 0.9 + fn * 6.0 ), wD );
      float lines = smoothstep( 0.86, 1.0, sin( wD * 30.0 - uTime * 1.7 + fn * 5.0 ) ) * ( 1.0 - smoothstep( 0.06, 0.26, wD ) );
      triFoam = clamp( band * 0.9 + lines * 0.6, 0.0, 1.0 ) * smoothstep( 0.22, 0.5, fn2 * 0.75 + fn * 0.25 + band * 0.25 );
      alb = mix( alb, vec3( 0.9, 0.94, 0.95 ), triFoam * 0.9 );
      triRoughMul = mix( 1.0, 9.0, triFoam );
    }
  #endif
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
#if !defined( TRI_LOW ) && !defined( TRI_WATER )
  if ( triPud > 0.0 ) {
    // el charco es un espejo plano; en alta, con lluvia, se rompe con los anillos de las gotas
    vec3 gN = normalize( vTriM * normalize( vTriN ) ) * faceDirection;
    normal = normalize( mix( normal, gN, triPud ) );
    #ifdef TRI_HIGH
      if ( uRain > 0.02 ) {
        vec2 rp = triRipple( vTriPos.xz, uTime ) * uRain * triPud * 0.35;
        normal = normalize( normal + viewMatrix[ 0 ].xyz * rp.x + viewMatrix[ 2 ].xyz * rp.y );
      }
    #endif
  }
#endif
#ifdef TRI_WATER
  if ( triFoam > 0.0 ) normal = normalize( mix( normal, normalize( vTriM * normalize( vTriN ) ) * faceDirection, triFoam * 0.7 ) );
#endif
`;
const FRAG_EMIS = /* glsl */ `
#ifdef TRI_ATTR
  totalEmissiveRadiance += vMat.w > 0.0 ? vec3( 1.0, 0.64, 0.3 ) * vMat.w * uNight : triTint * ( - vMat.w );
#endif
`;
/** brillo de Fresnel para agua y vidrio: más opaco y con reflejo del cielo en ángulos rasantes */
// El agua usa Fresnel de Schlick (F0 = 0.02) con el reflejo del mapa de entorno (cielo y monte lejano): mirando
// hacia abajo se ve el fondo y el color del agua; en ángulo rasante es casi un espejo del cielo.
const FRAG_FRESNEL = /* glsl */ `
#ifdef TRI_WATER
{
  vec3 wV = normalize( vViewPosition );
  float wF = 0.02 + 0.98 * pow( 1.0 - saturate( dot( normal, wV ) ), 5.0 );
  // poco hondo deja ver el fondo; la espuma tapa
  diffuseColor.a = mix( diffuseColor.a * mix( 0.88, 0.6, triShallow ), 1.0, saturate( wF * 1.7 ) );
  diffuseColor.a = mix( diffuseColor.a, 0.92, triFoam );
  wF *= 1.0 - triFoam;
  #ifdef USE_ENVMAP
    // con scene.environment la intensidad es la del relleno del cielo: aquí se quita para ver el cielo tal cual;
    // el agua se queda con un poco de su color en el reflejo
    vec3 wR = getIBLRadiance( wV, normal, 0.04 ) / max( envMapIntensity, 0.3 );
    outgoingLight = mix( outgoingLight, wR * mix( vec3( 1.0 ), triTint * 1.6, 0.3 ), wF * 0.72 );
  #else
    outgoingLight += uSky * wF * 0.5;
  #endif
  #ifdef TRI_HIGH
    // cáusticos: la red de luz que el sol deja en el fondo poco hondo (se ve a través del agua)
    if ( triShallow > 0.02 ) {
      float sunUp = saturate( uSunDir.y * 2.0 ) * ( 1.0 - uNight ) * ( 1.0 - smoothstep( 14.0, 40.0, length( vViewPosition ) ) );
      outgoingLight += uSunCol * triCaus( vTriW.xz * 1.3, uTime * 0.8 ) * triShallow * ( 1.0 - triFoam ) * sunUp * 0.35;
    }
  #endif
}
#else
{
  // de noche el vidrio deja ver más el cuarto encendido de adentro (y refleja menos un cielo que ya está oscuro)
  float fres = pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 3.0 );
  diffuseColor.a = mix( diffuseColor.a, 1.0, fres * 0.85 ) * ( 1.0 - 0.8 * uNight );
  outgoingLight += uSky * fres * 0.4 * ( 1.0 - 0.7 * uNight );
}
#endif
#include <opaque_fragment>
`;
/** Con el posproceso activo (uSplit = 1), lo opaco guarda en el alfa qué parte de su luz es ambiental (la oclusión
 *  oscurece solo esa parte, no lo que da al sol) o, si es piso mojado que refleja, 1.5 + cuánto refleja (los reflejos
 *  en pantalla de alta lo leen). Sin posproceso el alfa queda en 1 como siempre. */
const FRAG_SPLIT = /* glsl */ `
#include <opaque_fragment>
#ifdef OPAQUE
if ( uSplit > 0.5 ) {
  const vec3 LW = vec3( 0.2126, 0.7152, 0.0722 );
  float tAmb = dot( reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular, LW );
  float tAll = max( dot( outgoingLight, LW ), 1e-4 );
  gl_FragColor.a = triRefl > 0.02 ? 1.5 + triRefl : clamp( tAmb / tAll, 0.0, 1.0 );
}
#endif
`;

function shared(sh: { uniforms: Record<string, any> }) {
  const t = layerTextures();
  sh.uniforms.tAlb = { value: t.alb };
  sh.uniforms.tNrm = { value: t.nrm };
  sh.uniforms.uWet = G.uWet;
  sh.uniforms.uTime = G.uTime;
  sh.uniforms.uNight = G.uNight;
  sh.uniforms.uSky = G.uSky;
  sh.uniforms.uRain = G.uRain;
  sh.uniforms.uPuddle = G.uPuddle;
  sh.uniforms.uSplit = G.uSplit;
  sh.uniforms.uSunDir = G.uSunDir;
  sh.uniforms.uSunCol = G.uSunCol;
  sh.uniforms.tShore = {
    get value() {
      return G.tShore.value ?? SHORE0;
    },
  };
  sh.uniforms.uShoreBox = G.uShoreBox;
  sh.uniforms.uShoreY = G.uShoreY;
}
/** Convierte un MeshStandardMaterial en triplanar. `attr` = capa/color por vértice (utilería fusionada). */
export function triplanar<T extends THREE.MeshStandardMaterial>(
  mat: T,
  o: { attr?: boolean; layer?: LayerName; water?: boolean; fresnel?: boolean; nk?: number } = {},
): T {
  const uMat = {
    value: new THREE.Vector4(layerIndex(o.layer ?? 'plastic'), 1 / TILE[o.layer ?? 'plastic'], o.nk ?? 1, 0),
  };
  const low = texCalidad() === 'baja',
    high = texCalidad() === 'alta';
  mat.defines = {
    ...(mat.defines ?? {}),
    ...(o.attr ? { TRI_ATTR: '' } : {}),
    ...(o.water ? { TRI_WATER: '' } : {}),
    ...(low ? { TRI_LOW: '' } : {}),
    ...(high ? { TRI_HIGH: '' } : {}),
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
    // en baja no hay posproceso: el shader queda como antes
    else if (!low) f = f.replace('#include <opaque_fragment>', FRAG_SPLIT);
    sh.fragmentShader = f;
  };
  mat.customProgramCacheKey = () =>
    `tri|${o.attr ? 1 : 0}|${o.water ? 1 : 0}|${o.fresnel ? 1 : 0}|${low ? 1 : 0}|${high ? 1 : 0}`;
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

let _pool: THREE.ShaderMaterial | null = null;
/** Charco de luz cálida en el piso bajo las lámparas: disco aditivo que se apaga de día (sin luces ni sombras
 *  extra). La geometría trae uv en [−1, 1] y `aK` con la fuerza de cada lámpara. */
export function poolMaterial() {
  return (_pool ??= new THREE.ShaderMaterial({
    uniforms: { uNight: G.uNight, uWet: G.uWet },
    vertexShader: /* glsl */ `
      attribute float aK; varying vec2 vUv; varying float vK; varying vec2 vCam;
      void main() {
        vUv = uv; vK = aK;
        vec4 w = modelMatrix * vec4( position, 1.0 );
        // hacia la cámara en el plano del charco (uv: x = +x del mundo, y = −z)
        vec2 d = normalize( cameraPosition.xz - w.xz + 1e-4 ); vCam = vec2( d.x, -d.y );
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uNight, uWet; varying vec2 vUv; varying float vK; varying vec2 vCam;
      void main() {
        float d = length( vUv );
        // caída suave tipo cuadrado inverso, núcleo más blanco y borde anaranjado
        float a = d > 1.0 ? 0.0 : pow( 1.0 - d * d, 2.6 ) * vK * uNight * ( 1.0 + 0.3 * uWet );
        // con el piso mojado la lámpara se refleja: una estela angosta del pie de la luz hacia la cámara
        float al = dot( vUv, vCam ), ac = dot( vUv, vec2( -vCam.y, vCam.x ) );
        float st = exp( -ac * ac * 60.0 ) * smoothstep( -0.25, 0.15, al ) * ( 1.0 - smoothstep( 0.3, 1.0, al ) );
        a += st * vK * uNight * uWet * 0.9;
        if ( a < 0.002 ) discard;
        vec3 c = mix( vec3( 1.0, 0.55, 0.22 ), vec3( 1.0, 0.82, 0.55 ), pow( max( 1.0 - d, 0.0 ), 2.0 ) + st * uWet * 0.5 );
        gl_FragColor = vec4( c * a * 0.26, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    // suma color sin tocar el alfa (el posproceso lee del alfa la luz ambiental y el reflejo del piso)
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  }));
}
