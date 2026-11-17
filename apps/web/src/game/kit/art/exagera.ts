// Exageración de caricatura para los dos avatares (hd y roblox): aplastar y estirar (squash & stretch), el golpe al
// aterrizar después de una caída y el mareo que queda. Todo es visual: no toca la física, el cuerpo ni la colisión.
// El avatar lo lee en cada cuadro, escala el grupo del muñeco (pivote en los pies) y cambia 'idle' por 'mareo'
// mientras le dura el golpe. Así también los demás jugadores y los bots se aplastan al caer, sin mandar nada por red.
import * as THREE from 'three';
import type { Anim } from '../../../core/types';
import { textTexture } from '../core';

const { sin, cos, exp, max, min, PI } = Math;
export const sm = (a: number, b: number, x: number) => {
  const t = max(0, min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** resorte amortiguado: 1 al empezar, rebota y se apaga */
const resorte = (u: number, f: number, d: number) => (u < 0 ? 0 : exp(-u * d) * cos(u * f));

/** Brinco de celebración: altura 0..1 (los dos avatares lo usan para que el aplastado caiga con el pie en el suelo). */
export const brinco = (t: number) => max(0, sin(t * 8.5));

/**
 * Curva de la victoria (oro, subir de nivel): agacharse (anticipación), salto enorme con vuelta completa,
 * aterrizaje aplastado y después brincos con el puño arriba.
 */
export function victoria(tl: number) {
  const agacha = sm(0, 0.32, tl) * (1 - sm(0.36, 0.46, tl)),
    vuelo = tl > 0.42 && tl < 1.12 ? sin(((tl - 0.42) / 0.7) * PI) : 0,
    vuelta = sm(0.45, 1.05, tl) * PI * 2,
    luego = tl > 1.3 ? brinco(tl * 1.1) : 0;
  return { agacha, salto: vuelo * 1.05 + luego * 0.22, vuelta, luego: sm(1.15, 1.4, tl) };
}
/** Golpe contra una pared: 1 al chocar y se suelta en un resorte. */
export const choque = (tl: number) => resorte(tl, 22, 5);
/** Asombro de una locura: brinco del susto (0..1) y después carcajada (0..1). */
export function asombro(tl: number) {
  const susto = sm(0.06, 0.2, tl) * (1 - sm(0.42, 0.62, tl)),
    risa = sm(0.55, 0.85, tl);
  return { agacha: sm(0, 0.08, tl) * (1 - sm(0.08, 0.14, tl)), susto, risa };
}

export type Icono = '' | '💫' | '❗' | '⭐';

export class Exagera {
  /** escala del muñeco: x a lo ancho, y alto, z de frente */
  sx = 1;
  sy = 1;
  sz = 1;
  /** animación que de verdad se ve (puede ser 'mareo' en vez de 'idle') */
  vis: Anim = 'idle';
  /** segundos desde que empezó `vis` */
  tl = 0;
  icono: Icono = '';
  /** fuerza del último aterrizaje (0..1) y cuándo fue */
  golpe = 0;
  tGolpe = -99;
  private t0 = 0;
  private aire = 0;
  private prev: Anim = 'idle';
  private mareoHasta = -1;
  /** tiempo que llevó cayendo antes del último aterrizaje (para las pruebas) */
  caida = 0;

  update(anim: Anim, t: number, dt: number): Anim {
    // --- caídas: cuánto tiempo bajó y con qué fuerza toca el suelo
    const enAire = anim === 'fall' || anim === 'jump',
      estaba = this.prev === 'fall' || this.prev === 'jump';
    if (enAire && !estaba) this.aire = 0;
    if (anim === 'fall') this.aire += dt;
    else if (!enAire && estaba) {
      this.caida = this.aire;
      this.golpe = min(1, max(0.12, (this.aire - 0.12) / 0.75));
      this.tGolpe = t;
      if (this.aire > 0.8) this.mareoHasta = t + 1.7;
    }
    this.prev = anim;
    // mareo: solo si se queda quieto; caminar o hacer otra cosa lo quita
    if (anim !== 'idle' && anim !== 'mareo') this.mareoHasta = -1;
    const vis: Anim = anim === 'idle' && t < this.mareoHasta ? 'mareo' : anim;
    if (vis !== this.vis) {
      this.vis = vis;
      this.t0 = t;
    }
    const tl = (this.tl = t - this.t0);

    // --- aplastar y estirar
    let sy = 1,
      ancho = 0,
      sz = 1;
    const u = t - this.tGolpe;
    if (u < 1.4) {
      const g = this.golpe * resorte(u, 17, 5.5);
      sy -= 0.44 * g;
    }
    switch (vis) {
      case 'jump':
        sy += 0.2 * exp(-tl * 5);
        break;
      case 'fall':
        sy += min(0.14, this.aire * 0.14);
        break;
      case 'celebrate': {
        // estira al subir, se aplasta al tocar el suelo
        const b = brinco(t),
          suelo = 1 - sm(0, 0.25, b);
        sy += 0.16 * b - 0.2 * suelo * max(0, -sin(t * 8.5));
        break;
      }
      case 'victoria': {
        const v = victoria(tl);
        sy += -0.3 * v.agacha + 0.32 * sm(0.4, 0.5, tl) * (1 - sm(0.6, 0.95, tl));
        const aterriza = tl - 1.12;
        if (aterriza > 0) sy -= 0.34 * resorte(aterriza, 17, 5);
        if (v.luego) sy += 0.1 * v.luego * sin(tl * 9.35);
        break;
      }
      case 'choque': {
        const c = choque(tl);
        sz -= 0.42 * c;
        sy += 0.1 * c;
        ancho += 0.22 * c;
        break;
      }
      case 'asombro': {
        const a = asombro(tl);
        sy += -0.16 * a.agacha + 0.26 * a.susto + 0.05 * a.risa * sin(t * 28);
        break;
      }
      case 'mareo':
        sy += 0.05 * sin(t * 3.1);
        ancho += 0.04 * sin(t * 2.3);
        break;
      case 'gol': {
        const ciclo = tl % 4.2;
        sy += 0.12 * sm(1.7, 1.85, ciclo) * (1 - sm(1.85, 2.1, ciclo)) - 0.1 * resorte(ciclo - 2.1, 15, 6);
        break;
      }
      case 'wave':
        sy += 0.06 * sin(t * 10);
        break;
      case 'clap':
        sy += 0.1 * max(0, sin(t * 7.5)) - 0.06 * max(0, -sin(t * 7.5));
        break;
      case 'dance':
        sy += 0.05 * sin(t * 15);
        break;
      case 'dance2':
        sy += 0.08 * sin(t * 12.4);
        break;
      default:
    }
    // conserva el volumen: lo que baja de alto se va a lo ancho
    const k = 1 / Math.sqrt(max(0.4, sy));
    this.sy = sy;
    this.sx = k + ancho;
    this.sz = sz * k;
    this.icono =
      vis === 'mareo' || (vis === 'choque' && tl > 0.12)
        ? '💫'
        : vis === 'asombro' && tl < 1.1
          ? '❗'
          : vis === 'victoria'
            ? '⭐'
            : '';
    return vis;
  }
}

/**
 * El globito de caricatura (💫 que da vueltas, ❗ del susto, ⭐ de la victoria). Va pegado al hueso de la cabeza y
 * solo se dibuja mientras hay icono: una llamada de dibujo más, nada más, y solo un ratito.
 */
export class Globito {
  readonly sprite: THREE.Sprite;
  private readonly mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
  private cur = '';
  /** alto: distancia del hueso de la cabeza a la coronilla */
  constructor(private readonly alto: number) {
    this.sprite = new THREE.Sprite(this.mat);
    this.sprite.visible = false;
    this.sprite.renderOrder = 3;
    this.sprite.name = 'globito';
  }
  update(ex: Exagera, t: number) {
    const ic = ex.icono,
      sp = this.sprite;
    if (ic !== this.cur) {
      this.cur = ic;
      if (ic) {
        const tx = textTexture(ic, { size: 64, pad: 0.15 }) as THREE.CanvasTexture & { aspect?: number };
        this.mat.map = tx;
        this.mat.needsUpdate = true;
        sp.scale.set(0.34 * (tx.aspect ?? 1), 0.34, 1);
      }
    }
    sp.visible = ic !== '';
    if (!ic) return;
    if (ic === '💫') sp.position.set(cos(t * 7) * 0.36, this.alto - 0.18, sin(t * 7) * 0.36);
    else sp.position.set(0, this.alto + 0.12 + Math.abs(sin(t * 9)) * 0.08, 0);
  }
  dispose() {
    this.mat.dispose();
  }
}
