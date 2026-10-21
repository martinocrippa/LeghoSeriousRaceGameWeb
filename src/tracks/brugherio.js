import { boxRow, ramp, pad } from '../track-helpers.js';

/**
 * Brugherio: the fastest circuit. Two long asphalt straights joined by wide, fast bends; the town centre
 * (Piazza Roma with San Bartolomeo) is cobbled. Landmarks from the real town as toy caricatures: Palazzo
 * Ghirlanda-Silva (the library), Villa Fiorita (town hall) with its park, the church and its tall bell tower,
 * the old water tower and the little round church of San Lucio in Moncucco. Clockwise loop: negative lanes face the interior.
 */
export const BRUGHERIO_TRACK = {
  id: 'brugherio', name: 'Brugherio in Festa', tagline: 'La pista più veloce: asfalto e sanpietrini',
  description: 'La pista più veloce di tutte! Due rettilinei lunghissimi d’asfalto e curve larghe da prendere a tutto gas, poi il centro di Brugherio sui sanpietrini: Piazza Roma, il campanile di San Bartolomeo, Villa Fiorita con il parco, la torre dell’acqua e tante casette colorate.',
  length: 740, roadWidth: 14, laps: 3,
  controlPoints: [[-110, -64], [-30, -70], [50, -66], [140, -50], [185, 0], [165, 55], [80, 84], [-30, 70], [-120, 84], [-180, 52], [-205, 0], [-180, -45]],
  ramps: [ramp('ramp-1', 100), ramp('ramp-2', 480)],
  boosts: [pad('pad-1', 170, -3.7), pad('pad-2', 300, 3.7), pad('pad-3', 430, 0), pad('pad-4', 690, -3.7)],
  boxes: [...boxRow('a', 30), ...boxRow('b', 200), ...boxRow('c', 350), ...boxRow('d', 600)],
  surfaces: [{ from: 330, to: 440, kind: 'cobbles' }],
  landmarks: [
    { kind: 'palazzo', name: 'PALAZZO GHIRLANDA-SILVA', distance: 60, lane: 30 },
    { kind: 'villafiorita', name: 'VILLA FIORITA', distance: 150, lane: -33 },
    { kind: 'village', name: 'IL PAESE', distance: 232, lane: 28 },
    { kind: 'sanbartolomeo', name: 'PIAZZA ROMA · SAN BARTOLOMEO', distance: 385, lane: -29 },
    { kind: 'torre', name: 'LA TORRE DELL’ACQUA', distance: 470, lane: 30 },
    { kind: 'tempietto', name: 'TEMPIETTO DI SAN LUCIO', distance: 560, lane: -28 },
    { kind: 'village', name: 'MONCUCCO', distance: 660, lane: 29 },
  ],
  theme: {
    local: 'brugherio', wind: 0.4, sunTravel: 50, sky: 0x9fd3f2, fog: 0xc7e0f2, fogNear: 130, fogFar: 360, ground: 0x8fba6c, road: 0x3d4149, shoulder: 0xbdb7ab,
    curb: [0xff7a12, 0xf4f0e2], stripe: 0xe8e8ec, hills: [0x7fa070, 0x8fb080, 0x6f9060], trees: { count: 60 }, flags: [0x65ae81, 0xffd766], clouds: true,
  },
};
