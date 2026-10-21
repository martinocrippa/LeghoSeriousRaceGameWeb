import test from 'node:test';
import assert from 'node:assert/strict';
import { MUSIC, RANGES, BARS_PER_LOOP, EIGHTHS_PER_BAR, noteToMidi, midiToFrequency, parseBar, expandLayer, inScale, musicForTheme } from '../src/music-tracks.js';
import { AUDIO_MODES, loadAudioMode, nextAudioMode } from '../src/audio.js';

test('note names map to MIDI numbers and frequencies', () => {
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('A4'), 69);
  assert.equal(noteToMidi('F#4'), 66);
  assert.equal(noteToMidi('Bb3'), 58);
  assert.equal(noteToMidi('C6'), 84);
  assert.equal(noteToMidi('H4'), null);
  assert.equal(noteToMidi(''), null);
  assert.equal(Math.round(midiToFrequency(69)), 440);
  assert.equal(Math.round(midiToFrequency(60) * 100) / 100, 261.63);
});

test('bars parse into notes, rests and drum hits; wrong lengths and pitches are rejected', () => {
  const notes = parseBar('C5:2 -:1 K:1 G#4:4');
  assert.deepEqual(notes.map((n) => [n.pitch, n.midi, n.length]), [['C5', 72, 2], [null, null, 1], ['K', null, 1], ['G#4', 68, 4]]);
  assert.throws(() => parseBar('C5:0'));
  assert.throws(() => parseBar('X5:1'));
  assert.throws(() => expandLayer(['C5:4 C5:2']));
  const slots = expandLayer(['C5:2 -:2 E5:4', 'K:1 H:1 S:1 H:1 K:1 H:1 S:1 H:1']);
  assert.equal(slots.length, 2 * EIGHTHS_PER_BAR);
  assert.equal(slots[0].pitch, 'C5');
  assert.equal(slots[1], null);
  assert.equal(slots[4].pitch, 'E5');
  assert.equal(slots[8].pitch, 'K');
});

for (const [id, track] of Object.entries(MUSIC)) {
  test(`${id}: sixteen full bars per layer, every note in ${track.key} ${track.scale}, within the range of its voice`, () => {
    assert.ok(track.bpm >= 100 && track.bpm <= 180, 'tempo suits a kids racing game');
    assert.ok(track.layers.bass && track.layers.drums && track.layers.lead, 'bass, drums and lead are the minimum');
    for (const [layer, bars] of Object.entries(track.layers)) {
      // Sixteen, not eight: an eight-bar loop came round every twelve seconds and that is what made the music
      // tiring. Every layer must be the same length, because the sequencer takes the loop length from the first.
      assert.equal(bars.length, BARS_PER_LOOP, `${layer} has sixteen bars`);
      const slots = expandLayer(bars);
      assert.equal(slots.length, BARS_PER_LOOP * EIGHTHS_PER_BAR);
      const range = RANGES[layer];
      for (const note of slots) {
        if (!note || note.midi === null) continue;
        assert.ok(inScale(note.midi, track.key, track.scale), `${id}/${layer}: ${note.pitch} is in ${track.key} ${track.scale}`);
        if (range) assert.ok(note.midi >= noteToMidi(range[0]) && note.midi <= noteToMidi(range[1]), `${id}/${layer}: ${note.pitch} within ${range.join('–')}`);
      }
      if (layer === 'drums' || layer === 'hat') for (const note of slots) if (note) assert.ok(['K', 'S', 'H'].includes(note.pitch));
    }
    // AABA: the tune comes back at bar 5 and again at bar 13 so children can sing it, each time with its own
    // ending, and bars 9-12 go somewhere else. Without that middle section it is one idea on repeat.
    assert.equal(track.layers.lead[4], track.layers.lead[0], 'bar 5 restates bar 1');
    assert.equal(track.layers.lead[12], track.layers.lead[0], 'bar 13 brings the tune home');
    assert.notEqual(track.layers.lead[7], track.layers.lead[3], 'the ending changes');
    const middle = new Set(track.layers.lead.slice(8, 12));
    for (const bar of track.layers.lead.slice(0, 4)) assert.ok(!middle.has(bar), 'the middle section is new material');
    // The tune has to breathe: a lead that never stops is what makes a loop wearing. At least one bar in six is
    // silent, counted in eighths over the whole loop.
    const rests = expandLayer(track.layers.lead).filter((slot) => slot === null).length;
    const sounding = expandLayer(track.layers.lead).filter((slot) => slot !== null);
    const held = sounding.reduce((sum, note) => sum + note.length, 0);
    assert.ok(BARS_PER_LOOP * EIGHTHS_PER_BAR - held >= BARS_PER_LOOP * EIGHTHS_PER_BAR / 6, `${id}: the lead rests (${rests} empty slots, ${held} eighths sounding)`);
    // EVERY layer has to breathe, not just the tune. The first rewrite gave the melody its rests and left the
    // machine running underneath: hi-hat on every single eighth, kick and snare on every beat, the same two bars
    // sixteen times. Over a three-lap race that texture is what wears a room down, more than the melody does.
    for (const [layer, bars] of Object.entries(track.layers)) {
      const slots = expandLayer(bars);
      const held = slots.filter(Boolean).reduce((sum, note) => sum + note.length, 0);
      const silence = BARS_PER_LOOP * EIGHTHS_PER_BAR - held;
      assert.ok(silence >= BARS_PER_LOOP * EIGHTHS_PER_BAR / 10, `${id}/${layer}: deve respirare (${silence} ottavi di silenzio)`);
      assert.ok(new Set(bars).size >= 4, `${id}/${layer}: almeno quattro battute diverse, non una sola ripetuta`);
    }
    // And the middle section is a real drop: fewer drum hits in bars 9-12 than in bars 1-4. A loop with no
    // dynamics is a drum machine left on, however good the tune over it is.
    const hits = (bars) => bars.reduce((count, bar) => count + parseBar(bar).filter((note) => note.pitch).length, 0);
    assert.ok(hits(track.layers.drums.slice(8, 12)) < hits(track.layers.drums.slice(0, 4)) * 0.8,
      `${id}: la sezione centrale deve calare davvero`);

    // Every race loop ends its phrase on the key note.
    if (id !== 'menu') {
      const last = parseBar(track.layers.lead[BARS_PER_LOOP - 1]).filter((n) => n.midi !== null).at(-1);
      assert.equal(last.midi % 12, noteToMidi(`${track.key}0`) % 12, `${id} ends on the key note`);
    }
  });
}

test('circuits pick their loop from the theme; audio modes cycle and load safely', () => {
  assert.equal(musicForTheme({ stars: { count: 100 } }), 'race-night');
  assert.equal(musicForTheme({ dust: 0xffffff }), 'race-dust');
  assert.equal(musicForTheme({}), 'race-day');
  assert.deepEqual(AUDIO_MODES, ['all', 'sfx', 'off']);
  assert.equal(nextAudioMode('all'), 'sfx');
  assert.equal(nextAudioMode('off'), 'all');
  assert.equal(loadAudioMode(null), 'all');
  assert.equal(loadAudioMode({ getItem: () => 'sfx' }), 'sfx');
  assert.equal(loadAudioMode({ getItem: () => 'loud' }), 'all');
  assert.equal(loadAudioMode({ getItem() { throw new Error('blocked'); } }), 'all');
});
