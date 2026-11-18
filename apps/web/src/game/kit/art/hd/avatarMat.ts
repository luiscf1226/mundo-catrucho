// Material del avatar HD: un MeshStandardMaterial por configuración (atlas + ORM propios) con un mapa de normales
// COMPARTIDO de pliegues y costuras (mismo diseño de atlas para todos) y un sombreador que lee la clase de material del
// canal R del ORM: piel con luz que se mete bajo la piel (subsuperficie barata), pelo con hebras y brillo anisótropo,
// algodón, mezclilla, tejido deportivo y cuero con su trama fina. Sigue siendo UNA llamada de dibujo por personaje.
import * as THREE from 'three';
import type { AvatarConfig } from '../../../../core/types';
import { HC } from './avatarAnat';
import { R } from './avatarGeo';
import { avatarMaps, configKey, tonoPiel } from './avatarTex';
import { G } from './materials';
import { AH, AW, type Rect } from './skin';
import { rng } from './tex';

const sm = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

let folds: THREE.Texture | null = null;
/** mapa de normales de pliegues y costuras (cintura, axilas, codos, rodillas, tobillos, costuras laterales, vuelo) */
export function foldNormals(): THREE.Texture {
  if (folds) return folds;
  const W = AW / 2,
    H = AH / 2,
    hgt = new Float32Array(W * H);
  // todo en pixeles del atlas completo; se muestrea a la mitad
  const add = (r: Rect, fn: (x: number, y: number) => number) => {
    for (let y = Math.floor(r[1] / 2); y < (r[1] + r[3]) / 2; y++)
      for (let x = Math.floor(r[0] / 2); x < (r[0] + r[2]) / 2; x++)
        hgt[y * W + x] += fn(x * 2 + 1 - r[0], y * 2 + 1 - r[1]);
  };
  const groove = (d: number, w = 2.2) =>
    -Math.exp(-((d / w) ** 2)) + 0.45 * Math.exp(-(((Math.abs(d) - w * 1.6) / w) ** 2));
  const r = rng(91),
    diag: [number, number, number, number, number][] = [];
  for (let i = 0; i < 26; i++) diag.push([r(), r(), r(), r(), r()]);
  /** arruga suave a lo largo de un segmento */
  const crease = (x: number, y: number, x0: number, y0: number, x1: number, y1: number, w: number) => {
    const dx = x1 - x0,
      dy = y1 - y0,
      L2 = dx * dx + dy * dy,
      t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / L2)),
      px = x0 + dx * t - x,
      py = y0 + dy * t - y,
      d = Math.hypot(px, py);
    return Math.exp(-((d / w) ** 2)) * Math.sin(t * Math.PI);
  };
  // torso: 512 × 256, frente en x = 256, costados en 128 y 384, cintura en y ≈ 172
  add(R.torso, (x, y) => {
    let h = 0;
    for (const sx of [128, 384]) h += 0.8 * groove(x - sx);
    const waist = sm(110, 160, y) * (1 - sm(176, 182, y));
    h +=
      waist *
      0.32 *
      Math.sin(y * 0.5 + Math.sin(x * 0.045) * 2.4 + Math.sin(x * 0.013) * 3) *
      (0.5 + 0.5 * Math.sin(x * 0.031 + 1));
    h += 0.7 * Math.exp(-(((y - 170) / 2.2) ** 2)); // orilla de la camisa
    h -= 0.6 * Math.exp(-(((y - 176) / 1.6) ** 2));
    for (const [a, b, c] of diag.slice(0, 12)) {
      const side = a < 0.5 ? 128 : 384,
        dir = b < 0.5 ? -1 : 1,
        x0 = side + dir * (6 + c * 10),
        y0 = 30 + c * 30;
      h += 0.9 * crease(x, y, x0, y0, x0 + dir * (40 + b * 30), y0 + 40 + a * 30, 3 + c * 2);
    }
    if (y > 180) {
      h += 0.8 * groove(x - 256, 1.6) * sm(182, 190, y);
      for (const s of [-1, 1])
        for (let k = 0; k < 3; k++)
          h += 0.6 * crease(x, y, 256 + s * (8 + k * 6), 250 - k * 4, 256 + s * (40 + k * 14), 214 - k * 10, 2.5);
    }
    return h;
  });
  // mangas: 128 × 256, frente en 64, codo en y ≈ 154
  add(R.arm, (x, y) => {
    let h = 0.6 * Math.exp(-(((y - 6) / 2.5) ** 2));
    const elbow = Math.exp(-(((y - 152) / 16) ** 2)) * Math.exp(-(((x - 64) / 30) ** 2));
    h += elbow * 0.9 * Math.sin(y * 0.6 + Math.sin(x * 0.12) * 1.8);
    for (const [a, b, c] of diag.slice(12, 18))
      h += 0.6 * crease(x, y, 20 + a * 80, 30 + b * 40, 40 + a * 70, 70 + c * 40, 2.5);
    return h;
  });
  // piernas: 128 × 256, rodilla en y ≈ 130, costuras en 32 y 96, tobillo abajo
  add(R.leg, (x, y) => {
    let h = 0;
    for (const sx of [32, 96]) h += 0.8 * groove(x - sx);
    const back = Math.min(x, 128 - x) < 26 ? 1 : 0.35;
    h += Math.exp(-(((y - 130) / 12) ** 2)) * back * 0.8 * Math.sin(y * 0.7 + Math.sin(x * 0.1) * 2);
    h += sm(214, 250, y) * 0.9 * Math.sin(y * 0.55 + Math.sin(x * 0.09) * 2.6);
    for (const [a, b, c] of diag.slice(18, 26)) {
      const x0 = 46 + a * 36,
        y0 = 12 + b * 40;
      h += 0.7 * crease(x, y, x0, y0, x0 + (c - 0.5) * 30, y0 + 22, 2);
    }
    return h;
  });
  // falda y capa: caída vertical que se abre hacia el ruedo
  const drape = (n: number) => (x: number, y: number) =>
    (0.25 + 0.75 * sm(0, 256, y)) * 1.4 * Math.sin((x / 256) * Math.PI * 2 * n + Math.sin(y * 0.03) * 0.8);
  add(R.skirt, drape(9));
  add(R.cape, drape(5));
  // de altura a normales (verde = hacia arriba en la textura, que va volteada respecto al lienzo)
  const d = new Uint8Array(W * H * 4),
    k = 1.6;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const hx = hgt[y * W + Math.min(W - 1, x + 1)] - hgt[y * W + Math.max(0, x - 1)],
        hy = hgt[Math.min(H - 1, y + 1) * W + x] - hgt[Math.max(0, y - 1) * W + x];
      const nx = -hx * k,
        ny = hy * k,
        l = Math.hypot(nx, ny, 1),
        o = ((H - 1 - y) * W + x) * 4;
      d[o] = (nx / l) * 127 + 128;
      d[o + 1] = (ny / l) * 127 + 128;
      d[o + 2] = (1 / l) * 127 + 128;
      d[o + 3] = 255;
    }
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  folds = t;
  return t;
}

