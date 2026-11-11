import datos from '../../../../../docs/generador/viajes.json' with { type: 'json' };

export const VIAJES = datos;
export type Paisaje = 'valle' | 'montana' | 'costa' | 'pinar' | 'ciudad' | 'puente' | 'lago' | 'mar';
export type RutaFuente = (typeof datos.rutas)[number];
export interface TramoRuta {
  id: string;
  fuente: RutaFuente;
  de: string;
  a: string;
  salida: string;
  llegada: string;
  carretera: string;
  medio: string;
  paisaje: Paisaje;
  nombre: string;
  desdeKm: number | null;
  hastaKm: number | null;
  desdeHoras: number;
  horas: number;
}
export interface RutaViaje {
  de: string;
  a: string;
  tramos: TramoRuta[];
  kilometros: number | null;
  horas: number;
  segundos: number;
}
export interface LineaViaje {
  posicion: number;
  tramo: TramoRuta | null;
  indice: number;
  posicionTramo: number;
  kilometros: number | null;
  kilometrosTramo: number | null;
}
export function paisajeDe(nombre: string): Paisaje {
  const n = nombre.toLowerCase();
  if (/puente|cruce del|ríos/.test(n)) return 'puente';
  if (/mar abierto/.test(n)) return 'mar';
  if (/lago|laguna|yojoa/.test(n)) return 'lago';
  if (/costa|caribe|litoral|cayo|muelle|utila/.test(n)) return 'costa';
  if (/pino|pinar|zambrano/.test(n)) return 'pinar';
  if (/montaña|ladera|nublado|altiplano|celaque|siguatepeque|taulabé/.test(n)) return 'montana';
  if (/entrada|cabecera|pueblo|quimistán/.test(n)) return 'ciudad';
  return 'valle';
}
export function segundosDeViaje(horas: number) {
  return Math.max(datos.reglasDeViaje.segundosMinimos, Math.min(datos.reglasDeViaje.segundosMaximos, horas * 25));
}

// Red departamental; cada arista conserva sus terminales, incluso al invertirla.
export function resolverRuta(de: string, a: string, medios = ['carretera']): RutaViaje | null {
  const pendientes = [{ nodo: de, horas: 0, pasos: [] as { fuente: RutaFuente; inversa: boolean; id: number }[] }];
  const vistos = new Set<string>();
  while (pendientes.length) {
    pendientes.sort((x, y) => x.horas - y.horas);
    const actual = pendientes.shift();
    if (!actual || vistos.has(actual.nodo)) continue;
    if (actual.nodo === a) {
      let horas = 0;
      let km: number | null = 0;
      const tramos: TramoRuta[] = [];
      for (const { fuente, inversa, id } of actual.pasos) {
        const paisajes = inversa ? fuente.paisaje.toReversed() : fuente.paisaje;
        for (const [i, nombre] of paisajes.entries()) {
          const distancia = fuente.kilometrosReales === null ? null : fuente.kilometrosReales / paisajes.length;
          const hastaKm: number | null = km === null || distancia === null ? null : km + distancia;
          tramos.push({
            id: `${id}-${inversa ? 'vuelta' : 'ida'}-${i}`,
            fuente,
            de: inversa ? fuente.a : fuente.de,
            a: inversa ? fuente.de : fuente.a,
            salida: inversa ? fuente.llegada : fuente.salida,
            llegada: inversa ? fuente.salida : fuente.llegada,
            carretera: fuente.carretera,
            medio: fuente.medio,
            nombre,
            paisaje: paisajeDe(nombre),
            desdeKm: km,
            hastaKm,
            desdeHoras: horas,
            horas: fuente.horasReales / paisajes.length,
          });
          km = hastaKm;
          horas += fuente.horasReales / paisajes.length;
        }
      }
      return { de, a, tramos, kilometros: km, horas, segundos: segundosDeViaje(horas) };
    }
    vistos.add(actual.nodo);
    datos.rutas.forEach((fuente, id) => {
      if (!medios.includes(fuente.medio)) return;
      const inversa = fuente.a === actual.nodo && fuente.bidireccional;
      if (fuente.de !== actual.nodo && !inversa) return;
      pendientes.push({
        nodo: inversa ? fuente.de : fuente.a,
        horas: actual.horas + fuente.horasReales,
        pasos: [...actual.pasos, { fuente, inversa, id }],
      });
    });
  }
  return null;
}
export function lineaDeViaje(ruta: RutaViaje, segundos: number): LineaViaje {
  const posicion = Math.max(0, Math.min(1, segundos / ruta.segundos));
  const hora = posicion * ruta.horas;
  const encontrado = ruta.tramos.findIndex((t) => hora < t.desdeHoras + t.horas);
  const indice = encontrado < 0 ? ruta.tramos.length - 1 : encontrado;
  const tramo = ruta.tramos[indice] ?? null;
  const posicionTramo = tramo ? Math.max(0, Math.min(1, (hora - tramo.desdeHoras) / tramo.horas)) : posicion;
  const kilometrosTramo =
    tramo?.desdeKm != null && tramo.hastaKm != null ? (tramo.hastaKm - tramo.desdeKm) * posicionTramo : null;
  const kilometros = tramo
    ? tramo.desdeKm === null || kilometrosTramo === null
      ? null
      : tramo.desdeKm + kilometrosTramo
    : 0;
  return { posicion, tramo, indice, posicionTramo, kilometros, kilometrosTramo };
}
