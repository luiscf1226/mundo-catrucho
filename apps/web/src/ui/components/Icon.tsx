// Iconos en SVG en línea (sin archivos ni fuentes externas) + motivos hondureños: moneda Lempirita, estrella, bandera.
import type { CSSProperties, ReactNode } from 'react';
import { IS_HD } from '../../variant';

const dot = (x: number, y: number, r = 0.9) => <circle cx={x} cy={y} r={r} fill="currentColor" stroke="none" />;
const PATHS = {
  map: <><path d="M9 4 3 6.5V20l6-2.5 6 2.500 6-2.500V4l-6 2.500L9 4Z" /><path d="M9 4v13.5M15 6.500V20" /></>,
  gamepad: <><rect x="2.500" y="7" width="19" height="11" rx="5.500" /><path d="M7.500 10.500v4M5.500 12.500h4" />{dot(15.3, 11.2)}{dot(17.800, 13.800)}</>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.500 20.500c.8-4 3.800-6 7.500-6s6.700 2 7.500 6" /></>,
  shop: <><path d="M3 9.500 4.800 4h14.400L21 9.500" /><path d="M3 9.500a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" /><path d="M4.500 12.500V20h15v-7.500M10 20v-4.500h4V20" /></>,
  missions: <><rect x="5" y="4.500" width="14" height="16" rx="2.500" /><path d="M9 4.500V3h6v1.500M8.800 12.800l2.200 2.200 4.200-4.700" /></>,
  emote: <><circle cx="12" cy="4.800" r="2.200" /><path d="M12 7.500v6.500M5.500 5.500l6.500 4 5.500-4.500M12 14l-4.500 6.500M12 14l4.800 5.500" /></>,
  pause: <><rect x="6" y="4.500" width="4" height="15" rx="1.200" fill="currentColor" /><rect x="14" y="4.500" width="4" height="15" rx="1.200" fill="currentColor" /></>,
  play: <path d="M7.500 4.500v15l12-7.500-12-7.500Z" fill="currentColor" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.800v2.700M12 18.500v2.700M2.800 12h2.700M18.500 12h2.700M5.500 5.500l1.900 1.900M16.600 16.600l1.900 1.900M5.500 18.500l1.900-1.900M16.600 7.400l1.900-1.900" /><circle cx="12" cy="12" r="6.600" /></>,
  controls: <><rect x="2.500" y="6" width="19" height="12.500" rx="2.500" /><path d="M7 14.800h10" />{dot(6.500, 10.300)}{dot(10.200, 10.300)}{dot(13.900, 10.300)}{dot(17.500, 10.300)}</>,
  users: <><circle cx="9" cy="8.500" r="3.300" /><path d="M2.800 19.500c.6-3.300 3-5 6.200-5s5.600 1.700 6.200 5" /><path d="M15.500 5.600a3.300 3.300 0 0 1 0 5.900M17.800 14.900c1.900.6 3.100 2.100 3.500 4.600" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M4.500 12.500l5 5L19.500 7" />,
  lock: <><rect x="5" y="10.500" width="14" height="10" rx="2.500" /><path d="M8 10.500V7.500a4 4 0 0 1 8 0v3" /></>,
  trophy: <><path d="M7.500 4h9v5a4.500 4.500 0 0 1-9 0V4Z" /><path d="M7.500 5.500H4.500a3 3 0 0 0 3.300 3.800M16.500 5.500h3a3 3 0 0 1-3.300 3.800M12 13.500V17M8 20h8M9.500 17h5" /></>,
  home: <><path d="M3.500 11 12 4l8.500 7" /><path d="M5.500 9.700V20h13V9.700M10 20v-5h4v5" /></>,
  bus: <><rect x="4" y="4" width="16" height="13.500" rx="2.800" /><path d="M4 11h16M7.500 17.500V20M16.500 17.500V20" />{dot(8, 14.300)}{dot(16, 14.300)}</>,
  copy: <><rect x="8.500" y="8.500" width="11.500" height="11.500" rx="2.200" /><path d="M15.500 5.500V5a1.500 1.500 0 0 0-1.500-1.500H5.500A1.500 1.500 0 0 0 4 5v8.500A1.500 1.500 0 0 0 5.500 15H6" /></>,
  dice: <><rect x="3.500" y="3.500" width="17" height="17" rx="4" />{dot(8.300, 8.300, 1.200)}{dot(15.700, 8.300, 1.200)}{dot(12, 12, 1.200)}{dot(8.300, 15.700, 1.200)}{dot(15.700, 15.700, 1.200)}</>,
  back: <path d="M14.500 5l-7 7 7 7" />,
  next: <path d="M9.500 5l7 7-7 7" />,
  volume: <><path d="M4 9.500v5h3.500l4.500 4v-13l-4.500 4H4Z" /><path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11" /></>,
  music: <><path d="M9 17.500V6l10-2v11.500" /><circle cx="6.500" cy="17.500" r="2.500" /><circle cx="16.500" cy="15.500" r="2.500" /></>,
  eye: <><path d="M2.500 12s3.500-6.500 9.500-6.500 9.500 6.500 9.500 6.500-3.500 6.500-9.500 6.500S2.500 12 2.500 12Z" /><circle cx="12" cy="12" r="2.800" /></>,
  cart: <><path d="M3 4.500h2.500l2.300 10.500h10l2-7.500H7" /><circle cx="9" cy="19" r="1.400" /><circle cx="17" cy="19" r="1.400" /></>,
  clock: <><circle cx="12" cy="12.500" r="8" /><path d="M12 8v4.800l3 1.900M9.500 2.800h5" /></>,
  target: <><circle cx="12" cy="12" r="8.500" /><circle cx="12" cy="12" r="4.800" />{dot(12, 12, 1.300)}</>,
  refresh: <><path d="M19.500 12a7.500 7.500 0 1 1-2.400-5.500" /><path d="M19.800 3.800v4.700h-4.700" /></>,
  exit: <><path d="M10 4H5.500v16H10" /><path d="M14 8l4 4-4 4M18 12H9.500" /></>,
  file: <><path d="M6.500 3h7.500l4 4v14H6.500V3Z" /><path d="M14 3v4h4" /></>,
  folder: <path d="M3 6.500h6l2 2.500h10V19H3V6.500Z" />,
  code: <path d="M8.500 7.500 4 12l4.500 4.500M15.500 7.500 20 12l-4.500 4.500" />,
  info: <><circle cx="12" cy="12" r="8.800" /><path d="M12 11v5.500" />{dot(12, 7.800, 1.100)}</>,
  pin: <><path d="M12 21s-6.500-6-6.500-11a6.500 6.500 0 0 1 13 0c0 5-6.500 11-6.500 11Z" /><circle cx="12" cy="10" r="2.300" /></>,
  gem: <><path d="M6.500 4h11L21.500 9.500 12 21 2.500 9.500 6.500 4Z" /><path d="M2.500 9.500h19M9.500 4 8 9.500 12 21l4-11.500L14.500 4" /></>,
  hat: <><path d="M2.500 16.500c3.500 2 15.500 2 19 0" /><path d="M6.500 16V11.500a5.500 5.500 0 0 1 11 0V16" /><path d="M6.500 13.500c3 1.200 8 1.200 11 0" /></>,
  shirt: <path d="M8.500 3.500 3 6.500l2 4.200 2.500-1V20.500h9V9.700l2.500 1 2-4.200-5.500-3a3.500 3.500 0 0 1-7 0Z" />,
  pants: <path d="M6.500 3.500h11l1 17h-4.800L12 10.500l-1.700 10H5.500l1-17Z" />,
  face: <><circle cx="12" cy="12" r="8.800" /><path d="M8.500 14.200c1 1.500 2.200 2.200 3.500 2.200s2.500-.7 3.500-2.200" />{dot(9, 10, 1.100)}{dot(15, 10, 1.100)}</>,
  hair: <><path d="M5 20v-8a7 7 0 0 1 14 0v8" /><path d="M5 12.500c4.500-.5 7.500-2.500 9-5.500 1 2.500 2.800 4.300 5 5.200" /></>,
  bag: <><rect x="5.500" y="8" width="13" height="12.500" rx="3.500" /><path d="M9 8V6.500a3 3 0 0 1 6 0V8M9 13.500h6v3H9v-3Z" /></>,
  sparkle: <><path d="M11 3.500l1.900 5.100 5.100 1.900-5.100 1.900L11 17.500l-1.900-5.100L4 10.500l5.100-1.900L11 3.500Z" /><path d="M18.500 15v4M16.500 17h4" /></>,
  medal: <><circle cx="12" cy="14.500" r="5.500" /><path d="M8.500 3l2.300 5.500M15.500 3l-2.300 5.500M12 12.200v4.600" /></>,
  chart: <path d="M5 20v-8M12 20V4.500M19 20v-5.500M3 20.500h18" />,
  globe: <><circle cx="12" cy="12" r="8.800" /><path d="M3.200 12h17.600M12 3.200c-5 5.500-5 12 0 17.600M12 3.200c5 5.500 5 12 0 17.600" /></>,
  key: <><circle cx="8" cy="15.500" r="4.200" /><path d="M11 12.500 20 3.500M16 7.500l2.800 2.800M13.500 10l2 2" /></>,
  hand: <path d="M8 12.500V5.500a1.600 1.600 0 0 1 3.200 0v5M11.200 10V4.300a1.600 1.600 0 0 1 3.200 0V10M14.400 10.300V6a1.600 1.600 0 0 1 3.200 0v8.500c0 4-2.500 6.500-6 6.500-2.800 0-4.200-1.200-5.500-3.300L3.800 13.500a1.500 1.500 0 0 1 2.400-1.700L8 14" />,
  bolt: <path d="M13 2.500 5 13.500h6l-1 8 8-11h-6l1-8Z" />,
  list: <path d="M8.500 6.500h11M8.500 12h11M8.500 17.500h11M4.500 6.500h.01M4.500 12h.01M4.500 17.500h.01" />,
  plus: <path d="M12 5v14M5 12h14" />,
  jump: <path d="M12 19.500V5M5.500 11 12 4.500 18.500 11" />,
  doc: <><path d="M6.500 3h7.500l4 4v14H6.500V3Z" /><path d="M14 3v4h4M9.500 12h5.500M9.500 15.500h5.500" /></>,
  cube: <><path d="M12 2.800 20.500 7.500v9L12 21.200 3.500 16.500v-9L12 2.800Z" /><path d="M3.500 7.500 12 12l8.500-4.500M12 12v9.200" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.800v2.400M12 18.800v2.400M2.800 12h2.400M18.800 12h2.400M5.500 5.500l1.700 1.700M16.800 16.800l1.700 1.700M5.500 18.500l1.700-1.700M16.800 7.200l1.700-1.700" /></>,
  camera: <><rect x="3" y="7" width="18" height="13" rx="3" /><circle cx="12" cy="13.500" r="3.500" /><path d="M8.500 7l1.500-2.500h4L15.500 7" /></>,
  trash: <path d="M4.500 6.500h15M9.500 6.500V4h5v2.500M6.500 6.500l1 14h9l1-14M10 10.500v6M14 10.500v6" />,
  down: <path d="M5 9.500l7 7 7-7" />,
} satisfies Record<string, ReactNode>;
export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, cls, style }: { name: IconName; size?: number; cls?: string; style?: CSSProperties }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={IS_HD ? 1.9 : 2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`shrink-0 ${cls ?? ''}`} style={style}>{PATHS[name]}</svg>;
}

