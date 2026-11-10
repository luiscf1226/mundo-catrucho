// Audio 100 % generado con Web Audio (sin archivos): música original por pistas y efectos sintetizados.
// Grafo:  voces → pista (seco / con eco) → bus de música → filtro suave ┐
//                                        efectos → bus de efectos ──────┴→ maestro → compresor → salida
// La música usa un planificador con anticipación (se programan las notas ~0.25 s antes de sonar) y está inspirada en
// ritmos hondureños: punta garífuna (tambor segunda + primero, maracas, caracol y marimba que se contestan) para el
// lobby y la feria, 6/8 tranquilo de marimba y guitarra para el menú y los departamentos, etc.
// Nunca lanza errores: si el navegador no tiene AudioContext, todo queda en silencio.
import { useGame } from './store';

export type Sfx =
  | 'click'
  | 'coin'
  | 'jump'
  | 'land'
  | 'step'
  | 'win'
  | 'lose'
  | 'star'
  | 'kick'
  | 'goal'
  | 'hit'
  | 'miss'
  | 'throw'
  | 'pickup'
  | 'buy'
  | 'error'
  | 'levelup'
  | 'whistle'
  | 'portal'
  | 'countdown'
  | 'go'
  | 'splash'
  | 'horn'
  | 'engine';
export type Track =
  | 'menu'
  | 'lobby'
  | 'carrera'
  | 'futbol'
  | 'feria'
  | 'exploradores'
  | 'pulperia'
  | 'dept'
  | 'viajePunta'
  | 'viajeDembow'
  | 'viajeTrap'
  | 'viajeBanda'
  | 'none';
export const SFX_NAMES: Sfx[] = [
  'click',
  'coin',
  'jump',
  'land',
  'step',
  'win',
  'lose',
  'star',
  'kick',
  'goal',
  'hit',
  'miss',
  'throw',
  'pickup',
  'buy',
  'error',
  'levelup',
  'whistle',
  'portal',
  'countdown',
  'go',
  'splash',
  'horn',
  'engine',
];
export const TRACKS: Track[] = [
  'menu',
  'lobby',
  'carrera',
  'futbol',
  'feria',
  'exploradores',
  'pulperia',
  'dept',
  'viajePunta',
  'viajeDembow',
  'viajeTrap',
  'viajeBanda',
];

