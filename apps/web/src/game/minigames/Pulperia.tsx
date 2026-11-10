import { useEffect, useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import { audio } from '../../core/audio';
import { phys } from '../../core/phys';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import type { AvatarState, V3 } from '../../core/types';
import { art, Ball, Block, Cyl, Ground, Interactable, Label, Spawn, useMgTick } from '../kit';
import { finish, partida, rulesOf, setHud, starsFor } from './api';
import { Boxes, type Piece } from './feria/inst';

type Item = 'baleada' | 'fresco' | 'pan' | 'churros';
const menu: Item[] = ['baleada', 'fresco', 'pan', 'churros'];
const goods: Record<Item, { name: string; icon: string; color: string; price: number; pos: V3 }> = {
  baleada: {
    name: 'Baleada',
    icon: '🫓',
    color: '#f4cd86',
    price: 22,
    pos: [-5, 0, 1],
  },
  fresco: {
    name: 'Horchata',
    icon: '🥤',
    color: '#f5e4c4',
    price: 16,
    pos: [5, 0, -1],
  },
  pan: {
    name: 'Pan de coco',
    icon: '🍞',
    color: '#d98e47',
    price: 18,
    pos: [-5, 0, -2],
  },
  churros: {
    name: 'Churros',
    icon: '🍟',
    color: '#ed7855',
    price: 14,
    pos: [5, 0, 3],
  },
};
interface Customer {
  id: number;
  slot: number;
  item: Item;
  patience: number;
  max: number;
  stage: 'enter' | 'wait' | 'leave';
  x: number;
  z: number;
  state: AvatarState;
  happy: boolean;
}
const products: Piece[] = Array.from({ length: 36 }, (_, i) => ({
  p: [-6 + (i % 6) * 0.38, 1.5 + Math.floor(i / 12) * 0.5, -3.3 + (Math.floor(i / 6) % 2) * 0.5],
  s: [0.26, 0.36, 0.24],
  c: ['#e25548', '#ffd756', '#38bba3', '#6765b0'][i % 4],
}));
function Food({ item, pos = [0, 0, 0] }: { item: Item; pos?: V3 }) {
  return (
    <group position={pos}>
      {item === 'fresco' ? (
        <Cyl pos={[0, 0.15, 0]} r={0.15} h={0.35} color={goods[item].color} mat="glass" solid={false} />
      ) : item === 'baleada' ? (
        <Cyl pos={[0, 0, 0]} r={0.32} h={0.1} color={goods[item].color} mat="sand" solid={false} />
      ) : (
        <Block pos={[0, 0.1, 0]} size={[0.4, 0.25, 0.3]} mat="wood" color={goods[item].color} solid={false} />
      )}
    </group>
  );
}
export function Pulperia() {
  const avatar = useGame((s) => s.profile.avatar);
  const { dif } = useMemo(partida, []);
  const [, draw] = useState(0);
  const carried = useRef<Group>(null);
  const s = useRef({
    time: Number(rulesOf('pulperia').duration),
    elapsed: 0,
    money: 0,
    combo: 0,
    held: null as Item | null,
    cook: 0,
    customers: [] as Customer[],
    arrival: 0,
    next: 0,
    blackout: false,
    event: false,
    refresh: 0,
    served: 0,
    wrong: 0,
    lost: 0,
  }).current;
  function pickup(item: Item) {
    if (useGame.getState().mg?.phase !== 'playing') return;
    if (s.held) {
      useGame.getState().toast('Llevás algo · entregalo o usá el basurero', '🧺');
      return;
    }
    if (item === 'fresco' && s.blackout) {
      audio.sfx('error');
      useGame.getState().toast('¡Sin luz! El refri vuelve pronto', '💡');
      return;
    }
    s.held = item;
    audio.sfx('pickup');
  }
  function deliver(slot: number) {
    if (useGame.getState().mg?.phase !== 'playing') return;
    const c = s.customers.find((c) => c.slot === slot && c.stage === 'wait');
    if (!c || !s.held) return;
    if (c.item !== s.held) {
      s.money = Math.max(0, s.money - 3);
      s.combo = 0;
      s.wrong++;
      audio.sfx('error');
      useGame.getState().toast(`Pidió ${goods[c.item].name} · llevás ${goods[s.held].name}`, '❌');
      return;
    }
    s.combo++;
    const pay = goods[c.item].price + Math.round((8 * c.patience) / c.max) + Math.min(6, s.combo - 1);
    s.money += pay;
    s.held = null;
    c.stage = 'leave';
    c.happy = true;
    c.state.anim = 'walk';
    s.served++;
    audio.sfx('coin');
    useGame.getState().toast(`¡Gracias! +L. ${pay}`, '💰');
  }
  useEffect(() => {
    phys.limit = { minX: -6.6, maxX: 6.6, minZ: -3, maxZ: 5 };
    player.fixedCam = { pos: [0, 15, 10.5], target: [0, 0, -0.2], fov: 53 };
    player.camYaw = 0;
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    w.__mcTest = {
      ...w.__mcTest,
      pulperia: {
        state: () => ({
          time: s.time,
          money: s.money,
          held: s.held,
          cook: s.cook,
          combo: s.combo,
          served: s.served,
          wrong: s.wrong,
          lost: s.lost,
          blackout: s.blackout,
          customers: s.customers.map((c) => ({
            slot: c.slot,
            item: c.item,
            stage: c.stage,
            patience: c.patience,
          })),
        }),
        stations: goods,
        ...(location.hash.includes('test')
          ? {
              skip: (seconds: number) => {
                s.time = Math.max(0, s.time - seconds);
                s.elapsed += seconds;
              },
              age: () => {
                for (const c of s.customers) {
                  if (c.stage === 'wait') c.patience = 0.05;
                }
              },
            }
          : {}),
      },
    };
    return () => {
      player.fixedCam = null;
      player.override = null;
      if (w.__mcTest) delete w.__mcTest.pulperia;
    };
  }, [s]);
  useMgTick((dt) => {
    s.time -= dt;
    s.elapsed += dt;
    s.arrival -= dt;
    s.refresh += dt;
    s.blackout = s.elapsed >= 40 && s.elapsed < 47;
    if (s.blackout && !s.event) {
      s.event = true;
      useGame.getState().toast('¡Se fue la luz! 7 segundos sin refri', '💡');
      audio.sfx('error');
    }
    if (s.arrival <= 0 && s.customers.filter((c) => c.stage !== 'leave').length < 3) {
      const slot = [0, 1, 2].find((i) => !s.customers.some((c) => c.slot === i && c.stage !== 'leave')) ?? 0;
      const max = (25 - s.elapsed / 15) * (1.15 - 0.3 * dif); // paciencia: más en la etapa 1, menos en la última
      s.customers.push({
        id: s.next,
        slot,
        item: menu[s.next % 4],
        patience: max,
        max,
        stage: 'enter',
        x: 7,
        z: -5,
        state: { anim: 'walk', speed: 3 },
        happy: false,
      });
      s.next++;
      s.arrival = (s.elapsed < 35 ? 7 : s.elapsed < 65 ? 5.5 : 4.5) * (1.1 - 0.2 * dif);
    }
    for (const c of s.customers) {
      const target = -3 + c.slot * 3;
      if (c.stage === 'enter') {
        c.x = Math.max(target, c.x - dt * 4);
        if (c.x === target) {
          c.stage = 'wait';
          c.state.anim = 'idle';
          c.state.speed = 0;
        }
      } else if (c.stage === 'wait') {
        c.patience -= dt;
        if (c.patience <= 0) {
          c.stage = 'leave';
          c.state.anim = 'walk';
          c.state.speed = 3;
          s.combo = 0;
          s.lost++;
          audio.sfx('error');
          useGame.getState().toast('Un cliente se fue · ¡apurate, vos!', '😠');
        }
      } else c.x -= dt * 4;
    }
    s.customers = s.customers.filter((c) => c.x > -10);
    if (!s.held && player.distTo(-5, 1) < 1.3) {
      s.cook += dt;
      if (s.cook >= 1.5) {
        pickup('baleada');
        s.cook = 0;
      }
    } else s.cook = 0;
    if (s.held) {
      player.play('carry', 0.2);
      if (carried.current) {
        carried.current.position.set(player.pos[0], player.pos[1] + 1.5, player.pos[2] - 0.35);
      }
    }
    const first = s.customers.find((c) => c.stage === 'wait');
    setHud({
      timer: Math.ceil(Math.max(0, s.time)),
      score: `L. ${s.money}`,
      objective: first
        ? `Puesto ${first.slot + 1}: ${goods[first.item].icon} ${goods[first.item].name}`
        : '¡Ya vienen los clientes!',
      lines: [
        `Llevás: ${s.held ? goods[s.held].name : 'manos libres'}`,
        `Combo x${s.combo}${s.blackout ? ' · ¡SIN LUZ!' : ''}`,
        s.cook > 0 ? `Comal: ${Math.round((s.cook / 1.5) * 100)}%` : 'E: agarrar / entregar · comal: esperá 1.5 s',
      ],
    });
    if (s.time <= 0) {
      const r = rulesOf('pulperia');
      finish({
        won: s.money >= r.bronze,
        stars: starsFor(s.money, r.bronze, r.silver, r.gold),
        score: s.money,
        label: `L. ${s.money}`,
      });
    }
    if (s.refresh > 0.08) {
      s.refresh = 0;
      draw((n) => n + 1);
    }
  });
  return (
    <>
      <art.SkyRig indoor />
      <Spawn pos={[0, 0, 3]} />
      <Ground size={[16, 15]} mat="tile" color={s.blackout ? '#586070' : '#d6d1b3'} />
      <Block pos={[0, 2, -7]} size={[16, 4, 0.3]} mat="stucco" color="#3b9b91" />
      <Block pos={[-7.5, 1, 0]} size={[0.3, 2, 14]} mat="brick" color="#e9bb88" />
      <Block pos={[7.5, 1, 0]} size={[0.3, 2, 14]} mat="brick" color="#e9bb88" />
      <Label pos={[-5.5, 3.5, -6.7]} text="Pulpería Doña Toña" h={0.6} />
      <Label pos={[-5.5, 2.8, -6.7]} text="Hoy no se fía, mañana sí" h={0.4} />
      <Block pos={[0, 0.7, -3.7]} size={[11, 1.4, 0.65]} mat="wood" color="#bd6c3f" />
      {[-5.4, -4.2, -1.5, 1.5, 4.2, 5.4].map((x) => (
        <Cyl key={x} pos={[x, 2.1, -3.7]} r={0.035} h={1.3} mat="metal" color="#444e59" solid={false} />
      ))}
      {menu.map((item) => {
        const g = goods[item];
        return (
          <group key={item}>
            <Block
              pos={[g.pos[0], 0.65, g.pos[2] - 0.7]}
              size={[2, 1.3, 1]}
              mat={item === 'fresco' ? 'metal' : 'wood'}
              color={item === 'fresco' ? '#c6e9eb' : '#c88b4f'}
            />
            <Cyl pos={g.pos} r={0.8} h={0.035} mat="neon" color={g.color} solid={false} />
            <Label pos={[g.pos[0], 1.8, g.pos[2] - 0.1]} text={`${g.icon} ${g.name}`} h={0.5} />
            <Food item={item} pos={[g.pos[0], 1.4, g.pos[2] - 0.7]} />
            {item === 'baleada' ? (
              <>
                <Cyl pos={[-5, 1.34, 0.3]} r={0.65} h={0.08} mat="metal" color="#343c40" solid={false} />
                <Ball pos={[-5, 0.7, 0.3]} r={0.2} mat="neon" color="#ff761d" />
                {s.cook > 0 && <Label pos={[-5, 1.8, 1]} text={`${Math.round((s.cook / 1.5) * 100)}%`} h={0.4} />}
              </>
            ) : (
              <Interactable
                pos={g.pos}
                radius={1.35}
                label={`Agarrar ${g.name}`}
                onUse={() => pickup(item)}
                marker={false}
              />
            )}
          </group>
        );
      })}
      <Block pos={[5, 1.9, -2.1]} size={[1.9, 1.8, 0.2]} mat="metal" color="#c6e9eb" solid={false} />
      <Block
        pos={[5, 1.9, -1.94]}
        size={[1.55, 1.35, 0.08]}
        mat="glass"
        color={s.blackout ? '#34454b' : '#66b6c9'}
        solid={false}
      />
      <Label pos={[5, 2.95, -2.1]} text={s.blackout ? 'SIN LUZ' : 'Refri · bien helado'} h={0.3} />
      <Boxes mat="plastic" items={products} />
      <Block pos={[-5.5, 1, -3.1]} size={[2.5, 0.12, 1.5]} mat="wood" color="#88522f" solid={false} />
      {[0, 1, 2].map((slot) => (
        <group key={slot}>
          <Label
            pos={[-3 + slot * 3, 0.18, -2.4]}
            text={`${slot + 1} · ${
              s.customers.find((c) => c.slot === slot && c.stage === 'wait')
                ? goods[s.customers.find((c) => c.slot === slot && c.stage === 'wait')!.item].name
                : 'Entrega'
            }`}
            h={0.48}
            fg="#ffd94b"
          />
          {s.customers
            .filter((c) => c.slot === slot && c.stage === 'wait')
            .map((c) => (
              <Block
                key={c.id}
                pos={[-3 + slot * 3, 0.25, -2]}
                size={[(1.6 * c.patience) / c.max, 0.05, 0.12]}
                mat="neon"
                color={c.patience < 7 ? '#ef5650' : '#75e2a1'}
                solid={false}
              />
            ))}
          <Interactable
            pos={[-3 + slot * 3, 0, -2.2]}
            radius={1.3}
            label={`Entregar · puesto ${slot + 1}`}
            onUse={() => deliver(slot)}
            marker={false}
          />
        </group>
      ))}
      {s.customers.map((c) => (
        <group key={c.id} position={[c.x, 0, c.z]} rotation-y={Math.PI}>
          <art.Avatar
            config={{
              ...avatar,
              shirtColor: ['#ee7355', '#6c87d7', '#eacb59'][c.slot],
            }}
            state={c.state}
          />
          <Label
            pos={[0, 1.85, 0]}
            text={
              c.stage === 'leave'
                ? c.happy
                  ? '¡Gracias!'
                  : '¡Qué tardado!'
                : `${c.slot + 1} · ${goods[c.item].icon} ${goods[c.item].name}`
            }
            h={0.5}
          />
          {c.stage !== 'leave' && (
            <>
              <Block pos={[0, 1.5, 0]} size={[1.6, 0.12, 0.06]} mat="metal" color="#444f58" solid={false} />
              <Block
                pos={[-0.8 + (0.8 * c.patience) / c.max, 1.5, 0.05]}
                size={[Math.max(0.01, (1.6 * c.patience) / c.max), 0.14, 0.07]}
                mat="neon"
                color={c.patience < 7 ? '#ef5650' : '#75e2a1'}
                solid={false}
              />
            </>
          )}
        </group>
      ))}
      <Label pos={[-5, 0.35, 1.5]} text="Esperá aquí · 1.5 s" h={0.32} />
      <Cyl pos={[2, 0.5, 4.5]} r={0.45} h={1} mat="metal" color="#57696a" />
      <Label pos={[2, 1.5, 4.5]} text="Basurero" h={0.35} />
      <Interactable
        pos={[2, 0, 3.7]}
        radius={1.1}
        label="Botar lo que llevás"
        onUse={() => {
          s.held = null;
          audio.sfx('click');
        }}
      />
      <group ref={carried} visible={!!s.held}>
        {s.held && <Food item={s.held} />}
      </group>
    </>
  );
}
