// Entrada unificada: teclado, mouse, pantalla táctil y mando escriben aquí; el juego solo lee `input`.
import { player } from './player';
import { useGame } from './store';

type Edge = 'jump' | 'use' | 'fire' | 'alt';
export const input = {
  /** teclado: -1..1 */ kx: 0,
  kz: 0,
  /** palanca táctil: -1..1 (la escribe ui/TouchControls) */ jx: 0,
  jz: 0,
  /** stick izquierdo del mando: -1..1 */ gx: 0,
  gz: 0,
  /** true desde que se usa un mando (la interfaz muestra sus botones) */ pad: false,
  padSubs: new Set<() => void>(),
  jump: false,
  run: false,
  /** giro de cámara acumulado en píxeles; el controlador lo consume */ lookX: 0,
  lookY: 0,
  zoom: 0,
  /** puntero en coordenadas normalizadas (-1..1), para apuntar en la feria */ px: 0,
  py: 0,
  pointerDown: false,
  touch: false,
  pressed: new Set<Edge>(),
  /** true una sola vez por pulsación */
  take(e: Edge) {
    const h = this.pressed.has(e);
    this.pressed.delete(e);
    return h;
  },
  press(e: Edge) {
    this.pressed.add(e);
  },
  get mx() {
    return Math.max(-1, Math.min(1, this.kx + this.jx + this.gx));
  },
  get mz() {
    return Math.max(-1, Math.min(1, this.kz + this.jz + this.gz));
  },
  setPad(v: boolean) {
    if (this.pad === v) return;
    this.pad = v;
    for (const f of this.padSubs) f();
  },
  reset() {
    this.kx = this.kz = this.jx = this.jz = this.gx = this.gz = 0;
    this.jump = this.run = false;
    this.pressed.clear();
    held.clear();
  },
};
const held = new Set<string>();
const KEYS: Record<string, string> = {
  w: 'up',
  arrowup: 'up',
  s: 'down',
  arrowdown: 'down',
  a: 'left',
  arrowleft: 'left',
  d: 'right',
  arrowright: 'right',
};
const sync = () => {
  input.kx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
  input.kz = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
};
const typing = (e: Event) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
};

let bound = false;
/** Se llama una vez al arrancar. `canvas` recibe el arrastre de cámara y el clic de acción. */
export function bindInput() {
  if (bound) return;
  bound = true;
  addEventListener('keydown', (e) => {
    input.setPad(false);
    if (typing(e)) return;
    const k = e.key.toLowerCase(),
      g = useGame.getState();
    if (k === 'escape') {
      e.preventDefault();
      if (g.dialog) g.closeDialog();
      else if (g.panel) g.closePanel();
      else if (g.screen === 'world') g.openPanel('pausa');
      return;
    }
    if (g.screen !== 'world') return;
    if (KEYS[k]) {
      e.preventDefault();
      held.add(KEYS[k]);
      sync();
      return;
    }
    if (k === ' ') {
      e.preventDefault();
      if (!e.repeat) input.press('jump');
      input.jump = true;
      return;
    }
    if (k === 'shift') {
      input.run = true;
      return;
    }
    if (e.repeat) return;
    if (k === 'e' || k === 'enter') input.press('use');
    else if (k === 'f') input.press('fire');
    else if (k === 'q') input.press('alt');
    else if (k === 'm') g.togglePanel('mapa');
    else if (k === 'b') g.togglePanel('emotes');
    else if (k === 'p') g.togglePanel('pausa');
  });
  addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (KEYS[k]) {
      held.delete(KEYS[k]);
      sync();
    } else if (k === ' ') input.jump = false;
    else if (k === 'shift') input.run = false;
  });
  addEventListener('blur', () => input.reset());
  // Q queda guardada hasta que un juego la usa: una tocada en un minijuego que no la ocupa (el botón táctil Q sale
  // en todos) no debe gastarse sola en el primer cuadro del siguiente (p. ej. apagar una vela en Niebla).
  useGame.subscribe((s, antes) => {
    if (s.mg?.phase === 'playing' && (antes.mg?.phase !== 'playing' || antes.mg.run !== s.mg.run))
      input.pressed.delete('alt');
  });
  requestAnimationFrame(padLoop);
}

