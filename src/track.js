/**
 * Closed, arc-length sampled circuits. All distances and widths are in metres.
 * A circuit is data: createTrack() compiles a definition into a frozen object with
 * geometry helpers, so simulation, renderer and UI never depend on module constants.
 */
import { compileSections } from './sections.js';
import { checkObstacles, normalizeObstacle } from './obstacles.js';
import { checkCritters, normalizeCritter } from './critters.js';
import { boxRow, ramp, pad, solid } from './track-helpers.js';
import { NOTTE_TRACK } from './tracks/notte.js';
import { BRUGHERIO_TRACK } from './tracks/brugherio.js';
import { COMO_TRACK } from './tracks/como.js';
import { INCREA_TRACK } from './tracks/increa.js';
import { VILLASANTA_TRACK } from './tracks/villasanta.js';
import { CRETE_TRACK } from './tracks/crete.js';
import { STADIO_TRACK } from './tracks/stadio.js';
import { BERNINA_TRACK } from './tracks/bernina.js';
import { ADDA_TRACK } from './tracks/adda.js';
import { ARCA_TRACK } from './tracks/arca.js';
import { REGNANO_TRACK } from './tracks/regnano.js';
import { MAGRA_TRACK } from './tracks/magra.js';
import { ALBA_TRACK } from './tracks/alba.js';
import { INTERVALLO_TRACK } from './tracks/intervallo.js';
import { VARESE_TRACK } from './tracks/varese.js';

const SAMPLE_COUNT = 2048;
/** Road surfaces a circuit may switch between along the lap; the renderer picks colours and textures from these. */
export const SURFACE_KINDS = Object.freeze(['asphalt', 'cobbles', 'dirt', 'sand', 'grass']);
/**
 * How a player's "steer right" maps onto the lane axis. Lanes grow toward the LEFT of the screen (see `frame` below),
 * so steering right must make the lane smaller. Children pressed the right arrow and the car went left; this is the
 * single place that sign lives, so input, tests and any future control scheme cannot disagree about it.
 */
export const LANE_SIGN = -1;

/** Every colour and light the renderer needs; a circuit theme overrides only what it changes. */
const DEFAULT_THEME = Object.freeze({
  sky: 0xc8e8ef, fog: 0xc8e8ef, fogNear: 105, fogFar: 270,
  ground: 0x9dceb0, road: 0x646a86, shoulder: 0xe8e3f4, curb: [0x9670e2, 0xf2eafb], stripe: 0xc5c6d6,
  trees: { trunk: 0xac8c71, crown: 0x61ad8d, top: 0x7ec595, hue: 0.36, count: 96 },
  hills: [0xa289d4, 0xf1bf70, 0x66b9c1, 0xc398b8, 0x74b986],
  bricks: [0xa289d4, 0xf1bf70, 0x66b9c1, 0xc398b8, 0x74b986],
  flags: [0xffc143, 0x8b66d9],
  clouds: true, lamps: false,
  light: { hemiSky: 0xe9f5ff, hemiGround: 0x719768, hemiIntensity: 2.3, sun: 0xfff4df, sunIntensity: 3.4 },
});

function spline(points, t) {
  const count = points.length;
  const index = Math.floor(t);
  const f = t - index;
  const p0 = points[(index - 1 + count) % count];
  const p1 = points[index % count];
  const p2 = points[(index + 1) % count];
  const p3 = points[(index + 2) % count];
  const axis = (a) => 0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * f
    + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * f * f
    + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * f * f * f);
  return { x: axis(0), z: axis(1) };
}

/** Samples the closed Catmull-Rom loop and rescales it so the arc length is exactly `length`. */
function sampleLoop(controlPoints, length) {
  const samples = Array.from({ length: SAMPLE_COUNT + 1 }, (_, i) => {
    return { ...spline(controlPoints, i / SAMPLE_COUNT * controlPoints.length), distance: 0 };
  });
  let rawLength = 0;
  for (let i = 1; i <= SAMPLE_COUNT; i++) {
    rawLength += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z);
    samples[i].distance = rawLength;
  }
  const scale = length / rawLength;
  for (const sample of samples) {
    sample.x *= scale;
    sample.z *= scale;
    sample.distance *= scale;
  }
  return samples;
}

