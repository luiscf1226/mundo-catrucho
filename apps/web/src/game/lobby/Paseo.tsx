import { useGame } from '../../core/store';
import { Ball, Block, Cyl, Interactable, Label, P } from '../kit';
import { Baked } from './Baked';
import { Landmark } from './Landmark';

const exhibits = [
  [
    'Copán: piedra y memoria',
    'Las estelas de Copán conservan retratos e inscripciones de sus gobernantes mayas.',
    'ruinas',
    -166,
    83,
  ],
  [
    'Cristo del Picacho',
    'El Cristo del Picacho se alza sobre Tegucigalpa, en el cerro El Picacho.',
    'cristo',
    -178,
    47,
  ],
  ['Guacamaya roja', 'La guacamaya roja es el ave nacional de Honduras. Cuidá su bosque.', 'ave', -178, 5],
  [
    'Orquídea nacional',
    'Rhyncholaelia digbyana es la flor nacional de Honduras; tiene un labio blanco con flecos.',
    'flor',
    -178,
    -40,
  ],
  [
    'El pino',
    'El pino es el árbol nacional de Honduras. Sus bosques cubren buena parte de las montañas.',
    'bosque',
    -148,
    -104,
  ],
  ['Venado cola blanca', 'El venado cola blanca es el mamífero nacional de Honduras.', 'venado', -85, -109],
  [
    'Cinco estrellas',
    'Las cinco estrellas de nuestra bandera representan a los países de la antigua Federación Centroamericana.',
    'bandera',
    5,
    -109,
  ],
  [
    'Lempira',
    'Lempira fue un líder de la resistencia indígena frente a la conquista española en el siglo XVI.',
    'lempira',
    180,
    -72,
  ],
  [
    'Fortaleza de Omoa',
    'La fortaleza de San Fernando de Omoa protegía el puerto durante la época colonial.',
    'fortaleza',
    180,
    -24,
  ],
  [
    'Marimba y punta',
    'La marimba y los tambores acompañan distintas tradiciones musicales de Honduras; la punta tiene raíces garífunas.',
    'musica',
    180,
    32,
  ],
  [
    '¡Una baleada!',
    'La baleada combina tortilla de harina, frijoles y mantequilla; podés agregarle queso y otros ingredientes.',
    'comida',
    158,
    99,
  ],
  [
    'Lluvia de Peces',
    'Yoro es conocido por el relato de peces que aparecen tras fuertes lluvias; celebra esta tradición cada año.',
    'lluvia',
    76,
    120,
  ],
] satisfies [string, string, string, number, number][];
function Exhibit({ kind }: { kind: string }) {
  if (kind === 'ave') return <P.Macaw pos={[0, 1, 0]} scale={2} />;
  if (kind === 'bandera') return <P.Flag pos={[0, 0, 0]} height={8} />;
  if (kind === 'lempira') return <P.Statue pos={[0, 0, 0]} scale={1.4} />;
  if (kind === 'comida') return <P.Stall pos={[0, 0, 0]} sign="Baleadas" solid={false} />;
  if (kind === 'flor')
    return (
      <>
        <Cyl pos={[0, 1, 0]} r={0.12} h={2} color="#338654" mat="leaf" solid={false} />
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} rotation-z={(i * Math.PI * 2) / 7}>
            <group scale={[0.45, 1, 0.25]}>
              <Ball pos={[0, 2, 0]} r={1} color="#f3f2d8" mat="cloth" />
            </group>
          </group>
        ))}
        <Ball pos={[0, 2, 0.3]} r={0.4} color="#b9d676" mat="leaf" />
      </>
    );
  if (kind === 'venado')
    return (
      <>
        <group scale={[1.7, 0.8, 0.6]}>
          <Ball pos={[0, 1.5, 0]} r={1} color="#ac7b4f" mat="cloth" />
        </group>
        <Ball pos={[1.5, 2.2, 0]} r={0.5} color="#ac7b4f" mat="cloth" />
        {[-1, 1].flatMap((x) =>
          [-0.35, 0.35].map((z) => (
            <Block
              key={`${x}${z}`}
              pos={[x, 0.65, z]}
              size={[0.18, 1.3, 0.18]}
              color="#775135"
              mat="wood"
              solid={false}
            />
          )),
        )}
        <Block pos={[-1.65, 1.7, 0]} size={[0.5, 0.35, 0.4]} color="#ffffff" mat="cloth" solid={false} />
        {[-0.25, 0.25].map((z) => (
          <Block key={z} pos={[1.5, 3, z]} size={[0.12, 1.2, 0.12]} color="#d5bd91" mat="wood" solid={false} />
        ))}
      </>
    );
  if (kind === 'musica')
    return (
      <>
        <Block pos={[0, 1, 0]} size={[4, 0.3, 1.5]} color="#72452d" mat="wood" solid={false} />
        {Array.from({ length: 12 }, (_, i) => (
          <Block
            key={i}
            pos={[-1.7 + i * 0.3, 1.2, 0]}
            size={[0.23, 0.12, 1.2 - i * 0.05]}
            color="#c69a56"
            mat="wood"
            solid={false}
          />
        ))}
        {[-1.5, 1.5].map((x) => (
          <Block key={x} pos={[x, 0.5, 0]} size={[0.2, 1, 0.2]} color="#72452d" mat="wood" solid={false} />
        ))}
        <Cyl pos={[3, 0.7, 0]} r={0.65} h={1.4} color="#ad7446" mat="wood" solid={false} />
        <Cyl pos={[3, 1.43, 0]} r={0.65} h={0.08} color="#e8d2a1" mat="cloth" solid={false} />
      </>
    );
  return <Landmark kind={kind} />;
}
export function Paseo() {
  return (
    <>
      {exhibits.map(([title, text, kind, x, z]) => (
        <group key={title}>
          <Baked>
            <group position={[x, 0.22, z]}>
              <Cyl pos={[0, 0.15, 0]} r={6} h={0.3} color="#e3ce9e" mat="stone" solid={false} />
              <Exhibit kind={kind} />
            </group>
          </Baked>
          <Label pos={[x, 7, z]} text={title} h={1} />
          <Interactable
            pos={[x, 0.18, z + 6]}
            radius={2.5}
            label={`Conocer: ${title}`}
            icon="📖"
            onUse={() => useGame.getState().showDialog({ title, text, icon: '🇭🇳' })}
          />
        </group>
      ))}
    </>
  );
}
