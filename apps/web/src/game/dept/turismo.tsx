import { useEffect, useMemo, useRef } from 'react';
import { create } from 'zustand';
import { type LugarTuristico, TURISMO } from '../../../../../docs/generador/turismo';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import type { V3 } from '../../core/types';
import { Cyl, Interactable, Label, useTick } from '../kit';
import { rectOf } from './ext';
import { colliderOf, isSolid } from './lib';
import type { ZoneSpec } from './zone';

export const useTurismo = create<{ lugar: LugarTuristico | null }>(() => ({ lugar: null }));

/** Recorre suelo firme conectado al punto de llegada; cada arista mide dos metros. */
export function puntosTuristicos(dept: string, spec: ZoneSpec) {
  const rc = rectOf(spec.limit),
    h = spec.f.h;
  const solids = spec.pcs.filter(isSolid).map(colliderOf);
  const seguro = (x: number, z: number) => {
    const y = h(x, z);
    return (
      x > rc.minX + 2 &&
      x < rc.maxX - 2 &&
      z > rc.minZ + 2 &&
      z < rc.maxZ - 2 &&
      y >= -0.25 &&
      !spec.bad?.(x, y, z) &&
      Math.abs(h(x + 1, z) - h(x - 1, z)) < 0.7 &&
      Math.abs(h(x, z + 1) - h(x, z - 1)) < 0.7 &&
      !solids.some((c) =>
        c.type === 'box'
          ? x > c.min[0] - 1 && x < c.max[0] + 1 && z > c.min[2] - 1 && z < c.max[2] + 1
          : Math.hypot(x - c.x, z - c.z) < c.r + 1,
      ) &&
      !spec.water.some((w) => {
        if ((w.mat ?? 'water') !== 'water') return false;
        const [sx, sz] = typeof w.size === 'number' ? [w.size, w.size] : (w.size ?? [900, 900]);
        const [wx, , wz] = w.pos ?? [0, 0, 0];
        return Math.abs(x - wx) < sx / 2 + 1 && Math.abs(z - wz) < sz / 2 + 1 && y < w.y + 0.3;
      })
    );
  };
  const nodes: { pos: V3; parent: number }[] = [{ pos: spec.spawn, parent: -1 }],
    seen = new Set<string>();
  for (let i = 0; i < nodes.length && nodes.length < 40000; i++) {
    const [x, y, z] = nodes[i].pos;
    for (const [dx, dz] of [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        key = `${nx},${nz}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!seguro(nx, nz) || !seguro(x + dx / 2, z + dz / 2) || Math.abs(h(nx, nz) - y) > 0.7) continue;
      nodes.push({ pos: [nx, h(nx, nz), nz], parent: i });
    }
  }
  const chosen: V3[] = [spec.spawn, spec.bus.use, spec.npc.pos, spec.gem.pos];
  return TURISMO.filter((p) => p.dept === dept).map((lugar) => {
    let best = -1,
      distance = -1;
    nodes.forEach((n, i) => {
      if (i === 0) return;
      const d = Math.min(...chosen.map((p) => Math.hypot(p[0] - n.pos[0], p[2] - n.pos[2])));
      if (d > distance) {
        best = i;
        distance = d;
      }
    });
    if (best < 0 || distance < 3) throw new Error(`Sin suelo caminable para ${lugar.id}`);
    const pos = nodes[best].pos,
      camino: V3[] = [];
    for (let i = best; i >= 0; i = nodes[i].parent) camino.unshift(nodes[i].pos);
    chosen.push(pos);
    return { lugar, pos, camino };
  });
}

export function Turismo({ dept, spec }: { dept: string; spec: ZoneSpec }) {
  const puntos = useMemo(() => puntosTuristicos(dept, spec), [dept, spec]);
  useEffect(() => {
    if (!location.hash.includes('test')) return;
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    (w.__mcTest ??= {}).turismo = { dept, puntos };
    return () => {
      if (w.__mcTest) delete w.__mcTest.turismo;
    };
  }, [dept, puntos]);
  return (
    <>
      {puntos.map((p) => (
        <PuntoTuristico key={p.lugar.id} {...p} />
      ))}
    </>
  );
}
function PuntoTuristico({ lugar, pos }: { lugar: LugarTuristico; pos: V3 }) {
  const recuerdo = useGame((s) => s.profile.turismo.find((x) => x.id === lugar.id));
  const ocupado = useRef(false);
  const reintentar = useRef(0);
  useTick(() => {
    const s = useGame.getState();
    if (Date.now() < reintentar.current) return;
    if (
      recuerdo ||
      ocupado.current ||
      s.panel ||
      s.dialog ||
      Math.hypot(player.pos[0] - pos[0], player.pos[2] - pos[2]) > 2.6 ||
      Math.abs(player.pos[1] - pos[1]) > 2.5
    )
      return;
    ocupado.current = true;
    void s.registrarTurismo(lugar.id, false).then((ok) => {
      if (ok) s.toast(`Descubriste: ${lugar.nombre}`, '📍');
      reintentar.current = ok ? 0 : Date.now() + 10000;
      ocupado.current = false;
    });
  });
  return (
    <group position={pos}>
      <Cyl
        pos={[0, 0.07, 0]}
        r={1.4}
        h={0.14}
        mat="stone"
        color={recuerdo?.completa ? '#35b898' : '#ddb970'}
        solid={false}
      />
      <Label pos={[0, 2.5, 0]} text={`${recuerdo?.completa ? '✓ ' : '📍 '}${lugar.nombre}`} h={0.32} />
      <Interactable
        pos={pos}
        radius={2.6}
        marker={false}
        label={`Explorá: ${lugar.nombre}`}
        icon="📷"
        onUse={() => {
          if (!useGame.getState().profile.turismo.some((x) => x.id === lugar.id)) return;
          useTurismo.setState({ lugar });
          useGame.getState().openPanel('turismo');
        }}
      />
    </group>
  );
}
