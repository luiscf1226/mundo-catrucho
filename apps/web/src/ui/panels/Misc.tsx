// Paneles sencillos: minijuegos, misiones, logros, clasificación, salas, ajustes, controles, emotes y pausa.
import { SALA } from '@mundo-catrucho/reglas';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { audio } from '../../core/audio';
import { ACHIEVEMENTS, catDe, DEPARTMENTS, juegoById, MINIGAMES, MISSIONS, minigameById, SHOP } from '../../core/data';
import { leaderboard, scoreLabel } from '../../core/leaderboard';
import { net, nombreDeSala, type RoomInfo, useSala } from '../../core/net';
import { type Clasificacion, type FilaClasificacion, SERVIDOR, servidor } from '../../core/servidor';
import { useGame } from '../../core/store';
import type { MinigameId } from '../../core/types';
import { playEmote } from '../../game/PlayerController';
import { IS_HD } from '../../variant';
import { Coin, Icon, type IconName } from '../components/Icon';
import { Bar, Btn, Coins, Note, Panel, Tabs, Tag } from '../components/kit';
import { act, copyText, cx, EMOTE_ICON, g, roomLabel, usePad, useTouch } from '../lib';

// ------------------------------------------------------------------ misiones del día
export function MissionsPanel() {
  const daily = useGame((s) => s.profile.daily);
  const left = daily.missions.filter((d) => !d.claimed).length;
  return (
    <Panel id="misiones" title="Misiones de hoy" icon="missions" size="md">
      <div className="grid gap-2.5">
        {daily.missions.map((dm) => {
          const m = MISSIONS.find((x) => x.id === dm.id);
          if (!m) return null;
          const done = dm.progress >= m.count;
          return (
            <div
              key={dm.id}
              data-testid={`mission-${dm.id}`}
              data-done={done}
              data-claimed={dm.claimed}
              data-on={done && !dm.claimed}
              className={cx('mc-card flex items-center gap-3 p-3', dm.claimed && 'opacity-70')}
            >
              <span className={cx('mc-check flex-none', (done || dm.claimed) && 'is-on')}>
                <Icon name={dm.claimed ? 'check' : done ? 'sparkle' : 'target'} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block leading-tight">{m.text}</b>
                <div className="mt-1.5 flex items-center gap-2">
                  <Bar value={dm.progress} max={m.count} color={done ? 'var(--mc-gold)' : undefined} cls="flex-1" />
                  <span className="mc-num w-12 text-right text-xs font-extrabold">
                    {Math.min(dm.progress, m.count)}/{m.count}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs font-bold text-muted">
                  <span className="flex items-center gap-1">
                    <Coin size={14} />+{m.coins}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="bolt" size={13} />+{m.xp} XP
                  </span>
                </div>
              </div>
              {dm.claimed ? (
                <Tag color="#17a673" fg="#fff">
                  Cobrada
                </Tag>
              ) : done ? (
                <Btn
                  id={`mission-claim-${dm.id}`}
                  tone="gold"
                  cls="anim-pulse"
                  sfx="coin"
                  onClick={() => {
                    g().claimMission(dm.id);
                  }}
                >
                  Cobrar
                </Btn>
              ) : null}
            </div>
          );
        })}
      </div>
      <Note cls="mt-3" icon="clock">
        {left === 0
          ? '¡Cheque! Ya cobraste todo por hoy. Mañana hay misiones nuevas.'
          : 'Las misiones cambian cada día. Las que completes se cobran aquí.'}
      </Note>
    </Panel>
  );
}

