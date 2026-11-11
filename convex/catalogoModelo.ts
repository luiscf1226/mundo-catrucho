import { v } from 'convex/values';

const punto = v.array(v.number());
export const departamento = v.object({
  id: v.string(),
  name: v.string(),
  cabecera: v.string(),
  biome: v.union(
    ...['costa', 'sur', 'valle', 'lago', 'montana', 'capital', 'selva', 'isla', 'bosque'].map((x) => v.literal(x)),
  ),
  landmark: v.object({ kind: v.string(), name: v.string() }),
  colors: v.array(v.string()),
  fact: v.string(),
  collectible: v.string(),
  map: v.object({ center: punto, rings: v.array(v.array(punto)) }),
});
export const motor = v.union(
  v.literal('carrera'),
  v.literal('futbol'),
  v.literal('feria'),
  v.literal('exploradores'),
  v.literal('pulperia'),
  v.literal('corte'),
  v.literal('monta'),
  v.literal('ritmo'),
  v.literal('ruta'),
  v.literal('pesca'),
  v.literal('atrapa'),
  v.literal('cocina'),
  v.literal('trivia'),
  v.literal('manejo'),
);
export const datosCatalogo = v.object({
  departamento,
  minigames: v.array(
    v.object({
      id: motor,
      name: v.string(),
      place: v.string(),
      icon: v.string(),
      desc: v.string(),
      bonus: v.optional(v.boolean()),
      rules: v.record(v.string(), v.any()),
    }),
  ),
  catalogo: v.object({
    id: v.string(),
    tipos: v.string(),
    lugares: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        kind: v.union(
          v.literal('ciudad'),
          v.literal('pueblo'),
          v.literal('playa'),
          v.literal('montana'),
          v.literal('lago'),
          v.literal('rio'),
          v.literal('ruinas'),
          v.literal('parque'),
          v.literal('isla'),
          v.literal('mercado'),
          v.literal('iglesia'),
          v.literal('estadio'),
          v.literal('cueva'),
          v.literal('finca'),
          v.literal('selva'),
          v.literal('puerto'),
          v.literal('fuerte'),
        ),
        nota: v.string(),
      }),
    ),
    comidas: v.array(v.object({ name: v.string(), lugar: v.string(), nota: v.string() })),
    palabras: v.array(v.object({ dice: v.string(), es: v.string() })),
    juegos: v.array(
      v.object({
        id: v.string(),
        dept: v.string(),
        lugar: v.string(),
        name: v.string(),
        motor,
        icon: v.string(),
        desc: v.string(),
        guino: v.string(),
        tema: v.record(v.string(), v.any()),
        etapas: v.number(),
      }),
    ),
  }),
  // Contenido editorial del generador, extensible sin cambiar los motores jugables.
  editorial: v.object({
    esencia: v.string(),
    motores: v.array(v.record(v.string(), v.any())),
    juegos: v.array(v.record(v.string(), v.any())),
    turismo: v.array(v.record(v.string(), v.any())),
    locuras: v.array(v.record(v.string(), v.any())),
  }),
  apodos: v.record(v.string(), v.any()),
});
export const entradaCatalogo = v.object({ deptId: v.string(), datos: datosCatalogo });
