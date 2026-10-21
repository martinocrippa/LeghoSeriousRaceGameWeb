import test from 'node:test';
import assert from 'node:assert/strict';
import { RaceSimulation, MACHINEGUN_DURATION, pickItem, STUCK_TIME, SPIN_TIME } from '../src/race.js';

function ready() {
  const sim = new RaceSimulation({ players: 2 });
  sim.state = 'racing'; sim.countdown = 0;
  sim.boxes = []; sim.ramps = []; sim.boosts = [];
  sim.racers.forEach((r,i)=>{r.progress=100+i*20;r.lane=i%2?4:-4;r.speed=21.5;});
  return sim;
}

test('machinegun fires 25 shots for five simulation seconds and cannot be extended by holding the button',()=>{
  for(const dt of [1/60,0.25]) {
    const sim=ready(),p=sim.racers[0];
    p.item='machinegun';
    let shots=0;
    for(let t=0;t<Math.round(MACHINEGUN_DURATION/dt);t++) {
      sim.update(dt,[{useItem:true}]);
      shots+=sim.drainEvents().filter(e=>e.type==='machinegun-shot'&&e.racerId===p.id).length;
    }
    assert.equal(p.machinegun,0);
    assert.equal(p.item,null);
    assert.equal(shots,25);
    for(let i=0;i<60;i++)sim.update(1/60,[{useItem:true}]);
    assert.ok(!sim.drainEvents().some(e=>e.type==='machinegun-shot'&&e.racerId===p.id));
    assert.equal(sim.projectiles.filter(p=>p.type==='bullet').length,0);
  }
});

test('bullets hit only the forward lane, respect shields, and do not lock a child in repeated hits',()=>{
  const sim=ready(),[p,target]=sim.racers;
  target.lane=p.lane;target.progress=p.progress+12;target.shield=6;p.item='machinegun';
  sim.update(1/60,[{useItem:true}]);
  for(let i=0;i<60;i++)sim.update(1/60);
  assert.equal(target.shield,0);
  assert.equal(target.stun,0);
  const events=sim.drainEvents();
  assert.equal(events.filter(e=>e.type==='shield-hit'&&e.racerId===target.id).length,1);
  assert.ok(!events.some(e=>e.type==='hit'&&e.racerId===p.id));
  for(let i=0;i<120;i++)sim.update(1/60);
  const hits=sim.drainEvents().filter(e=>e.type==='hit'&&e.racerId===target.id);
  assert.ok(hits.length>=1&&hits.length<=2);
  assert.ok(target.speed>10);
  const separate=ready();separate.racers[0].item='machinegun';
  separate.update(.25,[{useItem:true}]);
  for(let i=0;i<4;i++)separate.update(.25);
  assert.ok(!separate.drainEvents().some(e=>e.type==='hit'&&e.racerId==='p2'));
});

test('expired projectiles and bombs cannot hit for one extra frame',()=>{
  const sim=ready(),target=sim.racers[1];
  sim.projectiles.push({id:'expired',type:'rocket',ownerId:'p1',distance:target.progress,lane:target.lane,y:.85,ttl:0});
  sim.hazards.push({id:'expired-bomb',type:'bomb',ownerId:'p1',distance:target.progress,lane:target.lane,ttl:0,age:2});
  sim.update(1/60);
  assert.equal(target.stun,0);
  assert.equal(sim.projectiles.length,0);assert.equal(sim.hazards.length,0);
});

test('jelly glues the car behind for half a second, melts, respects shields, spares its owner and expired blobs do nothing',()=>{
  const sim=ready(),[owner,victim]=sim.racers;
  // The owner is behind the victim; the victim is pushed back behind the blob so it drives into it.
  owner.lane=victim.lane=0;owner.progress=140;victim.progress=120;
  owner.item='jelly';
  sim.update(1/60,[{useItem:true},{}]);
  const blob=sim.hazards.find(h=>h.type==='jelly');
  assert.ok(blob&&blob.ownerId===owner.id&&Math.abs(blob.distance-136)<1);
  assert.equal(sim.racers[0].item,null);
  assert.ok(sim.drainEvents().some(e=>e.type==='use-item'&&e.item==='jelly'));
  // The owner drives away; the victim reaches the blob after the arming delay.
  owner.progress=200;
  for(let i=0;i<180&&victim.stuck===0;i++)sim.update(1/60);
  assert.ok(victim.stuck>STUCK_TIME-0.1&&victim.stuck<=STUCK_TIME,`stuck for half a second: ${victim.stuck}`);
  assert.equal(sim.hazards.filter(h=>h.type==='jelly').length,0,'the blob is used up');
  const events=sim.drainEvents();
  assert.ok(events.some(e=>e.type==='stuck'&&e.racerId===victim.id&&e.ownerId===owner.id));
  assert.ok(events.some(e=>e.type==='pop'&&e.source==='jelly'));
  const stuckAt=victim.progress;
  for(let i=0;i<20;i++)sim.update(1/60,[{},{steer:1}]);
  assert.ok(victim.speed<1,`glued in place: speed ${victim.speed}`);
  assert.ok(victim.progress-stuckAt<1,'barely moves while stuck');
  assert.ok(Math.abs(victim.lane)<0.2,'cannot steer while stuck');
  for(let i=0;i<90;i++)sim.update(1/60);
  assert.equal(victim.stuck,0);
  assert.ok(victim.speed>10,'drives again once the jelly has melted');
  assert.ok(sim.drainEvents().some(e=>e.type==='unstuck'&&e.racerId===victim.id));
  // A shield absorbs the jelly.
  const shielded=ready(),[o2,v2]=shielded.racers;
  o2.lane=v2.lane=0;o2.progress=140;v2.progress=120;v2.shield=6;o2.item='jelly';
  shielded.update(1/60,[{useItem:true},{}]);o2.progress=200;
  for(let i=0;i<180&&v2.shield>0;i++)shielded.update(1/60);
  assert.equal(v2.shield,0);assert.equal(v2.stuck,0);
  assert.ok(shielded.drainEvents().some(e=>e.type==='shield-hit'&&e.source==='jelly'&&e.racerId===v2.id));
  // The owner is not glued by a fresh blob of its own.
  const selfish=ready(),me=selfish.racers[0];
  me.lane=0;me.progress=100;me.item='jelly';me.speed=0;
  selfish.update(1/60,[{useItem:true},{}]);
  me.progress=96;
  for(let i=0;i<60;i++){selfish.update(1/60,[{brake:true},{}]);me.progress=96;}
  assert.equal(me.stuck,0);
  // An expired blob cannot glue anybody.
  const expired=ready(),target=expired.racers[1];
  expired.hazards.push({id:'old-jelly',type:'jelly',ownerId:'p1',distance:target.progress,lane:target.lane,y:0,ttl:0,age:3});
  expired.update(1/60);
  assert.equal(target.stuck,0);assert.equal(expired.hazards.length,0);
});

