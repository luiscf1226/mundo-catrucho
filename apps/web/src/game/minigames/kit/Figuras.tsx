import { useMemo } from 'react';
import { art, Ball, Block, Cyl } from '../../kit';
import { botCfg } from '../corte/common';

export function Campesino({ agachado = false }: { agachado?: boolean }) {
  const config = useMemo(() => botCfg(2), []);
  const state = useMemo(() => ({ anim: 'walk' as const, speed: 1 }), []);
  return (
    <group scale={[1, agachado ? 0.55 : 1, 1]}>
      <art.Avatar config={config} state={state} />
    </group>
  );
}
export function Vaca({ clara }: { clara: boolean }) {
  return (
    <>
      <group scale={[0.62, 0.48, 1]}>
        <Ball pos={[0, 0, 0]} r={0.7} color={clara ? '#f2dfbd' : '#775444'} mat="cloth" />
      </group>
      <Block pos={[0, 0.05, -0.63]} size={[0.4, 0.45, 0.42]} color="#805c48" mat="cloth" solid={false} />
      <Ball pos={[0, -0.06, -0.88]} r={0.22} color="#d5ad91" mat="cloth" />
      {[-1, 1].map((lado) => (
        <group key={lado}>
          <Cyl
            pos={[lado * 0.17, 0.39, -0.6]}
            r={0.065}
            rTop={0.01}
            h={0.28}
            color="#fff0cd"
            mat="stone"
            solid={false}
          />
          <Ball pos={[lado * 0.21, 0.17, -0.79]} r={0.045} color="#252629" />
          <Block pos={[lado * 0.32, 0.2, -0.6]} size={[0.25, 0.09, 0.2]} color="#805c48" mat="cloth" solid={false} />
          {[-0.4, 0.4].map((z) => (
            <Cyl key={z} pos={[lado * 0.22, -0.43, z]} r={0.07} h={0.5} color="#735444" mat="cloth" solid={false} />
          ))}
        </group>
      ))}
      <Cyl pos={[0, -0.18, 0.63]} r={0.045} h={0.6} color="#735444" mat="cloth" solid={false} />
    </>
  );
}
export function Tajadas({ pollo = false }: { pollo?: boolean }) {
  return (
    <group scale={pollo ? [1.5, 0.6, 0.9] : [1, 0.22, 0.65]}>
      {[-0.65, 0, 0.65].map((x) => (
        <Ball key={x} pos={[x, 0, 0]} r={pollo ? 0.55 : 0.65} color={pollo ? '#c88537' : '#efc658'} mat="sand" />
      ))}
      {pollo && <Cyl pos={[1, 0, 0]} r={0.15} h={0.8} color="#f5dfb8" mat="sand" solid={false} />}
    </group>
  );
}
