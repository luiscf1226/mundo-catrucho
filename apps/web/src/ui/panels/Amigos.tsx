// Amigos (MC-22, MC-24): pedidos, amigos con mensajes directos, código de 5 letras para jugar juntos y bloqueados.
// Sin salas en vivo no hay amigos en línea: el panel lo dice y no hace ninguna petición.
import { CODIGO, type MotivoReporte } from '@mundo-catrucho/reglas';
import { useEffect, useRef, useState } from 'react';
import { audio } from '../../core/audio';
import { type Amigo, type Directo, leerSocial, social, unirseConCodigo, useChat } from '../../core/chat';
import { EN_VIVO, net, useSala } from '../../core/net';
import { useGame } from '../../core/store';
import { MOTIVO_TEXTO } from '../chat/ChatSala';
import { Icon } from '../components/Icon';
import { Btn, Note, Panel, Tabs, Tag } from '../components/kit';
import { copyText, cx, g } from '../lib';

type Pestana = 'amigos' | 'codigo' | 'bloqueados';
const SONDEO_MS = 3000;

function Conversacion({ a, volver }: { a: Amigo; volver: () => void }) {
  const chat = useGame((s) => s.profile.settings.chat);
  const [mensajes, setMensajes] = useState<Directo[]>([]),
    [texto, setTexto] = useState(''),
    [aviso, setAviso] = useState(''),
    [reportar, setReportar] = useState<string | null>(null),
    lista = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!chat) return;
    let vivo = true;
    const leer = async () => {
      const r = await social.directos(a.amistadId);
      if (vivo && r.ok) setMensajes(r.mensajes);
    };
    void leer();
    const t = setInterval(leer, SONDEO_MS);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [a.amistadId, chat]);
  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [mensajes]);
  const mandar = async () => {
    const r = await social.enviarDirecto(a.amistadId, texto);
    if (r.ok) {
      setTexto('');
      setAviso(r.tapado ? 'Se tapó parte de tu mensaje: no se permiten groserías ni datos personales.' : '');
      const d = await social.directos(a.amistadId);
      if (d.ok) setMensajes(d.mensajes);
    } else setAviso(r.motivo === 'ritmo' ? 'Más despacio: esperá un toque.' : 'No se pudo mandar.');
  };
  const reportarDirecto = async (id: string, motivo: MotivoReporte) => {
    const r = await social.reportarDirecto(id, motivo);
    setReportar(null);
    g().toast(r.ok ? 'Gracias. Tu reporte llegó a moderación' : 'No se pudo reportar', r.ok ? '🛡️' : '⚠️');
  };
  return (
    <div data-testid="directo" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Btn id="directo-volver" tone="neutral" size="sm" icon="back" onClick={volver}>
          Amigos
        </Btn>
        <b className="min-w-0 flex-1 truncate font-display text-lg">{a.nombre}</b>
      </div>
      {!chat ? (
        <Note cls="" icon="info">
          <span data-testid="directo-apagado">El chat está apagado en Ajustes.</span>
        </Note>
      ) : (
        <>
          <div
            ref={lista}
            data-testid="directo-lista"
            className="mc-card mc-scroll flex max-h-64 min-h-32 flex-col gap-1.5 p-2.5"
          >
            {mensajes.length === 0 && <span className="text-sm font-bold text-muted">Todavía no se han escrito.</span>}
            {mensajes.map((m) => (
              <div key={m.id} className={cx('flex flex-col', m.mio ? 'items-end' : 'items-start')}>
                <span
                  data-testid="directo-msg"
                  data-mio={m.mio}
                  data-tapado={m.tapado}
                  className={cx(
                    'max-w-[85%] break-words rounded-xl px-2.5 py-1 text-sm font-bold',
                    m.mio ? 'bg-accent text-white' : 'bg-card2',
                    m.tapado && 'italic',
                  )}
                >
                  {m.texto}
                </span>
                {!m.mio &&
                  (reportar === m.id ? (
                    <span className="mt-0.5 flex flex-wrap gap-1">
                      {(Object.keys(MOTIVO_TEXTO) as MotivoReporte[]).map((mo) => (
                        <button
                          key={mo}
                          type="button"
                          data-testid={`directo-reportar-${mo}`}
                          className="mc-tab !min-h-0 !px-2 !py-0.5 text-xs"
                          onClick={() => {
                            void reportarDirecto(m.id, mo);
                          }}
                        >
                          {MOTIVO_TEXTO[mo]}
                        </button>
                      ))}
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid="directo-reportar"
                      className="mt-0.5 text-[11px] font-bold text-muted underline"
                      onClick={() => setReportar(m.id)}
                    >
                      Reportar
                    </button>
                  ))}
              </div>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (texto.trim()) void mandar();
            }}
          >
            <input
              data-testid="directo-input"
              className="mc-input flex-1"
              value={texto}
              maxLength={140}
              placeholder={`Escribile a ${a.nombre}…`}
              aria-label={`Mensaje para ${a.nombre}`}
              autoComplete="off"
              onChange={(e) => setTexto(e.target.value)}
            />
            <Btn
              id="directo-enviar"
              tone="primary"
              icon="next"
              disabled={!texto.trim()}
              onClick={() => {
                void mandar();
              }}
            >
              Mandar
            </Btn>
          </form>
          {aviso && (
            <p data-testid="directo-aviso" className="text-xs font-bold text-muted" role="status">
              {aviso}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function FilaAmigo({ a, abrir }: { a: Amigo; abrir: () => void }) {
  return (
    <div
      data-testid="amigo"
      data-id={a.id}
      data-estado={a.estado}
      className="mc-card flex items-center gap-2 px-3 py-2"
    >
      <Icon name="user" size={20} cls="text-accent" />
      <b className="min-w-0 flex-1 truncate">{a.nombre}</b>
      {a.estado === 'recibida' ? (
        <>
          <Btn
            id="amigo-aceptar"
            tone="good"
            size="sm"
            icon="check"
            onClick={() => void social.responder(a.amistadId, true)}
          >
            Aceptar
          </Btn>
          <Btn id="amigo-rechazar" tone="neutral" size="sm" onClick={() => void social.responder(a.amistadId, false)}>
            No
          </Btn>
        </>
      ) : a.estado === 'enviada' ? (
        <>
          <Tag>Esperando</Tag>
          <Btn id="amigo-quitar" tone="neutral" size="sm" onClick={() => void social.quitar(a.amistadId)}>
            Cancelar
          </Btn>
        </>
      ) : (
        <>
          <Btn id="amigo-escribir" tone="primary" size="sm" icon="doc" onClick={abrir}>
            Escribir
          </Btn>
          <Btn id="amigo-quitar" tone="neutral" size="sm" onClick={() => void social.quitar(a.amistadId)}>
            Quitar
          </Btn>
          <Btn
            id="amigo-bloquear"
            tone="bad"
            size="sm"
            onClick={() => {
              void social.bloquear(a.id);
              g().toast(`Bloqueaste a ${a.nombre}`, '⛔');
            }}
          >
            Bloquear
          </Btn>
        </>
      )}
    </div>
  );
}

function ListaAmigos() {
  const s = useChat((st) => st.social),
    conocido = useChat((st) => st.conocido),
    [abierto, setAbierto] = useState<Amigo | null>(null);
  useSala((st) => st.otros);
  if (abierto) {
    const a = s?.amigos.find((x) => x.amistadId === abierto.amistadId && x.estado === 'amigos');
    if (a) return <Conversacion a={a} volver={() => setAbierto(null)} />;
  }
  const amigos = s?.amigos ?? [];
  const conocidos = new Set([...amigos.map((a) => a.id), ...(s?.bloqueados ?? []).map((b) => b.id)]);
  // gente con quien estás jugando ahora (y con quien te juntaste por código) a la que podés pedir amistad
  const cerca = [
    ...(conocido ? [{ id: conocido.id, name: conocido.nombre }] : []),
    ...net.players().filter((p) => p.listo),
  ].filter((p, i, l) => !conocidos.has(p.id) && l.findIndex((x) => x.id === p.id) === i);
  return (
    <div className="grid gap-2">
      {!s && <span className="text-sm font-bold text-muted">Cargando…</span>}
      <div className="grid gap-1.5" data-testid="amigos-lista">
        {amigos.map((a) => (
          <FilaAmigo key={a.amistadId} a={a} abrir={() => setAbierto(a)} />
        ))}
        {s && amigos.length === 0 && (
          <span className="text-sm font-bold text-muted">
            Todavía no tenés amigos aquí. Jugá con alguien en una sala o usá un código.
          </span>
        )}
      </div>
      {cerca.length > 0 && (
        <>
          <div className="mc-label mt-2">Jugando con vos</div>
          <div className="grid gap-1.5" data-testid="amigos-cerca">
            {cerca.slice(0, 12).map((p) => (
              <div key={p.id} className="mc-card flex items-center gap-2 px-3 py-1.5">
                <Icon name="users" size={18} cls="text-good" />
                <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                <Btn
                  id={`cerca-amistad-${p.id}`}
                  tone="good"
                  size="sm"
                  icon="plus"
                  onClick={() => {
                    void social.pedir(p.id).then((r) => {
                      if (r.ok)
                        g().toast(
                          r.estado === 'amigos' ? `Ya sos amigo de ${p.name}` : `Le pediste amistad a ${p.name}`,
                          '🤝',
                        );
                      else g().toast(r.motivo === 'ya' ? 'Ya se lo pediste' : 'No se pudo pedir amistad', '⚠️');
                    });
                  }}
                >
                  Amistad
                </Btn>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const AVISO_CODIGO = {
  ok: (n?: string) => `Ya estás en la sala de ${n}`,
  llena: (n?: string) => `La sala de ${n} está llena (24). Probá en un rato.`,
  error: () => 'No se pudo entrar a esa sala.',
  codigo: () => 'Ese código no existe.',
  vencido: () => 'Ese código ya venció. Pedile otro.',
  propio: () => 'Ese código es tuyo: pasáselo a un amigo.',
  espera: () => 'Probaste muchos códigos. Esperá unos minutos.',
  'sin-sala': () => 'Tu amigo no está en una sala en vivo ahorita.',
  'sin-conexion': () => 'Sin conexión. Probá otra vez.',
} as const;

function Codigo() {
  const s = useChat((st) => st.social),
    sala = useSala((st) => st.sala),
    [entrada, setEntrada] = useState(''),
    union = useChat((st) => st.union),
    [ocupado, setOcupado] = useState(false);
  const activo = s?.codigo && s.codigo.vence > Date.now() ? s.codigo : null;
  const minutos = activo ? Math.max(1, Math.round((activo.vence - Date.now()) / 60_000)) : 0;
  return (
    <div className="grid gap-3">
      <div className="mc-card flex flex-wrap items-center gap-3 p-3">
        <div className="min-w-0 flex-1 basis-48">
          <div className="mc-label">Invitá a alguien</div>
          <p className="text-sm font-bold leading-snug">
            Pasale tu código: entra a tu misma sala aunque esté en otro tramo. Vale {CODIGO.vigenciaMs / 60_000}{' '}
            minutos.
          </p>
        </div>
        {activo ? (
          <div className="flex items-center gap-2">
            <code data-testid="codigo-mio" className="mc-codechip mc-num text-2xl tracking-[.3em]">
              {activo.codigo}
            </code>
            <Btn
              id="codigo-copiar"
              tone="neutral"
              size="sm"
              icon="copy"
              onClick={() => {
                void copyText(activo.codigo).then((ok) => ok && g().toast('Código copiado', '📋'));
              }}
            >
              Copiar
            </Btn>
          </div>
        ) : (
          <Btn
            id="codigo-crear"
            tone="gold"
            icon="key"
            disabled={!sala}
            onClick={() => {
              void social.crearCodigo().then((r) => {
                if (!r.ok) g().toast('No se pudo crear el código', '⚠️');
              });
            }}
          >
            Crear código
          </Btn>
        )}
        {activo && <span className="basis-full text-xs font-bold text-muted">Vence en unos {minutos} min.</span>}
        {!sala && (
          <span className="basis-full text-xs font-bold text-muted" data-testid="codigo-sin-sala">
            Entrá a una sala en vivo (el mapa o un departamento, jugando con gente) para invitar.
          </span>
        )}
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="mc-label mb-1 block">Unirme con código</span>
          <input
            data-testid="codigo-input"
            className="mc-input mc-num uppercase tracking-[.25em]"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            maxLength={CODIGO.largo}
            placeholder="ABC23"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label="Código de un amigo"
          />
        </label>
        <Btn
          id="codigo-unirme"
          tone="primary"
          icon="users"
          disabled={entrada.length !== CODIGO.largo || ocupado}
          onClick={() => {
            audio.init();
            setOcupado(true);
            void unirseConCodigo(entrada)
              .then(({ r, nombre }) => {
                g().toast(AVISO_CODIGO[r](nombre), r === 'ok' ? '👥' : '⚠️');
                if (r === 'ok') setEntrada('');
              })
              .finally(() => setOcupado(false));
          }}
        >
          Unirme
        </Btn>
      </form>
      {union && (
        <p data-testid="codigo-estado" data-r={union.r} className="text-sm font-bold" role="status">
          {AVISO_CODIGO[union.r](union.nombre)}
        </p>
      )}
    </div>
  );
}

function Bloqueados() {
  const s = useChat((st) => st.social);
  const lista = s?.bloqueados ?? [];
  return (
    <div className="grid gap-1.5" data-testid="bloqueados-lista">
      {lista.length === 0 && <span className="text-sm font-bold text-muted">No has bloqueado a nadie.</span>}
      {lista.map((b) => (
        <div key={b.id} data-testid="bloqueado" data-id={b.id} className="mc-card flex items-center gap-2 px-3 py-2">
          <Icon name="lock" size={18} cls="text-bad" />
          <b className="min-w-0 flex-1 truncate">{b.nombre}</b>
          <Btn id="bloqueado-quitar" tone="neutral" size="sm" onClick={() => void social.desbloquear(b.id)}>
            Desbloquear
          </Btn>
        </div>
      ))}
      <Note cls="mt-2">Quien bloqueás no ve tus mensajes ni vos los suyos, y no te puede invitar.</Note>
    </div>
  );
}

function AmigosEnLinea() {
  const [tab, setTab] = useState<Pestana>('amigos');
  const s = useChat((st) => st.social);
  const recibidas = s?.amigos.filter((a) => a.estado === 'recibida').length ?? 0;
  useEffect(() => {
    void leerSocial();
    const t = setInterval(() => void leerSocial(), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <>
      <Tabs
        items={[
          { id: 'amigos', label: recibidas ? `Amigos (${recibidas})` : 'Amigos', icon: 'users' },
          { id: 'codigo', label: 'Código', icon: 'key' },
          { id: 'bloqueados', label: 'Bloqueados', icon: 'lock' },
        ]}
        value={tab}
        onChange={setTab}
        testid={(id) => `amigos-tab-${id}`}
        cls="mb-3"
      />
      {tab === 'amigos' && <ListaAmigos />}
      {tab === 'codigo' && <Codigo />}
      {tab === 'bloqueados' && <Bloqueados />}
    </>
  );
}

export function AmigosPanel() {
  return (
    <Panel id="amigos" title="Amigos" icon="users" size="md">
      {EN_VIVO ? (
        <AmigosEnLinea />
      ) : (
        <Note cls="" icon="info">
          <span data-testid="amigos-sin-red">
            Amigos, chat y códigos necesitan las salas en vivo. Esta versión del juego no se conecta: jugás con
            compañeros simulados.
          </span>
        </Note>
      )}
    </Panel>
  );
}