// ------------------------------------------------------------------ canciones
// Patrones: una cadena por compás, un carácter por paso. '.' = silencio, '-' = sostiene la nota anterior.
// mar/con: grado de la escala (0 = tónica, 7 = octava, a = 10…). plk/bas: nota del acorde (0 raíz, 1 tercera, 2 quinta, 3 octava).
// Tambores: 'x' golpe, 'X' acento.
interface Song {
  bpm: number /** pasos por pulso */;
  spb: number /** pasos por compás */;
  len: number;
  /** tónica (MIDI, octava 3) */ root: number;
  minor?: boolean;
  /** grado del acorde de cada compás; define el largo del ciclo */ chords: number[];
  mar?: string[];
  con?: string[];
  plk?: string[];
  bas?: string[];
  seg?: string[];
  pri?: string[];
  shk?: string[];
  clv?: string[];
  kik?: string[];
  snr?: string[];
  /** volumen relativo de la pista */ vol?: number;
}
const SONGS: Record<Exclude<Track, 'none'>, Song> = {
  viajePunta: {
    bpm: 148,
    spb: 4,
    len: 16,
    root: 50,
    vol: 1.25,
    chords: [0, 3, 5, 4],
    seg: ['X..x..x.X..x..x.'],
    pri: ['..xx.x.xx.x..xxx'],
    shk: ['xxXxxxXxxxXxxxXx'],
    bas: ['0..0..2.0...2.1.'],
    mar: ['0.4.2.7.5.4.2...', '5.7.9.7.5.3.5...'],
    con: ['', '7---5---4-------'],
  },
  viajeDembow: {
    bpm: 100,
    spb: 4,
    len: 16,
    root: 45,
    minor: true,
    vol: 1.1,
    chords: [0, 5, 3, 4],
    kik: ['X.....x.X.......'],
    snr: ['....x..x....x..x'],
    shk: ['..x...x...x...xx'],
    bas: ['0---..0.2---..2.'],
    plk: ['..1...2...1...2.'],
    mar: ['7...4.5...2.4...', '5...2.4...0.....'],
  },
  viajeTrap: {
    bpm: 138,
    spb: 4,
    len: 16,
    root: 41,
    minor: true,
    vol: 0.65,
    chords: [0, 0, 5, 3],
    kik: ['X.......x..x....'],
    snr: ['........X.......'],
    shk: ['x.x.x.x.x.x.xxxx', 'x.x.xxxx..x.x.xx'],
    bas: ['0-------2---0---'],
    mar: ['7.......4...2...', '5.......2...0...'],
  },
  viajeBanda: {
    bpm: 118,
    spb: 3,
    len: 6,
    root: 46,
    vol: 0.8,
    chords: [0, 3, 4, 0],
    bas: ['0..2..'],
    snr: ['.xx.xx'],
    kik: ['X..x..'],
    con: ['4-7-4-', '5-9-5-', '6-8-4-', '7-4-0-'],
    mar: ['0.2.4.', '3.5.7.', '4.6.8.', '7.4.0.'],
  },
  // 6/8 tranquilo: guitarra punteada en arpegios + marimba espaciada. Do mayor.
  menu: {
    bpm: 80,
    spb: 3,
    len: 6,
    root: 48,
    vol: 0.9,
    chords: [0, 0, 5, 5, 3, 3, 4, 4, 0, 0, 5, 5, 3, 4, 0, 0],
    plk: ['012321', '013231'],
    bas: ['0.....', '0..2..'],
    shk: ['...x..', '...x.x'],
    mar: [
      '4..5..',
      '7.....',
      '7..5..',
      '4.....',
      '5..4..',
      '2..0..',
      '1..2..',
      '4.....',
      '4..5..',
      '7..9..',
      '7..5..',
      '4..2..',
      '0..2..',
      '1..4..',
      '0.....',
      '......',
    ],
  },
  // Punta garífuna a tiempo medio, Re mayor. El caracol llama (compases pares) y la marimba contesta (impares).
  lobby: {
    bpm: 120,
    spb: 4,
    len: 16,
    root: 50,
    chords: [0, 0, 3, 4, 0, 5, 3, 4],
    seg: ['X..x..x.X..x..x.'],
    pri: ['..x..x.x..x.xx.x', '..x..x.x.xx.x.xx'],
    shk: ['x.Xxx.Xxx.Xxx.Xx'],
    clv: ['x..x..x...x.x...'],
    bas: ['0.....2.0..0..2.', '0.....2.0..2.1..'],
    con: ['4---2---4-5-4---', '', '5---3---5-7-5---', '', '4---2---4-5-7---', '', '5---3-5-7---5---', ''],
    mar: ['', '2.4.5.4.2.1.0...', '', '4.5.7.5.4.2.4...', '', '7.5.4.5.7.9.7...', '', '4.2.1.2.4...1.1.'],
  },
  // Punta más rápida y brillante para la feria, Fa mayor, con más maracas y la marimba al frente.
  feria: {
    bpm: 132,
    spb: 4,
    len: 16,
    root: 53,
    chords: [0, 3, 4, 0, 0, 3, 4, 0],
    seg: ['X..x..x.X..x..x.'],
    pri: ['x.x..x.xx.x.xx.x', '..xx.x.x.xx.x.xx'],
    shk: ['xxXxxxXxxxXxxxXx'],
    clv: ['x..x..x...x.x...'],
    bas: ['0..0..2.0..0..2.', '0..0..2.0.2.1.2.'],
    mar: [
      '0.2.4.2.0.2.4.7.',
      '5.3.5.7.5...3...',
      '4.4.6.4.1.4.6...',
      '7.5.4.2.0.......',
      '0.2.4.2.0.2.4.7.',
      '5.3.5.7.a...7...',
      '8.6.4.6.8.6.4.1.',
      '0...4...7.......',
    ],
    con: ['', '', '', '....7---9---7---', '', '', '', '....7---4---0---'],
  },
  // Carrera: empuje a 150 con bombo a tierra, bajo en corcheas y marimba sincopada. La menor.
  carrera: {
    bpm: 150,
    spb: 4,
    len: 16,
    root: 45,
    minor: true,
    chords: [0, 5, 2, 6, 0, 5, 3, 4],
    kik: ['X...X...X...X...'],
    snr: ['....x.......x...', '....x.......x.xx'],
    shk: ['x.X.x.X.x.X.x.X.'],
    bas: ['0.0.0.0.0.0.2.0.', '0.0.0.0.0.2.3.2.'],
    mar: [
      '7..7..7...5.4...',
      '5..5..5...4.2...',
      '4..4..4...2.4...',
      '6..6..6.4.6.8...',
      '7..7..7...9.7...',
      '5..5..5...7.9...',
      'a..a..a.9.7.5...',
      '4.4.6.6.8.8.b...',
    ],
    plk: ['..1...2...1...2.'],
  },
  // Fútbol: batucada ligera de barra, campana a contratiempo y un coro tipo "olé". Sol mayor.
  futbol: {
    bpm: 138,
    spb: 4,
    len: 16,
    root: 43,
    chords: [0, 0, 3, 4, 0, 5, 3, 4],
    kik: ['X..x....X..x..x.'],
    snr: ['....x..x....x...', '....x..x....x.xx'],
    clv: ['x.x..x.x.x..x.x.'],
    shk: ['..x...x...x...x.'],
    bas: ['0..0..2.0..0..2.'],
    mar: [
      '4...7...9.7.4...',
      '4...7...9.7.....',
      '5...7...a.7.5...',
      '4...6...8.6.4...',
      '4...7...9.7.4...',
      '5...7...9...7...',
      '5.5.7.5.3...5...',
      '4...6...8.9.b...',
    ],
    con: ['', '', '', '', '7-------9-------', '9-------7-------', '', ''],
  },
  // Exploradores: suave y misterioso. Notas largas de caracol, marimba escasa, latido lento. Re menor.
  exploradores: {
    bpm: 92,
    spb: 4,
    len: 16,
    root: 50,
    minor: true,
    vol: 0.9,
    chords: [0, 0, 5, 6, 0, 3, 5, 4],
    seg: ['x.........x.....'],
    shk: ['....x.......x...', '....x.......x.x.'],
    plk: ['0...2...3...2...', '0...2...3...4...'],
    bas: ['0.......0.......'],
    con: [
      '0-------4-------',
      '2-------4---3---',
      '5-------7-------',
      '6-------4-------',
      '7-------4-------',
      '3-------5---7---',
      '5-------9-------',
      '8-------6-------',
    ],
    mar: [
      '....7.....9.7...',
      '........4.2.....',
      '....7.....9.a...',
      '........8.6.4...',
      '....b.....9.7...',
      '........7.5.3...',
      '....9.....a.c...',
      '........8.6.4...',
    ],
  },
  // Pulpería: juguetona, bajo saltarín, bloque de madera y melodía a brinquitos. Do mayor.
  pulperia: {
    bpm: 116,
    spb: 4,
    len: 16,
    root: 48,
    chords: [0, 3, 0, 4, 0, 3, 4, 0],
    clv: ['x...x...x.x.x...'],
    shk: ['..x...x...x...x.'],
    seg: ['x.......x.......'],
    bas: ['0...2...0...2...', '0...2...0.1.2...'],
    plk: ['..1...1...1...1.', '..1...1...1.2.1.'],
    mar: [
      '4.2.4.7...5.4...',
      '5.3.5.7...5.3...',
      '4.2.4.7...9.7...',
      '8.6.4.6.8.......',
      '4.2.4.7...5.4...',
      '5.3.5.7...a.9...',
      '8.8.6.6.4.4.1.1.',
      '0...2.4.7.......',
    ],
  },
  // Departamentos: 6/8 de viaje, un poco más lento, con maraca suave. Sol mayor.
  dept: {
    bpm: 74,
    spb: 3,
    len: 6,
    root: 43,
    vol: 0.9,
    chords: [0, 0, 3, 3, 0, 5, 4, 4, 0, 0, 3, 3, 5, 4, 0, 0],
    plk: ['021321', '012321', '023212'],
    bas: ['0.....', '0....2'],
    shk: ['x..x..', 'x..x.x'],
    mar: [
      '2..4..',
      '7.....',
      '5..7..',
      '8.....',
      '9..7..',
      '7..5..',
      '4..6..',
      '8.....',
      '2..4..',
      '7..9..',
      'a..8..',
      '7..5..',
      '7..9..',
      '8..6..',
      '7.....',
      '......',
    ],
    con: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '7-----', '------'],
  },
};
const MAJOR = [0, 2, 4, 5, 7, 9, 11],
  MINOR = [0, 2, 3, 5, 7, 8, 10];
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const degree = (s: Song, d: number) => {
  const sc = s.minor ? MINOR : MAJOR;
  return sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
};
const at = (p: string[] | undefined, bar: number, i: number) => (p?.length ? (p[bar % p.length][i] ?? '.') : '.');
const val = (c: string) => parseInt(c, 36);

