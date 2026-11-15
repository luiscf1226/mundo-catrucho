import { useMemo, useRef } from 'react';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import { Block, Label, useMgTick } from '../../kit';
import { type Guia, partida, setHud } from '../api';
import { CarreraScene } from '../carrera/Scene';
export const guia: Guia = {
  goal: 'Corré y saltá por el circuito señalado. Cuidá el abrigo; los puestos lo recuperan. El carril soleado conserva calor pero frena.',
  keys: [
    ['Flechas / WASD', 'corré'],
    ['Espacio', 'saltá'],
    ['Shift', 'apurate'],
  ],
  touch: [
    ['Palanca', 'corré'],
    ['Salto', 'saltá'],
  ],
  metas: () => ['Terminá antes de 95 s', 'Antes de 70 s', 'Antes de 50 s'],
};
export function Carrera() {
  const p = useMemo(partida, []);
  const s = useRef({ abrigo: 100, golpe: 0 });
  const frio = p.tema.variante === 'el-frio-va-ganando';
  useMgTick((dt) => {
    if (useGame.getState().mg?.phase !== 'playing') return;
    const r = s.current;
    const z = player.pos[2];
    const puesto = [-48, -88, -124, -170].some((cp) => Math.abs(z - cp) < 3);
    r.abrigo = Math.max(
      0,
      Math.min(100, r.abrigo + dt * (puesto ? 18 : frio && player.pos[0] < -1 ? 0.5 : -(0.7 + p.dif * 0.5))),
    );
    if (player.body.vel[2] > 3 && r.golpe <= 0) {
      r.abrigo = Math.max(0, r.abrigo - 12);
      r.golpe = 1;
    }
    r.golpe -= dt;
    if (r.abrigo < 20) player.speedMul *= 0.65;
    if (frio && player.pos[0] < -1) player.speedMul *= 0.75;
    const hud = useGame.getState().mgHud;
    if (hud)
      setHud({
        ...hud,
        lines: [
          ...(hud.lines ?? []),
          `Abrigo ${Math.round(r.abrigo)}% · ${puesto ? 'Recuperando calor' : frio && player.pos[0] < -1 ? 'Carril soleado' : 'Carril frío'}`,
        ],
      });
  }, -10);
  return (
    <>
      <CarreraScene limite={95} />
      {[-48, -88, -124, -170].map((z) => (
        <group key={z}>
          <Block pos={[4, z <= -170 ? 6.2 : 0.2, z]} size={[2, 0.4, 3]} color="#e9a54f" mat="cloth" solid={false} />
          <Label pos={[3, z <= -170 ? 8 : 2, z]} text="Puesto de abrigo" h={0.35} />
        </group>
      ))}
      {frio && <Label pos={[0, 3, -12]} text="Izquierda: sol y rodeo lento · Derecha: frío y atajo" h={0.4} />}
    </>
  );
}
