export type V3 = [number, number, number];

/** Motores de minijuego. Cada juego del catálogo (shared/data/catalogo) es un motor + un tema del departamento. */
export type MinigameId =
  | 'copan.cadera'
  | 'copan.glifos'
  | 'copan.guaras'
  | 'copan.estratigrafia'
  | 'copan.hojas'
  | 'copan.adoquin'
  | 'copan.estelas'
  | 'copan.atol'
  | 'olancho.batea'
  | 'olancho.arreo'
  | 'olancho.calcita'
  | 'olancho.cuajada'
  | 'olancho.postura'
  | 'olancho.tablas'
  | 'carrera'
  | 'futbol'
  | 'feria'
  | 'exploradores'
  | 'pulperia'
  | 'corte'
  | 'monta'
  | 'ritmo'
  | 'ruta'
  | 'pesca'
  | 'atrapa'
  | 'cocina'
  | 'trivia'
  | 'manejo'
  | 'franciscomorazan.niebla'
  | 'franciscomorazan.baleada'
  | 'franciscomorazan.repartidor'
  | 'franciscomorazan.artesania'
  | 'franciscomorazan.rosquilla'
  | 'franciscomorazan.taxi'
  | 'franciscomorazan.asalto'
  | 'cortes.chuco'
  | 'cortes.gruas'
  | 'cortes.cortina'
  | 'cortes.garitas'
  | 'cortes.merendon'
  | 'cortes.cusuco'
  | 'cortes.topo'
  | 'islas.ballena'
  | 'islas.coral'
  | 'islas.bonacca'
  | 'islas.estela'
  | 'islas.flotacion'
  | 'islas.colorprofundo'
  | 'islas.cangrejo'
  | 'islas.absorcion'
  | 'comayagua.aserrin'
  | 'comayagua.reloj'
  | 'comayagua.eco'
  | 'comayagua.pilon'
  | 'comayagua.tenampua'
  | 'comayagua.anden'
  | 'comayagua.mantas'
  | 'comayagua.fachadas'
  | 'atlantida.balsa'
  | 'atlantida.pancoco'
  | 'atlantida.vagon'
  | 'atlantida.manati'
  | 'atlantida.lancetilla'
  | 'atlantida.canopy'
  | 'atlantida.carnaval';
/** solo = vos contra bots · duo = vos y un compa contra parejas · abierto = sala abierta (se llena con bots si no hay gente) */
export type Modo = 'solo' | 'duo' | 'abierto';
export type Vehiculo =
  | 'rapidito'
  | 'taxi'
  | 'bus'
  | 'pickup'
  | 'mototaxi'
  | 'lancha'
  | 'ferry'
  | 'avioneta'
  | 'cayuco'
  | 'bicitaxi';
export type LugarKind =
  | 'ciudad'
  | 'pueblo'
  | 'playa'
  | 'montana'
  | 'lago'
  | 'rio'
  | 'ruinas'
  | 'parque'
  | 'isla'
  | 'mercado'
  | 'iglesia'
  | 'estadio'
  | 'cueva'
  | 'finca'
  | 'selva'
  | 'puerto'
  | 'fuerte';
export interface Lugar {
  id: string;
  name: string;
  kind: LugarKind;
  nota: string;
}
export interface Comida {
  name: string;
  lugar: string;
  nota: string;
}
export interface Palabra {
  dice: string;
  es: string;
}
/** Un minijuego concreto de un departamento. `tema` lo interpreta el motor (ver docs/CONTRATO.md). */
export interface Juego {
  id: string;
  dept: string;
  lugar: string;
  name: string;
  motor: MinigameId;
  icon: string;
  desc: string;
  guino: string;
  tema: Record<string, any>;
  etapas: number;
}
export interface DeptCat {
  id: string;
  tipos: string;
  lugares: Lugar[];
  comidas: Comida[];
  palabras: Palabra[];
  juegos: Juego[];
}
export type ItemCat = 'atuendo' | 'cabello' | 'rostro' | 'camisa' | 'pantalon' | 'sombrero' | 'accesorio' | 'emote';
export type Anim =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'dance'
  | 'dance2'
  | 'celebrate'
  | 'wave'
  | 'clap'
  | 'kick'
  | 'throw'
  | 'carry'
  | 'drive'
  | 'sit';

export interface AvatarConfig {
  /** cuerpo: 'h' hombre, 'm' mujer */ body?: 'h' | 'm';
  skin: string;
  hair: string;
  hairColor: string;
  face: string;
  shirt: string;
  shirtColor: string;
  pants: string;
  pantsColor: string;
  hat: string;
  hatColor: string;
  acc: string;
  accColor: string;
}
/** Estado mutable que el avatar lee en cada cuadro (no es estado de React). */
export interface AvatarState {
  anim: Anim;
  speed: number;
  t0?: number;
}

export interface ShopItem {
  id: string;
  cat: ItemCat;
  name: string;
  price: number;
  tint?: boolean;
  trad?: boolean;
  /** atuendo completo: al equiparlo se aplica todo esto de un solo */ set?: Partial<AvatarConfig>;
  /** grupo del atuendo en el ropero */ grupo?: 'folclor' | 'maya' | 'seleccion' | 'club' | 'honduras';
  /** pieza que solo viene dentro de un atuendo (no se vende sola) */ soloSet?: boolean;
  nota?: string;
}
export interface Department {
  id: string;
  name: string;
  cabecera: string;
  biome: 'costa' | 'sur' | 'valle' | 'lago' | 'montana' | 'capital' | 'selva' | 'isla' | 'bosque';
  landmark: { kind: string; name: string };
  colors: [string, string];
  fact: string;
  collectible: string;
  map: { center: [number, number]; rings: [number, number][][] };
}
export interface MinigameInfo {
  id: MinigameId;
  name: string;
  place: string;
  icon: string;
  desc: string;
  bonus?: boolean;
  rules: Record<string, any>;
}
export interface MinigameResult {
  won: boolean;
  stars: 0 | 1 | 2 | 3;
  /** número para la tabla de clasificación: más alto es mejor */
  score: number;
  /** texto que ve el jugador: "1:02", "3 - 1", "320 pts" */
  label: string;
  stats?: { goals?: number; [k: string]: number | undefined };
}
export interface Rewards {
  coins: number;
  xp: number;
  leveledUp: boolean;
  newAchievements: string[];
}
export type PanelId =
  | 'mapa'
  | 'transporte'
  | 'personaje'
  | 'tienda'
  | 'pausa'
  | 'ajustes'
  | 'misiones'
  | 'logros'
  | 'clasificacion'
  | 'salas'
  | 'amigos'
  | 'controles'
  | 'emotes'
  | 'proyecto';
export type Scene =
  | { kind: 'lobby' }
  | { kind: 'dept'; id: string }
  | { kind: 'minigame'; id: MinigameId }
  | { kind: 'viaje'; veh: Vehiculo; to: string; from: string };
