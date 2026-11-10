// Entrada unificada: teclado, mouse y pantalla táctil escriben aquí; el juego solo lee `input`.
import { useGame } from './store';

type Edge = 'jump' | 'use' | 'fire' | 'alt';
export const input = {
  /** teclado: -1..1 */ kx: 0, kz: 0,
  /** palanca táctil: -1..1 (la escribe ui/TouchControls) */ jx: 0, jz: 0,
  jump: false, run: false,
  /** giro de cámara acumulado en píxeles; el controlador lo consume */ lookX: 0, lookY: 0, zoom: 0,
  /** puntero en coordenadas normalizadas (-1..1), para apuntar en la feria */ px: 0, py: 0, pointerDown: false,
  touch: false,
  pressed: new Set<Edge>(),
  /** true una sola vez por pulsación */
  take(e: Edge) { const h = this.pressed.has(e); this.pressed.delete(e); return h; },
  press(e: Edge) { this.pressed.add(e); },
  get mx() { return Math.max(-1, Math.min(1, this.kx + this.jx)); },
  get mz() { return Math.max(-1, Math.min(1, this.kz + this.jz)); },
  reset() { this.kx = this.kz = this.jx = this.jz = 0; this.jump = this.run = false; this.pressed.clear(); held.clear(); },
};
const held = new Set<string>();
const KEYS: Record<string, string> = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
const sync = () => { input.kx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0); input.kz = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0); };
const typing = (e: Event) => { const t = e.target as HTMLElement | null; return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };

let bound = false;
/** Se llama una vez al arrancar. `canvas` recibe el arrastre de cámara y el clic de acción. */
export function bindInput() {
  if (bound) return; bound = true;
  addEventListener('keydown', e => {
    if (typing(e)) return;
    const k = e.key.toLowerCase(), g = useGame.getState();
    if (k === 'escape') { e.preventDefault(); if (g.dialog) g.closeDialog(); else if (g.panel) g.closePanel(); else if (g.screen === 'world') g.openPanel('pausa'); return; }
    if (g.screen !== 'world') return;
    if (KEYS[k]) { e.preventDefault(); held.add(KEYS[k]); sync(); return; }
    if (k === ' ') { e.preventDefault(); if (!e.repeat) input.press('jump'); input.jump = true; return; }
    if (k === 'shift') { input.run = true; return; }
    if (e.repeat) return;
    if (k === 'e' || k === 'enter') input.press('use');
    else if (k === 'f') input.press('fire');
    else if (k === 'q') input.press('alt');
    else if (k === 'm') g.togglePanel('mapa');
    else if (k === 'b') g.togglePanel('emotes');
    else if (k === 'p') g.togglePanel('pausa');
  });
  addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (KEYS[k]) { held.delete(KEYS[k]); sync(); }
    else if (k === ' ') input.jump = false;
    else if (k === 'shift') input.run = false;
  });
  addEventListener('blur', () => input.reset());
}

/** Engancha el arrastre de cámara, la rueda y el clic de acción a la superficie 3D. */
export function bindPointer(el: HTMLElement) {
  let drag: { id: number; x: number; y: number; moved: number } | null = null;
  const ndc = (e: PointerEvent) => { const r = el.getBoundingClientRect(); input.px = ((e.clientX - r.left) / r.width) * 2 - 1; input.py = -(((e.clientY - r.top) / r.height) * 2 - 1); };
  const down = (e: PointerEvent) => { if (drag) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 }; input.pointerDown = true; ndc(e); try { el.setPointerCapture(e.pointerId); } catch { /* opcional */ } };
  const move = (e: PointerEvent) => {
    ndc(e); if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
    input.lookX += dx; input.lookY += dy;
  };
  const up = (e: PointerEvent) => { if (!drag || e.pointerId !== drag.id) return; ndc(e); if (drag.moved < 8) input.press('fire'); drag = null; input.pointerDown = false; };
  el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', e => { input.zoom += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  el.addEventListener('contextmenu', e => e.preventDefault());
  return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
}
