// Frases de memes durante cualquier juego: la primera a los 14 s y luego cada 26 s. Si ya hay un aviso en
// pantalla espera 4 s. Se monta solo mientras se juega, así que pausar o abrir un panel también lo detiene.
// Cada aviso publica `memeAlAire` para que game/memes/MemePop lo muestre en 3D.
import { useEffect } from 'react';
import { juegoById } from '../../core/data';
import { elegirMeme, memesDelJuego } from '../../core/memes';
import { useGame } from '../../core/store';

const PRIMERA = 14_000,
  CADA = 26_000,
  REINTENTO = 4_000;

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
    let timer: ReturnType<typeof setTimeout>;
    const decir = () => {
      const s = useGame.getState();
      if (s.toasts.length) {
        timer = setTimeout(decir, REINTENTO);
        return;
      }
      const m = elegirMeme(pool, `${juego ?? motor}|${run}|${dichos.length}`, dichos);
      if (m) {
        s.toast(m.frase, m.emoji);
        s.alAire(m.id);
        dichos.push(m.id);
        if (dichos.length >= pool.length) dichos.length = 0;
      }
      timer = setTimeout(decir, CADA);
    };
    timer = setTimeout(decir, PRIMERA);
    return () => clearTimeout(timer);
  }, [motor, juego, run]);
  return null;
}
