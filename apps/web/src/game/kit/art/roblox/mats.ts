// Materiales estilo Roblox. Un solo sombreador (MeshStandardMaterial parcheado) con una textura de capas
// (sampler2DArray) generada por código: studs, ladrillo, teja, madera… La textura se proyecta en el espacio LOCAL
// de la pieza (triplanar), así los studs miden lo mismo en cualquier bloque sin depender de sus UV.
// Las caras que miran hacia arriba usan la capa "top" (studs) y el resto la capa "side".
import * as THREE from 'three';
import type { MatKind } from '../types';

export type Kind = MatKind | 'smooth' | 'shiny';
/** reloj compartido (segundos) para agua, banderas y portales */
export const TIME = { value: 0 };
/** dirección del sol (mundo) e intensidad del reflejo falso de cielo; las actualiza el SkyRig */
export const SUN = { value: new THREE.Vector3(0.49, 0.81, 0.32) };
export const ENVK = { value: new THREE.Vector3(1, 1, 1) };
export const touchTime = () => {
  TIME.value = performance.now() / 1000;
};
/** 1 de noche: enciende las ventanas marcadas con `lit` y los halos de los faroles. Lo fija el SkyRig. */
export const NIGHT = { value: 0 };
const nightSubs = new Set<() => void>();
export function setNight(v: number) {
  if (NIGHT.value !== v) {
    NIGHT.value = v;
    nightSubs.forEach((f) => f());
  }
}
export const subscribeNight = (f: () => void) => {
  nightSubs.add(f);
  return () => {
    nightSubs.delete(f);
  };
};
export const isNight = () => NIGHT.value > 0.5;

// ---------------------------------------------------------------- ruido
const hsh = (x: number, y: number, s = 0) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul((s | 0) + 1, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const sst = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** ruido de valor que repite: u,v en [0,1), fx/fy = celdas por repetición */
function vn(u: number, v: number, fx: number, fy: number, s = 0) {
  const x = u * fx,
    y = v * fy,
    xi = Math.floor(x),
    yi = Math.floor(y),
    tx = x - xi,
    ty = y - yi,
    sx = tx * tx * (3 - 2 * tx),
    sy = ty * ty * (3 - 2 * ty);
  const x0 = xi % fx,
    x1 = (xi + 1) % fx,
    y0 = yi % fy,
    y1 = (yi + 1) % fy;
  return lerp(lerp(hsh(x0, y0, s), hsh(x1, y0, s), sx), lerp(hsh(x0, y1, s), hsh(x1, y1, s), sx), sy);
}
const fbm = (u: number, v: number, f: number, s = 0) =>
  vn(u, v, f, f, s) * 0.5 + vn(u, v, f * 2, f * 2, s + 1) * 0.3 + vn(u, v, f * 4, f * 4, s + 2) * 0.2;
const VO = [0, 0, 0];
/** voronoi que repite: deja en VO [f1, f2, idCelda] */
function voro(u: number, v: number, n: number, s: number) {
  const x = u * n,
    y = v * n,
    xi = Math.floor(x),
    yi = Math.floor(y);
  let f1 = 9,
    f2 = 9,
    id = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx,
        cy = yi + dy,
        wx = ((cx % n) + n) % n,
        wy = ((cy % n) + n) % n;
      const d = Math.hypot(x - (cx + 0.18 + 0.64 * hsh(wx, wy, s)), y - (cy + 0.18 + 0.64 * hsh(wx, wy, s + 7)));
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = wx + wy * n;
      } else if (d < f2) f2 = d;
    }
  VO[0] = f1;
  VO[1] = f2;
  VO[2] = id;
}

