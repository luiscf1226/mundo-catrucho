// La cuadrícula de Tegucigalpa sin 3D: calles, cuadras, lugares y cómo caminar sin atravesar edificios.

/** calles cada 24 m, de -48 a 48 en x y en z; las cuadras quedan en ±12 y ±36 */
export const CALLES = [-48, -24, 0, 24, 48];
export const CUADRAS = [-36, -12, 12, 36];
export const ANCHO_CALLE = 9;
export const BORDE = 54;
export const MEDIA_CUADRA = (24 - ANCHO_CALLE) / 2;

export interface Lugar {
  nombre: string;
  /** punto en la calle frente al lugar */
  x: number;
  z: number;
  color: string;
}
/** cada lugar está en la calle al sur de su cuadra (cuadra + 12 en z) */
const lugar = (nombre: string, cx: number, cz: number, color: string): Lugar => ({ nombre, x: cx, z: cz + 12, color });
export const LUGARES: Lugar[] = [
  lugar('Parque Central', -12, -12, '#ffd166'),
  lugar('Estadio Nacional', 36, -36, '#4cc9f0'),
  lugar('Mercado San Isidro', -36, 36, '#f77f00'),
  lugar('Bulevar Morazán', 36, 12, '#c77dff'),
  lugar('Colonia Kennedy', -36, -36, '#80ed99'),
  lugar('Ciudad Universitaria', 12, 36, '#ff6b6b'),
  lugar('Paseo Liquidámbar', -12, 12, '#f4a261'),
  lugar('Basílica de Suyapa', 36, 36, '#90e0ef'),
  lugar('Barrio La Hoya', 12, -36, '#e9c46a'),
  lugar('El Obelisco', -36, 12, '#ade8f4'),
];
export const ESPECIALES = new Set(['-12,-12', '36,-36', '-36,36', '36,36']);

/** ¿el punto cae dentro del edificio de una cuadra? (sirve para que los NPC no atraviesen paredes) */
export function enEdificio(x: number, z: number, margen = 0.6) {
  const m = MEDIA_CUADRA - 1.2 + margen;
  return CUADRAS.some((cx) => Math.abs(x - cx) < m) && CUADRAS.some((cz) => Math.abs(z - cz) < m);
}
/** Punto al azar sobre una calle, lejos de los cruces: `x, z` en el carril y `ax, az` en la acera de al lado. */
export function parada(r: () => number) {
  const linea = CALLES[Math.floor(r() * CALLES.length)],
    lado = r() < 0.5 ? -1 : 1;
  let largo = 0;
  for (let i = 0; i < 12; i++) {
    largo = -BORDE + 6 + r() * (BORDE * 2 - 12);
    if (CALLES.every((c) => Math.abs(c - largo) > ANCHO_CALLE / 2 + 2)) break;
  }
  return r() < 0.5
    ? { x: linea + lado * 2.2, z: largo, ax: linea + lado * 5.6, az: largo }
    : { x: largo, z: linea + lado * 2.2, ax: largo, az: linea + lado * 5.6 };
}
export const rumbo = (dx: number, dz: number) => {
  const a = (Math.atan2(dx, -dz) * 180) / Math.PI;
  const nombres = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
  return nombres[Math.round(((a + 360) % 360) / 45) % 8];
};

/** Quien camina por la ciudad; `rodeo` recuerda por qué lado está rodeando un edificio. */
export interface Caminante {
  x: number;
  z: number;
  yaw: number;
  rodeo: { eje: 'x' | 'z'; s: number } | null;
}
/**
 * Camina hacia (tx, tz) sin atravesar edificios. Si choca, rodea la cuadra por el eje libre y sigue
 * por ese lado hasta pasar la esquina; recién ahí retoma el camino directo. Devuelve la distancia que faltaba.
 */
export function caminar(c: Caminante, tx: number, tz: number, vel: number, dt: number) {
  const dx = tx - c.x,
    dz = tz - c.z,
    d = Math.hypot(dx, dz);
  if (d < 0.01) return d;
  const paso = Math.min(d, vel * dt),
    mx = (dx / d) * paso,
    mz = (dz / d) * paso;
  c.yaw = Math.atan2(dx, dz);
  if (!enEdificio(c.x + mx, c.z + mz)) {
    c.rodeo = null;
    c.x += mx;
    c.z += mz;
    return d;
  }
  c.rodeo ??= enEdificio(c.x + mx, c.z) ? { eje: 'z', s: Math.sign(dz) || 1 } : { eje: 'x', s: Math.sign(dx) || 1 };
  if (c.rodeo.eje === 'z') {
    c.z += c.rodeo.s * paso;
    if (!enEdificio(c.x + mx, c.z)) c.x += mx;
  } else {
    c.x += c.rodeo.s * paso;
    if (!enEdificio(c.x, c.z + mz)) c.z += mz;
  }
  return d;
}
