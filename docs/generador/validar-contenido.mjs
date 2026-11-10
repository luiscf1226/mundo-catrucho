import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = path.resolve(root, '../../apps/web/shared/data');
const existentes = new Set('carrera futbol feria exploradores pulperia corte monta ritmo ruta pesca atrapa cocina trivia manejo'.split(' '));
const tipos = ['estrella', 'normal', 'loco'];
const turismoTipos = new Set('mirador sitio naturaleza festividad comida leyenda oficio viral'.split(' '));
const normalizar = s => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const vacias = new Set(normalizar('a al algo alguna algunas alguno algunos ante antes aqui asi aun bajo cada casi como con contra cual cuando de del desde despues donde dos el ella ellas ello ellos en entre era es esa esas ese esos esta estas este esto estos gana ganas ganar juego jugador la las le les lo los mas me mismo misma mientras muy nada ni no nos o otra otras otro otros para pero por porque que quien se segun ser si sin sobre solo su sus te tenes tiene todas todo todos tras tu tus un una unas uno unos usa usar vos y ya con clic cursor boton raton teclas flechas virtual virtuales simulado simulada simulacion replica replicas digital digitales tablero modelo maqueta ganás perdés ganá ganás').split(' '));
const json = async name => JSON.parse(await readFile(name, 'utf8'));
const departamentos = (await json(path.join(dataRoot, 'departments.json'))).departments;
const catalogo = {};
for (const file of (await readdir(path.join(dataRoot, 'catalogo'))).filter(x => x.endsWith('.json'))) {
  Object.assign(catalogo, await json(path.join(dataRoot, 'catalogo', file)));
}
const anterior = await json(path.join(root, 'unicos.json'));
const geograficas = new Set(departamentos.flatMap(d => normalizar(`${d.id} ${d.name} ${d.cabecera} ${d.landmark?.name ?? ''}`).split(' ')));
for (const d of Object.values(catalogo)) {
  for (const lugar of d.lugares) for (const palabra of normalizar(`${lugar[0]} ${lugar[1]}`).split(' ')) geograficas.add(palabra);
}
function raiz(p) {
  return p.replace(/(amientos|imientos|amiento|imiento|aciones|acion|mente|ando|iendo|ados|adas|idos|idas|arlas|arlos|arla|arlo|arse|erse|irse|as|es|os)$/u, '');
}
function palabras(s) {
  return new Set(normalizar(s).split(' ').filter(p => p.length > 3 && !vacias.has(p) && !geograficas.has(p)).map(raiz).filter(p => p.length > 3));
}
function similares(motores) {
  const sets = motores.map(m => palabras(m.mecanica));
  const pares = [];
  for (let i = 0; i < motores.length; i++) for (let j = i + 1; j < motores.length; j++) {
    const a = motores[i], b = motores[j];
    if (a.departamento === b.departamento) continue;
    const compartidas = [...sets[i]].filter(x => sets[j].has(x));
    const union = new Set([...sets[i], ...sets[j]]).size;
    const jaccard = union ? compartidas.length / union : 0;
    const cobertura = compartidas.length / Math.max(1, Math.min(sets[i].size, sets[j].size));
    if (normalizar(a.mecanica) === normalizar(b.mecanica) || (compartidas.length >= 3 && (jaccard >= .12 || cobertura >= .28))) {
      pares.push({ a: a.id, b: b.id, jaccard: +jaccard.toFixed(3), cobertura: +cobertura.toFixed(3), compartidas });
    }
  }
  return pares.sort((a, b) => b.jaccard - a.jaccard);
}
export function validar(contenido, viajes) {
  const errores = [], motores = [], nombres = new Set(), ids = new Set(), reutilizados = new Map();
  const conocidos = new Set(departamentos.map(d => d.id));
  const contador = { departamentos: 0, motores: 0, motoresNuevos: 0, motoresReutilizados: 0, juegos: 0, estrella: 0, normal: 0, loco: 0, turismo: 0, locuras: 0, rutas: 0, eventos: 0, vehiculos: 0 };
  const check = (ok, mensaje) => { if (!ok) errores.push(mensaje); };
  const texto = x => typeof x === 'string' && x.trim().length > 0;
  const url = x => { try { return texto(x) && ['https:', 'http:'].includes(new URL(x).protocol); } catch { return false; } };
  const lista = (x, label, min, max) => {
    check(Array.isArray(x), `${label}: debe ser un arreglo`);
    const arr = Array.isArray(x) ? x : [];
    check(arr.length >= min && arr.length <= max, `${label}: requiere ${min}–${max}, tiene ${arr.length}`);
    return arr;
  };
  const idUnico = (x, label) => { check(texto(x) && !ids.has(x), `${label}: id vacío o repetido ${x}`); ids.add(x); };
  check(contenido && typeof contenido === 'object' && !Array.isArray(contenido), 'contenido: debe ser un objeto');
  for (const key of Object.keys(contenido ?? {})) check(conocidos.has(key), `Departamento desconocido: ${key}`);
  for (const { id: dep } of departamentos) {
    const d = contenido?.[dep];
    check(d && typeof d === 'object', `Falta departamento: ${dep}`);
    if (!d || typeof d !== 'object') continue;
    contador.departamentos++;
    check(texto(d.esencia), `${dep}: falta esencia`);
    const propios = new Map(), usos = new Map();
    const lugares = new Set(catalogo[dep].lugares.map(x => x[0]));
    for (const m of lista(d.motores, `${dep}.motores`, 7, 10)) {
      if (!m || typeof m !== 'object') { check(false, `${dep}: motor inválido`); continue; }
      idUnico(m.id, `${dep}.motor`);
      check(typeof m.id === 'string' && m.id.startsWith(`${dep}.`), `${dep}: prefijo de motor incorrecto ${m.id}`);
      for (const f of ['nombre', 'mecanica', 'porQueAqui']) check(texto(m[f]), `${m.id}: falta ${f}`);
      check(Object.hasOwn(m, 'reutiliza') && (m.reutiliza === null || existentes.has(m.reutiliza)), `${m.id}: reutiliza inválido`);
      if (m.reutiliza != null) {
        check(!reutilizados.has(m.reutiliza), `Motor existente ${m.reutiliza} ya asignado a ${reutilizados.get(m.reutiliza)}`);
        reutilizados.set(m.reutiliza, dep); contador.motoresReutilizados++;
      } else contador.motoresNuevos++;
      propios.set(m.id, m); motores.push({ ...m, departamento: dep }); contador.motores++;
    }
    const juegos = lista(d.juegos, `${dep}.juegos`, 12, 15);
    check(juegos.filter(j => j?.tipo === 'estrella').length >= 3, `${dep}: menos de 3 estrella`);
    check(juegos.filter(j => j?.tipo === 'loco').length >= 2, `${dep}: menos de 2 loco`);
    for (const j of juegos) {
      if (!j || typeof j !== 'object') { check(false, `${dep}: juego inválido`); continue; }
      idUnico(j.id, `${dep}.juego`);
      const nombre = normalizar(j.nombre);
      check(texto(j.nombre) && !nombres.has(nombre), `Nombre de juego repetido o vacío: ${j.nombre}`); nombres.add(nombre);
      check(propios.has(j.motor), `${j.id}: motor ajeno o inexistente ${j.motor}`);
      usos.set(j.motor, (usos.get(j.motor) ?? 0) + 1);
      check(lugares.has(j.lugar), `${j.id}: lugar ajeno o inexistente ${j.lugar}`);
      check(tipos.includes(j.tipo), `${j.id}: tipo inválido`);
      check(Number.isInteger(j.etapas) && j.etapas >= 3 && j.etapas <= 6, `${j.id}: etapas fuera de 3–6`);
      for (const f of ['deQueVa', 'guino', 'icono']) check(texto(j[f]), `${j.id}: falta ${f}`);
      const origenes = new Set([...anterior[dep].map(x => x.id), ...catalogo[dep].juegos.map(x => x[0])]);
      check(Object.hasOwn(j, 'origen') && (j.origen === null || origenes.has(j.origen)), `${j.id}: origen inexistente`);
      contador.juegos++; if (tipos.includes(j.tipo)) contador[j.tipo]++;
    }
    for (const [motor, n] of usos) check(n <= 2, `${motor}: sirve a ${n} juegos (máximo 2)`);
    for (const t of lista(d.turismo, `${dep}.turismo`, 6, 10)) {
      if (!t || typeof t !== 'object') { check(false, `${dep}: turismo inválido`); continue; }
      idUnico(t.id, `${dep}.turismo`);
      check(lugares.has(t.lugar), `${t.id}: lugar turístico ajeno o inexistente ${t.lugar}`);
      check(turismoTipos.has(t.tipo), `${t.id}: tipo turístico inválido`);
      for (const f of ['nombre', 'queHaces', 'dato']) check(texto(t[f]), `${t.id}: falta ${f}`);
      check(url(t.fuente), `${t.id}: falta fuente URL válida`); contador.turismo++;
    }
    for (const l of lista(d.locuras, `${dep}.locuras`, 3, 6)) {
      if (!l || typeof l !== 'object') { check(false, `${dep}: locura inválida`); continue; }
      for (const f of ['nombre', 'queEs', 'comoAparece']) check(texto(l[f]), `${dep}.locura: falta ${f}`);
      check(url(l.fuente), `${dep}.locura ${l.nombre}: falta fuente URL válida`); contador.locuras++;
    }
  }
  for (const e of existentes) check(reutilizados.has(e), `Motor existente sin asignar: ${e}`);
  const grafo = new Map([...conocidos].map(x => [x, new Set()]));
  for (const r of lista(viajes?.rutas, 'rutas', 15, 25)) {
    if (!r || typeof r !== 'object') { check(false, 'Ruta inválida'); continue; }
    check(conocidos.has(r.de) && conocidos.has(r.a), `Ruta a departamento inexistente: ${r.de} → ${r.a}`);
    if (grafo.has(r.de) && grafo.has(r.a)) { grafo.get(r.de).add(r.a); grafo.get(r.a).add(r.de); }
    check(url(r.fuente), `${r.de} → ${r.a}: falta fuente URL válida`);
    check(Number.isFinite(r.horasReales) && r.horasReales > 0, `${r.de} → ${r.a}: horas inválidas`);
    check(Number.isFinite(r.minutosEnJuego) && r.minutosEnJuego * 60 >= 40 && r.minutosEnJuego <= 4, `${r.de} → ${r.a}: duración fuera de 40 s–4 min`);
    check(texto(r.carretera), `${r.de} → ${r.a}: falta carretera o medio no terrestre`);
    check(r.sePuedeSaltar === true, `${r.de} → ${r.a}: falta opción de saltar`);
    check(Array.isArray(r.paradas) && r.paradas.length > 0, `${r.de} → ${r.a}: falta parada`);
    contador.rutas++;
  }
  for (const [dep, vecinos] of grafo) check(vecinos.size > 0, `${dep}: sin ruta`);
  const visitados = new Set(), pendientes = [departamentos[0].id];
  while (pendientes.length) { const d = pendientes.pop(); if (visitados.has(d)) continue; visitados.add(d); pendientes.push(...grafo.get(d)); }
  check(visitados.size === conocidos.size, `Red desconectada: solo ${visitados.size}/${conocidos.size} departamentos conectados`);
  for (const e of lista(viajes?.eventosDeCarretera, 'eventosDeCarretera', 15, 25)) {
    if (!e || typeof e !== 'object') { check(false, 'Evento inválido'); continue; }
    for (const f of ['nombre', 'queEs', 'efecto']) check(texto(e[f]), `Evento: falta ${f}`);
    check(e.donde === 'todas' || (Array.isArray(e.donde) && e.donde.length && e.donde.every(d => conocidos.has(d))), `Evento ${e.nombre}: departamento inválido`);
    contador.eventos++;
  }
  for (const v of lista(viajes?.vehiculos, 'vehiculos', 1, 30)) {
    check(v && texto(v.id) && texto(v.nombre) && texto(v.comoSeManeja), 'Vehículo incompleto');
    check(Array.isArray(v?.donde) && v.donde.length && v.donde.every(d => conocidos.has(d)), `Vehículo ${v?.id}: departamento inválido`);
    contador.vehiculos++;
  }
  const pares = similares(motores);
  for (const p of pares) {
    const a = motores.find(m => m.id === p.a), b = motores.find(m => m.id === p.b);
    check(normalizar(a.mecanica) !== normalizar(b.mecanica), `Mecánica idéntica entre departamentos: ${p.a} / ${p.b}`);
  }
  return { errores, pares, resumen: contador };
}

