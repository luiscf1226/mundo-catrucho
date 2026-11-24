import { useGame } from './core/store';
import { GameCanvas } from './game/GameCanvas';
import { Diagnostico } from './ui/Diagnostico';
import { UIRoot } from './ui/UIRoot';

export function App() {
  const world = useGame((s) => s.screen === 'world');
  return (
    <div className="absolute inset-0 overflow-hidden" onPointerDownCapture={() => (window as any).__mc?.audio.init()}>
      {world && <GameCanvas />}
      {!location.hash.includes('nohud') && <UIRoot />}
      {location.hash.includes('fps') && <Diagnostico />}
    </div>
  );
}
