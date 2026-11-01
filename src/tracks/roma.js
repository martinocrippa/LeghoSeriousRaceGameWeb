import { boxRow, ramp, pad, solid } from '../track-helpers.js';

/**
 * Rome from sunset into the night, on cobbles all the way. The children asked for a figure of eight with one more ring,
 * where you pass over or under a gallery: the lap is three rings in a row — the Colosseum on the east, the middle
 * ring round the Circo Massimo with its rock concert, St Peter's on the west — and it crosses itself twice. At each
 * crossing one strand goes over a bridge with the angels of Ponte Sant'Angelo and the other runs underneath it
 * through a stone gallery. The seven hills are the ups and downs, the umbrella pines are everywhere, gladiators walk
 * round the Colosseum and the animals of Rome — rats, wild boars and seagulls — cross the road.
 *
 * The middle ring runs anticlockwise (positive lanes face OUT of it), the two side rings clockwise (positive lanes
 * face IN, towards the Colosseum and St Peter's). The sky changes once per lap and reaches the night on the last
 * one, whatever the number of laps (`weatherAcrossRace`).
 */
export const ROMA_TRACK = {
  id: 'roma', name: 'Roma di Sera', tagline: 'Dal tramonto alla notte, sui sanpietrini',
  description: 'Un doppio otto sui sanpietrini di Roma: giri intorno al Colosseo tra i gladiatori, passi davanti al concerto rock dei preti al Circo Massimo e al Mosè di Michelangelo, poi su e giù per i colli fino a San Pietro. Due volte passi sul ponte degli angeli e due volte sotto, nella galleria. Attenti a topi, cinghiali e gabbiani! Si parte al tramonto e si finisce sotto le stelle.',
  length: 1000, roadWidth: 14, laps: 3,
  controlPoints: [
    // The start, along the bottom of the middle ring, then over the first bridge into the Colosseum ring.
    [0, -70], [45, -55], [90, 0],
    [135, 50], [190, 55], [215, 0], [190, -55], [135, -50],
    // Under the first bridge, through its gallery, and along the top of the middle ring past the Mose.
    [90, 0], [45, 55], [0, 70], [-45, 55],
    // Under the second bridge into the St Peter's ring, then back over it.
    [-90, 0], [-135, -50], [-190, -55], [-215, 0], [-190, 55], [-135, 50],
    [-90, 0], [-45, -55],
  ],
  ramps: [ramp('ramp-1', 330), ramp('ramp-2', 625)],
  boosts: [pad('pad-1', 50, -3.7), pad('pad-2', 280, 3.7), pad('pad-3', 425, 0), pad('pad-4', 560, -3.7), pad('pad-5', 870, 3.7)],
  boxes: [...boxRow('a', 180), ...boxRow('b', 470), ...boxRow('c', 700), ...boxRow('d', 950)],
  // Two bridges over the crossings (97 m over 402 m, 902 m over 598 m) and three of the seven hills.
  elevation: [
    { distance: 97, length: 150, height: 8.5, bridge: true },
    { distance: 902, length: 150, height: 8.5, bridge: true },
    { distance: 250, length: 120, height: 6 },
    { distance: 500, length: 110, height: 4.5 },
    { distance: 750, length: 120, height: 7 },
  ],
  surfaces: [{ from: 0, to: 1000, kind: 'cobbles' }],
  // A broken Roman column by the Colosseum, the flower pots of the Mose square and the concert's crowd barriers.
  obstacles: [
    solid('colonna-1', 'column', 222, 3.4),
    solid('vaso-1', 'planter', 515, -3.2),
    solid('vaso-2', 'planter', 535, 3.2),
    solid('transenna-1', 'barrier', 975, 3.4),
    solid('transenna-2', 'barrier', 20, -3.4),
  ],
  critters: [
    { id: 'topo-1', kind: 'rat', distance: 200 },
    { id: 'gabbiano-1', kind: 'gull', distance: 300, offset: 1.5 },
    { id: 'cinghiale-1', kind: 'boar', distance: 365, offset: 2 },
    { id: 'topo-2', kind: 'rat', distance: 450, offset: 0.7 },
    { id: 'gabbiano-2', kind: 'gull', distance: 545, offset: 3 },
    { id: 'cinghiale-2', kind: 'boar', distance: 700, offset: 0.5 },
    { id: 'gabbiano-3', kind: 'gull', distance: 790 },
    { id: 'topo-3', kind: 'rat', distance: 810, offset: 2.2 },
  ],
  landmarks: [
    { kind: 'colosseo', name: 'IL COLOSSEO', distance: 250, lane: 45 },
    { kind: 'mose', name: 'IL MOSÈ DI MICHELANGELO', distance: 500, lane: 30 },
    { kind: 'sanpietro', name: 'SAN PIETRO', distance: 750, lane: 45 },
    // Outside the bend at the foot of the second bridge: coming down it, the stage is straight ahead.
    { kind: 'concerto', name: 'IL CONCERTO ROCK DEI PRETI · CIRCO MASSIMO', distance: 990, lane: 34 },
  ],
  theme: {
    local: 'roma', wind: 0.25, lamps: true, weatherAcrossRace: true,
    sky: 0xf2a86a, fog: 0xe9a986, fogNear: 110, fogFar: 330,
    ground: 0x6f8248, road: 0x8d8983, shoulder: 0xd9cfbd, curb: [0xb5643c, 0xf1e6cc], stripe: 0xf1e6cc,
    hills: [0x7d8f55, 0x8f9a5e, 0x6c7f4a, 0x9a8a5a],
    trees: { trunk: 0x6b4a32, crown: 0x3f5a2e, top: 0x52703a, hue: 0.25, count: 0 },
    bricks: [0xb5643c, 0xe0b25a, 0xf1e6cc], flags: [0xc8102e, 0xf0b41c], clouds: true, cloudColor: 0xf4c49a,
    stars: { count: 2200, milkyWay: false },
    light: { hemiSky: 0xffd2b0, hemiGround: 0x5a4a3a, hemiIntensity: 1.9, sun: 0xffb070, sunIntensity: 2.6 },
    // Sunset, evening, night: `stars` fades the starry sky in as the light goes.
    weather: [
      { name: 'TRAMONTO', sky: 0xf2a86a, fog: 0xe9a986, fogNear: 110, fogFar: 330, sun: 0xffb070, sunIntensity: 2.6, hemiIntensity: 1.9, stars: 0 },
      { name: 'SERA', sky: 0x7d5a8c, fog: 0x7a5d84, fogNear: 95, fogFar: 300, sun: 0xff9466, sunIntensity: 1.4, hemiIntensity: 1.5, stars: 0.45 },
      { name: 'NOTTE', sky: 0x0b1030, fog: 0x171d3e, fogNear: 80, fogFar: 270, sun: 0xaebcff, sunIntensity: 0.9, hemiIntensity: 1.15, stars: 1 },
    ],
  },
};
