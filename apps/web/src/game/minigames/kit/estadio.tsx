// Estadio de barrio para los minijuegos (paquete HD): graderías de concreto con bancas pintadas, gente de relleno
// sentada (toda la afición en UNA malla fusionada: cuerpo, cabeza y pelo de cajas y bolas), tribuna techada y
// torres de luz. Todo es decorado sin colisión. Sin malla fusionada (Roblox) no dibuja nada: cada escena deja su
// versión sencilla.
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { V3 } from '../../../core/types';
import { art } from '../../kit';
import type { Molde, Pintura } from '../../kit/art/types';

/** Una gradería. En su espacio: largo a lo largo de X (centrada), la primera fila en z = 0 y las demás hacia −Z;
 *  la gente mira hacia +Z. `pos` y `rot` (giro en Y) la ponen en la escena: con rot = 0 mira hacia +Z. */
export interface Grada {
  pos: V3;
  rot: number;
  largo: number;
  filas: number;
  /** altura de la primera banca */
  y0: number;
  /** cuánto sube y cuánto fondo tiene cada fila */
  sube?: number;
  paso?: number;
  techo?: boolean;
  /** 0..1 cuánta gente (0 = vacía) */
  lleno?: number;
  /** colores de las camisas (los del equipo de casa pesan más) */
  camisas?: string[];
  /** huecos sin gente a lo largo de X (local), p. ej. donde hay bots de verdad */
  sin?: [number, number][];
  /** bancas pintadas: colores que se alternan por fila */
  bancas?: string[];
}
/** Torre de luz: base en `pos`, mirando hacia `mira` (punto de la cancha). */
export interface Torre {
  pos: V3;
  mira: [number, number];
  alto?: number;
}

const CONCRETO = '#b8b2a6',
  CONCRETO2 = '#a39d91',
  METAL = '#6f767c',
  PIELES = ['#c98f5f', '#8d5a3b', '#e0ac7e', '#a66f45', '#6b4428', '#d9a273'],
  PELOS = ['#1c1410', '#2b1d14', '#3b2618', '#14100e', '#4a3324'],
  PANTS = ['#263a5d', '#2b2b2b', '#4a4f57', '#5d4126', '#1f3550'],
  CAMISAS = ['#f4f4f2', '#f4f4f2', '#1f5fbf', '#1f5fbf', '#2a8fd8', '#d63a3a', '#e9c46a', '#2a9d8f', '#f4a261'];

function azar(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const caja = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const bola = (n = 7) => new THREE.SphereGeometry(1, n, Math.max(4, n - 2));

/** pone una pieza local de la gradería en la escena: escala, inclina (X), gira (Y) en su sitio y luego la gradería
 *  entera se gira y se traslada */
const _m = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _e = new THREE.Euler(),
  _v = new THREE.Vector3(),
  _s = new THREE.Vector3();
function puesto(g: Grada) {
  const base = new THREE.Matrix4().compose(
    new THREE.Vector3(...g.pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, g.rot, 0)),
    new THREE.Vector3(1, 1, 1),
  );
  return (
    b: Molde,
    geo: THREE.BufferGeometry,
    p: Pintura,
    x: number,
    y: number,
    z: number,
    r: V3 = [0, 0, 0],
    sc?: V3,
  ) => {
    _e.set(r[0], r[1], r[2], 'YXZ');
    _q.setFromEuler(_e);
    _m.compose(_v.set(x, y, z), _q, sc ? _s.set(...sc) : _s.set(1, 1, 1)).premultiply(base);
    return b.add(geo, p, _m.clone());
  };
}

