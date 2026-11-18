// Diagnóstico: npx vite-node scripts/check-wiki-league.ts serieB
import { fetchWikipediaLeague } from '../src/services/wikipediaRosters';
const id = process.argv[2] ?? 'serieB';
const teams = await fetchWikipediaLeague(id, m => console.log(m));
console.log(`${id}: ${teams.length} times`);
for (const t of teams) console.log(`  ${t.name} (${t.squad.length}): ${t.squad.slice(0, 5).map(p => `${p.shirtNumber ?? '–'} ${p.name} ${p.position}`).join(', ')}`);
