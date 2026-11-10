import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { art, Interactable, Label, useTick } from '../kit';
import { catDe } from '../../core/data';
import { useGame } from '../../core/store';
import { DEPTOS, groundAt } from './terrain';
import { conectados } from './population';
import { Landmark } from './Landmark';
import { Baked } from './Baked';
import { Kit, Static } from './static';
export { conectados } from './population';
function surface(d:typeof DEPTOS[number]){
 const shapes=d.rings.map(r=>new THREE.Shape(r.map(([x,z])=>new THREE.Vector2(x,-z))));const flat=new THREE.ShapeGeometry(shapes),points:number[]=[];
 const p=flat.attributes.position,ix=flat.index;
 const add=(a:THREE.Vector2,b:THREE.Vector2,c:THREE.Vector2,depth=0)=>{if(depth<7&&Math.max(a.distanceTo(b),b.distanceTo(c),a.distanceTo(c))>3.5){const ab=a.clone().lerp(b,.5),bc=b.clone().lerp(c,.5),ca=c.clone().lerp(a,.5);add(a,ab,ca,depth+1);add(ab,b,bc,depth+1);add(ca,bc,c,depth+1);add(ab,bc,ca,depth+1);}else for(const v of [a,b,c])points.push(v.x,groundAt(v.x,-v.y)+.035,-v.y);};
 for(let i=0;i<(ix?.count??p.count);i+=3){const v=(j:number)=>{const k=ix?ix.getX(j):j;return new THREE.Vector2(p.getX(k),p.getY(k));};add(v(i),v(i+1),v(i+2));}flat.dispose();
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap((_,i)=>i%3===0?[points[i]/15,points[i+2]/15]:[]),2));geo.computeVertexNormals();return geo;
}
function DeptSign({d}:{d:typeof DEPTOS[number]}){
 const [n,setN]=useState(()=>conectados(d.id));let elapsed=0;useTick(dt=>{elapsed+=dt;if(elapsed>30){elapsed=0;setN(conectados(d.id));}});
 const [x,z]=d.c,y=groundAt(x,z),cat=catDe(d.id);
 return <><Label pos={[x,y+11,z]} text={d.name} h={1.9} bg="#183b36"/><Label pos={[x,y+9.4,z]} text={`${cat.tipos}${cat.juegos.length?` · ${cat.juegos.length} juegos`:''}`} h={.8}/><Label pos={[x,y+8.3,z]} text={`🟢 ${n} conectados · simulados`} h={.65} bg="#214e45"/><Label pos={[x-3,y+.65,z+4]} text="ENTRÁ" h={.5}/><Interactable pos={[x-3,groundAt(x-3,z+4),z+4]} radius={2.5} label={`Entrar a ${d.name}`} icon="🧭" onUse={()=>useGame.getState().travel(d.id)}/></>;
}
export function MapaHonduras(){
 const geos=useMemo(()=>DEPTOS.map(surface),[]);
 const kit=useMemo(()=>{const k=new Kit();for(const d of DEPTOS){for(const r of d.rings)for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);k.flat([(a[0]+b[0])/2,.23,(a[1]+b[1])/2],[.36,.13,len+.1],'#eee1b2','stone',Math.atan2(b[0]-a[0],b[1]-a[1]));}const [x,z]=d.c,y=groundAt(x,z);k.deco([x,y+5,z],[.18,10,.18],'#d0af68','metal');for(const dx of [-4.6,-1.4])k.deco([x+dx,groundAt(x+dx,z+4)+1.6,z+4],[.4,3.2,.45],'#efc777','stone');k.deco([x-3,y+3.1,z+4],[3.8,.45,.5],'#efc777','stone');}
 // Muelle de La Ceiba a Roatán: piso continuo al nivel caminable.
 k.flat([-10,.17,-68],[3,.15,48],'#bfa078','wood');for(let z=-91;z<-44;z+=4){k.deco([-11.7,.7,z],[.15,1.3,.15],'#bfa078','wood');k.deco([-8.3,.7,z],[.15,1.3,.15],'#bfa078','wood');}return k;},[]);
 useEffect(()=>()=>geos.forEach(g=>g.dispose()),[geos]);
 return <>{DEPTOS.map((d,i)=><mesh key={d.id} geometry={geos[i]} material={art.material(d.biome==='sur'||d.biome==='isla'?'sand':'grass',d.color)} receiveShadow/>)}<Static kit={kit}/><Baked>{DEPTOS.map(d=><group key={d.id} position={[d.c[0]+2,groundAt(d.c[0]+2,d.c[1]),d.c[1]-1]}><Landmark kind={d.landmark.kind}/></group>)}</Baked>{DEPTOS.map(d=><DeptSign key={d.id} d={d}/>)}</>;
}
