// Editor de personaje y tienda (Pulpería Doña Toña). Comparten la vista 3D del avatar, las pestañas por
// categoría y las tarjetas de artículo. Todo cambio pasa por la tienda de estado (setAvatar / equip / buy).
import { useEffect, useMemo, useRef, useState } from 'react';
import apodos from '../../../shared/data/apodos.json';
import { audio } from '../../core/audio';
import { itemById, SHOP } from '../../core/data';
import { useGame } from '../../core/store';
import type { Anim, AvatarConfig, ItemCat, ShopItem } from '../../core/types';
import { AvatarView } from '../components/AvatarView';
import { Coin, Icon, type IconName } from '../components/Icon';
import { Btn, Coins, Note, Panel, Swatch, Tabs, Tag } from '../components/kit';
import { act, cx, EMOTE_ANIM, EMOTE_ICON, g } from '../lib';

const CATS: { id: ItemCat; label: string; icon: IconName }[] = [
  { id: 'atuendo', label: 'Atuendos', icon: 'shirt' },
  { id: 'cabello', label: 'Cabello', icon: 'hair' },
  { id: 'rostro', label: 'Rostro', icon: 'face' },
  { id: 'camisa', label: 'Camisa', icon: 'shirt' },
  { id: 'pantalon', label: 'Pantalón', icon: 'pants' },
  { id: 'sombrero', label: 'Sombrero', icon: 'hat' },
  { id: 'accesorio', label: 'Accesorio', icon: 'bag' },
  { id: 'emote', label: 'Emotes', icon: 'emote' },
];
const SLOT: Record<string, keyof AvatarConfig> = {
  cabello: 'hair',
  rostro: 'face',
  camisa: 'shirt',
  pantalon: 'pants',
  sombrero: 'hat',
  accesorio: 'acc',
};
const COLOR_OF: Record<string, keyof AvatarConfig> = {
  cabello: 'hairColor',
  camisa: 'shirtColor',
  pantalon: 'pantsColor',
  sombrero: 'hatColor',
  accesorio: 'accColor',
};
const EMOJI: Record<string, string> = {
  pelo_corto: '💇',
  pelo_largo: '👩',
  pelo_rizado: '🧑‍🦱',
  calvo: '🧑‍🦲',
  pelo_coleta: '🎀',
  pelo_trenzas: '🪢',
  pelo_afro: '🌀',
  cara_sonrisa: '🙂',
  cara_feliz: '😄',
  cara_guino: '😉',
  cara_pecas: '😊',
  cara_bigote: '🥸',
  cara_lentes: '😎',
  camisa_basica: '👕',
  camisa_rayas: '👕',
  camisa_cuadros: '👔',
  camisa_504: '👕',
  camisa_h: '⚽',
  camisa_h_azul: '⚽',
  guayabera: '👔',
  camisa_manta: '🥻',
  blusa_tipica: '👚',
  pantalon_basico: '👖',
  jeans: '👖',
  short_futbol: '🩳',
  pantalon_manta: '👖',
  falda_tipica: '👗',
  sin_sombrero: '🚫',
  gorra: '🧢',
  sombrero_junco: '👒',
  panuelo_lenca: '🧣',
  sombrero_vaquero: '🤠',
  casco_explorador: '⛑️',
  corona_carnaval: '👑',
  sin_accesorio: '🚫',
  mochila: '🎒',
  banda_bandera: '🎗️',
  collar_jade: '📿',
  guitarra: '🎸',
  tambor_garifuna: '🥁',
  capa_bandera: '🦸',
  ...EMOTE_ICON,
};
type Grupo = NonNullable<ShopItem['grupo']>;
// Clubes y Selección van con apodo (shared/data/apodos.json); el nombre oficial nunca se muestra.
const EQUIPOS: { id: string; apodo: string; camiseta?: string; atuendos: string[]; camisas: string[] }[] =
  apodos.equipos;
