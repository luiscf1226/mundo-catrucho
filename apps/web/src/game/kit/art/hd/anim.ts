// Animación procedural del avatar HD. Cada animación es una función que escribe una POSE (ángulos de Euler por
// hueso + desplazamiento de la raíz) a partir del tiempo; el avatar mezcla poses con pesos suavizados, así que
// pasar de una animación a otra nunca da saltos.
import type { Anim } from '../../../../core/types';
import { asombro as curvaAsombro, choque as curvaChoque, victoria as curvaVictoria } from '../exagera';
import { B, LEG, SEAT } from './avatarGeo';

/** 3 de posición de la raíz + 3 ángulos por cada uno de los 14 huesos animados */
export const PN = 3 + 14 * 3;
export const ANIMS: Anim[] = [
  'idle',
  'walk',
  'run',
  'jump',
  'fall',
  'dance',
  'dance2',
  'celebrate',
  'wave',
  'clap',
  'kick',
  'throw',
  'carry',
  'drive',
  'sit',
  'gol',
  'victoria',
  'choque',
  'asombro',
  'mareo',
];
export interface Ctx {
  /** tiempo global */ t: number /** tiempo desde que empezó la animación */;
  tl: number /** fase del paso */;
  ph: number;
  speed: number;
  seed: number;
}
type P = Float32Array;

const {
  root: ROOT,
  hips: HIPS,
  chest: CHEST,
  head: HEAD,
  armL: AL,
  foreL: FL,
  armR: AR,
  foreR: FR,
  thighL: TL,
  shinL: SL,
  footL: FTL,
  thighR: TR,
  shinR: SR,
  footR: FTR,
} = B;
const set = (p: P, b: number, x: number, y = 0, z = 0) => {
  const o = 3 + b * 3;
  p[o] = x;
  p[o + 1] = y;
  p[o + 2] = z;
};
const add = (p: P, b: number, x: number, y = 0, z = 0) => {
  const o = 3 + b * 3;
  p[o] += x;
  p[o + 1] += y;
  p[o + 2] += z;
};
const sm = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const { sin, cos, abs, max, PI } = Math;
/** flexiona las dos rodillas y baja la cadera lo justo para que los pies sigan en el suelo */
function bend(p: P, a: number) {
  add(p, TL, -a);
  add(p, SL, 2 * a);
  add(p, FTL, -a);
  add(p, TR, -a);
  add(p, SR, 2 * a);
  add(p, FTR, -a);
  p[1] -= LEG * (1 - cos(a));
}

