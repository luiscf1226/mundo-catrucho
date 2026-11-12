// Cadena de frío colonial: divisores aislantes en el carrito de pilones; cada tapa abierta calienta a las vecinas.
import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import {
  acercar,
  cursor,
  limitar,
  metasLineales,
  moverCursor,
  Pilon as PilonFigura,
  reloj,
  Taller,
  texto,
  turno,
  variante,
} from './comun';

const SABORES: [string, string][] = [
  ['Mora', '#7b2d8e'],
  ['Mango', '#f6a623'],
  ['Coco', '#f2efe6'],
  ['Tamarindo', '#8d5a2b'],
  ['Leche', '#fff3c4'],
  ['Fresa', '#e84a5f'],
];
const N = SABORES.length;
const ANCHO = 1.15;
const X0 = -6.2;
const SOLIDO = 0.35;
type Pedido = { i: number; paciencia: number };
type Estado = {
  c: ReturnType<typeof cursor>;
  frio: number[];
  divisor: boolean[];
  hielo: number;
  abierta: number[];
  pedidos: Pedido[];
  proximo: number;
  favoritos: number[];
  azar: () => number;
  espera: number;
  ayuda: boolean;
  servidos: number;
  derretidos: number;
  perdidos: number;
  aperturas: number;
  movidas: number;
  aviso: string;
};
type Param = {
  hielo: boolean;
  divisores: number;
  calor: number;
  cada: number;
  paciencia: number;
  nombre: string;
  semilla: number;
};
type Sesion = Motor<Param, Estado>;
const centro = (i: number) => X0 + ANCHO * (i + 0.5);
const posCursor = (c: { x: number }) => ((c.x + 1) / 2) * N;
const compartimento = (c: { x: number }) => Math.max(0, Math.min(N - 1, Math.floor(posCursor(c))));
const frontera = (c: { x: number }) => Math.max(0, Math.min(N - 2, Math.round(posCursor(c)) - 1));
const haciaCompartimento = (i: number) => ((i + 0.5) / N) * 2 - 1;
const haciaFrontera = (b: number) => ((b + 1) / N) * 2 - 1;
const separados = (s: Estado, a: number, b: number) => s.divisor[Math.min(a, b)];

