// «Tu cuenta» en Ajustes (MC-07, MC-08, MC-09): seguir en otro dispositivo con un código de 8 letras y, si la
// compilación trae Clerk, entrar con Google o correo. Sin Convex no se muestra: el avance vive solo en el navegador.
import { CODIGO_DISPOSITIVO } from '@mundo-catrucho/reglas';
import { lazy, Suspense, useState } from 'react';
import { audio } from '../../core/audio';
import { type ResumenFusion, servidor } from '../../core/servidor';
import { useGame } from '../../core/store';
import { Icon } from '../components/Icon';
import { Btn } from '../components/kit';
import { copyText, cx, g } from '../lib';

const BotonCuenta = __CLERK__ ? lazy(() => import('../../core/clerk').then((m) => ({ default: m.BotonCuenta }))) : null;
const MINUTOS = Math.round(CODIGO_DISPOSITIVO.vigenciaMs / 60_000);

const MOTIVO: Record<string, string> = {
  codigo: 'Ese código no existe. Revisá las letras.',
  vencido: 'Ese código ya venció. Pedí uno nuevo en el otro dispositivo.',
  propio: 'Ese código es de esta misma cuenta: ya estás aquí.',
  espera: 'Demasiados intentos. Esperá unos minutos.',
  'con-cuenta': 'Este dispositivo es de una cuenta con correo: entrá con ella, no hace falta código.',
  tope: 'Esa cuenta ya juntó dos dispositivos hoy. Probá mañana.',
  'sin-conexion': 'Sin conexión. Probá otra vez.',
};
const motivo = (m: string) => MOTIVO[m] ?? 'No se pudo. Probá otra vez.';

function textoResumen(r: ResumenFusion | null) {
  if (!r) return 'este dispositivo no tenía nada guardado';
  const partes = [`${r.monedas >= 0 ? '+' : ''}${r.monedas} Lempiritas`];
  if (r.prendas) partes.push(`${r.prendas} ${r.prendas === 1 ? 'prenda' : 'prendas'}`);
  if (r.juegos) partes.push(`${r.juegos} ${r.juegos === 1 ? 'juego' : 'juegos'}`);
  if (r.visitas) partes.push(`${r.visitas} ${r.visitas === 1 ? 'departamento' : 'departamentos'}`);
  const texto = `se juntó ${partes.join(', ')}`;
  // lo comprado con premios que ya tenía la cuenta (la bienvenida, la misma visita…) se devuelve
  return r.devueltas
    ? `${texto} (se ${r.devueltas === 1 ? 'devolvió 1 prenda pagada' : `devolvieron ${r.devueltas} prendas pagadas`} con premios repetidos)`
    : texto;
}

