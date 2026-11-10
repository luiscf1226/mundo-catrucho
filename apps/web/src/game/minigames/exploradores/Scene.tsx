// Exploradores de Honduras: tres sitios (Copán, Lago de Yojoa, Roatán), cinco objetos escondidos en cada uno y
// un reloj que no se detiene al viajar. Reutiliza el escenario de las zonas de departamento en modo expedición.
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { audio } from '../../../core/audio';
import { DEPARTMENTS, deptById } from '../../../core/data';
import { player } from '../../../core/player';
import { mgPlaying, useGame } from '../../../core/store';
import type { V3 } from '../../../core/types';
import { Glint } from '../../dept/fx';
import { rotXZ } from '../../dept/lib';
import { type Find, ZoneScenery, type ZoneSpec } from '../../dept/zone';
import { zoneOf } from '../../dept/zones';
import { Interactable, P, Spawn, useMgTick } from '../../kit';
import { finish, partida, rulesOf, setHud, starsFor } from '../api';

const FIXED: Record<string, string> = { copan: 'Copán Ruinas', cortes: 'Lago de Yojoa', islas: 'Roatán' };
const NAMES = new Proxy(FIXED, { get: (o, id: string) => o[id] ?? DEPARTMENTS.find((d) => d.id === id)?.name ?? id });

/** Objeto escondido: gira despacio, destella cuando estás cerca y se recoge al tocarlo o con E. */
function Hidden({ f, onTake }: { f: Find; onTake: () => void }) {
  const g = useRef<THREE.Group>(null);
  useMgTick((_, t) => {
    if (g.current) {
      g.current.rotation.y = t * 1.4;
      g.current.position.y = f.pos[1] + 0.55 + Math.sin(t * 2.2 + f.pos[0]) * 0.08;
    }
    const p = player.pos;
    if (Math.hypot(p[0] - f.pos[0], p[2] - f.pos[2]) < 1.25 && Math.abs(p[1] - f.pos[1]) < 2.2) onTake();
  });
  return (
    <>
      <group ref={g} position={[f.pos[0], f.pos[1] + 0.55, f.pos[2]]} scale={0.62}>
        <P.Gem color={f.color} kind={f.id} />
      </group>
      <Glint pos={f.pos} color={f.color} />
      <Interactable
        pos={f.pos}
        radius={2}
        label={`Recoger: ${f.name}`}
        icon={f.icon}
        marker={false}
        enabled={mgPlaying}
        onUse={onTake}
      />
    </>
  );
}

/** Arcos de la expedición junto a la parada: uno para seguir al próximo sitio y otro para volver. */
function Travel({ spec, next, prev, go }: { spec: ZoneSpec; next?: string; prev?: string; go: (d: 1 | -1) => void }) {
  const L = (lx: number, lz: number): V3 => {
    const [x, z] = rotXZ(lx, lz, spec.yaw);
    return [spec.spawn[0] + x, spec.f.h(spec.spawn[0] + x, spec.spawn[2] + z), spec.spawn[2] + z];
  };
  return (
    <>
      <P.Car pos={L(11, 0.5)} rot={spec.yaw + 0.25} color="#5f7a3a" />
      <P.Sign pos={L(8.6, -6.4)} rot={spec.yaw - 0.4} text="Expedición" color="#bc6c25" />
      {next && (
        <>
          <P.PortalArch
            pos={L(6.6, -3.2)}
            rot={spec.yaw + Math.PI / 2}
            label={`Ir a ${NAMES[next]}`}
            icon="🧭"
            color="#ff7a3d"
          />
          <Interactable
            pos={L(4.6, -3.2)}
            radius={2.1}
            label={`Ir a ${NAMES[next]}`}
            icon="🧭"
            enabled={mgPlaying}
            onUse={() => go(1)}
          />
        </>
      )}
      {prev && (
        <>
          <P.PortalArch
            pos={L(6.6, 3.4)}
            rot={spec.yaw + Math.PI / 2}
            label={`Volver a ${NAMES[prev]}`}
            icon="↩"
            color="#00a3d7"
          />
          <Interactable
            pos={L(4.6, 3.4)}
            radius={2.1}
            label={`Volver a ${NAMES[prev]}`}
            icon="↩"
            enabled={mgPlaying}
            onUse={() => go(-1)}
          />
        </>
      )}
    </>
  );
}

