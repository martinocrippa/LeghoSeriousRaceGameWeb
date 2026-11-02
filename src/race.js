import { DEFAULT_TRACK } from './track.js';
import { nextSeed, shuffled } from './random.js';
import { OBSTACLE_REGROW } from './obstacles.js';
import { ATTACK_TIME, CRITTER_CALM, KNOCK_TIME, critterPose, knockSide, knockdown, resumeOffset } from './critters.js';

export const MACHINEGUN_DURATION = 5;
const MACHINEGUN_INTERVAL = 0.2;
/**
 * Expert controls — a hop and a hand-brake slide — appear only from TURBO upward. Two reasons for the gate living
 * here and not only in the menus: a race must stay reproducible from its seed and difficulty alone, and the youngest
 * drivers keep a game with exactly two buttons.
 */
export const EXPERT_DIFFICULTIES = Object.freeze(['fast', 'crazy']);
export const hasExpertControls = (difficulty) => EXPERT_DIFFICULTIES.includes(difficulty);
/** Smaller than a ramp's 8.8 m/s launch: a hop over a banana skin, not a stunt. */
const JUMP_SPEED = 6.2;
const JUMP_COOLDOWN = 0.9;
/** Drifting turns harder and costs a little speed, so it is a choice and not free. */
const DRIFT_STEER = 1.8;
const DRIFT_SPEED = 0.92;
/** How high above the road a shot flies; the same number decides whether it reaches a car. */
const PROJECTILE_HEIGHT = 0.85;
/**
 * Damage, as the children asked for it: bricks fly off at every hit, and the third one sets the car alight, stops it for a
 * second and gives it back new. Nothing worse happens — no lost lap, no lost place: getting hit three times already
 * costs enough, and a six-year-old who is out of the race stops playing.
 */
export const MAX_DAMAGE = 3;
const WRECK_TIME = 1;
const WRECK_IMMUNITY = 1.6;
/**
 * Damage heals after a clean stretch. Without this, three hits over a whole race are simply inevitable and the fire
 * becomes a countdown rather than a consequence — which cost a beginner the podium in the very first test race.
 * Drive clean for this long and one brick goes back on.
 */
const REPAIR_TIME = 12;
/**
 * What comes out of a crate, and how often. Sixteen kinds; after the fireworks the children asked for an
 * ice-cream gun, a throw of three hay bales and the propeller, then for the rainbow, then for a parachute
 * and a hang-glider. Weights must add up to 1, and every new share comes from the items after the machine gun so
 * that every number up to it still opens the same crate as before.
 */
const ITEM_WEIGHTS = Object.freeze([
  ['boost', 0.18], ['rocket', 0.14], ['shield', 0.11], ['bomb', 0.07], ['machinegun', 0.06],
  ['jelly', 0.04], ['oil', 0.04], ['rockets3', 0.04], ['fountain', 0.04], ['spin', 0.04],
  ['gelato', 0.05], ['bales', 0.05], ['propeller', 0.04], ['rainbow', 0.04], ['parachute', 0.03], ['glider', 0.03],
]);
export const ITEM_KINDS = Object.freeze(ITEM_WEIGHTS.map(([id]) => id));
/** Turns one number in [0,1) into a crate's contents. Pure, so the distribution can be tested directly. */
export function pickItem(chance) {
  let cumulative = 0;
  for (const [id, weight] of ITEM_WEIGHTS) {
    cumulative += weight;
    if (chance < cumulative) return id;
  }
  return ITEM_WEIGHTS[ITEM_WEIGHTS.length - 1][0];
}
/** Three rockets leave one after the other, not in a clump. */
const SALVO_GAP = 0.24;
/**
 * The ice-cream gun: three scoops, fast, one after the other. A scoop does no damage — it lands on the windscreen,
 * and for a couple of seconds you drive slowly and the steering goes vague. It is the weapon for the youngest
 * drivers: it always does something and it never takes anybody's car apart.
 */
const CREAM_TIME = 2.6;
const CREAM_SPEED = 0.78;
const CREAM_STEER = 0.55;
const SCOOP_GAP = 0.13;
/**
 * Three hay bales rolling off down the road, each veering into its own lane. They do not wound — they flatten:
 * the car they roll over goes as flat as a biscuit for a second and pops back up, and the bale rolls on.
 */
const BALE_SPEED = 30;
const SQUASH_TIME = 1;
/**
 * The rainbow: for a few seconds the car flashes every colour, goes faster, and nothing can touch it. Whatever it
 * runs into blows up instead — another car (fire, and a new car a second later, as on a third hit) or a prop on
 * the road. Animals it simply frightens off: nobody wants that firework.
 */
const RAINBOW_TIME = 6;
const RAINBOW_SPEED = 1.32;
/**
 * The propeller: for a few seconds the car hangs in the air instead of dropping out of it. Gravity is more than
 * halved and every launch is a little stronger, so a ramp that normally puts you down after twenty metres carries
 * you most of the way to the next corner. It changes nothing on the ground — it is a jumping bonus, and the fun of
 * it is deciding to save it for a ramp.
 */
/**
 * Coming down. A car that stops dead the instant it touches the road looks like it was switched off in mid-air;
 * a toy car dropped on a floor bounces. So it does: a small hop on an ordinary landing, a wider one after a real
 * launch (the ski jump, a ramp with `launch`), and never more than two before it settles.
 */
const BOUNCE = 0.24, BOUNCE_LAUNCHED = 0.38, BOUNCE_FLOOR = 3.2, BOUNCES = 2;
const PROPELLER_TIME = 7;
const PROPELLER_GRAVITY = 8.5;
const PROPELLER_LAUNCH = 1.22;
const GRAVITY = 22;
/**
 * The two flying presents. The parachute is a gamble on timing: opened during a jump it catches the wind, lifts
 * the car to PARACHUTE_HEIGHT and carries it down the road, faster than driving, for PARACHUTE_FLY seconds, then
 * lets it down no faster than PARACHUTE_FALL (`racer.chute` is 'fly' until it lands). Opened on the ground it is a
 * drag chute: for PARACHUTE_BRAKE seconds the car is held back (`racer.chute` is 'brake').
 * The hang-glider is the propeller's cousin: it changes nothing on the ground, gives a ramp a little more kick and
 * then glides, sinking slowly. With either one in the air the landing never bounces.
 */
const PARACHUTE_FLY = 5;
const PARACHUTE_HEIGHT = 5;
const PARACHUTE_LIFT = 7;
const PARACHUTE_SETTLE = 1;
const PARACHUTE_FALL = 4.2;
const PARACHUTE_SPEED = 1.3;
const PARACHUTE_BRAKE = 2;
const PARACHUTE_DRAG = 0.5;
const GLIDER_TIME = 7;
const GLIDER_LAUNCH = 1.3;
const GLIDER_FALL = 1.15;
/**
 * Under a bridge deck a flying car keeps this far below it (track.headroom): its top (the canopy's dome under the
 * parachute, the propeller or the wing otherwise) plus the thickness of the deck. Children saw the parachute go
 * straight through the bridges of Rome.
 */
const PARACHUTE_TOP = 4.6;
const FLYING_TOP = 2.2;
const DECK = 1;
/** How much harder a launch is with a flying present running; the strongest one counts. */
const launchBoost = (racer) => Math.max(1, racer.propeller > 0 ? PROPELLER_LAUNCH : 1, racer.glider > 0 ? GLIDER_LAUNCH : 1);
/** The fountain rains sparks over a stretch of road; whoever drives through it loses grip for a moment. */
const FOUNTAIN_SPAN = 16;
// The bomb's fuse, in seconds, and how far down the road its blast reaches.
const BOMB_FUSE = 3.2, BOMB_BLAST = 7;
const SLOW_TIME = 1.1;
const SLOW_SPEED = 0.72;
/**
 * Jelly glues the car for half a second: the children found two seconds a punishment rather than a joke. Oil always
 * takes the steering away for a moment; one time in two it also spins the car right round — nose, tail, nose — and
 * costs it half its speed (`racer.spinning`, which the renderer turns into a full turn on the spot).
 */
export const STUCK_TIME = 0.5;
const SLIP_TIME = 2.2;
export const SPIN_TIME = 1;
const OIL_SPIN_CHANCE = 0.5;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
/** Cruise speed (m/s) of every difficulty level; steering keeps up with the extra pace. */
export const BASE_SPEED = Object.freeze({ easy: 21.5, normal: 24, fast: 30, crazy: 37 });
const approach = (value, target, amount) => value + clamp(target - value, -amount, amount);
const FALLBACK_CARS = [
  { id: 'comet', name: 'Fuoco Rapido', color: '#ff4a1c', accent: '#15161c', shape: 'racer' },
  { id: 'mint', name: 'Ombra Verde', color: '#2f8f5b', accent: '#15161c', shape: 'buggy' },
  { id: 'plum', name: 'Lupo Viola', color: '#5b3fb8', accent: '#15161c', shape: 'racer' },
  { id: 'sun', name: 'Tigre', color: '#f5a300', accent: '#15161c', shape: 'classic' },
];