function idle(p: P, c: Ctx) {
  const t = c.t,
    s = c.seed,
    br = sin(t * 1.7 + s),
    sw = sin(t * 0.55 + s * 2);
  bend(p, 0.05 + br * 0.012);
  p[0] = sw * 0.012;
  set(p, HIPS, 0, 0, sw * 0.03);
  set(p, CHEST, br * 0.022 - 0.01, 0, -sw * 0.04);
  set(p, HEAD, sin(t * 0.9 + s) * 0.03, sin(t * 0.37 + s * 3) * 0.16, sw * 0.02);
  set(p, AL, br * 0.03, 0, 0.11 + br * 0.014);
  set(p, FL, -0.2 - br * 0.03, 0, -0.05);
  set(p, AR, -br * 0.03, 0, -0.11 - br * 0.014);
  set(p, FR, -0.2 + br * 0.03, 0, 0.05);
  add(p, TL, 0, 0, 0.035 - sw * 0.03);
  add(p, TR, 0, 0, -0.035 - sw * 0.03);
}
function legs(p: P, ph: number, run: boolean, amp = 1) {
  const A = (run ? 0.88 : 0.52) * amp;
  for (const [th, sh, ft, k] of [
    [TL, SL, FTL, 1],
    [TR, SR, FTR, -1],
  ]) {
    const s = sin(ph) * k,
      cv = cos(ph) * k,
      sw = max(0, cv),
      a = -A * s - (run ? 0.2 : 0.05) * amp,
      kn = ((run ? 0.3 : 0.1) + (run ? 1.35 : 0.8) * sw ** 1.3 + (run ? 0.35 : 0.1) * max(0, -s)) * amp;
    set(p, th, a, 0, k * 0.02);
    set(p, sh, kn);
    set(p, ft, -(a + kn) * 0.5 + (run ? 0.1 : 0));
  }
  p[1] += run ? -0.05 + 0.045 * cos(ph * 2) : -LEG * (1 - cos(A * sin(ph))) * 0.85 - 0.01;
}
function loco(run: boolean) {
  return (p: P, c: Ctx) => {
    const s = sin(c.ph),
      A = run ? 0.95 : 0.55,
      lean = run ? 0.17 : 0.05;
    legs(p, c.ph, run);
    set(p, ROOT, lean, 0, 0);
    set(p, HIPS, 0, s * 0.14 * A, cos(c.ph) * 0.03);
    set(p, CHEST, run ? 0.1 : 0.03, -s * 0.26 * A, 0);
    set(p, HEAD, -lean * 0.8, s * 0.1 * A, 0);
    set(p, AL, A * s * (run ? 1.05 : 0.95) + (run ? 0.1 : 0), 0, run ? 0.16 : 0.1);
    set(p, FL, run ? -1.45 + 0.25 * s : -0.3 - 0.25 * max(0, -s));
    set(p, AR, -A * s * (run ? 1.05 : 0.95) + (run ? 0.1 : 0), 0, run ? -0.16 : -0.1);
    set(p, FR, run ? -1.45 - 0.25 * s : -0.3 - 0.25 * max(0, s));
  };
}
function jump(p: P) {
  set(p, TL, -1.05, 0, 0.05);
  set(p, SL, 1.55);
  set(p, FTL, 0.35);
  set(p, TR, -0.2, 0, -0.05);
  set(p, SR, 0.85);
  set(p, FTR, 0.45);
  set(p, AL, -0.6, 0, 2.2);
  set(p, FL, -0.5);
  set(p, AR, -0.6, 0, -2.2);
  set(p, FR, -0.5);
  set(p, CHEST, -0.14);
  set(p, HEAD, -0.16);
  set(p, ROOT, 0.06);
}
function fall(p: P, c: Ctx) {
  const w = sin(c.t * 13);
  set(p, AL, 0.25 * w - 0.2, 0, 1.75 + 0.3 * w);
  set(p, FL, -0.35);
  set(p, AR, -0.25 * w - 0.2, 0, -1.75 + 0.3 * w);
  set(p, FR, -0.35);
  set(p, TL, -0.4 + 0.32 * w, 0, 0.12);
  set(p, SL, 0.7 - 0.25 * w);
  set(p, TR, -0.4 - 0.32 * w, 0, -0.12);
  set(p, SR, 0.7 + 0.25 * w);
  set(p, FTL, 0.3);
  set(p, FTR, 0.3);
  set(p, CHEST, 0.14);
  set(p, HEAD, 0.12);
}
/** punta: cadera y pies rápidos, el torso casi quieto */
function punta(p: P, c: Ctx) {
  const f = c.t * 15,
    h = sin(f),
    g = sin(f * 0.5),
    up = max(0, h),
    dn = max(0, -h);
  bend(p, 0.3);
  p[1] += abs(h) * 0.014;
  set(p, ROOT, 0, sin(c.t * 0.8) * 0.6, 0);
  set(p, HIPS, 0, h * 0.34, h * 0.17);
  set(p, CHEST, 0.05, -h * 0.28, -h * 0.13);
  set(p, HEAD, -0.03, -h * 0.05, g * 0.05);
  add(p, TL, -0.2 * up, 0, -h * 0.17 + 0.09);
  add(p, SL, 0.34 * up);
  add(p, FTL, 0.25 * up);
  add(p, TR, -0.2 * dn, 0, -h * 0.17 - 0.09);
  add(p, SR, 0.34 * dn);
  add(p, FTR, 0.25 * dn);
  set(p, AL, -0.4 + 0.14 * g, 0, 0.8 + 0.12 * cos(f * 0.5));
  set(p, FL, -1.25 + 0.22 * g, 0, -0.2);
  set(p, AR, -0.4 - 0.14 * g, 0, -0.8 + 0.12 * cos(f * 0.5));
  set(p, FR, -1.25 - 0.22 * g, 0, 0.2);
}
/** sique: pasos saltados de lado a lado con las manos en la cintura y una vuelta completa cada tanto */
function sique(p: P, c: Ctx) {
  const f = c.t * 6.2,
    s = sin(f),
    up = max(0, s),
    dn = max(0, -s),
    T = 4.4,
    u = c.t % T,
    turn = sm(3.1, 4.3, u);
  bend(p, 0.1);
  p[1] += abs(s) * 0.07;
  p[0] = sin(f * 0.5) * 0.13;
  set(p, ROOT, 0, turn * PI * 2, 0);
  add(p, TL, -1.0 * up ** 0.8, 0, 0.05);
  add(p, SL, 1.35 * up);
  add(p, FTL, 0.3 * up);
  add(p, TR, -1.0 * dn ** 0.8, 0, -0.05);
  add(p, SR, 1.35 * dn);
  add(p, FTR, 0.3 * dn);
  set(p, HIPS, 0, 0, -s * 0.06);
  set(p, CHEST, 0, s * 0.08, s * 0.09);
  set(p, HEAD, 0, 0, -s * 0.07);
  const r = sm(2.8, 3.2, u) * (1 - sm(4.1, 4.4, u));
  set(p, AL, 0.3, 0, 0.85);
  set(p, FL, 0, 0, -2.05);
  set(p, AR, 0.3 * (1 - r) - 0.2 * r, 0, -0.85 - 1.75 * r);
  set(p, FR, 0, 0, 2.05 * (1 - r) + (0.4 + 0.4 * sin(c.t * 9)) * r);
}
/** celebrar: brincos grandes con las rodillas encogidas y los puños arriba, uno y otro */
function celebrate(p: P, c: Ctx) {
  const f = c.t * 8.5,
    j = sin(f),
    up = max(0, j),
    dn = max(0, -j),
    alt = sin(f * 0.5);
  p[1] += up * 0.42;
  bend(p, 0.08 + dn * 0.5);
  add(p, TL, -0.55 * up, 0, 0.18 * up);
  add(p, SL, 0.95 * up);
  add(p, TR, -0.55 * up, 0, -0.18 * up);
  add(p, SR, 0.95 * up);
  set(p, AL, -0.3, 0, 2.6 + 0.25 * alt);
  set(p, FL, -0.7 * max(0, alt), 0, -0.3);
  set(p, AR, -0.3, 0, -2.6 + 0.25 * alt);
  set(p, FR, -0.7 * max(0, -alt), 0, 0.3);
  set(p, HEAD, -0.34, 0, alt * 0.12);
  set(p, CHEST, -0.18, 0, alt * 0.07);
}
/** saludar: brazo enorme de lado a lado, la otra mano en la cintura y brinquitos de puntillas */
function wave(p: P, c: Ctx) {
  idle(p, c);
  const w = sin(c.t * 10),
    s = sin(c.t * 5);
  p[1] += max(0, s) * 0.07;
  set(p, ROOT, 0, 0, 0.1 + s * 0.05);
  set(p, AR, -0.25, 0, -2.75 - w * 0.25);
  set(p, FR, 0, 0, 0.3 + w * 0.75);
  set(p, AL, 0.3, 0, 0.85);
  set(p, FL, 0, 0, -2.05);
  add(p, HEAD, -0.14, w * 0.08, -0.16);
  add(p, CHEST, -0.06, 0, -0.12);
}
/** aplaudir: brinco por cada aplauso, con las manos arriba de la cabeza */
function clap(p: P, c: Ctx) {
  idle(p, c);
  const h = sin(c.t * 7.5),
    up = max(0, h),
    k = 0.5 + 0.5 * sin(c.t * 15);
  p[1] += up * 0.2;
  bend(p, max(0, -h) * 0.35);
  set(p, AL, -0.15, 0, 2.5 + 0.42 * k);
  set(p, FL, 0, 0, -0.2 - 0.25 * k);
  set(p, AR, -0.15, 0, -2.5 - 0.42 * k);
  set(p, FR, 0, 0, 0.2 + 0.25 * k);
  set(p, HEAD, -0.28, 0, 0);
  set(p, CHEST, -0.12);
}
function kick(p: P, c: Ctx) {
  const u = c.tl % 0.95,
    w = sm(0, 0.1, u) * (1 - sm(0.1, 0.22, u)),
    k = sm(0.1, 0.24, u) * (1 - sm(0.45, 0.68, u));
  set(p, TR, 0.8 * w - 1.4 * k, 0, -0.04);
  set(p, SR, 1.35 * w + 0.12 * k);
  set(p, FTR, -0.35 * k);
  set(p, TL, 0.14 * k - 0.12, 0, 0.05);
  set(p, SL, 0.26);
  set(p, FTL, -0.14 - 0.14 * k);
  p[1] -= 0.012;
  set(p, AL, -0.75 * k + 0.35 * w, 0, 0.45);
  set(p, FL, -0.4);
  set(p, AR, 0.65 * k - 0.3 * w, 0, -0.75);
  set(p, FR, -0.4);
  set(p, CHEST, -0.2 * k + 0.1 * w, 0.28 * k - 0.2 * w, 0);
  set(p, HEAD, 0.12 * k);
  set(p, ROOT, -0.06 * k);
}
function throwA(p: P, c: Ctx) {
  const u = c.tl % 1.1,
    w = sm(0, 0.25, u) * (1 - sm(0.3, 0.42, u)),
    r = sm(0.3, 0.42, u) * (1 - sm(0.62, 0.95, u));
  bend(p, 0.06 + 0.1 * r);
  set(p, AR, -3.2 * w - 1.35 * r, 0, -0.25 * w);
  set(p, FR, -1.3 * w - 0.15 * r);
  set(p, AL, -0.95 * w + 0.4 * r, 0, 0.3);
  set(p, FL, -0.3);
  set(p, CHEST, 0.22 * r - 0.1 * w, -0.45 * w + 0.4 * r, 0);
  set(p, HEAD, 0, 0.2 * w - 0.15 * r, 0);
  add(p, TL, -0.3 * (w * 0.5 + r));
  add(p, SL, 0.25 * r);
  add(p, TR, 0.22 * r);
}
function carry(p: P, c: Ctx) {
  const m = Math.min(1, c.speed / 2);
  if (m > 0.05) {
    legs(p, c.ph, false, m);
    set(p, HIPS, 0, sin(c.ph) * 0.08 * m, 0);
  } else idle(p, c);
  set(p, AL, -1.05, 0, -0.12);
  set(p, FL, -0.62, 0, -0.28);
  set(p, AR, -1.05, 0, 0.12);
  set(p, FR, -0.62, 0, 0.28);
  set(p, CHEST, -0.08, 0, 0);
  set(p, HEAD, 0.04);
}
/** sentado sobre la superficie donde están los pies (banca, asiento, suelo), con las piernas hacia adelante */
function seat(p: P, knee = 0.24) {
  p[1] = -SEAT;
  set(p, TL, -1.5, 0, 0.1);
  set(p, SL, knee);
  set(p, FTL, -0.25);
  set(p, TR, -1.5, 0, -0.1);
  set(p, SR, knee);
  set(p, FTR, -0.25);
}
function drive(p: P, c: Ctx) {
  seat(p, 0.34);
  const st = sin(c.t * 1.3 + c.seed) * 0.16;
  set(p, AL, -1.0 + st, 0, -0.12);
  set(p, FL, -0.42);
  set(p, AR, -1.0 - st, 0, 0.12);
  set(p, FR, -0.42);
  set(p, CHEST, 0.05, 0, st * 0.2);
  set(p, HEAD, -0.03, st * 0.5, 0);
}
function sit(p: P, c: Ctx) {
  seat(p);
  const br = sin(c.t * 1.7 + c.seed),
    sw = sin(c.t * 0.8 + c.seed);
  set(p, AL, 0.5, 0, 0.3);
  set(p, FL, -0.08);
  set(p, AR, 0.5, 0, -0.3);
  set(p, FR, -0.08);
  set(p, ROOT, -0.1);
  set(p, CHEST, -0.04 + br * 0.02);
  set(p, HEAD, 0.1 + sw * 0.04, sin(c.t * 0.4 + c.seed * 2) * 0.25, 0);
  add(p, FTL, sw * 0.12);
  add(p, FTR, -sw * 0.12);
}

