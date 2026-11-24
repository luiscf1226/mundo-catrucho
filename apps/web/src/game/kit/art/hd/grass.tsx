// Zacate cerca de la cámara: matas, zacate seco y florcitas sobre el piso de zacate de la escena. Al montar la
// escena se toma una foto cenital (una vez) con la altura de la superficie de arriba y si es zacate; las matas viven
// en una rejilla que sigue a la cámara, leen esa foto en el vértice y se encogen hasta desaparecer de lejos.
// Media y alta: una llamada de dibujo, sin sombra propia. Baja: nada.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { phys } from '../../../../core/phys';
import { CELL, cellRect, floraAtlas } from './flora';
import { G } from './materials';
import { layerIndex, layerTextures, texCalidad } from './tex';

const N = 512;
interface Cover {
  hm: THREE.DataTexture;
  col: THREE.DataTexture;
  box: THREE.Vector4;
}

// --- foto cenital: altura (16 bits en RG) + ¿zacate? (B); y en otra pasada el color del piso
const CAP_V = /* glsl */ `
varying float vY;
void main() {
  vec4 p = vec4( position, 1.0 );
  #ifdef USE_INSTANCING
    p = instanceMatrix * p;
  #endif
  vec4 w = modelMatrix * p;
  vY = w.y;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const CAP_F = /* glsl */ `