// ---------------------------------------------------------------- mando (Gamepad API, mapeo estándar)
// A salta / confirma · B dispara (en paneles: atrás) · X usa · Y alterno · LB/LT acercan · RB aleja · RT dispara
// Start pausa · Select mapa · cruceta o stick izquierdo mueven el foco en menús y paneles.
export type PadDir = 'up' | 'down' | 'left' | 'right';
/** La interfaz (ui/pad.ts) registra aquí cómo moverse entre botones. */
export const padUi: {
  nav?: (d: PadDir) => void;
  press?: () => void;
  back?: () => void;
  game?: (b: number) => boolean;
} = {};
export const PAD = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  SELECT: 8,
  START: 9,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
};
const DEAD = 0.22;
let prev: boolean[] = [],
  last = 0,
  padJump = false,
  nav: { dir: PadDir; at: number; n: number } | null = null;
/** ¿Hay una ventana encima del juego? Entonces el mando mueve el foco en vez de al muñeco. */
export const uiMode = () => {
  const g = useGame.getState();
  return g.screen !== 'world' || !!g.panel || !!g.dialog || (!!g.mg && g.mg.phase !== 'playing');
};
function padLoop(now: number) {
  requestAnimationFrame(padLoop);
  // tiempo real (hasta 1/4 s): el zoom y el giro no se arrastran si el juego va lento
  const dt = Math.min(0.25, (now - last) / 1000 || 0);
  last = now;
  let gp: Gamepad | null = null;
  try {
    for (const p of navigator.getGamepads?.() ?? []) if (p?.connected) gp = gp ?? p;
  } catch {
    /* sin permiso */
  }
  if (!gp) {
    if (prev.length) {
      input.gx = input.gz = 0;
      if (padJump) input.jump = padJump = false;
      prev = [];
    }
    return;
  }
  const pad = gp;
  const btn = (i: number) => !!pad.buttons[i]?.pressed || (pad.buttons[i]?.value ?? 0) > 0.5;
  const cur = pad.buttons.map((_, i) => btn(i));
  const down = (i: number) => cur[i] && !prev[i];
  const ax = (i: number) => {
    const v = pad.axes[i] ?? 0;
    return Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD);
  };
  if (cur.some(Boolean) || [0, 1, 2, 3].some((i) => ax(i) !== 0)) input.setPad(true);
  const g = useGame.getState();
  if (uiMode()) {
    input.gx = input.gz = 0;
    if (padJump) input.jump = padJump = false;
    const lx = ax(0),
      ly = ax(1);
    const dir: PadDir | null =
      cur[PAD.UP] || ly < -0.5
        ? 'up'
        : cur[PAD.DOWN] || ly > 0.5
          ? 'down'
          : cur[PAD.LEFT] || lx < -0.5
            ? 'left'
            : cur[PAD.RIGHT] || lx > 0.5
              ? 'right'
              : null;
    // al mantener la dirección se repite; pide tiempo y también varios cuadros, para no saltar dos en equipos lentos
    if (!dir) nav = null;
    else if (!nav || nav.dir !== dir) {
      nav = { dir, at: now + 380, n: 0 };
      padUi.nav?.(dir);
    } else if (++nav.n >= 8 && now >= nav.at) {
      nav.at = now + 140;
      nav.n = 5;
      padUi.nav?.(dir);
    }
    if (down(PAD.A)) padUi.press?.();
    if (down(PAD.B)) padUi.back?.();
    if (down(PAD.START) && g.panel === 'pausa' && !g.dialog) g.closePanel();
  } else if (g.screen === 'world') {
    nav = null;
    const lx = ax(0),
      ly = ax(1);
    input.gx = lx;
    input.gz = ly;
    input.lookX += ax(2) * dt * 900;
    input.lookY += ax(3) * dt * 600;
    if (cur[PAD.LB] || cur[PAD.LT]) input.zoom -= dt * 14;
    if (cur[PAD.RB]) input.zoom += dt * 14;
    // en un minijuego, el stick derecho mueve el puntero (Corte y Feria apuntan con él; RT o B disparan ahí)
    if (g.mg?.phase === 'playing') {
      input.px = Math.max(-1, Math.min(1, input.px + ax(2) * dt * 1.8));
      input.py = Math.max(-1, Math.min(1, input.py - ax(3) * dt * 1.8));
    }
    // Ritmo: los cuatro carriles, de izquierda a derecha: ← o X, ↓ o A, ↑ o Y, → o B
    const carriles = g.mg?.phase === 'playing' && g.mg.id === 'ritmo';
    if (carriles) {
      const lanes = [
        [PAD.LEFT, PAD.X],
        [PAD.DOWN, PAD.A],
        [PAD.UP, PAD.Y],
        [PAD.RIGHT, PAD.B],
      ];
      lanes.forEach((bs, i) => {
        if (!bs.some(down)) return;
        // con su keyup: a y d también son teclas de caminar y si no se sueltan el muñeco sigue solo al salir
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'asdf'[i] }));
        window.dispatchEvent(new KeyboardEvent('keyup', { key: 'asdf'[i] }));
      });
    } else if (player.overview && (down(PAD.A) || down(PAD.B) || down(PAD.LB) || down(PAD.LT))) {
      player.setOverview(false);
    } else {
      if (down(PAD.A)) input.press('jump');
      if (cur[PAD.A] !== padJump) input.jump = padJump = cur[PAD.A];
      if (down(PAD.X)) input.press('use');
      if (down(PAD.RT) || down(PAD.B)) input.press('fire');
      if (down(PAD.Y) && !padUi.game?.(PAD.Y)) input.press('alt');
    }
    if (down(PAD.START)) g.openPanel('pausa');
    if (down(PAD.SELECT) && !padUi.game?.(PAD.SELECT)) g.togglePanel('mapa');
  }
  prev = cur;
}

