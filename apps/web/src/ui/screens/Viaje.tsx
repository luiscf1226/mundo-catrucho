import { deptById, TRANSPORTES } from '../../core/data';
import { input } from '../../core/input';
import { useGame } from '../../core/store';
import { changeRadio, RADIOS, useViaje } from '../../game/viaje/state';
import { Bar, Btn } from '../components/kit';
export function ViajeHud() {
  const scene = useGame((s) => s.scene),
    v = useViaje();
  if (scene.kind !== 'viaje') return null;
  return (
    <div data-testid="viaje-hud" className="pointer-events-none absolute inset-0 p-3 text-hudfg sm:p-5">
      <div className="mc-hud mx-auto flex flex-col gap-2 p-3" style={{ marginTop: 78, width: '100%', maxWidth: 520 }}>
        <b className="text-lg">
          {TRANSPORTES.find((t) => t.id === scene.veh)?.icon} Rumbo a {deptById(scene.to)?.name ?? scene.to}
        </b>
        <Bar id="viaje-progress" value={v.progress} max={1} />
        <span className="text-sm">
          {Math.round(v.progress * 100)} % · {v.speed} km/h · {v.hits} choques
        </span>
        <span className="text-xs">Girá con A / D · W acelera · S frena · F toca el claxon</span>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <Btn id="viaje-radio" size="sm" tone="dark" onClick={changeRadio}>
            ♫ {RADIOS[v.radio].name} ↻
          </Btn>
          <Btn id="viaje-horn" size="sm" tone="gold" onClick={() => input.press('fire')}>
            📣 Claxon
          </Btn>
          <Btn id="viaje-skip" size="sm" tone="neutral" onClick={() => useGame.getState().llegarViaje(0)}>
            Saltar viaje
          </Btn>
        </div>
      </div>
    </div>
  );
}
