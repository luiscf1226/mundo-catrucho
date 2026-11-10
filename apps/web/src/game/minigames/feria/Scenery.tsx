import { useRef } from "react";
import type { Group } from "three";
import { art, Block, Cyl, Label, P, useMgTick } from "../../kit";
import { useGame } from "../../../core/store";
import { Balls, Boxes, Cyls, type Piece } from "./inst";
const colors = ["#f45c57", "#ffd448", "#22c6bb", "#8875e7"];
const flags: Piece[] = [], bulbs: Piece[] = [], rods: Piece[] = [];
for (let i = 0; i < 48; i++) {
  const x = -22 + i * .94;
  flags.push({
    p: [x, 5.7 - Math.sin(i / 47 * Math.PI) * .7, 3],
    s: [.48, .6, .05],
    c: colors[i % 4],
  });
  bulbs.push({
    p: [x, 5.8 - Math.sin(i / 47 * Math.PI) * .7, 3],
    s: .09,
    c: "#fff1a6",
  });
}
for (let i = 0; i < 12; i++) {
  const a = i * Math.PI / 6;
  rods.push({
    a: [0, 0, 0],
    b: [Math.cos(a) * 5, Math.sin(a) * 5, 0],
    w: .09,
    c: colors[i % 4],
  });
}
for (let i = 0; i < 32; i++) {
  const a = i * Math.PI / 16, b = (i + 1) * Math.PI / 16;
  rods.push({
    a: [Math.cos(a) * 5, Math.sin(a) * 5, 0],
    b: [Math.cos(b) * 5, Math.sin(b) * 5, 0],
    w: .12,
    c: "#e5b85f",
  });
}
export function Scenery() {
  const wheel = useRef<Group>(null);
  const avatar = useGame((s) => s.profile.avatar);
  useMgTick((dt) => {
    if (wheel.current) wheel.current.rotation.z += dt * .15;
  });
  return (
    <>
      <Boxes mat="cloth" items={flags} />
      <Balls mat="neon" items={bulbs} />
      {[-22, 22].map((x) => (
        <Cyl key={x} pos={[x, 3, 3]} r={.13} h={6} mat="wood" />
      ))}
      <group position={[17, 7, -19]}>
        <group ref={wheel}>
          <Cyls mat="metal" items={rods} />
          {colors.map((c, i) => (
            <Block
              key={c}
              pos={[
                Math.cos(i * Math.PI / 2) * 5,
                Math.sin(i * Math.PI / 2) * 5,
                0,
              ]}
              size={[1.8, 1, .9]}
              mat="metal"
              color={c}
              solid={false}
            />
          ))}
        </group>
        <Cyl
          pos={[0, -3, 0]}
          r={.3}
          h={8}
          mat="metal"
          color="#385b70"
          solid={false}
        />
        <Label pos={[0, 6, 0]} text="El chicago" />
      </group>
      <Cyl pos={[-18, 4, -17]} r={.25} h={8} mat="wood" />
      <Label pos={[-18, 8.8, -17]} text="Palo encebado" />
      <group position={[-18, 8.4, -17]}>
        <P.Gem kind="jade" />
      </group>
      {["Churros", "Elotes", "Algodón"].map((s, i) => (
        <P.Stall
          key={s}
          pos={[-16 + i * 7, 0, 11]}
          rot={Math.PI}
          sign={s}
          solid={false}
        />
      ))}
      <Block pos={[18, .35, 9]} size={[7, .7, 4]} mat="wood" color="#75452b" />
      <Label pos={[18, 3.4, 9]} text="♫ Marimba del pueblo" />
      {Array.from({ length: 12 }, (_, i) => i).map((i) => (
        <Block
          key={i}
          pos={[16.5 + i * .27, 1.4, 8]}
          size={[.23, .2, 1.3 - i * .035]}
          mat="wood"
          color="#bf7b39"
          solid={false}
        />
      ))}
      {[[-13, 5], [-8, 7], [9, 6], [13, 8], [17, 9]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <art.Avatar
            config={{ ...avatar, shirtColor: colors[i % 4] }}
            state={{ anim: i > 2 ? "dance" : "wave", speed: 0 }}
          />
        </group>
      ))}
    </>
  );
}
