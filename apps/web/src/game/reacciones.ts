// Reacciones exageradas del muñeco del jugador (MC-58): celebrar al ganar, la victoria con oro o al subir de nivel
// y el asombro de las locuras. Solo cambian la animación; la física, el control y los resultados quedan igual.
// Las caídas (aplastado y mareo) y el aplastar-y-estirar los pone el arte del avatar (kit/art/exagera.ts).
import { useEffect, useRef } from 'react';
import { player } from '../core/player';
import { isPaused, useGame } from '../core/store';
import type { Anim } from '../core/types';
import { useTick } from './kit/core';

/**
 * El muñeco reacciona `segundos`. Si la escena ya lo tiene haciendo otra cosa (patear, cargar, sentarse), gana la
 * escena; solo se cambia un 'celebrate' de la escena por algo más grande. Con `final` (la partida terminó) solo
 * se respeta estar sentado o manejando: lo demás ya se acabó. Devuelve si reaccionó.
 */
export function reaccionar(anim: Anim, segundos: number, final = false) {
  const o = player.override,
    ocupado = o && performance.now() < o.until && (final ? o.anim === 'sit' || o.anim === 'drive' : o.anim !== 'celebrate');
  if (player.vehicle || ocupado) return false;
  player.play(anim, segundos);
  // se ve de una vez, aunque se abra una ficha y el juego quede en pausa
  player.state.anim = anim;
  if (isPaused()) {
    // al cerrar la ficha sigue un ratito más, para que se alcance a ver
    const off = useGame.subscribe(() => {
      if (isPaused()) return;
      off();
      if (!player.vehicle && (!player.override || player.override.anim === anim)) player.play(anim, 1.4);
    });
  }
  return true;
}

/** Asombro del muñeco al activar una locura de un departamento. */
export const reaccionLocura = () => reaccionar('asombro', 1.8);

/** Escucha la tienda: ganar un minijuego celebra; ganar con oro (tres estrellas) o subir de nivel es victoria. */
export function useReacciones() {
  useEffect(() => {
    let nivel = useGame.getState().profile.level;
    // un tick después: algunas escenas ponen su propio 'celebrate' justo al terminar, y la victoria va encima
    const luego = (anim: Anim, s: number) => setTimeout(() => reaccionar(anim, s, true), 0);
    return useGame.subscribe((s, prev) => {
      const mg = s.mg;
      if (mg?.phase === 'ended' && prev.mg?.phase === 'playing' && mg.result?.won)
        luego(mg.result.stars === 3 ? 'victoria' : 'celebrate', mg.result.stars === 3 ? 3.4 : 3);
      if (s.profile.level > nivel && s.screen === 'world') luego('victoria', 3.4);
      nivel = s.profile.level;
    });
  }, []);
}

/** Locuras que se activan con solo llegar: asombro al entrar a `radio` metros; se vuelve a armar al alejarse. */
export function useLocuraCerca(x: number, z: number, radio = 2.6) {
  const dentro = useRef(false);
  useTick(() => {
    const d = player.distTo(x, z);
    if (!dentro.current && d < radio) {
      dentro.current = true;
      reaccionLocura();
    } else if (dentro.current && d > radio + 3) dentro.current = false;
  });
}
