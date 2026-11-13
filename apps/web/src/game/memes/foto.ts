// Fotos de los memes 3D para la interfaz: la interfaz pide la foto de los memes que tiene en pantalla y el
// fotógrafo (Fotografo.tsx, dentro del lienzo) las toma de una en una. Sin three aquí: la interfaz solo importa esto.
import { useSyncExternalStore } from 'react';

const fotos = new Map<string, string>(),
  /** id → cuántas imágenes en pantalla la esperan */
  pedidos = new Map<string, number>(),
  subs = new Set<() => void>();

/** Cuánto tardó cada foto (render + lectura + JPEG), para medir. */
export const tiemposFoto: number[] = [];

/** Pide la foto mientras la imagen esté en pantalla; devuelve con qué cancelar el pedido. */
export function pedirFoto(id: string) {
  if (fotos.has(id)) return () => {};
  pedidos.set(id, (pedidos.get(id) ?? 0) + 1);
  return () => {
    const n = (pedidos.get(id) ?? 1) - 1;
    if (n > 0) pedidos.set(id, n);
    else pedidos.delete(id);
  };
}
export const siguienteFoto = (): string | undefined => pedidos.keys().next().value;
export function guardarFoto(id: string, url: string, ms: number) {
  fotos.set(id, url);
  pedidos.delete(id);
  tiemposFoto.push(ms);
  for (const f of subs) f();
}
export const descartarPedido = (id: string) => pedidos.delete(id);
export const cuantasFotos = () => fotos.size;
export const fotoDe = (id: string) => fotos.get(id);

const suscribir = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
export const useFoto = (id: string) => useSyncExternalStore(suscribir, () => fotos.get(id));
