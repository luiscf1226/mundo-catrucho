// Controles táctiles: palanca a la izquierda y botones a la derecha. El resto de la pantalla queda libre para
// girar la cámara arrastrando (el contenedor no recibe toques; solo la palanca y los botones).
import { useEffect, useRef, useState } from 'react';
import { input } from '../../core/input';
import { audio } from '../../core/audio';
import { useGame } from '../../core/store';
import { Icon } from '../components/Icon';
import { g } from '../lib';

const REACH = 44;
export function TouchControls() {
  const joy = useRef<HTMLDivElement>(null), [knob, setKnob] = useState({ x: 0, y: 0, on: false }), mg = useGame(s => !!s.mg);
  const move = (e: React.PointerEvent) => {
    const r = joy.current!.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / REACH, y = (e.clientY - r.top - r.height / 2) / REACH;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    input.jx = x; input.jz = y; setKnob({ x, y, on: true });
  };
  const end = () => { input.jx = input.jz = 0; setKnob({ x: 0, y: 0, on: false }); };
  useEffect(() => { input.touch = true; return () => { input.jx = input.jz = 0; input.jump = false; }; }, []);
  const tap = (fn: () => void) => (e: React.PointerEvent) => { e.preventDefault(); audio.init(); fn(); };
  return <div className="mc-touch pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between" data-testid="touch">
    <div ref={joy} data-testid="touch-joy" role="application" aria-label="Palanca para moverse" className="mc-joy pointer-events-auto relative touch-none" data-on={knob.on}
      onPointerDown={e => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* puntero sintético o ya soltado */ } audio.init(); input.touch = true; move(e); }}
      onPointerMove={e => { if (e.buttons || e.pointerType === 'touch') move(e); }} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <div className="mc-joy-knob" style={{ transform: `translate(calc(-50% + ${knob.x * REACH}px), calc(-50% + ${knob.y * REACH}px))` }} />
    </div>
    <div className="mc-pad pointer-events-none relative">
      <button type="button" data-testid="touch-emote" aria-label="Emotes" className="mc-tbtn pointer-events-auto touch-none" style={{ right: 150, bottom: 2 }} onPointerDown={tap(() => g().openPanel('emotes'))}><Icon name="emote" size={24} /></button>
      <button type="button" data-testid="touch-fire" aria-label={mg ? 'Acción: patear o lanzar' : 'Acción'} className="mc-tbtn pointer-events-auto touch-none" style={{ right: 96, bottom: 60 }} onPointerDown={tap(() => input.press('fire'))}><span aria-hidden className="text-2xl leading-none">🎯</span></button>
      <button type="button" data-testid="touch-use" aria-label="Usar (E)" className="mc-tbtn pointer-events-auto touch-none" style={{ right: 8, bottom: 104 }} onPointerDown={tap(() => input.press('use'))}><b className="font-display text-2xl leading-none">E</b></button>
      <button type="button" data-testid="touch-jump" aria-label="Saltar" className="mc-tbtn is-jump pointer-events-auto touch-none" style={{ right: 0, bottom: 0 }} onPointerDown={tap(() => { input.press('jump'); input.jump = true; })} onPointerUp={() => { input.jump = false; }} onPointerCancel={() => { input.jump = false; }} onPointerLeave={() => { input.jump = false; }}><Icon name="jump" size={36} /></button>
    </div>
  </div>;
}
