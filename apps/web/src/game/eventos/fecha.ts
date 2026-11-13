import { useEffect, useState } from 'react';

export function fechaActual(): string {
  const partes = location.hash.slice(1).split(',');
  const valor = partes.includes('test') ? partes.find((p) => p.startsWith('fecha='))?.slice(6) : undefined;
  if (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const d = new Date(`${valor}T12:00:00Z`);
    if (Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === valor) return valor;
  }
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useFecha(): string {
  const [fecha, setFecha] = useState(fechaActual);
  useEffect(() => {
    const actualizar = () => setFecha(fechaActual());
    const reloj = setInterval(actualizar, 1000);
    window.addEventListener('hashchange', actualizar);
    window.addEventListener('focus', actualizar);
    return () => {
      clearInterval(reloj);
      window.removeEventListener('hashchange', actualizar);
      window.removeEventListener('focus', actualizar);
    };
  }, []);
  return fecha;
}
