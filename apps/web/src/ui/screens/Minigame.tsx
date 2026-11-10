// Flujo de un minijuego: tarjeta de inicio (qué es, cómo se juega, tu mejor marca) y pantalla de resultados.
import { useEffect, useMemo } from 'react';
import { audio } from '../../core/audio';
import { ACHIEVEMENTS, catDe, deptById, juegoById, minigameById } from '../../core/data';
import { leaderboard } from '../../core/leaderboard';
import { type Best, useGame } from '../../core/store';
import type { MinigameId, Modo } from '../../core/types';
import { MOTOR_GUIDES } from '../../game/minigames';
import { partida } from '../../game/minigames/api';
import { Coin, Icon, type IconName, Star } from '../components/Icon';
import { Btn, Confetti, Stars, Tag } from '../components/kit';
import { cx, fmtTime, g, useCountUp, useTouch } from '../lib';

interface Guide {
  goal: string;
  keys: [string, string][];
  touch: [string, string][];
  stars: (r: Record<string, any>) => [string, string, string];
}
/** Controles y metas de cada minijuego. Las metas salen de shared/data/minigames.json. */
export const GUIDE: Partial<Record<MinigameId, Guide>> = {
  carrera: {
    goal: 'Llega a la meta antes de que se acabe el tiempo.',
    keys: [
      ['WASD', 'moverte'],
      ['Shift', 'correr'],
      ['Espacio', 'saltar'],
    ],
    touch: [
      ['Palanca', 'moverte y correr'],
      ['⬆', 'saltar'],
    ],
    stars: (r) => [fmtTime(r.bronze), fmtTime(r.silver), fmtTime(r.gold)],
  },
  futbol: {
    goal: 'Mete más goles que el otro equipo.',
    keys: [
      ['WASD', 'moverte'],
      ['Clic / F', 'patear'],
      ['Q', 'pase'],
      ['Shift', 'correr'],
    ],
    touch: [
      ['Palanca', 'moverte'],
      ['🎯', 'patear'],
    ],
    stars: (r) => ['Ganar', 'Ganar por 2', `${r.goldGoals} goles`],
  },
  feria: {
    goal: 'Suma puntos en los tres puestos de la feria.',
    keys: [
      ['E', 'entrar al puesto'],
      ['Mouse', 'apuntar'],
      ['Clic / F', 'tirar'],
    ],
    touch: [
      ['E', 'entrar al puesto'],
      ['Arrastra', 'apuntar'],
      ['🎯', 'tirar'],
    ],
    stars: (r) => [`${r.bronze} pts`, `${r.silver} pts`, `${r.gold} pts`],
  },
  exploradores: {
    goal: 'Encuentra los objetos escondidos en cada lugar.',
    keys: [
      ['WASD', 'explorar'],
      ['E', 'recoger'],
      ['Espacio', 'saltar'],
    ],
    touch: [
      ['Palanca', 'explorar'],
      ['E', 'recoger'],
    ],
    stars: (r) => [`${r.bronze} objetos`, `${r.silver} objetos`, `${r.gold} objetos`],
  },
  pulperia: {
    goal: 'Lleva a cada cliente lo que pide antes de que se vaya.',
    keys: [
      ['WASD', 'moverte'],
      ['E', 'agarrar y entregar'],
    ],
    touch: [
      ['Palanca', 'moverte'],
      ['E', 'agarrar y entregar'],
    ],
    stars: (r) => [`${r.bronze} pts`, `${r.silver} pts`, `${r.gold} pts`],
  },
};

// Para saber si la marca es nueva hay que recordar la anterior: la tienda la reemplaza al terminar.
const before: { id: MinigameId | null; run: number; best: Best | undefined } = { id: null, run: -1, best: undefined };
useGame.subscribe((s) => {
  const m = s.mg;
  if (m && m.phase !== 'ended' && (before.id !== m.id || before.run !== m.run)) {
    before.id = m.id;
    before.run = m.run;
    before.best = s.profile.best[m.id];
  }
});

