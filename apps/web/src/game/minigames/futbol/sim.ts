// Fútbol de barrio: simulación pura (sin three ni React). La escena la avanza con step() y dibuja lo que hay aquí.
// Equipo 0 = el tuyo (ataca hacia -Z, la portería rival está en z = -hl). Equipo 1 = rival (ataca hacia +Z).
// Sin dependencias: también corre en Node para afinar la IA (tools/test-futbol.mjs usa la versión compilada).
export type V3 = [number, number, number];
export type FAnim = 'idle' | 'walk' | 'run' | 'kick' | 'celebrate' | 'jump' | 'clap';
export type Role = 'human' | 'out' | 'gk';
export interface Ent {
  id: number; team: 0 | 1; role: Role;
  x: number; z: number; vx: number; vz: number; yaw: number;
  anim: FAnim; animT: number; kickCd: number; saveCd: number; diveT: number;
  /** objetivo de portero con retraso (reacción) */ gx: number;
}
export interface Ball { p: V3; v: V3; lastTeam: number; lastId: number; noTouchId: number; noTouchT: number; shotAge: number }
export interface Ev { type: 'kick' | 'goal' | 'save' | 'whistle' | 'reset' | 'post' | 'end' | 'whiff'; team?: number; by?: number }
export interface HumanIn { x: number; z: number; vx: number; vz: number; yaw: number; fire: boolean; alt: boolean }
export type MState = 'kickoff' | 'play' | 'goal' | 'over';

export const DEF = {
  /** medio ancho (x) y medio largo (z) de la cancha */ hw: 10, hl: 16,
  /** portería: ancho, alto, fondo */ gw: 5, gh: 2.4, gd: 1.6,
  /** radio de la pelota y de un jugador */ r: 0.3, er: 0.42, ceil: 7,
  grav: 20, rollDec: 2.4, rollDrag: 0.32, airDrag: 0.08, bounce: 0.52, wallBounce: 0.62,
  // tú
  shotSpeed: 21, shotLift: 4.2, kickRange: 1.75, assistAngle: 0.7, assist: 0.75, passMin: 8, passMax: 17,
  // compañero
  mateSpeed: 5.8, mateShoot: 16, mateErr: 0.14, mateRange: 9,
  // rivales
  rivSpeed: 5.7, rivShoot: 17, rivErr: 0.1, rivRange: 10.5, rivPass: 0.3, rivTackle: 0.35, mateTackle: 0.25, poke: 8.5,
  /** con la pelota en los pies corres un poco más lento (lo aplica la escena con player.speedMul) */ carryMul: 0.85,
  // porteros: [tuyo, rival]
  gkSpeed: [3.2, 3.0], gkDive: [1.55, 1.35], gkReact: [0.16, 0.24], gkReach: [0.95, 0.88], gkSave: [0.8, 0.8], gkCover: [0.3, 0.3],
  kickoffFreeze: 1.3, goalPause: 2.8,
};
export type Params = typeof DEF;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const hyp = Math.hypot;

export class Match {
  P: Params; seed: number;
  ents: Ent[] = []; ball: Ball = { p: [0, 0.3, 0], v: [0, 0, 0], lastTeam: -1, lastId: -1, noTouchId: -1, noTouchT: 0, shotAge: 9 };
  score: [number, number] = [0, 0];
  /** segundos que faltan */ clock: number;
  state: MState = 'kickoff'; stateT = 0; kickoffTeam = 0; scorer = -1;
  events: Ev[] = [];
  /** pruebas: congela a la IA (los porteros y jugadores no se mueven ni patean) */ aiOff = false;
  private chaser: [number, number] = [1, 3];
  private stuckT = 0; private stuckX = 0; private stuckZ = 0;
  /** la pelota pasó de los límites alguna vez (no debería): lo revisa la prueba */ escaped = 0;

