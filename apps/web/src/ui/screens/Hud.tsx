// HUD del mundo: monedas, nivel y XP, misiones del día, sala, botones redondos, aviso de interacción,
// rótulo del lugar, avisos (toasts) y celebraciones. El contenedor no recibe clics: solo los controles.
import { useEffect, useRef, useState } from 'react';
import { audio } from '../../core/audio';
import { ACHIEVEMENTS, deptById, MISSIONS, minigameById, xpForLevel } from '../../core/data';
import { input } from '../../core/input';
import { player } from '../../core/player';
import { mgTitulo, useGame } from '../../core/store';
import type { PanelId } from '../../core/types';
import { BannerEventos } from '../../game/eventos/Banner';
import { ChatSala } from '../chat/ChatSala';
import { Coin, Icon, type IconName, Star } from '../components/Icon';
import { Bar, Confetti, IBtn } from '../components/kit';
import { act, cx, fmt, fmtTime, g, roomLabel, useCountUp, useOverview, usePad, useTouch } from '../lib';

const SIDE: [PanelId, IconName, string][] = [
  ['mapa', 'map', 'Mapa'],
  ['personaje', 'user', 'Personaje'],
  ['tienda', 'shop', 'Tienda'],
  ['misiones', 'missions', 'Misiones'],
  ['emotes', 'emote', 'Emotes'],
  ['amigos', 'users', 'Amigos'],
  ['memes', 'sparkle', 'Memes'],
  ['pausa', 'pause', 'Pausa'],
];

function Wallet() {
  const p = useGame((s) => s.profile),
    shown = useCountUp(p.coins, 700),
    need = xpForLevel(p.level);
  const [bump, setBump] = useState(0),
    prev = useRef(p.coins);
  useEffect(() => {
    if (p.coins > prev.current) setBump((b) => b + 1);
    prev.current = p.coins;
  }, [p.coins]);
  return (
    <div className="mc-hud pointer-events-auto flex items-center gap-2 py-1 pl-1 pr-2.5 sm:gap-3 sm:pr-3">
      <span data-testid="hud-level" className="mc-level" title={`Nivel ${p.level}`} aria-label={`Nivel ${p.level}`}>
        <Star size={40} />
        <b>{p.level}</b>
      </span>
      <div className="flex min-w-[5.5rem] flex-col gap-0.5 sm:min-w-[8rem]">
        <span className="flex items-baseline justify-between gap-2 leading-none">
          <b className="max-w-[6.5rem] truncate font-display text-sm font-semibold sm:max-w-[9rem]">{p.name}</b>
        </span>
        <Bar value={p.xp} max={need} color="var(--mc-accent)" cls="!h-2.5 hd:!h-1.5" />
        <span data-testid="hud-xp" className="mc-label mc-num !text-[10px] leading-none">
          {p.xp}/{need} XP
        </span>
      </div>
      <span className="h-8 w-px bg-line" />
      <span
        data-testid="hud-coins"
        data-value={p.coins}
        className="mc-num flex items-center gap-1.5 font-display text-lg font-semibold"
        aria-label={`${p.coins} Lempiritas`}
      >
        <Coin key={bump} size={26} cls={bump ? 'anim-coin' : ''} />
        {fmt(shown)}
      </span>
    </div>
  );
}

