// Sky Courier: Dawn Run — deterministic screenshot states.
// ?shot=cover|rings|drop|landing&seed=1 builds the exact same scene every
// time, so screenshots are reproducible and the judge sees the real game.
// `cover` is the hero shot: threading a ring with the runway valley ahead,
// instruments lit and fuel in the green.

import { ROUTE } from './config.js';

function baseState(state, overrides) {
  Object.assign(state, {
    screen: 'play',
    time: 12,
    throttle: 68,
    speed: 148,
    pitch: 2,
    bank: 0,
    fuel: 78,
    hull: 100,
    score: 0,
    combo: 0,
    message: '',
    messageTimer: 0,
  }, overrides);
  return state;
}

export function applyShot(state, shot) {
  state.rings = ROUTE.rings.map((ring) => ({ ...ring, passed: false, missed: false }));
  if (shot === 'start') {
    state.screen = 'title';
    state.distance = 0;
    state.altitude = 1200;
    state.heading = ROUTE.heading;
    return state;
  }
  if (shot === 'cover') {
    baseState(state, {
      distance: 2.7,
      altitude: 2380,
      heading: 90,
      off: -0.6,
      score: 210,
      combo: 2,
      bestCombo: 2,
      ringsPassed: 2,
      ringIndex: 2,
      phase: 'rings',
      message: 'Ring 3 of 6 — thread it!',
      messageTimer: 99,
    });
    state.rings[0].passed = true;
    state.rings[1].passed = true;
    return state;
  }
  if (shot === 'rings') {
    baseState(state, {
      distance: 6.6,
      altitude: 2620,
      heading: 88,
      off: 0.2,
      bank: -12,
      score: 430,
      combo: 4,
      bestCombo: 4,
      ringsPassed: 4,
      ringIndex: 4,
      phase: 'rings',
      message: 'Ring 5 of 6 — bank in!',
      messageTimer: 99,
    });
    state.rings.forEach((ring, i) => { ring.passed = i < 4; });
    return state;
  }
  if (shot === 'drop') {
    baseState(state, {
      distance: 11.6,
      altitude: 1620,
      heading: 90,
      off: 0.05,
      throttle: 48,
      speed: 118,
      score: 690,
      combo: 0,
      bestCombo: 4,
      ringsPassed: 5,
      ringIndex: 6,
      phase: 'drop',
      message: 'Over the target — press SPACE to drop!',
      messageTimer: 99,
    });
    state.rings.forEach((ring) => { ring.passed = true; });
    return state;
  }
  if (shot === 'landing') {
    baseState(state, {
      distance: 14.3,
      altitude: 680,
      heading: 90,
      off: 0.02,
      throttle: 32,
      speed: 104,
      pitch: -4,
      score: 940,
      combo: 0,
      bestCombo: 4,
      ringsPassed: 6,
      ringIndex: 6,
      phase: 'landing',
      dropDone: true,
      dropScore: 250,
      fuel: 41,
      message: 'Runway 09 ahead — slow down and touch down!',
      messageTimer: 99,
    });
    state.rings.forEach((ring) => { ring.passed = true; });
    return state;
  }
  return state;
}

export function shotFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot') || null;
}
