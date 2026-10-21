import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CAR_PRESETS, SAMPLE_CARS, createCarModel } from '../src/cars.js';
import { PART_IDS, normalizeParts } from '../src/parts.js';
import { expectedWheelCount } from '../src/wheels.js';

const catalogGeometry = JSON.parse(readFileSync(new URL('./fixtures/catalog-geometry.json', import.meta.url), 'utf8'));

function geometrySignature(model) {
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  let vertices = 0, meshes = 0;
  model.traverse(object => { if (object.isMesh) { meshes++; vertices += object.geometry.getAttribute('position').count; } });
  return { size: size.toArray().map(v => Math.round(v * 1000) / 1000), vertices, meshes };
}

function disposeModel(model) {
  const geometries = new Set(), materials = new Set();
  model.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (Array.isArray(object.material)) object.material.forEach(material => materials.add(material));
    else if (object.material) materials.add(object.material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

test('every garage car produces a finite 3D model, with tires on the road', () => {
  const catalog = [...CAR_PRESETS, ...SAMPLE_CARS];
  assert.equal(new Set(catalog.map(car => car.id)).size, catalog.length, 'garage IDs must be unique');
  for (const spec of catalog) {
    const model = createCarModel(spec);
    try {
      assert.ok(model.isGroup, spec.id);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      for (const value of [...bounds.min.toArray(), ...bounds.max.toArray()]) assert.ok(Number.isFinite(value), `${spec.id}: finite bounds`);
      assert.ok(bounds.min.y >= -0.025 && bounds.min.y < 0.025, `${spec.id}: tire contact with the road`);
      // A trailer legitimately runs past the body envelope; the tractor alone must still fit inside it.
      const maxZ = spec.trailer ? 8 : 5.6;
      const minX = spec.detail === 'moto' ? 0.9 : 1;
      assert.ok(size.x > minX && size.x < 3 && size.y > 0.5 && size.y < 4 && size.z > 2 && size.z < maxZ, `${spec.id}: usable race dimensions (${size.z.toFixed(2)} m lunga)`);
      assert.equal(model.userData.wheels.length, expectedWheelCount(spec), `${spec.id}: all wheels can animate`);
      for (const wheel of model.userData.wheels) {
        const centerBefore = wheel.position.clone();
        wheel.rotation.x += Math.PI;
        assert.deepEqual(wheel.position, centerBefore, `${spec.id}: rolling does not move wheel center`);
      }
      model.traverse(object => {
        if (!object.geometry) return;
        for (const value of object.geometry.getAttribute('position').array) assert.ok(Number.isFinite(value), `${spec.id}: finite vertices`);
      });
    } finally {
      disposeModel(model);
    }
  }
});

test('catalog cars keep the exact geometry recorded in the regression fixture', () => {
  const catalog = [...SAMPLE_CARS, ...CAR_PRESETS];
  assert.deepEqual(Object.keys(catalogGeometry).sort(), catalog.map(car => car.id).sort(), 'fixture covers the whole catalog');
  for (const spec of catalog) {
    const model = createCarModel(spec);
    try { assert.deepEqual(geometrySignature(model), catalogGeometry[spec.id], spec.id); }
    finally { disposeModel(model); }
  }
});

test('every accessory combination on every shape yields a finite model with tires on the road', () => {
  const combos = [[], ...PART_IDS.map(id => [id])];
  for (let i = 0; i < PART_IDS.length; i++) for (let j = i + 1; j < PART_IDS.length; j++) combos.push([PART_IDS[i], PART_IDS[j]]);
  combos.push([...PART_IDS]);
  const sizes = [{ width: 1.7, length: 3.2, height: 1.15 }];
  const extremes = [{ width: 1.3, length: 2.3, height: 0.7 }, { width: 2.3, length: 3.8, height: 1.7 }];
  let models = 0;
  for (const shape of ['buggy', 'racer', 'truck', 'classic']) {
    for (const parts of combos) {
      for (const dims of parts.length === PART_IDS.length ? [...sizes, ...extremes] : sizes) {
        const spec = { id: `photo-${shape}-${parts.join('+')}`, name: 'Prova', version: 2, shape, parts, color: '#2255cc', accent: '#ffcc22', palette: ['#2255cc', '#ffcc22', '#22aa55'], ...dims };
        const model = createCarModel(spec);
        models++;
        try {
          const label = `${shape} [${parts.join(', ')}] ${JSON.stringify(dims)}`;
          const bounds = new THREE.Box3().setFromObject(model);
          const size = bounds.getSize(new THREE.Vector3());
          for (const value of [...bounds.min.toArray(), ...bounds.max.toArray()]) assert.ok(Number.isFinite(value), `${label}: finite bounds`);
          assert.ok(bounds.min.y >= -0.025 && bounds.min.y < 0.025, `${label}: tire contact with the road (min y ${bounds.min.y})`);
          assert.ok(size.x > 1 && size.x < 3 && size.y > 0.5 && size.y < 4.6 && size.z > 2 && size.z < 5, `${label}: usable race dimensions ${size.toArray()}`);
          assert.equal(model.userData.wheels.length, parts.includes('threeWheels') ? 3 : 4, `${label}: wheel count`);
          if (parts.length === PART_IDS.length) model.traverse(object => {
            if (!object.geometry) return;
            for (const value of object.geometry.getAttribute('position').array) assert.ok(Number.isFinite(value), `${label}: finite vertices`);
          });
        } finally {
          disposeModel(model);
        }
      }
    }
  }
  assert.ok(models >= 190, `covers the matrix (${models} models)`);
});

test('a photo car grows with its measured height while a catalog car ignores parts and height', () => {
  const base = { id: 'photo-h', name: 'Alta', version: 2, shape: 'buggy', parts: [], color: '#2255cc', accent: '#ffcc22', width: 1.7, length: 3.2 };
  const short = createCarModel({ ...base, height: 0.7 }), tall = createCarModel({ ...base, height: 1.7 });
  try {
    const shortSize = new THREE.Box3().setFromObject(short), tallSize = new THREE.Box3().setFromObject(tall);
    assert.ok(tallSize.max.y > shortSize.max.y + 0.3, 'taller photo cars get a taller body');
    assert.ok(Math.abs(shortSize.min.y) < 0.025 && Math.abs(tallSize.min.y) < 0.025, 'tires stay on the road');
  } finally { disposeModel(short); disposeModel(tall); }
  const legacy = createCarModel({ ...SAMPLE_CARS[0], version: 2, parts: ['fan', 'rocket'], height: 3 });
  try { assert.deepEqual(geometrySignature(legacy), catalogGeometry[SAMPLE_CARS[0].id], 'detail wins over parts and height'); }
  finally { disposeModel(legacy); }
  assert.deepEqual(normalizeParts(['rocket', 'nope', 'fan', 'fan', 3]), ['fan', 'rocket']);
});

test('disposing a thumbnail owns no geometry or material used by a race car', () => {
  const thumbnail = createCarModel(CAR_PRESETS[0]);
  const racer = createCarModel(CAR_PRESETS[0]);
  try {
    const thumbnailResources = new Set();
    thumbnail.traverse(object => { if (object.geometry) thumbnailResources.add(object.geometry); if (object.material) thumbnailResources.add(object.material); });
    racer.traverse(object => {
      if (object.geometry) assert.equal(thumbnailResources.has(object.geometry), false);
      if (object.material) assert.equal(thumbnailResources.has(object.material), false);
    });
  } finally {
    disposeModel(thumbnail); disposeModel(racer);
  }
});