let trackerOpen: boolean | null = null;
function Tracker() {
  const daily = useGame((s) => s.profile.daily),
    room = useGame((s) => s.profile.room);
  const [open, setOpen] = useState(
    () => trackerOpen ?? (typeof innerWidth !== 'undefined' && innerWidth >= 900 && innerHeight >= 560),
  );
  const ready = daily.missions.filter(
    (d) => !d.claimed && d.progress >= (MISSIONS.find((m) => m.id === d.id)?.count ?? 1),
  ).length;
  const done = daily.missions.filter((d) => d.claimed).length;
  return (
    <div className="pointer-events-auto flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="hud-room"
          onClick={act(() => g().openPanel('salas'))}
          className="mc-hud mc-chip"
          aria-label={`Sala: ${roomLabel(room)}`}
        >
          <Icon name={room.mode === 'solo' ? 'user' : room.mode === 'privada' ? 'lock' : 'globe'} size={16} />
          <span className="max-w-[8.5rem] truncate">{roomLabel(room)}</span>
        </button>
        <button
          type="button"
          data-testid="hud-missions-toggle"
          aria-expanded={open}
          onClick={act(() => {
            trackerOpen = !open;
            setOpen(!open);
          })}
          className="mc-hud mc-chip"
          aria-label="Misiones de hoy"
        >
          <Icon name="missions" size={16} />
          <span>
            {done}/{daily.missions.length}
          </span>
          {ready > 0 && <i className="mc-dot" />}
          <Icon name="down" size={14} cls={cx('transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div
          data-testid="hud-missions"
          className="mc-hud anim-drop flex w-[15.5rem] flex-col gap-1.5 p-2 short:w-[13.5rem]"
        >
          {daily.missions.map((dm) => {
            const m = MISSIONS.find((x) => x.id === dm.id);
            if (!m) return null;
            const ok = dm.progress >= m.count;
            return (
              <button
                type="button"
                key={dm.id}
                onClick={act(() => g().openPanel('misiones'))}
                className="flex flex-col gap-1 rounded-lg px-1 py-0.5 text-left"
              >
                <span className="flex items-center justify-between gap-2 text-[12.5px] font-bold leading-tight">
                  <span className={cx('truncate', dm.claimed && 'line-through opacity-60')}>{m.text}</span>
                  {dm.claimed ? (
                    <Icon name="check" size={15} cls="text-good" />
                  ) : ok ? (
                    <span className="mc-tag anim-pulse">Cobrar</span>
                  ) : (
                    <span className="mc-num text-muted">
                      {Math.min(dm.progress, m.count)}/{m.count}
                    </span>
                  )}
                </span>
                {!dm.claimed && (
                  <Bar
                    value={dm.progress}
                    max={m.count}
                    color={ok ? 'var(--mc-gold)' : undefined}
                    cls="!h-1.5 rbx:!h-2 rbx:!border-[1.5px]"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Rótulo que aparece unos segundos al cambiar de lugar. */
function LocationBanner() {
  const scene = useGame((s) => s.scene),
    key = useGame((s) => s.sceneKey),
    run = useGame((s) => s.mg?.run ?? 0);
  const [show, setShow] = useState(true);
  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), 3600);
    return () => clearTimeout(t);
  }, [key]);
  if (!show || run > 0) return null;
  let title = 'Lobby',
    sub = 'Tegucigalpa',
    icon: IconName = 'home';
  if (scene.kind === 'dept') {
    const d = deptById(scene.id);
    title = d.name;
    sub = d.cabecera;
    icon = 'pin';
  } else if (scene.kind === 'viaje') {
    title = `Rumbo a ${deptById(scene.to).name}`;
    sub = 'Agarrate';
    icon = 'map';
  } else if (scene.kind === 'minigame') {
    const m = minigameById(scene.id),
      mgs = useGame.getState().mg;
    title = mgs ? mgTitulo(mgs) : m.name;
    sub = m.place;
    icon = 'gamepad';
  } else {
    title = 'Honduras';
    sub = 'El mapa gigante';
  }
  return (
    <div key={key} data-testid="hud-banner" className="mc-banner anim-banner pointer-events-none" role="status">
      <Icon name={icon} size={22} />
      <span className="flex flex-col leading-tight">
        <b className="font-display text-xl font-semibold sm:text-2xl">{title}</b>
        <span className="mc-label">{sub}</span>
      </span>
    </div>
  );
}

function MgHud() {
  const hud = useGame((s) => s.mgHud),
    low = hud.timer !== undefined && hud.timer <= 10;
  return (
    <div
      data-testid="mg-hud"
      className="mc-hud mc-mghud pointer-events-none flex flex-col items-center gap-0.5 px-3 py-1.5 text-center sm:px-5"
    >
      <div className="flex items-center gap-3 sm:gap-5">
        {hud.timer !== undefined && (
          <span
            data-testid="mg-timer"
            data-low={low}
            className={cx('mc-timer mc-num flex items-center gap-1.5', low && 'anim-pulse')}
          >
            <Icon name="clock" size={22} />
            {fmtTime(hud.timer)}
          </span>
        )}
        {hud.score && (
          <span data-testid="mg-score" className="mc-score mc-num">
            {hud.score}
          </span>
        )}
      </div>
      {hud.objective && (
        <div className="max-w-[70vw] text-[13px] font-bold leading-tight sm:max-w-md sm:text-sm">{hud.objective}</div>
      )}
      {hud.lines?.map((l, i) => (
        <div key={i} className="max-w-[70vw] text-xs leading-tight text-muted sm:max-w-md">
          {l}
        </div>
      ))}
    </div>
  );
}

/** En la vista desde arriba: cartel abajo con el botón para volver al muñeco. */
function OverviewBar() {
  const touch = useTouch(),
    pad = usePad();
  return (
    <div
      data-testid="hud-vista"
      className="anim-up pointer-events-auto absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] flex flex-col items-start gap-1.5"
    >
      <button
        type="button"
        data-testid="hud-vista-volver"
        onClick={act(() => player.setOverview(false))}
        className="mc-prompt whitespace-nowrap"
        style={{ position: 'static', translate: 'none' }}
      >
        {pad ? (
          <kbd className="mc-key" data-gold="true">
            A
          </kbd>
        ) : (
          <Icon name="user" size={22} />
        )}
        <span>Volver al muñeco</span>
      </button>
      <span className="mc-hud mc-chip !text-[12px]">
        {pad
          ? 'A, B o LB vuelven'
          : touch
            ? 'Tocá la pantalla o juntá los dedos'
            : 'Clic en el mapa o rueda hacia adelante'}
      </span>
    </div>
  );
}

function Prompt() {
  const prompt = useGame((s) => s.prompt),
    touch = useTouch(),
    pad = usePad();
  if (!prompt) return null;
  return (
    <button
      type="button"
      data-testid="prompt"
      onClick={() => {
        audio.init();
        input.press('use');
      }}
      className={cx('mc-prompt anim-up pointer-events-auto', touch && 'is-touch')}
    >
      {touch && !pad ? (
        <Icon name="hand" size={24} />
      ) : (
        <kbd className="mc-key" data-gold="true">
          {pad ? 'X' : 'E'}
        </kbd>
      )}
      <span className="flex items-center gap-1.5">
        {prompt.icon && <span aria-hidden>{prompt.icon}</span>}
        <span className="max-w-[60vw] truncate">{prompt.label}</span>
      </span>
    </button>
  );
}

/** Subida de nivel y logros nuevos: confeti, sonido y un cartel que se va solo. No bloquea el juego. */
function Celebrations() {
  const level = useGame((s) => s.profile.level),
    ach = useGame((s) => s.profile.achievements);
  const prev = useRef({ level, ach: ach.length }),
    [queue, setQueue] = useState<{ id: number; kind: 'level' | 'ach'; title: string; sub: string; icon?: string }[]>(
      [],
    ),
    seq = useRef(0);
  useEffect(() => {
    const p = prev.current,
      add: typeof queue = [];
    if (level > p.level)
      add.push({
        id: ++seq.current,
        kind: 'level',
        title: `¡Nivel ${level}!`,
        sub: 'Subiste de nivel · +50 Lempiritas',
      });
    if (ach.length > p.ach)
      for (const id of ach.slice(p.ach)) {
        const a = ACHIEVEMENTS.find((x) => x.id === id);
        if (a)
          add.push({
            id: ++seq.current,
            kind: 'ach',
            title: a.name,
            sub: `Logro desbloqueado · +${a.coins} Lempiritas`,
            icon: a.icon,
          });
      }
    prev.current = { level, ach: ach.length };
    if (add.length && g().mg?.phase !== 'ended') setQueue((q) => [...q, ...add].slice(-3)); // en los resultados del minijuego ya se muestran
  }, [level, ach]);
  const cur = queue[0];
  useEffect(() => {
    if (!cur) return;
    audio.sfx(cur.kind === 'level' ? 'levelup' : 'star');
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 2900);
    return () => clearTimeout(t);
  }, [cur?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cur) return null;
  return (
    <div
      key={cur.id}
      data-testid="celebration"
      data-kind={cur.kind}
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
      role="status"
    >
      <Confetti count={cur.kind === 'level' ? 130 : 70} />
      <div className="mc-celebrate anim-flash flex flex-col items-center gap-1 px-7 py-4 text-center">
        {cur.kind === 'level' ? (
          <Star size={64} cls="anim-wiggle" />
        ) : (
          <span className="text-5xl" aria-hidden>
            {cur.icon}
          </span>
        )}
        <b className="font-display text-3xl font-bold sm:text-4xl">{cur.title}</b>
        <span className="text-sm font-bold opacity-90">{cur.sub}</span>
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const viaje = useGame((s) => s.scene.kind === 'viaje');
  return (
    <div
      className={`mc-toasts pointer-events-none absolute z-40 flex flex-col items-center gap-1.5 ${viaje ? '' : 'left-1/2 -translate-x-1/2'}`}
      data-viaje={viaje || undefined}
      aria-live="polite"
    >
      {(viaje ? toasts.slice(-2) : toasts).map((t) => (
        <div key={t.id} data-testid="toast" className="mc-toast anim-drop">
          {t.icon && (
            <span aria-hidden className="text-lg leading-none">
              {t.icon}
            </span>
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function Hud() {
  const mg = useGame((s) => s.mg),
    panel = useGame((s) => s.panel),
    playing = mg?.phase === 'playing',
    lobby = useGame((s) => s.scene.kind === 'lobby'),
    overview = useOverview();
  const side = SIDE.filter(([id]) => !mg || id === 'pausa' || id === 'emotes');
  return (
    <div data-testid="hud" className="pad-safe pointer-events-none absolute inset-0 text-hudfg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <Wallet />
          {!mg && !overview && <Tracker />}
        </div>
        <div
          className={cx('pointer-events-auto flex flex-none gap-1.5', mg ? 'flex-row' : 'flex-col-reverse sm:flex-row')}
        >
          {lobby && !mg && (
            <IBtn
              id="hud-btn-vista"
              icon="eye"
              label={overview ? 'Volver al muñeco' : 'Ver toda Honduras'}
              onClick={() => player.setOverview(!player.overview)}
            />
          )}
          {side.map(([id, icon, label]) => (
            <IBtn key={id} id={`hud-btn-${id}`} icon={icon} label={label} onClick={() => g().openPanel(id)} />
          ))}
        </div>
      </div>
      <div className="mc-hud-center pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        {playing && <MgHud />}
        {!panel && (!mg || mg.phase === 'intro') && <LocationBanner />}
      </div>
      {!panel && (!mg || playing) && !overview && <Prompt />}
      {!panel && lobby && !mg && overview && <OverviewBar />}
      {!overview && <ChatSala />}
      <BannerEventos />
      <Celebrations />
    </div>
  );
}
