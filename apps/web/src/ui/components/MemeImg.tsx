import { useEffect, useRef } from 'react';
import type { Meme } from '../../core/memes';
import { dibujarMeme, fuenteLista } from '../../game/memes/dibujo';
import { pedirFoto, useFoto } from '../../game/memes/foto';
import { cx } from '../lib';

/** El meme en 4:3: la foto del meme 3D cuando ya está; mientras tanto, el dibujo plano. El tamaño lo pone `cls`. */
export function MemeImg({ meme, cls }: { meme: Meme; cls?: string }) {
  const ref = useRef<HTMLCanvasElement>(null),
    foto = useFoto(meme.id),
    texto = `${meme.arriba} · ${meme.abajo}`;
  useEffect(() => {
    const el = ref.current,
      c = el?.getContext('2d');
    if (foto || !el || !c) return;
    let vivo = true,
      cancelar: (() => void) | undefined;
    const pintar = () => vivo && dibujarMeme(c, meme, 480, 360);
    pintar();
    void fuenteLista().then(pintar);
    // solo se piden fotos de lo que está en pantalla
    const ojo = new IntersectionObserver(([e]) => {
      cancelar?.();
      cancelar = e?.isIntersecting ? pedirFoto(meme.id) : undefined;
    });
    ojo.observe(el);
    return () => {
      vivo = false;
      ojo.disconnect();
      cancelar?.();
    };
  }, [meme, foto]);
  const base = cx('block aspect-[4/3] rounded-lg bg-black/20 object-cover', cls);
  return foto ? (
    <img src={foto} alt={texto} data-foto="3d" className={base} />
  ) : (
    <canvas ref={ref} width={480} height={360} role="img" aria-label={texto} data-foto="2d" className={base} />
  );
}
