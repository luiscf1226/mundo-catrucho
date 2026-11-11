import { TRANSPORTES } from '../../core/data';
import type { Vehiculo } from '../../core/types';
import { resolverRuta, VIAJES } from './routes';

export const OPCIONES = [
  ...TRANSPORTES,
  {
    id: 'pickup',
    name: 'Pickup compartido',
    precio: 6,
    icon: '🛻',
    nota: 'Gente atrás en bancos asegurados. Frená antes de doblar.',
  },
  { id: 'mototaxi', name: 'Mototaxi', precio: 3, icon: '🛺', nota: 'Vuelta local. Tres ruedas, girá suave.' },
  {
    id: 'lancha',
    name: 'Lancha con capitán',
    precio: 14,
    icon: '🚤',
    nota: 'A Cayos Cochinos. Corregí el rumbo con el oleaje.',
  },
  {
    id: 'ferry',
    name: 'Barco a las Islas',
    precio: 10,
    icon: '🛳️',
    nota: 'Giro amplio y frenado largo. Capitán virtual.',
  },
  {
    id: 'avioneta',
    name: 'Avioneta',
    precio: 20,
    icon: '🛩️',
    nota: 'A Puerto Lempira. Rumbo asistido, sin detenerte en el aire.',
  },
  {
    id: 'cayuco',
    name: 'Cayuco de río',
    precio: 1,
    icon: '🛶',
    nota: 'Recorrido local con guía. Paladas y corriente.',
  },
  {
    id: 'bicitaxi',
    name: 'Bicitaxi',
    precio: 1,
    icon: '🚲',
    nota: 'Vuelta local en Valle. Pedaleá y frená antes de doblar.',
  },
] satisfies { id: Vehiculo; name: string; precio: number; icon: string; nota: string }[];

export function rutaParaVehiculo(veh: Vehiculo, de: string, a: string) {
  const local = ['mototaxi', 'bicitaxi', 'cayuco'].includes(veh);
  if (local) {
    const lugares = VIAJES.vehiculos.find((v) => v.id === veh)?.donde ?? [];
    return de === a && lugares.includes(de) ? resolverRuta(de, a) : null;
  }
  if (['lancha', 'ferry', 'avioneta'].includes(veh)) {
    const ruta = resolverRuta(de, a, ['carretera', veh]);
    return ruta?.tramos.some((t) => t.medio === veh) ? ruta : null;
  }
  return resolverRuta(de, a);
}
