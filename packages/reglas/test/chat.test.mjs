// Filtro del chat (MC-22) y códigos de invitación (MC-24): casos reales de Honduras.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ALFABETO_CODIGO,
  CHAT,
  CODIGO,
  codigoDe,
  cubetaChat,
  filtrarChat,
  firmarMensaje,
  firmarPase,
  limpiarTexto,
  mensajeAutentico,
  motivoValido,
  normalizarCodigo,
  permitirChat,
  puedeProbarCodigo,
  sumarFalloCodigo,
  verificarPase,
} from '../src/index.ts';

const t = (s) => filtrarChat(s)?.texto;
const limpio = (s) => {
  const f = filtrarChat(s);
  assert.equal(f.tapado, false, `no debía tapar «${s}» → «${f.texto}»`);
  assert.equal(f.texto, s);
};
const tapa = (s, motivo) => {
  const f = filtrarChat(s);
  assert.ok(f.tapado, `debía tapar «${s}»`);
  if (motivo) assert.ok(f.motivos.includes(motivo), `«${s}»: ${f.motivos}`);
  return f.texto;
};

test('teléfonos hondureños: 8 dígitos, con o sin +504, guion, espacios o paréntesis', () => {
  for (const s of [
    '99887766',
    '9988*7766',
    '9988,7766',
    '9988:7766',
    '9988 . . 7766',
    '٩٩٨٨٧٧٦٦',
    '9888 / 7777',
    '９８８８７７７７',
    '9888 _ 7777',
    '9888 | 7777',
    '9988-7766',
    '9988 7766',
    '+504 9988-7766',
    '+50499887766',
    '(504) 2234-5678',
    '504-3344-5566',
    '99.88.77.66',
    '9 9 8 8 7 7 6 6',
  ])
    assert.equal(tapa(`llamame ya ${s} porfa`, 'dato').includes('7'), false, s);
  assert.equal(t('mi cel 9988-7766'), '***');
  assert.equal(t('escribime al 3344 5566 jaja'), '***');
});

test('frases que anuncian datos se tapan hasta el final', () => {
  assert.equal(t('hola! mi número es ocho ocho nueve nueve'), 'hola! ***');
  assert.equal(t('Mi numero es nueve'), '***');
  assert.equal(t('pasame tu insta, mi insta es catracha_04'), 'pasame tu insta, ***');
  assert.equal(t('agregame en face como Juan'), '***');
  assert.equal(t('vivo en la colonia Kennedy casa 12'), '***');
  assert.equal(t('mi casa queda por el parque'), '***');
  assert.equal(t('mi dirección: barrio abajo'), '***');
});

test('correos, webs y @usuarios', () => {
  assert.equal(t('escribí a juana.perez@gmail.com'), 'escribí a ***');
  assert.equal(t('juana arroba gmail punto com'), '***');
  for (const s of [
    'ana＠gmail。com',
    'ana (@) gmail (.) com',
    'ana@gmail,com',
    'ana [arroba] gmail [punto] com',
    'ana (arroba) gmail {punto} com',
  ])
    assert.equal(t(s), '***');
  assert.equal(t('entrá a www.algo.hn ya'), 'entrá a *** ya');
  assert.equal(t('mirá https://x.co/abc'), 'mirá ***');
  assert.equal(t('vamos a catrachos.com'), 'vamos a ***');
  assert.equal(t('seguí a @el_cipote504'), 'seguí a ***');
  assert.equal(t('hola @ana'), 'hola ***');
});

test('groserías hondureñas, también con números, símbolos y letras repetidas o separadas', () => {
  for (const s of [
    '¡puta!',
    '¡mierda!',
    '¡¡pendejo!!',
    'puta',
    'PUTA',
    'put4',
    'pvta',
    'p.u.t.a',
    'p u t a',
    'puuuuuta',
    'hijueputa',
    'hdp',
    'mierda',
    'm1erd@',
    'verga',
    'v3rg4',
    'vergón',
    'pija',
    'p!ja',
    'culero',
    'cerote',
    'c3r0t3',
    'malparido',
    'pendejo',
    'cabrón',
    'maricón',
    'playo',
    'coño',
    'chinga',
    'zorra',
    'cagada',
    'idiota',
  ]) {
    const f = filtrarChat(`sos un ${s} jaja`);
    assert.ok(f.tapado, `no tapó «${s}»`);
    assert.equal(f.texto, 'sos un *** jaja', s);
    assert.deepEqual(f.motivos, ['groseria']);
  }
});

test('la puntuación alrededor de las groserías se queda', () => {
  assert.equal(t('qué onda c3r0t3, vamos a Juticalpa'), 'qué onda ***, vamos a Juticalpa');
  assert.equal(t('puta,cerote'), '***,***');
  assert.equal(t('¿(pendejo)?'), '¿(***)?');
  assert.equal(t('vos sos un p!ja!'), 'vos sos un ***');
});

test('falsos positivos que no hay que tapar', () => {
  for (const s of [
    'fecha 12/11/2026 14:30',
    'puntos 100/200/300/400',
    'x=1_2_3_4_5_6_7',
    'mi computadora es lenta',
    'la disputa del clásico',
    'el diputado llegó a Comayagua',
    'qué buena película',
    'el vehículo se quedó en Siguatepeque',
    'eso es ridículo pues',
    'vamos a Puerto Cortés',
    'tengo pisto para la baleada',
    'ese cipote juega bien',
    'qué macizo, vos',
    'cheque pues, nos vemos en el mapa',
    'saqué 350 pts en 2 etapas',
    'el perro de la pulpería',
    'la culebra del río',
    'calculá bien el salto',
    'se me cayó el cono',
    'vamos al estadio a las 7',
    'el bus sale 6:30',
    'la ruta 5 por Danlí',
    'Olancho, Copán y La Ceiba',
    'pucha, perdí',
    'nos vemos en el tramo 2 del mapa',
    'el año 2026 está bueno',
    'gané 1500 lempiras',
  ])
    limpio(s);
});

