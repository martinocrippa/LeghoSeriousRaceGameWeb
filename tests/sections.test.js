import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrack, getTrack, TRACKS } from '../src/track.js';
import { RaceSimulation } from '../src/race.js';
import { racerPose, sectionAt } from '../src/sections.js';

const square = { id: 'ring', name: 'Ring', length: 400, roadWidth: 14, laps: 2, controlPoints: [[0, -60], [60, 0], [0, 60], [-60, 0]] };
const near = (a, b, tolerance, label) => assert.ok(Math.abs(a - b) <= tolerance, `${label}: ${a} vs ${b}`);

test('a shortcut bridge leaves and rejoins the road tangentially and is shorter than the road it skips', () => {
  const track = createTrack({ ...square, shortcuts: [{ id: 'ponte', name: 'PONTE', from: 40, to: 200 }] });
  const [bridge] = track.sections;
  assert.equal(bridge.kind, 'bridge');
  assert.ok(bridge.optional);
  assert.ok(bridge.gain > 1.05 && bridge.pathLength < 160, `gain ${bridge.gain}`);
  for (const [fraction, distance] of [[0, 40], [1, 200]]) {
    const pose = bridge.pose(fraction, 0);
    const frame = track.frame(distance);
    near(pose.x, frame.x + frame.dz * bridge.entryLane, 0.05, 'x');
    near(pose.z, frame.z - frame.dx * bridge.entryLane, 0.05, 'z');
    near(pose.forward.x, frame.dx, 0.15, 'heading x');
    near(pose.forward.z, frame.dz, 0.15, 'heading z');
  }
  near(bridge.pose(0.5, 0).y, bridge.arch, 0.01, 'arch at the middle');
  assert.throws(() => createTrack({ ...square, shortcuts: [{ id: 'x', from: 10, to: 20 }] }), /20 m apart/);
  assert.throws(() => createTrack({ ...square, shortcuts: [{ id: 'x', from: 40, to: 62 }] }), /shorter than the road/);
});

test('a loop-the-loop starts and ends on the road, goes upside down at the top and forbids items inside', () => {
  const track = createTrack({ ...square, loops: [{ id: 'giro', name: 'GIRO', distance: 100, radius: 10, lead: 24 }] });
  const [loop] = track.sections;
  assert.equal(loop.kind, 'loop');
  assert.ok(!loop.optional);
  assert.equal(loop.to, 148);
  assert.ok(loop.gain < 1 && loop.gain > 0.3, `gain ${loop.gain}`);
  const start = loop.pose(0, 0), end = loop.pose(1, 0);
  const frameStart = track.frame(100), frameEnd = track.frame(148);
  near(start.x, frameStart.x, 0.05, 'start x'); near(start.z, frameStart.z, 0.05, 'start z');
  near(end.x, frameEnd.x, 0.05, 'end x'); near(end.z, frameEnd.z, 0.05, 'end z');
  const approach = Math.hypot(24, 9), circle = 2 * Math.PI * 10;
  const top = loop.pose((approach + circle / 2) / loop.pathLength, 0);
  near(top.y, 20, 0.05, 'height at the top');
  near(top.up.y, -1, 0.02, 'upside down at the top');
  const frameCircle = track.frame(124);
  assert.ok(-(top.forward.x * frameCircle.dx + top.forward.z * frameCircle.dz) > 0.85, 'driving backwards at the top');
  let previous = loop.pose(0, 0);
  for (let i = 1; i <= 200; i += 1) {
    const pose = loop.pose(i / 200, 0);
    const step = Math.hypot(pose.x - previous.x, pose.y - previous.y, pose.z - previous.z);
    assert.ok(step < loop.pathLength / 200 * 1.6, `continuous path, step ${step}`);
    previous = pose;
  }
  assert.equal(sectionAt(track.sections, 120), loop);
  assert.equal(sectionAt(track.sections, 160), null);
  assert.throws(() => createTrack({ ...square, loops: [{ id: 'giro', distance: 100 }], boxes: [{ id: 'b', distance: 120, lane: 0 }] }), /inside loop/);
  assert.throws(() => createTrack({ ...square, loops: [{ id: 'a', distance: 100 }, { id: 'b', distance: 130 }] }), /overlap/);
});

