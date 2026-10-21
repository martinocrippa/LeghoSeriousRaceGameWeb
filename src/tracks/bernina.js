import { boxRow, ramp, pad } from '../track-helpers.js';

/**
 * Passo del Bernina in summer: switchbacks down from the Aprica pass, across the Valtellina floor through
 * Tirano (the sanctuary, the old town gate, the station where the little red train starts) and back up to the
 * Bernina pass past the Brusio spiral viaduct, the glacier and a ski jump on the long descent.
 * The red train runs its own line all around the circuit and crosses over the road on stone viaducts.
 * Height profile: Aprica 11 m at the start, the valley floor at 0 from 210 to 480, the pass 17 m at 640.
 */
export const BERNINA_TRACK = {
  id: 'bernina', name: 'Passo del Bernina', tagline: 'Il trenino rosso, Tirano e i tornanti del passo',
  description: 'Si parte dal passo dell’Aprica e si scende a tornanti fino a Tirano, tra il santuario e la porta del paese; poi si risale tutto il Bernina con il trenino rosso che passa sopra la strada sui viadotti di pietra, il ghiacciaio che luccica e un trampolino da sci per il salto più lungo della gara.',
  // The railway in src/scenery/bernina.js is written in world metres and assumes this length: changing it
  // rescales the whole loop and the line would no longer run between the switchbacks.
  length: 900, roadWidth: 12, laps: 2,
  // Four switchback rows joined by wide U-turns, then the long climb and descent on the outer road.
  controlPoints: [[-30, -180], [50, -180], [82, -167], [95, -135], [82, -103], [50, -90], [-30, -90], [-62, -77], [-75, -45], [-62, -13], [-30, 0], [50, 0], [82, 13], [95, 45], [82, 77], [50, 90], [-30, 90], [-80, 110], [-130, 80], [-150, 20], [-150, -60], [-150, -130], [-120, -185], [-75, -195]],
  // The last ramp is the ski jump proper: the road climbs to the pass, and on the way down the take-off lip throws
  // the car into the longest flight in the game. `launch` scales with the car's own speed so it lands back on the
  // road at every difficulty, not just at one.
  ramps: [ramp('ramp-1', 120), { ...ramp('ramp-2', 380), height: 2.4 }, { ...ramp('ramp-3', 700), length: 18, height: 4.6, launch: 1.9 }],
  boosts: [pad('pad-1', 40, -3.2), pad('pad-2', 250, 3.2), pad('pad-3', 470, 0), pad('pad-4', 560, -3.2), pad('pad-5', 800, 3.2)],
  boxes: [...boxRow('a', 200, [-3.6, 0, 3.6]), ...boxRow('b', 300, [-3.6, 0, 3.6]), ...boxRow('c', 500, [-3.6, 0, 3.6]), ...boxRow('d', 620, [-3.6, 0, 3.6]), ...boxRow('e', 780, [-3.6, 0, 3.6])],
  // Down from the Aprica pass, flat along the Valtellina, then up to the Bernina pass and down again.
  elevation: [{ distance: 60, length: 300, height: 11 }, { distance: 640, length: 340, height: 17 }],
  surfaces: [{ from: 296, to: 356, kind: 'cobbles' }],
  gates: [{ id: 'porta', distance: 330, name: 'PORTA POSCHIAVINA' }],
  landmarks: [
    { kind: 'passo', name: 'PASSO DELL’APRICA', distance: 55, lane: 30 },
    { kind: 'bosco', name: 'I BOSCHI DELLA VALTELLINA', distance: 210, lane: 30 },
    { kind: 'santuario', name: 'SANTUARIO DELLA MADONNA DI TIRANO', distance: 300, lane: -34 },
    { kind: 'village', name: 'TIRANO', distance: 360, lane: 30 },
    { kind: 'stazione', name: 'STAZIONE DEL TRENINO ROSSO', distance: 415, lane: 30 },
    { kind: 'viadotto', name: 'VIADOTTO CIRCOLARE DI BRUSIO', distance: 462, lane: 46 },
    { kind: 'ospizio', name: 'OSPIZIO BERNINA · LAGO BIANCO', distance: 660, lane: 36 },
    { kind: 'ghiacciaio', name: 'IL PIZ BERNINA', distance: 690, lane: 96 },
    { kind: 'trampolino', name: 'IL TRAMPOLINO DA SCI', distance: 700, lane: 30 },
  ],
  theme: {
    local: 'bernina', wind: 0.45, cloudRise: 1, sky: 0x86c9f2, fog: 0xbfe0f2, fogNear: 150, fogFar: 460, ground: 0x7fb063, road: 0x474b55,
    shoulder: 0xb8b3a4, curb: [0xd94141, 0xf4f0e2], stripe: 0xe4e4e8, hills: [],
    trees: { trunk: 0x5b4630, crown: 0x2f5a3a, top: 0x3d6b45, hue: 0.38, count: 120 },
    bricks: [0xd94141, 0xf4f0e2, 0x3b8de0], flags: [0xd94141, 0xf4f0e2], clouds: true,
    light: { hemiSky: 0xeaf6ff, hemiGround: 0x62855a, hemiIntensity: 2.3, sun: 0xfff8ea, sunIntensity: 3.7 },
  },
};