// ---------------------------------------------------------------- capas
// cada función escribe o = [multiplicador de brillo (1 = neutro), máscara de línea 0..1, rugosidad (1 = neutra)]
type PF = (u: number, v: number, o: number[]) => void;
function stud(u: number, v: number, k = 1) {
  const dx = u - 0.5,
    dy = v - 0.5,
    r = Math.hypot(dx, dy),
    R = 0.31,
    w = 0.045;
  let m = 1;
  if (r < R - w) m = 1.07;
  else if (r < R) m = 1 + 0.26 * ((dx + dy) / (r * 1.4142));
  else {
    const r2 = Math.hypot(dx + 0.055, dy + 0.055);
    if (r2 < R) m = 0.8;
    else if (r2 < R + 0.03) m = 0.9;
  }
  return 1 + (m - 1) * k;
}
interface Layer {
  tile: number;
  rough: number;
  metal?: number;
  macro?: number;
  line?: string;
  lineK?: number;
  fn: PF;
}
const LAYERS: Layer[] = [
  /* 0 liso */ {
    tile: 1,
    rough: 0.55,
    fn: (_u, _v, o) => {
      o[0] = 1;
    },
  },
  /* 1 studs */ {
    tile: 0.4,
    rough: 0.5,
    macro: 0.03,
    fn: (u, v, o) => {
      o[0] = stud(u, v);
    },
  },
  /* 2 pasto arriba */ {
    tile: 0.4,
    rough: 0.85,
    macro: 0.16,
    fn: (u, v, o) => {
      o[0] = stud(u, v, 0.8) * (0.96 + 0.08 * hsh(u * 64, v * 64, 3));
    },
  },
  /* 3 pasto lado */ {
    tile: 1,
    rough: 0.9,
    macro: 0.08,
    fn: (u, v, o) => {
      o[0] = 0.86 + 0.16 * vn(u, v, 32, 4, 5) + 0.05 * hsh(u * 128, v * 128, 2);
    },
  },
  /* 4 tierra */ {
    tile: 1.6,
    rough: 0.95,
    macro: 0.14,
    fn: (u, v, o) => {
      voro(u, v, 9, 11);
      const peb = VO[0] < 0.16 ? (hsh(VO[2], 3, 1) > 0.5 ? 1.22 : 0.74) : 1;
      o[0] = (0.86 + 0.26 * fbm(u, v, 6, 4)) * peb * (0.96 + 0.08 * hsh(u * 256, v * 256, 9));
    },
  },
  /* 5 arena arriba */ {
    tile: 0.4,
    rough: 0.9,
    macro: 0.1,
    fn: (u, v, o) => {
      o[0] = stud(u, v, 0.6) * (0.95 + 0.1 * hsh(u * 96, v * 96, 4));
    },
  },
  /* 6 arena lado */ {
    tile: 1,
    rough: 0.9,
    macro: 0.08,
    fn: (u, v, o) => {
      o[0] = (0.93 + 0.08 * vn(u, v, 3, 12, 8)) * (0.95 + 0.1 * hsh(u * 200, v * 200, 4));
    },
  },
  /* 7 piedra */ {
    tile: 2,
    rough: 0.8,
    macro: 0.1,
    line: '#3c4046',
    lineK: 0.55,
    fn: (u, v, o) => {
      voro(u, v, 5, 21);
      const e = VO[1] - VO[0];
      o[0] = (0.84 + 0.22 * fbm(u, v, 5, 9)) * (0.92 + 0.16 * hsh(VO[2], 1, 5));
      o[1] = 1 - sst(0.015, 0.05, e);
    },
  },
  /* 8 empedrado */ {
    tile: 1.6,
    rough: 0.75,
    macro: 0.08,
    line: '#4a4640',
    lineK: 0.85,
    fn: (u, v, o) => {
      voro(u, v, 5, 33);
      const e = VO[1] - VO[0];
      o[0] = (0.78 + 0.34 * hsh(VO[2], 2, 6)) * (0.9 + 0.3 * sst(0.0, 0.5, e)) * (0.96 + 0.08 * fbm(u, v, 16, 2));
      o[1] = 1 - sst(0.05, 0.13, e);
    },
  },
  /* 9 ladrillo */ {
    tile: 1,
    rough: 0.85,
    macro: 0.06,
    line: '#d9d2c2',
    lineK: 0.92,
    fn: (u, v, o) => {
      const row = Math.floor(v * 4),
        fy = v * 4 - row,
        x = u * 2 + (row % 2) * 0.5,
        bx = Math.floor(x),
        fx = x - bx;
      const mo = fy < 0.07 || fy > 0.93 || fx < 0.035 || fx > 0.965;
      o[0] =
        (0.84 + 0.3 * hsh(bx % 2, row, 8)) * (fy > 0.82 ? 1.1 : fy < 0.2 ? 0.9 : 1) * (0.95 + 0.1 * fbm(u, v, 24, 3));
      o[1] = mo ? 1 : 0;
    },
  },
  /* 10 madera */ {
    tile: 1,
    rough: 0.7,
    macro: 0.05,
    fn: (u, v, o) => {
      const row = Math.floor(v * 4),
        fy = v * 4 - row,
        x = u + hsh(row, 5, 2) * 0.7,
        fx = x - Math.floor(x);
      const gap = fy < 0.04 || fy > 0.96 || fx < 0.012;
      const nail = Math.hypot((fx - 0.05) * 4, fy - 0.3) < 0.07 || Math.hypot((fx - 0.05) * 4, fy - 0.7) < 0.07;
      o[0] = gap
        ? 0.55
        : nail
          ? 0.6
          : (0.86 + 0.2 * hsh(row, Math.floor(x), 4)) * (0.9 + 0.2 * vn(u, v, 6, 96, 7 + row)) * (fy > 0.86 ? 1.08 : 1);
    },
  },
  /* 11 metal */ {
    tile: 1,
    rough: 0.32,
    metal: 0.55,
    macro: 0.04,
    fn: (u, v, o) => {
      const fx = u * 2 - Math.floor(u * 2),
        fy = v * 2 - Math.floor(v * 2);
      const seam = fx < 0.02 || fy < 0.02;
      const rv = Math.hypot(Math.min(fx, 1 - fx) - 0.09, Math.min(fy, 1 - fy) - 0.09) < 0.035;
      o[0] = seam ? 0.72 : rv ? 1.25 : 0.94 + 0.12 * vn(u, v, 4, 128, 3);
    },
  },
  /* 12 azulejo */ {
    tile: 1,
    rough: 0.25,
    metal: 0.12,
    macro: 0.03,
    line: '#e8e2d2',
    lineK: 0.9,
    fn: (u, v, o) => {
      const cx = Math.floor(u * 2),
        cy = Math.floor(v * 2),
        fx = u * 2 - cx,
        fy = v * 2 - cy;
      const g = fx < 0.03 || fx > 0.97 || fy < 0.03 || fy > 0.97;
      const dm = Math.abs(fx - 0.5) + Math.abs(fy - 0.5);
      o[0] =
        (0.92 + 0.12 * hsh(cx, cy, 12)) *
        (dm < 0.2 ? 1.1 : dm < 0.24 ? 0.85 : 1) *
        (fx + fy > 1.75 ? 0.9 : fx + fy < 0.25 ? 1.08 : 1);
      o[1] = g ? 1 : 0;
    },
  },
  /* 13 estuco */ {
    tile: 1.4,
    rough: 0.92,
    macro: 0.07,
    fn: (u, v, o) => {
      voro(u, v, 12, 41);
      o[0] = (0.93 + 0.1 * fbm(u, v, 12, 6)) * (VO[0] < 0.1 ? 0.9 : 1) * (0.97 + 0.06 * hsh(u * 256, v * 256, 1));
    },
  },
  /* 14 teja */ {
    tile: 1,
    rough: 0.7,
    macro: 0.06,
    fn: (u, v, o) => {
      const col = Math.floor(u * 4),
        fx = u * 4 - col,
        y = v * 3 + (col % 2) * 0.5,
        row = Math.floor(y),
        fy = y - row;
      const prof = Math.sin(fx * Math.PI);
      o[0] =
        (0.8 + 0.3 * hsh(col, row % 3, 14)) *
        (0.5 + 0.62 * prof) *
        (fy < 0.1 ? 0.6 : 0.88 + 0.22 * fy) *
        (0.96 + 0.08 * fbm(u, v, 16, 1));
    },
  },
  /* 15 agua */ {
    tile: 3,
    rough: 0.12,
    metal: 0.3,
    fn: (u, v, o) => {
      const a = Math.abs(fbm(u, v, 5, 17) - 0.5) * 2,
        b = Math.abs(fbm(u, v, 9, 27) - 0.5) * 2;
      o[0] = 0.9 + 0.5 * (1 - Math.min(a, b)) ** 6;
    },
  },
  /* 16 tela */ {
    tile: 0.5,
    rough: 0.95,
    fn: (u, v, o) => {
      const a = Math.sin(u * Math.PI * 2 * 20),
        b = Math.sin(v * Math.PI * 2 * 20);
      o[0] = 0.97 + 0.06 * a * b + 0.04 * (a > 0.6 || b > 0.6 ? 1 : 0);
    },
  },
  /* 17 asfalto */ {
    tile: 1.2,
    rough: 0.95,
    macro: 0.1,
    fn: (u, v, o) => {
      voro(u, v, 16, 51);
      o[0] = (0.86 + 0.2 * hsh(u * 256, v * 256, 6)) * (VO[0] < 0.09 ? 1.45 : 1) * (0.94 + 0.12 * fbm(u, v, 8, 2));
    },
  },
  /* 18 concreto arriba */ {
    tile: 0.4,
    rough: 0.85,
    macro: 0.08,
    fn: (u, v, o) => {
      o[0] = stud(u, v, 0.75) * (0.96 + 0.08 * hsh(u * 80, v * 80, 4));
    },
  },
  /* 19 concreto lado */ {
    tile: 2,
    rough: 0.9,
    macro: 0.07,
    fn: (u, v, o) => {
      const j = u < 0.012 || v < 0.012 ? 0.72 : 1;
      voro(u, v, 14, 61);
      o[0] = j * (0.93 + 0.1 * fbm(u, v, 10, 2)) * (VO[0] < 0.07 ? 0.82 : 1) * (0.97 + 0.06 * hsh(u * 256, v * 256, 3));
    },
  },
  /* 20 hoja */ {
    tile: 1.2,
    rough: 0.9,
    macro: 0.1,
    fn: (u, v, o) => {
      const cx = Math.floor(u * 6),
        cy = Math.floor(v * 6),
        fx = u * 6 - cx,
        fy = v * 6 - cy,
        h = hsh(cx, cy, 20);
      const edge = fx < 0.06 || fy < 0.06;
      o[0] =
        (h > 0.8 ? 1.2 : h < 0.25 ? 0.8 : 0.94 + 0.12 * h) * (edge ? 0.9 : 1) * (fx + fy < 0.5 && h > 0.5 ? 1.08 : 1);
    },
  },
  /* 21 oro */ {
    tile: 0.6,
    rough: 0.22,
    metal: 0.72,
    fn: (u, v, o) => {
      o[0] = 0.96 + 0.1 * vn(u, v, 3, 64, 4) + (hsh(u * 64, v * 64, 2) > 0.985 ? 0.5 : 0);
    },
  },
  /* 22 vidrio */ {
    tile: 1.5,
    rough: 0.1,
    metal: 0.45,
    fn: (u, v, o) => {
      const d = (u + v) % 1;
      o[0] = 1 + (d > 0.3 && d < 0.4 ? 0.3 : d > 0.46 && d < 0.5 ? 0.22 : 0);
    },
  },
  /* 23 brillante */ {
    tile: 1,
    rough: 0.2,
    metal: 0.4,
    fn: (_u, _v, o) => {
      o[0] = 1;
    },
  },
  /* 24 macro (siempre la última) */ {
    tile: 1,
    rough: 1,
    fn: (u, v, o) => {
      o[0] = 0.5 + fbm(u, v, 4, 77);
    },
  },
];
export const NL = LAYERS.length;
/** capas [arriba, lado] de cada material */
export const KINDS: Record<Kind, [number, number]> = {
  plastic: [1, 0],
  grass: [2, 3],
  dirt: [4, 4],
  sand: [5, 6],
  stone: [7, 7],
  cobble: [8, 8],
  brick: [9, 9],
  wood: [10, 10],
  metal: [11, 11],
  tile: [12, 12],
  stucco: [13, 13],
  roof: [14, 14],
  water: [15, 15],
  neon: [0, 0],
  glass: [22, 22],
  cloth: [16, 16],
  asphalt: [17, 17],
  concrete: [18, 19],
  leaf: [20, 20],
  gold: [21, 21],
  smooth: [0, 0],
  shiny: [23, 23],
};

