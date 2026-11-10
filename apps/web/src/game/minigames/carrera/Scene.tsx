import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { art, Block, Cyl, Ground, Label, Plate, P, Spawn, CoinPickup, Wall, boxCol, moveBox, useCollider, useMgTick } from '../../kit';
import { finish, fmtTime, rulesOf, setHud, starsFor } from '../api';
import { player } from '../../../core/player';
import { phys } from '../../../core/phys';
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { BOT_NAMES, SHOP } from '../../../core/data';
import type { AvatarState, V3 } from '../../../core/types';

const CPS: V3[] = [[0, 0, -48], [0, 0, -88], [0, 0, -124], [0, 6, -170]];
const META: V3 = [0, 6, -236];
const gap = (z: number) => (z < -58 && z > -60) || (z < -95 && z > -119) || (z < -184 && z > -186) || (z < -201 && z > -203);
const height = (z: number) => z > -134 ? 0 : z > -164 ? Math.min(6, Math.ceil((-z - 134) / 1.5) * 0.3) : 6;
function Section({ z, children }: { z: number; children: ReactNode }) {
  const g = useRef<Group>(null);
  useMgTick(() => { if (g.current) g.current.visible = Math.abs(player.pos[2] - z) < 65; });
  return <group ref={g} visible={z > -60}>{children}</group>;
}
function Ferry({ z, bus = false, phase }: { z: number; bus?: boolean; phase: number }) {
  const g = useRef<Group>(null), c = useCollider(() => boxCol([0, -0.3, z], [bus ? 5.8 : 6.8, 0.6, 5.3]));
  useMgTick((dt, t) => { const x = Math.sin(t * 0.65 + phase) * 1.1; moveBox(c, [x, -0.3, z], [bus ? 5.8 : 6.8, 0.6, 5.3], dt); if (g.current) g.current.position.x = x; });
  return <group ref={g}>{bus ? <><P.Bus pos={[0, -2.8, z]} rot={Math.PI / 2} solid={false} /><Block pos={[0, -0.13, z]} size={[5.8, 0.26, 5.3]} mat="roof" color="#f5b631" solid={false} /></> : <Block pos={[0, -0.3, z]} size={[6.8, 0.6, 5.3]} mat="wood" color="#c58b49" solid={false} />}</group>;
}
function Hazard({ z, tire = false }: { z: number; tire?: boolean }) {
  const g = useRef<Group>(null), cooldown = useRef(0);
  useMgTick((dt, t) => { cooldown.current -= dt; const x = tire ? Math.sin(z) * 2.8 : Math.sin(t * 1.15 + z) * 4.8; const zz = tire ? z + ((t * 4) % 14) : z; const y = height(zz);
    if (g.current) { g.current.position.set(x, y, zz); if (tire) g.current.rotation.x = t * 5; }
    if (cooldown.current <= 0 && Math.hypot(player.pos[0] - x, player.pos[2] - zz) < (tire ? 1 : 1.7) && player.pos[1] < y + 1.2) { cooldown.current = 1.5; player.body.vel[2] = 7; player.body.vel[1] = 4; useGame.getState().toast(tire ? '¡Ojo con la llanta!' : '¡Cuidado, mototaxi!', '⚠️'); }
  });
  return <group ref={g}>{tire ? <P.Tire pos={[0, 0.4, 0]} solid={false} /> : <P.Mototaxi pos={[0, 0, 0]} rot={Math.PI / 2} solid={false} />}</group>;
}
function Barrier() {
  const g = useRef<Group>(null), cd = useRef(0);
  useMgTick((dt, t) => { cd.current -= dt; const x = Math.sin(t * 1.4) * 3; if (g.current) g.current.position.x = x;
    if (cd.current < 0 && Math.abs(player.pos[2] + 40) < 0.8 && Math.abs(player.pos[0] - x) < 1.5 && player.pos[1] < 0.9) { player.body.vel[2] = 6; cd.current = 1; }
  });
  return <group ref={g}><Block pos={[0, 0.65, -40]} size={[2.6, 0.3, 0.25]} color="#ffb52e" mat="wood" solid={false} /><Label pos={[0, 2, -40]} text="¡Salta!" h={0.5} /></group>;
}
export function CarreraScene() {
  const rules = rulesOf('carrera');
  const race = useRef({ countdown: 3, elapsed: 0, checkpoint: -1, coins: 0, falls: 0, done: false, boost: 0 });
  const rivals = useMemo(() => [0, 1, 2].map(i => ({ z: 2 + i, state: { anim: 'run', speed: 4.3 } as AvatarState })), []);
  const bots = useRef<(Group | null)[]>([]);
  useLayoutEffect(() => {
    player.control = false; player.camPitch = 0.48; player.camDist = 10;
    phys.limit = { minX: -5.5, maxX: 5.5, minZ: -244, maxZ: 8 }; phys.killY = -12;
    phys.ground = (x, z) => Math.abs(x) > 5.2 || gap(z) ? -30 : height(z);
    if (location.hash.includes('test')) {
      const w = window as typeof window & { __mcTest?: Record<string, unknown> };
      w.__mcTest = { ...w.__mcTest, carrera: { checkpoints: CPS, meta: META, race: race.current, addTime: (n: number) => { race.current.elapsed += n; } } };
    }
  }, []);
  useMgTick(dt => {
    const r = race.current; if (r.done) return;
    if (r.countdown > 0) { r.countdown -= dt; player.control = false; setHud({ timer: 0, objective: r.countdown > 0 ? `¡${Math.ceil(r.countdown)}!` : '¡YA!', lines: ['Prepárate · W / palanca: correr · Espacio: saltar'] }); return; }
    player.control = true; r.elapsed += dt;
    const p = player.pos;
    if (p[1] < -5 || Math.abs(p[0]) > 5.15) { r.elapsed += 3; r.falls++; player.respawn(); useGame.getState().toast('Volvés al checkpoint · +3 s', '🏁'); }
    for (let i = 0; i < CPS.length; i++) { const cp = CPS[i]; if (i === r.checkpoint + 1 && Math.abs(p[2] - cp[2]) < 3 && Math.abs(p[1] - cp[1]) < 2) { r.checkpoint = i; const oldPos: V3 = [...player.pos], oldVel: V3 = [...player.body.vel]; player.setSpawn(cp); player.teleport(...oldPos); player.body.vel = oldVel; useGame.getState().toast(`¡Checkpoint ${i + 1}/4!`, '🏁'); } }
    if (Math.abs(p[2] + 82) < 2 || Math.abs(p[2] + 219) < 2) r.boost = 1.3;
    r.boost = Math.max(0, r.boost - dt);
    const oil = Math.abs(p[2] + 32) < 2.3 && p[0] > 0.8 && p[1] < 0.2;
    player.speedMul = oil ? 0.42 : r.boost > 0 ? 1.3 : input.run ? 1 : 0.5;
    rivals.forEach((b, i) => { const target = Math.max(0.75, Math.min(1.3, 1 + (b.z - p[2]) * 0.007)); b.z = Math.max(-239, b.z - dt * (3.7 + i * 0.38) * target); const g = bots.current[i]; if (g) { g.position.set(Math.sin(-b.z * 0.16 + i * 2) * 2.6, height(b.z) + (gap(b.z) ? Math.abs(Math.sin(b.z)) : 0), b.z); g.rotation.y = Math.PI; b.state.anim = gap(b.z) ? 'jump' : 'run'; } });
    const rank = 1 + rivals.filter(b => b.z < p[2]).length;
    setHud({ timer: r.elapsed, objective: `Posición ${rank}/4 · ${r.checkpoint + 1}/4 checkpoints`, lines: [`🪙 ${r.coins} · ${Math.max(0, Math.round(236 + p[2]))} m para META`, input.touch ? 'Palanca: correr · Salto: brincar' : 'WASD: correr · Espacio: saltar · Shift: ¡dale!'] });
    const won = p[2] <= META[2] && r.checkpoint === 3 && p[1] > 4;
    if (won || r.elapsed >= rules.timeLimit) { r.done = true; player.control = false; player.speedMul = 1; if (won) player.play('celebrate', 4); finish({ won, stars: won ? starsFor(r.elapsed, rules.bronze, rules.silver, rules.gold, true) : 0, score: won ? Math.max(0, Math.round((rules.timeLimit - r.elapsed) * 10)) : 0, label: won ? fmtTime(r.elapsed) : 'Se acabó el tiempo' }); }
  }, -11);
  return <>
    <art.SkyRig time="dia" fogFar={95} shadowRadius={35} /><Spawn pos={[0, 0, 4]} />
    <Ground size={[100, 300]} pos={[0, 0, -120]} y={-5} mat="grass" color="#83a45b" />
    <Wall pos={[-6.2, 8, -118]} size={[1, 30, 252]} /><Wall pos={[6.2, 8, -118]} size={[1, 30, 252]} />
    {[[8, -58], [-60, -95], [-119, -134], [-164, -184], [-186, -201], [-203, -244]].map(([a, b], i) => <Block key={i} pos={[0, height(a - 0.1) - 0.3, (a + b) / 2]} size={[10.4, 0.6, a - b]} mat={i < 3 ? 'cobble' : 'roof'} color={i < 3 ? '#b6a48c' : '#cd784d'} />)}
    {Array.from({ length: 20 }, (_, i) => <Block key={i} pos={[0, (i + 1) * 0.3 - 0.3, -134.75 - i * 1.5]} size={[10.4, 0.6, 1.5]} color={i % 2 ? '#d3b78b' : '#b49d7b'} mat="stone" solid={false} />)}
    {[-1, 1].map(s => <Block key={s} pos={[s * 5.35, 0.15, -43]} size={[0.25, 0.3, 96]} color="#00b9ed" mat="plastic" />)}
    <Section z={-20}><P.PortalArch pos={[0, 0, 1]} label="CARRERA CATRUCHA" /><Label pos={[0, 4, -8]} text="TEGUS · ¡Seguí las monedas!" h={0.7} />
      {[14, 21, 28].map((d, i) => <group key={d}><P.Cone pos={[i % 2 ? -1.6 : 1.6, 0, -d]} /><P.Barrel pos={[i % 2 ? 2.8 : -2.8, 0, -d - 2]} /></group>)}
      <Cyl pos={[2.8, 0.02, -32]} r={2} h={0.03} mat="asphalt" color="#292a35" solid={false} /><Label pos={[3, 1, -32]} text="¡Aceite!" h={0.45} /><Barrier /><Hazard z={-35} />
      <P.House pos={[-11, 0, -20]} w={7} d={14} floors={2} color="#f5b847" /><P.House pos={[11, 0, -32]} w={7} d={14} color="#46b9bd" />
    </Section>
    <Section z={-75}><Label pos={[0, 2.8, -54]} text="BACHES · ¡Brincá!" /><Ground size={[10.4, 2]} pos={[0, 0, -59]} y={-3} color="#151b25" mat="asphalt" />
      <Cyl pos={[-2.5, 0.015, -66]} r={1.35} h={0.03} mat="asphalt" color="#292b31" solid={false} />
      <P.Stall pos={[-7, 0, -73]} sign="Baleadas" /><P.Stall pos={[7, 0, -79]} sign="Mercadito" />
      {[-72, -78].map(z => <Block key={z} pos={[z === -72 ? -1.8 : 1.8, 0.4, z]} size={[4, 0.8, 1.2]} color="#b68a54" mat="wood" />)}
      <Block pos={[0, 0.04, -82]} size={[4, 0.08, 3]} color="#48de8c" mat="neon" solid={false} /><Label pos={[0, 1, -82]} text="¡DALE!" h={0.5} />
    </Section>
    <Section z={-107}><Ground size={[45, 24]} pos={[0, 0, -107]} y={-2.5} mat="water" color="#288dba" /><Label pos={[-3, 2, -92]} text="¡A los rapiditos!" h={0.5} />{[-97, -103.5, -110, -116.5].map((z, i) => <Ferry key={z} z={z} bus={i % 2 === 0} phase={i} />)}</Section>
    <Section z={-148}><Label pos={[-3, 2.2, -130]} text="¡Ojo con las llantas!" h={0.5} /><Hazard z={-160} tire /><Hazard z={-149} tire /><Block pos={[-10, -1, -146]} size={[7, 6, 8]} mat="stone" color="#9b8d78" /><Block pos={[10, 0, -160]} size={[7, 10, 8]} mat="stone" color="#9b8d78" /><P.House pos={[-10, 2, -146]} color="#f17b73" floors={2} /><P.House pos={[10, 5, -160]} color="#69beb0" /></Section>
    <Section z={-205}>{[[-164, -184], [-186, -201], [-203, -244]].map(([a, b]) => <Block key={a} pos={[0, 0.2, (a + b) / 2]} size={[10.4, 10.8, a - b]} color="#e7bb82" mat="stucco" />)}<Label pos={[-3, 8, -176]} text="¡Dos saltos y META!" h={0.5} /><Block pos={[0, 6.04, -219]} size={[4, 0.08, 3]} color="#48de8c" mat="neon" solid={false} /><Label pos={[0, 7, -219]} text="¡DALE!" h={0.5} /><P.PortalArch pos={META} label="¡META!" /><P.Flag pos={[4.5, 6, -238]} height={6} /><P.House pos={[-10, 0, -210]} floors={2} color="#f1cc73" /></Section>
    {[-130, -172, -194, -213, -230].map(z => <group key={z}>{[-1, 1].map(x => <Block key={x} pos={[x * 5, height(z) + 0.12, z]} size={[0.24, 0.24, 8]} color="#00b9ed" mat="plastic" solid={false} />)}<Label pos={[3.7, height(z) + 0.5, z]} text="↑ META" h={0.4} /></group>)}
    {CPS.map((p, i) => <group key={i}><Block pos={[0, p[1] + 0.04, p[2]]} size={[10, 0.08, 1]} color="#36c2df" mat="neon" solid={false} /><Label pos={[-3.6, p[1] + 2.6, p[2]]} text={`🏁 ${i + 1}/4`} h={0.45} /><P.Flag pos={[-4.7, p[1], p[2]]} height={3} /></group>)}
    {[12, 24, 44, 52, 68, 84, 92, 124, 130, 167, 177, 193, 211, 226].map(d => <CoinPickup key={d} pos={[0, height(-d), -d]} onPick={() => { if (useGame.getState().mg?.phase === 'playing' && race.current.countdown <= 0) race.current.coins++; }} />)}
    {rivals.map((b, i) => <group key={i} ref={g => { bots.current[i] = g; }} position={[(i - 1) * 2.5, 0, b.z]}><art.Avatar config={{ ...SHOP.defaultAvatar, shirtColor: ['#f08346', '#9054d2', '#1dbe8d'][i], pantsColor: '#263a5d' }} state={b.state} name={BOT_NAMES[i]} /></group>)}
    <Plate pos={[0, 0.08, 6]} text="WASD · ESPACIO para brincar" />
  </>;
}
