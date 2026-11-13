// Chat de la sala en vivo (MC-22): los últimos mensajes y el campo para escribir, abajo a la izquierda.
// Tocar un nombre abre: pedir amistad, silenciar (esta sesión), bloquear (se guarda) y reportar.
// Solo se ve con sala en vivo, dentro de una sala y con «Chat» encendido en Ajustes. La tecla T abre el campo.
// Con pantalla táctil va arriba (abajo están la palanca y los botones) y empieza escondido para no tapar las misiones.
import { MOTIVOS_REPORTE, type MotivoReporte } from '@mundo-catrucho/reglas';
import { useEffect, useRef, useState } from 'react';
import { enviarSala, instalarChat, type MensajeSala, silenciar, social, useChat } from '../../core/chat';
import { EN_VIVO, useSala } from '../../core/net';
import { useGame } from '../../core/store';
import { Icon } from '../components/Icon';
import { cx, g, useTouch } from '../lib';

export const MOTIVO_TEXTO: Record<MotivoReporte, string> = {
  groseria: 'Groserías',
  acoso: 'Me molesta',
  datos: 'Pide datos',
  spam: 'Spam',
  otro: 'Otra cosa',
};
const VISIBLES = 6;

function Menu({ m, cerrar }: { m: MensajeSala; cerrar: () => void }) {
  const [reportar, setReportar] = useState(false);
  const amigos = useChat((s) => s.social?.amigos ?? []);
  const yaAmigo = amigos.some((a) => a.id === m.de);
  const hecho = (texto: string, icono: string) => {
    g().toast(texto, icono);
    cerrar();
  };
  return (
    <div data-testid="chat-menu" className="mc-hud anim-drop mt-1 flex flex-wrap gap-1.5 p-2">
      <b className="basis-full truncate text-sm">{m.nombre}</b>
      {reportar ? (
        <>
          <span className="basis-full text-xs font-bold opacity-80">¿Por qué lo reportás?</span>
          {MOTIVOS_REPORTE.map((mo) => (
            <button
              key={mo}
              type="button"
              data-testid={`chat-reportar-${mo}`}
              className="mc-chip mc-hud"
              onClick={() => {
                void social.reportarSala(m, mo).then((r) => {
                  if (r.ok) hecho('Gracias. Tu reporte llegó a moderación', '🛡️');
                  else
                    hecho(
                      r.motivo === 'tope'
                        ? 'Ya reportaste mucho hoy'
                        : r.motivo === 'ya'
                          ? 'Ya reportaste ese mensaje'
                          : 'No se pudo reportar',
                      '⚠️',
                    );
                });
              }}
            >
              {MOTIVO_TEXTO[mo]}
            </button>
          ))}
        </>
      ) : (
        <>
          {!yaAmigo && (
            <button
              type="button"
              data-testid="chat-amistad"
              className="mc-chip mc-hud"
              onClick={() => {
                void social
                  .pedir(m.de)
                  .then((r) =>
                    hecho(
                      r.ok
                        ? r.estado === 'amigos'
                          ? `Ya sos amigo de ${m.nombre}`
                          : `Le pediste amistad a ${m.nombre}`
                        : r.motivo === 'ya'
                          ? 'Ya se lo pediste'
                          : 'No se pudo pedir amistad',
                      r.ok ? '🤝' : '⚠️',
                    ),
                  );
              }}
            >
              <Icon name="plus" size={14} /> Amistad
            </button>
          )}
          <button
            type="button"
            data-testid="chat-silenciar"
            className="mc-chip mc-hud"
            onClick={() => {
              silenciar(m.de);
              hecho(`Silenciaste a ${m.nombre} por ahora`, '🔇');
            }}
          >
            Silenciar
          </button>
          <button
            type="button"
            data-testid="chat-bloquear"
            className="mc-chip mc-hud"
            onClick={() => {
              void social.bloquear(m.de);
              hecho(`Bloqueaste a ${m.nombre}`, '⛔');
            }}
          >
            Bloquear
          </button>
          <button
            type="button"
            data-testid="chat-reportar"
            className="mc-chip mc-hud"
            onClick={() => setReportar(true)}
          >
            Reportar
          </button>
        </>
      )}
      <button type="button" data-testid="chat-menu-cerrar" className="mc-chip mc-hud ml-auto" onClick={cerrar}>
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

export function ChatSala() {
  const encendido = useGame((s) => s.profile.settings.chat),
    mg = useGame((s) => s.mg),
    enSala = useSala((s) => s.estado === 'en-sala'),
    mensajes = useChat((s) => s.mensajes),
    touch = useTouch();
  const [texto, setTexto] = useState(''),
    [aviso, setAviso] = useState(''),
    [abierto, setAbierto] = useState(!touch),
    [menu, setMenu] = useState<MensajeSala | null>(null),
    campo = useRef<HTMLInputElement>(null),
    lista = useRef<HTMLUListElement>(null);
  useEffect(instalarChat, []);
  const visible = EN_VIVO && encendido && enSala && !mg;
  // T abre el campo para escribir (si no estás escribiendo ya en otro lado)
  useEffect(() => {
    if (!visible) return;
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key.toLowerCase() !== 't' || t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || g().panel) return;
      e.preventDefault();
      setAbierto(true);
      requestAnimationFrame(() => campo.current?.focus());
    };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, [visible]);
  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [mensajes]);
  if (!visible) return null;
  const mandar = () => {
    const r = enviarSala(texto);
    if (r.envio === 'ok') {
      setTexto('');
      setAviso(r.tapado ? 'Se tapó parte de tu mensaje: no se permiten groserías ni datos personales.' : '');
    } else if (r.envio === 'ritmo') setAviso('Más despacio: esperá un toque para mandar otro.');
  };
  return (
    <div
      data-testid="chat-sala"
      className={cx(
        'pointer-events-auto absolute left-[max(0.75rem,var(--safe-l,0px))] flex w-[min(21rem,calc(100vw-1.5rem))] flex-col',
        touch ? 'top-[7.5rem]' : 'bottom-[max(0.75rem,var(--safe-b,0px))]',
      )}
    >
      {abierto && mensajes.length > 0 && (
        <ul
          ref={lista}
          data-testid="chat-lista"
          className="mc-hud mc-scroll mb-1.5 flex max-h-[9.5rem] flex-col gap-0.5 px-2.5 py-1.5 text-[13.5px] leading-snug"
        >
          {mensajes.slice(-VISIBLES * 3).map((m) => (
            <li
              key={`${m.sala}-${m.id}`}
              data-testid="chat-msg"
              data-de={m.de}
              data-tapado={m.tapado}
              className="break-words"
            >
              {m.mio ? (
                <b className="text-accent">Vos</b>
              ) : (
                <button
                  type="button"
                  data-testid="chat-autor"
                  className="font-extrabold text-gold underline-offset-2 hover:underline"
                  onClick={() => setMenu(menu?.id === m.id ? null : m)}
                >
                  {m.nombre}
                </button>
              )}
              <span className="opacity-60">: </span>
              <span data-testid="chat-texto" className={cx(m.tapado && 'italic')}>
                {m.texto}
              </span>
            </li>
          ))}
        </ul>
      )}
      {menu && <Menu m={menu} cerrar={() => setMenu(null)} />}
      {aviso && (
        <p data-testid="chat-aviso" className="mc-hud mb-1.5 px-2.5 py-1 text-xs font-bold" role="status">
          {aviso}
        </p>
      )}
      <form
        className="mc-hud flex items-center gap-1 p-1"
        onSubmit={(e) => {
          e.preventDefault();
          mandar();
        }}
      >
        <button
          type="button"
          data-testid="chat-toggle"
          aria-label={abierto ? 'Esconder el chat' : 'Ver el chat'}
          aria-expanded={abierto}
          className="mc-chip flex-none px-2"
          onClick={() => setAbierto(!abierto)}
        >
          <Icon name={abierto ? 'down' : 'list'} size={16} />
        </button>
        <input
          ref={campo}
          data-testid="chat-input"
          className="mc-input !min-h-[36px] flex-1 !py-1 text-sm"
          value={texto}
          maxLength={140}
          placeholder="Escribí algo… (T)"
          aria-label="Mensaje para la sala"
          autoComplete="off"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              e.currentTarget.blur();
            }
          }}
        />
        <button
          type="submit"
          data-testid="chat-enviar"
          aria-label="Mandar"
          disabled={!texto.trim()}
          className="mc-chip flex-none px-2 disabled:opacity-40"
        >
          <Icon name="next" size={18} />
        </button>
      </form>
    </div>
  );
}