/** Guided arcade driving: steer across the road, automatic throttle, forgiving rails. */
export class RaceSimulation {
  constructor({ players = 1, difficulty = 'easy', cars = [], aiCars = [], seed = 1847, fieldSeed = null, track = DEFAULT_TRACK, opponents = null } = {}) {
    this.track = track;
    this.playerCount = players === 2 ? 2 : 1;
    // Default field: six cars. `opponents` (0–5) shrinks it, down to a solo time trial.
    const aiCount = Number.isInteger(opponents) ? clamp(opponents, 0, 5) : 6 - this.playerCount;
    this.difficulty = BASE_SPEED[difficulty] ? difficulty : 'easy';
    this.baseSpeed = BASE_SPEED[this.difficulty];
    this.expertControls = hasExpertControls(this.difficulty);
    this.countdown = 3.5;
    this.time = 0;
    this.state = 'countdown';
    this.totalLaps = track.laps;
    this.trackLength = track.length;
    this._maxLane = track.roadWidth / 2 - 1.1;
    this._finishDistance = track.length * track.laps;
    this.events = [];
    this.projectiles = [];
    this.hazards = [];
    this.ramps = track.ramps.map((ramp) => ({ ...ramp }));
    this.boosts = track.boosts.map((pad) => ({ ...pad }));
    this.boxes = track.boxes.map((box) => ({ ...box, cooldown: 0, available: true }));
    // Solid props on the road: columns, planters, bins, bales. Declared by the circuit (see obstacles.js) so that
    // the thing you see is the thing you hit — until now every prop was scenery and the car drove through it.
    // `down` counts the seconds until a broken prop grows back; `squashed` says a bale flattened it rather than a
    // rocket blowing it apart, which is only a difference in what the renderer shows.
    this.obstacles = (track.obstacles || []).map((obstacle) => ({ ...obstacle, down: 0, squashed: false }));
    // Animals crossing the road (critters.js). `attack` is the car one is sitting on, `calm` how long it leaves
    // the next car alone; `knocked` counts the seconds a shot keeps it off its feet, and `knock` says where it
    // tumbles to (see `_knockCritter`). `offset` is copied so that getting back up can shift this race's walk only.
    this.critters = (track.critters || []).map((critter) => ({ ...critter, attack: null, calm: 0, knocked: 0, knock: null }));
    // Bridges (optional shortcuts) and loops (the road itself); see sections.js.
    this.sections = track.sections || [];
    this._bridgeIds = new Set(this.sections.filter((section) => section.optional).map((section) => section.id));
    this._seed = Number(seed) >>> 0 || 1;
    this._nextId = 1;
    this._pressed = [false, false];
    this._aimBack = [false, false];
    const humanSpecs = Array.from({ length: this.playerCount }, (_, i) => cars[i] || FALLBACK_CARS[i]);
    const humanIds = new Set(humanSpecs.map((spec) => spec.id));
    // Opponents never drive a car a child has chosen; the field seed varies them per race (or per cup).
    let pool = (aiCars.length ? aiCars : FALLBACK_CARS).filter((spec) => !humanIds.has(spec.id));
    if (pool.length < 6 - this.playerCount) {
      pool = [...pool, ...FALLBACK_CARS.filter((spec) => !humanIds.has(spec.id) && !pool.includes(spec))];
    }
    const field = shuffled(pool.length ? pool : FALLBACK_CARS, fieldSeed ?? this._seed);
    this.racers = Array.from({ length: this.playerCount + aiCount }, (_, i) => {
      const human = i < this.playerCount;
      const spec = human ? humanSpecs[i] : field[(i - this.playerCount) % field.length];
      return {
        id: human ? `p${i + 1}` : `ai${i - this.playerCount + 1}`,
        name: human ? spec.name || `Pilota ${i + 1}` : spec.name || `Amico ${i - this.playerCount + 1}`,
        spec, isPlayer: human, playerIndex: human ? i : -1,
        progress: 0 - Math.floor(i / 2) * 4.2, lane: i % 2 ? 2.3 : -2.3,
        speed: 0, y: 0, item: null, boost: 0, shield: 0, stun: 0, stuck: 0, machinegun: 0, _gunCooldown: 0,
        finished: false, finishTime: null, rank: i + 1, lap: 1,
        immunity: 0, steering: 0, drift: 0, slipping: 0, drifting: false, _jumpCooldown: 0,
        damage: 0, wrecked: 0, _repairTimer: 0, slowed: 0, _salvo: null, creamed: 0, _scoops: null, _bumped: 0, propeller: 0,
        _launched: 1, _bounces: 0, squashed: 0, attacked: 0, rainbow: 0, spinning: 0, parachute: 0, chute: null, glider: 0,
        section: null, _sectionExit: 0, _shortcutChoice: { key: '', take: false },
        _verticalVelocity: 0, _airborne: false, _targetLane: i % 2 ? 2.3 : -2.3,
        _thinkTimer: this._random() * 0.6, _useTimer: 2 + this._random() * 2,
        // AI collects pads deliberately; a gentler pace lets new drivers contend
        // even while learning to steer and remembering to use their first bonus.
        _pace: this.difficulty === 'easy' ? 0.88 + this._random() * 0.045 : 0.95 + this._random() * 0.065,
      };
    });
    this._updateRanks();
  }

  _random() {
    this._seed = nextSeed(this._seed);
    return this._seed / 4294967296;
  }

  _forward(from, to) { return this.track.wrap(to - from); }

  _close(a, b) { return Math.abs(this.track.wrap(a - b + this.trackLength / 2) - this.trackLength / 2); }

  /** True when a racer moving from `previous` to `current` passed the track position `distance`. */
  _crossed(previous, current, distance) {
    const next = distance + (Math.floor((previous - distance) / this.trackLength) + 1) * this.trackLength;
    return next <= current;
  }

  _event(type, data = {}) {
    this.events.push({ type, time: this.time, ...data });
    if (this.events.length > 80) this.events.shift();
  }

  drainEvents() {
    return this.events.splice(0);
  }

  update(dt, inputs = []) {
    if (!Number.isFinite(dt) || dt <= 0 || this.state === 'finished') return;
    let remaining = Math.min(dt, 0.25);
    const uses = Array.from({ length: this.playerCount }, (_, index) => {
      const pressed = !!inputs[index]?.useItem;
      const justPressed = pressed && !this._pressed[index];
      this._pressed[index] = pressed;
      // Holding "back" while firing turns the rocket round: it goes hunting whoever is behind you.
      this._aimBack[index] = !!inputs[index]?.aimBack;
      return justPressed;
    });
    if (this.state === 'countdown') {
      const wait = Math.min(remaining, this.countdown);
      this.countdown = Math.max(0, this.countdown - wait);
      remaining -= wait;
      if (this.countdown > 1e-8) return;
      this.countdown = 0;
      this.state = 'racing';
      this._event('start');
    }
    while (remaining > 1e-8 && this.state === 'racing') {
      const step = Math.min(remaining, 1 / 60);
      this._step(step, inputs, uses);
      uses.fill(false);
      remaining -= step;
    }
  }

