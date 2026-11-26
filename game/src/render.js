// Drawing only: the sortie state and the current screen in, pixels out.
// A chase view over dawn country — sky and sun above the horizon, patchwork
// fields and a river below it, the courier plane in frame, rings and the
// runway ahead, and a lit HUD with altitude, speed and heading.

import { FIELD, FONT, LANDING, MISSION_TEXT, PALETTE, ROUTE } from './config.js';
import { terrainHeight } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_DONE = 'done';

const CLOUDS = [
  { x: 0.12, y: 0.14, s: 1.4 }, { x: 0.38, y: 0.08, s: 1.0 }, { x: 0.62, y: 0.18, s: 1.7 },
  { x: 0.84, y: 0.1, s: 1.1 }, { x: 0.25, y: 0.26, s: 0.8 }, { x: 0.72, y: 0.3, s: 0.9 },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align = 'left', weight = 600) {
    const key = `${weight}-${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function horizonY(state) {
    return FIELD.horizonRest - state.pitch * 7 - (state.altitude / 6500) * 40;
  }

  function drawSky(state) {
    const horizon = horizonY(state);
    const grad = context.createLinearGradient(0, 0, 0, horizon + 40);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(0.55, PALETTE.skyMid);
    grad.addColorStop(1, PALETTE.skyLow);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, horizon + 40);
    // Low dawn sun, fixed to the east the route flies toward.
    const sunX = FIELD.width * 0.68;
    const sunY = horizon - 150;
    const glow = context.createRadialGradient(sunX, sunY, 8, sunX, sunY, 190);
    glow.addColorStop(0, 'rgba(255, 217, 138, 0.95)');
    glow.addColorStop(0.35, 'rgba(255, 190, 110, 0.45)');
    glow.addColorStop(1, 'rgba(255, 190, 110, 0)');
    context.fillStyle = glow;
    context.fillRect(sunX - 200, sunY - 200, 400, 400);
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(sunX, sunY, 34, 0, Math.PI * 2);
    context.fill();
    // Clouds drift with heading and distance so the sky never sits still.
    context.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (const cloud of CLOUDS) {
      const cx = (((cloud.x * FIELD.width - state.distance * 130 - state.heading * 2) % (FIELD.width + 320)) + FIELD.width + 320) % (FIELD.width + 320) - 160;
      const cy = cloud.y * FIELD.height * 0.35 + Math.sin(state.distance + cloud.x * 9) * 5;
      const s = cloud.s * 0.7;
      context.beginPath();
      context.ellipse(cx, cy, 62 * s, 16 * s, 0, 0, Math.PI * 2);
      context.ellipse(cx + 44 * s, cy + 6 * s, 44 * s, 12 * s, 0, 0, Math.PI * 2);
      context.ellipse(cx - 46 * s, cy + 7 * s, 40 * s, 11 * s, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawHills(state) {
    const horizon = horizonY(state);
    context.fillStyle = PALETTE.hillFar;
    context.beginPath();
    context.moveTo(0, horizon);
    for (let x = 0; x <= FIELD.width; x += 32) {
      const ridge = Math.sin((x + state.distance * 220 + state.heading * 6) * 0.006) * 46
        + Math.sin((x + state.distance * 90) * 0.013) * 22;
      context.lineTo(x, horizon - 58 - ridge);
    }
    context.lineTo(FIELD.width, horizon);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.hillNear;
    context.beginPath();
    context.moveTo(0, horizon);
    for (let x = 0; x <= FIELD.width; x += 32) {
      const ridge = Math.sin((x + state.distance * 420 + state.heading * 10) * 0.008) * 26
        + Math.sin((x + state.distance * 160) * 0.02) * 12;
      context.lineTo(x, horizon - 18 - ridge);
    }
    context.lineTo(FIELD.width, horizon);
    context.closePath();
    context.fill();
  }

  function drawGround(state) {
    const horizon = horizonY(state);
    // Base ground first, so the field bands never leave a bare wedge.
    context.fillStyle = PALETTE.fieldC;
    context.fillRect(0, horizon, FIELD.width, FIELD.height - horizon);
    const fields = [PALETTE.fieldA, PALETTE.fieldB, PALETTE.fieldC, PALETTE.fieldD];
    // Patchwork fields rush past in perspective bands as distance grows.
    for (let band = 0; band < 9; band += 1) {
      const t0 = band / 9;
      const t1 = (band + 1) / 9;
      const y0 = horizon + t0 * t0 * (FIELD.height - horizon);
      const y1 = horizon + t1 * t1 * (FIELD.height - horizon);
      const shift = Math.floor(state.distance * 3 + band) % 4;
      for (let col = -1; col < 5; col += 1) {
        const colour = fields[(col + shift + band) % 4];
        const x0 = FIELD.width / 2 + (col - 0.5 - (state.off + (state.heading - ROUTE.heading) * 0.02)) * (FIELD.width * 0.28) * (0.4 + t0);
        const x1 = FIELD.width / 2 + (col + 0.5 - (state.off + (state.heading - ROUTE.heading) * 0.02)) * (FIELD.width * 0.28) * (0.4 + t0);
        context.fillStyle = colour;
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y0);
        context.lineTo(FIELD.width / 2 + (col + 0.5 - state.off) * (FIELD.width * 0.28) * (0.4 + t1), y1);
        context.lineTo(FIELD.width / 2 + (col - 0.5 - state.off) * (FIELD.width * 0.28) * (0.4 + t1), y1);
        context.closePath();
        context.fill();
      }
    }
    // A river winds across the valley floor, left of the route.
    context.strokeStyle = PALETTE.river;
    context.lineWidth = 10;
    context.beginPath();
    for (let y = horizon; y <= FIELD.height; y += 24) {
      const t = (y - horizon) / (FIELD.height - horizon);
      const x = FIELD.width * 0.2 + Math.sin(state.distance * 0.7 + t * 5) * 60 * t - state.off * 120 * t;
      if (y === horizon) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    // A pale road runs parallel to the route, right of it.
    context.strokeStyle = PALETTE.road;
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(FIELD.width * 0.78 - state.off * 90, horizon + 4);
    context.lineTo(FIELD.width * 0.86 - state.off * 200, FIELD.height);
    context.stroke();
  }

  function projectAhead(state, dist, off, alt) {
    const ahead = Math.max(0.15, dist - state.distance);
    const k = 1 / (ahead + 1);
    const horizon = horizonY(state);
    return {
      x: FIELD.width / 2 + (off - state.off) * 380 * (k * 2) - (state.heading - ROUTE.heading) * 6 * k,
      y: horizon - (alt - state.altitude) * 0.22 * (k * 1.5) - 36 * k,
      r: 55 + 150 * k,
      ahead,
    };
  }

  function drawRings(state) {
    for (const ring of state.rings) {
      if (ring.passed || ring.missed) continue;
      if (ring.dist < state.distance) continue;
      const p = projectAhead(state, ring.dist, ring.off, ring.alt);
      if (p.ahead > 4) continue;
      const pulse = 1 + Math.sin(state.time * 5) * 0.06;
      context.strokeStyle = PALETTE.ring;
      context.lineWidth = Math.max(4, p.r / 14);
      context.beginPath();
      context.ellipse(p.x, p.y, p.r * pulse, p.r * 0.82 * pulse, 0, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = 'rgba(255, 176, 32, 0.18)';
      context.beginPath();
      context.ellipse(p.x, p.y, p.r * pulse, p.r * 0.82 * pulse, 0, 0, Math.PI * 2);
      context.fill();
      text(`${Math.round(p.ahead * 10) / 10} nm`, p.x, p.y + p.r + 26, 18, PALETTE.text, 'center');
    }
  }

  function drawDropTarget(state) {
    if (state.phase !== 'drop') return;
    const target = ROUTE.drop;
    const p = projectAhead(state, target.dist, target.off, 0);
    if (p.ahead > 4 || p.ahead < 0) return;
    const r = Math.max(12, 90 * (1 / (p.ahead + 1)) + 30);
    // A light pillar marks the target from the sky, so it reads even when
    // the plane flies right over the ground marker.
    const horizon = horizonY(state);
    const beam = context.createLinearGradient(0, horizon, 0, FIELD.height - 60);
    beam.addColorStop(0, 'rgba(255, 176, 32, 0)');
    beam.addColorStop(1, 'rgba(255, 176, 32, 0.55)');
    context.fillStyle = beam;
    context.fillRect(p.x - 7, horizon, 14, FIELD.height - 60 - horizon);
    context.strokeStyle = PALETTE.amber;
    context.lineWidth = 5;
    context.beginPath();
    context.ellipse(p.x, FIELD.height - 60, r, r * 0.32, 0, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = 'rgba(255, 176, 32, 0.25)';
    context.beginPath();
    context.ellipse(p.x, FIELD.height - 60, r, r * 0.32, 0, 0, Math.PI * 2);
    context.fill();
    text('DROP ZONE', p.x, FIELD.height - 60 - r * 0.32 - 12, 20, PALETTE.amber, 'center');
  }

  function drawRunway(state) {
    if (state.phase !== 'landing' && state.phase !== 'done') return;
    const runway = ROUTE.runway;
    const ahead = runway.dist - state.distance;
    if (ahead > 3.5 || ahead < -1.2) return;
    const horizon = horizonY(state);
    const cx = FIELD.width / 2 - state.off * 260 - (state.heading - ROUTE.heading) * 14;
    const nearW = 150;
    const farW = Math.max(8, 150 * (0.25 / (ahead + 0.25)));
    const yNear = FIELD.height - 10;
    const yFar = horizon + 26 + Math.max(0, 2.2 - ahead) * 30;
    context.fillStyle = PALETTE.runway;
    context.beginPath();
    context.moveTo(cx - nearW, yNear);
    context.lineTo(cx - farW, yFar);
    context.lineTo(cx + farW, yFar);
    context.lineTo(cx + nearW, yNear);
    context.closePath();
    context.fill();
    context.strokeStyle = PALETTE.runwayMark;
    context.lineWidth = 4;
    context.setLineDash([18, 16]);
    context.beginPath();
    context.moveTo(cx, yNear - 6);
    context.lineTo(cx, yFar + 4);
    context.stroke();
    context.setLineDash([]);
    text('RWY 09', cx, yFar - 12, 22, PALETTE.text, 'center');
  }

  function drawPlane(state, screen) {
    const cx = FIELD.width / 2;
    const cy = FIELD.height - 118 + state.pitch * 1.2;
    const bankRad = (state.bank * Math.PI) / 180;
    context.save();
    context.translate(cx, cy);
    context.scale(1.35, 1.35);
    context.rotate(bankRad * 0.55);
    // Tail fin and stabiliser, seen from behind.
    context.fillStyle = PALETTE.planeTrim;
    context.beginPath();
    context.moveTo(-16, -52);
    context.lineTo(0, -102);
    context.lineTo(16, -52);
    context.closePath();
    context.fill();
    context.fillStyle = '#b8c4d0';
    context.fillRect(-92, -50, 184, 15);
    // Fuselage: cream top, red belly, blue cheatline, lit tail light.
    context.fillStyle = PALETTE.planeBody;
    context.beginPath();
    context.ellipse(0, 0, 54, 72, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.planeBelly;
    context.beginPath();
    context.ellipse(0, 30, 48, 38, 0, 0, Math.PI);
    context.fill();
    context.fillStyle = PALETTE.planeTrim;
    context.fillRect(-54, -10, 108, 8);
    context.fillStyle = '#2b2f36';
    context.beginPath();
    context.ellipse(0, -34, 30, 16, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#9fd8ff';
    context.beginPath();
    context.ellipse(0, -36, 22, 10, 0, 0, Math.PI * 2);
    context.fill();
    // Wings with red tips and navigation lights.
    context.fillStyle = PALETTE.planeBody;
    context.beginPath();
    context.moveTo(-48, -20);
    context.lineTo(-218, 4);
    context.lineTo(-206, 26);
    context.lineTo(-42, 14);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(48, -20);
    context.lineTo(218, 4);
    context.lineTo(206, 26);
    context.lineTo(42, 14);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.planeBelly;
    context.fillRect(-218, 4, 18, 20);
    context.fillRect(200, 4, 18, 20);
    context.fillStyle = PALETTE.green;
    context.beginPath();
    context.arc(-214, 14, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.red;
    context.beginPath();
    context.arc(214, 14, 6, 0, Math.PI * 2);
    context.fill();
    // Spinning prop disc ahead of the nose.
    context.fillStyle = 'rgba(201, 212, 222, 0.4)';
    context.beginPath();
    context.ellipse(0, -84, 13, 48, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#3a3f47';
    context.beginPath();
    context.arc(0, -84, 7, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (screen === SCREEN_PLAY && state.altitude < terrainHeight(state.distance) + 150) {
      text('TERRAIN — PULL UP', FIELD.width / 2, 150, 30, PALETTE.red, 'center', 800);
    }
  }

  function gauge(x, y, w, label, value, colour) {
    context.fillStyle = 'rgba(20, 26, 36, 0.85)';
    context.fillRect(x, y, w, 44);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.strokeRect(x, y, w, 44);
    text(label, x + 10, y + 19, 13, PALETTE.muted, 'left', 700);
    context.fillStyle = 'rgba(255, 255, 255, 0.14)';
    context.fillRect(x + 10, y + 26, w - 20, 8);
    context.fillStyle = colour;
    context.fillRect(x + 10, y + 26, (w - 20) * Math.max(0, Math.min(1, value)), 8);
  }

  function drawHud(state, best) {
    // Top instrument bar: altitude, speed and heading, lit and legible.
    context.fillStyle = 'rgba(20, 26, 36, 0.88)';
    context.fillRect(0, 0, FIELD.width, 64);
    const instruments = [
      ['ALT', `${Math.round(state.altitude)} ft`],
      ['SPD', `${Math.round(state.speed)} kt`],
      ['HDG', `${String(Math.round(((state.heading % 360) + 360) % 360)).padStart(3, '0')}°`],
      ['V/S', `${state.pitch >= 0 ? '+' : ''}${Math.round(Math.sin((state.pitch * Math.PI) / 180) * state.speed * 101)} fpm`],
    ];
    instruments.forEach(([label, value], i) => {
      const x = 24 + i * 190;
      text(label, x, 22, 13, PALETTE.muted, 'left', 700);
      text(value, x, 50, 26, PALETTE.text, 'left', 800);
    });
    // Heading is shown digitally in the top bar (HDG), so no tape here:
    // a tape under the mission line collided with the objective text.
    text(`SCORE ${state.score}`, FIELD.width - 24, 28, 20, PALETTE.text, 'right', 800);
    text(`BEST ${Math.max(best, state.score)}`, FIELD.width - 24, 52, 14, PALETTE.muted, 'right', 700);
    // Left gauges: throttle, fuel, hull.
    gauge(24, 84, 190, `THR ${Math.round(state.throttle)}%`, state.throttle / 100, PALETTE.skyMid);
    gauge(24, 136, 190, `FUEL ${Math.round(state.fuel)}%`, state.fuel / 100, state.fuel < FUEL_WARN ? PALETTE.red : PALETTE.amber);
    gauge(24, 188, 190, `HULL ${Math.round(state.hull)}%`, state.hull / 100, state.hull < 40 ? PALETTE.red : PALETTE.green);
    // Mission banner and objective.
    text(MISSION_TEXT[state.phase], FIELD.width / 2, 96, 20, PALETTE.amber, 'center', 800);
    const ringText = state.phase === 'rings' ? `Ring ${Math.min(state.ringIndex + 1, 6)} of 6` : state.phase === 'drop' ? 'Parcel on board' : state.phase === 'landing' ? 'Runway 09 — 15.0 nm' : 'Sortie complete';
    text(ringText, FIELD.width / 2, 122, 16, PALETTE.text, 'center', 700);
    if (state.message && state.messageTimer > 0) {
      text(state.message, FIELD.width / 2, 168, 22, PALETTE.text, 'center', 700);
    }
    // Attitude indicator, bottom left: bank and pitch at a glance.
    const ax = 92;
    const ay = FIELD.height - 92;
    context.save();
    context.beginPath();
    context.arc(ax, ay, 52, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = PALETTE.skyMid;
    context.fillRect(ax - 52, ay - 52 - state.pitch * 2, 104, 52 + state.pitch * 2);
    context.fillStyle = PALETTE.fieldC;
    context.fillRect(ax - 52, ay - state.pitch * 2, 104, 104);
    context.restore();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(ax, ay, 52, 0, Math.PI * 2);
    context.stroke();
    context.save();
    context.translate(ax, ay);
    context.rotate((state.bank * Math.PI) / 180);
    context.fillStyle = PALETTE.amber;
    context.fillRect(-30, -3, 60, 6);
    context.restore();
    text('ATT', ax, ay + 72, 12, PALETTE.muted, 'center', 700);
    // Controls hint, bottom right.
    text('↑↓ pitch · ←→ turn · Shift/Ctrl throttle · Space drop · P pause', FIELD.width - 24, FIELD.height - 20, 14, 'rgba(238, 241, 245, 0.85)', 'right', 600);
  }

  function drawPanel(title, lines, prompt, accent = PALETTE.amber) {
    const height = 150 + lines.length * 34 + 70;
    const x = (FIELD.width - 620) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(20, 26, 36, 0.92)';
    context.fillRect(x, y, 620, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, 620, height);
    text(title, FIELD.width / 2, y + 72, 46, PALETTE.text, 'center', 800);
    lines.forEach((line, i) => {
      text(line, FIELD.width / 2, y + 128 + i * 34, 20, PALETTE.muted, 'center', 600);
    });
    text(prompt, FIELD.width / 2, y + height - 34, 22, accent, 'center', 700);
  }

  /** Paint one frame: the world, then the HUD or a panel for the screen. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.panel;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state);
    drawHills(state);
    drawGround(state);
    drawRunway(state);
    drawDropTarget(state);
    drawRings(state);
    drawPlane(state, screen);
    if (screen === SCREEN_TITLE) {
      drawPanel('SKY COURIER', ['Dawn Run — one sortie, three jobs.', 'Thread six rings, drop the parcel, land on Runway 09.', 'Watch the fuel. Mind the ridges. Grease the landing.'], 'Press Space or click to fly', PALETTE.amber);
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The valley will wait for you.'], 'Press P to keep flying');
    } else if (screen === SCREEN_OVER) {
      drawPanel('Sortie lost', [state.crashReason || 'The courier went down.', `Score ${state.score}  ·  Rings ${state.ringsPassed} of 6`], 'Press Space to fly again', PALETTE.red);
    } else if (screen === SCREEN_DONE) {
      drawPanel('SORTIE COMPLETE', [`Score ${state.score}  ·  Best combo x${Math.max(1, state.bestCombo)}`, `Rings ${state.ringsPassed} of 6  ·  Parcel +${state.dropScore}`, `Fuel left ${Math.round(state.fuel)}%  ·  Hull ${Math.round(state.hull)}%`], 'Press Space to fly again', PALETTE.green);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}

const FUEL_WARN = 25;
