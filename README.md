# Sky Courier: Dawn Run

One dawn sortie, three jobs: thread six glowing rings over a river valley, drop a parcel on the yellow target, then line up and grease a landing on Runway 09 — before the fuel runs out.

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/museweilejing923/sky-courier-dawn-run/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/museweilejing923/sky-courier-dawn-run/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

## The game

You fly a little red-bellied courier plane at dawn, in chase view over patchwork fields, a winding river and ridge lines. The HUD shows altitude, speed, heading and vertical speed, with throttle, fuel and hull gauges and an attitude indicator.

- **Ring run:** six rings at different altitudes and offsets. Fly through one for +100, with a combo bonus for consecutive rings; miss one and the combo is gone.
- **Parcel drop:** reach the drop zone and press Space over the yellow target — accuracy decides the points.
- **Landing:** Runway 09, 15 nm out. Descend, slow below 118 kt, hold heading within 12°, and touch down. A smooth landing plus leftover fuel is worth the most.
- **Decisions:** heavy throttle burns fuel fast, climbing bleeds speed, and the ridges along the valley will scrape your hull if you fly low. Fuel empty means a glide, not a powered flight.

## How to play

- **↑ / ↓** pitch (climb / dive), **← / →** bank and turn
- **Shift** throttle up, **Ctrl** throttle down (W/S and A/D work too)
- **Space** drop the parcel (also starts / restarts), **P** pause, **M** mute
- **Mouse:** click to start or restart
- **Sounds:** engine drone, ring chimes and landing fanfare are synthesized live with WebAudio — no audio files.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network, no libraries: plain static files under `game/`.

## Screenshots

Deterministic states, reproducible from the URL:

- `?shot=cover&seed=1` — threading a ring at dawn
- `?shot=rings&seed=1` — banking through the ring run
- `?shot=drop&seed=1` — over the drop target
- `?shot=landing&seed=1` — final approach to Runway 09

## Files

- `game/src/config.js` — tuning, route, palette, missions
- `game/src/random.js` — seeded random and terrain height
- `game/src/world.js` — sortie state, physics, rings, drop, landing, scoring
- `game/src/input.js` — keyboard + pointer
- `game/src/render.js` — chase view, terrain, runway, plane, HUD
- `game/src/audio.js` — WebAudio synth effects
- `game/src/shots.js` — deterministic screenshot states
- `game/src/main.js` — main loop and screen wiring

---

<sub>Entered on [make.fun](https://make.fun/bounty/best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