// ------------------------------------------------------------------ logros
export function AchievementsPanel() {
  const got = useGame((s) => s.profile.achievements);
  return (
    <Panel
      id="logros"
      title="Logros"
      icon="medal"
      size="lg"
      extra={
        <span className="mc-balance mc-num font-display font-semibold" data-testid="ach-count">
          {got.length}/{ACHIEVEMENTS.length}
        </span>
      }
    >
      <Bar value={got.length} max={ACHIEVEMENTS.length} color="var(--mc-gold)" cls="mb-3" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const on = got.includes(a.id);
          return (
            <div
              key={a.id}
              data-testid={`ach-${a.id}`}
              data-unlocked={on}
              data-on={on}
              data-dim={!on}
              className="mc-card flex items-center gap-2.5 p-2.5"
            >
              <span className={cx('mc-medal flex-none', on && 'is-on')} aria-hidden>
                {on ? a.icon : <Icon name="lock" size={20} />}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <b className="block text-[14.5px] leading-tight">{a.name}</b>
                <span className="block text-xs text-muted">{a.desc}</span>
                <span className="mc-num mt-0.5 flex items-center gap-1 text-xs font-extrabold">
                  <Coin size={13} />+{a.coins}
                  {on && (
                    <span className="ml-1 flex items-center gap-0.5 text-good">
                      <Icon name="check" size={13} />
                      Listo
                    </span>
                  )}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ------------------------------------------------------------------ clasificación
export function LeaderboardPanel() {
  return SERVIDOR ? <LeaderboardServidor /> : <LeaderboardLocal />;
}
function LeaderboardLocal() {
  const p = useGame((s) => s.profile),
    mg = useGame((s) => s.mg),
    [id, setId] = useState<MinigameId>(mg?.id ?? 'carrera');
  const rows = leaderboard(id, p),
    you = rows.some((r) => r.you);
  return (
    <Panel id="clasificacion" title="Clasificación" icon="trophy" size="md">
      <Tabs
        items={MINIGAMES.map((m) => ({ id: m.id, label: m.name, emoji: m.icon }))}
        value={id}
        onChange={setId}
        testid={(i) => `lb-tab-${i}`}
        compact
        cls="mb-3"
      />
      <ol className="grid gap-1.5" data-testid="lb-list">
        {rows.map((r, i) => (
          <li
            key={r.name + i}
            data-testid={r.you ? 'lb-you' : undefined}
            data-rank={i + 1}
            data-on={!!r.you}
            className={cx('mc-card mc-lbrow flex items-center gap-2.5 px-2.5 py-1.5', r.you && 'is-you')}
          >
            <span className={cx('mc-rank mc-num flex-none', i < 3 && `is-top${i + 1}`)}>{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-bold">
              {r.name}
              {r.you && (
                <span className="ml-1.5">
                  <Tag>Tú</Tag>
                </span>
              )}
            </span>
            <b className="mc-num font-display text-[15px]">{r.label}</b>
          </li>
        ))}
      </ol>
      {!you && (
        <div className="mc-card mt-2 flex items-center justify-between gap-2 p-2.5 text-sm">
          <span className="font-bold">Aún no tienes marca en este minijuego.</span>
          <Btn id="lb-play" tone="play" size="sm" icon="play" onClick={() => g().startMinigame(id)}>
            Jugar
          </Btn>
        </div>
      )}
      <Note cls="mt-3">Los rivales son simulados. La tabla en línea llega con el multijugador.</Note>
    </Panel>
  );
}

/** Etiqueta de una marca del servidor con el formato de su motor (tiempo, goles, objetos o puntos). */
const etiquetaDe = (juegoId: string, puntos: number) =>
  scoreLabel(juegoById(juegoId)?.motor ?? (juegoId as MinigameId), puntos);
const nombreDeJuego = (juegoId: string) =>
  juegoById(juegoId)?.name ?? (juegoId.includes('.') ? juegoId : minigameById(juegoId as MinigameId)?.name) ?? juegoId;
const LOBBY = 'lobby';

/** Con Convex: los mejores de verdad por juego y por departamento (MC-17). */
function LeaderboardServidor() {
  const scene = useGame((s) => s.scene),
    mg = useGame((s) => s.mg);
  const inicial = () => {
    const j = mg?.juego ? juegoById(mg.juego) : undefined;
    if (j) return { dept: j.dept, juego: j.id };
    if (mg) return { dept: LOBBY, juego: mg.id as string };
    const dept = scene.kind === 'dept' ? scene.id : LOBBY;
    return { dept, juego: dept === LOBBY ? 'carrera' : (catDe(dept).juegos[0]?.id ?? 'carrera') };
  };
  const [modo, setModo] = useState<'juego' | 'depto'>('juego'),
    [dept, setDept] = useState(() => inicial().dept),
    [juego, setJuego] = useState(() => inicial().juego),
    [datos, setDatos] = useState<Clasificacion | 'cargando' | 'error'>('cargando');
  const juegos =
    dept === LOBBY
      ? MINIGAMES.map((m) => ({ id: m.id as string, name: m.name }))
      : catDe(dept).juegos.map((j) => ({ id: j.id, name: j.name }));
  const elegirDept = (d: string) => {
    setDept(d);
    setJuego(d === LOBBY ? 'carrera' : (catDe(d).juegos[0]?.id ?? 'carrera'));
  };
  const porDepto = modo === 'depto' && dept !== LOBBY;
  useEffect(() => {
    let vivo = true;
    setDatos('cargando');
    void (porDepto ? servidor.porDepto(dept) : servidor.porJuego(juego)).then((r) => {
      if (vivo) setDatos(r ?? 'error');
    });
    return () => {
      vivo = false;
    };
  }, [porDepto, dept, juego]);
  const fila = (r: FilaClasificacion, puesto: number | null) => (
    <li
      key={`${r.nombre}-${r.juegoId}-${puesto ?? 'tu'}`}
      data-testid={r.tu ? 'lb-you' : 'lb-row'}
      data-rank={puesto ?? undefined}
      data-puntos={r.puntos}
      data-on={r.tu}
      className={cx('mc-card mc-lbrow flex items-center gap-2.5 px-2.5 py-1.5', r.tu && 'is-you')}
    >
      <span className={cx('mc-rank mc-num flex-none', puesto !== null && puesto <= 3 && `is-top${puesto}`)}>
        {puesto ?? '—'}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate font-bold">
          {r.nombre}
          {r.tu && (
            <span className="ml-1.5">
              <Tag>Vos</Tag>
            </span>
          )}
        </span>
        {porDepto && <span className="block truncate text-xs text-muted">{nombreDeJuego(r.juegoId)}</span>}
      </span>
      <b className="mc-num font-display text-[15px]">{etiquetaDe(r.juegoId, r.puntos)}</b>
    </li>
  );
  return (
    <Panel id="clasificacion" title="Clasificación" icon="trophy" size="md">
      <Tabs
        items={[
          { id: 'juego', label: 'Por juego', icon: 'play' },
          { id: 'depto', label: 'Por departamento', icon: 'map' },
        ]}
        value={modo}
        onChange={setModo}
        testid={(i) => `lb-modo-${i}`}
        cls="mb-2"
      />
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-muted">
          Departamento
          <select data-testid="lb-depto" className="mc-input" value={dept} onChange={(e) => elegirDept(e.target.value)}>
            <option value={LOBBY}>Lobby (minijuegos)</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        {!porDepto && (
          <label className="grid gap-1 text-xs font-bold text-muted">
            Juego
            <select
              data-testid="lb-juego"
              className="mc-input"
              value={juego}
              onChange={(e) => setJuego(e.target.value)}
            >
              {juegos.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {datos === 'cargando' ? (
        <p data-testid="lb-cargando" className="mc-label py-4 text-center">
          Cargando la tabla…
        </p>
      ) : datos === 'error' ? (
        <p data-testid="lb-error" className="mc-label py-4 text-center">
          Sin conexión con el servidor. Probá otra vez en un rato.
        </p>
      ) : datos.filas.length === 0 ? (
        <p data-testid="lb-vacia" className="mc-label py-4 text-center">
          Nadie tiene marca todavía. ¡Estrená la tabla!
        </p>
      ) : (
        <ol className="grid gap-1.5" data-testid="lb-list" data-fuente="servidor">
          {datos.filas.map((r, i) => fila(r, i + 1))}
          {datos.tuya && fila(datos.tuya, null)}
        </ol>
      )}
      <Note cls="mt-3">
        {porDepto
          ? 'La mejor marca de cada jugador en los juegos de este departamento.'
          : 'Jugadores de verdad: solo cuentan las partidas que validó el servidor.'}
      </Note>
    </Panel>
  );
}

// ------------------------------------------------------------------ salas
const ESTADO_SALA = {
  apagada: 'Jugando solo',
  buscando: 'Buscando sala…',
  'en-sala': 'En vivo',
  'sin-conexion': 'Sin conexión: reintentando',
  'otra-pestana': 'Abriste el juego en otra pestaña',
} as const;
const deptName = (id: string) => DEPARTMENTS.find((d) => d.id === id)?.name ?? id;
/** Salas en vivo (MC-20): se reparten solas por zona y tramos de 24; aquí solo se elige jugar solo o con gente. */
function SalasEnVivo() {
  const room = useGame((s) => s.profile.room),
    { estado, sala, otros } = useSala(),
    gente = net.players().filter((p) => p.listo);
  const solo = room.mode === 'solo';
  return (
    <Panel id="salas" title="Salas" icon="users" size="md">
      <div className="mc-card mc-roomnow flex flex-wrap items-center gap-3 p-3" data-on="true">
        <span className="mc-check is-on flex-none">
          <Icon name={solo ? 'user' : 'globe'} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mc-label" data-testid="room-estado" data-estado={estado}>
            {ESTADO_SALA[estado]}
          </div>
          <b data-testid="room-current" className="block truncate font-display text-xl font-semibold">
            {solo ? 'Solo' : sala ? nombreDeSala(sala, deptName) : 'Sala en vivo'}
          </b>
        </div>
        {sala && (
          <span className="mc-num flex items-center gap-1 text-sm font-bold" data-testid="room-ocupacion">
            <Icon name="users" size={15} />
            {otros + 1}/{SALA.cupo}
          </span>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Btn id="room-solo" tone={solo ? 'good' : 'neutral'} icon="user" onClick={() => g().setRoom('solo')}>
          Jugar solo
        </Btn>
        <Btn
          id="room-vivo"
          tone={solo ? 'primary' : 'good'}
          icon="globe"
          onClick={() => {
            g().setRoom('publica');
            net.reconnect();
          }}
        >
          Jugar con gente
        </Btn>
      </div>
      {!solo && gente.length > 0 && (
        <>
          <div className="mc-label mb-1 mt-4">Aquí con vos</div>
          <div className="flex flex-wrap gap-1.5" data-testid="room-gente">
            {gente.map((p) => (
              <Tag key={p.id} color="#17785a" fg="#fff">
                {p.name}
              </Tag>
            ))}
          </div>
        </>
      )}
      <Note cls="mt-3">
        Cada zona (el mapa y cada departamento) tiene salas de {SALA.cupo}. Si una se llena, entrás a la siguiente. Al
        viajar cambiás de sala solo.
      </Note>
    </Panel>
  );
}
export function RoomsPanel() {
  return net.online ? <SalasEnVivo /> : <RoomsLocal />;
}
function RoomsLocal() {
  const room = useGame((s) => s.profile.room),
    [rooms, setRooms] = useState<RoomInfo[]>([]),
    [code, setCode] = useState(''),
    [copied, setCopied] = useState<'' | 'ok' | 'no'>(''),
    [busy, setBusy] = useState(false);
  const refresh = () => {
    void net.listRooms().then((r) => setRooms([...r]));
  };
  useEffect(refresh, []);
  const create = async (mode: 'publica' | 'privada') => {
    setBusy(true);
    try {
      const r = await net.createRoom(mode);
      g().setRoom(mode, r.code);
      setCopied('');
      if (mode === 'privada') g().toast(`Código de tu sala: ${r.code}`, '🔑');
      else g().toast('Sala pública creada', '🌎');
      refresh();
    } finally {
      setBusy(false);
    }
  };
  const join = async () => {
    const r = await net.joinRoom(code);
    if (r) {
      g().setRoom(r.mode === 'solo' ? 'publica' : r.mode, r.code);
      g().toast(`Entraste a ${r.name}`, '👥');
      setCode('');
      setCopied('');
    } else {
      audio.sfx('error');
      g().toast('Ese código no existe', '❌');
    }
  };
  const copy = async () => {
    const ok = await copyText(room.code);
    setCopied(ok ? 'ok' : 'no');
    if (ok) g().toast('Código copiado', '📋');
  };
  return (
    <Panel id="salas" title="Salas" icon="users" size="md">
      <div className="mc-card mc-roomnow flex flex-wrap items-center gap-3 p-3" data-on="true">
        <span className="mc-check is-on flex-none">
          <Icon name={room.mode === 'solo' ? 'user' : room.mode === 'privada' ? 'lock' : 'globe'} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mc-label">Sala actual</div>
          <b data-testid="room-current" className="block truncate font-display text-xl font-semibold">
            {roomLabel(room)}
          </b>
        </div>
        {room.code && (
          <div className="flex items-center gap-2">
            <code
              data-testid="room-code"
              className={cx('mc-codechip mc-num', copied === 'no' && 'select-all ring-2 ring-accent')}
            >
              {room.code}
            </code>
            <Btn
              id="room-copy"
              tone="neutral"
              size="sm"
              icon={copied === 'ok' ? 'check' : 'copy'}
              onClick={() => {
                void copy();
              }}
            >
              {copied === 'ok' ? 'Copiado' : 'Copiar'}
            </Btn>
          </div>
        )}
        {copied === 'no' && (
          <p className="basis-full text-xs font-bold text-muted" data-testid="room-copy-fallback">
            No se pudo copiar solo. Mantén presionado el código para copiarlo.
          </p>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Btn
          id="room-solo"
          tone={room.mode === 'solo' ? 'good' : 'neutral'}
          icon="user"
          onClick={() => {
            g().setRoom('solo');
            setCopied('');
          }}
        >
          Jugar solo
        </Btn>
        <Btn
          id="room-create-publica"
          tone="primary"
          icon="globe"
          disabled={busy}
          onClick={() => {
            void create('publica');
          }}
        >
          Crear pública
        </Btn>
        <Btn
          id="room-create-privada"
          tone="gold"
          icon="lock"
          disabled={busy}
          onClick={() => {
            void create('privada');
          }}
        >
          Crear privada
        </Btn>
      </div>
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          audio.init();
          if (code.trim()) void join();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="mc-label mb-1 block">Unirme con código</span>
          <input
            data-testid="room-join-input"
            className="mc-input mc-num uppercase tracking-[.25em]"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            maxLength={5}
            placeholder="ABC12"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label="Código de sala"
          />
        </label>
        <Btn
          id="room-join"
          tone="primary"
          icon="key"
          disabled={!code.trim()}
          onClick={() => {
            void join();
          }}
        >
          Unirme
        </Btn>
      </form>
      <div className="mc-label mb-1 mt-4">Salas públicas</div>
      <div className="grid gap-1.5" data-testid="room-list">
        {rooms.map((r) => {
          const on = room.code === r.code;
          return (
            <button
              key={r.code}
              type="button"
              data-testid={`room-${r.code}`}
              data-on={on}
              onClick={act(() => {
                g().setRoom('publica', r.code);
                setCopied('');
                g().toast(`Entraste a ${r.name}`, '👥');
              })}
              className="mc-card is-btn flex min-h-[48px] items-center gap-2.5 px-3 py-1.5"
            >
              <Icon name="globe" size={18} cls="text-accent" />
              <span className="min-w-0 flex-1 truncate font-bold">{r.name}</span>
              <code className="mc-num text-xs font-bold text-muted">{r.code}</code>
              <span className="mc-num flex items-center gap-1 text-sm font-bold">
                <Icon name="users" size={15} />
                {r.players}/{r.max}
              </span>
              {on && (
                <Tag color="#17a673" fg="#fff">
                  Aquí
                </Tag>
              )}
            </button>
          );
        })}
      </div>
      <Note cls="mt-3">
        En este prototipo los demás jugadores son simulados: todavía no hay servidor. La capa de red ya está lista para
        conectarlo (core/net.ts).
      </Note>
    </Panel>
  );
}

// ------------------------------------------------------------------ ajustes
function Slider({
  id,
  label,
  icon,
  value,
  min,
  max,
  step,
  onChange,
  show,
}: {
  id: string;
  label: string;
  icon: IconName;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  show: string;
}) {
  return (
    <label className="mc-card flex items-center gap-3 px-3 py-1.5">
      <Icon name={icon} size={22} cls="text-accent" />
      <span className="w-24 flex-none text-sm font-extrabold leading-tight sm:w-32">{label}</span>
      <input
        data-testid={id}
        type="range"
        className="mc-range min-w-0 flex-1"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(+e.target.value)}
        style={{ '--pct': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
      />
      <span className="mc-num w-11 flex-none text-right text-sm font-extrabold">{show}</span>
    </label>
  );
}
export function SettingsPanel() {
  const s = useGame((st) => st.profile.settings),
    [sure, setSure] = useState(false);
  const set = g().setSettings;
  return (
    <Panel id="ajustes" title="Ajustes" icon="gear" size="md">
      <div className="grid gap-2">
        <Slider
          id="set-music"
          label="Música"
          icon="music"
          min={0}
          max={1}
          step={0.05}
          value={s.music}
          show={`${Math.round(s.music * 100)}%`}
          onChange={(v) => {
            audio.init();
            set({ music: v });
            audio.refresh();
          }}
        />
        <Slider
          id="set-sfx"
          label="Efectos"
          icon="volume"
          min={0}
          max={1}
          step={0.05}
          value={s.sfx}
          show={`${Math.round(s.sfx * 100)}%`}
          onChange={(v) => {
            audio.init();
            set({ sfx: v });
            audio.refresh();
            audio.sfx('coin');
          }}
        />
        <Slider
          id="set-sens"
          label="Sensibilidad de cámara"
          icon="camera"
          min={0.3}
          max={2}
          step={0.1}
          value={s.sens}
          show={`${s.sens.toFixed(1)}×`}
          onChange={(v) => set({ sens: v })}
        />
        <div className="mc-card flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2">
          <Icon name="sparkle" size={22} cls="text-accent" />
          <span className="w-24 flex-none text-sm font-extrabold sm:w-32">Calidad gráfica</span>
          <div className="flex flex-1 gap-1.5" role="radiogroup" aria-label="Calidad gráfica">
            {(['baja', 'media', 'alta'] as const).map((q) => (
              <button
                key={q}
                type="button"
                role="radio"
                aria-checked={s.quality === q}
                aria-selected={s.quality === q}
                data-testid={`set-quality-${q}`}
                onClick={act(() => set({ quality: q }))}
                className="mc-tab flex-1 capitalize"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        <label className="mc-card flex cursor-pointer items-center gap-3 px-3 py-1.5">
          <Icon name="refresh" size={22} cls="text-accent" />
          <span className="flex-1 text-sm font-extrabold">Invertir cámara vertical</span>
          <input
            data-testid="set-invert"
            type="checkbox"
            role="switch"
            className="mc-toggle"
            checked={s.invertY}
            onChange={(e) => {
              audio.sfx('click');
              set({ invertY: e.target.checked });
            }}
          />
        </label>
        <label className="mc-card flex cursor-pointer items-center gap-3 px-3 py-1.5">
          <Icon name="users" size={22} cls="text-accent" />
          <span className="flex-1 text-sm font-extrabold leading-tight">
            Chat
            <span className="block text-xs font-bold text-muted">
              Sala y amigos. Apagado no ves ni mandás mensajes.
            </span>
          </span>
          <input
            data-testid="set-chat"
            type="checkbox"
            role="switch"
            className="mc-toggle"
            checked={s.chat}
            onChange={(e) => {
              audio.sfx('click');
              set({ chat: e.target.checked });
            }}
          />
        </label>
        <div className={cx('mc-card flex flex-wrap items-center gap-2 px-3 py-2', sure && 'mc-danger')}>
          <Icon name="trash" size={22} cls="text-bad" />
          {sure ? (
            <>
              <span className="min-w-0 flex-1 basis-48 text-sm font-extrabold leading-tight" role="alert">
                ¿Seguro? Se borran tus Lempiritas, tu ropa y todo tu avance. No se puede deshacer.
              </span>
              <Btn id="set-reset-cancel" tone="neutral" size="sm" onClick={() => setSure(false)}>
                No, cancelar
              </Btn>
              <Btn id="set-reset-confirm" tone="bad" size="sm" icon="trash" onClick={() => g().resetProgress()}>
                Sí, borrar todo
              </Btn>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 text-sm font-extrabold">Borrar mi progreso</span>
              <Btn id="set-reset" tone="neutral" size="sm" onClick={() => setSure(true)}>
                Borrar…
              </Btn>
            </>
          )}
        </div>
      </div>
      <Note cls="mt-3">Tu progreso se guarda solo en este navegador.</Note>
    </Panel>
  );
}

// ------------------------------------------------------------------ controles
const K = ({ children, wide }: { children: ReactNode; wide?: boolean }) => (
  <kbd className={cx('mc-key', wide && 'px-4')}>{children}</kbd>
);
const Line = ({ keys, children }: { keys: ReactNode; children: ReactNode }) => (
  <li className="flex items-center gap-3 py-1">
    <span className="flex w-[8.5rem] flex-none flex-wrap items-center justify-end gap-1">{keys}</span>
    <span className="text-sm font-bold leading-tight">{children}</span>
  </li>
);
export function ControlsPanel() {
  const touch = useTouch(),
    pad = usePad(),
    [tab, setTab] = useState<'teclado' | 'tactil' | 'mando'>(pad ? 'mando' : touch ? 'tactil' : 'teclado');
  return (
    <Panel id="controles" title="Controles" icon="controls" size="md">
      <Tabs
        items={[
          { id: 'teclado', label: 'Teclado y mouse', icon: 'controls' },
          { id: 'tactil', label: 'Pantalla táctil', icon: 'hand' },
          { id: 'mando', label: 'Mando', icon: 'gamepad' },
        ]}
        value={tab}
        onChange={setTab}
        testid={(t) => `ctl-tab-${t}`}
        cls="mb-3"
      />
      {tab === 'mando' ? (
        <div className="grid gap-3" data-testid="ctl-mando">
          {pad && <Note>🎮 Mando conectado</Note>}
          <ul className="mc-card divide-y divide-line px-3 py-1">
            <Line keys={<span className="mc-label">Stick izq.</span>}>Moverte (a fondo: correr)</Line>
            <Line keys={<span className="mc-label">Stick der.</span>}>Girar la cámara</Line>
            <Line keys={<K>A</K>}>Saltar · en menús, pulsar</Line>
            <Line keys={<K>X</K>}>Hablar, usar, subirte a un vehículo</Line>
            <Line
              keys={
                <>
                  <K>RT</K>
                  <K>B</K>
                </>
              }
            >
              Patear o lanzar · en menús, B vuelve
            </Line>
            <Line
              keys={
                <>
                  <K>LB</K>
                  <K>RB</K>
                </>
              }
            >
              Acercar · alejar (en el mapa gigante, RB lleva a la vista de toda Honduras)
            </Line>
            <Line keys={<K>Y</K>}>Acción alterna · en el viaje, cambiar la radio</Line>
            <Line
              keys={
                <>
                  <K wide>Start</K>
                  <K wide>Select</K>
                </>
              }
            >
              Pausa · Mapa
            </Line>
            <Line keys={<span className="mc-label">Cruceta</span>}>Moverte entre botones en menús y ventanas</Line>
          </ul>
        </div>
      ) : tab === 'teclado' ? (
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]" data-testid="ctl-teclado">
          <div className="mc-card flex flex-col items-center justify-center gap-1 p-3" aria-hidden>
            <K>W</K>
            <div className="flex gap-1">
              <K>A</K>
              <K>S</K>
              <K>D</K>
            </div>
            <span className="mc-label mt-1">moverse</span>
            <div className="mt-2 flex items-center gap-2">
              <svg viewBox="0 0 40 56" width="34" height="48" className="text-fg">
                <rect x="3" y="3" width="34" height="50" rx="17" fill="none" stroke="currentColor" strokeWidth="3" />
                <path d="M20 3v20M3 23h34" stroke="currentColor" strokeWidth="3" />
                <rect x="17" y="9" width="6" height="10" rx="3" fill="var(--mc-accent)" />
              </svg>
              <span className="mc-label max-w-[6rem] text-left">
                arrastra: cámara
                <br />
                rueda: zoom
              </span>
            </div>
          </div>
          <ul className="mc-card divide-y divide-line px-3 py-1">
            <Line
              keys={
                <>
                  <K>W</K>
                  <K>A</K>
                  <K>S</K>
                  <K>D</K>
                </>
              }
            >
              Moverte (también las flechas)
            </Line>
            <Line keys={<K wide>Shift</K>}>Correr</Line>
            <Line keys={<K wide>Espacio</K>}>Saltar</Line>
            <Line keys={<K>E</K>}>Hablar, usar, subirte a un vehículo</Line>
            <Line
              keys={
                <>
                  <K>Clic</K>
                  <K>F</K>
                </>
              }
            >
              Patear o lanzar
            </Line>
            <Line
              keys={
                <>
                  <K>M</K>
                  <K>B</K>
                </>
              }
            >
              Mapa · Emotes
            </Line>
            <Line
              keys={
                <>
                  <K>Esc</K>
                  <K>P</K>
                </>
              }
            >
              Pausa (Esc también cierra ventanas)
            </Line>
          </ul>
        </div>
      ) : (
        <div className="grid gap-3" data-testid="ctl-tactil">
          <div className="mc-card mc-phone relative mx-auto aspect-[2/1] w-full max-w-md overflow-hidden" aria-hidden>
            <span className="absolute left-[7%] bottom-[12%] flex h-[42%] aspect-square items-center justify-center rounded-full border-[3px] border-current opacity-80">
              <i className="block h-[45%] w-[45%] rounded-full bg-current opacity-70" />
            </span>
            <span className="mc-pdot is-jump" style={{ right: '6%', bottom: '10%', height: '30%' }}>
              <Icon name="jump" size={20} />
            </span>
            <span className="mc-pdot" style={{ right: '8%', bottom: '48%', height: '22%' }}>
              E
            </span>
            <span className="mc-pdot" style={{ right: '25%', bottom: '30%', height: '22%' }}>
              🎯
            </span>
            <span className="mc-pdot" style={{ right: '37%', bottom: '10%', height: '20%' }}>
              <Icon name="emote" size={16} />
            </span>
            <span className="absolute left-1/2 top-[30%] flex -translate-x-1/2 items-center gap-1.5 text-xs font-extrabold opacity-80">
              <Icon name="hand" size={18} />
              arrastra para girar la cámara
            </span>
          </div>
          <ul className="mc-card divide-y divide-line px-3 py-1">
            <Line keys={<span className="mc-label">Palanca</span>}>Moverte. Empújala hasta el fondo para correr.</Line>
            <Line
              keys={
                <K>
                  <Icon name="jump" size={15} />
                </K>
              }
            >
              Saltar
            </Line>
            <Line keys={<K>E</K>}>Hablar, usar, subirte a un vehículo</Line>
            <Line keys={<K>🎯</K>}>Patear o lanzar</Line>
            <Line keys={<span className="mc-label">Arrastrar</span>}>Girar la cámara</Line>
          </ul>
        </div>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------ emotes
export function EmotesPanel() {
  const em = useGame((s) => s.profile.emotes);
  const all = SHOP.items.filter((i) => i.cat === 'emote'),
    mine = all.filter((i) => em.includes(i.id)),
    locked = all.length - mine.length;
  return (
    <Panel id="emotes" title="Emotes" icon="emote" size="sm">
      <div className="mc-wheel mx-auto grid max-w-sm grid-cols-3 gap-2" role="group" aria-label="Tus emotes">
        {mine.map((i, k) => (
          <button
            key={i.id}
            type="button"
            data-testid={`emote-${i.id}`}
            onClick={act(() => {
              g().closePanel();
              playEmote(i.id);
            })}
            className="mc-card is-btn mc-emote anim-pop flex flex-col items-center justify-center gap-1 p-2 text-center"
            style={{ animationDelay: `${k * 0.04}s` }}
          >
            <span className="text-4xl leading-none" aria-hidden>
              {EMOTE_ICON[i.id] ?? '💃'}
            </span>
            <b className="text-[13px] leading-tight">{i.name}</b>
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="mc-label">
          Atajo: tecla <kbd className="mc-key !text-[11px]">B</kbd>
        </span>
        {locked > 0 && (
          <button
            type="button"
            data-testid="emote-shop"
            onClick={act(() => g().openPanel('tienda'))}
            className="mc-link"
          >
            <Icon name="shop" size={17} />
            {locked} más en la pulpería
            <Icon name="next" size={15} />
          </button>
        )}
      </div>
    </Panel>
  );
}

// ------------------------------------------------------------------ pausa
export function PausePanel() {
  const mg = useGame((s) => s.mg),
    scene = useGame((s) => s.scene),
    p = useGame((s) => s.profile);
  return (
    <Panel id="pausa" title="Pausa" icon="pause" size="md">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm font-bold text-muted">
        <span className="truncate">
          {p.name} · Nivel {p.level}
        </span>
        <Coins n={p.coins} size={18} cls="text-fg" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Btn id="pause-resume" tone="play" size="lg" icon="play" cls="sm:col-span-2" onClick={() => g().closePanel()}>
          Seguir
        </Btn>
        {mg && (
          <Btn id="pause-restart" tone="primary" icon="refresh" onClick={() => g().replayMinigame()}>
            Reiniciar minijuego
          </Btn>
        )}
        {(mg || scene.kind !== 'lobby') && (
          <Btn id="pause-lobby" tone="primary" icon="home" onClick={() => g().goLobby()}>
            Volver al lobby
          </Btn>
        )}
        {!mg && scene.kind === 'lobby' && (
          <Btn id="pause-lobby" tone="primary" icon="home" onClick={() => g().goLobby()}>
            Reaparecer en la plaza
          </Btn>
        )}
        <Btn id="pause-controls" tone="neutral" icon="controls" onClick={() => g().openPanel('controles')}>
          Controles
        </Btn>
        <Btn id="pause-settings" tone="neutral" icon="gear" onClick={() => g().openPanel('ajustes')}>
          Ajustes
        </Btn>
        <Btn id="pause-logros" tone="neutral" icon="medal" onClick={() => g().openPanel('logros')}>
          Logros
        </Btn>
        <Btn id="pause-salas" tone="neutral" icon="users" onClick={() => g().openPanel('salas')}>
          Salas
        </Btn>
        <Btn id="pause-proyecto" tone="neutral" icon={IS_HD ? 'doc' : 'cube'} onClick={() => g().openPanel('proyecto')}>
          {IS_HD ? 'Plan técnico 3D' : 'Proyecto Roblox'}
        </Btn>
        <Btn id="pause-menu" tone="dark" icon="exit" onClick={() => g().goMenu()}>
          Salir al menú
        </Btn>
      </div>
    </Panel>
  );
}
