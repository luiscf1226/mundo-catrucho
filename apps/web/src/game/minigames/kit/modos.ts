export type ModoDuo = { tipo: 'apoyo'; cada?: number } | { tipo: 'compartido'; cada: number };
export type ModoAbierto = { tipo: 'ambiente'; bots: 2 | 3 } | { tipo: 'objetivo-comun'; bots: 2 | 3; cada: number };
export interface ModosMotor {
  duo: ModoDuo;
  abierto: ModoAbierto;
}
export const MODOS_PREDETERMINADOS: ModosMotor = {
  duo: { tipo: 'apoyo' },
  abierto: { tipo: 'ambiente', bots: 3 },
};

export function validarModos(modos: ModosMotor) {
  for (const modo of [modos.duo, modos.abierto]) {
    if ('cada' in modo && modo.cada !== undefined && (!Number.isFinite(modo.cada) || modo.cada <= 0))
      throw new Error('El intervalo de ayuda debe ser positivo');
  }
}

export function ayudaEnPaso(tiempo: number, dt: number, cada = 0, desfase = 0) {
  if (cada === 0) return true;
  return Math.floor((tiempo + desfase) / cada) > Math.floor((Math.max(0, tiempo - dt) + desfase) / cada);
}

export function lineaModo(modo: string, modos: ModosMotor) {
  if (modo === 'duo')
    return modos.duo.tipo === 'apoyo' ? 'Dúo · Vos jugás y tu compa te apoya' : 'Dúo · Sumá junto a tu compa';
  if (modo === 'abierto')
    return modos.abierto.tipo === 'ambiente'
      ? 'Abierto · Jugá acompañado de bots'
      : 'Abierto · Entre todos van por la misma meta';
  return null;
}
