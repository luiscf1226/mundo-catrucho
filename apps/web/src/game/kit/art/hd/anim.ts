// Animación procedural del avatar HD. Cada animación es una función que escribe una POSE (ángulos de Euler por
// hueso + desplazamiento de la raíz) a partir del tiempo; el avatar mezcla poses con pesos suavizados, así que
// pasar de una animación a otra nunca da saltos.
import type { Anim } from '../../../../core/types';
import { B, LEG } from './avatarGeo';

/** 3 de posición de la raíz + 3 ángulos por cada uno de los 14 huesos animados */
export const PN = 3 + 14 * 3;
export const ANIMS: Anim[] = ['idle', 'walk', 'run', 'jump', 'fall', 'dance', 'dance2', 'celebrate', 'wave', 'clap', 'kick', 'throw', 'carry', 'drive', 'sit'];
export interface Ctx { /** tiempo global */ t: number; /** tiempo desde que empezó la animación */ tl: number; /** fase del paso */ ph: number; speed: number; seed: number }
type P = Float32Array;

const { root: ROOT, hips: HIPS, chest: CHEST, head: HEAD, armL: AL, foreL: FL, armR: AR, foreR: FR, thighL: TL, shinL: SL, footL: FTL, thighR: TR, shinR: SR, footR: FTR } = B;
const set = (p: P, b: number, x: number, y = 0, z = 0) => { const o = 3 + b * 3; p[o] = x; p[o + 1] = y; p[o + 2] = z; };
const add = (p: P, b: number, x: number, y = 0, z = 0) => { const o = 3 + b * 3; p[o] += x; p[o + 1] += y; p[o + 2] += z; };
const sm = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const { sin, cos, abs, max, PI } = Math;
/** flexiona las dos rodillas y baja la cadera lo justo para que los pies sigan en el suelo */
function bend(p: P, a: number) { add(p, TL, -a); add(p, SL, 2 * a); add(p, FTL, -a); add(p, TR, -a); add(p, SR, 2 * a); add(p, FTR, -a); p[1] -= LEG * (1 - cos(a)); }

