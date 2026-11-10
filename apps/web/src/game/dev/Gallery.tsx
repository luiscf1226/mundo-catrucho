// Galería de arte (solo desarrollo): abre el juego con #go,galeria para ver toda la utilería, los materiales
// y los avatares del paquete de arte activo en un solo lugar.
import { useMemo } from 'react';
import { SHOP } from '../../core/data';
import type { Anim, AvatarConfig, AvatarState } from '../../core/types';
import type { MatKind } from '../kit';
import { art, Block, Ground, Label, P, Spawn } from '../kit';

const MATS: MatKind[] = [
  'plastic',
  'grass',
  'dirt',
  'sand',
  'stone',
  'cobble',
  'brick',
  'wood',
  'metal',
  'tile',
  'stucco',
  'roof',
  'water',
  'neon',
  'glass',
  'cloth',
  'asphalt',
  'concrete',
  'leaf',
  'gold',
];
const ANIMS: Anim[] = [
  'idle',
  'walk',
  'run',
  'jump',
  'fall',
  'dance',
  'dance2',
  'celebrate',
  'wave',
  'clap',
  'kick',
  'throw',
  'carry',
  'drive',
  'sit',
];
const LOOKS: Partial<AvatarConfig>[] = [
  {},
  {
    hair: 'pelo_largo',
    face: 'cara_feliz',
    shirt: 'blusa_tipica',
    pants: 'falda_tipica',
    hat: 'panuelo_lenca',
    acc: 'collar_jade',
    skin: '#a56b43',
  },
  {
    hair: 'pelo_rizado',
    face: 'cara_bigote',
    shirt: 'guayabera',
    pants: 'pantalon_manta',
    hat: 'sombrero_junco',
    acc: 'guitarra',
    skin: '#7a4a2b',
  },
  {
    hair: 'pelo_afro',
    face: 'cara_lentes',
    shirt: 'camisa_h',
    pants: 'short_futbol',
    pantsColor: '#ffffff',
    hat: 'gorra',
    acc: 'mochila',
    skin: '#4f2f1c',
  },
  {
    hair: 'pelo_trenzas',
    face: 'cara_pecas',
    shirt: 'camisa_h_azul',
    pants: 'jeans',
    hat: 'corona_carnaval',
    acc: 'capa_bandera',
    skin: '#f6d3b3',
    hairColor: '#b5651d',
  },
  {
    hair: 'pelo_coleta',
    face: 'cara_guino',
    shirt: 'camisa_manta',
    pants: 'pantalon_basico',
    hat: 'sombrero_vaquero',
    acc: 'tambor_garifuna',
    skin: '#e8b98a',
  },
  {
    hair: 'calvo',
    face: 'cara_sonrisa',
    shirt: 'camisa_504',
    shirtColor: '#e63946',
    pants: 'jeans',
    hat: 'casco_explorador',
    acc: 'banda_bandera',
  },
  {
    hair: 'pelo_corto',
    shirt: 'camisa_rayas',
    shirtColor: '#2ea44f',
    pants: 'pantalon_basico',
    pantsColor: '#607d8b',
    hat: 'sin_sombrero',
    acc: 'sin_accesorio',
  },
  { hair: 'pelo_largo', hairColor: '#e63946', shirt: 'camisa_cuadros', shirtColor: '#7b5cff', pants: 'jeans' },
];
export function Gallery() {
  const states = useMemo(
    () => ANIMS.map((a) => ({ anim: a, speed: a === 'run' ? 8 : a === 'walk' ? 4 : 0 }) as AvatarState),
    [],
  );
  const idle = useMemo(() => ({ anim: 'idle', speed: 0 }) as AvatarState, []);
  return (
    <>
      <art.SkyRig
        time={
          location.hash.includes('noche')
            ? 'noche'
            : location.hash.includes('tarde')
              ? 'tarde'
              : location.hash.includes('auto')
                ? 'auto'
                : 'dia'
        }
        weather={location.hash.includes('lluvia') ? 'lluvia' : location.hash.includes('auto') ? 'auto' : 'despejado'}
      />
      <Spawn pos={[0, 0, 14]} />
      <Ground size={240} />
      {/* fila 1: materiales */}
      {MATS.map((m, i) => (
        <group key={m}>
          <Block
            pos={[-28.5 + i * 3, 1, 30]}
            size={[2.4, 2, 2.4]}
            mat={m}
            color={
              m === 'grass' || m === 'leaf'
                ? '#58a845'
                : m === 'water'
                  ? '#3aa6d8'
                  : m === 'roof' || m === 'brick'
                    ? '#b5523b'
                    : m === 'wood'
                      ? '#8a5a34'
                      : m === 'gold'
                        ? '#ffc93c'
                        : m === 'neon'
                          ? '#00e5ff'
                          : m === 'sand'
                            ? '#e8d5a0'
                            : m === 'dirt'
                              ? '#8a6a45'
                              : m === 'plastic'
                                ? '#e63946'
                                : '#c9c9c9'
            }
          />
          <Label pos={[-28.5 + i * 3, 2.6, 30]} text={m} h={0.38} />
        </group>
      ))}
      {/* fila 2: avatares con distintas prendas */}
      {LOOKS.map((l, i) => (
        <group key={i} position={[-12 + i * 3, 0, 0]}>
          <art.Avatar config={{ ...SHOP.defaultAvatar, ...l }} state={idle} name={`Look ${i + 1}`} />
        </group>
      ))}
      {/* fila 3: animaciones */}
      {ANIMS.map((a, i) => (
        <group key={a} position={[-21 + i * 3, 0, -6]}>
          <art.Avatar config={SHOP.defaultAvatar} state={states[i]} name={a} />
        </group>
      ))}
      {/* utilería */}
      <P.Tree pos={[-30, 0, -16]} />
      <P.Palm pos={[-25, 0, -16]} />
      <P.Pine pos={[-20, 0, -16]} />
      <P.Bush pos={[-16, 0, -16]} />
      <P.Flowers pos={[-13, 0, -16]} />
      <P.Rock pos={[-10, 0, -16]} />
      <P.Lamp pos={[-7, 0, -16]} />
      <P.Bench pos={[-4, 0, -16]} />
      <P.Fence pos={[1, 0, -16]} length={5} />
      <P.Flag pos={[6, 0, -16]} />
      <P.Cone pos={[9, 0, -16]} />
      <P.Barrel pos={[11, 0, -16]} />
      <P.Crate pos={[13, 0, -16]} />
      <P.Tire pos={[15, 0, -16]} />
      <group position={[18, 0.5, -16]}>
        <P.SoccerBall />
      </group>
      <group position={[20, 1, -16]}>
        <P.Coin />
      </group>
      <group position={[22, 1, -16]}>
        <P.Gem />
      </group>
      <P.Macaw pos={[24, 0, -16]} />
      <P.Macaw pos={[27, 3, -16]} flying />
      <P.House pos={[-28, 0, -28]} sign="Pulpería Doña Toña" />
      <P.House pos={[-18, 0, -28]} floors={2} color="#9fd3c7" w={7} />
      <P.House pos={[-9, 0, -28]} color="#f6e1a0" roofColor="#8d3b2a" w={5} d={4} />
      <P.Stall pos={[-2, 0, -28]} sign="Baleadas" />
      <P.Kiosk pos={[6, 0, -28]} />
      <P.Fountain pos={[14, 0, -28]} />
      <P.Statue pos={[20, 0, -28]} />
      <P.Sign pos={[24, 0, -28]} text="Terminal de buses" />
      <P.PortalArch pos={[30, 0, -28]} label="Carrera Catrucha" icon="🏃" />
      <P.Bus pos={[-26, 0, -42]} rot={Math.PI / 2} />
      <P.Mototaxi pos={[-17, 0, -42]} rot={Math.PI / 2} />
      <P.Car pos={[-10, 0, -42]} rot={Math.PI / 2} />
      <P.Boat pos={[-3, 0, -42]} rot={Math.PI / 2} />
      <P.Goal pos={[6, 0, -42]} />
    </>
  );
}