export function ExploradoresScene() {
  const P = useMemo(partida, []),
    R0 = rulesOf('exploradores');
  // el tema del catálogo puede traer sus propios sitios (ids de departamento); la meta se ajusta a cuántos son
  const sites = useMemo(() => {
    const t = Array.isArray(P.tema.sitios)
      ? (P.tema.sitios as unknown[]).filter(
          (id): id is string => typeof id === 'string' && DEPARTMENTS.some((d) => d.id === id),
        )
      : [];
    return t.length ? t : (R0.sites as string[]);
  }, [P, R0]);
  const R = useMemo(() => {
    const k = sites.length / (R0.sites as string[]).length,
      tot = sites.length * R0.objectsPerSite,
      sc = (v: number) => Math.min(tot, Math.max(1, Math.round(v * k)));
    return {
      ...R0,
      // etapa 1 con un poco más de tiempo; la última con menos (la meta de objetos no cambia)
      timeLimit: Math.round(Math.max(90, R0.timeLimit * k) * (1.1 - 0.2 * P.dif)),
      bronze: sc(R0.bronze),
      silver: Math.max(sc(R0.bronze) + 1, sc(R0.silver)),
      gold: tot,
    } as Record<string, any>;
  }, [sites, R0, P]);
  const total = sites.length * R.objectsPerSite;
  const specs = useMemo(() => sites.map((id) => zoneOf(deptById(id))), [sites]);
  const [site, setSite] = useState(0),
    [found, setFound] = useState<string[]>([]);
  const st = useRef({
    time: R.timeLimit as number,
    found: [] as string[],
    site: 0,
    over: false,
    seen: new Set<number>(),
  });
  const spec = specs[site],
    finds = (spec.finds ?? []).slice(0, R.objectsPerSite);

  const end = () => {
    const s = st.current;
    if (s.over) return;
    s.over = true;
    const n = s.found.length,
      won = n >= R.bronze;
    finish({
      won,
      stars: won ? starsFor(n, R.bronze, R.silver, R.gold) : 0,
      score: n,
      label: `${n}/${total} objetos`,
      stats: { found: n },
    });
  };
  const take = (f: Find) => {
    const s = st.current,
      key = `${sites[s.site]}:${f.id}`;
    if (s.over || s.found.includes(key)) return;
    s.found = [...s.found, key];
    setFound(s.found);
    audio.sfx('pickup');
    const g = useGame.getState();
    if (s.found.length >= total) {
      g.toast(`${f.name}: ${f.fact}`, f.icon);
      end();
      return;
    }
    if (!s.seen.has(s.site)) {
      s.seen.add(s.site);
      g.showDialog({ title: `${f.name} · ${NAMES[sites[s.site]]}`, text: f.fact, icon: f.icon });
    } else g.toast(`${f.name}: ${f.fact}`, f.icon);
  };
  const go = (d: 1 | -1) => {
    const s = st.current,
      n = s.site + d;
    if (s.over || n < 0 || n >= sites.length) return;
    s.site = n;
    setSite(n);
    audio.sfx('portal');
    useGame.getState().toast(`Llegaste a ${NAMES[sites[n]]}`, '🧭');
  };
  useMgTick((dt) => {
    const s = st.current;
    if (s.over) return;
    s.time -= dt;
    const here = (specs[s.site].finds ?? [])
        .slice(0, R.objectsPerSite)
        .filter((f) => !s.found.includes(`${sites[s.site]}:${f.id}`)),
      name = NAMES[sites[s.site]];
    const rest = sites
      .filter((id, i) => i !== s.site && (specs[i].finds ?? []).some((f) => !s.found.includes(`${id}:${f.id}`)))
      .map((id) => NAMES[id]);
    setHud({
      timer: Math.max(0, Math.ceil(s.time)),
      score: `${s.found.length}/${total}`,
      objective: here.length
        ? `${name}: faltan ${here.length}`
        : rest.length
          ? `${name} completo. Seguí a ${rest[0]}`
          : '¡Todo encontrado!',
      lines: here.map((f) => `${f.icon} ${f.name}`),
    });
    if (s.time <= 0) end();
  });
  // solo para pruebas automáticas: posiciones de objetos y arcos, y una forma de ajustar el reloj
  useEffect(() => {
    if (!location.hash.includes('test')) return;
    const L = (sp: ZoneSpec, lx: number, lz: number) => {
      const [x, z] = rotXZ(lx, lz, sp.yaw);
      return [sp.spawn[0] + x, sp.f.h(sp.spawn[0] + x, sp.spawn[2] + z), sp.spawn[2] + z];
    };
    ((window as any).__mcTest ??= {}).exploradores = {
      sites,
      total,
      state: () => ({ site: st.current.site, found: st.current.found.length, time: st.current.time }),
      finds: () =>
        specs[st.current.site].finds!.slice(0, R.objectsPerSite).map((f) => ({
          id: f.id,
          pos: f.pos,
          found: st.current.found.includes(`${sites[st.current.site]}:${f.id}`),
        })),
      portal: (d: 1 | -1) => L(specs[st.current.site], 4.6, d > 0 ? -3.2 : 3.4),
      setTime: (t: number) => {
        st.current.time = t;
      },
    };
  }, [sites, specs, R, total]);

  return (
    <>
      <Spawn key={site} pos={spec.spawn} yaw={spec.yaw} />
      <ZoneScenery key={spec.id} spec={spec} />
      <Travel key={`t${site}`} spec={spec} next={sites[site + 1]} prev={sites[site - 1]} go={go} />
      {finds.map(
        (f) =>
          !found.includes(`${sites[site]}:${f.id}`) && <Hidden key={`${site}:${f.id}`} f={f} onTake={() => take(f)} />,
      )}
    </>
  );
}
