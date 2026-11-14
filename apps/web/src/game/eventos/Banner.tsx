import { deptById, juegoById } from '../../core/data';
import { useGame } from '../../core/store';
import { cx, useTouch } from '../../ui/lib';
import { eventosEn } from './calendario';
import { useFecha } from './fecha';

export function BannerEventos() {
  const scene = useGame((s) => s.scene),
    panel = useGame((s) => s.panel);
  const fecha = useFecha(),
    touch = useTouch();
  if (panel || (scene.kind !== 'lobby' && scene.kind !== 'dept')) return null;
  const eventos = eventosEn(fecha, scene.kind === 'dept' ? scene.id : null);
  if (!eventos.length) return null;
  return (
    <aside
      data-testid="eventos"
      data-fecha={fecha}
      aria-label="Fiestas de temporada"
      className={cx(
        'pointer-events-auto absolute flex max-h-[30vh] w-60 max-w-[65vw] flex-col gap-2 overflow-auto',
        // con controles táctiles, abajo a la derecha quedaba debajo de E, 🎯 y emotes: no se leía ni se podía tocar
        touch ? 'right-3 top-20' : 'bottom-24 right-16 sm:bottom-5 sm:right-5',
      )}
    >
      {eventos.map((e) => {
        const juego = juegoById(e.juego);
        return (
          <div
            key={e.id}
            data-testid={`evento-${e.id}`}
            data-dept={e.dept ?? 'honduras'}
            className="mc-hud border-l-4 p-3"
            style={{ borderLeftColor: e.color }}
          >
            <div role="status">
              <b className="text-sm">¡{e.nombre}!</b>
              <p className="text-xs">{e.lugar}</p>
            </div>
            <p className="mt-1 text-xs text-muted">Temporada en el juego</p>
            {juego && (
              <button
                type="button"
                data-testid={`evento-ir-${e.id}`}
                className="mt-2 text-left text-xs font-bold underline"
                onClick={() => useGame.getState().travel(juego.dept)}
              >
                Visitá {deptById(juego.dept).name} · destacado: {juego.name}
              </button>
            )}
          </div>
        );
      })}
    </aside>
  );
}
