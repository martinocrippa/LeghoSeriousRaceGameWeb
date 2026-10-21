import { boxRow, ramp, pad, solid } from '../track-helpers.js';

/**
 * L'intervallo: the bell has gone, the class is out in the garden and the race happens on the classroom floor,
 * among the desks. The cars are toys that fell off a shelf, so everything around them is giant: a desk leg is a
 * column, a dropped pencil is a ramp, a roll of sticky tape is the loop-the-loop and a ruler laid across the floor
 * is the bridge that lets the lap cross itself.
 *
 * Height profile: the ruler is the only raised thing, a `bridge: true` bump at 340 m, which is what makes the
 * crossing at 340/698 legal — and it looks exactly like what it is, a plank over another piece of track.
 */
export const INTERVALLO_TRACK = {
  id: 'intervallo', name: 'L’Aula all’Intervallo', tagline: 'Tra i banchi, le matite e le merende',
  description: 'Suona la campanella: i compagni sono fuori in giardino a giocare e si sentono le grida dalle finestre. Tu corri dentro l’aula, sul pavimento, tra le gambe dei banchi che sembrano colonne! Sali sulla matita caduta, fai il giro della morte dentro il rotolo di nastro adesivo, passa sul righello come su un ponte, scavalca l’astuccio e attento allo zucchero rovesciato della merenda.',
  length: 760, roadWidth: 12, laps: 3,
  controlPoints: [
    [34, -8], [66, -26], [100, -26], [122, 0], [112, 28], [78, 46], [36, 42], [-2, 20],
    [-38, 4], [-74, -16], [-110, -12], [-128, 14], [-108, 38], [-70, 44], [-28, 26], [4, 10],
  ],
  ramps: [ramp('ramp-1', 200), ramp('ramp-2', 620)],
  boosts: [pad('pad-1', 40, -3.6), pad('pad-2', 258, 3.6), pad('pad-3', 420, 0), pad('pad-4', 600, -3.6), pad('pad-5', 720, 3.6)],
  boxes: [...boxRow('a', 60), ...boxRow('b', 180), ...boxRow('c', 330), ...boxRow('d', 470), ...boxRow('e', 690)],
  // The ruler, laid across the floor over the piece of track below.
  elevation: [{ distance: 340, length: 150, height: 8, bridge: true }],
  // The default road colour is the lino; the bands are the tiled corner by the sink and the sugar somebody spilled.
  surfaces: [
    { from: 400, to: 470, kind: 'cobbles' },
    { from: 640, to: 700, kind: 'sand' },
  ],
  // The roll of sticky tape: everybody goes through it. The open pencil case is a plank you may take or leave.
  loops: [{ id: 'nastro', name: 'IL ROTOLO DI NASTRO', distance: 120, radius: 11, lead: 28 }],
  shortcuts: [{ id: 'astuccio', name: 'L’ASTUCCIO', from: 480, to: 560, arch: 3.2 }],
  // What got left on the floor when the bell went: two schoolbags, a chair on its side and two desks pulled out
  // of the row. On a 12 m floor they stand one at a time, so there is always a way round.
  obstacles: [
    solid('zaino-1', 'bin', 80, -2.8),
    solid('sedia', 'bin', 290, 2.8),
    solid('banco-1', 'desk', 350, -1.6),
    solid('banco-2', 'desk', 370, 1.6),
    solid('zaino-2', 'bin', 740, -2.8),
  ],
  landmarks: [
    { kind: 'cattedra', name: 'LA CATTEDRA', distance: 40, lane: -30 },
    { kind: 'banchi', name: 'LE FILE DEI BANCHI', distance: 180, lane: 32 },
    { kind: 'lavagna', name: 'LA LAVAGNA', distance: 250, lane: -32 },
    { kind: 'zaino', name: 'LO ZAINO ROVESCIATO', distance: 420, lane: -28 },
    { kind: 'finestre', name: 'LE FINESTRE SUL GIARDINO', distance: 520, lane: 34 },
    { kind: 'giardino', name: 'I COMPAGNI IN GIARDINO', distance: 520, lane: 60 },
    { kind: 'merenda', name: 'LA MERENDA ABBANDONATA', distance: 660, lane: -30 },
    { kind: 'matite', name: 'IL BARATTOLO DEI PENNARELLI', distance: 700, lane: 52 },
    { kind: 'libreria', name: 'LA LIBRERIA DEI DISEGNI', distance: 0, lane: -40 },
  ],
  theme: {
    local: 'intervallo', wind: 0.1, lamps: true, clouds: false,
    sky: 0xdfe6ee, fog: 0xe6e2d6, fogNear: 120, fogFar: 340, ground: 0xd8cdb6, road: 0xc9bfa8,
    // School lino is laid in squares: two close shades, one tile every nine metres at this scale.
    floorTiles: [0xdcd2bd, 0xc0b092, 9],
    shoulder: 0xb6a98e, curb: [0xe0503c, 0xf4f0e2], stripe: 0xefe9d8, hills: [],
    trees: { count: 0 },
    bricks: [0xe0503c, 0x3b8de0, 0xffd74a], flags: [0xe0503c, 0x3b8de0],
    light: { hemiSky: 0xf4f1e6, hemiGround: 0xb7ac92, hemiIntensity: 2.4, sun: 0xfff6e2, sunIntensity: 2.6 },
  },
};
