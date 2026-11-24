// Formas de lo que cae y recipientes del motor «atrapa».

import type { ReactNode } from 'react';
import { Ball, Block, Cyl, Label } from '../../kit';
import { Objeto } from '../kit/objetos';
import { hayPaisaje } from '../kit/Paisaje';

const S = { solid: false } as const;
const G = ({
  s = 1,
  r = [0, 0, 0],
  p = [0, 0, 0],
  children,
}: {
  s?: number | [number, number, number];
  r?: [number, number, number];
  p?: [number, number, number];
  children?: ReactNode;
}) => (
  <group scale={s} rotation={r} position={p}>
    {children}
  </group>
);

/** Dibuja una cosa que cae. Radio aproximado 0.3. Formas desconocidas: bola del color con su nombre. */
export function Forma({ f, c, nombre }: { f: string; c?: string; nombre?: string }) {
  const L = (d: string) => c ?? d;
  switch (f) {
    case 'pez':
      if (hayPaisaje()) return <Objeto k="pez" c={L('#b9c6cf')} />;
      return (
        <G>
          <G s={[1.6, 0.85, 0.6]}>
            <Ball pos={[0, 0, 0]} r={0.22} color={L('#b9c6cf')} mat="metal" />
          </G>
          <Block pos={[-0.4, 0, 0]} size={[0.05, 0.3, 0.2]} color={L('#9fb0bb')} mat="plastic" {...S} />
          <Block pos={[0, 0.2, 0]} size={[0.25, 0.1, 0.04]} color="#7d8f9b" {...S} />
          <Ball pos={[0.26, 0.05, 0.1]} r={0.045} color="#111" />
        </G>
      );
    case 'mango':
      return (
        <G>
          <G s={[1, 1.18, 0.9]}>
            <Ball pos={[0, 0, 0]} r={0.24} color={L('#f6a623')} />
          </G>
          <Block pos={[0.04, 0.3, 0]} size={[0.2, 0.04, 0.1]} color="#3f8f2f" rot={0.5} {...S} />
        </G>
      );
    case 'coco':
      return (
        <G>
          <Ball pos={[0, 0, 0]} r={0.26} color={L('#6b4a2b')} />
          <Ball pos={[0.1, 0.1, 0.22]} r={0.04} color="#2b1b0e" />
          <Ball pos={[-0.04, 0.12, 0.23]} r={0.04} color="#2b1b0e" />
        </G>
      );
    case 'cafe':
      return (
        <G>
          <Ball pos={[-0.1, 0, 0]} r={0.14} color={L('#c0392b')} />
          <Ball pos={[0.1, 0.05, 0.03]} r={0.14} color={L('#c0392b')} />
          <Block pos={[0, 0.17, 0]} size={[0.24, 0.03, 0.12]} color="#3f8f2f" {...S} />
        </G>
      );
    case 'fresa':
      return (
        <G>
          <Cyl pos={[0, 0, 0]} r={0.03} rTop={0.2} h={0.36} color={L('#e53935')} {...S} />
          <Cyl pos={[0, 0.2, 0]} r={0.14} h={0.05} color="#3f8f2f" {...S} />
        </G>
      );
    case 'papa':
      return (
        <G s={[1.2, 0.85, 0.9]}>
          <Ball pos={[0, 0, 0]} r={0.24} color={L('#c9a26b')} />
        </G>
      );
    case 'maiz':
      return (
        <G r={[0, 0, 0.5]}>
          <Cyl pos={[0, 0, 0]} r={0.1} h={0.5} color={L('#f4d03f')} {...S} />
          <Cyl pos={[0, -0.08, 0]} r={0.12} h={0.3} color="#5aa02c" {...S} />
        </G>
      );
    case 'naranja':
      return (
        <G>
          <Ball pos={[0, 0, 0]} r={0.24} color={L('#ff9800')} />
          <Block pos={[0, 0.25, 0]} size={[0.14, 0.03, 0.08]} color="#3f8f2f" {...S} />
        </G>
      );
    case 'camaron':
      return (
        <G>
          <Ball pos={[-0.2, -0.05, 0]} r={0.1} color={L('#f08a6b')} />
          <Ball pos={[-0.06, 0.06, 0]} r={0.12} color={L('#f08a6b')} />
          <Ball pos={[0.1, 0.08, 0]} r={0.12} color={L('#f08a6b')} />
          <Ball pos={[0.22, -0.02, 0]} r={0.1} color={L('#f08a6b')} />
        </G>
      );
    case 'pan':
      return (
        <G s={[1.4, 0.7, 0.9]}>
          <Ball pos={[0, 0, 0]} r={0.22} color={L('#d4944a')} />
        </G>
      );
    case 'hoja':
      return (
        <G r={[0.4, 0, 0.3]}>
          <Block pos={[0, 0, 0]} size={[0.5, 0.03, 0.32]} color={L('#4caf50')} mat="leaf" {...S} />
          <Block pos={[0, 0.02, 0]} size={[0.5, 0.02, 0.03]} color="#2e7d32" {...S} />
        </G>
      );
    case 'moneda':
      return (
        <G r={[Math.PI / 2, 0, 0]}>
          <Cyl pos={[0, 0, 0]} r={0.26} h={0.05} color={L('#ffd23f')} mat="gold" {...S} />
        </G>
      );
    case 'jocote':
      return (
        <G>
          <Ball pos={[-0.1, 0, 0]} r={0.15} color={L('#c0392b')} />
          <Ball pos={[0.1, 0.04, 0.02]} r={0.15} color={L('#d4452d')} />
        </G>
      );
    case 'durazno':
      return (
        <G>
          <Ball pos={[0, 0, 0]} r={0.23} color={L('#f6b08a')} />
          <Ball pos={[0.08, 0.04, 0.17]} r={0.1} color="#f4727c" />
        </G>
      );
    case 'platano':
      return (
        <G r={[0, 0, 0.7]}>
          <Cyl pos={[0, 0, 0]} r={0.08} h={0.5} color={L('#f6d83c')} {...S} />
          <Cyl pos={[0, 0.27, 0]} r={0.04} h={0.1} color="#6b8f2f" {...S} />
        </G>
      );
    case 'curil':
      return (
        <G s={[1.2, 0.75, 0.9]}>
          <Ball pos={[0, 0, 0]} r={0.22} color={L('#3b3548')} />
        </G>
      );
    case 'cangrejo':
      return (
        <G>
          <G s={[1.3, 0.6, 1]}>
            <Ball pos={[0, 0, 0]} r={0.2} color={L('#e0503a')} />
          </G>
          <Ball pos={[-0.3, 0.1, 0.1]} r={0.1} color={L('#e0503a')} />
          <Ball pos={[0.3, 0.1, 0.1]} r={0.1} color={L('#e0503a')} />
          <Ball pos={[-0.06, 0.15, 0.12]} r={0.04} color="#111" />
          <Ball pos={[0.06, 0.15, 0.12]} r={0.04} color="#111" />
        </G>
      );
    case 'pina':
      return (
        <G>
          <G s={[0.9, 1.2, 0.9]}>
            <Ball pos={[0, 0, 0]} r={0.23} color={L('#e9b830')} />
          </G>
          <Block pos={[0, 0.34, 0]} size={[0.06, 0.2, 0.06]} color="#3f8f2f" rot={0.4} {...S} />
          <Block pos={[0.05, 0.34, 0]} size={[0.06, 0.2, 0.06]} color="#4caf50" rot={-0.4} {...S} />
        </G>
      );
    case 'zanahoria':
      return (
        <G>
          <Cyl pos={[0, 0, 0]} r={0.02} rTop={0.1} h={0.5} color={L('#f28a1c')} {...S} />
          <Block pos={[0, 0.3, 0]} size={[0.14, 0.12, 0.04]} color="#4caf50" {...S} />
        </G>
      );
    case 'repollo':
      return (
        <G>
          <Ball pos={[0, 0, 0]} r={0.26} color={L('#7cc46b')} />
          <Ball pos={[0.04, 0.03, 0.08]} r={0.22} color="#a5dc91" />
        </G>
      );
    case 'piedra':
      return (
        <G s={[1, 0.8, 0.9]}>
          <Ball pos={[0, 0, 0]} r={0.26} color="#7d8288" mat="stone" />
        </G>
      );
    case 'rama':
      return (
        <G r={[0, 0.6, 1.2]}>
          <Cyl pos={[0, 0, 0]} r={0.05} h={0.7} color="#6d4b2c" mat="wood" {...S} />
          <Block pos={[0.1, 0.1, 0]} size={[0.04, 0.22, 0.04]} color="#6d4b2c" rot={0.6} {...S} />
        </G>
      );
    case 'zapato':
      return (
        <G>
          <Block pos={[0, -0.05, 0]} size={[0.5, 0.14, 0.2]} color="#5b3a22" {...S} />
          <Block pos={[-0.12, 0.05, 0]} size={[0.22, 0.2, 0.18]} color="#6b4428" {...S} />
          <Block pos={[0, -0.13, 0]} size={[0.52, 0.04, 0.22]} color="#2b2b2b" {...S} />
        </G>
      );
    case 'avispa':
      return (
        <G>
          <Ball pos={[0.1, 0, 0]} r={0.12} color="#f2c230" />
          <Ball pos={[-0.08, 0, 0]} r={0.14} color="#2b2b2b" />
          <Ball pos={[-0.2, 0, 0]} r={0.1} color="#f2c230" />
          <Block pos={[0, 0.14, 0.1]} size={[0.2, 0.02, 0.14]} color="#ffffff" {...S} />
          <Block pos={[0, 0.14, -0.1]} size={[0.2, 0.02, 0.14]} color="#ffffff" {...S} />
        </G>
      );
    default:
      return (
        <G>
          <Ball pos={[0, 0, 0]} r={0.24} color={c ?? '#ff8a65'} />
          {nombre && <Label pos={[0, 0.5, 0]} text={nombre} h={0.34} />}
        </G>
      );
  }
}

