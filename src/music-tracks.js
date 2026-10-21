/**
 * The music, as data. No Web Audio here, so the scores can be checked in Node and edited like text.
 *
 * A loop has a tempo, a key and a scale, and layers. Each layer is 16 bars of 4/4 (AABA: the four-bar tune,
 * said again with a new ending, a middle section elsewhere, then the tune home); a bar is a string of tokens,
 * one per note, "PITCH:LENGTH" with the length in eighths (a bar sums to 8). "-" is a rest.
 *   melodic layers (bass, lead, arp): pitch like "C5", "F#4", "Bb3"
 *   drums: K = kick, S = snare, H = closed hat
 * Layers: `bass` and `drums` always play, `lead` is the tune, `arp` joins while a player has a turbo,
 * `hat` doubles the hi-hats on the last lap. See audio.js for the sound of each layer.
 *
 * Musical rules (children 6–10): major or pentatonic by day, dorian by night, mixolydian on dirt; lead between
 * C4 and C6, bass between C2 and C4; a four-bar phrase repeated with a different ending, so it can be sung back.
 *
 * And the rule that was learned the hard way: EVERY layer breathes, not just the tune. The first rewrite gave the
 * melody its rests and left the machine running underneath — hi-hat on every eighth, kick and snare on every beat,
 * two bars repeated sixteen times. Over a three-lap race that texture is what wears a room down, more than any
 * melody does. So each layer rests at least a tenth of the loop, none of them is one bar on repeat, and the middle
 * section (bars 9-12) is a real drop with the drums thinned out, so the tune has somewhere to come back from.
 * `tests/music-tracks.test.js` holds all three of those.
 */
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentatonic: [0, 2, 4, 7, 9],
};
export const EIGHTHS_PER_BAR = 8;
export const BARS_PER_LOOP = 16;
export const RANGES = { bass: ['C2', 'C4'], lead: ['C4', 'C6'], arp: ['C4', 'C6'] };
const DRUM_HITS = new Set(['K', 'S', 'H']);
const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C4" → 60, "F#4" → 66, "Bb3" → 58. Returns null for anything else. */
export function noteToMidi(name) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name || '');
  if (!match) return null;
  const [, letter, accidental, octave] = match;
  return 12 * (Number(octave) + 1) + NOTE_INDEX[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
}
export const midiToFrequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** Parses one bar into [{ pitch, midi, length }] (pitch null for rests, midi null for drums and rests). */
export function parseBar(bar) {
  return String(bar).trim().split(/\s+/).filter(Boolean).map((token) => {
    const [pitch, lengthText] = token.split(':');
    const length = Number(lengthText);
    if (!Number.isInteger(length) || length < 1) throw new Error(`bad length in "${token}"`);
    if (pitch === '-') return { pitch: null, midi: null, length };
    if (DRUM_HITS.has(pitch)) return { pitch, midi: null, length };
    const midi = noteToMidi(pitch);
    if (midi === null) throw new Error(`bad pitch in "${token}"`);
    return { pitch, midi, length };
  });
}

/** Flattens a layer into one slot per eighth: the note starting there, or null. Rests leave holes. */
export function expandLayer(bars) {
  const slots = [];
  for (const bar of bars) {
    const notes = parseBar(bar);
    const total = notes.reduce((sum, note) => sum + note.length, 0);
    if (total !== EIGHTHS_PER_BAR) throw new Error(`bar "${bar}" has ${total} eighths, expected ${EIGHTHS_PER_BAR}`);
    for (const note of notes) {
      slots.push(note.pitch ? note : null);
      for (let i = 1; i < note.length; i += 1) slots.push(null);
    }
  }
  return slots;
}

/** True when the pitch belongs to the loop's key and scale (drums and rests always do). */
export function inScale(midi, key, scale) {
  if (midi === null) return true;
  const root = noteToMidi(`${key}0`) % 12;
  return SCALES[scale].includes(((midi - root) % 12 + 12) % 12);
}

