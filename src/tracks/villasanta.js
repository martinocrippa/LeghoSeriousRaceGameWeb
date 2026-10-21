import { boxRow, ramp, pad } from '../track-helpers.js';

/**
 * Villasanta: the cobbled centre (piazza di Sant'Anastasia) and its little houses make the
 * start/finish straight; through the Porta di Villasanta the road enters the Parco di Monza and becomes the
 * racing circuit itself. The silhouette is Monza's, read from the aerial preview: the long rettifilo, the
 * Variante del Rettifilo, the Curva Grande, the Variante della Roggia, the two Lesmo bends, the Serraglio
 * straight, the Variante Ascari, the back straight and the Parabolica — which here runs along the banking of
 * the old Monza oval, exactly as the two tracks run side by side in real life.
 * `gates` carry the corner names overhead, so the children learn them as they drive under.
 * Clockwise loop: negative lanes face the interior, positive lanes are the outer side.
 */
export const VILLASANTA_TRACK = {
  id: 'villasanta', name: 'Villasanta Centro', tagline: 'Dai sanpietrini alla Parabolica',
  description: 'Parti sui sanpietrini della piazza della chiesa, passa davanti alle casette, poi entra nel Parco di Monza dalla Porta di Villasanta: da lì è il circuito vero! Variante del Rettifilo, Curva Grande, la Roggia, le due di Lesmo, la Variante Ascari e la Parabolica sulla vecchia sopraelevata inclinata.',
  length: 1100, roadWidth: 14, laps: 3,
  controlPoints: [
    // Through the village and out along the rettifilo: one long straight from the centre into the park.
    [-150, -105], [-100, -105], [-50, -105], [0, -105], [50, -105], [95, -105],
    // Variante del Rettifilo, then the Curva Grande sweeping all the way round the east side.
    [120, -106], [134, -92], [144, -74], [154, -52], [160, -24], [154, 2], [140, 26],
    // Variante della Roggia and the two Lesmo bends.
    [124, 42], [112, 46], [100, 54], [82, 64], [64, 66], [48, 58], [36, 44],
    // The Serraglio straight down to the Variante Ascari.
    [4, 30], [-36, 22], [-74, 16], [-98, 22], [-114, 34], [-132, 32],
    // The back straight, then the Parabolica on the old banking.
    [-172, 22], [-206, 12], [-232, -10], [-238, -42], [-225, -72], [-200, -95], [-175, -104],
  ],
  ramps: [ramp('ramp-1', 240), ramp('ramp-2', 690)],
  boosts: [pad('pad-1', 120, -3.7), pad('pad-2', 440, 3.7), pad('pad-3', 660, 0), pad('pad-4', 900, 3.7), pad('pad-5', 1040, -3.7)],
  boxes: [...boxRow('a', 60), ...boxRow('b', 350), ...boxRow('c', 560), ...boxRow('d', 820), ...boxRow('e', 1010)],
  // Cobblestones through the village; from the Porta onward it is racing tarmac.
  surfaces: [{ from: 20, to: 150, kind: 'cobbles' }],
  // The Parabolica leans on the banking of the old oval: the outer edge rises.
  bankings: [{ from: 930, to: 1030, angle: 26, side: 1 }],
  gates: [
    { id: 'gate-rettifilo', distance: 324, name: 'VARIANTE DEL RETTIFILO' },
    { id: 'gate-grande', distance: 406, name: 'CURVA GRANDE' },
    { id: 'gate-ascari', distance: 786, name: 'VARIANTE ASCARI' },
    { id: 'gate-parabolica', distance: 962, name: 'PARABOLICA' },
  ],
  // Squirrels in the park, between the gate and the far end of the woods: small, quick, and cross in a dash.
  critters: [
    { id: 'scoiattolo-1', kind: 'squirrel', distance: 410, offset: 0 },
    { id: 'scoiattolo-2', kind: 'squirrel', distance: 470, offset: 2.5 },
    { id: 'scoiattolo-3', kind: 'squirrel', distance: 530, offset: 1.2 },
  ],
  landmarks: [
    { kind: 'church', name: 'PIAZZA DI SANT’ANASTASIA', distance: 60, lane: -30 },
    { kind: 'home', name: '', distance: 150, lane: 30 },
    // The stadium sits out in the open south of the rettifilo: the infield is all track, there is no room in it.
    { kind: 'stadiomonza', name: 'STADIO DEL MONZA', distance: 210, lane: 66 },
    { kind: 'porta', name: 'PORTA DI VILLASANTA · PARCO DI MONZA', distance: 290, lane: 30 },
    { kind: 'industrial', name: 'ZONA INDUSTRIALE', distance: 640, lane: 40 },
    { kind: 'sopraelevata', name: 'LA VECCHIA SOPRAELEVATA', distance: 968, lane: 34 },
    { kind: 'villa', name: 'VILLA CAMPERIO', distance: 1060, lane: -29 },
  ],
  theme: {
    local: 'villasanta', wind: 0.4, sky: 0xc4d6ea, fog: 0xcfdcea, fogNear: 140, fogFar: 420, ground: 0x8fb26f, road: 0x3f434c,
    shoulder: 0xc9c2b3, curb: [0xe0503c, 0xf4f0e2], stripe: 0xe8e8ec, hills: [0x7fa070, 0x8fb080, 0x6f9060],
    trees: { count: 110 }, flags: [0xe0503c, 0xf4f0e2],
  },
};
