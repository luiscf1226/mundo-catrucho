// Mando en menús y paneles: la cruceta o el stick mueven el foco al botón más cercano en esa dirección,
// A pulsa y B vuelve atrás. core/input lee el mando y llama a estas funciones.
import { audio } from '../core/audio';
import { PAD, type PadDir, padUi } from '../core/input';
import { useGame } from '../core/store';

const FOCUSABLE =
  'button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select, a[href], [role="button"]';
/** Botones que conviene enfocar primero en cada pantalla. */
const PREFER = [
  'dialog-close',
  'mg-start',
  'mg-replay',
  'mg-exit',
  'ed-done',
  'pause-resume',
  'map-go',
  'btn-jugar',
  'btn-explorar',
];
const q = (tid: string) => document.querySelector<HTMLElement>(`[data-testid="${tid}"]`);

/** Contenedor activo: el diálogo, si no el panel, si no la tarjeta del minijuego, si no toda la interfaz. */
function scope(): HTMLElement | null {
  return (
    q('dialog') ??
    document.querySelector<HTMLElement>('.mc-ui [role="dialog"]') ??
    q('mg-intro') ??
    document.querySelector<HTMLElement>('.mc-ui')
  );
}
const visible = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const st = getComputedStyle(el);
  return st.visibility !== 'hidden' && st.pointerEvents !== 'none' && !el.closest('[aria-hidden="true"]');
};
function candidates(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
}
function focus(el: HTMLElement) {
  for (const o of document.querySelectorAll('[data-pad-focus]')) o.removeAttribute('data-pad-focus');
  el.setAttribute('data-pad-focus', '');
  el.focus({ preventScroll: true, focusVisible: true } as FocusOptions);
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function current(root: HTMLElement, list: HTMLElement[]) {
  const a = document.activeElement as HTMLElement | null;
  return a && root.contains(a) && list.includes(a) ? a : null;
}
function preferred(list: HTMLElement[]) {
  for (const id of PREFER) {
    const el = list.find((e) => e.dataset.testid === id);
    if (el) return el;
  }
  return list[0];
}
/** El botón más cercano en la dirección pedida (prioriza lo que queda alineado). */
function next(from: HTMLElement, dir: PadDir, list: HTMLElement[]) {
  const a = from.getBoundingClientRect(),
    ax = a.left + a.width / 2,
    ay = a.top + a.height / 2;
  let best: HTMLElement | null = null,
    score = Infinity;
  for (const el of list) {
    if (el === from || el.contains(from) || from.contains(el)) continue;
    const b = el.getBoundingClientRect(),
      bx = b.left + b.width / 2,
      by = b.top + b.height / 2;
    // tiene que quedar del todo hacia ese lado (por su borde de atrás), no solo su centro
    const ahead =
      dir === 'up'
        ? b.bottom <= a.bottom - 4 && by < ay
        : dir === 'down'
          ? b.top >= a.top + 4 && by > ay
          : dir === 'left'
            ? b.right <= a.right - 4 && bx < ax
            : b.left >= a.left + 4 && bx > ax;
    if (!ahead) continue;
    const gap = Math.max(
      0,
      dir === 'up'
        ? a.top - b.bottom
        : dir === 'down'
          ? b.top - a.bottom
          : dir === 'left'
            ? a.left - b.right
            : b.left - a.right,
    );
    // separación por el borde en el eje cruzado (0 si se traslapan)
    const cross =
      dir === 'up' || dir === 'down'
        ? Math.max(0, b.left - a.right, a.left - b.right)
        : Math.max(0, b.top - a.bottom, a.top - b.bottom);
    // a los lados solo se va dentro de la misma fila (no salta a la X de arriba)
    if ((dir === 'left' || dir === 'right') && cross > a.height * 0.5) continue;
    // empates (dos botones iguales abajo de uno ancho): gana el de la izquierda, como se lee
    const s = gap + cross * 3 + Math.hypot(bx - ax, by - ay) * 0.1 + (b.left + b.top) * 0.001;
    if (s < score) {
      score = s;
      best = el;
    }
  }
  return best;
}

padUi.nav = (dir) => {
  const root = scope();
  if (!root) return;
  const list = candidates(root),
    cur = current(root, list);
  if (cur instanceof HTMLInputElement && cur.type === 'range' && (dir === 'left' || dir === 'right')) {
    cur.value = String(Number(cur.value) + (dir === 'right' ? 1 : -1) * (Number(cur.step) || 1));
    cur.dispatchEvent(new Event('input', { bubbles: true }));
    cur.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  const to = cur ? next(cur, dir, list) : preferred(list);
  if (to) {
    focus(to);
    audio.sfx('step');
  }
};
padUi.press = () => {
  const root = scope();
  if (!root) return;
  const list = candidates(root),
    cur = current(root, list);
  audio.init();
  if (cur) cur.click();
  else {
    const p = preferred(list);
    if (p) focus(p);
  }
};
padUi.back = () => {
  const g = useGame.getState();
  if (g.dialog) return g.closeDialog();
  if (g.panel) {
    const back = q('panel-back');
    if (back) return back.click();
    if (g.panel === 'personaje' && !g.profile.created) return;
    return g.closePanel();
  }
  if (g.mg?.phase === 'intro') q('mg-back')?.click();
  else if (g.mg?.phase === 'ended') q('mg-exit')?.click();
};
/** Botones del mando con un uso propio en ciertas pantallas (el viaje tiene radio y «saltar viaje»). */
padUi.game = (b) => {
  if (useGame.getState().scene.kind !== 'viaje') return false;
  const el = q(b === PAD.Y ? 'viaje-radio' : b === PAD.SELECT ? 'viaje-skip' : '');
  el?.click();
  return !!el;
};

// foco del mando visible aunque el navegador no lo marque (p. ej. regiones del mapa en SVG)
if (typeof document !== 'undefined') {
  const st = document.createElement('style');
  st.textContent = `.mc-ui [data-pad-focus]:focus{outline:3px solid var(--mc-ring);outline-offset:3px;box-shadow:0 0 0 6px color-mix(in srgb,var(--mc-ring) 35%,transparent)}
.mc-ui path[data-pad-focus]:focus{stroke:var(--mc-ring);stroke-width:4}`;
  document.head.appendChild(st);
  // si se usa mouse o tacto, se quita la marca del mando
  addEventListener('pointerdown', () => {
    for (const o of document.querySelectorAll('[data-pad-focus]')) o.removeAttribute('data-pad-focus');
  });
}
