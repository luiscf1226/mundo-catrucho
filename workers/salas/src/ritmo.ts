import {
  type Cubeta,
  type CubetaChat,
  cubetaChat,
  cubetaNueva,
  permitirChat,
  permitirMensaje,
} from '@mundo-catrucho/reglas';

export class RitmoSala {
  private cubetas = new Map<string, Cubeta & CubetaChat>();

  gastar(id: string, tipo: 'chat' | 'general', ahora = Date.now()) {
    const clave = `${tipo}:${id}`;
    let c = this.cubetas.get(clave);
    if (!c) {
      c = tipo === 'chat' ? cubetaChat(ahora) : cubetaNueva(ahora);
      this.cubetas.set(clave, c);
    }
    return tipo === 'chat' ? permitirChat(c, ahora) : permitirMensaje(c, ahora);
  }

  borrar(id: string) {
    this.cubetas.delete(`chat:${id}`);
    this.cubetas.delete(`general:${id}`);
  }
}
