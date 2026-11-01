# Series Chronicle

A single-player, offline motorsport "series CEO" simulation. You run the governing body of one championship, starting in 1919 and running for a hundred years or more. Teams, makers, sponsors and drivers come and go; technology and rules change with the era; a ladder of lower series grows beneath you. Watch every race lap by lap, or let the seasons run themselves.

This is **slice 3**: money, owners, technology, the governor and the tier ladder, with a page for every team, driver, maker, sponsor, series and track.

## Run it

Needs Node 20 or newer. No dependencies, no build step.

```
npm run serve        # http://localhost:8080  (the page is a static site)
npm test             # unit tests (determinism, saves and migration, scoring, tech, money, tiers, governor, every page)
npm run balance      # 300 seeded 1919 seasons, checked against targets
npm run century      # 4 seeded 110-year worlds: dominance, churn, gender balance, finish rates
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
tests/balance.js      1919 balance harness
tests/century.js      whole-century harness
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

## Updating an existing copy

Download the repo ZIP again (or `git pull`) and replace the folder. Saves from earlier versions load and are upgraded: they gain owners, finances, the lower-tier ladder, the governor and the era points table. If the page still looks like the first version, the browser is showing old files: hold Ctrl and press F5, and check that the header shows the tabs *Teams, Drivers, Tiers, Makers & tech, Approvals, Rules, Chronicle, Records*.

## What is in slice 3

- **Pages for everything.** Every name is a link: team (line-up, contracts, staff, facilities, owner and goals, finances, sponsors, car and technology, relationships, season history), driver (abilities, career, ladder record, teams), maker, sponsor, series, lower-tier team, track.
- **Chronicle.** One row per season: champion, team, maker, wins, podiums, poles, points scored against the points on offer, and the scoring table in force. Open a season for the margin, standings, lower-tier champions, industry news and every race report. Storylines (first titles, close fights, dominance, legends arriving) are logged.
- **Points that change.** The scoring table follows history (top 3 in 1919, top 5 in 1946 ... 25-18-15 from 2010, 30-22-18 from 2031) until you set your own.
- **Cars that change.** Disc brakes, rear engines, monocoques, fuel injection, wings, ground effect, turbo, carbon, semi-automatic gearboxes, active suspension, hybrid and active aero arrive in their decades, spread at different speeds, get banned and return. Engine technology comes from the supplier. Car descriptions (layout, litres, power, weight, brakes) follow the era.
- **Money.** Owners, facilities, prize pool and revenue share, sponsors (commercial from 1968, real brand windows, a title sponsor), manufacturer support, driver contracts and salaries, cost cap, sale, closure, revival, groups and sister teams, academies.
- **Tiers.** Local scenes (1919), continental series, development series, feeder series, a global junior series (1990s) and a lower junior series (2010s), with merging and rival series, grassroots standouts, scouting estimates and academies. They run the real race engine each year, in step with Tier 1.
- **Governor and Approvals.** A personality chosen at the start (cautious, expansionist, traditionalist, commercial) and a mode: autonomous or hands-on. Hands-on holds entries, rule changes, new series and calendar changes in the Approvals inbox; you can also take over single kinds of decision in either mode. Autopilot stops at the off-season when decisions wait.
- **Rules screen.** Every setting in the design table, plus per-technology ban/allow. Rules you set are yours; the governor leaves them alone.
- **Race viewer.** Three speeds, plus *follow a driver* (event mode prioritises that car). What timing shows depends on the era: rounded gaps early, no stop or tyre columns until they existed.
- **Stability dial.** Teams and makers come and go freely early and settle later.

## Coverage of the design document

Built and visible in play:

| Design document | Where to see it |
| --- | --- |
| Governing-body powers: approve entries, sanction events, start or stop manufacturers, change regulations, academy caps | Approvals, Makers & tech (Invite / Stop racing), Rules |
| Autonomous governor with personalities; take over single decisions | Approvals; chosen at world creation |
| Tier 1 with local and global teams, local teams score no points, glory moves them global | Teams, team page |
| Entries, pre-qualifying with top-10 exemption, partial entries, scoring by era | Standings, Rules, Chronicle |
| Endurance events (0 to 3 a season, relief driver, points multiplier) | Rules, race header |
| Local scenes, sanctioning, regional growth, tier ladder 1919 to 2010s, competing and merging series, grassroots | Tiers, series pages, Drivers (grassroots) |
| Owners (type, patience, pockets, goals), principal, control style, groups and sister teams, academies | Team page |
| Manufacturers: company health vs racing commitment, legacy buffer, exits and revivals | Maker page |
| Team lifecycle: sale, closure, revival, legendary teams, stability | Team page, Records (legacies) |
| Driver stats, hidden potential, style fit, career curve, legends within a talent band, cohort visible in advance | Driver page, Chronicle |
| Staff roles with ratings and careers | Team page |
| Cars: components, fit, maturity, weight, technology adoption, supplier tech, bans and returns, customer chassis rule, tyre rules | Team page, Makers & tech, Rules |
| Money: sponsors (regular and marquee), prize money, manufacturer funding, owner cover, cost cap, prize fund, revenue share, fans, prestige | Team page, Makers & tech |
| Fixed events (depression, wars, safety movement, commercial sponsorship, oil crisis, tobacco, financial crisis, pandemic) | Chronicle |
| Chronicle, record tables, rivalries and legacies | Chronicle, Records |
| Era look: 12 period themes, fixed-theme switch, era-coarse timing and stats | Header selector, race viewer, driver and staff pages |

Partly built:

- Fans are tracked per driver, team and maker, not yet per region.
- Staff age, retire and are replaced, but there is no staff contract or transfer market, and engine and tyre engineers are not separate people.
- Sponsor, engine and tyre deals are not yet contracts in one generic contract system; driver deals are.
- The cost cap is on or off, not an amount.
- Lower-tier races are simulated and their results (podiums, classifications for notable series) are readable, but you cannot yet watch one lap by lap.
- The race viewer follows a driver, not a team.
- Churn is about 54% of Tier 1 teams between 2000 and 2030 (target at most 50%); the team count settles at 13 to 14 (target 10 to 15).

Not built yet:

- Manufacturer mergers and rebadging (Lotus-BRM, Matra-Renault). Team sales and rebranding exist; makers only start, quit and revive.
- A lead driver running an endurance race solo.
- Hometowns for the upcoming cohort.
- Draw or entry-order grids for the earliest races (qualifying is always timed).
- First names that suit the era (a 1920s driver can still have a modern first name).
- A fixed list of lower-tier events; lower tiers draw from the tracks open that year.

## Saves

A save is one JSON file (**Save to file** / **Load file**). Move it between LAPTOP-9RGEIGTE and Arasaka-Tower by copying the file. Use **This computer** once on each machine to give it a name; a save remembers where it was last opened. The page also keeps an automatic copy in the browser (IndexedDB). A century save is about 9 MB; very old seasons keep results and podium places but drop the full field.

Results are identical on every machine and browser: the engine uses only `+ - * /`, `sqrt` and `floor`. `tests/run.js` pins a golden world and season hash.

## Layout

```
public/                 the whole game (served as-is)
  index.html style.css app.js      shell: router, race viewer, buttons
  ui/pages.js common.js            every page as a function from the world to HTML
  engine/
    rng.js params.js names.js drivers.js   seeded streams, tunables, names, drivers
    car.js techs.js                 cars, components, technology adoption
    world.js industry.js season.js  world creation, makers and teams, the season loop
    org.js                          owners, facilities, money, sponsors, lifecycle, groups
    tiers.js                        local scenes and the lower-tier ladder, scouting, academies
    governor.js                     personalities, approvals inbox, regulations
    records.js                      title tables, records, rivalries, track history
    race.js save.js recap.js        lap-by-lap race, saves and migration, text recaps
    data/                           components, tracks, eras, techs, sponsors, regions, ladder, events
tests/run.js            unit tests (50 or so)
tests/balance.js        1919 balance harness
tests/century.js        whole-century harness
scripts/                local server, text recap
```

## How a race stays identical at any speed

`raceGenerator(setup)` yields one step per lap. The page consumes it with a delay (lap by lap, faster, or events only); the harness drains it instantly. Each race draws from its own stream, `makeRng(seed, 'race', year, round, ...)`, so nothing else changes it.
