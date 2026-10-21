import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CAR_PRESETS, createCarModel } from '../src/cars.js';

/**
 * Stripes, rim colours, extra lamps, roof lights and windscreens. Ten catalogue cars described these in Italian and
 * wore none of them: the description promised and the model delivered a plain shell. These tests keep the promise
 * checkable, both in the builder and in the catalogue.
 */

const SHAPES = ['classic', 'racer', 'buggy', 'truck'];
const base = (extra = {}) => ({ id: 'prova-decalco', name: 'Prova', color: '#12457f', accent: '#f4f4f0', palette: ['#12457f', '#f4f4f0', '#e5203a'], shape: 'classic', width: 1.7, length: 3.1, height: 1.05, source: 'sample', ...extra });

function inspect(spec) {
  const model = createCarModel(spec);
  const bounds = new THREE.Box3().setFromObject(model);
  let vertices = 0;
  const colors = new Set();
  model.traverse((object) => {
    if (!object.isMesh) return;
    vertices += object.geometry.getAttribute('position').count;
    if (object.material?.color) colors.add(`#${object.material.color.getHexString()}`);
  });
  const rims = model.userData.wheels.map((wheel) => `#${wheel.children[1].material.color.getHexString()}`);
  const geometries = new Set(), materials = new Set();
  model.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) materials.add(object.material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  return { vertices, colors, rims, floor: bounds.min.y, size: bounds.getSize(new THREE.Vector3()) };
}

test('stripes are drawn on every generic body and never lift the car off the road', () => {
  for (const shape of SHAPES) {
    const plain = inspect(base({ shape }));
    const striped = inspect(base({ shape, stripes: ['#e5203a', '#f4f4f0'] }));
    assert.ok(striped.vertices > plain.vertices, `${shape}: le strisce devono aggiungere geometria`);
    assert.ok(striped.colors.has('#e5203a'), `${shape}: il colore della striscia centrale deve comparire`);
    assert.ok(striped.floor >= -0.025 && striped.floor < 0.025, `${shape}: le gomme restano per terra`);
  }
});

test('"due strisce bianche" draws two stripes, not three', () => {
  const pair = inspect(base({ stripes: { sides: '#f4f4f0' } }));
  const triple = inspect(base({ stripes: ['#e5203a', '#f4f4f0'] }));
  const plain = inspect(base());
  assert.ok(pair.vertices > plain.vertices, 'la coppia di strisce aggiunge geometria');
  // Same body, same quirks: the only difference is the middle stripe of the three-stripe version.
  assert.ok(triple.vertices > pair.vertices, 'tre strisce sono più di due');
});

test('stripes: true borrows the next two palette colours', () => {
  const auto = inspect(base({ stripes: true }));
  assert.ok(auto.colors.has('#f4f4f0') && auto.colors.has('#e5203a'), 'la palette dichiarata viene usata');
});

test('a car can name its own rim colour', () => {
  assert.deepEqual(new Set(inspect(base({ rims: '#e5203a' })).rims), new Set(['#e5203a']));
  assert.deepEqual(new Set(inspect(base()).rims), new Set(['#f4f4f0']), 'senza rims il cerchio resta del colore accento');
});

test('four headlamps, roof lights and a windscreen build a sound model', () => {
  const plain = inspect(base());
  assert.ok(inspect(base({ lights: 4 })).vertices > plain.vertices, 'quattro fari sono più di due');
  for (const extra of [{ roofLights: true }, { windscreen: true, shape: 'racer' }, { windscreen: true, shape: 'buggy' }]) {
    const model = inspect(base(extra));
    assert.ok(model.floor >= -0.025 && model.floor < 0.025, `${JSON.stringify(extra)}: gomme per terra`);
    assert.ok(Number.isFinite(model.size.y) && model.size.y < 4, `${JSON.stringify(extra)}: resta di misura giocabile`);
  }
});

test('the catalogue cars that describe a decal now declare it', () => {
  const by = (id) => CAR_PRESETS.find((spec) => spec.id === id);
  // "strisce blu e rosse e quattro fari gialli sul muso"
  assert.deepEqual(by('turismo').stripes, ['#1e5bd8', '#e5203a']);
  assert.equal(by('turismo').lights, 4);
  // "due strisce bianche sul cofano"
  assert.deepEqual(by('vipera').stripes, { sides: '#f4f4f0' });
  // "strisce bianche, cerchi rossi"
  assert.equal(by('dakar').rims, '#e5203a');
  assert.ok(by('dakar').stripes, 'Ombra del Deserto ha le sue strisce');
  // "frecce azzurre", "gialla e nera"
  assert.ok(by('lama').stripes && by('sole').stripes);
  // "fari sul tetto", "parabrezza di sbieco"
  assert.equal(by('trattore').roofLights, true);
  assert.equal(by('pantera').windscreen, true);
});