  _step(dt, inputs, uses) {
    this.time += dt;
    for (const box of this.boxes) {
      box.cooldown = Math.max(0, box.cooldown - dt);
      box.available = box.cooldown === 0;
    }
    this._regrowObstacles(dt);
    for (const critter of this.critters) {
      critter.calm = Math.max(0, critter.calm - dt);
      // It jumps down when its time is up, or as soon as the car is no longer held (a new car after a wreck).
      if (critter.attack && (this.time >= critter.attack.until || !(this.racers.find((racer) => racer.id === critter.attack.racerId)?.attacked > 0))) critter.attack = null;
      if (critter.knocked > 0) {
        critter.knocked = Math.max(0, critter.knocked - dt);
        if (critter.knocked === 0) {
          // Back on its feet on the verge: its walk picks up from the pause on that side, so it turns round and
          // crosses again instead of jumping to wherever the unshifted clock would have put it.
          const { side } = critter.knock;
          critter.offset = resumeOffset(critter, side, this.time);
          critter.knock = null;
          this._event('critter-up', { critterId: critter.id, kind: critter.kind, side, distance: critter.distance, lane: side * critter.edge });
        }
      }
    }
    for (const racer of this.racers) {
      if (racer.finished) continue;
      for (const timer of ['boost', 'shield', 'stun', 'immunity', 'slipping', 'slowed', 'creamed', '_bumped', 'propeller', 'rainbow', 'spinning', 'parachute', 'glider']) racer[timer] = Math.max(0, racer[timer] - dt);
      if (racer.chute === 'brake' && racer.parachute === 0) racer.chute = null;
      // Flattened by a bale, or with an angry animal on the roof: both end with an event, so the car can pop back
      // up with a boing and the animal can be seen jumping off.
      if (racer.squashed > 0) {
        racer.squashed = Math.max(0, racer.squashed - dt);
        if (racer.squashed === 0) this._event('unsquashed', { racerId: racer.id });
      }
      if (racer.attacked > 0) {
        racer.attacked = Math.max(0, racer.attacked - dt);
        if (racer.attacked === 0) this._event('released', { racerId: racer.id });
      }
      if (racer._salvo && racer._salvo.left > 0 && racer.wrecked <= 0) {
        racer._salvo.timer -= dt;
        if (racer._salvo.timer <= 0) { racer._salvo.left -= 1; racer._salvo.timer = SALVO_GAP; this._fireRocket(racer, racer._salvo.back); }
      }
      if (racer._scoops && racer._scoops.left > 0 && racer.wrecked <= 0) {
        racer._scoops.timer -= dt;
        if (racer._scoops.timer <= 0) { racer._scoops.left -= 1; racer._scoops.timer = SCOOP_GAP; this._fireScoop(racer); }
      }
      if (racer.wrecked > 0) {
        racer.wrecked = Math.max(0, racer.wrecked - dt);
        // The fire burns out and a brand new car is put back on the road, right where the old one stopped.
        if (racer.wrecked === 0) { racer.damage = 0; this._event('respawn', { racerId: racer.id }); }
      } else if (racer.damage > 0) {
        racer._repairTimer += dt;
        if (racer._repairTimer >= REPAIR_TIME) {
          racer._repairTimer = 0;
          racer.damage -= 1;
          this._event('repair', { racerId: racer.id, damage: racer.damage });
        }
      }
      if (racer.stuck > 0) {
        // Glued by a jelly: the blob melts in half a second, then the car is free again.
        racer.stuck = Math.max(0, racer.stuck - dt);
        if (racer.stuck === 0) this._event('unstuck', { racerId: racer.id });
      }
      const input = racer.isPlayer ? (inputs[racer.playerIndex] || {}) : this._aiInput(racer, dt);
      if (racer.wrecked <= 0 && (racer.isPlayer ? uses[racer.playerIndex] : input.useItem)) {
        this._useItem(racer, racer.isPlayer ? this._aimBack[racer.playerIndex] : this._aiAimsBack(racer));
      }
      this._updateMachinegun(racer, dt);
      // On oil the wheel does nothing: the car keeps sliding the way it was already pointing.
      const pinned = racer.stuck > 0 || racer.wrecked > 0 || racer.squashed > 0 || racer.attacked > 0;
      const steer = pinned ? 0
        : racer.slipping > 0 ? clamp(racer.steering * 1.12, -1, 1)
          : Number.isFinite(input.steer) ? clamp(input.steer, -1, 1) * (racer.creamed > 0 ? CREAM_STEER : 1) : 0;
      // Expert controls: the hop happens before the height is integrated below, so it launches on this very frame.
      racer.drifting = false;
      if (this.expertControls && racer.isPlayer && !racer.section && !pinned) {
        racer._jumpCooldown = Math.max(0, racer._jumpCooldown - dt);
        if (input.jump && !racer._airborne && racer._jumpCooldown === 0) {
          racer._verticalVelocity = JUMP_SPEED * launchBoost(racer);
          racer._airborne = true;
          racer._launched = 1;
          racer._bounces = 0;
          racer._jumpCooldown = JUMP_COOLDOWN;
          this._event('jump', { racerId: racer.id, hop: true });
        }
        racer.drifting = !!input.drift && !racer._airborne && racer.slipping <= 0 && racer.speed > 6;
      }
      racer.steering = approach(racer.steering, steer, dt * 7);
      const steeringSpeed = (racer.stun > 0 ? 5.5 : 9.3) * Math.max(1, this.baseSpeed / 24) * (racer.drifting ? DRIFT_STEER : 1);
      if (pinned) racer.drift = 0;
      racer.lane = clamp(racer.lane + racer.steering * steeringSpeed * dt + racer.drift * dt, -this._maxLane, this._maxLane);
      racer.drift = approach(racer.drift, 0, dt * 10);
      const base = this.baseSpeed;
      let targetSpeed = base;
      if (!racer.isPlayer) {
        let humanLeader = -Infinity;
        for (const other of this.racers) if (other.isPlayer && other.progress > humanLeader) humanLeader = other.progress;
        const catchup = clamp((humanLeader - racer.progress) / 400, -0.035, 0.055);
        targetSpeed *= racer._pace + catchup;
        if (this.difficulty !== 'easy') targetSpeed *= 1.035;
      }
      // Hills: uphill stretches slow every car down, descents give free speed.
      const slope = !racer.section && this.track.slope ? this.track.slope(racer.progress) : 0;
      if (slope) targetSpeed *= clamp(1 - slope * 1.5, 0.8, 1.15);
      if (racer.boost > 0) targetSpeed *= 1.53;
      if (racer.rainbow > 0) targetSpeed *= RAINBOW_SPEED;
      if (input.brake) targetSpeed *= 0.38;
      if (racer.stun > 0) targetSpeed *= 0.52;
      if (Math.abs(racer.lane) > this._maxLane - 0.05 && Math.sign(steer) === Math.sign(racer.lane)) targetSpeed *= 0.88;
      if (racer.drifting) targetSpeed *= DRIFT_SPEED;
      if (racer.slowed > 0) targetSpeed *= SLOW_SPEED;
      if (racer.spinning > 0) targetSpeed *= 0.55;
      if (racer.creamed > 0) targetSpeed *= CREAM_SPEED;
      if (racer.chute === 'fly' && racer.parachute > 0) targetSpeed *= PARACHUTE_SPEED;
      if (racer.chute === 'brake') targetSpeed *= PARACHUTE_DRAG;
      if (pinned) targetSpeed = 0;
      racer.speed = approach(racer.speed, targetSpeed, dt * (racer.speed > targetSpeed ? 24 : 15));
      const previous = racer.progress;
      const section = racer.section ? this.sections.find((candidate) => candidate.id === racer.section) : null;
      racer.progress += racer.speed * dt * (section ? section.gain : 1);
      if (section) {
        // On a bridge or inside the loop: the lane is relative to the section centre line; no ramps, boxes or pads.
        const maxLane = section.width / 2 - 1.1;
        racer.lane = clamp(racer.lane, -maxLane, maxLane);
        racer.y = 0;
        racer._airborne = false;
        racer._verticalVelocity = 0;
        if (racer.progress >= racer._sectionExit) {
          racer.section = null;
          racer.lane = clamp(racer.lane + section.exitLane, -this._maxLane, this._maxLane);
          this._event('section-exit', { racerId: racer.id, sectionId: section.id, kind: section.kind });
        }
      } else {
        this._elevation(racer, previous, dt);
        this._trackItems(racer, previous);
        this._hitObstacles(racer, previous);
        this._hitCritters(racer, previous);
        this._enterSections(racer, previous);
      }
      const previousLap = Math.max(1, Math.floor(previous / this.trackLength) + 1);
      racer.lap = Math.min(this.totalLaps, Math.max(1, Math.floor(racer.progress / this.trackLength) + 1));
      if (racer.lap > previousLap) this._event('lap', { racerId: racer.id, lap: racer.lap });
      if (racer.progress >= this._finishDistance) {
        racer.finishTime = this.time - (racer.progress - this._finishDistance) / Math.max(1, racer.speed);
        racer.progress = this._finishDistance;
        racer.finished = true;
        racer.machinegun = 0;
        racer.speed = 0;
        this._event('finish', { racerId: racer.id, finishTime: racer.finishTime });
      }
    }
    this._updateWeapons(dt);
    this._carCollisions(dt);
    this._updateRanks();
    if (this.racers.filter((racer) => racer.isPlayer).every((racer) => racer.finished)) {
      this.state = 'finished';
      this._event('race-finished');
    }
  }