const SELECCION = EQUIPOS.find((e) => e.id === 'seleccion')?.apodo ?? 'La Bicolor';
const APODO: Record<string, string> = Object.fromEntries(
  EQUIPOS.filter((e) => e.id !== 'seleccion').flatMap((e) => [
    ...e.atuendos.map((id) => [id, e.apodo]),
    ...(e.camiseta ? e.camisas.map((id) => [id, e.camiseta]) : []),
  ]),
);
/** nombre que ve el jugador: el apodo si es de un club, si no el de la tienda */
const nombre = (i: ShopItem) => APODO[i.id] ?? i.name;
const GRUPOS: { id: Grupo | 'todos'; label: string; e: string }[] = [
  { id: 'todos', label: 'Todos', e: '✨' },
  { id: 'folclor', label: 'Folclor', e: '🪇' },
  { id: 'maya', label: 'Maya', e: '🗿' },
  { id: 'seleccion', label: SELECCION, e: '⚽' },
  { id: 'club', label: 'Clubes', e: '🏟️' },
  { id: 'honduras', label: 'Honduras', e: '🦜' },
];
const GRUPO_E: Record<string, string> = Object.fromEntries(GRUPOS.map((g) => [g.id, g.e]));
/** el avatar con el atuendo puesto (sin tocar cuerpo ni piel) */
const withSet = (av: AvatarConfig, i: ShopItem): AvatarConfig => {
  const { body: _b, skin: _s, ...piezas } = i.set ?? {};
  return { ...av, ...piezas } as AvatarConfig;
};
/** ¿el avatar lleva puesto este artículo? */
const isOn = (av: AvatarConfig, i: ShopItem) =>
  i.cat === 'emote'
    ? false
    : i.cat === 'atuendo'
      ? Object.entries(i.set ?? {}).every(([k, v]) => k === 'body' || k === 'skin' || (av as any)[k] === v)
      : av[SLOT[i.cat]] === i.id;
function GrupoFilter({ value, set, items }: { value: string; set: (g: Grupo | 'todos') => void; items: ShopItem[] }) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Grupo">
      {GRUPOS.map((g) => {
        const n = g.id === 'todos' ? items.length : items.filter((i) => i.grupo === g.id).length;
        return (
          <button
            key={g.id}
            type="button"
            data-testid={`filter-grupo-${g.id}`}
            aria-pressed={value === g.id}
            aria-selected={value === g.id}
            disabled={!n}
            onClick={act(() => set(g.id))}
            className="mc-tab !px-2 disabled:opacity-40"
          >
            <span aria-hidden>{g.e}</span>
            {g.label}
            <span className="mc-num opacity-70">{n}</span>
          </button>
        );
      })}
    </div>
  );
}
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
/** Lo que la tienda debe mostrar al abrirse desde el editor (categoría y artículo a probar). */
const shopIntent: { cat: ItemCat | null; item: string | null } = { cat: null, item: null };

