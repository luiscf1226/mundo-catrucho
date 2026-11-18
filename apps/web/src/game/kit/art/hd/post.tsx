// Posproceso del paquete HD, propio y sin dependencias (solo en calidad media y alta; baja dibuja directo como antes).
//  1. La escena se dibuja una sola vez en un objetivo con MSAA y textura de profundidad. El objetivo se marca como si
//     fuera la pantalla (tono, sRGB y niebla iguales): la imagen base es la misma que sin posproceso.
//  2. Oclusión ambiental desde la profundidad (estilo SAO, a media resolución, sin pasada de normales: no suma
//     llamadas de dibujo de la escena) con desenfoque que respeta bordes. Asienta objetos y gente en el suelo.
//  3. Resplandor (bloom) solo en lo muy brillante: sol, neones y luces de noche. Cadena de mips pequeña.
//  4. Compuesto final: oclusión, resplandor, viñeta ligera y tramado contra bandas.
// Cuesta unas 14 llamadas de dibujo de pantalla completa. Las cuenta `gl.info` como el resto.

import { useFrame, useThree } from '@react-three/fiber';
import { type ReactNode, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGame } from '../../../../core/store';
import { calidadEfectiva } from '../../../quality';
import { G } from './materials';

const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';
const IGN = 'float ign( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }';