test('cars take a bridge only from its entry lane, gain ground, and are safe from the road while crossing', () => {
  const track = createTrack({ ...square, shortcuts: [{ id: 'ponte', name: 'PONTE', from: 40, to: 200 }] });
  const sim = new RaceSimulation({ players: 2, opponents: 0, track, seed: 3 });
  for (let i = 0; i < 4 * 60; i++) sim.update(1 / 60);
  const [taker, stayer] = sim.racers;
  taker.progress = stayer.progress = 30;
  taker.lane = -4.5;
  stayer.lane = 3;
  taker.speed = stayer.speed = 24;
  let entered = false;
  for (let i = 0; i < 60 && !entered; i++) {
    sim.update(1 / 60);
    entered = taker.section === 'ponte';
  }
  assert.ok(entered, 'the car in the lake-side lane drives onto the bridge');
  assert.equal(stayer.section, null, 'the car on the other side stays on the road');
  assert.ok(sim.drainEvents().some((event) => event.type === 'section' && event.kind === 'bridge' && event.racerId === taker.id));
  assert.ok(Math.abs(taker.lane) <= 2, 'lane is relative to the bridge centre and clamped to the deck');
  const pose = racerPose(track, taker);
  assert.ok(pose && pose.section.id === 'ponte' && pose.y >= 0);
  for (let i = 0; i < 6 * 60 && taker.section; i++) sim.update(1 / 60);
  assert.equal(taker.section, null, 'the bridge ends');
  assert.ok(taker.progress >= 200 && taker.progress > stayer.progress + 40, `shortcut gains ground: ${taker.progress} vs ${stayer.progress}`);
  assert.ok(Math.abs(taker.lane) <= track.roadWidth / 2, 'back on the road');
  assert.ok(sim.drainEvents().some((event) => event.type === 'section-exit' && event.racerId === taker.id));
});

test('every car goes through a loop, progress slows to the loop path and the pose follows it; seeds stay deterministic', () => {
  const track = createTrack({ ...square, loops: [{ id: 'giro', name: 'GIRO', distance: 100, radius: 10, lead: 24 }] });
  const sim = new RaceSimulation({ players: 1, opponents: 2, track, seed: 5 });
  for (let i = 0; i < 4 * 60; i++) sim.update(1 / 60);
  const player = sim.racers[0];
  player.progress = 99.5;
  player.speed = 24;
  player.lane = 2;
  sim.update(0.1);
  assert.equal(player.section, 'giro');
  const before = player.progress;
  sim.update(0.25);
  sim.update(0.25);
  const advanced = player.progress - before;
  assert.ok(advanced < 24 * 0.5 * 0.7 && advanced > 24 * 0.5 * 0.3, `progress advances at the loop gain: ${advanced}`);
  for (let i = 0; i < 60; i++) sim.update(1 / 60);
  const pose = racerPose(track, player);
  assert.ok(pose && pose.y > 0.5, 'the car is up on the loop');
  for (let i = 0; i < 8 * 60 && player.section; i++) sim.update(1 / 60);
  assert.equal(player.section, null);
  assert.ok(player.progress >= 148);
  for (let i = 0; i < 200 * 60 && sim.state !== 'finished'; i++) sim.update(1 / 60);
  assert.equal(sim.state, 'finished');
  assert.ok(sim.racers.every((racer) => racer.finished || !racer.isPlayer));
  const a = new RaceSimulation({ track, seed: 8 }), b = new RaceSimulation({ track, seed: 8 });
  for (let i = 0; i < 40 * 60; i++) { a.update(1 / 60, [{ steer: Math.sin(i / 30) }]); b.update(1 / 60, [{ steer: Math.sin(i / 30) }]); }
  assert.deepEqual(a.racers.map((racer) => [racer.progress, racer.lane, racer.section]), b.racers.map((racer) => [racer.progress, racer.lane, racer.section]));
});

test('the Lake Como bridges and the stadium loop drive to the finish with two players', () => {
  for (const id of ['como', 'stadio']) {
    const track = getTrack(id);
    assert.equal(track.id, id);
    assert.ok(track.sections.length >= 1, `${id} has special sections`);
    const sim = new RaceSimulation({ players: 2, track, seed: 21 });
    let sections = 0;
    for (let i = 0; i < 1200 && sim.state !== 'finished'; i++) {
      sim.update(0.25, [{ steer: -1, useItem: i % 5 === 0 }, { steer: 0.3 }]);
      sections += sim.drainEvents().filter((event) => event.type === 'section').length;
    }
    assert.equal(sim.state, 'finished', `${id} finishes`);
    assert.ok(sections > 0, `${id}: somebody used a section`);
    assert.ok(sim.racers.slice(0, 2).every((racer) => racer.finished && racer.lap === track.laps));
  }
  assert.ok(TRACKS.some((track) => track.id === 'stadio'));
});

test('surfaces and bankings compile and answer along the lap', () => {
  const track = createTrack({ ...square, surfaces: [{ from: 50, to: 120, kind: 'cobbles' }, { from: 300, to: 340, kind: 'asphalt' }], bankings: [{ from: 200, to: 280, angle: 24 }] });
  assert.equal(track.surfaceAt(60), 'cobbles');
  assert.equal(track.surfaceAt(310), 'asphalt');
  assert.equal(track.surfaceAt(10), 'default');
  assert.equal(track.bank(100), 0);
  near(track.bank(240), 24 * Math.PI / 180, 1e-9, 'full bank in the middle');
  assert.ok(track.bank(205) > 0 && track.bank(205) < track.bank(240), 'ramps in');
  assert.throws(() => createTrack({ ...square, surfaces: [{ from: 50, to: 120, kind: 'ice' }] }), /surface/);
  assert.throws(() => createTrack({ ...square, bankings: [{ from: 200, to: 220, angle: 24 }] }), /banking/);
});
