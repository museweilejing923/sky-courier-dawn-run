// Keyboard and pointer input. Held keys give a steering direction; one-shot
// presses (drop the parcel, pause, start) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.
//
// Steering is proportional and smoothed, not binary: the keyboard asks for
// -1 / 0 / 1, a touch stick asks for any value in between, and steering()
// eases the live values toward the target instead of snapping them. A tap
// then gives a small correction and a hold ramps up to full deflection,
// which is what makes the plane feel flyable instead of twitchy. The same
// smoothing applies to the throttle rate. A touch throttle slider can also
// name an absolute throttle target; steering() then drives the throttle
// toward it at the usual rate, and any throttle key takes over again.

export const ACTION_DROP = 1;
export const ACTION_CONFIRM = 2;
export const ACTION_PAUSE = 4;
export const ACTION_SOUND = 8;

const PITCH_UP = new Set(['ArrowUp', 'KeyW']);
const PITCH_DOWN = new Set(['ArrowDown', 'KeyS']);
const TURN_LEFT = new Set(['ArrowLeft', 'KeyA']);
const TURN_RIGHT = new Set(['ArrowRight', 'KeyD']);
const THROTTLE_UP = new Set(['ShiftLeft', 'ShiftRight', 'KeyE']);
const THROTTLE_DOWN = new Set(['ControlLeft', 'ControlRight', 'KeyQ']);
const DROP_KEYS = new Set(['Space']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SOUND = new Set(['KeyM']);

/** How fast the live steering catches its target, per second. */
const EASE = 7;
/** How fast a throttle target is chased, in percent per unit of error. */
const THROTTLE_CHASE = 1 / 15;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  // The stick's proportional ask, -1..1 on each axis; 0, 0 when centred.
  const stick = { pitch: 0, turn: 0 };
  // An absolute throttle target from the touch slider, or null for keys.
  let throttleTarget = null;
  // The live, smoothed steering the loop reads.
  const live = { pitch: 0, turn: 0, throttle: 0 };

  function down(event) {
    if (DROP_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DROP;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (SOUND.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SOUND;
    } else if (
      PITCH_UP.has(event.code) || PITCH_DOWN.has(event.code) ||
      TURN_LEFT.has(event.code) || TURN_RIGHT.has(event.code) ||
      THROTTLE_UP.has(event.code) || THROTTLE_DOWN.has(event.code)
    ) {
      held.add(event.code);
      if (THROTTLE_UP.has(event.code) || THROTTLE_DOWN.has(event.code)) {
        throttleTarget = null;
      }
    } else {
      return;
    }
    event.preventDefault();
  }

  function up(event) {
    held.delete(event.code);
  }

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => held.clear());
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  function has(set) {
    for (const code of set) if (held.has(code)) return true;
    return false;
  }

  function ease(current, goal, dt) {
    return current + (goal - current) * (1 - Math.exp(-EASE * dt));
  }

  return {
    /** The touch stick's proportional ask: pitch up is positive, turn right is positive. */
    setStick(pitch, turn) {
      stick.pitch = clamp(pitch, -1, 1);
      stick.turn = clamp(turn, -1, 1);
    },
    /** The touch slider's absolute throttle target, 0..100, or null to release it. */
    setThrottleTarget(value) {
      throttleTarget = value === null ? null : clamp(value, 0, 100);
    },
    /** Queue a one-shot action bit (drop, pause, confirm) from a touch button. */
    queue(action) {
      actions |= action;
    },
    /**
     * Steering for one step: pitch, turn and throttle, each -1..1, eased
     * toward what the keys or the stick ask for. Pass the plane's current
     * throttle (0..100) so a slider target can be chased.
     */
    steering(currentThrottle, dt) {
      const step = dt ?? 1 / 60;
      const stickActive = Math.abs(stick.pitch) > 0.04 || Math.abs(stick.turn) > 0.04;
      const pitchGoal = stickActive && Math.abs(stick.pitch) > 0.04
        ? stick.pitch
        : (has(PITCH_UP) ? 1 : 0) - (has(PITCH_DOWN) ? 1 : 0);
      const turnGoal = stickActive && Math.abs(stick.turn) > 0.04
        ? stick.turn
        : (has(TURN_RIGHT) ? 1 : 0) - (has(TURN_LEFT) ? 1 : 0);
      const throttleGoal = throttleTarget === null
        ? (has(THROTTLE_UP) ? 1 : 0) - (has(THROTTLE_DOWN) ? 1 : 0)
        : clamp((throttleTarget - currentThrottle) * THROTTLE_CHASE, -1, 1);
      live.pitch = ease(live.pitch, pitchGoal, step);
      live.turn = ease(live.turn, turnGoal, step);
      live.throttle = ease(live.throttle, throttleGoal, step);
      return { pitch: live.pitch, turn: live.turn, throttle: live.throttle };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
