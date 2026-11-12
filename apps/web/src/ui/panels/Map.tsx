// Mapa de Honduras: los 18 departamentos con su contorno real (Natural Earth), marcas de visitado y recuerdo,
// alfiler de dónde estás y una ficha del departamento elegido con el botón de viaje.
import { useEffect, useMemo, useState } from 'react';
import { preguntarConectados, useConectados } from '../../core/conectados';
import { catDe, DEPARTMENTS, deptById, MAP_CREDIT, MAP_VIEWBOX, REWARDS } from '../../core/data';
import { useGame } from '../../core/store';
import type { Department } from '../../core/types';
import { conectados } from '../../game/lobby/population';
import { Coin, Icon, type IconName } from '../components/Icon';
import { Bar, Btn, Panel, Tag } from '../components/kit';
import { act, cx, g } from '../lib';

const BIOME: Record<Department['biome'], [string, string]> = {
  costa: ['Costa caribe', '🏖️'],
  sur: ['Sur cálido', '☀️'],
  valle: ['Valle', '🌾'],
  lago: ['Lago', '🎣'],
  montana: ['Montaña', '⛰️'],
  capital: ['Capital', '🏙️'],
  selva: ['Selva', '🌿'],
  isla: ['Isla', '🏝️'],
  bosque: ['Bosque nublado', '🌲'],
};
/** Nombres cortos para que quepan dentro del contorno. */
const SHORT: Record<string, string> = {
  franciscomorazan: 'Fco. Morazán',
  graciasadios: 'Gracias a Dios',
  islas: 'Islas de la Bahía',
  santabarbara: 'Sta. Bárbara',
  ocotepeque: 'Ocotepeque',
  elparaiso: 'El Paraíso',
};
/** Ajustes finos de la etiqueta (dx, dy) donde el centro geométrico queda apretado. */
const NUDGE: Record<string, [number, number]> = {
  islas: [0, -26],
  valle: [-10, 16],
  ocotepeque: [-22, 34],
  copan: [-4, -6],
  lapaz: [-4, 14],
  intibuca: [2, -14],
  lempira: [4, 4],
  cortes: [0, -14],
  atlantida: [10, -4],
  santabarbara: [-4, 2],
  choluteca: [8, 6],
  franciscomorazan: [4, 14],
  comayagua: [0, -6],
};
const pathOf = (d: Department) => d.map.rings.map((r) => `M${r.map((p) => p.join(',')).join('L')}Z`).join('');

function Row({ icon, children, label }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm leading-snug">
      <Icon name={icon} size={17} cls="mt-0.5 text-accent" />
      <div className="min-w-0">
        <div className="mc-label !text-[10px]">{label}</div>
        <div className="font-bold">{children}</div>
      </div>
    </div>
  );
}

