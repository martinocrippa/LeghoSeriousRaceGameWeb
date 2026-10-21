import { boxRow, ramp, pad, solid } from '../track-helpers.js';

/**
 * Parco Increa (Brugherio) at dawn: a dirt rally loop around the old quarry lake, which sits in a pit in the
 * middle of the circuit. The loop follows the roads that ring the real park as a toy caricature: the long
 * Tangenziale Est straight on the west, Cascina Increa at the northern tip, the Via Increa straight on the east
 * with the park gate and the quagliodromo, then the asphalt stretch of Cernusco past the school.
 * The loop runs clockwise (west, north, east, south): positive lanes are the outer side, negative lanes face the lake.
 */
export const INCREA_TRACK = {
  id: 'increa', name: 'Parco Increa Rally', tagline: 'Terra, alba e vento intorno al lago della cava',
  description: 'Corri all’alba sulla terra scura di Parco Increa: due rettilineoni, il lago della vecchia cava in un buco al centro, oche e tartarughe sulla riva, le foglie che volano nel vento. Occhio al quagliodromo e frena sull’asfalto davanti alla scuola!',
  length: 720, roadWidth: 14, laps: 3,
  controlPoints: [
    // West: the Tangenziale Est straight, heading north (the start line is here).
    [-100, 60], [-100, 25], [-100, -10], [-100, -45], [-100, -78],
    // North tip: Cascina Increa.
    [-88, -108], [-55, -130], [-10, -139], [40, -130], [80, -106],
    // East: the Via Increa straight, heading south.
    [98, -72], [100, -36], [100, 0], [100, 36], [96, 70],
    // South: into Cernusco, past the school, and back west.
    [82, 102], [52, 124], [8, 135], [-40, 129], [-76, 107],
  ],
  ramps: [ramp('ramp-1', 118), ramp('ramp-2', 430)],
  boosts: [pad('pad-1', 60, -3.7), pad('pad-2', 300, 3.7), pad('pad-3', 560, 0)],
  boxes: [...boxRow('a', 30), ...boxRow('b', 220), ...boxRow('c', 380), ...boxRow('d', 520)],
  // The park is a green one: the meadow is the GROUND, and the road itself stays beaten earth throughout, with two
  // muddy stretches where the rain collects by the lake. Only the bit past the school is proper tarmac.
  surfaces: [
    { from: 120, to: 230, kind: 'dirt' },
    { from: 380, to: 470, kind: 'dirt' },
    { from: 540, to: 660, kind: 'asphalt' },
  ],
  // The park as it really is at dawn: a boulder on the verge of the dirt, a bale by the cascina, a fallen log and
  // the school's wheelie bin left out on the tarmac.
  obstacles: [
    solid('masso-1', 'rock', 90, -3.2),
    solid('balla', 'bale', 180, 3.4),
    solid('masso-2', 'rock', 330, 2.8),
    solid('tronco', 'bale', 480, -3),
    solid('bidone', 'bin', 640, 3.4),
  ],
  // The turtles that cross the road, turn round on the far verge and come back. They used to be scenery the cars
  // drove through; now they are on the circuit, and one you run into climbs on the car (critters.js).
  critters: [
    { id: 'tartaruga-1', kind: 'turtle', distance: 95, offset: 0 },
    { id: 'tartaruga-2', kind: 'turtle', distance: 265, offset: 6 },
    { id: 'tartaruga-3', kind: 'turtle', distance: 470, offset: 12 },
    { id: 'tartaruga-4', kind: 'turtle', distance: 655, offset: 3 },
  ],
  landmarks: [
    { kind: 'tangenziale', name: 'TANGENZIALE EST', distance: 40, lane: 32 },
    { kind: 'anfiteatro', name: 'L’ANFITEATRO', distance: 110, lane: -29 },
    { kind: 'cascina', name: 'CASCINA INCREA', distance: 250, lane: 30 },
    { kind: 'park', name: 'PARCO INCREA', distance: 350, lane: -29 },
    { kind: 'quagliodromo', name: 'QUAGLIODROMO', distance: 400, lane: 31 },
    { kind: 'lago', name: 'IL LAGO DI INCREA', distance: 450, lane: -29 },
    { kind: 'school', name: 'LA SCUOLA', distance: 600, lane: 30 },
    { kind: 'village', name: 'CERNUSCO SUL NAVIGLIO', distance: 680, lane: 29 },
  ],
  theme: {
    local: 'increa', sky: 0xf3b48a, fog: 0xf7c9a8, fogNear: 130, fogFar: 360,
    // Meadow everywhere, road of earth: the park is grass with a dirt track cut through it, not the other way round.
    ground: 0x6f8f46, road: 0x5a4632, shoulder: 0x84a052, curb: [0x2f6b3a, 0xe8d9b8], stripe: 0x9c8a6a,
    hills: [0x6f8f46, 0x7fa054, 0x5f7f3c], dust: 0xc9b79a,
    trees: { trunk: 0x5b4630, crown: 0x7a8a35, top: 0xc27a2e, hue: 0.07, count: 130 },
    flags: [0xff8a3d, 0x3b2a1e],
    light: { sun: 0xffb070, sunIntensity: 2.6, hemiSky: 0xffd2b0, hemiGround: 0x5a4a3a, hemiIntensity: 2.1 },
  },
};
