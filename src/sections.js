/**
 * Special road sections, compiled by createTrack() from a circuit definition:
 *  - shortcuts: iron bridges that leave the road from the lake-side lane and rejoin it further on,
 *    skipping part of the lap. Optional: a car takes one only by driving into its entry lane.
 *  - loops: a loop-the-loop that replaces the road for a stretch. Mandatory: every car goes round.
 * A section owns a `pose(u, lane)` for u in [0, 1] along its own path and a `gain`: how many track
 * metres of progress one metre driven on the section is worth (> 1 on a bridge, < 1 in a loop).
 * Pure maths: no three.js, no DOM, so the race simulation and the tests can use it in Node.
 */
import { clamp } from './math.js';

const smooth = (u) => u * u * (3 - 2 * u);
const normalize = (v) => {
  const magnitude = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / magnitude, y: v.y / magnitude, z: v.z / magnitude };
};
const UP = Object.freeze({ x: 0, y: 1, z: 0 });

const BRIDGE_DEFAULTS = Object.freeze({ width: 6, arch: 2.4, handle: 18 });
const LOOP_DEFAULTS = Object.freeze({ radius: 11, lead: 28 });

/** Builds a cubic Bézier in the ground plane with an arc-length table so callers can walk it at constant speed. */
function planarBezier(p0, p1, p2, p3, steps = 240) {
  const at = (t) => {
    const m = 1 - t;
    return {
      x: m * m * m * p0.x + 3 * m * m * t * p1.x + 3 * m * t * t * p2.x + t * t * t * p3.x,
      z: m * m * m * p0.z + 3 * m * m * t * p1.z + 3 * m * t * t * p2.z + t * t * t * p3.z,
    };
  };
  const table = [0];
  let previous = at(0);
  for (let i = 1; i <= steps; i += 1) {
    const point = at(i / steps);
    table.push(table[i - 1] + Math.hypot(point.x - previous.x, point.z - previous.z));
    previous = point;
  }
  const length = table[steps];
  const parameterAt = (distance) => {
    const target = clamp(distance, 0, length);
    let lo = 0;
    let hi = steps;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (table[mid] <= target) lo = mid;
      else hi = mid;
    }
    const segment = table[hi] - table[lo] || 1;
    return (lo + (target - table[lo]) / segment) / steps;
  };
  return { at, length, parameterAt };
}

function compileBridge(definition, { frame, length, roadWidth, check }) {
  const { id, name = '', from, to } = definition;
  check(typeof id === 'string' && id, 'a shortcut needs an id');
  check(Number.isFinite(from) && Number.isFinite(to) && from >= 0 && to <= length && to - from >= 20, `shortcut "${id}" must start and end on the same lap, at least 20 m apart`);
  const lane = Number.isFinite(definition.lane) ? definition.lane : -(roadWidth / 2 - 2.5);
  const width = definition.width ?? BRIDGE_DEFAULTS.width;
  const arch = definition.arch ?? BRIDGE_DEFAULTS.arch;
  const handle = definition.handle ?? BRIDGE_DEFAULTS.handle;
  check(Math.abs(lane) + width / 2 <= roadWidth / 2 + 3, `shortcut "${id}" must start from a lane of the road`);
  const a = frame(from);
  const b = frame(to);
  const start = { x: a.x + a.dz * lane, z: a.z - a.dx * lane };
  const end = { x: b.x + b.dz * lane, z: b.z - b.dx * lane };
  // Leaves the road along its tangent and rejoins it along the tangent at the exit: no visible kink.
  const curve = planarBezier(start, { x: start.x + a.dx * handle, z: start.z + a.dz * handle },
    { x: end.x - b.dx * handle, z: end.z - b.dz * handle }, end);
  const pathLength = curve.length;
  const span = to - from;
  check(pathLength > 1 && span / pathLength > 1.05, `shortcut "${id}" must be shorter than the road it skips`);
  const point = (u, offset) => {
    const t = curve.parameterAt(u * pathLength);
    const here = curve.at(t);
    const before = curve.at(Math.max(0, t - 0.002));
    const after = curve.at(Math.min(1, t + 0.002));
    const direction = normalize({ x: after.x - before.x, y: 0, z: after.z - before.z });
    return { x: here.x + direction.z * offset, y: arch * Math.sin(Math.PI * u), z: here.z - direction.x * offset };
  };
  const pose = (fraction, offset = 0) => {
    const u = clamp(fraction, 0, 1);
    const here = point(u, offset);
    const behind = point(Math.max(0, u - 0.004), offset);
    const ahead = point(Math.min(1, u + 0.004), offset);
    return { x: here.x, y: here.y, z: here.z, forward: normalize({ x: ahead.x - behind.x, y: ahead.y - behind.y, z: ahead.z - behind.z }), up: UP };
  };
  return Object.freeze({
    id, name, kind: 'bridge', optional: true, from, to, span, pathLength, gain: span / pathLength,
    entryLane: lane, exitLane: lane, width, arch, pose,
  });
}

