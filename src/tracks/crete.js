import { boxRow, ramp, pad, solid } from '../track-helpers.js';

/**
 * Crete Senesi in summer: a rally up and down the white gravel roads between golden wheat fields, grey clay
 * calanchi and white "biancane", farmhouses with cypress drives, the red abbey of Monte Oliveto Maggiore and,
 * filling the horizon, an enormous Monte Amiata. Six ramps, five hills. Clockwise loop: negative lanes face the interior.
 */
export const CRETE_TRACK = {
  id: 'crete', name: 'Crete Senesi al Tramonto', tagline: 'Rally su e giù per le strade bianche',
  description: 'Un rally d’estate sulle strade bianche: si sale e si scende tra colline di grano dorato, calanchi grigi, casali con i cipressi e l’abbazia rossa di Monte Oliveto. Sei salti, polvere ovunque e un Monte Amiata gigante che riempie l’orizzonte. Occhio alle pecore e ai cinghiali!',
  length: 840, roadWidth: 14, laps: 2,
  // Fifteen control points instead of eleven: the strade bianche wind, they do not sweep. The tightest bend
  // is 14 m of radius, the most sinuous circuit of the game on a full-width road.
  controlPoints: [[-124, -58], [-66, -80], [-16, -64], [36, -82], [102, -68], [150, -24], [152, 18], [146, 56], [84, 78], [40, 56], [-16, 80], [-72, 60], [-120, 76], [-160, 30], [-156, -14]],
  ramps: [ramp('ramp-1', 40), { ...ramp('ramp-2', 175), height: 2.6 }, ramp('ramp-3', 330), { ...ramp('ramp-4', 470), height: 2.8 }, ramp('ramp-5', 610), { ...ramp('ramp-6', 760), height: 2.4 }],
  // Rally hills: the road climbs and drops five times per lap; the terrain follows it.
  elevation: [
    { distance: 95, length: 150, height: 7 }, { distance: 255, length: 130, height: 9.5 }, { distance: 420, length: 170, height: 6 },
    { distance: 560, length: 120, height: 8.5 }, { distance: 705, length: 150, height: 6.5 },
  ],
  boosts: [pad('pad-1', 130, -3.7), pad('pad-2', 290, 3.7), pad('pad-3', 430, -3.7), pad('pad-4', 570, 0), pad('pad-5', 720, 3.7)],
  boxes: [...boxRow('a', 100), ...boxRow('b', 250), ...boxRow('c', 400), ...boxRow('d', 540), ...boxRow('e', 690), ...boxRow('f', 820)],
  // Round bales fallen off a trailer and two boulders rolled down off the calanchi: on a white road they are the
  // things everybody remembers, and now you actually have to go round them.
  obstacles: [
    solid('balla-1', 'bale', 150, -3.6),
    solid('balla-2', 'bale', 156, 3.6),
    solid('masso-1', 'rock', 265, 2.8),
    solid('balla-3', 'bale', 450, -3),
    solid('masso-2', 'rock', 660, 3.2),
  ],
  // "Occhio alle pecore e ai cinghiali!": the description always promised them, and now they cross the white road
  // between one jump and the next. Two sheep walk together, a little apart; the boars trot across quickly.
  critters: [
    { id: 'pecora-1', kind: 'sheep', distance: 125, offset: 0 },
    { id: 'cinghiale-1', kind: 'boar', distance: 300, offset: 2 },
    { id: 'pecora-2', kind: 'sheep', distance: 578, offset: 4 },
    { id: 'pecora-3', kind: 'sheep', distance: 584, offset: 5.2 },
    { id: 'cinghiale-2', kind: 'boar', distance: 725, offset: 7 },
  ],
  landmarks: [
    { kind: 'biancane', name: 'LE BIANCANE', distance: 20, lane: -36 },
    { kind: 'amiata', name: 'MONTE AMIATA', distance: 150, lane: 240 },
    { kind: 'sheep', name: 'LE PECORE', distance: 230, lane: -28 },
    { kind: 'casale', name: 'PODERE DELLE CRETE', distance: 310, lane: 32 },
    { kind: 'boar', name: 'I CINGHIALI', distance: 380, lane: 28 },
    { kind: 'calanchi', name: 'I CALANCHI', distance: 460, lane: -56 },
    { kind: 'fox', name: 'LA VOLPE', distance: 520, lane: -27 },
    { kind: 'deer', name: 'I CERBIATTI', distance: 600, lane: 28 },
    { kind: 'abbazia', name: 'ABBAZIA DI MONTE OLIVETO', distance: 680, lane: 44 },
    { kind: 'hoopoe', name: 'L’UPUPA', distance: 750, lane: -26 },
    { kind: 'casale', name: 'CASALE DEI CIPRESSI', distance: 805, lane: -32 },
  ],
  theme: {
    local: 'crete', sky: 0xf2a65a, fog: 0xf6c592, fogNear: 190, fogFar: 860, ground: 0xd9b66d, road: 0xe6dcc6, shoulder: 0xcfc1a4,
    curb: [0xb5894e, 0xf6efe0], stripe: 0xd8cdb3, dust: 0xf3ead6,
    hills: [], trees: { trunk: 0x6b4a2f, crown: 0x3f6b45, top: 0x4d7d52, count: 30 }, flags: [0xff7a12, 0xf6efe0],
    light: { hemiSky: 0xffc48a, hemiGround: 0x8a6a3a, hemiIntensity: 2, sun: 0xff9a4a, sunIntensity: 3.2 },
  },
};
