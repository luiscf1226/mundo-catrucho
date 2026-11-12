// Chat moderado (MC-22) y códigos de invitación (MC-24). Lo decide la sala (chat en vivo) y Convex (directos,
// reportes): el navegador puede filtrar antes para avisar, pero quien manda es el servidor.
//
// El filtro tapa con «***»: groserías de Honduras (también escritas con números, símbolos, letras repetidas o
// separadas) y datos personales (teléfonos, correos, direcciones web, @usuarios y frases como «mi número es»).

export const CHAT = {
  /** largo máximo de un mensaje, después de limpiarlo */
  largoMax: 140,
  /** cubeta por id público en la sala: `rafaga` seguidos y luego uno cada `1 / porSegundo` s */
  ritmo: { rafaga: 5, porSegundo: 0.5 },
  /** mensajes directos por minuto por jugador (Convex) */
  directosMinuto: 8,
  /** directos que guarda y muestra cada conversación */
  directosMax: 60,
  /** reportes por día de Honduras por jugador */
  reportesDia: 10,
  /** límite duro de bloqueos por cuenta; todos viajan en el pase */
  bloqueosEnPase: 200,
} as const;

/** Motivos para reportar. */
export const MOTIVOS_REPORTE = ['groseria', 'acoso', 'datos', 'spam', 'otro'] as const;
export type MotivoReporte = (typeof MOTIVOS_REPORTE)[number];
export const motivoValido = (m: unknown): m is MotivoReporte =>
  typeof m === 'string' && (MOTIVOS_REPORTE as readonly string[]).includes(m);

// ------------------------------------------------------------------ limpiar
const TAPA = '***';
/** Sin HTML, sin caracteres de control ni invisibles, espacios simples y largo máximo. */
export function limpiarTexto(s: unknown): string {
  if (typeof s !== 'string') return '';
  return (
    s
      .normalize('NFKC')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      // controles e invisibles (ancho cero, marcas de dirección, el BOM)
      .replace(/[\p{Cc}\p{Cf}]/gu, '')
      .trim()
      .slice(0, CHAT.largoMax)
      .trim()
  );
}

// ------------------------------------------------------------------ datos personales
/** Frases que anuncian un dato personal: se tapa desde la frase hasta el final del mensaje. */
const FRASE_DATO = new RegExp(
  [
    // «mi número es», «mi cel», «mi whatsapp», «mi correo», «mi insta», «mi dirección»…
    String.raw`\b(mi|mis|el|al)\s+(n[uú]mero|numerito|cel|celu|celular|tel|tel[eé]fono|whats?app?|whats|wasap|guasap|wsp|ws|correo|email|mail|gmail|insta|instagram|ig|face|facebook|fb|tiktok|snap|snapchat|discord|telegram|direcci[oó]n)\b`,
    // «escribime al», «llamame al», «agregame en»
    String.raw`\b(escr[ií]beme|escr[ií]bime|ll[aá]mame|ll[aá]mame|textea?me|agr[eé]game|b[uú]scame|seguime|s[ií]gueme)\s+(al|en|a|por)\b`,
    // «vivo en la colonia…», «mi casa queda…»
    String.raw`\bvivo\s+(en\s+)?(la\s+|el\s+)?(col\.?|colonia|barrio|bo\.?|residencial|res\.?|calle|avenida|ave\.?|aldea|caser[ií]o)\b`,
    String.raw`\bmi\s+casa\s+(es|est[aá]|queda)\b`,
  ].join('|'),
  'iu',
);
const DATOS: RegExp[] = [
  // correos (también con «arroba» y «punto»)
  /[\p{L}\p{N}._%+-]+\s*(@|\(at\)|[[({]\s*arroba\s*[\])}]|\barroba\b)\s*[\p{L}\p{N}-]+(\s*(\.|[[({]\s*punto\s*[\])}]|\bpunto\b)\s*[\p{L}]{2,})+/giu,
  // direcciones web
  /\b(https?:\/\/|www\.)\S+/giu,
  /\b[\p{L}\p{N}-]+(\.|\s+punto\s+)(com|net|org|hn|io|gg|me|ly|co|app|xyz|tv|info|biz|link)\b(\/\S*)?/giu,
  // teléfonos: 7 dígitos o más, con o sin +504, espacios, puntos, guiones o paréntesis entre ellos
  /\+?\(?\d(?:[\s./_|()-]{0,4}\d){6,}\)?/gu,
];
/** @usuarios de redes; guarda lo que había antes de la arroba */
const ARROBA = /(^|[^\p{L}\p{N}])@[\p{L}\p{N}._]{2,}/gu;

// ------------------------------------------------------------------ groserías
/** Reemplazos de números y símbolos que se usan para esquivar el filtro. */
const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'i',
  '¡': 'i',
  '€': 'e',
};
/**
 * Palabras completas (ya normalizadas: minúsculas, sin tildes salvo la ñ, sin letras repetidas). Se comparan con la
 * palabra entera para no tapar «computadora», «disputa», «vehículo» ni «película».
 */
