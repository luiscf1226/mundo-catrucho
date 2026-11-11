import { useRef } from 'react';
import { useGame } from '../../../core/store';
import { Block, Label, Trigger } from '../../kit';

const puntos = [
  {
    id: 'olancho.punto-1',
    nombre: 'Cuevas de Talgua',
    texto:
      'Observá réplicas y registrá materiales sin tocar restos. Las Cuevas de Talgua se encuentran en Catacamas, Olancho.',
    x: -8,
    z: 34,
  },
  {
    id: 'olancho.punto-2',
    nombre: 'Sierra de Agalta',
    texto:
      'Fotografiá un perfil de vegetación y completá una libreta. La Sierra de Agalta ofrece turismo de naturaleza y montaña.',
    x: -8,
    z: 27,
  },
  {
    id: 'olancho.punto-3',
    nombre: 'Mesa de tapado olanchano',
    texto:
      'Probá un plato virtual y escuchá cómo lo presentan sus cocineros. El tapado olanchano es parte de la gastronomía promocionada para visitantes de Olancho.',
    x: -8,
    z: 20,
  },
  {
    id: 'olancho.punto-4',
    nombre: 'Ruta rural',
    texto:
      'Ayudá a completar una ficha de visita de finca con un anfitrión ficticio. La promoción turística de Olancho incluye actividades de turismo rural.',
    x: -8,
    z: 13,
  },
  {
    id: 'olancho.punto-5',
    nombre: 'Pastel al estilo del video',
    texto:
      'Partí un pastel de caricatura con un machete de goma dentro de una zona de seguridad. Una noticia describe como estilo olanchano un video de corte de pastel a machete; no verifica dónde fue grabado.',
    x: -8,
    z: 6,
  },
  {
    id: 'olancho.punto-6',
    nombre: 'Calcita sin recolección',
    texto:
      'Variá una luz virtual sobre un escaneo y descubrí sus brillos. Los cristales de calcita sobre restos de Talgua brillan bajo la luz y dieron lugar al nombre de calaveras luminosas.',
    x: 8,
    z: 34,
  },
  {
    id: 'olancho.punto-7',
    nombre: 'Pastel a machete de goma',
    texto:
      'Un video de corte de pastel fue descrito por prensa como estilo olanchano; la ubicación del video no está comprobada. Un anfitrión ficticio sin nombre real parte un pastel con herramienta de goma descomunal; la referencia no afirma que todos lo hagan.',
    x: 8,
    z: 27,
  },
  {
    id: 'olancho.punto-8',
    nombre: 'Tapado con techo',
    texto:
      'El tapado olanchano figura en la oferta gastronómica del departamento. La tapa de la olla de decorado se abre como techo y las verduras hacen reverencia; animación original.',
    x: 8,
    z: 20,
  },
  {
    id: 'olancho.punto-9',
    nombre: 'Talgua prende el brillo',
    texto:
      'La calcita de Talgua brilla a la luz y motivó el apelativo de calaveras luminosas. Cristales de una réplica educativa encienden luces al orientar el foco; los restos humanos no se animan ni ridiculizan.',
    x: 8,
    z: 13,
  },
];
export function OlanchoPuntos() {
  const vistos = useRef(new Set<string>());
  return (
    <>
      {puntos.map((p) => (
        <group key={p.id}>
          <Block pos={[p.x, 0.5, p.z]} size={[1, 1, 1]} color="#b8a982" mat="stone" />
          <Label pos={[p.x, 2, p.z]} text={p.nombre} h={0.36} />
          <Trigger
            pos={[p.x, 1, p.z]}
            size={[4, 4, 4]}
            onEnter={() => {
              if (vistos.current.has(p.id)) return;
              vistos.current.add(p.id);
              useGame.getState().showDialog({ title: p.nombre, text: p.texto, icon: '🧭' });
            }}
          />
        </group>
      ))}
    </>
  );
}
