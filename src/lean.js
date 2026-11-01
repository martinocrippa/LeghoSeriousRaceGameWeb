/**
 * How far a car leans in a bend. Purely visual: the renderer reads it, the simulation never does, so races and
 * results cannot change. Pure: no three.js, no DOM, like src/wheels.js — the Node tests use it directly.
 *
 * Sign convention, the one of the `tilt` group's rotation.z (car facing +z): positive leans the top to the car's
 * right. Lateral "g" is positive in a left-hand bend, because lanes and headings grow to the left (see track.js).
 */

/** Most a car rolls out of a bend on its suspension, and most a motorbike leans in, in radians. */
export const CAR_ROLL = 0.12;
export const BIKE_LEAN = 0.42;
/** How far a tyre may lift off or sink into the road at full lean, in metres: it caps the lean of wide trikes. */
const TYRE_SLACK = 0.12;
/** Lateral acceleration, in g, at which the lean is about three quarters of the way to its limit. */
const G_SCALE = 2.2;
/** A lane change of the steering's full deflection counts like this many g of bend. */
const STEER_G = 10;
/** Spring and damping of the body on its springs: settles in about half a second, one small rebound. */
const STIFFNESS = 140;
const DAMPING = 9.5;
const SUBSTEP = 1 / 120;

/** Front wheels: how much more they turn than the geometry says (so a child sees it), and their stop. */
const STEER_GAIN = 2.5;
const STEER_LANE = 2.2;
export const STEER_MAX = 0.45;
/** Tail sliding out: the most it swings, and the lateral g between which it grows from nothing to that. */
export const SLIDE = 0.14;
const SLIDE_FROM = 1.1, SLIDE_TO = 2.6;

/**
 * The road's curvature at `progress`, in radians per metre, positive in a left-hand bend. Measured over ten metres
 * because the track samples are a polyline and a single segment has none.
 */
export function bendCurvature(track, progress) {
  const behind = track.frame(progress - 5), ahead = track.frame(progress + 5);
  return Math.atan2(behind.dz * ahead.dx - behind.dx * ahead.dz, behind.dx * ahead.dx + behind.dz * ahead.dz) / 10;
}

/** Lateral acceleration in g at `progress`: speed² × the road's curvature. */
export function bendAcceleration(track, progress, speed) {
  return (speed * speed * bendCurvature(track, progress)) / 9.81;
}

/**
 * The most a vehicle leans. Cars: CAR_ROLL. Whatever leans in pivots on the centre line, so its outermost tyre
 * edge lifts or sinks by halfTrack × sin(lean): a motorbike's tyre is narrow and goes all the way to BIKE_LEAN, a
 * trike's rear pair is wide and stops at a few degrees instead of digging into the tarmac.
 */
export function leanLimit(leansIn, halfTrack) {
  return leansIn ? Math.min(BIKE_LEAN, Math.asin(Math.min(1, TYRE_SLACK / Math.max(halfTrack, 1e-3)))) : CAR_ROLL;
}

/**
 * Where the body wants to sit: cars roll out of the bend, motorbikes and trikes lean into it. `steering` is the
 * renderer's yaw for a lane change (±0.17), so swerving on a straight still rocks the car a little. The limit is
 * approached smoothly (tanh): at four g in a hairpin nothing tips over.
 */
export function leanTarget(g, steering, leansIn, limit = leanLimit(leansIn, 0)) {
  const total = g + steering * STEER_G;
  return (leansIn ? -limit : limit) * Math.tanh(total / G_SCALE);
}

/**
 * The front wheels' steering angle (rotation.y, positive to the left): the angle that takes a car of this wheelbase
 * round the bend, made larger so it reads from the chase camera, plus the lane change. Capped at STEER_MAX.
 */
export function wheelSteer(curvature, wheelbase, steering) {
  const angle = Math.atan(wheelbase * curvature) * STEER_GAIN + steering * STEER_LANE;
  return Math.max(-STEER_MAX, Math.min(STEER_MAX, angle));
}

/**
 * How far the tail swings out, as a yaw of the whole car (positive in a left-hand bend, which sends the rear to
 * the right). Nothing in an ordinary bend; it grows only in the tight ones, from SLIDE_FROM to SLIDE_TO g.
 */
export function slideTarget(g) {
  const t = Math.max(0, Math.min(1, (Math.abs(g) - SLIDE_FROM) / (SLIDE_TO - SLIDE_FROM)));
  return Math.sign(g) * SLIDE * t * t * (3 - 2 * t);
}

/** Where the car group sits for a tail swing of `angle`, so it pivots on the front axle instead of its middle. */
export function slideOffset(angle, frontZ) {
  return { x: -frontZ * Math.sin(angle), z: frontZ * (1 - Math.cos(angle)) };
}

/** Advances the spring-damper `{ angle, speed }` toward `target` by `dt` seconds, in fixed substeps. */
export function stepLean(state, target, dt) {
  let left = Math.max(0, dt);
  while (left > 1e-9) {
    const h = Math.min(SUBSTEP, left);
    state.speed += (STIFFNESS * (target - state.angle) - DAMPING * state.speed) * h;
    state.angle += state.speed * h;
    left -= h;
  }
  return state.angle;
}

/**
 * Where the `tilt` group sits for a lean of `angle`, so the tyres stay on the road. Its pivot is the axle line,
 * `pivotY` above the road: a car rolling about it would sink its outer wheels, so the group rises just enough to
 * keep them on the tarmac. A motorbike leans about the tyre's contact patch instead, so the wheel does not slide
 * sideways under it (rotating about the ground is the pivot, rotated), then rises by the tyre edge that would sink.
 */
export function rest(angle, { pivotY, halfTrack }, leansIn) {
  const sink = halfTrack * Math.abs(Math.sin(angle));
  if (leansIn) return { x: -pivotY * Math.sin(angle), y: pivotY * Math.cos(angle) + sink };
  return { x: 0, y: pivotY + Math.max(0, sink - pivotY * (1 - Math.cos(angle))) };
}

/**
 * Tyre marks, one colour per road surface: black rubber on tarmac, a darker grey on the cobbles, ruts in the dirt,
 * sand and grass. The renderer keeps a ring of them (`skids` in quality.js), the oldest giving way to the newest.
 */
export const SKID_COLOURS = Object.freeze({ asphalt: '#1b1b1d', cobbles: '#34302b', dirt: '#5a3f26', sand: '#94784d', grass: '#3d5a2a' });
/** How far the tail must swing out before the rear tyres scrub the road, in radians. */
const SKID_SLIDE = 0.03;

/** Whether the rear tyres mark the road this frame: only while the car slides, never in the air or off the road. */
export function leavesMarks({ grounded, slide, drifting, spinning, slipping }) {
  return !!grounded && (Math.abs(slide) > SKID_SLIDE || !!drifting || spinning > 0 || slipping > 0);
}

/** The mark colour for a surface; anything the table does not know is treated as tarmac. */
export const skidColour = (surface) => SKID_COLOURS[surface] || SKID_COLOURS.asphalt;
