// Conectados de verdad (MC-23): cuánta gente hay en el mapa y en cada departamento, según los avisos que cada sala
// manda a Convex cada 30 s (`salas:conectados`). Los bots no cuentan. Sin salas en vivo no pregunta nada.
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { useEffect } from 'react';
import { create } from 'zustand';
import { EN_VIVO } from './net';

export interface Conectados {
  mapa: number;
  depts: Record<string, number>;
  total: number;
}
const ref = makeFunctionReference<'query', Record<string, never>, Conectados>('salas:conectados');
/** cada cuánto se vuelve a preguntar (lo mismo que tardan las salas en avisar) */
const CADA_MS = 30_000;
const useStore = create<{ c: Conectados | null }>(() => ({ c: null }));
let iniciado = false,
  preguntar: (() => Promise<void> | undefined) | null = null;
/** Pregunta ya, sin esperar la vuelta de 30 s (al abrir el mapa). */
export const preguntarConectados = () => void preguntar?.();
function iniciar() {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (iniciado || !EN_VIVO || !url) return;
  iniciado = true;
  const cliente = new ConvexHttpClient(url, { logger: false });
  preguntar = () =>
    cliente
      .query(ref, {})
      .then((c) => useStore.setState({ c }))
      .catch(() => {});
  void preguntar();
  setInterval(preguntar, CADA_MS);
}
/** Conectados de verdad; null mientras no hay respuesta (o sin salas en vivo, donde el mapa sigue simulado). */
export function useConectados(): Conectados | null {
  useEffect(iniciar, []);
  return useStore((s) => s.c);
}
