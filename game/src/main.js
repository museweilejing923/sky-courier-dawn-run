// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens:
// title, play, paused, game over and sortie complete.
//
// ?seed=N fixes the sortie. ?shot=cover|rings|drop|landing (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { ACTION_CONFIRM, ACTION_DROP, ACTION_PAUSE, ACTION_SOUND, createInput } from './input.js';
import { createWorld, EVENT_CRASH, EVENT_DROP, EVENT_FUEL_LOW, EVENT_LANDED, EVENT_MISS, EVENT_RING } from './world.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_DONE, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { applyShot } from './shots.js';
import { createTouch } from './touch.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
// Read-only handle for automated checks (a playtest driving the real
// game): the sortie state and the input, nothing more.
window.__skyCourier = { state: world.state, input: null };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = applyShot(world.state, name);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, readBest());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  window.__skyCourier.input = input;
  createTouch(input);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Flying. Thread the rings, drop the parcel, land on Runway 09.');
  }

  function endGame(crashed) {
    audio.crash();
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Sortie lost. ${world.state.crashReason} Score ${world.state.score}. Best ${best}.`);
  }

  function finishGame() {
    audio.land();
    screen = SCREEN_DONE;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Sortie complete. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_SOUND) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_DROP && screen === SCREEN_PLAY) {
      const events = world.dropParcel();
      if (events & EVENT_DROP) audio.drop();
    }
    // Space starts and restarts too, as the screens promise ("Press Space
    // or click to fly"); Enter and click do the same.
    if (actions & (ACTION_CONFIRM | ACTION_DROP) && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_DONE)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Flying.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const events = world.step(STEP, input.steering(world.state.throttle, STEP));
    audio.engine(world.state.throttle, screen === SCREEN_PLAY);
    if (events & EVENT_RING) audio.ring();
    else if (events & EVENT_MISS) audio.miss();
    if (events & EVENT_FUEL_LOW) audio.alarm();
    if (events & EVENT_CRASH) endGame(true);
    else if (events & EVENT_LANDED) finishGame();
    else if (world.state.crashed) endGame(true);
    else if (world.state.landed) finishGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sky Courier: Dawn Run. Press Space or click to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
