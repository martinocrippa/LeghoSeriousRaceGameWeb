import { boxRow, ramp, pad } from '../track-helpers.js';

/**
 * The Adda between Imbersago and Villa d'Adda in autumn. The river runs straight through the middle of the
 * loop and the road crosses it twice: north on a little wooden bridge, south on the Ponte San Michele, whose
 * lower deck carries the railway (the train really does pass underneath the cars).
 * Clockwise from Calusco d'Adda: down the covered gallery to Villa d'Adda, over the small bridge to the Lecco
 * bank under the Madonna del Bosco sanctuary (three jumps on its straight), past Imbersago and Leonardo's ferry,
 * on to Paderno and back over the Ponte San Michele to the cement works of Calusco.
 * POSITIVE lanes face the interior (the river), negative lanes are the outer side (the two banks' towns).
 */
export const ADDA_TRACK = {
  id: 'adda', name: 'L’Adda d’Autunno', tagline: 'Il traghetto di Leonardo e il Ponte San Michele',
  description: 'Foglie rosse e gialle sulle due rive dell’Adda! Scendi da Calusco dentro la galleria, passa il ponticello e corri sul rettilineo sotto il santuario della Madonna del Bosco: tre salti di fila. In mezzo al fiume il traghetto di Leonardo va avanti e indietro da solo, senza motore, e sul Ponte San Michele il treno ti passa sotto le ruote.',
  length: 800, roadWidth: 14, laps: 3,
  controlPoints: [[95, 95], [100, 40], [100, -20], [95, -75], [78, -120], [42, -152], [0, -163], [-42, -152], [-78, -120], [-100, -70], [-106, -5], [-104, 55], [-92, 105], [-58, 143], [-8, 160], [45, 150], [82, 124]],
  // The three jumps of the straight under the sanctuary.
  ramps: [{ ...ramp('ramp-1', 380), height: 2.4 }, { ...ramp('ramp-2', 440), height: 2.6 }, { ...ramp('ramp-3', 500), height: 2.4 }],
  boosts: [pad('pad-1', 60, -3.7), pad('pad-2', 230, 3.7), pad('pad-3', 330, 0), pad('pad-4', 620, -3.7), pad('pad-5', 740, 3.7)],
  boxes: [...boxRow('a', 110), ...boxRow('b', 200), ...boxRow('c', 300), ...boxRow('d', 560), ...boxRow('e', 700)],
  // Calusco and Paderno sit on their plateaus; the two river crossings are bridges, so the water below stays flat.
  // The two bridge distances (286 and 690) are repeated in src/scenery/adda.js as NORTH_CROSSING/SOUTH_CROSSING:
  // the river, the ferry and the ironwork are built from them. Move a bridge here and move them there too.
  elevation: [
    { distance: 20, length: 340, height: 8 },
    { distance: 286, length: 96, height: 4.2, bridge: true },
    { distance: 600, length: 240, height: 7 },
    { distance: 690, length: 160, height: 8, bridge: true },
  ],
  // The old towpath along the Lecco bank, right after the little bridge.
  surfaces: [{ from: 300, to: 372, kind: 'dirt' }],
  landmarks: [
    { kind: 'cementificio', name: 'IL CEMENTIFICIO DI CALUSCO', distance: 40, lane: -40 },
    { kind: 'galleria', name: 'LA GALLERIA', distance: 150, lane: -28 },
    { kind: 'village', name: 'VILLA D’ADDA', distance: 215, lane: -30 },
    { kind: 'traghetto', name: 'IL TRAGHETTO DI LEONARDO', distance: 330, lane: 30 },
    { kind: 'madonnadelbosco', name: 'SANTUARIO DELLA MADONNA DEL BOSCO', distance: 400, lane: -52 },
    { kind: 'village', name: 'IMBERSAGO', distance: 480, lane: -30 },
    { kind: 'castagneto', name: 'IL CASTAGNETO', distance: 545, lane: -30 },
    { kind: 'village', name: 'PADERNO D’ADDA', distance: 610, lane: -30 },
    { kind: 'belvedere', name: 'PONTE SAN MICHELE', distance: 645, lane: -28 },
  ],
  theme: {
    local: 'adda', wind: 0.35, sky: 0xd9dfe4, fog: 0xdfe2e0, fogNear: 110, fogFar: 320, ground: 0x7d8a52, road: 0x44474e,
    shoulder: 0xb6ac97, curb: [0xd2631f, 0xf2ead6], stripe: 0xdcdcd8, hills: [],
    trees: { trunk: 0x6a4a33, crown: 0xc4622a, top: 0xe0a33a, hue: 0.08, count: 150 },
    bricks: [0xc4622a, 0xe0a33a, 0x8a9b46], flags: [0xd2631f, 0xf2ead6], clouds: true,
    light: { hemiSky: 0xe6eef2, hemiGround: 0x6a5c38, hemiIntensity: 2.1, sun: 0xffe7bd, sunIntensity: 2.8 },
  },
};