  constructor(duration: number, seed = 1, params: Partial<Params> = {}) {
    this.P = { ...DEF, ...params }; this.seed = seed >>> 0 || 1; this.clock = duration;
    const mk = (id: number, team: 0 | 1, role: Role): Ent => ({ id, team, role, x: 0, z: 0, vx: 0, vz: 0, yaw: team === 0 ? 0 : Math.PI, anim: 'idle', animT: 0, kickCd: 0, saveCd: 0, diveT: 0, gx: 0 });
    this.ents = [mk(0, 0, 'human'), mk(1, 0, 'out'), mk(2, 0, 'gk'), mk(3, 1, 'out'), mk(4, 1, 'out'), mk(5, 1, 'gk')];
    this.formation(0);
  }
  rnd() { let t = (this.seed += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  /** dónde debe pararse el humano en el saque */ humanSpot(): [number, number] { return this.kickoffTeam === 0 ? [0, 1.5] : [0, 4.5]; }

  /** Coloca a todos para el saque. `team` es quien saca. */
  formation(team: number) {
    const { hl, r } = this.P; this.kickoffTeam = team;
    const set = (i: number, x: number, z: number) => { const e = this.ents[i]; e.x = x; e.z = z; e.vx = e.vz = 0; e.yaw = e.team === 0 ? 0 : Math.PI; e.anim = 'idle'; e.animT = 0; e.kickCd = 0.4; e.saveCd = 0; e.diveT = 0; e.gx = 0; };
    const h = this.humanSpot(); set(0, h[0], h[1]); set(1, 4.5, 5.5); set(2, 0, hl - 0.9);
    const j = () => (this.rnd() - 0.5) * 1.6; // un poco de variación para que cada saque sea distinto
    if (team === 1) { set(3, 0.3, -1.3); set(4, -4.5 + j() * 2, -4.5 + j()); } else { set(3, 1.5 + j(), -4.5 + j()); set(4, -4.5 + j(), -7 + j()); }
    this.ents[1].x += j(); this.ents[1].z += j();
    set(5, 0, -hl + 0.9);
    this.ball = { p: [0, r, 0], v: [0, 0, 0], lastTeam: -1, lastId: -1, noTouchId: -1, noTouchT: 0, shotAge: 9 };
    this.state = 'kickoff'; this.stateT = 0; this.stuckT = 0; this.events.push({ type: 'reset', team });
  }

  /** Avanza la simulación. Devuelve los eventos de este paso (se vacían en el siguiente). */
  step(dt: number, h: HumanIn): Ev[] {
    this.events = [];
    const me = this.ents[0]; me.x = h.x; me.z = h.z; me.vx = h.vx; me.vz = h.vz; me.yaw = h.yaw;
    for (const e of this.ents) { e.kickCd -= dt; e.saveCd -= dt; e.animT -= dt; e.diveT -= dt; }
    this.stateT += dt;
    if (this.state === 'over') { this.idleAll(dt); this.moveBall(dt); return this.events; }
    if (this.state === 'kickoff') {
      this.idleAll(dt);
      if (this.stateT >= this.P.kickoffFreeze) { this.state = 'play'; this.stateT = 0; this.events.push({ type: 'whistle' }); }
      return this.events;
    }
    if (this.state === 'goal') {
      for (const e of this.ents) { if (e.role === 'human') continue; e.vx *= 1 - Math.min(1, dt * 6); e.vz *= 1 - Math.min(1, dt * 6); e.x += e.vx * dt; e.z += e.vz * dt; e.anim = e.team === this.scorer ? 'celebrate' : 'idle'; }
      this.moveBall(dt);
      if (this.stateT >= this.P.goalPause) this.formation(1 - this.scorer);
      return this.events;
    }
    // --- en juego
    this.clock -= dt;
    if (h.fire) this.humanKick(h, false); else if (h.alt) this.humanKick(h, true);
    if (!this.aiOff) { this.pickChasers(); for (const e of this.ents) { if (e.role === 'out') this.thinkOut(e, dt); else if (e.role === 'gk') this.thinkGk(e, dt); } this.separate(); }
    this.moveBall(dt);
    // pelota trabada: si casi no se mueve por un rato, la mandamos al medio
    const b = this.ball;
    if (hyp(b.p[0] - this.stuckX, b.p[2] - this.stuckZ) > 1.2) { this.stuckX = b.p[0]; this.stuckZ = b.p[2]; this.stuckT = 0; }
    else if ((this.stuckT += dt) > 6 && hyp(b.p[0] - me.x, b.p[2] - me.z) > 2.5) { this.stuckT = 0; b.v = [-b.p[0] * 0.6 + (this.rnd() - 0.5) * 4, 5, -b.p[2] * 0.6 + (this.rnd() - 0.5) * 4]; }
    if (this.clock <= 0 && this.state === 'play') { this.clock = 0; this.state = 'over'; this.stateT = 0; this.events.push({ type: 'whistle' }, { type: 'end' }); }
    return this.events;
  }

  private idleAll(dt: number) { for (const e of this.ents) { if (e.role === 'human') continue; e.vx *= 1 - Math.min(1, dt * 8); e.vz *= 1 - Math.min(1, dt * 8); if (e.animT <= 0) e.anim = 'idle'; } }

  // ------------------------------------------------------------------ tú
  private humanKick(h: HumanIn, pass: boolean) {
    const P = this.P, b = this.ball, me = this.ents[0];
    if (me.kickCd > 0) return;
    const d = hyp(b.p[0] - h.x, b.p[2] - h.z);
    if (d > P.kickRange || b.p[1] > 1.5) { this.events.push({ type: 'whiff', by: 0 }); return; }
    let dx = -Math.sin(h.yaw), dz = -Math.cos(h.yaw);
    if (pass) {
      const m = this.ents[1], lead = 0.35, tx = m.x + m.vx * lead - b.p[0], tz = m.z + m.vz * lead - b.p[2], L = hyp(tx, tz) || 1;
      const sp = clamp(5.5 + L * 0.95, P.passMin, P.passMax);
      b.v = [(tx / L) * sp, 1.2, (tz / L) * sp];
    } else {
      // ayuda de puntería: si miras más o menos a la portería rival, el tiro se cierra hacia adentro de los postes
      if (dz < -0.2) {
        const t = (-P.hl - b.p[2]) / dz, xHit = b.p[0] + dx * t;
        const gx = clamp(xHit, -(P.gw / 2 - 0.55), P.gw / 2 - 0.55), ax = gx - b.p[0], az = -P.hl - b.p[2], L = hyp(ax, az) || 1;
        const ang = Math.acos(clamp((ax / L) * dx + (az / L) * dz, -1, 1));
        if (ang < P.assistAngle) { dx += ((ax / L) - dx) * P.assist; dz += ((az / L) - dz) * P.assist; const n = hyp(dx, dz) || 1; dx /= n; dz /= n; }
      }
      const run = clamp((h.vx * dx + h.vz * dz) * 0.12, 0, 1.2);
      b.v = [dx * (P.shotSpeed + run), P.shotLift, dz * (P.shotSpeed + run)];
    }
    b.lastTeam = 0; b.lastId = 0; b.noTouchId = 0; b.noTouchT = 0.28; b.shotAge = 0; me.kickCd = 0.3;
    this.events.push({ type: 'kick', by: 0, team: 0 });
  }

  // ------------------------------------------------------------------ IA de campo
  private pickChasers() {
    const b = this.ball, d = (i: number) => hyp(this.ents[i].x - b.p[0], this.ents[i].z - b.p[2]);
    // rivales: persigue el más cercano (con histéresis para que no se turnen a cada cuadro)
    const cur = this.chaser[1], other = cur === 3 ? 4 : 3;
    if (d(other) + 1.2 < d(cur)) this.chaser[1] = other;
    // tu compañero: te deja la pelota si estás cerca; va él si le queda mejor o si hay que defender
    const dm = d(1), dh = d(0), defend = b.p[2] > 3;
    const go = dm + 1.6 < dh || dh > 7.5 || (defend && dm < dh + 3.5);
    this.chaser[0] = go ? 1 : (this.chaser[0] === 1 && dm < dh ? 1 : 0);
  }
  private thinkOut(e: Ent, dt: number) {
    const P = this.P, b = this.ball, a = e.team === 0 ? -1 : 1, goalZ = a * P.hl, ownZ = -goalZ;
    const maxSp = e.team === 0 ? P.mateSpeed : P.rivSpeed;
    const dBall = hyp(b.p[0] - e.x, b.p[2] - e.z);
    let tx: number, tz: number, sp = maxSp;
    if (this.chaser[e.team] === e.id) {
      const lead = clamp(dBall / (maxSp + 2), 0, 0.55);
      const bx = clamp(b.p[0] + b.v[0] * lead, -P.hw + 0.4, P.hw - 0.4), bz = clamp(b.p[2] + b.v[2] * lead, -P.hl + 0.4, P.hl - 0.4);
      let ux = -bx * 0.6, uz = goalZ - bz; const ul = hyp(ux, uz) || 1; ux /= ul; uz /= ul; // hacia la portería rival
      const rx = bx - e.x, rz = bz - e.z, behind = (rx * ux + rz * uz) / (hyp(rx, rz) || 1);
      if (behind > 0.35) { tx = bx + ux * 0.4; tz = bz + uz * 0.4; }
      else { // rodea la pelota para quedar detrás de ella
        const side = (rx * -uz + rz * ux) > 0 ? -1 : 1, k = dBall < 1.6 ? 1.0 : 0.3;
        tx = bx - ux * 0.75 + -uz * side * k; tz = bz - uz * 0.75 + ux * side * k;
      }
      // patear
      if (dBall < 0.98 && b.p[1] < 0.95 && e.kickCd <= 0) {
        const fx = b.p[0] - e.x, fz = b.p[2] - e.z, fl = hyp(fx, fz) || 1;
        const gx0 = -b.p[0], gz0 = goalZ - b.p[2], dGoal = hyp(gx0, gz0), facing = (fx * gx0 + fz * gz0) / (fl * (dGoal || 1));
        const opp = this.nearestOpp(e), range = e.team === 0 ? P.mateRange : P.rivRange;
        if (dGoal < range && facing > 0.25) {
          const gk = this.ents[e.team === 0 ? 5 : 2], aim = (gk.x > 0 ? -1 : 1) * (1.2 + this.rnd() * 0.8);
          this.aiKick(e, aim, goalZ, e.team === 0 ? P.mateShoot : P.rivShoot, 2.2 + this.rnd() * 2.6, e.team === 0 ? P.mateErr : P.rivErr);
        } else if (opp.d < 2.1) {
          // duelo: pasa, o puntea la pelota para quitársela al rival, o espera un instante
          const q = this.rnd(), m = this.mate(e), ahead = (m.z - e.z) * a > -3, pass = e.team === 0 ? 0.45 : P.rivPass;
          if (q < pass && ahead) { const L = hyp(m.x - b.p[0], m.z - b.p[2]); this.aiKick(e, m.x + m.vx * 0.3, m.z + m.vz * 0.3, clamp(5.5 + L * 0.9, 8, 15), 1, 0.05); }
          else if (q < pass + (e.team === 0 ? P.mateTackle : P.rivTackle)) {
            const side = this.rnd() < 0.5 ? -1 : 1, ang = side * (0.5 + this.rnd() * 0.5), c = Math.cos(ang), sn = Math.sin(ang);
            b.v = [(ux * c - uz * sn) * P.poke, 0.8, (ux * sn + uz * c) * P.poke]; b.lastTeam = e.team; b.lastId = e.id; b.noTouchId = opp.id; b.noTouchT = 0.45; e.kickCd = 0.5;
            this.events.push({ type: 'kick', by: e.id, team: e.team });
          } else e.kickCd = 0.3;
        } else if ((ownZ - b.p[2]) * -a < 5 && facing < 0) { this.aiKick(e, e.x > 0 ? 6 : -6, e.z + a * 9, 12, 4.5, 0.2); } // despeje cerca de su portería
      }
    } else {
      const mine = b.lastTeam === e.team || (b.p[2] - 0) * a > 2;
      if (mine) { const flank = Math.abs(b.p[0]) > 1.5 ? -Math.sign(b.p[0]) : (e.id % 2 ? 1 : -1); tx = flank * 4.6; tz = clamp(b.p[2] + a * 5.5, -P.hl + 3.2, P.hl - 3.2); }
      else { tx = b.p[0] * 0.45; tz = clamp((b.p[2] + ownZ) / 2 + a * 1.5, -P.hl + 2.5, P.hl - 2.5); }
      const dT = hyp(tx - e.x, tz - e.z); sp = dT < 1.2 ? maxSp * dT / 1.2 : maxSp * 0.92;
    }
    this.steer(e, tx, tz, sp, dt);
  }
  private mate(e: Ent): Ent { return e.team === 0 ? this.ents[e.id === 1 ? 0 : 1] : this.ents[e.id === 3 ? 4 : 3]; }
  private nearestOpp(e: Ent) { let d = 99, id = -1; for (const o of this.ents) if (o.team !== e.team && o.role !== 'gk') { const k = hyp(o.x - e.x, o.z - e.z); if (k < d) { d = k; id = o.id; } } return { d, id }; }
  private aiKick(e: Ent, tx: number, tz: number, speed: number, lift: number, err: number) {
    const b = this.ball; let dx = tx - b.p[0], dz = tz - b.p[2]; const L = hyp(dx, dz) || 1; dx /= L; dz /= L;
    const ang = (this.rnd() + this.rnd() - 1) * err * 1.8, c = Math.cos(ang), s = Math.sin(ang);
    b.v = [(dx * c - dz * s) * speed, lift, (dx * s + dz * c) * speed];
    b.lastTeam = e.team; b.lastId = e.id; b.noTouchId = e.id; b.noTouchT = 0.3; b.shotAge = 0;
    e.kickCd = 0.75; e.anim = 'kick'; e.animT = 0.35; e.yaw = Math.atan2(-dx, -dz);
    this.events.push({ type: 'kick', by: e.id, team: e.team });
  }
  private steer(e: Ent, tx: number, tz: number, sp: number, dt: number) {
    const P = this.P; let dx = tx - e.x, dz = tz - e.z; const L = hyp(dx, dz);
    if (L > 0.05) { dx /= L; dz /= L; } else { dx = dz = 0; }
    const k = Math.min(1, dt * 7); e.vx += (dx * sp - e.vx) * k; e.vz += (dz * sp - e.vz) * k;
    e.x = clamp(e.x + e.vx * dt, -P.hw + 0.45, P.hw - 0.45); e.z = clamp(e.z + e.vz * dt, -P.hl + 0.45, P.hl - 0.45);
    const v = hyp(e.vx, e.vz);
    if (v > 0.6) { const t = Math.atan2(-e.vx, -e.vz); let d = t - e.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); e.yaw += d * Math.min(1, dt * 10); }
    if (e.animT <= 0) e.anim = v > 3.6 ? 'run' : v > 0.5 ? 'walk' : 'idle';
  }

  // ------------------------------------------------------------------ porteros
  private thinkGk(e: Ent, dt: number) {
    const P = this.P, b = this.ball, i = e.team, own = e.team === 0 ? P.hl : -P.hl, sgn = Math.sign(own), kz = own - sgn * 0.9;
    const sp = hyp(b.v[0], b.v[2]), toward = b.v[2] * sgn;
    const dzGoal = (own - b.p[2]) * sgn; // distancia de la pelota a su línea
    // se para sobre la línea pelota–portería; cuanto más cerca está la pelota, más cierra el ángulo
    const f = clamp(P.gkCover[i] + 0.5 * (1 - dzGoal / 12), 0.25, 0.85);
    let tx = clamp(b.p[0] * f, -1.9, 1.9), tz = kz, speed = P.gkSpeed[i], dive = false;
    if (toward > 3 && b.shotAge > P.gkReact[i]) {
      const t = (kz - b.p[2]) / b.v[2];
      if (t > 0 && t < 1.4) { tx = clamp(b.p[0] + b.v[0] * t, -(P.gw / 2 - 0.25), P.gw / 2 - 0.25); if (t < 0.7) { speed *= P.gkDive[i]; dive = Math.abs(tx - e.x) > 0.7; } }
    } else if (dzGoal < 4.2 && Math.abs(b.p[0]) < 4.2 && sp < 3.2 && b.p[1] < 1) { tx = b.p[0]; tz = b.p[2]; speed = P.gkSpeed[i] * 1.25; } // sale a despejar
    let dx = tx - e.x, dz = tz - e.z; const L = hyp(dx, dz); if (L > 0.03) { dx /= L; dz /= L; } else dx = dz = 0;
    const v = Math.min(speed, L / Math.max(dt, 1e-3)), k = Math.min(1, dt * 12);
    e.vx += (dx * v - e.vx) * k; e.vz += (dz * v - e.vz) * k; e.x += e.vx * dt; e.z += e.vz * dt;
    e.x = clamp(e.x, -4.4, 4.4); e.z = sgn > 0 ? clamp(e.z, own - 4.6, own - 0.5) : clamp(e.z, own + 0.5, own + 4.6);
    e.yaw = e.team === 0 ? 0 : Math.PI;
    if (dive) e.diveT = 0.3;
    if (e.animT <= 0) e.anim = e.diveT > 0 ? 'jump' : hyp(e.vx, e.vz) > 0.8 ? 'walk' : 'idle';
    // atajar o despejar
    const d = hyp(b.p[0] - e.x, b.p[2] - e.z);
    if (d < P.gkReach[i] + P.r && b.p[1] < 2.15 && e.saveCd <= 0 && !(b.noTouchId === e.id && b.noTouchT > 0)) {
      const a = -sgn; // hacia el campo
      if (sp > 4 && toward > 1.5) {
        e.saveCd = 0.7;
        if (this.rnd() < P.gkSave[i]) { b.v = [(this.rnd() - 0.5) * 11, 2.5 + this.rnd() * 3, a * (7 + this.rnd() * 5)]; b.lastTeam = e.team; b.lastId = e.id; b.shotAge = 9; e.anim = 'jump'; e.animT = 0.4; this.events.push({ type: 'save', by: e.id, team: e.team }); }
        b.noTouchId = e.id; b.noTouchT = 0.35;
      } else if (toward <= 1.5 || sp <= 4) {
        e.saveCd = 0.9; const m = this.ents[e.team === 0 ? 1 : 3 + Math.floor(this.rnd() * 2)];
        this.aiKick(e, m.x + (this.rnd() - 0.5) * 3, m.z + a * 2, 13 + this.rnd() * 3, 5 + this.rnd() * 2, 0.12);
      }
    }
  }
  private separate() {
    const min = this.P.er * 2;
    for (let i = 0; i < this.ents.length; i++) for (let j = i + 1; j < this.ents.length; j++) {
      const A = this.ents[i], B = this.ents[j]; if (A.role === 'gk' && B.role === 'gk') continue;
      let dx = B.x - A.x, dz = B.z - A.z; const d = hyp(dx, dz); if (d >= min) continue;
      if (d < 1e-4) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
      const push = min - d, wa = A.role === 'human' ? 0 : B.role === 'human' ? 1 : 0.5;
      A.x -= dx * push * wa; A.z -= dz * push * wa;
      if (B.role !== 'human') { B.x += dx * push * (1 - wa); B.z += dz * push * (1 - wa); }
    }
  }

  // ------------------------------------------------------------------ pelota
  private moveBall(dt: number) {
    const b = this.ball, sp = hyp(b.v[0], b.v[1], b.v[2]);
    const n = Math.max(1, Math.min(12, Math.ceil((sp * dt) / 0.12))), h = dt / n;
    b.noTouchT -= dt; b.shotAge += dt;
    for (let i = 0; i < n; i++) this.subBall(h);
    if (!(Number.isFinite(b.p[0]) && Number.isFinite(b.p[1]) && Number.isFinite(b.p[2]))) { b.p = [0, 1, 0]; b.v = [0, 0, 0]; this.escaped++; }
  }
  private subBall(h: number) {
    const P = this.P, b = this.ball, p = b.p, v = b.v, r = P.r;
    v[1] -= P.grav * h;
    p[0] += v[0] * h; p[1] += v[1] * h; p[2] += v[2] * h;
    // jugadores: conducir la pelota (el humano va de último: gana los choques)
    if (p[1] - r < 1.15 && this.state !== 'kickoff') for (let i = this.ents.length - 1; i >= 0; i--) {
      const e = this.ents[i]; if (e.role === 'gk' || (b.noTouchId === e.id && b.noTouchT > 0)) continue;
      let dx = p[0] - e.x, dz = p[2] - e.z; const d = hyp(dx, dz), min = P.er + r; if (d >= min) continue;
      if (d < 1e-4) { dx = -Math.sin(e.yaw); dz = -Math.cos(e.yaw); } else { dx /= d; dz /= d; }
      p[0] = e.x + dx * min; p[2] = e.z + dz * min;
      const es = hyp(e.vx, e.vz), rel = (e.vx - v[0]) * dx + (e.vz - v[2]) * dz;
      if (rel > 0) {
        if (es > 1) { v[0] = e.vx * 1.14 + dx * 1.3; v[2] = e.vz * 1.14 + dz * 1.3; if (p[1] > r + 0.05 && v[1] < 0) v[1] *= 0.3; }
        else { const vn = v[0] * dx + v[2] * dz; v[0] -= 1.35 * vn * dx; v[2] -= 1.35 * vn * dz; }
        b.lastTeam = e.team; b.lastId = e.id;
      }
    }
    // suelo
    if (p[1] <= r) {
      p[1] = r; if (v[1] < -1.6) v[1] = -v[1] * P.bounce; else v[1] = 0;
      const s = hyp(v[0], v[2]); if (s > 0) { const ns = Math.max(0, s - (P.rollDec + P.rollDrag * s) * h); v[0] *= ns / s; v[2] *= ns / s; }
    } else { const k = 1 - P.airDrag * h; v[0] *= k; v[2] *= k; }
    if (p[1] > P.ceil - r) { p[1] = P.ceil - r; if (v[1] > 0) v[1] = -v[1] * 0.4; }
    // muros laterales
    if (p[0] > P.hw - r) { p[0] = P.hw - r; if (v[0] > 0) v[0] = -v[0] * P.wallBounce; }
    if (p[0] < -P.hw + r) { p[0] = -P.hw + r; if (v[0] < 0) v[0] = -v[0] * P.wallBounce; }
    // fondos: muro con el hueco de la portería
    for (const sgn of [-1, 1]) {
      const z = p[2] * sgn; if (z < P.hl - r - 0.2) continue;
      const half = P.gw / 2;
      // postes y travesaño
      if (p[1] < P.gh + r) for (const px of [-half, half]) this.hitCircle(0, 2, px, P.hl * sgn, r + 0.09);
      if (Math.abs(p[0]) < half) this.hitCircle(1, 2, P.gh, P.hl * sgn, r + 0.09);
      const zz = p[2] * sgn;
      if (zz <= P.hl) {
        const open = Math.abs(p[0]) < half - 0.02 && p[1] < P.gh - 0.02;
        if (!open && zz > P.hl - r) { p[2] = (P.hl - r) * sgn; if (v[2] * sgn > 0) v[2] = -v[2] * P.wallBounce; }
      } else {
        // dentro de la portería: la red la detiene
        if (Math.abs(p[0]) > half - r) { p[0] = Math.sign(p[0]) * (half - r); v[0] *= -0.2; }
        if (p[1] > P.gh - r) { p[1] = P.gh - r; if (v[1] > 0) v[1] *= -0.2; }
        if (zz > P.hl + P.gd - r) { p[2] = (P.hl + P.gd - r) * sgn; if (v[2] * sgn > 0) v[2] *= -0.15; v[0] *= 0.6; }
        if (this.state === 'play' && zz > P.hl + r) this.goal(sgn < 0 ? 0 : 1);
      }
    }
    // red de seguridad: nunca sale de la cancha
    const maxZ = P.hl + P.gd;
    if (Math.abs(p[0]) > P.hw || Math.abs(p[2]) > maxZ || p[1] < 0 || p[1] > P.ceil) { this.escaped++; p[0] = clamp(p[0], -P.hw + r, P.hw - r); p[2] = clamp(p[2], -maxZ + r, maxZ - r); p[1] = clamp(p[1], r, P.ceil - r); }
    if (Math.abs(p[2]) > P.hl && Math.abs(p[0]) > P.gw / 2) { p[2] = Math.sign(p[2]) * (P.hl - r); v[2] *= -0.5; }
  }
  /** Rebote contra un círculo en el plano de los ejes (a, c): postes (x, z) y travesaño (y, z). */
  private hitCircle(a: 0 | 1, c: 2, ca: number, cc: number, rad: number) {
    const b = this.ball, p = b.p, v = b.v; let da = p[a] - ca, dc = p[c] - cc; const d = hyp(da, dc);
    if (d >= rad || d < 1e-5) return; da /= d; dc /= d;
    p[a] = ca + da * rad; p[c] = cc + dc * rad;
    const vn = v[a] * da + v[c] * dc; if (vn < 0) { v[a] -= 1.6 * vn * da; v[c] -= 1.6 * vn * dc; if (Math.abs(vn) > 3) this.events.push({ type: 'post' }); }
  }
  private goal(team: number) {
    this.score[team]++; this.scorer = team; this.state = 'goal'; this.stateT = 0;
    this.events.push({ type: 'goal', team, by: this.ball.lastId });
  }
}
