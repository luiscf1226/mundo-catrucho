import { Block, Ball, Cyl, P } from '../kit';
export function Landmark({kind}:{kind:string}){
 const stone='#d3c5a4',white='#f3eee1';
 switch(kind){
 case 'cristo':return <><Block pos={[0,.5,0]} size={[3,1,3]} color={stone} mat="stone" solid={false}/><Block pos={[0,3.1,0]} size={[.8,4.4,.65]} color={white} mat="stone" solid={false}/><Block pos={[0,4.1,0]} size={[4.3,.65,.65]} color={white} mat="stone" solid={false}/><Ball pos={[0,5.6,0]} r={.5} color={white} mat="stone"/></>;
 case 'ruinas':return <>{[0,1,2,3].map(i=><Block key={i} pos={[0,.4+i*.7,0]} size={[5-i, .75,5-i]} color={stone} mat="stone" solid={false}/>)}<Block pos={[4,1.6,0]} size={[.9,3.2,.65]} color={stone} mat="stone" solid={false}/></>;
 case 'fortaleza':case 'fuerte':return <><Block pos={[0,1,0]} size={[5,2,3]} color={stone} mat="stone" solid={false}/>{[-2,2].map(x=><Cyl key={x} pos={[x,1.8,0]} r={.9} h={3.6} color={stone} mat="stone" solid={false}/>)}{[-2,-1,0,1,2].map(x=><Block key={x} pos={[x,2.3,1]} size={[.5,.8,.5]} color={stone} mat="stone" solid={false}/>)}</>;
 case 'catedral':return <><P.House pos={[0,0,0]} w={4} d={3} color={white} solid={false}/>{[-2.3,2.3].map(x=><group key={x}><Block pos={[x,2,0]} size={[1.3,4,1.3]} color={white} mat="stucco" solid={false}/><Cyl pos={[x,4.4,0]} r={.85} rTop={0} h={1.2} color="#c58240" mat="roof" solid={false}/></group>)}</>;
 case 'playa':case 'arrecife':return <><P.Palm pos={[-2,0,0]} solid={false}/><P.Boat pos={[2,0,0]} scale={.7} solid={false}/></>;
 case 'rio':return <><P.Tree pos={[-2,0,0]} solid={false}/><P.Boat pos={[2,.1,1]} scale={.7} solid={false}/></>;
 case 'lago':return <P.Boat pos={[0,.1,0]} solid={false}/>;
 case 'puente':return <>{[-3,3].map(x=><Block key={x} pos={[x,2,0]} size={[.6,4,.6]} color={white} mat="concrete" solid={false}/>)}<Block pos={[0,.7,0]} size={[8,.4,2]} color="#e2b850" mat="wood" solid={false}/>{[-.8,.8].map(z=><Block key={z} pos={[0,1.6,z]} size={[8,.2,.2]} color="#b84837" mat="metal" solid={false}/>)}</>;
 case 'volcan':return <Cyl pos={[0,1.8,0]} r={3.4} rTop={.6} h={3.6} color="#807f58" mat="stone" solid={false}/>;
 case 'cuevas':return <>{[-2,2].map(x=><P.Rock key={x} pos={[x,0,0]} scale={2.5} solid={false}/>)}<Block pos={[0,2.5,0]} size={[5,1.2,2]} color="#777e6e" mat="stone" solid={false}/></>;
 case 'bosque':return <P.Pine pos={[0,0,0]} scale={1.4} solid={false}/>;
 case 'cafetal':return <>{[-2,0,2].map(x=><P.Bush key={x} pos={[x,0,0]} color="#38754a" solid={false}/>)}<P.Crate pos={[0,0,2]} solid={false}/></>;
 case 'mercado':case 'artesania':return <P.Stall pos={[0,0,0]} sign={kind==='mercado'?'Mercado lenca':'Junco'} solid={false}/>;
 case 'lluvia':return <><P.Boat pos={[0,0,0]} scale={.6} solid={false}/>{[-2,0,2].map(x=><group key={x} position={[x,3+Math.abs(x)*.3,0]} scale={[.9,.3,.3]}><Ball pos={[0,0,0]} r={.7} color="#79c9e1" mat="metal"/></group>)}</>;
 default:return <P.House pos={[0,0,0]} color="#ead3b0" w={4} d={3} solid={false}/>;
 }
}
