import { catDe } from '../../../core/data';
import type { Cita } from '../eventos/agenda';
export function comidaDe(cita: Cita) {
  const dept = cita.tramo.a;
  const comidas = catDe(dept).comidas;
  return comidas.slice(0, 2).map((c, i) => ({ id: `${cita.id}-${i}`, nombre: c.name, dept, precio: 5 + i * 3 }));
}