// --- oclusión: salida r = visibilidad (1 = sin oclusión), g = distancia a la cámara (para los bordes)
const AO_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tDepth; uniform vec2 uProjK, uTexel; uniform float uNear, uFar, uRadius, uIntensity, uProjScale, uFade, uThick;
varying vec2 vUv;
${IGN}
float vz( vec2 uv ) { return perspectiveDepthToViewZ( texture2D( tDepth, uv ).x, uNear, uFar ); }
vec3 vpos( vec2 uv, float z ) { return vec3( ( uv * 2.0 - 1.0 ) * uProjK * -z, z ); }
void main() {
  float d = texture2D( tDepth, vUv ).x;
  if ( d >= 0.99999 ) { gl_FragColor = vec4( 1.0, 1e4, 0.0, 1.0 ); return; }
  float z = perspectiveDepthToViewZ( d, uNear, uFar );
  vec3 p = vpos( vUv, z );
  // normal desde los vecinos: del lado con menos salto de profundidad (no se dobla en los bordes)
  vec2 dx = vec2( uTexel.x, 0.0 ), dy = vec2( 0.0, uTexel.y );
  vec3 pr = vpos( vUv + dx, vz( vUv + dx ) ), pl = vpos( vUv - dx, vz( vUv - dx ) );
  vec3 pu = vpos( vUv + dy, vz( vUv + dy ) ), pd = vpos( vUv - dy, vz( vUv - dy ) );
  vec3 ddx = abs( pr.z - p.z ) < abs( p.z - pl.z ) ? pr - p : p - pl;
  vec3 ddy = abs( pu.z - p.z ) < abs( p.z - pd.z ) ? pu - p : p - pd;
  vec3 n = normalize( cross( ddx, ddy ) );
  if ( dot( n, p ) > 0.0 ) n = -n;
  // radio que se achica de cerca: con 1,5 m fijo, en primer plano el cuello, las axilas y los
  // tapiales se veían negros; de lejos sigue asentando casas y postes
  float rad = uRadius * clamp( -z / 8.0, 0.15, 1.0 );
  float ssR = min( uProjScale * rad / -z, 90.0 );
  float r2 = rad * rad, j = ign( gl_FragCoord.xy ), ang = j * 6.2832, occ = 0.0, bias = 0.004 - 0.002 * z;
  for ( int i = 0; i < AO_N; i++ ) {
    // espiral con ángulo áureo; el giro y el radio cambian por píxel y el desenfoque junta el resultado
    float a = ( float( i ) + fract( j * 7.31 + float( i ) * 0.618 ) ) / float( AO_N ), th = float( i ) * 2.39996 + ang;
    vec2 suv = vUv + vec2( cos( th ), sin( th ) ) * max( a * ssR, 1.5 ) * uTexel;
    vec3 v = vpos( suv, vz( suv ) ) - p;
    float vv = dot( v, v ), vn = dot( v, n ), f = max( r2 - vv, 0.0 );
    // grosor: lo que queda mucho más cerca de la cámara (un poste, el canto de un tapial delante de una pared) no es
    // un bloque macizo; sin esto la profundidad se lee como un muro y deja halos negros grandes detrás
    float th_k = 1.0 - smoothstep( uThick * 0.4, uThick, v.z );
    occ += f * f * f * max( ( vn - bias ) / ( vv + 0.01 ), 0.0 ) * th_k;
  }
  // curva exponencial con piso: en esquinas cóncavas (pared con tapial, alero) la luz del cielo no se apaga del todo;
  // antes la resta lineal llegaba a 0 y dejaba franjas negras de un metro
  float ao = max( exp( -occ * uIntensity / ( r2 * r2 * r2 ) * 5.0 / float( AO_N ) ), 0.38 );
  ao = mix( ao, 1.0, smoothstep( uFade * 0.6, uFade, -z ) );
  gl_FragColor = vec4( ao, -z, 0.0, 1.0 );
}
`;
// desenfoque separable que no mezcla entre profundidades distintas
const BLUR_FRAG = /* glsl */ `
uniform sampler2D tAO; uniform vec2 uDir; varying vec2 vUv;
void main() {
  vec4 c = texture2D( tAO, vUv );
  float s = c.r * 0.2, w = 0.2;
  for ( int i = 1; i <= 3; i++ ) {
    float g = 0.2 - float( i ) * 0.045;
    vec4 a = texture2D( tAO, vUv + uDir * float( i ) ), b = texture2D( tAO, vUv - uDir * float( i ) );
    float wa = g * max( 0.0, 1.0 - abs( a.g - c.g ) / ( c.g * 0.08 + 0.1 ) ), wb = g * max( 0.0, 1.0 - abs( b.g - c.g ) / ( c.g * 0.08 + 0.1 ) );
    s += a.r * wa + b.r * wb; w += wa + wb;
  }
  gl_FragColor = vec4( s / w, c.g, 0.0, 1.0 );
}
`;
// --- resplandor: umbral suave (la imagen ya está en espacio de pantalla, así que el umbral va alto)
const PRE_FRAG = /* glsl */ `
uniform sampler2D tColor; uniform vec2 uTexel; uniform float uThr, uKnee; varying vec2 vUv;
vec3 f( vec2 uv ) {
  vec3 c = texture2D( tColor, uv ).rgb; float l = max( c.r, max( c.g, c.b ) );
  float s = clamp( l - uThr + uKnee, 0.0, 2.0 * uKnee ); s = s * s / ( 4.0 * uKnee + 1e-4 );
  return c * max( s, l - uThr ) / max( l, 1e-4 );
}
void main() {
  vec2 o = uTexel * 0.5;
  gl_FragColor = vec4( 0.25 * ( f( vUv + vec2( -o.x, -o.y ) ) + f( vUv + vec2( o.x, -o.y ) ) + f( vUv + vec2( -o.x, o.y ) ) + f( vUv + o ) ), 1.0 );
}
`;
const DOWN_FRAG = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
void main() {
  vec2 o = uTexel * 0.5;
  vec3 s = texture2D( tSrc, vUv ).rgb * 4.0 + texture2D( tSrc, vUv - o ).rgb + texture2D( tSrc, vUv + o ).rgb
    + texture2D( tSrc, vUv + vec2( o.x, -o.y ) ).rgb + texture2D( tSrc, vUv + vec2( -o.x, o.y ) ).rgb;
  gl_FragColor = vec4( s / 8.0, 1.0 );
}
`;
const UP_FRAG = /* glsl */ `
uniform sampler2D tSrc, tAdd; uniform vec2 uTexel; varying vec2 vUv;
void main() {
  vec2 o = uTexel * 0.5;
  vec3 s = texture2D( tSrc, vUv + vec2( -o.x * 2.0, 0.0 ) ).rgb + texture2D( tSrc, vUv + vec2( o.x * 2.0, 0.0 ) ).rgb
    + texture2D( tSrc, vUv + vec2( 0.0, -o.y * 2.0 ) ).rgb + texture2D( tSrc, vUv + vec2( 0.0, o.y * 2.0 ) ).rgb
    + ( texture2D( tSrc, vUv + vec2( -o.x, o.y ) ).rgb + texture2D( tSrc, vUv + o ).rgb
      + texture2D( tSrc, vUv + vec2( o.x, -o.y ) ).rgb + texture2D( tSrc, vUv - o ).rgb ) * 2.0;
  gl_FragColor = vec4( s / 12.0 + texture2D( tAdd, vUv ).rgb, 1.0 );
}
`;
const COMP_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tColor, tDepth, tAO, tBloom; uniform vec2 uAOTexel; uniform float uNear, uFar, uAOK, uBloomK, uVig, uAspect;
varying vec2 vUv;
${IGN}
void main() {
  vec3 c = texture2D( tColor, vUv ).rgb;
  #ifdef USE_AO
  {
    // subida de media resolución que toma los vecinos con la misma profundidad (sin halos en las siluetas)
    float z = -perspectiveDepthToViewZ( texture2D( tDepth, vUv ).x, uNear, uFar );
    vec2 b = ( floor( vUv / uAOTexel - 0.5 ) + 0.5 ) * uAOTexel;
    float s = 0.0, w = 0.0;
    for ( int i = 0; i < 4; i++ ) {
      vec2 q = b + vec2( float( i - ( i / 2 ) * 2 ), float( i / 2 ) ) * uAOTexel;
      vec4 a = texture2D( tAO, q );
      vec2 k = 1.0 - abs( vUv - q ) / uAOTexel;
      float ww = k.x * k.y * max( 0.0, 1.0 - abs( a.g - z ) / ( z * 0.04 + 0.04 ) );
      s += a.r * ww; w += ww;
    }
    // si ningún vecino es de la misma superficie (cosas finas y lejanas), sin oclusión
    float ao = ( s + 0.02 ) / ( w + 0.02 );
    c *= mix( 1.0, ao, uAOK );
    #ifdef VER_AO
      c = vec3( ao );
    #endif
  }
  #endif
  #ifdef USE_BLOOM
    vec3 bl = texture2D( tBloom, vUv ).rgb * uBloomK;
    c = 1.0 - ( 1.0 - c ) * ( 1.0 - min( bl, 1.0 ) );
  #endif
  vec2 q = ( vUv - 0.5 ) * vec2( uAspect, 1.0 );
  c *= 1.0 - uVig * smoothstep( 0.45, 1.15, length( q ) );
  c += ( ign( gl_FragCoord.xy ) - 0.5 ) / 255.0;
  gl_FragColor = vec4( c, 1.0 );
}
`;

type Nivel = 'media' | 'alta';
const rt = (type: THREE.TextureDataType = THREE.HalfFloatType) =>
  new THREE.WebGLRenderTarget(1, 1, {
    type,
    depthBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
  });
const pass = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, defines: Record<string, string> = {}) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader,
    uniforms,
    defines,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });

function crear(nivel: Nivel) {
  const alta = nivel === 'alta';
  // la escena: MSAA + profundidad. «Como XR» hace que three le ponga tono, sRGB y niebla igual que a la pantalla.
  const escena = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: 4,
    depthBuffer: true,
    depthTexture: new THREE.DepthTexture(1, 1),
  });
  escena.texture.colorSpace = THREE.SRGBColorSpace;
  (escena as THREE.WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;
  const depth = escena.depthTexture as THREE.DepthTexture;
  const aoA = rt(),
    aoB = rt();
  const ao = pass(
    AO_FRAG,
    {
      tDepth: { value: depth },
      uProjK: { value: new THREE.Vector2() },
      uTexel: { value: new THREE.Vector2() },
      uNear: { value: 0.1 },
      uFar: { value: 700 },
      uRadius: { value: 1.1 },
      uIntensity: { value: alta ? 2.1 : 1.8 },
      uThick: { value: 0.8 },
      uProjScale: { value: 500 },
      uFade: { value: 55 },
    },
    { AO_N: alta ? '14' : '8' },
  );
  const blur = pass(BLUR_FRAG, { tAO: { value: null }, uDir: { value: new THREE.Vector2() } });
  // resplandor: media resolución y cuatro niveles más
  const pre = rt(),
    down = [rt(), rt(), rt(), rt()],
    up = [rt(), rt(), rt(), rt()];
  const preM = pass(PRE_FRAG, {
    tColor: { value: escena.texture },
    uTexel: { value: new THREE.Vector2() },
    uThr: { value: 0.9 },
    uKnee: { value: 0.08 },
  });
  const downM = pass(DOWN_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
  const upM = pass(UP_FRAG, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() } });
  const comp = pass(
    COMP_FRAG,
    {
      tColor: { value: escena.texture },
      tDepth: { value: depth },
      tAO: { value: aoA.texture },
      tBloom: { value: up[3].texture },
      uAOTexel: { value: new THREE.Vector2() },
      uNear: { value: 0.1 },
      uFar: { value: 700 },
      uAOK: { value: alta ? 1 : 0.85 },
      uBloomK: { value: 0.5 },
      uVig: { value: 0.22 },
      uAspect: { value: 1 },
    },
    // #ver-ao en la dirección muestra solo la oclusión (para ajustar)
    { USE_AO: '', USE_BLOOM: '', ...(location.hash.includes('ver-ao') ? { VER_AO: '' } : {}) },
  );
  const quad = new THREE.Mesh(new THREE.BufferGeometry(), comp);
  // un solo triángulo que tapa la pantalla
  quad.geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  quad.geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  quad.frustumCulled = false;
  const plano = new THREE.Scene();
  plano.add(quad);
  return {
    escena,
    aoA,
    aoB,
    ao,
    blur,
    pre,
    down,
    up,
    preM,
    downM,
    upM,
    comp,
    quad,
    plano,
    cam: new THREE.OrthographicCamera(),
    size: new THREE.Vector2(),
    w: 0,
    h: 0,
    /** llamadas de dibujo del posproceso en el último cuadro (las pruebas las leen en __mc.postPasadas) */
    pasadas: 0,
    dispose() {
      for (const r of [escena, aoA, aoB, pre, ...down, ...up]) r.dispose();
      depth.dispose();
      for (const m of [ao, blur, preM, downM, upM, comp]) m.dispose();
      quad.geometry.dispose();
    },
  };
}

function Post({ nivel }: { nivel: Nivel }) {
  const gl = useThree((s) => s.gl);
  const P = useMemo(() => crear(nivel), [nivel]);
  useEffect(() => {
    const prev = gl.info.autoReset,
      mc = (window as Window & { __mc?: { post?: Nivel; postPasadas?: () => number } }).__mc;
    gl.info.autoReset = false;
    // para las pruebas: qué posproceso está activo y cuántas llamadas suma
    if (mc) {
      mc.post = nivel;
      mc.postPasadas = () => P.pasadas;
    }
    return () => {
      gl.info.autoReset = prev;
      if (mc) mc.post = mc.postPasadas = undefined;
      P.dispose();
    };
  }, [gl, P, nivel]);

  useFrame((st) => {
    const cam = st.camera as THREE.PerspectiveCamera;
    gl.info.reset();
    gl.getDrawingBufferSize(P.size);
    const W = Math.max(1, P.size.x),
      H = Math.max(1, P.size.y);
    if (W !== P.w || H !== P.h) {
      P.w = W;
      P.h = H;
      P.escena.setSize(W, H);
      const hw = Math.ceil(W / 2),
        hh = Math.ceil(H / 2);
      P.aoA.setSize(hw, hh);
      P.aoB.setSize(hw, hh);
      P.pre.setSize(hw, hh);
      P.down.forEach((r, i) => r.setSize(Math.max(1, hw >> (i + 1)), Math.max(1, hh >> (i + 1))));
      P.up.forEach((r, i) => r.setSize(Math.max(1, hw >> (3 - i)), Math.max(1, hh >> (3 - i))));
    }
    const prevRT = gl.getRenderTarget();
    // 1. la escena
    gl.setRenderTarget(P.escena);
    gl.render(st.scene, cam);
    const c0 = gl.info.render.calls;
    const draw = (m: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
      P.quad.material = m;
      gl.setRenderTarget(target);
      gl.render(P.plano, P.cam);
    };
    const near = cam.near,
      far = cam.far;
    // 2. oclusión
    const a = P.ao.uniforms;
    a.uProjK.value.set(1 / cam.projectionMatrix.elements[0], 1 / cam.projectionMatrix.elements[5]);
    a.uTexel.value.set(1 / W, 1 / H);
    a.uNear.value = near;
    a.uFar.value = far;
    a.uProjScale.value = 0.5 * H * cam.projectionMatrix.elements[5];
    draw(P.ao, P.aoA);
    const b = P.blur.uniforms;
    b.tAO.value = P.aoA.texture;
    b.uDir.value.set(1 / P.aoA.width, 0);
    draw(P.blur, P.aoB);
    b.tAO.value = P.aoB.texture;
    b.uDir.value.set(0, 1 / P.aoA.height);
    draw(P.blur, P.aoA);
    // 3. resplandor: de noche el umbral baja (faroles, ventanas, neones) y de día solo el sol y lo blanquísimo
    const noche = G.uNight.value;
    P.preM.uniforms.uTexel.value.set(1 / W, 1 / H);
    P.preM.uniforms.uThr.value = 0.93 - 0.2 * noche;
    draw(P.preM, P.pre);
    let src = P.pre;
    for (const r of P.down) {
      P.downM.uniforms.tSrc.value = src.texture;
      P.downM.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      draw(P.downM, r);
      src = r;
    }
    for (let i = 0; i < P.up.length; i++) {
      P.upM.uniforms.tSrc.value = src.texture;
      P.upM.uniforms.tAdd.value = (i < 3 ? P.down[2 - i] : P.pre).texture;
      P.upM.uniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      draw(P.upM, P.up[i]);
      src = P.up[i];
    }
    // 4. compuesto a la pantalla
    const c = P.comp.uniforms;
    c.uAOTexel.value.set(1 / P.aoA.width, 1 / P.aoA.height);
    c.uNear.value = near;
    c.uFar.value = far;
    c.uAspect.value = W / H;
    c.uBloomK.value = 0.35 + 0.35 * noche;
    draw(P.comp, prevRT);
    P.pasadas = gl.info.render.calls - c0;
  }, 1);
  return null;
}

/** HalfFloat con MSAA necesita poder dibujar en texturas de coma flotante (WebGL2 de escritorio sí). */
function soportado(gl: THREE.WebGLRenderer) {
  return gl.capabilities.isWebGL2 !== false && gl.extensions.has('EXT_color_buffer_float');
}

export function Effects({ children }: { children?: ReactNode }) {
  const quality = useGame((s) => calidadEfectiva(s.profile.settings)),
    gl = useThree((s) => s.gl);
  // en pruebas (#test) se dibuja directo como en baja, salvo que la prueba pida el posproceso con #post;
  // #sinpost lo apaga (para comparar)
  const hash = typeof location !== 'undefined' ? location.hash : '';
  const activo =
    quality !== 'baja' &&
    (!hash.includes('test') || hash.includes('post')) &&
    !hash.includes('sinpost') &&
    soportado(gl);
  return (
    <>
      {children}
      {activo && <Post key={quality} nivel={quality as Nivel} />}
    </>
  );
}
