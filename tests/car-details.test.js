import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_CARS, CAR_PRESETS, CAR_DETAILS, DETAIL_SHAPE, createCarModel } from '../src/cars.js';
import { expectedWheelCount, wheelPlan } from '../src/wheels.js';

const catalog = [...SAMPLE_CARS, ...CAR_PRESETS];

test('no catalogue car names a body that does not exist', () => {
  for (const spec of catalog) {
    if (!spec.detail) continue;
    assert.ok(CAR_DETAILS.has(spec.detail), `${spec.id}: detail sconosciuto "${spec.detail}"`);
  }
});

test('a body that only works inside one shape is declared with that shape', () => {
  for (const spec of catalog) {
    const need = DETAIL_SHAPE[spec.detail];
    if (!need) continue;
    assert.equal(spec.shape, need, `${spec.id}: "${spec.detail}" funziona solo con shape "${need}"`);
  }
});

test('the three cars that did nothing are fixed: they build what their description promises', () => {
  const by = (id) => catalog.find((spec) => spec.id === id);
  // "alettone nero" — so it must actually have a wing part now, not a bare racer.
  assert.deepEqual(by('cometa').parts, ['highWing', 'driver']);
  assert.equal(by('cometa').detail, undefined);
  // "ruotone" — the big wheels are a part, and a detail used to wipe the parts list.
  assert.deepEqual(by('cactus').parts, ['bigWheels', 'driver']);
  assert.equal(by('cactus').detail, undefined);
  // "il furgone" — no existing shape makes a van, so it got a real body of its own.
  assert.equal(by('mirtillo').detail, 'van');
  for (const id of ['cometa', 'cactus', 'mirtillo']) {
    const model = createCarModel(by(id));
    assert.ok(model.userData.body.children.length > 0, `${id}: il modello deve avere una carrozzeria`);
  }
});

test('the wheel count of every catalogue car matches what the layout promises', () => {
  const EXPECTED_BY_DETAIL = { convoy: 6, trike: 3 };
  for (const spec of catalog) {
    const model = createCarModel(spec);
    const expected = expectedWheelCount(spec);
    assert.equal(model.userData.wheels.length, expected, `${spec.id}: ruote`);
    const byDetail = EXPECTED_BY_DETAIL[spec.detail];
    if (byDetail) assert.equal(expected, byDetail, `${spec.id}: ${spec.detail} vuole ${byDetail} ruote`);
  }
});

test('a declarative axle list can make two, three, six or eight wheels', () => {
  const cases = [
    { name: 'moto', axles: [{ z: 0.4, spread: 0 }, { z: -0.36, spread: 0 }], wheels: 2 },
    { name: 'ape', axles: [{ z: 0.44, spread: 0 }, { z: -0.34, spread: 0.46 }], wheels: 3 },
    { name: 'tir', axles: [{ z: 0.4, spread: 0.5 }, { z: -0.1, spread: 0.5 }, { z: -0.34, spread: 0.5 }], wheels: 6 },
    { name: 'bilico', axles: [{ z: 0.4, spread: 0.5 }, { z: -0.3, spread: 0.5 }], trailer: { axles: [{ z: -0.9, spread: 0.5 }, { z: -1.2, spread: 0.5 }] }, wheels: 8 },
  ];
  for (const { name, axles, trailer, wheels } of cases) {
    const spec = { id: `prova-${name}`, name, color: '#ff0000', accent: '#000000', shape: 'racer', axles, trailer };
    assert.equal(wheelPlan(spec).kind, 'axles');
    assert.equal(expectedWheelCount(spec), wheels, `${name}: ${wheels} ruote`);
  }
});
