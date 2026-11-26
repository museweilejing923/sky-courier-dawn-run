// Keyboard and pointer input. Held keys give a steering direction; one-shot
// presses (drop the parcel, pause, start) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.

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
const DROP = new Set(['Space']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SOUND = new Set(['KeyM']);

export function createInput(target) {
  const held = new Set();
  let actions = 0;

  function down(event) {
    if (DROP.has(event.code)) {
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

  return {
    /** Steering for one step: pitch, turn and throttle, each -1, 0 or 1. */
    steering() {
      return {
        pitch: (has(PITCH_UP) ? 1 : 0) - (has(PITCH_DOWN) ? 1 : 0),
        turn: (has(TURN_RIGHT) ? 1 : 0) - (has(TURN_LEFT) ? 1 : 0),
        throttle: (has(THROTTLE_UP) ? 1 : 0) - (has(THROTTLE_DOWN) ? 1 : 0),
      };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
