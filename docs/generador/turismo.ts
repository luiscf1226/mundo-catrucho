import contenido from './contenido.json';

export const TURISMO = Object.entries(contenido).flatMap(([dept, datos]) => datos.turismo.map((p) => ({ ...p, dept })));
export type LugarTuristico = (typeof TURISMO)[number];
export type RecuerdoTuristico = { id: string; completa: boolean };
export function actividadDe(tipo: string) {
  if (tipo === 'mirador') return 'subir';
  if (tipo === 'comida') return 'probar';
  if (tipo === 'oficio' || tipo === 'festividad') return 'ayudar';
  return 'foto';
}
export const turismoById = (id: string) => TURISMO.find((p) => p.id === id);
