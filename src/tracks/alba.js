import { boxRow, ramp, pad, solid } from '../track-helpers.js';

/**
 * A school at first light: the lights are on, the corridors are empty and
 * nobody has arrived yet. The children asked for a track that goes from one floor to the other, up ramps where the stairs
 * are, jumps down off them and runs through the underground car park.
 *
 * Scale: the cars are toys, so the school is built about four times life size — a corridor becomes a 10 m road
 * between timber walls. The engine has no rooms or ceilings, so the inside is made of walls, columns and light: it
 * reads as a corridor from the car, and from above you always see the sky. That is honest, and it is the only shape
 * that works with a chase camera flying at ~11 m.
 *
 * Height profile: the whole first floor is ONE `bridge: true` bump, 11 m up on columns. That is what
 * makes the underground car park possible at all — the engine has no negative height, so the car park is ground
 * level and the corridor is the thing that is raised. The lap crosses itself at 218 m (upstairs) over 610 m
 * (downstairs, in the car park), which is exactly the crossing the rules require a bridge for.
 * Clockwise: negative lanes face the building, positive lanes the outside.
 */
export const ALBA_TRACK = {
  id: 'alba', name: 'La Scuola all’Alba', tagline: 'Dentro la scuola prima della campanella',
  description: 'È mattina prestissimo e la scuola è ancora vuota, con le luci accese e il cielo che si scalda. Parti dal piazzale, entra sotto la grande pensilina e nell’atrio di legno, sali la rampa delle scale fino al corridoio delle travi, poi salta giù dalle scale in giardino! Gira intorno all’anfiteatro dei gradoni, scendi nel parcheggio sotterraneo e passa sotto al corridoio di prima, poi via lungo la palestra e di nuovo sul piazzale.',
  length: 980, roadWidth: 10, laps: 3,
  controlPoints: [
    // The paved forecourt along the front of the school.
    [-80, 92], [-20, 95], [40, 94], [85, 88],
    // Round the end of the building and into the glazed atrium.
    [120, 64], [128, 34],
    // Up the stairs and away down the first-floor corridor, on columns over the car park.
    [105, 8], [78, -16], [72, -50], [74, -84],
    // Off the end of the stairs into the garden, round the amphitheatre.
    [46, -108], [-10, -114], [-66, -104], [-108, -76], [-126, -38],
    // Down the ramp into the underground car park, east underneath the corridor.
    [-116, -6], [-70, -2], [-14, -4], [36, -8], [76, -12], [110, -16],
    // Out past the gym and the softball field, back to the forecourt.
    [150, 20], [152, 76], [110, 120], [30, 132], [-46, 130], [-100, 122], [-132, 104], [-126, 88],
  ],
  // The short flight into the atrium, then the big one: off the end of the stairs, out into the garden.
  ramps: [ramp('ramp-1', 188), { ...ramp('ramp-2', 300), length: 16, height: 3.2, launch: 1.5 }, ramp('ramp-3', 700)],
  boosts: [pad('pad-1', 100, -3.2), pad('pad-2', 360, 3.2), pad('pad-3', 500, 0), pad('pad-4', 650, -3.2), pad('pad-5', 900, 3.2)],
  boxes: [...boxRow('a', 60, [-3.2, 0, 3.2]), ...boxRow('b', 250, [-3.2, 0, 3.2]), ...boxRow('c', 430, [-3.2, 0, 3.2]), ...boxRow('d', 560, [-3.2, 0, 3.2]), ...boxRow('e', 830, [-3.2, 0, 3.2])],
  // The first floor, raised on its columns. `bridge: true` keeps the ground flat underneath: that space is the car park.
  elevation: [{ distance: 240, length: 300, height: 11, bridge: true }],
  // The default road colour IS the lino of the corridor and the car park: the bands are the places that are not
  // lino — the paving slabs of the forecourt, the wet grass of the garden and the tarmac of the street outside.
  surfaces: [
    { from: 0, to: 140, kind: 'cobbles' },
    { from: 350, to: 470, kind: 'grass' },
    { from: 660, to: 975, kind: 'asphalt' },
  ],
  gates: [{ id: 'pensilina', distance: 126, name: 'LA PENSILINA' }],
  // Things you cannot drive through. In the corridor two desks have been pushed out of the classrooms; down in the
  // car park you thread between the columns that hold the corridor up, and at the end there is the gym's wheelie
  // bin. The road is only 10 m wide here, so they stand one at a time: two abreast would be a wall.
  obstacles: [
    solid('banco-1', 'desk', 265, -1.4),
    solid('banco-2', 'desk', 285, 1.4),
    solid('colonna-1', 'column', 575, -2),
    solid('colonna-2', 'column', 600, 2),
    solid('bidone', 'bin', 670, 2.6),
  ],
  landmarks: [
    { kind: 'softball', name: 'CAMPO DA SOFTBALL', distance: 55, lane: -60 },
    { kind: 'atrio', name: 'L’ATRIO DI LEGNO', distance: 150, lane: 28 },
    { kind: 'scalinata', name: 'LA SCALINATA', distance: 196, lane: 26 },
    { kind: 'corridoio', name: 'IL CORRIDOIO DELLE TRAVI', distance: 250, lane: -26 },
    { kind: 'anfiteatro', name: 'L’ANFITEATRO DEI GRADONI', distance: 412, lane: -50 },
    { kind: 'parcheggio', name: 'IL PARCHEGGIO SOTTERRANEO', distance: 545, lane: 28 },
    { kind: 'palestra', name: 'LA PALESTRA', distance: 700, lane: 34 },
    { kind: 'fotovoltaico', name: 'IL TETTO DI PANNELLI', distance: 830, lane: 32 },
    { kind: 'viadeimattoncini', name: 'VIA DEI MATTONCINI', distance: 910, lane: 30 },
  ],
  theme: {
    local: 'alba', wind: 0.2, sunTravel: 45, cloudRise: 0.4, lamps: true,
    sky: 0x8a8fc0, fog: 0xc0a8b8, fogNear: 100, fogFar: 380, ground: 0x566742, road: 0xd6cdba,
    shoulder: 0x7d7a72, curb: [0xf0a81e, 0x2a2d33], stripe: 0xd8d4c8, hills: [],
    trees: { trunk: 0x4a3a2a, crown: 0x3a5a38, top: 0x4c7040, hue: 0.2, count: 45 },
    bricks: [0xc8a06a, 0xf4f0e2, 0x3b4148], flags: [0xf0a81e, 0xf4f0e2], clouds: true,
    light: { hemiSky: 0xa8b2dd, hemiGround: 0x44492f, hemiIntensity: 2.1, sun: 0xffbd88, sunIntensity: 2.7 },
  },
};