// ------------------------------------------------------------------ motor
let ctx: AudioContext | null = null,
  master: GainNode | null = null,
  musicBus: GainNode | null = null,
  sfxBus: GainNode | null = null,
  echoIn: GainNode | null = null,
  noiseBuf: AudioBuffer | null = null;
let timer: ReturnType<typeof setInterval> | null = null,
  hidden = false;
interface Playing {
  track: Track;
  song: Song;
  dry: GainNode;
  wet: GainNode;
  step: number;
  next: number;
  sp: number;
}
let cur: Playing | null = null;
const lastSfx: Partial<Record<Sfx, number>> = {};
const LOOK = 0.26,
  MUSIC_GAIN = 0.34,
  SFX_GAIN = 0.85;
const settings = () => useGame.getState().profile.settings;

function ar(p: AudioParam, t: number, attack: number, decay: number, peak: number) {
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  p.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}
interface OscOpt {
  f1?: number;
  a?: number;
  lp?: number;
  lp1?: number;
  vib?: number;
  vibHz?: number;
  detune?: number;
  glide?: number;
}
/** Una nota de oscilador con envolvente; f1 = barrido de tono, lp = filtro pasabajos, vib = vibrato en Hz. */
function osc(dest: AudioNode, type: OscillatorType, f: number, t: number, dur: number, peak: number, o: OscOpt = {}) {
  const c = ctx!,
    os = c.createOscillator(),
    g = c.createGain(),
    end = t + (o.a ?? 0.005) + dur + 0.03;
  os.type = type;
  os.frequency.setValueAtTime(f, t);
  if (o.detune) os.detune.value = o.detune;
  if (o.f1) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.glide ?? dur));
  if (o.vib) {
    const l = c.createOscillator(),
      lg = c.createGain();
    l.frequency.value = o.vibHz ?? 5.5;
    lg.gain.value = o.vib;
    l.connect(lg);
    lg.connect(os.frequency);
    l.start(t);
    l.stop(end);
  }
  ar(g.gain, t, o.a ?? 0.005, dur, peak);
  if (o.lp) {
    const fl = c.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.setValueAtTime(o.lp, t);
    if (o.lp1) fl.frequency.exponentialRampToValueAtTime(o.lp1, t + dur);
    os.connect(fl);
    fl.connect(g);
  } else os.connect(g);
  g.connect(dest);
  os.start(t);
  os.stop(end);
  stats.nodes++;
}
interface NoiseOpt {
  type?: BiquadFilterType;
  f: number;
  f1?: number;
  q?: number;
  a?: number;
}
/** Ráfaga de ruido filtrado (maracas, redoblante, público, salpicón). */
function noise(dest: AudioNode, t: number, dur: number, peak: number, o: NoiseOpt) {
  const c = ctx!;
  if (!noiseBuf) return;
  const src = c.createBufferSource(),
    fl = c.createBiquadFilter(),
    g = c.createGain(),
    a = o.a ?? 0.002;
  src.buffer = noiseBuf;
  src.loop = true;
  fl.type = o.type ?? 'bandpass';
  fl.frequency.setValueAtTime(o.f, t);
  fl.Q.value = o.q ?? 0.8;
  if (o.f1) fl.frequency.exponentialRampToValueAtTime(o.f1, t + a + dur);
  ar(g.gain, t, a, dur, peak);
  src.connect(fl);
  fl.connect(g);
  g.connect(dest);
  src.start(t, Math.random() * 1.5);
  src.stop(t + a + dur + 0.03);
  stats.nodes++;
}