const GROSERIAS: RegExp[] = [
  /^(hijue?|hijo?de|hde|jue)?put(a|o|as|os|ita|itas|ito|itos|isima|ada|adas|azo|ear|eria|ero)$/,
  /^(hdp|hp|hpta|ptm|ctm|alv|ptmr|hdpt|jueputa|juepucha?)$/,
  /^mierd(a|as|ita|oso|osa)$/,
  /^verg(a|as|on|ona|ones|azo|uear|ueo|uero)$/,
  /^pij(a|as|udo|uda|on|ita)$/,
  /^cul(o|os|ero|era|eros|eras|ito)$/,
  /^cerot(e|es|a|as|io)$/,
  /^malpari(do|da|dos|das)$/,
  /^pendej(o|a|os|as|ada|adas)$/,
  /^cabron(a|es|as|azo)?$/,
  /^maric(a|as|on|ones|ona)$/,
  /^play(o|os)$/,
  /^coñ(o|os)$/,
  /^ching(a|ar|ada|adas|ado|on|ue|ues)$/,
  /^zor(a|as)$/,
  /^cag(ar|ada|adas|ado|on|a)$/,
  /^ojete$/,
  /^mamad(a|as)$/,
  /^(culiao|culiar|culiado)$/,
  /^(estupid[oa]s?|idiota|idiotas|imbecil|imbeciles|retrasad[oa]s?|mongol[oa]?s?)$/,
  /^(sexo|porno|xxx|nude|nudes|pack)$/,
];
/** Minúsculas, ñ conservada, sin tildes, números y símbolos a letras, sin separadores y sin letras repetidas. */
export function normalizarPalabra(p: string): string {
  let s = '';
  for (const c of p.toLowerCase()) {
    // la ñ es otra letra (coño no es cono); las demás pierden la tilde
    const letra = c === 'ñ' ? c : c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s += LEET[letra] ?? letra;
  }
  return s.replace(/[^a-zñ]/g, '').replace(/(.)\1+/g, '$1');
}
/** Signos al principio y al final de una palabra (no los que se usan como letras: ¡ ! @ $ |). */
const BORDES = /^([¿("'«]*)(.*?)([.,;:?…)"'»]*)$/su;
const esGroseria = (palabra: string): boolean => {
  // «p!ja!»: el ! del final es exclamación, no una i
  if (/[!¡]$/.test(palabra) && esGroseria(palabra.replace(/[!¡]+$/, ''))) return true;
  const n = normalizarPalabra(palabra);
  // la v se usa por u («pvta»), pero también es letra de verdad («verga»): se prueban las dos
  return n.length > 1 && GROSERIAS.some((r) => r.test(n) || r.test(n.replace(/v/g, 'u')));
};

export interface Filtrado {
  /** texto listo para mostrar */
  texto: string;
  /** se tapó algo */
  tapado: boolean;
  motivos: ('groseria' | 'dato')[];
}

/**
 * Limpia y filtra un mensaje. Devuelve null si no queda nada que mandar. Corre igual en la sala, en Convex y en el
 * navegador (que solo lo usa para avisar antes de mandar).
 */
export function filtrarChat(entrada: unknown): Filtrado | null {
  let texto = limpiarTexto(entrada);
  if (!texto) return null;
  const motivos = new Set<'groseria' | 'dato'>();
  // 1. frases que anuncian datos: se tapa desde ahí hasta el final
  const f = FRASE_DATO.exec(texto);
  if (f) {
    texto = `${texto.slice(0, f.index)}${TAPA}`;
    motivos.add('dato');
  }
  // 2. correos, webs, teléfonos y @usuarios
  for (const r of DATOS)
    texto = texto.replace(r, () => {
      motivos.add('dato');
      return TAPA;
    });
  texto = texto.replace(ARROBA, (_m, antes: string) => {
    motivos.add('dato');
    return `${antes}${TAPA}`;
  });
  // 3. groserías palabra por palabra, y letras sueltas seguidas («p u t a», «p.u.t.a»)
  const partes = texto.split(/(\s+|[,;:¿?()«»]+)/);
  const palabras = partes.map((p, i) => ({ p, i })).filter((x) => x.p.trim() !== '');
  for (const { p, i } of palabras) {
    if (p === TAPA || !esGroseria(p)) continue;
    // la puntuación de alrededor se queda («qué onda ***, vamos»)
    const [, antes, , despues] = BORDES.exec(p) ?? ['', '', p, ''];
    partes[i] = `${antes}${TAPA}${despues}`;
    motivos.add('groseria');
  }
  for (let a = 0; a < palabras.length; ) {
    let b = a;
    while (b < palabras.length && normalizarPalabra(palabras[b].p).length === 1) b++;
    if (b - a >= 3) {
      const junta = palabras
        .slice(a, b)
        .map((x) => x.p)
        .join('');
      if (esGroseria(junta)) {
        for (let k = a; k < b; k++) partes[palabras[k].i] = k === a ? TAPA : '';
        motivos.add('groseria');
      }
    }
    a = Math.max(b, a + 1);
  }
  texto = partes.join('').replace(/\s+/g, ' ').trim();
  // tapas seguidas se juntan en una
  texto = texto.replace(/\*{3}(\s*\*{3})+/g, TAPA);
  return { texto, tapado: motivos.size > 0, motivos: [...motivos] };
}

// ------------------------------------------------------------------ ritmo
export interface CubetaChat {
  fichas: number;
  /** milisegundos de la última recarga */
  t: number;
}
export const cubetaChat = (ahora: number): CubetaChat => ({ fichas: CHAT.ritmo.rafaga, t: ahora });
/** Gasta una ficha si hay. false = va muy rápido (el mensaje no se manda). Modifica la cubeta. */
export function permitirChat(c: CubetaChat, ahora: number): boolean {
  const { porSegundo, rafaga } = CHAT.ritmo;
  c.fichas = Math.min(rafaga, c.fichas + (Math.max(0, ahora - c.t) / 1000) * porSegundo);
  c.t = ahora;
  if (c.fichas < 1) return false;
  c.fichas -= 1;
  return true;
}

// ------------------------------------------------------------------ mensajes firmados de la sala
// La sala firma cada mensaje con `SALA_SECRETO`; al reportar, Convex comprueba que el texto citado es el que de
// verdad mandó la sala (nadie puede inventar un mensaje ajeno para reportarlo).
export interface MensajeSala {
  /** id del mensaje en esa sala */
  id: string;
  /** id público de quien lo mandó (el mismo del pase) */
  de: string;
  sala: string;
  /** milisegundos Unix */
  ts: number;
  texto: string;
}
interface LlaveHmac {
  readonly type: string;
}
declare const crypto: {
  subtle: {
    importKey(
      f: 'raw',
      k: Uint8Array,
      a: { name: 'HMAC'; hash: 'SHA-256' },
      ext: boolean,
      usos: ('sign' | 'verify')[],
    ): Promise<LlaveHmac>;
    sign(a: 'HMAC', k: LlaveHmac, d: Uint8Array): Promise<ArrayBuffer>;
  };
};
declare const TextEncoder: new () => { encode(s: string): Uint8Array };
const enBytes = (s: string) => new TextEncoder().encode(s);
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const cuerpoMensaje = (m: MensajeSala) => JSON.stringify(['chat', m.sala, m.id, m.de, m.ts, m.texto]);

/** Firma HMAC-SHA256 (hexadecimal) de un mensaje de sala. */
export async function firmarMensaje(m: MensajeSala, secreto: string) {
  if (typeof secreto !== 'string' || secreto.length < 32) throw new Error('SALA_SECRETO falta o es corto.');
  const k = await crypto.subtle.importKey('raw', enBytes(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enBytes(cuerpoMensaje(m))));
}
/** ¿La firma es de la sala? Compara en tiempo constante. */
export async function mensajeAutentico(m: MensajeSala, firma: unknown, secreto: string) {
  if (typeof firma !== 'string' || !/^[0-9a-f]{64}$/.test(firma)) return false;
  const buena = await firmarMensaje(m, secreto);
  let dif = 0;
  for (let i = 0; i < 64; i++) dif |= buena.charCodeAt(i) ^ firma.charCodeAt(i);
  return dif === 0;
}

// ------------------------------------------------------------------ códigos de invitación (MC-24)
/** Sin letras que se confunden (I, O, 0, 1): el mismo alfabeto de `core/net.ts`. */
export const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODIGO = {
  largo: 5,
  /** cuánto vale un código */
  vigenciaMs: 10 * 60_000,
  /** códigos fallidos por jugador en cada ventana: adivinar 32⁵ códigos a mano no sale a cuenta */
  fallosMax: 10,
  ventanaFallosMs: 10 * 60_000,
} as const;
export interface FallosCodigo {
  desde: number;
  n: number;
}
/** ¿Puede probar otro código? Los fallos se cuentan por ventana; al pasar la ventana vuelven a cero. */
export function puedeProbarCodigo(f: FallosCodigo | undefined, ahora: number) {
  return !f || ahora - f.desde >= CODIGO.ventanaFallosMs || f.n < CODIGO.fallosMax;
}
/** Suma un código fallido. */
export function sumarFalloCodigo(f: FallosCodigo | undefined, ahora: number): FallosCodigo {
  return !f || ahora - f.desde >= CODIGO.ventanaFallosMs ? { desde: ahora, n: 1 } : { desde: f.desde, n: f.n + 1 };
}
/** Código en mayúsculas y sin espacios, o null si no puede ser un código. */
export function normalizarCodigo(c: unknown): string | null {
  if (typeof c !== 'string') return null;
  const k = c.trim().toUpperCase();
  if (k.length !== CODIGO.largo) return null;
  for (const ch of k) if (!ALFABETO_CODIGO.includes(ch)) return null;
  return k;
}
/** Código nuevo a partir de bytes aleatorios (32 letras: cada byte da una letra sin sesgo). */
export function codigoDe(bytes: ArrayLike<number>): string {
  let s = '';
  for (let i = 0; i < CODIGO.largo; i++) s += ALFABETO_CODIGO[(bytes[i] ?? 0) % ALFABETO_CODIGO.length];
  return s;
}
