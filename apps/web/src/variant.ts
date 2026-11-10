// Una sola base de código, dos versiones: 'roblox' (estilo bloques) y 'hd' (3D estilizado con más calidad).
// Se elige al compilar con VITE_VARIANT. Las reglas y los datos son los mismos; cambia el arte (src/game/kit/art).
export type Variant = 'roblox' | 'hd';
export const VARIANT: Variant = import.meta.env.VITE_VARIANT === 'hd' ? 'hd' : 'roblox';
export const IS_HD = VARIANT === 'hd';
export const TITLE = IS_HD ? 'Mundo Catrucho 3D' : 'Mundo Catrucho';
