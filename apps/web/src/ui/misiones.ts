// Cómo se cumple cada misión del día: una pista corta y, si se puede, un atajo para ir a hacerla.
import { catDe, deptById, JUEGOS, type MISSIONS } from '../core/data';
import type { IconName } from './components/Icon';
import { g } from './lib';

export type Mision = (typeof MISSIONS)[number];
export interface Como {
  pista: string;
  ir?: { label: string; icon: IconName; hacer: () => void };
}

/** Un juego del departamento donde está el jugador; en el lobby, uno de la capital. */
export const juegoCercano = () => {
  const s = g().scene;
  return (s.kind === 'dept' ? catDe(s.id).juegos[0] : undefined) ?? catDe('franciscomorazan').juegos[0];
};
const jugar = (id: string | undefined) => () => {
  if (id) g().startJuego(id);
};
/** El primer juego del catálogo hecho con ese motor (feria, fútbol, pulpería…). */
const conMotor = (motor: string) => JUEGOS.find((j) => j.motor === motor);
/** «Pulpería del barrio», en Francisco Morazán */
const dondeEsta = (j: (typeof JUEGOS)[number]) => `«${j.name}», en ${deptById(j.dept).name}`;

const IR_MAPA: Como['ir'] = { label: 'Abrir mapa', icon: 'map', hacer: () => g().openPanel('mapa') };

export function comoMision(m: Mision): Como {
  switch (m.type) {
    case 'play':
    case 'win': {
      if (m.target) {
        const j = conMotor(m.target);
        return {
          pista: j ? `Es ${dondeEsta(j)}. El botón te lleva directo.` : 'Buscalo en los departamentos.',
          ir: j ? { label: 'Ir a jugar', icon: 'play', hacer: jugar(j.id) } : undefined,
        };
      }
      return {
        pista:
          m.type === 'win'
            ? 'Cualquier juego vale: ganá al menos el bronce.'
            : 'Cualquier juego vale: los puestos con 🎮 de cada departamento.',
        ir: { label: 'Jugar uno', icon: 'play', hacer: () => jugar(juegoCercano()?.id)() },
      };
    }
    case 'goals': {
      const j = conMotor('futbol');
      return {
        pista: j ? `Se meten en ${dondeEsta(j)}.` : 'En cualquier potra.',
        ir: j ? { label: 'Ir a la cancha', icon: 'play', hacer: jugar(j.id) } : undefined,
      };
    }
    case 'score': {
      const j = m.target ? conMotor(m.target) : undefined;
      return {
        pista: j ? `En un solo intento de ${dondeEsta(j)}.` : 'En un solo intento.',
        ir: j ? { label: 'Ir a la feria', icon: 'play', hacer: jugar(j.id) } : undefined,
      };
    }
    case 'visit':
      return {
        pista: 'Solo cuentan los que todavía no visitaste: elegí uno nuevo en el mapa y dale Ir.',
        ir: IR_MAPA,
      };
    case 'pickup':
      return {
        pista: 'Las monedas doradas flotan en las calles y plazas de cada departamento.',
        ir: IR_MAPA,
      };
    case 'emote':
      return {
        pista: 'Bailá o saludá con los emotes, en cualquier lado.',
        ir: { label: 'Emotes', icon: 'emote', hacer: () => g().openPanel('emotes') },
      };
    case 'collect':
      return {
        pista: 'Cada departamento esconde un 💎 que da vueltas. Caminá por la plaza y los alrededores.',
        ir: IR_MAPA,
      };
    default:
      return { pista: '' };
  }
}
