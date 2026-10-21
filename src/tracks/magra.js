import { boxRow, ramp, pad } from '../track-helpers.js';

/**
 * The gulf of the Magra at sunset, and the longest circuit of the game. From the beach at Fiumaretta, through
 * the umbrellas on the sand, east and up into the white marble quarries of Carrara, through their tunnels,
 * back down across the Roman ruins of Luni, over the Magra on the first bridge, round the hill of the
 * Santa Croce del Corvo monastery above Montemarcello, and over the river again at Bocca di Magra.
 * Tight bends: the smallest radius of any circuit, 12 m of road and switchbacks on the monastery hill.
 * Clockwise: NEGATIVE lanes are the outer side (the sea, the quarry walls), POSITIVE lanes the inside.
 */
export const MAGRA_TRACK = {
  id: 'magra', name: 'Golfo del Magra al Tramonto', tagline: 'La spiaggia, le cave di marmo e le rovine di Luni',
  description: 'La pista più lunga di tutte, con il sole che scende sul mare. Si parte sulla sabbia fra gli ombrelloni, con il mare mosso a fianco e i motoscafi che entrano ed escono dal Magra; poi si sale nelle cave bianche di Carrara e si attraversano le gallerie scavate nel marmo. Giù fra le colonne rotte di Luni, sul ponte del fiume, su per i tornanti del monastero di Santa Croce del Corvo e di nuovo sul Magra a Bocca di Magra.',
  length: 1100, roadWidth: 12, laps: 2,
  controlPoints: [[-134, 116], [-40, 142], [60, 148], [136, 126], [186, 84], [214, 30], [206, -20], [206, -64], [162, -90], [110, -92], [48, -68], [-12, -86], [-72, -66], [-124, -80], [-156, -20], [-152, 18], [-178, 52], [-172, 94]],
  ramps: [ramp('ramp-1', 250), { ...ramp('ramp-2', 600), height: 2.4 }, ramp('ramp-3', 980)],
  boosts: [pad('pad-1', 80, -3.2), pad('pad-2', 350, 3.2), pad('pad-3', 520, 0), pad('pad-4', 680, -3.2), pad('pad-5', 880, 3.2), pad('pad-6', 1060, -3.2)],
  boxes: [...boxRow('a', 140, [-3.6, 0, 3.6]), ...boxRow('b', 430, [-3.6, 0, 3.6]), ...boxRow('c', 560, [-3.6, 0, 3.6]), ...boxRow('d', 760, [-3.6, 0, 3.6]), ...boxRow('e', 900, [-3.6, 0, 3.6])],
  // Up into the quarries, down to the plain, up the monastery hill; the two river crossings are bridges,
  // so the Magra below them stays flat. The bridge distances are repeated in src/scenery/magra.js.
  elevation: [
    { distance: 400, length: 300, height: 16 },
    { distance: 760, length: 90, height: 5, bridge: true },
    { distance: 910, length: 220, height: 13 },
    { distance: 1050, length: 90, height: 6, bridge: true },
  ],
  // Sand along the shore, worn Roman paving through the ruins of Luni.
  surfaces: [{ from: 30, to: 230, kind: 'sand' }, { from: 620, to: 700, kind: 'cobbles' }],
  landmarks: [
    { kind: 'spiaggia', name: 'LA SPIAGGIA DI FIUMARETTA', distance: 120, lane: -34 },
    { kind: 'cave', name: 'LE CAVE DI MARMO', distance: 400, lane: -64 },
    { kind: 'apuane', name: 'LE ALPI APUANE', distance: 470, lane: -170 },
    { kind: 'luni', name: 'LE ROVINE DI LUNI', distance: 650, lane: -34 },
    { kind: 'porto', name: 'IL PORTO DI BOCCA DI MAGRA', distance: 790, lane: 30 },
    { kind: 'monastero', name: 'MONASTERO DI SANTA CROCE DEL CORVO', distance: 920, lane: -40 },
    { kind: 'village', name: 'MONTEMARCELLO', distance: 1000, lane: -32 },
  ],
  theme: {
    local: 'magra', sky: 0xf6b06a, fog: 0xf7c9a0, fogNear: 170, fogFar: 640,
    ground: 0x6f7a4a, road: 0x4a4e55, shoulder: 0xc2b593, stripe: 0xe4dcc6,
    curb: [0xd8542f, 0xf4ecd8], hills: [], dust: 0xe6d9b8, wind: 0.5,
    trees: { trunk: 0x6a5238, crown: 0x4f6b3a, top: 0x6b8a46, hue: 0.26, count: 90 },
    bricks: [0xd8542f, 0xf4ecd8, 0x3f7f9b], flags: [0xd8542f, 0xf4ecd8], clouds: true,
    light: { hemiSky: 0xffd9a8, hemiGround: 0x6a5c3a, hemiIntensity: 2.1, sun: 0xff9c4a, sunIntensity: 3.1 },
  },
};
