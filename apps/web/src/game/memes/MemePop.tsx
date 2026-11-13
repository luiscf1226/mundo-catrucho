// Meme en 3D dentro de cualquier minijuego: cuando el aviso de MemeTicker publica `memeAlAire`, la escenita sale
// pegada a la cámara en la esquina de abajo a la izquierda, entra con resorte, gira despacio, se queda ~5 s y se va.
// Va de hijo de la cámara (a ~1.7 m) para que la escena casi nunca la tape y para no tocar ningún motor.
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type * as THREE from 'three';
import { input } from '../../core/input';
import { memeById } from '../../core/memes';
import { isPaused, mgPlaying, useGame } from '../../core/store';
import { ALTO, ANCHO, Meme3D, ZOCALO } from './Meme3D';

const DIST = 1.7,
  DURA = 5,
  /** fracción del alto de la pantalla que ocupa (en pantalla ancha un poco más, para que el texto se lea) */
  TAM = 0.2,
  TAM_ANCHA = 0.27;

interface Prueba {
  visible: boolean;
  id: string | null;
}

export function MemePop() {
  const camera = useThree((s) => s.camera),
    scene = useThree((s) => s.scene),
    alAire = useGame((s) => s.memeAlAire),
    antes = useRef(alAire?.n ?? 0),
    meme = alAire && alAire.n !== antes.current ? memeById(alAire.id) : undefined,
    g = useRef<THREE.Group>(null),
    a = useRef({ x: 0, v: 0, t: 0, n: -1 }),
    prueba = useRef<Prueba | null>(null);
  // los hijos de la cámara solo se dibujan si la cámara está en la escena
  useLayoutEffect(() => {
    if (camera.parent) return;
    scene.add(camera);
    return () => {
      scene.remove(camera);
    };
  }, [camera, scene]);
  useLayoutEffect(() => {
    g.current?.traverse((o) => {
      o.castShadow = false;
      o.receiveShadow = false;
    });
  }, [meme, alAire?.n]);
  useLayoutEffect(() => {
    if (!location.hash.includes('test')) return;
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    prueba.current = { visible: false, id: null };
    (w.__mcTest ??= {}).memePop = prueba.current;
    return () => {
      if (w.__mcTest?.memePop === prueba.current) delete w.__mcTest.memePop;
    };
  }, []);
  useFrame((_, rawDt) => {
    const o = g.current,
      s = a.current;
    if (!o) return;
    if (meme && alAire && s.n !== alAire.n) Object.assign(s, { n: alAire.n, t: 0 });
    if (!isPaused()) {
      const dt = Math.min(rawDt, 0.05),
        meta = meme && mgPlaying() && s.t < DURA ? 1 : 0;
      s.t += dt;
      s.v += ((meta - s.x) * 140 - s.v * 11) * dt;
      s.x += s.v * dt;
      if (meta === 0 && s.x < 0.02) s.x = s.v = 0;
    }
    o.visible = s.x > 0.01;
    if (prueba.current) {
      prueba.current.visible = o.visible;
      prueba.current.id = o.visible && meme ? meme.id : null;
    }
    if (!o.visible) return;
    const cam = camera as THREE.PerspectiveCamera,
      ancha = (cam.aspect ?? 1) > 1.2,
      vh = 2 * DIST * Math.tan(((cam.fov ?? 60) * Math.PI) / 360),
      vw = vh * (cam.aspect ?? 1),
      k = ((ancha ? TAM_ANCHA : TAM) * vh) / (ZOCALO + ALTO),
      // con controles táctiles la palanca ocupa la esquina: el meme se sube por encima
      abajo = input.touch ? (ancha ? 0.38 : 0.24) : 0.06;
    o.position.set(-vw / 2 + vh * 0.04 + (ANCHO / 2) * k, -vh / 2 + vh * abajo + ZOCALO * k, -DIST);
    o.scale.setScalar(k * s.x);
    o.rotation.set(0.05, 0.15 + Math.sin(s.t * 0.9) * 0.25, 0);
  });
  return createPortal(
    <group ref={g} visible={false}>
      {meme && alAire && <Meme3D key={alAire.n} meme={meme} />}
    </group>,
    camera,
  );
}
