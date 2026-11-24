import { useState } from 'react';
import { actividadDe, type LugarTuristico, TURISMO } from '../../../../../docs/generador/turismo';
import { DEPARTMENTS } from '../../core/data';
import { useGame } from '../../core/store';
import { useTurismo } from '../../game/dept/turismo';
import { Btn, Note, Panel } from '../components/kit';

export function RecuerdosPanel() {
  const recuerdos = useGame((s) => s.profile.turismo);
  return (
    <Panel id="recuerdos" title="Postales" icon="camera" size="lg">
      <Note>Caminá hasta los letreros dorados. Descubrí un lugar y completá su actividad para guardar una postal.</Note>
      {DEPARTMENTS.map((d) => {
        const lugares = TURISMO.filter((p) => p.dept === d.id),
          vistos = lugares.filter((p) => recuerdos.some((r) => r.id === p.id));
        return (
          <section key={d.id} className="my-4" data-testid={`recuerdos-${d.id}`}>
            <h3 className="font-display text-xl">
              {d.name} · {vistos.length}/{lugares.length}
            </h3>
            {vistos.length === 0 ? (
              <p className="opacity-70">Todavía no descubriste lugares aquí.</p>
            ) : (
              vistos.map((p) => (
                <article key={p.id} data-testid={`recuerdo-${p.id}`} className="my-2 rounded-xl border border-line p-4">
                  <h4 className="font-bold">
                    {recuerdos.find((r) => r.id === p.id)?.completa
                      ? '✓ Postal guardada'
                      : '📍 Descubierto · actividad pendiente'}{' '}
                    · {p.nombre}
                  </h4>
                  <p className="my-2">{p.dato}</p>
                  <small>Fuente: {new URL(p.fuente).hostname.replace(/^www\./, '')}</small>
                </article>
              ))
            )}
          </section>
        );
      })}
    </Panel>
  );
}
export function TurismoPanel() {
  const lugar = useTurismo((s) => s.lugar);
  return (
    <Panel id="turismo" title={lugar?.nombre ?? 'Explorá'} icon="map" size="md">
      {lugar && <Actividad key={lugar.id} lugar={lugar} />}
    </Panel>
  );
}
function Actividad({ lugar }: { lugar: LugarTuristico }) {
  const tipo = actividadDe(lugar.tipo),
    [paso, setPaso] = useState(0),
    [encuadre, setEncuadre] = useState(15),
    [mensaje, setMensaje] = useState(''),
    [guardando, setGuardando] = useState(false);
  const completa = useGame((s) => s.profile.turismo.some((r) => r.id === lugar.id && r.completa));
  const guardar = async () => {
    setGuardando(true);
    const ok = await useGame.getState().registrarTurismo(lugar.id, true);
    setMensaje(ok ? '¡Cheque! Tu postal quedó en Recuerdos.' : 'No se guardó. Probá otra vez.');
    setGuardando(false);
  };
  const elegir = (correcta: boolean) => {
    if (!correcta) {
      setPaso(0);
      setMensaje('Probá otra vez: seguí la pista.');
      return;
    }
    setMensaje('¡Así mero!');
    if (paso === 2) void guardar();
    else setPaso(paso + 1);
  };
  const pasos =
    tipo === 'subir'
      ? ['Buscá apoyo firme', 'Subí por el sendero', 'Llegá al mirador']
      : tipo === 'probar'
        ? ['Lavate las manos', 'Probá un bocadito', 'Contale al anfitrión qué te pareció']
        : ['Recibí la artesanía', 'Envolvela con cuidado', 'Entregala al anfitrión'];
  return (
    <div data-testid="turismo-actividad" data-tipo={tipo} className="flex flex-col gap-4">
      <p>{lugar.queHaces}</p>
      {completa ? (
        <>
          <h3 className="text-xl">✓ Postal guardada</h3>
          <p>{lugar.dato}</p>
        </>
      ) : tipo === 'foto' ? (
        <>
          <p>Centrá el horizonte en el marco (45–55) y sacá la postal.</p>
          <div
            className="relative overflow-hidden rounded-xl border-4 border-amber-300 bg-sky-900 p-8 text-center text-4xl"
            aria-hidden
          >
            <div style={{ transform: `translateX(${(encuadre - 50) * 2}px)` }}>⛰️ ☀️ ⛰️</div>
            <span className="absolute inset-0 flex items-center justify-center text-white">＋</span>
          </div>
          <label>
            Encuadre: {encuadre}
            <input
              data-testid="turismo-encuadre"
              aria-label="Encuadre"
              className="w-full"
              type="range"
              min="0"
              max="100"
              value={encuadre}
              onChange={(e) => setEncuadre(Number(e.target.value))}
            />
          </label>
          <Btn
            id="turismo-foto"
            disabled={guardando}
            onClick={() =>
              encuadre >= 45 && encuadre <= 55
                ? void guardar()
                : setMensaje('El horizonte quedó fuera. Mové el encuadre al centro.')
            }
          >
            Sacá la postal
          </Btn>
        </>
      ) : (
        <>
          <div className="relative h-32 overflow-hidden rounded-xl bg-sky-900" aria-label={`Avance: ${paso} de 3`}>
            {tipo === 'subir' ? (
              <>
                <span className="absolute right-4 top-2 text-3xl" aria-hidden>
                  ⛰️ ☀️
                </span>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="absolute bottom-0 w-1/4 rounded-t-lg bg-amber-700"
                    style={{ left: `${15 + i * 25}%`, height: `${25 + i * 25}%` }}
                  />
                ))}
                <span
                  className="absolute text-3xl transition-all"
                  style={{ left: `${15 + paso * 25}%`, bottom: `${15 + paso * 22}%` }}
                  aria-hidden
                >
                  🚶
                </span>
              </>
            ) : (
              <div className="p-6 text-center text-3xl">
                {tipo === 'probar' ? '🍽️' : '🧺'} {paso}/3
              </div>
            )}
          </div>
          <p>
            {tipo === 'subir'
              ? 'Subí por los tres apoyos seguros.'
              : tipo === 'probar'
                ? 'Prepará la degustación en orden.'
                : 'Ayudá a empacar en orden.'}{' '}
            Elegí: {pasos[paso]}.
          </p>
          {pasos.map((texto, i) => (
            <Btn key={texto} id={`turismo-paso-${i}`} disabled={guardando} onClick={() => elegir(i === paso)}>
              {texto}
            </Btn>
          ))}
          <Btn id="turismo-riesgo" disabled={guardando} onClick={() => elegir(false)}>
            {tipo === 'subir'
              ? 'Tomar un atajo inestable'
              : tipo === 'probar'
                ? 'Comer sin lavarte las manos'
                : 'Tirar la pieza sin envolver'}
          </Btn>
        </>
      )}
      <p role="status">{guardando ? 'Guardando…' : mensaje}</p>
      <Btn id="turismo-album" onClick={() => useGame.getState().openPanel('recuerdos')}>
        Abrí Recuerdos
      </Btn>
    </div>
  );
}