function Thumb({ item, cls }: { item: ShopItem; cls?: string }) {
  if (item.cat === 'atuendo')
    return (
      <span
        className={cx('mc-thumb', cls)}
        aria-hidden
        style={{
          background: `linear-gradient(135deg, ${item.set?.shirtColor ?? '#ffffff'} 0 55%, ${item.set?.pantsColor ?? '#3f6fb4'} 55%)`,
        }}
      >
        {GRUPO_E[item.grupo ?? ''] ?? '👕'}
      </span>
    );
  return (
    <span className={cx('mc-thumb', cls)} aria-hidden>
      {EMOJI[item.id] ?? '🎁'}
    </span>
  );
}
function TradToggle({ on, set, n }: { on: boolean; set: (v: boolean) => void; n: number }) {
  return (
    <button
      type="button"
      data-testid="filter-trad"
      role="switch"
      aria-checked={on}
      disabled={n === 0 && !on}
      onClick={act(() => set(!on))}
      className="mc-tab disabled:opacity-40"
      aria-selected={on}
    >
      <span aria-hidden>🪇</span>Trajes típicos<span className="mc-num opacity-70">{n}</span>
    </button>
  );
}
function Colors({ cat, av, item }: { cat: ItemCat; av: AvatarConfig; item: ShopItem | undefined }) {
  const key = COLOR_OF[cat];
  if (!key) return null;
  const tintable = cat === 'cabello' ? av.hair !== 'calvo' : !!item?.tint;
  if (!tintable)
    return (
      <Note cls="mt-1">
        {cat === 'cabello' ? 'Sin cabello no hay color que elegir.' : 'Esta prenda tiene sus propios colores.'}
      </Note>
    );
  return (
    <div>
      <div className="mc-label mb-1">Color</div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Color">
        {(cat === 'cabello' ? SHOP.hairColors : SHOP.palette).map((c) => (
          <Swatch
            key={c}
            id={`color-${c}`}
            color={c}
            label={`Color ${c}`}
            on={av[key] === c}
            onClick={() => g().setAvatar({ [key]: c } as Partial<AvatarConfig>)}
          />
        ))}
      </div>
    </div>
  );
}
/** Botones para ver al personaje moverse. */
function AnimButtons({ anim, play }: { anim: Anim; play: (a: Anim) => void }) {
  const B: [Anim, string, string][] = [
    ['dance', 'Bailar', '💃'],
    ['celebrate', 'Celebrar', '🎉'],
    ['wave', 'Saludar', '👋'],
  ];
  return (
    <div className="flex justify-center gap-1.5">
      {B.map(([a, label, e]) => (
        <button
          key={a}
          type="button"
          data-testid={`ed-anim-${a}`}
          aria-pressed={anim === a}
          aria-label={label}
          onClick={act(() => play(a))}
          className="mc-tab !px-2.5"
          aria-selected={anim === a}
        >
          <span aria-hidden>{e}</span>
          <span className="max-[420px]:hidden short:hidden lg:short:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
function usePreviewAnim() {
  const [anim, setAnim] = useState<Anim>('idle'),
    timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const play = (a: Anim, ms = 3600) => {
    clearTimeout(timer.current);
    setAnim(a);
    timer.current = setTimeout(() => setAnim('idle'), ms);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return [anim, play] as const;
}

// ------------------------------------------------------------------ editor de personaje
export function CharacterPanel() {
  const p = useGame((s) => s.profile),
    av = p.avatar;
  const [cat, setCat] = useState<ItemCat>('atuendo'),
    [trad, setTrad] = useState(false),
    [anim, play] = usePreviewAnim();
  const all = SHOP.items.filter((i) => i.cat === cat),
    owned = (i: ShopItem) => p.owned.includes(i.id);
  const list = all
    .filter((i) => (!trad || i.trad || cat === 'atuendo') && (owned(i) || (p.created && !i.soloSet)))
    .sort((a, b) => Number(owned(b)) - Number(owned(a)));
  const locked = all.filter((i) => !owned(i) && !i.soloSet).length,
    current = SLOT[cat] ? itemById(av[SLOT[cat]] ?? '') : undefined;
  const body = av.body ?? 'h';
  const setBody = (b: 'h' | 'm') => {
    const hair =
      b === 'm' && (av.hair === 'pelo_corto' || av.hair === 'calvo')
        ? 'pelo_largo'
        : b === 'h' && (av.hair === 'pelo_largo' || av.hair === 'pelo_trenzas' || av.hair === 'pelo_coleta')
          ? 'pelo_corto'
          : av.hair;
    g().setAvatar({ body: b, hair });
    play('wave', 1500);
  };
  const randomize = () => {
    const mine = (c: ItemCat) => SHOP.items.filter((i) => i.cat === c && p.owned.includes(i.id)).map((i) => i.id);
    g().setAvatar({
      skin: pick(SHOP.skin),
      hair: pick(mine('cabello')),
      hairColor: pick(SHOP.hairColors),
      face: pick(mine('rostro')),
      shirt: pick(mine('camisa')),
      shirtColor: pick(SHOP.palette),
      pants: pick(mine('pantalon')),
      pantsColor: pick(SHOP.palette),
      hat: pick(mine('sombrero')),
      hatColor: pick(SHOP.palette),
      acc: pick(mine('accesorio')),
      accColor: pick(SHOP.palette),
    });
    play('celebrate', 1500);
  };
  const toShop = (item?: string) => {
    shopIntent.cat = cat;
    shopIntent.item = item ?? null;
    g().openPanel('tienda');
  };
  const done = () => (p.created ? g().closePanel() : g().finishCreation());
  return (
    <Panel id="personaje" title={p.created ? 'Tu personaje' : 'Creá tu personaje'} icon="user" size="xl" fill>
      <div className="flex min-h-0 flex-1 flex-col gap-3 landscape:flex-row">
        {/* vista previa */}
        <div className="flex flex-none flex-col gap-2 portrait:h-[30vh] portrait:min-h-[11rem] landscape:w-[34%] landscape:min-w-[12rem] landscape:max-w-sm">
          <div className="mc-stage relative min-h-0 flex-1">
            <AvatarView config={av} anim={anim} cls="absolute inset-0" />
            <button
              type="button"
              data-testid="ed-random"
              onClick={act(randomize)}
              className="mc-ibtn !absolute right-2 top-2"
              aria-label="Al azar"
              title="Al azar"
            >
              <Icon name="dice" size={24} />
            </button>
          </div>
          <AnimButtons anim={anim} play={play} />
        </div>
        {/* opciones */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <div className="mc-scroll -mr-1 flex min-h-0 flex-1 flex-col gap-3 pr-1">
            <div>
              <span className="mc-label mb-1 block">Cuerpo</span>
              <div className="flex gap-2" role="group" aria-label="Cuerpo">
                {(
                  [
                    ['h', 'Hombre', '🧍‍♂️'],
                    ['m', 'Mujer', '🧍‍♀️'],
                  ] as const
                ).map(([b, label, e]) => (
                  <button
                    key={b}
                    type="button"
                    data-testid={`ed-body-${b}`}
                    aria-pressed={body === b}
                    aria-selected={body === b}
                    onClick={act(() => setBody(b))}
                    className="mc-tab flex-1 justify-center !py-2"
                  >
                    <span aria-hidden>{e}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <label className="block">
                <span className="mc-label mb-1 block">Nombre</span>
                <input
                  data-testid="ed-name"
                  className="mc-input"
                  defaultValue={p.name === 'Catracho' && !p.created ? '' : p.name}
                  placeholder="Catracho"
                  maxLength={16}
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  onChange={(e) => g().setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                />
              </label>
              <div>
                <span className="mc-label mb-1 block">Piel</span>
                <div className="flex gap-0.5" role="group" aria-label="Tono de piel">
                  {SHOP.skin.map((c, i) => (
                    <Swatch
                      key={c}
                      id={`ed-skin-${i}`}
                      color={c}
                      label={`Tono de piel ${i + 1}`}
                      on={av.skin === c}
                      onClick={() => g().setAvatar({ skin: c })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Tabs
              items={CATS.filter((c) => c.id !== 'emote')}
              value={cat}
              onChange={(c) => {
                setCat(c);
              }}
              testid={(c) => `shop-tab-${c}`}
              compact
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              {cat === 'atuendo' ? (
                <span className="mc-label">{p.created ? 'Tus atuendos' : 'Escogé tu atuendo inicial (gratis)'}</span>
              ) : (
                <TradToggle on={trad} set={setTrad} n={all.filter((i) => i.trad && (owned(i) || p.created)).length} />
              )}
              {p.created && locked > 0 && (
                <button type="button" data-testid="ed-shop" onClick={act(() => toShop())} className="mc-link">
                  <Icon name="shop" size={17} />
                  {locked} más en la pulpería
                  <Icon name="next" size={15} />
                </button>
              )}
            </div>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4"
              role="group"
              aria-label={`Opciones de ${cat}`}
            >
              {list.map((i) => {
                const has = owned(i),
                  on = isOn(av, i);
                return (
                  <button
                    key={i.id}
                    type="button"
                    data-testid={`shop-item-${i.id}`}
                    data-on={on}
                    data-dim={!has}
                    aria-pressed={on}
                    onClick={act(() => {
                      if (has) g().equip(i.id);
                      else toShop(i.id);
                    })}
                    className="mc-card is-btn flex min-h-[56px] items-center gap-2 p-2"
                  >
                    <Thumb item={i} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <b className="block text-[13.5px] leading-tight">{nombre(i)}</b>
                      <span className="flex items-center gap-1 text-xs font-bold text-muted">
                        {on ? (
                          <>
                            <Icon name="check" size={13} cls="text-good" />
                            Puesto
                          </>
                        ) : has ? (
                          'Tuyo'
                        ) : (
                          <>
                            <Icon name="lock" size={12} />
                            <Coin size={13} />
                            {i.price}
                          </>
                        )}
                        {i.trad && (
                          <span title="Traje típico" aria-label="Traje típico">
                            🪇
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
              {list.length === 0 && (
                <Note cls="col-span-full">
                  Todavía no tenés trajes típicos de esta categoría.{p.created ? ' Búscalos en la pulpería.' : ''}
                </Note>
              )}
            </div>
            <Colors cat={cat} av={av} item={current} />
            {!p.created && (
              <Note icon="shop">
                Más ropa, sombreros y trajes típicos te esperan en la Pulpería Doña Toña cuando entres al mundo.
              </Note>
            )}
          </div>
          <div className="flex flex-none items-center gap-2">
            {p.created && (
              <Btn id="ed-to-shop" tone="neutral" icon="shop" onClick={() => toShop()}>
                Pulpería
              </Btn>
            )}
            <Btn
              id="ed-done"
              tone="play"
              size="lg"
              icon={p.created ? 'check' : 'play'}
              cls="flex-1 short:!min-h-[46px] short:!text-lg"
              onClick={done}
            >
              {p.created ? 'Listo' : '¡Entrar al mundo!'}
            </Btn>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ------------------------------------------------------------------ tienda
export function ShopPanel() {
  const p = useGame((s) => s.profile),
    av = p.avatar;
  const [cat, setCat] = useState<ItemCat>(() => shopIntent.cat ?? 'atuendo'),
    [trad, setTrad] = useState(false),
    [grupo, setGrupo] = useState<Grupo | 'todos'>('todos'),
    [anim, play] = usePreviewAnim();
  const [tryId, setTryId] = useState<string | null>(() => shopIntent.item),
    [hoverId, setHoverId] = useState<string | null>(null),
    [short, setShort] = useState<{ id: string; missing: number } | null>(null);
  useEffect(() => {
    shopIntent.cat = null;
    shopIntent.item = null;
  }, []);
  const has = (id: string) => p.owned.includes(id) || p.emotes.includes(id);
  const all = SHOP.items.filter((i) => i.cat === cat && !i.soloSet),
    list =
      cat === 'atuendo'
        ? all.filter((i) => grupo === 'todos' || i.grupo === grupo)
        : all.filter((i) => !trad || i.trad);
  const shownId = hoverId ?? tryId,
    shown = shownId ? itemById(shownId) : undefined;
  const preview = useMemo<AvatarConfig>(
    () =>
      !shown || shown.cat === 'emote'
        ? av
        : shown.cat === 'atuendo'
          ? withSet(av, shown)
          : { ...av, [SLOT[shown.cat]]: shown.id },
    [av, shown],
  );
  const tried = tryId ? itemById(tryId) : undefined,
    triedNew = tried && !has(tried.id) ? tried : undefined;
  const tryOn = (i: ShopItem) => {
    setTryId(i.id);
    setShort(null);
    if (i.cat === 'emote') play(EMOTE_ANIM[i.id] ?? 'dance');
  };
  const action = async (i: ShopItem) => {
    if (has(i.id)) {
      if (i.cat === 'emote') {
        play(EMOTE_ANIM[i.id] ?? 'dance');
        audio.sfx('click');
      } else {
        g().equip(i.id);
        audio.sfx('click');
      }
      setTryId(null);
      setShort(null);
      return;
    }
    const r = await g().comprar(i.id);
    if (r === 'ok') {
      audio.sfx('buy');
      g().toast(`¡Compraste ${nombre(i)}!`, '🛍️');
      setTryId(null);
      setShort(null);
      play(i.cat === 'emote' ? (EMOTE_ANIM[i.id] ?? 'dance') : 'celebrate', 2200);
    } else {
      audio.sfx('error');
      if (r === 'caro') {
        setShort({ id: i.id, missing: i.price - g().profile.coins });
        setTryId(i.id);
        g().toast('No te alcanzan las Lempiritas', '🪙');
      }
    }
  };
  const shortItem = short ? itemById(short.id) : undefined;
  return (
    <Panel
      id="tienda"
      title="Pulpería Doña Toña"
      icon="shop"
      size="xl"
      fill
      extra={
        <span data-testid="shop-coins" className="mc-balance">
          <Coins n={p.coins} anim size={22} />
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 landscape:flex-row">
        <div className="flex flex-none flex-col gap-2 portrait:h-[31vh] portrait:min-h-[11rem] landscape:w-[32%] landscape:min-w-[12rem] landscape:max-w-sm">
          <div className="mc-stage relative min-h-0 flex-1">
            <AvatarView config={preview} anim={anim} cls="absolute inset-0" hint={false} />
            {shown?.nota && (
              <p
                data-testid="shop-nota"
                data-tapa
                className="mc-trying absolute inset-x-2 bottom-2 px-2.5 py-1.5 text-[13px] font-bold leading-snug"
              >
                {shown.nota}
              </p>
            )}
            {triedNew && (
              <div
                data-testid="shop-trying"
                data-tapa
                className="mc-trying anim-drop absolute inset-x-2 top-2 flex items-center gap-2 px-2.5 py-1.5 text-sm"
              >
                <Icon name="eye" size={17} />
                <span className="min-w-0 flex-1 truncate font-bold">Probándote: {nombre(triedNew)}</span>
                <button
                  type="button"
                  data-testid="shop-try-clear"
                  onClick={act(() => {
                    setTryId(null);
                    setShort(null);
                  })}
                  aria-label="Quitar prueba"
                  className="-m-1.5 flex h-9 w-9 items-center justify-center rounded-full"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="short:hidden">
            <AnimButtons anim={anim} play={play} />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <Tabs
            items={CATS}
            value={cat}
            onChange={(c) => {
              setCat(c);
              setShort(null);
            }}
            testid={(c) => `shop-tab-${c}`}
            compact
            cls="flex-none"
          />
          {short && shortItem ? (
            <div
              data-testid="shop-short"
              role="alert"
              className="mc-alert anim-drop flex flex-none flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2"
            >
              <span className="flex min-w-0 flex-1 basis-52 items-center gap-2 text-sm font-bold leading-snug">
                <Icon name="info" size={20} cls="flex-none" />
                <span>
                  Te faltan{' '}
                  <span className="mc-num inline-flex items-center gap-1 align-middle">
                    <Coin size={16} />
                    <b data-testid="shop-missing">{short.missing}</b>
                  </span>{' '}
                  para {nombre(shortItem)}. Ganá más en los minijuegos.
                </span>
              </span>
              <Btn id="shop-earn" tone="gold" size="sm" icon="gamepad" onClick={() => g().openPanel('mapa')}>
                Ir a jugar
              </Btn>
            </div>
          ) : (
            <div className="flex flex-none flex-wrap items-center justify-between gap-2">
              {cat === 'atuendo' ? (
                <GrupoFilter value={grupo} set={setGrupo} items={all} />
              ) : (
                <TradToggle on={trad} set={setTrad} n={all.filter((i) => i.trad).length} />
              )}
              <span className="mc-label max-sm:hidden">Tocá un artículo para probártelo</span>
            </div>
          )}
          <div className="mc-scroll -mr-1 min-h-0 flex-1 pr-1">
            <div className="grid grid-cols-2 gap-2 pb-1 sm:grid-cols-3 xl:grid-cols-4">
              {list.map((i) => {
                const mine = has(i.id),
                  on = isOn(av, i),
                  poor = !mine && p.coins < i.price;
                return (
                  <div
                    key={i.id}
                    data-testid={`shop-card-${i.id}`}
                    data-on={on}
                    data-try={tryId === i.id && !mine}
                    className="mc-card mc-item flex cursor-pointer flex-col gap-1.5 p-2"
                    onClick={() => {
                      audio.init();
                      tryOn(i);
                    }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === 'mouse') setHoverId(i.id);
                    }}
                    onPointerLeave={() => setHoverId((h) => (h === i.id ? null : h))}
                  >
                    <div data-testid={`shop-try-${i.id}`} className="flex min-h-[44px] items-center gap-2">
                      <Thumb item={i} />
                      <span className="min-w-0 flex-1 leading-tight">
                        <b className="block text-[13.5px] leading-tight">{nombre(i)}</b>
                        {i.trad && <Tag cls="mt-0.5">Típico</Tag>}
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid={`shop-item-${i.id}`}
                      data-state={on ? 'puesto' : mine ? 'tuyo' : poor ? 'caro' : 'venta'}
                      aria-label={
                        on
                          ? `${nombre(i)}, puesto`
                          : mine
                            ? `${i.cat === 'emote' ? 'Ver' : 'Ponerte'} ${nombre(i)}`
                            : `Comprar ${nombre(i)} por ${i.price} Lempiritas`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        audio.init();
                        void action(i);
                      }}
                      className="mc-btn w-full"
                      data-size="sm"
                      data-tone={on ? 'good' : mine ? 'neutral' : poor ? 'dark' : 'gold'}
                    >
                      {on ? (
                        <>
                          <Icon name="check" size={17} />
                          Puesto
                        </>
                      ) : mine ? (
                        i.cat === 'emote' ? (
                          <>
                            <Icon name="play" size={15} />
                            Tuyo
                          </>
                        ) : (
                          'Ponerme'
                        )
                      ) : (
                        <>
                          <Coin size={18} />
                          <span className="mc-num">{i.price}</span>
                          {poor && <Icon name="lock" size={14} cls="opacity-80" />}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            {list.length === 0 && <Note>No hay trajes típicos en esta categoría.</Note>}
            {cat !== 'emote' && cat !== 'rostro' && cat !== 'atuendo' && (
              <button
                type="button"
                data-testid="shop-to-editor"
                onClick={act(() => g().openPanel('personaje'))}
                className="mc-link mt-2"
              >
                <Icon name="user" size={17} />
                Cambia los colores en Personaje
                <Icon name="next" size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
