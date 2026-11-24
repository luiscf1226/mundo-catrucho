// MC-56: contador de cuadros para medir en un celular de verdad. Se abre con `#fps` en la dirección del juego
// (por ejemplo …/#fps). No usa red ni guarda nada. «Medir 30 s» deja un resumen para copiar en el issue.
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../core/store';

interface Resumen {
  fps: number;
  p95: number;
  lentos: number;
  cuadros: number;
}
const resumir = (ms: number[]): Resumen => {
  const orden = [...ms].sort((a, b) => a - b);
  return {
    fps: ms.length ? (1000 * ms.length) / ms.reduce((a, b) => a + b, 0) : 0,
    p95: orden[Math.floor(orden.length * 0.95)] ?? 0,
    lentos: ms.length ? (100 * ms.filter((x) => x > 34).length) / ms.length : 0,
    cuadros: ms.length,
  };
};
type Gl = { info: { render: { calls: number } }; getPixelRatio: () => number };

export function Diagnostico() {
  const [vivo, setVivo] = useState<Resumen & { llamadas: number; dpr: number }>();
  const [medicion, setMedicion] = useState<{ falta: number; texto?: string }>();
  const lugar = useGame((s) =>
    s.mg
      ? s.mg.id
      : s.scene.kind === 'dept'
        ? s.scene.id
        : s.scene.kind === 'viaje'
          ? `viaje a ${s.scene.to}`
          : s.scene.kind,
  );
  const ventana = useRef<number[]>([]);
  const medida = useRef<number[] | null>(null);
  useEffect(() => {
    let antes = performance.now(),
      id = 0,
      mostrar = antes;
    const cuadro = (ahora: number) => {
      const dt = ahora - antes;
      antes = ahora;
      ventana.current.push(dt);
      if (ventana.current.length > 300) ventana.current.shift();
      medida.current?.push(dt);
      if (ahora - mostrar > 500) {
        mostrar = ahora;
        const gl: Gl | undefined = (window as unknown as { __mc?: { gl?: Gl } }).__mc?.gl;
        setVivo({
          ...resumir(ventana.current),
          llamadas: gl?.info.render.calls ?? 0,
          dpr: gl?.getPixelRatio() ?? 0,
        });
      }
      id = requestAnimationFrame(cuadro);
    };
    id = requestAnimationFrame(cuadro);
    return () => cancelAnimationFrame(id);
  }, []);
  const medir = () => {
    medida.current = [];
    let falta = 30;
    setMedicion({ falta });
    const reloj = setInterval(() => {
      falta--;
      if (falta > 0) return setMedicion({ falta });
      clearInterval(reloj);
      const r = resumir(medida.current ?? []);
      medida.current = null;
      setMedicion({
        falta: 0,
        texto: `${lugar} · ${r.fps.toFixed(1)} FPS · p95 ${r.p95.toFixed(1)} ms · ${r.lentos.toFixed(1)}% >34 ms · ${r.cuadros} cuadros · ${navigator.userAgent.match(/\(([^)]+)\)/)?.[1] ?? ''}`,
      });
    }, 1000);
  };
  const malo = vivo && (vivo.p95 > 34 || vivo.lentos > 5);
  return (
    <div
      data-testid="diagnostico-fps"
      className="pointer-events-none fixed left-[max(.25rem,env(safe-area-inset-left))] top-[56%] z-50 max-w-[62vw] rounded-lg bg-black/70 px-2 py-1 font-mono text-[10px] leading-tight text-white"
    >
      {vivo && (
        <div className={malo ? 'text-red-300' : 'text-green-300'}>
          {vivo.fps.toFixed(0)} FPS · p95 {vivo.p95.toFixed(0)} ms · {vivo.lentos.toFixed(0)}% lentos
          <br />
          {vivo.llamadas} llamadas · DPR {vivo.dpr.toFixed(2)}
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="opacity-80">{lugar}</span>
        <button
          type="button"
          data-testid="diagnostico-medir"
          className="pointer-events-auto rounded bg-white/20 px-1.5"
          disabled={!!medicion?.falta}
          onClick={medir}
        >
          {medicion?.falta ? `Midiendo… ${medicion.falta} s` : 'Medir 30 s'}
        </button>
      </div>
      {medicion?.texto && (
        <div data-testid="diagnostico-resumen" className="pointer-events-auto select-text whitespace-normal">
          {medicion.texto}
        </div>
      )}
    </div>
  );
}
