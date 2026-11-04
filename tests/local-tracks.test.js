import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {getTrack,TRACKS} from '../src/track.js';
import {RaceSimulation} from '../src/race.js';
import '../src/scenery/all.js'; // every scenery registered at once, as the RetroPie export does
import {createLocalScenery,localLayout,isLocalSceneryReserved} from '../src/local-scenery.js';

for(const id of ['brugherio','milano','como','increa','villasanta','crete','bergamo','aprica','stadio','notte','adda','bernina','arca','regnano','magra','alba','intervallo','varese','roma']) {
 test(`${id}: landmarks remain off the road and two players finish the circuit`,()=>{
  const track=getTrack(id),scene=createLocalScenery(track),points=track.points(500);
  scene.updateMatrixWorld(true);
  for(const item of localLayout(track).landmarks) {
   assert.ok(scene.getObjectByName(`landmark-${item.kind}`));
   assert.ok(isLocalSceneryReserved(track,item.x,item.z));
   const group=scene.children.find(g=>g.userData.landmark===item.kind && Math.abs(g.position.x-item.x)<.01);
   const bounds=new THREE.Box3().setFromObject(group);
   assert.ok(Number.isFinite(bounds.min.x)&&bounds.max.y>3);
   group.traverse(m=>{
    if(!m.isMesh)return;
    m.geometry.computeBoundingBox();
    const b=m.geometry.boundingBox;
    for(const x of [b.min.x,b.max.x])for(const z of [b.min.z,b.max.z]) {
     const world=new THREE.Vector3(x,0,z).applyMatrix4(m.matrixWorld);
     const distance=Math.min(...points.map(p=>Math.hypot(p.x-world.x,p.z-world.z)));
     assert.ok(distance>track.roadWidth/2+1,`${item.kind} clear of racing lanes: ${distance.toFixed(1)}`);
    }
   });
  }
  const sim=new RaceSimulation({players:2,track,seed:47});
  for(let i=0;i<800&&sim.state!=='finished';i++)sim.update(.25,[{useItem:i%2===0},{useItem:i%3===0}]);
  assert.equal(sim.state,'finished');
  assert.ok(sim.racers.slice(0,2).every(p=>p.finished&&p.lap===track.laps));
  const geometries=new Set(),materials=new Set();scene.traverse(m=>{if(m.geometry)geometries.add(m.geometry);if(m.material)materials.add(m.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 });
}
test('the lake of Como stays inside its protected shore',()=>{
 const track=getTrack('como'),{shoreline}=localLayout(track),points=track.points(500);
 for(const p of shoreline)assert.ok(Math.min(...points.map(q=>Math.hypot(q.x-p.x,q.z-p.z)))>track.roadWidth/2+3);
});
