import * as THREE from 'three';
import { seededFromText } from './random.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { normalizeParts } from './parts.js';
import { wheelLayout, rideHeight } from './wheels.js';

export const CAR_PRESETS = [
  { id: 'cometa', name: 'Fuoco Rapido', color: '#ff4a1c', accent: '#15161c', shape: 'racer', width: 1.65, length: 3.25, height: 0.95, parts: ['highWing', 'driver'], description: 'Una scheggia arancione con alettone nero. Brucia l’asfalto.', tag: 'RAZZO' },
  { id: 'cactus', name: 'Scorpione', color: '#3f9a2e', accent: '#15161c', shape: 'buggy', width: 1.8, length: 2.9, height: 1.15, parts: ['bigWheels', 'driver'], description: 'Buggy da deserto: ruotone, fango e zero paura.', tag: 'OFF-ROAD' },
  { id: 'mirtillo', name: 'Nerazzurro', color: '#1747c9', accent: '#0b0c10', shape: 'truck', width: 1.8, length: 3.15, height: 1.6, detail: 'van', description: 'Il furgone della Dea: nero e azzurro come Bergamo.', tag: 'BERGAMO' },
  { id: 'squalo', name: 'Squalo', color: '#0e7fb5', accent: '#e8f4f8', shape: 'racer', width: 1.65, length: 3.4, height: 1, detail: 'fin', description: 'Una pinna d’acciaio che morde le curve.', tag: 'PREDATORE' },
  { id: 'sole', name: 'Tigre', color: '#f5a300', accent: '#15161c', shape: 'classic', width: 1.6, length: 2.8, height: 1.15, stripes: ['#15161c'], description: 'Gialla e nera: graffia in partenza.', tag: 'GRAFFIO' },
  { id: 'ciliegia', name: 'Diavolo Rosso', color: '#c8102e', accent: '#101115', shape: 'classic', width: 1.55, length: 2.75, height: 1.1, description: 'Piccola, rossa e cattiva: pronta a partire.', tag: 'FURIA' },
  { id: 'maggiolino', name: 'Maggiolino Matto', color: '#efe6d3', accent: '#c8102e', shape: 'classic', width: 1.65, length: 3.1, height: 1.35, detail: 'beetle', number: [3, 5], description: 'Il maggiolino numero 35: ha girato il numero al contrario! Strisce da corsa, un po’ di ruggine e un motore tutto matto.', tag: 'LEGGENDA' },
  // Archetipi ispirati ai modelli di casa: forme, colori e nomi nostri, nessuna replica.
  { id: 'turismo', name: 'Lampo Bianco', color: '#f2f1ec', accent: '#15161c', palette: ['#f2f1ec', '#15161c', '#1e5bd8', '#e5203a'], shape: 'classic', width: 1.7, length: 3.15, height: 1.05, parts: ['driver'], stripes: ['#1e5bd8', '#e5203a'], lights: 4, description: 'Bianca da corsa con strisce blu e rosse e quattro fari gialli sul muso.', tag: 'TURISMO' },
  { id: 'dakar', name: 'Ombra del Deserto', color: '#17181c', accent: '#f4f4f0', palette: ['#17181c', '#f4f4f0', '#e5203a'], shape: 'buggy', width: 1.85, length: 3.4, height: 1.35, parts: ['bigWheels', 'driver'], stripes: { sides: '#f4f4f0' }, rims: '#e5203a', description: 'Nera a strisce bianche, cerchi rossi e gomme da sabbia: corre dove non c’è strada.', tag: 'RAID' },
  { id: 'esploratore', name: 'Esploratore', color: '#6d7b3a', accent: '#f4f1e6', palette: ['#6d7b3a', '#f4f1e6', '#3a3f2a'], shape: 'truck', width: 1.85, length: 3.3, height: 1.7, parts: ['cargo', 'bigWheels'], description: 'Fuoristrada verde oliva con tetto bianco e bagagli sopra. Parte e non torna per cena.', tag: 'AVVENTURA' },
  { id: 'tuono', name: 'Tuono Blu', color: '#1b4f9c', accent: '#15161c', palette: ['#1b4f9c', '#15161c', '#7fd0ff'], shape: 'truck', width: 1.9, length: 3.1, height: 1.85, detail: 'bigfoot', description: 'Monster truck blu notte con ruote altissime: salta e atterra come un tuono.', tag: 'MONSTER' },
  { id: 'rosa', name: 'Rosa Ribelle', color: '#ef5fa0', accent: '#15161c', palette: ['#ef5fa0', '#15161c', '#f4f4f0'], shape: 'racer', width: 1.7, length: 3.2, height: 0.95, parts: ['highWing'], description: 'Rosa acceso con alettone nero. Non è carina, è velocissima.', tag: 'RIBELLE' },
  { id: 'acrobata', name: 'Cyber Acrobata', color: '#f2e14a', accent: '#1fc8c8', palette: ['#f2e14a', '#1fc8c8', '#15161c'], shape: 'racer', width: 1.5, length: 2.7, height: 1.15, detail: 'trike', description: 'Tre ruote gialle e turchesi, sella bassa e manubrio largo: nata per i salti.', tag: 'ACROBAZIE' },
  { id: 'orso', name: 'Orso Spericolato', color: '#8fd12a', accent: '#ff7a1a', palette: ['#8fd12a', '#ff7a1a', '#6b7280'], shape: 'buggy', width: 1.5, length: 2.7, height: 1.2, parts: ['threeWheels', 'driver'], description: 'Verde lime e arancione, con il pilota sempre in piedi sui pedali.', tag: 'ACROBAZIE' },
  { id: 'trattore', name: 'Trattore Turchese', color: '#18b0b5', accent: '#15161c', palette: ['#18b0b5', '#15161c', '#f4f4f0'], shape: 'truck', width: 1.85, length: 2.95, height: 1.75, parts: ['bigWheels', 'cab', 'driver'], roofLights: true, description: 'Ruote enormi dietro, cabina alta e fari sul tetto. Lento? Provaci.', tag: 'CAMPI' },
  { id: 'fattoria', name: 'Rosso di Campagna', color: '#c8102e', accent: '#8a5a2b', palette: ['#c8102e', '#8a5a2b', '#f4f1e6'], shape: 'truck', width: 1.75, length: 3.5, height: 1.5, detail: 'convoy', description: 'Trattorino rosso con il rimorchio di legno pieno di carote.', tag: 'RIMORCHIO' },
  { id: 'lama', name: 'Lama d’Argento', color: '#b9c0c6', accent: '#1e5bd8', palette: ['#b9c0c6', '#1e5bd8', '#15161c'], shape: 'racer', width: 1.7, length: 3.35, height: 1, parts: ['highWing'], stripes: ['#1e5bd8'], description: 'Grigia con frecce azzurre e alettone dritto: la regina delle notti in città.', tag: 'TUNER' },
  { id: 'vipera', name: 'Vipera Blu', color: '#12457f', accent: '#f4f4f0', palette: ['#12457f', '#f4f4f0'], shape: 'classic', width: 1.75, length: 3.1, height: 0.9, stripes: { sides: '#f4f4f0' }, description: 'Spider blu con due strisce bianche sul cofano. Vecchia scuola, motore cattivo.', tag: 'ROADSTER' },
  { id: 'cuneo', name: 'Cuneo Bianco', color: '#f4f4f0', accent: '#15161c', palette: ['#f4f4f0', '#15161c', '#c9cdd1'], shape: 'racer', width: 1.8, length: 3.3, height: 0.85, parts: ['highWing'], description: 'Bassissima e tutta spigoli, con l’alettone largo quanto l’auto.', tag: 'CUNEO' },
  { id: 'verdelunga', name: 'Verde Inglese', color: '#0f5132', accent: '#c9cdd1', palette: ['#0f5132', '#c9cdd1', '#15161c'], shape: 'classic', width: 1.6, length: 3.6, height: 0.9, detail: 'long', description: 'Cofano lunghissimo, verde bottiglia e cerchi a raggi. Elegante e infida.', tag: 'CLASSICA' },
  { id: 'hotrod', name: 'Vecchia Furia', color: '#c8102e', accent: '#15161c', palette: ['#c8102e', '#15161c', '#f5c518'], shape: 'classic', width: 1.7, length: 3, height: 1.2, detail: 'dragster', description: 'Hot rod rosso con il motore a vista e le ruote dietro giganti.', tag: 'HOT ROD' },
  { id: 'pantera', name: 'Pantera Nera', color: '#15161c', accent: '#f4f4f0', palette: ['#15161c', '#f4f4f0', '#8a8f98'], shape: 'racer', width: 1.5, length: 2.8, height: 1.15, parts: ['threeWheels', 'driver'], windscreen: true, description: 'Tutta nera, muso basso e parabrezza di sbieco: sparisce nel buio.', tag: 'NOTTURNA' },
  // The vehicles the children asked for by name: a motorbike, an Ape and an eight-wheeled rig.
  { id: 'moto', name: 'Saetta a Due Ruote', color: '#e5203a', accent: '#15161c', palette: ['#e5203a', '#15161c', '#c9cdd1'], shape: 'racer', width: 1.35, length: 2.5, height: 1.1, detail: 'moto', axles: [{ z: 0.4, spread: 0, radius: 0.4, width: 0.2, steer: true }, { z: -0.36, spread: 0, radius: 0.4, width: 0.24, drive: true }], description: 'Due ruote sole, forcella lunga, manubrio largo e due scarichi cromati. Si piega in curva.', tag: 'DUE RUOTE' },
  { id: 'apetta', name: 'Apetta Pepe', color: '#2f8f5b', accent: '#f4f1e6', palette: ['#2f8f5b', '#f4f1e6', '#e5203a', '#f5c518'], shape: 'truck', width: 1.55, length: 2.7, height: 1.7, detail: 'ape', axles: [{ z: 0.44, spread: 0, radius: 0.28, width: 0.18, steer: true }, { z: -0.34, spread: 0.46, radius: 0.28, width: 0.22 }], description: 'Una ruota davanti e due dietro, un faro solo, il cassone di legno pieno di casse.', tag: 'TRE RUOTE' },
  { id: 'tir', name: 'Tir Otto Ruote', color: '#1e5bd8', accent: '#f4f1e6', palette: ['#1e5bd8', '#f4f1e6', '#e5203a', '#f5c518'], shape: 'truck', width: 1.9, length: 3.4, height: 1.9, detail: 'rig', axles: [{ z: 0.34, spread: 0.46, drive: true }, { z: -0.24, spread: 0.46 }], trailer: { length: 3.2, body: 'container', axles: [{ z: -0.62, spread: 0.44 }, { z: -0.86, spread: 0.44 }] }, description: 'Motrice a muso piatto, due camini cromati e il rimorchio col container: otto ruote in tutto e sbanda in curva.', tag: 'OTTO RUOTE' },
  // Five the children named one by one: a naked sports bike with rockets down its flanks, a low-slung cruiser
  // crossed with a dragster, a ten-wheeled rally raid truck, an eighties rally hatchback and a snowcat.
  { id: 'duke', name: 'Razzo a Due Ruote', color: '#ff6a00', accent: '#15161c', palette: ['#ff6a00', '#15161c', '#c9cdd1'], shape: 'racer', width: 1.35, length: 2.6, height: 1.15, detail: 'moto', sideRockets: true, axles: [{ z: 0.4, spread: 0, radius: 0.4, width: 0.2, steer: true }, { z: -0.36, spread: 0, radius: 0.42, width: 0.28, drive: true }], description: 'Nuda, arancione e cattiva, con due razzi legati sui fianchi. Impennata compresa.', tag: 'DUE RUOTE' },
  { id: 'chopper', name: 'Tuono Lungo', color: '#7d1f2e', accent: '#d9dde3', palette: ['#7d1f2e', '#d9dde3', '#15161c'], shape: 'racer', width: 1.4, length: 3.4, height: 1.1, detail: 'chopper', axles: [{ z: 0.46, spread: 0, radius: 0.36, width: 0.18, steer: true }, { z: -0.34, spread: 0, radius: 0.5, width: 0.42, drive: true }], description: 'Forcella lunghissima davanti, gommone dietro e il motore a vista: mezza Harley e mezzo dragster.', tag: 'DUE RUOTE' },
  { id: 'raid', name: 'Raid Dieci Ruote', color: '#f0a81e', accent: '#15161c', palette: ['#f0a81e', '#15161c', '#c9cdd1', '#e5203a'], shape: 'truck', width: 2, length: 4.2, height: 2, detail: 'rig', axles: [{ z: 0.4, spread: 0.48, steer: true }, { z: 0.06, spread: 0.5, drive: true }, { z: -0.12, spread: 0.5, drive: true }, { z: -0.38, spread: 0.48 }, { z: -0.56, spread: 0.46 }], description: 'Il camion del rally raid: dieci ruote tassellate, faroni sul tetto e la ruota di scorta dietro. Nella sabbia non si ferma.', tag: 'DIECI RUOTE' },
  { id: 'delta', name: 'Delta Rally', color: '#f4f4f0', accent: '#1e5bd8', palette: ['#f4f4f0', '#1e5bd8', '#e5203a', '#15161c'], shape: 'classic', width: 1.8, length: 3.1, height: 1.25, detail: 'hatch', lights: 4, stripes: ['#e5203a', '#1e5bd8'], description: 'La tre porte squadrata degli anni Ottanta: parafanghi larghi, quattro fari sul cofano e l’alettone sul portellone.', tag: 'RALLY' },
  { id: 'gattodellenevi', name: 'Gatto delle Nevi', color: '#e5203a', accent: '#2c3a4a', palette: ['#e5203a', '#2c3a4a', '#d9dde3'], shape: 'truck', width: 2.1, length: 3.6, height: 1.9, ride: 0.62, detail: 'snowcat', axles: [{ z: 0.3, spread: 0.42, radius: 0.3, width: 0.5 }, { z: -0.3, spread: 0.42, radius: 0.3, width: 0.5 }], description: 'Cingoli larghi, cabina di vetro e la lama davanti: batte la pista e non scivola mai.', tag: 'NEVE' },
  { id: 'rexracer', name: 'Rex Ruggente', color: '#3f9a4a', accent: '#f0a81e', palette: ['#3f9a4a', '#f0a81e', '#f4f0e2'], shape: 'truck', width: 1.9, length: 3.9, height: 1.7, description: 'Un tirannosauro su quattro ruote: la testa con le fauci è il cofano, la coda fa da alettone e il pilota va in sella.', detail: 'rex', tag: 'DINO' },
  { id: 'stegobus', name: 'Stego Piastre', color: '#7a4ad9', accent: '#ffd74a', palette: ['#7a4ad9', '#ffd74a', '#f2e4c4'], shape: 'truck', width: 2, length: 3.8, height: 1.5, description: 'Uno stegosauro basso e largo, con due file di piastre sulla schiena e la coda a spuntoni. Lento a partire, inarrestabile dopo.', detail: 'stego', tag: 'DINO' },
  { id: 'carrarmato', name: 'Carrarmato Brontolo', color: '#5a6b3a', accent: '#c9a44e', palette: ['#5a6b3a', '#c9a44e', '#8e949c'], shape: 'truck', width: 2.1, length: 3.7, height: 1.8, ride: 0.6, detail: 'tank', axles: [{ z: 0.32, spread: 0.42, radius: 0.29, width: 0.46 }, { z: 0, spread: 0.42, radius: 0.29, width: 0.46 }, { z: -0.32, spread: 0.42, radius: 0.29, width: 0.46 }], description: 'Cingoli, torretta girevole e un cannone lungo lungo. Non va veloce, ma quando arriva si sposta tutto.', tag: 'CORAZZA' },
  { id: 'schiacciasassi', name: 'Schiacciasassi', color: '#15161c', accent: '#5be03a', palette: ['#15161c', '#5be03a', '#ff6a00'], shape: 'truck', width: 1.9, length: 3.3, height: 1.9, detail: 'bigfoot', description: 'Il monster truck: ruote giganti, ammortizzatori a vista, doppio scarico e fiamme verdi. Schiaccia tutto.', tag: 'MONSTER' },
];

/**
 * Every hand-made body `detail` that createCarModel actually draws, and the shape each one needs when it is only
 * honoured inside one branch. Three catalogue cars used to name a `detail` that existed nowhere: they silently fell
 * back to the generic shape AND lost their parts, which is what the children meant by "some cars don't work".
 * A test walks the catalogue against these two, so it cannot happen again in silence.
 */
export const CAR_DETAILS = Object.freeze(new Set([
  'antenna', 'ape', 'beacons', 'beetle', 'bigfoot', 'blue-truck', 'convoy', 'crate', 'dragster', 'f1', 'fan', 'fin',
  'chopper', 'forklift', 'gyro', 'harvester', 'hatch', 'jet', 'long', 'military', 'monster', 'moto', 'police', 'prop',
  'rex', 'rig', 'rocket', 'rod', 'six', 'snowcat', 'stego', 'tank', 'trike', 'van',
  'airliner', 'launcher', 'minitruck', 'pickup',
]));
export const DETAIL_SHAPE = Object.freeze({ fin: 'racer', crate: 'buggy' });

const fromSample = (file, spec) => ({
  ...spec,
  sourceUrl: `sample/${file}.jpg`,
  provenance: 'Ricreata a mano in 3D dalla tua foto: colori e dettagli principali, con forme semplificate per il gioco.',
  source: 'sample',
  tag: 'LA TUA CREAZIONE',
});

/**
 * The cars born from the children's own builds, re-read one photo at a time against a written description of each
 * vehicle. Three rules came out of that pass and hold for every car here:
 *  - the silhouette is what makes a model recognisable, not the individual pieces: a long flat roof, a tall wing, a
 *    crate on the back. Copying every odd brick only produced noise at race distance.
 *  - a build that carries five or six clashing colours keeps at most four, chosen so the body colour stays readable
 *    at speed. The photo stays one tap away in the garage for whoever wants the full rainbow.
 *  - every car has a driver. Half of these builds had no figure on them, and an empty seat rolling down the track
 *    reads as a broken model; `suit` and `helmet` dress the driver in the colours of the vehicle that carries them.
 */