const contenido = await json(path.join(root, 'contenido.json'));
const viajes = await json(path.join(root, 'viajes.json'));
if (process.argv.includes('--self-test')) {
  const pruebas = [
    ['departamento', c => delete c.atlantida],
    ['mínimo motores', c => c.atlantida.motores.splice(0, 2)],
    ['máximo motores', c => c.atlantida.motores.push(...structuredClone(c.cortes.motores))],
    ['mínimo juegos', c => c.atlantida.juegos.pop()],
    ['máximo juegos', c => c.atlantida.juegos.push(...structuredClone(c.cortes.juegos))],
    ['estrella', c => c.atlantida.juegos.forEach(j => { if (j.tipo === 'estrella') j.tipo = 'normal'; })],
    ['loco', c => c.atlantida.juegos.forEach(j => { if (j.tipo === 'loco') j.tipo = 'normal'; })],
    ['motor ajeno', c => c.atlantida.juegos[0].motor = c.cortes.motores[0].id],
    ['id motor repetido', c => c.atlantida.motores[1].id = c.cortes.motores[1].id],
    ['reutilización compartida', c => c.cortes.motores[1].reutiliza = 'ritmo'],
    ['más de dos usos', c => c.atlantida.juegos[4].motor = c.atlantida.juegos[0].motor],
    ['lugar juego', c => c.atlantida.juegos[0].lugar = 'no-existe'],
    ['nombre repetido', c => c.atlantida.juegos[0].nombre = c.cortes.juegos[0].nombre],
    ['turismo mínimo', c => c.atlantida.turismo.length = 5],
    ['turismo máximo', c => c.atlantida.turismo.push(...structuredClone(c.cortes.turismo))],
    ['locuras mínimo', c => c.atlantida.locuras.pop()],
    ['locuras máximo', c => c.atlantida.locuras.push(...structuredClone(c.cortes.locuras), ...structuredClone(c.cortes.locuras))],
    ['fuente turismo', c => delete c.atlantida.turismo[0].fuente],
    ['fuente locura', c => delete c.atlantida.locuras[0].fuente],
    ['fuente ruta', (_, v) => delete v.rutas[0].fuente],
    ['ruta desconocida', (_, v) => v.rutas[0].a = 'no-existe'],
    ['sin ruta', (_, v) => v.rutas = v.rutas.filter(r => r.de !== 'graciasadios' && r.a !== 'graciasadios')],
    ['mecánica idéntica', c => c.atlantida.motores[0].mecanica = c.cortes.motores[0].mecanica],
    ['duración', (_, v) => v.rutas[0].minutosEnJuego = 8],
  ];
  if (validar(contenido, viajes).errores.length) throw new Error('El control base debe pasar antes del self-test');
  for (const [nombre, cambiar] of pruebas) {
    const c = structuredClone(contenido), v = structuredClone(viajes); cambiar(c, v);
    if (!validar(c, v).errores.length) throw new Error(`No detectó: ${nombre}`);
  }
  const p = similares([{ id: 'a', departamento: 'a', mecanica: 'Con flechas orientá una red de compuertas para distribuir caudal entre canales; el agua excedente rebalsa.' }, { id: 'b', departamento: 'b', mecanica: 'Con clic abrí compuertas para distribuir caudal por canales; el agua que rebalsa reduce la ganancia.' }]);
  if (!p.length) throw new Error('No detectó paráfrasis con palabras clave compartidas');
  console.log(`PASA: ${pruebas.length} mutaciones rechazadas y detección de paráfrasis verificada, sin escribir archivos.`);
} else {
  const { errores, pares, resumen } = validar(contenido, viajes);
  console.log(`Pares parecidos entre departamentos: ${pares.length} (revisión editorial; coincidencia léxica no demuestra equivalencia).`);
  for (const p of pares) console.log(`  ${p.a} ↔ ${p.b} | J=${p.jaccard} cobertura=${p.cobertura} | ${p.compartidas.join(', ')}`);
  console.log(JSON.stringify(resumen, null, 2));
  if (errores.length) { console.error(`FALLA: ${errores.length} errores\n${errores.map(e => `- ${e}`).join('\n')}`); process.exitCode = 1; }
  else console.log('PASA: estructura, pertenencia, límites, fuentes y conectividad. La validez factual de las URLs y la exclusividad semántica requieren revisión humana.');
}
