import { boxRow, ramp, pad, solid } from '../track-helpers.js';

/**
 * Varese Town. The lap as it was described: you come off the motorway at Gazzada, go round the
 * roundabout with the orange fighter jet on it, climb toward Varese through the chicanes on the hill, pass via
 * del Diamante where a grey half-finished house stands among the little ones like a fort, go by the village church
 * and the Varese villas — the ones that look out at Mont Blanc, some with palm trees in the garden — then drop
 * down to the lake, run along the cycle path past the mini churches, the big villa standing in the water, the reed
 * beds, the fishermen's huts and the jetties, and back round to Gazzada.
 *
 * All tarmac, from end to end, and the roads go through roundabouts: four of them, and a roundabout here is a real
 * island in the middle of the road (see obstacles.js) — you pick a side and go round it, you do not drive over it.
 *
 * Geometry: the control points were laid out in polar coordinates with a strictly growing angle, which is what
 * keeps a 1180 m loop with chicanes from crossing itself. Positive lanes are the OUTSIDE of the loop, so the lake
 * is on the positive side of the lakeside stretch and the hillside is on the negative side of the climb.
 */
export const VARESE_TRACK = {
  id: 'varese', name: 'Varese Town', tagline: 'Dall’autostrada alla collina, e giù al lago',
  description: 'Esci dall’autostrada a Gazzada, gira intorno alla rotonda con l’aereo arancione e sali verso Varese tra i tornantini. Passi da via del Diamante, davanti alla casa grigia che sembra un fortino, tra le chiesette e le ville con le palme e il Monte Bianco all’orizzonte. Poi giù al lago: la ciclabile, il villone nell’acqua, i canneti, le baracche dei pescatori e le canoe. Tutta asfaltata!',
  length: 1180, roadWidth: 14, laps: 2,
  controlPoints: [
    // Gazzada: the motorway slip road and the roundabout with the jet.
    [54, -141], [96, -130], [128, -104], [147, -71],
    // Up the hill toward Varese: four chicanes, one after the other.
    [152, -37], [174, -5], [153, 27], [155, 63], [120, 84],
    // Via del Diamante, among the little houses.
    [99, 114], [62, 122], [30, 141],
    // The ridge: the village church and the villas looking at Mont Blanc.
    [-9, 149], [-48, 140], [-88, 134],
    // Down toward the lake.
    [-126, 117], [-151, 89], [-176, 60],
    // The lakeside and the cycle path, with the water on the outside.
    [-190, 25], [-188, -11], [-176, -45], [-154, -75],
    // Reed beds, the fishermen's huts and the jetties, then back east to Gazzada.
    [-129, -101], [-101, -125], [-66, -144], [-26, -155], [16, -152],
  ],
  // Two speed humps on the way up: there is no jump on this lap, it is a road through a town.
  ramps: [{ ...ramp('dosso-1', 250), height: 1.4 }, { ...ramp('dosso-2', 660), height: 1.4 }],
  boosts: [pad('pad-1', 150, -3.7), pad('pad-2', 420, 3.7), pad('pad-3', 860, 0), pad('pad-4', 1140, -3.7)],
  boxes: [...boxRow('a', 60), ...boxRow('b', 340), ...boxRow('c', 520), ...boxRow('d', 760), ...boxRow('e', 1080)],
  // The hill. Gazzada and the lake are at the bottom, Varese is 26 m up in the middle of the lap.
  elevation: [{ distance: 460, length: 640, height: 26 }],
  /**
   * The four roundabouts. The island is 1.9 m across the road, which on a 14 m carriageway leaves 2.9 m of lane
   * either side — enough to pick a side and go round, and the circuit refuses anything tighter.
   */
  obstacles: [
    solid('rotonda-gazzada', 'island', 30, 0),
    solid('rotonda-collina', 'island', 300, 0),
    solid('rotonda-varese', 'island', 560, 0),
    solid('rotonda-lago', 'island', 830, 0),
    // Two bins outside the huts and a planter in front of the church: the town furniture you have to go round.
    solid('fioriera-chiesa', 'planter', 600, -3.4),
    solid('bidone-1', 'bin', 960, 4),
  ],
  landmarks: [
    { kind: 'autostrada', name: 'USCITA DI GAZZADA', distance: 20, lane: 36 },
    { kind: 'diamante', name: 'VIA DEL DIAMANTE', distance: 420, lane: -32 },
    { kind: 'chiesetta', name: 'LA CHIESA DEL PAESE', distance: 520, lane: 30 },
    { kind: 'villavarese', name: 'LE VILLE DI VARESE', distance: 620, lane: -34 },
    { kind: 'montebianco', name: 'IL MONTE BIANCO', distance: 700, lane: 290 },
    { kind: 'villalago', name: 'IL VILLONE SUL LAGO', distance: 860, lane: 44 },
    { kind: 'canneto', name: 'CANNETI E BARACCHE', distance: 950, lane: 36 },
    { kind: 'ciclabile', name: 'LA CICLABILE DEL LAGO', distance: 1030, lane: 30 },
    { kind: 'village', name: 'GAZZADA SCHIANNO', distance: 1120, lane: -30 },
  ],
  theme: {
    local: 'varese', wind: 0.35, sunTravel: 40, lamps: true,
    sky: 0xa8d8f0, fog: 0xc4e2f2, fogNear: 150, fogFar: 520,
    ground: 0x6f9a52, road: 0x44484f, shoulder: 0xb9b3a6, curb: [0xd94141, 0xf4f0e2], stripe: 0xe8e4d8,
    hills: [0x7fa85f, 0x5f8f4a, 0x9ab77a],
    trees: { trunk: 0x6b4a2f, crown: 0x4f8f5a, top: 0x6faa62, hue: 0.28, count: 120 },
    bricks: [0xd94141, 0xf4c95a, 0x4f8f5a], flags: [0xd94141, 0xf4f0e2], clouds: true,
    light: { hemiSky: 0xdff0ff, hemiGround: 0x6a8a52, hemiIntensity: 2.2, sun: 0xfff0d8, sunIntensity: 3.3 },
  },
};
