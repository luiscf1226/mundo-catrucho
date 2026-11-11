import { useGame } from '../../core/store';
import { comprarComida, pagarPeaje, seguirCamino, useCamino } from '../../game/viaje/eventos/state';
import { comidaDe } from '../../game/viaje/paradas/comida';
import { changeRadio } from '../../game/viaje/state';
import { Btn } from '../components/kit';
export function VendedorViaje() {
  const s = useCamino();
  if (!s.activa) return null;
  const c = s.activa,
    vendedor = c.accion === 'comprar',
    detenido = s.velocidad < 0.1;
  return (
    <div
      data-testid="viaje-evento"
      data-evento={c.nombre}
      data-accion={c.accion}
      data-velocidad={s.velocidad.toFixed(2)}
      className="pointer-events-auto mc-hud absolute bottom-3 right-3 max-h-[45vh] max-w-sm overflow-auto rounded-xl p-3 text-sm"
    >
      <b>
        {c.nombre} · {c.km === null ? c.tramo.nombre : `km ${Math.round(c.km)}`}
      </b>
      <p>{c.texto}</p>
      <p>
        {c.accion === 'rodear'
          ? 'Rodeá por un lado con A / D o esperá el paso asistido.'
          : 'Frenado asistido. Seguimos solos en unos segundos.'}
      </p>
      {vendedor && (
        <div data-testid="viaje-vendedor">
          <p>
            {detenido ? '¡Ya subió el vendedor! Mirá lo que trae.' : 'Nos estamos orillando. Esperá que pare.'} Energía
            del viaje +{s.energia}
          </p>
          <div className="flex flex-wrap gap-2">
            {comidaDe(c).map((comida) => (
              <Btn
                key={comida.id}
                id={`viaje-comprar-${comida.id}`}
                size="sm"
                tone="gold"
                disabled={!detenido || s.compradas.includes(comida.id)}
                onClick={() => comprarComida(comida.id)}
              >
                {comida.nombre} · L {comida.precio}
                {s.compradas.includes(comida.id) ? ' ✓' : ''}
              </Btn>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 flex gap-2">
        {c.accion === 'pagar' && (
          <Btn id="viaje-peaje" size="sm" disabled={!detenido} onClick={pagarPeaje}>
            Pagá L 2 · sin pisto, paso asistido
          </Btn>
        )}
        {c.accion === 'radio' && (
          <Btn id="viaje-evento-radio" size="sm" onClick={changeRadio}>
            Cambiá la radio
          </Btn>
        )}
        <Btn
          id="viaje-evento-seguir"
          size="sm"
          tone="neutral"
          onClick={() => {
            useGame
              .getState()
              .toast(
                c.accion === 'ventilar'
                  ? 'Ventanas abiertas, ¡qué fresco!'
                  : c.accion === 'documentos'
                    ? 'Todo en orden. ¡Buen viaje!'
                    : c.accion === 'pagar'
                      ? 'Carril asistido, sin cobro'
                      : '¡Seguimos, compa!',
                '✅',
              );
            seguirCamino();
          }}
        >
          {c.accion === 'ventilar'
            ? 'Ventilá la cabina'
            : c.accion === 'documentos'
              ? 'Mostrá documentos'
              : c.accion === 'amarres' || c.accion === 'equipaje'
                ? 'Acomodá la carga'
                : vendedor
                  ? 'Que baje · seguir'
                  : 'Paso asistido · seguir'}
        </Btn>
      </div>
    </div>
  );
}
