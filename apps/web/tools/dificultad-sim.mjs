// MC-03 · Cálculos de dificultad para los motores donde un bot dentro del navegador no es práctico (caminar, manejar).
// Cada función simula muchas etapas con un modelo de jugador («normal» = primera vez, reacción ~0.35 s, errores;
// «bueno» = ya le agarró la onda) usando las mismas fórmulas que el motor. Devuelve el reparto de estrellas.
import { createDrive, stepDrive } from '../src/game/viaje/model.ts';

let seed = 12345;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 1.41;
const stars = (v, [b, s, g]) => (v >= g ? 3 : v >= s ? 2 : v >= b ? 1 : 0);
const reparto = (lista) => {
  const n = lista.length,
    c = [0, 0, 0, 0];
  for (const x of lista) c[x]++;
  return {
    gana: c.slice(1).reduce((a, b) => a + b, 0) / n,
    tres: c[3] / n,
    media: lista.reduce((a, b) => a + b, 0) / n,
  };
};

// ------------------------------------------------------------------ trivia (Trivia.tsx)
// Acertar vale 100 + 8 × segundos que sobraban al pisar la plataforma; se contesta quedándose quieto 1.4 s.
// Normal: lee en ~3 s, camina 1.6 s y acierta 6 de 10 hondureñismos. Bueno: lee en 1.6 s, corre 1.1 s y acierta 9 de 10.
export const trivia = {
  cuantas: (dif) => 8 + Math.round(dif * 2),
  T: (dif) => 10 - 4 * dif,
  metas(dif) {
    const n = this.cuantas(dif),
      r = (v) => Math.round((n * v) / 10) * 10;
    return [r(50 + 10 * dif), r(80 + 5 * dif), r(108)];
  },
  jugar(dif, quien, veces = 4000) {
    const n = this.cuantas(dif),
      T = this.T(dif),
      m = this.metas(dif),
      out = [],
      dur = [];
    const lee = quien === 'normal' ? 3 : 1.6,
      camina = quien === 'normal' ? 1.6 : 1.1,
      sabe = quien === 'normal' ? 0.6 : 0.9;
    for (let v = 0; v < veces; v++) {
      let pts = 0,
        tiempo = 0;
      for (let q = 0; q < n; q++) {
        const llega = lee + camina + Math.abs(gauss()) * 0.8,
          tf = T - llega;
        if (tf > 0 && rnd() < sabe) pts += 100 + Math.round(tf * 8);
        tiempo += Math.min(T, llega + 1.4) + 1.8 + 1.1;
      }
      out.push(stars(pts, m));
      dur.push(tiempo);
    }
    return { ...reparto(out), metas: m, duracion: Math.round(dur.reduce((a, b) => a + b) / veces) };
  },
};

// ------------------------------------------------------------------ cocina (Cocina.tsx)
// Clientes que llegan cada 9 − 4·dif + U(0,2) s (máximo 3 esperando), con paciencia (20 + 5·pasos)(1 − dif/4).
// Armar un pedido: caminar por la fila de ingredientes (izquierda → derecha) y entregar. Error = −4 s de paciencia.
export const cocina = {
  dur: (dif) => Math.round(80 + 20 * dif),
  metas: (dif) => [
    Math.round((150 + 50 * dif) / 10) * 10,
    Math.round((350 + 150 * dif) / 10) * 10,
    Math.round((600 + 250 * dif) / 10) * 10,
  ],
  jugar(dif, quien, n = 5, veces = 3000) {
    const m = this.metas(dif),
      D = this.dur(dif),
      out = [];
    const porPaso = quien === 'normal' ? 1.05 : 0.6,
      leer = quien === 'normal' ? 1.4 : 0.6,
      error = quien === 'normal' ? 0.08 : 0.02,
      caminar = quien === 'normal' ? 4.2 : 2.6;
    for (let v = 0; v < veces; v++) {
      let t = 0,
        llega = 0.6,
        score = 0,
        combo = 0,
        libre = 0,
        id = 0;
      const cl = [];
      while (t < D) {
        const dt = 0.05;
        t += dt;
        llega -= dt;
        if (llega <= 0 && D - t > 6 && cl.length < 3) {
          const kk = Math.max(Math.min(2, n), Math.min(n, Math.round(2 + rnd() * (n - 2) + dif * (n - 2) * 0.4))),
            max = (20 + 5 * kk) * (1 - 0.25 * dif);
          cl.push({ id: id++, kk, max, pat: max, espera: 11 / 4 }); // entra caminando ~2.7 s
          llega = 9 - 4 * dif + rnd() * 2;
        }
        for (const c of cl) {
          if (c.espera > 0) c.espera -= dt;
          else c.pat -= dt;
        }
        for (let i = cl.length - 1; i >= 0; i--)
          if (cl[i].pat <= 0) {
            cl.splice(i, 1);
            combo = 0;
          }
        if (t >= libre) {
          const c = cl.filter((x) => x.espera <= 0).sort((a, b) => a.id - b.id)[0];
          if (c && !c.trabajo) {
            let need = leer + caminar * (0.5 + c.kk / n / 2);
            for (let k = 0; k < c.kk; k++)
              if (rnd() < error) {
                need += 0.7 + porPaso;
                c.pat -= 4;
                combo = 0;
              } else need += porPaso;
            c.trabajo = true;
            c.listo = t + need;
            libre = t + need;
          } else if (c?.listo && t >= c.listo && c.pat > 0) {
            combo++;
            score += 15 + 10 * c.kk + Math.round((20 * Math.max(0, c.pat)) / c.max) + Math.min(15, 5 * (combo - 1));
            cl.splice(cl.indexOf(c), 1);
          }
        }
      }
      out.push(stars(score, m));
    }
    return { ...reparto(out), metas: m, duracion: D };
  },
};

