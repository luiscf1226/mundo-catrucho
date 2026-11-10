import { GameCanvas } from './game/GameCanvas';
import { UIRoot } from './ui/UIRoot';
import { useGame } from './core/store';

export function App() {
  const world = useGame(s => s.screen === 'world');
  return <div className="absolute inset-0 overflow-hidden" onPointerDownCapture={() => (window as any).__mc?.audio.init()}>
    {world && <GameCanvas />}
    {!location.hash.includes('nohud') && <UIRoot />}
  </div>;
}