function idle(p: P, c: Ctx) {
  const t = c.t, s = c.seed, br = sin(t * 1.7 + s), sw = sin(t * 0.55 + s * 2);
  bend(p, 0.05 + br * 0.012); p[0] = sw * 0.012;
  set(p, HIPS, 0, 0, sw * 0.03); set(p, CHEST, br * 0.022 - 0.01, 0, -sw * 0.04); set(p, HEAD, sin(t * 0.9 + s) * 0.03, sin(t * 0.37 + s * 3) * 0.16, sw * 0.02);
  set(p, AL, br * 0.03, 0, 0.11 + br * 0.014); set(p, FL, -0.2 - br * 0.03, 0, -0.05); set(p, AR, -br * 0.03, 0, -0.11 - br * 0.014); set(p, FR, -0.2 + br * 0.03, 0, 0.05);
  add(p, TL, 0, 0, 0.035 - sw * 0.03); add(p, TR, 0, 0, -0.035 - sw * 0.03);
}
function legs(p: P, ph: number, run: boolean, amp = 1) {
  const A = (run ? 0.88 : 0.52) * amp;
  for (const [th, sh, ft, k] of [[TL, SL, FTL, 1], [TR, SR, FTR, -1]]) {
    const s = sin(ph) * k, cv = cos(ph) * k, sw = max(0, cv), a = -A * s - (run ? 0.2 : 0.05) * amp, kn = ((run ? 0.3 : 0.1) + (run ? 1.35 : 0.8) * sw ** 1.3 + (run ? 0.35 : 0.1) * max(0, -s)) * amp;
    set(p, th, a, 0, k * 0.02); set(p, sh, kn); set(p, ft, -(a + kn) * 0.5 + (run ? 0.1 : 0));
  }
  p[1] += run ? -0.05 + 0.045 * cos(ph * 2) : -LEG * (1 - cos(A * sin(ph))) * 0.85 - 0.01;
}
function loco(run: boolean) {
  return (p: P, c: Ctx) => {
    const s = sin(c.ph), A = run ? 0.95 : 0.55, lean = run ? 0.17 : 0.05;
    legs(p, c.ph, run);
    set(p, ROOT, lean, 0, 0); set(p, HIPS, 0, s * 0.14 * A, cos(c.ph) * 0.03); set(p, CHEST, run ? 0.1 : 0.03, -s * 0.26 * A, 0); set(p, HEAD, -lean * 0.8, s * 0.1 * A, 0);
    set(p, AL, A * s * (run ? 1.05 : 0.95) + (run ? 0.1 : 0), 0, run ? 0.16 : 0.1); set(p, FL, run ? -1.45 + 0.25 * s : -0.3 - 0.25 * max(0, -s)); set(p, AR, -A * s * (run ? 1.05 : 0.95) + (run ? 0.1 : 0), 0, run ? -0.16 : -0.1); set(p, FR, run ? -1.45 - 0.25 * s : -0.3 - 0.25 * max(0, s));
  };
}
function jump(p: P) {
  set(p, TL, -1.05, 0, 0.05); set(p, SL, 1.55); set(p, FTL, 0.35); set(p, TR, -0.2, 0, -0.05); set(p, SR, 0.85); set(p, FTR, 0.45);
  set(p, AL, -0.6, 0, 2.2); set(p, FL, -0.5); set(p, AR, -0.6, 0, -2.2); set(p, FR, -0.5); set(p, CHEST, -0.14); set(p, HEAD, -0.16); set(p, ROOT, 0.06);
}
function fall(p: P, c: Ctx) {
  const w = sin(c.t * 13);
  set(p, AL, 0.25 * w - 0.2, 0, 1.75 + 0.3 * w); set(p, FL, -0.35); set(p, AR, -0.25 * w - 0.2, 0, -1.75 + 0.3 * w); set(p, FR, -0.35);
  set(p, TL, -0.4 + 0.32 * w, 0, 0.12); set(p, SL, 0.7 - 0.25 * w); set(p, TR, -0.4 - 0.32 * w, 0, -0.12); set(p, SR, 0.7 + 0.25 * w); set(p, FTL, 0.3); set(p, FTR, 0.3);
  set(p, CHEST, 0.14); set(p, HEAD, 0.12);
}
/** punta: cadera y pies rápidos, el torso casi quieto */
function punta(p: P, c: Ctx) {
  const f = c.t * 15, h = sin(f), g = sin(f * 0.5), up = max(0, h), dn = max(0, -h);
  bend(p, 0.3); p[1] += abs(h) * 0.014; set(p, ROOT, 0, sin(c.t * 0.8) * 0.6, 0);
  set(p, HIPS, 0, h * 0.34, h * 0.17); set(p, CHEST, 0.05, -h * 0.28, -h * 0.13); set(p, HEAD, -0.03, -h * 0.05, g * 0.05);
  add(p, TL, -0.2 * up, 0, -h * 0.17 + 0.09); add(p, SL, 0.34 * up); add(p, FTL, 0.25 * up); add(p, TR, -0.2 * dn, 0, -h * 0.17 - 0.09); add(p, SR, 0.34 * dn); add(p, FTR, 0.25 * dn);
  set(p, AL, -0.4 + 0.14 * g, 0, 0.8 + 0.12 * cos(f * 0.5)); set(p, FL, -1.25 + 0.22 * g, 0, -0.2); set(p, AR, -0.4 - 0.14 * g, 0, -0.8 + 0.12 * cos(f * 0.5)); set(p, FR, -1.25 - 0.22 * g, 0, 0.2);
}
/** sique: pasos saltados de lado a lado con las manos en la cintura y una vuelta completa cada tanto */
function sique(p: P, c: Ctx) {
  const f = c.t * 6.2, s = sin(f), up = max(0, s), dn = max(0, -s), T = 4.4, u = c.t % T, turn = sm(3.1, 4.3, u);
  bend(p, 0.1); p[1] += abs(s) * 0.07; p[0] = sin(f * 0.5) * 0.13; set(p, ROOT, 0, turn * PI * 2, 0);
  add(p, TL, -1.0 * up ** 0.8, 0, 0.05); add(p, SL, 1.35 * up); add(p, FTL, 0.3 * up); add(p, TR, -1.0 * dn ** 0.8, 0, -0.05); add(p, SR, 1.35 * dn); add(p, FTR, 0.3 * dn);
  set(p, HIPS, 0, 0, -s * 0.06); set(p, CHEST, 0, s * 0.08, s * 0.09); set(p, HEAD, 0, 0, -s * 0.07);
  const r = sm(2.8, 3.2, u) * (1 - sm(4.1, 4.4, u));
  set(p, AL, 0.3, 0, 0.85); set(p, FL, 0, 0, -2.05); set(p, AR, 0.3 * (1 - r) - 0.2 * r, 0, -0.85 - 1.75 * r); set(p, FR, 0, 0, 2.05 * (1 - r) + (0.4 + 0.4 * sin(c.t * 9)) * r);
}
function celebrate(p: P, c: Ctx) {
  const f = c.t * 8.5, j = sin(f), up = max(0, j), dn = max(0, -j);
  p[1] += up * 0.26; bend(p, 0.08 + dn * 0.38);
  set(p, AL, -0.2, 0, 2.55 + 0.2 * sin(f * 2)); set(p, FL, 0, 0, -0.3); set(p, AR, -0.2, 0, -2.55 - 0.2 * sin(f * 2)); set(p, FR, 0, 0, 0.3);
  set(p, HEAD, -0.22); set(p, CHEST, -0.1); add(p, TL, 0, 0, 0.14 * up); add(p, TR, 0, 0, -0.14 * up);
}
function wave(p: P, c: Ctx) { idle(p, c); set(p, AR, -0.15, 0, -2.45); set(p, FR, 0, 0, 0.45 + sin(c.t * 10) * 0.42); add(p, HEAD, 0, 0, -0.08); add(p, CHEST, 0, 0, -0.04); }
function clap(p: P, c: Ctx) {
  idle(p, c); const k = 0.5 + 0.5 * sin(c.t * 15);
  set(p, AL, -0.9, 0, -0.08 - 0.16 * k); set(p, FL, -0.78, 0, -0.05 - 0.32 * k); set(p, AR, -0.9, 0, 0.08 + 0.16 * k); set(p, FR, -0.78, 0, 0.05 + 0.32 * k); add(p, CHEST, 0.04); p[1] += k * 0.008;
}
function kick(p: P, c: Ctx) {
  const u = c.tl % 0.95, w = sm(0, 0.1, u) * (1 - sm(0.1, 0.22, u)), k = sm(0.1, 0.24, u) * (1 - sm(0.45, 0.68, u));
  set(p, TR, 0.8 * w - 1.4 * k, 0, -0.04); set(p, SR, 1.35 * w + 0.12 * k); set(p, FTR, -0.35 * k);
  set(p, TL, 0.14 * k - 0.12, 0, 0.05); set(p, SL, 0.26); set(p, FTL, -0.14 - 0.14 * k); p[1] -= 0.012;
  set(p, AL, -0.75 * k + 0.35 * w, 0, 0.45); set(p, FL, -0.4); set(p, AR, 0.65 * k - 0.3 * w, 0, -0.75); set(p, FR, -0.4);
  set(p, CHEST, -0.2 * k + 0.1 * w, 0.28 * k - 0.2 * w, 0); set(p, HEAD, 0.12 * k); set(p, ROOT, -0.06 * k);
}
function throwA(p: P, c: Ctx) {
  const u = c.tl % 1.1, w = sm(0, 0.25, u) * (1 - sm(0.3, 0.42, u)), r = sm(0.3, 0.42, u) * (1 - sm(0.62, 0.95, u));
  bend(p, 0.06 + 0.1 * r);
  set(p, AR, -3.2 * w - 1.35 * r, 0, -0.25 * w); set(p, FR, -1.3 * w - 0.15 * r); set(p, AL, -0.95 * w + 0.4 * r, 0, 0.3); set(p, FL, -0.3);
  set(p, CHEST, 0.22 * r - 0.1 * w, -0.45 * w + 0.4 * r, 0); set(p, HEAD, 0, 0.2 * w - 0.15 * r, 0);
  add(p, TL, -0.3 * (w * 0.5 + r)); add(p, SL, 0.25 * r); add(p, TR, 0.22 * r);
}
function carry(p: P, c: Ctx) {
  const m = Math.min(1, c.speed / 2);
  if (m > 0.05) { legs(p, c.ph, false, m); set(p, HIPS, 0, sin(c.ph) * 0.08 * m, 0); } else idle(p, c);
  set(p, AL, -1.05, 0, -0.12); set(p, FL, -0.62, 0, -0.28); set(p, AR, -1.05, 0, 0.12); set(p, FR, -0.62, 0, 0.28); set(p, CHEST, -0.08, 0, 0); set(p, HEAD, 0.04);
}
/** sentado sobre la superficie donde están los pies (banca, asiento, suelo), con las piernas hacia adelante */
function seat(p: P, knee = 0.24) { p[1] = -0.69; set(p, TL, -1.5, 0, 0.1); set(p, SL, knee); set(p, FTL, -0.25); set(p, TR, -1.5, 0, -0.1); set(p, SR, knee); set(p, FTR, -0.25); }
function drive(p: P, c: Ctx) { seat(p, 0.34); const st = sin(c.t * 1.3 + c.seed) * 0.16; set(p, AL, -1.0 + st, 0, -0.12); set(p, FL, -0.42); set(p, AR, -1.0 - st, 0, 0.12); set(p, FR, -0.42); set(p, CHEST, 0.05, 0, st * 0.2); set(p, HEAD, -0.03, st * 0.5, 0); }
function sit(p: P, c: Ctx) { seat(p); const br = sin(c.t * 1.7 + c.seed), sw = sin(c.t * 0.8 + c.seed); set(p, AL, 0.5, 0, 0.3); set(p, FL, -0.08); set(p, AR, 0.5, 0, -0.3); set(p, FR, -0.08); set(p, ROOT, -0.1); set(p, CHEST, -0.04 + br * 0.02); set(p, HEAD, 0.1 + sw * 0.04, sin(c.t * 0.4 + c.seed * 2) * 0.25, 0); add(p, FTL, sw * 0.12); add(p, FTR, -sw * 0.12); }

export const POSES: ((p: P, c: Ctx) => void)[] = [idle, loco(false), loco(true), jump, fall, punta, sique, celebrate, wave, clap, kick, throwA, carry, drive, sit];
