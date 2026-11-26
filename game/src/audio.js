// All sound is synthesized live with WebAudio — no audio files.
// A low engine drone follows the throttle, with a chime for a ring, a thud
// for the parcel, a two-tone alarm for low fuel and a short fanfare for a landing.

export function createAudio() {
  let context = null;
  let drone = null;
  let droneGain = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      drone = context.createOscillator();
      drone.type = 'sawtooth';
      drone.frequency.value = 62;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      droneGain = context.createGain();
      droneGain.gain.value = 0;
      drone.connect(filter).connect(droneGain).connect(context.destination);
      drone.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, seconds, type = 'sine', volume = 0.16) {
    if (!ensure() || muted) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + seconds);
    osc.connect(gain).connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + seconds);
  }

  return {
    unlock() {
      ensure();
      if (context && context.state === 'suspended') context.resume();
    },
    /** Keep the engine drone in step with throttle (0–100) and speed. */
    engine(throttle, flying) {
      if (!ensure() || muted) return;
      const target = flying ? 0.02 + (throttle / 100) * 0.05 : 0;
      droneGain.gain.setTargetAtTime(target, context.currentTime, 0.2);
      drone.frequency.setTargetAtTime(52 + throttle * 0.9, context.currentTime, 0.2);
    },
    ring() {
      blip(880, 0.25);
      setTimeout(() => blip(1318, 0.3), 90);
    },
    miss() {
      blip(220, 0.3, 'triangle', 0.12);
    },
    drop() {
      blip(180, 0.25, 'triangle', 0.2);
      setTimeout(() => blip(520, 0.35), 160);
    },
    alarm() {
      blip(660, 0.18, 'square', 0.1);
      setTimeout(() => blip(660, 0.18, 'square', 0.1), 240);
    },
    land() {
      [523, 659, 784, 1046].forEach((freq, i) => setTimeout(() => blip(freq, 0.35), i * 130));
    },
    crash() {
      blip(110, 0.7, 'sawtooth', 0.2);
    },
    toggleMute() {
      muted = !muted;
      if (droneGain) droneGain.gain.value = 0;
      return muted;
    },
  };
}