  _aiInput(racer, dt) {
    racer._thinkTimer -= dt;
    racer._useTimer -= dt;
    if (racer._thinkTimer <= 0) {
      racer._thinkTimer = 0.45 + this._random() * 0.45;
      const wide = Math.min(3.8, this._maxLane - 0.3);
      // Nearest box (or boost pad) between 4 and 70 m ahead, the closest lane winning ties. One pass, no
      // temporary arrays: this runs for every opponent on every frame.
      let goal = null, goalAhead = 0, goalLane = 0;
      for (const object of racer.item ? this.boosts : this.boxes) {
        if (!racer.item && !object.available) continue;
        const ahead = this._forward(racer.progress, object.distance);
        if (ahead <= 4 || ahead >= 70) continue;
        const laneGap = Math.abs(object.lane - racer.lane);
        if (!goal || ahead < goalAhead || (ahead === goalAhead && laneGap < goalLane)) { goal = object; goalAhead = ahead; goalLane = laneGap; }
      }
      racer._targetLane = goal?.lane ?? Math.sin(racer.progress / 58 + racer._pace * 50) * wide;
      const obstacle = this.hazards.find((hazard) => this._forward(racer.progress, hazard.distance) < 16 && Math.abs(hazard.lane - racer.lane) < 2);
      if (obstacle) racer._targetLane = obstacle.lane > 0 ? -wide : wide;
      // Solid props: an opponent that drives into a column looks broken, so it aims for the free side of the road.
      for (const solid of this.obstacles) {
        if (solid.down > 0) continue;
        const ahead = this._forward(racer.progress, solid.distance);
        if (ahead > 30 || Math.abs(solid.lane - racer._targetLane) > solid.radius + 1.8) continue;
        const left = solid.lane + solid.radius + 1.6, right = solid.lane - solid.radius - 1.6;
        racer._targetLane = clamp(Math.abs(left) <= Math.abs(right) ? left : right, -wide, wide);
      }
      // An animal on the road: it moves, so the opponent steers for where it is now and leaves it a wide berth.
      for (const critter of this.critters) {
        if (critter.attack || critter.knocked > 0 || this._forward(racer.progress, critter.distance) > 26) continue;
        const { lane } = critterPose(critter, this.time);
        if (Math.abs(lane - racer._targetLane) > critter.radius + 2.2) continue;
        racer._targetLane = clamp(lane > 0 ? lane - critter.radius - 2.4 : lane + critter.radius + 2.4, -wide, wide);
      }
      // A shortcut bridge ahead: decide once per lap whether to take it, then steer for (or clear of) its entry lane.
      const bridge = racer.section ? null : this.sections.find((candidate) => candidate.optional && this._forward(racer.progress, candidate.from) < 70);
      if (bridge) {
        const key = `${bridge.id}:${racer.lap}`;
        if (racer._shortcutChoice.key !== key) racer._shortcutChoice = { key, take: this._random() < 0.55 };
        if (racer._shortcutChoice.take) racer._targetLane = bridge.entryLane;
        else if (bridge.entryLane < 0) racer._targetLane = Math.max(racer._targetLane, bridge.entryLane + bridge.width / 2 + 1);
        else racer._targetLane = Math.min(racer._targetLane, bridge.entryLane - bridge.width / 2 - 1);
      }
    }
    // The parachute only pays off in a jump, so an opponent holding one waits to be in the air, or gives up in the end.
    const waiting = racer.item === 'parachute' && !racer._airborne && racer._useTimer > -12;
    const useItem = !!racer.item && racer._useTimer <= 0 && !waiting;
    if (useItem) racer._useTimer = 3.2 + this._random() * 4;
    return { steer: clamp((racer._targetLane - racer.lane) * 1.15, -1, 1), useItem };
  }

  /**
   * Height of the driving surface at a point of the lap, ramps included. Cars used to be the only thing that knew
   * about this, so a rocket flew straight through a ramp instead of climbing it; now both read the same function.
   */
  _rampHeight(distance, lane) {
    let height = 0;
    for (const ramp of this.ramps) {
      if (ramp.lane !== null && Math.abs(lane - ramp.lane) > 2) continue;
      const along = this._forward(ramp.distance, distance);
      if (along <= ramp.length) height = Math.max(height, ramp.height * along / ramp.length);
    }
    return height;
  }

  _elevation(racer, previous, dt) {
    if (racer._airborne) {
      racer.y += racer._verticalVelocity * dt;
      if (racer.chute === 'fly') {
        // Under the parachute: up to its height, held there while the timer runs, down in the last second.
        const height = PARACHUTE_HEIGHT * Math.min(1, racer.parachute / PARACHUTE_SETTLE);
        const climb = racer.parachute > 0 ? clamp((height - racer.y) * 2, -PARACHUTE_FALL, PARACHUTE_LIFT) : -PARACHUTE_FALL;
        racer._verticalVelocity = approach(racer._verticalVelocity, climb, dt * 12);
      } else {
        // With the propeller running the car falls far more slowly, which is the whole of the bonus: same jump,
        // much longer flight.
        racer._verticalVelocity -= (racer.propeller > 0 ? PROPELLER_GRAVITY : GRAVITY) * dt;
        // The hang-glider glides: the car may only sink so fast.
        if (racer.glider > 0) racer._verticalVelocity = Math.max(racer._verticalVelocity, -GLIDER_FALL);
      }
      // A deck overhead: no higher than fits beneath it (the parachute dips under the bridge and climbs back after).
      if (!racer.section && this.track.headroom) {
        const ceiling = this.track.headroom(racer.progress) - DECK - (racer.chute === 'fly' ? PARACHUTE_TOP : FLYING_TOP);
        if (racer.y > ceiling) {
          racer.y = Math.max(0, ceiling);
          racer._verticalVelocity = Math.min(0, racer._verticalVelocity);
        }
      }
      if (racer.y <= 0) {
        const impact = -racer._verticalVelocity;
        const spring = racer._launched > 1 ? BOUNCE_LAUNCHED : BOUNCE;
        racer.y = 0;
        if (impact > BOUNCE_FLOOR && racer._bounces < BOUNCES && racer.chute !== 'fly' && !(racer.glider > 0)) {
          // Still enough speed left to come back up: hop, and count it so it cannot bounce for ever.
          racer._bounces += 1;
          racer._verticalVelocity = impact * spring;
          this._event('land', { racerId: racer.id, bounce: racer._bounces, impact });
        } else {
          racer._airborne = false;
          racer._verticalVelocity = 0;
          racer._bounces = 0;
          racer._launched = 1;
          if (racer.chute === 'fly') { racer.chute = null; racer.parachute = 0; }
          this._event('land', { racerId: racer.id, bounce: 0, impact });
        }
      }
      return;
    }
    racer.y = this._rampHeight(racer.progress, racer.lane);
    for (const ramp of this.ramps) {
      if (ramp.lane !== null && Math.abs(racer.lane - ramp.lane) > 2) continue;
      if (this._crossed(previous, racer.progress, ramp.distance + ramp.length)) {
        racer.y = ramp.height;
        // `launch` turns an ordinary ramp into a real take-off (the Bernina ski jump). It scales with the car's own
        // speed as well, so the flight lands on the road at every difficulty instead of only at one of them.
        const launch = (ramp.launch || 1) * launchBoost(racer);
        racer._verticalVelocity = launch > 1 ? 8.8 * launch * (0.6 + 0.4 * (racer.speed / BASE_SPEED.normal)) : 8.8;
        racer._airborne = true;
        racer._launched = launch;
        racer._bounces = 0;
        this._event('jump', { racerId: racer.id, launch });
        break;
      }
    }
  }

  /** Entering a loop is automatic; a bridge is taken only from its entry lane, wheels on the ground. */
  _enterSections(racer, previous) {
    for (const section of this.sections) {
      if (!this._crossed(previous, racer.progress, section.from)) continue;
      if (section.optional && (racer.y > 0.5 || Math.abs(racer.lane - section.entryLane) > section.width / 2 - 0.5)) continue;
      const entry = racer.progress - this.track.wrap(racer.progress - section.from);
      const maxLane = section.width / 2 - 1.1;
      racer.section = section.id;
      racer._sectionExit = entry + section.span;
      racer.lane = clamp(racer.lane - section.entryLane, -maxLane, maxLane);
      racer.y = 0;
      racer._airborne = false;
      racer._verticalVelocity = 0;
      if (racer.chute === 'fly') { racer.chute = null; racer.parachute = 0; }
      this._event('section', { racerId: racer.id, sectionId: section.id, kind: section.kind, name: section.name });
      break;
    }
  }

