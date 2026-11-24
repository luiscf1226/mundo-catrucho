// Lugares famosos de Honduras con edificio propio (en vez de la iglesia o el fuerte genérico de la estación):
// Basílica de Suyapa, Castillo Bográn, Ciudad Blanca, Fortaleza de San Fernando de Omoa, la Escalinata
// Jeroglífica y la Gran Plaza de Copán, y la Catedral de Comayagua con su reloj. Coordenadas locales del decorado
// de la estación: apoyado en y = 0, fachada hacia +Z, dentro de x ∈ [−9, 9] y z ∈ [−7.5, 3.5] para no tapar
// los puestos ni el camino. Todo se fusiona en <Build>: el detalle cuesta vértices, no llamadas de dibujo.
import { arco, campanario, columna, detalleFino } from './casas';
import { bl, bx, cy, type Pc, PI, place, py, rng } from './lib';
import { cannon, garita, planta, stairs } from './parts';

const nf = (o: Pc): Pc => ({ ...o, solid: false });
const NEGRO = '#1d1f22';

/** Ventana gótica (lanceta): vidrio con arco apuntado, marco de piedra y parteluz. (x, y) = centro del rectángulo. */
function lanceta(x: number, y: number, z: number, w: number, h: number, marco: string, em = 0.6): Pc[] {
  return [
    bx(x, y, z, w + 0.24, h, 0.06, 'stucco', marco, { solid: false }),
    py(x, y + h / 2, z, w + 0.24, w * 0.9 + 0.2, 0.06, 'stucco', marco),
    bx(x, y, z + 0.03, w, h - 0.1, 0.04, 'plastic', '#2c3d55', { solid: false, em }),
    py(x, y + h / 2 - 0.05, z + 0.03, w, w * 0.85, 0.04, 'plastic', '#2c3d55', { em }),
    bx(x, y + 0.1, z + 0.06, 0.05, h, 0.03, 'stone', marco, { solid: false }),
  ];
}
/** Rosetón: anillo de piedra, vitral que se enciende de noche, radios y un ojo al centro. Mira a +Z. */
function roseton(x: number, y: number, z: number, r: number, marco: string, fino: boolean): Pc[] {
  const out: Pc[] = [
    cy(x, y, z, r + 0.22, 0.1, 'stucco', marco, { e: [PI / 2, 0, 0], n: 24, solid: false }),
    cy(x, y, z + 0.05, r, 0.06, 'plastic', '#35507a', { e: [PI / 2, 0, 0], n: 24, solid: false, em: 0.9 }),
    cy(x, y, z + 0.1, r * 0.22, 0.06, 'stucco', marco, { e: [PI / 2, 0, 0], n: 12, solid: false }),
  ];
  const n = fino ? 12 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * PI;
    out.push(bx(x, y, z + 0.09, 0.07, r * 2, 0.04, 'stone', marco, { e: [0, 0, a], solid: false }));
  }
  if (fino)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2 + PI / 12;
      out.push(
        cy(x + Math.sin(a) * r * 0.66, y + Math.cos(a) * r * 0.66, z + 0.09, r * 0.17, 0.04, 'stone', marco, {
          e: [PI / 2, 0, 0],
          n: 10,
          rt: 0.6,
          solid: false,
        }),
      );
    }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
/** Basílica de Suyapa (Tegucigalpa): fachada blanca neogótica con dos torres altas rematadas en aguja, rosetón,
 *  tres portadas en arco apuntado y la escalinata de la entrada. */
