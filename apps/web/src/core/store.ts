// Estado del juego (Zustand). Todo el progreso vive en `profile` y se guarda en localStorage.
// Sin VITE_CONVEX_URL este módulo es la "capa de servidor" del prototipo: aquí se validan compras y recompensas.
// Con VITE_CONVEX_URL (ver servidor.ts) las Lempiritas, la XP, el nivel, lo comprado y lo puesto los manda
// Convex: el perfil local solo refleja lo último que respondió y nada aquí suma saldo por su cuenta.
import {
  bonoViaje,
  cambiosDe,
  decidirCompra,
  ganarXp,
  MONEDA,
  MONEDA_SUELTA,
  MONEDAS_INICIALES,
  PREMIO_PRIMERA_VISITA,
  PREMIO_RECUERDO,
  poseidos,
  premioPartida,
} from '@mundo-catrucho/reglas';
import { create } from 'zustand';
import { OPCIONES, rutaParaVehiculo } from '../game/viaje/opciones';
import {
  ACHIEVEMENTS,
  BOT_NAMES,
  DAILY_COUNT,
  DEPARTMENTS,
  itemById,
  juegoById,
  MISSIONS,
  minigameById,
  SHOP,
} from './data';
import { memeById } from './memes';
import { player } from './player';
import { alVencer, type PerfilServidor, SERVIDOR, servidor } from './servidor';
import type { AvatarConfig, MinigameId, MinigameResult, Modo, PanelId, Rewards, Scene, V3, Vehiculo } from './types';

const SAVE_KEY = 'mundo-catrucho-v1';
const FREE = SHOP.items.filter((i) => i.price === 0 && !i.soloSet).map((i) => i.id);

export interface Settings {
  music: number;
  sfx: number;
  quality: 'baja' | 'media' | 'alta';
  sens: number;
  invertY: boolean;
}
export interface DailyMission {
  id: string;
  progress: number;
  claimed: boolean;
}
export interface Best {
  score: number;
  stars: number;
  label: string;
}
/** Avance de un juego del catálogo: `etapa` = etapas ya ganadas (la siguiente a jugar). */
export interface JuegoProg {
  etapa: number;
  stars: number[];
  best: number;
  label: string;
  veces: number;
}
export interface RankRow {
  name: string;
  score: number;
  label: string;
  you?: boolean;
  bot?: boolean;
}
export interface Profile {
  name: string;
  created: boolean;
  avatar: AvatarConfig;
  coins: number;
  xp: number;
  level: number;
  owned: string[];
  emotes: string[];
  visited: string[];
  collected: string[];
  achievements: string[];
  /** memes del álbum ya desbloqueados (ids de shared/data/memes.json) */
  memes: string[];
  stats: {
    played: number;
    wins: number;
    goals: number;
    pickups: number;
    emotes: number;
    purchases: number;
    coinsEarned: number;
  };
  best: Partial<Record<MinigameId, Best>>;
  /** progreso por juego del catálogo (id 'depto.juego') */ juegos: Record<string, JuegoProg>;
  modo: Modo;
  daily: { date: string; missions: DailyMission[] };
  settings: Settings;
  room: { mode: 'solo' | 'publica' | 'privada'; code: string };
}
export interface Toast {
  id: number;
  text: string;
  icon?: string;
}
export interface MgState {
  id: MinigameId;
  run: number;
  phase: 'intro' | 'playing' | 'ended';
  result?: MinigameResult;
  rewards?: Rewards;
  /** juego del catálogo (si se entró desde un puesto de un departamento) */ juego?: string;
  /** etapa que se está jugando (0 = primera) */ etapa: number;
  modo: Modo;
  /** a dónde se vuelve al salir */ origen: Scene;
  origenPos?: { pos: V3; yaw: number };
  /** posiciones contra bots, al terminar */ ranking?: RankRow[] /** ganó una etapa nueva */;
  avance?: boolean;
  /** con Convex: en qué va el pago de `rewards` (sin Convex no existe: se paga al instante) */
  pago?: 'pendiente' | 'pagado' | 'rechazado' | 'sin-conexion';
}
export interface MgHud {
  timer?: number;
  score?: string;
  objective?: string;
  lines?: string[];
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
function pickDaily(date: string): DailyMission[] {
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = MISSIONS.map((m) => m.id),
    out: DailyMission[] = [];
  while (out.length < DAILY_COUNT && pool.length) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push({ id: pool.splice(h % pool.length, 1)[0], progress: 0, claimed: false });
  }
  return out;
}
const freshProfile = (): Profile => ({
  name: 'Catracho',
  created: false,
  avatar: { ...SHOP.defaultAvatar },
  coins: MONEDAS_INICIALES,
  xp: 0,
  level: 1,
  owned: [...FREE],
  emotes: ['emote_saludar', 'emote_punta', 'emote_celebrar'],
  visited: [],
  collected: [],
  achievements: [],
  memes: [],
  stats: { played: 0, wins: 0, goals: 0, pickups: 0, emotes: 0, purchases: 0, coinsEarned: 0 },
  best: {},
  juegos: {},
  modo: 'solo',
  daily: { date: today(), missions: pickDaily(today()) },
  settings: { music: 0.6, sfx: 0.8, quality: 'alta', sens: 1, invertY: false },
  room: { mode: 'publica', code: '' },
});
function load(): Profile {
  const base = freshProfile();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const s = JSON.parse(raw) as Partial<Profile>;
    const p: Profile = {
      ...base,
      ...s,
      avatar: { ...base.avatar, ...s.avatar },
      stats: { ...base.stats, ...s.stats },
      settings: { ...base.settings, ...s.settings },
      room: { ...base.room, ...s.room },
    };
    p.owned = [...new Set([...FREE, ...(s.owned ?? [])])];
    if (p.daily.date !== today()) p.daily = { date: today(), missions: pickDaily(today()) };
    return p;
  } catch {
    return base;
  }
}
function save(p: Profile) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento: se juega igual */
  }
}

