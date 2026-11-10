// Capa de red, lista para multijugador. Hoy solo existe LocalNet (un jugador + compañeros simulados);
// un adaptador WebSocket o WebRTC puede implementar la misma interfaz sin tocar el resto del juego.
import type { Anim, AvatarConfig, V3 } from './types';

export interface RemotePlayer {
  id: string;
  name: string;
  avatar: AvatarConfig;
  pos: V3;
  yaw: number;
  anim: Anim;
}
export interface RoomInfo {
  code: string;
  mode: 'solo' | 'publica' | 'privada';
  players: number;
  max: number;
  name: string;
}
export interface NetAdapter {
  readonly online: boolean;
  listRooms(): Promise<RoomInfo[]>;
  createRoom(mode: 'publica' | 'privada'): Promise<RoomInfo>;
  joinRoom(code: string): Promise<RoomInfo | null>;
  leaveRoom(): void;
  /** estado propio → servidor (20 Hz) */
  sendState(pos: V3, yaw: number, anim: Anim): void;
  /** jugadores remotos de la sala actual */
  players(): RemotePlayer[];
  on(ev: 'join' | 'leave' | 'emote' | 'chat', cb: (p: RemotePlayer, data?: string) => void): () => void;
}
const code = () =>
  Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
export class LocalNet implements NetAdapter {
  readonly online = false;
  private rooms: RoomInfo[] = [
    { code: 'TEGUS', mode: 'publica', players: 7, max: 16, name: 'Plaza de Tegus' },
    { code: 'CEIBA', mode: 'publica', players: 12, max: 16, name: 'Carnaval ceibeño' },
    { code: 'COPAN', mode: 'publica', players: 4, max: 16, name: 'Exploradores de Copán' },
  ];
  async listRooms() {
    return this.rooms;
  }
  async createRoom(mode: 'publica' | 'privada') {
    const r: RoomInfo = {
      code: code(),
      mode,
      players: 1,
      max: mode === 'privada' ? 8 : 16,
      name: mode === 'privada' ? 'Sala privada' : 'Sala nueva',
    };
    if (mode === 'publica') this.rooms.unshift(r);
    return r;
  }
  async joinRoom(c: string) {
    const k = c.trim().toUpperCase();
    return (
      this.rooms.find((r) => r.code === k) ??
      (/^[A-Z0-9]{5}$/.test(k) ? { code: k, mode: 'privada' as const, players: 1, max: 8, name: 'Sala privada' } : null)
    );
  }
  leaveRoom() {
    /* local */
  }
  sendState() {
    /* local */
  }
  players() {
    return [];
  }
  on() {
    return () => {};
  }
}
export const net: NetAdapter = new LocalNet();
