import * as THREE from 'three';
import { SCENERY } from './scenery/index.js';
import { insidePolygon as inside } from './geometry.js';

// Toy landmarks inspired by Lombardy; placements are fictional and never use map tiles.
// Circuits with a module in src/scenery/ (registered in scenery/index.js) build their own landmarks and extras
// through the shared kit; the others use the legacy builders below.
const layoutCache = new WeakMap();
const STREET_HOUSES={brugherio:22,milano:20,villasanta:14,increa:6,bergamo:12,aprica:8};
const sceneryModule=(track)=>track.theme.local?SCENERY[track.theme.local]:null;
export function localLayout(track) {
  if (layoutCache.has(track)) return layoutCache.get(track);
  const module=sceneryModule(track);
  const landmarks = track.landmarks.map(item => {
    const f=track.frame(item.distance);
    const x=f.x+f.dz*item.lane,z=f.z-f.dx*item.lane;
    return {...item,x,z,rotation:Math.atan2(f.x-x,f.z-z)};
  });
  const shoreline = track.theme.local==='como' ? track.points(200).map(f=>{
    const lane=-track.roadWidth/2-4;
    return {x:f.x+f.dz*lane,z:f.z-f.dx*lane};
  }) : [];
  const streets=[];
  const road=track.points(300);
  const count=module?.streetHouses??STREET_HOUSES[track.theme.local]??0;
  for(let i=0;i<count;i++) {
    const distance=18+i*track.length/count,f=track.frame(distance),lane=track.roadWidth/2+12;
    const house={x:f.x+f.dz*lane,z:f.z-f.dx*lane,distance,index:i};
    // Street houses give way to landmarks on the same side and never sit on another stretch of road (figure-eight circuits).
    const clearOfRoad=road.every(p=>Math.abs(track.wrap(p.distance-distance+track.length/2)-track.length/2)<40||Math.hypot(p.x-house.x,p.z-house.z)>track.roadWidth/2+9);
    const clearOfLandmarks=landmarks.every(p=>Math.hypot(p.x-house.x,p.z-house.z)>Math.max(32,reservedRadius(track,p.kind)+9));
    if(clearOfRoad&&clearOfLandmarks&&!(module?.isReserved?.(track,{landmarks,shoreline,streets:[]},house.x,house.z)))streets.push(house);
  }
  const result={landmarks,shoreline,streets};layoutCache.set(track,result);return result;
}
/** Round holes the renderer cuts out of the ground plane (a pit lake); empty for most circuits. */
export function localGroundHoles(track) {
  const module=sceneryModule(track);
  return module?.groundHoles?.(track,localLayout(track))||[];
}
/** Radius kept free of trees and bricks around each landmark; big builds reserve more than the default 23 m. */
const RESERVED_RADIUS={stadium:36,cittaalta:44,amiata:70};
const reservedRadius=(track,kind)=>sceneryModule(track)?.RESERVED?.[kind]??RESERVED_RADIUS[kind]??23;
export function isLocalSceneryReserved(track,x,z) {
  if(!track.theme.local)return false;
  const layout=localLayout(track),{landmarks,shoreline,streets}=layout;
  return landmarks.some(p=>Math.hypot(x-p.x,z-p.z)<reservedRadius(track,p.kind))||streets.some(p=>Math.hypot(x-p.x,z-p.z)<10)||inside(x,z,shoreline)||!!sceneryModule(track)?.isReserved?.(track,layout,x,z);
}

