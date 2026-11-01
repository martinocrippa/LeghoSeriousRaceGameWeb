/**
 * The saved garage (`brick-racers:garage`), rebuilt field by field. Pure: no DOM, no three.js, like records.js.
 *
 * Nothing read back from localStorage is trusted — any page on the same origin can write it — so every car is
 * rebuilt from known fields instead of being spread. Two fields earn their own check: `id` goes unescaped into
 * querySelector(`[data-car="…"]`), and `sourceUrl` is the only address the game ever loads, so it may only be one
 * of our own bundled photos.
 *
 * Format 1: colours, shape and size. Format 2 adds parts, palette and height. Format 3 adds the wheels as data —
 * `axles` and `trailer.axles`, or a named preset in `wheels` — plus `ride`, `knobby`, `rims`, `suit` and `helmet`.
 * The game no longer creates cars (the photo import was removed), but these fields let a car made elsewhere carry
 * the same wheels the catalogue has.
 */
import { normalizeParts } from './parts.js';
import { WHEEL_PRESETS, presetAxles } from './wheels.js';

export const GARAGE_STORAGE_KEY = 'brick-racers:garage';
export const MAX_CUSTOM_CARS = 12;
export const SHAPES = ['buggy', 'racer', 'truck', 'classic'];

/** Limits of a format 3 axle. Radius and width span what the catalogue uses; positions are fractions of the body. */
export const AXLE_LIMITS = {
  count: 6,
  z: [-0.6, 0.6],
  trailerZ: [-1.2, -0.3],
  spread: [0.3, 0.65],
  radius: [0.22, 0.72],
  width: [0.16, 0.54],
};
/** The chassis sits on its wheels: no lower than this under the biggest one, no higher than this above it. */
export const RIDE_BELOW = 0.15, RIDE_ABOVE = 0.35;

const isHex = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const isId = (value) => typeof value === 'string' && /^[\w-]{1,40}$/.test(value);
const isSample = (value) => typeof value === 'string' && /^sample\/[a-z0-9-]+\.jpg$/.test(value);
const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');
const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value));
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * One axle, or null when it cannot be read. Numbers out of range are brought back into it rather than dropped:
 * a wheel slightly too far forward is still a wheel. A spread between 0 and the minimum stays a pair.
 */
export function cleanAxle(axle, zRange = AXLE_LIMITS.z) {
  if (!axle || typeof axle !== 'object' || Array.isArray(axle)) return null;
  if (!finite(axle.z) || (axle.spread !== undefined && !finite(axle.spread))) return null;
  const out = { z: clamp(axle.z, zRange), spread: axle.spread > 0 ? clamp(axle.spread, AXLE_LIMITS.spread) : 0 };
  if (finite(axle.radius)) out.radius = clamp(axle.radius, AXLE_LIMITS.radius);
  if (finite(axle.width)) out.width = clamp(axle.width, AXLE_LIMITS.width);
  if (isHex(axle.rim)) out.rim = axle.rim;
  if (axle.steer === true) out.steer = true;
  if (axle.drive === true) out.drive = true;
  return out;
}

/** A list of axles: only arrays, at most AXLE_LIMITS.count readable axles, front to back as given. */
export function cleanAxles(list, zRange) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, AXLE_LIMITS.count * 2).map((axle) => cleanAxle(axle, zRange)).filter(Boolean).slice(0, AXLE_LIMITS.count);
}

/** The body's own wheel for a garage car, as createCarModel works it out (garage cars have no `detail`). */
const ownWheelRadius = (car) => (car.parts.includes('bigWheels') ? 0.48 : car.shape === 'buggy' ? 0.37 : 0.34);

/**
 * How high the chassis rides, kept sitting on its wheels: between RIDE_BELOW under the biggest wheel and RIDE_ABOVE
 * over it. The tyres themselves always stand on the road (createCarModel places each at its own radius); what a
 * wild `ride` breaks is the body, floating above them or sunk through the tarmac. Without a `ride`, none is set
 * and the body's usual rule applies.
 */
export function cleanRide(ride, car) {
  if (!finite(ride)) return undefined;
  const wheelRadius = ownWheelRadius(car);
  const axles = car.wheels ? presetAxles(car.wheels, { l: 3, wheelRadius, wheelWidth: 0.27, axleZ: 1 }) : [...(car.axles || []), ...(car.trailer?.axles || [])];
  const radii = axles.map((axle) => axle.radius ?? wheelRadius);
  const biggest = radii.length ? Math.max(...radii) : wheelRadius;
  return clamp(ride, [biggest - RIDE_BELOW, biggest + RIDE_ABOVE]);
}

/** Formats 1 and 2, exactly as they always loaded. */
function cleanBase(c) {
  return {
    id: c.id, name: c.name.slice(0, 28), color: c.color, accent: c.accent, shape: c.shape,
    description: text(c.description, 200), tagline: text(c.tagline, 90), tag: text(c.tag, 24), provenance: text(c.provenance, 200), qualityNote: text(c.qualityNote, 200),
    sourceUrl: isSample(c.sourceUrl) ? c.sourceUrl : undefined,
    width: Math.max(0.7, Math.min(3, Number(c.width) || 1.7)), length: Math.max(1.5, Math.min(5, Number(c.length) || 3.2)), height: Math.max(0.5, Math.min(2.5, Number(c.height) || 1)),
    version: Number(c.version) >= 2 ? 2 : 1, parts: normalizeParts(c.parts),
    palette: Array.isArray(c.palette) && c.palette.length && c.palette.every(isHex) ? c.palette.slice(0, 5) : undefined,
    thumbnail: typeof c.thumbnail === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(c.thumbnail) ? c.thumbnail : '',
  };
}

/** Format 3 on top: the wheels and the driver's colours. Fields that do not pass are simply left out. */
function cleanWheels(c, car) {
  car.version = 3;
  const axles = cleanAxles(c.axles);
  if (axles.length) car.axles = axles;
  else if (typeof c.wheels === 'string' && WHEEL_PRESETS.includes(c.wheels)) car.wheels = c.wheels;
  const trailerAxles = c.trailer && typeof c.trailer === 'object' ? cleanAxles(c.trailer.axles, AXLE_LIMITS.trailerZ) : [];
  // A trailer only exists through its wheels: createCarModel builds one when some wheel belongs to it.
  if (trailerAxles.length && axles.length) {
    car.trailer = { axles: trailerAxles };
    if (finite(c.trailer.length)) car.trailer.length = clamp(c.trailer.length, [2, 3.6]);
    if (c.trailer.body === 'wood' || c.trailer.body === 'container') car.trailer.body = c.trailer.body;
  }
  const ride = cleanRide(c.ride, car);
  if (ride !== undefined) car.ride = ride;
  if (c.knobby === true) car.knobby = true;
  for (const key of ['rims', 'suit', 'helmet']) if (isHex(c[key])) car[key] = c[key];
  return car;
}

/** The whole garage from the raw localStorage string. Anything unreadable gives an empty garage, never an error. */
export function parseGarage(raw) {
  let list;
  try { list = JSON.parse(raw || '[]'); } catch { return []; }
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => c && isId(c.id) && typeof c.name === 'string' && isHex(c.color) && isHex(c.accent) && SHAPES.includes(c.shape))
    .slice(0, MAX_CUSTOM_CARS)
    .map((c) => (Number(c.version) >= 3 ? cleanWheels(c, cleanBase(c)) : cleanBase(c)));
}
