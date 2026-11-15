export type Ventana =
  | { tipo: 'fija'; desde: [number, number]; hasta: [number, number] }
  | { tipo: 'pascua'; desde: number; hasta: number }
  | { tipo: 'morazanica' };
export interface Evento {
  id: string;
  nombre: string;
  lugar: string;
  dept: string | null;
  fuente: string;
  ventana: Ventana;
  estilo: 'feria' | 'patrio' | 'luces' | 'alfombra';
  color: string;
  juego: string;
}

export const EVENTOS: Evento[] = [
  {
    id: 'juniana',
    nombre: 'Feria Juniana',
    lugar: 'San Pedro Sula',
    dept: 'cortes',
    fuente:
      'https://policianacional.gob.hn/policia-nacional-garantizara-la-seguridad-durante-el-desarrollo-de-la-feria-juniana-en-san-pedro-sula/',
    ventana: { tipo: 'fija', desde: [6, 1], hasta: [6, 30] },
    estilo: 'feria',
    color: '#f5ad38',
    juego: 'cortes.pollo-chuco-en-equilibrio',
  },
  {
    id: 'carnaval',
    nombre: 'Carnaval de La Ceiba',
    lugar: 'La Ceiba',
    dept: 'atlantida',
    fuente: 'https://alcaldialaceiba.hn/turismo',
    ventana: { tipo: 'fija', desde: [5, 1], hasta: [5, 31] },
    estilo: 'feria',
    color: '#e76bb2',
    juego: 'atlantida.punta-en-sambo-creek',
  },
  {
    id: 'independencia',
    nombre: '15 de septiembre',
    lugar: 'Honduras · desfiles de Independencia',
    dept: null,
    fuente:
      'https://www.trabajo.gob.hn/wp-content/uploads/2016/07/PROCURADURIA_GENERAL_DEL_TRABAJO-_ARTICULO_644_CODIGO_DEL_TRABAJO.pdf',
    ventana: { tipo: 'fija', desde: [9, 15], hasta: [9, 15] },
    estilo: 'patrio',
    color: '#19b8d1',
    juego: 'franciscomorazan.rapidito',
  },
  {
    id: 'morazanica',
    nombre: 'Semana Morazánica',
    lugar: 'Honduras',
    dept: null,
    fuente: 'https://www.tsc.gob.hn/web/leyes/Decreto-126-2020.pdf',
    ventana: { tipo: 'morazanica' },
    estilo: 'patrio',
    color: '#19b8d1',
    juego: 'franciscomorazan.rapidito',
  },
  {
    id: 'maiz',
    nombre: 'Feria del Maíz',
    lugar: 'Danlí · Festival del Maíz',
    dept: 'elparaiso',
    fuente:
      'https://www.sgjd.gob.hn/biblioteca-virtual/docspdm/linea-base/07-el-paraiso/1440-linea-base-danli-el-paraiso/file',
    ventana: { tipo: 'fija', desde: [8, 1], hasta: [8, 31] },
    estilo: 'feria',
    color: '#f6d55c',
    juego: 'elparaiso.montucas',
  },
  {
    id: 'navidad',
    nombre: 'Navidad y Año Nuevo',
    lugar: 'Honduras',
    dept: null,
    fuente:
      'https://www.trabajo.gob.hn/wp-content/uploads/2016/07/PROCURADURIA_GENERAL_DEL_TRABAJO-_ARTICULO_644_CODIGO_DEL_TRABAJO.pdf',
    ventana: { tipo: 'fija', desde: [12, 1], hasta: [1, 1] },
    estilo: 'luces',
    color: '#ef655a',
    juego: 'elparaiso.montucas',
  },
  {
    id: 'alfombras',
    nombre: 'Alfombras de Semana Santa',
    lugar: 'Comayagua',
    dept: 'comayagua',
    fuente: 'https://portalunico.iaip.gob.hn/ver_archivo/MjAyMTQ5OA%3D%3D',
    ventana: { tipo: 'pascua', desde: -7, hasta: 0 },
    estilo: 'alfombra',
    color: '#b27bdc',
    juego: 'comayagua.alfombra-que-deja-pasar',
  },
  {
    id: 'inmaculada',
    nombre: 'Feria de la Inmaculada',
    lugar: 'Danlí',
    dept: 'elparaiso',
    fuente:
      'https://www.sgjd.gob.hn/biblioteca-virtual/docspdm/linea-base/07-el-paraiso/1440-linea-base-danli-el-paraiso/file',
    ventana: { tipo: 'fija', desde: [12, 5], hasta: [12, 8] },
    estilo: 'feria',
    color: '#8dbbe8',
    juego: 'elparaiso.montucas',
  },
];

// Cómputo gregoriano de Meeus/Jones/Butcher. UTC solo para aritmética de días civiles.
export function pascua(ano: number): Date {
  const a = ano % 19,
    b = Math.floor(ano / 100),
    c = ano % 100;
  const d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451),
    n = h + l - 7 * m + 114;
  return new Date(Date.UTC(ano, Math.floor(n / 31) - 1, (n % 31) + 1));
}

export function eventosEn(fecha: string, dept: string | null): Evento[] {
  const [ano, mes, dia] = fecha.split('-').map(Number);
  const hoy = Date.UTC(ano, mes - 1, dia),
    md = mes * 100 + dia;
  return EVENTOS.filter((evento) => {
    if (dept !== null && evento.dept !== null && evento.dept !== dept) return false;
    const v = evento.ventana;
    if (v.tipo === 'fija') {
      const inicio = v.desde[0] * 100 + v.desde[1],
        fin = v.hasta[0] * 100 + v.hasta[1];
      return inicio <= fin ? md >= inicio && md <= fin : md >= inicio || md <= fin;
    }
    if (v.tipo === 'pascua') {
      const dias = (hoy - pascua(ano).getTime()) / 86400000;
      return dias >= v.desde && dias <= v.hasta;
    }
    const primero = new Date(Date.UTC(ano, 9, 1)).getUTCDay();
    const inicio = Date.UTC(ano, 9, 1 + ((3 - primero + 7) % 7));
    return hoy >= inicio && hoy <= inicio + 3 * 86400000;
  });
}
