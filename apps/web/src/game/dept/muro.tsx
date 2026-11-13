// Rincón de memes: una tarima redonda con el meme en 3D cerca de donde aparecés en cada departamento. Con E pasa
// al siguiente meme de aquí (o de todo Honduras si aquí no hay ninguno) y lo mete a tu álbum.
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { audio } from '../../core/audio';
import { catDe, DEPARTMENTS } from '../../core/data';
import { memesDeDept } from '../../core/memes';
import { useGame } from '../../core/store';
import type { Department, V3 } from '../../core/types';
import { Block, Cyl, Interactable, Label, useTick } from '../kit';
import { ALTO, Meme3D, ZOCALO } from '../memes/Meme3D';
import { layoutOf, type Rect, rectOf } from './ext';
import { colliderOf, isSolid, PI, rotXZ, type XZ } from './lib';
import { salidaDe } from './stations';
import type { ZoneSpec } from './zone';
import { zoneOf } from './zones';

export interface MuroLugar {
  pos: V3;
  /** el frente mira a la salida */
  rot: number;
  /** donde se para el jugador para usarlo */
  use: V3;
}

const TARIMA = { r: 2.1, h: 0.2 },
  /** del centro al punto de uso: delante del zócalo, todavía sobre la tarima */
  USO = 2.6;

const distSegmento = (x: number, z: number, [ax, az]: XZ, [bx, bz]: XZ) => {
  const dx = bx - ax,
    dz = bz - az,
    k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - k * dx, z - az - k * dz);
};

/** Lugar caminable a 8–16 m de la salida, sin agua y sin estorbar piezas, estaciones, caminos ni puntos de interés. */
export function lugarDelMuro(d: Department, spec: ZoneSpec): MuroLugar | null {
  const lugares = catDe(d.id).lugares,
    lay = lugares.length ? layoutOf(spec, lugares) : null,
    salida = lay ? salidaDe(lay) : { pos: spec.spawn, yaw: spec.yaw },
    areas: Rect[] = lay ? [lay.old, lay.neck, lay.main] : [rectOf(spec.limit)],
    h = spec.f.h,
    solidos = spec.pcs.filter(isSolid).map(colliderOf),
    puntos = [spec.bus.pos, spec.bus.use, spec.bus.sign, spec.npc.pos, spec.gem.pos, ...spec.plaques.map((p) => p.pos)];
  const dentro = (x: number, z: number) =>
    areas.some((r) => x > r.minX + 3 && x < r.maxX - 3 && z > r.minZ + 3 && z < r.maxZ - 3);
  const mojado = (x: number, y: number, z: number) =>
    spec.water.some((w) => {
      if ((w.mat ?? 'water') !== 'water') return false;
      const [ax, az] = typeof w.size === 'number' ? [w.size, w.size] : (w.size ?? [900, 900]),
        [px, , pz] = w.pos ?? [0, 0, 0];
      return Math.abs(x - px) < ax / 2 + 2 && Math.abs(z - pz) < az / 2 + 2 && y < w.y + 0.2;
    });
  const estorba = (x: number, z: number) =>
    solidos.some((c) =>
      c.type === 'box'
        ? x > c.min[0] - 2.5 && x < c.max[0] + 2.5 && z > c.min[2] - 2.5 && z < c.max[2] + 2.5
        : Math.hypot(x - c.x, z - c.z) < c.r + 2.5,
    ) ||
    puntos.some((p) => Math.hypot(x - p[0], z - p[2]) < 5) ||
    (!!lay &&
      (Math.hypot(x - lay.c[0], z - lay.c[1]) < 10 ||
        lay.st.some((s) => Math.hypot(x - s.pos[0], z - s.pos[1]) < 19 || distSegmento(x, z, lay.c, s.pos) < 3)));
  const [sx, , sz] = salida.pos,
    frente = Math.atan2(-Math.sin(salida.yaw), -Math.cos(salida.yaw));
  // primero cerca del frente, para que se vea desde que aparecés
  for (const da of [0.45, -0.45, 0.3, -0.3, 0.6, -0.6, 0, 0.8, -0.8, 1.1, -1.1, 1.4, -1.4])
    for (const dist of [14, 12, 16, 10, 9, 8]) {
      const x = sx + Math.sin(frente + da) * dist,
        z = sz + Math.cos(frente + da) * dist,
        y = h(x, z);
      if (!dentro(x, z) || y < -0.25 || Math.abs(h(x + 1.8, z) - h(x - 1.8, z)) > 0.5) continue;
      if (Math.abs(h(x, z + 1.8) - h(x, z - 1.8)) > 0.5 || spec.bad?.(x, y, z) || mojado(x, y, z) || estorba(x, z))
        continue;
      const rot = Math.atan2(sx - x, sz - z),
        [ux, uz] = rotXZ(0, USO, rot);
      return { pos: [x, y, z], rot, use: [x + ux, h(x + ux, z + uz), z + uz] };
    }
  return null;
}

const GIRO = 0.55;

export function MuroMemes({ d, spec }: { d: Department; spec: ZoneSpec }) {
  const lugar = useMemo(() => lugarDelMuro(d, spec), [d, spec]),
    lista = useMemo(() => {
      const propios = memesDeDept(d.id);
      return propios.length ? propios : memesDeDept(null);
    }, [d]);
  const [i, setI] = useState(0),
    tabla = useRef<THREE.Group>(null),
    giro = useRef(1);
  const meme = lista.length ? lista[i % lista.length] : undefined;
  useEffect(() => {
    if (!lugar || !meme || !location.hash.includes('test')) return;
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    (w.__mcTest ??= {}).muroMemes = {
      pos: lugar.pos,
      use: lugar.use,
      meme: meme.id,
      todos: () => DEPARTMENTS.map((x) => ({ id: x.id, pos: lugarDelMuro(x, zoneOf(x))?.pos ?? null })),
    };
  }, [lugar, meme]);
  useTick((dt) => {
    const g = tabla.current;
    if (!g || giro.current >= 1) return;
    giro.current = Math.min(1, giro.current + dt / GIRO);
    const k = giro.current;
    g.rotation.y = (1 - k) ** 3 * PI * 2;
    g.position.y = Math.sin(PI * k) * 0.35;
  });
  if (!lugar || !meme) return null;
  const [x, y, z] = lugar.pos,
    rot = lugar.rot;
  const usar = () => {
    const sig = (i + 1) % lista.length,
      m = lista[sig],
      s = useGame.getState();
    setI(sig);
    giro.current = 0;
    audio.sfx('pickup');
    if (s.verMeme(m.id)) s.toast('Meme nuevo en tu álbum', m.emoji);
  };
  const piso = y + TARIMA.h + ZOCALO;
  return (
    <>
      <Cyl pos={[x, y + TARIMA.h / 2, z]} r={TARIMA.r} h={TARIMA.h} sides={28} mat="stone" color="#8f8574" />
      <Block pos={[x, y + 1.6, z]} size={[3.2, 3.2, 3.2]} rot={rot} visible={false} />
      <group position={[x, piso, z]} rotation-y={rot}>
        <group ref={tabla}>
          <Meme3D meme={meme} />
        </group>
      </group>
      <Label pos={[x, piso + ALTO + 0.55, z]} text="Rincón de memes" h={0.5} />
      <Interactable pos={lugar.use} radius={2.4} label="Ver otro meme" icon="🖼️" onUse={usar} />
    </>
  );
}
