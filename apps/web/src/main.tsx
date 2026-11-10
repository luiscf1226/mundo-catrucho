import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { bindInput, input } from './core/input';
import { useGame } from './core/store';
import { player } from './core/player';
import { phys } from './core/phys';
import { audio } from './core/audio';
import { interactions } from './core/interact';
import { env } from './core/env';
import { TITLE, VARIANT } from './variant';

document.title = TITLE;
bindInput();
// Acceso para pruebas automáticas y depuración desde la consola.
(window as any).__mc = { store: useGame, player, phys, input, audio, interactions, env, variant: VARIANT };
// Atajo de desarrollo: #go salta el menú y la creación de personaje (p. ej. archivo.html#test,go o #go,galeria).
if (location.hash.includes('go')) { const g = useGame.getState(); if (!g.profile.created) g.finishCreation(); g.enterWorld(); }
createRoot(document.getElementById('root')!).render(<App />);