// ------------------------------------------------------------------ manejo (Manejo.tsx + viaje/model.ts)
// Un chofer que mira el tráfico con retraso, escoge el carril más libre, se orilla y frena en las paradas.
export const manejo = {
  limite: (dif) => 95 - 15 * dif,
  meta: (dif) => 850 + 180 * dif,
  choque: (dif) => Math.round(15 + 20 * dif),
  metas: () => [120, 240, 360],
  jugar(dif, quien, veces = 300, veh = 'rapidito', via = 'ciudad') {
    const out = [],
      choques = [];
    const lag = quien === 'normal' ? 0.4 : 0.22,
      ve = quien === 'normal' ? 0.85 : 0.97;
    for (let v = 0; v < veces; v++) {
      const c = { veh, via, difficulty: dif, trip: false, seed: (rnd() * 1e9) | 0 };
      const s = createDrive(c),
        hist = [],
        ciego = new Set();
      const dt = 1 / 30,
        limit = this.limite(dif),
        target = this.meta(dif);
      let lane = 0;
      for (;;) {
        hist.push({ t: s.elapsed, tr: s.traffic.map((a) => ({ a, x: a.x, z: a.z })) });
        while (hist.length > 1 && hist[0].t < s.elapsed - lag) hist.shift();
        const vista = hist[0].tr.filter((o) => !ciego.has(o.a));
        for (const o of s.traffic) if (o.z > 5 && rnd() < 0.02) ciego.delete(o.a);
        for (const o of vista) if (o.z < -60 && o.z > -62 && rnd() > ve) ciego.add(o.a);
        const parada = s.stops.find((p) => !p.taken && p.distance - s.distance < 70 && p.distance - s.distance > -12);
        let steer, pedal;
        if (parada) {
          const d = parada.distance - s.distance;
          steer = Math.max(-1, Math.min(1, (6.2 - s.x) * 0.9));
          pedal = d < 10 || s.speed > 11 ? 1 : 0;
        } else {
          const libre = (lx) =>
            Math.min(80, ...vista.filter((o) => o.z < 3 && Math.abs(o.x - lx) < 2.2).map((o) => -o.z));
          const lanes = [-3.4, 0, 3.4];
          const actual = libre(lanes[lane + 1] ?? 0);
          if (actual < 40) {
            const mejor = [-1, 0, 1].sort((a, b) => libre(lanes[b + 1]) - libre(lanes[a + 1]))[0];
            if (libre(lanes[mejor + 1]) > actual + 8) lane = mejor;
          }
          steer = Math.max(-1, Math.min(1, (lanes[lane + 1] - s.x) * 0.7));
          pedal = actual < 18 ? 0.5 : -1;
        }
        stepDrive(s, c, dt, steer, pedal, false);
        if ((s.distance >= target && s.elapsed >= 60) || s.elapsed >= limit) break;
      }
      const score = Math.max(0, s.collected * 120 + (s.distance >= target ? 120 : 0) - s.hits * this.choque(dif));
      const won = s.distance >= target && s.collected >= 1 && score >= 120;
      out.push(won ? stars(score, this.metas()) : 0);
      choques.push(s.hits);
    }
    return {
      ...reparto(out),
      metas: this.metas(),
      choques: choques.reduce((a, b) => a + b) / veces,
      duracion: this.limite(dif),
    };
  },
};

// ------------------------------------------------------------------ ruta (Ruta.tsx + ruta/gen.ts)
// Recorrido de saltos: el largo lo mide la prueba en el navegador. Velocidad efectiva con dudas, saltos y caídas:
// normal ~3 m/s, bueno ~5.2 m/s (corre a 8.2 m/s). 2⭐ = 30 % del tiempo sobrando, 3⭐ = 55 %.
export const ruta = {
  limite: (dif) => Math.round(70 + 40 * dif),
  jugar(dif, quien, largo) {
    const vel = quien === 'normal' ? 3 : 5.2,
      TL = this.limite(dif),
      t = largo / vel,
      frac = (TL - t) / TL;
    return { tiempo: Math.round(t), TL, estrellas: t > TL ? 0 : frac >= 0.55 ? 3 : frac >= 0.3 ? 2 : 1 };
  },
};
