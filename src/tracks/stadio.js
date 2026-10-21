import { boxRow, ramp, pad } from '../track-helpers.js';

/**
 * Stadio degli Azzurri d'Italia: the start line is on the pitch side of the arena, the loop-the-loop stands in
 * front of the main stand, and the rest of the lap runs through a leafy residential neighbourhood.
 * The straight from x=-95 to x=85 (z=-40) passes through the stadium; the arena landmark sits south of it (lane +30).
 */
export const STADIO_TRACK = {
  id: 'stadio', name: 'Stadio degli Azzurri d’Italia', tagline: 'Dentro lo stadio, con il giro della morte',
  description: 'Parti dal prato dello stadio dell’Atalanta, con i tifosi che fanno il tifo al tuo passaggio, affronta il giro della morte davanti alla tribuna e sfreccia tra le casette e gli alberi del quartiere. Sole, nuvolette e asfalto liscio.',
  length: 740, roadWidth: 14, laps: 2,
  controlPoints: [[-55, -40], [0, -40], [50, -40], [85, -40], [135, -20], [150, 30], [120, 75], [60, 92], [0, 80], [-60, 95], [-125, 75], [-152, 20], [-130, -30], [-95, -40]],
  loops: [{ id: 'giro-della-morte', name: 'GIRO DELLA MORTE', distance: 26, radius: 11, lead: 28 }],
  ramps: [ramp('ramp-1', 250), ramp('ramp-2', 560)],
  boosts: [pad('pad-1', 160, -3.7), pad('pad-2', 400, 3.7), pad('pad-3', 700, 0)],
  boxes: [...boxRow('a', 190), ...boxRow('b', 330), ...boxRow('c', 470), ...boxRow('d', 640)],
  landmarks: [{ kind: 'arena', name: 'STADIO DEGLI AZZURRI D’ITALIA', distance: 55, lane: 30 }],
  theme: {
    local: 'stadio', sky: 0x9fd3f2, fog: 0xb9dcf2, fogNear: 140, fogFar: 380, ground: 0x8cbf6e, road: 0x3f434c,
    shoulder: 0xb9b3a6, curb: [0x1e5bd8, 0x14161d], stripe: 0xe8e8ec, hills: [0x6f9f62, 0x86b074, 0x5f8f58],
    trees: { count: 90, crown: 0x4f9660, top: 0x6bb076 }, flags: [0x1e5bd8, 0x14161d], clouds: true,
  },
};
