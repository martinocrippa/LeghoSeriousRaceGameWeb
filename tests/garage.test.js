import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { parseGarage, cleanAxle, AXLE_LIMITS, RIDE_BELOW, RIDE_ABOVE } from '../src/garage.js';
import { createCarModel } from '../src/cars.js';
import { expectedWheelCount } from '../src/wheels.js';

const base = { id: 'custom-1', name: 'Bolide', color: '#d23b2f', accent: '#f2c230', shape: 'racer' };
const one = (car) => parseGarage(JSON.stringify([car]))[0];

test('formats 1 and 2 load exactly as they always did', () => {
  assert.deepEqual(one({ ...base, width: 1.8, length: 3.1 }), {
    id: 'custom-1', name: 'Bolide', color: '#d23b2f', accent: '#f2c230', shape: 'racer', description: '', tagline: '', tag: '', provenance: '', qualityNote: '',
    sourceUrl: undefined, width: 1.8, length: 3.1, height: 1, version: 1, parts: [], palette: undefined, thumbnail: '',
  });
  const v2 = one({ ...base, version: 2, height: 1.2, parts: ['fan', 'nope', 'fan'], palette: ['#111111', '#222222'], thumbnail: 'data:image/png;base64,AAAA' });
  assert.equal(v2.version, 2);
  assert.deepEqual(v2.parts, ['fan']);
  assert.deepEqual(v2.palette, ['#111111', '#222222']);
  assert.equal(v2.thumbnail, 'data:image/png;base64,AAAA');
});

test('a format 2 car does not get wheels just by carrying the fields: they need format 3', () => {
  const car = one({ ...base, version: 2, axles: [{ z: 0.3, spread: 0.5 }], ride: 0.6, knobby: true, suit: '#000000' });
  for (const key of ['axles', 'ride', 'knobby', 'suit']) assert.equal(key in car, false, key);
});

test('format 3 keeps axles, trailer, ride, knobby, rims, suit and helmet', () => {
  const car = one({
    ...base, version: 3, knobby: true, rims: '#c9cdd1', suit: '#1f5fd0', helmet: '#f2f2ee', ride: 0.55,
    axles: [{ z: 0.33, spread: 0.54, radius: 0.44, width: 0.34, steer: true, rim: '#9aa3ab' }, { z: -0.3, spread: 0.54, radius: 0.46, width: 0.36, drive: true }],
    trailer: { length: 3.2, body: 'container', axles: [{ z: -0.62, spread: 0.44 }, { z: -0.86, spread: 0.44 }] },
  });
  assert.equal(car.version, 3);
  assert.deepEqual(car.axles, [{ z: 0.33, spread: 0.54, radius: 0.44, width: 0.34, rim: '#9aa3ab', steer: true }, { z: -0.3, spread: 0.54, radius: 0.46, width: 0.36, drive: true }]);
  assert.deepEqual(car.trailer, { axles: [{ z: -0.62, spread: 0.44 }, { z: -0.86, spread: 0.44 }], length: 3.2, body: 'container' });
  assert.equal(car.ride, 0.55);
  assert.equal(car.knobby, true);
  assert.deepEqual([car.rims, car.suit, car.helmet], ['#c9cdd1', '#1f5fd0', '#f2f2ee']);
  assert.equal(expectedWheelCount(car), 8);
});

test('axle numbers out of range come back inside it; a spread below the minimum stays a pair', () => {
  assert.deepEqual(cleanAxle({ z: 9, spread: 0.1, radius: 5, width: -1 }), { z: 0.6, spread: 0.3, radius: 0.72, width: 0.16 });
  assert.deepEqual(cleanAxle({ z: -9, spread: 2 }), { z: -0.6, spread: 0.65 });
  assert.deepEqual(cleanAxle({ z: 0, spread: -0.4 }), { z: 0, spread: 0 });
  assert.deepEqual(cleanAxle({ z: 0 }), { z: 0, spread: 0 });
});

test('hostile axles: wrong types, NaN, strings and extra keys are dropped, never passed on', () => {
  const hostile = [
    null, 7, 'axle', [0.3, 0.5], { spread: 0.5 }, { z: '0.3' }, { z: NaN }, { z: 0.2, spread: '0.5' },
    { z: 0.1, spread: 0.5, radius: 'big', width: Infinity, rim: 'red', steer: 'true', drive: 1, onload: 'alert(1)', __proto__: { polluted: true } },
  ];
  const car = one({ ...base, version: 3, axles: hostile });
  assert.deepEqual(car.axles, [{ z: 0.1, spread: 0.5 }]);
  assert.equal({}.polluted, undefined);
  // JSON keeps a literal "__proto__" key as an own property: it must not become the axle's prototype either.
  const parsed = parseGarage('[{"id":"x","name":"n","color":"#000000","accent":"#ffffff","shape":"racer","version":3,"axles":[{"z":0,"__proto__":{"steer":true}}]}]')[0];
  assert.deepEqual(parsed.axles, [{ z: 0, spread: 0 }]);
  assert.equal(parsed.axles[0].steer, undefined);
});