  _trackItems(racer, previous) {
    for (const box of this.boxes) {
      if (racer.item || !box.available || racer.y > 2.4 || Math.abs(racer.lane - box.lane) > 2.05) continue;
      if (!this._crossed(previous, racer.progress, box.distance)) continue;
      racer.item = pickItem(this._random());
      box.cooldown = 3.8;
      box.available = false;
      racer._useTimer = 1.2 + this._random() * 1.8;
      this._event('pickup', { racerId: racer.id, item: racer.item, boxId: box.id });
    }
    for (const pad of this.boosts) {
      if (racer.y > 1 || Math.abs(racer.lane - pad.lane) > pad.width / 2 + 0.65) continue;
      if (this._crossed(previous, racer.progress, pad.distance)) {
        racer.boost = Math.max(racer.boost, 1.25);
        this._event('boost', { racerId: racer.id, source: 'pad' });
      }
    }
  }

  _useItem(racer, aimBack = false) {
    const item = racer.item;
    if (!item || (item === 'machinegun' && racer.machinegun > 0)) return;
    racer.item = null;
    if (item === 'boost') racer.boost = 3;
    else if (item === 'propeller') racer.propeller = PROPELLER_TIME;
    else if (item === 'parachute') {
      // In a jump it carries the car down the road; on the ground it only brakes.
      racer.chute = racer._airborne ? 'fly' : 'brake';
      racer.parachute = racer._airborne ? PARACHUTE_FLY : PARACHUTE_BRAKE;
      if (racer._airborne) { racer._verticalVelocity = Math.max(racer._verticalVelocity, PARACHUTE_LIFT); racer._bounces = 0; }
    }
    else if (item === 'glider') racer.glider = GLIDER_TIME;
    else if (item === 'rainbow') {
      // Whatever was slowing the car down is shaken off at once: a rainbow car stuck in jelly would be a sad joke.
      racer.rainbow = RAINBOW_TIME;
      racer.stuck = 0; racer.slipping = 0; racer.slowed = 0; racer.creamed = 0; racer.stun = 0;
    }
    else if (item === 'shield') racer.shield = 6;
    else if (item === 'machinegun') { racer.machinegun = MACHINEGUN_DURATION; racer._gunCooldown = 0; }
    else if (item === 'bomb') {
      this.hazards.push({ id: `bomb-${this._nextId++}`, type: 'bomb', ownerId: racer.id,
        distance: this.track.wrap(racer.progress - 4), lane: racer.lane, y: 0, ttl: BOMB_FUSE + 1, age: 0 });
    } else if (item === 'oil') {
      // A slick of oil: whoever drives over it keeps its speed but loses the steering for a couple of seconds.
      this.hazards.push({ id: `oil-${this._nextId++}`, type: 'oil', ownerId: racer.id,
        distance: this.track.wrap(racer.progress - 4), lane: racer.lane, y: 0, ttl: 18, age: 0 });
    } else if (item === 'jelly') {
      // A blob of jelly left behind: whoever drives into it is glued in place until it melts.
      this.hazards.push({ id: `jelly-${this._nextId++}`, type: 'jelly', ownerId: racer.id,
        distance: this.track.wrap(racer.progress - 4), lane: racer.lane, y: 0, ttl: 15, age: 0 });
    } else if (item === 'rocket') {
      this._fireRocket(racer, aimBack);
    } else if (item === 'rockets3') {
      // Three rockets: the first goes now, the other two follow on their own.
      this._fireRocket(racer, aimBack);
      racer._salvo = { left: 2, timer: SALVO_GAP, back: !!aimBack };
    } else if (item === 'fountain') {
      // A fountain of sparks planted down the road ahead: it does not chase anybody, it just has to be dodged.
      this.hazards.push({ id: `fountain-${this._nextId++}`, type: 'fountain', ownerId: racer.id,
        distance: this.track.wrap(racer.progress + 26), lane: racer.lane, span: FOUNTAIN_SPAN, y: 0, ttl: 7, age: 0 });
    } else if (item === 'gelato') {
      // The ice-cream gun: three scoops straight ahead, one after the other.
      this._fireScoop(racer);
      racer._scoops = { left: 2, timer: SCOOP_GAP };
    } else if (item === 'bales') {
      // Three hay bales thrown down the road, each rolling off into its own lane. They are not aimed at anybody:
      // they bounce along and shove whoever they meet, so there is always a way through if you read the road.
      const spread = Math.min(this._maxLane - 0.9, 3.4);
      [-1, 0, 1].forEach((side, index) => {
        this.projectiles.push({ id: `bale-${this._nextId++}`, type: 'bale', ownerId: racer.id, back: false,
          targetId: null, distance: racer.progress + 4 + index * 1.6, lane: clamp(racer.lane + side * 1.2, -this._maxLane, this._maxLane),
          drift: side * 1.5, aim: clamp(racer.lane + side * spread, -this._maxLane, this._maxLane),
          y: racer.y + PROJECTILE_HEIGHT, _verticalVelocity: 0, _airborne: false, ttl: 4.5 });
      });
    } else if (item === 'spin') {
      // A catherine wheel: it runs off zigzagging across the whole road, hitting whatever it finds.
      this.projectiles.push({ id: `spin-${this._nextId++}`, type: 'spin', ownerId: racer.id, back: false,
        targetId: null, distance: racer.progress + 3, lane: racer.lane, phase: 0,
        y: racer.y + PROJECTILE_HEIGHT, _verticalVelocity: 0, _airborne: false, ttl: 5 });
    }
    this._event('use-item', { racerId: racer.id, item, back: (item === 'rocket' || item === 'rockets3') && !!aimBack });
  }

  /** Forwards it chases whoever is in front; with "back" held it leaves from the tail and hunts behind. */
  _fireRocket(racer, aimBack = false) {
    let target = null, best = Infinity;
    for (const other of this.racers) {
      if (other === racer || other.finished) continue;
      const gap = aimBack ? this._forward(other.progress, racer.progress) : this._forward(racer.progress, other.progress);
      if (gap > 1 && gap < 140 && gap < best) { best = gap; target = other; }
    }
    this.projectiles.push({ id: `rocket-${this._nextId++}`, type: 'rocket', ownerId: racer.id, back: !!aimBack,
      targetId: target?.id || null, distance: racer.progress + (aimBack ? -2.5 : 2.5), lane: racer.lane,
      y: racer.y + PROJECTILE_HEIGHT, _verticalVelocity: 0, _airborne: false, ttl: 4 });
  }

  /** One scoop of ice cream, straight down the road at whoever is in front. */
  _fireScoop(racer) {
    let target = null, best = Infinity;
    for (const other of this.racers) {
      if (other === racer || other.finished) continue;
      const gap = this._forward(racer.progress, other.progress);
      if (gap > 1 && gap < 110 && gap < best) { best = gap; target = other; }
    }
    this.projectiles.push({ id: `gelato-${this._nextId++}`, type: 'gelato', ownerId: racer.id, back: false,
      targetId: target?.id || null, distance: racer.progress + 2.5, lane: racer.lane,
      y: racer.y + PROJECTILE_HEIGHT, _verticalVelocity: 0, _airborne: false, ttl: 2.6 });
  }

  /** A scoop on the windscreen: no damage, but for a couple of seconds you crawl and the steering goes vague. */
  _cream(racer, ownerId) {
    if (racer.finished || racer.rainbow > 0 || racer.immunity > 0 || racer.creamed > 0) return false;
    if (racer.shield > 0) {
      racer.shield = 0;
      racer.immunity = 1;
      this._event('shield-hit', { racerId: racer.id, source: 'gelato', ownerId });
      return true;
    }
    racer.creamed = CREAM_TIME;
    racer.immunity = 0.5;
    racer.boost = 0;
    this._event('creamed', { racerId: racer.id, ownerId });
    return true;
  }

  /**
   * Running into something solid — a bale, a column, a planter. The car is pushed clear of it and loses most of its
   * speed, and that is all: a six-year-old who clips a bollard must not lose the car, only the place.
   */
  _shove(racer, { lane, radius = 1, soft = true, ownerId = null, source = 'obstacle' }) {
    if (racer.finished || racer.wrecked > 0 || racer._bumped > 0) return false;
    racer._bumped = 0.5;
    const away = racer.lane >= lane ? 1 : -1;
    racer.lane = clamp(lane + away * (radius + 1.35), -this._maxLane, this._maxLane);
    racer.drift = away * (soft ? 1.6 : 2.6);
    racer.speed *= soft ? 0.68 : 0.42;
    racer.stun = Math.max(racer.stun, soft ? 0.2 : 0.45);
    racer.boost = 0;
    this._event('bump', { racerId: racer.id, source, ownerId, soft });
    return true;
  }