function armarGrada(b: Molde, gente: Molde, g: Grada, seed: number) {
  const put = puesto(g),
    sube = g.sube ?? 0.5,
    paso = g.paso ?? 0.9,
    L = g.largo,
    r = azar(seed),
    bancas = g.bancas ?? ['#2a6fdb', '#f2f2f0'],
    camisas = g.camisas ?? CAMISAS,
    lleno = g.lleno ?? 0.72;
  // escalones macizos, con la banca pintada al filo y una raya de pasillo cada 8 m
  for (let i = 0; i < g.filas; i++) {
    const top = g.y0 + i * sube,
      z = -i * paso;
    put(b, caja(L, top, paso), { k: 'concrete', c: i % 2 ? CONCRETO : CONCRETO2 }, 0, top / 2, z - paso / 2 + 0.45);
    put(b, caja(L, 0.07, 0.34), { k: 'plastic', c: bancas[i % bancas.length], r: 0.5 }, 0, top + 0.035, z + 0.2);
  }
  const pasillos: number[] = [];
  for (let x = -L / 2 + 4; x < L / 2 - 2; x += 8) pasillos.push(x);
  for (const x of pasillos)
    for (let i = 0; i < g.filas; i++)
      put(
        b,
        caja(1.0, 0.075, paso),
        { k: 'concrete', c: '#d8d3c6' },
        x,
        g.y0 + i * sube + 0.002,
        -i * paso - paso / 2 + 0.45,
      );
  // muro de atrás con baranda y el frente de la primera fila
  const zAtras = -(g.filas - 1) * paso - paso / 2 + 0.45 - paso / 2,
    yAtras = g.y0 + (g.filas - 1) * sube;
  put(
    b,
    caja(L + 0.3, yAtras + 1.1, 0.25),
    { k: 'concrete', c: CONCRETO2, g: [0, 1.2, 0.75] },
    0,
    (yAtras + 1.1) / 2,
    zAtras - 0.12,
  );
  put(b, caja(L, 0.06, 0.06), { k: 'metal', c: METAL }, 0, yAtras + 2.0, zAtras - 0.05);
  for (let x = -L / 2; x <= L / 2 + 0.01; x += 2.5)
    put(b, new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), { k: 'metal', c: METAL }, x, yAtras + 1.55, zAtras - 0.05);
  put(b, caja(L + 0.3, 0.12, 0.3), { k: 'concrete', c: '#cfc9bc' }, 0, g.y0 - 0.06 + 0.12, 0.6);
  // techo de lámina sobre columnas de atrás, con tirantes
  if (g.techo) {
    const yT = yAtras + 4.2,
      fondo = g.filas * paso + 1.4;
    for (let x = -L / 2 + 1; x <= L / 2 - 1 + 0.01; x += (L - 2) / Math.max(1, Math.round((L - 2) / 6))) {
      put(b, caja(0.22, yT, 0.22), { k: 'metal', c: METAL }, x, yT / 2, zAtras - 0.35);
      put(
        b,
        caja(0.1, 0.1, fondo * 0.75),
        { k: 'metal', c: METAL },
        x,
        yT - 0.9,
        zAtras - 0.35 + fondo * 0.36,
        [-0.45, 0, 0],
      );
    }
    put(
      b,
      caja(L + 0.6, 0.08, fondo),
      { k: 'metal', c: '#b9bec2', r: 0.5 },
      0,
      yT + 0.1,
      zAtras - 0.35 + fondo / 2 - 0.3,
      [-0.07, 0, 0],
    );
    put(
      b,
      caja(L + 0.6, 0.35, 0.06),
      { k: 'plastic', c: bancas[0], r: 0.6 },
      0,
      yT - 0.05,
      zAtras - 0.35 + fondo - 0.32,
    );
  }
  // afición: sentados en su banca (algunos de pie con los brazos arriba), mirando a la cancha
  if (lleno <= 0) return;
  const cuerpo = caja(0.36, 0.42, 0.22),
    muslo = caja(0.34, 0.12, 0.34),
    pierna = caja(0.3, 0.42, 0.14),
    brazo = caja(0.09, 0.4, 0.09),
    cabeza = bola(7);
  for (let i = 0; i < g.filas; i++) {
    const top = g.y0 + i * sube,
      z = -i * paso + 0.12;
    for (let x = -L / 2 + 0.4; x < L / 2 - 0.3; x += 0.56) {
      if (pasillos.some((p) => Math.abs(p - x) < 0.75)) continue;
      if (g.sin?.some(([a, c]) => x > a && x < c)) continue;
      if (r() > lleno) continue;
      const xx = x + (r() - 0.5) * 0.14,
        camisa = camisas[Math.floor(r() * camisas.length)],
        piel = PIELES[Math.floor(r() * PIELES.length)],
        pant = PANTS[Math.floor(r() * PANTS.length)],
        dePie = r() < 0.12,
        giro = (r() - 0.5) * 0.5,
        tela: Pintura = { k: 'cloth', c: camisa },
        ropa: Pintura = { k: 'cloth', c: pant };
      if (dePie) {
        put(gente, pierna, ropa, xx, top + 0.21, z + 0.02);
        put(gente, cuerpo, tela, xx, top + 0.64, z, [0, giro, 0]);
        put(gente, cabeza, { k: 'plastic', c: piel, r: 0.7 }, xx, top + 0.98, z, [0, 0, 0], [0.11, 0.13, 0.11]);
        if (r() < 0.6) {
          put(gente, brazo, tela, xx - 0.22, top + 1.02, z, [0, 0, 0.3]);
          put(gente, brazo, tela, xx + 0.22, top + 1.02, z, [0, 0, -0.3]);
        }
        if (r() < 0.75)
          put(
            gente,
            cabeza,
            { k: 'cloth', c: PELOS[Math.floor(r() * PELOS.length)] },
            xx,
            top + 1.03,
            z - 0.02,
            [0, 0, 0],
            [0.113, 0.08, 0.113],
          );
      } else {
        put(gente, muslo, ropa, xx, top + 0.1, z + 0.12);
        put(gente, cuerpo, tela, xx, top + 0.37, z - 0.03, [-0.08, giro, 0]);
        put(gente, cabeza, { k: 'plastic', c: piel, r: 0.7 }, xx, top + 0.71, z - 0.04, [0, 0, 0], [0.11, 0.13, 0.11]);
        if (r() < 0.75)
          put(
            gente,
            cabeza,
            { k: 'cloth', c: PELOS[Math.floor(r() * PELOS.length)] },
            xx,
            top + 0.76,
            z - 0.06,
            [0, 0, 0],
            [0.113, 0.08, 0.113],
          );
      }
    }
  }
}

