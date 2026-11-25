import { deptById } from '../../core/data';
import { input } from '../../core/input';
import { useGame } from '../../core/store';
import { OPCIONES } from '../../game/viaje/opciones';
import { changeRadio, RADIOS, useViaje } from '../../game/viaje/state';
import { Bar, Btn } from '../components/kit';
import { VendedorViaje } from './VendedorViaje';
export function ViajeHud() {
  const scene = useGame((s) => s.scene),
    v = useViaje();
  if (scene.kind !== 'viaje') return null;
  return (
    <div
      data-testid="viaje-hud"
      data-x={v.x}
      data-speed={v.speed}
      className="pointer-events-none absolute inset-0 p-3 text-hudfg sm:p-5"
    >
      <div className="mc-hud mx-auto flex flex-col gap-2 p-3" style={{ marginTop: 78, width: '100%', maxWidth: 520 }}>
        <b className="text-lg">
          {OPCIONES.find((t) => t.id === scene.veh)?.icon} Rumbo a {deptById(scene.to)?.name ?? scene.to}
        </b>
        <Bar id="viaje-progress" value={v.progress} max={1} cls="is-vivo" />
        <span className="text-sm">
          {Math.round(v.progress * 100)} % · {v.speed} km/h · {v.hits} choques
        </span>
        <span
          data-testid="viaje-tramo"
          data-paisaje={v.linea?.tramo?.paisaje}
          data-medio={v.linea?.tramo?.medio}
          data-vehiculo={scene.veh}
          className="text-sm"
        >
          {v.linea?.tramo ? `${v.linea.tramo.carretera} · ${v.linea.tramo.nombre}` : 'Recorrido local'}
          {' · '}
          {v.ruta?.kilometros === null
            ? 'Distancia sin confirmar'
            : `${Math.round(v.linea?.kilometros ?? 0)} / ${Math.round(v.ruta?.kilometros ?? 0)} km`}
        </span>
        <span className="text-xs">
          Girá con A / D · W da empuje · S reduce · F da señal. En pantalla usá la palanca.
        </span>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <Btn id="viaje-radio" size="sm" tone="dark" onClick={changeRadio}>
            ♫ {RADIOS[v.radio].name} ↻
          </Btn>
          <Btn id="viaje-horn" size="sm" tone="gold" onClick={() => input.press('fire')}>
            📣 Señal
          </Btn>
          <Btn id="viaje-skip" size="sm" tone="neutral" onClick={() => useGame.getState().llegarViaje(0)}>
            Saltar viaje
          </Btn>
        </div>
      </div>
      <VendedorViaje />
    </div>
  );
}
