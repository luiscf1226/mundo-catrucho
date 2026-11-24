// Genera docs/revision-cultural/hojas/<depto>.md: la hoja que recorre la persona del departamento en la revisión
// cultural (MC-34). Junta lo que el jugador ve de ese departamento: datos, lugares, comidas, palabras, juegos,
// turismo, locuras, memes, sitios de la cabecera y los textos de sus motores y rótulos.
// Uso: node docs/generador/hojas-revision.mjs [depto…]   (sin argumentos hace los 18)
//      node docs/generador/hojas-revision.mjs --revisar  (falla si alguna hoja quedó vieja)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const raiz = join(here, '../..');
const web = join(raiz, 'apps/web');
const data = join(web, 'shared/data');
const salida = join(raiz, 'docs/revision-cultural/hojas');
const J = (f) => JSON.parse(readFileSync(f, 'utf8'));

const depts = J(join(data, 'departments.json')).departments;
const catalogo = Object.assign(
  {},
  ...readdirSync(join(data, 'catalogo'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => J(join(data, 'catalogo', f))),
);
const contenido = J(join(here, 'contenido.json'));
const memes = J(join(data, 'memes.json'));
const fichas = J(join(data, 'minigames.json'));

const limpio = (s) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const celda = (s) => limpio(s).replace(/\|/g, '\\|');
const casilla = (s) => `- [ ] ${limpio(s)}`;

/** Textos que se leen en pantalla dentro de un archivo del juego: literales y texto entre etiquetas JSX. */
export function textosDe(codigo) {
  const vistos = new Set();
  const out = [];
  const lineas = codigo.split('\n');
  const parece = (t) =>
    t.length >= 4 &&
    /\p{L}/u.test(t) &&
    (/\s/.test(t) || /^[¡¿\p{Lu}]/u.test(t)) &&
    !/^[#./@]|^(rgb|hsl)a?\(|^\w+:\/\//.test(t) &&
    !/[{}=;<>]|=>|\$\{|&&|\|\||\w\(|^\d+ /.test(t) &&
    !/^[a-z0-9-]+( [a-z0-9-]+)*$/.test(t);
  lineas.forEach((linea, i) => {
    const l = linea.trim();
    if (l.startsWith('import ') || l.startsWith('//') || l.startsWith('*') || l.startsWith('/*')) return;
    const candidatos = [];
    for (const m of linea.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`([^`$]*)`/g))
      candidatos.push(m[1] ?? m[2] ?? m[3]);
    for (const m of linea.matchAll(/>([^<>{}]*\p{L}[^<>{}]*)</gu)) candidatos.push(m[1]);
    for (const c of candidatos) {
      const t = limpio(c.replace(/\\(['"])/g, '$1'));
      if (!parece(t) || vistos.has(t)) continue;
      vistos.add(t);
      out.push({ linea: i + 1, texto: t });
    }
  });
  return out;
}

const plano = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
function archivosDe(id) {
  const zonas = join(web, 'src/game/dept/zones');
  const propios = readdirSync(zonas)
    .filter((f) => /\.tsx?$/.test(f) && plano(f.replace(/\.tsx?$/, '').replace(/-puntos$/, '')).startsWith(id))
    .filter((f) => plano(f.replace(/(descubrimientos|-puntos)?\.tsx?$/i, '')) === id)
    .map((f) => join(zonas, f));
  const motores = join(web, 'src/game/minigames', id);
  const deMotores = existsSync(motores)
    ? readdirSync(motores, { recursive: true })
        .filter((f) => /\.tsx?$/.test(f))
        .sort()
        .map((f) => join(motores, f))
    : [];
  return [...propios.sort(), ...deMotores];
}

function sitiosDe(id) {
  const fuente = readFileSync(join(web, 'src/game/dept/ciudad-datos.ts'), 'utf8');
  const inicio = fuente.search(new RegExp(`\\n  ${id}: \\{`));
  if (inicio < 0) return null;
  const resto = fuente.slice(inicio + 1);
  const fin = resto.search(/\n {2}[a-z]+: \{|\n\};/);
  const bloque = resto.slice(0, fin < 0 ? undefined : fin);
  const cap = (re) => [...bloque.matchAll(re)].map((m) => m[1]);
  return {
    ciudad: cap(/ciudad: '([^']*)'/g)[0],
    pulperia: cap(/pulperia: '([^']*)'/g)[0],
    sitios: [...bloque.matchAll(/nombre: '([^']*)',[\s\S]*?nota:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => [m[1], m[2]]),
  };
}

function hoja(d) {
  const id = d.id;
  const cat = catalogo[id];
  const con = contenido[id];
  const lugar = Object.fromEntries((cat?.lugares ?? []).map((l) => [l[0], l[1]]));
  const L = [];
  const p = (...xs) => L.push(...xs);

  p(
    `# Hoja de revisión cultural · ${d.name}`,
    '',
    '> Generada por `node docs/generador/hojas-revision.mjs`. No la edités a mano: corregí el dato en su archivo y volvé a generarla.',
    '> Cómo se usa: [README de la revisión cultural](../README.md). Marcá cada casilla cuando lo hayás revisado; lo que esté mal',
    '> anotalo en el issue «Revisión cultural de ' + d.name + '» con qué dice, qué debería decir y por qué.',
    '',
    '## Lo general',
    '',
    casilla(`**Cabecera:** ${d.cabecera}`),
    casilla(`**Lugar emblema:** ${d.landmark?.name ?? '—'}`),
    casilla(`**Dato del mapa:** ${d.fact}`),
    casilla(`**Coleccionable:** ${d.collectible}`),
  );
  if (con?.esencia) p(casilla(`**Esencia:** ${con.esencia}`));

  if (cat) {
    p('', '## Lugares', '');
    for (const [, nombre, tipo, nota] of cat.lugares) p(casilla(`**${nombre}** (${tipo}): ${nota}`));
    p('', '## Comidas', '');
    for (const [nombre, donde, nota] of cat.comidas) p(casilla(`**${nombre}** (${lugar[donde] ?? donde}): ${nota}`));
    p('', '## Palabras', '');
    for (const [palabra, significa] of cat.palabras) p(casilla(`**${palabra}**: ${significa}`));
    p('', '## Juegos', '', 'Nombre, dónde pasa, de qué va y el guiño que sale al jugar.', '');
    for (const j of cat.juegos) {
      const [, nombre, motor, donde, icono, deQueVa, guino, config, etapas] = j;
      p(
        casilla(
          `${icono} **${nombre}** · ${lugar[donde] ?? donde} · motor \`${motor}\`${etapas ? ` · ${etapas} etapas` : ''}`,
        ),
      );
      p(`  - De qué va: ${limpio(deQueVa)}`);
      if (guino) p(`  - Guiño: ${limpio(guino)}`);
      const extra = new Set();
      const recorrer = (v) => {
        if (typeof v === 'string') {
          const t = limpio(v);
          if (/\s/.test(t) || /^[\p{Lu}¡¿]/u.test(t)) if (t !== limpio(nombre) && t !== limpio(guino)) extra.add(t);
        } else if (Array.isArray(v)) v.forEach(recorrer);
        else if (v && typeof v === 'object') Object.values(v).forEach(recorrer);
      };
      recorrer(config);
      if (extra.size) p(`  - Textos del juego: ${[...extra].map((t) => `«${t}»`).join(' · ')}`);
    }
  }

  const propios = fichas.filter((f) => f.id.startsWith(`${id}.`));
  if (propios.length) {
    p('', '## Motores propios', '', 'Cómo se juega cada motor que solo existe en este departamento.', '');
    for (const f of propios) p(casilla(`${f.icon} **${f.name}**: ${limpio(f.desc)}`));
  }

  if (con?.turismo?.length) {
    p('', '## Turismo', '', 'Lugares que el jugador visita dentro del departamento.', '');
    for (const t of con.turismo) {
      p(casilla(`**${t.nombre}** (${lugar[t.lugar] ?? t.lugar}, ${t.tipo})`));
      p(`  - Qué hacés: ${limpio(t.queHaces)}`, `  - Dato: ${limpio(t.dato)}`);
      if (t.fuente) p(`  - Fuente: <${t.fuente}>`);
    }
  }

  const puntos = join(web, `src/game/dept/zones/${id}-puntos.json`);
  const locuras = existsSync(puntos) ? J(puntos) : [];
  if (locuras.length || con?.locuras?.length) {
    p('', '## Locuras', '', 'Sorpresas escondidas en el mapa. El texto es el que lee el jugador.', '');
    const fuenteDe = (l) => `${limpio(l.queEs)}${l.fuente ? ` Fuente: <${l.fuente}>` : ''}`;
    for (const l of locuras) {
      p(casilla(`**${l.nombre}**: ${limpio(l.texto)}`));
      const origen = con?.locuras?.find((x) => x.nombre === l.nombre);
      if (origen) p(`  - Por qué: ${fuenteDe(origen)}`);
    }
    for (const l of con?.locuras ?? [])
      if (!locuras.some((x) => x.nombre === l.nombre)) {
        p(casilla(`**${l.nombre}**: ${limpio(l.comoAparece)}`), `  - Por qué: ${fuenteDe(l)}`);
      }
  }

  const suyos = memes.filter((m) => m.dept === id);
  if (suyos.length) {
    p('', '## Memes y frases', '');
    for (const m of suyos) {
      p(casilla(`${m.emoji ?? ''} **${m.nombre}**: «${limpio(m.frase)}»`));
      if (m.queEs) p(`  - Qué es: ${limpio(m.queEs)}`);
      if (m.fuente) p(`  - Fuente: <${m.fuente}>`);
    }
  }

  const ciudad = sitiosDe(id);
  if (ciudad) {
    p('', `## La cabecera (${ciudad.ciudad})`, '');
    if (ciudad.pulperia) p(casilla(`**Pulpería:** ${ciudad.pulperia}`));
    for (const [nombre, nota] of ciudad.sitios) p(casilla(`**${nombre}**: ${limpio(nota.replace(/\\'/g, "'"))}`));
  }

  const archivos = archivosDe(id);
  if (archivos.length) {
    p(
      '',
      '## Rótulos y textos en pantalla',
      '',
      'Sacados del código de la zona y de los motores. Puede colarse algo técnico: ignoralo. Revisá nombres, datos y',
      'ortografía; si algo está mal, anotá el archivo y la línea.',
    );
    for (const f of archivos) {
      const textos = textosDe(readFileSync(f, 'utf8'));
      if (!textos.length) continue;
      const rel = relative(raiz, f);
      p('', `<details><summary><code>${rel}</code> · ${textos.length} textos</summary>`, '');
      p('| Línea | Texto |', '|---:|---|');
      for (const t of textos) p(`| ${t.linea} | ${celda(t.texto)} |`);
      p('', '</details>');
    }
  }
  p('');
  return L.join('\n');
}

const args = process.argv.slice(2);
const revisar = args.includes('--revisar');
const pedidos = args.filter((a) => !a.startsWith('--'));
const elegidos = pedidos.length ? depts.filter((d) => pedidos.includes(d.id)) : depts;
if (pedidos.length && elegidos.length !== pedidos.length) {
  console.error(`Departamento desconocido. Los que hay: ${depts.map((d) => d.id).join(', ')}`);
  process.exit(1);
}
mkdirSync(salida, { recursive: true });
let viejas = 0;
for (const d of elegidos) {
  const archivo = join(salida, `${d.id}.md`);
  const texto = hoja(d);
  if (revisar) {
    if (!existsSync(archivo) || readFileSync(archivo, 'utf8') !== texto) {
      console.error(`Hoja vieja: ${relative(raiz, archivo)}`);
      viejas++;
    }
  } else writeFileSync(archivo, texto);
}
if (revisar && viejas) {
  console.error('Corré node docs/generador/hojas-revision.mjs y subí las hojas.');
  process.exit(1);
}
console.log(`${revisar ? 'Revisadas' : 'Escritas'} ${elegidos.length} hojas en ${relative(raiz, salida)}`);
