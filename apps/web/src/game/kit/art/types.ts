// Contrato del paquete de arte. Hay dos implementaciones con la misma forma:
//   art/roblox  → bloques, studs, colores planos, avatar clásico de piezas
//   art/hd      → 3D estilizado: formas suaves, materiales con textura, sombras, día y noche, clima
// Las escenas (lobby, departamentos, minijuegos) NUNCA crean materiales ni personajes a mano: usan esto.
import type { FC, ReactNode } from 'react';
import type * as THREE from 'three';
import type { AvatarConfig, AvatarState, V3 } from '../../../core/types';

export type MatKind = 'plastic' | 'grass' | 'dirt' | 'sand' | 'stone' | 'cobble' | 'brick' | 'wood' | 'metal' | 'tile' | 'stucco' | 'roof' | 'water' | 'neon' | 'glass' | 'cloth' | 'asphalt' | 'concrete' | 'leaf' | 'gold';

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
  fogColor?: string; fogFar?: number;
}
/** Todas las piezas de utilería aceptan esto. `pos` es el punto de apoyo en el suelo. */
export interface PropBase { pos: V3; rot?: number; scale?: number; color?: string; seed?: number; /** false = sin colisión */ solid?: boolean }
export type Prop<P = {}> = FC<PropBase & P>;

export interface ArtProps {
  Tree: Prop; Palm: Prop; Pine: Prop; Bush: Prop; Flowers: Prop; Rock: Prop;
  /** casa colonial con techo de teja. w/d en metros, floors 1–2, sign = rótulo sobre la puerta */
  House: Prop<{ w?: number; d?: number; floors?: number; roofColor?: string; sign?: string }>;
  Lamp: Prop; Bench: Prop;
  Fence: Prop<{ length?: number }>;
  /** bandera de Honduras ondeando en su asta */
  Flag: Prop<{ height?: number }>;
  /** puesto de mercado o feria con toldo */
  Stall: Prop<{ sign?: string }>;
  Kiosk: Prop; Fountain: Prop; Statue: Prop;
  Sign: Prop<{ text: string; w?: number }>;
  /** arco de portal a un minijuego o destino */
  PortalArch: Prop<{ label: string; icon?: string }>;
  Bus: Prop; Mototaxi: Prop; Car: Prop; Boat: Prop;
  Cone: Prop; Barrel: Prop; Crate: Prop; Tire: Prop;
  SoccerBall: FC<{ r?: number }>;
  Goal: Prop<{ w?: number; h?: number }>;
  /** moneda Lempirita giratoria (solo el modelo; la lógica está en kit <CoinPickup>) */
  Coin: FC<{ r?: number }>;
  /** objeto de colección brillante (jade, concha, etc.) */
  Gem: FC<{ color?: string; kind?: string }>;
  /** guacamaya roja posada o volando en círculos */
  Macaw: Prop<{ flying?: boolean }>;
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
  /** envoltorio opcional alrededor de toda la escena (posprocesado, etc.) */
  Effects?: FC<{ children?: ReactNode }>;
}