  /**
   * A rolling bale goes over the car: flat as a biscuit for a second, then it pops back up. No damage — a bale
   * never takes a car apart — and the bale rolls on, so a lucky throw can flatten two. A shield stops it.
   * Returns 'shield' when the shield took it, true when the car was flattened, false when nothing happened.
   */
  _squash(racer, ownerId) {
    if (racer.finished || racer.wrecked > 0 || racer.rainbow > 0 || racer.squashed > 0 || racer.immunity > 0) return false;
    if (racer.shield > 0) {
      racer.shield = 0;
      racer.immunity = 1;
      this._event('shield-hit', { racerId: racer.id, source: 'bale', ownerId });
      return 'shield';
    }
    racer.squashed = SQUASH_TIME;
    racer.immunity = SQUASH_TIME + 0.6;
    racer.speed = 0;
    racer.boost = 0;
    racer.drift = 0;
    this._event('squashed', { racerId: racer.id, ownerId });
    return true;
  }

  /**
   * Blows a breakable prop to bits (or, for a bale, flattens it). It is not solid while it is down and grows back
   * after OBSTACLE_REGROW seconds. Returns whether it broke.
   */
  _breakObstacle(obstacle, { source, ownerId = null, squash = false }) {
    if (!obstacle.breakable || obstacle.down > 0) return false;
    obstacle.down = OBSTACLE_REGROW;
    obstacle.squashed = squash;
    this._event('obstacle-break', { obstacleId: obstacle.id, kind: obstacle.kind, distance: obstacle.distance, lane: obstacle.lane, squash, source, ownerId });
    return true;
  }

  /** A broken prop comes back — but never on top of a car, which would trap it inside. */
  _regrowObstacles(dt) {
    for (const obstacle of this.obstacles) {
      if (obstacle.down <= 0) continue;
      obstacle.down = Math.max(0, obstacle.down - dt);
      if (obstacle.down > 0) continue;
      const blocked = this.racers.some((racer) => !racer.finished && !racer.section
        && this._close(racer.progress, obstacle.distance) < obstacle.radius + 4 && Math.abs(racer.lane - obstacle.lane) < obstacle.radius + 2.5);
      if (blocked) { obstacle.down = 0.5; continue; }
      obstacle.squashed = false;
      this._event('obstacle-back', { obstacleId: obstacle.id, kind: obstacle.kind, distance: obstacle.distance, lane: obstacle.lane });
    }
  }

  /** Solid props standing on the road. Fly over one (a ramp, a hop) and you clear it; drive into it and you do not. */
  _hitObstacles(racer, previous) {
    if (!this.obstacles.length || racer.wrecked > 0) return;
    for (const obstacle of this.obstacles) {
      if (obstacle.down > 0 || racer.y > obstacle.height) continue;
      const reach = obstacle.radius + 1.1;
      if (Math.abs(racer.lane - obstacle.lane) > reach) continue;
      // Either the car is sitting on it, or it went past it this frame (at 37 m/s a step covers half a metre).
      if (this._close(racer.progress, obstacle.distance) > reach && !this._crossed(previous, racer.progress, obstacle.distance)) continue;
      // A rainbow car does not bounce off a desk: the desk goes up in pieces and the car drives on.
      if (racer.rainbow > 0 && this._breakObstacle(obstacle, { source: 'rainbow', ownerId: racer.id })) continue;
      if (this._shove(racer, { lane: obstacle.lane, radius: obstacle.radius, soft: obstacle.soft, source: obstacle.kind })) break;
    }
  }

  /**
   * An animal crossing the road. Drive into it and it jumps on the car: ATTACK_TIME seconds standing still while
   * it stamps on the roof. A shield keeps it off, a rainbow car scares it away; either way it then leaves the next
   * cars alone for a moment, so a queue of opponents is not stopped one after the other by the same turtle.
   */
  _hitCritters(racer, previous) {
    if (!this.critters.length || racer.finished || racer.wrecked > 0) return;
    for (const critter of this.critters) {
      // A bowled-over animal is busy rolling to the verge: it is not in anybody's way.
      if (critter.attack || critter.knocked > 0 || critter.calm > 0 || racer.y > critter.height) continue;
      const { lane } = critterPose(critter, this.time);
      const reach = critter.radius + 1.1;
      if (Math.abs(racer.lane - lane) > reach) continue;
      if (this._close(racer.progress, critter.distance) > reach && !this._crossed(previous, racer.progress, critter.distance)) continue;
      if (racer.rainbow > 0) {
        critter.calm = CRITTER_CALM;
        this._event('critter-scared', { racerId: racer.id, critterId: critter.id, kind: critter.kind });
        continue;
      }
      if (racer.immunity > 0 || racer.attacked > 0) continue;
      critter.calm = CRITTER_CALM;
      if (racer.shield > 0) {
        racer.shield = 0;
        racer.immunity = 1;
        this._event('shield-hit', { racerId: racer.id, source: critter.kind });
        return;
      }
      racer.attacked = ATTACK_TIME;
      racer.immunity = ATTACK_TIME + 1;
      racer.speed = 0;
      racer.boost = 0;
      racer.drift = 0;
      critter.attack = { racerId: racer.id, until: this.time + ATTACK_TIME };
      critter.calm = ATTACK_TIME + CRITTER_CALM;
      this._event('attacked', { racerId: racer.id, critterId: critter.id, kind: critter.kind });
      return;
    }
  }

  /**
   * A weapon caught an animal: it is bowled over and rolls off to the verge (critters.js, `knockSide`), lies there
   * a moment and gets back up. Cartoon only — no damage, nothing is hurt — and the race stays deterministic because
   * nothing here draws a random number. `lane` is where the shot or blast came from. Returns whether it was knocked:
   * one sitting on a car, or already down, is left alone.
   */
  _knockCritter(critter, { lane, source, ownerId = null }) {
    if (critter.attack || critter.knocked > 0) return false;
    const pose = critterPose(critter, this.time);
    const side = knockSide(pose.lane, lane, pose.dir);
    critter.knock = knockdown(critter, pose.lane, side, this.time, pose.dir);
    critter.knocked = KNOCK_TIME;
    this._event('critter-hit', { critterId: critter.id, kind: critter.kind, source, ownerId, side, distance: critter.distance, lane: pose.lane });
    return true;
  }

  /**
   * Did this shot reach an animal? The same reach rules as for a prop (`_smashObstacles`): on its lane, below the top
   * of it, and sitting on it or swept past it this frame. Returns the animal knocked over, or null. Sideways a shot
   * reaches as far as the car that fired it (`_hitCritters`): with a narrower reach an animal at the side of the car
   * let the candies by and then jumped on it anyway ("gli spari le caramelle e ti saltano addosso").
   */
  _shootCritters(projectile, previous) {
    for (const critter of this.critters) {
      if (critter.attack || critter.knocked > 0) continue;
      if (projectile.y - PROJECTILE_HEIGHT > critter.height) continue;
      const { lane } = critterPose(critter, this.time);
      if (Math.abs(projectile.lane - lane) > critter.radius + 1.1) continue;
      const swept = projectile.back
        ? this._crossed(projectile.distance, previous, critter.distance)
        : this._crossed(previous, projectile.distance, critter.distance);
      if (this._close(projectile.distance, critter.distance) > critter.radius + 0.6 && !swept) continue;
      if (this._knockCritter(critter, { lane: projectile.lane, source: projectile.type, ownerId: projectile.ownerId })) return critter;
    }
    return null;
  }

  /** Sparks under the wheels: the car keeps going but slides along slowly for a moment. A shield ignores them. */
  _slow(racer, ownerId) {
    if (racer.finished || racer.rainbow > 0 || racer.shield > 0 || racer.wrecked > 0 || racer.slowed > 0.4) return false;
    racer.slowed = SLOW_TIME;
    this._event('slowed', { racerId: racer.id, ownerId });
    return true;
  }

  /** An opponent fires backwards only when the car it could hit is behind rather than in front. */
  _aiAimsBack(racer) {
    let ahead = Infinity, behind = Infinity;
    for (const other of this.racers) {
      if (other === racer || other.finished) continue;
      const front = this._forward(racer.progress, other.progress);
      const back = this._forward(other.progress, racer.progress);
      if (front > 1 && front < 140) ahead = Math.min(ahead, front);
      if (back > 1 && back < 140) behind = Math.min(behind, back);
    }
    return behind < ahead;
  }

  _updateMachinegun(racer, dt) {
    if (racer.machinegun <= 0) return;
    if (racer._gunCooldown <= 1e-8) {
      this.projectiles.push({ id: `bullet-${this._nextId++}`, type: 'bullet', ownerId: racer.id,
        distance: racer.progress + 2.5, lane: racer.lane, y: racer.y + PROJECTILE_HEIGHT,
        _verticalVelocity: 0, _airborne: false, ttl: 0.8 });
      this._event('machinegun-shot', { racerId: racer.id });
      racer._gunCooldown = MACHINEGUN_INTERVAL;
    }
    racer._gunCooldown -= dt;
    racer.machinegun = Math.max(0, racer.machinegun - dt);
    if (racer.machinegun < 1e-8) racer.machinegun = 0;
  }