export function createTrack(definition) {
  const { id, name, description = '', tagline = '', laps = 3, roadWidth = 14, length, controlPoints, ramps = [], boosts = [], boxes = [], landmarks = [], elevation = [], gates = [], shortcuts = [], loops = [], surfaces = [], bankings = [], obstacles = [], critters = [], theme = {} } = definition || {};
  const check = (condition, message) => { if (!condition) throw new Error(`Track "${id}": ${message}`); };
  check(typeof id === 'string' && id, 'needs an id');
  check(Array.isArray(controlPoints) && controlPoints.length >= 4 && controlPoints.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)), 'needs at least four finite control points');
  check(Number.isFinite(length) && length > 0, 'needs a positive length');
  check(Number.isFinite(roadWidth) && roadWidth >= 10, 'road must be at least 10 m wide');
  check(Number.isInteger(laps) && laps >= 1 && laps <= 5, 'laps must be an integer from 1 to 5');
  const points = controlPoints.map(([x, z]) => [x, z]);
  const samples = sampleLoop(points, length);
  const wrap = (distance) => ((distance % length) + length) % length;
  /**
   * Lane offset: x + dz * lane, z - dx * lane. That vector is the LEFT of the direction of travel — with a lookAt
   * camera whose up is +Y, screen-right is (-dz, 0, dx) — so a GROWING lane moves a car toward the left of the
   * screen. Every consumer (scenery lanes, banking `side`, section entry lanes, projectiles) shares this sign;
   * player input is negated once at the boundary via LANE_SIGN so that pressing right goes right.
   */
  const frame = (distance) => {
    const wrapped = wrap(Number.isFinite(distance) ? distance : 0);
    let lo = 0;
    let hi = SAMPLE_COUNT;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid].distance <= wrapped) lo = mid;
      else hi = mid;
    }
    const a = samples[lo];
    const b = samples[hi];
    const f = (wrapped - a.distance) / (b.distance - a.distance);
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const magnitude = Math.hypot(dx, dz);
    return { x: a.x + dx * f, z: a.z + dz * f, dx: dx / magnitude, dz: dz / magnitude };
  };
  /** Returns count points; callers close the loop back to point zero. */
  const trackPoints = (count = 256) => {
    const safeCount = Math.max(3, Math.min(8192, Math.floor(count) || 256));
    return Array.from({ length: safeCount }, (_, i) => {
      const distance = i / safeCount * length;
      return { ...frame(distance), distance };
    });
  };
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const sample of samples) {
    if (sample.x < bounds.minX) bounds.minX = sample.x;
    if (sample.x > bounds.maxX) bounds.maxX = sample.x;
    if (sample.z < bounds.minZ) bounds.minZ = sample.z;
    if (sample.z > bounds.maxZ) bounds.maxZ = sample.z;
  }
  const copyItems = (list, kind) => list.map((item) => {
    check(typeof item.id === 'string' && Number.isFinite(item.distance) && item.distance >= 0 && item.distance < length, `${kind} "${item.id}" is off the circuit`);
    return { ...item };
  });
  // Height profile: raised-cosine hills along the loop. The road rides on top; the terrain follows it within 60 m.
  const bumps = elevation.map((bump) => {
    check(Number.isFinite(bump.distance) && Number.isFinite(bump.length) && bump.length > 0 && Number.isFinite(bump.height), 'elevation bumps need distance, length and height');
    return { ...bump, bridge: !!bump.bridge };
  });
  const bumpHeight = (bump, d) => {
    const rel = ((d - bump.distance + length / 2) % length + length) % length - length / 2;
    const half = bump.length / 2;
    return Math.abs(rel) < half ? bump.height * 0.5 * (1 + Math.cos(Math.PI * rel / half)) : 0;
  };
  const elevationAt = (distance) => {
    if (!bumps.length) return 0;
    const d = wrap(distance);
    let y = 0;
    for (const bump of bumps) y += bumpHeight(bump, d);
    return y;
  };
  const slopeAt = (distance) => bumps.length ? (elevationAt(distance + 1) - elevationAt(distance - 1)) / 2 : 0;
  // Terrain follows the road's hills but not its bridges (a bridge stands on pillars over flat ground).
  const terrainBumps = bumps.filter((bump) => !bump.bridge);
  const terrainAt = (d) => terrainBumps.reduce((sum, bump) => sum + bumpHeight(bump, wrap(d)), 0);
  const coarse = terrainBumps.length ? Array.from({ length: 256 }, (_, i) => { const d = i / 256 * length; return { ...frame(d), h: terrainAt(d) }; }) : [];
  // Only samples within `outer` metres influence a point, so they are bucketed in `outer`-sized cells and a query
  // reads its 3x3 neighbourhood instead of all 256 (the renderer asks for tens of thousands of terrain vertices).
  const inner = roadWidth / 2 + 2, outer = 60, exactBand = 14;
  const cellKey = (ix, iz) => (ix + 4096) * 8192 + (iz + 4096);
  const cells = new Map();
  for (const p of coarse) {
    const key = cellKey(Math.floor(p.x / outer), Math.floor(p.z / outer));
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(p);
  }
  const groundHeight = (x, z) => {
    if (!coarse.length) return 0;
    let weightSum = 0, heightSum = 0, strongest = 0, nearestGap = Infinity, nearestHeight = 0;
    const ix = Math.floor(x / outer), iz = Math.floor(z / outer);
    for (let cx = ix - 1; cx <= ix + 1; cx += 1) for (let cz = iz - 1; cz <= iz + 1; cz += 1) {
      const bucket = cells.get(cellKey(cx, cz));
      if (!bucket) continue;
      for (const p of bucket) {
        const gap = Math.hypot(p.x - x, p.z - z);
        if (gap >= outer) continue;
        if (gap < nearestGap) { nearestGap = gap; nearestHeight = p.h; }
        const t = gap <= inner ? 1 : 1 - (gap - inner) / (outer - inner);
        const s = t * t * (3 - 2 * t);
        weightSum += s * s; heightSum += s * s * p.h; strongest = Math.max(strongest, s);
      }
    }
    if (!weightSum) return 0;
    // Under and beside the road the terrain matches the road exactly; further out it blends the nearby heights.
    const exactness = nearestGap <= inner ? 1 : nearestGap >= inner + exactBand ? 0 : 1 - (nearestGap - inner) / exactBand;
    return (exactness * nearestHeight + (1 - exactness) * heightSum / weightSum) * strongest;
  };
  const fullTheme = { ...DEFAULT_THEME, ...theme, trees: { ...DEFAULT_THEME.trees, ...(theme.trees || {}) }, light: { ...DEFAULT_THEME.light, ...(theme.light || {}) } };
  // Special sections: optional shortcut bridges and mandatory loop-the-loops (see sections.js).
  const sections = compileSections({ shortcuts, loops }, { frame, length, roadWidth, check });
  for (const loop of sections.filter((section) => !section.optional)) {
    for (const item of [...ramps, ...boosts, ...boxes]) {
      const rampEnd = item.distance + (item.length || 0);
      check(item.distance >= loop.to || rampEnd <= loop.from, `${item.id} sits inside loop "${loop.id}"`);
    }
  }
  // Surface changes along the lap (cobbled town centre, asphalt by the school, dirt elsewhere); default is the theme road.
  const surfaceList = surfaces.map((surface) => {
    check(SURFACE_KINDS.includes(surface.kind) && Number.isFinite(surface.from) && Number.isFinite(surface.to) && surface.from >= 0 && surface.to > surface.from && surface.to <= length, `surface "${surface.kind}" needs a kind and a range inside the lap`);
    return { ...surface };
  }).sort((a, b) => a.from - b.from);
  for (let i = 1; i < surfaceList.length; i += 1) check(surfaceList[i - 1].to <= surfaceList[i].from, 'surfaces must not overlap');
  const surfaceAt = (distance) => {
    const d = wrap(distance);
    return surfaceList.find((surface) => d >= surface.from && d < surface.to)?.kind || 'default';
  };
  // Banked bends (the old Monza "parabolica"): the outer edge rises by tan(angle) per metre of lane; ramps in and out over 22 m.
  const bankList = bankings.map((bank) => {
    check(Number.isFinite(bank.from) && Number.isFinite(bank.to) && bank.to - bank.from >= 50 && bank.from >= 0 && bank.to <= length && Number.isFinite(bank.angle) && Math.abs(bank.angle) <= 40, 'a banking needs from/to (at least 50 m apart, inside the lap) and an angle up to 40 degrees');
    return { ...bank, radians: bank.angle * Math.PI / 180, side: bank.side === -1 ? -1 : 1 };
  });
  const bankAt = (distance) => {
    if (!bankList.length) return 0;
    const d = wrap(distance);
    for (const bank of bankList) {
      if (d < bank.from || d > bank.to) continue;
      const blend = 22;
      const edge = Math.min(d - bank.from, bank.to - d);
      const t = Math.min(1, edge / blend);
      return bank.radians * bank.side * t * t * (3 - 2 * t);
    }
    return 0;
  };
  // Solid props on the road (see obstacles.js). Refused outright when they would wall the circuit off or bury a
  // crate: a circuit you cannot get through is worse than one with nothing in the way.
  const obstacleList = obstacles.map((item, index) => normalizeObstacle(item, index));
  checkObstacles(obstacleList, { length, roadWidth, boxes, boosts, ramps, sections }, (message) => check(false, message));
  // Animals crossing the road (see critters.js): data like the obstacles, so the race knows where they are.
  const critterList = critters.map((item, index) => normalizeCritter(item, index, roadWidth));
  checkCritters(critterList, { length, ramps, sections }, (message) => check(false, message));
  return Object.freeze({
    id, name, description, tagline, laps, roadWidth, length, theme: fullTheme, controlPoints: points,
    obstacles: obstacleList.map((item) => Object.freeze(item)),
    critters: critterList.map((item) => Object.freeze(item)),
    ramps: copyItems(ramps, 'ramp'), boosts: copyItems(boosts, 'boost pad'), boxes: copyItems(boxes, 'box'),
    landmarks: landmarks.map(item => ({ ...item })), gates: copyItems(gates, 'gate'),
    elevationBumps: bumps, hasElevation: bumps.length > 0, elevation: elevationAt, slope: slopeAt, groundHeight,
    sections, surfaces: surfaceList, surfaceAt, bankings: bankList, hasBanking: bankList.length > 0, bank: bankAt,
    bounds, wrap, frame, points: trackPoints,
  });
}

