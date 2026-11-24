import { Ball, Block, Cyl, Label, P } from '../../kit';
import { useLocuraCerca } from '../../reacciones';
import puntos from './copan-puntos.json';

function Punto({ indice }: { indice: number }) {
  const p = puntos[indice],
    x = indice < 5 ? -8 : 8,
    z = 36 - (indice % 5) * 6;
  useLocuraCerca(x, z, undefined, { title: p.nombre, text: p.texto });

  return (
    <group position={[x, 0, z]}>
      <Cyl pos={[0, 0.04, 0]} r={1.6} h={0.08} color="#ebc879" mat="sand" solid={false} />
      <Label pos={[0, 2.5, -0.5]} text={`${indice < 7 ? '📍' : '✨'} ${p.nombre}`} h={0.26} />
      {indice === 7 ? (
        <>
          <P.Macaw pos={[0, 1, 0]} scale={0.4} />
          <Block pos={[0.7, 1, 0]} size={[0.6, 0.05, 0.9]} color="#f5e1ac" mat="cloth" solid={false} />
          <Label pos={[0, 1.8, 0]} text="Guara de papel · Escala" h={0.2} />
        </>
      ) : indice === 8 ? (
        <group rotation={[0, 0, Math.PI]} position={[0, 1.8, 0]}>
          <Block pos={[0, 0.4, 0]} size={[1, 1, 0.3]} color="#baaf95" mat="stone" solid={false} />
          <Label pos={[0, 0.4, 0.2]} text="Réplica" h={0.2} />
        </group>
      ) : indice === 9 ? (
        <>
          <Ball pos={[0.6, 1, 0]} r={0.28} color="#3e3732" />
          <Label pos={[-0.5, 1, 0]} text="Guante ✗" h={0.23} />
        </>
      ) : (
        <P.Sign
          pos={[0, 0, -0.7]}
          text={indice < 3 ? 'Observá · No toqués' : 'Explorá con respeto'}
          scale={0.5}
          solid={false}
        />
      )}
    </group>
  );
}
export function CopanDescubrimientos() {
  return <>{puntos.map((p, i) => i >= 7 && <Punto key={p.id} indice={i} />)}</>;
}