// ---- instrumentos de la música
const marimba = (d: AudioNode, t: number, f: number, v: number) => {
  osc(d, 'sine', f, t, 0.42, 0.2 * v, { a: 0.004 });
  osc(d, 'sine', f * 4, t, 0.09, 0.05 * v, { a: 0.002 });
  osc(d, 'triangle', f * 2, t, 0.16, 0.03 * v);
};
const pluck = (d: AudioNode, t: number, f: number, v: number) =>
  osc(d, 'triangle', f, t, 0.5, 0.13 * v, { a: 0.003, lp: 2600, lp1: 500 });
const conch = (d: AudioNode, t: number, f: number, dur: number, v: number) => {
  osc(d, 'triangle', f, t, dur, 0.085 * v, { a: 0.09, lp: 1500, vib: f * 0.006 });
  osc(d, 'sine', f * 2, t, dur * 0.8, 0.018 * v, { a: 0.12 });
};
const bass = (d: AudioNode, t: number, f: number, dur: number, v: number) => {
  osc(d, 'sine', f, t, dur, 0.26 * v, { a: 0.008 });
  osc(d, 'triangle', f * 2, t, dur * 0.6, 0.05 * v, { a: 0.008, lp: 700 });
};
const thump = (d: AudioNode, t: number, f: number, len: number, v: number) =>
  osc(d, 'sine', f * 1.9, t, len, v, { a: 0.002, f1: f, glide: 0.06 });