/** gol: avioncito con los brazos abiertos, brinco y barrida de rodillas gritando con los puños arriba */
function gol(p: P, c: Ctx) {
  const u = c.tl % 4.2,
    av = 1 - sm(1.55, 1.8, u),
    vu = sm(1.6, 1.8, u) * (1 - sm(1.85, 2.1, u)),
    ro = sm(1.85, 2.1, u) * (1 - sm(3.9, 4.2, u)),
    ph = c.tl * 13,
    sl = sin(ph),
    pu = sin(u * 12),
    bank = sin(u * 5);
  p[1] += av * abs(cos(ph)) * 0.05 + vu * 0.45 - ro * 0.38;
  p[2] += ro * 0.9 * (1 - Math.exp(-max(0, u - 1.9) * 3));
  set(p, ROOT, 0.16 * av, sin(u * 1.6) * 0.9 * av, bank * 0.32 * av);
  set(p, CHEST, 0.08 * av - 0.5 * ro - 0.15 * vu, 0, -bank * 0.1 * av + pu * 0.03 * ro);
  set(p, HEAD, -0.1 * av - 0.5 * ro - 0.3 * vu, 0, -bank * 0.2 * av + sin(u * 20) * 0.05 * ro);
  set(p, AL, -0.3 * ro, 0, 1.45 * av + 2.8 * vu + (2.5 + 0.2 * pu) * ro);
  set(p, FL, -0.9 * max(0, pu) * ro, 0, 0);
  set(p, AR, -0.3 * ro, 0, -1.45 * av - 2.8 * vu - (2.5 - 0.2 * pu) * ro);
  set(p, FR, -0.9 * max(0, -pu) * ro, 0, 0);
  set(p, TL, av * (-0.6 * max(0, sl) - 0.15) - 0.9 * vu + 0.15 * ro, 0, 0.12 * ro);
  set(p, SL, av * (0.3 + 1.2 * max(0, sl)) + 1.5 * vu + 1.65 * ro);
  set(p, FTL, 0.2 * av + 0.5 * ro);
  set(p, TR, av * (-0.6 * max(0, -sl) - 0.15) - 0.9 * vu + 0.15 * ro, 0, -0.12 * ro);
  set(p, SR, av * (0.3 + 1.2 * max(0, -sl)) + 1.5 * vu + 1.65 * ro);
  set(p, FTR, 0.2 * av + 0.5 * ro);
}
/** victoria (oro o nivel nuevo): se agacha, salta altísimo dando una vuelta, cae aplastado y sigue con el puño */
function victoria(p: P, c: Ctx) {
  const v = curvaVictoria(c.tl),
    a = v.agacha,
    f = sm(0.4, 0.5, c.tl) * (1 - sm(1.0, 1.12, c.tl)),
    l = v.luego,
    pump = max(0, sin(c.tl * 9.35));
  bend(p, 0.08 + a * 0.75 + l * 0.06);
  p[1] += v.salto;
  set(p, ROOT, 0, c.tl < 1.05 ? v.vuelta : 0, 0);
  add(p, TL, -0.9 * f, 0, 0.15 * f);
  add(p, SL, 1.5 * f);
  add(p, TR, -0.9 * f, 0, -0.15 * f);
  add(p, SR, 1.5 * f);
  set(p, AL, a * 0.9 - f * 0.2 + l * 0.3, 0, a * 0.25 + f * 2.7 + l * 0.85);
  set(p, FL, -0.2 * a, 0, -2.05 * l);
  set(p, AR, a * 0.9 - f * 0.2 - l * 0.2, 0, -(a * 0.25 + f * 2.7 + l * 2.85));
  set(p, FR, -1.3 * pump * l, 0, 0);
  set(p, CHEST, a * 0.35 - f * 0.22 - l * 0.12, 0, l * 0.06 * pump);
  set(p, HEAD, a * 0.12 - f * 0.38 - l * 0.3);
}
/** choque contra una pared: la cabeza se va para atrás, brazos al aire, una pierna arriba y se tambalea */
function choque(p: P, c: Ctx) {
  const k = curvaChoque(c.tl),
    e = 1 - sm(0.5, 0.75, c.tl),
    w = sin(c.tl * 24) * e;
  bend(p, 0.15 + 0.25 * e);
  p[2] -= 0.3 * sm(0, 0.12, c.tl) * e;
  set(p, ROOT, -0.25 * k - 0.08 * e, 0, w * 0.12);
  set(p, CHEST, -0.35 * k, 0, w * 0.1);
  set(p, HEAD, -0.5 * k + 0.15 * e, w * 0.3, 0);
  set(p, AL, 0.6 * e, 0, 1.2 * e + 0.3 * k);
  set(p, FL, -0.3);
  set(p, AR, 0.6 * e, 0, -1.2 * e - 0.3 * k);
  set(p, FR, -0.3);
  add(p, TL, -0.5 * k);
  add(p, SL, 0.6 * k);
}
/** asombro de una locura: brinco del susto con todo abierto y después carcajada doblado, palmeándose la rodilla */
function asombro(p: P, c: Ctx) {
  const a = curvaAsombro(c.tl),
    s = a.susto,
    r = a.risa,
    q = sin(c.t * 28),
    sl = max(0, sin(c.t * 9));
  bend(p, 0.06 + 0.4 * a.agacha + 0.25 * r);
  p[1] += 0.4 * s + abs(q) * 0.015 * r;
  set(p, ROOT, 0.22 * r - 0.12 * s, 0, 0);
  set(p, CHEST, -0.25 * s + 0.32 * r, q * 0.06 * r, q * 0.05 * r);
  set(p, HEAD, -0.35 * s - 0.3 * r, 0, q * 0.05 * r);
  set(p, AL, -0.4 * s - (0.45 + 0.4 * sl) * r, 0, 2.3 * s + 0.2 * r + 0.11 * (1 - s) * (1 - r));
  set(p, FL, -0.3 * s - 0.35 * r, 0, sin(c.t * 30) * 0.4 * s);
  set(p, AR, -0.4 * s - 0.65 * r, 0, -2.3 * s - 0.15 * r - 0.11 * (1 - s) * (1 - r));
  set(p, FR, -0.3 * s - 1.55 * r, 0, -sin(c.t * 30) * 0.4 * s);
  add(p, TL, -0.25 * s, 0, 0.35 * s);
  add(p, SL, 0.5 * s);
  add(p, TR, -0.25 * s, 0, -0.35 * s);
  add(p, SR, 0.5 * s);
}
/** mareo después de una caída: tambaleo en círculos, cabeza floja, brazos colgando y rodillas de gelatina */
function mareo(p: P, c: Ctx) {
  const a = c.t * 3.1,
    cs = cos(a),
    sn = sin(a);
  bend(p, 0.18 + 0.05 * sn);
  p[0] = cs * 0.06;
  p[2] = sn * 0.04;
  set(p, ROOT, sn * 0.1, 0, cs * 0.12);
  set(p, HIPS, 0, sn * 0.15, -cs * 0.06);
  set(p, CHEST, 0.12 + sn * 0.08, 0, -cs * 0.18);
  set(p, HEAD, 0.15 + cos(a * 1.3) * 0.18, sin(a * 0.9) * 0.4, sin(a * 1.3) * 0.3);
  set(p, AL, sn * 0.3, 0, 0.25 + cs * 0.2);
  set(p, FL, -0.15);
  set(p, AR, -sn * 0.3, 0, -0.25 + cs * 0.2);
  set(p, FR, -0.15);
  add(p, TL, 0, 0, 0.08 * cs);
  add(p, TR, 0, 0, 0.08 * cs);
  add(p, SL, 0.15 * max(0, sn));
  add(p, SR, 0.15 * max(0, -sn));
}

export const POSES: ((p: P, c: Ctx) => void)[] = [
  idle,
  loco(false),
  loco(true),
  jump,
  fall,
  punta,
  sique,
  celebrate,
  wave,
  clap,
  kick,
  throwA,
  carry,
  drive,
  sit,
  gol,
  victoria,
  choque,
  asombro,
  mareo,
];