function suyapa(): Pc[] {
  const fino = detalleFino(),
    W = '#f3f0e8',
    T = '#d8d4c8',
    AG = '#7f93a6',
    out: Pc[] = [];
  // escalinata y atrio
  out.push(
    ...place(stairs(9.6, 4, 0.25, 0.42, 'stone', '#d6d0c2'), 0, 0, 3.4),
    bx(0, 0.5, 1.15, 13, 1, 1.3, 'stone', '#cfc8b8'),
    ...[-1, 1].flatMap((s) => [
      bx(s * 5.2, 1.0, 2.6, 0.5, 0.9, 1.9, 'stone', '#cfc8b8'),
      bl(s * 5.2, 1.65, 3.4, 0.24, 'stone', T, { n: 8 }),
    ]),
  );
  // nave y techo de dos aguas
  out.push(
    bx(0, 6.5, -3.4, 8.6, 11, 7.6, 'stucco', W),
    bx(0, 12.2, -3.4, 9.2, 0.4, 8.2, 'stucco', T, { solid: false }),
    ...[-1, 1].map((s) => bx(s * 2.35, 13.75, -3.6, 5.3, 0.25, 7.9, 'roof', '#7d8b96', { e: [0, 0, -s * 0.62] })),
    ...[-2.4, -4.8].flatMap((z) =>
      [-1, 1].flatMap((s) => lanceta(s * 4.32, 7, z, 0.9, 3.2, T).map((q) => rotSide(q, s * 4.32, z, s))),
    ),
  );
  // fachada entre torres: muro, piñón triangular con cruz
  out.push(
    bx(0, 7, 0.6, 6.8, 14, 0.6, 'stucco', W),
    py(0, 14, 0.6, 6.8, 3, 0.6, 'stucco', W),
    bx(0, 14.1, 0.95, 7.2, 0.3, 0.2, 'stucco', T, { solid: false }),
    bx(0, 17.5, 0.75, 0.22, 1.6, 0.2, 'stucco', T, { solid: false }),
    bx(0, 17.8, 0.75, 0.9, 0.22, 0.2, 'stucco', T, { solid: false }),
  );
  // portada mayor (arco apuntado con arquivoltas), puertas de madera y galería de arquitos encima
  out.push(
    bx(0, 2.9, 0.95, 3.3, 3.8, 0.12, 'stucco', T, { solid: false }),
    py(0, 4.8, 0.95, 3.3, 2.2, 0.12, 'stucco', T),
    bx(0, 2.6, 1.02, 2.3, 3.2, 0.08, 'wood', '#4a3020', { solid: false }),
    py(0, 4.2, 1.02, 2.3, 1.5, 0.08, 'plastic', '#2c3d55', { em: 0.5 }),
    bx(0, 2.6, 1.08, 0.06, 3.2, 0.04, 'metal', '#2b2b2b', { solid: false }),
    ...[-1, 1].flatMap((s) => [
      cy(s * 1.45, 2.6, 1.05, 0.12, 3.6, 'stucco', W, { n: 8, solid: false }),
      cy(s * 1.75, 2.6, 1.0, 0.12, 3.6, 'stucco', W, { n: 8, solid: false }),
    ]),
  );
  for (let i = 0; i < 7; i++) out.push(...lanceta(-2.4 + i * 0.8, 7.35, 0.92, 0.42, 0.9, T, 0.5));
  out.push(bx(0, 6.75, 0.98, 6.6, 0.18, 0.2, 'stucco', T, { solid: false }));
  out.push(...roseton(0, 10.05, 0.92, 1.35, T, fino));
  out.push(bx(0, 11.95, 0.98, 6.6, 0.2, 0.2, 'stucco', T, { solid: false }));
  // torres: cuerpo con contrafuertes, campanario con lancetas en las cuatro caras, tambor octogonal y aguja
  for (const s of [-1, 1]) {
    const x = s * 4.6,
      z = 0.3;
    out.push(bx(x, 9.5, z, 2.6, 19, 2.6, 'stucco', W));
    for (const k of [-1, 1])
      out.push(
        bx(x + k * 1.3, 7, z + 1.3, 0.42, 14, 0.42, 'stucco', T, { solid: false }),
        py(x + k * 1.3, 14, z + 1.3, 0.42, 0.7, 0.42, 'stucco', T),
      );
    // portada lateral y ventanas de la torre
    out.push(
      bx(x, 2.2, z + 1.33, 1.3, 2.4, 0.06, 'wood', '#4a3020', { solid: false }),
      py(x, 3.4, z + 1.33, 1.3, 0.9, 0.06, 'stucco', T),
      ...lanceta(x, 6.4, z + 1.32, 0.6, 1.8, T),
      ...lanceta(x, 10.4, z + 1.32, 0.6, 1.8, T),
    );
    for (const y of [4.5, 8.6, 12.6, 15.1, 18.9])
      out.push(bx(x, y, z, 2.85, 0.22, 2.85, 'stucco', T, { solid: false }));
    for (let k = 0; k < 4; k++) {
      const r = (k * PI) / 2;
      out.push(...place(lanceta(0, 16.8, 1.31, 0.7, 2.4, T, 0.2), x, 0, z, r));
    }
    // pináculos en las esquinas del campanario
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        out.push(
          cy(x + sx * 1.25, 19.6, z + sz * 1.25, 0.14, 1.1, 'stucco', T, { n: 6, solid: false }),
          cy(x + sx * 1.25, 20.6, z + sz * 1.25, 0.16, 1, 'roof', AG, { rt: 0, n: 6, solid: false }),
        );
    out.push(
      cy(x, 19.7, z, 1.15, 1.3, 'stucco', W, { n: 8, solid: false }),
      cy(x, 20.45, z, 1.25, 0.2, 'stucco', T, { n: 8, solid: false }),
      cy(x, 23.6, z, 1.15, 6.2, 'roof', AG, { rt: 0, n: 8, solid: false }),
      bl(x, 26.8, z, 0.14, 'gold', '#e8c547', { n: 8 }),
      bx(x, 27.5, z, 0.08, 1.1, 0.08, 'gold', '#e8c547', { solid: false }),
      bx(x, 27.7, z, 0.5, 0.08, 0.08, 'gold', '#e8c547', { solid: false }),
    );
    if (fino)
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * PI * 2 + PI / 8;
        out.push(
          py(x + Math.sin(a) * 1.0, 20.6, z + Math.cos(a) * 1.0, 0.4, 1.0, 0.1, 'stucco', T, { r: a }),
          bx(x + Math.sin(a) * 0.86, 22.8, z + Math.cos(a) * 0.86, 0.06, 2.2, 0.06, 'stone', '#5d6d7a', {
            e: [0.16, a, 0],
            solid: false,
          }),
        );
      }
  }
  return out;
}
/** Gira una pieza de la fachada (+Z) para que mire a un costado (s = ±1) alrededor de (x, z). */
function rotSide(q: Pc, x: number, z: number, s: number): Pc {
  const dx = q.p[0] - x,
    dz = q.p[2] - z,
    r = (s * PI) / 2;
  return {
    ...q,
    p: [x + dx * Math.cos(r) + dz * Math.sin(r), q.p[1], z - dx * Math.sin(r) + dz * Math.cos(r)],
    e: [q.e?.[0] ?? 0, (q.e?.[1] ?? 0) + r, q.e?.[2] ?? 0],
  };
}

// ---------------------------------------------------------------------------------------------------------------
/** Castillo Bográn (Santa Bárbara): casona de dos pisos estilo castillo con almenas, torreón redondo en la esquina,
 *  torre cuadrada, balcón y ventanas en arco. Se ve gastada: repello caído, almenas que faltan y enredaderas. */