export function MapPanel() {
  const visited = useGame((s) => s.profile.visited),
    collected = useGame((s) => s.profile.collected),
    scene = useGame((s) => s.scene);
  const here = scene.kind === 'dept' ? scene.id : null;
  const [sel, setSel] = useState<string>(here ?? 'franciscomorazan'),
    [hover, setHover] = useState<string | null>(null);
  const d = deptById(sel),
    seen = visited.includes(d.id),
    got = collected.includes(d.id),
    cat = catDe(d.id),
    prog = useGame((s) => s.profile.juegos),
    vivos = useConectados();
  useEffect(preguntarConectados, []);
  const etapas = cat.juegos.reduce((n, j) => n + j.etapas, 0),
    hechas = cat.juegos.reduce((n, j) => n + Math.min(j.etapas, prog[j.id]?.etapa ?? 0), 0);
  const paths = useMemo(() => DEPARTMENTS.map((x) => ({ d: x, path: pathOf(x) })), []);
  // el elegido se dibuja al final para que su borde quede encima
  const order = useMemo(
    () => [...paths].sort((a, b) => (a.d.id === sel ? 1 : 0) - (b.d.id === sel ? 1 : 0)),
    [paths, sel],
  );
  const pin = here ? deptById(here).map.center : deptById('franciscomorazan').map.center;
  const [W, H] = MAP_VIEWBOX;
  return (
    <Panel id="mapa" title="Mapa de Honduras" icon="map" size="xl" fill>
      <div className="flex min-h-0 flex-1 flex-col gap-3 landscape:flex-row">
        <div className="mc-map relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden portrait:flex-none landscape:flex-[1.9]">
          <svg
            viewBox={`-8 -14 ${W + 16} ${H + 26}`}
            className="block h-full max-h-full w-full"
            role="group"
            aria-label="Mapa de los 18 departamentos de Honduras"
            preserveAspectRatio="xMidYMid meet"
          >
            <text x={610} y={48} className="mc-map-sea">
              Mar Caribe
            </text>
            <text x={40} y={560} className="mc-map-sea">
              Océano Pacífico
            </text>
            {order.map(({ d: x, path }) => (
              <g
                key={x.id}
                data-testid={`map-dept-${x.id}`}
                data-sel={sel === x.id}
                data-visited={visited.includes(x.id)}
                className="mc-dept"
                role="button"
                tabIndex={0}
                aria-label={`${x.name}${visited.includes(x.id) ? ', visitado' : ''}`}
                aria-pressed={sel === x.id}
                onClick={act(() => setSel(x.id))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    setSel(x.id);
                  }
                }}
                onPointerEnter={() => setHover(x.id)}
                onPointerLeave={() => setHover((h) => (h === x.id ? null : h))}
              >
                <path d={path} fill={x.colors[0]} fillRule="evenodd" />
                {x.id === 'islas' && (
                  <rect
                    x={x.map.center[0] - 70}
                    y={x.map.center[1] - 30}
                    width={140}
                    height={56}
                    rx={20}
                    fill="transparent"
                    stroke="none"
                    style={{ stroke: 'none' }}
                  />
                )}
              </g>
            ))}
            {/* marcas: visitado y recuerdo */}
            {DEPARTMENTS.map((x) => {
              const v = visited.includes(x.id),
                c = collected.includes(x.id),
                [cx0, cy0] = x.map.center,
                n = NUDGE[x.id] ?? [0, 0];
              if (!v && !c) return null;
              return (
                <g key={x.id} transform={`translate(${cx0 + n[0]} ${cy0 + n[1] - 22})`} pointerEvents="none">
                  {v && (
                    <g transform={`translate(${c ? -11 : 0} 0)`}>
                      <circle r="9" fill="#17a673" stroke="#fff" strokeWidth="2.2" />
                      <path
                        d="M-4 .3 -1.2 3 4.2 -2.8"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}
                  {c && (
                    <g transform={`translate(${v ? 11 : 0} 0)`}>
                      <path
                        d="M0 -9 8 -1 0 9 -8 -1Z"
                        fill="#7fe9ff"
                        stroke="#fff"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                      />
                      <path d="M-8 -1H8M0 -9-3 -1 0 9 3 -1Z" fill="none" stroke="#0a86b8" strokeWidth="1" />
                    </g>
                  )}
                </g>
              );
            })}
            {/* etiquetas */}
            {DEPARTMENTS.map((x) => {
              const n = NUDGE[x.id] ?? [0, 0];
              return (
                <text
                  key={x.id}
                  x={x.map.center[0] + n[0]}
                  y={x.map.center[1] + n[1] + 5}
                  className="mc-map-label"
                  data-on={sel === x.id || hover === x.id}
                >
                  {SHORT[x.id] ?? x.name}
                </text>
              );
            })}
            {/* qué tipo de juegos tiene cada departamento */}
            {DEPARTMENTS.map((x) => {
              const n = NUDGE[x.id] ?? [0, 0],
                t = [...catDe(x.id).tipos].slice(0, 3).join('');
              return t ? (
                <text
                  key={x.id}
                  x={x.map.center[0] + n[0]}
                  y={x.map.center[1] + n[1] + 24}
                  textAnchor="middle"
                  fontSize="15"
                  pointerEvents="none"
                >
                  {t}
                </text>
              ) : null;
            })}
            {/* dónde estás */}
            <g transform={`translate(${pin[0]} ${pin[1]})`} pointerEvents="none" data-testid="map-pin">
              <circle
                r="10"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                style={{
                  animation: 'mc-ring 1.6s ease-out infinite',
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                }}
              />
              <path
                d="M0 2C-9 -9 -13 -15 -13 -22a13 13 0 0 1 26 0c0 7-4 13-13 24Z"
                fill="#e63946"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <circle cy="-22" r="4.6" fill="#fff" />
            </g>
          </svg>
          <div className="pointer-events-none absolute bottom-1.5 left-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-bold text-fg/80">
            <span className="flex items-center gap-1">
              <i className="inline-block h-2.5 w-2.5 rounded-full bg-[#17a673] ring-2 ring-white" />
              Visitado
            </span>
            <span className="flex items-center gap-1">
              <i className="inline-block h-2.5 w-2.5 rotate-45 bg-[#7fe9ff] ring-2 ring-white" />
              Recuerdo
            </span>
            <span className="flex items-center gap-1">
              <i className="inline-block h-2.5 w-2.5 rounded-full bg-[#e63946] ring-2 ring-white" />
              Estás aquí{here ? '' : ' (lobby)'}
            </span>
          </div>
          <span className="pointer-events-none absolute right-2 top-1.5 text-[10px] text-fg/50 max-sm:hidden">
            {MAP_CREDIT}
          </span>
        </div>
        {/* ficha del departamento */}
        <aside
          className="flex min-h-0 flex-col gap-2 portrait:flex-1 landscape:w-[17.5rem] landscape:flex-none lg:landscape:w-80"
          aria-live="polite"
        >
          <div
            key={d.id}
            data-testid="map-card"
            className="mc-card mc-scroll anim-fade flex min-h-0 flex-1 flex-col gap-2 p-3"
          >
            <div className="flex items-start gap-2.5">
              <span
                className="mc-dept-chip flex-none"
                style={{ background: `linear-gradient(135deg, ${d.colors[0]}, ${d.colors[1]})` }}
                aria-hidden
              >
                {BIOME[d.biome][1]}
              </span>
              <div className="min-w-0 flex-1">
                <h3 data-testid="map-sel-name" className="font-display text-xl font-bold leading-tight">
                  {d.name}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {here === d.id && (
                    <Tag color="#e63946" fg="#fff">
                      Estás aquí
                    </Tag>
                  )}
                  {seen ? (
                    <Tag color="#17a673" fg="#fff">
                      Visitado
                    </Tag>
                  ) : (
                    <Tag color="#c9d9ec" fg="#12234a">
                      Sin visitar
                    </Tag>
                  )}
                </div>
              </div>
            </div>
            <Row icon="pin" label="Cabecera">
              {d.cabecera}
            </Row>
            <Row icon="camera" label="Para conocer">
              {d.landmark.name}
            </Row>
            <Row icon="sun" label="Paisaje">
              {BIOME[d.biome][0]}
            </Row>
            {cat.juegos.length > 0 && (
              <Row icon="gamepad" label="Minijuegos">
                <span data-testid="map-juegos">{cat.juegos.length} juegos</span> <span aria-hidden>{cat.tipos}</span>
                <span className="block text-xs font-normal text-muted">
                  Tu avance: {hechas} de {etapas} etapas
                </span>
              </Row>
            )}
            <Row icon="user" label="Conectados ahora">
              <span data-testid="map-online" data-fuente={vivos ? 'servidor' : 'simulado'}>
                🟢 {vivos ? (vivos.depts[d.id] ?? 0) : conectados(d.id)}
              </span>{' '}
              <span className="text-xs font-normal text-muted">
                {vivos ? '(gente de verdad, sin bots)' : '(bots en este prototipo)'}
              </span>
            </Row>
            {cat.lugares.length > 0 && (
              <div className="flex flex-wrap gap-1" data-testid="map-lugares">
                {cat.lugares.map((l) => (
                  <span key={l.id} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold">
                    {l.name}
                  </span>
                ))}
              </div>
            )}
            <div
              data-testid="map-fact"
              data-known={seen}
              className={cx('mc-fact rounded-xl px-3 py-2 text-sm leading-snug', !seen && 'is-locked')}
            >
              <div className="mc-label mb-0.5 flex items-center gap-1">
                <Icon name={seen ? 'sparkle' : 'lock'} size={13} />
                ¿Sabías que…?
              </div>
              {seen ? d.fact : <span className="font-bold">Visítalo para descubrirlo.</span>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Icon name="gem" size={18} cls={got ? 'text-accent' : 'text-muted'} />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="mc-label !text-[10px] block">Recuerdo</span>
                <b data-testid="map-collectible">
                  {got ? d.collectible : seen ? `${d.collectible} · sin encontrar` : '???'}
                </b>
              </span>
              {got && <Icon name="check" size={18} cls="text-good" />}
            </div>
          </div>
          <div className="flex flex-none items-center gap-3 px-1" data-testid="map-progress">
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-xs font-extrabold">
                <span>
                  Visitados {visited.length}/{DEPARTMENTS.length}
                </span>
                <span className="text-muted">
                  Recuerdos {collected.length}/{DEPARTMENTS.length}
                </span>
              </div>
              <Bar value={visited.length} max={DEPARTMENTS.length} cls="mt-1 !h-2.5 hd:!h-1.5" />
            </div>
          </div>
          <div className="flex flex-none gap-2">
            <Btn id="map-lobby" tone="neutral" icon="home" onClick={() => g().goLobby()}>
              Lobby
            </Btn>
            <Btn id="map-go" tone="gold" icon="bus" cls="flex-1" sfx="portal" onClick={() => g().travel(sel)}>
              {here === d.id ? 'Volver a entrar' : 'Viajar'}
              {!seen && (
                <span className="mc-num ml-1 flex items-center gap-0.5 text-sm opacity-90">
                  <Coin size={15} />+{REWARDS.world.firstVisit.coins}
                </span>
              )}
            </Btn>
          </div>
        </aside>
      </div>
    </Panel>
  );
}
