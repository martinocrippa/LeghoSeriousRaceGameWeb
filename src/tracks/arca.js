import { boxRow, ramp, pad } from '../track-helpers.js';

/**
 * The training circuit on the ARCA Brugherio football fields, beside the church of San Paolo in Piazza Don
 * Camagni. The road is the mown grass itself, marked out with the line marker: it runs right round the two
 * pitches, through two goals, past the changing rooms, the church, the auditorium, the nursery and the blocks
 * of flats along the west side, over ramps and through mud and puddles. A winter training day in the rain.
 * Club colours: black and orange. Placements are a toy caricature, not the real layout.
 * Clockwise loop: NEGATIVE lanes face the pitches inside, POSITIVE lanes are the buildings all round.
 */
export const ARCA_TRACK = {
  id: 'arca', name: 'Il Campo dell’Arca', tagline: 'Allenamento sotto la pioggia, tra le porte e il fango',
  description: 'Si corre sull’erba dei campi dell’Arca, dentro le righe tracciate con il gesso: si passa sotto le porte, si salta sulle rampe, si sguazza nelle pozzanghere e si sbanda nel fango. Intorno ci sono la chiesa di San Paolo, l’auditorium, l’asilo e i palazzi. A ogni giro il tempo cambia: piove, esce il sole, ripiove.',
  length: 560, roadWidth: 14, laps: 4,
  controlPoints: [[-90, -55], [-30, -60], [30, -58], [80, -48], [112, -20], [118, 15], [85, 45], [30, 58], [-30, 60], [-85, 52], [-115, 20], [-118, -18]],
  // Training ramps laid out on the grass.
  ramps: [ramp('ramp-1', 120), { ...ramp('ramp-2', 300), height: 2.4 }, ramp('ramp-3', 430)],
  boosts: [pad('pad-1', 30, -3.7), pad('pad-2', 190, 3.7), pad('pad-3', 260, 0), pad('pad-4', 380, -3.7), pad('pad-5', 500, 3.7)],
  boxes: [...boxRow('a', 70), ...boxRow('b', 210), ...boxRow('c', 355), ...boxRow('d', 490)],
  // Two stretches churned to mud by a winter of training.
  surfaces: [{ from: 160, to: 230, kind: 'dirt' }, { from: 400, to: 455, kind: 'dirt' }],
  landmarks: [
    { kind: 'campo', name: 'ARCA CALCIO BRUGHERIO', distance: 84, lane: -34 },
    { kind: 'spogliatoi', name: 'GLI SPOGLIATOI', distance: 150, lane: 32 },
    { kind: 'chiesa', name: 'CHIESA DI SAN PAOLO · PIAZZA DON CAMAGNI', distance: 212, lane: 38 },
    { kind: 'auditorium', name: 'L’AUDITORIUM', distance: 268, lane: 32 },
    { kind: 'nido', name: 'IL GIARDINO INCANTATO', distance: 340, lane: 30 },
    { kind: 'palazzi', name: 'LE CASE DI FIANCO AI CAMPI', distance: 450, lane: 32 },
    { kind: 'palazzi', name: '', distance: 516, lane: 32 },
  ],
  theme: {
    local: 'arca', sky: 0x8e9ba6, fog: 0xa2aeb6, fogNear: 80, fogFar: 230,
    ground: 0x4f6b3c, road: 0x4e7a3a, shoulder: 0x5f8a45, stripe: 0xf4f4ee,
    curb: [0x14161a, 0xff7a12], hills: [],
    trees: { trunk: 0x554438, crown: 0x4a5a42, top: 0x60704f, hue: 0.28, count: 70 },
    bricks: [0x14161a, 0xff7a12, 0xf4f4ee], flags: [0xff7a12, 0x14161a], clouds: true,
    light: { hemiSky: 0xc2d0da, hemiGround: 0x4a5a3e, hemiIntensity: 1.8, sun: 0xcfd6dd, sunIntensity: 1.6 },
    // One entry per lap, cycling: rain, sun, rain, sun on the same winter day. The renderer blends sky, fog,
    // light and the rain between them; while it does not yet read this, the circuit simply stays on the first.
    weather: [
      { name: 'PIOVE', sky: 0x8e9ba6, fog: 0xa2aeb6, fogNear: 80, fogFar: 230, sun: 0xcfd6dd, sunIntensity: 1.6, hemiIntensity: 1.8, rain: 1100 },
      { name: 'SOLE', sky: 0xbcd8ee, fog: 0xcfe0ea, fogNear: 130, fogFar: 340, sun: 0xfff1d6, sunIntensity: 3.1, hemiIntensity: 2.3, rain: 0 },
    ],
  },
};