export const SAMPLE_CARS = [
  fromSample('monster-kong', { id: 'sample-monster', name: 'Monster Kong', color: '#205dcc', accent: '#ffd13d', palette: ['#205dcc', '#d52e39', '#ffd13d', '#f6f1df'], shape: 'truck', width: 1.85, length: 3.35, height: 1.7, detail: 'monster', suit: '#d52e39', helmet: '#f6f1df', description: 'Quattro ruotoni tassellati, la cabina di vetro e il lungo tubo grigio che punta in alto.' }),
  fromSample('blu-sprint', { id: 'sample-azzurro', name: 'Blu Sprint', color: '#08a7dc', accent: '#ffe142', palette: ['#08a7dc', '#dfdfd5', '#26985a'], shape: 'truck', width: 1.75, length: 3.2, height: 1.55, detail: 'blue-truck', suit: '#d52e39', helmet: '#1f63d6', description: 'Il fuoristrada azzurro con il cofano verde, il tetto grigio e i cerchi gialli.' }),
  fromSample('tir-furioso', { id: 'sample-convoy', name: 'Tir Furioso', color: '#eef0ea', accent: '#4f81d7', palette: ['#eaeee3', '#eb463b', '#4f81d7', '#f5ce39'], shape: 'truck', width: 1.8, length: 3.7, height: 1.65, detail: 'convoy', suit: '#4f81d7', helmet: '#eaeee3', description: 'La motrice con le ruote da jeep traina il pianale con il container di mattoncini colorati.' }),
  // Photo mietitrebbia-gialla: one machine, not two. It was briefly split into a flatbed and a canopy truck, and the children
  // said plainly what it is — a combine, whose front is far wider than its tail. That is the shape to get right.
  fromSample('mietitrebbia-gialla', { id: 'sample-mietitrebbia', name: 'Mietitrebbia Gialla', color: '#f5c631', accent: '#e04341', palette: ['#f5c631', '#e04341', '#8e949c', '#8eb885'], shape: 'truck', width: 1.95, length: 4.1, height: 1.95, ride: 0.86, axles: [{ z: 0.24, spread: 0.46, radius: 0.66, width: 0.44, drive: true }, { z: -0.36, spread: 0.3, radius: 0.24, width: 0.18, steer: true }], detail: 'harvester', suit: '#e04341', helmet: '#f5c631', description: 'La mietitrebbia gialla: ruotoni davanti, la barra di taglio con l’aspo, e il davanti molto più largo della coda.' }),
  fromSample('turbo-elica', { id: 'sample-fan', name: 'Turbo Elica', color: '#ffd335', accent: '#1463d6', palette: ['#ffd335', '#1463d6', '#eaece2'], shape: 'classic', width: 2.1, length: 2.6, height: 0.85, detail: 'fan', suit: '#1463d6', helmet: '#ffd335', description: 'La traversa gialla con il muso blu e la grande ventola che gira dietro.' }),
  fromSample('buggy-selvaggio', { id: 'sample-buggy', name: 'Buggy Selvaggio', color: '#139ecd', accent: '#f5d343', palette: ['#139ecd', '#f5d343', '#8a5a3a'], shape: 'buggy', width: 1.55, length: 3.1, height: 1, detail: 'crate', suit: '#1f63d6', helmet: '#f5d343', description: 'Il carrellino azzurro con il cofano giallo e la cassa di legno aperta sul retro.' }),
  fromSample('ali-di-fuoco', { id: 'sample-red', name: 'Ali di Fuoco', color: '#e13e3e', accent: '#eaece2', palette: ['#e13e3e', '#3f4a33', '#eaece2', '#ffd239'], shape: 'truck', width: 1.75, length: 3.6, height: 1.5, detail: 'military', cogs: true, suit: '#3f4a33', helmet: '#eaece2', description: 'Camion militare rosso e verde: ruote dentate, e dietro un’unica pinna bianca che regge l’alettone rosso.' }),
  fromSample('radio-razzo', { id: 'sample-antenna', name: 'Radio Razzo', color: '#eb3e42', accent: '#f8cd37', palette: ['#eb3e42', '#f8cd37', '#266bd3'], shape: 'classic', width: 1.95, length: 2.85, height: 0.65, detail: 'antenna', suit: '#266bd3', helmet: '#f8cd37', description: 'La traversa rossa con le alette gialle alle estremità e l’antenna verde altissima.' }),
  fromSample('missione-marte', { id: 'sample-rocket', name: 'Missione Marte', color: '#fb8933', accent: '#f7ce32', palette: ['#fb8933', '#e33c3c', '#159eca', '#f7ce32'], shape: 'truck', width: 1.7, length: 3.4, height: 1.55, detail: 'rocket', suit: '#159eca', helmet: '#f7ce32', description: 'Il camioncino blu e giallo con la grande struttura arancione inclinata verso il cielo.' }),
  fromSample('lama-nera', { id: 'sample-monoposto', name: 'Lama Nera', color: '#15161c', accent: '#f5c518', palette: ['#15161c', '#f5c518', '#2ec4d6', '#e0342a'], shape: 'racer', width: 1.5, length: 3.9, height: 0.75, detail: 'f1', wing: '#e0342a', suit: '#2ec4d6', helmet: '#f5c518', description: 'La numero 5: telaio nero lunghissimo, musetto giallo e le griglie rosse sulla coda rialzata.' }),
  fromSample('bestia-rossa', { id: 'sample-dragster', name: 'Bestia Rossa', color: '#d8262c', accent: '#b9c9d6', palette: ['#d8262c', '#b9c9d6', '#2ec4d6', '#f5d343'], shape: 'racer', width: 1.45, length: 4.2, height: 0.9, detail: 'dragster', suit: '#1f63d6', helmet: '#f5d343', description: 'La numero 9 col muso lungo: tubi del motore a vista, pilota in alto e l’alettone grigio e azzurro che tocca il cielo.' }),
  fromSample('tre-zampe', { id: 'sample-trike', name: 'Tre Zampe', color: '#1f63d6', accent: '#f5d343', palette: ['#1f63d6', '#15161c', '#b9c9d6', '#f5d343'], shape: 'buggy', width: 1.4, length: 3.8, height: 1, detail: 'trike', suit: '#e0342a', helmet: '#f5d343', description: 'Tre ruote sole: la forcella lunga davanti, il sedile blu con lo schienale alto e il casco giallo.' }),
  fromSample('jet-tuono', { id: 'sample-jet', name: 'Jet Tuono', color: '#1f63d6', accent: '#e0342a', palette: ['#1f63d6', '#e0342a', '#b9c9d6', '#8a5a3a'], shape: 'classic', width: 1.7, length: 3.6, height: 0.8, detail: 'jet', suit: '#b9c9d6', helmet: '#2c3a4a', description: 'Muso blu a punta, ali di travi nere, coda rossa con lo stemma e una cassa di legno agganciata dietro.' }),
  // Photos bestia-rossa and rossa-numero-9 are the same red number 9, rebuilt between one shot and the other: once with the
  // sky-high wing (the dragster above), once low and bare. Its body is red — this one used to be modelled black.
  fromSample('rossa-numero-9', { id: 'sample-nove', name: 'Rossa Numero 9', color: '#d0342c', accent: '#b9c9d6', palette: ['#d0342c', '#b9c9d6', '#3b8de0', '#f5c518'], shape: 'racer', width: 1.55, length: 4.3, height: 1, detail: 'f1', number: [9], suit: '#1f63d6', helmet: '#f5c518', description: 'La monoposto rossa numero 9: musetto a punta, ala anteriore grigia e bianca, pilota col casco giallo.' }),
  fromSample('aereo-bianco', { id: 'sample-aereo', name: 'Aereo Bianco', color: '#eef0ea', accent: '#f5e04a', palette: ['#eef0ea', '#9aa3ab', '#3b8de0', '#f5e04a'], shape: 'classic', width: 1.7, length: 3.4, height: 1.1, detail: 'prop', axles: [{ z: 0.34, spread: 0, radius: 0.24, width: 0.18, steer: true }, { z: -0.28, spread: 0.42, radius: 0.28, width: 0.22 }], suit: '#3b8de0', helmet: '#eef0ea', description: 'L’aeroplano bianco e grigio con le ali a freccia, i due motori scanalati e l’abitacolo di vetro.' }),
  // The second batch. Three of these are what they are because of their wheels: oversized, knobbly tyres that stick
  // out past the body (`knobby` draws the tread blocks, `axles` gives them their real size). Shrunk to a normal
  // wheel they would be three anonymous cars, so the radius in each spec is measured off the photo against the body.
  fromSample('pattuglia-volante', { id: 'sample-pattuglia', name: 'Pattuglia Volante', color: '#1fa3a8', accent: '#1f5fd0', palette: ['#1fa3a8', '#f2f2ee', '#1b1d22', '#1f5fd0'], shape: 'racer', width: 1.7, length: 3.5, height: 1.1, ride: 0.55, knobby: true, axles: [{ z: 0.33, spread: 0.54, radius: 0.44, width: 0.34, steer: true, rim: '#9aa3ab' }, { z: -0.3, spread: 0.54, radius: 0.46, width: 0.36, drive: true, rim: '#c9b48a' }], detail: 'police', suit: '#1f5fd0', helmet: '#f2f2ee', description: 'La polizia da cross: muso bianco, tetto nero a bottoncini, gomme tassellate e l’alettone blu con scritto POLICE.' }),
  fromSample('muletto-furioso', { id: 'sample-muletto', name: 'Muletto Furioso', color: '#1f8a4c', accent: '#f5c518', palette: ['#1f8a4c', '#15161c', '#f5c518', '#7fd6e0'], shape: 'truck', width: 1.6, length: 3.2, height: 1.6, ride: 0.5, axles: [{ z: 0.3, spread: 0.5, radius: 0.34, width: 0.26, steer: true, rim: '#d8262c' }, { z: -0.32, spread: 0.5, radius: 0.42, width: 0.3, drive: true, rim: '#f5c518' }], detail: 'forklift', suit: '#f5c518', helmet: '#d8262c', description: 'Due forche nere lunghissime davanti, il vetro azzurro, la pinza nera sopra la testa e il cassone giallo dietro.' }),
  fromSample('luci-pazze', { id: 'sample-luci', name: 'Luci Pazze', color: '#8e1b1f', accent: '#9ccc3a', palette: ['#8e1b1f', '#b9bec4', '#f2f0ea', '#9ccc3a'], shape: 'classic', width: 1.7, length: 3.0, height: 1.3, ride: 0.62, knobby: true, axles: [{ z: 0.3, spread: 0.5, radius: 0.42, width: 0.34, steer: true, rim: '#c9cdd1' }, { z: -0.3, spread: 0.5, radius: 0.42, width: 0.34, drive: true, rim: '#a0703a' }], detail: 'beacons', suit: '#e5203a', helmet: '#ffd400', description: 'Rosso scuro e grigio sul telaio verde lime, gomme tassellate e il tetto pieno di luci trasparenti di tutti i colori.' }),
  fromSample('girocottero', { id: 'sample-girocottero', name: 'Girocottero', color: '#9aa3ab', accent: '#b3231f', palette: ['#9aa3ab', '#c8a97a', '#b3231f', '#f5c518'], shape: 'classic', width: 1.6, length: 3.3, height: 1.9, ride: 0.58, axles: [{ z: 0.58, spread: 0, radius: 0.34, width: 0.2, steer: true, rim: '#c9cdd1' }, { z: -0.22, spread: 0.42, radius: 0.36, width: 0.3, drive: true, rim: '#9aa3ab' }], detail: 'gyro', suit: '#b3231f', helmet: '#f5c518', description: 'Mezzo triciclo e mezzo elicottero: una ruota sola davanti, il sedile rosso e l’elica a croce che gira sopra.' }),
  fromSample('mordi-asfalto', { id: 'sample-mordi', name: 'Mordi Asfalto', color: '#1e8f4e', accent: '#e6c98f', palette: ['#1e8f4e', '#7d8288', '#e6c98f', '#2f6fd6'], shape: 'buggy', width: 2.0, length: 3.7, height: 1.5, ride: 0.62, knobby: true, rims: '#2b2f36', axles: [{ z: 0.34, spread: 0.56, radius: 0.7, width: 0.52, steer: true }, { z: -0.34, spread: 0.56, radius: 0.72, width: 0.54, drive: true }], detail: 'rod', suit: '#2f6fd6', helmet: '#3ec1e6', description: 'Un telaio sottile tra quattro gommoni tassellati enormi, i denti bianchi sul cofano e il motorone grigio dietro.' }),
  fromSample('caos-sei-ruote', { id: 'sample-caos', name: 'Caos Sei Ruote', color: '#d52e39', accent: '#f5c518', palette: ['#d52e39', '#f5c518', '#b9bec4', '#1f63d6'], shape: 'truck', width: 2.0, length: 4.0, height: 1.9, ride: 0.72, knobby: true, axles: [{ z: 0.32, spread: 0.56, radius: 0.62, width: 0.46, steer: true, rim: '#9ccc3a' }, { z: -0.1, spread: 0.56, radius: 0.62, width: 0.46, drive: true, rim: '#ff7a1a' }, { z: -0.42, spread: 0.56, radius: 0.62, width: 0.46, drive: true, rim: '#9aa3ab' }], detail: 'six', suit: '#1f63d6', helmet: '#f5c518', description: 'Sei ruotoni tassellati coi cerchi tutti diversi, mattoncini di ogni colore, la cabina di vetro e lo snorkel per guadare.' }),
  // The third batch, and here size is the point: the children said it before anything else — the aeroplane is
  // gigantic, the pink truck is tiny, the pickup is very long. Each spec is sized to that first, colours second.
  // The aeroplane is as big as the race allows a car to be (just under 3 m across the wings and 5.6 m long).
  fromSample('tubi-ruggenti', { id: 'sample-tubi', name: 'Tubi Ruggenti', color: '#d42b2b', accent: '#1f5fd0', palette: ['#d42b2b', '#1f5fd0', '#f2f0ea', '#15161c'], shape: 'truck', width: 1.6, length: 4.6, height: 1.25, ride: 0.55, axles: [{ z: 0.33, spread: 0.5, radius: 0.4, width: 0.3, steer: true, rim: '#b9bec4' }, { z: -0.34, spread: 0.5, radius: 0.4, width: 0.3, drive: true, rim: '#b9bec4' }], detail: 'pickup', suit: '#1f5fd0', helmet: '#f2f0ea', description: 'Il pickup più lungo del garage: muso rosso coi fari gialli, il vetro azzurro, il cassone blu e i tubi di scappamento cromati che spuntano sotto la pancia.' }),
  fromSample('scheggia-rosa', { id: 'sample-scheggia', name: 'Scheggia Rosa', color: '#e58fc4', accent: '#a8693c', palette: ['#e58fc4', '#a8693c', '#f2f0ea', '#6b7078'], shape: 'truck', width: 1.35, length: 2.4, height: 1.3, ride: 0.42, knobby: true, axles: [{ z: 0.32, spread: 0.5, radius: 0.28, width: 0.24, steer: true, rim: '#f2f0ea' }, { z: -0.12, spread: 0.5, radius: 0.28, width: 0.24, drive: true, rim: '#f2f0ea' }, { z: -0.36, spread: 0.5, radius: 0.28, width: 0.24, drive: true, rim: '#f5c518' }], detail: 'minitruck', suit: '#a8693c', helmet: '#e58fc4', description: 'Il camioncino più piccolo di tutti: la cabina di vetro, un blocco rosa, il cassone marrone e sei ruote, una col cerchio giallo.' }),
  fromSample('doppio-missile', { id: 'sample-missile', name: 'Doppio Missile', color: '#f5c518', accent: '#5a6068', palette: ['#f5c518', '#5a6068', '#15161c', '#d6f04a'], shape: 'buggy', width: 1.6, length: 2.4, height: 1.3, ride: 0.5, knobby: true, axles: [{ z: 0.26, spread: 0.42, radius: 0.38, width: 0.3, steer: true, rim: '#e8e6e0' }, { z: -0.26, spread: 0.42, radius: 0.38, width: 0.3, drive: true, rim: '#b9bec4' }], detail: 'launcher', suit: '#5a6068', helmet: '#f5c518', description: 'Piccola e cattiva: corpo giallo, due tubi lanciamissili neri sul tetto e i missili gialli trasparenti pronti a partire dietro.' }),
  fromSample('jumbo-fiammante', { id: 'sample-jumbo', name: 'Jumbo Fiammante', color: '#f2f0ea', accent: '#5aa9e6', palette: ['#f2f0ea', '#9aa3ab', '#d8262c', '#5aa9e6'], shape: 'classic', width: 2.3, length: 4.6, height: 1.2, ride: 0.45, axles: [{ z: 0.42, spread: 0, radius: 0.22, width: 0.16, steer: true, rim: '#d8262c' }, { z: -0.08, spread: 0.2, radius: 0.26, width: 0.2, drive: true, rim: '#9aa3ab' }], detail: 'airliner', suit: '#5aa9e6', helmet: '#d8262c', description: 'L’aereo gigante: la fusoliera lunghissima a mattoncini di tutti i colori, le ali color panna, le alette azzurre e le fiamme che escono dalla coda.' }),
];

const DARK = '#253445';
const TIRE = '#26303b';
const WHITE = '#f9f3de';
/** Reference heights of the photo analysis; a photo car taller or shorter than this scales its body. */
const BASE_HEIGHT = { truck: 1.55, buggy: 1.15, racer: 0.95, classic: 1.15 };