function bogran(): Pc[] {
  const fino = detalleFino(),
    r = rng(71),
    W = '#d8c7a1',
    T = '#efe4c8',
    S = '#9c917c',
    out: Pc[] = [];
  // cuerpo de dos pisos con zócalo de piedra
  out.push(
    bx(0, 3.6, -2.6, 12, 7.2, 7.2, 'stucco', W),
    bx(0, 0.5, -2.6, 12.3, 1, 7.5, 'stone', S, { solid: false }),
    bx(0, 3.75, 1.05, 12.3, 0.25, 0.25, 'stucco', T, { solid: false }),
    bx(0, 7.25, -2.6, 12.4, 0.3, 7.6, 'stucco', T, { solid: false }),
  );
  // almenas (faltan algunas: está en ruinas) en el frente y los lados
  for (let i = 0; i < 9; i++) {
    if (i === 6) continue;
    out.push(bx(-5.4 + i * 1.35, 7.85, 0.85, 0.75, 0.9, 0.45, 'stucco', W, { solid: false }));
  }
  for (const s of [-1, 1])
    for (let i = 0; i < 5; i++)
      out.push(bx(s * 5.85, 7.85, -0.6 - i * 1.45, 0.45, 0.9, 0.75, 'stucco', W, { solid: false }));
  // planta baja: portón en arco con escalinata, ventanas en arco con reja
  out.push(
    ...arco(0, 1.7, 1.0, 1.8, 2.6, T, '#2a2420'),
    bx(0, 1.6, 1.04, 1.6, 2.4, 0.05, 'wood', '#5a3a22', { solid: false }),
    ...place(stairs(3.2, 2, 0.2, 0.4, 'stone', S), 0, 0, 1.9),
  );
  for (const x of [-4.2, -2.3, 2.3, 4.2]) out.push(...arco(x, 1.9, 1.0, 1, 1.7, T, '#2a2420', 0.5));
  // primer piso: ventanas en arco con balcón al centro
  for (const x of [-4.2, -2.3, 2.3, 4.2]) out.push(...arco(x, 5.3, 1.0, 0.95, 1.8, T, '#2a2420', 0.5));
  out.push(
    ...arco(0, 5.4, 1.0, 1.4, 2.2, T, '#2a2420', 0.6),
    bx(0, 4.15, 1.6, 3.2, 0.18, 1.2, 'stone', S, { solid: false }),
    ...[-1, 1].map((s) => bx(s * 1.2, 3.85, 1.55, 0.2, 0.45, 0.8, 'stone', S, { solid: false })),
    bx(0, 4.85, 2.16, 3.2, 0.05, 0.05, 'metal', NEGRO, { solid: false }),
  );
  for (let i = 0; i <= 12; i++)
    out.push(bx(-1.55 + i * 0.258, 4.55, 2.16, 0.03, 0.6, 0.03, 'metal', NEGRO, { solid: false }));
  // torreón redondo en la esquina delantera izquierda con almenas en corona
  out.push(
    cy(-6.2, 4.6, 0.6, 1.7, 9.2, 'stucco', W, { n: 14 }),
    cy(-6.2, 0.5, 0.6, 1.85, 1, 'stone', S, { n: 14, solid: false }),
    cy(-6.2, 9.35, 0.6, 1.95, 0.4, 'stucco', T, { n: 14, solid: false }),
  );
  for (let k = 0; k < 10; k++) {
    if (k === 3) continue;
    const a = (k / 10) * PI * 2;
    out.push(
      bx(-6.2 + Math.sin(a) * 1.75, 10, 0.6 + Math.cos(a) * 1.75, 0.6, 0.9, 0.4, 'stucco', W, {
        r: a,
        solid: false,
      }),
    );
  }
  for (const y of [2.4, 5.6])
    out.push(bx(-6.2 + 0.6, y, 0.6 + 1.6, 0.18, 0.9, 0.08, 'plastic', '#211c18', { r: 0.35, solid: false }));
  // torre cuadrada a la derecha, más alta, con aspilleras y almenas
  out.push(
    bx(4.8, 6.2, -4.2, 3.2, 12.4, 3.2, 'stucco', W),
    bx(4.8, 12.55, -4.2, 3.5, 0.3, 3.5, 'stucco', T, { solid: false }),
  );
  for (let k = 0; k < 4; k++) {
    const rr = (k * PI) / 2;
    out.push(
      ...place(
        [
          bx(-1.05, 13.15, 1.6, 0.6, 0.9, 0.35, 'stucco', W, { solid: false }),
          bx(1.05, 13.15, 1.6, 0.6, 0.9, 0.35, 'stucco', W, { solid: false }),
          bx(0, 10.4, 1.62, 0.2, 1, 0.06, 'plastic', '#211c18', { solid: false, em: 0.4 }),
        ],
        4.8,
        0,
        -4.2,
        rr,
      ),
    );
  }
  out.push(cy(4.8, 14.6, -4.2, 0.05, 2, 'metal', '#3a3a3a', { n: 5, solid: false }));
  // repello caído (se ve la piedra), manchas de humedad, enredaderas y escombro
  if (fino) {
    for (let i = 0; i < 7; i++) {
      const x = -5.4 + r() * 10.8,
        y = 1.4 + r() * 5;
      out.push(bx(x, y, 1.0, 0.5 + r() * 1.1, 0.35 + r() * 0.7, 0.05, 'stone', S, { solid: false }));
    }
    for (const x of [-3.2, 1.2, 5.6]) {
      const h = 2.5 + r() * 3.5;
      out.push(bx(x, 7.2 - h / 2, 1.02, 0.5 + r() * 0.4, h, 0.06, 'leaf', '#3f6b34', { solid: false }));
      for (let k = 0; k < 4; k++)
        out.push(bl(x + (r() - 0.5) * 0.8, 7.2 - r() * h, 1.08, 0.22 + r() * 0.18, 'leaf', '#4a7a3a', { n: 6 }));
    }
    for (let i = 0; i < 6; i++)
      out.push(
        bx(-7 + r() * 14, 0.15, 2.4 + r() * 0.9, 0.4 + r() * 0.5, 0.3, 0.3 + r() * 0.4, 'stone', S, {
          r: r() * 3,
          solid: false,
        }),
      );
  }
  // techo de teja del ala de atrás que se asoma sobre las almenas
  out.push(py(0, 7.4, -4.6, 9, 1.6, 3.2, 'roof', '#a4513a'));
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
/** Ciudad Blanca (La Mosquitia): montículos de tierra, plataformas y escalones de piedra blanca medio tragados por la
 *  selva, una cabeza de jaguar tallada, estelas caídas, raíces encima y la selva alrededor. */
function ciudadBlanca(seed: number): Pc[] {
  const fino = detalleFino(),
    r = rng(seed),
    P1 = '#cfc8b4',
    P2 = '#b7b09b',
    MUSGO = '#4d6e35',
    out: Pc[] = [];
  // plataforma escalonada de piedra blanca (tres terrazas) y dos montículos de tierra con monte a los lados
  const TER: [number, number, number, number, number][] = [
    // [alto, centro y, z del frente, ancho, fondo]
    [1, 0.5, 1.0, 10, 7.2],
    [0.9, 1.45, -0.5, 7.6, 5.6],
    [0.9, 2.35, -1.7, 5.2, 4.2],
  ];
  for (const [h, y, zf, w, d] of TER) {
    out.push(bx(0, y, zf - d / 2, w, h, d, 'stone', P2));
    // sillares del frente, algunos caídos o corridos, con musgo encima
    for (let k = 0; k < Math.round(w / 0.9); k++) {
      const x = -w / 2 + 0.45 + k * 0.9;
      if (Math.abs(x) < 1.3) continue;
      if (r() < 0.14) {
        out.push(bx(x, 0.2, zf + 0.6 + r() * 0.8, 0.8, 0.4, 0.6, 'stone', P1, { r: r() * 2, solid: false }));
        continue;
      }
      const hh = h * (0.88 + r() * 0.12);
      out.push(bx(x, y - (h - hh) / 2, zf + 0.04, 0.84, hh, 0.12, 'stone', r() < 0.5 ? P1 : P2, { solid: false }));
      if (r() < 0.5) out.push(bx(x, y + hh / 2 + 0.03, zf - 0.1, 0.88, 0.07, 0.45, 'leaf', MUSGO, { solid: false }));
    }
    // monte y musgo sobre la terraza
    for (let k = 0; k < (fino ? 6 : 3); k++)
      out.push(
        bl((r() - 0.5) * (w - 1), y + h / 2, zf - 0.4 - r() * (d - 0.8), 0.35 + r() * 0.35, 'grass', '#557f37', {
          s: [1.3, 0.45, 1],
          n: 7,
        }),
      );
  }
  out.push(
    bl(-6.6, 0, -4.4, 2.8, 'grass', '#4f7a33', { s: [1, 0.75, 1.1], n: 12 }),
    bl(6.8, 0, -4.9, 2.5, 'grass', '#557f37', { s: [1, 0.8, 1], n: 12 }),
    bx(-5.6, 0.7, -2.4, 0.9, 0.7, 0.5, 'stone', P1, { r: 0.3, solid: false }),
    bx(5.9, 0.8, -3.0, 0.8, 0.6, 0.5, 'stone', P1, { r: -0.4, solid: false }),
  );
  // escalinata central rota: peldaños que faltan o están corridos
  for (let i = 0; i < 9; i++) {
    if (i === 3 || i === 6) continue;
    const off = (r() - 0.5) * 0.25;
    out.push(
      bx(off, 0.16 + i * 0.32, 1.9 - i * 0.42, 2.4 - r() * 0.4, 0.32, 0.46, 'stone', i % 2 ? P1 : P2, {
        r: (r() - 0.5) * 0.1,
        solid: false,
      }),
    );
  }
  // altar arriba con la cabeza de jaguar (el «Dios Mono» de la leyenda) tallada
  out.push(
    bx(0, 3.3, -3.6, 2.6, 1, 1.8, 'stone', P1),
    bx(0, 3.85, -3.6, 2.9, 0.15, 2, 'stone', P2, { solid: false }),
    bl(0, 4.5, -3.2, 0.62, 'stone', P2, { s: [1.1, 0.9, 1], n: 10 }),
    bl(0, 4.35, -2.65, 0.32, 'stone', P1, { s: [1.2, 0.7, 0.9], n: 8 }),
    bl(-0.3, 4.7, -2.7, 0.11, 'stone', '#3a3630', { n: 6 }),
    bl(0.3, 4.7, -2.7, 0.11, 'stone', '#3a3630', { n: 6 }),
    bl(-0.48, 5.0, -3.2, 0.2, 'stone', P2, { n: 7 }),
    bl(0.48, 5.0, -3.2, 0.2, 'stone', P2, { n: 7 }),
    bx(0, 4.18, -2.4, 0.5, 0.1, 0.12, 'stone', '#3a3630', { solid: false }),
  );
  // estelas: una de pie inclinada, otra caída con musgo
  out.push(
    bx(-5.6, 1.3, 1.6, 0.8, 2.6, 0.45, 'stone', P1, { e: [0.08, 0.3, 0.12] }),
    bx(-5.6, 1.6, 1.86, 0.5, 0.9, 0.05, 'stone', P2, { e: [0.08, 0.3, 0.12], solid: false }),
    bx(5.4, 0.25, 2.2, 0.8, 0.45, 2.6, 'stone', P2, { r: 0.6, solid: false }),
    bx(5.4, 0.5, 2.2, 0.5, 0.06, 1.9, 'leaf', MUSGO, { r: 0.6, solid: false }),
  );
  // raíces que bajan por las terrazas y ceiba arriba del montículo
  if (fino)
    for (let i = 0; i < 9; i++) {
      const x = -4 + r() * 8,
        a = (r() - 0.5) * 0.8;
      out.push(
        cy(x, 1.6, -1.2 - r() * 1.2, 0.07 + r() * 0.05, 3.4, 'wood', '#5a4532', { e: [0.7, a, 0], n: 5, solid: false }),
      );
    }
  out.push(...planta('giant', -4.6, 0, -6.4, 0.42, '#3f7d3b', r));
  // selva alrededor: helechos, platanillos y matas sobre las piedras
  for (const [x, z, s] of [
    [-7.4, -2.5, 1],
    [7.6, -1.5, 1.1],
    [-3.8, -6.2, 0.9],
  ] as [number, number, number][])
    out.push(...planta('jungle', x, 0, z, s, '#2a7d3c', r));
  for (const [x, z] of [
    [-6.8, 2.4],
    [6.9, 0.6],
    [-2.6, 2.6],
    [2.9, 2.4],
    [-4.4, -0.2],
  ])
    out.push(...planta('fern', x, 0, z, 1.1, '#3a8a45', r));
  out.push(...planta('banana', -7.8, 0, 0.6, 0.9, '#3f9b4b', r), ...planta('banana', 8, 0, -3.8, 1, '#3f9b4b', r));
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
/** Fortaleza de San Fernando de Omoa (Cortés): cortina con talud de piedra coralina, cordón, troneras con cañones,
 *  dos baluartes en punta de diamante con garitas, portada en arco con escudo y el cuartel con techo de teja atrás. */
function omoa(): Pc[] {
  const fino = detalleFino(),
    r = rng(29),
    C = '#a99d86',
    C2 = '#8f846f',
    CL = '#c9bfa9',
    out: Pc[] = [];
  // cortina
  out.push(
    bx(0, 2.4, -1.4, 9.4, 4.8, 2.4, 'stone', C),
    bx(0, 1.15, 0.05, 9.6, 2.3, 0.7, 'stone', C2, { e: [-0.22, 0, 0], solid: false }),
    cy(0, 3.35, -0.12, 0.17, 9.6, 'stone', CL, { e: [0, 0, PI / 2], n: 8, solid: false }),
    bx(0, 4.55, -0.35, 9.4, 0.5, 0.35, 'stone', CL, { solid: false }),
  );
  // parapeto con troneras: macizos entre huecos y cañones asomando
  for (let i = 0; i < 4; i++) {
    const x = -3.75 + i * 2.5;
    out.push(bx(x, 5.35, -0.55, 1.6, 1.1, 0.9, 'stone', C, { solid: false }));
    if (i < 3) {
      out.push(bx(x + 1.25, 4.95, -0.55, 0.9, 0.3, 0.9, 'stone', C2, { solid: false }));
      out.push(...place(cannon(), x + 1.25, 4.55, -1.0));
    }
  }
  // portada en arco con sillares, escudo arriba y puerta claveteada
  out.push(
    ...arco(0, 1.5, 0.42, 1.9, 2.6, CL, '#211d19'),
    bx(0, 1.4, 0.47, 1.7, 2.4, 0.05, 'wood', '#4a3020', { solid: false }),
    bx(0, 3.95, -0.1, 0.9, 0.9, 0.12, 'stone', CL, { solid: false }),
    py(0, 4.4, -0.1, 0.9, 0.35, 0.12, 'stone', CL),
    cy(0, 3.9, -0.02, 0.3, 0.06, 'stone', C2, { e: [PI / 2, 0, 0], n: 10, solid: false }),
  );
  if (fino)
    for (let i = 0; i < 6; i++)
      for (const s of [-1, 1])
        out.push(
          bx(s * 1.25, 0.3 + i * 0.5, 0.5 - i * 0.05, 0.55, 0.44, 0.08, 'stone', i % 2 ? CL : C2, { solid: false }),
        );
  // baluartes en punta de diamante con talud, cordón, parapeto y garita en la punta
  for (const s of [-1, 1]) {
    const x = s * 6.2,
      z = 0.2;
    out.push(
      bx(x, 2.4, z, 4.2, 4.8, 4.2, 'stone', C, { r: PI / 4 }),
      bx(x, 0.7, z, 4.8, 1.4, 4.8, 'stone', C2, { r: PI / 4, solid: false }),
      bx(x, 3.35, z, 4.5, 0.3, 4.5, 'stone', CL, { r: PI / 4, solid: false }),
      ...[PI / 4, -PI / 4, (3 * PI) / 4, (-3 * PI) / 4].flatMap((a) => {
        const dx = Math.sin(a) * 1.85,
          dz = Math.cos(a) * 1.85;
        return [bx(x + dx, 5.15, z + dz, 0.5, 0.7, 3.2, 'stone', C, { r: a + PI / 2, solid: false })];
      }),
      ...place(garita(CL, '#b9b1a0'), x, 4.8, z + 2.75),
      bx(x, 4.65, z + 2.6, 1.4, 0.3, 1.4, 'stone', CL, { r: PI / 4, solid: false }),
    );
  }
  // cuartel de atrás con techo de teja y una bandera
  out.push(
    bx(0, 3, -4.6, 8, 6, 3.2, 'stucco', '#d6cbb2'),
    py(0, 6, -4.6, 8.6, 1.7, 3.8, 'roof', '#a4513a'),
    cy(-3.2, 9, -3.2, 0.06, 6, 'metal', '#4a5560', { n: 6, solid: false }),
    bx(-2.4, 11.2, -3.2, 1.6, 1, 0.04, 'cloth', '#0b6fc0', { solid: false }),
    bx(-2.4, 11.2, -3.18, 1.6, 0.34, 0.04, 'cloth', '#f4f4f4', { solid: false }),
  );
  // piedra coralina gastada: parches y musgo abajo
  if (fino)
    for (let i = 0; i < 10; i++)
      out.push(
        bx(
          -4.4 + r() * 8.8,
          1.7 + r() * 2.4,
          0.04 + 0.06,
          0.5 + r() * 0.9,
          0.3 + r() * 0.5,
          0.04,
          'stone',
          r() < 0.5 ? C2 : CL,
          {
            solid: false,
          },
        ),
      );
  out.push(bx(0, 0.1, 0.55, 9.6, 0.2, 0.5, 'leaf', '#4d6e35', { solid: false }));
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Copán: estela con retrato, templo con escalinata jeroglífica y su lona protectora

const CP = '#b9ad93',
  CPD = '#8c8270',
  CPM = '#6f7a52';
/** Estela maya: retrato de frente (tocado, cara, brazos con barra ceremonial), glifos a los lados, altar adelante. */
export function estelaMaya(h = 3.4, fino = detalleFino()): Pc[] {
  const out: Pc[] = [
    bx(0, h / 2, 0, 0.95, h, 0.6, 'stone', CP),
    bx(0, 0.12, 0, 1.3, 0.24, 0.95, 'stone', CPD, { solid: false }),
    // tocado ancho con plumas
    bx(0, h - 0.22, 0.05, 1.12, 0.45, 0.72, 'stone', CPD, { solid: false }),
    ...[-0.4, -0.2, 0, 0.2, 0.4].map((x) =>
      bx(x, h + 0.08, 0.06, 0.14, 0.32, 0.5, 'stone', CP, { e: [0, 0, x * 0.5], solid: false }),
    ),
    // cara, orejeras y collar
    bx(0, h * 0.72, 0.32, 0.42, 0.46, 0.1, 'stone', CP, { solid: false }),
    bl(0, h * 0.72, 0.38, 0.16, 'stone', CPD, { s: [1, 1.2, 0.5], n: 8 }),
    cy(-0.28, h * 0.72, 0.36, 0.1, 0.06, 'stone', CPD, { e: [PI / 2, 0, 0], n: 8, solid: false }),
    cy(0.28, h * 0.72, 0.36, 0.1, 0.06, 'stone', CPD, { e: [PI / 2, 0, 0], n: 8, solid: false }),
    bx(0, h * 0.6, 0.33, 0.7, 0.14, 0.08, 'stone', CPD, { solid: false }),
    // brazos con la barra ceremonial y el faldellín
    bx(0, h * 0.48, 0.36, 0.86, 0.16, 0.12, 'stone', CP, { solid: false }),
    bl(-0.43, h * 0.48, 0.38, 0.09, 'stone', CPD, { n: 6 }),
    bl(0.43, h * 0.48, 0.38, 0.09, 'stone', CPD, { n: 6 }),
    bx(0, h * 0.33, 0.33, 0.6, 0.42, 0.08, 'stone', CPD, { solid: false }),
    bx(0, h * 0.13, 0.33, 0.7, 0.2, 0.08, 'stone', CP, { solid: false }),
  ];
  if (fino)
    for (const s of [-1, 1])
      for (let i = 0; i < 6; i++)
        out.push(
          bx(s * 0.49, 0.45 + i * ((h - 1) / 6), 0, 0.04, (h - 1) / 6 - 0.08, 0.42, 'stone', i % 2 ? CPD : CP, {
            solid: false,
          }),
        );
  // musgo en el tocado y la base
  out.push(
    bx(0, h + 0.01, -0.1, 0.9, 0.05, 0.4, 'leaf', CPM, { solid: false }),
    bx(0, 0.26, -0.3, 1.2, 0.05, 0.3, 'leaf', CPM, { solid: false }),
  );
  return out;
}
/** Escalinata Jeroglífica (Templo 26): escalones con glifos en cada contrahuella, figuras sentadas a lo largo del
 *  eje, alfardas a los lados, templo arriba y la lona que la protege del sol y la lluvia. */
function escalinata(): Pc[] {
  const fino = detalleFino(),
    out: Pc[] = [],
    n = 18,
    rise = 0.36,
    run = 0.42,
    z0 = 3.2,
    top = n * rise;
  // cuerpo escalonado del templo
  for (let i = 0; i < 4; i++) {
    const w = 13 - i * 2.2,
      d = 10 - i * 1.6,
      hh = top / 4,
      zc = -3 - i * 0.6;
    out.push(
      bx(0, hh * (i + 0.5), zc, w, hh, d, 'stone', i % 2 ? '#aea48d' : CP),
      bx(0, hh * (i + 1) - 0.08, zc, w + 0.2, 0.16, d + 0.2, 'stone', CPD, { solid: false }),
    );
  }
  // escalones con glifos
  out.push(...place(stairs(4.6, n, rise, run, 'stone', '#c4b79a'), 0, 0, z0));
  for (let i = 0; i < n; i++) {
    const y = rise * i + rise / 2,
      z = z0 - run * i + 0.02,
      k = fino ? 6 : 3;
    for (let g = 0; g < k; g++) {
      const w = 4.2 / k;
      out.push(
        bx(-2.1 + w * (g + 0.5), y, z, w - 0.08, rise - 0.1, 0.03, 'stone', (i + g) % 3 ? CPD : '#9c9078', {
          solid: false,
        }),
      );
      if (fino && (i + g) % 2)
        out.push(bl(-2.1 + w * (g + 0.5), y, z + 0.02, 0.08, 'stone', '#7c725f', { s: [1.2, 1, 0.4], n: 6 }));
    }
  }
  // figuras sentadas sobre el eje, cada cinco escalones
  for (const i of [4, 9, 14]) {
    const y = rise * (i + 1),
      z = z0 - run * (i + 0.6);
    out.push(
      bx(0, y + 0.35, z, 0.8, 0.7, 0.5, 'stone', CP, { solid: false }),
      bl(0, y + 0.95, z + 0.05, 0.28, 'stone', CP, { n: 8 }),
      bx(0, y + 1.3, z, 0.7, 0.28, 0.45, 'stone', CPD, { solid: false }),
    );
  }
  // alfardas (rampas laterales)
  const ang = Math.atan2(rise, run),
    len = Math.hypot(top, n * run);
  for (const s of [-1, 1])
    out.push(
      bx(s * 2.6, top / 2 + 0.2, z0 - (n * run) / 2, 0.6, 0.45, len, 'stone', CPD, { e: [ang, 0, 0], solid: false }),
    );
  // templo arriba con puerta y crestería
  const zt = z0 - n * run - 1.25;
  out.push(
    bx(0, top + 1.2, zt, 5, 2.4, 2.4, 'stone', CP),
    bx(0, top + 1.0, zt + 1.22, 1.1, 1.8, 0.05, 'plastic', '#211d18', { solid: false }),
    bx(0, top + 2.55, zt, 5.4, 0.3, 2.8, 'stone', CPD, { solid: false }),
    bx(0, top + 3.1, zt - 0.3, 3.2, 0.8, 0.4, 'stone', CP, { solid: false }),
  );
  // lona protectora sobre la escalinata
  const tz = z0 - (n * run) / 2 + 0.3,
    tilt = ang * 0.35,
    ty = top + 1.6;
  out.push(
    bx(0, ty, tz, 7.6, 0.05, n * run + 2.2, 'cloth', '#d9d1bd', { e: [tilt, 0, 0], solid: false }),
    bx(0, ty - 0.12, tz, 7.7, 0.12, 0.12, 'metal', '#8a9096', { solid: false }),
  );
  for (const s of [-1, 1])
    for (const zz of [z0 + 0.6, tz, z0 - n * run - 0.2]) {
      const hh = ty - (zz - tz) * Math.tan(tilt);
      out.push(cy(s * 3.7, hh / 2, zz, 0.06, hh, 'metal', '#8a9096', { n: 6, solid: false }));
    }
  return out;
}
/** Copán Ruinas (estación): estela con su altar frente a un templo con bóveda maya y cancha de pelota pequeña. */
function copanRuinas(): Pc[] {
  const fino = detalleFino(),
    out: Pc[] = [];
  out.push(...estelaMaya(3.6, fino).map((q) => ({ ...q, p: [q.p[0] - 3.6, q.p[1], q.p[2] + 1.6] as Pc['p'] })));
  out.push(
    cy(-3.6, 0.35, 3.1, 0.75, 0.7, 'stone', CP, { n: 10 }),
    cy(-3.6, 0.72, 3.1, 0.8, 0.08, 'stone', CPD, { n: 10, solid: false }),
  );
  // templo de dos cuerpos con bóveda maya (arco falso escalonado) y crestería
  out.push(
    bx(2, 0.9, -3.4, 9, 1.8, 6, 'stone', CP),
    bx(2, 2.4, -3.8, 7, 1.2, 4.6, 'stone', '#aea48d'),
    ...place(stairs(3, 5, 0.36, 0.4, 'stone', '#c4b79a'), 2, 0, 1.6),
    bx(2, 4.4, -4, 5.4, 2.8, 3.4, 'stone', CP),
    bx(2, 5.95, -4, 5.8, 0.3, 3.8, 'stone', CPD, { solid: false }),
    bx(2, 7, -4.6, 3.6, 1.8, 0.5, 'stone', CP, { solid: false }),
    ...[-1.2, 0, 1.2].map((x) => bx(2 + x, 7, -4.32, 0.5, 1.2, 0.05, 'plastic', '#2a2520', { solid: false })),
  );
  // bóveda maya: hueco con hiladas que se cierran hacia arriba
  for (let i = 0; i < 4; i++)
    out.push(bx(2, 3.6 + i * 0.4, -2.28, 1.6 - i * 0.38, 0.4, 0.05, 'plastic', '#221e1a', { solid: false }));
  if (fino)
    for (let i = 0; i < 9; i++)
      out.push(bx(-2.2 + i * 1.05, 1.5, -0.38, 0.8, 0.5, 0.05, 'stone', i % 2 ? CPD : CP, { solid: false }));
  // musgo y selva
  out.push(
    bx(2, 1.82, -0.6, 9, 0.06, 0.5, 'leaf', CPM, { solid: false }),
    ...planta('jungle', -7.6, 0, -3.6, 0.9, '#2a7d3c', rng(5)),
    ...planta('fern', 7.4, 0, 1.6, 1, '#3a8a45', rng(6)),
  );
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
/** Catedral de Comayagua (estación): fachada-retablo blanca con columnas, nichos con santos y remate, y la torre
 *  a la izquierda con el reloj (uno de los más antiguos de América) y su campanario. */
function comayagua(): Pc[] {
  const fino = detalleFino(),
    W = '#f6f0e1',
    T = '#e3d4b2',
    out: Pc[] = [];
  out.push(
    bx(1.6, 4.6, -3.4, 8, 9.2, 7.6, 'stucco', W),
    py(1.6, 9.2, -3.4, 8.4, 2.2, 8, 'roof', '#b5523b'),
    bx(1.6, 5.5, 0.6, 8.4, 11, 0.8, 'stucco', W),
    bx(1.6, 12.2, 0.6, 5.4, 2.4, 0.8, 'stucco', W),
    bx(1.6, 14.1, 0.6, 2.8, 1.4, 0.8, 'stucco', W),
    bx(1.6, 15.2, 0.8, 0.2, 1.2, 0.2, 'stone', '#3a3a3a', { solid: false }),
    bx(1.6, 15.45, 0.8, 0.8, 0.2, 0.2, 'stone', '#3a3a3a', { solid: false }),
  );
  // cuerpos del retablo: cornisas, columnas, nichos con santos, puerta y ventana coral
  for (const y of [4.3, 8.1, 11.05, 13.45])
    out.push(bx(1.6, y, 1.08, y > 10 ? 5.7 : 8.7, 0.24, 0.24, 'stucco', T, { solid: false }));
  for (const x of [-2.1, -0.6, 3.8, 5.3])
    for (const [y0, y1] of [
      [0.2, 4.2],
      [4.4, 8],
    ])
      out.push(...columna(x, 1.12, y0, y1, 0.14, W, T));
  for (const x of [-1.35, 4.55])
    for (const y of [2.4, 6.2]) {
      out.push(
        bx(x, y, 1.06, 0.8, 1.6, 0.06, 'stone', '#8a7a6a', { solid: false }),
        cy(x, y + 0.8, 1.06, 0.4, 0.06, 'stone', '#8a7a6a', { e: [PI / 2, 0, 0], n: 10, solid: false }),
        cy(x, y - 0.2, 1.18, 0.16, 1.0, 'stone', '#e8dcc0', { n: 8, solid: false }),
        bl(x, y + 0.45, 1.2, 0.14, 'stone', '#e8dcc0', { n: 8 }),
      );
    }
  out.push(
    ...arco(1.6, 1.9, 1.0, 2, 3, T, '#2a2420'),
    bx(1.6, 1.75, 1.06, 1.8, 2.8, 0.05, 'wood', '#5a3a22', { solid: false }),
    ...arco(1.6, 6.1, 1.0, 1.2, 1.6, T, '#2c3d55', 0.6),
    cy(1.6, 9.6, 1.06, 0.55, 0.08, 'stucco', T, { e: [PI / 2, 0, 0], n: 14, solid: false }),
    cy(1.6, 12.4, 1.06, 0.5, 0.08, 'stucco', T, { e: [PI / 2, 0, 0], n: 12, solid: false }),
  );
  if (fino)
    for (const s of [-1, 1])
      out.push(
        cy(1.6 + s * 2.95, 11.6, 1.04, 0.45, 0.1, 'stucco', T, { e: [PI / 2, 0, 0], n: 12, solid: false }),
        bl(1.6 + s * 4.1, 8.6, 1.0, 0.2, 'stucco', T, { n: 8 }),
      );
  // torre del reloj a la izquierda
  const tx = -5.2,
    tz = -0.4,
    ts = 3.2,
    th = 12.5;
  out.push(
    bx(tx, th / 2, tz, ts, th, ts, 'stucco', W),
    ...campanario(tx, tz, ts, th, W, { cap: T, cupula: '#f4a261', desde: 9.6 }),
  );
  // el reloj: esfera blanca con aro, doce marcas y agujas
  const cz = tz + ts / 2 + 0.04,
    cyY = 7.6;
  out.push(
    cy(tx, cyY, cz, 1.05, 0.08, 'stone', '#3a3a3a', { e: [PI / 2, 0, 0], n: 24, solid: false }),
    cy(tx, cyY, cz + 0.04, 0.92, 0.06, 'plastic', '#fbf7ea', { e: [PI / 2, 0, 0], n: 24, solid: false, em: 0.35 }),
    bx(tx + 0.18, cyY + 0.28, cz + 0.1, 0.07, 0.62, 0.03, 'metal', NEGRO, { e: [0, 0, -0.55], solid: false }),
    bx(tx - 0.2, cyY - 0.06, cz + 0.11, 0.42, 0.06, 0.03, 'metal', NEGRO, { e: [0, 0, 0.3], solid: false }),
    bl(tx, cyY, cz + 0.12, 0.06, 'metal', NEGRO, { n: 6 }),
  );
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2,
      big = i % 3 === 0;
    out.push(
      bx(
        tx + Math.sin(a) * 0.76,
        cyY + Math.cos(a) * 0.76,
        cz + 0.09,
        big ? 0.07 : 0.04,
        big ? 0.22 : 0.13,
        0.03,
        'metal',
        NEGRO,
        {
          e: [0, 0, -a],
          solid: false,
        },
      ),
    );
  }
  out.push(bx(tx, cyY + 1.3, cz, ts + 0.3, 0.2, 0.16, 'stucco', T, { solid: false }));
  return out;
}

/** Edificio propio de un lugar famoso por su id de catálogo; null si el lugar usa el decorado de su tipo. */
export function famoso(dept: string, id: string, seed: number): Pc[] | null {
  switch (`${dept}/${id}`) {
    case 'franciscomorazan/suyapa':
      return suyapa();
    case 'santabarbara/bogran':
      return bogran();
    case 'graciasadios/ciudadblanca':
      return ciudadBlanca(seed);
    case 'cortes/omoa':
      return omoa();
    case 'copan/escalinata':
      return escalinata();
    case 'copan/ruinas':
      return copanRuinas();
    case 'comayagua/catedral':
      return comayagua();
    default:
      return null;
  }
}
