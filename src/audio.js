/**
 * Sound engine: one AudioContext (created on the first user gesture), a master bus with a compressor, a music bus
 * behind a low-pass filter (closed while paused) and an effects bus. The music is a chiptune sequencer that plays
 * the loops of music-tracks.js with a look-ahead scheduler, so a slow frame never makes it stutter.
 * Three modes, saved in localStorage: 'all' (music and effects), 'sfx' (effects only), 'off'.
 */
import { MUSIC, expandLayer, midiToFrequency } from './music-tracks.js';

export const AUDIO_MODES = ['all', 'sfx', 'off'];
export const AUDIO_STORAGE_KEY = 'brick-racers:audio';
export const AUDIO_MODE_LABELS = { all: 'Musica e effetti', sfx: 'Solo effetti', off: 'Silenzio' };
const LOOKAHEAD_S = 0.12, TICK_MS = 25;
// How each layer sounds: wave, gain, and the voice's own envelope.
const VOICES = {
  bass: { type: 'triangle', gain: 0.26, attack: 0.008, release: 0.05, sustain: 0.9 },
  lead: { type: 'square', gain: 0.13, attack: 0.006, release: 0.06, sustain: 0.55 },
  arp: { type: 'sawtooth', gain: 0.07, attack: 0.004, release: 0.04, sustain: 0.5, lowpass: 2200 },
};

export function loadAudioMode(storage) {
  try { const saved = storage?.getItem?.(AUDIO_STORAGE_KEY); if (AUDIO_MODES.includes(saved)) return saved; } catch { /* storage may be disabled */ }
  return 'all';
}
export function nextAudioMode(mode) { return AUDIO_MODES[(AUDIO_MODES.indexOf(mode) + 1) % AUDIO_MODES.length]; }