const segunda = (d: AudioNode, t: number, v: number) => {
  thump(d, t, 92, 0.24, 0.42 * v);
  noise(d, t, 0.03, 0.03 * v, { type: 'lowpass', f: 900 });
};
const primero = (d: AudioNode, t: number, v: number, hi: boolean) => {
  thump(d, t, hi ? 250 : 190, 0.11, 0.17 * v);
  noise(d, t, 0.045, 0.05 * v, { f: hi ? 1900 : 1300, q: 1.2 });
};
const maraca = (d: AudioNode, t: number, v: number) =>
  noise(d, t, v > 1 ? 0.07 : 0.035, 0.045 * v, { type: 'highpass', f: 6200, a: 0.004 });
const wood = (d: AudioNode, t: number, v: number) => {
  osc(d, 'sine', 1750, t, 0.05, 0.07 * v, { a: 0.001 });
  osc(d, 'triangle', 2620, t, 0.025, 0.02 * v, { a: 0.001 });
};
const kickDrum = (d: AudioNode, t: number, v: number) => thump(d, t, 58, 0.2, 0.5 * v);
const snare = (d: AudioNode, t: number, v: number) => {
  noise(d, t, 0.11, 0.1 * v, { f: 2300, q: 0.7 });
  thump(d, t, 185, 0.06, 0.07 * v);
};

function playStep(p: Playing, t: number) {
  const s = p.song,
    i = p.step % s.len,
    bar = Math.floor(p.step / s.len) % s.chords.length,
    ch = s.chords[bar],
    sp = p.sp;
  let c: string;
  const hit = (pat: string[] | undefined) => {
    c = at(pat, bar, i);
    return c === 'X' ? 1.25 : c === 'x' ? 0.8 : 0;
  };
  let v = hit(s.kik);
  if (v) kickDrum(p.dry, t, v);
  v = hit(s.seg);
  if (v) segunda(p.dry, t, v);
  v = hit(s.pri);
  if (v) primero(p.dry, t, v, (i * 7 + bar * 3) % 5 < 2);
  v = hit(s.snr);
  if (v) snare(p.dry, t, v);
  v = hit(s.shk);
  if (v) maraca(p.dry, t, v);
  v = hit(s.clv);
  if (v) wood(p.dry, t, v);
  c = at(s.bas, bar, i);
  if (c !== '.' && c !== '-') bass(p.dry, t, hz(s.root - 12 + degree(s, ch + val(c) * 2)), Math.min(0.45, sp * 2.4), 1);
  c = at(s.plk, bar, i);
  if (c !== '.' && c !== '-') pluck(p.wet, t, hz(s.root + 12 + degree(s, ch + val(c) * 2)), 0.85 + ((i * 5) % 3) * 0.1);
  c = at(s.mar, bar, i);
  if (c !== '.' && c !== '-') marimba(p.wet, t, hz(s.root + 12 + degree(s, val(c))), i % s.spb === 0 ? 1 : 0.8);
  c = at(s.con, bar, i);
  if (c !== '.' && c !== '-') {
    const row = s.con![bar % s.con!.length];
    let n = 1;
    while (row[i + n] === '-') n++;
    conch(p.wet, t, hz(s.root + 12 + degree(s, val(c))), Math.max(0.2, n * sp * 0.92), 1);
  }
}
function tick() {
  if (!ctx || !cur) return;
  const now = ctx.currentTime,
    p = cur,
    on = !hidden && settings().music > 0;
  if (p.next < now - 0.3) p.next = now + 0.05; // la pestaña estuvo dormida: retoma sin amontonar notas
  while (p.next < now + LOOK) {
    if (on) {
      try {
        playStep(p, p.next);
        stats.steps++;
      } catch {
        stats.errors++;
      }
    }
    p.step++;
    p.next += p.sp;
  }
}
function startTrack(track: Track) {
  if (!ctx || !musicBus || !echoIn) return;
  const now = ctx.currentTime,
    old = cur;
  cur = null;
  if (old) {
    for (const g of [old.dry, old.wet]) {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0.0001, now + 0.9);
    }
    setTimeout(() => {
      try {
        old.dry.disconnect();
        old.wet.disconnect();
      } catch {
        /* ya no existe */
      }
    }, 1600);
  }
  if (track === 'none') return;
  const song = SONGS[track],
    dry = ctx.createGain(),
    wet = ctx.createGain(),
    send = ctx.createGain(),
    v = song.vol ?? 1;
  for (const g of [dry, wet]) {
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(v, now + (old ? 0.9 : 0.4));
  }
  send.gain.value = 0.22;
  dry.connect(musicBus);
  wet.connect(musicBus);
  wet.connect(send);
  send.connect(echoIn);
  cur = { track, song, dry, wet, step: 0, next: now + (old ? 0.35 : 0.1), sp: 60 / song.bpm / song.spb };
  tick();
}

