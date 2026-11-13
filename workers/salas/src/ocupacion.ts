// Ocupación de las salas de zona (MC-23): cada sala con gente le avisa a Convex cuántas personas tiene cada 30 s
// (`OCUPACION_MS`). Va firmado con `SALA_SECRETO` para que nadie más escriba esa tabla. Sin `CONVEX_SITE_URL` no
// avisa nada. Los bots no cuentan.
import { firmarDatos, partirSala } from '@mundo-catrucho/reglas';
import { abiertas } from './comun';

export interface EnvOcupacion {
  SALA_SECRETO: string;
  /** `https://<deployment>.convex.site` (el de las acciones HTTP, no el `.cloud`) */
  CONVEX_SITE_URL?: string;
  /** cada cuánto avisa; por defecto 30 s */
  OCUPACION_MS?: string;
}
const periodo = (env: EnvOcupacion) => Math.max(200, Number(env.OCUPACION_MS) || 30_000);

/** Al entrar alguien: si todavía no hay aviso programado, avisa pronto y sigue cada `periodo`. */
export async function programarOcupacion(ctx: DurableObjectState, env: EnvOcupacion, sala: string) {
  if (!env.CONVEX_SITE_URL || !partirSala(sala)) return;
  if ((await ctx.storage.getAlarm()) === null) await ctx.storage.setAlarm(Date.now() + 200);
}
/** La alarma de una sala de zona: avisa y, si queda gente, vuelve a programarse. Vacía avisa 0 y se calla. */
export async function alarmaOcupacion(ctx: DurableObjectState, env: EnvOcupacion, sala: string) {
  const ocupacion = abiertas(ctx).length;
  if (env.CONVEX_SITE_URL) {
    try {
      const cuerpo = await firmarDatos('ocupacion', { sala, ocupacion, momento: Date.now() }, env.SALA_SECRETO);
      await fetch(`${env.CONVEX_SITE_URL.replace(/\/+$/, '')}/salas/ocupacion`, { method: 'POST', body: cuerpo });
    } catch (e) {
      console.error('No se pudo avisar la ocupación a Convex', String(e));
    }
  }
  if (ocupacion > 0) await ctx.storage.setAlarm(Date.now() + periodo(env));
}