export function createAudio({ storage = null, tracks = MUSIC } = {}) {
  let ctx = null, master = null, musicBus = null, musicFilter = null, sfxBus = null, noise = null;
  let mode = loadAudioMode(storage);
  let current = null; // { id, track, slots: { layer: [...] }, step, nextTime, timer, bpm }
  const layers = new Set(['bass', 'drums', 'lead']);
  let paused = false, tempoScale = 1;

  const supported = typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  function ensure() {
    if (!supported) return null;
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -14; compressor.knee.value = 12; compressor.ratio.value = 4; compressor.attack.value = 0.004; compressor.release.value = 0.12;
      master.connect(compressor); compressor.connect(ctx.destination);
      musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 18000;
      musicBus = ctx.createGain(); musicBus.connect(musicFilter); musicFilter.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      applyMode();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {}); // retried on the next gesture
    return ctx;
  }
  function applyMode() {
    if (!ctx) return;
    master.gain.value = mode === 'off' ? 0 : 0.7;
    musicBus.gain.value = mode === 'all' ? (paused ? 0.14 : 0.5) : 0;
  }

  /** A single tone on the effects bus: the game's classic beeps (menu clicks, bonuses, hits). */
  function tone(frequency = 440, duration = 0.12, type = 'sine', volume = 0.06, at = 0) {
    if (mode === 'off') return;
    try {
      const context = ensure(); if (!context) return;
      const start = context.currentTime + at;
      const osc = context.createOscillator(), gain = context.createGain();
      osc.type = type; osc.frequency.setValueAtTime(frequency, start);
      // Effects were mixed at 0.02–0.09 straight into the destination: on the bus they sit about 1.6× louder.
      gain.gain.setValueAtTime(Math.min(0.5, volume * 2.5), start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.connect(gain); gain.connect(sfxBus); osc.start(start); osc.stop(start + duration + 0.02);
    } catch { /* audio is optional */ }
  }

  function noiseBuffer(context) {
    if (noise) return noise;
    noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return noise;
  }
  function drum(hit, time) {
    const context = ctx;
    if (hit === 'K') {
      const osc = context.createOscillator(), gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time); osc.frequency.exponentialRampToValueAtTime(48, time + 0.12);
      gain.gain.setValueAtTime(0.55, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      osc.connect(gain); gain.connect(musicBus); osc.start(time); osc.stop(time + 0.18);
      return;
    }
    const source = context.createBufferSource(); source.buffer = noiseBuffer(context);
    const filter = context.createBiquadFilter(), gain = context.createGain();
    if (hit === 'S') { filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = 0.8; gain.gain.setValueAtTime(0.3, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13); }
    else { filter.type = 'highpass'; filter.frequency.value = 6500; gain.gain.setValueAtTime(0.16, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045); }
    source.connect(filter); filter.connect(gain); gain.connect(musicBus);
    source.start(time); source.stop(time + 0.15);
  }
  function voice(layer, midi, time, seconds) {
    const spec = VOICES[layer] || VOICES.lead;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = spec.type; osc.frequency.value = midiToFrequency(midi);
    const hold = Math.max(0.03, seconds - spec.release);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(spec.gain, time + spec.attack);
    gain.gain.setTargetAtTime(spec.gain * spec.sustain, time + spec.attack, 0.05);
    gain.gain.setValueAtTime(spec.gain * spec.sustain, time + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + hold + spec.release);
    let tail = gain;
    if (spec.lowpass) { const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = spec.lowpass; gain.connect(filter); tail = filter; }
    osc.connect(gain); tail.connect(musicBus);
    osc.start(time); osc.stop(time + hold + spec.release + 0.02);
  }

  function schedule() {
    if (!current || !ctx) return;
    const eighth = 60 / (current.bpm * tempoScale) / 2;
    while (current.nextTime < ctx.currentTime + LOOKAHEAD_S) {
      const step = current.step % current.length;
      for (const [layer, slots] of Object.entries(current.slots)) {
        if (!layers.has(layer)) continue;
        const note = slots[step];
        if (!note) continue;
        if (layer === 'drums' || layer === 'hat') drum(note.pitch, current.nextTime);
        else voice(layer, note.midi, current.nextTime, note.length * eighth * 0.92);
      }
      current.step += 1;
      current.nextTime += eighth;
    }
  }

  function startMusic(id) {
    const track = tracks[id];
    if (!track) return false;
    if (current?.id === id) return true;
    stopMusic();
    const context = ensure(); if (!context) return false;
    const slots = Object.fromEntries(Object.entries(track.layers).map(([layer, bars]) => [layer, expandLayer(bars)]));
    current = { id, track, slots, length: Object.values(slots)[0].length, step: 0, nextTime: context.currentTime + 0.05, bpm: track.bpm, timer: 0 };
    current.timer = setInterval(schedule, TICK_MS);
    schedule();
    return true;
  }
  function stopMusic() {
    if (!current) return;
    clearInterval(current.timer);
    current = null;
  }

  return {
    get mode() { return mode; },
    get playing() { return current?.id || null; },
    get context() { return ctx; },
    tone,
    /** Named effects that a few places share; everything else keeps calling tone() with its own numbers. */
    sfx(name) {
      const table = {
        finish: [[523, 0.2], [659, 0.2, 'sine', 0.06, 0.18], [784, 0.4, 'sine', 0.06, 0.36]],
        podium: [[523, 0.2], [784, 0.3, 'sine', 0.06, 0.2], [1046, 0.5, 'sine', 0.06, 0.42]],
        on: [[440, 0.12]],
      };
      for (const args of table[name] || []) tone(...args);
    },
    startMusic,
    stopMusic,
    /** Mixing choices that follow the race: `boost` adds the arpeggio, `lastLap` doubles the hats and lifts the tempo 5%. */
    setIntensity({ boost = false, lastLap = false } = {}) {
      if (boost) layers.add('arp'); else layers.delete('arp');
      if (lastLap) layers.add('hat'); else layers.delete('hat');
      tempoScale = lastLap ? 1.05 : 1;
    },
    /** Paused: the music goes behind a closed door (low-pass at 600 Hz, quieter). */
    setPaused(on) {
      paused = !!on;
      if (!ctx) return;
      const now = ctx.currentTime;
      musicFilter.frequency.cancelScheduledValues(now);
      musicFilter.frequency.setTargetAtTime(paused ? 600 : 18000, now, 0.08);
      if (mode === 'all') { musicBus.gain.cancelScheduledValues(now); musicBus.gain.setTargetAtTime(paused ? 0.14 : 0.5, now, 0.08); }
    },
    /** A hit on a player: the music dips for a moment so the crash is heard. */
    duck(amount = 0.45, seconds = 0.18) {
      if (!ctx || mode !== 'all' || paused) return;
      const now = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setValueAtTime(0.5 * (1 - amount), now);
      musicBus.gain.setTargetAtTime(0.5, now + seconds, 0.1);
    },
    setMode(next) {
      if (!AUDIO_MODES.includes(next)) return mode;
      mode = next;
      try { storage?.setItem?.(AUDIO_STORAGE_KEY, mode); } catch { /* optional */ }
      if (mode === 'off') stopMusic();
      applyMode();
      return mode;
    },
    cycleMode() { return this.setMode(nextAudioMode(mode)); },
    /** Development helper: listen to a loop from the console without starting a race. */
    preview(id) { return startMusic(id); },
    unlock() { ensure(); },
    dispose() { stopMusic(); ctx?.close?.(); ctx = null; },
  };
}
