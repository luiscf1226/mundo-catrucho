// Pantalla de inicio: logo, diorama 3D animado de fondo y los accesos principales.

import { xpForLevel } from '../../core/data';
import { useGame } from '../../core/store';
import type { PanelId } from '../../core/types';
import { IS_HD } from '../../variant';
import { Safe3D } from '../components/AvatarView';
import { FiveStars, FlagHN, Icon, Macaw, Star } from '../components/Icon';
import { Btn, Coins } from '../components/kit';
import { act, g, VERSION } from '../lib';
import { MenuScene } from './MenuScene';

/** Respaldo sin WebGL: cielo, sol y una guacamaya en CSS/SVG. */
function FlatScene() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute right-[12%] top-[14%] h-28 w-28 rounded-full bg-[#ffe27a] shadow-[0_0_80px_30px_rgba(255,226,122,.55)]" />
      <div className="absolute left-0 top-[22%]" style={{ animation: 'mc-fly 16s linear infinite' }}>
        <Macaw size={96} />
      </div>
      <div
        className="absolute left-0 top-[12%] h-10 w-40 rounded-full bg-white/70"
        style={{ animation: 'mc-cloud 60s linear infinite' }}
      />
      <div
        className="absolute left-0 top-[30%] h-8 w-28 rounded-full bg-white/60"
        style={{ animation: 'mc-cloud 85s linear infinite', animationDelay: '-30s' }}
      />
    </div>
  );
}

export function Logo({ cls = '' }: { cls?: string }) {
  return (
    <h1
      className={`mc-logo anim-logo relative inline-block ${cls}`}
      aria-label={IS_HD ? 'Mundo Catrucho 3D' : 'Mundo Catrucho'}
    >
      <span className="l1 block">Mundo</span>
      <span className="l2 block">Catrucho</span>
      {IS_HD && <span className="mc-logo-3d">3D</span>}
    </h1>
  );
}

export function MainMenu() {
  const p = useGame((s) => s.profile);
  const go = (panel?: PanelId) => {
    g().enterWorld();
    if (panel && g().profile.created) g().openPanel(panel);
  };
  const open = (panel: PanelId) => g().openPanel(panel);
  return (
    <div data-testid="menu" className="mc-sky pointer-events-auto absolute inset-0 overflow-hidden">
      <div className="absolute inset-0">
        <Safe3D fallback={<FlatScene />}>
          <MenuScene />
        </Safe3D>
      </div>
      <div className="mc-menu-scrim pointer-events-none absolute inset-0" />
      <div className="pad-safe absolute inset-0 flex flex-col gap-2 portrait:items-center landscape:items-start landscape:pl-[max(1.25rem,var(--safe-l))] lg:landscape:pl-14">
        {/* barra superior */}
        <div className="flex w-full flex-none items-center justify-between gap-2">
          <div className="mc-menu-chip flex items-center gap-2 px-2.5 py-1.5">
            <FlagHN w={30} />
            <span className="font-display text-sm font-semibold max-[380px]:hidden">Hecho con cariño catracho</span>
          </div>
          <button
            type="button"
            data-testid="menu-profile"
            onClick={act(() => go('personaje'))}
            className="mc-hud flex min-h-[44px] items-center gap-2.5 py-1 pl-1.5 pr-3"
            aria-label={`Perfil de ${p.name}`}
          >
            <span className="mc-level">
              <Star size={38} />
              <b>{p.level}</b>
            </span>
            <span className="flex flex-col items-start leading-tight">
              <b className="max-w-[9rem] truncate font-display text-[15px] font-semibold">{p.name}</b>
              <span className="mc-label !text-[10px]">
                Nivel {p.level} · {p.xp}/{xpForLevel(p.level)} XP
              </span>
            </span>
            <Coins n={p.coins} size={20} cls="ml-1 text-[15px]" />
          </button>
        </div>
        {/* logo */}
        <div className="flex flex-none flex-col portrait:items-center portrait:pt-[3vh] landscape:pt-[2vh] short:landscape:pt-0">
          <Logo cls="text-[clamp(2.6rem,13vw,4.6rem)] landscape:text-[clamp(2.4rem,7.2vw,6rem)] short:landscape:text-[clamp(1.9rem,11.5vh,3.4rem)]" />
          <p className="mc-tagline mt-3 flex items-center gap-2 short:mt-1">
            <FiveStars size={11} color={IS_HD ? '#7fe9ff' : '#fff'} />
            <span>Explora Honduras, juega y gana Lempiritas</span>
          </p>
        </div>
        <div className="min-h-0 flex-1" />
        {/* botones */}
        <nav
          className="flex w-full max-w-[27rem] flex-none flex-col gap-2 short:max-w-[23rem] short:gap-1.5 sm:gap-2.5"
          aria-label="Menú principal"
        >
          <Btn
            id="btn-jugar"
            tone="play"
            size="xl"
            icon="play"
            cls="mc-shine w-full short:!min-h-[52px] short:!text-2xl"
            onClick={() => go()}
          >
            Jugar
          </Btn>
          <div className="grid grid-cols-2 gap-2 short:gap-1.5 sm:gap-2.5">
            <Btn
              id="btn-explorar"
              icon="map"
              size="lg"
              cls="short:!min-h-[44px] short:!text-base"
              onClick={() => go('mapa')}
            >
              Explorar
            </Btn>
            <Btn
              id="btn-personaje"
              icon="user"
              size="lg"
              cls="short:!min-h-[44px] short:!text-base"
              onClick={() => go('personaje')}
            >
              Personaje
            </Btn>
            <Btn
              id="btn-tienda"
              icon="shop"
              size="lg"
              cls="short:!min-h-[44px] short:!text-base"
              onClick={() => go('tienda')}
            >
              Tienda
            </Btn>
          </div>
          <div className="grid grid-cols-3 gap-2 short:gap-1.5 short:landscape:absolute short:landscape:bottom-[max(.75rem,var(--safe-b))] short:landscape:right-[max(1rem,var(--safe-r))] short:landscape:w-[21rem]">
            <Btn id="btn-ajustes" tone="neutral" size="sm" icon="gear" onClick={() => open('ajustes')}>
              Ajustes
            </Btn>
            <Btn id="btn-controles" tone="neutral" size="sm" icon="controls" onClick={() => open('controles')}>
              Controles
            </Btn>
            <Btn id="btn-salas" tone="neutral" size="sm" icon="users" onClick={() => open('salas')}>
              Salas
            </Btn>
          </div>
        </nav>
        {/* pie */}
        <div className="flex flex-none items-center gap-x-4 gap-y-1 portrait:w-full portrait:flex-col-reverse landscape:absolute landscape:bottom-[max(.6rem,var(--safe-b))] landscape:right-[max(1rem,var(--safe-r))] landscape:flex-row short:landscape:bottom-[calc(max(.75rem,var(--safe-b))+3.1rem)]">
          <span className="mc-menu-foot">
            Prototipo {VERSION} · {IS_HD ? 'versión 3D' : 'versión Roblox'}
          </span>
          <button
            type="button"
            data-testid="btn-proyecto"
            onClick={act(() => open('proyecto'))}
            className="mc-menu-link"
          >
            <Icon name={IS_HD ? 'doc' : 'cube'} size={18} />
            {IS_HD ? 'Plan técnico 3D' : 'Proyecto Roblox Studio'}
            <Icon name="next" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
