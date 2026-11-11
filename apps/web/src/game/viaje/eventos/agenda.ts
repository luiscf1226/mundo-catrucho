import VIAJES from '../../../../../../docs/generador/viajes.json' with { type: 'json' };
import type { RutaViaje, TramoRuta } from '../routes';

export type Accion =
  | 'rodear'
  | 'esperar'
  | 'comprar'
  | 'frenar'
  | 'lluvia'
  | 'neblina'
  | 'documentos'
  | 'pagar'
  | 'radio'
  | 'amarres'
  | 'mirador'
  | 'ventilar'
  | 'equipaje'
  | 'destino';
export const acciones: Accion[] = [
  'rodear',
  'esperar',
  'comprar',
  'frenar',
  'lluvia',
  'neblina',
  'documentos',
  'pagar',
  'comprar',
  'radio',
  'rodear',
  'esperar',
  'comprar',
  'esperar',
  'amarres',
  'mirador',
  'ventilar',
  'esperar',
  'equipaje',
  'destino',
];
export interface Cita {
  id: string;
  tipo: 'evento' | 'parada';
  nombre: string;
  texto: string;
  accion: Accion;
  tramo: TramoRuta;
  km: number | null;
  segundo: number;
}
export function admiteEvento(indice: number, t: TramoRuta) {
  const e = VIAJES.eventosDeCarretera[indice];
  if (!e || (e.donde !== 'todas' && !e.donde.includes(t.a) && !e.donde.includes(t.de))) return false;
  if (indice === 17) return t.medio === 'ferry' || t.medio === 'lancha';
  if (indice === 18) return t.medio === 'avioneta' || t.medio === 'lancha';
  if (t.medio !== 'carretera') return false;
  if ([0, 5, 15].includes(indice)) return ['montana', 'pinar'].includes(t.paisaje) || /ladera|cafetal/.test(t.nombre);
  if ([1, 14].includes(indice)) return /valle|llanura|finca|cultivo|plantaci/.test(t.nombre);
  if (indice === 7) return t.carretera.includes('CA-5 norte');
  if ([3, 6].includes(indice)) return t.paisaje === 'ciudad' || /valle|aproximación/.test(t.nombre);
  if (indice === 11) return t.paisaje === 'puente';
  return true;
}
export function crearAgenda(ruta: RutaViaje, semilla = 0): Cita[] {
  const citas: Cita[] = [];
  const poner = (t: TramoRuta, fraccion: number, cita: Omit<Cita, 'tramo' | 'km' | 'segundo'>) => {
    citas.push({
      ...cita,
      tramo: t,
      km: t.desdeKm === null || t.hastaKm === null ? null : t.desdeKm + (t.hastaKm - t.desdeKm) * fraccion,
      segundo: ((t.desdeHoras + t.horas * fraccion) / ruta.horas) * ruta.segundos,
    });
  };
  const fuentes = new Set<TramoRuta['fuente']>();
  for (const t of ruta.tramos) {
    if (t.medio !== 'carretera' || fuentes.has(t.fuente)) continue;
    fuentes.add(t.fuente);
    const ts = ruta.tramos.filter((p) => p.fuente === t.fuente);
    t.fuente.paradas.forEach((p, i) => {
      const palabras = p.nombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .split(/\W+/)
        .filter((palabra) => palabra.length > 4);
      const tramo =
        ts.find((tramo) =>
          palabras.some((palabra) =>
            tramo.nombre
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .includes(palabra),
          ),
        ) ??
        ts[Math.floor(ts.length / 2)] ??
        t;
      poner(tramo, 0.6, {
        id: `parada-${t.id}-${i}`,
        tipo: 'parada',
        nombre: p.nombre,
        texto: `${p.queHay}. ¡Suba, suba!`,
        accion: 'comprar',
      });
    });
  }
  const prioridades =
    semilla === 0
      ? [0, 5, 7, 1, 6, 3, 16, 4, 13, 17, 18, 2, 8, 9, 10, 11, 12, 14, 15, 19]
      : Array.from({ length: 20 }, (_, i) => (i + semilla) % 20);
  const usados = new Set<string>();
  for (const i of prioridades) {
    const candidatos = ruta.tramos.filter((t) => admiteEvento(i, t));
    const t = candidatos.find((p) => !usados.has(p.id)) ?? candidatos[0];
    if (!t) continue;
    const e = VIAJES.eventosDeCarretera[i];
    poner(t, 0.25 + (usados.has(t.id) ? 0.55 : 0), {
      id: `evento-${i}-${t.id}`,
      tipo: 'evento',
      nombre: e.nombre,
      texto: e.queEs,
      accion: acciones[i],
    });
    usados.add(t.id);
    if (citas.filter((c) => c.tipo === 'evento').length === 4) break;
  }
  return citas.sort((a, b) => a.segundo - b.segundo);
}
export function limiteDeEvento(accion: Accion, x: number) {
  if (['esperar', 'comprar', 'documentos', 'pagar', 'amarres', 'equipaje'].includes(accion)) return 0;
  if (accion === 'rodear') return Math.abs(x) > 3 ? 9 : 2;
  return accion === 'neblina' || accion === 'lluvia' ? 7 : 5;
}