/** matriz de traslado + giro con orden YXZ (primero inclina, luego gira) */
const yxz = (p: V3, r: V3) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ')),
    new THREE.Vector3(1, 1, 1),
  );
function armarTorre(b: Molde, t: Torre) {
  const H = t.alto ?? 17,
    [x, , z] = t.pos,
    a = Math.atan2(t.mira[0] - x, t.mira[1] - z),
    m: Pintura = { k: 'metal', c: METAL, r: 0.5 };
  b.add(new THREE.CylinderGeometry(0.16, 0.3, H, 10), m, { p: [x, H / 2, z] });
  b.add(new THREE.CylinderGeometry(0.5, 0.6, 0.5, 10), { k: 'concrete', c: CONCRETO }, { p: [x, 0.25, z] });
  // plataforma y tablero de focos inclinado hacia la cancha
  const fx = x + Math.sin(a) * 0.35,
    fz = z + Math.cos(a) * 0.35;
  b.add(caja(3.2, 0.08, 0.9), m, { p: [x, H - 1.0, z], r: [0, a, 0] });
  b.add(caja(3.0, 2.0, 0.22), { k: 'metal', c: '#4b5156', r: 0.5 }, yxz([fx, H + 0.2, fz], [0.35, a, 0]));
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 3; j++) {
      const lx = -1.1 + i * 0.73,
        ly = -0.6 + j * 0.6,
        c = Math.cos(a),
        s = Math.sin(a),
        // la cara de adelante del tablero (inclinado 0.35 rad hacia abajo)
        oz = 0.13,
        yy = ly * Math.cos(0.35) - oz * Math.sin(0.35),
        zz = ly * Math.sin(0.35) + oz * Math.cos(0.35);
      b.add(
        caja(0.56, 0.44, 0.08),
        { k: 'plastic', c: '#fffbe8', e: -0.55, r: 0.2 },
        yxz([fx + lx * c + zz * s, H + 0.2 + yy, fz - lx * s + zz * c], [0.35, a, 0]),
      );
    }
}

export interface EstadioDef {
  gradas: Grada[];
  torres?: Torre[];
  seed?: number;
}
/** Graderías con su afición y torres de luz (dos mallas). `brinca` = la afición salta (goles). */
export function Estadio({ def, brinca }: { def: EstadioDef; brinca?: () => boolean }) {
  const hecho = useMemo(() => {
    const F = art.fused;
    const b = F?.molde?.(),
      gente = F?.molde?.();
    if (!b || !gente) return null;
    def.gradas.forEach((g, i) => {
      armarGrada(b, gente, g, (def.seed ?? 7) * 31 + i * 101);
    });
    for (const t of def.torres ?? []) armarTorre(b, t);
    return { obra: b.build(), gente: gente.build() };
  }, [def]);
  useEffect(
    () => () => {
      hecho?.obra.dispose();
      hecho?.gente.dispose();
    },
    [hecho],
  );
  const grupo = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    g.position.y = brinca?.() ? Math.abs(Math.sin(clock.elapsedTime * 11)) * 0.14 : 0;
  });
  const F = art.fused;
  if (!hecho || !F) return null;
  return (
    <>
      <mesh geometry={hecho.obra} material={F.material()} castShadow receiveShadow />
      <group ref={grupo}>
        <mesh geometry={hecho.gente} material={F.material()} castShadow receiveShadow />
      </group>
    </>
  );
}