// ------------------------------------------------------------------ efectos
const SFX: Record<Sfx, (d: AudioNode, t: number) => void> = {
  click: (d, t) => {
    osc(d, 'sine', 920, t, 0.05, 0.14, { f1: 620, a: 0.001 });
    noise(d, t, 0.012, 0.04, { type: 'highpass', f: 3000 });
  },
  coin: (d, t) => {
    osc(d, 'triangle', 988, t, 0.07, 0.15, { a: 0.002 });
    osc(d, 'triangle', 1319, t + 0.07, 0.28, 0.16, { a: 0.002 });
    osc(d, 'sine', 2638, t + 0.07, 0.14, 0.04);
  },
  jump: (d, t) => osc(d, 'sine', 290, t, 0.17, 0.16, { f1: 640, a: 0.004 }),
  land: (d, t) => {
    osc(d, 'sine', 130, t, 0.1, 0.2, { f1: 55, a: 0.002 });
    noise(d, t, 0.06, 0.06, { type: 'lowpass', f: 500 });
  },
  step: (d, t) => noise(d, t, 0.03, 0.035, { type: 'lowpass', f: 420 + Math.random() * 180, a: 0.003 }),
  win: (d, t) => {
    [523, 659, 784, 1047].forEach((f, i) => osc(d, 'triangle', f, t + i * 0.11, 0.2, 0.14, { a: 0.004 }));
    [523, 659, 784, 1047, 1319].forEach((f) => osc(d, 'triangle', f, t + 0.46, 0.85, 0.075, { a: 0.01, vib: 3 }));
    noise(d, t + 0.46, 0.5, 0.03, { type: 'highpass', f: 7000, a: 0.01 });
  },
  lose: (d, t) => {
    [392, 370, 349].forEach((f, i) =>
      osc(d, 'triangle', f, t + i * 0.2, 0.19, 0.13, { a: 0.01, lp: 1400, f1: f * 0.97 }),
    );
    osc(d, 'triangle', 330, t + 0.6, 0.6, 0.14, { a: 0.01, lp: 1200, f1: 247, vib: 7, vibHz: 5 });
  },
  star: (d, t) => {
    osc(d, 'sine', 1319, t, 0.28, 0.13, { f1: 2093, glide: 0.07, a: 0.002 });
    osc(d, 'sine', 3136, t + 0.04, 0.22, 0.05);
    osc(d, 'sine', 4186, t + 0.08, 0.2, 0.03);
  },
  kick: (d, t) => {
    osc(d, 'sine', 210, t, 0.13, 0.3, { f1: 52, a: 0.001 });
    noise(d, t, 0.035, 0.12, { f: 1500, q: 0.6 });
  },
  goal: (d, t) => {
    noise(d, t, 1.5, 0.15, { f: 900, f1: 1500, q: 0.5, a: 0.35 });
    noise(d, t + 0.1, 1.3, 0.07, { f: 2400, q: 0.8, a: 0.45 });
    osc(d, 'sine', 2250, t, 0.5, 0.07, { a: 0.01, vib: 130, vibHz: 31 });
    [523, 659, 784].forEach((f, i) => osc(d, 'triangle', f, t + 0.12 + i * 0.09, 0.5, 0.07, { a: 0.006 }));
  },
  hit: (d, t) => {
    osc(d, 'triangle', 660, t, 0.1, 0.15, { a: 0.001 });
    osc(d, 'sine', 990, t + 0.02, 0.16, 0.11);
    noise(d, t, 0.02, 0.07, { f: 2600 });
  },
  miss: (d, t) => osc(d, 'sine', 310, t, 0.22, 0.14, { f1: 130, a: 0.006 }),
  throw: (d, t) => noise(d, t, 0.2, 0.11, { f: 450, f1: 2600, q: 1.6, a: 0.03 }),
  pickup: (d, t) => [784, 1047, 1568].forEach((f, i) => osc(d, 'sine', f, t + i * 0.055, 0.1, 0.12, { a: 0.002 })),
  buy: (d, t) => {
    noise(d, t, 0.03, 0.1, { f: 3200, q: 2 });
    osc(d, 'sine', 150, t, 0.07, 0.12, { f1: 90 });
    [1568, 2093].forEach((f, i) => {
      osc(d, 'sine', f, t + 0.09 + i * 0.08, 0.45, 0.11, { a: 0.002 });
      osc(d, 'sine', f * 2.01, t + 0.09 + i * 0.08, 0.22, 0.03);
    });
  },
  error: (d, t) => {
    osc(d, 'sawtooth', 196, t, 0.11, 0.1, { lp: 900, a: 0.004 });
    osc(d, 'sawtooth', 147, t + 0.13, 0.2, 0.1, { lp: 800, a: 0.004 });
  },
  levelup: (d, t) => {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => osc(d, 'triangle', f, t + i * 0.075, 0.22, 0.12, { a: 0.003 }));
    osc(d, 'sine', 2093, t + 0.45, 0.7, 0.07, { vib: 12, vibHz: 6 });
    noise(d, t + 0.1, 0.6, 0.035, { type: 'highpass', f: 3000, f1: 9000, a: 0.2 });
  },
  whistle: (d, t) => {
    osc(d, 'sine', 2350, t, 0.42, 0.11, { a: 0.012, vib: 150, vibHz: 29 });
    noise(d, t, 0.4, 0.025, { f: 2400, q: 4, a: 0.01 });
  },
  portal: (d, t) => {
    osc(d, 'sine', 190, t, 0.7, 0.12, { f1: 980, a: 0.05, vib: 14, vibHz: 9 });
    osc(d, 'triangle', 285, t + 0.05, 0.65, 0.05, { f1: 1470, a: 0.05 });
    noise(d, t, 0.65, 0.06, { f: 500, f1: 4200, q: 3, a: 0.1 });
  },
  countdown: (d, t) => osc(d, 'triangle', 660, t, 0.13, 0.15, { a: 0.003 }),
  go: (d, t) => {
    osc(d, 'triangle', 1320, t, 0.38, 0.14, { a: 0.003 });
    osc(d, 'sine', 660, t, 0.38, 0.09);
    osc(d, 'sine', 1980, t, 0.2, 0.04);
  },
  splash: (d, t) => {
    noise(d, t, 0.42, 0.16, { type: 'lowpass', f: 3600, f1: 380, a: 0.006 });
    osc(d, 'sine', 520, t, 0.16, 0.08, { f1: 150 });
    noise(d, t + 0.1, 0.3, 0.04, { type: 'highpass', f: 5000, a: 0.03 });
  },
  horn: (d, t) => {
    for (const [o, len] of [
      [0, 0.16],
      [0.24, 0.34],
    ] as const) {
      osc(d, 'sawtooth', 311, t + o, len, 0.085, { lp: 1500, a: 0.012 });
      osc(d, 'sawtooth', 392, t + o, len, 0.075, { lp: 1500, a: 0.012 });
    }
  },
  engine: (d, t) => {
    osc(d, 'sawtooth', 62, t, 0.5, 0.12, { f1: 96, lp: 520, a: 0.03, vib: 16, vibHz: 23 });
    osc(d, 'square', 124, t, 0.45, 0.025, { f1: 190, lp: 700, a: 0.03 });
    noise(d, t, 0.45, 0.03, { type: 'lowpass', f: 300, a: 0.03 });
  },
};
/** separación mínima entre dos disparos del mismo efecto (s) */
const GAP: Partial<Record<Sfx, number>> = { step: 0.12, coin: 0.05, engine: 0.35, click: 0.03 };

