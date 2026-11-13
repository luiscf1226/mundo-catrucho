import { input } from '../../../core/input';
import { Ball, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import {
  Boya,
  Coral,
  cursor,
  Isla,
  Laguna,
  Lancha,
  limitar,
  loco,
  Muelle,
  moverCursor,
  Pez,
  TiburonBallena,
  texto,
} from './comun';

type XZ = [number, number];
type Encuentro = {
  t: number;
  x: number;
  z: number;
  dx: number;
  dz: number;
  sombras: XZ[];
  gira: number;
  noSale: boolean;
  minimo: number;
  registrado: boolean;
  fin: '' | 'cerca' | 'persigue' | 'hundio';
  hundido: number;
};
type Estado = {
  c: ReturnType<typeof cursor>;
  gx: number;
  gz: number;
  vx: number;
  vz: number;
  enc: Encuentro | null;
  espera: number;
  azar: () => number;
  encuentros: number;
  hundidos: number;
  buenos: number;
  cerca: number;
  persigue: number;
  fotos: number;
  intentos: number;
  aviso: string;
};
type Param = {
  v: number;
  seguro: number;
  observar: number;
  gira: number;
  noSale: number;
  ayuda: boolean;
  nombre: string;
  semilla: number;
};
type Sesion = Motor<Param, Estado>;
const AREA = { minX: -8.5, maxX: 3.2, minZ: -5.6, maxZ: 3.6 };
const destino = (c: { x: number; y: number }): XZ => [
  AREA.minX + ((c.x + 1) / 2) * (AREA.maxX - AREA.minX),
  AREA.maxZ - ((c.y + 1) / 2) * (AREA.maxZ - AREA.minZ),
];
const aCursor = (x: number, z: number) => ({
  x: limitar(((x - AREA.minX) / (AREA.maxX - AREA.minX)) * 2 - 1),
  y: limitar(((AREA.maxZ - z) / (AREA.maxZ - AREA.minZ)) * 2 - 1),
});
const distancia = (s: Estado) => (s.enc ? Math.hypot(s.enc.x - s.gx, s.enc.z - s.gz) : 99);
const enBanda = (m: Sesion) => {
  const d = distancia(m.datos);
  return d >= m.parametros.seguro && d <= m.parametros.observar;
};

function nuevoEncuentro(m: Sesion): Encuentro {
  const s = m.datos;
  const r = s.azar;
  const izquierda = r() < 0.6;
  const x = izquierda ? -10 : -7 + r() * 8;
  const z = izquierda ? -4.5 + r() * 7 : -7.5;
  const qx = -5.5 + r() * 6;
  const qz = -3.5 + r() * 5;
  const l = Math.hypot(qx - x, qz - z);
  return {
    t: 0,
    x,
    z,
    dx: (qx - x) / l,
    dz: (qz - z) / l,
    sombras: [[x, z]],
    gira: r() < m.parametros.gira ? (r() < 0.5 ? -0.5 : 0.5) : 0,
    noSale: s.encuentros > 1 && s.hundidos === 0 && r() < m.parametros.noSale,
    minimo: 99,
    registrado: false,
    fin: '',
    hundido: 0,
  };
}
function registrar(m: Sesion) {
  const s = m.datos;
  s.intentos++;
  if (!s.enc || s.enc.fin || s.enc.t < 1.4) {
    s.aviso = 'Todavía no hay a quién registrar: esperá las sombras.';
    return;
  }
  if (s.enc.registrado) return;
  if (enBanda(m)) {
    s.enc.registrado = true;
    s.fotos++;
    s.aviso = '¡Registro a distancia! Así sí.';
  } else s.aviso = distancia(s) < m.parametros.seguro ? 'Muy cerca para la foto.' : 'Muy lejos: solo agua en la foto.';
}
function cerrar(m: Sesion, e: Encuentro) {
  const s = m.datos;
  s.encuentros++;
  if (!e.fin) {
    if (e.minimo >= m.parametros.seguro && e.minimo <= m.parametros.observar) {
      s.buenos++;
      m.sumar(30 + (e.registrado ? 20 : 0));
      s.aviso = e.registrado
        ? 'Encuentro a distancia y registrado. ¡Bien!'
        : 'Encuentro a distancia. Faltó registrarlo con F.';
    } else s.aviso = 'Pasó lejos. Corré la boya más cerca del corredor (sin cerrarle el paso).';
  }
  s.enc = null;
  s.espera = 1.6;
}
function terminar(m: Sesion, e: Encuentro, fin: Encuentro['fin']) {
  const s = m.datos;
  e.fin = fin;
  if (fin === 'cerca') {
    s.cerca++;
    m.sumar(-25);
    s.aviso = 'Le cerraste el paso: se acabó la observación.';
  } else if (fin === 'persigue') {
    s.persigue++;
    m.sumar(-15);
    s.aviso = 'No se persigue al gigante. Se acabó la observación.';
  } else {
    s.hundidos++;
    s.aviso = 'Esta vez no subió. Así es el mar: no hay cita garantizada.';
  }
}

const motor = defineMotor({
  id: 'islas.ballena',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'mar',
  guia: {
    goal: 'Mirá las dos sombras, calculá el rumbo y dejá la boya del grupo a distancia, sin cerrarle el paso.',
    keys: [
      ['WASD / flechas', 'mover la boya del grupo'],
      ['Mouse / stick derecho', 'llevar la boya a un punto'],
      ['F / clic / RT', 'registrar el encuentro'],
    ],
    touch: [
      ['Palanca / arrastrá', 'mover la boya del grupo'],
      ['🎯', 'registrar el encuentro'],
    ],
  },
  etapa: (p) => ({
    v: 1.5 + p.dif * 1.2,
    seguro: 2.1 + p.dif * 0.3,
    observar: 4.9 - p.dif * 1.3,
    gira: loco(p) || p.tema.gira === true ? 0.55 + p.dif * 0.3 : p.dif > 0.45 ? p.dif * 0.5 : 0,
    noSale: 0.25,
    ayuda: p.dif < 0.3,
    nombre: texto(p.tema.nombre, 'Distancia en Utila'),
    semilla: p.seed,
  }),
  metas: (p) => [80 + Math.round(p.dif * 60), 170 + Math.round(p.dif * 60), 260 + Math.round(p.dif * 60)],
  duracion: (p) => 75 + Math.round(p.dif * 15),
  crear: (p): Estado => ({
    c: cursor(),
    gx: -2,
    gz: 2,
    vx: 0,
    vz: 0,
    enc: null,
    espera: 0.6,
    azar: rng(p.semilla),
    encuentros: 0,
    hundidos: 0,
    buenos: 0,
    cerca: 0,
    persigue: 0,
    fotos: 0,
    intentos: 0,
    aviso: 'Esperá las dos sombras para calcular su rumbo.',
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    moverCursor(s.c, dt);
    const [tx, tz] = destino(s.c);
    const ax = tx - s.gx;
    const az = tz - s.gz;
    const l = Math.hypot(ax, az);
    const paso = Math.min(l, 3.4 * dt);
    s.vx = l > 0.01 ? (ax / l) * (paso / Math.max(dt, 1e-4)) : 0;
    s.vz = l > 0.01 ? (az / l) * (paso / Math.max(dt, 1e-4)) : 0;
    if (l > 0.01) {
      s.gx += (ax / l) * paso;
      s.gz += (az / l) * paso;
    }
    if (input.take('fire')) registrar(m);
    if (!s.enc) {
      s.espera -= dt;
      if (s.espera <= 0) s.enc = nuevoEncuentro(m);
    }
    const e = s.enc;
    if (e) {
      const antes = e.t;
      e.t += dt;
      if (e.fin) {
        e.hundido += dt;
        if (e.hundido > 1.6) cerrar(m, e);
      } else {
        e.x += e.dx * p.v * dt;
        e.z += e.dz * p.v * dt;
        if (antes < 1.4 && e.t >= 1.4) e.sombras.push([e.x, e.z]);
        if (e.gira && antes < 2.6 && e.t >= 2.6) {
          const c = Math.cos(e.gira);
          const n = Math.sin(e.gira);
          [e.dx, e.dz] = [e.dx * c - e.dz * n, e.dx * n + e.dz * c];
          e.sombras.push([e.x, e.z]);
          s.aviso = '¡Cambió de rumbo! Mirá la sombra nueva.';
        }
        if (e.noSale && e.t >= 1.8) terminar(m, e, 'hundio');
        else if (e.t > 1.4) {
          const d = distancia(s);
          e.minimo = Math.min(e.minimo, d);
          const hacia = d > 0.01 ? (s.vx * (e.x - s.gx) + s.vz * (e.z - s.gz)) / d : 0;
          if (d < p.seguro) terminar(m, e, 'cerca');
          else if (hacia > 1.3 && d < p.observar + 1.2) terminar(m, e, 'persigue');
        }
        if (!e.fin && (e.x > 7 || e.x < -11.5 || e.z > 6 || e.z < -9 || e.t > 14)) cerrar(m, e);
      }
    }
    m.objetivo = s.aviso;
    m.lineas = [
      `Distancia ${s.enc && !s.enc.fin ? distancia(s).toFixed(1) : '—'} m · zona buena ${p.seguro.toFixed(1)}–${p.observar.toFixed(1)} m`,
      `Encuentros ${s.buenos} · Registros ${s.fotos}`,
    ];
    m.stats = {
      encuentros: s.encuentros,
      buenos: s.buenos,
      cerca: s.cerca,
      persigue: s.persigue,
      fotos: s.fotos,
      intentos: s.intentos,
    };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    const e = s.enc;
    if (actor === 'compa') {
      if (e && !e.fin && !e.registrado && e.t > 1.4 && enBanda(m)) registrar(m);
      return;
    }
    if (!e || e.fin || e.t < 1.4) return;
    const p = m.parametros;
    const d = distancia(s);
    // punto más cercano del corredor y, a un lado, el medio de la zona buena
    const k = (s.gx - e.x) * e.dx + (s.gz - e.z) * e.dz;
    const cx = e.x + e.dx * Math.max(k, 0);
    const cz = e.z + e.dz * Math.max(k, 0);
    let nx = -e.dz;
    let nz = e.dx;
    if ((s.gx - cx) * nx + (s.gz - cz) * nz < 0) {
      nx = -nx;
      nz = -nz;
    }
    const r = (p.seguro + p.observar) / 2;
    let x = cx + nx * r;
    let z = cz + nz * r;
    if (x < AREA.minX || x > AREA.maxX || z < AREA.minZ || z > AREA.maxZ) {
      x = cx - nx * r;
      z = cz - nz * r;
    }
    // cerca del animal solo se mueve si se aleja: nunca lo persigue
    const hacia = (x - s.gx) * (e.x - s.gx) + (z - s.gz) * (e.z - s.gz);
    if (d < p.observar + 1.6 && hacia > 0) {
      x = s.gx;
      z = s.gz;
    }
    const c = aCursor(x, z);
    s.c.x = c.x;
    s.c.y = c.y;
    s.c.auto = true;
    if (!e.registrado && enBanda(m)) registrar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const e = s.enc;
    const p = m.parametros;
    const t = m.tiempo;
    const rumbo = e ? Math.atan2(-e.dz, e.dx) : 0;
    return (
      <Isla nombre={p.nombre} aviso="Dos sombras = su rumbo · Boya a distancia · F registra">
        <Laguna ancho={14.5} largo={11.5} x={-2.2} z={-1} color="#27b3c7" />
        <Muelle letrero="Utila · grupo de buceo" />
        <Lancha pos={[2.8, 0.08, 4.4]} rot={0.2} franja="#f29e4c" />
        {[
          [-8.2, -5.2, 'cerebro', '#d9a441'],
          [-7.6, 3.6, 'abanico', '#a05bd1'],
          [3.6, -5.6, 'cuerno', '#e98d6b'],
          [-3.5, 4.2, 'tubo', '#f2c14e'],
        ].map(([x, z, tipo, color]) => (
          <Coral
            key={`${x}`}
            pos={[x as number, 0.05, z as number]}
            tipo={tipo as string}
            color={color as string}
            s={1.1}
          />
        ))}
        {[0, 1, 2, 3, 4].map((i) => {
          const a = t * 0.5 + i * 1.3;
          return (
            <Pez
              key={i}
              pos={[-1.5 + Math.cos(a) * 6, 0.16, -1 + Math.sin(a) * 4]}
              rot={-a - Math.PI / 2}
              color={['#f7c948', '#4cc9f0', '#f28482', '#90e0ef', '#ffd166'][i]}
              s={0.8}
            />
          );
        })}
        {e?.sombras.map(([x, z], i) => (
          <group key={i}>
            <Cyl pos={[x, 0.08, z]} r={0.7} h={0.04} color="#123447" mat="plastic" solid={false} cast={false} />
            <Label pos={[x, 1.2, z]} text={`sombra ${i + 1}`} h={0.26} bg="#123447" />
          </group>
        ))}
        {e &&
          p.ayuda &&
          e.sombras.length >= 2 &&
          !e.fin &&
          [1, 2, 3, 4, 5].map((k) => (
            <Ball
              key={k}
              pos={[e.sombras[1][0] + e.dx * k * 1.6, 0.1, e.sombras[1][1] + e.dz * k * 1.6]}
              r={0.08}
              color="#fefae0"
              cast={false}
            />
          ))}
        {e && (
          <TiburonBallena
            pos={[e.x, e.fin ? 0.12 - e.hundido * 0.6 : 0.14, e.z]}
            rot={rumbo}
            s={e.t < 1.4 ? 0.5 : 0.62}
            onda={t * 3}
          />
        )}
        <group position={[s.gx, 0, s.gz]}>
          <Cyl
            pos={[0, 0.05, 0]}
            r={p.observar}
            h={0.02}
            color="#7ae582"
            mat="glass"
            solid={false}
            cast={false}
            sides={28}
          />
          <Cyl
            pos={[0, 0.065, 0]}
            r={p.seguro}
            h={0.02}
            color="#ef476f"
            mat="glass"
            solid={false}
            cast={false}
            sides={24}
          />
          <Boya pos={[0, 0.02, 0]} />
          {[0, 1, 2].map((i) => (
            <group key={i} position={[Math.cos(i * 2.1) * 0.75, 0.12, Math.sin(i * 2.1) * 0.75]}>
              <Ball pos={[0, 0, 0]} r={0.16} color={['#8d5a3b', '#e0ac7e', '#c98f5f'][i]} cast={false} />
              <Ball pos={[0.1, 0.03, 0]} r={0.1} color="#7bdff2" mat="glass" cast={false} />
              <Cyl pos={[-0.08, 0.2, 0]} r={0.025} h={0.3} color="#ffbe0b" solid={false} cast={false} />
            </group>
          ))}
          <Label pos={[0, 1.5, 0]} text="Tu grupo" h={0.26} bg="#ef7a2f" />
        </group>
      </Isla>
    );
  },
});
export const Ballena = motor.Escena;
export const guia = motor.guia;
