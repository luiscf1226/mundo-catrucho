import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { BOT_NAMES, SHOP } from '../../core/data';
import { type Interaction, interactions } from '../../core/interact';
import { net, useSala } from '../../core/net';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import type { AvatarConfig, AvatarState, V3 } from '../../core/types';
import { art, Interactable, Label, P, useTick } from '../kit';
import { rng } from './terrain';
export const social = { danceUntil: 0 };
const phrases = ['¡Buenas!', '¿Todo cheque?', '¡Vamos a la potra!', '¡Qué macizo!'];
const points: V3[] = [
  [-21, 0, 17],
  [20, 0, 17],
  [24, 0, -4],
  [17, 0, -27],
  [-22, 0, -5],
  [-22, 0, -26],
  [13, 0, -7],
  [24, 0, -20],
];
function Bot({ i }: { i: number }) {
  const ref = useRef<THREE.Group>(null),
    [bubble, setBubble] = useState('');
  const b = useMemo(() => {
    const r = rng(i * 71 + 9),
      pick = (cat: string) => {
        const items = SHOP.items.filter((x) => x.cat === cat);
        return items[Math.floor(r() * items.length)].id;
      };
    const state: AvatarState = { anim: 'idle', speed: 0 };
    const config: AvatarConfig = {
      ...SHOP.defaultAvatar,
      skin: SHOP.skin[Math.floor(r() * SHOP.skin.length)],
      hair: pick('cabello'),
      face: pick('rostro'),
      shirt: pick('camisa'),
      pants: pick('pantalon'),
      hat: pick('sombrero'),
      shirtColor: SHOP.palette[Math.floor(r() * SHOP.palette.length)],
      pantsColor: SHOP.palette[Math.floor(r() * SHOP.palette.length)],
    };
    return { pos: [...points[i]] as V3, target: (i + 1) % points.length, timer: i, hello: 0, state, config, r };
  }, [i]);
  useEffect(() => {
    ref.current?.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = false;
    });
    const interaction: Interaction = {
      x: b.pos[0],
      y: 0,
      z: b.pos[2],
      radius: 1.5,
      label: `Saludar a ${BOT_NAMES[i]}`,
      onUse: () => {
        b.hello = performance.now() + 3400;
        setBubble(phrases[i % phrases.length]);
        player.play('wave', 2);
      },
    };
    interactions.add(interaction);
    bInteraction.current = interaction;
    return () => {
      interactions.delete(interaction);
    };
  }, [b, i]);
  const bInteraction = useRef<Interaction | null>(null);
  useTick((dt, t) => {
    const g = ref.current;
    if (!g) return;
    if (performance.now() < b.hello) {
      b.state.anim = 'wave';
      g.rotation.y = Math.atan2(player.pos[0] - b.pos[0], player.pos[2] - b.pos[2]);
    } else if (performance.now() < social.danceUntil && Math.hypot(b.pos[0] - 22, b.pos[2] + 22) < 22) {
      b.state.anim = 'dance';
    } else {
      if (bubble) setBubble('');
      b.timer -= dt;
      if (b.timer > 0) {
        b.state.anim = Math.sin(t + i) > 0.8 ? 'wave' : 'idle';
        b.state.speed = 0;
      } else {
        const p = points[b.target],
          dx = p[0] - b.pos[0],
          dz = p[2] - b.pos[2],
          d = Math.hypot(dx, dz);
        if (d < 0.4) {
          b.target = (b.target + 1) % points.length;
          b.timer = 3 + b.r() * 5;
        } else {
          b.pos[0] += (dx / d) * dt * 1.3;
          b.pos[2] += (dz / d) * dt * 1.3;
          b.state.anim = 'walk';
          b.state.speed = 1.3;
          g.rotation.y = Math.atan2(dx, dz);
        }
      }
    }
    g.position.set(...b.pos);
    if (bInteraction.current) {
      bInteraction.current.x = b.pos[0];
      bInteraction.current.z = b.pos[2];
    }
  });
  return (
    <group ref={ref} name="lobby-bot">
      <art.Avatar config={b.config} state={b.state} name={BOT_NAMES[i]} />
      {bubble && <Label pos={[0, 3.1, 0]} text={bubble} h={0.38} />}
    </group>
  );
}
export function Social() {
  const mode = useGame((s) => s.profile.room.mode),
    enSala = useSala((s) => s.estado === 'en-sala'),
    // en una sala en vivo la plaza la llenan los demás jugadores; los bots quedan para cuando no hay conexión
    count = mode === 'solo' || enSala ? 0 : mode === 'privada' ? 2 : 8;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Bot key={i} i={i} />
      ))}
      <group position={[-7, 0, 20]}>
        <art.Avatar
          config={{ ...SHOP.defaultAvatar, hat: 'sombrero_junco', shirt: 'guayabera' }}
          state={{ anim: 'wave', speed: 0 }}
          name="Don Chepe"
        />
      </group>
      <Interactable
        pos={[-7, 0, 22]}
        radius={1.6}
        label="Hablar con Don Chepe"
        onUse={() =>
          useGame.getState().showDialog({
            title: '¡Bienvenido, cipote!',
            text: 'WASD: caminar · Espacio: saltar · E: usar · Arrastrá para mirar. Pisá el mapa para viajar. Los arcos llevan a los juegos. ¡Subí al Picacho por Lempiritas!',
            icon: '🇭🇳',
          })
        }
      />
      <Interactable
        pos={[22, 0.3, -22]}
        radius={2}
        label="Bailar punta"
        onUse={() => {
          player.emote = { anim: 'dance', until: performance.now() + 10000 };
          social.danceUntil = performance.now() + 10000;
          if (useGame.getState().useEmote('emote_punta')) net.sendEmote('emote_punta');
        }}
      />
      {[-1, 1].map((s) => (
        <group key={s}>
          <P.Bench pos={[s * 23, 0, 3]} rot={(s * Math.PI) / 2} />
          <Interactable
            pos={[s * 21.4, 0, 3]}
            radius={1.3}
            label={s < 0 ? 'Sentarse al oeste' : 'Sentarse al este'}
            onUse={() => {
              player.teleport(s * 23, 0.65, 3, (s * Math.PI) / 2);
              player.play('sit', 8);
            }}
          />
        </group>
      ))}
    </>
  );
}
