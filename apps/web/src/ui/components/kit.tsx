// Piezas base de la interfaz. El aspecto de cada una lo define la piel activa en src/index.css (.mc-*).
import { type CSSProperties, type ReactNode, useEffect, useRef } from 'react';
import { audio, type Sfx } from '../../core/audio';
import { useGame } from '../../core/store';
import type { PanelId } from '../../core/types';
import { act, cx, fmt, g, panelNav, useCountUp } from '../lib';
import { Coin, Icon, type IconName, Star } from './Icon';

export type Tone = 'play' | 'primary' | 'gold' | 'good' | 'bad' | 'neutral' | 'dark';
interface BtnProps {
  id?: string;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: IconName;
  children?: ReactNode;
  onClick: () => void;
  cls?: string;
  disabled?: boolean;
  sfx?: Sfx | null;
  title?: string;
  style?: CSSProperties;
}
export function Btn({
  id,
  tone = 'primary',
  size = 'md',
  icon,
  children,
  onClick,
  cls,
  disabled,
  sfx = 'click',
  title,
  style,
}: BtnProps) {
  return (
    <button
      type="button"
      data-testid={id}
      data-tone={tone}
      data-size={size}
      disabled={disabled}
      title={title}
      aria-label={title}
      style={style}
      onClick={act(onClick, sfx)}
      className={cx('mc-btn', cls)}
    >
      {icon && <Icon name={icon} size={size === 'xl' ? 30 : size === 'lg' ? 24 : size === 'sm' ? 18 : 20} />}
      {children}
    </button>
  );
}

/** Botón redondo de icono con etiqueta al pasar el mouse. */
export function IBtn({
  id,
  icon,
  label,
  onClick,
  tone,
  cls,
  children,
  tip = true,
}: {
  id?: string;
  icon: IconName;
  label: string;
  onClick: () => void;
  tone?: 'close' | 'head';
  cls?: string;
  children?: ReactNode;
  tip?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={id}
      data-tone={tone}
      aria-label={label}
      onClick={(e) => {
        e.currentTarget.blur();
        act(onClick)();
      }}
      className={cx('mc-ibtn', cls)}
    >
      <Icon name={icon} size={tone ? 20 : 24} />
      {children}
      {tip && <span className="mc-tip">{label}</span>}
    </button>
  );
}

const SIZES = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
interface PanelProps {
  id: PanelId;
  title: string;
  icon?: IconName;
  children: ReactNode;
  size?: keyof typeof SIZES /** el contenido ocupa todo el alto y maneja su propio desplazamiento */;
  fill?: boolean;
  extra?: ReactNode;
  footer?: ReactNode;
  cls?: string;
}
/** Ventana modal estándar: cabecera con título, "volver" si vienes de otro panel, cerrar (Esc también cierra). */
export function Panel({ id, title, icon, children, size = 'md', fill, extra, footer, cls }: PanelProps) {
  const created = useGame((s) => s.profile.created),
    ref = useRef<HTMLDivElement>(null);
  const locked = !created && id === 'personaje',
    back = locked ? null : panelNav.back;
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div
      className="mc-overlay pad-safe-sm pointer-events-auto absolute inset-0 z-20 flex items-center justify-center"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !locked) g().closePanel();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={`panel-${id}`}
        className={cx('mc-panel flex max-h-full w-full flex-col outline-none', SIZES[size], fill && 'h-full', cls)}
      >
        <div className="mc-panel-head">
          {back && (
            <IBtn
              id="panel-back"
              icon="back"
              label="Volver"
              tone="head"
              tip={false}
              onClick={() => g().openPanel(back)}
            />
          )}
          {icon && <Icon name={icon} size={26} cls={back ? 'max-sm:hidden' : ''} />}
          <h2 className="mc-panel-title flex-1">{title}</h2>
          {extra}
          {!locked && (
            <IBtn id="panel-close" icon="x" label="Cerrar" tone="close" tip={false} onClick={() => g().closePanel()} />
          )}
        </div>
        <div
          className={cx('min-h-0 flex-1', fill ? 'flex flex-col overflow-hidden p-3 sm:p-4' : 'mc-scroll p-3 sm:p-5')}
        >
          {children}
        </div>
        {footer && <div className="flex-none border-t-2 border-line p-3 hd:border-t">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  testid,
  compact,
  cls,
}: {
  items: { id: T; label: string; icon?: IconName; emoji?: string }[];
  value: T;
  onChange: (v: T) => void;
  testid: (id: T) => string /** en pantallas angostas solo la pestaña activa muestra su nombre */;
  compact?: boolean;
  cls?: string;
}) {
  return (
    <div role="tablist" className={cx('flex flex-wrap gap-1.5', cls)}>
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          aria-label={t.label}
          data-testid={testid(t.id)}
          onClick={act(() => onChange(t.id))}
          className={cx('mc-tab', compact && value !== t.id && 'max-lg:px-0')}
        >
          {t.icon && <Icon name={t.icon} size={19} />}
          {t.emoji && <span aria-hidden>{t.emoji}</span>}
          <span className={cx(compact && value !== t.id && 'max-lg:hidden')}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Stars({
  n,
  size = 22,
  pop,
  cls,
}: {
  n: number;
  size?: number /** aparecen una por una */;
  pop?: boolean;
  cls?: string;
}) {
  return (
    <span className={cx('inline-flex items-center gap-0.5', cls)} role="img" aria-label={`${n} de 3 estrellas`}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          on={i < n}
          size={size}
          cls={pop && i < n ? 'anim-star' : ''}
          style={pop ? { animationDelay: `${0.35 + i * 0.32}s` } : undefined}
        />
      ))}
    </span>
  );
}

