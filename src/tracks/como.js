import { boxRow, ramp, pad } from '../track-helpers.js';

/**
 * Lake Como as seen from above: an inverted Y. The road runs clockwise around the whole shore
 * (Como, west shore, Colico, east shore, Lecco, Bellagio, back to Como) with the water on the left,
 * so the loop interior is the lake. Two iron bridges cross the water and skip the Colico and Lecco tips.
 * Control points come from scripts/como-generate.mjs (three capsules around the junction, filleted corners).
 */
export const COMO_TRACK = {
  id: 'como', name: 'Il Giro del Lago di Como', tagline: 'Ponti di ferro, battelli e Bellagio',
  description: 'Il lago a forma di Y visto dall’alto: parti da Como, corri veloce sul lungolago tra le montagne, passa da Menaggio, Colico, Varenna, Lecco e Bellagio. Due ponti di ferro sull’acqua sono le scorciatoie: prendili dalla corsia verso il lago!',
  length: 980, roadWidth: 14, laps: 2,
  controlPoints: [[-117, 99.5], [-108.8, 88.6], [-100.5, 77.7], [-92.2, 66.8], [-83.9, 55.9], [-75.6, 45], [-67.4, 34.1], [-59.1, 23.2], [-50.8, 12.3], [-42.5, 1.4], [-34.3, -9.5], [-30, -22.3], [-27.9, -35.8], [-25.8, -49.4], [-23.7, -62.9], [-21.6, -76.4], [-19.6, -89.9], [-17.5, -103.5], [-15.4, -117], [-13.3, -130.5], [-11.2, -144], [-6.2, -156.6], [3.5, -166.2], [16.2, -171], [29.8, -170.3], [41.9, -164.1], [50.5, -153.6], [54.2, -140.6], [52.9, -127], [50.8, -113.5], [48.8, -99.9], [46.7, -86.4], [44.6, -72.9], [42.5, -59.4], [40.4, -45.8], [38.4, -32.3], [36.3, -18.8], [35.4, -5.2], [40.6, 7.4], [46.7, 19.6], [52.8, 31.9], [58.9, 44.1], [65.1, 56.3], [71.2, 68.6], [77.3, 80.8], [83.4, 93.1], [89.3, 105.4], [91, 118.9], [87.2, 131.9], [78.4, 142.3], [66.2, 148.3], [52.7, 148.8], [40, 143.9], [30.4, 134.2], [24.1, 122.1], [18, 109.8], [11.9, 97.6], [5.6, 85.5], [-5.7, 78.4], [-18.8, 81], [-27.9, 91.2], [-36.1, 102.1], [-44.4, 113], [-52.7, 123.9], [-61, 134.8], [-70, 145], [-82.1, 151.2], [-95.6, 152.1], [-108.3, 147.3], [-118.1, 137.9], [-123.2, 125.3], [-122.8, 111.7]],
  ramps: [ramp('ramp-1', 60), ramp('ramp-2', 470), ramp('ramp-3', 860)],
  boosts: [pad('pad-1', 118, -3.7), pad('pad-2', 300, 3.7), pad('pad-3', 528, 0), pad('pad-4', 700, 3.7), pad('pad-5', 915, -3.7)],
  boxes: [...boxRow('a', 20), ...boxRow('b', 205), ...boxRow('c', 430), ...boxRow('d', 565), ...boxRow('e', 815)],
  // Iron bridges over the water, entered from the lake-side lane: they skip the Colico tip and the Lecco tip.
  // They arch high because the lake is a working one: a "battello" carries its funnel 5.4 m up and has to fit under.
  shortcuts: [
    { id: 'ponte-nord', name: 'PONTE DI FERRO DEL NORD', from: 242, to: 404, arch: 9 },
    { id: 'ponte-lecco', name: 'PONTE DI FERRO DI LECCO', from: 600, to: 748, arch: 9 },
  ],
  landmarks: [
    { kind: 'villa', name: 'VILLA D’ESTE · CERNOBBIO', distance: 30, lane: 29 },
    { kind: 'villa', name: 'VILLA CARLOTTA · TREMEZZO', distance: 90, lane: 30 },
    { kind: 'village', name: 'MENAGGIO', distance: 140, lane: 28 },
    { kind: 'village', name: 'COLICO', distance: 324, lane: 28 },
    { kind: 'village', name: 'VARENNA', distance: 504, lane: 28 },
    { kind: 'lecco', name: 'LECCO', distance: 674, lane: 33 },
    { kind: 'bellagio', name: 'BELLAGIO', distance: 792, lane: 50 },
    { kind: 'comocity', name: 'COMO', distance: 928, lane: 37 },
  ],
  theme: {
    local: 'como', wind: 0.6, sky: 0xbfe4f6, fog: 0xcfe6f2, fogNear: 170, fogFar: 540, ground: 0x8fb787, road: 0x6e7682,
    shoulder: 0xefe0c2, curb: [0x2f9fbf, 0xffffff], trees: { count: 70, crown: 0x4f8f5c, top: 0x6aa870 }, hills: [],
    flags: [0x2f9fbf, 0xffcf6b],
  },
};
