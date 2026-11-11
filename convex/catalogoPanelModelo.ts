import type { Infer } from 'convex/values';
import type { entradaCatalogo } from './catalogoModelo';

export type Entrada = Infer<typeof entradaCatalogo>;
export type Catalogo = { version: number; departamentos: Entrada[] };
export const MAX_TEXTO = 1000;

export function contenidoIgual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const x = Object.entries(a),
    y = new Map(Object.entries(b));
  return x.length === y.size && x.every(([k, v]) => y.has(k) && contenidoIgual(v, y.get(k)));
}

function forma(base: unknown, nuevo: unknown, ruta: string): void {
  if (typeof base === 'string') {
    if (typeof nuevo !== 'string' || nuevo.length > MAX_TEXTO || (base.trim() && !nuevo.trim()))
      throw new Error(`${ruta}: escribí texto de 1 a ${MAX_TEXTO} caracteres.`);
  } else if (typeof base === 'number') {
    if (typeof nuevo !== 'number' || !Number.isFinite(nuevo) || Math.abs(nuevo) > 10000)
      throw new Error(`${ruta}: número inválido (máximo 10000).`);
  } else if (Array.isArray(base)) {
    if (!Array.isArray(nuevo) || nuevo.length !== base.length) throw new Error(`${ruta}: conservá los elementos.`);
    base.forEach((v, i) => forma(v, nuevo[i], `${ruta}.${i + 1}`));
  } else if (base && typeof base === 'object') {
    if (!nuevo || typeof nuevo !== 'object' || Array.isArray(nuevo)) throw new Error(`${ruta}: objeto inválido.`);
    const entries = Object.entries(nuevo);
    if (entries.length !== Object.keys(base).length) throw new Error(`${ruta}: no agregués campos.`);
    for (const [k, v] of Object.entries(base)) {
      if (!Object.hasOwn(nuevo, k)) throw new Error(`${ruta}: falta ${k}.`);
      forma(v, Object.fromEntries(entries)[k], `${ruta}.${k}`);
    }
  } else if (base !== nuevo) throw new Error(`${ruta}: valor fijo.`);
}

export function validarEdicion(base: Entrada, nuevo: Entrada, departamentos: string[]): void {
  const esperado: Entrada = JSON.parse(JSON.stringify(base));
  const b = base.datos.catalogo,
    n = nuevo.datos.catalogo,
    e = esperado.datos.catalogo;
  function filas<T extends object>(antes: T[], despues: T[], destino: T[], campos: (keyof T)[]) {
    if (antes.length !== despues.length) throw new Error('Conservá los elementos del catálogo.');
    antes.forEach((fila, i) => {
      for (const campo of campos.filter((campo) => Object.hasOwn(fila, campo))) {
        forma(fila[campo], despues[i][campo], String(campo));
        destino[i][campo] = despues[i][campo];
      }
    });
  }
  filas(b.lugares, n.lugares, e.lugares, ['name', 'nota']);
  filas(b.comidas, n.comidas, e.comidas, ['name', 'nota', 'lugar']);
  filas(b.palabras, n.palabras, e.palabras, ['dice', 'es']);
  filas(b.juegos, n.juegos, e.juegos, ['name', 'desc', 'guino', 'etapas', 'tema']);
  // estas llaves del tema eligen mecánica o escenario en el motor: no son texto para editar
  n.juegos.forEach((j, i) => {
    for (const k of ['variante', 'fondo', 'estilo', 'veh', 'via', 'montura', 'arma', 'con'])
      if (Object.hasOwn(b.juegos[i].tema, k) && j.tema[k] !== b.juegos[i].tema[k])
        throw new Error(`tema.${k}: valor fijo.`);
  });
  for (const j of n.juegos) {
    if (
      Array.isArray(j.tema.sitios) &&
      j.tema.sitios.some((id: unknown) => typeof id !== 'string' || !departamentos.includes(id))
    )
      throw new Error('El departamento del tema no existe.');
    if (!Number.isInteger(j.etapas) || j.etapas < 1 || j.etapas > 20) throw new Error('Etapas: usá de 1 a 20.');
  }
  const lugares = new Set(b.lugares.map((l) => l.id));
  if (n.comidas.some((c) => !lugares.has(c.lugar))) throw new Error('El lugar de la comida no existe.');
  for (const campo of ['turismo', 'locuras'] as const) {
    const antes = base.datos.editorial[campo],
      despues = nuevo.datos.editorial[campo];
    const campos = [...new Set(antes.flatMap((f) => Object.keys(f)))].filter(
      (k) => !['id', 'lugar', 'tipo'].includes(k),
    );
    filas(antes, despues, esperado.datos.editorial[campo], campos);
  }
  if (!contenidoIgual(esperado, nuevo))
    throw new Error('Solo podés editar contenido existente; los ids y motores son fijos.');
}