/** Every model faces +Z, and its tires touch y=0. Body is merged by color. */
export function createCarModel(input = {}) {
  const spec = { width: 1.7, length: 3.2, height: 1.15, color: '#ff6445', accent: '#ffe16d', shape: 'classic', ...input };
  const car = new THREE.Group();
  car.name = spec.name || 'Auto di mattoncini';
  const body = new THREE.Group();
  car.add(body);
  const batches = new Map();
  const materials = new Map();
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitStud = new THREE.CylinderGeometry(1, 1, 1, 10);
  function material(color, glass = false) {
    const key = color + (glass ? '-glass' : '');
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: glass ? 0.12 : 0.42, metalness: glass ? 0.12 : 0.02, transparent: glass, opacity: glass ? 0.68 : 1 }));
    return [key, materials.get(key)];
  }
  function addGeometry(geometry, color, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, glass = false) {
    const [key] = material(color, glass);
    const copy = geometry.clone();
    position.set(x, y, z); scale.set(sx, sy, sz);
    quat.setFromEuler(new THREE.Euler(rx, ry, rz));
    matrix.compose(position, quat, scale);
    copy.applyMatrix4(matrix);
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(copy);
  }
  function brick(x, y, z, w, h, d, color, studs = true) {
    addGeometry(unitBox, color, x, y, z, w, h, d);
    if (!studs) return;
    const nx = Math.max(1, Math.round(w / 0.39));
    const nz = Math.max(1, Math.round(d / 0.39));
    for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
      addGeometry(unitStud, color, x + (ix - (nx - 1) / 2) * w / nx, y + h / 2 + 0.035, z + (iz - (nz - 1) / 2) * d / nz, 0.105, 0.07, 0.105);
    }
  }
  const w = THREE.MathUtils.clamp(spec.width, 1.3, 2.3);
  // Up to 4.6 m: sample-dragster declares 4.2 and sample-monoposto 3.9, and both were silently cut to 3.8, so they
  // were never the cars their authors described. Nothing in race.js has geometry tied to length: this is visual only.
  const l = THREE.MathUtils.clamp(spec.length, 2.3, 4.6);
  // Catalog cars keep their hand-made `detail`; photo cars compose `parts` drawn with their own palette.
  const parts = spec.detail ? new Set() : new Set(normalizeParts(spec.parts));
  const palette = spec.palette || [spec.color, spec.accent];
  const swatches = [...palette, WHITE];
  const pick = (i) => swatches[i % swatches.length];
  const monster = spec.detail === 'monster';
  const convoy = spec.detail === 'convoy';
  const bigfoot = spec.detail === 'bigfoot';
  const bigWheels = monster || convoy || bigfoot || parts.has('bigWheels');
  const flat = ['fan', 'antenna', 'jet'].includes(spec.detail);
  const wheelRadius = bigfoot ? 0.64 : bigWheels ? 0.48 : spec.shape === 'buggy' ? 0.37 : flat ? 0.25 : 0.34;
  // With one wheel size the old rule was enough; a combine with 0.66 m drive wheels and 0.24 m casters needs to say
  // outright how high its chassis rides, so `spec.ride` wins when it is given.
  const deck = rideHeight(spec, wheelRadius + (bigfoot ? 0.55 : bigWheels ? 0.39 : 0.19));
  const wheels = [];
  /** Parts that turn on their own vertical axis while the car runs: the gyrocopter's rotor. */
  const spinners = [];
  const wheelWidth = bigfoot ? 0.46 : bigWheels ? 0.34 : 0.27;
  const wheelMat = new THREE.MeshStandardMaterial({ color: TIRE, roughness: 0.9 });
  // `rims` lets a car name its own hub colour: "cerchi rossi" was written in a description and drawn nowhere.
  const hubMat = new THREE.MeshStandardMaterial({ color: spec.rims || (spec.detail === 'blue-truck' ? '#ffd332' : monster || convoy ? WHITE : spec.accent), roughness: 0.45 });
  const axleZ = flat ? l * 0.29 : l * 0.32;
  // Trikes (photo part "threeWheels"): one wheel on a fork ahead of the body, two at the rear axle.
  const trike = spec.detail === 'trike' || parts.has('threeWheels');
  // Every layout, legacy and declarative, lives in src/wheels.js. See there for the `axles` spec.
  const wheelSpots = wheelLayout(spec, { w, l, wheelRadius, wheelWidth, axleZ });
  // An articulated trailer pivots about the fifth wheel, so its own wheels and body hang off a `hitch` group rather
  // than off the tractor's body. The hitch is a child of `car` and NOT of `tilt`: the trailer must not lean with the
  // cab, and its tyres have to stay on the road whatever angle it is at.
  const hitchZ = -l * 0.3;
  const hasTrailer = wheelSpots.some((spot) => spot.group === 'trailer');
  const hitch = hasTrailer ? new THREE.Group() : null;
  if (hitch) { hitch.position.z = hitchZ; car.add(hitch); }
  const axleHubs = new Map();
  const hubFor = (colour) => {
    if (!colour) return hubMat;
    if (!axleHubs.has(colour)) axleHubs.set(colour, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.45 }));
    return axleHubs.get(colour);
  };
  /**
   * `knobby`: the chunky off-road tread of the cross and monster tyres, two staggered rows of blocks round a slightly
   * smaller core. Merged into one mesh per wheel. The blocks top out just inside the radius, for the same reason the
   * `cogs` teeth do: anything below the contact line reads as a car sunk into the road.
   */
  function knobbyTread(r, tread) {
    const blocks = [];
    const count = Math.max(12, Math.round(r * 30));
    for (let i = 0; i < count; i += 1) {
      for (const side of [-1, 1]) {
        const angle = ((i + (side > 0 ? 0.5 : 0)) / count) * Math.PI * 2;
        const block = new THREE.BoxGeometry(tread * 0.44, r * 0.14, r * 0.2);
        block.translate(side * tread * 0.26, r * 0.92, 0);
        block.rotateX(angle);
        blocks.push(block);
      }
    }
    const merged = mergeGeometries(blocks, false);
    for (const block of blocks) block.dispose();
    return merged;
  }
  for (const { x, z, r, tread, group, rim: rimColour, steer } of wheelSpots) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(spec.knobby ? r * 0.88 : r, spec.knobby ? r * 0.88 : r, tread, 14), wheelMat);
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.54, r * 0.54, tread + 0.022, 10), hubFor(rimColour));
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.17, r * 0.17, tread + 0.04, 8), wheelMat);
    axle.rotation.z = Math.PI / 2;
    wheel.add(axle);
    // `cogs`: teeth around the tyre, for the builds whose wheels are toothed gears rather than smooth tyres.
    if (spec.cogs) {
      // The teeth reach exactly as far as the tyre and no further: a wheel whose lowest point is below the road
      // fails the contact test, and on the track it would look like the car is sunk into the tarmac.
      const tooth = new THREE.BoxGeometry(tread * 0.86, r * 0.3, r * 0.24);
      for (let i = 0; i < 10; i += 1) {
        const angle = (i / 10) * Math.PI * 2;
        const cog = new THREE.Mesh(tooth.clone(), hubMat);
        cog.position.set(0, Math.sin(angle) * r * 0.87, Math.cos(angle) * r * 0.87);
        cog.rotation.x = -angle;
        wheel.add(cog);
      }
      tooth.dispose();
    }
    // Last child, so the quirk generator's `children[1]` is still the hub.
    if (spec.knobby) wheel.add(new THREE.Mesh(knobbyTread(r, tread), wheelMat));
    wheel.position.set(x, r, group === 'trailer' ? z - hitchZ : z);
    wheel.userData.radius = r;
    wheel.userData.tread = tread;
    wheel.userData.steer = !!steer;
    wheel.userData.group = group || 'car';
    wheel.traverse(obj => { if (obj.isMesh) obj.castShadow = true; });
    (group === 'trailer' ? hitch : car).add(wheel); wheels.push(wheel);
  }
  // Every car sits on a floor pan and a base slab as wide as the body. A motorbike must not: a 1.3 m-wide plank
  // under two in-line wheels is exactly what stops it reading as a bike.
  const narrow = spec.detail === 'moto';
  /**
   * Bodies that build their own hull from nose to tail. Without this they also got the generic slab underneath —
   * a full-length block of body colour — and a dinosaur ended up reading as a green wedge with a lump on it, which
   * is exactly what it looked like in the garage.
   */
  const ownHull = ['rex', 'stego', 'rod', 'pickup', 'minitruck', 'launcher', 'airliner'].includes(spec.detail);
  // The rod rides on a thin beam between four huge tyres: a full-width pan would run straight through them. The
  // aeroplane's fuselage is narrower than its declared width, which is there for the wings.
  const slim = spec.detail === 'rod' || spec.detail === 'airliner';
  if (!narrow) brick(0, deck, 0, w * (slim ? 0.5 : 0.89), 0.18, l * 0.97, DARK, false);
  else brick(0, deck, 0, 0.3, 0.16, l * 0.8, DARK, false);
  if (trike) {
    for (const x of [-0.2, 0.2]) addGeometry(unitBox, DARK, x, wheelRadius + 0.05, axleZ + 0.45, 0.07, wheelRadius * 1.5, 0.1);
    addGeometry(unitBox, DARK, 0, deck, axleZ + 0.2, 0.5, 0.14, 0.6);
  }
  const baseY = deck + 0.2;
  if (!narrow && !ownHull) brick(0, baseY, 0, w * 0.87, 0.27, l * 0.9, spec.color, false);
  const hoodY = baseY + 0.23;
  const cabHeight = parts.has('cab') ? 0.85 : null;

  // Colorful individual pieces retain the homemade appearance of the photo cars.
  function patchwork(z, y, depth, height = 0.25) {
    for (let i = 0; i < 4; i++) brick((i - 1.5) * w * 0.205, y, z, w * 0.205 - 0.012, height, depth, palette[i % palette.length]);
  }
  let roofTop = null;
  /**
   * A cabin. `glass` builds its shell out of the windscreen material instead of bodywork: the three photo trucks
   * are glazed boxes in the photos, and with a solid shell the driver inside them simply could not be seen.
   */
  function cockpit(z = -0.15, high = 0.6, roof = true, glass = false) {
    if (glass) addGeometry(unitBox, '#9fe8ec', 0, hoodY + high / 2, z - 0.26, w * 0.62, high, 0.65, 0, 0, 0, true);
    else brick(0, hoodY + high / 2, z - 0.26, w * 0.62, high, 0.65, spec.color, false);
    addGeometry(unitBox, '#9fe8ec', 0, hoodY + high / 2 + 0.06, z + 0.13, w * 0.58, high * 0.7, 0.07, -0.16, 0, 0, true);
    if (!roof) return;
    brick(0, hoodY + high + 0.05, z - 0.13, w * 0.75, 0.13, 1, spec.accent);
    roofTop = { y: hoodY + high + 0.115, z: z - 0.13 };
  }
  /**
   * Racing stripes as plates laid over the studs, the way they are built for real. Until now only beetle() had them,
   * hand-placed: ten catalogue cars promised stripes or arrows in their description and wore a plain shell instead.
   * `stripes: true` takes the next two palette colours, an array is [centre, sides], and an object can ask for the
   * side pair alone — "due strisce bianche sul cofano" is two stripes, not three.
   */
  function stripeSpec() {
    const value = spec.stripes;
    if (!value) return null;
    if (value === true) return { center: pick(1), sides: pick(2), width: 0.2 };
    if (Array.isArray(value)) return { center: value[0], sides: value[1], width: 0.2 };
    return { center: value.center, sides: value.sides, width: value.width || 0.2 };
  }
  const PLATE = 0.07;
  /** `base` is the top of the brick below plus stud clearance: a plate rests on the studs, it does not sink into them. */
  function stripes(base, z, depth) {
    const plan = stripeSpec();
    if (!plan) return;
    if (plan.center) brick(0, base + PLATE / 2, z, plan.width, PLATE, depth, plan.center, false);
    if (!plan.sides) return;
    // Flanking a centre stripe they stay thin; with no centre stripe the pair carries the whole decoration, so it is
    // drawn at full width and set wider apart — otherwise "due strisce bianche" disappears against the bodywork.
    // A lone pair also has to clear the middle of the bonnet, where the quirk generator parks its crooked tower:
    // measured from the body width, the stripes stay on either side of it instead of hiding underneath.
    const sideWidth = plan.center ? plan.width * 0.6 : plan.width;
    const offset = plan.center ? plan.width * 0.8 + 0.09 : w * 0.2;
    for (const x of [-offset, offset]) brick(x, base + PLATE / 2, z, sideWidth, PLATE, depth, plan.sides, false);
  }
  /** A light bar across the cabin roof: "fari sul tetto" was in a description with nothing behind it. */
  function roofLamps(color = '#fff5bd') {
    const perch = roofTop || { y: hoodY + 0.75, z: 0 };
    brick(0, perch.y + 0.06, perch.z + 0.2, w * 0.5, 0.12, 0.16, DARK, false);
    for (const x of [-w * 0.16, 0, w * 0.16]) addGeometry(unitStud, color, x, perch.y + 0.17, perch.z + 0.2, 0.13, 0.12, 0.13);
  }
  /** A windscreen slanted over an open cockpit, for the bodies that have no roof to hold one. */
  function windscreen(z, y = hoodY + 0.26) {
    for (const x of [-w * 0.26, w * 0.26]) brick(x, y + 0.16, z, 0.07, 0.42, 0.08, DARK, false);
    addGeometry(unitBox, '#9fe8ec', 0, y + 0.2, z, w * 0.5, 0.44, 0.06, -0.32, 0, 0, true);
  }
  /**
   * The figure at the wheel. Half the cars born from the photos had no minifigure on them, and an empty seat rolling
   * past at speed reads as an unfinished model rather than as a vehicle: every body below now seats one. `suit` and
   * `helmet` on the spec name its two colours, so the driver is dressed like the build that carries them; the
   * arguments stay as the fallback each hand-made body already chose.
   */
  function driver(z = -0.26, y = hoodY + 0.2, suit = DARK, helmet = spec.accent) {
    brick(0, y, z, 0.42, 0.42, 0.34, spec.suit || suit, false);
    addGeometry(unitStud, '#ffd776', 0, y + 0.37, z, 0.2, 0.3, 0.2);
    addGeometry(unitStud, spec.helmet || helmet, 0, y + 0.48, z, 0.23, 0.17, 0.23);
    brick(0, y + 0.38, z + 0.195, 0.3, 0.11, 0.045, DARK, false);
    brick(0, y + 0.07, z + 0.28, 0.34, 0.065, 0.13, DARK, false);
  }
  function wing(y = hoodY + 0.58, z = -l * 0.36, color = spec.accent) {
    for (const x of [-w * 0.3, w * 0.3]) brick(x, (y + deck) / 2, z, 0.11, y - deck, 0.13, DARK, false);
    brick(0, y, z, w * 1.08, 0.13, 0.44, color);
    // A tall wing on two thin struts reads as a plank hovering behind the car. A central pylon down to the deck and
    // two endplates make it a wing that is plainly bolted on — which is what the children were missing.
    if (y - deck > 0.9) {
      brick(0, (y + deck) / 2, z + 0.1, 0.16, y - deck, 0.42, DARK, false);
      for (const x of [-w * 0.52, w * 0.52]) brick(x, y - 0.08, z, 0.07, 0.32, 0.46, color, false);
    }
  }
  // Parameterized accessories: used by the catalog cars with their literal colors and by `parts` with the palette.
  function fan(y, z, color) {
    // Two struts down to the deck plus a floor plate: without them the ring hangs off the tail on nothing.
    for (const x of [-0.3, 0.3]) brick(x, (deck + y + 0.65) / 2, z, 0.1, y + 0.65 - deck, 0.14, DARK, false);
    brick(0, y + 0.1, z + 0.34, w * 0.5, 0.14, 0.42, DARK, false);
    brick(0, y + 0.16, z + 0.47, 0.67, 0.3, 0.7, color);
    const ring = new THREE.TorusGeometry(0.55, 0.065, 6, 20);
    addGeometry(ring, color, 0, y + 0.65, z);
    ring.dispose();
    for (let i = 0; i < 6; i++) addGeometry(unitBox, color, Math.sin(i * Math.PI / 3) * 0.27, y + 0.65 + Math.cos(i * Math.PI / 3) * 0.27, z, 0.11, 0.56, 0.08, 0, 0, -i * Math.PI / 3);
  }
  function antenna(x, y, z, color) {
    addGeometry(unitStud, color, x, y + 0.85, z, 0.025, 1.7, 0.025);
  }
  function rocket(y, z, bodyColor, noseColor) {
    // Two cradles under the tube: the rocket used to sit on absolute coordinates with air beneath it.
    for (const x of [-0.4, 0.4]) brick(x, (deck + y + 0.5) / 2, z - 0.1, 0.12, y + 0.5 - deck, 0.32, DARK, false);
    brick(0, y + 0.18, z - 1, 0.5, 0.24, 0.3, DARK, false);
    addGeometry(unitBox, bodyColor, 0, y + 0.82, z - 0.43, 0.87, 0.63, 1.82, 0.55);
    addGeometry(unitBox, noseColor, 0, y + 1.33, z - 1.13, 0.85, 0.62, 0.36, 0.55);
    addGeometry(unitBox, DARK, 0, y + 0.21, z + 0.27, 0.61, 0.41, 0.36, 0.55);
    for (const x of [-0.55, 0.55]) addGeometry(unitBox, noseColor, x, y + 0.48, z - 0.2, 0.18, 0.65, 0.85, 0.55);
  }
  function cargoStack(y, z, rows, depth = 1.37) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < 3; col++) brick((col - 1) * w * 0.265, y + 0.1 + row * 0.27, z, w * 0.26, 0.25, depth, palette[(row * 2 + col) % palette.length], row === rows - 1);
    }
  }
  function fin(y, z, color) {
    // Foot plate and a filler below the blade: on a `classic` the fin was raised clear of the roof and floated.
    brick(0, y + 0.08, z, 0.34, 0.16, 0.66, DARK, false);
    brick(0, y + 0.34, z, 0.16, 0.4, 0.5, color, false);
    addGeometry(unitBox, color, 0, y + 0.65, z, 0.12, 0.72, 0.63, 0.36);
  }
  /** Seven-segment digit made of thin bricks. `plane` is 'top' (roof, read from behind) or 'left'/'right' (doors). */
  function digit(value, plane, cx, cy, cz, color, W = 0.15, H = 0.28, t = 0.045, depth = 0.03) {
    const segments = { a: [0, H / 2, 'h'], b: [W / 2, H / 4, 'v'], c: [W / 2, -H / 4, 'v'], d: [0, -H / 2, 'h'], e: [-W / 2, -H / 4, 'v'], f: [-W / 2, H / 4, 'v'], g: [0, 0, 'h'] };
    const lit = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' }[value] || '';
    for (const key of lit) {
      const [sx, sy, dir] = segments[key];
      const along = dir === 'h' ? W : t, across = dir === 'h' ? t : H / 2 + t;
      if (plane === 'top') addGeometry(unitBox, color, cx - sx, cy, cz + sy, along, depth, across);
      else addGeometry(unitBox, color, cx, cy + sy, cz + (plane === 'left' ? sx : -sx), depth, across, along);
    }
  }
  /** Brick-built bug: stepped layers of studded bricks trace the round Beetle profile; plates form the racing stripes. */
  function beetle() {
    const cream = spec.color, red = spec.accent, blue = '#1f4fd6', rust = '#7d431a', rustLight = '#b0642c', chrome = '#d9dde3', glass = '#9fe8ec';
    const plate = 0.09;
    // Fenders over each wheel and running boards between them.
    for (const x of [-w * 0.44, w * 0.44]) for (const z of [axleZ, -axleZ]) brick(x, deck + 0.14, z, 0.34, 0.2, 0.95, cream, true);
    for (const x of [-w * 0.46, w * 0.46]) brick(x, deck + 0.03, 0, 0.2, 0.08, l * 0.36, DARK, false);
    // Body layers: wide base, then narrower steps rising into the cabin and falling to the engine lid.
    brick(0, hoodY, 0, w * 0.82, 0.26, l * 0.84, cream, false);
    brick(0, hoodY + 0.24, l * 0.2, w * 0.7, 0.22, l * 0.38, cream, false);
    brick(0, hoodY + 0.42, l * 0.28, w * 0.56, 0.14, l * 0.16, cream, true);
    brick(0, hoodY + 0.24, -l * 0.29, w * 0.7, 0.22, l * 0.2, cream, false);
    brick(0, hoodY + 0.44, -l * 0.25, w * 0.58, 0.18, l * 0.12, cream, true);
    // Cabin: glass band with cream pillars, then two roof steps.
    brick(0, hoodY + 0.62, -l * 0.04, w * 0.66, 0.54, l * 0.32, glass, false);
    for (const x of [-w * 0.33, w * 0.33]) for (const z of [l * 0.12, -l * 0.2]) brick(x, hoodY + 0.62, z, 0.08, 0.54, 0.1, cream, false);
    brick(0, hoodY + 0.95, -l * 0.05, w * 0.7, 0.14, l * 0.34, cream, false);
    brick(0, hoodY + 1.08, -l * 0.06, w * 0.5, 0.14, l * 0.24, cream, true);
    // Racing stripes: red plate down the middle, blue plates beside it, on hood, roof and engine lid.
    for (const [y, z, depth] of [[hoodY + 0.36, l * 0.2, l * 0.38], [hoodY + 1.16, -l * 0.06, l * 0.24], [hoodY + 0.36, -l * 0.29, l * 0.2]]) {
      brick(0, y + plate / 2, z, 0.2, plate, depth, red, true);
      for (const x of [-0.26, 0.26]) brick(x, y + plate / 2, z, 0.12, plate, depth, blue, true);
    }
    brick(0, hoodY + 0.55, l * 0.28, 0.2, plate, l * 0.16, red, true);
    // The racing number, on white plates on the roof and both doors. Invented, not the famous one: this bug wears
    // 35, which is that number turned back to front — a joke a six-year-old gets in one second.
    const bugNumber = Array.isArray(spec.number) && spec.number.length === 2 ? spec.number : [3, 5];
    brick(0, hoodY + 1.15 + plate, -l * 0.06 + 0.02, 0.44, 0.04, 0.44, WHITE, false);
    digit(bugNumber[0], 'top', -0.11, hoodY + 1.2 + plate, -l * 0.06 + 0.02, DARK);
    digit(bugNumber[1], 'top', 0.11, hoodY + 1.2 + plate, -l * 0.06 + 0.02, DARK);
    for (const side of ['left', 'right']) {
      const sign = side === 'left' ? -1 : 1;
      const x = sign * (w * 0.41 + 0.02);
      brick(x, hoodY + 0.22, -0.02, 0.05, 0.42, 0.62, WHITE, false);
      digit(bugNumber[0], side, x + sign * 0.04, hoodY + 0.22, -0.02 - sign * 0.1, DARK, 0.11, 0.2, 0.035);
      digit(bugNumber[1], side, x + sign * 0.04, hoodY + 0.22, -0.02 + sign * 0.1, DARK, 0.11, 0.2, 0.035);
    }
    // Rust plates, a rusty exhaust and slightly crooked chrome bumpers: the bug has seen a few races.
    for (const [x, y, z, sx, sz] of [[-w * 0.44, deck + 0.25, axleZ + 0.25, 0.2, 0.22], [w * 0.44, deck + 0.25, -axleZ - 0.2, 0.2, 0.22], [w * 0.15, hoodY + 0.54, -l * 0.28, 0.22, 0.16], [-w * 0.22, hoodY + 0.36, l * 0.34, 0.16, 0.2]]) {
      brick(x, y, z, sx, 0.03, sz, rust, false);
      brick(x + 0.04, y + 0.005, z - 0.03, sx * 0.5, 0.03, sz * 0.5, rustLight, false);
    }
    addGeometry(unitStud, rustLight, w * 0.22, deck - 0.03, -l * 0.5, 0.06, 0.34, 0.06, Math.PI / 2);
    addGeometry(unitBox, chrome, 0, baseY + 0.04, l * 0.47, w * 0.8, 0.08, 0.1, 0, 0, 0.04);
    addGeometry(unitBox, chrome, 0, baseY + 0.04, -l * 0.47, w * 0.8, 0.08, 0.1, 0, 0, -0.03);
    for (const x of [-w * 0.3, w * 0.3]) addGeometry(unitStud, '#fff5bd', x, hoodY + 0.3, l * 0.4, 0.14, 0.1, 0.14, Math.PI / 2);
    // Herbie's mischievous eyes: blue slope bricks raised over the headlights.
    for (const x of [-w * 0.3, w * 0.3]) brick(x, hoodY + 0.5, l * 0.36, 0.3, 0.08, 0.1, blue, false);
  }

  if (spec.detail === 'beetle') {
    beetle();
  } else if (bigfoot) {
    // Monster truck: pickup body high over exposed axles and shocks, roll bar with lights, twin exhaust stacks, flame plates.
    const chrome = '#d9dde3', flame = '#ff6a00';
    for (const z of [-axleZ, axleZ]) {
      addGeometry(unitBox, DARK, 0, wheelRadius, z, w * 0.96, 0.18, 0.18);
      for (const x of [-w * 0.36, w * 0.36]) {
        addGeometry(unitStud, spec.accent, x, (wheelRadius + deck) / 2, z + 0.12, 0.06, deck - wheelRadius, 0.06);
        addGeometry(unitStud, chrome, x, (wheelRadius + deck) / 2 + 0.1, z - 0.12, 0.05, deck - wheelRadius - 0.2, 0.05);
      }
    }
    brick(0, hoodY, l * 0.27, w * 0.86, 0.3, l * 0.34, spec.color, false);
    cockpit(0.02, 0.85, true);
    brick(0, hoodY - 0.02, -l * 0.29, w * 0.86, 0.2, l * 0.3, spec.color, true);
    for (const x of [-w * 0.4, w * 0.4]) brick(x, hoodY + 0.25, -l * 0.29, 0.08, 0.32, l * 0.3, spec.color, false);
    brick(0, hoodY + 0.25, -l * 0.44, w * 0.8, 0.32, 0.08, spec.color, false);
    for (const x of [-w * 0.3, w * 0.3]) addGeometry(unitStud, chrome, x, hoodY + 1.15, -l * 0.08, 0.05, 0.95, 0.05);
    addGeometry(unitStud, chrome, 0, hoodY + 1.62, -l * 0.08, 0.05, w * 0.66, 0.05, 0, 0, Math.PI / 2);
    for (let i = 0; i < 4; i += 1) addGeometry(unitBox, '#fff5bd', (i - 1.5) * w * 0.17, hoodY + 1.72, -l * 0.07, 0.2, 0.16, 0.14);
    for (const x of [-w * 0.4, w * 0.4]) {
      addGeometry(unitStud, chrome, x, hoodY + 0.75, -l * 0.13, 0.07, 1.05, 0.07);
      addGeometry(unitStud, DARK, x, hoodY + 1.29, -l * 0.13, 0.085, 0.06, 0.085);
    }
    for (const side of [-1, 1]) for (let k = 0; k < 5; k += 1) {
      brick(side * w * 0.445, hoodY + 0.02 + k * 0.05, l * 0.36 - k * 0.19, 0.04, 0.2 - k * 0.03, 0.16, k % 2 ? spec.accent : flame, false);
    }
    brick(0, baseY + 0.05, l * 0.5, w * 0.98, 0.24, 0.16, spec.accent, false);
    for (const x of [-w * 0.25, w * 0.25]) brick(x, baseY + 0.32, l * 0.47, 0.26, 0.2, 0.08, DARK, false);
  } else if (spec.detail === 'fan') {
    brick(0, hoodY, 0.22, w * 1.05, 0.23, 0.56, spec.color);
    fan(hoodY, -0.75, spec.accent);
    brick(0, hoodY + 0.07, 0.65, 0.47, 0.2, 0.56, spec.accent);
    driver(0.12, hoodY + 0.36);
  } else if (spec.detail === 'antenna') {
    brick(0, hoodY - 0.05, 0, w * 1.03, 0.15, l * 0.76, spec.color);
    for (const x of [-w * 0.5, w * 0.5]) brick(x, hoodY + 0.14, -l * 0.26, 0.1, 0.36, 0.7, spec.accent);
    antenna(0, hoodY, -0.12, '#b4e849');
    brick(0, hoodY + 0.05, l * 0.29, 0.75, 0.28, 0.37, '#266bd3');
    driver(l * 0.08, hoodY + 0.34);
  } else if (spec.detail === 'rocket') {
    brick(0, hoodY, 0.82, w * 0.83, 0.25, 0.85, '#179ccb');
    driver(0.68, hoodY + 0.2, '#f2ce38');
    rocket(hoodY, 0, '#fb8831', '#e7433c');
  } else if (convoy) {
    // Photo tir-furioso: a jeep-wheeled tractor unit (white base, coloured bricks, grey cab) pulling a flatbed
    // trailer that carries a tall multicoloured container under a sage-green roof plate.
    const cabZ = l * 0.27, grey = '#b9c9d6', yellow = '#f5d343';
    brick(0, hoodY, cabZ, w * 0.82, 0.28, l * 0.4, spec.color, false);
    brick(0, baseY + 0.02, l * 0.48, w * 0.72, 0.22, 0.12, yellow, false);
    patchwork(cabZ + l * 0.06, hoodY + 0.26, l * 0.24, 0.26);
    addGeometry(unitBox, '#9fe8ec', 0, hoodY + 0.5, cabZ - l * 0.05, w * 0.7, 0.62, l * 0.24, 0, 0, 0, true);
    addGeometry(unitBox, '#9fe8ec', 0, hoodY + 0.6, cabZ + l * 0.075, w * 0.6, 0.4, 0.06, 0, 0, 0, true);
    for (const x of [-w * 0.36, w * 0.36]) addGeometry(unitBox, '#9fe8ec', x, hoodY + 0.6, cabZ - l * 0.05, 0.05, 0.34, l * 0.15, 0, 0, 0, true);
    driver(cabZ - l * 0.04, hoodY + 0.28);
    brick(0, hoodY + 0.86, cabZ - l * 0.05, w * 0.74, 0.14, l * 0.26, grey, true);
    brick(0, hoodY + 1.0, cabZ - l * 0.08, 0.6, 0.12, 0.42, spec.accent, true);
    brick(0, deck + 0.05, -l * 0.02, 0.3, 0.1, l * 0.14, DARK, false);
    brick(0, deck + 0.1, -l * 0.27, w * 0.72, 0.1, l * 0.44, '#8a8f99', true);
    for (const x of [-w * 0.46, w * 0.46]) brick(x, deck * 0.7, -l * 0.38, 0.2, deck * 0.36, 0.5, DARK, false);
    cargoStack(deck + 0.2, -l * 0.27, 4, l * 0.42);
    brick(0, deck + 0.2 + 0.1 + 3 * 0.27 + 0.19, -l * 0.27, w * 0.8, 0.1, l * 0.42, '#9fc4b0', true);
  } else if (spec.detail === 'moto') {
    // A motorbike: two wheels in line, a telescopic fork, the tank, a low saddle and wide bars. The bars are not
    // decoration — a bike body is barely 0.9 m across and the race needs a vehicle you can see from behind.
    const chrome = '#c9cdd1';
    brick(0, deck + 0.05, -l * 0.02, 0.34, 0.34, l * 0.5, DARK, false);            // engine block
    brick(0, deck + 0.34, l * 0.1, 0.42, 0.34, l * 0.26, spec.color, false);       // tank
    brick(0, deck + 0.26, -l * 0.22, 0.4, 0.16, l * 0.24, DARK, false);            // saddle
    brick(0, deck + 0.48, -l * 0.3, 0.36, 0.26, 0.12, spec.color, false);          // tail hump
    for (const x of [-0.16, 0.16]) addGeometry(unitBox, chrome, x, deck + 0.26, l * 0.34, 0.09, 0.62, 0.09, 0.32);  // fork
    brick(0, deck + 0.56, l * 0.3, w * 0.82, 0.07, 0.07, DARK, false);             // handlebars
    for (const x of [-w * 0.38, w * 0.38]) brick(x, deck + 0.56, l * 0.3, 0.09, 0.1, 0.16, spec.accent, false);
    brick(0, deck + 0.42, l * 0.38, 0.26, 0.22, 0.12, '#fff5bd', false);           // headlight
    for (const x of [-0.24, 0.24]) brick(x, deck - 0.02, -l * 0.3, 0.1, 0.1, l * 0.3, chrome, false);  // exhausts
    brick(0, deck + 0.5, l * 0.18, 0.5, 0.1, 0.4, spec.accent, false);             // rider's chest plate
    driver(-l * 0.18, deck + 0.42, spec.accent);
    // `sideRockets`: two tubes strapped along the flanks, nose cone forward. Toy-bike physics, obviously.
    if (spec.sideRockets) for (const x of [-0.34, 0.34]) {
      addGeometry(unitStud, spec.color, x, deck + 0.22, l * 0.02, 0.2, l * 0.42, 0.2, Math.PI / 2);
      addGeometry(unitStud, '#f4f4f0', x, deck + 0.22, l * 0.24, 0.13, 0.22, 0.13, Math.PI / 2);
      addGeometry(unitStud, '#ff6a00', x, deck + 0.22, -l * 0.22, 0.14, 0.16, 0.14, Math.PI / 2);
    }
  } else if (spec.detail === 'ape') {
    // An Ape: one wheel at the front under a round nose with a single headlamp, a little cab, and an open bed
    // with wooden sides. Same three-wheel family as the trike.
    brick(0, deck + 0.3, l * 0.28, w * 0.66, 0.72, l * 0.3, spec.color);
    addGeometry(unitStud, spec.color, 0, deck + 0.2, l * 0.44, w * 0.5, w * 0.5, 0.26, Math.PI / 2);  // round nose
    brick(0, deck + 0.28, l * 0.46, 0.28, 0.24, 0.12, '#fff5bd', false);           // the one headlamp
    brick(0, deck + 0.78, l * 0.26, w * 0.62, 0.42, 0.1, '#8fb9d8', false);        // curved screen
    brick(0, deck + 1.02, l * 0.2, w * 0.66, 0.1, l * 0.24, spec.accent, false);   // cab roof
    brick(0, deck + 0.62, l * 0.34, w * 0.5, 0.07, 0.07, DARK, false);             // handlebars
    driver(l * 0.14, deck + 0.44, spec.accent);
    brick(0, deck + 0.08, -l * 0.22, w * 0.86, 0.14, l * 0.46, '#a97f52', false);  // the bed floor
    for (const x of [-w * 0.42, w * 0.42]) brick(x, deck + 0.3, -l * 0.22, 0.09, 0.42, l * 0.46, '#a97f52', false);
    brick(0, deck + 0.3, -l * 0.44, w * 0.86, 0.42, 0.09, '#a97f52', false);       // tailgate
    for (let i = 0; i < 3; i += 1) brick(-w * 0.2 + i * w * 0.2, deck + 0.34, -l * 0.22, w * 0.16, 0.36, 0.5, pick(i + 1), true);
  } else if (spec.detail === 'harvester') {
    // Photo mietitrebbia-gialla: a combine. What makes one readable at a glance is that the front is much wider than the tail —
    // the header sticks out past the wheels on both sides — so the body itself tapers as well, and the cutter bar
    // with its turning reel hangs out in front of everything. Big drive wheels ahead, little steering ones behind.
    const steel = '#8e949c', reel = '#5c6167';
    brick(0, deck + 0.34, l * 0.06, w * 0.92, 0.86, l * 0.42, spec.color);           // the wide front body
    brick(0, deck + 0.3, -l * 0.3, w * 0.58, 0.72, l * 0.3, spec.color, true);       // the narrow tail
    for (const x of [-w * 0.24, w * 0.24]) brick(x, deck * 0.5, -l * 0.36, 0.2, deck, 0.24, DARK, false);
    brick(0, deck + 0.2, l * 0.38, w * 0.7, 0.36, l * 0.18, spec.color, false);      // feeder throat
    brick(0, deck * 0.42, l * 0.52, w * 1.22, 0.36, 0.42, spec.accent, false);       // the cutter bar, wider than the machine
    for (let i = 0; i < 11; i += 1) addGeometry(unitBox, steel, -w * 0.54 + i * w * 0.108, deck * 0.42 - 0.2, l * 0.56, 0.06, 0.2, 0.2, 0.5);
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2;
      addGeometry(unitBox, reel, 0, deck * 0.42 + 0.5 + Math.sin(angle) * 0.3, l * 0.5 + Math.cos(angle) * 0.3, w * 1.08, 0.07, 0.07);
    }
    // Glass cab, off to one side. Built out of the windscreen material so the driver inside it can be seen.
    addGeometry(unitBox, '#9fe8ec', w * 0.3, deck + 1.0, l * 0.12, w * 0.44, 0.66, l * 0.24, 0, 0, 0, true);
    driver(l * 0.12, deck + 0.94);
    brick(w * 0.3, deck + 1.38, l * 0.12, w * 0.5, 0.1, l * 0.28, spec.accent, false);
    brick(-w * 0.12, deck + 0.9, -l * 0.26, w * 0.5, 0.34, l * 0.26, spec.accent, true);   // grain tank
    addGeometry(unitBox, steel, -w * 0.52, deck + 1.06, -l * 0.22, 1.1, 0.16, 0.16, 0, 0, 0.5);  // unloading auger
    addGeometry(unitStud, DARK, w * 0.2, deck + 1.1, l * 0.3, 0.1, 0.5, 0.1);               // exhaust stack
  } else if (spec.detail === 'military') {
    // Photo ali-di-fuoco: a boxy truck in army colours with one white fin standing up behind the cab, and the red wing
    // bolted across the top of it. One fin, not two struts: that single blade is what the build is recognised by.
    const canvas = palette[1] || '#3f4a33', white = '#eaece2';
    brick(0, hoodY, l * 0.3, w * 0.9, 0.34, l * 0.34, spec.color);                    // flat bonnet
    for (const x of [-w * 0.46, w * 0.46]) brick(x, hoodY + 0.06, l * 0.08, 0.08, 0.3, l * 0.5, DARK, false);
    cockpit(l * 0.06, 0.76, true, true);
    driver(-l * 0.06, hoodY + 0.2);
    brick(0, hoodY + 0.26, -l * 0.28, w * 0.86, 0.66, l * 0.38, canvas, true);        // the canvas-covered bed
    for (let i = 0; i < 4; i += 1) brick(0, hoodY + 0.62, -l * 0.42 + i * l * 0.1, w * 0.88, 0.09, 0.07, white, false);   // its hoops
    brick(0, hoodY + 0.9, -l * 0.34, 0.16, 0.9, l * 0.3, white, false);               // the single fin
    brick(0, hoodY + 1.38, -l * 0.34, w * 1.04, 0.14, 0.44, spec.color, true);        // the red wing on top of it
    for (const x of [-w * 0.5, w * 0.5]) brick(x, hoodY + 1.3, -l * 0.34, 0.07, 0.3, 0.46, spec.color, false);
    brick(0, baseY + 0.06, l * 0.48, w * 0.96, 0.22, 0.14, canvas, false);            // bumper
  } else if (spec.detail === 'chopper') {
    // Half cruiser, half dragster: a raked fork way out front, a low stretched tank, an engine on show and one fat
    // slick at the back. The narrow chassis of `moto` would look wrong here — this one is long, not tall.
    const chrome = '#c9cdd1';
    brick(0, deck + 0.04, -l * 0.08, 0.36, 0.3, l * 0.4, DARK, false);               // spine
    for (const x of [-0.2, 0.2]) for (let i = 0; i < 3; i += 1) {                    // the finned engine
      brick(x, deck + 0.24 + i * 0.12, -l * 0.02, 0.22, 0.08, 0.34, chrome, false);
    }
    brick(0, deck + 0.4, l * 0.14, 0.44, 0.3, l * 0.24, spec.color, false);          // teardrop tank
    brick(0, deck + 0.24, -l * 0.22, 0.44, 0.14, l * 0.2, DARK, false);              // low saddle
    brick(0, deck + 0.5, -l * 0.34, 0.4, 0.4, 0.12, spec.color, false);              // sissy bar back rest
    for (const x of [-0.18, 0.18]) addGeometry(unitBox, chrome, x, deck + 0.34, l * 0.34, 0.09, l * 0.5, 0.09, 0.44);  // the raked fork
    brick(0, deck + 0.64, l * 0.26, w * 0.76, 0.07, 0.07, chrome, false);            // ape hangers
    for (const x of [-w * 0.35, w * 0.35]) brick(x, deck + 0.68, l * 0.26, 0.09, 0.16, 0.14, spec.accent, false);
    brick(0, deck + 0.46, l * 0.42, 0.28, 0.24, 0.12, '#fff5bd', false);             // headlamp
    for (const x of [-0.26, 0.26]) brick(x, deck + 0.02, -l * 0.26, 0.11, 0.11, l * 0.34, chrome, false);  // straight pipes
    driver(-l * 0.2, deck + 0.42, spec.color, spec.accent);
  } else if (spec.detail === 'hatch') {
    // An eighties rally three-door: square everything, boxed arches over all four corners, a bonnet full of lamps,
    // a roof that runs flat to the tailgate and the wing on top of it. Shape comes from the arches — without them
    // a hatchback is just a brick.
    const trim = palette[3] || DARK;
    brick(0, hoodY, l * 0.3, w * 0.9, 0.3, l * 0.3, spec.color);                     // bonnet
    brick(0, hoodY + 0.02, -l * 0.06, w * 0.94, 0.42, l * 0.44, spec.color, false);  // body sides
    for (const x of [-w * 0.48, w * 0.48]) for (const z of [axleZ, -axleZ]) {        // boxed wheel arches
      brick(x, hoodY + 0.04, z, 0.12, 0.46, 1.05, trim, false);
    }
    cockpit(-l * 0.02, 0.62, true);
    brick(0, hoodY + 0.34, -l * 0.34, w * 0.88, 0.5, l * 0.2, spec.color, false);    // squared-off tail
    brick(0, hoodY + 0.62, -l * 0.36, w * 0.9, 0.12, 0.34, spec.accent, true);       // tailgate wing
    for (const x of [-w * 0.42, w * 0.42]) brick(x, hoodY + 0.72, -l * 0.36, 0.08, 0.2, 0.36, spec.accent, false);
    for (const x of [-w * 0.3, -w * 0.1, w * 0.1, w * 0.3]) {                        // the bank of rally lamps
      brick(x, hoodY + 0.24, l * 0.42, 0.22, 0.2, 0.1, '#fff5bd', false);
    }
    brick(0, baseY + 0.04, l * 0.48, w * 0.94, 0.2, 0.14, trim, false);
  } else if (spec.detail === 'snowcat') {
    // A piston bully: two wide tracks instead of wheels, a glass cab up top, the blade out in front and the tiller
    // slung behind. The little wheels the layout gives it live inside the track housings and never show.
    const steel = '#8e949c', rubber = '#2b2f36';
    for (const x of [-w * 0.42, w * 0.42]) {
      brick(x, deck * 0.52, 0, w * 0.3, deck * 0.9, l * 0.86, rubber, false);        // the track belt
      for (let i = 0; i < 9; i += 1) brick(x, deck * 0.52, -l * 0.4 + i * l * 0.1, w * 0.34, 0.1, 0.09, steel, false);
      // The sprockets at each end of the belt: their radius is the belt's own half-height, or the wheel dips
      // below the road and the car reads as sunk into it.
      for (const z of [l * 0.36, -l * 0.36]) addGeometry(unitStud, steel, x, deck * 0.52, z, deck * 0.44, w * 0.22, deck * 0.44, 0, 0, Math.PI / 2);
    }
    brick(0, deck + 0.24, -l * 0.04, w * 0.72, 0.46, l * 0.56, spec.color);          // hull
    addGeometry(unitBox, '#9fe8ec', 0, deck + 0.78, l * 0.08, w * 0.62, 0.62, l * 0.3, 0, 0, 0, true);   // glass cab
    driver(l * 0.06, deck + 0.7);
    brick(0, deck + 1.14, l * 0.08, w * 0.68, 0.12, l * 0.34, spec.accent, true);    // cab roof
    for (const x of [-w * 0.2, w * 0.2]) brick(x, deck + 1.24, l * 0.16, 0.24, 0.14, 0.12, '#fff5bd', false);
    for (const x of [-w * 0.34, 0, w * 0.34]) brick(x, deck + 0.34, l * 0.44, 0.16, 0.24, l * 0.14, steel, false);   // blade arms
    brick(0, deck * 0.42, l * 0.56, w * 1.2, 0.5, 0.2, spec.accent, false);          // the blade
    brick(0, deck * 0.2, l * 0.58, w * 1.2, 0.2, 0.26, steel, false);
    brick(0, deck + 0.2, -l * 0.44, w * 0.94, 0.34, 0.3, spec.accent, false);        // the tiller behind
  } else if (spec.detail === 'rex') {
    // A tyrannosaur on four wheels. The first version read as a green wedge from the driving seat, so everything
    // that says "dinosaur" is now exaggerated: the head rides high on a neck with clear sky under it, the jaws are
    // open with teeth top and bottom, and the tail lifts well above the body instead of trailing along it.
    const teeth = '#f9f3de', claw = '#e8e0c8', mouth = '#8c3a3a';
    brick(0, deck + 0.3, -l * 0.04, w * 0.72, 0.54, l * 0.56, spec.color);               // the body
    for (const x of [-w * 0.36, w * 0.36]) brick(x, deck + 0.28, -l * 0.04, 0.12, 0.44, l * 0.5, spec.accent, false);  // flanks
    // Neck: two blocks climbing forward, thin enough that you see daylight under the head.
    brick(0, deck + 0.78, l * 0.16, w * 0.3, 0.46, l * 0.14, spec.color, false);
    brick(0, deck + 1.06, l * 0.28, w * 0.27, 0.38, l * 0.13, spec.color, false);
    // The head: skull on top, jaw below, a dark mouth between them and teeth in both.
    brick(0, deck + 1.42, l * 0.42, w * 0.46, 0.34, l * 0.3, spec.color, false);
    brick(0, deck + 1.2, l * 0.44, w * 0.4, 0.1, l * 0.28, mouth, false);
    brick(0, deck + 1.06, l * 0.43, w * 0.42, 0.22, l * 0.26, spec.color, false);
    for (let i = 0; i < 5; i += 1) {
      const z = l * 0.32 + i * l * 0.05;
      for (const x of [-w * 0.14, w * 0.14]) {
        brick(x, deck + 1.2, z, 0.07, 0.11, 0.06, teeth, false);
        brick(x, deck + 1.13, z, 0.07, 0.1, 0.06, teeth, false);
      }
    }
    for (const x of [-w * 0.23, w * 0.23]) {
      addGeometry(unitStud, '#ffd45a', x, deck + 1.5, l * 0.44, 0.09, 0.05, 0.09, 0, 0, Math.PI / 2);
      brick(x * 0.9, deck + 1.62, l * 0.38, 0.12, 0.12, 0.16, spec.accent, false);        // brow
    }
    // The little arms, held up in front the way everyone draws them.
    for (const x of [-w * 0.32, w * 0.32]) {
      brick(x, deck + 0.68, l * 0.16, 0.12, 0.26, 0.12, spec.color, false);
      brick(x, deck + 0.56, l * 0.24, 0.1, 0.1, 0.2, claw, false);
    }
    // The row of spines, tall enough to be a silhouette and not a texture.
    for (let i = 0; i < 6; i += 1) {
      const z = l * 0.08 - i * l * 0.085;
      const tall = 0.34 - Math.abs(i - 2) * 0.05;
      brick(0, deck + 0.57 + tall / 2 + i * 0.03, z, 0.13, tall, 0.11, spec.accent, false);
    }
    // The tail: it climbs behind the car and ends up where a spoiler would be.
    for (let i = 0; i < 4; i += 1) {
      brick(0, deck + 0.4 + i * 0.16, -l * 0.3 - i * l * 0.09, w * (0.42 - i * 0.08), 0.28 - i * 0.04, l * 0.13, spec.color, false);
    }
    brick(0, deck + 0.98, -l * 0.6, 0.12, 0.2, l * 0.1, spec.accent, false);
    driver(-l * 0.06, deck + 0.68, '#2b2f36', spec.accent);
  } else if (spec.detail === 'stego') {
    // A stegosaurus: a low wide body, the double row of plates along its back, a small head down at the front and
    // the spiked tail out behind. The plates are what make it read from a moving car, so they are big.
    const bone = '#f2e4c4';
    brick(0, deck + 0.3, 0, w * 0.8, 0.54, l * 0.66, spec.color);
    brick(0, deck + 0.62, -l * 0.02, w * 0.56, 0.2, l * 0.5, spec.color, false);
    // Head and neck, dipping toward the road the way a grazing animal's does.
    brick(0, deck + 0.42, l * 0.34, w * 0.34, 0.3, l * 0.2, spec.color, false);
    brick(0, deck + 0.3, l * 0.46, w * 0.3, 0.24, l * 0.14, spec.color, false);
    for (const x of [-w * 0.1, w * 0.1]) addGeometry(unitStud, '#2b2f36', x, deck + 0.4, l * 0.5, 0.06, 0.05, 0.06, Math.PI / 2);
    brick(0, deck + 0.2, l * 0.5, w * 0.26, 0.1, l * 0.1, bone, false);
    // The plates: two staggered rows, biggest over the hips.
    for (let i = 0; i < 5; i += 1) {
      const z = l * 0.22 - i * l * 0.11;
      const tall = 0.3 + Math.sin((i + 0.5) / 5 * Math.PI) * 0.34;
      for (const x of [-w * 0.13, w * 0.13]) {
        const at = z + (x > 0 ? l * 0.05 : 0);
        brick(x, deck + 0.72 + tall * 0.3, at, 0.1, tall * 0.6, l * 0.1, spec.accent, false);
        brick(x, deck + 0.72 + tall * 0.78, at, 0.1, tall * 0.4, l * 0.055, spec.accent, false);
      }
    }
    // Tail with the four spikes at the end.
    for (let i = 0; i < 3; i += 1) brick(0, deck + 0.34 - i * 0.02, -l * 0.34 - i * l * 0.1, w * (0.4 - i * 0.09), 0.3 - i * 0.04, l * 0.14, spec.color, false);
    for (const x of [-0.14, 0.14]) for (const z of [-l * 0.52, -l * 0.58]) {
      addGeometry(unitStud, bone, x, deck + 0.34, z, 0.06, 0.22, 0.06, 0, 0, x > 0 ? -0.6 : 0.6);
    }
    driver(-l * 0.02, deck + 0.78, '#2b2f36', spec.accent);
  } else if (spec.detail === 'tank') {
    // A toy tank: two tracks, a sloped hull, a turret with a long gun and a commander looking out of the hatch.
    // The gun points forward over the nose, which is what a four-year-old draws when you say "carrarmato".
    const steel = '#8e949c', rubber = '#2b2f36';
    for (const x of [-w * 0.42, w * 0.42]) {
      brick(x, deck * 0.52, 0, w * 0.28, deck * 0.95, l * 0.9, rubber, false);
      for (let i = 0; i < 11; i += 1) brick(x, deck * 0.52, -l * 0.42 + i * l * 0.084, w * 0.32, 0.1, 0.08, steel, false);
      for (const z of [l * 0.38, -l * 0.38]) addGeometry(unitStud, steel, x, deck * 0.52, z, deck * 0.46, w * 0.2, deck * 0.46, 0, 0, Math.PI / 2);
      brick(x, deck + 0.14, 0, w * 0.34, 0.12, l * 0.94, spec.accent, false);            // the track guards
    }
    brick(0, deck + 0.26, -l * 0.02, w * 0.74, 0.44, l * 0.8, spec.color);               // hull
    brick(0, deck + 0.52, l * 0.3, w * 0.7, 0.24, l * 0.2, spec.color, false);           // sloped glacis
    // The turret and its gun.
    brick(0, deck + 0.74, -l * 0.06, w * 0.56, 0.42, l * 0.34, spec.color);
    brick(0, deck + 0.96, -l * 0.06, w * 0.4, 0.1, l * 0.24, spec.accent, false);        // hatch ring
    addGeometry(unitStud, steel, 0, deck + 0.78, l * 0.3, 0.09, l * 0.5, 0.09, Math.PI / 2);   // the gun
    addGeometry(unitStud, spec.accent, 0, deck + 0.78, l * 0.52, 0.12, 0.14, 0.12, Math.PI / 2);
    driver(-l * 0.06, deck + 0.9, '#3f4a33', spec.accent);
    for (const x of [-w * 0.3, w * 0.3]) brick(x, deck + 0.5, l * 0.42, 0.16, 0.14, 0.1, '#fff5bd', false);
    brick(w * 0.3, deck + 0.56, -l * 0.3, 0.3, 0.2, 0.44, steel, false);                 // stowage box
  } else if (spec.detail === 'rig') {
    // A cab-over tractor unit: flat front, chrome grille, twin stacks, mud flaps and the fifth-wheel plate the
    // trailer pivots on. The trailer itself is built below, on the hitch.
    const chrome = '#c9cdd1';
    brick(0, deck + 0.52, l * 0.24, w * 0.92, 1.24, l * 0.34, spec.color);
    brick(0, deck + 0.9, l * 0.4, w * 0.8, 0.44, 0.1, '#8fb9d8', false);
    brick(0, deck + 0.18, l * 0.41, w * 0.84, 0.36, 0.12, chrome, false);
    for (const x of [-w * 0.3, w * 0.3]) brick(x, deck + 0.42, l * 0.42, 0.22, 0.18, 0.08, '#fff5bd', false);
    for (const x of [-w * 0.44, w * 0.44]) addGeometry(unitStud, chrome, x, deck + 1.1, l * 0.12, 0.1, 1, 0.1);
    brick(0, deck + 0.2, -l * 0.2, w * 0.86, 0.3, l * 0.4, DARK, false);
    brick(0, deck + 0.4, -l * 0.26, w * 0.66, 0.12, w * 0.6, chrome, true);         // fifth wheel
    for (const x of [-w * 0.44, w * 0.44]) brick(x, deck - 0.06, -l * 0.42, 0.08, 0.34, 0.24, DARK, false);
  } else if (spec.detail === 'prop') {
    // Photo aereo-bianco: a little twin-engined aeroplane, white and grey, swept wings with ribbed propeller nacelles,
    // a glass canopy and a translucent star at the nose.
    const white = '#eef0ea', grey = '#9aa3ab';
    brick(0, deck + 0.3, 0, w * 0.5, 0.52, l * 0.8, white);
    driver(l * 0.02, deck + 0.32);
    addGeometry(unitBox, '#9fe8ec', 0, deck + 0.66, l * 0.02, w * 0.42, 0.46, l * 0.3, 0, 0, 0, true);   // glass canopy
    brick(0, deck + 0.8, -l * 0.3, w * 0.24, 0.3, l * 0.2, white, false);           // tail fin
    brick(0, deck + 0.9, -l * 0.32, w * 0.7, 0.1, 0.3, grey, false);                // tailplane
    for (const sx of [-1, 1]) {
      // The wings stay inside the 3 m the race allows a car to be wide: this is a toy plane, not a wingspan.
      addGeometry(unitBox, grey, sx * w * 0.42, deck + 0.34, -l * 0.02, w * 0.7, 0.12, l * 0.3, 0, sx * 0.22, 0);
      addGeometry(unitStud, white, sx * w * 0.6, deck + 0.34, l * 0.12, 0.3, 0.7, 0.3, Math.PI / 2);
      for (let i = 0; i < 5; i += 1) addGeometry(unitBox, grey, sx * w * 0.6, deck + 0.34, l * 0.12 + 0.2 - i * 0.1, 0.34, 0.34, 0.03);
    }
    brick(0, deck + 0.34, l * 0.46, 0.24, 0.24, 0.2, spec.accent, false);
    for (let i = 0; i < 5; i += 1) addGeometry(unitBox, spec.accent, 0, deck + 0.34, l * 0.52, 0.12, 0.7, 0.08, 0, 0, (i / 5) * Math.PI);
  } else if (spec.detail === 'police') {
    // Photo pattuglia-volante: a low racer on cross tyres. White rounded nose, smoked screen, a black studded roof,
    // teal-and-grey flanks in layers, and the blue POLICE wing up on two red struts with the exhausts beneath it.
    const white = '#f2f2ee', black = '#1b1d22', grey = '#6b7078', light = '#b9bec4', red = '#d8262c', teal = spec.color;
    brick(0, hoodY - 0.04, l * 0.34, w * 0.84, 0.34, l * 0.22, white, false);
    addGeometry(unitStud, white, 0, hoodY + 0.12, l * 0.36, 0.2, w * 0.84, l * 0.11, 0, 0, Math.PI / 2);   // rounded nose
    brick(0, hoodY + 0.02, -l * 0.04, w * 0.86, 0.4, l * 0.5, grey, false);
    for (const sx of [-1, 1]) {                                                       // the layered flanks
      brick(sx * w * 0.44, hoodY - 0.1, -l * 0.04, 0.06, 0.14, l * 0.5, teal, false);
      brick(sx * w * 0.44, hoodY + 0.06, -l * 0.08, 0.06, 0.14, l * 0.36, light, false);
      brick(sx * w * 0.44, hoodY + 0.2, -l * 0.2, 0.06, 0.14, l * 0.14, red, false);
      brick(sx * w * 0.36, hoodY + 0.48, -l * 0.02, 0.08, 0.56, l * 0.24, grey, false);   // roof pillars
    }
    addGeometry(unitBox, '#3a3d44', 0, hoodY + 0.44, l * 0.17, w * 0.7, 0.5, 0.08, -0.7, 0, 0, true);   // smoked screen
    driver(l * 0.02, hoodY + 0.2);
    brick(0, hoodY + 0.8, -l * 0.02, w * 0.76, 0.16, l * 0.28, black, true);         // the studded black roof
    brick(0, hoodY + 0.2, -l * 0.3, w * 0.8, 0.46, l * 0.2, teal, false);
    addGeometry(unitBox, teal, 0, hoodY + 0.52, -l * 0.27, w * 0.72, 0.14, l * 0.24, 0.3);   // tail sloping up to the wing
    for (const x of [-0.14, 0.14]) addGeometry(unitStud, light, x, hoodY + 0.38, -l * 0.44, 0.07, 0.44, 0.07, Math.PI / 2);   // exhausts
    for (const x of [-w * 0.18, w * 0.18]) brick(x, hoodY + 0.78, -l * 0.42, 0.14, 0.72, 0.18, red, false);   // wing struts
    brick(0, hoodY + 1.18, -l * 0.43, w * 1.02, 0.1, 0.52, spec.accent, false);
    // POLICE, as six white plates: at race distance the row of letters is what reads, not the letters themselves.
    for (let i = 0; i < 6; i += 1) brick(-w * 0.4 + i * w * 0.16, hoodY + 1.245, -l * 0.43, w * 0.1, 0.03, 0.28, white, false);
  } else if (spec.detail === 'forklift') {
    // Photo muletto-furioso: a green forklift dragster. Two long black forks run out well past the front wheels, a
    // clear-yellow block on the carriage, a blue screen, a black claw arching over the seat and a yellow tipper behind.
    const black = '#15161c', grey = '#9aa3ab', yellow = spec.accent;
    for (const x of [-w * 0.45, w * 0.45]) {                                          // technic beams, with their holes
      brick(x, baseY, -l * 0.04, 0.1, 0.24, l * 0.8, black, false);
      for (let i = 0; i < 6; i += 1) addGeometry(unitStud, '#3a3d44', x * 1.03, baseY, -l * 0.34 + i * l * 0.12, 0.06, 0.03, 0.06, 0, 0, Math.PI / 2);
    }
    for (const x of [-w * 0.22, w * 0.22]) {                                          // the forks
      brick(x, deck + 0.02, l * 0.5 + 0.4, 0.22, 0.1, 1.3, black, false);
      addGeometry(unitBox, black, x, deck + 0.02, l * 0.5 + 1.08, 0.22, 0.1, 0.2, 0.35);
    }
    brick(0, hoodY + 0.02, l * 0.44, w * 0.7, 0.4, 0.3, black, true);                // the carriage
    addGeometry(unitBox, yellow, 0, hoodY + 0.34, l * 0.44, 0.42, 0.26, 0.3, 0, 0, 0, true);
    for (const x of [-w * 0.37, w * 0.37]) addGeometry(unitStud, '#1f5fd0', x, hoodY, l * 0.44, 0.05, 0.14, 0.05, 0, 0, Math.PI / 2);
    addGeometry(unitBox, spec.palette[3], 0, hoodY + 0.4, l * 0.2, w * 0.66, 0.7, 0.07, -0.5, 0, 0, true);   // the screen
    for (const x of [-w * 0.33, w * 0.33]) addGeometry(unitBox, spec.palette[3], x, hoodY + 0.3, l * 0.1, 0.05, 0.5, l * 0.18, 0, 0, 0, true);
    driver(l * 0.02, hoodY + 0.14);
    brick(0, hoodY + 0.36, -l * 0.14, w * 0.4, 0.74, 0.28, black, false);           // the tower behind the seat
    brick(0, hoodY + 0.84, -l * 0.14, w * 0.4, 0.22, 0.34, grey, true);
    // The claw: one black curve from the top of the tower sweeping back and down into the tipper, as a chain of
    // overlapping segments laid along a quarter circle. Fewer, sparser blocks read as debris rather than one piece.
    for (let i = 0; i < 8; i += 1) {
      const a = ((i + 0.5) / 8) * Math.PI / 2;
      addGeometry(unitBox, black, 0, hoodY + 0.3 + 0.7 * Math.cos(a), -l * 0.14 - 0.7 * Math.sin(a), w * 0.3, 0.16, 0.2, -a);
    }
    brick(0, hoodY + 0.04, -l * 0.36, w * 0.82, 0.12, l * 0.22, yellow, false);      // the tipper
    for (const x of [-w * 0.41, w * 0.41]) brick(x, hoodY + 0.28, -l * 0.36, 0.08, 0.4, l * 0.22, yellow, false);
    addGeometry(unitBox, yellow, 0, hoodY + 0.32, -l * 0.48, w * 0.82, 0.5, 0.08, -0.5);
  } else if (spec.detail === 'beacons') {
    // Photo luci-pazze: a stubby car on a lime chassis plate, white nose with a grey grille, a dark red bonnet that
    // curves up to the roofline, grey back, and a crowd of transparent round studs on top in every colour there is.
    // The roof stays low on purpose: the first version had a glass cab with a roof over it, and that hid the lights.
    const darkRed = spec.color, grey = '#b9bec4', white = '#f2f0ea', lime = spec.accent;
    const top = hoodY + 0.34;
    brick(0, baseY - 0.02, 0, w * 0.92, 0.1, l * 0.92, lime, false);
    brick(0, hoodY - 0.06, l * 0.4, w * 0.82, 0.4, l * 0.16, white, true);
    brick(0, hoodY - 0.06, l * 0.49, w * 0.86, 0.42, 0.08, grey, false);               // grille
    for (let i = 0; i < 3; i += 1) brick(0, hoodY - 0.18 + i * 0.12, l * 0.51, w * 0.7, 0.04, 0.04, DARK, false);
    brick(0, hoodY + 0.02, l * 0.2, w * 0.84, 0.3, l * 0.24, darkRed, false);         // bonnet
    addGeometry(unitStud, darkRed, 0, hoodY + 0.16, l * 0.2, 0.18, w * 0.84, l * 0.12, 0, 0, Math.PI / 2);   // its curve
    for (const sx of [-1, 1]) {                                                       // the blue-and-red side tiles
      brick(sx * w * 0.425, hoodY + 0.12, l * 0.16, 0.04, 0.1, 0.3, '#1f5fd0', false);
      brick(sx * w * 0.425, hoodY + 0.02, l * 0.16, 0.04, 0.1, 0.3, '#c8102e', false);
    }
    addGeometry(unitBox, '#9fe8ec', 0, top + 0.12, l * 0.08, w * 0.6, 0.26, 0.06, -0.4, 0, 0, true);   // little screen
    brick(0, hoodY + 0.06, -l * 0.1, w * 0.84, 0.56, l * 0.36, grey, false);
    driver(-l * 0.02, top - 0.12);
    brick(0, hoodY + 0.06, -l * 0.43, w * 0.84, 0.56, l * 0.12, '#c8102e', false);
    brick(0, hoodY + 0.02, -l * 0.5, w * 0.6, 0.36, 0.06, grey, false);
    // The beacons, behind the driver. Glass, so they glow with whatever is behind them, at different heights like a
    // handful dropped on top — and big, because from the chase camera they are all you see of this car.
    const beacons = [[-0.3, -0.16, '#ffd400', 0.3], [0.3, -0.16, '#e5203a', 0.2], [-0.04, -0.26, '#c8102e', 0.26],
      [-0.32, -0.36, '#c8102e', 0.18], [0.3, -0.34, '#3ec7f0', 0.24], [0.02, -0.44, '#ff7a1a', 0.32]];
    for (const [fx, fz, colour, h] of beacons) {
      addGeometry(unitStud, colour, fx * w, top + h / 2, fz * l, 0.22, h, 0.22, 0, 0, 0, true);
      addGeometry(unitStud, colour, fx * w, top + h + 0.03, fz * l, 0.12, 0.06, 0.12, 0, 0, 0, true);
    }
  } else if (spec.detail === 'gyro') {
    // Photo girocottero: a trike that wants to be a helicopter. One wheel out front on a grey leg, a long tan and grey
    // body with a yellow flash, a curved red seat, the grey cabin behind it and a four-bladed rotor on a mast.
    const tan = palette[1], red = palette[2], yellow = palette[3], dark = '#6b7078', light = spec.color;
    for (const x of [-0.13, 0.13]) addGeometry(unitBox, '#c9cdd1', x, (0.34 + hoodY) / 2, l * 0.54, 0.07, hoodY - 0.3, 0.12, 0.3);   // the nose leg
    brick(0, hoodY - 0.12, l * 0.12, w * 0.66, 0.2, l * 0.7, tan, false);
    brick(0, hoodY + 0.06, l * 0.12, w * 0.7, 0.16, l * 0.68, dark, false);
    for (const sx of [-1, 1]) brick(sx * w * 0.34, hoodY - 0.12, l * 0.06, 0.05, 0.2, l * 0.22, yellow, false);
    for (const x of [-0.18, 0.18]) addGeometry(unitStud, tan, x, hoodY, l * 0.47, 0.09, 0.14, 0.09, Math.PI / 2);   // nose studs
    brick(w * 0.18, hoodY + 0.2, l * 0.36, 0.36, 0.12, 0.36, dark, true);
    addGeometry(unitStud, red, 0, hoodY + 0.26, l * 0.2, 0.16, w * 0.5, l * 0.12, 0, 0, Math.PI / 2);   // the curved cowl
    brick(0, hoodY + 0.24, l * 0.02, w * 0.5, 0.2, l * 0.2, red, false);            // the seat
    driver(-l * 0.0, hoodY + 0.42);
    brick(0, hoodY + 0.06, -l * 0.2, w * 0.98, 0.1, l * 0.18, light, true);         // the studded side plates
    brick(0, hoodY + 0.42, -l * 0.28, w * 0.66, 0.66, l * 0.24, light, true);       // the cabin
    addGeometry(unitStud, tan, 0, hoodY + 0.38, -l * 0.4, w * 0.32, 0.58, 0.16);
    addGeometry(unitStud, light, 0, hoodY + 1.0, -l * 0.28, 0.08, 0.5, 0.08);        // the mast
    // The rotor is a mesh of its own, not part of the merged body, so the renderer can turn it (`spinners`).
    const rotor = new THREE.Group();
    rotor.position.set(0, hoodY + 1.28, -l * 0.28);
    const blades = [];
    for (const angle of [Math.PI / 4, -Math.PI / 4]) {
      const blade = unitBox.clone().scale(2.4, 0.07, 0.28);
      blades.push(blade.rotateY(angle));
      for (const along of [-1, -0.62, -0.26, 0.26, 0.62, 1]) {
        blades.push(unitStud.clone().scale(0.09, 0.06, 0.09).translate(along, 0.065, 0).rotateY(angle));
      }
    }
    blades.push(unitStud.clone().scale(0.14, 0.12, 0.14));
    rotor.add(new THREE.Mesh(mergeGeometries(blades, false), material(light)[1]));
    for (const blade of blades) blade.dispose();
    rotor.children[0].castShadow = true;
    body.add(rotor);
    spinners.push(rotor);
  } else if (spec.detail === 'rod') {
    // Photo mordi-asfalto: the tyres ARE the car. A thin technic beam runs low between four enormous knobbly balloons;
    // on it sits a small block body — green bonnet, a clear block with white teeth on top, tan, sand-green and azure
    // tiles — and a big grey engine cowl at the back. Everything stays inside the tyres' inner edge.
    const black = '#15161c', grey = spec.palette[1], tan = spec.accent, blue = spec.palette[3];
    for (const x of [-w * 0.21, w * 0.21]) {
      brick(x, deck + 0.02, 0, 0.12, 0.22, l * 0.92, black, false);
      for (let i = 0; i < 8; i += 1) addGeometry(unitStud, '#2f6fd6', x * 1.08, deck + 0.02, -l * 0.4 + i * l * 0.115, 0.05, 0.03, 0.05, 0, 0, Math.PI / 2);
    }
    brick(0, deck + 0.16, l * 0.04, w * 0.46, 0.08, l * 0.74, blue, false);
    brick(0, hoodY - 0.16, l * 0.3, w * 0.38, 0.34, l * 0.18, '#c9cdd1', false);
    brick(0, hoodY + 0.06, l * 0.3, w * 0.4, 0.1, l * 0.2, spec.color, false);       // the green bonnet
    brick(0, hoodY - 0.1, l * 0.41, w * 0.42, 0.42, 0.08, grey, false);
    for (const x of [-w * 0.18, w * 0.18]) addGeometry(unitBox, '#ffd84a', x, hoodY - 0.08, l * 0.43, 0.16, 0.2, 0.08, 0, 0, 0, true);
    addGeometry(unitBox, '#e8f0f4', 0, hoodY - 0.02, l * 0.13, w * 0.36, 0.46, l * 0.12, 0, 0, 0, true);   // the clear block
    brick(0, hoodY + 0.26, l * 0.13, w * 0.32, 0.1, l * 0.14, WHITE, true);
    // The teeth, pointing forward off the white plate: the reason this one bites the tarmac.
    const fang = new THREE.ConeGeometry(1, 1, 8);
    for (const x of [-w * 0.12, 0, w * 0.12]) addGeometry(fang, WHITE, x, hoodY + 0.26, l * 0.22, 0.07, 0.26, 0.07, Math.PI / 2);
    fang.dispose();
    brick(0, hoodY - 0.2, -l * 0.02, w * 0.4, 0.3, l * 0.2, '#f5c518', false);
    brick(0, hoodY + 0.08, -l * 0.0, w * 0.4, 0.34, l * 0.1, tan, false);
    brick(0, hoodY + 0.28, -l * 0.0, w * 0.4, 0.06, l * 0.1, '#7fae8a', false);
    brick(0, hoodY + 0.06, -l * 0.08, w * 0.4, 0.5, 0.12, '#3ec1e6', false);
    driver(-l * 0.16, hoodY - 0.06);
    brick(0, hoodY + 0.2, -l * 0.33, w * 0.5, 0.86, l * 0.2, grey, false);           // the engine cowl
    addGeometry(unitBox, grey, 0, hoodY + 0.5, -l * 0.23, w * 0.5, 0.3, 0.3, -0.7);
    for (const x of [-0.14, 0.14]) addGeometry(unitStud, black, x, hoodY + 0.5, -l * 0.43, 0.09, 0.06, 0.09, Math.PI / 2);
  } else if (spec.detail === 'six') {
    // Photo caos-sei-ruote: a six-wheeler built out of whatever was in the box. Huge knobbly tyres with three different
    // hubs, a patchwork bonnet, technic beams down the sides, a glass cab under a big grey studded roof with a little
    // passenger riding on top, a snorkel, and a flat rear deck striped in plates of every colour.
    const black = '#15161c', grey = '#b9bec4';
    patchwork(l * 0.34, hoodY + 0.02, l * 0.26, 0.42);
    for (const x of [-w * 0.44, w * 0.44]) {
      brick(x, hoodY - 0.24, -l * 0.02, 0.1, 0.34, l * 0.62, black, false);
      brick(x, hoodY - 0.04, l * 0.04, 0.1, 0.12, l * 0.24, spec.color, false);
      for (let i = 0; i < 7; i += 1) addGeometry(unitStud, '#3a3d44', x * 1.03, hoodY - 0.24, -l * 0.26 + i * l * 0.08, 0.06, 0.03, 0.06, 0, 0, Math.PI / 2);
    }
    for (const x of [-w * 0.42, w * 0.42]) addGeometry(unitBox, '#ffd84a', x, hoodY - 0.1, l * 0.49, 0.2, 0.2, 0.08, 0, 0, 0, true);
    addGeometry(unitBox, '#c9d6dc', 0, hoodY + 0.48, l * 0.15, w * 0.72, 0.72, 0.08, -0.2, 0, 0, true);   // the screen
    for (let row = 0; row < 2; row += 1) for (let i = 0; i < 4; i += 1) {             // cab walls in patchwork
      brick((i - 1.5) * w * 0.2, hoodY + 0.26 + row * 0.36, -l * 0.06, w * 0.2 - 0.012, 0.34, l * 0.18, palette[(i + row * 2) % palette.length], false);
    }
    for (const x of [-w * 0.36, w * 0.36]) addGeometry(unitBox, '#c9d6dc', x, hoodY + 0.48, l * 0.07, 0.05, 0.6, l * 0.12, 0, 0, 0, true);
    driver(l * 0.06, hoodY + 0.22);
    brick(0, hoodY + 0.9, l * 0.02, w * 0.84, 0.12, l * 0.4, grey, true);             // the studded roof
    brick(0, hoodY + 0.94, -l * 0.17, w * 0.86, 0.12, 0.12, spec.color, false);
    // The passenger on the roof: a yellow head and two black antennae.
    addGeometry(unitStud, '#f5c518', -w * 0.24, hoodY + 1.08, l * 0.16, 0.11, 0.18, 0.11);
    brick(-w * 0.1, hoodY + 1.04, l * 0.16, 0.36, 0.14, 0.24, '#3ec1e6', false);
    for (const x of [-w * 0.3, -w * 0.18]) addGeometry(unitStud, black, x, hoodY + 1.26, l * 0.16, 0.02, 0.3, 0.02, 0, 0, x < -w * 0.24 ? 0.4 : -0.4);
    // The snorkel, ribbed, up the front corner.
    addGeometry(unitStud, grey, w * 0.47, hoodY + 0.3, l * 0.27, 0.06, 1.0, 0.06);
    for (let i = 0; i < 8; i += 1) addGeometry(unitStud, grey, w * 0.47, hoodY - 0.08 + i * 0.1, l * 0.27, 0.085, 0.04, 0.085);
    addGeometry(unitStud, grey, w * 0.47, hoodY + 0.82, l * 0.3, 0.06, 0.2, 0.06, Math.PI / 2);
    brick(0, hoodY + 0.0, -l * 0.3, w * 0.86, 0.14, l * 0.38, grey, true);            // the rear deck
    for (let i = 0; i < 4; i += 1) brick(-w * 0.3 + i * w * 0.2, hoodY + 0.1, -l * 0.3, w * 0.18, 0.07, l * 0.22, palette[(i + 1) % palette.length], true);
  } else if (spec.detail === 'pickup') {
    // Photo tubi-ruggenti: a very long pickup. Red nose with two clear-yellow lamps, an open cab behind a slanted
    // aqua screen, a white band, then a long blue bed with high sides — and the chrome exhausts hanging out sideways
    // from under the belly between the axles, which is what the builder is proudest of.
    const red = spec.color, blue = spec.accent, white = '#f2f0ea', black = '#15161c', chrome = '#c9cdd1';
    brick(0, baseY - 0.04, -l * 0.02, w * 0.84, 0.22, l * 0.92, black, false);       // the chassis
    brick(0, baseY + 0.12, l * 0.14, w * 0.88, 0.12, l * 0.3, '#e6d7b0', false);      // the tan strip
    brick(0, baseY - 0.16, l * 0.24, w * 0.56, 0.06, l * 0.2, '#2f9a55', false);
    brick(0, hoodY + 0.16, l * 0.37, w * 0.86, 0.6, l * 0.2, red, true);             // the nose
    brick(0, hoodY + 0.16, l * 0.24, w * 0.86, 0.6, l * 0.06, white, true);
    brick(0, hoodY + 0.02, l * 0.48, w * 0.5, 0.3, 0.1, '#8d9299', false);            // grille
    for (const x of [-w * 0.3, w * 0.3]) addGeometry(unitStud, '#f5e04a', x, hoodY + 0.02, l * 0.49, 0.12, 0.12, 0.12, Math.PI / 2, 0, 0, true);
    brick(0, hoodY + 0.02, l * 0.1, w * 0.86, 0.32, l * 0.22, red, false);            // the cab sides
    addGeometry(unitBox, '#7fd6e0', 0, hoodY + 0.48, l * 0.16, w * 0.72, 0.56, 0.08, -0.35, 0, 0, true);   // screen
    for (const x of [-w * 0.37, w * 0.37]) addGeometry(unitBox, '#7fd6e0', x, hoodY + 0.42, l * 0.12, 0.05, 0.4, l * 0.08, 0, 0, 0, true);
    driver(l * 0.06, hoodY + 0.14);
    addGeometry(unitBox, '#e8f0f4', w * 0.32, hoodY + 0.3, -l * 0.02, 0.24, 0.5, 0.24, 0, 0, 0, true);   // the clear brick
    brick(0, hoodY + 0.16, -l * 0.06, w * 0.86, 0.6, l * 0.08, white, true);          // the white band
    brick(0, hoodY - 0.04, -l * 0.3, w * 0.86, 0.2, l * 0.4, blue, false);            // the bed floor
    for (const sx of [-1, 1]) brick(sx * w * 0.38, hoodY + 0.26, -l * 0.3, w * 0.12, 0.5, l * 0.4, blue, true);
    brick(0, hoodY + 0.26, -l * 0.49, w * 0.86, 0.5, 0.1, blue, false);               // tailgate
    brick(0, hoodY + 0.38, -l * 0.47, w * 0.4, 0.12, 0.2, '#9aa3ab', true);
    for (const x of [-w * 0.3, w * 0.3]) addGeometry(unitBox, '#e5203a', x, hoodY + 0.06, -l * 0.51, 0.2, 0.2, 0.05, 0, 0, 0, true);
    // The exhausts: two chrome cans on each side under the floor, pointing out across the road.
    for (const sx of [-1, 1]) for (const z of [-l * 0.02, -l * 0.15]) {
      addGeometry(unitStud, chrome, sx * w * 0.44, deck - 0.06, z, 0.13, 0.46, 0.13, 0, 0, Math.PI / 2);
      addGeometry(unitStud, '#3a3d44', sx * w * 0.59, deck - 0.06, z, 0.08, 0.04, 0.08, 0, 0, Math.PI / 2);
    }
  } else if (spec.detail === 'minitruck') {
    // Photo scheggia-rosa: the smallest truck there is. A clear cab with a sloping front, one pink 2x2 brick, a tall
    // brown 2x4 for the load, white and grey plates underneath and six little wheels — one of them yellow.
    const pink = spec.color, brown = spec.accent, white = '#f2f0ea', grey = '#6b7078';
    brick(0, baseY - 0.12, 0, w * 0.86, 0.1, l * 0.9, grey, false);
    brick(0, baseY, l * 0.08, w * 0.88, 0.16, l * 0.78, white, false);
    brick(0, baseY - 0.02, -l * 0.42, w * 0.88, 0.14, l * 0.12, '#f5c518', false);
    addGeometry(unitBox, '#e4eef0', 0, hoodY + 0.26, l * 0.29, w * 0.86, 0.56, l * 0.2, 0, 0, 0, true);    // the clear cab
    addGeometry(unitBox, '#e4eef0', 0, hoodY + 0.12, l * 0.43, w * 0.86, 0.36, 0.2, -0.55, 0, 0, true);    // its sloping nose
    for (const x of [-w * 0.18, w * 0.18]) addGeometry(unitStud, '#e4eef0', x, hoodY + 0.6, l * 0.3, 0.12, 0.08, 0.12, 0, 0, 0, true);
    driver(l * 0.28, hoodY - 0.02);
    brick(0, hoodY + 0.28, l * 0.06, w * 0.86, 0.6, l * 0.24, pink, true);
    brick(0, hoodY - 0.08, -l * 0.27, w * 0.88, 0.1, l * 0.4, grey, false);
    brick(0, hoodY + 0.36, -l * 0.27, w * 0.86, 0.78, l * 0.4, brown, true);          // the load, taller than the cab
  } else if (spec.detail === 'launcher') {
    // Photo doppio-missile: a stubby yellow buggy on four big tyres with a grey frame, and on top two black launch
    // tubes with clear-yellow muzzles in front and two clear-green missiles with their fins sticking out behind.
    const yellow = spec.color, grey = spec.accent, black = '#15161c', glow = '#d6f04a';
    brick(0, baseY, 0, w * 0.72, 0.3, l * 0.72, '#3a3f47', false);
    brick(0, hoodY + 0.16, -l * 0.02, w * 0.62, 0.6, l * 0.48, yellow, false);
    addGeometry(unitBox, '#ffd84a', 0, hoodY + 0.3, l * 0.22, w * 0.5, 0.42, 0.3, -0.5, 0, 0, true);      // clear-yellow slope
    driver(l * 0.06, hoodY + 0.3);
    brick(0, hoodY + 0.5, -l * 0.12, w * 0.6, 0.12, l * 0.22, grey, true);
    for (const sx of [-1, 1]) {
      brick(sx * w * 0.36, hoodY + 0.2, l * 0.2, 0.12, 0.6, 0.12, grey, false);       // the uprights
      brick(sx * w * 0.36, hoodY + 0.2, -l * 0.22, 0.12, 0.6, 0.12, grey, false);
      addGeometry(unitStud, black, sx * w * 0.36, hoodY + 0.6, l * 0.04, 0.09, l * 0.74, 0.09, Math.PI / 2);   // the tube
      addGeometry(unitStud, glow, sx * w * 0.36, hoodY + 0.6, l * 0.42, 0.18, 0.1, 0.18, Math.PI / 2, 0, 0, true);
      addGeometry(unitStud, glow, sx * w * 0.36, hoodY + 0.6, -l * 0.42, 0.14, 0.5, 0.14, Math.PI / 2, 0, 0, true);   // the missile
      for (const rz of [0, Math.PI / 2]) addGeometry(unitBox, glow, sx * w * 0.36, hoodY + 0.6, -l * 0.58, 0.46, 0.04, 0.24, 0, 0, rz, true);
    }
    brick(0, hoodY + 0.6, l * 0.3, w * 0.76, 0.1, 0.12, grey, false);
  } else if (spec.detail === 'airliner') {
    // Photo jumbo-fiammante: the giant. A long fuselage in sections — orange nose tip, grey, a smoked canopy, red,
    // grey, a long white run, a patch of every colour and a grey tail — on black technic sides, with big cream swept
    // wings, small blue fins at the tail and flames coming out of the back. Everything is laid out in fractions of
    // the length, nose first, so the proportions are the photo's.
    const white = spec.color, grey = '#9aa3ab', red = '#d8262c', blue = spec.accent, cream = '#efe4c8', black = '#15161c';
    const fw = 1.05, fy = deck + 0.42, fh = 0.62;
    const section = (from, to, colour, studs = true) => brick(0, fy, ((from + to) / 2) * l, fw, fh, (to - from) * l, colour, studs);
    brick(0, fy, l * 0.5 + 0.1, fw * 0.9, fh * 0.9, 0.2, '#f08a24', true);            // the orange nose tip
    section(0.38, 0.5, grey);
    addGeometry(unitBox, '#7d8a90', 0, fy + 0.14, l * 0.34, fw * 0.92, 0.5, l * 0.08, -0.5, 0, 0, true);   // the canopy
    section(0.3, 0.38, grey, false);
    driver(l * 0.33, fy - 0.06);
    section(0.2, 0.3, red);
    section(0.06, 0.2, grey);
    section(-0.26, 0.06, white);
    section(-0.5, -0.26, grey);
    const patch = [red, '#f5c518', '#2fa36b', blue, '#1f5fd0', '#f08a24'];
    for (let i = 0; i < 6; i += 1) brick(((i % 3) - 1) * fw * 0.3, fy + fh / 2 + 0.04, -l * 0.3 - Math.floor(i / 3) * 0.26, fw * 0.28, 0.08, 0.24, patch[i], true);
    for (const sx of [-1, 1]) {
      brick(sx * fw * 0.51, fy - 0.08, -l * 0.02, 0.04, 0.22, l * 0.8, black, false);  // technic sides
      for (let i = 0; i < 10; i += 1) addGeometry(unitStud, '#3a3d44', sx * fw * 0.53, fy - 0.08, -l * 0.38 + i * l * 0.085, 0.06, 0.02, 0.06, 0, 0, Math.PI / 2);
      brick(sx * fw * 0.51, fy - 0.25, -l * 0.04, 0.04, 0.1, l * 0.36, red, false);
      // The wing, built the way the photo's is: big studded plates, broad at the root and stepping back and in
      // towards the tip, which is what makes it swept. A first version used two thin rotated panels, and from the
      // chase camera the giant had stubs. It reaches as far out as the race allows (under 3 m across in all).
      brick(sx * 0.72, deck + 0.24, -l * 0.02, 0.44, 0.12, 1.75, cream, true);
      brick(sx * 1.1, deck + 0.24, -l * 0.08, 0.36, 0.12, 1.15, cream, true);
      brick(sx * 1.38, deck + 0.24, -l * 0.12, 0.2, 0.12, 0.55, cream, true);
      brick(sx * 1.05, deck + 0.34, -l * 0.17, 0.62, 0.07, 0.14, black, false);       // the black and blue strip
      brick(sx * 1.05, deck + 0.34, -l * 0.2, 0.62, 0.07, 0.14, '#3ec1e6', false);
      // The little blue fins at the tail, tilted up.
      addGeometry(unitBox, blue, sx * 0.72, fy + 0.16, -l * 0.38, 0.55, 0.08, 0.42, 0, sx * 0.6, sx * 0.35);
      // Engine nozzle and its flame.
      addGeometry(unitStud, red, sx * 0.28, fy, -l * 0.5 - 0.04, 0.2, 0.08, 0.2, Math.PI / 2);
      addGeometry(unitStud, '#ff8a1e', sx * 0.28, fy, -l * 0.5 - 0.24, 0.13, 0.36, 0.13, Math.PI / 2, 0, 0, true);
      addGeometry(unitStud, '#ffd84a', sx * 0.28, fy, -l * 0.5 - 0.2, 0.07, 0.3, 0.07, Math.PI / 2, 0, 0, true);
    }
    // The undercarriage legs, from the wheels up into the belly.
    brick(0, deck - 0.02, l * 0.42, 0.1, 0.2, 0.1, DARK, false);
    for (const x of [-w * 0.2, w * 0.2]) brick(x, deck - 0.02, -l * 0.08, 0.1, 0.16, 0.1, DARK, false);
  } else if (spec.detail === 'van') {
    // A delivery van: one tall box from nose to tail, sliding-door panel, wide flat sides and twin rear doors.
    // No existing shape makes one — `truck` gives a cab-and-bed pickup — which is why it needed its own body.
    brick(0, hoodY + 0.34, -l * 0.06, w * 0.92, 1.12, l * 0.74, spec.color);
    brick(0, hoodY - 0.06, l * 0.4, w * 0.9, 0.5, l * 0.22, spec.color);
    brick(0, hoodY + 0.26, l * 0.29, w * 0.82, 0.46, 0.12, '#8fb9d8');              // windscreen
    for (const x of [-w * 0.46, w * 0.46]) brick(x, hoodY + 0.3, l * 0.12, 0.08, 0.4, 0.62, '#8fb9d8');
    brick(w * 0.465, hoodY + 0.1, -l * 0.06, 0.06, 0.9, l * 0.3, spec.accent, false);  // the sliding door
    brick(w * 0.465, hoodY + 0.1, -l * 0.06, 0.09, 0.08, l * 0.3, '#c9cdd1', false);
    for (const x of [-0.16, 0.16]) brick(x, hoodY + 0.34, -l * 0.43, w * 0.44, 1.06, 0.08, spec.accent, false);  // rear doors
    brick(0, hoodY + 0.92, -l * 0.06, w * 0.7, 0.12, l * 0.6, spec.accent, true);      // roof rack
  } else if (spec.detail === 'long') {
    brick(0, hoodY, l * 0.29, w, 0.24, 0.56, spec.color);
    for (const x of [-w * 0.26, w * 0.26]) brick(x, hoodY - 0.05, 0.04, 0.22, 0.15, 1.8, '#727b85');
    cockpit(-0.85, 0.83, true);
    brick(0, hoodY + 0.43, -1.17, w * 0.62, 0.26, 0.34, '#ce3f4b');
  } else if (spec.detail === 'monster' || spec.detail === 'blue-truck') {
    patchwork(l * 0.28, hoodY, 0.7, 0.3);
    cockpit(0.11, monster ? 0.84 : 0.73, true, true);
    driver(-0.12, hoodY + (monster ? 0.24 : 0.17));
    patchwork(-l * 0.31, hoodY + 0.05, 0.73, 0.35);
    if (monster) {
      addGeometry(unitStud, '#cad1d3', w * 0.37, hoodY + 0.93, -l * 0.36, 0.065, 1.5, 0.065, -0.35);
      for (const x of [-w * 0.46, w * 0.46]) addGeometry(unitStud, WHITE, x, deck + 0.05, -0.06, 0.12, l * 0.53, 0.12, Math.PI / 2);
    } else {
      brick(0, hoodY + 0.2, l * 0.32, w * 0.9, 0.13, 0.73, '#21924c');
      brick(0, hoodY + 0.93, 0, w * 0.86, 0.14, 1.22, '#cdd2cc');
      brick(0, baseY + 0.05, l * 0.47, w * 0.45, 0.48, 0.06, WHITE, false);
    }
  } else if (spec.detail === 'f1') {
    // A single-seater, rebuilt piece by piece: the children said the old one "isn't precise", and they were right —
    // it was a flat slab with a wing on top. What makes a Formula 1 readable to a six-year-old, in order: the long
    // pointed nose held up by its pillar, the front wing with endplates, the sidepods, the airbox behind the helmet,
    // the halo, the rear wing on its pylon, and the suspension arms you can see through.
    const trim = spec.accent, dark = '#2b2f36', grey = '#b9c9d6';
    const number = Array.isArray(spec.number) ? spec.number : [5];
    // Monocoque: narrow, with a raised cockpit rim.
    brick(0, hoodY, -l * 0.04, w * 0.34, 0.26, l * 0.62, spec.color, false);
    brick(0, hoodY + 0.2, -l * 0.02, w * 0.4, 0.14, l * 0.3, spec.color, false);
    // Stepped nose out to the tip, and the pillar that carries the front wing: without it the wing looks dropped.
    brick(0, hoodY + 0.08, l * 0.3, w * 0.26, 0.2, l * 0.2, spec.color, false);
    brick(0, hoodY + 0.02, l * 0.45, w * 0.16, 0.16, l * 0.16, spec.color, false);
    brick(0, hoodY - 0.14, l * 0.52, 0.1, 0.34, 0.14, dark, false);
    // Front wing: the plank takes the trim colour so it reads against a dark car, with a flap and two endplates.
    brick(0, deck * 0.55, l * 0.54, w * 1.02, 0.1, 0.34, trim, false);
    brick(0, deck * 0.55 + 0.11, l * 0.5, w * 0.86, 0.08, 0.22, spec.color, false);
    for (const x of [-w * 0.52, w * 0.52]) addGeometry(unitBox, trim, x, deck * 0.62, l * 0.54, 0.08, 0.34, 0.42, 0, 0, 0.12);
    // Barge boards and floor edges along the flanks.
    for (const x of [-w * 0.36, w * 0.36]) {
      brick(x, hoodY - 0.04, l * 0.08, 0.05, 0.3, 0.7, dark, false);
      brick(x * 1.08, deck * 0.42, -l * 0.06, 0.06, 0.08, l * 0.5, dark, false);
    }
    // Sidepods with a round intake each, sloping away to the rear.
    for (const x of [-w * 0.4, w * 0.4]) {
      brick(x, hoodY + 0.02, -l * 0.04, w * 0.26, 0.3, l * 0.34, trim);
      addGeometry(unitStud, dark, x, hoodY + 0.04, l * 0.13, 0.17, 0.09, 0.17, 0, 0, Math.PI / 2);
      brick(x, hoodY + 0.16, -l * 0.22, w * 0.2, 0.12, l * 0.14, trim, false);
    }
    // Cockpit, helmet, airbox scoop and the halo hoop over the driver's head.
    driver(-l * 0.04, hoodY + 0.16, spec.color);
    brick(0, hoodY + 0.5, -l * 0.2, 0.34, 0.3, 0.4, spec.color, false);
    addGeometry(unitStud, dark, 0, hoodY + 0.52, -l * 0.13, 0.15, 0.08, 0.15, Math.PI / 2);
    for (const x of [-0.28, 0.28]) addGeometry(unitBox, dark, x, hoodY + 0.44, -l * 0.04, 0.07, 0.5, 0.07, 0, 0, x > 0 ? -0.22 : 0.22);
    brick(0, hoodY + 0.66, l * 0.1, 0.5, 0.07, 0.07, dark, false);
    brick(0, hoodY + 0.5, l * 0.14, 0.07, 0.3, 0.07, dark, false);
    // Rear wing on its pylon (wing() adds the endplates), beam wing and diffuser underneath. `wing` on the spec
    // paints the tail on its own: the black number 5 wears a yellow nose and red grilles at the back, not one colour.
    const tail = spec.wing || trim;
    wing(hoodY + 0.86, -l * 0.44, tail);
    brick(0, hoodY + 0.46, -l * 0.45, w * 0.7, 0.08, 0.26, tail, false);
    for (let i = 0; i < 4; i += 1) brick(-w * 0.18 + i * w * 0.12, deck * 0.42, -l * 0.47, 0.05, 0.22, 0.34, dark, false);
    brick(0, hoodY + 0.3, -l * 0.47, 0.12, 0.12, 0.08, '#ff695b', false);   // rain light
    // Exposed suspension: a wishbone per corner, reaching OUTWARD from the tub to the hub. Without these the open
    // wheels of a single-seater look like four tyres left lying beside the car.
    for (const sx of [-1, 1]) for (const az of [axleZ + 0.2, -axleZ]) {
      for (const dz of [-1, 1]) for (const dy of [-0.05, 0.13]) {
        addGeometry(unitBox, grey, sx * w * 0.36, deck * 0.78 + dy, az + dz * 0.1, w * 0.42, 0.05, 0.05, 0, sx * dz * 0.24, 0);
      }
      addGeometry(unitBox, grey, sx * w * 0.5, deck * 0.8, az, 0.07, 0.34, 0.07);   // the upright at the hub
    }
    for (const side of ['left', 'right']) {
      const sign = side === 'left' ? -1 : 1;
      number.forEach((value, i) => digit(value, side, sign * w * 0.53, hoodY + 0.12, -l * 0.02 + (i - (number.length - 1) / 2) * 0.22, WHITE, 0.12, 0.22, 0.04));
    }
    number.forEach((value, i) => digit(value, 'top', (i - (number.length - 1) / 2) * 0.2, hoodY + 0.3, l * 0.34, WHITE, 0.13, 0.2, 0.04));
  } else if (spec.detail === 'dragster') {
    // Photo bestia-rossa: the long red rail. Engine pipes on show, the driver up high and a very tall wing.
    const grey = '#b9c9d6', steel = '#7d8892', cyan = '#2ec4d6', handle = '#f07b28';
    brick(0, hoodY, l * 0.3, w * 0.6, 0.26, l * 0.46, spec.color);
    for (const x of [-w * 0.3, w * 0.3]) brick(x, hoodY - 0.02, l * 0.04, 0.15, 0.15, l * 0.58, grey, false);
    brick(0, hoodY + 0.04, -l * 0.08, w * 0.56, 0.3, l * 0.2, grey, false);
    for (const x of [-w * 0.22, 0, w * 0.22]) addGeometry(unitStud, '#8f98a3', x, hoodY + 0.3, -l * 0.08, 0.09, 0.42, 0.09);
    brick(0, hoodY + 0.26, -l * 0.26, w * 0.5, 0.32, l * 0.15, spec.color);
    driver(-l * 0.3, hoodY + 0.4, '#1f63d6', '#f5d343');
    for (const x of [-w * 0.32, w * 0.32]) brick(x, hoodY + 0.95, -l * 0.42, 0.1, 1.06, 0.12, DARK, false);
    // The wing in the photo is one grey plank with ribbed ends, a teal panel in the middle and an orange grab
    // handle on top. It used to be green, yellow and cyan at once, which is the one place this car looked wrong.
    brick(0, hoodY + 1.48, -l * 0.42, w * 1.12, 0.14, 0.48, grey, false);
    brick(0, hoodY + 1.5, -l * 0.42, w * 0.38, 0.15, 0.52, cyan, false);
    for (const x of [-w * 0.44, w * 0.44]) brick(x, hoodY + 1.5, -l * 0.42, w * 0.17, 0.15, 0.52, steel, false);
    brick(0, hoodY + 1.66, -l * 0.42, 0.42, 0.08, 0.09, handle, false);
    for (const x of [-0.19, 0.19]) brick(x, hoodY + 1.6, -l * 0.42, 0.08, 0.14, 0.09, handle, false);
    for (const x of [-w * 0.26, w * 0.26]) addGeometry(unitStud, '#ffe36a', x, hoodY + 0.14, l * 0.5, 0.12, 0.16, 0.12);
  } else if (spec.detail === 'trike') {
    // Photo tre-zampe: three wheels only. Long fork ahead, blue seat with its backrest, rider in a yellow helmet.
    const grey = '#b9c9d6';
    brick(0, hoodY - 0.04, l * 0.18, 0.34, 0.15, l * 0.62, DARK, false);
    brick(0, hoodY + 0.04, l * 0.18, 0.5, 0.11, l * 0.46, '#2c3a4a', false);
    for (const x of [-0.26, 0.26]) brick(x, hoodY + 0.02, l * 0.06, 0.16, 0.12, l * 0.4, grey, false);
    brick(0, hoodY + 0.02, -l * 0.24, w * 0.56, 0.24, l * 0.26, spec.color);
    brick(0, hoodY + 0.42, -l * 0.35, w * 0.5, 0.54, 0.16, spec.color, false);
    driver(-l * 0.22, hoodY + 0.24, '#e0342a');
    brick(0, hoodY + 0.32, -l * 0.02, 0.6, 0.08, 0.1, grey, false);
    for (const x of [-0.3, 0.3]) addGeometry(unitStud, DARK, x, hoodY + 0.32, -l * 0.02, 0.07, 0.16, 0.07, 0, 0, Math.PI / 2);
    brick(0, hoodY + 0.14, -l * 0.44, w * 0.48, 0.22, 0.22, '#8f98a3', false);
    for (const x of [-0.22, 0.22]) addGeometry(unitStud, '#b4e849', x, hoodY + 0.08, l * 0.44, 0.11, 0.2, 0.11);
  } else if (spec.detail === 'jet') {
    // Photo jet-tuono: blue delta wings, red tail fin with the flame badge and a wooden crate hooked on behind.
    const grey = '#b9c9d6', wood = '#8a5a3a';
    brick(0, hoodY, l * 0.08, w * 0.46, 0.26, l * 0.7, spec.color, false);
    addGeometry(unitBox, spec.color, 0, hoodY + 0.02, l * 0.44, w * 0.28, 0.2, l * 0.2);
    for (const side of [-1, 1]) addGeometry(unitBox, spec.color, side * w * 0.45, hoodY + 0.02, -l * 0.02, w * 0.58, 0.12, l * 0.4, 0, 0, side * 0.1);
    brick(0, hoodY + 0.2, l * 0.04, w * 0.24, 0.16, 0.6, grey, false);
    driver(-l * 0.02, hoodY + 0.3);
    addGeometry(unitBox, '#9fe8ec', 0, hoodY + 0.3, l * 0.1, w * 0.2, 0.2, 0.34, -0.24, 0, 0, true);
    addGeometry(unitBox, spec.accent, 0, hoodY + 0.64, -l * 0.33, 0.12, 0.92, 0.6, 0.3);
    addGeometry(unitStud, '#f5f0e2', 0, hoodY + 0.72, -l * 0.3, 0.11, 0.06, 0.11, Math.PI / 2);
    brick(0, hoodY + 0.16, -l * 0.44, w * 0.42, 0.3, l * 0.18, wood, false);
    for (const z of [-l * 0.37, -l * 0.51]) brick(0, hoodY + 0.32, z, w * 0.44, 0.24, 0.07, wood, false);
    brick(0, hoodY + 0.06, -l * 0.18, 0.28, 0.12, l * 0.14, grey, false);
  } else if (spec.shape === 'truck') {
    brick(0, hoodY, l * 0.3, w * 0.86, 0.24, 0.62, spec.color);
    stripes(hoodY + 0.19, l * 0.3, 0.62);
    cockpit(0.34, cabHeight ?? 0.68, true);
    brick(0, hoodY + 0.41, -0.85, w * 0.88, 1.05, 1.2, spec.color);
    stripes(hoodY + 1.005, -0.85, 1.2);
    for (const x of [-w * 0.446, w * 0.446]) brick(x, hoodY + 0.43, -0.82, 0.03, 0.3, 0.75, spec.accent, false);
  } else if (spec.shape === 'buggy') {
    brick(0, hoodY + 0.03, l * 0.28, w * 0.71, 0.3, 0.8, spec.accent);
    stripes(hoodY + 0.25, l * 0.28, 0.8);
    brick(0, hoodY + 0.1, -0.3, w * 0.65, 0.18, 0.9, spec.color);
    if (spec.detail === 'crate') {
      // Photo buggy-selvaggio: what the back of this cart carries is an open wooden box, not a seat — four walls and a
      // floor, empty inside. Modelled as a high seat back it looked like an armchair on wheels.
      const wood = '#8a5a3a';
      brick(0, hoodY + 0.2, -l * 0.26, w * 0.66, 0.1, 0.76, wood, false);
      for (const x of [-w * 0.32, w * 0.32]) brick(x, hoodY + 0.42, -l * 0.26, 0.09, 0.44, 0.76, wood, false);
      for (const z of [-l * 0.26 + 0.38, -l * 0.26 - 0.38]) brick(0, hoodY + 0.42, z, w * 0.66, 0.44, 0.09, wood, false);
    }
    driver(-0.29, hoodY + 0.14);
    if (spec.detail !== 'crate') {
      for (const x of [-w * 0.36, w * 0.36]) brick(x, hoodY + 0.42, -0.67, 0.12, 0.86, 0.14, DARK, false);
      brick(0, hoodY + 0.87, -0.67, w * 0.79, 0.12, 0.14, DARK, false);
      wing(hoodY + 0.26, -l * 0.35);
    }
  } else if (spec.shape === 'racer') {
    brick(0, hoodY, l * 0.22, w * 0.52, 0.21, l * 0.5, spec.color);
    brick(0, hoodY + 0.1, l * 0.24, w * 0.16, 0.08, l * 0.49, spec.accent, false);
    stripes(hoodY + 0.175, l * 0.24, l * 0.49);
    for (const x of [-w * 0.35, w * 0.35]) brick(x, hoodY, -0.26, w * 0.22, 0.24, 1.1, spec.color);
    driver(-0.23, hoodY + 0.14, spec.color);
    // `high-wing` was a body of its own until the car that used it turned out to be a military truck. The part
    // still exists, so the tall wing is now only ever asked for by name.
    wing(hoodY + (parts.has('highWing') ? 1 : 0.53), -l * 0.35, parts.has('highWing') ? pick(1) : spec.accent);
    if (spec.detail === 'fin') fin(hoodY, -0.65, spec.accent);
  } else {
    brick(0, hoodY, l * 0.29, w * 0.82, 0.27, 0.8, spec.color);
    stripes(hoodY + 0.205, l * 0.29, 0.8);
    cockpit(-0.25, cabHeight ?? 0.48, true);
    brick(0, hoodY, -l * 0.35, w * 0.81, 0.26, 0.44, spec.color);
    stripes(hoodY + 0.2, -l * 0.35, 0.44);
  }
  // Composable parts for photo cars. Overlaps are fine: homemade brick cars look busy, never broken.
  if (parts.size) {
    const truck = spec.shape === 'truck', openTop = spec.shape === 'buggy' || spec.shape === 'racer';
    const rearY = truck ? hoodY + 0.95 : hoodY;
    const rearZ = -l * 0.3;
    if (parts.has('cab') && openTop) cockpit(0.35, 0.8, true);
    if (parts.has('driver') && !openTop) driver(l * 0.2, hoodY + 0.2, pick(1));
    if (parts.has('highWing') && spec.shape !== 'racer') wing(hoodY + (truck ? 1.15 : 1), -l * 0.36, pick(1));
    if (parts.has('fan')) fan(rearY, -l * 0.42, pick(1));
    if (parts.has('antenna')) {
      brick(w * 0.3, hoodY + 0.06, -l * 0.47, 0.2, 0.12, 0.2, pick(2), false);
      antenna(w * 0.3, hoodY, -l * 0.47, pick(2));
    }
    if (parts.has('rocket')) rocket(hoodY, -0.35, pick(1), pick(2));
    if (parts.has('cargo')) cargoStack(rearY + 0.05, rearZ, truck ? 2 : 3, Math.min(1.37, l * 0.34));
    if (parts.has('fin')) fin(rearY + (spec.shape === 'classic' ? 0.55 : 0), rearZ, pick(1));
  }
  // Extras a spec can ask for by name. They come after the bodies so a hand-made `detail` can have them too.
  if (spec.roofLights) roofLamps();
  if (spec.windscreen) windscreen(spec.shape === 'buggy' ? 0.05 : 0.08);
  // Kids never build symmetric cars: every non-sample model gets a few deterministic quirks from its id —
  // an off-centre brick tower, a flag or a plate sticking out on one side, one odd wheel hub.
  if (spec.source !== 'sample' && spec.detail !== 'beetle') {
    const rng = seededFromText(spec.id || spec.name || 'auto');
    const side = rng() < 0.5 ? -1 : 1;
    const quirkColours = [...palette, '#ff6a00', '#5be03a', '#ffe600', WHITE].filter(Boolean);
    const quirk = (i) => quirkColours[Math.floor(rng() * quirkColours.length) % quirkColours.length] || pick(i);
    const hoodTop = hoodY + (spec.shape === 'racer' ? 0.11 : bigfoot ? 0.15 : 0.13);
    const towerX = side * w * (0.1 + rng() * 0.16), towerZ = l * (0.2 + rng() * 0.16), rows = 1 + Math.floor(rng() * 3);
    for (let row = 0; row < rows; row++) brick(towerX, hoodTop + 0.125 + row * 0.25, towerZ, 0.36 - row * 0.05, 0.25, 0.36, quirk(row), row === rows - 1);
    if (rng() < 0.55) {
      const flagX = -side * w * 0.36, flagZ = -l * (0.3 + rng() * 0.12);
      antenna(flagX, hoodY + 0.1, flagZ, quirk(1));
      // Overlap the pole rather than touching it: a flag whose hem only grazed the mast read as floating.
      brick(flagX + 0.18, hoodY + 1.55, flagZ, 0.44, 0.22, 0.05, quirk(2), false);
    } else {
      brick(-side * (w / 2 + 0.05), hoodY + 0.02, (rng() - 0.5) * l * 0.4, 0.45, 0.08, 0.5, quirk(1), true);
    }
    if (rng() < 0.6 && wheels.length) {
      const odd = wheels[Math.floor(rng() * wheels.length)];
      odd.children[1].material = new THREE.MeshStandardMaterial({ color: quirk(2), roughness: 0.45 });
    }
  }
  // Friendly headlights, dark grille, and tail lamps make the direction obvious.
  for (const x of [-w * 0.29, w * 0.29]) {
    brick(x, baseY + 0.09, l * 0.455, 0.23, 0.16, 0.07, '#fff5bd', false);
    brick(x, baseY + 0.08, -l * 0.46, 0.19, 0.12, 0.065, '#ff695b', false);
  }
  // An inner pair for the cars whose description counts four lamps on the nose.
  if ((Number(spec.lights) || 2) >= 4) for (const x of [-w * 0.12, w * 0.12]) brick(x, baseY + 0.09, l * 0.455, 0.19, 0.14, 0.07, '#fff5bd', false);
  brick(0, baseY - 0.08, l * 0.48, w * 0.84, 0.1, 0.12, WHITE, false);
  brick(0, baseY + 0.05, l * 0.461, w * 0.23, 0.1, 0.06, DARK, false);

  for (const [key, parts] of batches) {
    const geometry = mergeGeometries(parts, false);
    const mesh = new THREE.Mesh(geometry, materials.get(key));
    mesh.castShadow = true; mesh.receiveShadow = true;
    body.add(mesh);
    for (const part of parts) part.dispose();
  }
  unitBox.dispose(); unitStud.dispose();
  // Photo cars (format 2) stretch or squash the body to the measured height; tires stay on the road.
  if ((Number(spec.version) || 1) >= 2 && !spec.detail) {
    const reference = BASE_HEIGHT[spec.shape] || 1.15;
    const factor = THREE.MathUtils.clamp((Number(spec.height) || reference) / reference, 0.75, 1.25);
    body.scale.y = factor;
    body.position.y = deck * (1 - factor);
  }
  // Roll pivot. The renderer leans the car into a turn; it used to rotate `body` alone about the car's origin, which
  // sits at ROAD level, while the wheels stayed put — so the higher a part was, the further it slid sideways, and a
  // tall rear wing looked like it had come loose. Body and wheels now hang off one `tilt` group pivoted at the axle
  // line, the way a suspension actually rolls. Translating the group up and its children down by the same amount
  // leaves every vertex exactly where it was, so the recorded geometry does not change.
  const carWheels = wheels.filter((wheel) => wheel.userData.group !== 'trailer');
  const pivotY = Math.max(0.2, Math.min(...carWheels.map((wheel) => wheel.userData.radius)));
  const tilt = new THREE.Group();
  tilt.position.y = pivotY;
  car.add(tilt);
  body.position.y -= pivotY;
  tilt.add(body);
  for (const wheel of carWheels) { wheel.position.y -= pivotY; tilt.add(wheel); }
  // What the renderer needs to lean the body with the tyres on the road, steer the wheels and swing the tail out
  // (src/lean.js). The axles that declare `steer` turn (the harvester steers at the back, as real ones do); without
  // a mark, the frontmost wheels do. Spin first, then steer: the order changes nothing while both angles are zero.
  const halfTrack = Math.max(...carWheels.map((wheel) => Math.abs(wheel.position.x) + wheel.userData.tread / 2));
  const axleZs = carWheels.map((wheel) => wheel.position.z);
  const frontZ = Math.max(...axleZs), rearZ = Math.min(...axleZs);
  const marked = carWheels.filter((wheel) => wheel.userData.steer);
  for (const wheel of marked.length ? marked : carWheels.filter((wheel) => wheel.position.z > frontZ - 0.05)) {
    wheel.rotation.order = 'YXZ';
    // Rear-steering wheels turn the other way round to take the same bend.
    wheel.userData.steerSign = wheel.position.z < (frontZ + rearZ) / 2 ? -1 : 1;
  }
  car.userData.stance = { pivotY, halfTrack, wheelbase: frontZ - rearZ, frontZ };

  // The trailer body, built in hitch-local coordinates (z <= 0, running back from the coupling). Plain meshes rather
  // than the merged-by-colour batches: only a rig or two carries one, and it must be able to swing on its own.
  if (hitch) {
    const trailer = spec.trailer || {};
    const tLength = THREE.MathUtils.clamp(trailer.length ?? 3, 2, 3.6);
    const tWidth = (trailer.width ?? 1) * w * 0.94;
    const floorY = deck * 0.72;
    const plank = (colour, px, py, pz, sx, sy, sz) => {
      const part = new THREE.Mesh(unitBox.clone(), material(colour)[1]);
      part.scale.set(sx, sy, sz);
      part.position.set(px, py, pz);
      part.castShadow = true; part.receiveShadow = true;
      hitch.add(part);
    };
    plank(DARK, 0, floorY - 0.12, -tLength / 2, tWidth, 0.2, tLength);          // the chassis rails
    plank('#c9cdd1', 0, floorY + 0.06, -0.12, 0.5, 0.18, 0.5);                  // the coupling plate
    if (trailer.body === 'wood') {
      plank('#a97f52', 0, floorY + 0.06, -tLength / 2, tWidth, 0.12, tLength);
      for (const sx of [-1, 1]) plank('#a97f52', sx * tWidth * 0.48, floorY + 0.4, -tLength / 2, 0.1, 0.62, tLength);
      plank('#a97f52', 0, floorY + 0.4, -tLength + 0.06, tWidth, 0.62, 0.1);
      for (let i = 0; i < 4; i += 1) plank(pick(i + 1), 0, floorY + 0.34, -0.6 - i * (tLength - 1) / 4, tWidth * 0.8, 0.5, 0.5);
    } else {
      // A container, in the patchwork of colours the children's own trailer carries.
      for (let i = 0; i < 5; i += 1) plank(pick(i), 0, floorY + 0.68, -0.5 - i * (tLength - 1) / 5, tWidth, 1.18, (tLength - 0.6) / 5);
      plank(DARK, 0, floorY + 0.68, -tLength + 0.08, tWidth * 0.96, 1.18, 0.1);
    }
    for (const sx of [-1, 1]) plank(DARK, sx * tWidth * 0.5, floorY - 0.12, -tLength + 0.2, 0.08, 0.3, 0.24);  // mud flaps
    car.userData.hitch = hitch;
  }

  car.userData.wheels = wheels;
  car.userData.spinners = spinners;
  car.userData.tilt = tilt;
  car.userData.body = body;
  car.userData.spec = spec;
  return car;
}
