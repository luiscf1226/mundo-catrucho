// Panel "Proyecto": en la versión Roblox muestra el proyecto de Roblox Studio (árbol de archivos, código Luau,
// LEEME); en la versión 3D muestra el plan técnico para llevar el juego a un motor profesional.
import { type ReactNode, useMemo, useRef, useState } from 'react';
import { ROBLOX_PROJECT, type RobloxFile } from '../../generated/robloxProject';
import { IS_HD } from '../../variant';
import { Icon } from '../components/Icon';
import { Btn, Note, Panel, Tabs } from '../components/kit';
import { PLAN_V2 } from '../content/planV2';
import { act, copyText, cx } from '../lib';

// ---- Markdown mínimo: títulos, listas, tablas, bloques de código, citas, negrita, cursiva, `código` y enlaces.
function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [],
    re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*)|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0,
    m: RegExpExecArray | null,
    k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<code key={`${key}-${k++}`}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={`${key}-${k++}`}>{m[2].slice(2, -2)}</strong>);
    else if (m[3]) out.push(<em key={`${key}-${k++}`}>{m[3].slice(1, -1)}</em>);
    else
      out.push(
        <span key={`${key}-${k++}`} className="font-bold underline decoration-dotted" title={m[5]}>
          {m[4]}
        </span>,
      ); // sin navegación: el juego no abre páginas externas
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
export function Markdown({ src }: { src: string }) {
  const nodes = useMemo(() => {
    const lines = src.replace(/\r/g, '').split('\n'),
      out: ReactNode[] = [];
    let i = 0,
      k = 0;
    const cells = (l: string) =>
      l
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim());
    while (i < lines.length) {
      const l = lines[i];
      if (!l.trim()) {
        i++;
        continue;
      }
      if (/^```/.test(l)) {
        const buf: string[] = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(
          <pre key={k++} className="mc-code">
            <code>{buf.join('\n')}</code>
          </pre>,
        );
        continue;
      }
      const h = /^(#{1,4})\s+(.*)$/.exec(l);
      if (h) {
        const T = `h${Math.min(4, h[1].length + 1)}` as 'h2';
        out.push(<T key={k++}>{inline(h[2], k)}</T>);
        i++;
        continue;
      }
      if (/^\s*([-*_])\1{2,}\s*$/.test(l)) {
        out.push(<hr key={k++} />);
        i++;
        continue;
      }
      if (/^\s*>/.test(l)) {
        const buf: string[] = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
        out.push(<blockquote key={k++}>{inline(buf.join(' '), k)}</blockquote>);
        continue;
      }
      if (/^\s*\|/.test(l) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
        const head = cells(l),
          rows: string[][] = [];
        i += 2;
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
        out.push(
          <div key={k++} className="mc-scroll-x">
            <table>
              <thead>
                <tr>
                  {head.map((c, j) => (
                    <th key={j}>{inline(c, j)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, a) => (
                  <tr key={a}>
                    {r.map((c, j) => (
                      <td key={j}>{inline(c, a * 50 + j)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
      const li = /^\s*([-*+]|\d+[.)])\s+/;
      if (li.test(l)) {
        const ordered = /^\s*\d/.test(l),
          items: string[] = [];
        while (i < lines.length && (li.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
          if (li.test(lines[i])) items.push(lines[i].replace(li, ''));
          else items[items.length - 1] += ` ${lines[i].trim()}`;
          i++;
        }
        const L = ordered ? 'ol' : 'ul';
        out.push(
          <L key={k++}>
            {items.map((t, j) => (
              <li key={j}>{inline(t.replace(/^\[( |x)\]\s*/i, ''), j)}</li>
            ))}
          </L>,
        );
        continue;
      }
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\s*>|\s*\||\s*([-*+]|\d+[.)])\s)/.test(lines[i]))
        buf.push(lines[i++].trim());
      if (!buf.length) buf.push(lines[i++].trim());
      out.push(<p key={k++}>{inline(buf.join(' '), k)}</p>);
    }
    return out;
  }, [src]);
  return <div className="mc-prose">{nodes}</div>;
}

// ---- Coloreado ligero de Luau (y JSON): comentarios, cadenas, números, palabras clave y nombres propios de Roblox.
const KW = new Set(
  'and break continue do else elseif end export false for function if in local nil not or repeat return then true type typeof until while'.split(
    ' ',
  ),
);
const BUILTIN = new Set(
  'game workspace script Instance Vector3 Vector2 CFrame Color3 UDim2 UDim Enum task math string table pairs ipairs print warn error require pcall xpcall setmetatable getmetatable tostring tonumber select next wait spawn tick os Players ReplicatedStorage ServerScriptService ServerStorage TweenService RunService DataStoreService UserInputService HttpService StarterGui StarterPlayer Lighting SoundService Debris TweenInfo NumberRange NumberSequence ColorSequence BrickColor Random Ray RaycastParams self'.split(
    ' ',
  ),
);
const TOKEN =
  /(--\[\[[\s\S]*?\]\]|--[^\n]*)|(\[\[[\s\S]*?\]\]|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b0x[\da-fA-F]+\b|\b\d+\.?\d*(?:e[+-]?\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;
function highlight(code: string): ReactNode[][] {
  const flat: { t: string; c?: string }[] = [];
  let last = 0,
    m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(code))) {
    if (m.index > last) flat.push({ t: code.slice(last, m.index) });
    flat.push({
      t: m[0],
      c: m[1]
        ? 'c'
        : m[2]
          ? 's'
          : m[3]
            ? 'n'
            : KW.has(m[4])
              ? 'k'
              : BUILTIN.has(m[4])
                ? 'b'
                : code[TOKEN.lastIndex] === '('
                  ? 'p'
                  : undefined,
    });
    last = TOKEN.lastIndex;
  }
  if (last < code.length) flat.push({ t: code.slice(last) });
  const lines: ReactNode[][] = [[]];
  let k = 0;
  for (const tok of flat)
    tok.t.split('\n').forEach((part, i) => {
      if (i) lines.push([]);
      if (part)
        lines[lines.length - 1].push(
          tok.c ? (
            <span key={k++} className={tok.c}>
              {part}
            </span>
          ) : (
            part
          ),
        );
    });
  return lines;
}
function CodeView({ file }: { file: RobloxFile }) {
  const big = file.code.length > 60000,
    pre = useRef<HTMLPreElement>(null),
    [copied, setCopied] = useState<'' | 'ok' | 'no'>('');
  const lines = useMemo(
    () => (big ? file.code.split('\n').map((l) => [l] as ReactNode[]) : highlight(file.code)),
    [file, big],
  );
  const copy = async () => {
    const ok = await copyText(file.code);
    setCopied(ok ? 'ok' : 'no');
    if (!ok && pre.current) {
      const r = document.createRange();
      r.selectNodeContents(pre.current);
      const s = getSelection();
      s?.removeAllRanges();
      s?.addRange(r);
    } // respaldo: deja el texto seleccionado
    setTimeout(() => setCopied(''), 4000);
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-testid="proj-code">
      <div className="flex flex-none items-center gap-2">
        <Icon name="file" size={18} cls="text-accent" />
        <code className="min-w-0 flex-1 truncate text-sm font-bold" data-testid="proj-path">
          {file.path}
        </code>
        <span className="mc-label max-sm:hidden">{lines.length} líneas</span>
        <Btn
          id="proj-copy"
          tone={copied === 'ok' ? 'good' : 'primary'}
          size="sm"
          icon={copied === 'ok' ? 'check' : 'copy'}
          onClick={() => {
            void copy();
          }}
        >
          {copied === 'ok' ? 'Copiado' : 'Copiar'}
        </Btn>
      </div>
      {copied === 'no' && (
        <p className="flex-none text-xs font-bold text-muted" data-testid="proj-copy-fallback">
          No se pudo copiar solo: el código quedó seleccionado, presiona Ctrl+C (o mantén presionado y elige Copiar).
        </p>
      )}
      <pre ref={pre} className="mc-code mc-scroll min-h-0 flex-1 overflow-x-auto p-2" tabIndex={0}>
        <code>
          {lines.map((l, i) => (
            <div key={i} className="whitespace-pre">
              <span className="ln">{i + 1}</span>
              {l}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

const STEPS: [string, string][] = [
  [
    'Instala Rojo',
    'Es el puente entre estos archivos y Roblox Studio (plugin de Studio + extensión o línea de comandos).',
  ],
  ['Copia la carpeta roblox/', 'Trae default.project.json y todo el código Luau que ves aquí.'],
  ['Ejecuta “rojo serve”', 'Dentro de la carpeta. En Studio abre el plugin de Rojo y presiona Connect.'],
  [
    'Presiona Play en Studio',
    'El lobby, los minijuegos y la tienda se arman solos con los mismos datos de este prototipo.',
  ],
];
function RobloxProject() {
  const { files, readme } = ROBLOX_PROJECT;
  const groups = useMemo(() => {
    const m = new Map<string, RobloxFile[]>();
    for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
      const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '(raíz)';
      (m.get(dir) ?? m.set(dir, []).get(dir)!).push(f);
    }
    return [...m.entries()];
  }, [files]);
  const [tab, setTab] = useState<'guia' | 'archivos'>('guia'),
    [sel, setSel] = useState<string | null>(null),
    file = files.find((f) => f.path === sel);
  const tabs = [
    { id: 'guia' as const, label: 'Guía', icon: 'doc' as const },
    { id: 'archivos' as const, label: `Archivos (${files.length})`, icon: 'folder' as const },
  ];
  return (
    <>
      <Tabs items={tabs} value={tab} onChange={setTab} testid={(t) => `proj-tab-${t}`} cls="mb-3 flex-none" />
      {tab === 'guia' ? (
        <div className="mc-scroll min-h-0 flex-1 pr-1" data-testid="proj-guide">
          <ol className="grid gap-2 sm:grid-cols-2">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="mc-card flex gap-3 p-3">
                <span className="mc-rank is-top1 flex-none">{i + 1}</span>
                <span className="leading-snug">
                  <b className="block">{t}</b>
                  <span className="text-sm text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ol>
          {readme.trim() ? (
            <div className="mc-card mt-3 p-3 sm:p-4" data-testid="proj-readme">
              <Markdown src={readme} />
            </div>
          ) : (
            <Note cls="mt-3" icon="info">
              El LEEME del proyecto se incrusta en la compilación final. Mientras tanto, estos cuatro pasos son todo lo
              que hace falta.
            </Note>
          )}
        </div>
      ) : files.length === 0 ? (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
          data-testid="proj-empty"
        >
          <Icon name="cube" size={56} cls="text-accent" />
          <b className="font-display text-xl">El proyecto se incrusta al compilar</b>
          <p className="max-w-sm text-sm text-muted">
            Esta compilación todavía no trae los archivos de Roblox Studio. En la versión final aquí aparecen el árbol
            de carpetas y cada script listo para copiar.
          </p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 landscape:flex-row">
          <nav
            className={cx(
              'mc-card mc-scroll min-h-0 flex-none p-2 landscape:w-64 portrait:max-h-[32%]',
              file && 'max-sm:portrait:hidden',
            )}
            aria-label="Archivos del proyecto"
            data-testid="proj-tree"
          >
            {groups.map(([dir, fs]) => (
              <div key={dir} className="mb-1.5">
                <div className="mc-label flex items-center gap-1.5 px-1 py-1">
                  <Icon name="folder" size={14} />
                  <span className="truncate">{dir}</span>
                </div>
                {fs.map((f) => (
                  <button
                    key={f.path}
                    type="button"
                    data-testid={`proj-file-${f.path}`}
                    aria-current={sel === f.path}
                    onClick={act(() => setSel(f.path))}
                    className={cx(
                      'mc-file flex min-h-[36px] w-full items-center gap-1.5 rounded-lg px-2 text-left text-[13px] font-bold',
                      sel === f.path && 'is-on',
                    )}
                  >
                    <Icon name={/\.(lua|luau)$/.test(f.path) ? 'code' : 'file'} size={14} />
                    <span className="truncate">{f.path.slice(f.path.lastIndexOf('/') + 1)}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
          {file ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
              <button
                type="button"
                onClick={act(() => setSel(null))}
                className="mc-link flex-none self-start sm:hidden landscape:hidden"
              >
                <Icon name="back" size={16} />
                Todos los archivos
              </button>
              <CodeView file={file} />
            </div>
          ) : (
            <div className="mc-card flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted max-sm:portrait:hidden">
              <Icon name="code" size={40} />
              <span className="text-sm font-bold">Elige un archivo para ver su código.</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Plan() {
  const { summary, sections } = PLAN_V2;
  return (
    <div className="mc-scroll min-h-0 flex-1 pr-1" data-testid="plan-doc">
      <div className="mc-prose mx-auto max-w-3xl">
        <p className="mc-lead">{summary}</p>
        {sections.map((s) => (
          <section key={s.title} data-testid="plan-section">
            <h3>{s.title}</h3>
            {s.intro && <p>{s.intro}</p>}
            {s.bullets && (
              <ul>
                {s.bullets.map((b, i) => (
                  <li key={i}>{inline(b, i)}</li>
                ))}
              </ul>
            )}
            {s.table && (
              <div className="mc-scroll-x">
                <table>
                  <thead>
                    <tr>
                      {s.table.head.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((c, j) => (
                          <td key={j}>{inline(c, i * 20 + j)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

export function ProjectPanel() {
  return (
    <Panel
      id="proyecto"
      title={IS_HD ? 'Plan técnico de la versión 3D' : 'Proyecto de Roblox Studio'}
      icon={IS_HD ? 'doc' : 'cube'}
      size="xl"
      fill
    >
      {IS_HD ? <Plan /> : <RobloxProject />}
    </Panel>
  );
}
