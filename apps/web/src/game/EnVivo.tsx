// Jugadores en vivo (MC-19, MC-21): conecta la sala de la zona donde anda el jugador, le manda su posición y dibuja
// a los demás suavizados, con su nombre y sus emotes. Sin salas en vivo (`net.online` false) no hace nada.
// Cada remoto es un `art.Avatar` (una sola malla con esqueleto) más un rótulo: con 24 por sala son ~70 llamadas.
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { type Muestra, muestraEn, net, RETRASO_MS, type RemotePlayer, useSala, zonaDeEscena } from '../core/net';
import { phys } from '../core/phys';
import { player } from '../core/player';
import { useGame } from '../core/store';
import type { AvatarState } from '../core/types';
import { EMOTE_ICON } from '../ui/lib';
import { art, Label } from './kit';

const EMOTE_MS = 4200;

/** MC-23: dónde va un bot de relleno: recorre su circuito (relativo al punto de aparición) con la hora del reloj. */
function puntoDeBot(b: NonNullable<RemotePlayer['bot']>, out: Muestra) {
  const pts = b.ruta,
    tramos = pts.map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      return Math.hypot(q[0] - p[0], q[1] - p[1]);
    }),
    largo = tramos.reduce((a, c) => a + c, 0) || 1;
  let d = ((Date.now() / 1000 + b.fase) * b.vel) % largo;
  for (let i = 0; i < pts.length; i++) {
    if (d > tramos[i]) {
      d -= tramos[i];
      continue;
    }
    const p = pts[i],
      q = pts[(i + 1) % pts.length],
      k = tramos[i] ? d / tramos[i] : 0;
    out.x = player.spawn[0] + p[0] + (q[0] - p[0]) * k;
    out.z = player.spawn[2] + p[1] + (q[1] - p[1]) * k;
    out.y = phys.ground(out.x, out.z);
    // yaw = 0 mira a −Z
    out.yaw = Math.atan2(-(q[0] - p[0]), -(q[1] - p[1]));
    break;
  }
  return out;
}

function Remoto({ r }: { r: RemotePlayer }) {
  const g = useRef<THREE.Group>(null);
  const state = useMemo<AvatarState>(() => ({ anim: 'idle', speed: 0 }), []);
  const s = useMemo(() => ({ m: { t: 0, x: 0, y: 0, z: 0, yaw: 0 } as Muestra, px: 0, pz: 0, v: 0 }), []);
  const [burbuja, setBurbuja] = useState('');
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = net.on('emote', (p, id) => {
      if (p.id !== r.id || !id) return;
      setBurbuja(EMOTE_ICON[id] ?? '💃');
      clearTimeout(timer);
      timer = setTimeout(() => setBurbuja(''), EMOTE_MS);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, [r]);
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    o.visible = r.listo;
    const m = r.bot ? puntoDeBot(r.bot, s.m) : muestraEn(r.muestras, performance.now() - RETRASO_MS, s.m);
    const v = dt > 0 ? Math.hypot(m.x - s.px, m.z - s.pz) / dt : 0;
    s.v += (v - s.v) * Math.min(1, dt * 10);
    s.px = m.x;
    s.pz = m.z;
    o.position.set(m.x, m.y, m.z);
    o.rotation.y = m.yaw + Math.PI;
    state.anim = r.anim;
    state.speed = s.v;
  });
  return (
    <group ref={g} name="remoto" userData={{ id: r.id, bot: !!r.bot }} visible={false}>
      <art.Avatar config={r.avatar} state={state} />
      <Label pos={[0, 2.2, 0]} text={r.name} h={0.32} bg={r.bot ? 'rgba(84,88,110,0.9)' : 'rgba(23,120,90,0.88)'} />
      {burbuja && <Label pos={[0, 2.68, 0]} text={burbuja} h={0.5} bg="rgba(255,255,255,0.92)" />}
    </group>
  );
}

/** Lo que va dentro del lienzo: conexión por zona, envío de la posición y los avatares de los demás. */
export function EnVivo() {
  const scene = useGame((s) => s.scene),
    screen = useGame((s) => s.screen),
    solo = useGame((s) => s.profile.room.mode === 'solo'),
    nombre = useGame((s) => s.profile.name);
  const zona = screen === 'world' && !solo ? zonaDeEscena(scene) : null;
  const [lista, setLista] = useState<RemotePlayer[]>([]);
  useEffect(() => {
    if (!net.online) return;
    (window as unknown as { __mc: Record<string, unknown> }).__mc.net = net;
    (window as unknown as { __mc: Record<string, unknown> }).__mc.sala = useSala;
    const poner = () => setLista(net.players());
    const offs = [net.on('join', poner), net.on('leave', poner)];
    poner();
    return () => {
      for (const f of offs) f();
    };
  }, []);
  useEffect(() => {
    if (net.online && 'nombre' in net) (net as { nombre: () => string }).nombre = () => nombre;
  }, [nombre]);
  useEffect(() => {
    net.setZone(zona);
  }, [zona]);
  useFrame(() => {
    if (zona) net.sendState(player.pos, player.yaw, player.state.anim);
  });
  if (!net.online || !zona) return null;
  return (
    <group name="en-vivo">
      {lista.map((r) => (
        <Remoto key={r.id} r={r} />
      ))}
    </group>
  );
}
