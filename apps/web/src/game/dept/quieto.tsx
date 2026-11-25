// Matrices congeladas para lo que no se mueve (MC-56). three.js recalcula cada cuadro la matriz local y la del mundo
// de cada objeto con `matrixAutoUpdate`; en la calle de Tegucigalpa son cientos de mallas, rótulos y grupos quietos.
// `Quieto` las calcula una vez al montar y apaga ese recálculo. Solo para contenido que nunca cambia de lugar: lo que se
// anima (banderas, vehículos, gente) va fuera, porque dentro se quedaría quieto.
import { type ReactNode, useLayoutEffect, useRef } from 'react';
import type { Group, Object3D } from 'three';

/** Congela `raiz` y todo lo que cuelga de ella (tras un cambio, llamala otra vez). */
export function congelar(raiz: Object3D) {
  raiz.traverse((o) => {
    o.matrixAutoUpdate = true;
  });
  raiz.updateMatrixWorld(true);
  raiz.traverse((o) => {
    o.matrixAutoUpdate = false;
  });
}

/** Grupo cuyo contenido no se mueve: se congela después de cada render suyo. */
export function Quieto({ children }: { children: ReactNode }) {
  const ref = useRef<Group>(null);
  useLayoutEffect(() => {
    if (ref.current) congelar(ref.current);
  });
  return <group ref={ref}>{children}</group>;
}
