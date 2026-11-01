/**
 * Where a vehicle's wheels go. Until now the layouts were four hard-coded cases inside createCarModel, which is why
 * the catalogue could not have a motorbike, an Ape, an eight-wheeled rig or a little aeroplane with one nose wheel
 * and two under the wings — the children's own models. A spec may now declare `axles` instead. The four special
 * layouts of old (trike, f1, dragster, convoy) are named presets that expand into the same `axles` list
 * (`WHEEL_PRESETS`, `presetAxles`), so catalogue and garage speak one language; tests/wheels.test.js keeps the old
 * formulas and checks that the expansion puts every wheel exactly where they did.
 *
 * Pure: no three.js, no DOM, like src/parts.js — the Node tests use it directly.
 */
import { normalizeParts } from './parts.js';

/** The named layouts. A spec picks one with its `detail` (catalogue) or with `wheels` (a format 3 garage car). */
export const WHEEL_PRESETS = ['trike', 'f1', 'dragster', 'convoy'];

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
  if (WHEEL_PRESETS.includes(spec.detail)) return { kind: spec.detail };
  if (WHEEL_PRESETS.includes(spec.wheels)) return { kind: spec.wheels };
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
 * A named layout as an `axles` list, front to back. The presets were written in metres and multiples of the body's
 * wheel, so they expand against the body they go on: `geom` is `{ l, wheelRadius, wheelWidth, axleZ }`. A wheel
 * smaller than the body's own has a slimmer tread (0.8), as it always had. The steering axle is marked.
 */
export function presetAxles(name, { l, wheelRadius, wheelWidth, axleZ }) {
  const axle = (z, spread, size = 1, marks = {}) => ({ z: z / l, spread, radius: wheelRadius * size, width: wheelWidth * (size < 1 ? 0.8 : 1), ...marks });
  switch (name) {
    // One wheel on a fork ahead of the body, two at the rear axle.
    case 'trike': return [axle(axleZ + 0.45, 0, 1, { steer: true }), axle(-axleZ, 0.5, 1, { drive: true })];
    // Single-seaters: little wheels at the front, fat ones at the back.
    case 'f1': return [axle(axleZ + 0.2, 0.52, 0.7, { steer: true }), axle(-axleZ, 0.55, 1.3, { drive: true })];
    case 'dragster': return [axle(l * 0.45, 0.4, 0.58, { steer: true }), axle(-l * 0.28, 0.58, 1.45, { drive: true })];
    // Four big tyres under the tractor unit, two smaller ones under the trailer.
    case 'convoy': return [axle(l * 0.42, 0.5, 1, { steer: true }), axle(l * 0.12, 0.5, 1, { drive: true }), axle(-l * 0.38, 0.46, 0.55)];
    default: return [];
  }
}

/**
 * The wheels themselves. `geom` carries what createCarModel has already worked out:
 * `{ w, l, wheelRadius, wheelWidth, axleZ }`. Returns `{ x, z, r, tread, group, steer, drive }` for each wheel,
 * in the same order the old code produced them — the quirk generator re-hubs "one" wheel by index.
 */
export function wheelLayout(spec, geom) {
  const { w, wheelRadius, wheelWidth, axleZ } = geom;
  const plan = wheelPlan(spec);
  if (plan.kind === 'axles') return axleWheels(plan, geom);
  if (WHEEL_PRESETS.includes(plan.kind)) return axleWheels({ axles: presetAxles(plan.kind, geom), trailer: [] }, geom);
  // Four plain wheels. Not a preset: the old code listed them left side first, and the quirk generator picks a
  // wheel by index, so this order is part of what every ordinary car looks like.
  return [-w / 2, w / 2].flatMap((x) => [-axleZ, axleZ].map((z) => ({ x, z, r: wheelRadius, tread: wheelWidth, group: 'car' })));
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
 * Whether the vehicle leans INTO a bend, like a motorbike, instead of rolling out of it on its suspension like a
 * car. Anything balanced on one wheel on the centre line does: motorbikes, trikes, the Ape, and the aeroplanes with
 * a nose wheel, which bank as aeroplanes do.
 */
export function leansIntoTurns(spec = {}) {
  const plan = wheelPlan(spec);
  return plan.kind === 'trike' || (plan.kind === 'axles' && plan.axles.some((axle) => !axle.spread));
}

/**
 * How high the chassis rides. With one wheel size the old rule (radius + clearance) was enough; as soon as a model
 * mixes wheel sizes something has to say which ones hold the body up, so a spec may state it outright.
 */
export function rideHeight(spec, fallback) {
  if (Number.isFinite(spec.ride)) return spec.ride;
  return fallback;
}
