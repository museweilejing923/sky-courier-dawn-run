// Drawing only: the sortie state and the current screen in, pixels out.
// A chase view over dawn country, finished to a tight, polished frame —
// layered dawn sky with a low sun and lit clouds, three hazy ridges,
// patchwork fields with hedgerows and a glinting river, the courier plane
// in frame, glowing rings and a lit runway ahead, and a glassy HUD with
// altitude, speed and heading.

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

// Thin high cirrus, barely there, so the upper sky is not empty.
const CIRRUS = [
  { x: 0.08, y: 0.05, w: 190 }, { x: 0.55, y: 0.03, w: 240 }, { x: 0.9, y: 0.06, w: 170 },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Rounded-rectangle path (roundRect is not in every canvas). */
function rr(context, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + rad, y);
  context.lineTo(x + w - rad, y);
  context.arcTo(x + w, y, x + w, y + rad, rad);
  context.lineTo(x + w, y + h - rad);
  context.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  context.lineTo(x + rad, y + h);
  context.arcTo(x, y + h, x, y + h - rad, rad);
  context.lineTo(x, y + rad);
  context.arcTo(x, y, x + rad, y, rad);
  context.closePath();
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
    grad.addColorStop(0, '#163a63');
    grad.addColorStop(0.35, '#3f74ad');
    grad.addColorStop(0.62, PALETTE.skyMid);
    grad.addColorStop(0.82, '#f2b877');
    grad.addColorStop(1, PALETTE.skyLow);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, horizon + 40);
    // Low dawn sun, fixed to the east the route flies toward.
    const sunX = FIELD.width * 0.68;
    const sunY = horizon - 150;
    const glow = context.createRadialGradient(sunX, sunY, 8, sunX, sunY, 260);
    glow.addColorStop(0, 'rgba(255, 217, 138, 0.9)');
    glow.addColorStop(0.3, 'rgba(255, 190, 110, 0.42)');
    glow.addColorStop(1, 'rgba(255, 190, 110, 0)');
    context.fillStyle = glow;
    context.fillRect(sunX - 270, sunY - 270, 540, 540);
    // A flat light streak on the horizon under the sun.
    context.fillStyle = 'rgba(255, 205, 130, 0.28)';
    context.beginPath();
    context.ellipse(sunX, horizon - 6, 300, 10, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(sunX, sunY, 34, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(sunX, sunY, 41, 0, Math.PI * 2);
    context.stroke();
    // Thin cirrus high up.
    context.fillStyle = 'rgba(255, 255, 255, 0.28)';
    for (const streak of CIRRUS) {
      const cx = (((streak.x * FIELD.width - state.distance * 40) % (FIELD.width + 480)) + FIELD.width + 480) % (FIELD.width + 480) - 240;
      context.beginPath();
      context.ellipse(cx, streak.y * FIELD.height * 0.4 + 70, streak.w, 5, 0, 0, Math.PI * 2);
      context.fill();
    }
    // Clouds drift with heading and distance so the sky never sits still.
    // Each cloud is drawn twice: a lavender shadow base, then the lit top.
    for (const cloud of CLOUDS) {
      const cx = (((cloud.x * FIELD.width - state.distance * 130 - state.heading * 2) % (FIELD.width + 320)) + FIELD.width + 320) % (FIELD.width + 320) - 160;
      const cy = cloud.y * FIELD.height * 0.5 + 60 + Math.sin(state.distance + cloud.x * 9) * 5;
      const s = cloud.s * 0.7;
      const puffs = [
        [0, 0, 62, 16], [44, 6, 44, 12], [-46, 7, 40, 11], [20, -8, 38, 11], [-22, -7, 34, 10],
      ];
      context.fillStyle = 'rgba(216, 200, 232, 0.35)';
      for (const [dx, dy, rx, ry] of puffs) {
        context.beginPath();
        context.ellipse(cx + dx * s, cy + dy * s + 7 * s, rx * s, ry * s, 0, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = 'rgba(255, 255, 255, 0.88)';
      for (const [dx, dy, rx, ry] of puffs) {
        context.beginPath();
        context.ellipse(cx + dx * s, cy + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
        context.fill();
      }
    }
    // Warm haze hugging the horizon.
    const haze = context.createLinearGradient(0, horizon - 46, 0, horizon + 10);
    haze.addColorStop(0, 'rgba(255, 220, 160, 0)');
    haze.addColorStop(1, 'rgba(255, 220, 160, 0.22)');
    context.fillStyle = haze;
    context.fillRect(0, horizon - 46, FIELD.width, 56);
  }

  function ridge(state, base, amp1, amp2, color) {
    const horizon = horizonY(state);
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, horizon);
    for (let x = 0; x <= FIELD.width; x += 24) {
      const ridgeY = Math.sin((x + state.distance * 220 + state.heading * 6) * 0.006) * amp1
        + Math.sin((x + state.distance * 90) * 0.013) * amp2;
      context.lineTo(x, horizon - base - ridgeY);
    }
    context.lineTo(FIELD.width, horizon);
    context.closePath();
    context.fill();
  }

  function drawHills(state) {
    // Three ridges in atmospheric perspective: pale far, mid blue, near green.
    ridge(state, 96, 30, 14, '#8ba6c2');
    ridge(state, 64, 38, 18, '#6f8fae');
    ridge(state, 26, 26, 12, '#55764f');
  }

  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function drawGround(state) {
    const horizon = horizonY(state);
    // Base ground first, so the field bands never leave a bare wedge.
    context.fillStyle = PALETTE.fieldC;
    context.fillRect(0, horizon, FIELD.width, FIELD.height - horizon);
    const fields = [PALETTE.fieldA, PALETTE.fieldB, PALETTE.fieldC, PALETTE.fieldD];
    // Patchwork fields rush past in perspective bands as distance grows.
    // Hedgerow lines and a few tree dots keep each cell reading as a field.
    for (let band = 0; band < 12; band += 1) {
      const t0 = band / 12;
      const t1 = (band + 1) / 12;
      const y0 = horizon + t0 * t0 * (FIELD.height - horizon);
      const y1 = horizon + t1 * t1 * (FIELD.height - horizon);
      const shift = Math.floor(state.distance * 3 + band) % 4;
      for (let col = -1; col < 5; col += 1) {
        const colour = fields[(col + shift + band) % 4];
        const x0 = FIELD.width / 2 + (col - 0.5 - (state.off + (state.heading - ROUTE.heading) * 0.02)) * (FIELD.width * 0.28) * (0.4 + t0);
        const x1 = FIELD.width / 2 + (col + 0.5 - (state.off + (state.heading - ROUTE.heading) * 0.02)) * (FIELD.width * 0.28) * (0.4 + t0);
        const bx0 = FIELD.width / 2 + (col - 0.5 - state.off) * (FIELD.width * 0.28) * (0.4 + t1);
        const bx1 = FIELD.width / 2 + (col + 0.5 - state.off) * (FIELD.width * 0.28) * (0.4 + t1);
        context.fillStyle = colour;
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y0);
        context.lineTo(bx1, y1);
        context.lineTo(bx0, y1);
        context.closePath();
        context.fill();
        context.strokeStyle = 'rgba(30, 50, 25, 0.28)';
        context.lineWidth = 1;
        context.stroke();
        // Tree dots on some cells, placed by a stable hash so they do not jump.
        const h = hash(band * 7 + col * 13 + shift);
        if (h < 0.34 && y1 - y0 > 8) {
          context.fillStyle = 'rgba(46, 90, 44, 0.85)';
          const n = 2 + Math.floor(h * 10) % 3;
          for (let i = 0; i < n; i += 1) {
            const tx = lerp(x0, x1, hash(band * 31 + col * 17 + i * 5));
            const ty = lerp(y0, y1, 0.3 + 0.6 * hash(band * 11 + col * 23 + i * 7));
            context.beginPath();
            context.arc(tx, ty, 2.5 + (y1 - y0) * 0.03, 0, Math.PI * 2);
            context.fill();
          }
        }
      }
    }
    // A river winds across the valley floor, left of the route:
    // sandy banks, blue water, a sun glint on top.
    const riverX = (t) => FIELD.width * 0.2 + Math.sin(state.distance * 0.7 + t * 5) * 60 * t - state.off * 120 * t;
    context.strokeStyle = '#c9b98a';
    context.lineWidth = 16;
    context.beginPath();
    for (let y = horizon; y <= FIELD.height; y += 24) {
      const t = (y - horizon) / (FIELD.height - horizon);
      if (y === horizon) context.moveTo(riverX(t), y);
      else context.lineTo(riverX(t), y);
    }
    context.stroke();
    context.strokeStyle = PALETTE.river;
    context.lineWidth = 9;
    context.beginPath();
    for (let y = horizon; y <= FIELD.height; y += 24) {
      const t = (y - horizon) / (FIELD.height - horizon);
      if (y === horizon) context.moveTo(riverX(t), y);
      else context.lineTo(riverX(t), y);
    }
    context.stroke();
    context.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    context.lineWidth = 2;
    context.beginPath();
    for (let y = horizon; y <= FIELD.height; y += 24) {
      const t = (y - horizon) / (FIELD.height - horizon);
      if (y === horizon) context.moveTo(riverX(t) - 2, y);
      else context.lineTo(riverX(t) - 2, y);
    }
    context.stroke();
    // A pale road runs parallel to the route, right of it, with a centre line.
    context.strokeStyle = PALETTE.road;
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(FIELD.width * 0.78 - state.off * 90, horizon + 4);
    context.lineTo(FIELD.width * 0.86 - state.off * 200, FIELD.height);
    context.stroke();
    context.strokeStyle = '#9a8f74';
    context.lineWidth = 1.5;
    context.setLineDash([8, 10]);
    context.beginPath();
    context.moveTo(FIELD.width * 0.78 - state.off * 90, horizon + 4);
    context.lineTo(FIELD.width * 0.86 - state.off * 200, FIELD.height);
    context.stroke();
    context.setLineDash([]);
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

  /** Small dark pill behind a label, so text stays legible over the world. */
  function pill(cx, cy, label, size, fg) {
    context.font = `700 ${size}px ${FONT}`;
    const w = context.measureText(label).width + 22;
    context.fillStyle = 'rgba(16, 22, 32, 0.78)';
    rr(context, cx - w / 2, cy - size / 2 - 7, w, size + 14, (size + 14) / 2);
    context.fill();
    context.fillStyle = fg;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, cx, cy + 1);
    context.textBaseline = 'alphabetic';
  }

  function drawRings(state) {
    for (const ring of state.rings) {
      if (ring.passed || ring.missed) continue;
      if (ring.dist < state.distance) continue;
      const p = projectAhead(state, ring.dist, ring.off, ring.alt);
      if (p.ahead > 4) continue;
      const pulse = 1 + Math.sin(state.time * 5) * 0.06;
      const r = p.r * pulse;
      const ry = r * 0.82;
      // Glow halo, bright core, then a thin white inner edge.
      context.strokeStyle = 'rgba(255, 176, 32, 0.28)';
      context.lineWidth = Math.max(8, r / 7);
      context.beginPath();
      context.ellipse(p.x, p.y, r, ry, 0, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = PALETTE.ring;
      context.lineWidth = Math.max(4, r / 15);
      context.beginPath();
      context.ellipse(p.x, p.y, r, ry, 0, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(p.x, p.y, r * 0.92, ry * 0.92, 0, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = 'rgba(255, 176, 32, 0.10)';
      context.beginPath();
      context.ellipse(p.x, p.y, r, ry, 0, 0, Math.PI * 2);
      context.fill();
      // Four ticks on the ring, so it reads as a gate, not a circle.
      context.strokeStyle = PALETTE.ring;
      context.lineWidth = 3;
      for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
        const tx = p.x + Math.cos(a) * r;
        const ty = p.y + Math.sin(a) * ry;
        context.beginPath();
        context.moveTo(tx - Math.cos(a) * 10, ty - Math.sin(a) * 10);
        context.lineTo(tx + Math.cos(a) * 10, ty + Math.sin(a) * 10);
        context.stroke();
      }
      pill(p.x, p.y + r + 26, `${Math.round(p.ahead * 10) / 10} nm`, 17, PALETTE.amber);
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
    beam.addColorStop(1, 'rgba(255, 176, 32, 0.65)');
    context.fillStyle = beam;
    context.fillRect(p.x - 9, horizon, 18, FIELD.height - 60 - horizon);
    // A bright core, so the shaft reads over the bright fields.
    context.fillStyle = 'rgba(255, 222, 140, 0.55)';
    context.fillRect(p.x - 3, horizon, 6, FIELD.height - 60 - horizon);
    const cy = FIELD.height - 60;
    const pulse = 1 + Math.sin(state.time * 4) * 0.07;
    for (const [rrad, alpha, width] of [[r * pulse, 0.3, 8], [r, 0.9, 5], [r * 0.62, 0.9, 4], [r * 0.3, 0.9, 4]]) {
      context.strokeStyle = `rgba(255, 176, 32, ${alpha})`;
      context.lineWidth = width;
      context.beginPath();
      context.ellipse(p.x, cy, rrad, rrad * 0.32, 0, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = 'rgba(255, 176, 32, 0.22)';
    context.beginPath();
    context.ellipse(p.x, cy, r, r * 0.32, 0, 0, Math.PI * 2);
    context.fill();
    // The label rides the top of the beam, in the sky, so the plane never
    // hides it when the target itself sits under the fuselage.
    pill(p.x, horizon + 34, 'DROP ZONE', 19, PALETTE.amber);
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
    const lerpPt = (t) => ({
      x: lerp(cx, cx, t),
      y: lerp(yNear, yFar, t),
      w: lerp(nearW, farW, t),
    });
    context.fillStyle = PALETTE.runway;
    context.beginPath();
    context.moveTo(cx - nearW, yNear);
    context.lineTo(cx - farW, yFar);
    context.lineTo(cx + farW, yFar);
    context.lineTo(cx + nearW, yNear);
    context.closePath();
    context.fill();
    // Edge lights down both sides, warm dots with a soft halo.
    for (let i = 0; i <= 6; i += 1) {
      const t = i / 6;
      const pt = lerpPt(t);
      for (const side of [-1, 1]) {
        const lx = pt.x + side * pt.w * 0.94;
        const glow = context.createRadialGradient(lx, pt.y, 1, lx, pt.y, 9);
        glow.addColorStop(0, 'rgba(255, 214, 130, 0.9)');
        glow.addColorStop(1, 'rgba(255, 214, 130, 0)');
        context.fillStyle = glow;
        context.beginPath();
        context.arc(lx, pt.y, 9, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#ffe9b0';
        context.beginPath();
        context.arc(lx, pt.y, 2.5, 0, Math.PI * 2);
        context.fill();
      }
    }
    // Threshold bars at the far end and touchdown marks down the strip.
    context.fillStyle = PALETTE.runwayMark;
    const far = lerpPt(0.92);
    for (let i = -3; i <= 3; i += 1) {
      if (i === 0) continue;
      context.fillRect(far.x + i * (far.w / 3.4) - 3, far.y - 4, 6, 8);
    }
    for (const t of [0.3, 0.55]) {
      const pt = lerpPt(t);
      context.fillRect(pt.x - pt.w * 0.55, pt.y - 3, pt.w * 0.3, 6);
      context.fillRect(pt.x + pt.w * 0.25, pt.y - 3, pt.w * 0.3, 6);
    }
    context.strokeStyle = PALETTE.runwayMark;
    context.lineWidth = 4;
    context.setLineDash([18, 16]);
    context.beginPath();
    context.moveTo(cx, yNear - 6);
    context.lineTo(cx, yFar + 4);
    context.stroke();
    context.setLineDash([]);
    pill(cx, yFar - 22, 'RWY 09', 20, PALETTE.text);
  }

  function drawPlane(state, screen) {
    const cx = FIELD.width / 2;
    const cy = FIELD.height - 118 + state.pitch * 1.2;
    const bankRad = (state.bank * Math.PI) / 180;
    context.save();
    context.translate(cx, cy);
    context.scale(1.42, 1.42);
    context.rotate(bankRad * 0.55);
    // Tail fin and stabiliser, seen from behind, with a white stripe.
    const finGrad = context.createLinearGradient(0, -102, 0, -52);
    finGrad.addColorStop(0, '#3a7cc0');
    finGrad.addColorStop(1, PALETTE.planeTrim);
    context.fillStyle = finGrad;
    context.beginPath();
    context.moveTo(-16, -52);
    context.lineTo(0, -102);
    context.lineTo(16, -52);
    context.closePath();
    context.fill();
    context.fillStyle = 'rgba(255, 255, 255, 0.85)';
    context.fillRect(-3, -92, 6, 34);
    context.fillStyle = '#b8c4d0';
    context.fillRect(-92, -50, 184, 15);
    context.fillStyle = 'rgba(255, 255, 255, 0.5)';
    context.fillRect(-92, -50, 184, 3);
    // Fuselage: cream top fading to a warm grey, red belly below.
    const bodyGrad = context.createLinearGradient(0, -72, 0, 72);
    bodyGrad.addColorStop(0, '#f6fafd');
    bodyGrad.addColorStop(0.6, PALETTE.planeBody);
    bodyGrad.addColorStop(1, '#d3dde6');
    context.fillStyle = bodyGrad;
    context.beginPath();
    context.ellipse(0, 0, 54, 72, 0, 0, Math.PI * 2);
    context.fill();
    const bellyGrad = context.createLinearGradient(0, 0, 0, 68);
    bellyGrad.addColorStop(0, '#e05a45');
    bellyGrad.addColorStop(1, '#c43d2c');
    context.fillStyle = bellyGrad;
    context.beginPath();
    context.ellipse(0, 30, 48, 38, 0, 0, Math.PI);
    context.fill();
    // Highlight along the spine, and the blue cheatline.
    context.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(-14, -8, 26, 52, 0.12, Math.PI * 0.9, Math.PI * 1.7);
    context.stroke();
    context.fillStyle = PALETTE.planeTrim;
    context.fillRect(-54, -10, 108, 8);
    // Canopy: deep glass with a bright specular streak.
    context.fillStyle = '#2b2f36';
    context.beginPath();
    context.ellipse(0, -34, 30, 16, 0, 0, Math.PI * 2);
    context.fill();
    const glassGrad = context.createLinearGradient(-20, -46, 20, -26);
    glassGrad.addColorStop(0, '#cfeaff');
    glassGrad.addColorStop(0.5, '#6fb3e8');
    glassGrad.addColorStop(1, '#2f6da8');
    context.fillStyle = glassGrad;
    context.beginPath();
    context.ellipse(0, -36, 22, 10, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 255, 255, 0.75)';
    context.beginPath();
    context.ellipse(-8, -40, 9, 3.5, -0.3, 0, Math.PI * 2);
    context.fill();
    // Wings: shaded panels with an aileron line, red tips, glowing nav lights.
    const wingGrad = context.createLinearGradient(0, -20, 0, 26);
    wingGrad.addColorStop(0, '#eef3f7');
    wingGrad.addColorStop(1, '#c7d3de');
    context.fillStyle = wingGrad;
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
    context.strokeStyle = 'rgba(43, 47, 54, 0.35)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(-196, 8);
    context.lineTo(-52, -8);
    context.moveTo(196, 8);
    context.lineTo(52, -8);
    context.stroke();
    context.fillStyle = PALETTE.planeBelly;
    context.fillRect(-218, 4, 18, 20);
    context.fillRect(200, 4, 18, 20);
    for (const [lx, colour] of [[-214, PALETTE.green], [214, PALETTE.red]]) {
      const halo = context.createRadialGradient(lx, 14, 1, lx, 14, 16);
      halo.addColorStop(0, colour);
      halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
      context.fillStyle = halo;
      context.beginPath();
      context.arc(lx, 14, 16, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = colour;
      context.beginPath();
      context.arc(lx, 14, 5, 0, Math.PI * 2);
      context.fill();
    }
    // Spinning prop: a faint disc plus two blurred blades turning with time.
    const propAngle = state.time * 28;
    context.fillStyle = 'rgba(201, 212, 222, 0.12)';
    context.beginPath();
    context.ellipse(0, -84, 13, 48, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(58, 63, 71, 0.3)';
    for (const a of [propAngle, propAngle + Math.PI]) {
      context.save();
      context.translate(0, -84);
      context.rotate(a);
      context.beginPath();
      context.ellipse(0, -26, 5, 26, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    context.fillStyle = '#3a3f47';
    context.beginPath();
    context.arc(0, -84, 7, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 255, 255, 0.6)';
    context.beginPath();
    context.arc(-2, -86, 2.5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (screen === SCREEN_PLAY && state.altitude < terrainHeight(state.distance) + 150) {
      text('TERRAIN — PULL UP', FIELD.width / 2, 150, 30, PALETTE.red, 'center', 800);
    }
  }

  function gauge(x, y, w, label, valueText, value, colour) {
    context.fillStyle = 'rgba(20, 26, 36, 0.85)';
    rr(context, x, y, w, 44, 8);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.stroke();
    text(label, x + 10, y + 19, 13, PALETTE.muted, 'left', 700);
    text(valueText, x + w - 10, y + 19, 13, PALETTE.text, 'right', 700);
    context.fillStyle = 'rgba(255, 255, 255, 0.14)';
    rr(context, x + 10, y + 26, w - 20, 8, 4);
    context.fill();
    context.fillStyle = colour;
    rr(context, x + 10, y + 26, Math.max(8, (w - 20) * Math.max(0, Math.min(1, value))), 8, 4);
    context.fill();
  }

  function drawHud(state, best) {
    // Top instrument bar: altitude, speed and heading, lit and legible.
    context.fillStyle = 'rgba(20, 26, 36, 0.88)';
    context.fillRect(0, 0, FIELD.width, 64);
    context.fillStyle = 'rgba(255, 176, 32, 0.35)';
    context.fillRect(0, 63, FIELD.width, 1);
    const instruments = [
      ['ALT', `${Math.round(state.altitude)} ft`],
      ['SPD', `${Math.round(state.speed)} kt`],
      ['HDG', `${String(Math.round(((state.heading % 360) + 360) % 360)).padStart(3, '0')}°`],
      ['V/S', `${state.pitch >= 0 ? '+' : ''}${Math.round(Math.sin((state.pitch * Math.PI) / 180) * state.speed * 101)} fpm`],
    ];
    instruments.forEach(([label, value], i) => {
      const x = 24 + i * 190;
      if (i > 0) {
        context.fillStyle = 'rgba(255, 255, 255, 0.08)';
        context.fillRect(x - 14, 12, 1, 40);
      }
      text(label, x, 22, 13, PALETTE.muted, 'left', 700);
      text(value, x, 50, 26, PALETTE.text, 'left', 800);
    });
    text(`SCORE ${state.score}`, FIELD.width - 24, 28, 20, PALETTE.text, 'right', 800);
    text(`BEST ${Math.max(best, state.score)}`, FIELD.width - 24, 52, 14, PALETTE.muted, 'right', 700);
    // Left gauges: throttle, fuel, hull.
    gauge(24, 84, 190, 'THR', `${Math.round(state.throttle)}%`, state.throttle / 100, PALETTE.skyMid);
    gauge(24, 136, 190, 'FUEL', `${Math.round(state.fuel)}%`, state.fuel / 100, state.fuel < FUEL_WARN ? PALETTE.red : PALETTE.amber);
    gauge(24, 188, 190, 'HULL', `${Math.round(state.hull)}%`, state.hull / 100, state.hull < 40 ? PALETTE.red : PALETTE.green);
    // Mission banner in a pill, objective under it.
    const mission = MISSION_TEXT[state.phase];
    context.font = `800 18px ${FONT}`;
    const mw = context.measureText(mission).width + 34;
    context.fillStyle = 'rgba(16, 22, 32, 0.75)';
    rr(context, FIELD.width / 2 - mw / 2, 80, mw, 34, 17);
    context.fill();
    context.strokeStyle = 'rgba(255, 176, 32, 0.4)';
    context.lineWidth = 1;
    context.stroke();
    text(mission, FIELD.width / 2, 103, 18, PALETTE.amber, 'center', 800);
    const ringText = state.phase === 'rings' ? `Ring ${Math.min(state.ringIndex + 1, 6)} of 6` : state.phase === 'drop' ? 'Parcel on board' : state.phase === 'landing' ? 'Runway 09 — 15.0 nm' : 'Sortie complete';
    // Both lines sit in pills, so they stay legible over rings, clouds or sun.
    pill(FIELD.width / 2, 140, ringText, 16, PALETTE.text);
    if (state.message && state.messageTimer > 0) {
      pill(FIELD.width / 2, 184, state.message, 21, PALETTE.text);
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
    // Pitch ladder ticks.
    context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    context.lineWidth = 2;
    for (const off of [-24, 24]) {
      context.beginPath();
      context.moveTo(ax - 18, ay - state.pitch * 2 + off);
      context.lineTo(ax + 18, ay - state.pitch * 2 + off);
      context.stroke();
    }
    context.restore();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(ax, ay, 52, 0, Math.PI * 2);
    context.stroke();
    // Horizon line across the ball.
    context.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(ax - 50, ay - state.pitch * 2);
    context.lineTo(ax + 50, ay - state.pitch * 2);
    context.stroke();
    context.save();
    context.translate(ax, ay);
    context.rotate((state.bank * Math.PI) / 180);
    context.fillStyle = PALETTE.amber;
    context.fillRect(-30, -3, 60, 6);
    context.beginPath();
    context.arc(0, 0, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
    text('ATT', ax, ay + 72, 12, PALETTE.muted, 'center', 700);
    // Controls hint, bottom right.
    text('↑↓ pitch · ←→ turn · Shift/Ctrl throttle · Space drop · P pause', FIELD.width - 24, FIELD.height - 20, 14, 'rgba(238, 241, 245, 0.85)', 'right', 600);
  }

  function drawPanel(title, lines, prompt, accent = PALETTE.amber) {
    const height = 150 + lines.length * 34 + 70;
    const x = (FIELD.width - 620) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(10, 14, 22, 0.45)';
    rr(context, x + 4, y + 8, 620, height, 16);
    context.fill();
    context.fillStyle = 'rgba(20, 26, 36, 0.94)';
    rr(context, x, y, 620, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = accent;
    context.fillRect(FIELD.width / 2 - 32, y + 34, 64, 4);
    text(title, FIELD.width / 2, y + 84, 46, PALETTE.text, 'center', 800);
    lines.forEach((line, i) => {
      text(line, FIELD.width / 2, y + 138 + i * 34, 20, PALETTE.muted, 'center', 600);
    });
    text(prompt, FIELD.width / 2, y + height - 34, 22, accent, 'center', 700);
  }

  /** A soft vignette to finish the frame, drawn over the world, under the HUD. */
  function drawVignette() {
    const grad = context.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.45,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.95,
    );
    grad.addColorStop(0, 'rgba(10, 14, 22, 0)');
    grad.addColorStop(1, 'rgba(10, 14, 22, 0.16)');
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
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
    drawVignette();
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