export interface Game {
  screen: 'menu' | 'world';
  scene: Scene;
  sceneKey: number;
  panel: PanelId | null;
  dialog: { title: string; text: string; icon?: string } | null;
  prompt: { label: string; icon?: string } | null;
  toasts: Toast[];
  /** el meme que el juego está mostrando en 3D ahora (n sube con cada aviso, aunque se repita el meme) */
  memeAlAire: { id: string; n: number } | null;
  mg: MgState | null;
  mgHud: MgHud;
  profile: Profile;

  goMenu(): void;
  enterWorld(): void;
  travel(deptId: string): void;
  goLobby(): void;
  openPanel(p: PanelId): void;
  closePanel(): void;
  togglePanel(p: PanelId): void;
  showDialog(d: Game['dialog']): void;
  closeDialog(): void;
  setPrompt(p: Game['prompt']): void;
  toast(text: string, icon?: string): void;
  dropToast(id: number): void;

  /** teletransporte pendiente al montar la próxima escena (volver al puesto de donde se salió) */ llegada: {
    pos: V3;
    yaw: number;
  } | null;
  startMinigame(id: MinigameId): void;
  beginMinigame(): void;
  /** Entra a un juego del catálogo ('depto.juego'). Es el camino normal desde los puestos de los departamentos. */
  startJuego(juegoId: string): void;
  setModo(m: Modo): void;
  /** Viaje simulado desde la terminal. Devuelve false si no ajusta el pisto. */
  startViaje(veh: Vehiculo, to: string): boolean;
  llegarViaje(bonus?: number): void;
  tomarLlegada(): Game['llegada'];
  finishMinigame(r: MinigameResult): void;
  replayMinigame(): void;
  exitMinigame(): void;
  setMgHud(h: MgHud): void;

