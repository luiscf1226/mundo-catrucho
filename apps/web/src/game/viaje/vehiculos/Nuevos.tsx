import { SHOP } from '../../../core/data';
import { art, Block, Cyl, P } from '../../kit';
import type { VehicleKind } from '../model';

function Pieza({
  pos,
  size,
  color = '#ebd657',
}: {
  pos: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return <Block pos={pos} size={size} color={color} mat="metal" solid={false} />;
}
function Rueda({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.5, z]} rotation-z={Math.PI / 2}>
      <Cyl pos={[0, 0, 0]} r={0.48} h={0.22} color="#222c36" solid={false} />
      <Cyl pos={[0, 0, 0]} r={0.23} h={0.24} color="#b1c7cc" solid={false} />
    </group>
  );
}
export function Nuevos({ kind }: { kind: VehicleKind }) {
  if (kind === 'mototaxi') return <P.Mototaxi pos={[0, 0, 0]} scale={1.35} solid={false} />;
  if (kind === 'bicitaxi')
    return (
      <group>
        <Rueda x={0} z={-1} />
        <Rueda x={-0.9} z={0.9} />
        <Rueda x={0.9} z={0.9} />
        <Pieza pos={[0, 0.7, 0]} size={[0.12, 0.15, 2.4]} color="#409a75" />
        <Pieza pos={[0, 1.1, -0.7]} size={[1, 0.1, 0.12]} />
        <Pieza pos={[0, 0.85, 0.9]} size={[1.8, 0.22, 1.2]} />
        <Pieza pos={[0, 1.4, 1.35]} size={[1.8, 0.9, 0.15]} />
        <Pieza pos={[0, 2.3, 0.9]} size={[2, 0.12, 1.5]} color="#3ca58b" />
        {[-0.9, 0.9].map((x) => (
          <Pieza key={x} pos={[x, 1.6, 1.3]} size={[0.07, 1.4, 0.07]} />
        ))}
        <group position={[0, 0.8, -0.25]} scale={0.65}>
          <art.Avatar config={SHOP.defaultAvatar} state={{ anim: 'sit', speed: 0 }} />
        </group>
      </group>
    );
  if (kind === 'avioneta')
    return (
      <group>
        <Pieza pos={[0, 1, 0]} size={[1.3, 1.2, 5.5]} />
        <Pieza pos={[0, 1.6, -1.1]} size={[1.35, 0.6, 1.4]} color="#285a77" />
        <Pieza pos={[0, 1.9, -0.3]} size={[8, 0.14, 1.5]} />
        <Pieza pos={[0, 1.3, 2.3]} size={[3.2, 0.12, 0.8]} />
        <Pieza pos={[0, 1.9, 2.3]} size={[0.14, 1.4, 0.9]} color="#d85440" />
        <Pieza pos={[0, 1, -2.9]} size={[0.13, 2.6, 0.12]} color="#293943" />
        <Rueda x={-0.8} z={-0.4} />
        <Rueda x={0.8} z={-0.4} />
      </group>
    );
  if (kind === 'ferry')
    return (
      <group>
        <Pieza pos={[0, 0.5, 0]} size={[4.2, 1, 9]} color="#214f77" />
        <Pieza pos={[0, 1.5, 0.5]} size={[3.8, 1, 6.8]} color="#eee9cd" />
        <Pieza pos={[0, 2.5, 0]} size={[3.4, 1, 5]} color="#f5f1dc" />
        <Pieza pos={[0, 2.5, -2.55]} size={[3, 0.6, 0.08]} color="#2b7085" />
        <Pieza pos={[0, 3.1, 0]} size={[3.8, 0.15, 5.4]} />
        <Pieza pos={[0, 3.6, 1.2]} size={[0.7, 1, 0.7]} color="#d35a45" />
        {[-1.73, 1.73].flatMap((x) =>
          [-1, 0.2, 1.4].map((z) => (
            <Pieza key={`${x}/${z}`} pos={[x, 2.5, z]} size={[0.05, 0.55, 0.7]} color="#2b7085" />
          )),
        )}
      </group>
    );
  return null;
}
export function PasajerosPickup() {
  return (
    <group>
      <Pieza pos={[0, 1.15, 1]} size={[1.8, 0.15, 1.8]} color="#5d402f" />
      {[-0.6, 0.6].map((x) => (
        <group key={x} position={[x, 1.15, 1]} scale={0.65}>
          <art.Avatar config={SHOP.defaultAvatar} state={{ anim: 'sit', speed: 0 }} />
          <Pieza pos={[0, 0.65, -0.2]} size={[0.65, 0.1, 0.1]} color="#222f3a" />
        </group>
      ))}
    </group>
  );
}