export function createLocalScenery(track) {
  const scene=new THREE.Group();scene.name='local-scenery';
  if(!track.theme.local)return scene;
  const materials=new Map();
  const mat=(color)=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.75}));return materials.get(color);};
  const mesh=(parent,geo,color,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(p,w,h,d,c,x=0,y=h/2,z=0)=>mesh(p,new THREE.BoxGeometry(w,h,d),c,x,y,z);
  const cyl=(p,r,h,c,x=0,y=h/2,z=0,n=10)=>mesh(p,new THREE.CylinderGeometry(r,r,h,n),c,x,y,z);
  const cone=(p,r,h,c,x=0,y=0,z=0,n=4)=>mesh(p,new THREE.ConeGeometry(r,h,n),c,x,y,z);
  const cream=0xf9ead5,roof=0xc56d51,glass=0x547a8b,green=0x6caa66;
  function roofTop(p,w,d,y,c=roof){const m=cone(p,1,2.4,c,0,y+1.2,0);m.rotation.y=Math.PI/4;m.scale.set(w/Math.SQRT2,1,d/Math.SQRT2);}
  function windows(p,w,height,z,rows=2){for(let row=0;row<rows;row++)for(let x=-w/2+1.6;x<w/2;x+=2.8)box(p,.95,1.35,.14,glass,x,height+row*2.1,z);}
  function sign(p,text,z,width=17){
    if(typeof document==='undefined'||!text)return;
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff9e5';ctx.fillRect(0,0,768,128);ctx.fillStyle='#486073';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 43px sans-serif';ctx.fillText(text,384,66,730);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(width,2.6),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));m.position.set(0,2.2,z);p.add(m);
    box(p,.22,3.4,.22,glass,-width/2+.4,1.7,z);box(p,.22,3.4,.22,glass,width/2-.4,1.7,z);
  }
  function tree(p,x,z,tall=false){cyl(p,.24,2.5,0x947653,x,1.25,z);if(tall)cone(p,1.2,7,0x427956,x,5,z,7);else mesh(p,new THREE.IcosahedronGeometry(1.6,1),green,x,3.3,z);}
  function villa(p){
    box(p,22,.22,19,0xe7d8b3,0,.07,2);
    box(p,16,6.6,7,0xf2d387);roofTop(p,18,9,6.6);
    windows(p,16,1.8,3.55);box(p,1.8,3.1,.25,glass,0,1.55,3.7);
    box(p,5,.4,2.3,cream,0,4.4,4.4);
    for(const x of [-8.5,8.5]){box(p,1.1,1.1,14,green,x,.6,1);for(let i=0;i<5;i++)mesh(p,new THREE.IcosahedronGeometry(.55,0),i%2?0xf69db0:0xffdd72,x,1.3,-4+i*2.8);}
    for(const x of [-10,10])tree(p,x,-6,track.theme.local==='como');
  }
  function church(p){
    box(p,10,8,12,0xf3dcb3);roofTop(p,11,13,8);box(p,2.5,3.6,.2,glass,0,1.8,6.1);
    const window=mesh(p,new THREE.CylinderGeometry(1.1,1.1,.2,16),0xbcbbe1,0,6,6.1);window.rotation.x=Math.PI/2;
    box(p,3.5,16,3.5,0xe8b98b,8,8,0);box(p,4.2,.6,4.2,cream,8,15.3,0);cone(p,3.3,5,roof,8,18.5,0);
    for(const x of [7.2,8.8])box(p,.55,1.9,.2,glass,x,13.5,1.8);
    const clock=mesh(p,new THREE.CircleGeometry(1,16),cream,8,10.5,1.78);
    box(p,.12,.7,.1,glass,8,10.75,1.9);box(p,.6,.12,.1,glass,8.23,10.5,1.9);
  }
  function village(p){
    const colors=[0xf4cc91,0xe89b81,0xf8e6b4,0xccdca1];
    for(let i=0;i<4;i++){
      const g=new THREE.Group();g.position.set((i-1.5)*5.4,0,i%2?2:-1);p.add(g);
      const h=5+(i%3)*1.8;box(g,4.8,h,5,colors[i]);roofTop(g,5.3,5.7,h);
      windows(g,5,1.8,2.55,Math.floor(h/2.2));box(g,.8,1.8,.2,glass,0,.9,2.7);
    }
    for(const x of [-12,12])tree(p,x,-4,track.theme.local==='como');
  }
  function park(p){
    box(p,24,.18,22,0x81bd77,0,.08,0);box(p,3,.06,21,0xe9d0a1,0,.2,0);
    for(const x of [-8,8])for(const z of [-7,0,7])tree(p,x,z);
    for(const z of [-4,5]){box(p,4,.35,1.3,roof,5,.9,z);box(p,4,1.1,.25,roof,5,1.4,z-.7);}
    cyl(p,3,.5,cream,0,.4,0,24);cyl(p,2.6,.12,0x68cbd4,0,.72,0,24);cyl(p,.35,2.6,cream,0,1.6,0);mesh(p,new THREE.SphereGeometry(.7,12,8),0x9ae8ed,0,3,0);
  }
  function duomo(p){
    box(p,27,.25,24,0xece5d9,0,.1,2);box(p,20,7.7,15,0xf4eee3);
    box(p,8,3.2,16,cream,0,9.3,0);
    for(let i=-4;i<=4;i++){
      const x=i*2.25,h=9.2+(4-Math.abs(i))*.65;
      box(p,.48,h,.6,0xffffff,x,h/2,7.8);cone(p,.55,2.3,cream,x,h+1.15,7.8);
    }
    for(const side of [-1,1])for(const z of [-6,-1,4]){box(p,.6,10,.6,cream,side*9,5,z);cone(p,.7,2.5,cream,side*9,11.25,z);}
    for(const x of [-6,0,6]){box(p,1.6,3.4,.2,glass,x,1.7,7.6);box(p,1,1.8,.2,0x9bb6c9,x,5.7,7.6);}
    cyl(p,.55,6,cream,0,13,0);cone(p,.9,2.5,cream,0,17.25,0);mesh(p,new THREE.SphereGeometry(.45,8,6),0xffd053,0,19,0);
  }
  function tram(p){
    box(p,22,.1,8,0xb8afb0,0,.1,0);for(const z of [-1.1,1.1])box(p,23,.06,.13,glass,0,.2,z);
    const g=new THREE.Group();g.rotation.y=Math.PI/2;p.add(g);
    box(g,3.4,2.8,12,0xf3bd38,0,2,0);box(g,3.55,.35,12.4,cream,0,3.5,0);
    for(const x of [-1.73,1.73])for(let z=-4.3;z<5;z+=2.1)box(g,.08,1.15,1.5,glass,x,2.6,z);
    box(g,2.8,1.15,.08,glass,0,2.6,6.05);
    for(const z of [-4,4])for(const x of [-1.4,1.4]){const wheel=cyl(g,.58,.22,0x354152,x,.57,z);wheel.rotation.z=Math.PI/2;}
    const arm=box(g,.12,2,.12,glass,0,4.45,0);arm.rotation.z=.5;box(g,3,.12,.12,glass,.45,5.35,0);
  }
  function castle(p){
    box(p,22,6,12,0xbb7055);box(p,4,4,.3,0x594b50,0,2,6.1);
    for(const x of [-11,11]){cyl(p,3,10,0xd39770,x,5,0,12);for(let i=0;i<8;i++)box(p,.8,1.2,.8,0xdfad82,x+2.6*Math.cos(i*Math.PI/4),10.4,2.6*Math.sin(i*Math.PI/4));}
    box(p,5,15,5,0xbf7b58,0,7.5,0);box(p,6,1.2,6,cream,0,14.7,0);cone(p,4,4,roof,0,17,0);
    for(let x=-9;x<=9;x+=2)box(p,.9,1,.9,0xe0ad7e,x,6.4,5.5);
  }
  function skyline(p){
    for(let i=0;i<4;i++){const x=(i-1.5)*6.5,h=[13,25,18,10][i];box(p,5,h,7,[0x83a8b9,0x6f9fae,0xb1c7ba,0xb7b1a3][i],x,h/2,0);for(let y=2;y<h;y+=2.1)box(p,4.5,.35,.12,0xd7edf0,x,y,3.55);}
    cyl(p,.2,12,0xdbe9ec,-3.25,31,0);
    for(const x of [3,9])for(let y=3;y<16;y+=3)box(p,5.5,.55,8,green,x,y,0);
  }
  function pond(p){
    // Park lake (Parco Increa): grass, sandy rim, water, reeds, ducks and a small wooden pier.
    box(p,26,.18,24,0x7fb872,0,.08,0);
    cyl(p,9.8,.1,0xe6d3a4,0,.22,0,28);cyl(p,9,.12,0x3f9fc4,0,.3,0,28);
    for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=9.4+(i%2)*.5;cyl(p,.09,1.6+(i%3)*.3,0x5e8f3c,Math.cos(a)*r,.9,Math.sin(a)*r,5);}
    for(const [x,z] of [[-2,1.5],[3,-2.5],[.5,4]]){mesh(p,new THREE.SphereGeometry(.42,10,7),0xf6f1df,x,.6,z);mesh(p,new THREE.SphereGeometry(.24,8,6),0x3e7a3a,x+.35,.95,z);}
    box(p,1.6,.2,5,0xa97f52,-7,.55,-6);for(const z of [-8,-4])for(const x of [-7.6,-6.4])cyl(p,.12,.8,0x8b6640,x,.35,z,6);
    for(const [x,z] of [[-11,-9],[11,-8],[-11,9],[10,9]])tree(p,x,z,false);
  }
  function school(p){
    // Two-storey primary school with a coloured entrance canopy, flagpole and a small play yard.
    box(p,30,.2,22,0xd8d2c6,0,.08,1);
    box(p,24,6.8,8,0xf3e2c3,0,3.4,-4);roofTop(p,25,9.5,6.8,0xb66a4e);
    windows(p,24,1.7,.05,2);box(p,2.2,3,.25,glass,0,1.5,.15);
    box(p,7,.4,4,0xe0503c,0,3.3,1.9);for(const x of [-3,3])cyl(p,.14,3.1,cream,x,1.55,3.7,6);
    for(let i=0;i<5;i++)box(p,1.2,.9,.3,[0xe0503c,0x1747c9,0xffb347,0x3f9a2e,0xe0503c][i],-4.8+i*2.4,5.3,.12);
    cyl(p,.09,9,0xcfd4d8,10,4.5,4,6);box(p,1.6,1,.06,0x1747c9,10.8,8.6,4);
    box(p,.6,.5,2.4,0xffb347,-9,1.35,6);box(p,.5,1.8,.5,0xffb347,-9,.9,7.4);
    box(p,.1,.9,3.2,0xf4f0e2,-11,1,5);box(p,.1,.9,3.2,0xf4f0e2,11,1,5);
    for(const x of [-13,13])tree(p,x,-6,false);
  }
  function home(p){
    // A family house: two storeys, a garden with a fence, flowers and one big tree.
    box(p,18,.18,16,0x88b96f,0,.07,0);
    box(p,8.5,6.4,7,0xf6d9a6,-1.5,3.2,-1);roofTop(p,9.4,8,6.4);
    windows(p,8.5,1.9,2.55,2);box(p,1.4,2.4,.25,0x8a4b2b,-1.5,1.2,2.6);
    box(p,3.2,.3,1.4,cream,-1.5,2.7,3);box(p,2,.9,.25,0xc56d51,-1.5,3.4,2.6);
    for(let x=-8.6;x<=8.6;x+=1.15)box(p,.14,1.1,.14,0xf4f0e2,x,.6,7.6);box(p,17.4,.12,.1,0xf4f0e2,0,1.05,7.6);
    for(let i=0;i<6;i++)mesh(p,new THREE.IcosahedronGeometry(.45,0),[0xe0503c,0xffb347,0xe98fb0][i%3],-7+i*1.6,.55,5.6);
    box(p,2.2,.05,7,0xe9d0a1,3.3,.2,4.2);
    tree(p,6.5,-4,true);cyl(p,.26,3,0x947653,-6.5,1.5,-5);mesh(p,new THREE.IcosahedronGeometry(2.1,1),green,-6.5,4.2,-5);
  }
  // Crete Senesi: every animal group gets a cypress so the landmark stays visible from the road.
  function cypress(p,x,z,h=7){cyl(p,.2,1.2,0x6b4a2f,x,.6,z,6);cone(p,.95,h,0x2f5a3a,x,1.2+h/2,z,7);}
  function legs(p,x,z,w,d,h,c){for(const sx of [-1,1])for(const sz of [-1,1])cyl(p,.06,h,c,x+sx*w,h/2,z+sz*d,5);}
  function amiata(p){
    const m=cone(p,55,42,0x5c6e8a,0,21,-10,7);m.castShadow=false;
    const s=cone(p,36,28,0x6d7f95,40,14,10,6);s.castShadow=false;
    const t=cone(p,28,20,0x7b8a9c,-42,10,14,6);t.castShadow=false;
    mesh(p,new THREE.SphereGeometry(4,10,7),0xffe9c2,0,44,-10).castShadow=false;
  }
  function sheep(p){
    box(p,22,.16,18,0xd9b66d,0,.07,0);
    for(let i=0;i<6;i++){
      const x=-7+i*2.8,z=(i%2?2.5:-1.5);
      legs(p,x,z,.35,.45,.55,0x2b2b2b);
      const body=mesh(p,new THREE.SphereGeometry(.62,10,7),0xf6f1e6,x,1.05,z);body.scale.set(1,.8,1.3);
      box(p,.42,.4,.5,0x2b2b2b,x,1.15,z+.95);
    }
    for(let x=-10;x<=10;x+=2.5)box(p,.14,1.1,.14,0x8a6a4a,x,.6,-7);box(p,20.5,.1,.1,0x8a6a4a,0,1,-7);
    cypress(p,-9.5,-4);cypress(p,9.5,-5,8);
  }
  function boar(p){
    box(p,22,.16,18,0xc99a5a,0,.07,0);
    const one=(x,z,s,c)=>{legs(p,x,z,.45*s,.5*s,.6*s,c);box(p,.9*s,.8*s,1.5*s,c,x,(.6+.4)*s,z);box(p,.5*s,.45*s,.55*s,c,x,.95*s,z+.95*s);box(p,.12*s,.12*s,.3*s,0xf6efe0,x+.2*s,.8*s,z+1.2*s);box(p,.12*s,.12*s,.3*s,0xf6efe0,x-.2*s,.8*s,z+1.2*s);};
    one(-3,0,1,0x4a3327);one(1,2,1,0x4a3327);one(4.5,-1,.9,0x4a3327);
    for(const [x,z] of [[-1,-2.5],[2.5,-3],[0,3.5]]){one(x,z,.5,0x8a6a4a);for(let i=0;i<3;i++)box(p,.05,.3,.6,0x4a3327,x-.2+i*.2,.45,z);}
    for(const [x,z] of [[6,3],[8,-3]]){const h=cyl(p,.9,1.6,0xe0c070,x,.8,z,10);h.rotation.z=Math.PI/2;}
    cypress(p,-9.5,-5);cypress(p,9.5,-5,6.5);
  }
  function fox(p){
    box(p,20,.16,16,0xd9b66d,0,.07,0);
    const bale=cyl(p,1,2,0xe0c070,0,1,0,12);bale.rotation.z=Math.PI/2;
    legs(p,0,0,.25,.35,.5,0x3a2a1a);
    const body=mesh(p,new THREE.SphereGeometry(.45,10,7),0xd9642a,0,2.4,0);body.scale.set(1,.85,1.6);
    box(p,.4,.35,.5,0xd9642a,0,2.6,.8);for(const x of [-.15,.15])cone(p,.08,.3,0xd9642a,x,2.9,.85,4);
    const tail=cone(p,.22,.9,0xd9642a,0,2.45,-.95,6);tail.rotation.x=-Math.PI/2;mesh(p,new THREE.SphereGeometry(.16,6,5),0xf6efe0,0,2.45,-1.45);
    for(const [x,z] of [[-5,2],[5,-2],[-4,-4]]){const h=cyl(p,.9,1.6,0xe0c070,x,.8,z,10);h.rotation.z=Math.PI/2;}
    cypress(p,-8.5,-4);cypress(p,8.5,-4,8);
  }
  function deer(p){
    box(p,22,.16,18,0xb07e48,0,.07,0);
    const one=(x,z,s)=>{legs(p,x,z,.3*s,.5*s,.9*s,0x7a4f2a);const body=mesh(p,new THREE.SphereGeometry(.5*s,10,7),0xa86f3f,x,1.2*s,z);body.scale.set(1,.85,1.5);
      cyl(p,.16*s,.7*s,0xa86f3f,x,1.7*s,z+.75*s,6);box(p,.34*s,.3*s,.45*s,0xa86f3f,x,2.05*s,z+.9*s);
      for(let i=0;i<5;i++)mesh(p,new THREE.SphereGeometry(.07*s,5,4),0xf6efe0,x+(i%2?.3:-.3)*s,1.35*s,z+(i-2)*.25*s);};
    one(-2,0,1);one(2.5,1.5,.8);one(0,-3,.7);
    for(const x of [-4,0,4])mesh(p,new THREE.IcosahedronGeometry(.9,0),0x3f6b45,x,.6,5);
    cypress(p,-9.5,-5);cypress(p,9.5,-5,7.5);
  }
  function hoopoe(p){
    box(p,18,.16,16,0xd9b66d,0,.07,0);
    cyl(p,.18,2.8,0x8a6a4a,0,1.4,0,6);box(p,1.2,.12,.12,0x8a6a4a,0,2.75,0);
    const body=mesh(p,new THREE.SphereGeometry(.28,8,6),0xd9a066,0,3.05,0);body.scale.set(1,.9,1.5);
    mesh(p,new THREE.SphereGeometry(.16,8,6),0xd9a066,0,3.3,.4);cone(p,.03,.5,0x2b2b2b,0,3.3,.85,4).rotation.x=Math.PI/2;
    for(let i=0;i<5;i++){box(p,.05,.35,.06,0xd9a066,0,3.55,.35-i*.08);box(p,.05,.08,.06,0x2b2b2b,0,3.75,.35-i*.08);}
    for(const x of [-.3,.3]){box(p,.08,.14,.6,0x2b2b2b,x,3.05,-.1);box(p,.09,.04,.6,0xf6efe0,x,3.13,-.1);}
    for(let x=-7;x<=7;x+=3.5)for(let z=-5;z<=5;z+=5)mesh(p,new THREE.IcosahedronGeometry(.6,0),0x9a8a5c,x,.45,z);
    cypress(p,-7.5,-4,6);cypress(p,7.5,-4,7);
  }
  // Bergamo by night: the stadium, Porta Nuova's twin gate buildings, the funicular and the walled upper town.
  const lampGlow=0xfff1b0,stone=0xb9ab8d;
  function lamp(p,x,z,h=4.2){cyl(p,.1,h,0x3a3f52,x,h/2,z,6);const glow=mesh(p,new THREE.SphereGeometry(.28,10,7),lampGlow,x,h+.2,z);glow.castShadow=false;}
  function stadium(p){
    const blue=0x1e5bd8,black=0x14161d;
    box(p,52,.2,40,0x2a2f3a,0,.08,0);
    box(p,34,.12,22,0x2f8f3c,0,.24,0);for(const z of [-10.8,10.8])box(p,34,.06,.3,0xf4f0e2,0,.32,z);for(const x of [-16.8,0,16.8])box(p,.3,.06,22,0xf4f0e2,x,.32,0);
    const ring=mesh(p,new THREE.RingGeometry(2.6,2.9,24),0xf4f0e2,0,.33,0);ring.rotation.x=-Math.PI/2;
    for(const [x,z,w,d] of [[0,-15.5,46,7],[0,15.5,46,7],[-21.5,0,7,24],[21.5,0,7,24]]){
      box(p,w,3.2,d,blue,x,1.6,z);box(p,w*.92,3,d*.92,black,x,4.6,z);box(p,w*.84,2.6,d*.84,blue,x,7.4,z);
    }
    box(p,48,.4,9,0x2a2f3a,0,10.2,-15.5);for(let x=-20;x<=20;x+=8)box(p,.5,4,.5,0x7d84a8,x,8.2,-19.5);
    for(const [x,z] of [[-25,-19],[25,-19],[-25,19],[25,19]]){cyl(p,.35,18,0x7d84a8,x,9,z,6);box(p,3.2,1.4,.6,lampGlow,x,18.6,z).castShadow=false;}
    for(let i=0;i<9;i++)box(p,3.8,1.6,.25,i%2?blue:black,-16+i*4,9.4,15.6);
  }
  function propileo(p){
    box(p,14,.2,10,0xcfc7b8,0,.08,0);
    box(p,11,6.5,6,0xe9e2d2,0,3.25,-1);roofTop(p,12,7.5,6.5,0x8b8f99);
    for(let x=-4.5;x<=4.5;x+=1.8)cyl(p,.38,6.2,0xf4efe4,x,3.1,2.8,10);box(p,11.4,.5,1.4,0xf4efe4,0,6.45,2.8);
    box(p,1.8,3.2,.2,0x3a3f52,0,1.6,2.05);windows(p,10,3.6,2.05,1);
    for(const x of [-6,6])lamp(p,x,3.6);
  }
  function funicular(p){
    box(p,24,.2,18,0x3d4a3a,0,.08,0);
    // Lower station, a sloping track up the hill and the cabin halfway.
    box(p,6,3.6,4,0xd8c8a8,-8,1.8,4);roofTop(p,6.6,4.6,3.6);
    const slope=box(p,14,.6,3.2,0x5a6a56,1,4.2,-2);slope.rotation.z=-.62;
    for(const dz of [-1,1]){const rail=box(p,14.6,.12,.14,0xc9c9c9,1,4.62,-2+dz);rail.rotation.z=-.62;}
    box(p,9,.4,8,0x5a6a56,6,8.4,-3);box(p,5,4,5,stone,7,10.4,-4);box(p,5.6,.4,5.6,0xd8c8a8,7,12.6,-4);
    const cabin=box(p,2.4,2.2,3,0xe0503c,-.5,6.1,-2);cabin.rotation.z=-.62;box(p,1.8,1,.12,0x9fe8ec,-.5,6.4,-.45).rotation.z=-.62;
    lamp(p,-11,-4);lamp(p,10,3);tree(p,-9,-6,true);
  }
  function cittaalta(p){
    // Plateau with Venetian walls, the Campanone, Palazzo della Ragione and the pink-and-white Colleoni chapel.
    mesh(p,new THREE.CylinderGeometry(30,36,9,28),0x3f5a38,0,4.5,0);
    for(let i=0;i<20;i++){const a=i/20*Math.PI*2,x=Math.sin(a)*29,z=Math.cos(a)*29;const wall=box(p,9.6,4.2,2.2,stone,x,9+2.1,z);wall.rotation.y=a;for(let j=-1;j<=1;j++){const m=box(p,1.4,1,1.2,stone,x+Math.cos(a)*j*3.2,13.6,z-Math.sin(a)*j*3.2);m.rotation.y=a;}}
    box(p,4,22,4,0xc9b99b,4,9+11,-4);box(p,4.8,.6,4.8,0xd8c8a8,4,31.3,-4);cone(p,3.2,3.5,0xc56d51,4,33.4,-4,4).rotation.y=Math.PI/4;
    const clock=mesh(p,new THREE.CircleGeometry(1.1,18),0xf4f0e2,4,26,-1.95);clock.rotation.y=0;box(p,.14,.8,.1,0x3a3f52,4,26.3,-1.9);box(p,.7,.14,.1,0x3a3f52,4.3,26,-1.9);
    mesh(p,new THREE.SphereGeometry(.5,8,6),lampGlow,4,34.9,-4).castShadow=false;
    box(p,13,7,8,0xd8c8a8,-8,9+3.5,1);roofTop(p,14,9,16,0xc56d51);for(let x=-13;x<=-3;x+=2.5)box(p,1.4,3.2,.3,0x3a3f52,x,10.8,5.1);windows(p,13,13.5,5.1,1);
    box(p,8,6,8,0xf1d9d3,-3,12,-11);for(let y=9.6;y<15;y+=1.2)box(p,8.1,.35,8.1,0xffffff,-3,y,-11);
    mesh(p,new THREE.SphereGeometry(3.8,16,12),0xd9d4cc,-3,17,-11);cyl(p,.4,2.5,0xd9d4cc,-3,21.5,-11,8);
    box(p,10,.3,10,0xe6ddc9,8,9.15,10);for(const [x,z] of [[4,13],[12,13],[4,7],[12,7]])lamp(p,x,z,3.2);
    for(const [x,z] of [[-16,12],[18,-12],[-18,-14],[16,14]])cypress(p,x,z,6);
    // Lamps along the wall top so the upper town glows at night.
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.2;lamp(p,Math.sin(a)*27,Math.cos(a)*27,3.4);}
  }
  // Aprica: a ski slope with poles, a chairlift pylon, wooden chalets and a mountain stream.
  const snow=0xf4f7fb,wood=0x7a5433,darkWood=0x4e3520;
  function skislope(p){
    box(p,26,.2,24,snow,0,.08,0);
    const slope=box(p,14,.4,22,0xffffff,4,3.2,0);slope.rotation.z=-.42;
    for(let i=0;i<6;i++){const x=-2+i*2.4,z=-9+i*3.6;cyl(p,.08,2.4,i%2?0xe0503c:0x1e5bd8,x,3.2+(x-4)*-.45+1.2,z,5);}
    for(const [x,z] of [[-9,-8],[-10,4],[-8,9]])cypress(p,x,z,6.5);
    box(p,3,.2,2,0xe0503c,-4,1,-10);box(p,.12,1.6,.12,darkWood,-4,1.8,-10);box(p,1.4,.8,.08,0xffffff,-3.3,2.4,-10);
  }
  function chairlift(p){
    box(p,22,.2,18,snow,0,.08,0);
    cyl(p,.4,14,0x8d9299,0,7,0,8);box(p,6,.4,.4,0x8d9299,0,13.6,0);
    for(const x of [-2.6,2.6]){const wheel=cyl(p,.6,.3,0x3a3f45,x,13.4,0,10);wheel.rotation.x=Math.PI/2;}
    box(p,.06,.06,26,0x3a3f45,0,13.2,0);
    for(const z of [-9,0,9]){box(p,1.6,1.2,.9,0xe0503c,-2.6,11.4,z);box(p,.08,.9,.08,0x3a3f45,-2.6,12.4,z);}
    cypress(p,-8,-6,7);cypress(p,8,5,6);
  }
  function chalet(p){
    box(p,20,.2,16,snow,0,.08,0);
    box(p,9,3.8,7,wood,0,1.9,0);for(let y=.6;y<3.6;y+=.7)box(p,9.1,.12,7.1,darkWood,0,y,0);
    roofTop(p,10.5,8.5,3.8,snow);box(p,10.4,.3,8.4,darkWood,0,4.1,0);
    box(p,1.2,2,.15,darkWood,0,1,3.55);windows(p,8,1.6,3.55,1);
    box(p,8,.3,1.4,darkWood,0,2.3,4.2);for(let x=-3.6;x<=3.6;x+=1.2)box(p,.1,.8,.1,darkWood,x,2.85,4.85);
    cyl(p,.35,1.6,0x8d9299,2.6,5.6,-1.5,6);
    for(let i=0;i<4;i++){const log=cyl(p,.32,.8,wood,-7+i*.7,.5,-5,7);log.rotation.x=Math.PI/2;}
    cypress(p,-8,4,7);cypress(p,8,-5,6.5);
  }
  function river(p){
    box(p,26,.16,22,snow,0,.06,0);
    const water=new THREE.Shape();water.moveTo(-13,-3);water.quadraticCurveTo(-4,-8,3,-2);water.quadraticCurveTo(9,3,13,1);water.lineTo(13,5);water.quadraticCurveTo(8,7,2,2);water.quadraticCurveTo(-4,-3,-13,1);
    const m=mesh(p,new THREE.ShapeGeometry(water),0x4fa8d8,0,.2,0);m.rotation.x=-Math.PI/2;m.castShadow=false;
    for(const [x,z] of [[-9,0],[-3,-4],[4,2],[9,4],[0,-1]])mesh(p,new THREE.SphereGeometry(.5,7,5),0x9aa3ad,x,.35,z);
    for(const [x,z] of [[-10,-8],[-2,8],[8,-7],[11,8]])cypress(p,x,z,6);
    box(p,5,.3,1.2,wood,0,1.1,-1);for(const x of [-2,2])box(p,.15,1,.15,wood,x,.6,-1.5);
  }
  const builders={villa,church,park,village,duomo,tram,castle,skyline,pond,school,home,amiata,sheep,boar,fox,deer,hoopoe,stadium,propileo,funicular,cittaalta,skislope,chairlift,chalet,river};
  const SIGN_DISTANCE={duomo:13,pond:13,school:12,amiata:62,stadium:24,cittaalta:40,funicular:12};
  const layout=localLayout(track);
  const placeLandmark=(item,builder,signDistance=SIGN_DISTANCE[item.kind]??11,signWidth=item.kind==='tram'?18:17)=>{
    const g=new THREE.Group();g.name=`landmark-${item.kind}`;g.userData.landmark=item.kind;
    g.position.set(item.x,track.groundHeight?.(item.x,item.z)||0,item.z);
    g.rotation.y=item.rotation;
    builder?.(g,item);sign(g,item.name,signDistance,signWidth);scene.add(g);return g;
  };
  // Animated scenery: modules register callbacks; the renderer calls scene.userData.animate every frame.
  const animators=[];
  scene.userData.animate=(clock,dt,racers,currentTrack)=>{for(const fn of animators)fn(clock,dt,racers||[],currentTrack||track);};
  const kit={THREE,mat,mesh,box,cyl,cone,roofTop,windows,sign,tree,lamp,cypress,legs,cream,roof,glass,green,stone,lampGlow,wood,darkWood,snow,
    builders,placeLandmark,inside,track,layout,groundAt:(x,z)=>track.groundHeight?.(x,z)||0,
    dynamic:(object)=>{object.traverse(m=>{if(m.isMesh)m.userData.dynamic=true;});return object;},
    animate:(fn)=>{animators.push(fn);}};
  const module=sceneryModule(track);
  if(module?.build)module.build(kit,scene,track,layout);
  else for(const item of layout.landmarks)placeLandmark(item,builders[item.kind]);
  for(const item of localLayout(track).streets) {
    const g=new THREE.Group();g.name='street-houses';g.userData.street=true;g.position.set(item.x,track.groundHeight?.(item.x,item.z)||0,item.z);
    const f=track.frame(item.distance);g.rotation.y=Math.atan2(f.x-item.x,f.z-item.z);scene.add(g);
    const urban=track.theme.local==='milano',town=track.theme.local==='villasanta',h=urban?7+(item.index%4)*2.5:town?5.5+(item.index%3)*1.2:4.5+(item.index%3);
    box(g,12,.15,10,0xe1d4bf,0,.07,0);
    for(const x of [-2.9,2.9]) {
      const home=new THREE.Group();home.position.x=x;g.add(home);
      box(home,5.4,h,6,[0xe2b991,0xe6d7af,0xd6b1a6,0xc4d3b7][item.index%4]);
      roofTop(home,5.9,6.5,h);windows(home,5.5,2,3.07,Math.floor(h/2.1));
      box(home,1,1.8,.15,glass,0,.9,3.15);
      if(urban)box(home,5.5,.22,.9,cream,0,4,3.5);
    }
  }
  if(track.theme.local==='como'&&!module?.build) {
    const {shoreline}=localLayout(track);
    const shape=new THREE.Shape(shoreline.map(p=>new THREE.Vector2(p.x,-p.z)));
    const lake=mesh(scene,new THREE.ShapeGeometry(shape),0x44b9d0,0,.015,0);lake.rotation.x=-Math.PI/2;lake.castShadow=false;lake.name='lake-water';
    const path=new THREE.CatmullRomCurve3(shoreline.map(p=>new THREE.Vector3(p.x,.07,p.z)),true);
    mesh(scene,new THREE.TubeGeometry(path,256,.5,5,true),0xe7d5af).castShadow=false;
    const waterContains=(x,z)=>inside(x,z,shoreline);
    for(let i=0;i<9;i++){
      const p=shoreline[Math.floor(i*shoreline.length/9)],x=p.x*.65,z=p.z*.65;
      if(!waterContains(x,z))continue;
      const boat=new THREE.Group();boat.name='lake-boat';boat.position.set(x,.2,z);boat.rotation.y=i*.85;scene.add(boat);
      const hull=mesh(boat,new THREE.SphereGeometry(1,10,6),i%2?0xffd56e:0xf4f7ed,0,.3,0);hull.scale.set(1.1,.5,3);
      cyl(boat,.07,5,cream,0,2.7,0);const sail=new THREE.BufferGeometry();sail.setAttribute('position',new THREE.Float32BufferAttribute([0,5,0,0,1.3,0,0,1.3,2.7],3));sail.computeVertexNormals();
      const sailMesh=new THREE.Mesh(sail,new THREE.MeshStandardMaterial({color:i%2?0xfff8dc:0xffa589,side:THREE.DoubleSide}));boat.add(sailMesh);
    }
    for(let i=0;i<85;i++){
      const f=track.frame(i*track.length/85),lane=-track.roadWidth/2-.9;
      const x=f.x+f.dz*lane,z=f.z-f.dx*lane;cyl(scene,.13,1.3,cream,x,.65,z,6);
    }
    const railPath=new THREE.CatmullRomCurve3(track.points(200).map(f=>{const lane=-track.roadWidth/2-.9;return new THREE.Vector3(f.x+f.dz*lane,1.05,f.z-f.dx*lane);}),true);
    mesh(scene,new THREE.TubeGeometry(railPath,400,.09,5,true),cream).castShadow=false;
  }
  return scene;
}