  /**
   * Oil: the steering goes for a couple of seconds and the car slides on the way it was pointing; one time in two
   * it also spins right round and loses half its speed. Shields soak it up. The draw goes through the race's own
   * random stream, so a replay of the same seed spins the same cars.
   */
  _slip(racer, ownerId) {
    if (racer.finished || racer.rainbow > 0 || racer.immunity > 0 || racer.slipping > 0) return false;
    if (racer.shield > 0) {
      racer.shield = 0;
      racer.immunity = 1;
      this._event('shield-hit', { racerId: racer.id, source: 'oil', ownerId });
      return true;
    }
    racer.slipping = SLIP_TIME;
    racer.immunity = 0.6;
    const spin = this._random() < OIL_SPIN_CHANCE;
    if (spin) {
      racer.spinning = SPIN_TIME;
      racer.speed *= 0.5;
      racer.boost = 0;
    }
    this._event('slipping', { racerId: racer.id, ownerId, spin });
    return true;
  }

  _hit(racer, source, ownerId) {
    if (racer.finished || racer.immunity > 0) return false;
    if (racer.rainbow > 0) {
      // Shots bounce off the rainbow like off a shield, except that the rainbow stays on.
      this._event('rainbow-block', { racerId: racer.id, source, ownerId });
      return true;
    }
    if (racer.shield > 0) {
      racer.shield = 0;
      racer.immunity = 1;
      this._event('shield-hit', { racerId: racer.id, source, ownerId });
      return true;
    }
    const lightHit = source === 'bullet';
    racer.stun = lightHit ? 0.25 : 0.85;
    racer.immunity = lightHit ? 1.2 : 2;
    racer.speed *= lightHit ? 0.82 : 0.55;
    if (!lightHit) racer.boost = 0;
    racer.drift = -Math.sign(racer.lane) * 2.4;
    // Every hit shakes a few bricks loose; the third one takes the car apart in flames and hands back a new one.
    racer.damage = Math.min(MAX_DAMAGE, racer.damage + 1);
    racer._repairTimer = 0;
    this._event('hit', { racerId: racer.id, source, ownerId, damage: racer.damage });
    if (racer.damage >= MAX_DAMAGE) this._wreck(racer, ownerId);
    return true;
  }

  /** The car burns for a beat, stops dead, and comes back whole: no lap lost, no place taken away. */
  _wreck(racer, ownerId) {
    racer.wrecked = WRECK_TIME;
    racer.speed = 0;
    racer.boost = 0;
    racer.machinegun = 0;
    racer.drift = 0;
    racer.immunity = WRECK_TIME + WRECK_IMMUNITY;
    this._event('wreck', { racerId: racer.id, ownerId });
  }

  /** Jelly: glues the car for STUCK_TIME (a shield absorbs it like any hit). */
  _stick(racer, ownerId) {
    if (racer.finished || racer.rainbow > 0 || racer.immunity > 0) return false;
    if (racer.shield > 0) {
      racer.shield = 0;
      racer.immunity = 1;
      this._event('shield-hit', { racerId: racer.id, source: 'jelly', ownerId });
      return true;
    }
    racer.stuck = STUCK_TIME;
    racer.immunity = STUCK_TIME + 0.7;
    racer.speed *= 0.15;
    racer.boost = 0;
    racer.drift = 0;
    this._event('stuck', { racerId: racer.id, ownerId });
    return true;
  }

  /**
   * A shot rides the road: up a ramp, off the lip and down again under the same gravity as the cars. Fired backwards
   * it walks back down the ramp it came from instead of leaping off it.
   */
  _flyProjectile(projectile, previous, speed, dt) {
    if (projectile._airborne) {
      projectile.y += projectile._verticalVelocity * dt;
      projectile._verticalVelocity -= 22 * dt;
      const ground = this._rampHeight(projectile.distance, projectile.lane) + PROJECTILE_HEIGHT;
      if (projectile.y <= ground) { projectile.y = ground; projectile._airborne = false; projectile._verticalVelocity = 0; }
      return;
    }
    if (!projectile.back) {
      for (const ramp of this.ramps) {
        if (ramp.lane !== null && Math.abs(projectile.lane - ramp.lane) > 2.4) continue;
        if (!this._crossed(previous, projectile.distance, ramp.distance + ramp.length)) continue;
        projectile.y = ramp.height + PROJECTILE_HEIGHT;
        projectile._verticalVelocity = speed * (ramp.height / ramp.length);
        projectile._airborne = true;
        return;
      }
    }
    projectile.y = this._rampHeight(projectile.distance, projectile.lane) + PROJECTILE_HEIGHT;
  }

