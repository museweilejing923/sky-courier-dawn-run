// Touch controls for phones and tablets: a floating stick for pitch and
// turn, a throttle slider that stays where you put it, and drop / pause
// buttons. This file only builds its controls on a touch device, so the
// desktop game and the screenshots are untouched. The stick and the slider
// talk to input.js through its analog API; nothing in the flight model
// knows or cares whether the ask came from keys or fingers.
import { ACTION_CONFIRM, ACTION_DROP, ACTION_PAUSE } from './input.js';

/** Stick travel, in CSS pixels, from centre to full deflection. */
const STICK_RADIUS = 56;
/** Stick movement inside this radius reads as centred. */
const STICK_DEAD = 8;

function makeButton(label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.style.cssText = [
    'width:64px;height:56px;border-radius:14px',
    'border:1px solid rgba(255,255,255,.35)',
    'background:rgba(20,26,36,.55);color:#fff',
    'font:600 15px/1 system-ui,sans-serif',
    'touch-action:none;-webkit-user-select:none;user-select:none',
  ].join(';');
  return button;
}

export function createTouch(input) {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return null;

  const root = document.createElement('div');
  root.id = 'touch';
  root.style.cssText = [
    'display:flex;position:fixed;left:0;right:0;bottom:0;z-index:5',
    'padding:10px 12px calc(10px + env(safe-area-inset-bottom))',
    'justify-content:flex-end;align-items:flex-end;pointer-events:none',
  ].join(';');

  // ---- The stick: appears where the finger lands on the left half. ----
  const stickZone = document.createElement('div');
  stickZone.style.cssText = 'position:fixed;left:0;top:0;bottom:0;width:45%;z-index:6;touch-action:none';
  const base = document.createElement('div');
  base.style.cssText = [
    'display:none;position:fixed;width:124px;height:124px;border-radius:50%',
    'border:2px solid rgba(255,255,255,.35);background:rgba(20,26,36,.35)',
    'transform:translate(-50%,-50%);pointer-events:none;z-index:7',
  ].join(';');
  const knob = document.createElement('div');
  knob.style.cssText = [
    'display:none;position:fixed;width:56px;height:56px;border-radius:50%',
    'background:rgba(255,190,80,.75);border:2px solid rgba(255,255,255,.6)',
    'transform:translate(-50%,-50%);pointer-events:none;z-index:8',
  ].join(';');
  document.body.append(stickZone, base, knob);

  let stickId = null;
  let origin = { x: 0, y: 0 };

  function stickMove(clientX, clientY) {
    const dx = clientX - origin.x;
    const dy = clientY - origin.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, STICK_RADIUS);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;
    const mag = dist < STICK_DEAD ? 0 : clamped / STICK_RADIUS;
    knob.style.left = `${origin.x + nx * clamped}px`;
    knob.style.top = `${origin.y + ny * clamped}px`;
    // Drag up climbs, drag right banks right; the stick springs back on release.
    input.setStick(-ny * mag, nx * mag);
  }

  stickZone.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    stickId = event.pointerId;
    origin = { x: event.clientX, y: event.clientY };
    base.style.display = 'block';
    knob.style.display = 'block';
    base.style.left = `${origin.x}px`;
    base.style.top = `${origin.y}px`;
    knob.style.left = `${origin.x}px`;
    knob.style.top = `${origin.y}px`;
    input.setStick(0, 0);
    input.queue(ACTION_CONFIRM);
    stickZone.setPointerCapture(event.pointerId);
  });
  stickZone.addEventListener('pointermove', (event) => {
    if (event.pointerId !== stickId) return;
    event.preventDefault();
    stickMove(event.clientX, event.clientY);
  });
  function stickEnd(event) {
    if (event.pointerId !== stickId) return;
    stickId = null;
    input.setStick(0, 0);
    base.style.display = 'none';
    knob.style.display = 'none';
  }
  stickZone.addEventListener('pointerup', stickEnd);
  stickZone.addEventListener('pointercancel', stickEnd);

  // ---- Throttle slider: drag to a setting, it stays there. ----
  const throttle = document.createElement('div');
  throttle.style.cssText = [
    'display:flex;flex-direction:column;align-items:center;gap:6px',
    'pointer-events:auto;touch-action:none',
  ].join(';');
  const throttleLabel = document.createElement('div');
  throttleLabel.textContent = '油门 62%';
  throttleLabel.style.cssText = 'color:#fff;font:600 12px/1 system-ui,sans-serif;text-shadow:0 1px 2px rgba(0,0,0,.7)';
  const track = document.createElement('div');
  track.style.cssText = [
    'position:relative;width:44px;height:168px;border-radius:22px',
    'border:1px solid rgba(255,255,255,.35);background:rgba(20,26,36,.55)',
    'touch-action:none',
  ].join(';');
  const fill = document.createElement('div');
  fill.style.cssText = [
    'position:absolute;left:4px;right:4px;bottom:4px;height:62%',
    'border-radius:18px;background:linear-gradient(to top,#ffb84d,#ff7a3d)',
  ].join(';');
  track.append(fill);
  throttle.append(throttleLabel, track);

  let throttleId = null;
  function setThrottle(clientY) {
    const rect = track.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    const value = Math.round(fraction * 100);
    fill.style.height = `${4 + fraction * 92}%`;
    throttleLabel.textContent = `油门 ${value}%`;
    input.setThrottleTarget(value);
  }
  track.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    throttleId = event.pointerId;
    track.setPointerCapture(event.pointerId);
    setThrottle(event.clientY);
  });
  track.addEventListener('pointermove', (event) => {
    if (event.pointerId !== throttleId) return;
    event.preventDefault();
    setThrottle(event.clientY);
  });
  function throttleEnd(event) {
    if (event.pointerId !== throttleId) return;
    throttleId = null;
  }
  track.addEventListener('pointerup', throttleEnd);
  track.addEventListener('pointercancel', throttleEnd);

  // ---- Drop and pause buttons. ----
  const buttons = document.createElement('div');
  buttons.style.cssText = 'display:flex;flex-direction:column;gap:8px;pointer-events:auto';
  const dropButton = makeButton('投包');
  const pauseButton = makeButton('暂停');
  dropButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    input.queue(ACTION_DROP);
    input.queue(ACTION_CONFIRM);
  });
  pauseButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    input.queue(ACTION_PAUSE);
  });
  buttons.append(dropButton, pauseButton);

  const right = document.createElement('div');
  right.style.cssText = 'display:flex;gap:10px;align-items:flex-end;pointer-events:auto';
  right.append(throttle, buttons);
  root.append(right);
  document.body.append(root);
  return { root, stickZone };
}
