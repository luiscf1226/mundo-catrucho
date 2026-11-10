// Raíz de la interfaz. Elige qué se ve según el estado del juego y aplica la piel de la versión (roblox | hd).
// Los data-testid de toda la interfaz son contrato con las pruebas (docs/CONTRATO.md).
import { useEffect, useRef, type ReactNode } from 'react';
import { useGame } from '../core/store';
import { audio } from '../core/audio';
import type { PanelId } from '../core/types';
import { VARIANT } from '../variant';
import { Btn } from './components/kit';
import { g, TEST, useTouch } from './lib';
import { MainMenu } from './screens/Menu';
import { Hud, Toasts } from './screens/Hud';
import { TouchControls } from './screens/Touch';
import { MgIntro, MgResults } from './screens/Minigame';
import { MapPanel } from './panels/Map';
import { CharacterPanel, ShopPanel } from './panels/Wardrobe';
import { AchievementsPanel, ControlsPanel, EmotesPanel, LeaderboardPanel, MissionsPanel, PausePanel, RoomsPanel, SettingsPanel } from './panels/Misc';
import { ProjectPanel } from './panels/Project';
import { TransportePanel } from './panels/Transporte';
import { ViajeHud } from './screens/Viaje';

const PANELS: Record<PanelId, () => ReactNode> = { mapa: MapPanel, transporte: TransportePanel, personaje: CharacterPanel, tienda: ShopPanel, pausa: PausePanel, ajustes: SettingsPanel, misiones: MissionsPanel, logros: AchievementsPanel, clasificacion: LeaderboardPanel, salas: RoomsPanel, controles: ControlsPanel, emotes: EmotesPanel, proyecto: ProjectPanel };

function Dialog() {
  const d = useGame(s => s.dialog)!, ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('button')?.focus({ preventScroll: true }); }, []);
  return <div className="mc-overlay pad-safe-sm pointer-events-auto absolute inset-0 z-30 flex items-center justify-center">
    <div ref={ref} data-testid="dialog" role="alertdialog" aria-modal="true" aria-label={d.title} className="mc-panel mc-scroll flex max-h-full w-full max-w-md flex-col items-center gap-2 p-5 text-center">
      {d.icon && <div className="mc-bigicon anim-pop" aria-hidden>{d.icon}</div>}
      <h3 className="font-display text-2xl font-bold leading-tight">{d.title}</h3>
      <p className="whitespace-pre-line text-[15px] leading-snug">{d.text}</p>
      <Btn id="dialog-close" tone="play" size="lg" icon="check" cls="mt-2 min-w-[12rem]" onClick={() => g().closeDialog()}>¡Cheque!</Btn>
    </div>
  </div>;
}

export function GameUI() {
  const screen = useGame(s => s.screen), panel = useGame(s => s.panel), mg = useGame(s => s.mg), dialog = useGame(s => s.dialog), viaje = useGame(s => s.scene.kind === 'viaje'), touch = useTouch();
  const ActivePanel = panel ? PANELS[panel] : null;
  useEffect(() => { if (screen === 'menu') audio.music('menu'); }, [screen]);
  // los volúmenes de Ajustes se aplican al instante, vengan de donde vengan
  useEffect(() => useGame.subscribe((s, p) => { if (s.profile.settings !== p.profile.settings) audio.refresh(); }), []);
  // la creación de personaje es obligatoria la primera vez: si se cierra con Esc, vuelve a abrirse
  const created = useGame(s => s.profile.created);
  useEffect(() => { if (screen === 'world' && !created && panel !== 'personaje') g().openPanel('personaje'); }, [screen, created, panel]);
  return <div className="mc-ui pointer-events-none absolute inset-0 select-none" data-variant={VARIANT} data-test={TEST} data-screen={screen} data-mg={!!mg} data-touch={touch}>
    {screen === 'menu' && <MainMenu />}
    {screen === 'world' && <Hud />}
    {screen === 'world' && viaje && !panel && <ViajeHud />}
    {screen === 'world' && touch && !panel && !dialog && (!mg || mg.phase === 'playing') && <TouchControls />}
    {screen === 'world' && mg?.phase === 'intro' && !panel && <MgIntro />}
    {screen === 'world' && mg?.phase === 'ended' && !panel && <MgResults />}
    {ActivePanel && <ActivePanel key={panel} />}
    {dialog && <Dialog />}
    <Toasts />
  </div>;
}