  _updateWeapons(dt) {
    for (const projectile of this.projectiles) {
      projectile.ttl -= dt;
      if (projectile.ttl <= 0) continue;
      const previous = projectile.distance;
      const speed = projectile.type === 'bullet' ? 70 : projectile.type === 'spin' ? 40
        : projectile.type === 'bale' ? BALE_SPEED : projectile.type === 'gelato' ? 50 : 57;
      projectile.distance += speed * dt * (projectile.back ? -1 : 1);
      if (projectile.type === 'spin') {
        // The catherine wheel does not chase anyone: it sweeps the whole width of the road, edge to edge.
        projectile.phase += dt * 3.4;
        projectile.lane = Math.sin(projectile.phase) * (this._maxLane - 0.6);
      } else if (projectile.type === 'bale') {
        // A bale rolls where it was thrown: it veers out to its own side of the road and stays there. It never
        // chases, which is what leaves a way past three of them.
        projectile.lane = clamp(approach(projectile.lane, projectile.aim, dt * 6), -this._maxLane, this._maxLane);
      } else {
        const target = this.racers.find((racer) => racer.id === projectile.targetId && !racer.finished);
        if (target) projectile.lane = approach(projectile.lane, target.lane, dt * 15);
      }
      this._flyProjectile(projectile, previous, speed, dt);
      // A shot that meets a desk, a cone or a bin blows it up and is spent; a bale flattens it and rolls on. Against
      // a column or a roundabout every shot, bales included, bursts where it hits.
      const smash = this._smashObstacles(projectile, previous);
      if (smash === 'blocked') {
        projectile.ttl = 0;
        projectile._burst = true;
        this._event('pop', { distance: this.track.wrap(projectile.distance), lane: projectile.lane, source: projectile.type });
        continue;
      }
      if (smash && projectile.type !== 'bale') { projectile.ttl = 0; continue; }
      // An animal in the way is bowled over to the verge. The shot is spent on it as on a car; a bale rolls on, as
      // it does over a car. They used to fly straight through ("le armi non fanno nulla agli animali").
      if (this._shootCritters(projectile, previous) && projectile.type !== 'bale') { projectile.ttl = 0; continue; }
      for (const racer of this.racers) {
        const bullet = projectile.type === 'bullet';
        const width = bullet ? 1.1 : projectile.type === 'bale' ? 2.1 : 1.8;
        // A real height comparison now that shots follow the road: a car on a ramp is hit, one sailing over is missed.
        if (racer.id === projectile.ownerId || racer.finished || this._bridgeIds.has(racer.section)
          || Math.abs(racer.y + PROJECTILE_HEIGHT - projectile.y) > (bullet ? 1.5 : 2.2)
          || Math.abs(racer.lane - projectile.lane) > width) continue;
        const swept = projectile.back
          ? this._crossed(projectile.distance, previous, this.track.wrap(racer.progress))
          : this._crossed(previous, projectile.distance, this.track.wrap(racer.progress));
        if (this._close(racer.progress, projectile.distance) >= 2 && !swept) continue;
        // Nothing gets through the rainbow: whatever reaches it bursts against it and is gone.
        if (racer.rainbow > 0) {
          this._event('rainbow-block', { racerId: racer.id, source: projectile.type, ownerId: projectile.ownerId });
          projectile.ttl = 0;
          break;
        }
        // A bale flattens the car and keeps rolling; only a shield stops it.
        if (projectile.type === 'bale') {
          if (this._squash(racer, projectile.ownerId) === 'shield') { projectile.ttl = 0; break; }
          continue;
        }
        // Ice cream does no damage, it blinds. It stops at the car it meets, but an immune car simply is not
        // touched, so the shot carries on instead of vanishing against nothing.
        let landed = true;
        if (projectile.type === 'gelato') landed = this._cream(racer, projectile.ownerId);
        else this._hit(racer, projectile.type, projectile.ownerId);
        if (!landed) continue;
        projectile.ttl = 0;
        break;
      }
    }
    // A catherine wheel that runs out of road bursts where it stops. It used to simply vanish, which is what the
    // children meant by "the pinwheel doesn't go off either" — the firework ended with nothing to see.
    for (const projectile of this.projectiles) {
      if (projectile.ttl > 0 || projectile._burst) continue;
      if (projectile.type !== 'spin' && projectile.type !== 'bale' && projectile.type !== 'gelato') continue;
      projectile._burst = true;
      this._event('pop', { distance: this.track.wrap(projectile.distance), lane: projectile.lane, source: projectile.type });
    }
    if (this.projectiles.some((projectile) => projectile.ttl <= 0)) this.projectiles = this.projectiles.filter((projectile) => projectile.ttl > 0);
    for (const hazard of this.hazards) {
      hazard.ttl -= dt;
      if (hazard.ttl <= 0) continue;
      hazard.age += dt;
      // A bomb has a fuse. It used to sit on the tarmac as a mine for twelve seconds and then disappear, so dropping
      // one behind an empty road did nothing at all — you never saw it go off. Now it always goes off, and anyone
      // caught in the blast when it does is hit, owner included once the fuse is past its first second.
      if (hazard.type === 'bomb' && hazard.age >= BOMB_FUSE) {
        for (const racer of this.racers) {
          if (racer.finished || racer.y > 1.8 || this._bridgeIds.has(racer.section)) continue;
          if (this._close(racer.progress, hazard.distance) < BOMB_BLAST && Math.abs(racer.lane - hazard.lane) < 3.4) {
            this._hit(racer, 'bomb', hazard.ownerId);
          }
        }
        for (const obstacle of this.obstacles) {
          if (this._close(obstacle.distance, hazard.distance) < BOMB_BLAST && Math.abs(obstacle.lane - hazard.lane) < 3.4 + obstacle.radius) {
            this._breakObstacle(obstacle, { source: 'bomb', ownerId: hazard.ownerId });
          }
        }
        for (const critter of this.critters) {
          const { lane } = critterPose(critter, this.time);
          if (this._close(critter.distance, hazard.distance) < BOMB_BLAST && Math.abs(lane - hazard.lane) < 3.4 + critter.radius) {
            this._knockCritter(critter, { lane: hazard.lane, source: 'bomb', ownerId: hazard.ownerId });
          }
        }
        hazard.ttl = 0;
        this._event('pop', { distance: hazard.distance, lane: hazard.lane, source: 'bomb' });
        continue;
      }
      // A bomb arms almost at once: it is thrown four metres back, the owner is protected by name for two seconds,
      // and with the old 0.45 s delay a car right on your tail drove over it before it was live. Jelly and oil
      // keep the longer delay — they are meant to be lying there when the next car arrives, not to catch this one.
      if (hazard.age < (hazard.type === 'bomb' ? 0.18 : 0.45)) continue;
      for (const racer of this.racers) {
        if (racer.finished || racer.y > 1.8 || this._bridgeIds.has(racer.section) || (racer.id === hazard.ownerId && hazard.age < 2)) continue;
        if (hazard.type === 'fountain') {
          // Sparks cover a stretch of road rather than a point, and they stay until they burn out.
          if (this._close(racer.progress, hazard.distance) < hazard.span / 2 && Math.abs(racer.lane - hazard.lane) < 3.2) this._slow(racer, hazard.ownerId);
          continue;
        }
        if (this._close(racer.progress, hazard.distance) < 2.3 && Math.abs(racer.lane - hazard.lane) < 2) {
          if (hazard.type === 'jelly') this._stick(racer, hazard.ownerId);
          else if (hazard.type === 'oil') this._slip(racer, hazard.ownerId);
          else this._hit(racer, 'bomb', hazard.ownerId);
          // Oil stays on the road: the next car slides on it too, until it dries.
          if (hazard.type !== 'oil') hazard.ttl = 0;
          this._event('pop', { distance: hazard.distance, lane: hazard.lane, source: hazard.type });
          break;
        }
      }
      // An animal that wanders into the oil, the jelly or the sparks goes over too and rolls off to the verge. Jelly
      // is spent on it as on a car, oil and sparks stay; a bomb waits for its fuse, and its blast does the rest.
      if (hazard.ttl <= 0 || hazard.type === 'bomb') continue;
      for (const critter of this.critters) {
        if (critter.attack || critter.knocked > 0) continue;
        const { lane } = critterPose(critter, this.time);
        // Only on the tarmac: one resting on the verge is out of the way, and the sparks must not bowl it over
        // again the moment it gets back up.
        if (Math.abs(lane) > this._maxLane + 1.1) continue;
        const reached = hazard.type === 'fountain'
          ? this._close(critter.distance, hazard.distance) < hazard.span / 2 && Math.abs(lane - hazard.lane) < 3.2
          : this._close(critter.distance, hazard.distance) < 2.3 && Math.abs(lane - hazard.lane) < 1.2 + critter.radius;
        if (!reached || !this._knockCritter(critter, { lane: hazard.lane, source: hazard.type, ownerId: hazard.ownerId })) continue;
        if (hazard.type === 'jelly') {
          hazard.ttl = 0;
          this._event('pop', { distance: hazard.distance, lane: hazard.lane, source: hazard.type });
          break;
        }
      }
    }
    if (this.hazards.some((hazard) => hazard.ttl <= 0)) this.hazards = this.hazards.filter((hazard) => hazard.ttl > 0);
  }

  /**
   * Did this shot reach a prop? Same reach rules as for a car: on its lane, below its top, and either sitting on it
   * or swept past it this frame. A breakable prop goes up ('broken'); a roundabout's island stays where it is and the
   * shot bursts against it ('blocked') — a rocket flying straight through something solid was the one thing the
   * children found wrong with the new rules.
   */
  _smashObstacles(projectile, previous) {
    for (const obstacle of this.obstacles) {
      if (obstacle.down > 0) continue;
      if (projectile.y - PROJECTILE_HEIGHT > obstacle.height) continue;
      if (Math.abs(projectile.lane - obstacle.lane) > obstacle.radius + (projectile.type === 'bale' ? 1 : 0.5)) continue;
      const swept = projectile.back
        ? this._crossed(projectile.distance, previous, obstacle.distance)
        : this._crossed(previous, projectile.distance, obstacle.distance);
      if (this._close(projectile.distance, obstacle.distance) > obstacle.radius + 0.6 && !swept) continue;
      if (!obstacle.breakable) return 'blocked';
      return this._breakObstacle(obstacle, { source: projectile.type, ownerId: projectile.ownerId, squash: projectile.type === 'bale' }) ? 'broken' : false;
    }
    return false;
  }

  /** A car touched by a rainbow car goes up in flames and comes back new, as on a third hit. A shield saves it. */
  _blast(victim, ownerId) {
    if (victim.finished || victim.wrecked > 0 || victim.immunity > 0) return;
    if (victim.shield > 0) {
      victim.shield = 0;
      victim.immunity = 1;
      this._event('shield-hit', { racerId: victim.id, source: 'rainbow', ownerId });
      return;
    }
    victim.damage = MAX_DAMAGE;
    victim._repairTimer = 0;
    this._event('hit', { racerId: victim.id, source: 'rainbow', ownerId, damage: victim.damage });
    this._wreck(victim, ownerId);
  }

  _carCollisions(dt) {
    for (let i = 0; i < this.racers.length; i++) {
      const a = this.racers[i];
      if (a.finished) continue;
      for (let j = i + 1; j < this.racers.length; j++) {
        const b = this.racers[j];
        if (b.finished || a.section !== b.section || this._close(a.progress, b.progress) > 2.6 || Math.abs(a.y - b.y) > 1.5) continue;
        const separation = a.lane - b.lane;
        if (Math.abs(separation) >= 1.8) continue;
        if ((a.rainbow > 0) !== (b.rainbow > 0)) {
          const [star, victim] = a.rainbow > 0 ? [a, b] : [b, a];
          this._blast(victim, star.id);
          continue;
        }
        const push = (Math.sign(separation) || (i % 2 ? 1 : -1)) * dt * 2.6;
        a.lane = clamp(a.lane + push, -this._maxLane, this._maxLane);
        b.lane = clamp(b.lane - push, -this._maxLane, this._maxLane);
      }
    }
  }

  /** Progress at the finish line: the results screen estimates from it the time of who is still racing. */
  get finishDistance() {
    return this._finishDistance;
  }

  _updateRanks() {
    const ranking = [...this.racers].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      return b.progress - a.progress || a.id.localeCompare(b.id);
    });
    ranking.forEach((racer, index) => { racer.rank = index + 1; });
  }
}

export default RaceSimulation;