export function TuCuenta() {
  const nombre = useGame((s) => s.profile.name);
  const [codigo, setCodigo] = useState<{ codigo: string; vence: number } | null>(null),
    [pidiendo, setPidiendo] = useState(false),
    [copiado, setCopiado] = useState(false),
    [entrada, setEntrada] = useState(''),
    [usando, setUsando] = useState(false),
    [confirmar, setConfirmar] = useState<{ nombre: string; nivel: number } | null>(null),
    [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const crear = async () => {
    setPidiendo(true);
    setAviso(null);
    const r = await g().crearCodigoDispositivo();
    setPidiendo(false);
    if (r.ok) {
      setCodigo(r);
      setCopiado(false);
    } else setAviso({ ok: false, texto: motivo(r.motivo) });
  };
  /** Primero se muestra de quién es la cuenta: entrar le da a esa cuenta todo lo de este dispositivo. */
  const revisar = async () => {
    audio.init();
    setUsando(true);
    setAviso(null);
    const r = await servidor.verCodigo(entrada);
    setUsando(false);
    if (r.ok) setConfirmar({ nombre: r.nombre, nivel: r.nivel });
    else setAviso({ ok: false, texto: motivo(r.motivo) });
  };
  const usar = async () => {
    setConfirmar(null);
    setUsando(true);
    setAviso(null);
    const r = await g().usarCodigoDispositivo(entrada);
    setUsando(false);
    if (!r.ok) {
      setAviso({ ok: false, texto: motivo(r.motivo) });
      return;
    }
    setEntrada('');
    setCodigo(null);
    const texto = `Listo: ya jugás como ${g().profile.name}; ${textoResumen(r.resumen)}.`;
    setAviso({ ok: true, texto });
    g().toast('Ya estás en tu cuenta', '🔗');
  };

  return (
    <div className="mc-card grid gap-2 px-3 py-2" data-testid="cuenta">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Icon name="user" size={22} cls="text-accent" />
        <span className="min-w-0 flex-1 text-sm font-extrabold leading-tight">
          Tu cuenta
          <span className="block text-xs font-bold text-muted">
            Jugás como <b data-testid="cuenta-nombre">{nombre}</b>. Tus Lempiritas, tu nivel y tu ropa se guardan en el
            servidor.
          </span>
        </span>
        {BotonCuenta && (
          <Suspense fallback={null}>
            <BotonCuenta />
          </Suspense>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 basis-48 text-xs font-bold leading-tight">
          ¿Querés seguir en otro dispositivo? Creá un código y escribilo allá.
        </span>
        <Btn id="cuenta-crear" tone="neutral" size="sm" icon="key" disabled={pidiendo} onClick={() => void crear()}>
          {codigo ? 'Otro código' : 'Crear código'}
        </Btn>
      </div>
      {codigo && (
        <div className="flex flex-wrap items-center gap-2">
          <code data-testid="cuenta-codigo" className="mc-codechip mc-num tracking-[.2em]">
            {codigo.codigo}
          </code>
          <Btn
            id="cuenta-copiar"
            tone="neutral"
            size="sm"
            icon={copiado ? 'check' : 'copy'}
            onClick={() => {
              void copyText(codigo.codigo).then(setCopiado);
            }}
          >
            {copiado ? 'Copiado' : 'Copiar'}
          </Btn>
          <span className="basis-full text-xs font-bold text-muted">
            Vale {MINUTOS} minutos y una sola vez. No se lo des a nadie más: entra a tu cuenta.
          </span>
        </div>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (entrada.length === CODIGO_DISPOSITIVO.largo && !usando) void revisar();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="mc-label mb-1 block">Tengo un código de otro dispositivo</span>
          <input
            data-testid="cuenta-codigo-input"
            className="mc-input mc-num uppercase tracking-[.2em]"
            value={entrada}
            onChange={(e) => {
              setConfirmar(null);
              setEntrada(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, CODIGO_DISPOSITIVO.largo),
              );
            }}
            placeholder="ABCD-EFGH"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label="Código de otro dispositivo"
          />
        </label>
        <Btn
          id="cuenta-usar"
          tone="primary"
          size="sm"
          icon="check"
          disabled={entrada.length !== CODIGO_DISPOSITIVO.largo || usando || !!confirmar}
          onClick={() => void revisar()}
        >
          {usando ? 'Un toque…' : 'Entrar'}
        </Btn>
      </form>
      {confirmar && (
        <div className="mc-card mc-danger flex flex-wrap items-center gap-2 px-3 py-2" data-testid="cuenta-confirmar">
          <span className="min-w-0 flex-1 basis-56 text-sm font-extrabold leading-tight" role="alert">
            Vas a entrar a la cuenta de <b data-testid="cuenta-confirmar-nombre">{confirmar.nombre}</b> (nivel{' '}
            {confirmar.nivel}). Todo lo de este dispositivo pasa a esa cuenta. Hacelo solo si es tuya.
          </span>
          <Btn id="cuenta-cancelar" tone="neutral" size="sm" onClick={() => setConfirmar(null)}>
            Cancelar
          </Btn>
          <Btn id="cuenta-si" tone="primary" size="sm" icon="check" onClick={() => void usar()}>
            Sí, es mía
          </Btn>
        </div>
      )}
      <span className="text-xs font-bold text-muted">
        Este dispositivo entra a esa cuenta y lo que tenés aquí se junta con ella, sin perder nada.
      </span>
      {aviso && (
        <p
          data-testid="cuenta-aviso"
          data-ok={aviso.ok}
          role="status"
          className={cx('text-sm font-extrabold leading-tight', aviso.ok ? 'text-good' : 'text-bad')}
        >
          {aviso.texto}
        </p>
      )}
    </div>
  );
}
