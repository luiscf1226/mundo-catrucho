import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
interface Batch { geometry:THREE.BufferGeometry; material:THREE.Material; sources:THREE.Mesh[]; mesh:THREE.InstancedMesh }
/** Instancia monedas del kit; sus componentes conservan recogida, giro y flotación. */
export function AnimatedBatch({children}:{children:ReactNode}){
 const root=useRef<THREE.Group>(null),[batches,setBatches]=useState<Batch[]>([]);
 useEffect(()=>{const groups=new Map<string,{geometry:THREE.BufferGeometry;material:THREE.Material;sources:THREE.Mesh[]}>();root.current?.traverse(o=>{if(!(o instanceof THREE.Mesh)||Array.isArray(o.material))return;const g=o.geometry;const key=o.material.uuid+'|'+g.type+'|'+JSON.stringify('parameters' in g ? g.parameters : g.attributes.position.count);let b=groups.get(key);if(!b){b={geometry:g,material:o.material,sources:[]};groups.set(key,b);}b.sources.push(o);});const bs=[...groups.values()].map(b=>({...b,mesh:new THREE.InstancedMesh(b.geometry,b.material,b.sources.length)}));bs.forEach(b=>b.mesh.frustumCulled=false);setBatches(bs);return()=>bs.forEach(b=>b.mesh.dispose());},[]);
 useFrame(()=>{const r=root.current;if(!r)return;r.updateWorldMatrix(true,true);for(const b of batches){b.sources.forEach((o,i)=>{let visible=true;let p:THREE.Object3D|null=o;while(p&&p!==r){if(!p.visible)visible=false;p=p.parent;}b.mesh.setMatrixAt(i,visible?o.matrixWorld:new THREE.Matrix4().makeScale(0,0,0));});b.mesh.instanceMatrix.needsUpdate=true;}});
 return <><group ref={root} visible={false}>{children}</group>{batches.map((b,i)=><primitive key={i} object={b.mesh}/>)}</>;
}
