import { useState } from 'react';
import { useGame } from '../../core/store';
import { DEPARTMENTS, TRANSPORTES, catDe } from '../../core/data';
import type { Vehiculo } from '../../core/types';
import { Btn, Panel } from '../components/kit';
export function TransportePanel() {
  const coins = useGame(s => s.profile.coins), [veh, setVeh] = useState<Vehiculo>('rapidito'), [to, setTo] = useState(DEPARTMENTS[0].id);
  const fare = TRANSPORTES.find(t => t.id === veh)?.precio ?? 0;
  return <Panel id="transporte" title="Terminal de buses" icon="map" size="lg" footer={<Btn id="tr-go" tone="play" size="lg" cls="w-full" onClick={() => useGame.getState().startViaje(veh, to)}>¡Vámonos! · L {fare} · Tenés L {coins}</Btn>}>
    <p className="mb-2 text-sm font-bold">1. Escogé en qué te vas</p>
    <div className="grid grid-cols-3 gap-2">{TRANSPORTES.map(t => <button type="button" aria-pressed={veh === t.id} data-testid={`tr-veh-${t.id}`} key={t.id} onClick={() => setVeh(t.id)} className="rounded-xl border-2 p-2 text-center sm:p-4" style={{ borderColor: veh === t.id ? '#f0b935' : '#70818c', background: veh === t.id ? '#f0b93522' : 'transparent' }}>
      <span className="block text-4xl sm:text-5xl">{t.icon}</span><b className="mt-2 block text-sm">{t.name}</b><b className="block">L {t.precio}</b><span className="mt-1 block text-xs">{t.nota}</span>
    </button>)}</div>
    <p className="mb-2 mt-4 text-sm font-bold">2. Escogé tu destino</p>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{DEPARTMENTS.map(d => { const cat = catDe(d.id); return <button type="button" key={d.id} aria-pressed={to === d.id} data-testid={`tr-to-${d.id}`} onClick={() => setTo(d.id)} className="rounded-xl border-2 p-2 text-left" style={{ borderColor: to === d.id ? '#17a673' : '#70818c', background: to === d.id ? '#17a67322' : 'transparent' }}><b className="block text-sm">{d.name}</b><span className="block text-xs">{cat.tipos || '🇭🇳'} · {cat.juegos.length} juegos</span></button>; })}</div>
  </Panel>;
}