const SZ = 128;
let layerTex: THREE.DataArrayTexture | null = null;
const uA: THREE.Vector4[] = [],
  uB: THREE.Vector4[] = [];
function layers() {
  if (layerTex) return layerTex;
  const data = new Uint8Array(SZ * SZ * 4 * NL),
    o = [1, 0, 1],
    c = new THREE.Color();
  LAYERS.forEach((L, li) => {
    let p = li * SZ * SZ * 4;
    for (let y = 0; y < SZ; y++)
      for (let x = 0; x < SZ; x++) {
        o[0] = 1;
        o[1] = 0;
        o[2] = 1;
        L.fn((x + 0.5) / SZ, (y + 0.5) / SZ, o);
        data[p++] = Math.max(0, Math.min(255, o[0] * 127.5));
        data[p++] = Math.max(0, Math.min(255, o[1] * 255));
        data[p++] = Math.max(0, Math.min(255, o[2] * 127.5));
        data[p++] = 255;
      }
    c.set(L.line ?? '#000000');
    uA[li] = new THREE.Vector4(1 / L.tile, L.rough, L.metal ?? 0, L.macro ?? 0);
    uB[li] = new THREE.Vector4(c.r, c.g, c.b, L.lineK ?? 0);
  });
  const t = new THREE.DataArrayTexture(data, SZ, SZ, NL);
  t.format = THREE.RGBAFormat;
  t.type = THREE.UnsignedByteType;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return (layerTex = t);
}