test('sin HTML, sin invisibles, largo máximo', () => {
  assert.equal(limpiarTexto('<b>hola</b> <script>alert(1)</script>vos'), 'hola alert(1) vos');
  assert.equal(limpiarTexto('ho​la\u0007  \n vos'), 'hola vos');
  assert.equal(limpiarTexto('te quiero <3'), 'te quiero 3');
  assert.equal(limpiarTexto('x'.repeat(500)).length, CHAT.largoMax);
  assert.equal(filtrarChat('   '), null);
  assert.equal(filtrarChat('<br>'), null);
  assert.equal(filtrarChat(42), null);
});

test('ritmo: ráfaga y luego uno cada pocos segundos', () => {
  const c = cubetaChat(0);
  let pasan = 0;
  for (let i = 0; i < 20; i++) if (permitirChat(c, 100)) pasan++;
  assert.equal(pasan, CHAT.ritmo.rafaga);
  assert.equal(permitirChat(c, 100 + 500), false);
  assert.equal(permitirChat(c, 100 + 1000 / CHAT.ritmo.porSegundo + 1), true);
});

test('mensajes firmados por la sala: el texto citado no se puede inventar', async () => {
  const secreto = 'x'.repeat(40);
  const m = { id: 'm1', de: 'abc', sala: 'mapa:0', ts: 1, texto: 'hola' };
  const firma = await firmarMensaje(m, secreto);
  assert.ok(await mensajeAutentico(m, firma, secreto));
  assert.equal(await mensajeAutentico({ ...m, texto: 'otra cosa' }, firma, secreto), false);
  assert.equal(await mensajeAutentico({ ...m, de: 'otro' }, firma, secreto), false);
  assert.equal(await mensajeAutentico(m, firma, 'y'.repeat(40)), false);
  assert.equal(await mensajeAutentico(m, 'basura', secreto), false);
});

test('códigos de 5 letras sin confusiones', () => {
  assert.equal(ALFABETO_CODIGO.length, 32);
  for (const c of 'IO01') assert.equal(ALFABETO_CODIGO.includes(c), false);
  const c = codigoDe([0, 31, 32, 255, 7]);
  assert.equal(c.length, CODIGO.largo);
  assert.equal(normalizarCodigo(` ${c.toLowerCase()} `), c);
  assert.equal(normalizarCodigo('ABCD'), null);
  assert.equal(normalizarCodigo('ABCD0'), null);
  assert.equal(normalizarCodigo(12345), null);
  assert.ok(motivoValido('acoso'));
  assert.equal(motivoValido('nada'), false);
});

test('el pase lleva los bloqueados (todos los 200) y sigue cabiendo en la URL', async () => {
  const secreto = 'z'.repeat(40);
  const avatar = Object.fromEntries(
    [
      'skin',
      'hair',
      'hairColor',
      'face',
      'shirt',
      'shirtColor',
      'pants',
      'pantsColor',
      'hat',
      'hatColor',
      'acc',
      'accColor',
    ].map((k) => [k, 'x'.repeat(32)]),
  );
  const bloqueados = [
    ...Array.from({ length: 200 }, (_, i) => `id${String(i).padStart(10, '0')}`),
    '<mal>',
    'id0000000000',
  ];
  const p = await firmarPase(
    { id: 'yo', nombre: 'Catracha', sala: 'dept:islasdelabahia:39', avatar, bloqueados },
    secreto,
  );
  assert.ok(p.length < 12000, `pase de ${p.length}`);
  const v = await verificarPase(p, secreto, 'dept:islasdelabahia:39');
  assert.ok(v.ok);
  assert.equal(v.pase.bloqueados.length, CHAT.bloqueosEnPase);
  assert.equal(v.pase.bloqueados.includes('<mal>'), false);
  const sin = await verificarPase(
    await firmarPase({ id: 'yo', nombre: 'A', sala: 'mapa:0' }, secreto),
    secreto,
    'mapa:0',
  );
  assert.deepEqual(sin.pase.bloqueados, []);
});

test('código de amigo: 10 fallos por ventana y después vuelve', () => {
  let f;
  for (let i = 0; i < CODIGO.fallosMax; i++) {
    assert(puedeProbarCodigo(f, 1000 + i));
    f = sumarFalloCodigo(f, 1000 + i);
  }
  assert(!puedeProbarCodigo(f, 2000), 'el 11 espera');
  assert(puedeProbarCodigo(f, 1000 + CODIGO.ventanaFallosMs), 'pasada la ventana vuelve');
  assert.deepEqual(sumarFalloCodigo(f, 1000 + CODIGO.ventanaFallosMs), { desde: 1000 + CODIGO.ventanaFallosMs, n: 1 });
});

test('mover separadores del texto al id no permite inventar un reporte', async () => {
  const secreto = 'z'.repeat(40);
  const m = { sala: 'mapa:0', id: 'm1', de: 'atacante', ts: 1000, texto: 'victima12345|123|texto inventado' };
  const falso = { sala: m.sala, id: 'm1|atacante|1000', de: 'victima12345', ts: 123, texto: 'texto inventado' };
  const firma = await firmarMensaje(m, secreto);
  assert.equal(await mensajeAutentico(falso, firma, secreto), false);
});
