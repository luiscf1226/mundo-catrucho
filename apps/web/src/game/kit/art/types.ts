// Contrato del paquete de arte. Hay dos implementaciones con la misma forma:
//   art/roblox  → bloques, studs, colores planos, avatar clásico de piezas
//   art/hd      → 3D estilizado: formas suaves, materiales con textura, sombras, día y noche, clima
// Las escenas (lobby, departamentos, minijuegos) NUNCA crean materiales ni personajes a mano: usan esto.
import type { FC, ReactNode } from 'react';
import type * as THREE from 'three';
import type { AvatarConfig, AvatarState, V3 } from '../../../core/types';

export type MatKind =
  | 'plastic'
  | 'grass'
  | 'dirt'
  | 'sand'
  | 'stone'
  | 'cobble'
  | 'brick'
  | 'wood'
  | 'metal'
  | 'tile'
  | 'stucco'
  | 'roof'
  | 'water'
  | 'neon'
  | 'glass'
  | 'cloth'
  | 'asphalt'
  | 'concrete'
  | 'leaf'
  | 'gold';

export interface AvatarProps {
  config: AvatarConfig;
  /** objeto mutable; el avatar lo lee en cada cuadro para animarse */
  state: AvatarState;
  /** nombre flotante opcional sobre la cabeza */
  name?: string;
  scale?: number;
}
export interface SkyRigProps {
  /** 'auto' en hd = ciclo de día y noche; en roblox siempre es de día */
  time?: 'dia' | 'tarde' | 'noche' | 'auto';
  weather?: 'despejado' | 'lluvia' | 'neblina' | 'auto';
  /** radio que deben cubrir las sombras alrededor del jugador */
  shadowRadius?: number;
  /** escena interior: sin cielo, luz cálida */
  indoor?: boolean;
  fogColor?: string;
  fogFar?: number;
}
/** Todas las piezas de utilería aceptan esto. `pos` es el punto de apoyo en el suelo. */
export interface PropBase {
  pos: V3;
  rot?: number;
  scale?: number;
  color?: string;
  seed?: number /** false = sin colisión */;
  solid?: boolean;
}
export type Prop<P = {}> = FC<PropBase & P>;

/** Especies de vegetación (paquete HD: plantillas fusionadas por escena). */
export type FloraKind =
  | 'tree'
  | 'pine'
  | 'palm'
  | 'oilpalm'
  | 'bush'
  | 'jungle'
  | 'giant'
  | 'dry'
  | 'reed'
  | 'fern'
  | 'banana'
  | 'cafe'
  | 'flowers'
  /** guineo de bananera: racimo en bolsa azul y puntal */
  | 'bananera'
  /** jardín: izote, veranera sobre un tapial (x a lo largo de la pared, +z hacia la calle), seto podado, tulipán */
  | 'izote'
  | 'veranera'
  | 'seto'
  | 'tulipan';
/** Una planta en coordenadas del mundo: especie, punto de apoyo, escala, color de hoja, semilla y giro. */
export interface FloraItem {
  k: FloraKind;
  p: V3;
  s: number;
  c?: string;
  seed: number;
  r?: number;
}
/** Cerro de fondo con relieve: centro en la base, radio, altura y color. */
export interface HillDef {
  p: V3;
  r: number;
  h: number;
  c: string;
  seed: number;
}

