// Sky Courier: Dawn Run — the sortie state and its physics.
// One fixed-step update per call: throttle sets speed, pitch trades speed
// for altitude, banking turns the heading, and the route advances with the
// distance flown. Rings, the drop and the landing are all judged here, so
// the renderer only ever paints what this file says happened.

import { DAMAGE, DROP, FUEL, LANDING, PLANE, RING, ROUTE, STEP } from './config.js';
import { terrainHeight } from './random.js';

export const EVENT_RING = 1;
export const EVENT_MISS = 2;
export const EVENT_DROP = 4;
export const EVENT_LANDED = 8;
export const EVENT_CRASH = 16;
export const EVENT_FUEL_LOW = 32;

export function createWorld(random) {
  const state = {
    screen: 'title',
    time: 0,
    distance: 0,
    heading: ROUTE.heading,
    altitude: 1200,
    speed: 110,
    throttle: 62,
    pitch: 0,
    bank: 0,
    off: 0,
    fuel: FUEL.start,
    hull: DAMAGE.startHull,
    score: 0,
    combo: 0,
    bestCombo: 0,
    ringsPassed: 0,
    phase: 'rings',
    ringIndex: 0,
    dropDone: false,
    dropScore: 0,
    landed: false,
    crashed: false,
    crashReason: '',
    message: '',
    messageTimer: 0,
    fuelWarned: false,
    rings: ROUTE.rings.map((ring) => ({ ...ring, passed: false, missed: false })),
  };

  function reset() {
    const fresh = createWorld(random);
    Object.assign(state, fresh.state);
    state.screen = 'play';
  }

  function nextRing() {
    return state.rings[state.ringIndex] ?? null;
  }

  function setMessage(text, seconds = 3) {
    state.message = text;
    state.messageTimer = seconds;
  }

  function addScore(points, label) {
    state.score += points;
    setMessage(label, 2.5);
  }

  function passRing(ring) {
    ring.passed = true;
    state.ringsPassed += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const points = RING.points + (state.combo - 1) * RING.comboBonus;
    addScore(points, `Ring ${state.ringsPassed} of 6 — +${points}${state.combo > 1 ? `  combo x${state.combo}` : ''}`);
    state.ringIndex += 1;
    if (state.ringIndex >= state.rings.length) {
      state.phase = 'drop';
      setMessage('Ring run clear! Now the parcel drop — line up on the yellow target.', 4);
    }
    return EVENT_RING;
  }

  function missRing(ring) {
    ring.missed = true;
    state.combo = 0;
    state.ringIndex += 1;
    setMessage(`Ring missed — combo lost. ${state.rings.length - state.ringIndex} rings left.`, 2.5);
    if (state.ringIndex >= state.rings.length) {
      state.phase = 'drop';
      setMessage('Ring run over. Now the parcel drop — line up on the yellow target.', 4);
    }
    return EVENT_MISS;
  }

  function dropParcel() {
    if (state.phase !== 'drop' || state.dropDone) return 0;
    const target = ROUTE.drop;
    const distErr = Math.abs(state.distance - target.dist);
    const offErr = Math.abs(state.off - target.off);
    if (distErr > 0.8) {
      setMessage('Too early — or too late. Fly over the yellow target first.', 2);
      return 0;
    }
    state.dropDone = true;
    const accuracy = Math.max(0, 1 - offErr / 1.2 - Math.max(0, state.altitude - target.alt) / 3000);
    const points = Math.round(DROP.points * (0.4 + 0.6 * accuracy));
    state.dropScore = points;
    addScore(points, accuracy > 0.7 ? `Parcel on target! +${points}` : `Parcel dropped, off the mark. +${points}`);
    state.phase = 'landing';
    setMessage('Parcel away! Final leg: line up with the runway and land.', 4);
    return EVENT_DROP;
  }

  function tryLand() {
    const runway = ROUTE.runway;
    const headingErr = Math.abs(state.heading - ROUTE.runwayHeading);
    const onRunway = Math.abs(state.distance - runway.dist) < runway.length && Math.abs(state.off) < 0.5;
    if (!onRunway) return 0;
    if (state.speed > LANDING.maxSpeed + 25 || headingErr > LANDING.maxHeadingErr + 8) {
      state.crashed = true;
      state.crashReason = state.speed > LANDING.maxSpeed + 25 ? 'Too fast for the runway' : 'Landed sideways — off the runway';
      return EVENT_CRASH;
    }
    const smooth = state.speed <= LANDING.maxSpeed && headingErr <= LANDING.maxHeadingErr;
    const fuelBonus = Math.round(state.fuel * 2);
    const points = LANDING.points + fuelBonus + (smooth ? 100 : 0);
    state.landed = true;
    state.phase = 'done';
    state.speed = 0;
    addScore(points, smooth ? `Greased it! Landing +${points} (fuel bonus ${fuelBonus})` : `Down safe. Landing +${points}`);
    return EVENT_LANDED;
  }

  function crash(reason) {
    if (state.crashed) return EVENT_CRASH;
    state.crashed = true;
    state.crashReason = reason;
    state.hull = 0;
    return EVENT_CRASH;
  }

  /** Advance the sortie by one fixed step. Returns an event bitmask. */
  function step(dt, input) {
    state.time += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.screen !== 'play') return 0;
    let events = 0;

    // Throttle: W / Shift up, S / Ctrl down, held keys move it smoothly.
    state.throttle = Math.max(0, Math.min(100, state.throttle + input.throttle * 55 * dt));
    const targetSpeed = PLANE.minSpeed + (state.throttle / 100) * (PLANE.maxSpeed - PLANE.minSpeed);
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 0.7);

    // Pitch: up climbs and bleeds speed, down dives and gains it.
    state.pitch = Math.max(-14, Math.min(16, state.pitch + input.pitch * 26 * dt));
    const climb = Math.sin((state.pitch * Math.PI) / 180) * state.speed * 1.69;
    state.altitude += climb * dt;
    state.speed = Math.max(PLANE.minSpeed * 0.6, state.speed - Math.sin((state.pitch * Math.PI) / 180) * 14 * dt);

    // Bank and turn: heading follows the bank, the offset follows heading.
    state.bank = Math.max(-PLANE.maxBank, Math.min(PLANE.maxBank, state.bank + input.turn * 70 * dt));
    state.bank *= Math.max(0, 1 - dt * 0.9);
    state.heading += (state.bank / PLANE.maxBank) * PLANE.turnRate * dt;
    state.off += Math.sin(((state.heading - ROUTE.heading) * Math.PI) / 180) * (state.speed / 3600) * dt * 12;
    state.off = Math.max(-3, Math.min(3, state.off));

    // Fuel: heavy throttle burns it; empty tanks mean a glide, not a stop.
    const burn = (FUEL.burnBase + (state.throttle / 100) * FUEL.burnPerThrottle) * dt;
    state.fuel = Math.max(0, state.fuel - burn);
    if (state.fuel <= 0 && state.throttle > 0) {
      state.throttle = Math.max(0, state.throttle - 40 * dt);
      setMessage('Fuel empty — gliding. Find the runway.', 2);
    }
    if (state.fuel < FUEL.reserveWarn && !state.fuelWarned) {
      state.fuelWarned = true;
      events |= EVENT_FUEL_LOW;
      setMessage('Fuel low — throttle discipline now, or this ends in a field.', 4);
    }

    // Distance flown, in nautical miles.
    state.distance += (state.speed / 3600) * dt;

    // Rings: judged as the plane crosses each ring's distance.
    const ring = nextRing();
    if (ring && state.distance >= ring.dist) {
      const altOk = Math.abs(state.altitude - ring.alt) < RING.passAlt;
      const offOk = Math.abs(state.off - ring.off) < RING.passOff;
      events |= altOk && offOk ? passRing(ring) : missRing(ring);
    }

    // Terrain: ridges rise along the route — stay above them. Scraping a
    // ridge wears the hull slowly, so a warning is a warning, not a death.
    const ground = terrainHeight(state.distance);
    if (state.altitude < ground + 150 && state.distance > 0.5 && !state.landed) {
      setMessage('TERRAIN — pull up!', 1);
    }
    if (state.altitude < ground + 60 && state.distance > 0.5 && !state.landed) {
      state.hull -= DAMAGE.ridgeHit * dt * 0.3;
      if (state.hull <= 0) return events | crash('Clipped a ridge in the valley');
    }

    // Ground: only a runway touchdown is a landing.
    if (state.altitude <= ground + 30) {
      state.altitude = ground + 30;
      const runway = ROUTE.runway;
      const nearRunway = Math.abs(state.distance - runway.dist) < runway.length + 0.4;
      if (nearRunway && state.phase === 'landing') {
        events |= tryLand();
      } else {
        return events | crash('Hit the ground away from the runway');
      }
    }

    if (state.altitude > PLANE.ceiling) state.altitude = PLANE.ceiling;
    return events;
  }

  return { state, reset, step, dropParcel, nextRing };
}