export const MUSIC = {
  // Bright and driving: C major, one four-bar tune said three times with a different ending each time, and a
  // middle section on A minor so the loop has somewhere to go. Under it the kit plays kick and snare with air
  // between them rather than a hat on every eighth, and in the middle section it drops to almost nothing.
  'race-day': {
    bpm: 152, key: 'C', scale: 'major', mood: 'Sole, curve larghe, si vince',
    layers: {
      bass: [
        'C2:1 C2:1 C3:1 C2:1 G2:2 C2:1 -:1', 'C2:1 C2:1 C3:1 C2:1 G2:2 C2:1 -:1',
        'F2:1 F2:1 F3:1 F2:1 C3:2 F2:1 -:1', 'G2:1 G2:1 G3:1 G2:1 D3:2 B2:1 -:1',
        'C2:1 C2:1 C3:1 C2:1 G2:2 C2:1 -:1', 'C2:1 C2:1 C3:1 C2:1 G2:2 C2:1 -:1',
        'F2:1 F2:1 F3:1 F2:1 C3:2 F2:1 -:1', 'G2:1 G2:1 G3:1 G2:1 D3:2 B2:1 -:1',
        'A2:1 -:1 A3:1 -:1 E3:2 -:2', 'A2:1 -:1 A3:1 -:1 E3:2 -:2',
        'F2:1 -:1 F3:1 -:1 C3:2 -:2', 'G2:1 -:1 G3:1 -:1 D3:2 -:2',
        'C2:1 C2:1 C3:1 C2:1 G2:2 C2:1 -:1', 'F2:1 F2:1 F3:1 F2:1 C3:2 F2:1 -:1',
        'G2:1 G2:1 G3:1 G2:1 D3:2 G2:1 -:1', 'C2:1 C2:1 C3:1 C2:1 G2:2 B2:1 -:1',
      ],
      lead: [
        'G5:2 E5:2 C5:2 -:2', 'D5:2 E5:2 G5:3 -:1',
        'A5:2 F5:2 C5:2 -:2', 'D5:4 -:4',
        'G5:2 E5:2 C5:2 -:2', 'D5:2 E5:2 G5:3 -:1',
        'A5:2 G5:2 F5:2 E5:2', 'C5:2 D5:2 E5:4',
        'A5:3 -:1 G5:2 E5:2', 'C6:4 -:4',
        'F5:2 A5:2 C6:2 -:2', 'B5:2 A5:2 G5:4',
        'G5:2 E5:2 C5:2 -:2', 'D5:2 E5:2 G5:3 -:1',
        'A5:2 G5:2 E5:2 D5:2', 'E5:2 D5:2 C5:4',
      ],
      arp: [
        'C5:1 E5:1 G5:2 -:1 E5:1 C5:1 -:1', 'C5:1 E5:1 G5:2 -:1 E5:1 C5:1 -:1',
        'F5:1 A5:1 C6:2 -:1 A5:1 F5:1 -:1', 'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1',
        'C5:1 E5:1 G5:2 -:1 E5:1 C5:1 -:1', 'C5:1 E5:1 G5:2 -:1 E5:1 C5:1 -:1',
        'F5:1 A5:1 C6:2 -:1 A5:1 F5:1 -:1', 'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1',
        'A4:1 -:1 E5:2 -:1 C5:1 -:2', 'A4:1 -:1 E5:2 -:1 C5:1 -:2',
        'F5:1 -:1 C6:2 -:1 A5:1 -:2', 'G4:1 -:1 D5:2 -:1 B4:1 -:2',
        'C5:1 E5:1 G5:2 -:1 E5:1 C5:1 -:1', 'F5:1 A5:1 C6:2 -:1 A5:1 F5:1 -:1',
        'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1', 'C5:1 E5:1 G5:2 -:1 E5:1 C5:1 -:1',
      ],
      drums: [
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 -:1 S:1 -:1 K:1 K:1 S:1 -:1',
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 -:1 S:1 S:1 K:1 S:1 S:1 S:1',
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 -:1 S:1 -:1 K:1 K:1 S:1 -:1',
        'K:1 H:1 S:1 H:1 K:1 H:1 S:1 H:1', 'K:1 -:1 S:1 S:1 K:1 S:1 S:1 S:1',
        'K:2 -:6', '-:4 S:2 -:2',
        'K:2 -:2 S:2 -:2', 'K:1 -:1 S:1 -:1 K:1 K:1 S:1 S:1',
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 H:1 S:1 H:1 K:1 H:1 S:1 H:1',
        'K:1 -:1 S:1 -:1 K:1 K:1 S:1 -:1', 'K:1 -:1 S:1 S:1 K:1 S:1 S:1 S:1',
      ],
      hat: [
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:3 H:1 -:3 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:3 H:1 -:3 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', 'H:1 H:1 H:1 H:1 H:1 H:1 H:1 H:1',
        '-:8', '-:8',
        '-:3 H:1 -:3 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', 'H:1 H:1 H:1 H:1 H:1 H:1 H:1 H:1',
      ],
    },
  },
  // The start screen: original punk, written in the style, not a copy of anyone's song. The bass drives almost
  // all the way down because that is the genre — it is the one layer allowed to rest the least — while the tune
  // stops often, the middle eight goes to F# minor and the kit drops out under it for two bars.
  'intro-punk': {
    bpm: 176, key: 'A', scale: 'major', mood: 'Uno-due-tre-quattro, si parte',
    layers: {
      bass: [
        'A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1', 'A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 E2:1',
        'D3:1 D3:1 D3:1 D3:1 D3:1 D3:1 D3:1 D3:1', 'D3:1 D3:1 D3:1 D3:1 D3:1 D3:1 D3:1 A2:1',
        'A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1', 'A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 E2:1',
        'E3:1 E3:1 E3:1 E3:1 E3:1 E3:1 E3:1 E3:1', 'E3:1 E3:1 E3:1 E3:1 E3:1 E3:1 E3:1 A2:1',
        'F#2:1 -:1 F#2:1 -:1 F#2:1 -:1 F#2:1 -:1', 'F#2:1 -:1 F#2:1 -:1 F#2:1 -:1 F#2:1 -:1',
        'D3:1 -:1 D3:1 -:1 D3:1 -:1 D3:1 -:1', 'D3:1 -:1 D3:1 -:1 D3:1 -:1 D3:1 -:1',
        'A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1', 'A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 E2:1',
        'E3:1 E3:1 E3:1 E3:1 E3:1 E3:1 E3:1 E3:1', 'E3:1 E3:1 E3:1 E3:1 A2:2 A2:1 -:1',
      ],
      lead: [
        'A4:2 A4:2 C#5:2 -:2', 'E5:2 C#5:2 A4:2 -:2',
        'D5:2 D5:2 F#5:2 -:2', 'A5:4 -:4',
        'A4:2 A4:2 C#5:2 -:2', 'E5:2 C#5:2 A4:2 -:2',
        'E5:2 F#5:2 G#5:2 -:2', 'B5:4 -:4',
        'F#5:2 A5:2 B5:2 -:2', 'A5:2 F#5:2 E5:4',
        'D5:2 F#5:2 A5:2 -:2', 'F#5:2 E5:2 D5:4',
        'A4:2 A4:2 C#5:2 -:2', 'E5:2 C#5:2 A4:2 -:2',
        'E5:2 G#5:2 B5:2 -:2', 'C#5:2 B4:2 A4:4',
      ],
      arp: [
        'A4:1 E5:1 A4:2 -:1 E5:1 A4:1 -:1', 'A4:1 E5:1 A4:2 -:1 E5:1 A4:1 -:1',
        'D5:1 A5:1 D5:2 -:1 A5:1 D5:1 -:1', 'D5:1 A5:1 D5:2 -:1 A5:1 D5:1 -:1',
        'A4:1 E5:1 A4:2 -:1 E5:1 A4:1 -:1', 'A4:1 E5:1 A4:2 -:1 E5:1 A4:1 -:1',
        'E5:1 B5:1 E5:2 -:1 B5:1 E5:1 -:1', 'E5:1 B5:1 E5:2 -:1 B5:1 E5:1 -:1',
        'F#5:1 -:1 F#5:2 -:1 C#5:1 -:2', 'F#5:1 -:1 F#5:2 -:1 C#5:1 -:2',
        'D5:1 -:1 D5:2 -:1 A5:1 -:2', 'D5:1 -:1 D5:2 -:1 A5:1 -:2',
        'A4:1 E5:1 A4:2 -:1 E5:1 A4:1 -:1', 'A4:1 E5:1 A4:2 -:1 E5:1 A4:1 -:1',
        'E5:1 B5:1 E5:2 -:1 B5:1 E5:1 -:1', 'A4:1 E5:1 A4:2 -:1 E5:1 A4:1 -:1',
      ],
      drums: [
        'K:1 K:1 S:1 -:1 K:1 K:1 S:1 -:1', 'K:1 K:1 S:1 -:1 K:1 K:1 S:1 -:1',
        'K:1 K:1 S:1 -:1 K:1 K:1 S:1 S:1', 'S:1 S:1 S:1 S:1 K:1 K:1 S:1 S:1',
        'K:1 K:1 S:1 -:1 K:1 K:1 S:1 -:1', 'K:1 K:1 S:1 -:1 K:1 K:1 S:1 -:1',
        'K:1 H:1 S:1 H:1 K:1 H:1 S:1 H:1', 'S:1 S:1 S:1 S:1 K:1 K:1 S:1 S:1',
        'K:1 -:3 S:1 -:3', 'K:1 -:3 S:1 -:3',
        'K:1 K:1 S:1 -:1 K:1 K:1 S:1 -:1', 'K:1 K:1 S:1 -:1 K:1 K:1 S:1 S:1',
        'K:1 K:1 S:1 -:1 K:1 K:1 S:1 -:1', 'K:1 H:1 S:1 H:1 K:1 H:1 S:1 H:1',
        'K:1 K:1 S:1 -:1 K:1 K:1 S:1 S:1', 'S:1 S:1 S:1 S:1 K:1 K:1 S:1 S:1',
      ],
      hat: [
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:3 H:1 -:3 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:3 H:1 -:3 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', 'H:1 H:1 H:1 H:1 H:1 H:1 H:1 H:1',
        '-:8', '-:8',
        '-:3 H:1 -:3 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', 'H:1 H:1 H:1 H:1 H:1 H:1 H:1 H:1',
      ],
    },
  },
  // Night circuits: D dorian, a little mysterious, never scary; same shape of phrase as the day tune.
  'race-night': {
    bpm: 138, key: 'D', scale: 'dorian', mood: 'Stelle, lampioni, un mistero allegro',
    layers: {
      bass: [
        'D2:1 D2:1 D3:1 D2:1 A2:2 D2:1 -:1', 'D2:1 D2:1 D3:1 D2:1 A2:2 D2:1 -:1',
        'G2:1 G2:1 G3:1 G2:1 D3:2 G2:1 -:1', 'C3:1 C3:1 C2:1 C3:1 G2:2 C3:1 -:1',
        'D2:1 D2:1 D3:1 D2:1 A2:2 D2:1 -:1', 'D2:1 D2:1 D3:1 D2:1 A2:2 D2:1 -:1',
        'G2:1 G2:1 G3:1 G2:1 D3:2 G2:1 -:1', 'C3:1 C3:1 C2:1 C3:1 G2:2 C3:1 -:1',
        'F2:1 -:1 F3:1 -:1 C3:2 -:2', 'F2:1 -:1 F3:1 -:1 C3:2 -:2',
        'C3:1 -:1 C2:1 -:1 G2:2 -:2', 'G2:1 -:1 G3:1 -:1 D3:2 -:2',
        'D2:1 D2:1 D3:1 D2:1 A2:2 D2:1 -:1', 'G2:1 G2:1 G3:1 G2:1 D3:2 G2:1 -:1',
        'A2:1 A2:1 A3:1 A2:1 E3:2 A2:1 -:1', 'D2:1 D2:1 D3:1 D2:1 A2:2 D2:1 -:1',
      ],
      lead: [
        'A5:2 F5:2 D5:2 -:2', 'E5:2 F5:2 A5:3 -:1',
        'B5:2 G5:2 D5:2 -:2', 'E5:4 -:4',
        'A5:2 F5:2 D5:2 -:2', 'E5:2 F5:2 A5:3 -:1',
        'B5:2 A5:2 G5:2 F5:2', 'D5:2 E5:2 F5:4',
        'C6:3 -:1 B5:2 G5:2', 'A5:4 -:4',
        'F5:2 A5:2 C6:2 -:2', 'B5:2 A5:2 G5:4',
        'A5:2 F5:2 D5:2 -:2', 'E5:2 F5:2 A5:3 -:1',
        'B5:2 A5:2 F5:2 E5:2', 'F5:2 E5:2 D5:4',
      ],
      arp: [
        'D5:1 F5:1 A5:2 -:1 F5:1 D5:1 -:1', 'D5:1 F5:1 A5:2 -:1 F5:1 D5:1 -:1',
        'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1', 'C5:1 E5:1 G5:2 -:1 E5:1 C5:1 -:1',
        'D5:1 F5:1 A5:2 -:1 F5:1 D5:1 -:1', 'D5:1 F5:1 A5:2 -:1 F5:1 D5:1 -:1',
        'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1', 'C5:1 E5:1 G5:2 -:1 E5:1 C5:1 -:1',
        'F5:1 -:1 C6:2 -:1 A5:1 -:2', 'F5:1 -:1 C6:2 -:1 A5:1 -:2',
        'C5:1 -:1 G5:2 -:1 E5:1 -:2', 'G4:1 -:1 D5:2 -:1 B4:1 -:2',
        'D5:1 F5:1 A5:2 -:1 F5:1 D5:1 -:1', 'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1',
        'A4:1 C5:1 E5:2 -:1 C5:1 A4:1 -:1', 'D5:1 F5:1 A5:2 -:1 F5:1 D5:1 -:1',
      ],
      drums: [
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 -:1 S:1 -:1 K:1 K:1 S:1 -:1',
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 -:1 S:1 S:1 K:1 S:1 S:1 S:1',
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 -:1 S:1 -:1 K:1 K:1 S:1 -:1',
        'K:1 H:1 S:1 H:1 K:1 H:1 S:1 H:1', 'K:1 -:1 S:1 S:1 K:1 S:1 S:1 S:1',
        'K:2 -:6', '-:4 S:2 -:2',
        'K:2 -:2 S:2 -:2', 'K:1 -:1 S:1 -:1 K:1 K:1 S:1 S:1',
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 H:1 S:1 H:1 K:1 H:1 S:1 H:1',
        'K:1 -:1 S:1 -:1 K:1 K:1 S:1 -:1', 'K:1 -:1 S:1 S:1 K:1 S:1 S:1 S:1',
      ],
      hat: [
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:3 H:1 -:3 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:3 H:1 -:3 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', 'H:1 H:1 H:1 H:1 H:1 H:1 H:1 H:1',
        '-:8', '-:8',
        '-:3 H:1 -:3 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', 'H:1 H:1 H:1 H:1 H:1 H:1 H:1 H:1',
      ],
    },
  },
  // Dirt and dust (Crete, Increa, Magra): G mixolydian with a surf swagger, dotted rhythms in the tune.
  'race-dust': {
    bpm: 150, key: 'G', scale: 'mixolydian', mood: 'Polvere, strade bianche, surf',
    layers: {
      bass: [
        'G2:1 G2:1 G3:1 G2:1 D3:2 G2:1 -:1', 'G2:1 G2:1 G3:1 G2:1 D3:2 G2:1 -:1',
        'C2:1 C2:1 C3:1 C2:1 G2:2 C2:1 -:1', 'F2:1 F2:1 F3:1 F2:1 C3:2 F2:1 -:1',
        'G2:1 G2:1 G3:1 G2:1 D3:2 G2:1 -:1', 'G2:1 G2:1 G3:1 G2:1 D3:2 G2:1 -:1',
        'C2:1 C2:1 C3:1 C2:1 G2:2 C2:1 -:1', 'F2:1 F2:1 F3:1 F2:1 C3:2 F2:1 -:1',
        'D2:1 -:1 D3:1 -:1 A2:2 -:2', 'D2:1 -:1 D3:1 -:1 A2:2 -:2',
        'C2:1 -:1 C3:1 -:1 G2:2 -:2', 'F2:1 -:1 F3:1 -:1 C3:2 -:2',
        'G2:1 G2:1 G3:1 G2:1 D3:2 G2:1 -:1', 'C2:1 C2:1 C3:1 C2:1 G2:2 C2:1 -:1',
        'F2:1 F2:1 F3:1 F2:1 C3:2 F2:1 -:1', 'G2:1 G2:1 G3:1 G2:1 D3:2 G2:1 -:1',
      ],
      lead: [
        'B5:3 A5:1 G5:2 -:2', 'D5:2 E5:2 G5:3 -:1',
        'C6:3 B5:1 G5:2 -:2', 'E5:4 -:4',
        'B5:3 A5:1 G5:2 -:2', 'D5:2 E5:2 G5:3 -:1',
        'C6:2 B5:2 A5:2 G5:2', 'E5:2 D5:2 E5:4',
        'F5:3 -:1 E5:2 C5:2', 'D5:4 -:4',
        'C6:2 A5:2 F5:2 -:2', 'E5:2 D5:2 C5:4',
        'B5:3 A5:1 G5:2 -:2', 'D5:2 E5:2 G5:3 -:1',
        'A5:2 B5:2 C6:2 A5:2', 'B5:2 A5:2 G5:4',
      ],
      arp: [
        'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1', 'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1',
        'C5:1 E5:1 G5:2 -:1 E5:1 C5:1 -:1', 'F5:1 A5:1 C6:2 -:1 A5:1 F5:1 -:1',
        'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1', 'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1',
        'C5:1 E5:1 G5:2 -:1 E5:1 C5:1 -:1', 'F5:1 A5:1 C6:2 -:1 A5:1 F5:1 -:1',
        'D5:1 -:1 A5:2 -:1 F5:1 -:2', 'D5:1 -:1 A5:2 -:1 F5:1 -:2',
        'C5:1 -:1 G5:2 -:1 E5:1 -:2', 'F5:1 -:1 C6:2 -:1 A5:1 -:2',
        'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1', 'C5:1 E5:1 G5:2 -:1 E5:1 C5:1 -:1',
        'F5:1 A5:1 C6:2 -:1 A5:1 F5:1 -:1', 'G4:1 B4:1 D5:2 -:1 B4:1 G4:1 -:1',
      ],
      drums: [
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 -:1 S:1 -:1 K:1 K:1 S:1 -:1',
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 -:1 S:1 S:1 K:1 S:1 S:1 S:1',
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 -:1 S:1 -:1 K:1 K:1 S:1 -:1',
        'K:1 H:1 S:1 H:1 K:1 H:1 S:1 H:1', 'K:1 -:1 S:1 S:1 K:1 S:1 S:1 S:1',
        'K:2 -:6', '-:4 S:2 -:2',
        'K:2 -:2 S:2 -:2', 'K:1 -:1 S:1 -:1 K:1 K:1 S:1 S:1',
        'K:1 -:1 S:1 -:1 K:1 -:1 S:1 -:1', 'K:1 H:1 S:1 H:1 K:1 H:1 S:1 H:1',
        'K:1 -:1 S:1 -:1 K:1 K:1 S:1 -:1', 'K:1 -:1 S:1 S:1 K:1 S:1 S:1 S:1',
      ],
      hat: [
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:3 H:1 -:3 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:3 H:1 -:3 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', 'H:1 H:1 H:1 H:1 H:1 H:1 H:1 H:1',
        '-:8', '-:8',
        '-:3 H:1 -:3 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', '-:2 H:1 H:1 -:2 H:1 H:1',
        '-:1 H:1 -:1 H:1 -:1 H:1 -:1 H:1', 'H:1 H:1 H:1 H:1 H:1 H:1 H:1 H:1',
      ],
    },
  },
  // Menus: the same motif, slowed down and stripped to two notes at a time, with a bar of tune and a bar of
  // quiet. A child stays on this screen for minutes on end, so it has to be furniture, not a performance.
  menu: {
    bpm: 112, key: 'C', scale: 'major', mood: 'Garage, si sceglie con calma',
    layers: {
      bass: [
        'C2:4 G2:2 -:2', 'C2:4 E2:2 -:2',
        'A2:4 E2:2 -:2', 'A2:4 C3:2 -:2',
        'C2:4 G2:2 -:2', 'C2:4 E2:2 -:2',
        'F2:4 C3:2 -:2', 'F2:4 A2:2 -:2',
        'D2:4 -:4', 'D2:4 -:4',
        'G2:4 -:4', 'G2:4 -:4',
        'C2:4 G2:2 -:2', 'A2:4 E2:2 -:2',
        'F2:4 G2:2 -:2', 'C2:4 C3:2 -:2',
      ],
      lead: [
        'E5:2 G5:2 -:4', 'C5:4 -:4',
        'F5:2 A5:2 -:4', 'G5:4 -:4',
        'E5:2 G5:2 -:4', 'C5:4 -:4',
        'A5:2 G5:2 -:4', 'E5:4 -:4',
        'A5:2 C6:2 -:4', 'B5:4 -:4',
        'F5:2 E5:2 -:4', 'D5:4 -:4',
        'E5:2 G5:2 -:4', 'C5:4 -:4',
        'D5:2 E5:2 -:4', 'C5:4 -:4',
      ],
      drums: [
        '-:2 H:2 -:2 H:2', '-:2 H:2 -:4',
        '-:2 H:2 -:2 H:2', '-:2 H:2 -:2 H:1 H:1',
        '-:2 H:2 -:2 H:2', '-:2 H:2 -:4',
        '-:2 H:1 H:1 -:2 H:2', '-:2 H:2 -:2 H:1 H:1',
        '-:8', '-:8',
        '-:2 H:2 -:4', '-:2 H:1 H:1 -:2 H:2',
        '-:2 H:2 -:2 H:2', '-:2 H:2 -:4',
        '-:2 H:2 -:2 H:2', '-:2 H:2 -:2 H:1 H:1',
      ],
    },
  },
};

/** Which loop a circuit gets: stars → night, dust → dirt, otherwise the day tune. */
export function musicForTheme(theme = {}) {
  if (theme.stars) return 'race-night';
  if (theme.dust) return 'race-dust';
  return 'race-day';
}
