// Armazón común de las 18 zonas: paleta por bioma, constructor de zonas (ZB), y los componentes que las dibujan.
// Cada zona se describe como datos (ZoneSpec): terreno, piezas fusionadas, utilería del arte y puntos de interés.
import { Fragment, type ReactNode, useLayoutEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { Color } from 'three';
import { audio } from '../../core/audio';
import { DEPARTMENTS, SHOP } from '../../core/data';
import { phys } from '../../core/phys';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import type { AvatarConfig, AvatarState, Department, V3 } from '../../core/types';
import {
  art,
  CoinPickup,
  cylCol,
  Ground,
  Interactable,
  Label,
  type MatKind,
  P,
  Plate,
  type SkyRigProps,
  useCollider,
  useTick,
} from '../kit';
import type { FloraItem, FloraKind, HillDef } from '../kit/art/types';
import {
  alongPath,
  Build,
  bx,
  conFlora,
  Field,
  type Layer,
  type Pc,
  place,
  rng,
  rotXZ,
  SoftBound,
  stepGround,
  Terrain,
  type XZ,
} from './lib';
import { FLORA_OF, floraSeed, VEG, type VegKind } from './parts';

export interface Bio {
  grass: string;
  soil: string;
  sand: string;
  water: string;
  leaf: string[];
  rock: string;
}
export const BIO: Record<Department['biome'], Bio> = {
  costa: {
    grass: '#62b24c',
    soil: '#c9a56b',
    sand: '#f2dfa8',
    water: '#19b5c8',
    leaf: ['#2e9b4a', '#3aa856', '#2a8a44'],
    rock: '#8a8f96',
  },
  sur: {
    grass: '#b9a550',
    soil: '#b98a55',
    sand: '#d9c08a',
    water: '#3a9fc0',
    leaf: ['#8a9a3a', '#a3a34a', '#6f8f3a'],
    rock: '#9a8a78',
  },
  valle: {
    grass: '#6cb648',
    soil: '#b08a5a',
    sand: '#d9c79a',
    water: '#3f9fd0',
    leaf: ['#3f9b4b', '#4caf50', '#2f8a3f'],
    rock: '#8f9494',
  },
  lago: {
    grass: '#5aaa4a',
    soil: '#8a7a55',
    sand: '#cdbb8a',
    water: '#3a86ff',
    leaf: ['#2f8a3f', '#3f9b4b', '#4aa556'],
    rock: '#7f8a8a',
  },
  montana: {
    grass: '#5f9a58',
    soil: '#8a6f4d',
    sand: '#b9ab8a',
    water: '#4a90b8',
    leaf: ['#2f6b3a', '#357a42', '#3f8a4b'],
    rock: '#868c92',
  },
  capital: {
    grass: '#62a84e',
    soil: '#a39a8c',
    sand: '#cfc6b4',
    water: '#3f9fd0',
    leaf: ['#3f9b4b', '#357a42', '#4caf50'],
    rock: '#8f9494',
  },
  selva: {
    grass: '#2f8040',
    soil: '#5b4a2f',
    sand: '#b5a070',
    water: '#3f8f7a',
    leaf: ['#1f6b34', '#2a7d3c', '#35904a'],
    rock: '#6f7a70',
  },
  isla: {
    grass: '#69b85a',
    soil: '#d9c08a',
    sand: '#fff1c9',
    water: '#19c7d4',
    leaf: ['#2e9b4a', '#3aa856', '#35a04e'],
    rock: '#9a9a90',
  },
  bosque: {
    grass: '#3f7a45',
    soil: '#6b5236',
    sand: '#a89a78',
    water: '#4a8a9a',
    leaf: ['#24573a', '#2f6b3a', '#2a6140'],
    rock: '#70786f',
  },
};

export interface Find {
  id: string;
  name: string;
  icon: string;
  color: string;
  pos: V3;
  fact: string;
}
export interface Plaque {
  text: string;
  pos: V3;
  rot?: number;
  h?: number;
  label?: boolean;
  bg?: string;
  fg?: string;
}
export interface NpcDef {
  pos: V3;
  rot?: number;
  name: string;
  look: Partial<AvatarConfig>;
  icon?: string;
}
export interface ZoneSpec {
  id: string;
  f: Field;
  layers: Layer[];
  far: {
    mat: MatKind;
    color: string;
    y: number /** true = solo alrededor de la rejilla del terreno (deja ver ríos y hondonadas) */;
    ring?: boolean;
  };
  water: { y: number; color: string; size?: number | [number, number]; pos?: V3; mat?: MatKind }[];
  limit: { r: number } | { minX: number; maxX: number; minZ: number; maxZ: number };
  bad?: (x: number, y: number, z: number) => boolean;
  badMsg?: string;
  badIcon?: string;
  spawn: V3;
  yaw: number;
  bus: { pos: V3; rot: number; use: V3; sign: V3 };
  npc: NpcDef;
  gem: { pos: V3; color: string };
  coins: V3[];
  plaques: Plaque[];
  sky: Partial<SkyRigProps>;
  pcs: Pc[];
  nodes: ReactNode[];
  /** objetos escondidos para el minijuego Exploradores (solo en copan, cortes, islas) */
  finds?: Find[];
}

const hash = (s: string) => {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

/** Constructor de zonas: junta piezas, utilería y puntos de interés sobre un terreno. */
export class ZB {
  pcs: Pc[] = [];
  nodes: ReactNode[] = [];
  coins: V3[] = [];
  plaques: Plaque[] = [];
  layers: Layer[] = [];
  water: ZoneSpec['water'] = [];
  f: Field;
  bio: Bio;
  rand: () => number;
  h: Field['h'];
  at: Field['at'];
  spawn: V3 = [0, 0, 40];
  yaw = 0;
  bus: ZoneSpec['bus'] = { pos: [5, 0, 40], rot: 0, use: [3, 0, 40], sign: [3, 0, 35] };
  far?: ZoneSpec['far'];
  constructor(
    public d: Department,
    height: (x: number, z: number) => number,
    size = 160,
    cell = 2,
  ) {
    this.f = new Field(size, cell, height);
    this.h = this.f.h;
    this.at = this.f.at;
    this.bio = BIO[d.biome];
    this.rand = rng(hash(d.id));
  }
  /** piezas en coordenadas del mundo */
  add(...p: (Pc | Pc[])[]) {
    for (const q of p) {
      if (Array.isArray(q)) this.pcs.push(...q);
      else this.pcs.push(q);
    }
    return this;
  }
  /** piezas locales apoyadas en el terreno en (x, z), giradas `rot` */
  put(pcs: Pc[], x: number, z: number, rot = 0, dy = 0) {
    this.pcs.push(...place(pcs, x, this.h(x, z) + dy, z, rot));
    return this;
  }
  /** utilería del arte u otro nodo de React */
  n(node: ReactNode) {
    this.nodes.push(<Fragment key={this.nodes.length}>{node}</Fragment>);
    return this;
  }
  layer(mat: MatKind, color: string, w?: Layer['w']) {
    this.layers.push({ mat, color, w });
    return this;
  }
  sea(y: number, color = this.bio.water, size: number | [number, number] = 900, pos?: V3) {
    this.water.push({ y, color, size, pos });
    return this;
  }
  /** plano extra (tierra lejana más allá de la rejilla del terreno) */
  plane(mat: MatKind, color: string, y: number, size: number | [number, number], pos: V3 = [0, 0, 0]) {
    this.water.push({ mat, y, color, size, pos });
    return this;
  }
  plaque(text: string, x: number, y: number, z: number, rot = 0, h = 0.42, bg?: string) {
    this.plaques.push({ text, pos: [x, y, z], rot, h, bg });
    return this;
  }
  label(text: string, x: number, y: number, z: number, h = 0.7) {
    this.plaques.push({ text, pos: [x, y, z], h, label: true });
    return this;
  }
  coin(x: number, y: number, z: number) {
    this.coins.push([x, y, z]);
    return this;
  }
  /** monedas repartidas por una ruta, a la altura del terreno (+dy) */
  trail(pts: XZ[], n: number, dy = 0) {
    for (const [x, z] of alongPath(pts, n)) this.coins.push([x, this.h(x, z) + dy, z]);
    return this;
  }
  /** vegetación fusionada repartida al azar donde ok(x, z) */
  veg(
    kind: VegKind,
    n: number,
    ok: (x: number, z: number) => boolean,
    o: { sep?: number; smin?: number; smax?: number; area?: number; colors?: string[]; cx?: number; cz?: number } = {},
  ) {
    const pts: XZ[] = [],
      A = o.area ?? 72,
      sep = o.sep ?? 3,
      cols = o.colors ?? this.bio.leaf;
    for (let t = 0; t < n * 40 && pts.length < n; t++) {
      const x = (o.cx ?? 0) + (this.rand() * 2 - 1) * A,
        z = (o.cz ?? 0) + (this.rand() * 2 - 1) * A;
      if (!ok(x, z) || pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < sep)) continue;
      pts.push([x, z]);
      const s = (o.smin ?? 0.85) + this.rand() * ((o.smax ?? 1.3) - (o.smin ?? 0.85)),
        c = cols[Math.floor(this.rand() * cols.length)],
        y = this.h(x, z),
        pc = VEG[kind](x, y, z, s, c, this.rand),
        fk = FLORA_OF[kind];
      // con vegetación del paquete de arte: las piezas quedan solo como colisión (mismos troncos sólidos)
      if (art.Flora && fk && pc.length) {
        for (const q of pc) q.hide = true;
        pc[0].flora = { k: fk, p: [x, y, z], s, c, seed: floraSeed(x, z) };
      }
      this.pcs.push(...pc);
    }
    return pts;
  }
  /** Plantación en hileras dentro de un rectángulo (fondo, fuera de lo jugable): quita la vegetación suelta que había
   *  ahí, siembra a tresbolillo con un poco de desorden y deja calles cada `calle` hileras. Sin colisión. */
  plantacion(
    k: 'bananera' | 'oilpalm',
    r: { minX: number; maxX: number; minZ: number; maxZ: number },
    o: {
      dx: number;
      dz: number;
      smin: number;
      smax: number;
      colors: string[];
      calle?: number;
      ok?: (x: number, z: number) => boolean;
    },
  ) {
    const dentro = (x: number, z: number, m = 0) =>
      x > r.minX - m && x < r.maxX + m && z > r.minZ - m && z < r.maxZ + m;
    if (art.Flora) this.pcs = this.pcs.filter((q) => !(q.hide && !q.hill && dentro(q.p[0], q.p[2], 1.5)));
    const veg: VegKind = k === 'bananera' ? 'banana' : 'oilpalm',
      rr = rng(Math.round(r.minX * 31 + r.minZ * 17) >>> 0);
    let fila = 0;
    for (let z = r.minZ; z <= r.maxZ; z += o.dz, fila++) {
      if (o.calle && fila % o.calle === o.calle - 1) continue;
      for (let x = r.minX + (fila % 2 ? o.dx / 2 : 0); x <= r.maxX; x += o.dx) {
        const px = x + (rr() - 0.5) * o.dx * 0.18,
          pz = z + (rr() - 0.5) * o.dz * 0.18;
        if (o.ok && !o.ok(px, pz)) continue;
        const y = this.h(px, pz),
          s = o.smin + rr() * (o.smax - o.smin),
          c = o.colors[Math.floor(rr() * o.colors.length)],
          pc = VEG[veg](px, y, pz, s, c, rr).map((q) => ({ ...q, solid: false }));
        this.pcs.push(...conFlora(pc, { k, p: [px, y, pz], s, c, seed: Math.floor(rr() * 1000) }));
      }
    }
    return this;
  }
  /** piezas de una planta: con vegetación del paquete de arte se dibuja `item` y las piezas quedan solo como colisión */
  plant(pcs: Pc[], item: FloraItem) {
    this.pcs.push(...conFlora(pcs, item));
    return this;
  }
  /** parada de bus: aquí aparece el jugador. Deja el bus a su derecha y el rótulo de bienvenida al frente a la izquierda. */
  stop(x: number, z: number, yaw = 0, y = this.h(x, z)) {
    const L = (lx: number, lz: number, dy = 0): V3 => {
      const [rx, rz] = rotXZ(lx, lz, yaw);
      return [x + rx, this.h(x + rx, z + rz) + dy, z + rz];
    };
    this.spawn = [x, y, z];
    this.yaw = yaw;
    this.bus = { pos: L(5.6, -1), rot: yaw, use: L(3.4, -1), sign: L(3.7, -5.6) };
    const w = L(-6, -7),
      s = L(-5.5, 1.5);
    this.pcs.push(
      ...place(
        [
          bx(-2.6, 1.5, 0, 0.22, 3, 0.22, 'wood', '#5a3d26'),
          bx(2.6, 1.5, 0, 0.22, 3, 0.22, 'wood', '#5a3d26'),
          bx(0, 2.35, 0, 5.8, 1.7, 0.16, 'wood', '#2b3a55', { solid: false }),
          bx(0, 3.3, 0, 6.2, 0.18, 0.5, 'roof', '#b5523b', { solid: false }),
        ],
        w[0],
        w[1],
        w[2],
        yaw + 0.25,
      ),
    );
    const [ox, oz] = rotXZ(0, 0.1, yaw + 0.25);
    this.plaques.push(
      {
        text: `Bienvenidos a ${this.d.name}`,
        pos: [w[0] + ox, w[1] + 2.62, w[2] + oz],
        rot: yaw + 0.25,
        h: 0.62,
        bg: '#0d47a1',
      },
      {
        text: `Cabecera: ${this.d.cabecera}`,
        pos: [w[0] + ox, w[1] + 1.95, w[2] + oz],
        rot: yaw + 0.25,
        h: 0.42,
        bg: '#ffd23f',
        fg: '#1d1d1f',
      },
    );
    // caseta de espera
    this.pcs.push(
      ...place(
        [
          bx(-1.4, 1.2, -0.6, 0.14, 2.4, 0.14, 'metal', '#4a5560'),
          bx(1.4, 1.2, -0.6, 0.14, 2.4, 0.14, 'metal', '#4a5560'),
          bx(0, 2.45, 0, 3.4, 0.12, 1.8, 'metal', this.d.colors[0], { solid: false }),
          bx(0, 0.45, -0.4, 2.6, 0.12, 0.5, 'wood', '#8a5a34'),
          bx(-1.1, 0.22, -0.4, 0.12, 0.44, 0.4, 'metal', '#4a5560', { solid: false }),
          bx(1.1, 0.22, -0.4, 0.12, 0.44, 0.4, 'metal', '#4a5560', { solid: false }),
        ],
        s[0],
        s[1],
        s[2],
        yaw + PI_2,
      ),
    );
    return this;
  }
  done(r: {
    limit: ZoneSpec['limit'];
    npc: NpcDef;
    gem: V3;
    gemColor?: string;
    sky?: Partial<SkyRigProps>;
    bad?: ZoneSpec['bad'];
    badMsg?: string;
    badIcon?: string;
    finds?: Find[];
  }): ZoneSpec {
    if (!this.layers.length) this.layer('grass', this.bio.grass);
    return {
      id: this.d.id,
      f: this.f,
      layers: this.layers,
      far: this.far ?? { mat: this.layers[0].mat, color: this.layers[0].color, y: -0.12, ring: true },
      water: this.water,
      limit: r.limit,
      bad: r.bad,
      badMsg: r.badMsg,
      badIcon: r.badIcon,
      spawn: this.spawn,
      yaw: this.yaw,
      bus: this.bus,
      npc: r.npc,
      gem: { pos: r.gem, color: r.gemColor ?? this.d.colors[1] },
      coins: this.coins,
      plaques: this.plaques,
      sky: r.sky ?? {},
      pcs: this.pcs,
      nodes: this.nodes,
      finds: r.finds,
    };
  }
}
const PI_2 = Math.PI / 2;

/** El escenario de una zona: cielo, terreno, agua, piezas, utilería, rótulos y límites. Sirve también al minijuego Exploradores. */
export function ZoneScenery({ spec }: { spec: ZoneSpec }) {
  useLayoutEffect(() => {
    phys.ground = stepGround(spec.f.h, spec.pcs);
    phys.limit = spec.limit;
    phys.killY = -30;
    return () => {
      phys.ground = () => 0;
      phys.limit = null;
    };
  }, [spec]);
  // el agua de la zona sabe qué tan honda es (orilla con espuma, fondo a la vista, olas en mar abierto)
  useLayoutEffect(() => {
    const levels = spec.water.filter((w) => (w.mat ?? 'water') === 'water').map((w) => w.y);
    if (!levels.length) return;
    return art.shore?.(spec.f.data, spec.f.n, spec.f.cell, levels);
  }, [spec]);
  return (
    <>
      <art.SkyRig time="auto" weather="auto" {...spec.sky} />
      {spec.far.ring ? (
        [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ].map(([sx, sz], i) => {
          const h = spec.f.half,
            w = 450 - h;
          return (
            <Ground
              key={i}
              mat={spec.far.mat}
              color={spec.far.color}
              y={spec.far.y}
              size={sx ? [w, h * 2] : [900, w]}
              pos={[sx * (h + w / 2), 0, sz * (h + w / 2)]}
            />
          );
        })
      ) : (
        <Ground size={900} mat={spec.far.mat} color={spec.far.color} y={spec.far.y} />
      )}
      {spec.layers.map((l, i) => (
        <Terrain key={i} f={spec.f} {...l} />
      ))}
      <Greenery spec={spec} />
      {spec.water.map((w, i) => (
        <Ground key={i} mat={w.mat ?? 'water'} color={w.color} y={w.y} size={w.size ?? 900} pos={w.pos} />
      ))}
      <Build pieces={spec.pcs} />
      {spec.nodes}
      {spec.plaques.map((p, i) =>
        p.label ? (
          <Label key={i} pos={p.pos} text={p.text} h={p.h ?? 0.6} />
        ) : (
          <Plate
            key={i}
            pos={p.pos}
            text={p.text}
            h={p.h ?? 0.42}
            rot={p.rot}
            bg={p.bg ?? '#3a2a1a'}
            fg={p.fg ?? '#ffffff'}
          />
        ),
      )}
      {spec.bad && <SoftBound bad={spec.bad} msg={spec.badMsg} icon={spec.badIcon} />}
    </>
  );
}

/** ¿(x, z) fuera de la rejilla cae en tierra? (el plano más alto que lo cubre no es agua) */
function landAt(spec: ZoneSpec, x: number, z: number) {
  let top = spec.far.y,
    water = false;
  for (const w of spec.water) {
    const [sx, sz] = typeof w.size === 'number' ? [w.size, w.size] : (w.size ?? [900, 900]),
      [px, , pz] = w.pos ?? [0, 0, 0];
    if (Math.abs(x - px) > sx / 2 || Math.abs(z - pz) > sz / 2 || w.y <= top) continue;
    top = w.y;
    water = (w.mat ?? 'water') === 'water';
  }
  return water ? null : top;
}
/** Lomas de fondo entre la zona y los cerros: en tierra, lejos de lo jugable y de la ampliación del sur (estaciones). */
function lomas(spec: ZoneSpec): HillDef[] {
  const r = rng(hash(spec.id) + 77),
    bio = BIO[DEPARTMENTS.find((d) => d.id === spec.id)?.biome ?? 'valle'],
    out: HillDef[] = [];
  for (let t = 0; t < 80 && out.length < 12; t++) {
    const a = r() * Math.PI * 2,
      d = 125 + r() * 85,
      x = Math.cos(a) * d,
      z = Math.sin(a) * d,
      R = Math.min(d - 100, 24 + r() * 26),
      y = landAt(spec, x, z);
    if (R < 14 || y === null || (z > -60 && Math.abs(x) < 150)) continue;
    // y que toda la base quede en tierra
    if ([0, 1, 2, 3].some((k) => landAt(spec, x + Math.cos(k * 1.57) * R, z + Math.sin(k * 1.57) * R) === null))
      continue;
    const c = new Color(bio.grass).lerp(new Color(bio.leaf[t % bio.leaf.length]), 0.55).getStyle();
    out.push({ p: [x, y, z], r: R, h: R * (0.32 + r() * 0.4), c, seed: t + 11 });
  }
  return out;
}

/** Cerros del paquete de arte (una malla) y el zacate cerca de la cámara. La vegetación la dibuja <Build>. */
function Greenery({ spec }: { spec: ZoneSpec }) {
  const pcs = spec.pcs,
    hills = useMemo(
      () =>
        art.Hills
          ? [
              ...pcs.flatMap((q): HillDef[] =>
                q.hill ? [{ ...q.hill, p: [q.p[0] + q.hill.p[0], q.p[1] + q.hill.p[1], q.p[2] + q.hill.p[2]] }] : [],
              ),
              ...lomas(spec),
            ]
          : [],
      [pcs, spec],
    );
  return (
    <>
      {art.Hills && hills.length > 0 && <art.Hills hills={hills} />}
      {art.GroundCover && <art.GroundCover />}
    </>
  );
}

/** Vecino del lugar: saluda cuando te acercas y cuenta el dato cultural. */
export function Npc({ npc, title, text }: { npc: NpcDef; title: string; text: string }) {
  const st = useMemo<AvatarState>(() => ({ anim: 'idle', speed: 0 }), []),
    g = useRef<THREE.Group>(null),
    [x, y, z] = npc.pos;
  const cfg = useMemo(() => ({ ...SHOP.defaultAvatar, ...npc.look }), [npc]);
  useCollider(() => cylCol([x, y + 0.9, z], 0.4, 1.8), [`${npc.pos}`]);
  useTick((dt) => {
    const dx = player.pos[0] - x,
      dz = player.pos[2] - z,
      near = Math.hypot(dx, dz) < 7;
    st.anim = near ? 'wave' : 'idle';
    if (g.current) {
      let d = (near ? Math.atan2(dx, dz) : (npc.rot ?? 0)) - g.current.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      g.current.rotation.y += d * Math.min(1, dt * 6);
    }
  });
  return (
    <>
      <group ref={g} position={npc.pos} rotation-y={npc.rot ?? 0}>
        <art.Avatar config={cfg} state={st} name={npc.name} />
      </group>
      <Interactable
        pos={npc.pos}
        radius={2.6}
        label={`Hablar con ${npc.name}`}
        icon={npc.icon ?? '💬'}
        marker={false}
        onUse={() => useGame.getState().showDialog({ title, text, icon: npc.icon ?? '📜' })}
      />
    </>
  );
}

/** El recuerdo escondido del departamento: se recoge al tocarlo o con E, y no vuelve a aparecer. */
function Collectible({ d, pos, color }: { d: Department; pos: V3; color: string }) {
  const has = useGame((s) => s.profile.collected.includes(d.id)),
    g = useRef<THREE.Group>(null);
  const take = () => {
    const s = useGame.getState();
    if (s.collect(d.id)) {
      audio.sfx('pickup');
      s.toast(`¡Recuerdo encontrado! ${d.collectible}`, '💎');
    }
  };
  useTick((_, t) => {
    if (has || !g.current) return;
    g.current.rotation.y = t * 1.6;
    g.current.position.y = pos[1] + 1 + Math.sin(t * 2) * 0.12;
    const p = player.pos;
    if (Math.hypot(p[0] - pos[0], p[2] - pos[2]) < 1.2 && Math.abs(p[1] - pos[1]) < 2) take();
  });
  if (has) return null;
  return (
    <>
      <group ref={g} position={[pos[0], pos[1] + 1, pos[2]]}>
        <P.Gem color={color} kind={d.id} />
      </group>
      <Interactable pos={pos} radius={2.2} label={`Recoger: ${d.collectible}`} icon="💎" marker={false} onUse={take} />
    </>
  );
}

/** Lo que hace viva la zona en el modo de exploración libre: bus al mapa, vecino, recuerdo y monedas. */
export function ZoneLife({ d, spec }: { d: Department; spec: ZoneSpec }) {
  const g = useGame.getState;
  return (
    <>
      <P.Bus pos={spec.bus.pos} rot={spec.bus.rot} />
      <P.Sign pos={spec.bus.sign} rot={spec.yaw} text="Parada de bus" />
      <Interactable
        pos={spec.bus.use}
        radius={2.3}
        label="Terminal: salir de viaje"
        icon="🚌"
        onUse={() => g().openPanel('transporte')}
      />
      <Npc npc={spec.npc} title={`${spec.npc.name} · ${d.name}`} text={d.fact} />
      <Collectible d={d} pos={spec.gem.pos} color={spec.gem.color} />
      {spec.coins.map((c, i) => (
        <CoinPickup key={i} pos={c} />
      ))}
    </>
  );
}
