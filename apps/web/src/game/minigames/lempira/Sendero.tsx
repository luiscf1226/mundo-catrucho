import { useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import type { V3 } from '../../../core/types';
import { Label, useMgTick } from '../../kit';
import { finish, partida, setHud } from '../api';
import { guia, Ruta as RutaBase } from '../Ruta';
import { generar } from '../ruta/gen';

export { guia };

function Provisiones() {
  const p = useMemo(partida, []),
    g = useMemo(() => generar(p), [p]);
  const scene = useThree((s) => s.scene);
  const s = useRef({ energia: 100, cp: 0 });
  const vuelta = p.tema.variante === 'la-mochila-pide-descanso';
  useMgTick((dt) => {
    if (vuelta && scene.fog && 'near' in scene.fog) {
      scene.fog.near = 6;
      scene.fog.far = 36;
      scene.fog.color.set('#425064');
    }
    const st = s.current,
      pos = player.pos;
    const indice = g.plats.findIndex(
      (q) =>
        Math.abs(pos[0] - q.x) < q.w / 2 + 0.6 &&
        Math.abs(pos[2] - q.z) < q.len / 2 + 0.6 &&
        Math.abs(pos[1] - q.y) < 2,
    );
    const q = g.plats[indice];
    if (q?.tipo === 'cp' && player.body.grounded) {
      st.cp = g.cps.findIndex((c) => c[2] === q.z);
      st.energia = Math.min(100, st.energia + dt * 12);
    }
    const cerrado = vuelta && q?.tipo === 'plat' && indice % 4 === 0 && pos[0] > 0.2;
    if (cerrado || Math.abs(pos[0]) > 7) {
      st.energia -= 15;
      const cp = g.cps[Math.max(0, st.cp)];
      player.teleport(...cp);
      useGame.getState().toast('Apoyo cerrado o atajo: volvé al descanso.', '⛰️');
    }
    if (Math.hypot(player.body.vel[0], player.body.vel[2]) > 1) st.energia = Math.max(0, st.energia - dt * 0.8);
    player.speedMul = st.energia > 10 ? 1 : 0.55;
    const hud = useGame.getState().mgHud;
    if (st.energia <= 0) finish({ won: false, stars: 0, score: 0, label: 'Se acabaron las provisiones' });
    if (hud)
      setHud({
        ...hud,
        lines: [
          ...(hud.lines ?? []).slice(0, 2),
          `Provisiones ${Math.ceil(st.energia)} · Descansá en banderas${vuelta ? ' · Luz corta 36 m · Buscá la izquierda en apoyos cerrados' : ''}`,
        ],
      });
  });
  return (
    <>
      {vuelta &&
        g.plats
          .filter((q, i) => q.tipo === 'plat' && i % 4 === 0)
          .map((q) => (
            <Label
              key={q.id}
              pos={[q.x, q.y + 1.8, q.z] as V3}
              text="Derecha cerrada · Usá izquierda"
              h={0.35}
              fg="#ff9678"
            />
          ))}
    </>
  );
}
export function Ruta() {
  const p = useMemo(partida, []);
  return (
    <>
      <RutaBase />
      {p.tema.provisiones && <Provisiones />}
    </>
  );
}
