/**
 * GameRenderer methods. Hit effects: brick debris, flashes, fireballs and camera shake, driven by the race events.
 * Plain methods on `this`, attached to GameRenderer.prototype in renderer.js; moved here unchanged.
 */
import * as THREE from 'three';
import { ROAD_Y, JELLY_COLOR, CANDY_COLORS, OBSTACLE_DEBRIS, material, worldPoint } from './common.js';

export const effectsMethods = {
  effectMaterial(color) {
    this.effectMaterials ||= new Map();
    const key = String(color);
    if (!this.effectMaterials.has(key)) this.effectMaterials.set(key, material(new THREE.Color(color), { roughness: 0.5 }));
    return this.effectMaterials.get(key);
  },

  /** Reacts to the simulation events main.js drained this frame (hits, shield hits, bomb pops). */
  handleEvents(events, race) {
    this.effects ||= [];
    this.shake ||= [0, 0];
    for (const event of events) {
      if (event.type === 'hit' || event.type === 'shield-hit') {
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model || !racer) continue;
        const position = model.root.position.clone();
        position.y += 0.7;
        if (event.type === 'shield-hit') this.spawnFlash(position, 0x37d5f2, 2.4, 0.35);
        else {
          const palette = racer.spec?.palette?.length ? racer.spec.palette : [racer.spec?.color || '#ff6a00', racer.spec?.accent || '#ffe600'];
          // The more battered the car, the more of it flies off: the third hit is the one that takes it apart.
          const wear = 1 + (event.damage || 0) * 0.3;
          // A sweet from the machine gun scatters sweets, not bricks — unless it is the hit that takes the car apart.
          const candy = event.source === 'bullet' && (event.damage || 0) < 3;
          const colours = candy ? CANDY_COLORS.map((hex) => `#${hex.toString(16).padStart(6, '0')}`) : palette;
          this.spawnExplosion(position, colours, (event.source === 'bullet' ? 0.45 : 1) * wear);
        }
        if (racer.isPlayer) this.shake[racer.playerIndex] = Math.max(this.shake[racer.playerIndex], event.source === 'bullet' ? 0.3 : event.type === 'shield-hit' ? 0.35 : 0.85);
      } else if (event.type === 'pop') {
        const position = worldPoint(this.track, event.distance, event.lane, ROAD_Y + 0.6);
        if (event.source === 'jelly') this.spawnFlash(position, JELLY_COLOR, 2.2, 0.3);
        else if (event.source === 'oil') this.spawnFlash(position, 0x3a4450, 1.8, 0.24);
        // A sweet from the machine gun bursting on a column: five a second, so a pop of colour rather than a fireball.
        else if (event.source === 'bullet') this.spawnFlash(position, CANDY_COLORS[Math.floor(event.distance) % CANDY_COLORS.length], 1.2, 0.14);
        else this.spawnExplosion(position, ['#ff6a00', '#ffe600', '#e5203a', '#15161c'], 1.4);
      } else if (event.type === 'land' && event.impact > 3.2) {
        // Touchdown: a puff off the tyres where the car hits, and a nudge of the camera for whoever is driving.
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model) continue;
        const position = model.root.position.clone();
        this.spawnExplosion(position, ['#e8e4d8', '#b7b1a5'], Math.min(1, event.impact / 14) * (event.bounce ? 0.5 : 0.3));
        if (racer?.isPlayer) this.shake[racer.playerIndex] = Math.max(this.shake[racer.playerIndex], Math.min(0.5, event.impact / 30));
      } else if (event.type === 'car-bump') {
        // Two cars knocking together: a white flash and a few bits of the two cars where they touched, and a shake for
        // a pilot in it.
        const position = worldPoint(this.track, event.distance, event.lane, ROAD_Y + 0.8);
        this.spawnFlash(position, 0xffffff, 2, 0.18);
        const colours = event.racerIds.map((id) => race?.racers?.find((r) => r.id === id)?.spec?.color).filter(Boolean);
        this.spawnExplosion(position, colours.length ? colours : ['#d8d4c8'], 0.4);
        for (const id of event.racerIds) {
          const racer = race?.racers?.find((r) => r.id === id);
          if (racer?.isPlayer) this.shake[racer.playerIndex] = Math.max(this.shake[racer.playerIndex], 0.35);
        }
      } else if (event.type === 'bump' || event.type === 'creamed') {
        // Running into something solid, or taking a scoop on the windscreen: a puff where it happened, and a
        // shake for the child it happened to. No fireball — nothing has broken.
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model) continue;
        const position = model.root.position.clone();
        position.y += 0.7;
        if (event.type === 'creamed') {
          this.spawnFlash(position, 0xfff1e0, 2.4, 0.3);
          this.spawnExplosion(position, ['#fff1e0', '#f7a8c0', '#8fd9a8'], 0.6);
        } else this.spawnExplosion(position, event.source === 'bale' ? ['#e0c070', '#c9a44e'] : ['#d8d4c8', '#8d9299'], event.soft ? 0.5 : 0.9);
        if (racer?.isPlayer) this.shake[racer.playerIndex] = Math.max(this.shake[racer.playerIndex], event.soft === false ? 0.7 : 0.35);
      } else if (event.type === 'stuck') {
        // Glued by a jelly: a green splash of bricks around the car.
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model) continue;
        const position = model.root.position.clone();
        position.y += 0.7;
        this.spawnFlash(position, JELLY_COLOR, 2, 0.3);
        this.spawnExplosion(position, ['#5be03a', '#2fd36f', '#ffe600'], 0.6);
        if (racer?.isPlayer) this.shake[racer.playerIndex] = Math.max(this.shake[racer.playerIndex], 0.4);
      } else if (event.type === 'obstacle-break' || event.type === 'obstacle-back') {
        // A prop blown up throws its own colours about; one flattened by a bale only puffs straw and dust; one
        // growing back gets a small white pop so the eye catches it.
        const position = worldPoint(this.track, event.distance, event.lane, ROAD_Y + 0.8);
        if (event.type === 'obstacle-back') this.spawnFlash(position, 0xfff6d5, 2.2, 0.25);
        else if (event.squash) this.spawnExplosion(position, ['#e0c070', '#c9a44e', '#b7b1a5'], 0.7);
        else {
          this.spawnExplosion(position, OBSTACLE_DEBRIS[event.kind] || ['#d8d4c8', '#8d9299'], 1.3);
          this.spawnFlash(position, 0xffb03a, 3.6, 0.32);
        }
      } else if (event.type === 'critter-hit' || event.type === 'critter-up') {
        // An animal bowled over: a puff of dust and a white flash where the shot met it, no fire and no bricks —
        // nothing breaks. Getting back up gets a small pop of its own, like a prop growing back.
        const position = worldPoint(this.track, event.distance, event.lane, ROAD_Y + 0.8);
        if (event.type === 'critter-up') this.spawnFlash(position, 0xfff6d5, 1.8, 0.2);
        else {
          this.spawnFlash(position, 0xffffff, 2.6, 0.24);
          this.spawnExplosion(position, ['#e8e4d8', '#c9bfa8', '#fff6d5'], 0.7);
        }
      } else if (['squashed', 'unsquashed', 'attacked', 'released', 'rainbow-block', 'critter-scared'].includes(event.type)) {
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model) continue;
        const position = model.root.position.clone();
        position.y += 0.7;
        if (event.type === 'squashed') this.spawnExplosion(position, ['#e0c070', '#c9a44e'], 0.8);
        else if (event.type === 'unsquashed') this.spawnFlash(position, 0xfff6d5, 2.4, 0.22);
        else if (event.type === 'attacked') this.spawnExplosion(position, ['#e8e4d8', '#8a7a52', '#4a3a2e'], 0.7);
        else if (event.type === 'released') this.spawnFlash(position, 0xe8e4d8, 2, 0.2);
        else {
          // Something burst against the rainbow, or an animal ran off from it: a flash in whatever colour it is now.
          const colour = new THREE.Color().setHSL((this.clock * 1.4) % 1, 1, 0.6);
          this.spawnFlash(position, colour.getHex(), event.type === 'rainbow-block' ? 3.2 : 2.2, 0.28);
        }
        const shake = { squashed: 0.7, attacked: 0.8, 'rainbow-block': 0.25 }[event.type];
        if (racer?.isPlayer && shake) this.shake[racer.playerIndex] = Math.max(this.shake[racer.playerIndex], shake);
      } else if (event.type === 'wreck' || event.type === 'respawn') {
        // Third hit: the whole car comes apart in a cartoon fireball. A second later it is dropped back, brand new.
        const model = this.racerModels.get(event.racerId);
        const racer = race?.racers?.find((entry) => entry.id === event.racerId);
        if (!model) continue;
        const position = model.root.position.clone();
        position.y += 0.7;
        if (event.type === 'respawn') this.spawnFlash(position, 0xfff6d5, 4.2, 0.32);
        else {
          const palette = racer?.spec?.palette?.length ? racer.spec.palette : [racer?.spec?.color || '#ff6a00', racer?.spec?.accent || '#ffe600'];
          this.spawnExplosion(position, palette, 2.2);
          this.spawnFlash(position, 0xffb03a, 5.4, 0.5);
          if (racer?.isPlayer) this.shake[racer.playerIndex] = 1.3;
        }
      }
    }
  },

  /** A lick of cartoon flame: used while a wrecked car burns, a few per second so it flickers. */
  spawnFlame(position) {
    const spread = () => (this._windRandom ? this._windRandom() : Math.random()) - 0.5;
    const flame = position.clone().add(new THREE.Vector3(spread() * 1.6, 0.3 + Math.abs(spread()) * 1.4, spread() * 1.6));
    this.spawnFlash(flame, Math.abs(spread()) > 0.25 ? 0xff8a1e : 0xffd94a, 1.5 + Math.abs(spread()) * 2, 0.26);
  },

  spawnFlash(position, color, size, life) {
    this.effects ||= []; // Flames can start before the first event batch is drained.
    const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    flash.position.copy(position);
    flash.scale.setScalar(size * 0.3);
    flash.userData = { kind: 'flash', life, maxLife: life, size };
    flash.castShadow = false;
    this.scene.add(flash);
    this.effects.push(flash);
  },

  spawnExplosion(position, palette, scale = 1) {
    this.debrisGeometry ||= new THREE.BoxGeometry(0.34, 0.16, 0.22);
    this.puffGeometry ||= new THREE.SphereGeometry(0.5, 10, 7);
    this.spawnFlash(position, 0xffa030, 2.6 * scale, 0.28);
    const count = Math.round(12 * scale);
    for (let i = 0; i < count; i += 1) {
      const piece = new THREE.Mesh(this.debrisGeometry, this.effectMaterial(palette[i % palette.length]));
      piece.position.copy(position);
      const angle = Math.random() * Math.PI * 2, speed = (3.5 + Math.random() * 6) * scale;
      piece.userData = {
        kind: 'debris', life: 1.1 + Math.random() * 0.6,
        velocity: new THREE.Vector3(Math.cos(angle) * speed, 5 + Math.random() * 6 * scale, Math.sin(angle) * speed),
        spin: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14),
      };
      piece.scale.setScalar(0.7 + Math.random() * 0.7 * scale);
      this.scene.add(piece);
      this.effects.push(piece);
    }
    for (let i = 0; i < Math.round(5 * scale); i += 1) {
      const puff = new THREE.Mesh(this.puffGeometry, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x3a3f4a : 0x6b7080, transparent: true, opacity: 0.55, depthWrite: false }));
      puff.position.copy(position).add(new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 0.6, (Math.random() - 0.5) * 1.2));
      puff.userData = { kind: 'smoke', life: 1.2, maxLife: 1.2, velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 2 + Math.random() * 1.5, (Math.random() - 0.5) * 1.5) };
      puff.scale.setScalar(0.5 * scale);
      puff.castShadow = false;
      this.scene.add(puff);
      this.effects.push(puff);
    }
  },

  updateEffects(step) {
    if (!this.effects?.length) return;
    const groundAt = (x, z) => (this.track?.groundHeight ? this.track.groundHeight(x, z) : 0);
    this.effects = this.effects.filter((object) => {
      const data = object.userData;
      data.life -= step;
      if (data.life <= 0) {
        this.scene.remove(object);
        if (data.kind !== 'debris') { object.material.dispose(); object.geometry.dispose(); }
        return false;
      }
      if (data.kind === 'debris') {
        data.velocity.y -= 18 * step;
        object.position.addScaledVector(data.velocity, step);
        object.rotation.x += data.spin.x * step;
        object.rotation.y += data.spin.y * step;
        object.rotation.z += data.spin.z * step;
        const floor = groundAt(object.position.x, object.position.z) + 0.1;
        if (object.position.y < floor) { object.position.y = floor; data.velocity.y *= -0.35; data.velocity.x *= 0.6; data.velocity.z *= 0.6; data.spin.multiplyScalar(0.5); }
        if (data.life < 0.3) object.scale.multiplyScalar(0.9);
      } else if (data.kind === 'smoke') {
        object.position.addScaledVector(data.velocity, step);
        object.scale.addScalar(step * 1.6);
        object.material.opacity = 0.55 * data.life / data.maxLife;
      } else {
        const t = 1 - data.life / data.maxLife;
        object.scale.setScalar(data.size * (0.3 + t * 0.7));
        object.material.opacity = 0.9 * (1 - t);
      }
      return true;
    });
  },
};
