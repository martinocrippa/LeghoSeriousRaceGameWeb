import { boxRow, ramp, pad } from '../track-helpers.js';

/**
 * Regnano Castello, Casola in Lunigiana: the medieval hamlet on its ridge, in summer. The road climbs to the
 * borgo on tarmac, runs through the stone alleys on cobbles and under two vaulted passages between the houses,
 * then drops into the chestnut woods on gravel. The castle and the Romanesque church are ruins and stay ruins.
 * The Apuan Alps close the horizon, white with marble.
 * Height profile: the ridge with the borgo at 12 m, the woods at the bottom, the belvedere at 9 m.
 * Clockwise loop: POSITIVE lanes are the outer side, NEGATIVE lanes face the inside of the ring.
 */
export const REGNANO_TRACK = {
  id: 'regnano', name: 'Regnano Castello', tagline: 'Il borgo di pietra tra i castagni, sotto le Apuane',
  description: 'Un paese di pietra tra i castagni: si sale sull’asfalto fino al borgo, si passa sui sanpietrini tra le case di pietra e sotto due volte, poi si scende nella terra battuta dei castagneti. Il castello e la chiesa dell’anno Mille sono rovine in mezzo al verde, i trattori girano per il paese e dal belvedere si vedono tutte le Alpi Apuane.',
  length: 760, roadWidth: 12, laps: 3,
  controlPoints: [[-45, -98], [25, -105], [80, -82], [112, -38], [105, 15], [70, 55], [20, 80], [-35, 92], [-88, 78], [-116, 30], [-108, -28], [-82, -72]],
  ramps: [ramp('ramp-1', 330), { ...ramp('ramp-2', 480), height: 2.4 }, ramp('ramp-3', 660)],
  boosts: [pad('pad-1', 60, -3.2), pad('pad-2', 200, 3.2), pad('pad-3', 280, 0), pad('pad-4', 420, -3.2), pad('pad-5', 580, 3.2)],
  boxes: [...boxRow('a', 100, [-3.6, 0, 3.6]), ...boxRow('b', 240, [-3.6, 0, 3.6]), ...boxRow('c', 400, [-3.6, 0, 3.6]), ...boxRow('d', 560, [-3.6, 0, 3.6]), ...boxRow('e', 730, [-3.6, 0, 3.6])],
  // Up the ridge to the borgo, down into the woods, up again to the belvedere over the valley.
  elevation: [{ distance: 140, length: 320, height: 12 }, { distance: 520, length: 240, height: 9 }],
  // The two vaulted passages are built in src/scenery/regnano.js (PASSAGES), not as `gates`: they are stone rooms
  // bridging the lane, and they top out below the chase camera on purpose.
  // Tarmac up from the valley, cobbles through the alleys, gravel in the chestnut woods.
  surfaces: [
    { from: 20, to: 120, kind: 'asphalt' },
    { from: 140, to: 320, kind: 'cobbles' },
    { from: 340, to: 470, kind: 'dirt' },
    { from: 620, to: 730, kind: 'dirt' },
  ],
  // The donkey from its corner by the road comes out and crosses, slowly, right before the jump (critters.js).
  critters: [{ id: 'asino', kind: 'donkey', distance: 296, offset: 4 }],
  landmarks: [
    { kind: 'castello', name: 'IL CASTELLO DIROCCATO', distance: 120, lane: -44 },
    { kind: 'borgo', name: 'IL BORGO DI REGNANO', distance: 175, lane: 34 },
    { kind: 'chiesa', name: 'LA CHIESA DELL’ANNO MILLE', distance: 230, lane: -38 },
    { kind: 'asino', name: 'L’ANGOLO DELL’ASINO', distance: 300, lane: 30 },
    { kind: 'orto', name: 'L’ORTO DEL CONTADINO', distance: 420, lane: -30 },
    { kind: 'belvedere', name: 'IL BELVEDERE SULLE APUANE', distance: 520, lane: 34 },
    { kind: 'apuane', name: 'LE ALPI APUANE', distance: 560, lane: 170 },
    { kind: 'trattore', name: 'IL TRATTORE DI REGNANO', distance: 640, lane: 28 },
    { kind: 'castagneto', name: 'IL CASTAGNETO', distance: 700, lane: -32 },
  ],
  theme: {
    local: 'regnano', wind: 0.35, sunTravel: 75, cloudRise: 0.5, sky: 0x9fd0ef, fog: 0xc6dcea, fogNear: 150, fogFar: 520,
    ground: 0x4e7034, road: 0x6d6155, shoulder: 0x8a7f6c, stripe: 0x7d7264,
    curb: [0x7d6f5c, 0xd8cfb8], hills: [],
    trees: { trunk: 0x5c4531, crown: 0x3f6b32, top: 0x58853f, hue: 0.3, count: 150 },
    bricks: [0x8a7f6c, 0xa8503c, 0x3f6b32], flags: [0x2f6b3a, 0xd8cfb8], clouds: true,
    light: { hemiSky: 0xdff0ff, hemiGround: 0x5a6b3a, hemiIntensity: 2.2, sun: 0xfff3dc, sunIntensity: 3.4 },
  },
};