test('machinegun is available in boxes, does not extend an active burst, and resets at the finish',()=>{
  const sim=ready(),p=sim.racers[0];
  sim.boxes=[{distance:100.1,lane:p.lane,available:true,cooldown:0,id:'test-box'}];
  // Tied to the crate table instead of to a remembered number, so adding an item cannot silently break this test.
  assert.equal(pickItem(.53),'machinegun');
  sim._random=()=>.53;
  sim.update(1/60);
  assert.equal(p.item,'machinegun');
  sim.update(.25,[{useItem:true}]);
  const remaining=p.machinegun;
  p.item='machinegun';sim.update(1/60,[{useItem:false}]);sim.update(1/60,[{useItem:true}]);
  assert.ok(p.machinegun<remaining);assert.equal(p.item,'machinegun');
  p.progress=sim.trackLength*sim.totalLaps-.05;sim.update(1/60);
  assert.equal(p.finished,true);assert.equal(p.machinegun,0);
  assert.equal(new RaceSimulation().racers[0].machinegun,0);
});

/** Drops a slick and lets it settle: hazards are inert for the first half second after they land. */
function slickOnTheRoad(sim, at) {
  const me = sim.racers[0];
  me.item = 'oil';
  me.progress = at;
  sim.update(1 / 60, [{ useItem: true }]);
  const slick = sim.hazards.find((h) => h.type === 'oil');
  for (let i = 0; i < 40; i++) sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
  return slick;
}

test('the oil slick takes the steering away without stopping the car, and stays on the road for the next one', () => {
  const sim = ready(), rival = sim.racers[1];
  const slick = slickOnTheRoad(sim, 200);
  assert.ok(slick, 'the slick is left behind the car');

  // A rival drives over it: speed survives, steering does not. This is the plain slide, not the spin-out.
  sim._random = () => 0.9;
  rival.progress = slick.distance - 0.5;
  rival.lane = slick.lane;
  rival.steering = 0.8;
  const before = rival.speed;
  for (let i = 0; i < 12 && rival.slipping <= 0; i++) sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
  assert.ok(rival.slipping > 0, 'it is sliding');
  assert.ok(rival.speed > before * 0.8, 'the oil does not brake the car');
  assert.equal(rival.stun, 0, 'and it is not a hit');
  // Steering the other way does nothing while the slick has hold of it.
  for (let i = 0; i < 20; i++) sim.update(1 / 60, [{ steer: 0 }, { steer: -1 }]);
  assert.ok(rival.steering > 0, 'the wheel is ignored: the car keeps sliding the way it was going');
  assert.ok(sim.hazards.some((h) => h.type === 'oil'), 'oil does not pop like a bomb');
});

test('one time in two the oil spins the car right round and halves its speed', () => {
  const sim = ready(), rival = sim.racers[1];
  const slick = slickOnTheRoad(sim, 250);
  sim._random = () => 0.1;
  rival.progress = slick.distance - 0.5;
  rival.lane = slick.lane;
  const before = rival.speed;
  for (let i = 0; i < 12 && rival.spinning <= 0; i++) sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
  assert.ok(rival.spinning > 0, 'testacoda');
  assert.ok(rival.slipping > 0, 'and no steering either');
  assert.ok(rival.speed < before * 0.6, 'a spin costs half the speed');
  assert.ok(sim.events.some((e) => e.type === 'slipping' && e.racerId === rival.id && e.spin === true));
  for (let i = 0; i < Math.round(SPIN_TIME * 60) + 2; i++) sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
  assert.equal(rival.spinning, 0, 'one turn and it is over');
  assert.equal(rival.damage, 0, 'oil never breaks the car');
});

test('a shield soaks up the oil', () => {
  const sim = ready(), rival = sim.racers[1];
  const slick = slickOnTheRoad(sim, 300);
  rival.shield = 5;
  rival.progress = slick.distance - 0.5;
  rival.lane = slick.lane;
  for (let i = 0; i < 12 && rival.shield > 0; i++) sim.update(1 / 60, [{ steer: 0 }, { steer: 0 }]);
  assert.equal(rival.shield, 0, 'the shield is spent');
  assert.equal(rival.slipping, 0, 'and the car does not slide');
});
