// Headless text recap: node scripts/recap.js [seed] [years]
import { createWorld } from '../public/engine/world.js';
import { runRound, driverStandings, brandStandings, advanceYear } from '../public/engine/season.js';
import { raceRecap, standingsLines } from '../public/engine/recap.js';

const seed = process.argv[2] || 'default';
const years = parseInt(process.argv[3] || '1', 10);
const world = createWorld({ seed });
console.log(`Seed "${seed}", ${world.teams.length} teams, ${world.entries.length} entries, ${world.drivers.length} drivers in the cohort.\n`);

for (let y = 0; y < years; y++) {
  console.log(`===== ${world.year} season =====`);
  while (!world.season.done) {
    const { summary } = runRound(world);
    console.log(raceRecap(world, summary).join('\n'));
    console.log('');
  }
  console.log(standingsLines(world, driverStandings(world), 'Drivers').join('\n'));
  console.log(standingsLines(world, brandStandings(world), 'Makers').join('\n'));
  console.log('');
  if (y < years - 1) advanceYear(world);
}
