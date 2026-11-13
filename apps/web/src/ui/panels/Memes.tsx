// Álbum de memes: los de todo Honduras y los de cada departamento. Se llenan jugando y en los muros de memes.
import { useState } from 'react';
import { DEPARTMENTS, deptById, minigameById } from '../../core/data';
import { MEMES, type Meme, type MotorComun, memeById, memesDeDept } from '../../core/memes';
import { useGame } from '../../core/store';
import { Icon } from '../components/Icon';
import { Bar, Btn, Note, Panel, Tabs } from '../components/kit';
import { MemeImg } from '../components/MemeImg';
import { act } from '../lib';

const NACIONAL = 'nacional';
const TABS = [
  { id: NACIONAL, label: 'Todo Honduras', emoji: '🇭🇳' },
  ...DEPARTMENTS.filter((d) => memesDeDept(d.id).length).map((d) => ({ id: d.id, label: d.name })),
];

function pista(m: Meme) {
  if (m.dept) return `Jugá en ${deptById(m.dept).name}`;
  if (m.temas.includes('todos')) return 'Jugá cualquier juego';
  const motores = m.temas.filter((t): t is MotorComun => t !== 'todos');
  return `Jugá ${motores.map((t) => minigameById(t).name).join(' o ')}`;
}
const dominio = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

function Grande({ m, volver }: { m: Meme; volver: () => void }) {
  return (
    <div data-testid="meme-ver" data-meme={m.id} className="flex flex-col items-center gap-2 text-center">
      <MemeImg meme={m} cls="w-full max-w-[min(480px,70vh)]" />
      <h3 className="font-display text-2xl font-bold leading-tight">
        <span aria-hidden>{m.emoji} </span>
        {m.nombre}
      </h3>
      <p className="max-w-prose text-[15px] leading-snug">{m.queEs}</p>
      <p className="text-xs text-muted">Fuente: {dominio(m.fuente)}</p>
      <Btn id="meme-volver" tone="neutral" icon="back" onClick={volver}>
        Volver al álbum
      </Btn>
    </div>
  );
}

export function MemesPanel() {
  const got = useGame((s) => s.profile.memes),
    aqui = useGame((s) => (s.scene.kind === 'dept' ? s.scene.id : null));
  const [tab, setTab] = useState(() => (aqui && TABS.some((t) => t.id === aqui) ? aqui : NACIONAL)),
    [ver, setVer] = useState<string | null>(null);
  const abierto = ver ? memeById(ver) : undefined,
    lista = memesDeDept(tab === NACIONAL ? null : tab),
    n = got.filter((id) => memeById(id)).length;
  return (
    <Panel
      id="memes"
      title="Álbum de memes"
      icon="sparkle"
      size="lg"
      extra={
        <span className="mc-balance mc-num font-display font-semibold" data-testid="meme-count">
          {n}/{MEMES.length}
        </span>
      }
    >
      {abierto ? (
        <Grande m={abierto} volver={() => setVer(null)} />
      ) : (
        <>
          <Bar value={n} max={MEMES.length} color="var(--mc-gold)" cls="mb-3" />
          <Tabs items={TABS} value={tab} onChange={setTab} testid={(i) => `meme-tab-${i}`} compact cls="mb-3" />
          {lista.length === 0 && <Note>Todavía no hay memes de aquí.</Note>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {lista.map((m) =>
              got.includes(m.id) ? (
                <button
                  key={m.id}
                  type="button"
                  data-testid={`meme-${m.id}`}
                  data-on="true"
                  className="mc-card is-btn flex flex-col gap-1 p-1.5 text-left"
                  onClick={act(() => setVer(m.id))}
                >
                  <MemeImg meme={m} cls="w-full" />
                  <b className="truncate px-1 text-[14px] leading-tight">{m.nombre}</b>
                </button>
              ) : (
                <div
                  key={m.id}
                  data-testid={`meme-${m.id}`}
                  data-on="false"
                  data-dim="true"
                  className="mc-card flex flex-col gap-1 p-1.5"
                >
                  <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg bg-black/25 p-2 text-center">
                    <Icon name="lock" size={26} />
                    <span className="text-xs font-bold leading-tight">{pista(m)}</span>
                  </div>
                  <b className="px-1 text-[14px] leading-tight text-muted">???</b>
                </div>
              ),
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