export interface ArtProps {
  Tree: Prop;
  Palm: Prop;
  Pine: Prop;
  Bush: Prop;
  Flowers: Prop;
  Rock: Prop;
  /** casa colonial con techo de teja. w/d en metros, floors 1–2, sign = rótulo sobre la puerta */
  House: Prop<{ w?: number; d?: number; floors?: number; roofColor?: string; sign?: string }>;
  Lamp: Prop;
  Bench: Prop;
  Fence: Prop<{ length?: number }>;
  /** bandera de Honduras ondeando en su asta */
  Flag: Prop<{ height?: number }>;
  /** puesto de mercado o feria con toldo */
  Stall: Prop<{ sign?: string }>;
  Kiosk: Prop;
  Fountain: Prop;
  Statue: Prop;
  Sign: Prop<{ text: string; w?: number }>;
  /** arco de portal a un minijuego o destino */
  PortalArch: Prop<{ label: string; icon?: string }>;
  Bus: Prop;
  Mototaxi: Prop;
  Car: Prop;
  Boat: Prop;
  Cone: Prop;
  Barrel: Prop;
  Crate: Prop;
  Tire: Prop;
  SoccerBall: FC<{ r?: number }>;
  /** portería con red; `d` = fondo de la red (m) */
  Goal: Prop<{ w?: number; h?: number; d?: number }>;
  /** moneda Lempirita giratoria (solo el modelo; la lógica está en kit <CoinPickup>) */
  Coin: FC<{ r?: number }>;
  /** objeto de colección brillante (jade, concha, etc.) */
  Gem: FC<{ color?: string; kind?: string }>;
  /** guacamaya roja posada o volando en círculos */
  Macaw: Prop<{ flying?: boolean }>;
}
/** Pintura de una pieza fusionada: tipo de material (o las capas de corteza y paja tejida), color, rugosidad,
 *  metal, emisión, `uv` = usar las UV de la pieza (la textura viaja con el objeto) y `g` = degradado vertical
 *  [y0, y1, k] que oscurece hasta k por debajo de y0. */
export interface Pintura {
  k?: MatKind | 'bark' | 'straw';
  c: string;
  r?: number;
  m?: number;
  e?: number;
  uv?: boolean;
  g?: [number, number, number];
}
/** Junta piezas en una sola geometría con color y material por vértice (se dibuja con `fused.material()`). */
export interface Molde {
  /** `xf`: traslado, giro (Euler XYZ) y escala, o una matriz ya armada */
  add(geo: THREE.BufferGeometry, paint: Pintura, xf?: { p?: V3; r?: V3; s?: V3 | number } | THREE.Matrix4): Molde;
  build(): THREE.BufferGeometry;
}
export interface ArtPack {
  name: 'roblox' | 'hd';
  /** material cacheado por (tipo, color) */
  material(kind: MatKind, color: string): THREE.Material;
  Avatar: FC<AvatarProps>;
  SkyRig: FC<SkyRigProps>;
  props: ArtProps;
  /** geometría de caja opcional (p. ej. con bordes biselados en hd); la usa <Block>. Debe venir cacheada. */
  boxGeometry?(w: number, h: number, d: number): THREE.BufferGeometry;
  /** geometría de roca con forma (radio 1, base plana en y = −0.3), cacheada por semilla; la usan las zonas */
  rockGeometry?(seed: number): THREE.BufferGeometry;
  /** opcional (hd): un solo material que lee capa, rugosidad, metal y emisión (`aMat`) y color (`aCol`) por
   *  vértice; `info` da [capa, rugosidad, metal] de cada tipo. Con esto <Build> dibuja todo lo opaco en una llamada. */
  fused?: {
    material(): THREE.Material;
    info(kind: MatKind): [number, number, number];
    /** charco de luz de las lámparas (aditivo, solo de noche): quads con uv en [−1, 1] y atributo aK (fuerza) */
    pool?(): THREE.Material;
    /** constructor de mallas fusionadas para ese material (objetos con forma: torno, tubos, anillos) */
    molde?(): Molde;
  };
  /** envoltorio opcional alrededor de toda la escena (posprocesado, etc.) */
  Effects?: FC<{ children?: ReactNode }>;
  /** vegetación fusionada (una malla para muchas plantas). Si falta, las escenas usan sus piezas de siempre. */
  Flora?: FC<{ items: FloraItem[] }>;
  /** cerros de fondo con relieve, fusionados en una malla */
  Hills?: FC<{ hills: HillDef[] }>;
  /** zacate, matas y florcitas cerca de la cámara sobre el piso de zacate de la escena. `area` [x0, x1, z0, z1] es el
   *  piso que se mira (si falta, el límite del jugador); en los `holes` no crece (donde se juega). */
  GroundCover?: FC<{ area?: [number, number, number, number]; holes?: [number, number, number, number][] }>;
  /** opcional (hd): rejilla de alturas del terreno (n × n cada `cell` m, centrada) y niveles de los planos de agua,
   *  para que el agua sepa su hondura (espuma en la orilla, fondo a la vista, olas de mar abierto). Devuelve cómo
   *  quitarla. */
  shore?(data: Float32Array, n: number, cell: number, levels: number[]): () => void;
}