function compileLoop(definition, { frame, length, roadWidth, check }) {
  const { id, name = '', distance } = definition;
  check(typeof id === 'string' && id, 'a loop needs an id');
  const radius = definition.radius ?? LOOP_DEFAULTS.radius;
  const lead = definition.lead ?? LOOP_DEFAULTS.lead;
  const shift = definition.shift ?? roadWidth + 4;
  check(Number.isFinite(distance) && distance >= 0 && distance + 2 * lead <= length, `loop "${id}" is off the circuit`);
  check(radius >= 6 && radius <= 20 && lead >= 12, `loop "${id}" needs a radius between 6 and 20 m and a lead of at least 12 m`);
  const from = distance;
  const span = 2 * lead;
  const to = from + span;
  const approach = Math.hypot(lead, shift / 2);
  const circle = 2 * Math.PI * radius;
  const pathLength = 2 * approach + circle;
  // Path in metres: lead-in drifting to one side, a vertical circle that drifts across to the other
  // side (so the exit does not run into the entry), then a lead-out drifting back to the centre line.
  const point = (s, offset) => {
    if (s <= approach) {
      const u = clamp(s / approach, 0, 1);
      const f = frame(from + u * lead);
      const lateral = -shift / 2 * smooth(u) + offset;
      return { x: f.x + f.dz * lateral, y: 0, z: f.z - f.dx * lateral, up: UP };
    }
    if (s <= approach + circle) {
      const theta = (s - approach) / radius;
      const f = frame(from + lead);
      const lateral = -shift / 2 * Math.cos(theta / 2) + offset;
      const along = radius * Math.sin(theta);
      return {
        x: f.x + f.dx * along + f.dz * lateral, y: radius * (1 - Math.cos(theta)), z: f.z + f.dz * along - f.dx * lateral,
        up: { x: -f.dx * Math.sin(theta), y: Math.cos(theta), z: -f.dz * Math.sin(theta) },
      };
    }
    const u = clamp((s - approach - circle) / approach, 0, 1);
    const f = frame(from + lead + u * lead);
    const lateral = shift / 2 * (1 - smooth(u)) + offset;
    return { x: f.x + f.dz * lateral, y: 0, z: f.z - f.dx * lateral, up: UP };
  };
  const pose = (fraction, offset = 0) => {
    const s = clamp(fraction, 0, 1) * pathLength;
    const here = point(s, offset);
    const behind = point(Math.max(0, s - 0.25), offset);
    const ahead = point(Math.min(pathLength, s + 0.25), offset);
    return { x: here.x, y: here.y, z: here.z, forward: normalize({ x: ahead.x - behind.x, y: ahead.y - behind.y, z: ahead.z - behind.z }), up: here.up };
  };
  return Object.freeze({
    id, name, kind: 'loop', optional: false, from, to, span, pathLength, gain: span / pathLength,
    entryLane: 0, exitLane: 0, width: roadWidth, radius, lead, shift, pose,
  });
}

/** Compiles the `shortcuts` and `loops` of a circuit definition; throws through `check` on bad data. */
export function compileSections({ shortcuts = [], loops = [] }, context) {
  const sections = [
    ...shortcuts.map((definition) => compileBridge(definition, context)),
    ...loops.map((definition) => compileLoop(definition, context)),
  ].sort((a, b) => a.from - b.from);
  for (let i = 1; i < sections.length; i += 1) {
    context.check(sections[i - 1].to <= sections[i].from, `sections "${sections[i - 1].id}" and "${sections[i].id}" overlap`);
  }
  context.check(new Set(sections.map((section) => section.id)).size === sections.length, 'section ids must be unique');
  return sections;
}

/** The mandatory section (a loop) that contains this wrapped track distance, if any. */
export function sectionAt(sections, wrappedDistance) {
  return sections.find((section) => !section.optional && wrappedDistance >= section.from && wrappedDistance < section.to) || null;
}

/** Fraction of a section's path reached at this track progress (wrapped to the lap by the caller). */
export function sectionFraction(section, wrappedDistance) {
  return clamp((wrappedDistance - section.from) / section.span, 0, 1);
}

/**
 * Pose of a racer: on its current section (a bridge it chose, or the loop the road runs through),
 * or null when it simply follows the road. `racer.lane` is relative to the section centre line while on it.
 */
export function racerPose(track, racer) {
  const sections = track.sections || [];
  if (!sections.length) return null;
  const wrapped = track.wrap(racer.progress);
  const section = (racer.section && sections.find((candidate) => candidate.id === racer.section)) || sectionAt(sections, wrapped);
  if (!section) return null;
  const fraction = sectionFraction(section, wrapped);
  return { section, fraction, ...section.pose(fraction, racer.lane) };
}