// ---------------------------------------------------------------- sombreador
const V_PARS = /* glsl */ `
varying vec3 vRbP; varying vec3 vRbN; varying float vRbUp; varying vec2 vRbUv;
#ifdef RB_ATTR
flat varying vec2 vRbK;
#endif
`;
const V_MAIN = /* glsl */ `
vRbP = position; vRbN = normal; vRbUv = uv;
#ifdef USE_INSTANCING
vRbUp = normalize(mat3(modelMatrix) * (mat3(instanceMatrix) * normal)).y;
#else
vRbUp = normalize(mat3(modelMatrix) * normal).y;
#endif
#ifdef RB_ATTR
vRbK = uv;
#endif
`;
const F_PARS = /* glsl */ `
uniform sampler2DArray rbTex; uniform vec4 rbA[RB_NL]; uniform vec4 rbB[RB_NL]; uniform float rbTime; uniform vec3 rbSun; uniform vec3 rbEnv;
varying vec3 vRbP; varying vec3 vRbN; varying float vRbUp; varying vec2 vRbUv;
#ifdef RB_ATTR
flat varying vec2 vRbK;
#else
uniform vec4 rbLu;
#endif
uniform float rbNight; float rbRough = 0.6; float rbMetal = 0.0; float rbEm = 0.0; float rbLit = 0.0;
`;
const F_DETAIL = /* glsl */ `
{
  #ifdef RB_ATTR
  // color (sRGB, 24 bits) y capas empaquetados en uv; llegan sin interpolar
  float rbC = floor(vRbK.x), rbK = floor(vRbK.y);
  vec3 rbS = vec3(floor(rbC / 65536.0), mod(floor(rbC / 256.0), 256.0), mod(rbC, 256.0)) / 255.0;
  diffuseColor.rgb *= mix(rbS / 12.92, pow((rbS + 0.055) / 1.055, vec3(2.4)), step(0.04045, rbS));
  vec4 L = vec4(mod(rbK, 32.0), mod(floor(rbK / 32.0), 32.0), mod(floor(rbK / 1024.0), 2.0), mod(floor(rbK / 2048.0), 16.0) / 8.0);
  rbLit = floor(rbK / 32768.0) * rbNight;
  #else
  vec4 L = rbLu;
  #endif
  int li = int((vRbUp > 0.7 ? L.x : L.y) + 0.5);
  vec4 A = rbA[li]; vec4 B = rbB[li];
  vec3 an = abs(vRbN); vec3 dPx = dFdx(vRbP); vec3 dPy = dFdy(vRbP);
  vec2 q; vec2 qx; vec2 qy;
  vec3 rbU = vec3(vRbN.z, 0.0, -vRbN.x); float rbUl = length(rbU);
  if (L.z > 0.5 && rbUl > 0.001) { rbU /= rbUl; vec3 rbW = cross(normalize(vRbN), rbU); q = vec2(dot(vRbP, rbU), dot(vRbP, rbW)); qx = vec2(dot(dPx, rbU), dot(dPx, rbW)); qy = vec2(dot(dPy, rbU), dot(dPy, rbW)); q *= A.x; qx *= A.x; qy *= A.x; }
  else {
    if (an.y >= an.x && an.y >= an.z) { q = vRbP.xz; qx = dPx.xz; qy = dPy.xz; }
    else if (an.x > an.z) { q = vRbP.zy; qx = dPx.zy; qy = dPy.zy; }
    else { q = vRbP.xy; qx = dPx.xy; qy = dPy.xy; }
    q *= A.x; qx *= A.x; qy *= A.x;
  }
  #ifdef RB_WATER
  float w1 = textureGrad(rbTex, vec3(q + vec2(rbTime * 0.035, rbTime * 0.022), float(li)), qx, qy).r;
  float w2 = textureGrad(rbTex, vec3(q * 1.37 + vec2(0.37 - rbTime * 0.03, 0.11 + rbTime * 0.018), float(li)), qx * 1.37, qy * 1.37).r;
  vec3 tx = vec3(w1 * w2 * 2.0, 0.0, 0.5);
  #else
  vec3 tx = textureGrad(rbTex, vec3(q, float(li)), qx, qy).rgb;
  #endif
  float mac = textureGrad(rbTex, vec3(q * 0.043 + 0.31, float(RB_NL - 1)), qx * 0.043, qy * 0.043).r * 2.0 - 1.0;
  vec3 base = diffuseColor.rgb * (tx.r * 2.0) * (1.0 + mac * A.w);
  diffuseColor.rgb = mix(base, B.rgb, tx.g * B.a);
  rbRough = A.y * tx.b * 2.0; rbMetal = A.z; rbEm = L.w;
}
`;
const F_ENV = /* glsl */ `
{
  vec3 rbV = normalize(vViewPosition);
  vec3 rbR = normalize((vec4(reflect(-rbV, normal), 0.0) * viewMatrix).xyz);
  float rbG = smoothstep(-0.3, 0.45, rbR.y);
  vec3 rbSky = mix(vec3(0.34, 0.3, 0.26), vec3(0.78, 0.9, 1.0), rbG) * rbEnv + vec3(1.0, 0.95, 0.8) * pow(max(dot(rbR, rbSun), 0.0), 24.0) * rbEnv * 1.4;
  float rbF = rbMetal + (1.0 - rbMetal) * 0.0 ;
  outgoingLight = mix(outgoingLight, diffuseColor.rgb * rbSky * 1.5 + outgoingLight * 0.25, rbF);
  outgoingLight += diffuseColor.rgb * rbEm;
  outgoingLight = mix(outgoingLight, vec3(1.0, 0.78, 0.4), rbLit * 0.94);
}
`;
function patch(m: THREE.MeshStandardMaterial, lu: THREE.Vector4 | null, flags: { water?: boolean } = {}) {
  m.toneMapped = false;
  m.metalness = 0;
  m.defines = { ...(m.defines ?? {}), RB_NL: NL };
  if (!lu) m.defines.RB_ATTR = '';
  if (flags.water) m.defines.RB_WATER = '';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rbTex = { value: layers() };
    sh.uniforms.rbA = { value: uA };
    sh.uniforms.rbB = { value: uB };
    sh.uniforms.rbTime = TIME;
    sh.uniforms.rbNight = NIGHT;
    sh.uniforms.rbSun = SUN;
    sh.uniforms.rbEnv = ENVK;
    if (lu) sh.uniforms.rbLu = { value: lu };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${V_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${V_MAIN}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${F_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${F_DETAIL}`)
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = clamp(rbRough, 0.06, 1.0);',
      )
      .replace('#include <opaque_fragment>', `${F_ENV}\n#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'rbx5';
  if (flags.water) m.onBeforeRender = touchTime;
  return m;
}

// ---------------------------------------------------------------- API
const cache = new Map<string, THREE.Material>();
/** material del kit, cacheado por (tipo, color) */
export function material(kind: MatKind, color: string): THREE.Material {
  const key = `${kind}|${color}`;
  let m = cache.get(key);
  if (m) return m;
  if (kind === 'neon') m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  else {
    const K = KINDS[kind] ?? KINDS.plastic,
      s = new THREE.MeshStandardMaterial({ color });
    if (kind === 'water') {
      s.transparent = true;
      s.opacity = 0.8;
    }
    if (kind === 'glass') {
      s.transparent = true;
      s.opacity = 0.42;
    }
    m = patch(s, new THREE.Vector4(K[0], K[1], 0, 0), { water: kind === 'water' });
  }
  cache.set(key, m);
  return m;
}
let _vc: THREE.Material | null = null,
  _vcGlass: THREE.Material | null = null,
  _vcWater: THREE.Material | null = null,
  _vc2: THREE.Material | null = null;
/** material compartido de la utilería fusionada: color y capa por vértice, empaquetados en `uv` (ver geo.ts) */
export const vcMat = () => (_vc ??= patch(new THREE.MeshStandardMaterial(), null));
/** igual, pero de dos caras (telas, hojas planas) */
export const vcMat2 = () => (_vc2 ??= patch(new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }), null));
export const vcGlass = () =>
  (_vcGlass ??= patch(new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.38, depthWrite: false }), null));
export const vcWater = () =>
  (_vcWater ??= patch(new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.8, depthWrite: false }), null, {
    water: true,
  }));
