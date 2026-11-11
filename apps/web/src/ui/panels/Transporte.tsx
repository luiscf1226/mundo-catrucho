import { useState } from 'react';
import { catDe, DEPARTMENTS, TRANSPORTES } from '../../core/data';
import { useGame } from '../../core/store';
import type { Vehiculo } from '../../core/types';
import { resolverRuta } from '../../game/viaje/routes';
import { Btn, Panel } from '../components/kit';
export function TransportePanel() {
  const coins = useGame((s) => s.profile.coins),
    [veh, setVeh] = useState<Vehiculo>('rapidito'),
    [to, setTo] = useState(DEPARTMENTS[0].id);
  const scene = useGame((s) => s.scene);
  const from = scene.kind === 'dept' ? scene.id : 'franciscomorazan';
  const ruta = resolverRuta(from, to);
  const conexiones = ruta?.tramos.filter((t, i, ts) => i === 0 || t.fuente !== ts[i - 1].fuente);
  const fare = TRANSPORTES.find((t) => t.id === veh)?.precio ?? 0;
  return (
    <Panel
      id="transporte"
      title="Terminal de buses"
      icon="map"
      size="lg"
      footer={
        <>
          <div data-testid="tr-ruta" className="mb-3 rounded-xl bg-black/10 p-3 text-sm">
            {ruta ? (
              <>
                <b>{conexiones?.map((t) => t.carretera).join(' → ') || 'Recorrido local'}</b>
                <p>{conexiones?.map((t) => `${t.salida} → ${t.llegada}`).join(' · ')}</p>
                <p>
                  {Math.round(ruta.kilometros ?? 0)} km · {ruta.horas.toFixed(1)} h reales aprox. ·{' '}
                  {Math.round(ruta.segundos)} s de juego
                </p>
                <p>Peajes en CA-5 norte: L 2 por caseta; podés usar paso asistido sin cobro.</p>
                <p>Podés saltar desde el inicio. Tiempos de tramos publicados; conexiones internas no incluidas.</p>
              </>
            ) : (
              <p>Ocupás conexión marítima o aérea. Escogé otro destino por carretera.</p>
            )}
          </div>
          <Btn id="tr-go" tone="play" size="lg" cls="w-full" onClick={() => useGame.getState().startViaje(veh, to)}>
            ¡Vámonos! · L {fare} · Tenés L {coins}
          </Btn>
        </>
      }
    >
      <p className="mb-2 text-sm font-bold">1. Escogé en qué te vas</p>
      <div className="grid grid-cols-3 gap-2">
        {TRANSPORTES.map((t) => (
          <button
            type="button"
            aria-pressed={veh === t.id}
            data-testid={`tr-veh-${t.id}`}
            key={t.id}
            onClick={() => setVeh(t.id)}
            className="rounded-xl border-2 p-2 text-center sm:p-4"
            style={{
              borderColor: veh === t.id ? '#f0b935' : '#70818c',
              background: veh === t.id ? '#f0b93522' : 'transparent',
            }}
          >
            <span className="block text-4xl sm:text-5xl">{t.icon}</span>
            <b className="mt-2 block text-sm">{t.name}</b>
            <b className="block">L {t.precio}</b>
            <span className="mt-1 block text-xs">{t.nota}</span>
          </button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-sm font-bold">2. Escogé tu destino</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {DEPARTMENTS.map((d) => {
          const cat = catDe(d.id);
          return (
            <button
              type="button"
              key={d.id}
              aria-pressed={to === d.id}
              data-testid={`tr-to-${d.id}`}
              onClick={() => setTo(d.id)}
              className="rounded-xl border-2 p-2 text-left"
              style={{
                borderColor: to === d.id ? '#17a673' : '#70818c',
                background: to === d.id ? '#17a67322' : 'transparent',
              }}
            >
              <b className="block text-sm">{d.name}</b>
              <span className="block text-xs">
                {cat.tipos || '🇭🇳'} · {cat.juegos.length} juegos
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
