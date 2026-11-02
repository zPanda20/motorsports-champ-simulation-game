# Series Chronicle

A single-player, offline motorsport "series CEO" simulation. You run the governing body of one championship, starting in 1919 and running for a hundred years or more. Teams, makers, sponsors and drivers come and go; technology and rules change with the era; a ladder of lower series grows beneath you. Watch every race lap by lap, or let the seasons run themselves.

This is **slice 5**: team identities that keep their legacy through sales and rebrands, graded rivalries, qualifying you can watch, wider names, small engine builders that need a partner to lead, more maker and era artwork, and seven new interface themes. Slice 4 added the sport's corporate history (works teams that come and go, founders, mergers, groups, oil suppliers), team colours on every table, and a distinct look for each period theme. Slice 3 added money, owners, technology, the governor and the tier ladder, with a page for every team, driver, maker, sponsor, series and track.

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
    names.js          name generator from the sound rules, real-name check (word tables in data/names-ext.js)
    identity.js       team identities: sale and rebrand reset the legacy, old identities stay in the books
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

Download the repo ZIP again (or `git pull`) and replace the folder. Saves from earlier versions load and are upgraded: they gain owners, finances, the lower-tier ladder, the governor, the era points table and team identities. If the page still looks like the first version, the browser is showing old files: hold Ctrl and press F5, and check that the header shows the tabs *Teams, Drivers, Tiers, Makers & tech, Approvals, Rules, Chronicle, Records*.

## What is in slice 5

