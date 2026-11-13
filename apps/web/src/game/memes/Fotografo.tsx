// Estudio de fotos de los memes 3D: monta el Meme3D pedido en una escena aparte (con sus propias luces y cámara),
// lo dibuja con el mismo renderer en un render target y guarda un JPEG por meme. Una foto a la vez y solo de los
// memes que la interfaz tiene en pantalla (foto.ts). El render target no lleva tono ni sRGB: un pase final los pone.
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { type Meme, memeById } from '../../core/memes';
import { cuantasFotos, descartarPedido, fotoDe, guardarFoto, pedirFoto, siguienteFoto, tiemposFoto } from './foto';
import { cieloDe, Meme3D } from './Meme3D';

const W = 480,
  H = 360,
  /** cuadros que se deja montada la escena antes de la foto (texturas y poses listas) */
  ESPERA = 3;

// ACES filmic (el mismo ajuste que usa three en pantalla) y paso a sRGB
const SALIDA = /* glsl */ `
uniform sampler2D tFoto; varying vec2 vUv;
vec3 rrt( vec3 v ) { vec3 a = v * ( v + 0.0245786 ) - 0.000090537; vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081; return a / b; }
vec3 aces( vec3 c ) {
  const mat3 I = mat3( vec3( 0.59719, 0.07600, 0.02840 ), vec3( 0.35458, 0.90834, 0.13383 ), vec3( 0.04823, 0.01566, 0.83777 ) );
  const mat3 O = mat3( vec3( 1.60475, -0.10208, -0.00327 ), vec3( -0.53108, 1.10813, -0.07276 ), vec3( -0.07367, -0.00605, 1.07602 ) );
  return clamp( O * rrt( I * ( c / 0.6 ) ), 0.0, 1.0 );
}
vec3 srgb( vec3 c ) { return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) ); }
void main() { gl_FragColor = vec4( srgb( aces( texture2D( tFoto, vUv ).rgb ) ), 1.0 ); }
`;

function estudio() {
  const scene = new THREE.Scene(),
    cam = new THREE.PerspectiveCamera(30, W / H, 0.5, 60),
    hdr = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }),
    ldr = new THREE.WebGLRenderTarget(W, H),
    salida = new THREE.ShaderMaterial({
      uniforms: { tFoto: { value: hdr.texture } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
      fragmentShader: SALIDA,
      depthTest: false,
      depthWrite: false,
    }),
    pase = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), salida),
    lienzo = document.createElement('canvas');
  cam.position.set(1.3, 2.0, 11.3);
  cam.lookAt(0, 1.62, 0);
  pase.frustumCulled = false;
  // misma clase de niebla que el SkyRig (lejísimos): así los materiales reutilizan los shaders ya compilados
  scene.fog = new THREE.Fog('#000000', 500, 1000);
  lienzo.width = W;
  lienzo.height = H;
  const c = lienzo.getContext('2d');
  if (!c) throw new Error('Sin lienzo 2D para las fotos de memes');
  return {
    scene,
    cam,
    hdr,
    ldr,
    pase,
    plano: new THREE.OrthographicCamera(),
    lienzo,
    c,
    px: new Uint8Array(W * H * 4),
  };
}

export function FotografoMemes() {
  const gl = useThree((s) => s.gl),
    mundo = useThree((s) => s.scene),
    e = useMemo(estudio, []),
    [meme, setMeme] = useState<Meme>(),
    cuadros = useRef(0);
  useEffect(
    () => () => {
      e.hdr.dispose();
      e.ldr.dispose();
      e.pase.geometry.dispose();
      e.pase.material.dispose();
    },
    [e],
  );
  useEffect(() => {
    if (!location.hash.includes('test')) return;
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    (w.__mcTest ??= {}).fotosMemes = { listas: cuantasFotos, ms: tiemposFoto, pedir: pedirFoto, foto: fotoDe };
  }, []);
  useFrame(() => {
    if (!meme) {
      const id = siguienteFoto(),
        m = id ? memeById(id) : undefined;
      if (m) {
        cuadros.current = 0;
        setMeme(m);
      } else if (id) descartarPedido(id);
      return;
    }
    if (++cuadros.current < ESPERA) return;
    const t0 = performance.now(),
      antes = gl.getRenderTarget();
    e.scene.environment = mundo.environment;
    e.scene.background = new THREE.Color(cieloDe(meme));
    gl.setRenderTarget(e.hdr);
    gl.render(e.scene, e.cam);
    gl.setRenderTarget(e.ldr);
    gl.render(e.pase, e.plano);
    gl.readRenderTargetPixels(e.ldr, 0, 0, W, H, e.px);
    gl.setRenderTarget(antes);
    const img = e.c.createImageData(W, H),
      fila = W * 4;
    for (let y = 0; y < H; y++) img.data.set(e.px.subarray((H - 1 - y) * fila, (H - y) * fila), y * fila);
    e.c.putImageData(img, 0, 0);
    guardarFoto(meme.id, e.lienzo.toDataURL('image/jpeg', 0.88), performance.now() - t0);
    setMeme(undefined);
  });
  if (!meme) return null;
  return createPortal(
    <>
      <hemisphereLight args={['#d4e6ff', '#94896a', 0.9]} />
      <directionalLight
        position={[4, 9, 7]}
        intensity={3}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={5}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />
      <Meme3D key={meme.id} meme={meme} />
    </>,
    e.scene,
  );
}