/** Engancha el arrastre de cámara, la rueda y el clic de acción a la superficie 3D. */
export function bindPointer(el: HTMLElement) {
  let drag: { id: number; x: number; y: number; moved: number } | null = null,
    pinch = 0;
  const pts = new Map<number, { x: number; y: number }>();
  const spread = () => {
    const [a, b] = [...pts.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const ndc = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    input.px = ((e.clientX - r.left) / r.width) * 2 - 1;
    input.py = -(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const down = (e: PointerEvent) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // cada dedo queda capturado para que su pointerup llegue aquí aunque se suelte fuera
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* opcional */
    }
    if (pts.size === 2) {
      // dos dedos: pellizco para acercar o alejar (y no cuenta como toque)
      pinch = spread();
      if (drag) drag.moved = 999;
    }
    if (drag) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
    input.pointerDown = true;
    ndc(e);
  };
  const move = (e: PointerEvent) => {
    ndc(e);
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2) {
      const d = spread();
      input.zoom += (pinch - d) / 28;
      pinch = d;
      return;
    }
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    input.lookX += dx;
    input.lookY += dy;
  };
  const up = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    if (!drag || e.pointerId !== drag.id) return;
    ndc(e);
    if (drag.moved < 8) {
      // en la vista desde arriba, un toque vuelve al muñeco
      if (player.overview) player.setOverview(false);
      else input.press('fire');
    }
    drag = null;
    input.pointerDown = false;
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener(
    'wheel',
    (e) => {
      input.zoom += Math.sign(e.deltaY);
      e.preventDefault();
    },
    { passive: false },
  );
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}
