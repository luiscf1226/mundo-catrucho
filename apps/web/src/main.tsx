import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { audio } from './core/audio';
import { env } from './core/env';
import { bindInput, input } from './core/input';
import { interactions } from './core/interact';
import { phys } from './core/phys';
import { player } from './core/player';
import { useGame } from './core/store';
import { TITLE, VARIANT } from './variant';

document.title = TITLE;
bindInput();
// Acceso para pruebas automáticas y depuración desde la consola.
(window as any).__mc = { store: useGame, player, phys, input, audio, interactions, env, variant: VARIANT };
// Atajo de desarrollo: #go salta el menú y la creación de personaje (p. ej. archivo.html#test,go o #go,galeria).
if (location.hash.includes('go')) {
  const g = useGame.getState();
  if (!g.profile.created) g.finishCreation();
  g.enterWorld();
}
const raiz = createRoot(document.getElementById('root')!);
// MC-07: con la llave de Clerk (y Convex) el juego va dentro de su proveedor; sin ella este bloque no se compila
if (__CLERK__)
  import('./core/clerk').then(
    ({ ConClerk }) =>
      raiz.render(
        <ConClerk>
          <App />
        </ConClerk>,
      ),
    () => raiz.render(<App />),
  );
else raiz.render(<App />);
