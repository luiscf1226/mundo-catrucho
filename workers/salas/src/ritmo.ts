import {
  type Cubeta,
  type CubetaChat,
  cubetaChat,
  cubetaNueva,
  permitirChat,
  permitirMensaje,
} from '@mundo-catrucho/reglas';

export async function gastarRitmo(ctx: DurableObjectState, id: string, tipo: 'chat' | 'general') {
  return ctx.storage.transaction(async (tx) => {
    const clave = `ritmo:${tipo}:${id}`;
    const ahora = Date.now();
    const c = (await tx.get<Cubeta & CubetaChat>(clave)) ?? (tipo === 'chat' ? cubetaChat(ahora) : cubetaNueva(ahora));
    const pasa = tipo === 'chat' ? permitirChat(c, ahora) : permitirMensaje(c, ahora);
    await tx.put(clave, c);
    return pasa;
  });
}