const CURLY = new Set(['pelo_rizado', 'pelo_afro', 'pelo_trenzas']);
const FRAG_PARS = /* glsl */ `
uniform vec3 uSky;
uniform float uCurl;
uniform vec3 uHair;
uniform vec3 uSkinC;
varying vec3 vObjP;
varying float vAO;
float mcCls;
float mcSkin;
float mcHairK;
vec3 mcBump( vec3 surfPos, vec3 n, float h, float fd ) {
  vec2 dh = vec2( dFdx( h ), dFdy( h ) );
  vec3 sx = dFdx( surfPos ), sy = dFdy( surfPos );
  vec3 r1 = cross( sy, n ), r2 = cross( n, sx );
  float det = dot( sx, r1 ) * fd;
  vec3 grad = sign( det ) * ( dh.x * r1 + dh.y * r2 );
  return normalize( abs( det ) * n - grad );
}
`;
/** luz directa: la piel deja pasar algo de luz rojiza más allá de la línea de sombra; el pelo brilla en banda */
const DIRECT = /* glsl */ `
void RE_Direct_Avatar( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  float ndl = dot( geometryNormal, directLight.direction );
  if ( mcSkin > 0.0 ) {
    float wrap = max( 0.0, ( ndl + 0.5 ) / 1.5 ) - saturate( ndl );
    reflectedLight.directDiffuse += directLight.color * material.diffuseColor * vec3( 1.0, 0.45, 0.34 ) * wrap * 0.38 * mcSkin;
  }
  if ( mcHairK > 0.0 ) {
    vec3 up = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
    vec3 T = normalize( up - geometryNormal * dot( up, geometryNormal ) + 1e-4 );
    vec3 H = normalize( directLight.direction + geometryViewDir );
    // Kajiya-Kay con tangentes corridas: la banda de brillo se mueve con la normal y queda angosta
    vec3 T1 = normalize( T - geometryNormal * 0.35 );
    float th1 = dot( T1, H );
    float s1 = pow( sqrt( max( 0.0, 1.0 - th1 * th1 ) ), 220.0 );
    vec3 T2 = normalize( T + geometryNormal * 0.45 );
    float th2 = dot( T2, H );
    float s2 = pow( sqrt( max( 0.0, 1.0 - th2 * th2 ) ), 60.0 );
    float vis = saturate( ndl * 0.8 + 0.2 );
    reflectedLight.directSpecular += directLight.color * vis * mcHairK * ( vec3( 0.1 ) * s1 + uHair * 0.25 * s2 ) * ( 1.0 - 0.6 * uCurl );
  }
}
#undef RE_Direct
#define RE_Direct RE_Direct_Avatar
`;
/** clase de material + trama fina procedimental (se apaga con la distancia para no hacer moiré) */
const DETAIL = /* glsl */ `
{
  mcCls = floor( texture2D( roughnessMap, vRoughnessMapUv ).r * 7.99 );
  {
    // el ORM va a 1/4 de resolución y sin filtrar: en el borde piel/tela (escote en V, mangas, shorts) la clase se
    // decide con el color del atlas, a resolución completa, para que el borde no quede en escalones
    vec2 u = vRoughnessMapUv;
    bool body = ( u.x > 0.25 && u.x < 0.75 && u.y > 0.5 ) || ( u.x < 0.25 && u.y < 0.5 );
    if ( body && ( mcCls < 2.5 || mcCls == 4.0 ) ) {
      vec2 o = vec2( 1.0 / ${AW / 4}.0, 1.0 / ${AH / 4}.0 );
      float a = floor( texture2D( roughnessMap, u + o ).r * 7.99 ), b = floor( texture2D( roughnessMap, u - o ).r * 7.99 );
      float c = floor( texture2D( roughnessMap, u + vec2( o.x, -o.y ) ).r * 7.99 ), d = floor( texture2D( roughnessMap, u - vec2( o.x, -o.y ) ).r * 7.99 );
      float nSkin = ( a == 4.0 ? 1.0 : 0.0 ) + ( b == 4.0 ? 1.0 : 0.0 ) + ( c == 4.0 ? 1.0 : 0.0 ) + ( d == 4.0 ? 1.0 : 0.0 ) + ( mcCls == 4.0 ? 1.0 : 0.0 );
      if ( nSkin > 0.5 && nSkin < 4.5 ) {
        float cloth = mcCls == 4.0 ? ( a != 4.0 ? a : b != 4.0 ? b : c != 4.0 ? c : d ) : mcCls;
        bool isSkin = distance( sqrt( max( diffuseColor.rgb, 0.0 ) ), sqrt( uSkinC ) ) < 0.07;
        mcCls = isSkin ? 4.0 : cloth;
        // la rugosidad del ORM también viene en escalones: se toma la de la clase decidida
        roughnessFactor = mcCls == 4.0 ? 0.52 : mcCls == 2.0 ? 0.62 : mcCls == 1.0 ? 0.84 : 0.9;
      }
    }
  }
  mcSkin = mcCls == 4.0 ? 1.0 : 0.0;
  mcHairK = mcCls == 5.0 ? 1.0 : 0.0;
  float cloth = mcCls < 3.5 ? 1.0 : 0.0;
  normal = normalize( mix( mcN0, normal, cloth ) );
  vec2 q = vNormalMapUv * vec2( ${AW}.0, ${AH}.0 );
  float fw = max( length( fwidth( q ) ), 1e-4 );
  float h = 0.0;
  float freq = 3.6;
  if ( mcCls < 0.5 ) { h = sin( q.x * 3.6 ) * sin( q.y * 3.6 ); }
  else if ( mcCls < 1.5 ) { h = sin( ( q.x + q.y * 1.4 ) * 3.0 ) + 0.4 * sin( q.y * 8.0 + sin( q.x * 0.7 ) * 3.0 ); freq = 3.6; }
  else if ( mcCls < 2.5 ) { h = abs( sin( q.x * 4.2 ) ) * abs( sin( q.y * 4.2 ) ); freq = 4.2; }
  else if ( mcCls < 3.5 ) { h = sin( q.x * 2.1 + sin( q.y * 1.7 ) * 2.0 ) * sin( q.y * 2.3 + sin( q.x * 1.3 ) * 2.0 ); freq = 2.3; }
  else if ( mcCls < 4.5 ) { h = sin( q.x * 6.1 + sin( q.y * 4.3 ) ) * sin( q.y * 5.7 + sin( q.x * 3.9 ) ); freq = 6.1; }
  else if ( mcCls < 5.5 ) {
    vec3 p = vObjP - vec3( ${HC[0].toFixed(3)}, ${HC[1].toFixed(3)}, ${HC[2].toFixed(3)} );
    float a = atan( p.x, p.z );
    float straight = sin( a * 46.0 + sin( p.y * 70.0 ) * 1.2 ) * 0.6 + sin( a * 131.0 + p.y * 40.0 ) * 0.4;
    float curly = sin( p.x * 420.0 + sin( p.y * 300.0 ) ) * sin( p.y * 390.0 + sin( p.z * 310.0 ) ) * sin( p.z * 410.0 );
    h = mix( straight, curly, uCurl );
    fw = max( length( fwidth( p * 260.0 ) ), 1e-4 );
    freq = 4.0;
  }
  float amp = ( mcCls < 0.5 ? 1.8 : mcCls < 1.5 ? 2.4 : mcCls < 2.5 ? 2.0 : mcCls < 3.5 ? 1.2 : mcCls < 4.5 ? 0.0 : mcCls < 5.5 ? 1.4 : 0.0 ) * 1e-4;
  amp *= 1.0 - smoothstep( 0.12, 0.4, fw * freq / 6.2832 );
  if ( amp > 0.0 ) normal = mcBump( - vViewPosition, normal, h * amp, faceDirection );
}
`;

