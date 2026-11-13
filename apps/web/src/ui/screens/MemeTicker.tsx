// Frases de memes durante cualquier juego: la primera a los 14 s de juego y luego cada 26 s. Si ya hay un aviso en
// pantalla espera 4 s. El reloj solo corre sin pausa, y la secuencia sigue donde iba al volver de un panel.
// Cada aviso publica `memeAlAire` para que game/memes/MemePop lo muestre en 3D.
import { useEffect } from 'react';
import { juegoById } from '../../core/data';
import { elegirMeme, memesDelJuego } from '../../core/memes';
import { isPaused, useGame } from '../../core/store';

const PRIMERA = 14_000,
  CADA = 26_000,
  REINTENTO = 4_000,
  PASO = 250;

export function MemeTicker() {
  const mg = useGame((s) => s.mg);
  const motor = mg?.id,
    juego = mg?.juego,
    run = mg?.run;
  useEffect(() => {
    if (!motor) return;
    const pool = memesDelJuego(juego ? juegoById(juego)?.dept : undefined, motor),
      dichos: string[] = [];
    if (!pool.length) return;
    let falta = PRIMERA,
      dichas = 0;
    const reloj = setInterval(() => {
      if (isPaused() || useGame.getState().mg?.phase !== 'playing') return;
      falta -= PASO;
      if (falta > 0) return;
      const s = useGame.getState();
      if (s.toasts.length) {
        falta = REINTENTO;
        return;
      }
      const m = elegirMeme(pool, `${juego ?? motor}|${run}|${dichas++}`, dichos);
      if (m) {
        s.toast(m.frase, m.emoji);
        s.alAire(m.id);
        dichos.push(m.id);
        if (dichos.length >= pool.length) dichos.length = 0;
      }
      falta = CADA;
    }, PASO);
    return () => clearInterval(reloj);
  }, [motor, juego, run]);
  return null;
}