export function MgIntro() {
  const mg = useGame((s) => s.mg)!,
    bestMotor = useGame((s) => s.profile.best[mg.id]),
    prog = useGame((s) => (mg.juego ? s.profile.juegos[mg.juego] : undefined)),
    touch = useTouch();
  const base = minigameById(mg.id),
    j = mg.juego ? juegoById(mg.juego) : undefined,
    P = partida();
  const lugar = j ? catDe(j.dept).lugares.find((l) => l.id === j.lugar)?.name : undefined;
  const m = j
    ? {
        ...base,
        name: j.name,
        icon: j.icon,
        desc: j.desc,
        place: `${lugar ?? ''}${lugar ? ', ' : ''}${deptById(j.dept).name}`,
      }
    : base;
  const old = GUIDE[mg.id],
    nu = MOTOR_GUIDES[mg.id],
    guide = old ?? nu!,
    stars = old ? old.stars(base.rules) : nu!.metas(P);
  const best = j
    ? prog?.label
      ? { stars: Math.max(0, ...(prog.stars ?? []).map((x) => x ?? 0)), label: prog.label }
      : undefined
    : bestMotor;
  return (
    <div className="mc-overlay pad-safe-sm pointer-events-auto absolute inset-0 z-10 flex items-center justify-center">
      <div
        data-testid="mg-intro"
        role="dialog"
        aria-modal="true"
        aria-label={m.name}
        className="mc-panel mc-scroll flex max-h-full w-full max-w-xl flex-col"
      >
        <div className="mc-intro-head flex items-center gap-3 px-4 py-3 short:py-2">
          <span className="mc-bigicon" aria-hidden>
            {m.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold leading-none sm:text-3xl">{m.name}</h2>
              {m.bonus && <Tag>Bono</Tag>}
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm font-bold opacity-90">
              <Icon name="pin" size={15} />
              {m.place}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 p-4 short:gap-2 short:p-3">
          <p className="text-[15px] leading-snug short:text-sm">{m.desc}</p>
          {j?.guino && (
            <p data-testid="mg-guino" className="mc-card flex items-start gap-2 px-3 py-2 text-sm italic leading-snug">
              <span aria-hidden>🇭🇳</span>
              <span>{j.guino}</span>
            </p>
          )}
          {j && (
            <div data-testid="mg-etapas" className="flex items-center gap-2 text-sm font-bold">
              <span className="mc-label">
                Etapa {mg.etapa + 1} de {j.etapas}
              </span>
              <span className="flex gap-1">
                {Array.from({ length: j.etapas }, (_, i) => (
                  <span
                    key={i}
                    className={cx(
                      'h-2.5 w-6 rounded-full',
                      i < (prog?.etapa ?? 0)
                        ? 'bg-[var(--mc-gold,#f6b91a)]'
                        : i === mg.etapa
                          ? 'bg-white/70'
                          : 'bg-white/20',
                    )}
                  />
                ))}
              </span>
              <span className="text-xs font-normal text-muted">Tu avance se guarda</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Modo de juego">
            {MODOS.map(([id, name, sub]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mg.modo === id}
                data-testid={`mg-modo-${id}`}
                data-on={mg.modo === id}
                onClick={() => g().setModo(id)}
                className={cx(
                  'mc-card flex flex-col items-center px-1.5 py-1.5 text-center leading-tight',
                  mg.modo === id && 'ring-2 ring-[var(--mc-gold,#f6b91a)]',
                )}
              >
                <b className="text-sm">{name}</b>
                <span className="text-[11px] text-muted">{sub}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="mc-card p-2.5">
              <div className="mc-label mb-1.5">Cómo se juega</div>
              <ul className="flex flex-col gap-1.5 text-sm">
                {(touch ? guide.touch : guide.keys).map(([k, what]) => (
                  <li key={k} className="flex items-center gap-2">
                    <kbd className="mc-key text-[12px]">{k}</kbd>
                    <span>{what}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mc-card p-2.5">
              <div className="mc-label mb-1.5">Estrellas</div>
              <ul className="flex flex-col gap-1 text-sm">
                {stars.map((s, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="flex">
                      {[0, 1, 2].map((k) => (
                        <Star key={k} on={k <= i} size={16} />
                      ))}
                    </span>
                    <b className="mc-num">{s}</b>
                  </li>
                ))}
              </ul>
              <div
                className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-1.5 text-sm"
                data-testid="mg-best"
              >
                <span className="mc-label">Tu mejor marca</span>
                {best ? (
                  <span className="flex items-center gap-1.5">
                    <Stars n={best.stars} size={15} />
                    <b className="mc-num">{best.label}</b>
                  </span>
                ) : (
                  <span className="text-muted">Aún no juegas</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn id="mg-back" tone="neutral" icon="back" onClick={() => g().exitMinigame()}>
              Volver
            </Btn>
            <Btn
              id="mg-start"
              tone="play"
              size="lg"
              icon="play"
              cls="mc-shine flex-1"
              sfx="go"
              onClick={() => g().beginMinigame()}
            >
              ¡Empezar!
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Modos de juego. No hay servidor en el prototipo: los demás jugadores son bots y así se muestran. */
const MODOS: [Modo, string, string][] = [
  ['solo', 'Solo', 'contra bots'],
  ['duo', 'Dúo', 'vos + compa'],
  ['abierto', 'Mundo abierto', 'sala con bots'],
];

function Reward({ icon, n, label, delay }: { icon: 'coin' | IconName; n: number; label: string; delay: number }) {
  const shown = useCountUp(n, 900, 0);
  return (
    <div
      className="mc-card anim-up flex flex-1 flex-col items-center px-2 py-2"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="mc-num flex items-center gap-1.5 font-display text-2xl font-bold sm:text-3xl">
        {icon === 'coin' ? <Coin size={26} /> : <Icon name={icon} size={24} cls="text-accent" />}+{shown}
      </span>
      <span className="mc-label">{label}</span>
    </div>
  );
}

export function MgResults() {
  const mg = useGame((s) => s.mg)!,
    profile = useGame((s) => s.profile),
    r = mg.result!,
    w = mg.rewards!,
    j = mg.juego ? juegoById(mg.juego) : undefined,
    m = j ? { ...minigameById(mg.id), name: j.name, icon: j.icon } : minigameById(mg.id);
  const sigue = !!j && r.won && mg.etapa + 1 < j.etapas,
    completo = !!j && r.won && mg.etapa + 1 >= j.etapas;
  useEffect(() => {
    audio.sfx(r.won ? 'win' : 'lose');
    const ts = Array.from({ length: r.stars }, (_, i) => setTimeout(() => audio.sfx('star'), 420 + i * 320));
    const lv = w.leveledUp ? setTimeout(() => audio.sfx('levelup'), 1500) : 0;
    return () => {
      ts.forEach(clearTimeout);
      clearTimeout(lv);
    };
  }, [r.won, r.stars, w.leveledUp]);
  const record = !before.best || r.score > before.best.score;
  const pos = useMemo(() => {
    const rows = leaderboard(mg.id, profile),
      i = rows.findIndex((x) => x.you);
    return { n: i + 1, of: rows.length };
  }, [mg.id, profile]);
  const ach = w.newAchievements
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean) as typeof ACHIEVEMENTS;
  return (
    <div className="mc-overlay pad-safe-sm pointer-events-auto absolute inset-0 z-10 flex items-center justify-center">
      {r.won && <Confetti count={r.stars >= 3 ? 170 : 110} />}
      <div
        data-testid="mg-result"
        data-won={r.won}
        role="dialog"
        aria-modal="true"
        aria-label="Resultados"
        className="mc-panel mc-scroll relative flex max-h-full w-full max-w-lg flex-col items-center gap-2.5 p-4 text-center short:gap-1.5 short:p-3 sm:p-6"
      >
        <div className="mc-label flex items-center gap-1.5">
          <span aria-hidden>{m.icon}</span>
          {m.name}
        </div>
        <h2
          data-testid="mg-result-title"
          className={cx(
            'mc-result-title font-display text-5xl font-bold leading-none short:text-4xl',
            r.won ? 'is-won' : 'is-lost',
          )}
        >
          {r.won ? '¡Ganaste!' : 'Casi…'}
        </h2>
        <Stars n={r.stars} size={58} pop cls="short:scale-75 short:-my-2" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span data-testid="mg-result-label" className="mc-num font-display text-3xl font-semibold short:text-2xl">
            {r.label}
          </span>
          {record && r.score > 0 && (
            <span data-testid="mg-record">
              <Tag cls="anim-pulse">¡Nueva marca!</Tag>
            </span>
          )}
        </div>
        <div
          data-testid="mg-result-rewards"
          data-coins={w.coins}
          data-xp={w.xp}
          className="flex w-full gap-2"
          aria-label={`Ganaste ${w.coins} Lempiritas y ${w.xp} de experiencia`}
        >
          <Reward icon="coin" n={w.coins} label="Lempiritas" delay={0.5} />
          <Reward icon="bolt" n={w.xp} label="XP" delay={0.65} />
          {pos.n > 0 && (
            <div
              className="mc-card anim-up flex flex-1 flex-col items-center px-2 py-2"
              style={{ animationDelay: '.8s' }}
              data-testid="mg-result-rank"
            >
              <span className="mc-num flex items-center gap-1.5 font-display text-2xl font-bold sm:text-3xl">
                <Icon name="trophy" size={24} cls="text-gold" />#{pos.n}
              </span>
              <span className="mc-label">de {pos.of}</span>
            </div>
          )}
        </div>
        {w.leveledUp && (
          <div
            data-testid="mg-levelup"
            className="mc-levelup anim-pop flex items-center gap-2 px-4 py-1.5"
            style={{ animationDelay: '1.4s' }}
          >
            <Star size={26} cls="anim-wiggle" />
            <b className="font-display text-lg">¡Subiste al nivel {profile.level}!</b>
            <span className="flex items-center gap-1 text-sm font-bold">
              <Coin size={16} />
              +50
            </span>
          </div>
        )}
        {ach.length > 0 && (
          <div className="flex w-full flex-col gap-1.5">
            {ach.map((a) => (
              <div
                key={a.id}
                data-testid={`mg-ach-${a.id}`}
                className="mc-card anim-up flex items-center gap-2.5 px-3 py-1.5 text-left"
                data-on="true"
                style={{ animationDelay: '1.1s' }}
              >
                <span className="text-2xl" aria-hidden>
                  {a.icon}
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate">Logro: {a.name}</b>
                  <span className="text-xs text-muted">{a.desc}</span>
                </span>
                <span className="mc-num flex items-center gap-1 text-sm font-bold">
                  <Coin size={16} />+{a.coins}
                </span>
              </div>
            ))}
          </div>
        )}
        {j && (
          <div data-testid="mg-result-etapa" className="mc-label">
            {completo
              ? `¡Completaste las ${j.etapas} etapas!`
              : r.won
                ? `Etapa ${mg.etapa + 1} de ${j.etapas} ganada`
                : `Etapa ${mg.etapa + 1} de ${j.etapas}`}
          </div>
        )}
        {mg.ranking && (
          <ol data-testid="mg-ranking" className="mc-card flex w-full flex-col gap-0.5 px-3 py-1.5 text-left text-sm">
            {mg.ranking.slice(0, 5).map((row, i) => (
              <li
                key={i}
                className={cx('flex items-center gap-2', row.you && 'font-bold text-[var(--mc-gold,#f6b91a)]')}
              >
                <span className="mc-num w-5">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate">
                  {row.bot ? '🤖 ' : ''}
                  {row.name}
                </span>
                <span className="mc-num">{row.label}</span>
              </li>
            ))}
          </ol>
        )}
        {!r.won && <p className="text-sm text-muted">No pasa nada. ¡Dale otra vez, que sí se puede!</p>}
        <div className="mt-1 flex w-full gap-2">
          <Btn id="mg-replay" tone="primary" icon="refresh" cls="flex-1" onClick={() => g().replayMinigame()}>
            {sigue ? 'Siguiente etapa' : 'Otra vez'}
          </Btn>
          <Btn id="mg-exit" tone="gold" icon="home" cls="flex-1" onClick={() => g().exitMinigame()}>
            {mg.origen.kind === 'dept' ? 'Volver' : 'Al lobby'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
