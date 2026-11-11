import { useRef } from 'react';
import { useGame } from '../../../core/store';
import { Block, Label, Trigger } from '../../kit';

const puntos = [
  {
    id: 'olancho.punto-1',
    nombre: 'Cuevas de Talgua',
    texto: 'Las Cuevas de Talgua están en Catacamas. Mirá las réplicas y anotá lo que ves, sin tocar nada.',
    x: -8,
    z: 34,
  },
  {
    id: 'olancho.punto-2',
    nombre: 'Sierra de Agalta',
    texto: 'La Sierra de Agalta es puro bosque y montaña. Sacale foto a la vegetación y llená tu libreta.',
    x: -8,
    z: 27,
  },
  {
    id: 'olancho.punto-3',
    nombre: 'Mesa de tapado olanchano',
    texto: 'El tapado olanchano es de lo más rico de por acá. Probalo y escuchá cómo lo preparan.',
    x: -8,
    z: 20,
  },
  {
    id: 'olancho.punto-4',
    nombre: 'Ruta rural',
    texto: 'Olancho también se vive en las fincas. Ayudale al anfitrión a llenar la ficha de visita.',
    x: -8,
    z: 13,
  },
  {
    id: 'olancho.punto-5',
    nombre: 'Pastel al estilo del video',
    texto: 'Dicen que en Olancho el pastel se parte a machete. Aquí va de goma y con cuidado: ¡partilo!',
    x: -8,
    z: 6,
  },
  {
    id: 'olancho.punto-6',
    nombre: 'Calcita sin recolección',
    texto:
      'Por la calcita que brilla con la luz, a Talgua le dicen la cueva de las calaveras luminosas. Mové la luz y mirá cómo brilla.',
    x: 8,
    z: 34,
  },
  {
    id: 'olancho.punto-7',
    nombre: 'Pastel a machete de goma',
    texto: '¡Ideay! El anfitrión saca un machete de goma más grande que él y parte el pastel de un solo tajo.',
    x: 8,
    z: 27,
  },
  {
    id: 'olancho.punto-8',
    nombre: 'Tapado con techo',
    texto: 'Se abre la tapa de la olla como si fuera un techo y las verduras del tapado te hacen reverencia.',
    x: 8,
    z: 20,
  },
  {
    id: 'olancho.punto-9',
    nombre: 'Talgua prende el brillo',
    texto:
      'Apuntá bien el foco y los cristales de la réplica se encienden como luces de feria. Con respeto: los restos no se tocan.',
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
