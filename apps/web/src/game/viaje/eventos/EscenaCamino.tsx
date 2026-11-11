import { SHOP } from '../../../core/data';
import { art, Ball, Block, Label, P } from '../../kit';
import { useCamino } from './state';
export function EscenaCamino() {
  const detenido = useCamino((s) => s.velocidad < 0.1);
  const cita = useCamino((s) => s.activa);
  if (!cita) return null;
  const a = cita.accion;
  return (
    <group position={[0, 0, -18]}>
      <Label pos={[0, 5, 0]} text={cita.nombre} h={0.6} bg="#164e45" />
      {a === 'comprar' ? (
        <group>
          <group position={detenido ? [5.8, 0.9, 18] : [9, 0, 0]}>
            <art.Avatar config={SHOP.defaultAvatar} state={{ anim: 'wave', speed: 0 }} />
          </group>
          <P.Stall pos={[11, 0, -2]} sign={cita.nombre} solid={false} />
          <Label pos={[9, 3, 0]} text="¡Parada, compa!" h={0.45} />
        </group>
      ) : a === 'neblina' || a === 'lluvia' ? (
        <>
          {[-1, 0, 1].map((i) => (
            <Ball key={i} pos={[i * 7, 3, -28]} r={7} color={a === 'neblina' ? '#b6cbd0' : '#638398'} mat="glass" />
          ))}
        </>
      ) : a === 'rodear' ? (
        <>
          <P.Rock pos={[0, 0, 0]} scale={2} solid={false} />
          <P.Cone pos={[2, 0, 3]} solid={false} />
        </>
      ) : cita.nombre === 'Ganado cruzando' ? (
        <group>
          <Block pos={[0, 1, 0]} size={[2.5, 1, 1]} color="#d8c8a6" solid={false} />
          <Block pos={[1.4, 1.4, 0]} size={[0.7, 0.7, 0.7]} color="#69503c" solid={false} />
          {[-0.8, 0.8].flatMap((x) =>
            [-0.35, 0.35].map((z) => (
              <Block key={`${x}-${z}`} pos={[x, 0.4, z]} size={[0.2, 0.8, 0.2]} color="#69503c" solid={false} />
            )),
          )}
        </group>
      ) : a === 'frenar' ? (
        <Block pos={[0, 0.14, 0]} size={[14, 0.28, 1]} color="#efbd30" solid={false} />
      ) : (
        <>
          <P.Cone pos={[-3, 0, 2]} solid={false} />
          <P.Cone pos={[3, 0, 2]} solid={false} />
          <Block pos={[0, 1.2, 0]} size={[7, 0.18, 0.2]} color="#e7b647" solid={false} />
          {a === 'pagar' && <P.Kiosk pos={[7, 0, 0]} solid={false} />}
        </>
      )}
    </group>
  );
}
