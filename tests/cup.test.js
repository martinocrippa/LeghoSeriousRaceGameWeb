import test from 'node:test';
import assert from 'node:assert/strict';
import { CUP_POINTS, CUP_RACES, createCup, cupTrackIds, isCupFinished, pointsForRank, raceSeed, recordRaceResult, sortStandings } from '../src/cup.js';

const field = (ranks) => Object.entries(ranks).map(([id, rank], index) => ({ id, name: id.toUpperCase(), spec: { id }, isPlayer: id.startsWith('p'), playerIndex: id.startsWith('p') ? index : -1, rank }));

test('points follow the table and vanish beyond sixth place', () => {
  assert.deepEqual(CUP_POINTS, [10, 7, 5, 3, 2, 1]);
  assert.equal(pointsForRank(1), 10);
  assert.equal(pointsForRank(6), 1);
  assert.equal(pointsForRank(7), 0);
  assert.equal(pointsForRank(0), 0);
});

test('a cup draws five different circuits at random, the same ones for the same seed', () => {
  const all = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'l'];
  assert.equal(CUP_RACES, 5);
  const drawn = cupTrackIds(all, 42);
  assert.equal(drawn.length, 5);
  assert.equal(new Set(drawn).size, 5, 'nessuna pista ripetuta');
  assert.ok(drawn.every((id) => all.includes(id)));
  assert.deepEqual(cupTrackIds(all, 42), drawn, 'stesso seme, stesse piste');
  const draws = new Set(Array.from({ length: 20 }, (_, seed) => cupTrackIds(all, seed + 1).join()));
  assert.ok(draws.size > 15, 'semi diversi, campionati diversi');
  const firsts = new Set(Array.from({ length: 60 }, (_, seed) => cupTrackIds(all, seed + 1)[0]));
  assert.ok(firsts.size >= 8, 'la prima pista cambia anche lei');
  assert.deepEqual(cupTrackIds(['a', 'b'], 7).sort(), ['a', 'b'], 'con meno piste, tutte quelle che ci sono');
});

test('three stages accumulate points, advance the index and finish the cup', () => {
  let cup = createCup({ trackIds: ['a', 'b', 'c'], seed: 42 });
  assert.equal(cup.index, 0);
  assert.equal(isCupFinished(cup), false);
  cup = recordRaceResult(cup, field({ p1: 2, ai1: 1, ai2: 3 }));
  cup = recordRaceResult(cup, field({ p1: 1, ai1: 2, ai2: 3 }));
  assert.equal(cup.index, 2);
  assert.equal(isCupFinished(cup), false);
  cup = recordRaceResult(cup, field({ p1: 1, ai1: 3, ai2: 2 }));
  assert.equal(isCupFinished(cup), true);
  const standings = sortStandings(cup.standings);
  assert.deepEqual(standings.map((entry) => [entry.id, entry.points]), [['p1', 27], ['ai1', 22], ['ai2', 17]]);
  assert.deepEqual(standings[0].placements, [2, 1, 1]);
  assert.equal(standings[0].isPlayer, true);
  assert.equal(cup.results.length, 3);
});

test('ties break on more first places, then on the id, and recording never mutates the previous cup', () => {
  const start = createCup({ trackIds: ['a', 'b'], seed: 7 });
  const next = recordRaceResult(start, field({ p1: 1, ai1: 2 }));
  assert.equal(start.standings.length, 0, 'previous cup untouched');
  const tied = sortStandings([
    { id: 'ai1', points: 10, placements: [3, 1] },
    { id: 'p1', points: 10, placements: [2, 2] },
    { id: 'ai2', points: 10, placements: [1, 3] },
  ]);
  assert.deepEqual(tied.map((entry) => entry.id), ['ai1', 'ai2', 'p1']);
  assert.equal(next.index, 1);
});

test('race seeds are deterministic per stage and differ between stages', () => {
  const cup = createCup({ trackIds: ['a', 'b', 'c'], seed: 1234 });
  assert.equal(raceSeed(cup, 0), raceSeed(createCup({ trackIds: ['a', 'b', 'c'], seed: 1234 }), 0));
  assert.notEqual(raceSeed(cup, 0), raceSeed(cup, 1));
  assert.ok(raceSeed(cup, 2) > 0);
  assert.equal(createCup({ trackIds: ['a'], seed: 0 }).seed, 1);
});
