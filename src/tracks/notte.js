import { boxRow, ramp, pad } from '../track-helpers.js';

/**
 * La Notte Stellata, set in the Brianza hills between Montevecchia, Usmate Velate and Arcore: a night race under the
 * Milky Way with a big hairpin under the sanctuary hill, gentle climbs, glowing villas and terraced vineyards.
 * Clockwise loop: negative lanes face the interior, positive lanes are the outer side (the hairpin's outside too).
 */
export const NOTTE_TRACK = {
  id: 'notte', name: 'Notte Stellata in Brianza', tagline: 'Montevecchia, Usmate e Arcore sotto le stelle',
  description: 'Una notte magica tra le colline verdi della Brianza: il grande tornante sotto il santuario di Montevecchia con la sua scalinata illuminata, le ville di Usmate Velate e di Arcore con le finestre accese, i vigneti a terrazze e un cielo pieno di stelle e Via Lattea.',
  length: 660, roadWidth: 14, laps: 3,
  controlPoints: [[-100, -40], [-30, -60], [40, -40], [100, -60], [150, -15], [120, 45], [50, 25], [-30, 55], [-110, 50], [-162, 22], [-160, -24]],
  ramps: [ramp('ramp-1', 40), ramp('ramp-2', 210), ramp('ramp-3', 470)],
  elevation: [{ distance: 120, length: 140, height: 5 }, { distance: 400, length: 160, height: 6.5 }, { distance: 580, length: 120, height: 4.5 }],
  boosts: [pad('pad-1', 100, 3.7), pad('pad-2', 340, -3.7), pad('pad-3', 600, 0)],
  boxes: [...boxRow('a', 128), ...boxRow('b', 300), ...boxRow('c', 385), ...boxRow('d', 555)],
  landmarks: [
    { kind: 'villascaccabarozzi', name: 'VILLA SCACCABAROZZI · USMATE', distance: 90, lane: 31 },
    { kind: 'chiesa', name: 'USMATE VELATE', distance: 160, lane: -28 },
    { kind: 'montevecchia', name: 'MONTEVECCHIA', distance: 275, lane: 64 },
    { kind: 'villaborromeo', name: 'VILLA BORROMEO D’ADDA · ARCORE', distance: 430, lane: 35 },
    { kind: 'village', name: 'ARCORE', distance: 500, lane: -28 },
    { kind: 'vigneti', name: 'I VIGNETI A TERRAZZE', distance: 590, lane: 40 },
  ],
  theme: {
    local: 'brianza', wind: 0.3, sky: 0x141a36, fog: 0x1a2140, fogNear: 80, fogFar: 250, ground: 0x1f3a2a, road: 0x3a3f52, shoulder: 0x8a93b0,
    curb: [0xffd45a, 0x2b2f4a], stripe: 0xc5c6d6,
    trees: { trunk: 0x3f3a44, crown: 0x1f4a3d, top: 0x2b5e4c, hue: 0.4, count: 70 },
    hills: [0x1b3326, 0x223f2f, 0x16281f], bricks: [0x6f5fa8, 0xb08a4a, 0x4f7f8f], flags: [0xffd45a, 0x8b66d9],
    clouds: false, lamps: true, stars: { count: 2200, milkyWay: true },
    light: { hemiSky: 0x8fa3ff, hemiGround: 0x1c2a24, hemiIntensity: 1.5, sun: 0xb8c6ff, sunIntensity: 1.7 },
  },
};
