/**
 * GameRenderer methods. Weather and sky: rain and snow, clouds, mist, the sun moving, trees in the wind.
 * Plain methods on `this`, attached to GameRenderer.prototype in renderer.js; moved here unchanged.
 */
import * as THREE from 'three';
import { weatherIndex } from '../track.js';

export const atmosphereMethods = {
  /** The weather entry a circuit is on, given the lap the leading player is running. */
  weatherEntry(index) {
    const list = this.track?.theme?.weather;
    return list?.length ? list[((index % list.length) + list.length) % list.length] : null;
  },

  /** Falling rain: short vertical streaks in a box that travels with the players. */
  buildRain() {
    if (this.rain) return this.rain;
    const drops = 1400, positions = new Float32Array(drops * 6);
    this.rainSpan = { x: 170, y: 46, z: 170 };
    for (let i = 0; i < drops; i++) {
      const x = (Math.random() - 0.5) * this.rainSpan.x, y = Math.random() * this.rainSpan.y, z = (Math.random() - 0.5) * this.rainSpan.z;
      positions.set([x, y, z, x, y - 0.9, z], i * 6);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xd4e4ef, transparent: true, opacity: 0 }));
    this.rain.name = 'rain';
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.scene.add(this.rain);
    return this.rain;
  },

  /**
   * Circuits with `theme.weather` change sky, fog, light and rain once per lap, cycling through the list and
   * crossfading over a couple of seconds instead of snapping. Everything else keeps its single fixed weather.
   */
  updateWeather(step, race) {
    const list = this.track?.theme?.weather;
    if (!list?.length) { if (this.rain) this.rain.visible = false; return; }
    const lap = Math.max(...(race?.racers || []).filter((r) => r.isPlayer).map((r) => r.lap || 1), 1);
    if (this.weatherLap !== lap) {
      this.weatherLap = lap;
      this.weatherFrom = this.weatherTo ?? this.weatherEntry(0);
      this.weatherTo = this.weatherEntry(weatherIndex(this.track.theme, lap, race?.totalLaps || 1));
      this.weatherMix = this.weatherFrom === this.weatherTo ? 1 : 0;
    }
    const from = this.weatherFrom ?? list[0], to = this.weatherTo ?? list[0];
    this.weatherMix = Math.min(1, (this.weatherMix ?? 1) + step / 2.5);
    const t = this.weatherMix * this.weatherMix * (3 - 2 * this.weatherMix);
    const mix = (a, b) => a + (b - a) * t;
    const scratch = (this.weatherColor ||= new THREE.Color());
    this.scene.background.lerpColors(scratch.setHex(from.sky), new THREE.Color(to.sky), t);
    this.scene.fog.color.lerpColors(scratch.setHex(from.fog), new THREE.Color(to.fog), t);
    this.scene.fog.near = mix(from.fogNear, to.fogNear);
    this.scene.fog.far = mix(from.fogFar, to.fogFar);
    this.sun.color.lerpColors(scratch.setHex(from.sun), new THREE.Color(to.sun), t);
    this.sun.intensity = mix(from.sunIntensity, to.sunIntensity);
    this.lights.hemi.intensity = mix(from.hemiIntensity, to.hemiIntensity);
    this.starLevel = mix(from.stars ?? 1, to.stars ?? 1);
    // Rain: the streaks fall and wrap inside a box kept between the players, so both see the same shower.
    const drops = mix(from.rain || 0, to.rain || 0);
    const rain = drops > 1 ? this.buildRain() : this.rain;
    if (!rain) return;
    rain.visible = drops > 1;
    if (!rain.visible) return;
    rain.material.color.setHex(0xd4e4ef);
    rain.material.opacity = Math.min(0.5, drops / 2600);
    this.moveDrops(rain, step * 26);
  },

  /** Slow rotation and a soft twinkle of the bright stars; no-op on daytime circuits. */
  animateSky(step) {
    if (!this.starLayers) return;
    // `starLevel` comes from the weather (Rome: no stars at sunset, all of them at night); the moon waits for dark.
    const level = this.starLevel ?? 1;
    this.stars.visible = level > 0.02;
    for (const child of this.stars.children) if (!child.isPoints) child.visible = level > 0.6;
    // The whole dome turns slowly, so the moon crosses the sky over a race; the two layers twinkle out of step.
    this.stars.rotation.y += step * 0.012;
    const [faint, bright] = this.starLayers.map((layer) => layer.material);
    bright.opacity = (0.72 + Math.sin(this.clock * 3.1) * 0.24) * level;
    bright.size = 4.2 + Math.sin(this.clock * 2.3) * 0.8;
    faint.opacity = (0.84 + Math.sin(this.clock * 1.7 + 1.1) * 0.12) * level;
    faint.size = 2.1 + Math.sin(this.clock * 1.3) * 0.25;
  },

  /** Low banks of mist drifting over the ground, built once for the circuits that ask for them. */
  buildMist(count) {
    if (this.mist) return this.mist;
    this.mist = new THREE.Group();
    this.mist.name = 'mist';
    const geometry = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < count; i += 1) {
      const bank = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: 0xeef3f7, transparent: true, opacity: 0.24, depthWrite: false, fog: false, side: THREE.DoubleSide,
      }));
      bank.rotation.x = -Math.PI / 2;
      bank.scale.set(120 + i * 22, 90 + i * 14, 1);
      bank.position.set((i * 97) % 340 - 170, 1.8 + (i % 4) * 1.1, (i * 131) % 300 - 150);
      bank.userData.drift = { x: bank.position.x, phase: i * 1.3 };
      bank.castShadow = false;
      bank.renderOrder = 2;
      this.mist.add(bank);
    }
    this.world.add(this.mist);
    return this.mist;
  },

  /**
   * Weather that is not a downpour: the wind that bends the trees and pushes the clouds, the sun travelling
   * from morning to afternoon so every shadow swings round, mountain cloud that rises and falls, drifting
   * mist and the odd snow shower. All of it is optional data on the circuit theme.
   */
  updateAtmosphere(step, race) {
    const theme = this.track?.theme;
    if (!theme) return;
    const wind = theme.wind || 0;
    // Trees: only the crowns lean, and each on its own beat, so a wood never sways as one block.
    if (wind && this.trees) {
      const dummy = (this.swayDummy ||= new THREE.Object3D());
      const { crowns, topCrowns, spots } = this.trees;
      spots.forEach((spot, index) => {
        const bend = Math.sin(this.clock * 1.15 + spot.phase) * 0.06 * wind * spot.size;
        const cross = Math.cos(this.clock * 0.83 + spot.phase) * 0.045 * wind * spot.size;
        dummy.rotation.set(0, spot.phase, 0);
        dummy.position.set(spot.x + bend, spot.base + 4.3 * spot.size, spot.z + cross);
        dummy.scale.set(spot.size, spot.size * 1.07, spot.size);
        dummy.updateMatrix();
        crowns.setMatrixAt(index, dummy.matrix);
        dummy.position.set(spot.x + bend * 1.6, spot.base + 5.9 * spot.size, spot.z + cross * 1.6);
        dummy.scale.set(spot.size * 0.9, spot.size, spot.size * 0.9);
        dummy.updateMatrix();
        topCrowns.setMatrixAt(index, dummy.matrix);
      });
      crowns.instanceMatrix.needsUpdate = true;
      topCrowns.instanceMatrix.needsUpdate = true;
    }
    // Clouds: pushed along by the same wind, and on mountain circuits they also climb and sink.
    if (this.clouds && (wind || theme.cloudRise)) {
      for (const cloud of this.clouds.children) {
        const drift = cloud.userData.drift;
        if (!drift) continue;
        drift.x += step * (3 + wind * 9);
        if (drift.x > 210) drift.x = -210;
        cloud.position.x = drift.x;
        if (theme.cloudRise) cloud.position.y = drift.y + Math.sin(this.clock * 0.12 + drift.phase) * 16 * theme.cloudRise;
      }
    }
    // The sun crosses the sky over the whole race, so the shadows swing from one side to the other.
    if (theme.sunTravel) {
      const total = race ? (race.totalLaps || 1) * (race.trackLength || 1) : 0;
      const done = race ? Math.max(...race.racers.map((r) => r.progress || 0), 0) : 0;
      const through = total ? Math.min(1, done / total) : 0;
      const angle = (-0.5 + through) * (theme.sunTravel * Math.PI / 180);
      this.sun.position.set(Math.sin(angle) * 70 - 10, 62 - Math.abs(through - 0.5) * 22, Math.cos(angle) * 55);
    }
    if (theme.mist) {
      for (const bank of this.buildMist(theme.mist).children) {
        const drift = bank.userData.drift;
        drift.x += step * (2.2 + wind * 5);
        if (drift.x > 210) drift.x = -210;
        bank.position.x = drift.x;
        bank.material.opacity = 0.14 + 0.18 * (0.5 + 0.5 * Math.sin(this.clock * 0.21 + drift.phase));
      }
    }
    // Snow: the same streaks as the rain, falling slowly and coming and going in showers.
    if (theme.snow) {
      const drops = theme.snow * Math.max(0, Math.sin(this.clock * 0.16));   // a shower roughly every forty seconds
      const snow = drops > 1 ? this.buildRain() : this.rain;
      if (snow) {
        snow.visible = drops > 1;
        if (snow.visible) {
          snow.material.color.setHex(0xffffff);
          snow.material.opacity = Math.min(0.75, drops / 900);
          this.moveDrops(snow, step * 3.4, this.clock);
        }
      }
    }
  },

  /** Moves falling streaks down by `fall`, drifting sideways, and recycles the ones that reach the ground. */
  moveDrops(object, fall, clock = 0) {
    const cameras = this.cameras.slice(0, Math.max(1, this.players || 1));
    object.position.set(
      cameras.reduce((sum, c) => sum + c.position.x, 0) / cameras.length, 0,
      cameras.reduce((sum, c) => sum + c.position.z, 0) / cameras.length,
    );
    const array = object.geometry.attributes.position.array;
    const sway = Math.sin(clock * 0.7) * fall * 0.35;
    for (let i = 0; i < array.length; i += 6) {
      array[i + 1] -= fall; array[i + 4] -= fall;
      array[i] += sway; array[i + 3] += sway;
      if (array[i + 4] < 0) {
        const x = (Math.random() - 0.5) * this.rainSpan.x, z = (Math.random() - 0.5) * this.rainSpan.z;
        array[i] = x; array[i + 3] = x; array[i + 2] = z; array[i + 5] = z;
        array[i + 1] = this.rainSpan.y; array[i + 4] = this.rainSpan.y - 0.9;
      }
    }
    object.geometry.attributes.position.needsUpdate = true;
  },
};