uniform float uGrass; uniform vec3 uCol; uniform float uMode;
varying float vY;
void main() {
  if ( uMode > 0.5 ) { gl_FragColor = vec4( uCol, 1.0 ); return; }
  float t = floor( clamp( ( vY + 40.0 ) / 128.0, 0.0, 1.0 ) * 65535.0 );
  gl_FragColor = vec4( floor( t / 256.0 ) / 255.0, mod( t, 256.0 ) / 255.0, uGrass, 1.0 );
}`;
/** rectángulo [x0, x1, z0, z1] del piso */
export type Rect = [number, number, number, number];
function capture(gl: THREE.WebGLRenderer, scene: THREE.Scene, area?: Rect, holes?: Rect[]): Cover | null {
  const lim = phys.limit;
  if (!lim && !area) return null;
  const [x0, x1, z0, z1] =
      area ??
      (!lim ? [0, 0, 0, 0] : 'r' in lim ? [-lim.r, lim.r, -lim.r, lim.r] : [lim.minX, lim.maxX, lim.minZ, lim.maxZ]),
    L = Math.min(340, Math.max(x1 - x0, z1 - z0) + 24),
    cx = (x0 + x1) / 2,
    cz = (z0 + z1) / 2;
  const cam = new THREE.OrthographicCamera(-L / 2, L / 2, L / 2, -L / 2, 1, 260);
  cam.position.set(cx, 140, cz);
  cam.up.set(0, 0, -1);
  cam.lookAt(cx, 0, cz);
  cam.updateMatrixWorld();
  const mats = new Map<string, THREE.ShaderMaterial>(),
    capMat = (grass: boolean, color: THREE.Color | null) => {
      const key = `${grass}|${color?.getHexString() ?? ''}`;
      let m = mats.get(key);
      if (!m) {
        m = new THREE.ShaderMaterial({
          vertexShader: CAP_V,
          fragmentShader: CAP_F,
          uniforms: {
            uGrass: { value: grass ? 1 : 0 },
            uCol: { value: color ?? new THREE.Color(0, 0, 0) },
            uMode: { value: 0 },
          },
        });
        mats.set(key, m);
      }
      return m;
    };
  // qué se dibuja y con qué: las plantas, el cielo, rótulos, partículas y personajes no tapan el zacate
  const saved: [THREE.Object3D, THREE.Material | THREE.Material[] | null, boolean][] = [];
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!(o as THREE.Mesh).isMesh || !m) {
      if ((o as THREE.Sprite).isSprite || (o as THREE.Points).isPoints || (o as THREE.Line).isLine) {
        saved.push([o, null, o.visible]);
        o.visible = false;
      }
      return;
    }
    const mesh = o as THREE.Mesh,
      mm = Array.isArray(m) ? m[0] : m,
      skip =
        (mesh as THREE.SkinnedMesh).isSkinnedMesh ||
        mm.name === 'hd:flora' ||
        mm.name === 'hd:grasscover' ||
        (mm as THREE.ShaderMaterial).isShaderMaterial ||
        !mm.depthWrite ||
        (mm.transparent && mm.name !== 'hd:water');
    saved.push([o, mesh.material as THREE.Material, o.visible]);
    if (skip) o.visible = false;
    else {
      const grass = mm.name === 'hd:grass';
      mesh.material = capMat(grass, grass ? ((mm as THREE.MeshStandardMaterial).color ?? null) : null);
    }
  });
  const rt = new THREE.WebGLRenderTarget(N, N, { depthBuffer: true }),
    bg = scene.background,
    fog = scene.fog,
    prevRT = gl.getRenderTarget(),
    prevClear = gl.getClearColor(new THREE.Color()),
    prevAlpha = gl.getClearAlpha(),
    prevAuto = gl.autoClear,
    hBuf = new Uint8Array(N * N * 4),
    cBuf = new Uint8Array(N * N * 4);
  scene.background = null;
  scene.fog = null;
  gl.autoClear = true;
  gl.setClearColor(0x000000, 0);
  try {
    gl.setRenderTarget(rt);
    gl.render(scene, cam);
    gl.readRenderTargetPixels(rt, 0, 0, N, N, hBuf);
    for (const m of mats.values()) m.uniforms.uMode.value = 1;
    gl.render(scene, cam);
    gl.readRenderTargetPixels(rt, 0, 0, N, N, cBuf);
  } finally {
    gl.setRenderTarget(prevRT);
    gl.setClearColor(prevClear, prevAlpha);
    gl.autoClear = prevAuto;
    scene.background = bg;
    scene.fog = fog;
    for (const [o, m, v] of saved) {
      if (m) (o as THREE.Mesh).material = m;
      o.visible = v;
    }
    rt.dispose();
    for (const m of mats.values()) m.dispose();
  }
  // decodifica: altura y bandera; quita lo muy empinado y los bordes (medio metro) de lo que no es zacate
  const hm = new Float32Array(N * N * 2),
    ok = new Uint8Array(N * N),
    px = L / N;
  for (let i = 0; i < N * N; i++) {
    const a = hBuf[i * 4 + 3];
    hm[i * 2] = a ? ((hBuf[i * 4] * 256 + hBuf[i * 4 + 1]) / 65535) * 128 - 40 : -100;
    ok[i] = a && hBuf[i * 4 + 2] > 128 ? 1 : 0;
  }
  // huecos: donde se juega no crece zacate (texel (i, j): x = bx + i·px, z = bz − j·px)
  if (holes?.length) {
    const bx = cx - L / 2,
      bz = cz + L / 2;
    for (const [h0, h1, k0, k1] of holes)
      for (let j = Math.max(0, Math.floor((bz - k1) / px)); j <= Math.min(N - 1, Math.ceil((bz - k0) / px)); j++)
        for (let i = Math.max(0, Math.floor((h0 - bx) / px)); i <= Math.min(N - 1, Math.ceil((h1 - bx) / px)); i++)
          ok[j * N + i] = 0;
  }
  const rad = Math.max(1, Math.round(0.45 / px));
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const k = j * N + i;
      if (!ok[k]) continue;
      const h = hm[k * 2];
      let keep = 1;
      for (let dj = -rad; dj <= rad && keep; dj += rad)
        for (let di = -rad; di <= rad && keep; di += rad) {
          const ii = Math.min(N - 1, Math.max(0, i + di)),
            jj = Math.min(N - 1, Math.max(0, j + dj)),
            q = jj * N + ii;
          if (!ok[q] && hBuf[q * 4 + 3]) keep = 0;
          else if (Math.abs(hm[q * 2] - h) > rad * px * 1.1) keep = 0;
        }
      hm[k * 2 + 1] = keep;
    }
  const t = new THREE.DataTexture(hm, N, N, THREE.RGFormat, THREE.FloatType);
  t.needsUpdate = true;
  const c = new THREE.DataTexture(cBuf, N, N, THREE.RGBAFormat);
  c.minFilter = c.magFilter = THREE.LinearFilter;
  c.needsUpdate = true;
  // texel (i, j): x = x0 + i·px, z = z1 − j·px (la foto mira hacia abajo con −Z arriba)
  return { hm: t, col: c, box: new THREE.Vector4(cx - L / 2, cz + L / 2, L, 0) };
}

const V_PARS = /* glsl */ `
uniform sampler2D uHM; uniform sampler2D uGC; uniform vec4 uBox; uniform vec2 uCenter; uniform float uR, uSp, uTime;
uniform sampler2DArray tAlbG;
attribute vec2 aOff;
varying vec4 vCell; varying vec2 vTile; varying vec3 vGround;
`;
const V_MAIN = /* glsl */ `
{
  vec2 cell = uCenter + aOff;
  vec2 h2 = fract( sin( vec2( dot( cell, vec2( 12.9898, 78.233 ) ), dot( cell, vec2( 39.3468, 11.135 ) ) ) ) * 43758.5453 );
  float h3 = fract( sin( dot( cell, vec2( 26.651, 9.173 ) ) ) * 24634.6345 );
  vec2 wp = cell + ( h2 - 0.5 ) * uSp * 0.95;
  vec2 tuv = vec2( ( wp.x - uBox.x ) / uBox.z, ( uBox.y - wp.y ) / uBox.z );
  vec4 hm = textureLod( uHM, tuv, 0.0 );
  float inside = step( 0.0, tuv.x ) * step( tuv.x, 1.0 ) * step( 0.0, tuv.y ) * step( tuv.y, 1.0 );
  // las mismas manchas secas y húmedas del zacate del suelo: donde es húmedo hay más matas
  float macro = textureLod( tAlbG, vec3( wp * 0.025 + hm.r * 0.013, ${layerIndex('macro')}.0 ), 0.0 ).r;
  float macro2 = textureLod( tAlbG, vec3( wp * 0.0063 + vec2( 0.5, 0.25 ), ${layerIndex('macro')}.0 ), 0.0 ).r;
  float mv = macro * 0.6 + macro2 * 0.4;
  float dry = smoothstep( 0.56, 0.22, mv ), lush = smoothstep( 0.5, 0.8, mv );
  float dens = 0.4 + 0.45 * lush - 0.2 * dry;
  float d = distance( wp, cameraPosition.xz );
  float fade = 1.0 - smoothstep( uR * 0.3, uR, d );
  float kind = fract( h2.x * 7.31 + h2.y * 3.7 );
  float sc = fade * inside * step( 0.5, hm.g ) * step( h3, dens ) * ( 0.55 + h2.y * 0.75 ) * ( kind < 0.12 ? 0.85 : 1.0 );
  float a = h2.x * 6.2831;
  transformed.xz = mat2( cos( a ), -sin( a ), sin( a ), cos( a ) ) * transformed.xz;
  float tip = position.y;
  #ifdef GC_WIND
    float ph = wp.x * 0.35 + wp.y * 0.27;
    float sw = sin( uTime * 1.9 + ph ) * 0.7 + sin( uTime * 3.3 + ph * 1.7 ) * 0.3;
    transformed.xz += vec2( 0.8, 0.5 ) * sw * tip * tip * 0.3;
  #endif
  transformed *= sc;
  transformed += vec3( wp.x, hm.r - 0.03, wp.y );
  // celda: casi todo zacate; algunas matas con florcitas y otras de zacate seco
  vec4 cG = vec4( ${cellRect(CELL.grass).join(', ')} );
  vec4 cF = vec4( ${cellRect(CELL.flowers).join(', ')} );
  vec4 cD = vec4( ${cellRect(CELL.dry).join(', ')} );
  vCell = kind < 0.05 ? cF : kind < 0.05 + 0.2 * dry ? cD : cG;
  vTile = uv;
  // color del piso de abajo con sus manchas; de lejos la mata se funde con el piso
  vec3 gc = textureLod( uGC, tuv, 0.0 ).rgb;
  gc *= ( 1.0 + 0.5 * ( mv - 0.45 ) * 1.6 ) * mix( vec3( 1.0 ), vec3( 1.3, 1.1, 0.55 ), dry * 0.75 ) * mix( vec3( 1.0 ), vec3( 0.74, 0.92, 0.78 ), lush * 0.6 );
  vGround = gc;
}
`;
const F_PARS = 'varying vec4 vCell; varying vec2 vTile; varying vec3 vGround;';
const F_MAP = /* glsl */ `
{
  vec2 cs = abs( vCell.zw ), cuv = vCell.xy + fract( vTile ) * cs;
  vec2 gx = dFdx( vTile ) * cs, gy = dFdy( vTile ) * cs;
  vec4 fc = textureGrad( map, cuv, gx, gy );
  vec2 px = gx * GC_SZ, py = gy * GC_SZ;
  float lod = 0.5 * log2( max( max( dot( px, px ), dot( py, py ) ), 1.0 ) );
  fc.a = min( 1.0, fc.a * ( 1.0 + lod * 0.4 ) );
  // color del piso con el detalle (luz y sombra entre hojas) del atlas; las flores conservan su color
  float green = clamp( ( fc.g - max( fc.r, fc.b ) ) * 8.0, 0.0, 1.0 );
  float lum = dot( fc.rgb, vec3( 0.3, 0.59, 0.11 ) );
  fc.rgb = mix( fc.rgb, vGround * clamp( lum / 0.15, 0.3, 1.35 ) * 0.62, green );
  diffuseColor *= fc;
}
`;
function tuftGeometry(sp: number, R: number) {
  // tres tarjetas cruzadas de 0.6 × 0.4 m; color por vértice: oscuro al pie (oclusión entre las hojas)
  const pos: number[] = [],
    uv: number[] = [],
    col: number[] = [],
    nor: number[] = [],
    idx: number[] = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI,
      cx = Math.cos(a) * 0.3,
      cz = Math.sin(a) * 0.36,
      o = pos.length / 3;
    for (const [s, h] of [
      [-1, 0],
      [1, 0],
      [1, 1],
      [-1, 1],
    ]) {
      pos.push(cx * s, h * 0.4, cz * s);
      uv.push(0.004 + (s + 1) * 0.496, 0.004 + h * 0.992);
      const g = 0.5 + h * 0.6;
      col.push(g, g, g);
      nor.push(0, 1, 0);
    }
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const off: number[] = [],
    n = Math.ceil(R / sp);
  const pts: [number, number][] = [];
  for (let j = -n; j <= n; j++)
    for (let i = -n; i <= n; i++) if (Math.hypot(i, j) * sp <= R + sp) pts.push([i * sp, j * sp]);
  // de lejos hacia cerca: la cámara siempre está en el centro, así las matas se tapan bien sin escribir profundidad
  pts.sort((a, b) => Math.hypot(b[0], b[1]) - Math.hypot(a[0], a[1]));
  for (const p of pts) off.push(p[0], p[1]);
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(new Float32Array(off), 2));
  g.instanceCount = off.length / 2;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}

/** Zacate cerca de la cámara (media y alta). `area` es el piso que se fotografía (si falta, el límite del jugador);
 *  en los `holes` no crece. */
export function GroundCover({ area, holes }: { area?: Rect; holes?: Rect[] } = {}) {
  const q = texCalidad(),
    { gl, scene } = useThree(),
    [cover, setCover] = useState<Cover | null>(null);
  const R = q === 'alta' ? 26 : 17,
    sp = q === 'alta' ? 0.5 : 0.62;
  useEffect(() => {
    if (q === 'baja') return;
    let a = 0,
      made: Cover | null = null;
    // dos cuadros después de montar: ya están todas las piezas de la escena
    a = requestAnimationFrame(() => {
      a = requestAnimationFrame(() => {
        a = requestAnimationFrame(() => {
          made = capture(gl, scene, area, holes);
          // para pruebas: cuánto del piso quedó con zacate
          const mc = (window as unknown as { __mc?: Record<string, unknown> }).__mc;
          if (mc && made) {
            const d = made.hm.image.data as Float32Array;
            let n = 0;
            const cd = made.col.image.data as Uint8Array,
              c = [0, 0, 0];
            for (let i = 1; i < d.length; i += 2)
              if (d[i]) {
                n++;
                for (let k = 0; k < 3; k++) c[k] += cd[(i >> 1) * 4 + k];
              }
            mc.zacate = {
              matas: n,
              de: d.length / 2,
              lado: made.box.z,
              color: c.map((v) => Math.round(v / Math.max(1, n))),
            };
          }
          setCover(made);
        });
      });
    });
    return () => {
      cancelAnimationFrame(a);
      made?.hm.dispose();
      made?.col.dispose();
    };
  }, [gl, scene, q]);
  const stuff = useMemo(() => {
    if (!cover) return null;
    const geo = tuftGeometry(sp, R),
      u = {
        uHM: { value: cover.hm },
        uGC: { value: cover.col },
        uBox: { value: cover.box },
        uCenter: { value: new THREE.Vector2() },
        uR: { value: R },
        uSp: { value: sp },
        uTime: G.uTime,
        tAlbG: { value: layerTextures().alb },
      };
    const atlas = floraAtlas(),
      mat = new THREE.MeshStandardMaterial({
        map: atlas,
        vertexColors: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        roughness: 0.9,
        // sin profundidad: la oclusión del posproceso (que sale de la profundidad) no las oscurece; se dibujan
        // después de lo opaco (renderOrder) para quedar bien contra el resto de la escena
        depthWrite: false,
      });
    mat.name = 'hd:grasscover';
    mat.defines = { GC_WIND: '' };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>\n${V_PARS}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n${V_MAIN}`);
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\n${F_PARS}\n#define GC_SZ vec2( ${atlas.image.width}.0, ${atlas.image.height}.0 )`,
        )
        .replace('#include <map_fragment>', F_MAP)
        .replace(
          '#include <normal_fragment_begin>',
          '#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\n  normal *= faceDirection;\n#endif',
        );
    };
    mat.customProgramCacheKey = () => 'grasscover';
    return { geo, mat, u };
  }, [cover, R, sp]);
  useEffect(
    () => () => {
      stuff?.geo.dispose();
      stuff?.mat.dispose();
    },
    [stuff],
  );
  useFrame(({ camera }) => {
    if (!stuff) return;
    stuff.u.uCenter.value.set(Math.round(camera.position.x / sp) * sp, Math.round(camera.position.z / sp) * sp);
  });
  if (!stuff) return null;
  return <mesh geometry={stuff.geo} material={stuff.mat} receiveShadow frustumCulled={false} renderOrder={5} />;
}
