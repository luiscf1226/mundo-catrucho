// Peces, basura y plataformas del motor «pesca».
import { Ball, Block, Cyl } from '../../kit';

const S = { solid: false } as const;
const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

/** Pez de lado, mirando a +X. `size` 1 ≈ 0.6 m de largo. */
export function Pez({ nombre = '', color = '#90a4ae', size = 1 }: { nombre?: string; color?: string; size?: number }) {
  const h = hash(nombre) % 3, L = [1, 1.45, 0.85][h], H = [0.36, 0.26, 0.5][h], bagre = /bagre|pargo/i.test(nombre) && h === 0;
  return (
    <group scale={size}>
      <group scale={[L, H, 0.34]}><Ball pos={[0, 0, 0]} r={0.42} color={color} mat="metal" cast={false} /></group>
      <group scale={[L * 0.85, H * 0.5, 0.3]}><Ball pos={[0.02, -0.12, 0.02]} r={0.4} color="#f4f1e6" cast={false} /></group>
      <Block pos={[-0.42 * L - 0.05, 0, 0]} size={[0.06, H * 1.15, 0.26]} color={color} {...S} cast={false} />
      <Block pos={[0, H * 0.5 + 0.03, 0]} size={[0.26 * L, 0.1, 0.04]} color={color} {...S} cast={false} />
      <Ball pos={[0.32 * L, 0.05, 0.12]} r={0.045} color="#111111" cast={false} />
      {bagre && <><Block pos={[0.44 * L, -0.04, 0.1]} size={[0.14, 0.015, 0.015]} color="#222" {...S} cast={false} /><Block pos={[0.44 * L, -0.04, -0.1]} size={[0.14, 0.015, 0.015]} color="#222" {...S} cast={false} /></>}
    </group>
  );
}

/** Basura graciosa: bota, llanta, lata o una bolsa cualquiera. */
export function Basura({ nombre }: { nombre: string }) {
  const n = nombre.toLowerCase();
  if (/bota|zapato|chancle|sandalia/.test(n)) return <group><Block pos={[0.12, -0.1, 0]} size={[0.5, 0.2, 0.2]} color="#6b4a2b" {...S} /><Block pos={[-0.08, 0.15, 0]} size={[0.22, 0.5, 0.2]} color="#7a5333" {...S} /><Block pos={[0.12, -0.21, 0]} size={[0.52, 0.04, 0.22]} color="#2b2b2b" {...S} /></group>;
  if (/llanta|neum/.test(n)) return <group rotation={[Math.PI / 2, 0, 0.3]}><Cyl pos={[0, 0, 0]} r={0.36} h={0.16} color="#242424" {...S} /><Cyl pos={[0, 0, 0]} r={0.2} h={0.18} color="#8a8f94" mat="metal" {...S} /></group>;
  if (/lata|botella/.test(n)) return <group><Cyl pos={[0, 0, 0]} r={0.1} h={0.28} color="#c62828" mat="metal" {...S} /><Cyl pos={[0, 0.15, 0]} r={0.06} h={0.04} color="#cfd8dc" mat="metal" {...S} /></group>;
  return <group><Block pos={[0, 0, 0]} size={[0.4, 0.32, 0.14]} color="#6d7a6a" mat="cloth" {...S} /><Block pos={[0, 0.2, 0]} size={[0.16, 0.1, 0.1]} color="#6d7a6a" mat="cloth" {...S} /></group>;
}

/** Plataforma desde donde se pesca. La parte de arriba queda en y = 0. `big` = la del jugador. */
export function Plat({ desde, pos, big = false }: { desde: string; pos: [number, number, number]; big?: boolean }) {
  const [x, , z] = pos;
  if (desde === 'lancha') return (
    <group>
      <Block pos={[x, -0.25, z]} size={[big ? 2.6 : 1.7, 0.5, big ? 5.8 : 3.2]} color="#e8eef2" {...S} />
      <Block pos={[x, -0.08, z]} size={[big ? 2.7 : 1.8, 0.1, big ? 5.9 : 3.3]} color="#1e88e5" {...S} />
      {[-1, 1].map(k => <Block key={k} pos={[x + k * (big ? 1.25 : 0.8), 0.18, z]} size={[0.1, 0.36, big ? 5.4 : 3]} color="#f4f7f9" {...S} />)}
      {big && <><Block pos={[x, 0.12, z + 1.9]} size={[2.2, 0.1, 0.5]} color="#9e6b3c" mat="wood" {...S} /><Block pos={[x, 0.15, z + 3.05]} size={[0.4, 0.5, 0.35]} color="#37474f" mat="metal" {...S} /></>}
    </group>
  );
  if (desde === 'cayuco') return (
    <group>
      <Block pos={[x, -0.22, z]} size={[big ? 1.3 : 1.0, 0.45, big ? 5.2 : 3]} color="#8a5a2b" mat="wood" {...S} />
      <Block pos={[x, -0.2, z - (big ? 2.7 : 1.6)]} size={[0.7, 0.35, 0.6]} color="#7a4d24" mat="wood" {...S} />
      <Block pos={[x, -0.2, z + (big ? 2.7 : 1.6)]} size={[0.7, 0.35, 0.6]} color="#7a4d24" mat="wood" {...S} />
      {big && <Block pos={[x + 0.9, 0.1, z + 1.4]} size={[0.06, 0.06, 2.2]} color="#c9a46a" mat="wood" rot={0.3} {...S} />}
    </group>
  );
  if (desde === 'orilla') return big ? null : <Block pos={[x, -0.15, z]} size={[1.8, 0.3, 1.8]} color="#79a24f" mat="grass" {...S} />;
  return ( // muelle
    <group>
      <Block pos={[x, -0.15, z]} size={[big ? 3.4 : 1.8, 0.3, big ? 12 : 2.4]} color="#a77b4d" mat="wood" {...S} />
      {[-1, 1].flatMap(k => (big ? [-5.6, -2, 2, 5.6] : [-0.6, 0.6]).map((d, i) => <Cyl key={`${k}${i}`} pos={[x + k * (big ? 1.6 : 0.8), -0.5, z + d]} r={0.11} h={1.5} color="#6b4a2b" mat="wood" {...S} />))}
    </group>
  );
}
