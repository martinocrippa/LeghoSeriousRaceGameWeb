/**
 * Where a vehicle's wheels go. Until now the layouts were four hard-coded cases inside createCarModel, which is why
 * the catalogue could not have a motorbike, an Ape, an eight-wheeled rig or a little aeroplane with one nose wheel
 * and two under the wings — the children's own models. A spec may now declare `axles` instead, and everything else
 * keeps working exactly as before: the legacy branches are reproduced here literally, in the same order, so the
 * recorded geometry of the existing cars does not move.
 *
 * Pure: no three.js, no DOM, like src/parts.js — the Node tests use it directly.
 */
import { normalizeParts } from './parts.js';

/**
 * One axle, in fractions of the body so the width/length clamps still govern the size:
 *   z       position along the body (positive = toward the nose), as a fraction of length
 *   spread  how far apart the pair sits, as a fraction of width; 0 means ONE wheel on the centre line
 *   radius, width   in metres; omitted means the body's own wheel size
 *   group   'car' (default) or 'trailer' — trailer wheels hang off the hitch, not the body
 *   rim     hub colour for this axle only: builds that ran out of matching wheels mix green, orange and grey hubs
 *   steer, drive    marks for the model builder; they do not move anything by themselves
 *
 * Which layout a spec asks for. Kept separate from the geometry so the count can be checked without building.
 */
export function wheelPlan(spec = {}) {
  if (Array.isArray(spec.axles) && spec.axles.length) {
    return { kind: 'axles', axles: spec.axles, trailer: spec.trailer?.axles || [] };
  }
  // A `detail` body wipes `parts` in createCarModel, so threeWheels only counts when there is no detail.
  const parts = spec.detail ? [] : normalizeParts(spec.parts);
  if (spec.detail === 'trike' || parts.includes('threeWheels')) return { kind: 'trike' };
  if (spec.detail === 'f1') return { kind: 'f1' };
  if (spec.detail === 'dragster') return { kind: 'dragster' };
  if (spec.detail === 'convoy') return { kind: 'convoy' };
  return { kind: 'default' };
}

/** How many wheels a spec ends up with. Used by the tests and by anything that wants to know without building. */
export function expectedWheelCount(spec = {}) {
  const plan = wheelPlan(spec);
  if (plan.kind === 'trike') return 3;
  if (plan.kind === 'convoy') return 6;
  if (plan.kind !== 'axles') return 4;
  const count = (axles) => axles.reduce((total, axle) => total + (axle.spread ? 2 : 1), 0);
  return count(plan.axles) + count(plan.trailer);
}

/**
 * The wheels themselves. `geom` carries what createCarModel has already worked out:
 * `{ w, l, wheelRadius, wheelWidth, axleZ }`. Returns `{ x, z, r, tread, group, steer, drive }` for each wheel,
 * in the same order the old code produced them — the quirk generator re-hubs "one" wheel by index.
 */
export function wheelLayout(spec, geom) {
  const { w, l, wheelRadius, wheelWidth, axleZ } = geom;
  const plan = wheelPlan(spec);
  const sized = (spots) => spots.map(([x, z, sizeFactor = 1]) => ({
    x, z, r: wheelRadius * sizeFactor, tread: wheelWidth * (sizeFactor < 1 ? 0.8 : 1), group: 'car',
  }));
  switch (plan.kind) {
    // One wheel on a fork ahead of the body, two at the rear axle.
    case 'trike': return sized([[0, axleZ + 0.45], [-w / 2, -axleZ], [w / 2, -axleZ]]);
    // Single-seaters: little wheels at the front, fat ones at the back.
    case 'f1': return sized([[-w * 0.52, axleZ + 0.2, 0.7], [w * 0.52, axleZ + 0.2, 0.7], [-w * 0.55, -axleZ, 1.3], [w * 0.55, -axleZ, 1.3]]);
    case 'dragster': return sized([[-w * 0.4, l * 0.45, 0.58], [w * 0.4, l * 0.45, 0.58], [-w * 0.58, -l * 0.28, 1.45], [w * 0.58, -l * 0.28, 1.45]]);
    // Four big tyres under the tractor unit, two smaller ones under the trailer.
    case 'convoy': return sized([[-w / 2, l * 0.42], [w / 2, l * 0.42], [-w / 2, l * 0.12], [w / 2, l * 0.12], [-w * 0.46, -l * 0.38, 0.55], [w * 0.46, -l * 0.38, 0.55]]);
    case 'axles': return axleWheels(plan, geom);
    default: return sized([-w / 2, w / 2].flatMap((x) => [[x, -axleZ], [x, axleZ]]));
  }
}

function axleWheels(plan, { w, l, wheelRadius, wheelWidth }) {
  const out = [];
  const emit = (axles, group) => {
    for (const axle of axles) {
      const r = axle.radius ?? wheelRadius;
      const tread = axle.width ?? wheelWidth;
      const z = (axle.z ?? 0) * l;
      const common = { r, tread, group, steer: !!axle.steer, drive: !!axle.drive, rim: axle.rim };
      if (!axle.spread) out.push({ x: 0, z, ...common });
      else for (const side of [-1, 1]) out.push({ x: side * axle.spread * w, z, ...common });
    }
  };
  emit(plan.axles, 'car');
  emit(plan.trailer, 'trailer');
  return out;
}

/**
 * How high the chassis rides. With one wheel size the old rule (radius + clearance) was enough; as soon as a model
 * mixes wheel sizes something has to say which ones hold the body up, so a spec may state it outright.
 */
export function rideHeight(spec, fallback) {
  if (Number.isFinite(spec.ride)) return spec.ride;
  return fallback;
}