const mats = new Map<string, THREE.MeshStandardMaterial>();
export function avatarMaterial(cfg: AvatarConfig) {
  const key = configKey(cfg);
  let m = mats.get(key);
  if (m) return m;
  const { map, orm } = avatarMaps(cfg);
  m = new THREE.MeshStandardMaterial({
    map,
    roughnessMap: orm,
    metalnessMap: orm,
    normalMap: foldNormals(),
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 1,
    metalness: 1,
  });
  const uSkinC = { value: new THREE.Color(tonoPiel(cfg.skin)) },
    uCurl = { value: CURLY.has(cfg.hair) ? 1 : 0 },
    uHair = { value: new THREE.Color(cfg.hairColor).lerp(new THREE.Color('#ffffff'), 0.25) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSky = G.uSky;
    sh.uniforms.uCurl = uCurl;
    sh.uniforms.uHair = uHair;
    sh.uniforms.uSkinC = uSkinC;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vObjP;\nattribute float mcAO;\nvarying float vAO;`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = position;\nvAO = mcAO;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_PARS}`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${DIRECT}`)
      .replace('#include <normal_fragment_maps>', `vec3 mcN0 = normal;\n#include <normal_fragment_maps>\n${DETAIL}`)
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        reflectedLight.indirectDiffuse *= mix( vec3( 1.0 ), vec3( 1.05, 0.99, 0.97 ), mcSkin ) * vAO;
        reflectedLight.indirectSpecular *= vAO * ( 1.0 - 0.7 * mcHairK );
        reflectedLight.directDiffuse *= mix( 1.0, vAO, 0.45 );`,
      )
      .replace(
        '#include <opaque_fragment>',
        `{ float rimK = pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 3.0 ) * ( mcCls == 6.0 ? 0.0 : 1.0 );
          outgoingLight += diffuseColor.rgb * uSky * rimK * 0.4; }
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => 'hd-avatar-5';
  mats.set(key, m);
  return m;
}
