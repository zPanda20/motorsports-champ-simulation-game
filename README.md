# Series Chronicle

A single-player, offline motorsport "series CEO" simulation. One championship, starting in 1919, run for a hundred years or more. Watch every race lap by lap, or let the seasons run themselves.

This is **slice 1**: the engine, the 1919 world, the lap-by-lap race sim, pre-qualifying, seasons and standings, saves, a balance harness, and a simple browser page. Money, the governor, lower tiers, local scenes and later eras come next (see the design document).

## Run it

Needs Node 20 or newer. No dependencies, no build step.

```
npm run serve        # http://localhost:8080  (the page is a static site)
npm test             # unit tests (determinism, saves, pre-qualifying, speed independence)
npm run balance      # 300 seeded 1919 seasons, checked against targets
npm run balance:quick
npm run recap -- myseed 3     # text recap of 3 seasons
```

Opening `public/index.html` by double-click does not work, because browsers block ES modules on `file://`. Use `npm run serve`.

## Deploy on Render (static site)

1. New, **Static Site**, connect this repo.
2. Branch `main`, build command empty, **Publish directory `public`**.
3. Every push to `main` redeploys.

The engine runs in the browser. There is no server and nothing to lose when a free instance sleeps.

## Saves

A save is one JSON file (**Save to file** / **Load file**). Move it between LAPTOP-9RGEIGTE and Arasaka-Tower by copying the file. Use **This computer** once on each machine to give it a name; a save remembers where it was last opened. The page also keeps an automatic copy in the browser.

Results are identical on every machine and browser: the engine uses only `+ - * /`, `sqrt` and `floor`, never `pow`, `exp`, `log` or trig, which can differ in the last digit between engines. `tests/run.js` pins a golden world and season hash so a regression shows immediately.

## Layout

```
public/               the whole game (served as-is)
  index.html style.css app.js        browser page (thin layer over the engine)
  engine/
    rng.js            seeded streams: makeRng(seed, ...labels), one per concern
    params.js         every tunable number
    names.js          name generator from the sound rules, real-name check
    drivers.js        10 visible stats + hidden potential, career curve, fixed legend roster
    car.js            chassis + engine + fit, component ratings
    world.js          world creation (brands, tyre suppliers, teams, staff, entries, cohorts, calendar)
    race.js           lap-by-lap generator: pace, fuel, tyres, pit stops, named part failures, traffic, rain
    season.js         attendance, pre-qualifying, qualifying, standings, year rollover
    save.js           serialize / deserialize
    recap.js          text recaps
    data/             components and failure modes, tracks (opening and closing years), brands, era defaults
tests/run.js          unit tests
tests/balance.js      headless balance harness
scripts/              local server, text recap
```

## How a race stays identical at any speed

`raceGenerator(setup)` yields one step per lap. The page consumes it with a delay (lap by lap, faster, or events only); the harness drains it instantly. Each race draws from its own stream, `makeRng(seed, 'race', year, round, ...)`, so nothing that happens elsewhere, in any order, changes it.

## What the 1919 world looks like

- 16 real manufacturer names (Lozier, Mercer, Stutz, Darracq, Delage, Sunbeam, Peugeot, Fiat, Bugatti ...). Quality is rolled per save and does not follow real life; none can appear before their real founding year.
- Six works teams (two full-season cars each) and four fictional privateers running customer cars, two of them with a part-season second car: 18 entries, a grid of 14.
- Fictional drivers, teams and staff. About 80 fixed "legend" identities across 1873-2008; each save moves their talent 5-10% either way. The cohort of drivers about to come of age is visible in the Chronicle tab, talent hidden.
- Eight races of about 300 km. Top three score. Everyone pre-qualifies in round 1; afterwards the top 10 full-season entries are exempt. Entries (team + number) own the points, not the driver.
- Failures name the part and the cause: "Engine bottom end: big-end bearing failure". Some retire the car, some leave it limping, some mean a repair stop.

## Balance (1919 targets, `npm run balance`)

About 40% of starters finish, almost no race has no finisher, mechanical failures dominate accidents, 4-6 different winners per season, and better cars and better drivers win more often without it being decided in advance. All thresholds are in `tests/balance.js`; all knobs are in `public/engine/params.js`.

## Known limits of slice 1

- 1919 era only is tuned. Later years run (the calendar, tracks and drivers roll over) but eras beyond the 1920s use placeholder speed and reliability scaling.
- The track list had nothing running in 1919, so period venues (Brooklands, Sheepshead Bay, Tacoma, Le Mans' road circuit, Santa Monica, Elgin, Indianapolis, Mugello) are flagged `provisional` in `data/tracks.js`. Lengths and speeds are approximate.
- No money, sponsors, fans, governor, team folding, lower tiers, safety cars, endurance rounds or regulation editing yet.