function abrir(m: Sesion) {
  const s = m.datos;
  const i = compartimento(s.c);
  s.aperturas++;
  s.abierta[i] = 0.6;
  s.frio[i] -= 0.05;
  for (const j of [i - 1, i + 1]) if (j >= 0 && j < N && !separados(s, i, j)) s.frio[j] -= 0.15 + m.partida.dif * 0.05;
  const k = s.pedidos.findIndex((p) => p.i === i);
  if (k < 0) {
    m.sumar(-5);
    s.aviso = `Nadie pidió ${SABORES[i][0].toLowerCase()}: se escapó el frío.`;
    return;
  }
  s.pedidos.splice(k, 1);
  if (s.frio[i] >= SOLIDO) {
    s.servidos++;
    m.sumar(s.frio[i] >= 0.7 ? 40 : 30);
    s.aviso = `¡Pilón de ${SABORES[i][0].toLowerCase()} bien sólido!`;
  } else {
    s.derretidos++;
    m.sumar(-10);
    s.aviso = `El de ${SABORES[i][0].toLowerCase()} salió aguado.`;
  }
}
function mover(m: Sesion) {
  const s = m.datos;
  s.movidas++;
  if (m.parametros.hielo) {
    s.hielo = compartimento(s.c);
    s.aviso = `Hielo de reserva al de ${SABORES[s.hielo][0].toLowerCase()}.`;
    return;
  }
  const b = frontera(s.c);
  if (s.divisor[b]) {
    s.divisor[b] = false;
    s.aviso = 'Quitaste un divisor.';
  } else if (s.divisor.filter(Boolean).length >= m.parametros.divisores) {
    s.aviso = `Solo tenés ${m.parametros.divisores} divisores: quitá uno primero.`;
  } else {
    s.divisor[b] = true;
    s.aviso = 'Divisor aislante puesto.';
  }
}
const motor = defineMotor({
  id: 'comayagua.pilon',
  fondo: 'pueblo',
  guia: {
    goal: 'Aislá con divisores los sabores que más piden y abrí solo la tapa del pedido. Cada tapa calienta a sus vecinas.',
    keys: [
      ['A / D', 'moverte por el carrito'],
      ['Mouse / stick derecho', 'elegir compartimento'],
      ['E / mando X', 'poner o quitar divisor (o mover el hielo)'],
      ['F / clic / RT', 'abrir la tapa y servir'],
    ],
    touch: [
      ['Palanca / arrastrá', 'elegir compartimento'],
      ['E', 'divisor o hielo'],
      ['🎯', 'servir'],
    ],
  },
  etapa: (p) => {
    const hielo = variante(p) === 'calor';
    return {
      hielo,
      divisores: 2,
      calor: 0.015 + p.dif * 0.015 + (hielo ? 0.012 : 0),
      cada: 4.2 - p.dif * 1.4,
      paciencia: 9 - p.dif * 2,
      nombre: texto(p.tema.nombre, 'Carrito de pilones'),
      semilla: p.seed,
    };
  },
  metas: metasLineales(120, 260, 400, 60),
  duracion: reloj(80, 10),
  crear: (p): Estado => {
    const azar = rng(p.semilla);
    const a = Math.floor(azar() * N);
    const b = (a + 2 + Math.floor(azar() * 3)) % N;
    const divisor = Array.from({ length: N - 1 }, () => false);
    if (p.hielo) {
      // con calor los divisores ya vienen puestos; lo que se mueve es la reserva de hielo
      divisor[Math.max(0, a - 1)] = true;
      divisor[Math.min(N - 2, b)] = true;
    }
    return {
      c: cursor(),
      frio: Array.from({ length: N }, () => 1),
      divisor,
      hielo: p.hielo ? (a + 3) % N : -1,
      abierta: Array.from({ length: N }, () => 0),
      pedidos: [],
      proximo: 3.5,
      favoritos: [a, b],
      azar,
      espera: 0.5,
      ayuda: false,
      servidos: 0,
      derretidos: 0,
      perdidos: 0,
      aperturas: 0,
      movidas: 0,
      aviso: p.hielo ? 'Ola de calor: mové el hielo a donde haga falta.' : 'Antes de vender, poné los divisores.',
    };
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    moverCursor(s.c, dt, 1.2);
    if (input.take('use')) mover(m);
    if (input.take('fire')) abrir(m);
    // frío: el carrito enfría despacio, el calor de la calle entra, y entre vecinos sin divisor se reparte
    const antes = [...s.frio];
    for (let i = 0; i < N; i++) {
      let d = 0.05 - p.calor + (s.ayuda ? 0.01 : 0);
      if (s.hielo === i) d += 0.06;
      if (s.hielo >= 0 && Math.abs(s.hielo - i) === 1 && !separados(s, i, s.hielo)) d += 0.02;
      for (const j of [i - 1, i + 1]) if (j >= 0 && j < N && !separados(s, i, j)) d += (antes[j] - antes[i]) * 0.08;
      s.frio[i] = limitar(s.frio[i] + d * dt, 0, 1);
      s.abierta[i] = Math.max(0, s.abierta[i] - dt);
    }
    s.proximo -= dt;
    if (s.proximo <= 0) {
      const cuantos = p.hielo && s.azar() < 0.4 ? 2 : 1;
      for (let k = 0; k < cuantos && s.pedidos.length < 4; k++) {
        const i = s.azar() < 0.65 ? s.favoritos[Math.floor(s.azar() * 2)] : Math.floor(s.azar() * N);
        s.pedidos.push({ i, paciencia: p.paciencia });
      }
      s.proximo = p.cada * (s.pedidos.length > 2 ? 1.4 : 1);
    }
    for (const pe of s.pedidos) pe.paciencia -= dt;
    const idos = s.pedidos.filter((pe) => pe.paciencia <= 0).length;
    if (idos) {
      s.perdidos += idos;
      m.sumar(-10 * idos);
      s.pedidos = s.pedidos.filter((pe) => pe.paciencia > 0);
      s.aviso = 'Se fue un cliente sin su pilón.';
    }
    s.ayuda = false;
    m.objetivo = s.aviso;
    m.lineas = [
      s.pedidos.length
        ? `Pedidos: ${s.pedidos.map((pe) => `${SABORES[pe.i][0]} ${Math.ceil(pe.paciencia)}s`).join(' · ')}`
        : 'Sin pedidos: es hora de acomodar el frío',
      `Servidos ${s.servidos} · Aguados ${s.derretidos} · Se fueron ${s.perdidos}`,
      p.hielo ? 'E mueve el hielo de reserva' : `Divisores ${s.divisor.filter(Boolean).length}/${p.divisores}`,
    ];
    m.stats = {
      servidos: s.servidos,
      derretidos: s.derretidos,
      perdidos: s.perdidos,
      aperturas: s.aperturas,
      movidas: s.movidas,
      divisores: s.divisor.filter(Boolean).length,
      hielo: s.hielo,
      sel: compartimento(s.c),
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    const p = m.parametros;
    if (actor === 'compa') {
      s.ayuda = true;
      return;
    }
    s.c.auto = true;
    const pe = [...s.pedidos].sort((a, b) => a.paciencia - b.paciencia)[0];
    let x: number;
    let accion: 'abrir' | 'mover' | null = null;
    if (!p.hielo) {
      // aislar a los dos favoritos: divisores a cada lado del primero, si alcanzan
      const quiere = [s.favoritos[0] - 1, s.favoritos[0]].filter((b) => b >= 0 && b < N - 1);
      const sobra = s.divisor.findIndex((v, b) => v && !quiere.includes(b));
      const falta = quiere.find((b) => !s.divisor[b]);
      if (sobra >= 0 && falta !== undefined) {
        x = haciaFrontera(sobra);
        accion = 'mover';
      } else if (falta !== undefined) {
        x = haciaFrontera(falta);
        accion = 'mover';
      } else if (pe) {
        x = haciaCompartimento(pe.i);
        accion = 'abrir';
      } else return;
    } else if (pe && s.hielo !== pe.i && s.frio[pe.i] < 0.55) {
      x = haciaCompartimento(pe.i);
      accion = 'mover';
    } else if (pe) {
      x = haciaCompartimento(pe.i);
      accion = 'abrir';
    } else return;
    s.c.x = acercar(s.c.x, x, dt * 1.8);
    if (Math.abs(s.c.x - x) > 0.001 || !turno(s, dt, 0.55)) return;
    if (accion === 'mover') mover(m);
    else abrir(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const sel = compartimento(s.c);
    const fr = frontera(s.c);
    const z = -0.4;
    return (
      <Taller nombre={m.parametros.nombre} aviso="A/D compartimento · E divisor · F abrir y servir">
        {/* carrito: caja, ruedas, sombrilla y campanita */}
        <Block
          pos={[X0 + (N * ANCHO) / 2, 0.35, z]}
          size={[N * ANCHO + 0.3, 0.1, 1.5]}
          color="#f4f1e8"
          mat="plastic"
          solid={false}
        />
        {[-0.72, 0.72].map((dz) => (
          <Block
            key={dz}
            pos={[X0 + (N * ANCHO) / 2, 0.85, z + dz]}
            size={[N * ANCHO + 0.3, 1.1, 0.06]}
            color="#f4f1e8"
            mat="plastic"
            solid={false}
          />
        ))}
        {[-0.12, N * ANCHO + 0.12].map((dx) => (
          <Block
            key={dx}
            pos={[X0 + dx, 0.85, z]}
            size={[0.06, 1.1, 1.5]}
            color="#f4f1e8"
            mat="plastic"
            solid={false}
          />
        ))}
        <Block
          pos={[X0 + (N * ANCHO) / 2, 0.75, z + 0.76]}
          size={[N * ANCHO + 0.32, 0.3, 0.04]}
          color="#2a6f97"
          mat="plastic"
          solid={false}
          cast={false}
        />
        {[X0 + 0.5, X0 + N * ANCHO - 0.5].map((x) => (
          <group key={x} position={[x, 0.32, z + 0.8]} rotation-x={Math.PI / 2}>
            <Cyl pos={[0, 0, 0]} r={0.3} h={0.12} color="#2b2b2b" mat="plastic" solid={false} cast={false} />
          </group>
        ))}
        <Cyl pos={[X0 - 0.4, 1.5, z - 0.6]} r={0.04} h={3} color="#d9d9d9" mat="metal" solid={false} cast={false} />
        <Cyl
          pos={[X0 - 0.4, 3.1, z - 0.6]}
          r={0.9}
          rTop={0.06}
          h={0.4}
          color={m.parametros.hielo ? '#e63946' : '#ffd166'}
          mat="cloth"
          solid={false}
          sides={10}
        />
        <Ball pos={[X0 + N * ANCHO + 0.3, 1.4, z]} r={0.13} color="#d9a520" mat="gold" />
        {SABORES.map(([nombre, color], i) => {
          const x = centro(i);
          const f = s.frio[i];
          return (
            <group key={nombre}>
              {[-0.25, 0.25].map((dx) => (
                <PilonFigura
                  key={dx}
                  pos={[x + dx, 0.82, z + dx * 0.8]}
                  color={color}
                  derretido={Math.max(0, (SOLIDO + 0.25 - f) / (SOLIDO + 0.25))}
                />
              ))}
              <group position={[x, 1.44, z - 0.7]} rotation-x={s.abierta[i] > 0 ? -1.2 : 0}>
                <Block
                  pos={[0, 0, 0.7]}
                  size={[ANCHO - 0.08, 0.05, 1.4]}
                  color={i === sel ? '#ffe9a8' : '#cfe8f3'}
                  mat="glass"
                  solid={false}
                  cast={false}
                />
              </group>
              <group position={[x, 0.42, z + 0.8]} scale={[1, Math.max(0.02, f), 1]}>
                <Block
                  pos={[0, 0.35, 0]}
                  size={[0.7, 0.7, 0.04]}
                  color={f >= 0.7 ? '#4cc9f0' : f >= SOLIDO ? '#ffd166' : '#e63946'}
                  mat="neon"
                  solid={false}
                  cast={false}
                />
              </group>
              <Label pos={[x, 2.1, z - 0.9]} text={nombre} h={0.22} bg={i === sel ? '#c0392b' : '#2a6f97'} />
              {s.hielo === i && (
                <Block
                  pos={[x, 0.55, z + 0.5]}
                  size={[0.7, 0.3, 0.3]}
                  color="#d6f6ff"
                  mat="plastic"
                  solid={false}
                  cast={false}
                />
              )}
            </group>
          );
        })}
        {s.divisor.map((v, b) =>
          v ? (
            <Block
              key={b}
              pos={[X0 + ANCHO * (b + 1), 0.9, z]}
              size={[0.1, 1.08, 1.4]}
              color="#4fb3d9"
              mat="plastic"
              solid={false}
            />
          ) : null,
        )}
        {!m.parametros.hielo && (
          <Block
            pos={[X0 + ANCHO * (fr + 1), 2.0, z]}
            size={[0.06, 0.06, 1.6]}
            color="#7fd1e8"
            mat="neon"
            solid={false}
            cast={false}
          />
        )}
        <Ball pos={[centro(sel), 2.55, z]} r={0.12} color="#ffd166" mat="neon" cast={false} />
        {s.pedidos.slice(0, 4).map((pe, k) => (
          <Label
            key={k}
            pos={[-5.2 + k * 2.4, 1.1, 2.3]}
            text={`🍦 ${SABORES[pe.i][0]} · ${Math.ceil(pe.paciencia)}`}
            h={0.42}
            bg={pe.paciencia < 3 ? '#c0392b' : '#7a3b1f'}
          />
        ))}
        {m.parametros.hielo && <Label pos={[3, 3.2, -2.5]} text="☀ ¡Ola de calor!" h={0.36} bg="#e76f51" />}
      </Taller>
    );
  },
});
export const Pilon = motor.Escena;
export const guia = motor.guia;