// Circuits with a lot of local detail live in their own files under src/tracks/ (definitions only, no three.js).
export const TRACK_DEFINITIONS = [
  {
    id: 'nuvole', name: 'Il circuito delle nuvole', tagline: 'Curve morbide e grandi salti',
    description: 'Curve morbide, grandi salti e una sorpresa in ogni cassa. La pista dove tutto è cominciato.',
    length: 550, roadWidth: 14, laps: 3,
    controlPoints: [
      [0, -75], [51, -69], [78, -31], [58, 9], [75, 48],
      [33, 79], [-11, 60], [-54, 78], [-79, 35], [-62, -8], [-77, -48], [-39, -73],
    ],
    ramps: [ramp('ramp-1', 106), ramp('ramp-2', 357)],
    boosts: [pad('pad-1', 57, -3.7), pad('pad-2', 254, 3.7), pad('pad-3', 462, 0)],
    boxes: [...boxRow('a', 37), ...boxRow('b', 202), ...boxRow('c', 316), ...boxRow('d', 439)],
    // A breezy afternoon: the clouds travel, the trees lean and the sun walks across the sky.
    theme: { wind: 0.55, sunTravel: 60 },
  },
  ARCA_TRACK,
  REGNANO_TRACK,
  MAGRA_TRACK,
  {
    id: 'aprica', name: 'Aprica: Corso Roma', tagline: 'L’otto tra Percorso Vita e Campo Vecchio',
    description: 'Un otto sulla neve: si passa sotto l’arco di ferro di Corso Roma, si sale e si scende sul Percorso Vita tra le piste da sci, poi il ponte sul fiume porta tra le baite di Campo Vecchio.',
    length: 700, roadWidth: 12, laps: 3,
    controlPoints: [[-55, -70], [0, 0], [55, 70], [70, 120], [25, 150], [-30, 130], [-55, 75], [0, 0], [55, -70], [70, -120], [25, -150], [-30, -130]],
    ramps: [ramp('ramp-1', 175), ramp('ramp-2', 600)],
    boosts: [pad('pad-1', 30, -3.2), pad('pad-2', 250, 3.2), pad('pad-3', 520, 0)],
    boxes: [...boxRow('a', 120, [-3.6, 0, 3.6]), ...boxRow('b', 330, [-3.6, 0, 3.6]), ...boxRow('c', 480, [-3.6, 0, 3.6]), ...boxRow('d', 650, [-3.6, 0, 3.6])],
    // Percorso Vita climbs and drops on the mountain loop; the Campo Vecchio road crosses Corso Roma on a bridge.
    elevation: [{ distance: 190, length: 130, height: 6 }, { distance: 305, length: 100, height: 4 }, { distance: 426, length: 120, height: 7.5, bridge: true }],
    gates: [{ id: 'arco', distance: 45, name: 'CORSO ROMA' }],
    // Snow: two piste markers left in the road after the groomer went by, and two lumps of hard snow ploughed
    // off the verge. The road is 12 m wide here, so they never stand three abreast.
    obstacles: [
      solid('paletto-1', 'cone', 60, -3.4), solid('paletto-2', 'cone', 66, 3.4),
      solid('neve-1', 'rock', 150, 2.6), solid('paletto-3', 'cone', 290, -3.4), solid('neve-2', 'rock', 560, -2.6),
    ],
    landmarks: [
      { kind: 'village', name: 'APRICA', distance: 115, lane: -27 },
      { kind: 'skislope', name: 'PERCORSO VITA', distance: 200, lane: 30 },
      { kind: 'chairlift', name: '', distance: 300, lane: 28 },
      { kind: 'river', name: 'IL FIUME', distance: 520, lane: 27 },
      { kind: 'chalet', name: 'CAMPO VECCHIO', distance: 570, lane: -28 },
      { kind: 'chalet', name: '', distance: 655, lane: -27 },
    ],
    theme: {
      local: 'aprica', wind: 0.4, snow: 900, sky: 0xe4f1fb, fog: 0xe4f1fb, fogNear: 90, fogFar: 260, ground: 0xf4f7fb, shoulder: 0xffffff, road: 0x4a4e5a,
      curb: [0x3b8de0, 0xffffff], trees: { trunk: 0x8a6a52, crown: 0x4f8f6a, top: 0xe9f4f7, hue: 0.4, count: 70 },
      hills: [0xdfe9f3, 0xc9d8ea, 0xb9c9dc], flags: [0x3b8de0, 0xffffff],
    },
  },
  NOTTE_TRACK,
  BRUGHERIO_TRACK,
  {
    id:'milano',name:'Milano Sprint',tagline:'Duomo, tram gialli e castello',
    description:'Una corsa tra le guglie del Duomo, i tram gialli e le torri del castello. La città è tutta per i piccoli piloti!',
    length:640,roadWidth:16,laps:2,
    controlPoints:[[-100,-65],[-30,-65],[50,-65],[105,-45],[110,15],[90,65],[25,70],[-40,70],[-100,50],[-110,0]],
    ramps:[ramp('ramp-1',145),ramp('ramp-2',425)],
    boosts:[pad('pad-1',90,-3.7),pad('pad-2',290,3.7),pad('pad-3',550,0)],
    boxes:[...boxRow('a',38),...boxRow('b',240),...boxRow('c',375),...boxRow('d',520)],
    // City furniture you cannot drive through: the planters outside the castle and two cones by the roadworks.
    obstacles:[
      solid('fioriera-1','planter',310,-3.2), solid('fioriera-2','planter',330,3.2),
      solid('cono-1','cone',400,-4.6), solid('cono-2','cone',404,4.6),
    ],
    landmarks:[
      {kind:'duomo',name:'PIAZZA DUOMO',distance:80,lane:-32},
      {kind:'tram',name:'TRAM DI MILANO',distance:205,lane:-21},
      {kind:'castle',name:'CASTELLO SFORZESCO',distance:330,lane:42},
      {kind:'skyline',name:'MILANO',distance:530,lane:-32},
    ],
    theme:{local:'milano',mist:8,wind:0.35,sky:0xd8e8fa,fog:0xd8e8fa,ground:0xe2d9cc,road:0x5e687a,shoulder:0xf1e8db,
      curb:[0xf4ce58,0xf9f3de],hills:[],trees:{count:22},flags:[0xed5e62,0xffffff],lamps:true},
  },
  COMO_TRACK,
  INCREA_TRACK,
  VILLASANTA_TRACK,
  CRETE_TRACK,
  {
    id:'bergamo',name:'Bergamo di Notte',tagline:'Città Alta, Porta Nuova e lo stadio sotto le stelle',
    description:'Una stellata pazzesca sopra Bergamo: parti dallo stadio nerazzurro, passa tra i due palazzi di Porta Nuova, costeggia la funicolare e gira intorno alle mura di Città Alta con il Campanone acceso.',
    length:680,roadWidth:14,laps:3,
    controlPoints:[[-110,-50],[-40,-78],[45,-80],[110,-50],[130,5],[100,60],[40,82],[-30,75],[-95,60],[-135,10]],
    ramps:[ramp('ramp-1',95),ramp('ramp-2',330),{...ramp('ramp-3',520),height:2.5}],
    boosts:[pad('pad-1',50,-3.7),pad('pad-2',250,3.7),pad('pad-3',450,0)],
    boxes:[...boxRow('a',20),...boxRow('b',190),...boxRow('c',400),...boxRow('d',600)],
    landmarks:[
      {kind:'stadium',name:'STADIO DELL’ATALANTA',distance:30,lane:44},
      {kind:'propileo',name:'PORTA NUOVA',distance:200,lane:-25},
      {kind:'propileo',name:'',distance:200,lane:25},
      {kind:'funicular',name:'FUNICOLARE',distance:340,lane:-30},
      {kind:'cittaalta',name:'CITTÀ ALTA',distance:440,lane:-50},
      {kind:'village',name:'BERGAMO BASSA',distance:600,lane:28},
    ],
    theme:{local:'bergamo',sky:0x070a1c,fog:0x11162f,fogNear:80,fogFar:260,ground:0x1d3230,road:0x3a3f52,shoulder:0x7d84a8,
      curb:[0x1e5bd8,0xf4f0e2],stripe:0xc5c6d6,hills:[0x1c2040,0x252a52,0x161a36],trees:{trunk:0x4a3d4a,crown:0x1f4a3d,top:0x2b5e4c,hue:0.42,count:50},
      flags:[0x1e5bd8,0x111111],clouds:true,cloudColor:0x2b3350,wind:0.3,lamps:true,stars:{count:2800,milkyWay:true},
      light:{hemiSky:0x7f93ff,hemiGround:0x1c2038,hemiIntensity:1.45,sun:0xaebcff,sunIntensity:1.6}},
  },
  STADIO_TRACK,
  ADDA_TRACK,
  BERNINA_TRACK,
  ALBA_TRACK,
  INTERVALLO_TRACK,
  VARESE_TRACK,
];

export const TRACKS = TRACK_DEFINITIONS.map(createTrack);
export const DEFAULT_TRACK = TRACKS[0];
export const getTrack = (id) => TRACKS.find((track) => track.id === id) || DEFAULT_TRACK;

// Aliases of the default circuit. Nothing in the game reads these any more: they exist so the tests written
// against the single-track version keep pinning "Il circuito delle nuvole" to its original numbers.
export const TRACK_LENGTH = DEFAULT_TRACK.length;
export const ROAD_WIDTH = DEFAULT_TRACK.roadWidth;
export const TOTAL_LAPS = DEFAULT_TRACK.laps;
export const TRACK_RAMPS = DEFAULT_TRACK.ramps;
export const TRACK_BOOSTS = DEFAULT_TRACK.boosts;
export const TRACK_BOXES = DEFAULT_TRACK.boxes;
export const wrapDistance = DEFAULT_TRACK.wrap;
export const getTrackFrame = DEFAULT_TRACK.frame;
export const getTrackPoints = DEFAULT_TRACK.points;
