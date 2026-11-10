// Utilidades compartidas de la interfaz: acceso al estado, sonido de clic, detección táctil, contadores animados.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useGame, type Profile } from '../core/store';
import { audio, type Sfx } from '../core/audio';
import type { Anim, PanelId } from '../core/types';

export const g = () => useGame.getState();
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
/** En las pruebas automáticas (#test) las vistas 3D pequeñas bajan su resolución. */
export const TEST = typeof location !== 'undefined' && location.hash.includes('test');
export const VERSION = 'v0.1';

/** Envuelve una acción de botón: despierta el audio (primer gesto) y suena el clic. */
export const act = (fn: () => void, sfx: Sfx | null = 'click') => () => { audio.init(); if (sfx) audio.sfx(sfx); fn(); };
export const fmt = (n: number) => Math.round(n).toLocaleString('es-HN');
export const fmtTime = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
export const roomLabel = (room: Profile['room']) => (room.mode === 'solo' ? 'Solo' : room.mode === 'privada' ? `Privada ${room.code}` : room.code ? `Pública ${room.code}` : 'Pública');

/** Animación de cada emote en las vistas previas (la del jugador real la decide PlayerController). */
export const EMOTE_ANIM: Record<string, Anim> = { emote_saludar: 'wave', emote_punta: 'dance', emote_celebrar: 'celebrate', emote_aplaudir: 'clap', emote_gol: 'celebrate', emote_sique: 'dance2' };
export const EMOTE_ICON: Record<string, string> = { emote_saludar: '👋', emote_punta: '💃', emote_celebrar: '🎉', emote_aplaudir: '👏', emote_gol: '⚽', emote_sique: '🪇' };

// ---- ¿pantalla táctil? Solo entonces se muestran la palanca y los botones en pantalla.
let touch = typeof matchMedia !== 'undefined' && matchMedia('(hover: none) and (pointer: coarse)').matches;
const touchSubs = new Set<() => void>();
const setTouch = (v: boolean) => { if (touch !== v) { touch = v; touchSubs.forEach(f => f()); } };
if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', () => setTouch(true), { passive: true, capture: true });
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') setTouch(true); }, { passive: true, capture: true });
}
export const useTouch = () => useSyncExternalStore(cb => { touchSubs.add(cb); return () => { touchSubs.delete(cb); }; }, () => touch);

/** Número que sube o baja suavemente hasta `value`. */
export function useCountUp(value: number, ms = 600, from?: number): number {
  const [shown, setShown] = useState(from ?? value), cur = useRef(from ?? value);
  useEffect(() => {
    const a = cur.current, b = value; if (a === b) return;
    const t0 = performance.now(); let raf = 0;
    const tick = (now: number) => { const k = Math.min(1, (now - t0) / ms), e = 1 - (1 - k) ** 3; cur.current = k >= 1 ? b : a + (b - a) * e; setShown(Math.round(cur.current)); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

/** Consulta de medios reactiva. */
export function useMedia(q: string): boolean {
  return useSyncExternalStore(cb => { const m = matchMedia(q); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); }, () => matchMedia(q).matches);
}

// ---- "Volver": recuerda desde qué panel se abrió el actual (Pausa → Ajustes → volver a Pausa).
let prevPanel: PanelId | null = null;
export const panelNav: { back: PanelId | null } = { back: null };
useGame.subscribe(s => {
  if (s.panel === prevPanel) return;
  if (!s.panel) panelNav.back = null;
  else if (prevPanel && panelNav.back !== s.panel) panelNav.back = prevPanel;
  else panelNav.back = null;
  prevPanel = s.panel;
});

/** Copia texto al portapapeles; devuelve false si el navegador no lo permite. */
export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* sin permiso */ }
  try {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;left:-999px'; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch { return false; }
}
