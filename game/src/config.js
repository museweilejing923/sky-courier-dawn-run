// Sky Courier: Dawn Run — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, horizonRest: 330 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const PLANE = {
  minSpeed: 55,
  maxSpeed: 210,
  cruiseSpeed: 135,
  climbRate: 22,
  sinkRate: 26,
  turnRate: 26,
  maxBank: 38,
  ceiling: 6500,
  groundAlt: 0,
};

export const FUEL = {
  start: 100,
  burnPerThrottle: 0.22,
  burnBase: 0.02,
  reserveWarn: 25,
  emptyWarn: 10,
};

export const DAMAGE = {
  startHull: 100,
  ringMiss: 0,
  ridgeHit: 34,
  groundHit: 100,
  hardLanding: 22,
};

export const RING = { points: 100, comboBonus: 25, passAlt: 420, passOff: 0.55 };
export const DROP = { points: 250, goodOff: 0.35, goodAlt: 900 };
export const LANDING = { points: 400, maxSpeed: 118, maxAlt: 220, maxHeadingErr: 12 };

/** The sortie, in order: six rings, one parcel drop, then the landing. */
export const ROUTE = {
  heading: 90,
  runwayHeading: 90,
  rings: [
    { dist: 2.0, off: -0.4, alt: 1800 },
    { dist: 3.6, off: 0.7, alt: 2400 },
    { dist: 5.2, off: -0.9, alt: 3000 },
    { dist: 6.8, off: 0.3, alt: 2600 },
    { dist: 8.4, off: 1.0, alt: 3400 },
    { dist: 10.0, off: -0.2, alt: 2200 },
  ],
  drop: { dist: 12.5, off: 0.0, alt: 1500 },
  runway: { dist: 15.0, off: 0.0, length: 1.2 },
};

export const PALETTE = {
  skyTop: '#1d4e89',
  skyMid: '#7fb2e5',
  skyLow: '#f6c98a',
  sun: '#ffd98a',
  cloud: '#ffffff',
  hillFar: '#7d9bb8',
  hillNear: '#5d7d5a',
  fieldA: '#8fae5d',
  fieldB: '#c2a55e',
  fieldC: '#6f9e4f',
  fieldD: '#b98a4e',
  river: '#5fa8d3',
  road: '#e8e0cc',
  runway: '#3a3f47',
  runwayMark: '#f5f2e8',
  ring: '#ffb020',
  ringGood: '#37d67a',
  planeBody: '#e8eef4',
  planeBelly: '#d94f3d',
  planeTrim: '#2b6cb0',
  prop: '#c9d4de',
  panel: '#141a24',
  panelEdge: '#3d4a5c',
  text: '#eef1f5',
  muted: '#9fb0c3',
  amber: '#ffb020',
  green: '#37d67a',
  red: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'sky-courier.best';

export const MISSION_TEXT = {
  rings: 'RING RUN — fly through the glowing rings',
  drop: 'PARCEL DROP — press SPACE over the yellow target',
  landing: 'LANDING — line up with the runway, slow down, touch down',
  done: 'SORTIE COMPLETE',
};