  addCoins(n: number): void;
  addXp(n: number): void;
  pickupCoin(n?: number): void;
  collect(deptId: string): boolean;
  /** Compra local e inmediata. Con Convex solo dispara `comprar` y responde 'espera'. */
  buy(itemId: string): Compra | 'espera';
  /** Compra y se pone el artículo. Con Convex espera la respuesta; sin conexión no compra. */
  comprar(itemId: string): Promise<Compra | 'sin-conexion'>;
  equip(itemId: string): boolean;
  setAvatar(a: Partial<AvatarConfig>): void;
  setName(n: string): void;
  finishCreation(): void;
  useEmote(id: string): boolean;
  /** Mete el meme al álbum. Devuelve true si era nuevo. No da premios. */
  verMeme(id: string): boolean;
  alAire(id: string): void;
  bump(type: string, amount?: number, target?: string): void;
  claimMission(id: string): boolean;
  setSettings(s: Partial<Settings>): void;
  setRoom(mode: Profile['room']['mode'], code?: string): void;
  resetProgress(): void;
  /** Con Convex: entra como invitado y trae saldo, nivel, lo comprado y lo puesto. Sin Convex no hace nada. */
  sincronizar(): Promise<boolean>;
}

type Compra = 'ok' | 'ya' | 'caro' | 'no';
let toastId = 0;
/** Partida abierta en Convex para el minijuego en curso (id, o null si no se pudo abrir). */
let partidaEnCurso: Promise<string | null> | null = null;
/** Cambios de avatar mandados a Convex que todavía no responden: mientras haya, no se pisa lo local. */
let vistiendo = 0;
/** Etapa que toca jugar: la siguiente sin ganar; si ya las ganó todas, la última. */
const etapaDe = (p: Profile, juegoId: string) => {
  const j = juegoById(juegoId);
  return Math.max(0, Math.min((j?.etapas ?? 1) - 1, p.juegos[juegoId]?.etapa ?? 0));
};
/** Posiciones de la partida contra bots (no hay servidor en el prototipo: los rivales son simulados y se marcan como bots). */
function rankingDe(mg: MgState, r: MinigameResult, name: string): RankRow[] {
  let h = 2166136261;
  for (const c of `${mg.juego ?? mg.id}|${mg.etapa}|${mg.run}|${r.score}`)
    h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 4294967296;
  };
  const base = Math.max(r.score, 1),
    bot = (lo: number, hi: number) => Math.max(0, Math.round(base * (lo + rnd() * (hi - lo))));
  const names = [...BOT_NAMES].sort(() => rnd() - 0.5),
    lab = (n: number) => r.label.replace(/[\d.,:]+/, String(n));
  const rows: RankRow[] = [];
  if (mg.modo === 'duo') {
    const compa = bot(0.45, 0.85);
    rows.push({ name: `${name} + ${names[0]}`, score: r.score + compa, label: lab(r.score + compa), you: true });
    for (let i = 0; i < 3; i++) {
      const sc = bot(0.5, 1.05) + bot(0.45, 0.9);
      rows.push({ name: `${names[1 + i * 2]} + ${names[2 + i * 2]}`, score: sc, label: lab(sc), bot: true });
    }
  } else {
    rows.push({ name, score: r.score, label: r.label, you: true });
    for (let i = 0, n = mg.modo === 'abierto' ? 7 : 3; i < n; i++) {
      const sc = bot(0.4, 1.12);
      rows.push({ name: names[i], score: sc, label: lab(sc), bot: true });
    }
  }
  return rows.sort((a, b) => b.score - a.score);
}