test('no more than six axles on the car and six on the trailer, however many are sent', () => {
  const many = Array.from({ length: 5000 }, (_, i) => ({ z: (i % 10) / 20, spread: 0.5 }));
  const car = one({ ...base, version: 3, axles: many, trailer: { axles: many } });
  assert.equal(car.axles.length, AXLE_LIMITS.count);
  assert.equal(car.trailer.axles.length, AXLE_LIMITS.count);
  assert.ok(car.trailer.axles.every((axle) => axle.z >= AXLE_LIMITS.trailerZ[0] && axle.z <= AXLE_LIMITS.trailerZ[1]));
});

test('axles must be a list; a trailer needs the car\'s own axles; only known presets are taken', () => {
  assert.equal('axles' in one({ ...base, version: 3, axles: { 0: { z: 0 }, length: 1 } }), false);
  assert.equal('trailer' in one({ ...base, version: 3, trailer: { axles: [{ z: -0.7, spread: 0.4 }] } }), false);
  assert.equal(one({ ...base, version: 3, wheels: 'f1' }).wheels, 'f1');
  assert.equal('wheels' in one({ ...base, version: 3, wheels: 'toString' }), false);
  assert.equal('wheels' in one({ ...base, version: 3, wheels: ['f1'] }), false);
  // Explicit axles win over a preset.
  const both = one({ ...base, version: 3, wheels: 'trike', axles: [{ z: 0.3, spread: 0.5 }, { z: -0.3, spread: 0.5 }] });
  assert.equal('wheels' in both, false);
});

test('a wild ride is brought back so the body sits on its wheels', () => {
  const axles = [{ z: 0.3, spread: 0.5, radius: 0.4 }, { z: -0.3, spread: 0.5, radius: 0.5 }];
  assert.equal(one({ ...base, version: 3, axles, ride: 40 }).ride, 0.5 + RIDE_ABOVE);
  assert.equal(one({ ...base, version: 3, axles, ride: -3 }).ride, 0.5 - RIDE_BELOW);
  assert.equal('ride' in one({ ...base, version: 3, axles, ride: 'high' }), false);
  // Without axles the body's own wheel counts; an f1 preset's fat rear wheels (1.3×) do too.
  assert.equal(one({ ...base, version: 3, ride: 9 }).ride, 0.34 + RIDE_ABOVE);
  assert.ok(Math.abs(one({ ...base, version: 3, wheels: 'f1', ride: 9 }).ride - (0.34 * 1.3 + RIDE_ABOVE)) < 1e-12);
});

test('the rest of a hostile garage: bad JSON, not a list, unsafe ids and addresses, too many cars', () => {
  assert.deepEqual(parseGarage('{oops'), []);
  assert.deepEqual(parseGarage('{"a":1}'), []);
  assert.deepEqual(parseGarage(null), []);
  assert.equal(parseGarage(JSON.stringify([{ ...base, id: 'x"] , [data-x="' }])).length, 0);
  assert.equal(one({ ...base, sourceUrl: 'javascript:alert(1)' }).sourceUrl, undefined);
  assert.equal(one({ ...base, sourceUrl: 'sample/turbo-elica.jpg' }).sourceUrl, 'sample/turbo-elica.jpg');
  assert.equal(parseGarage(JSON.stringify(Array.from({ length: 40 }, (_, i) => ({ ...base, id: `c${i}` })))).length, 12);
  assert.equal('detail' in one({ ...base, version: 3, detail: 'f1' }), false);
});

test('a format 3 car builds: the right number of wheels, every tyre standing on the road', () => {
  const car = one({
    ...base, version: 3, ride: 0.6, knobby: true, rims: '#c9cdd1',
    axles: [{ z: 0.4, spread: 0, radius: 0.35, steer: true }, { z: 0, spread: 0.5, radius: 0.5 }, { z: -0.4, spread: 0.5, radius: 0.5, drive: true }],
    trailer: { axles: [{ z: -0.8, spread: 0.45, radius: 0.3 }] },
  });
  const model = createCarModel(car);
  model.updateMatrixWorld(true);
  const wheels = model.userData.wheels;
  assert.equal(wheels.length, expectedWheelCount(car));
  assert.equal(wheels.length, 7);
  for (const wheel of wheels) {
    const box = new THREE.Box3().setFromObject(wheel);
    assert.ok(Math.abs(box.min.y) < 0.02, `tyre bottom at ${box.min.y}`);
  }
});