- **Team identities.** A team keeps one id, but when it is sold and rebranded, or a maker buys it or sells it, it becomes a new identity: its legacy starts again and the old identity stays in the record books as the team it was. Jaguar Racing stays a legend after Lotus buys it, and Vauxhall after Toyota Gazoo does. The **Legendary teams** page lists every identity, past and present, with what became of it; a team's page gains **Past identities**, and its **Season by season** table is named and coloured for the identity the team had in each season. Mergers count too. Code: `engine/identity.js`.
- **Old saves.** Save version 5. A version 4 save is given identities from the sales, rebrands, buy-ins and buy-outs the chronicle remembers; titles come from the season records. The rebuild is best effort: wins before the team's 60 recorded seasons are credited to its first identity.
- **Founders link to their careers.** "Founded by ..." on a team page is a link: a champion goes to the driver page, an engineer to a new person page (`#/person/<name>`) that shows their current role, the teams they founded and their career from the chronicle.
- **Rivalries.** Two drivers are rivals when they were both real title contenders (within a quarter of the leader's points) in the same season, not only 1-2. Each season is graded on how close they finished and how serious both were, and the rivalry is graded (Simmering, Heated, Fierce, Legendary) on all of its seasons together, so a long fight beats a single close year. Records shows intensity, seasons, span, titles between them, their closest year and whether they were teammates.
- **Qualifying and pre-qualifying you can watch.** The Race tab has a session picker (race only, qualifying then race, or pre-qualifying, qualifying, race). Cars set their times one at a time and the sheet re-sorts; the cut line shows who is through. Times follow the era (whole seconds before 1935). Watching changes nothing in the result.
- **Small engine builders.** Cosworth, Judd, Ilmor, Climax and BRM can never have the best engine of the year on their own. They can when a bigger maker partners with them (Ford-Cosworth, Mercedes-Ilmor): the big maker saves money and effort, the builder gets a boost. Deals are programmes of kind `deal`, with a start and an end, shown on the maker pages.
- **Tesla and Brabham are cut** from new worlds (old saves keep them).
- **Names.** First names follow the generation (old-fashioned for early births, then the names of each later age), surnames draw on longer stem and ending lists, 12 more nationalities appear (Ireland, Portugal, Finland, Denmark, Norway, Poland, Mexico, Colombia, South Africa, New Zealand, India, China), and independent teams are named for places, ideas and partnerships as well as people. The fixed legend roster is unchanged. Code: `engine/data/names-ext.js`.
- **Artwork.** The brand badges and decade wallpapers from your folders (1960s to 1990s added), with Toyota Gazoo and Honda Mugen badges for their performance divisions. A maker with any badge always shows one.
- **Themes.** Synthwave (1988-92) is the bridge from PC-98 to vaporwave and drifts from one to the other over its five years; the main menu is Digital Brutalism; Constructivism (1935-39) has kinetic type; **Neumorphism** is the "era styles off" choice in the theme picker; Holographic (2040s), Glassmorphism (2050s), Dreamcore (2060s) and Parametric (2070s, neutral so team colours stand out). Styles are in `public/themes2.css`; animations respect reduced-motion.
- **Start a new series** to see the new names, engine partnerships and themes from the beginning of history.

## What is in slice 4

- **No Ferrari, no McLaren.** Brands like them arise through the story instead: a former champion founds a team (directly in the top series, or in a continental series and climbs up), or a brilliant engineer founds one, partners with a maker and becomes its de facto works team with a preference for that maker's engine (the Williams and Sauber path). A team's page says where it came from.
- **Works teams follow the sport's shape.** Plentiful before the war, rare after the 1940s, a couple from the 1960s to the 1970s, slight growth in the 1980s, a dip in the 1990s, a boom in the 2000s that ends with the 2008 crash, then a wave of makers buying teams back from 2014. When a maker leaves it often sells its team to its engineers, a big sponsor brand, a former champion or investors, who keep the colours and the factory (Brawn, Red Bull, Stewart). The curve is in `engine/data/curve.js`.
- **Engine-only makers.** BRM, Coventry Climax, Cosworth, Judd, Ilmor, and Mercedes from 1955 to 2009, build engines for others and never run a works team in that window. Works teams are named in the style of their country (Scuderia, Écurie, Rennabteilung, Racing) and take a performance division's name once it is real (Mercedes AMG, Honda Mugen, Toyota Gazoo).
- **Mergers and groups on the real dates.** Daimler and Benz (1926), Audi, Horch, DKW and Wanderer into Auto Union (1932, with their works teams joining into one), Volkswagen buying NSU (1969), renames in 1960 and 1978. Real groups (Volkswagen Group, Mopar, Fiat Chrysler and Stellantis, PSA, GM, Ford, British Leyland, Renault-Nissan, Geely and others) form and break up on their real timelines; sister makers in a group can share an engine, a chassis, a whole car or pooled development, and not every programme works. Pages: Makers & tech has a Groups link, every group has a page.
- **Oil and fuel suppliers from 1960.** 27 suppliers (Shell to Bapco Energies), a deal of one to four years per team, a small power and reliability effect, and the supplier is also the team's sponsor. A rival oil company cannot sponsor a team tied to another supplier. Pages: `#/oil/<id>`, and tyre makers have pages too.
- **Colours.** Maker and team pages are in brand colours. The running order and the standings are in team colours (a left stripe and a faint wash), and works teams carry their maker's badge beside the team name; a maker without a drawn badge gets a monogram in its colours until one is drawn. Sold-off teams keep their old colours.
- **More history.** The Chronicle links every year to that season's points tables (`#/standings/<year>`, with the rounds, and next and previous year). Each series has its own Chronicle and Records tabs, and the Tiers page links to them. Driver pages list the team driven for, year by year, with the car's source.
- **Look.** `public/themes.css` gives each period theme a structure of its own (De Stijl blocks, Bauhaus shapes, Constructivist slabs, Atomic Age shapes, Swiss grid, PC-98 windows, Y2K gel, Memphis confetti, and so on); Vaporwave is unchanged. Every theme was checked for text contrast.
- **Balance.** One all-time great could win a dozen titles in a row, so the driver-skill curve bends again above 82 and legend talent is capped. Over 12 seeded centuries the longest title streak averages about 6 (limit 10). Tier 1 churn from 2000 to 2030 is high on purpose, because of the 2008 to 2010 sell-off and the 2014 to 2017 buy-in waves.
- **Saves.** Save version 4. Older saves load and gain oil suppliers, groups and team origins, but they still contain Ferrari and McLaren: start a new series to see the new history.

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

## Artwork

- `public/assets/bg/1920s.jpg` to `1990s.jpg`: decade backgrounds, shown behind the page while the game year is 1920-1999. The "Era backgrounds" selector in the header turns them off (remembered per browser).
- `public/assets/logos/<maker>.png`: badges for Ballot, Duesenberg, Sunbeam, Isotta Fraschini, Darracq, Stutz, Peugeot and Opel. They show as small icons beside every maker name, and large on the maker page and on a works team's page. The Peugeot and Opel badges are 1920s designs; they now keep showing after 1929 until newer ones are added (see the lines below).
- Slice 4 adds 31 more maker badges (Aston Martin, Audi, BMW, BRM, Chevrolet, Chrysler, Citroën, Cooper, Delage, Dodge, Ford, Honda, Jaguar, Kia, Lamborghini, Lotus, Lozier, Nissan, Pontiac and Vauxhall). A maker with several designs gets one per span of years (Chevrolet 1913-1931, 1934-1950, 1978-1999, 2000-). **A maker with any badge always shows one**: in a year no design covers, the design nearest in time is used, so the 1920s Peugeot and Opel badges now stay until newer ones are added. Audi's four rings stand in for Auto Union and the pre-merger Audi. Makers without a badge keep a monogram.
- The badge files in `public/assets/logos/` were trimmed, shrunk to 384 px and, where they had a white background, made transparent; every badge sits on a light plate so black and silver designs read on dark themes. Your originals are not touched.
- Pontiac joined the game as a General Motors maker (1926) because its badge was supplied.
- `public/ui/assets.js` is the only place that maps years and makers to pictures; to add a maker or a newer design, drop the file in `assets/logos/` and add one line there. `npm test` fails if a maker's badge is missing for any year, or if a file in the folder is not used by any maker.

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
- Churn is about 70% of Tier 1 teams between 2000 and 2030, by design (the 2008 crash and the 2014 buy-in wave); the team count settles at 12 to 18.
- Badges: 29 makers have a drawn logo; everyone else shows a monogram in brand colours.
- On very narrow screens (about 420 px) wide tables scroll the whole page sideways.

Not built yet:

- Rebadging deals between a maker and an independent team (Lotus-BRM, Matra-Renault) beyond engine partnerships.
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
  ui/pages.js common.js colors.js  every page as a function from the world to HTML; brand and team colours, badges
  themes.css                       the structural design of each period theme
  engine/
    rng.js params.js names.js drivers.js   seeded streams, tunables, names, drivers
    car.js techs.js                 cars, components, technology adoption
    world.js industry.js season.js  world creation, makers and teams, the season loop
    org.js                          owners, facilities, money, sponsors, lifecycle, groups
    corp.js founders.js             mergers, corporate groups, shared programmes; founders, sell-offs and buy-ins
    tiers.js                        local scenes and the lower-tier ladder, scouting, academies
    governor.js                     personalities, approvals inbox, regulations
    records.js                      title tables, records, rivalries, track history
    race.js save.js recap.js        lap-by-lap race, saves and migration, text recaps
    data/                           components, tracks, eras, techs, sponsors, regions, ladder, events, corp, curve, oils
tests/run.js            unit tests (60 or so)
tests/balance.js        1919 balance harness
tests/century.js        whole-century harness
scripts/                local server, text recap
```

## How a race stays identical at any speed

`raceGenerator(setup)` yields one step per lap. The page consumes it with a delay (lap by lap, faster, or events only); the harness drains it instantly. Each race draws from its own stream, `makeRng(seed, 'race', year, round, ...)`, so nothing else changes it.