export const useGame = create<Game>((set, get) => {
  /** Aplica cambios al perfil, revisa logros y guarda. Es el único camino para modificar el progreso. */
  const commit = (fn: (p: Profile) => void) => {
    const p: Profile = JSON.parse(JSON.stringify(get().profile));
    fn(p);
    const fresh = checkAchievements(p);
    set({ profile: p });
    save(p);
    for (const id of fresh) {
      const a = ACHIEVEMENTS.find((x) => x.id === id)!;
      get().toast(SERVIDOR ? `Logro: ${a.name}` : `Logro: ${a.name} (+${a.coins})`, a.icon);
    }
    return fresh;
  };
  /** Suma XP con las reglas compartidas; cada nivel nuevo paga su premio. Devuelve si subió. Con Convex no hace
   * nada: XP, nivel y Lempiritas solo cambian con lo que responde el servidor. */
  const gainXp = (p: Profile, n: number) => {
    if (SERVIDOR) return false;
    const a = ganarXp({ nivel: p.level, xp: p.xp }, n);
    p.level = a.nivel;
    p.xp = a.xp;
    p.coins += a.monedas;
    p.stats.coinsEarned += a.monedas;
    return a.subidas > 0;
  };
  const gainCoins = (p: Profile, n: number) => {
    if (SERVIDOR) return;
    p.coins += n;
    if (n > 0) p.stats.coinsEarned += n;
  };
  const checkAchievements = (p: Profile): string[] => {
    const has = (id: string) => p.achievements.includes(id),
      b = p.best,
      fresh: string[] = [];
    const trad = [p.avatar.shirt, p.avatar.pants, p.avatar.hat, p.avatar.acc].filter((id) => itemById(id)?.trad).length;
    const rules: Record<string, boolean> = {
      primer_paso: p.created,
      primera_victoria: p.stats.wins >= 1,
      goleador: p.stats.goals >= 3 && (b.futbol?.score ?? 0) >= 3,
      punteria: (b.feria?.stars ?? 0) >= 3,
      explorador: (b.exploradores?.stars ?? 0) >= 1,
      pulpero: (b.pulperia?.stars ?? 0) >= 3,
      viajero: p.visited.length >= 5,
      catracho_de_corazon: p.visited.length >= DEPARTMENTS.length,
      coleccionista: p.collected.length >= 9,
      a_la_moda: p.stats.purchases >= 5,
      traje_tipico: trad >= 3,
      nivel_5: p.level >= 5,
      bailarin: p.stats.emotes >= 10,
    };
    for (const a of ACHIEVEMENTS)
      if (!has(a.id) && rules[a.id]) {
        p.achievements.push(a.id);
        gainCoins(p, a.coins);
        fresh.push(a.id);
      }
    return fresh;
  };
  const bumpMissions = (p: Profile, type: string, amount: number, target?: string) => {
    for (const dm of p.daily.missions) {
      const m = MISSIONS.find((x) => x.id === dm.id)!;
      if (m.type !== type || (m.target && m.target !== target)) continue;
      dm.progress = type === 'score' ? Math.max(dm.progress, amount) : Math.min(m.count, dm.progress + amount);
    }
  };
  /** Copia al perfil local lo que respondió Convex. El avatar no se pisa mientras haya cambios en camino. */
  const aplicar = (sv: PerfilServidor) =>
    commit((p) => {
      p.coins = sv.monedas;
      p.xp = sv.xp;
      p.level = sv.nivel;
      p.owned = [...poseidos(sv.comprados)];
      p.emotes = p.owned.filter((id) => itemById(id)?.cat === 'emote');
      if (vistiendo === 0) p.avatar = { ...p.avatar, ...sv.avatar };
    });
  /** Manda a Convex un cambio de avatar ya aplicado aquí; si lo rechaza, vuelve a lo que diga el servidor. */
  const vestirEnServidor = (llamada: Promise<{ ok: boolean; perfil?: PerfilServidor }>) => {
    vistiendo++;
    void llamada.then((r) => {
      vistiendo--;
      if (r.perfil) aplicar(r.perfil);
    });
  };
  /** Con Convex, abre la partida del minijuego que se acaba de montar (desde la intro, con la hora del servidor). */
  const abrirPartida = () => {
    const mg = get().mg;
    partidaEnCurso =
      SERVIDOR && mg
        ? servidor
            .abrir({ motor: mg.id, etapa: mg.etapa, juegoId: mg.juego, modo: mg.modo })
            .then((r) => (r.ok ? r.id : null))
        : null;
  };
  /** Con Convex, cierra la partida y muestra lo que de verdad pagó el servidor. */
  const cobrarPartida = async (mg: MgState, r: MinigameResult) => {
    const abierta = partidaEnCurso;
    partidaEnCurso = null;
    const id = abierta ? await abierta : null;
    const res = id
      ? await servidor.cerrar({ partidaId: id, puntos: r.score, estrellas: r.stars, gano: r.won })
      : ({ ok: false, motivo: 'sin-conexion' } as const);
    const misma = () => {
      const m = get().mg;
      return m && m.run === mg.run && m.juego === mg.juego && m.id === mg.id && m.phase === 'ended' ? m : null;
    };
    if (res.ok) {
      const { monedas, xp, nivel } = res.saldo;
      commit((p) => {
        p.coins = monedas;
        p.xp = xp;
        p.level = nivel;
      });
      const m = misma();
      if (m?.rewards)
        set({
          mg: {
            ...m,
            pago: 'pagado',
            rewards: { ...m.rewards, coins: res.monedas, xp: res.xp, leveledUp: res.subidas > 0 },
          },
        });
      return;
    }
    const sinConexion = res.motivo === 'sin-conexion';
    const m = misma();
    // en los resultados lo dice `mg-result-pago`; si ya se fue de ahí, un aviso
    if (m) set({ mg: { ...m, pago: sinConexion ? 'sin-conexion' : 'rechazado' } });
    else
      get().toast(
        sinConexion
          ? 'Sin conexión con el servidor: esa partida no pagó'
          : 'El servidor no aceptó esa partida: no pagó',
        '⚠️',
      );
  };

  return {
    screen: 'menu',
    scene: { kind: 'lobby' },
    sceneKey: 0,
    panel: null,
    dialog: null,
    prompt: null,
    toasts: [],
    memeAlAire: null,
    mg: null,
    mgHud: {},
    llegada: null,
    profile: load(),

    goMenu: () => set({ screen: 'menu', panel: null, dialog: null, mg: null, prompt: null }),
    enterWorld: () => {
      const s = get();
      set({
        screen: 'world',
        panel: s.profile.created ? null : 'personaje',
        scene: { kind: 'lobby' },
        sceneKey: s.sceneKey + 1,
        mg: null,
      });
    },
    goLobby: () =>
      set((s) => ({
        screen: 'world',
        scene: { kind: 'lobby' },
        sceneKey: s.sceneKey + 1,
        panel: null,
        mg: null,
        mgHud: {},
        prompt: null,
      })),
    travel: (id) => {
      if (!DEPARTMENTS.some((d) => d.id === id)) return;
      const first = !get().profile.visited.includes(id);
      set((s) => ({
        screen: 'world',
        scene: { kind: 'dept', id },
        sceneKey: s.sceneKey + 1,
        panel: null,
        mg: null,
        mgHud: {},
        prompt: null,
      }));
      commit((p) => {
        if (first) {
          p.visited.push(id);
          gainCoins(p, PREMIO_PRIMERA_VISITA.monedas);
          gainXp(p, PREMIO_PRIMERA_VISITA.xp);
          bumpMissions(p, 'visit', 1);
        }
      });
      if (first)
        get().toast(SERVIDOR ? 'Primera visita' : `Primera visita: +${PREMIO_PRIMERA_VISITA.monedas} ${MONEDA}`, '🚌');
    },
    openPanel: (panel) => set({ panel }),
    closePanel: () => set({ panel: null }),
    togglePanel: (p) => set((s) => ({ panel: s.panel === p ? null : p })),
    showDialog: (dialog) => set({ dialog }),
    closeDialog: () => set({ dialog: null }),
    setPrompt: (prompt) => {
      const c = get().prompt;
      if (c?.label !== prompt?.label || c?.icon !== prompt?.icon) set({ prompt });
    },
    toast: (text, icon) => {
      const viaje = get().scene.kind === 'viaje';
      // en el viaje no se repite un aviso que todavía está en pantalla
      if (viaje && get().toasts.some((t) => t.text === text)) return;
      const id = ++toastId;
      set((s) => ({ toasts: [...s.toasts.slice(viaje ? -1 : -3), { id, text, icon }] }));
      setTimeout(() => get().dropToast(id), 3500);
    },
    dropToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    startMinigame: (id) => {
      set((s) => ({
        screen: 'world',
        scene: { kind: 'minigame', id },
        sceneKey: s.sceneKey + 1,
        panel: null,
        prompt: null,
        mgHud: {},
        mg: {
          id,
          run: 0,
          phase: 'intro',
          etapa: 0,
          modo: s.profile.modo,
          origen: s.scene.kind === 'dept' ? s.scene : { kind: 'lobby' },
        },
      }));
      abrirPartida();
    },
    startJuego: (juegoId) => {
      const j = juegoById(juegoId);
      if (!j) return;
      set((s) => ({
        screen: 'world',
        scene: { kind: 'minigame', id: j.motor },
        sceneKey: s.sceneKey + 1,
        panel: null,
        prompt: null,
        mgHud: {},
        mg: {
          id: j.motor,
          juego: j.id,
          run: 0,
          phase: 'intro',
          etapa: etapaDe(s.profile, j.id),
          modo: s.profile.modo,
          origen: s.scene.kind === 'dept' ? s.scene : { kind: 'dept', id: j.dept },
          origenPos: s.scene.kind === 'dept' ? { pos: [...player.pos] as V3, yaw: player.yaw } : undefined,
        },
      }));
      abrirPartida();
    },
    setModo: (m) => {
      commit((p) => {
        p.modo = m;
      });
      set((s) =>
        s.mg && s.mg.phase === 'intro' && s.mg.modo !== m ? { mg: { ...s.mg, modo: m }, sceneKey: s.sceneKey + 1 } : {},
      );
    }, // la escena se vuelve a montar para que el motor lea el modo nuevo
    startViaje: (veh, to) => {
      const t = OPCIONES.find((x) => x.id === veh);
      const origen = get().scene;
      const from = origen.kind === 'dept' ? origen.id : 'franciscomorazan';
      if (!rutaParaVehiculo(veh, from, to)) {
        get().toast('Ocupás otra conexión para llegar. Escogé otro destino.', '🧭');
        return false;
      }
      if (!t || !DEPARTMENTS.some((d) => d.id === to)) return false;
      if (get().profile.coins < t.precio) {
        get().toast('No ajusta el pisto para el pasaje', '🪙');
        return false;
      }
      commit((p) => gainCoins(p, -t.precio));
      set((s) => ({
        screen: 'world',
        scene: { kind: 'viaje', veh, to, from },
        sceneKey: s.sceneKey + 1,
        panel: null,
        mg: null,
        mgHud: {},
        prompt: null,
      }));
      return true;
    },
    llegarViaje: (bonus = 0) => {
      const sc = get().scene;
      if (sc.kind !== 'viaje') return;
      if (bonus > 0) commit((p) => gainCoins(p, bonoViaje(bonus)));
      get().travel(sc.to);
    },
    tomarLlegada: () => {
      const l = get().llegada;
      if (l) set({ llegada: null });
      return l;
    },
    beginMinigame: () => set((s) => (s.mg ? { mg: { ...s.mg, phase: 'playing' } } : {})),
    finishMinigame: (r) => {
      const mg = get().mg;
      if (mg?.phase !== 'playing') return;
      const { monedas: coins, xp, estrellas: stars } = premioPartida({ gano: r.won, estrellas: r.stars });
      let leveledUp = false,
        avance = false;
      const fresh = commit((p) => {
        p.stats.played++;
        if (r.won) p.stats.wins++;
        if (r.stats?.goals) p.stats.goals = Math.max(p.stats.goals, r.stats.goals);
        const prev = p.best[mg.id];
        if (!prev || r.score > prev.score) p.best[mg.id] = { score: r.score, stars, label: r.label };
        else if (stars > prev.stars) prev.stars = stars;
        gainCoins(p, coins);
        leveledUp = gainXp(p, xp);
        bumpMissions(p, 'play', 1, mg.id);
        bumpMissions(p, 'play', 1);
        if (r.won) {
          bumpMissions(p, 'win', 1, mg.id);
          bumpMissions(p, 'win', 1);
        }
        if (r.stats?.goals) bumpMissions(p, 'goals', r.stats.goals);
        bumpMissions(p, 'score', r.score, mg.id);
        const j = mg.juego ? juegoById(mg.juego) : undefined;
        if (j) {
          const g = (p.juegos[j.id] ??= { etapa: 0, stars: [], best: 0, label: '', veces: 0 });
          g.veces++;
          if (r.score > g.best || !g.label) {
            g.best = r.score;
            g.label = r.label;
          }
          if (r.won) {
            g.stars[mg.etapa] = Math.max(g.stars[mg.etapa] ?? 0, stars);
            if (mg.etapa >= g.etapa && g.etapa < j.etapas) {
              g.etapa = mg.etapa + 1;
              avance = true;
            }
          }
        }
      });
      // con Convex se muestra 0 hasta que el servidor confirme lo que pagó
      const ended: MgState = {
        ...mg,
        phase: 'ended',
        avance,
        ranking: rankingDe(mg, r, get().profile.name),
        result: { ...r, stars },
        rewards: SERVIDOR
          ? { coins: 0, xp: 0, leveledUp: false, newAchievements: fresh }
          : { coins, xp, leveledUp, newAchievements: fresh },
        pago: SERVIDOR ? 'pendiente' : undefined,
      };
      set({ mg: ended });
      if (SERVIDOR) void cobrarPartida(ended, { ...r, stars });
    },
    replayMinigame: () => {
      set((s) =>
        s.mg
          ? {
              mg: {
                id: s.mg.id,
                juego: s.mg.juego,
                origen: s.mg.origen,
                origenPos: s.mg.origenPos,
                modo: s.profile.modo,
                etapa: s.mg.juego ? etapaDe(s.profile, s.mg.juego) : 0,
                run: s.mg.run + 1,
                phase: 'intro',
              },
              sceneKey: s.sceneKey + 1,
              mgHud: {},
              panel: null,
            }
          : {},
      );
      abrirPartida();
    },
    exitMinigame: () => {
      const mg = get().mg;
      if (mg?.origen.kind !== 'dept') {
        get().goLobby();
        return;
      }
      set((s) => ({
        screen: 'world',
        scene: mg.origen,
        sceneKey: s.sceneKey + 1,
        panel: null,
        mg: null,
        mgHud: {},
        prompt: null,
        llegada: mg.origenPos ?? null,
      }));
    },
    setMgHud: (h) => {
      const c = get().mgHud;
      if (
        c.timer !== h.timer ||
        c.score !== h.score ||
        c.objective !== h.objective ||
        (c.lines ?? []).join('|') !== (h.lines ?? []).join('|')
      )
        set({ mgHud: h });
    },

    addCoins: (n) => {
      commit((p) => gainCoins(p, n));
    },
    addXp: (n) => {
      commit((p) => {
        gainXp(p, n);
      });
    },
    pickupCoin: (n = MONEDA_SUELTA) => {
      commit((p) => {
        gainCoins(p, n);
        p.stats.pickups += 1;
        bumpMissions(p, 'pickup', 1);
      });
    },
    collect: (deptId) => {
      if (get().profile.collected.includes(deptId)) return false;
      commit((p) => {
        p.collected.push(deptId);
        gainCoins(p, PREMIO_RECUERDO.monedas);
        gainXp(p, PREMIO_RECUERDO.xp);
        bumpMissions(p, 'collect', 1);
      });
      return true;
    },
    buy: (itemId) => {
      const item = itemById(itemId),
        p0 = get().profile;
      if (!item) return 'no';
      if (p0.owned.includes(itemId) || p0.emotes.includes(itemId)) return 'ya';
      if (SERVIDOR) {
        void get().comprar(itemId);
        return 'espera';
      }
      // `owned` ya se revisó arriba; aquí solo cuentan existencia, venta suelta y saldo
      const c = decidirCompra({ saldo: p0.coins, comprados: [], itemId });
      if (!c.ok) return c.motivo;
      commit((p) => {
        p.coins -= item.price;
        p.stats.purchases++;
        if (item.cat === 'emote') p.emotes.push(itemId);
        else p.owned.push(itemId);
        if (item.set)
          for (const [k, v] of Object.entries(item.set))
            if (!k.endsWith('Color') && k !== 'body' && k !== 'skin' && typeof v === 'string' && !p.owned.includes(v))
              p.owned.push(v);
      });
      return 'ok';
    },
    comprar: async (itemId) => {
      if (!SERVIDOR) {
        const r = get().buy(itemId);
        if (r === 'ok') get().equip(itemId);
        return r === 'espera' ? 'no' : r;
      }
      const r = await servidor.comprar(itemId);
      if (r.perfil) aplicar(r.perfil);
      if (r.ok) {
        commit((p) => {
          p.stats.purchases++;
        });
        return 'ok';
      }
      if (r.motivo === 'ya' || r.motivo === 'caro' || r.motivo === 'no') return r.motivo;
      get().toast('Sin conexión con el servidor: no se pudo comprar', '⚠️');
      return 'sin-conexion';
    },
    equip: (itemId) => {
      const item = itemById(itemId),
        p0 = get().profile;
      if (!item || item.cat === 'emote' || !p0.owned.includes(itemId)) return false;
      const cambios = cambiosDe(itemId);
      if (!cambios) return false;
      commit((p) => {
        Object.assign(p.avatar, cambios);
      });
      if (SERVIDOR) vestirEnServidor(servidor.equipar(itemId));
      return true;
    },
    setAvatar: (a) => {
      const p0 = get().profile,
        clean: Partial<AvatarConfig> = {};
      for (const [k, v] of Object.entries(a) as [keyof AvatarConfig, string][]) {
        if (k.endsWith('Color') || k === 'skin' || k === 'body' || p0.owned.includes(v)) (clean as any)[k] = v;
      }
      commit((p) => {
        Object.assign(p.avatar, clean);
      });
      if (SERVIDOR) vestirEnServidor(servidor.vestir(clean));
    },
    setName: (n) => {
      commit((p) => {
        p.name = n.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 16) || 'Catracho';
      });
    },
    finishCreation: () => {
      commit((p) => {
        p.created = true;
      });
      set({ panel: null });
    },
    useEmote: (id) => {
      if (!get().profile.emotes.includes(id)) return false;
      commit((p) => {
        p.stats.emotes++;
        bumpMissions(p, 'emote', 1);
      });
      return true;
    },
    alAire: (id) => set((s) => ({ memeAlAire: { id, n: (s.memeAlAire?.n ?? 0) + 1 } })),
    verMeme: (id) => {
      if (!memeById(id) || get().profile.memes.includes(id)) return false;
      commit((p) => {
        p.memes.push(id);
      });
      return true;
    },
    bump: (type, amount = 1, target) => {
      commit((p) => bumpMissions(p, type, amount, target));
    },
    claimMission: (id) => {
      const dm = get().profile.daily.missions.find((m) => m.id === id),
        m = MISSIONS.find((x) => x.id === id);
      if (!dm || !m || dm.claimed || dm.progress < m.count) return false;
      commit((p) => {
        p.daily.missions.find((x) => x.id === id)!.claimed = true;
        gainCoins(p, m.coins);
        gainXp(p, m.xp);
      });
      return true;
    },
    setSettings: (s) => {
      commit((p) => {
        Object.assign(p.settings, s);
      });
    },
    setRoom: (mode, code = '') => {
      commit((p) => {
        p.room = { mode, code };
      });
    },
    resetProgress: () => {
      const p = freshProfile();
      save(p);
      set({ profile: p, screen: 'menu', panel: null, mg: null, scene: { kind: 'lobby' } });
      // con Convex el saldo y lo comprado no se borran: se vuelven a leer del servidor
      if (SERVIDOR) void get().sincronizar();
    },
    sincronizar: async () => {
      if (!SERVIDOR) return false;
      const p = get().profile,
        sv = await servidor.entrar(p.name, p.avatar);
      if (sv) aplicar(sv);
      return !!sv;
    },
  };
});

// con Convex, al abrir el juego se trae el perfil del servidor (sin Convex no hay ninguna petición); si una
// llamada vence, se vuelve a leer para corregir el saldo que se ve
if (SERVIDOR) {
  alVencer.releer = () => useGame.getState().sincronizar();
  void useGame.getState().sincronizar();
}

/** El juego se detiene mientras hay un panel o un diálogo abierto, o antes y después de un minijuego. */
export const isPaused = () => {
  const s = useGame.getState();
  return s.screen !== 'world' || s.panel !== null || s.dialog !== null;
};
export const mgPlaying = () => {
  const s = useGame.getState();
  return !!s.mg && s.mg.phase === 'playing' && s.panel === null && s.dialog === null;
};
/** Nombre legible de un minijuego, para la interfaz. */
export const mgName = (id: MinigameId) => minigameById(id).name;
/** Nombre del juego en curso: el del catálogo si viene de un puesto, si no el del motor. */
export const mgTitulo = (mg: MgState) => (mg.juego ? juegoById(mg.juego)?.name : undefined) ?? minigameById(mg.id).name;