export function Bar({
  value,
  max,
  color,
  cls,
  id,
}: {
  value: number;
  max: number;
  color?: string;
  cls?: string;
  id?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      data-testid={id}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={cx('mc-bar', cls)}
      style={color ? ({ '--bar': color } as CSSProperties) : undefined}
    >
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Cantidad de Lempiritas con su moneda. `anim` hace que el número cuente hasta el valor. */
export function Coins({
  n,
  size = 20,
  anim,
  cls,
  sign,
}: {
  n: number;
  size?: number;
  anim?: boolean;
  cls?: string;
  sign?: boolean;
}) {
  const shown = useCountUp(n, anim ? 600 : 0);
  return (
    <span className={cx('mc-num inline-flex items-center gap-1 font-display font-semibold', cls)}>
      <Coin size={size} />
      {sign && n > 0 ? '+' : ''}
      {fmt(anim ? shown : n)}
    </span>
  );
}

export function Tag({ children, color, fg, cls }: { children: ReactNode; color?: string; fg?: string; cls?: string }) {
  return (
    <span
      className={cx('mc-tag', cls)}
      style={{ ...(color ? { '--tg': color } : {}), ...(fg ? { '--tf': fg } : {}) } as CSSProperties}
    >
      {children}
    </span>
  );
}

export function Swatch({
  id,
  color,
  on,
  onClick,
  label,
}: {
  id?: string;
  color: string;
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      data-testid={id}
      aria-label={label}
      aria-pressed={on}
      onClick={act(onClick)}
      className="mc-swatch"
      style={{ '--sw': color } as CSSProperties}
    />
  );
}

/** Nota pequeña con icono de información. */
export function Note({ children, icon = 'info', cls }: { children: ReactNode; icon?: IconName; cls?: string }) {
  return (
    <p className={cx('flex items-start gap-2 text-sm text-muted', cls)}>
      <Icon name={icon} size={18} cls="mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

const CONFETTI = ['#00bce4', '#ffffff', '#f6b91a', '#e63946', '#17a673', '#7fe9ff'];
/** Lluvia de confeti en un lienzo propio; no bloquea los clics. Se dibuja una vez por montaje. */
export function Confetti({ count = 110, ms = 2600, cls }: { count?: number; ms?: number; cls?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current,
      c = cv?.getContext('2d');
    if (!cv || !c) return;
    const dpr = Math.min(2, devicePixelRatio || 1),
      w = cv.clientWidth,
      h = cv.clientHeight;
    cv.width = w * dpr;
    cv.height = h * dpr;
    c.scale(dpr, dpr);
    const parts = Array.from({ length: count }, (_, i) => {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2,
        sp = 5 + Math.random() * 9;
      return {
        x: w / 2 + (Math.random() - 0.5) * w * 0.3,
        y: h * 0.42,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 3,
        r: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.4,
        s: 5 + Math.random() * 6,
        c: CONFETTI[i % CONFETTI.length],
        star: i % 6 === 0,
      };
    });
    const t0 = performance.now();
    let raf = 0;
    const draw = (now: number) => {
      const k = (now - t0) / ms;
      c.clearRect(0, 0, w, h);
      if (k >= 1) return;
      c.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      for (const p of parts) {
        p.vy += 0.28;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.r);
        c.fillStyle = p.c;
        if (p.star) {
          c.beginPath();
          for (let i = 0; i < 10; i++) {
            const rr = i % 2 ? p.s * 0.45 : p.s,
              an = (i * Math.PI) / 5;
            c.lineTo(Math.sin(an) * rr, -Math.cos(an) * rr);
          }
          c.closePath();
          c.fill();
        } else c.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6 * Math.abs(Math.cos(p.r * 2)) + 1);
        c.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [count, ms]);
  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cx('pointer-events-none absolute inset-0 h-full w-full', cls)}
      style={{ touchAction: 'auto' }}
    />
  );
}

/** Sonido una sola vez al montar (resultados, celebraciones). */
export function useSfxOnce(name: Sfx, on = true) {
  useEffect(() => {
    if (on) audio.sfx(name);
  }, [name, on]);
}
