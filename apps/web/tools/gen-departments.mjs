// Genera shared/data/departments.json: atributos escritos a mano + contornos reales (Natural Earth, dominio público).
// Uso: node tools/gen-departments.mjs <hnd.json>   (hnd.json = [{name, geometry}] filtrado de ne_10m_admin_1)
import { readFileSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const D = [
  [
    'atlantida',
    'Atlántida',
    'La Ceiba',
    'costa',
    'playa',
    'Malecón de La Ceiba y Pico Bonito',
    '#19b5c8',
    '#ffd166',
    'La Ceiba celebra cada mayo el Carnaval de la Amistad, el más grande de Honduras.',
    'Máscara de carnaval',
  ],
  [
    'choluteca',
    'Choluteca',
    'Choluteca',
    'sur',
    'puente',
    'Puente colgante de Choluteca',
    '#e9a23b',
    '#c8553d',
    'El puente colgante de Choluteca, de los años 30, es el símbolo del sur de Honduras.',
    'Semilla de marañón',
  ],
  [
    'colon',
    'Colón',
    'Trujillo',
    'costa',
    'fortaleza',
    'Fortaleza de Santa Bárbara',
    '#2a9d8f',
    '#e9c46a',
    'Cristóbal Colón llegó a tierra firme cerca de Trujillo en 1502, en su cuarto viaje.',
    'Catalejo antiguo',
  ],
  [
    'comayagua',
    'Comayagua',
    'Comayagua',
    'valle',
    'catedral',
    'Catedral de Comayagua',
    '#f4a261',
    '#f7f1e3',
    'El reloj de la catedral de Comayagua es uno de los más antiguos de América que todavía funciona.',
    'Engranaje del reloj',
  ],
  [
    'copan',
    'Copán',
    'Santa Rosa de Copán',
    'valle',
    'ruinas',
    'Copán Ruinas',
    '#6a994e',
    '#bc6c25',
    'La Escalinata Jeroglífica de Copán tiene más de 2,000 glifos: el texto maya más largo que se conoce.',
    'Jade maya',
  ],
  [
    'cortes',
    'Cortés',
    'San Pedro Sula',
    'lago',
    'lago',
    'Lago de Yojoa',
    '#3a86ff',
    '#8ecae6',
    'El Lago de Yojoa es el lago natural más grande de Honduras.',
    'Anzuelo de plata',
  ],
  [
    'elparaiso',
    'El Paraíso',
    'Yuscarán',
    'montana',
    'pueblo',
    'Yuscarán, pueblo minero',
    '#d4a373',
    '#ffe066',
    'Danlí celebra cada agosto el Festival Nacional del Maíz.',
    'Mazorca dorada',
  ],
  [
    'franciscomorazan',
    'Francisco Morazán',
    'Tegucigalpa',
    'capital',
    'cristo',
    'Cristo del Picacho',
    '#00a3d7',
    '#ffffff',
    'Tegucigalpa es la capital de Honduras. Su nombre suele traducirse como «cerro de plata».',
    'Pepita de plata',
  ],
  [
    'graciasadios',
    'Gracias a Dios',
    'Puerto Lempira',
    'selva',
    'rio',
    'Río Plátano',
    '#2d6a4f',
    '#95d5b2',
    'La Biosfera del Río Plátano es Patrimonio de la Humanidad de la UNESCO.',
    'Pluma de guara roja',
  ],
  [
    'intibuca',
    'Intibucá',
    'La Esperanza',
    'montana',
    'mercado',
    'Mercado lenca de La Esperanza',
    '#7b2cbf',
    '#ffb703',
    'La Esperanza es una de las ciudades más altas y frías de Honduras.',
    'Canasta lenca',
  ],
  [
    'islas',
    'Islas de la Bahía',
    'Roatán',
    'isla',
    'arrecife',
    'Arrecife de Roatán',
    '#00b4d8',
    '#ffe8a3',
    'Roatán está sobre el Arrecife Mesoamericano, el segundo más grande del mundo.',
    'Concha de caracol',
  ],
  [
    'lapaz',
    'La Paz',
    'La Paz',
    'montana',
    'cafetal',
    'Cafetales de Marcala',
    '#7f5539',
    '#d62828',
    'El café de Marcala fue el primero de Honduras con denominación de origen.',
    'Grano de café',
  ],
  [
    'lempira',
    'Lempira',
    'Gracias',
    'montana',
    'fuerte',
    'Fuerte San Cristóbal',
    '#588157',
    '#dda15e',
    'El departamento lleva el nombre de Lempira, líder lenca que resistió la conquista en 1537. La moneda de Honduras también.',
    'Penacho lenca',
  ],
  [
    'ocotepeque',
    'Ocotepeque',
    'Nueva Ocotepeque',
    'bosque',
    'bosque',
    'Reserva Montecristo-Trifinio',
    '#386641',
    '#a7c957',
    'En el cerro Montecristo se juntan Honduras, Guatemala y El Salvador.',
    'Piña de ocote',
  ],
  [
    'olancho',
    'Olancho',
    'Juticalpa',
    'valle',
    'cuevas',
    'Cuevas de Talgua',
    '#bc6c25',
    '#fefae0',
    'Olancho es el departamento más grande de Honduras. En las Cuevas de Talgua hay restos de hace unos 3,000 años.',
    'Cristal de la cueva',
  ],
  [
    'santabarbara',
    'Santa Bárbara',
    'Santa Bárbara',
    'montana',
    'artesania',
    'Artesanías de junco',
    '#e76f51',
    '#f4e285',
    'Santa Bárbara es famosa por sus sombreros y artesanías tejidas de junco.',
    'Sombrero de junco',
  ],
  [
    'valle',
    'Valle',
    'Nacaome',
    'sur',
    'volcan',
    'Isla del Tigre, Amapala',
    '#e85d04',
    '#48cae4',
    'Amapala, en la Isla del Tigre, fue el principal puerto de Honduras en el Pacífico.',
    'Caracola del golfo',
  ],
  [
    'yoro',
    'Yoro',
    'Yoro',
    'valle',
    'lluvia',
    'La Lluvia de Peces',
    '#4d908e',
    '#f9c74f',
    'En Yoro se cuenta que casi cada año, entre mayo y julio, una tormenta deja peces vivos en el suelo.',
    'Pececito de plata',
  ],
];
// proyección simple: x = lon*cos(lat0), y = -lat; caja fija de Honduras continental + islas cercanas
const LAT0 = (15 * Math.PI) / 180,
  K = Math.cos(LAT0);
const LON0 = -89.45,
  LON1 = -83.05,
  LATN = 16.6,
  LATS = 12.9,
  W = 1000;
const S = W / ((LON1 - LON0) * K),
  H = Math.round((LATN - LATS) * S);
const proj = ([lon, lat]) => [Math.round((lon - LON0) * K * S), Math.round((LATN - lat) * S)];
const area = (r) => {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i],
      [x2, y2] = r[(i + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};
const dp = (pts, eps) => {
  // Douglas-Peucker
  if (pts.length < 3) return pts;
  let dm = 0,
    idx = 0;
  const [ax, ay] = pts[0],
    [bx, by] = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const L = Math.hypot(bx - ax, by - ay) || 1e-9;
    const d = Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / L;
    if (d > dm) {
      dm = d;
      idx = i;
    }
  }
  return dm > eps
    ? dp(pts.slice(0, idx + 1), eps)
        .slice(0, -1)
        .concat(dp(pts.slice(idx), eps))
    : [pts[0], pts[pts.length - 1]];
};
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const out = D.map(([id, name, cabecera, biome, kind, lmName, c1, c2, fact, collectible]) => {
  const f = src.find((x) => norm(x.name) === norm(name));
  if (!f) throw new Error(`sin contorno: ${name}`);
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let rings = polys
    .map((p) => p[0].map(proj))
    .filter((r) => r.every(([x, y]) => x >= -20 && x <= W + 20 && y >= -20 && y <= H + 20));
  const simplify = (r) => {
    // anillo cerrado: se parte en el punto más lejano del primero para que Douglas-Peucker tenga extremos distintos
    const o = r[0];
    let far = 0,
      fd = 0;
    r.forEach(([x, y], i) => {
      const d = Math.hypot(x - o[0], y - o[1]);
      if (d > fd) {
        fd = d;
        far = i;
      }
    });
    return dp(r.slice(0, far + 1), 1.2)
      .slice(0, -1)
      .concat(dp(r.slice(far), 1.2))
      .slice(0, -1);
  };
  rings = rings
    .map(simplify)
    .filter((r) => r.length >= 4 && Math.abs(area(r)) > 12)
    .sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const main = rings[0];
  let cx = 0,
    cy = 0,
    A = 0;
  for (let i = 0; i < main.length; i++) {
    const [x1, y1] = main[i],
      [x2, y2] = main[(i + 1) % main.length];
    const k = x1 * y2 - x2 * y1;
    A += k;
    cx += (x1 + x2) * k;
    cy += (y1 + y2) * k;
  }
  return {
    id,
    name,
    cabecera,
    biome,
    landmark: { kind, name: lmName },
    colors: [c1, c2],
    fact,
    collectible,
    map: { center: [Math.round(cx / (3 * A)), Math.round(cy / (3 * A))], rings },
  };
});
writeFileSync(
  'shared/data/departments.json',
  JSON.stringify({ viewBox: [W, H], credit: 'Contornos: Natural Earth (dominio público)', departments: out }),
);
console.log(
  'ok',
  out.length,
  'viewBox',
  W,
  H,
  'bytes',
  JSON.stringify(out).length,
  out
    .map((d) => `${d.id}:${d.map.rings.length}r/${d.map.rings.reduce((n, r) => n + r.length, 0)}p@${d.map.center}`)
    .join(' '),
);