/** Moneda Lempirita. */
export function Coin({ size = 22, cls }: { size?: number; cls?: string }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={`shrink-0 ${cls ?? ''}`}>
    <circle cx="12" cy="12" r="10.500" fill="#f6b91a" stroke={IS_HD ? '#8a5a00' : '#0f1f3d'} strokeWidth={IS_HD ? 1 : 1.800} />
    <circle cx="12" cy="12" r="7.600" fill="#ffd95a" stroke="#d99000" strokeWidth="1.100" />
    <path d="M6.500 8.200a7 7 0 0 1 5-3.600" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1.500" strokeLinecap="round" />
    <path d="M10 7.300v8.400h5.200" fill="none" stroke="#8a5200" strokeWidth="2.300" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

const STAR = 'M12 2.300l2.950 6.050 6.650.950-4.800 4.700 1.150 6.650L12 17.500l-5.950 3.150 1.150-6.650-4.800-4.700 6.650-.950L12 2.300Z';
/** Estrella de cinco puntas (como las de la bandera). `on` = ganada. */
export function Star({ on = true, size = 22, cls, style, color }: { on?: boolean; size?: number; cls?: string; style?: CSSProperties; color?: string }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={`shrink-0 ${cls ?? ''}`} style={style}>
    <path d={STAR} fill={on ? color ?? '#ffc61a' : IS_HD ? 'rgba(255,255,255,.12)' : '#c9d9ec'} stroke={on ? (IS_HD ? '#b07a00' : '#0f1f3d') : IS_HD ? 'rgba(255,255,255,.25)' : '#8ea6c6'} strokeWidth={IS_HD ? 1 : 1.800} strokeLinejoin="round" />
    {on && <path d="M8.300 9.200 12 5.500" stroke="#fff" strokeOpacity=".7" strokeWidth="1.300" strokeLinecap="round" fill="none" />}
  </svg>;
}

/** Bandera de Honduras: dos franjas turquesa, una blanca y cinco estrellas. */
export function FlagHN({ w = 36, cls }: { w?: number; cls?: string }) {
  const s = (x: number, y: number) => <path key={`${x}-${y}`} d={STAR} transform={`translate(${x - 1.700} ${y - 1.700}) scale(.142)`} fill="#00bce4" />;
  return <svg viewBox="0 0 36 20" width={w} height={(w * 20) / 36} aria-label="Bandera de Honduras" role="img" className={`shrink-0 ${cls ?? ''}`}>
    <rect width="36" height="20" rx="2.500" fill="#fff" />
    <path d="M0 2.500A2.500 2.500 0 0 1 2.500 0h31A2.500 2.500 0 0 1 36 2.500V6.667H0Z" fill="#00bce4" />
    <path d="M0 13.333h36V17.500a2.500 2.500 0 0 1-2.500 2.500h-31A2.500 2.500 0 0 1 0 17.500Z" fill="#00bce4" />
    {s(18, 10)}{s(13.500, 8.300)}{s(22.500, 8.300)}{s(13.500, 11.700)}{s(22.500, 11.700)}
    <rect x=".5" y=".5" width="35" height="19" rx="2.200" fill="none" stroke={IS_HD ? 'rgba(255,255,255,.35)' : '#0f1f3d'} strokeWidth={IS_HD ? 0.6 : 1.200} />
  </svg>;
}

/** Cinco estrellas en fila, de adorno. */
export function FiveStars({ size = 12, color = '#00bce4', cls }: { size?: number; color?: string; cls?: string }) {
  return <span className={`inline-flex items-center gap-1 ${cls ?? ''}`} aria-hidden>{[0, 1, 2, 3, 4].map(i => <svg key={i} viewBox="0 0 24 24" width={size} height={size}><path d={STAR} fill={color} /></svg>)}</span>;
}

/** Guacamaya roja (ave nacional) en vuelo, para la pantalla de inicio sin 3D y adornos. */
export function Macaw({ size = 64, cls }: { size?: number; cls?: string }) {
  return <svg viewBox="0 0 64 40" width={size} height={(size * 40) / 64} aria-hidden className={cls}>
    <path d="M6 30c8-2 14-6 20-12l6 4c-6 6-16 9-26 8Z" fill="#1d6fd6" />
    <path d="M4 26c8-1 14-5 20-11l5 3c-6 6-14 9-25 8Z" fill="#ffc61a" />
    <path d="M22 14c6-7 16-9 24-5 4 2 6 5 6 8-4 4-12 6-20 5-5-1-9-4-10-8Z" fill="#e63946" />
    <g style={{ transformOrigin: '34px 14px', animation: 'mc-flap .5s ease-in-out infinite' }}><path d="M30 14C28 6 30 1 36 0c2 6 2 11-1 15Z" fill="#e63946" /><path d="M31.500 12C31 7 32.500 3.500 35.500 2c.6 4 .2 7-1.500 10Z" fill="#ffc61a" /><path d="M33 12c0-3 .8-5.500 2.300-7 .2 3-.2 5-1.300 7Z" fill="#1d6fd6" /></g>
    <circle cx="48" cy="13" r="5" fill="#fff" /><circle cx="49" cy="12.500" r="1.300" fill="#0f1f3d" />
    <path d="M52 12c4 0 6 2 6 5-2 0-4 0-6-1Z" fill="#2b2b2b" />
  </svg>;
}