/** Recipiente que el jugador lleva sobre la cabeza (centro en el origen, aro de atrapar ~0.8 m). */
export function Recipiente({ con }: { con: string }) {
  if (hayPaisaje())
    switch (con) {
      case 'balde':
        return <Objeto k="balde" pos={[0, -0.25, 0]} scale={[2.1, 1.45, 2.1]} />;
      case 'sombrero':
        return <Objeto k="sombrero" pos={[0, -0.05, 0]} scale={2} c2="#c0392b" />;
      case 'huacal':
        return <Objeto k="caja" pos={[0, -0.15, 0]} scale={[1.5, 1.15, 2.25]} c="#b98856" />;
      case 'red':
      case 'saco':
        break;
      default:
        return <Objeto k="canasta" pos={[0, -0.22, 0]} scale={[1.8, 1.35, 1.8]} c="#c9954a" />;
    }
  switch (con) {
    case 'balde':
      return (
        <group>
          <Cyl pos={[0, 0, 0]} r={0.36} rTop={0.46} h={0.5} color="#8fa3ad" mat="metal" {...S} />
          <Cyl pos={[0, 0.25, 0]} r={0.47} h={0.05} color="#6f8590" mat="metal" {...S} />
          <Block pos={[0, 0.5, 0]} size={[0.8, 0.04, 0.04]} color="#444" mat="metal" {...S} />
        </group>
      );
    case 'sombrero':
      return (
        <group>
          <Cyl pos={[0, 0, 0]} r={0.8} h={0.05} color="#e3c37a" mat="cloth" {...S} />
          <Cyl pos={[0, 0.2, 0]} r={0.42} h={0.38} color="#e3c37a" mat="cloth" {...S} />
          <Cyl pos={[0, 0.1, 0]} r={0.44} h={0.08} color="#c0392b" {...S} />
        </group>
      );
    case 'red':
      return (
        <group>
          <Cyl pos={[0, 0, 0]} r={0.72} h={0.05} color="#d9d9d9" mat="metal" {...S} />
          <Cyl pos={[0, -0.12, 0]} r={0.3} rTop={0.66} h={0.25} color="#9ccc9c" mat="cloth" {...S} />
          <Block pos={[0.9, -0.3, 0]} size={[0.9, 0.06, 0.06]} color="#8a5a2b" mat="wood" rot={-0.4} {...S} />
        </group>
      );
    case 'saco':
      return (
        <group>
          <Cyl pos={[0, -0.05, 0]} r={0.36} rTop={0.5} h={0.6} color="#c8b48a" mat="cloth" {...S} />
          <Cyl pos={[0, 0.27, 0]} r={0.55} h={0.1} color="#b09a6e" mat="cloth" {...S} />
        </group>
      );
    case 'huacal':
      return (
        <group>
          <Block pos={[0, -0.12, 0]} size={[0.9, 0.06, 0.9]} color="#a9784a" mat="wood" {...S} />
          {[
            [0.45, 0],
            [-0.45, 0],
          ].map(([x], i) => (
            <Block key={i} pos={[x, 0.1, 0]} size={[0.06, 0.4, 0.9]} color="#b98856" mat="wood" {...S} />
          ))}
          {[[0.45], [-0.45]].map(([z], i) => (
            <Block key={i} pos={[0, 0.1, z]} size={[0.9, 0.4, 0.06]} color="#b98856" mat="wood" {...S} />
          ))}
        </group>
      );
    default:
      return (
        <group>
          <Cyl pos={[0, 0, 0]} r={0.4} rTop={0.55} h={0.4} color="#c9954a" mat="cloth" {...S} />
          <Cyl pos={[0, 0.2, 0]} r={0.56} h={0.06} color="#a67533" mat="wood" {...S} />
          <Block pos={[0, 0.4, 0]} size={[1, 0.05, 0.05]} color="#a67533" mat="wood" {...S} />
        </group>
      );
  }
}
