// Rebuilds tests/fixtures/catalog-geometry.json after adding or reshaping a catalog car.
// Existing entries must not change unless a car was deliberately remodelled: the script reports every difference.
import { readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { CAR_PRESETS, SAMPLE_CARS, createCarModel } from '../src/cars.js';

const fixturePath = new URL('../tests/fixtures/catalog-geometry.json', import.meta.url);
let previous = {};
try { previous = JSON.parse(readFileSync(fixturePath, 'utf8')); } catch { /* first run */ }

function geometrySignature(model) {
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  let vertices = 0, meshes = 0;
  model.traverse((object) => { if (object.isMesh) { meshes++; vertices += object.geometry.getAttribute('position').count; } });
  return { size: size.toArray().map((v) => Math.round(v * 1000) / 1000), vertices, meshes };
}

const next = {};
for (const spec of [...SAMPLE_CARS, ...CAR_PRESETS]) next[spec.id] = geometrySignature(createCarModel(spec));

const changed = Object.keys(previous).filter((id) => next[id] && JSON.stringify(next[id]) !== JSON.stringify(previous[id]));
const added = Object.keys(next).filter((id) => !previous[id]);
const removed = Object.keys(previous).filter((id) => !next[id]);
const force = process.argv.includes('--force');
if (changed.length && !force) {
  console.error(`Geometry changed for existing cars: ${changed.join(', ')}. Re-run with --force if that is intended.`);
  process.exit(1);
}
writeFileSync(fixturePath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Fixture written: ${Object.keys(next).length} cars. Added: ${added.join(', ') || 'none'}. Removed: ${removed.join(', ') || 'none'}. Changed: ${changed.join(', ') || 'none'}.`);
