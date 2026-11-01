import test from 'node:test';
import assert from 'node:assert/strict';
import { raceTimes, formatSeconds, formatRaceTime, formatGap, addTimes } from '../src/gaps.js';
import { createCup, recordRaceResult } from '../src/cup.js';
import { RaceSimulation } from '../src/race.js';
import { CAR_PRESETS } from '../src/cars.js';

const done = (time) => ({ time, estimated: false });
const guess = (time) => ({ time, estimated: true });

test('gaps carry a plus behind, a real minus ahead and a decimal comma', () => {
  assert.deepEqual(formatGap(done(73.8), done(72)), { text: '+1,8 s', kind: 'behind' });
  assert.deepEqual(formatGap(done(71.1), done(72)), { text: '−0,9 s', kind: 'ahead' });
  assert.equal(formatGap(done(71.1), done(72)).text.charCodeAt(0), 0x2212);
});

test('gaps round to the tenth, and a gap that rounds to nothing has no sign', () => {
  assert.equal(formatGap(done(72.04), done(72)).text, '0,0 s');
  assert.equal(formatGap(done(72.04), done(72)).kind, 'even');
  assert.equal(formatGap(done(72.05001), done(72)).text, '+0,1 s');
  assert.equal(formatGap(done(81.96), done(72)).text, '+10,0 s');
  assert.equal(formatGap(done(70.04), done(72)).text, '−2,0 s');
});

test('from a minute up the gap is written in minutes and seconds', () => {
  assert.equal(formatGap(done(131.96), done(72)).text, '+1:00,0');
  assert.equal(formatGap(done(137.34), done(72)).text, '+1:05,3');
  assert.equal(formatGap(done(12), done(200.5)).text, '−3:08,5');
  assert.equal(formatSeconds(59.94), '59,9');
  assert.equal(formatSeconds(59.96), '1:00,0');
});

test('an estimated time is marked with a tilde, in the gap and in the time itself', () => {
  assert.equal(formatGap(guess(76), done(72)).text, '~ +4,0 s');
  assert.equal(formatGap(done(76), guess(72)).text, '~ +4,0 s');
  assert.equal(formatRaceTime(done(72.44)), '1:12,4');
  assert.equal(formatRaceTime(guess(5.3)), '~0:05,3');
});

test('who is still racing gets an estimate from their average speed, never ahead of the racer in front', () => {
  const racers = [
    { id: 'p1', rank: 1, finished: true, finishTime: 60, progress: 1000 },
    { id: 'ai1', rank: 2, finished: false, finishTime: null, progress: 900 },
    // Further back but, on average, faster: the estimate still lands after ai1.
    { id: 'ai2', rank: 3, finished: false, finishTime: null, progress: 899 },
  ];
  const times = raceTimes(racers, 60, 1000);
  assert.deepEqual(times.get('p1'), { time: 60, estimated: false });
  assert.equal(times.get('ai1').estimated, true);
  assert.ok(Math.abs(times.get('ai1').time - (60 + 100 / 15)) < 1e-9);
  assert.ok(times.get('ai2').time > times.get('ai1').time);
});

test('a real race: the gaps follow the ranking and only who did not finish is estimated', () => {
  const race = new RaceSimulation({ players: 1, cars: [CAR_PRESETS[0]], aiCars: CAR_PRESETS, seed: 77, opponents: 5 });
  for (let i = 0; i < 4000 && race.state !== 'finished'; i++) race.update(1 / 20, [{ steer: 0 }]);
  assert.equal(race.state, 'finished');
  const times = raceTimes(race.racers, race.time, race.finishDistance);
  const ranked = [...race.racers].sort((a, b) => a.rank - b.rank);
  for (let i = 1; i < ranked.length; i++) assert.ok(times.get(ranked[i].id).time >= times.get(ranked[i - 1].id).time);
  for (const racer of race.racers) assert.equal(times.get(racer.id).estimated, !racer.finished);
});

test('the cup adds up each racer\'s times, and one estimated race makes the total an estimate', () => {
  const field = [{ id: 'p1', name: 'P1', isPlayer: true, playerIndex: 0, rank: 1 }, { id: 'ai1', name: 'AI', rank: 2 }];
  let cup = createCup({ trackIds: ['a', 'b'] });
  cup = recordRaceResult(cup, field, new Map([['p1', done(60)], ['ai1', done(62.5)]]));
  cup = recordRaceResult(cup, field, new Map([['p1', done(70)], ['ai1', guess(74)]]));
  const p1 = cup.standings.find((s) => s.id === 'p1'), ai = cup.standings.find((s) => s.id === 'ai1');
  assert.deepEqual(p1.total, done(130));
  assert.deepEqual(ai.total, guess(136.5));
  assert.equal(formatGap(ai.total, p1.total).text, '~ +6,5 s');
  // Without times (older callers) the totals simply stay empty.
  assert.equal(recordRaceResult(createCup({ trackIds: ['a'] }), field).standings[0].total, null);
  assert.equal(addTimes(null, undefined), null);
});