const stats = { nodes: 0, steps: 0, sfx: 0, errors: 0 };
function applyVolumes() {
  if (!ctx || !musicBus || !sfxBus) return;
  const s = settings(),
    t = ctx.currentTime;
  musicBus.gain.setTargetAtTime(hidden ? 0 : Math.max(0, Math.min(1, s.music)) ** 1.4 * MUSIC_GAIN, t, 0.06);
  sfxBus.gain.setTargetAtTime(Math.max(0, Math.min(1, s.sfx)) ** 1.2 * SFX_GAIN, t, 0.03);
}

export const audio = {
  track: 'none' as Track,
  /** contadores para pruebas y depuración */
  stats,
  sfxNames: SFX_NAMES,
  tracks: TRACKS,
  /** 'running' | 'suspended' | 'closed' | 'none' (sin AudioContext) */
  get state(): string {
    return ctx ? ctx.state : 'none';
  },
  /** Se llama en el primer gesto del usuario (los navegadores bloquean el audio antes). Se puede llamar mil veces. */
  init() {
    try {
      if (ctx) {
        if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
        return;
      }
      const AC: typeof AudioContext | undefined =
        (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
      if (!AC) return;
      const c = new AC();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 18;
      comp.ratio.value = 4;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;
      master = c.createGain();
      master.gain.value = 0.9;
      master.connect(comp);
      comp.connect(c.destination);
      // bus de música: pasabajos suave para que nada chille + eco ligero para marimba, guitarra y caracol
      const soft = c.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.value = 7200;
      soft.Q.value = 0.3;
      musicBus = c.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(soft);
      soft.connect(master);
      const delay = c.createDelay(1),
        fb = c.createGain(),
        damp = c.createBiquadFilter();
      delay.delayTime.value = 0.31;
      fb.gain.value = 0.26;
      damp.type = 'lowpass';
      damp.frequency.value = 2200;
      echoIn = c.createGain();
      echoIn.connect(delay);
      delay.connect(damp);
      damp.connect(fb);
      fb.connect(delay);
      damp.connect(musicBus);
      sfxBus = c.createGain();
      sfxBus.gain.value = 0;
      sfxBus.connect(master);
      const len = Math.floor(c.sampleRate * 2);
      noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      ctx = c;
      hidden = typeof document !== 'undefined' && document.hidden;
      applyVolumes();
      if (typeof document !== 'undefined')
        document.addEventListener('visibilitychange', () => {
          hidden = document.hidden;
          applyVolumes();
          if (!hidden && cur && ctx) cur.next = ctx.currentTime + 0.08;
        });
      if (c.state === 'suspended') void c.resume().catch(() => {});
      timer ??= setInterval(tick, 70);
      if (this.track !== 'none') startTrack(this.track);
    } catch {
      ctx = null;
      stats.errors++;
    }
  },
  /** Cambia la pista con un fundido cruzado. Antes del primer gesto solo la recuerda. */
  music(track: Track) {
    if (track !== 'none' && !SONGS[track]) return;
    const same = this.track === track && (track === 'none' ? !cur : cur?.track === track);
    this.track = track;
    if (!ctx || same) return;
    try {
      startTrack(track);
    } catch {
      stats.errors++;
    }
  },
  sfx(name: Sfx) {
    if (!ctx || !sfxBus || ctx.state !== 'running' || settings().sfx <= 0) return;
    const make = SFX[name];
    if (!make) return;
    const t = ctx.currentTime,
      last = lastSfx[name] ?? -1;
    if (t - last < (GAP[name] ?? 0.02)) return;
    lastSfx[name] = t;
    try {
      make(sfxBus, t + 0.004);
      stats.sfx++;
    } catch {
      stats.errors++;
    }
  },
  /** Reloj del audio en segundos (0 si no hay audio). Sirve para sincronizar juegos de ritmo. */
  get now(): number {
    return ctx ? ctx.currentTime : 0;
  },
  /** Nota suelta por el bus de efectos: para motores que tocan su propia melodía (ritmo, campanas). `at` = segundos desde ahora. */
  tone(freq: number, dur = 0.2, o: { type?: OscillatorType; gain?: number; at?: number } = {}) {
    if (!ctx || !sfxBus || ctx.state !== 'running' || settings().sfx <= 0) return;
    try {
      osc(sfxBus, o.type ?? 'triangle', freq, ctx.currentTime + 0.004 + (o.at ?? 0), dur, o.gain ?? 0.14, { a: 0.004 });
      stats.sfx++;
    } catch {
      stats.errors++;
    }
  },
  /** Golpe de tambor o ruido corto por el bus de efectos. `f` = frecuencia central del filtro. */
  drum(f = 180, dur = 0.12, gain = 0.2, at = 0) {
    if (!ctx || !sfxBus || ctx.state !== 'running' || settings().sfx <= 0) return;
    try {
      const t = ctx.currentTime + 0.004 + at;
      osc(sfxBus, 'sine', f, t, dur, gain, { f1: f * 0.45, a: 0.001 });
      noise(sfxBus, t, dur * 0.5, gain * 0.35, { f: f * 8, q: 0.7 });
      stats.sfx++;
    } catch {
      stats.errors++;
    }
  },
  /** Aplica de nuevo los volúmenes de ajustes. */
  refresh() {
    try {
      applyVolumes();
    } catch {
      stats.errors++;
    }
  },
};
