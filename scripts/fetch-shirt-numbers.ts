/**
 * Busca os números de camisa dos elencos atuais nas páginas dos clubes na Wikipedia
 * (inglês) e grava src/data/shirtNumbers.json.
 *
 * Uso: npm run shirts:fetch            (todos os times)
 *      npm run shirts:fetch -- --only pl,championship
 *
 * Por quê: football-data.org (fonte principal) não manda o número; SportAPI7/API-Football
 * estão sem cota/assinatura. A Wikipedia tem {{Fs player|no=…|name=…}} no elenco atual.
 * O `rosters:sync` aplica o arquivo ao publicar o snapshot (applyShirtNumberMap).
 *
 * Educado com a API: User-Agent identificando o cliente, uma requisição por vez, pausa.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizePlayerName, parseSquad, type ShirtNumberMap, type ShirtNumberTeam } from '../src/utils/shirtNumberMap';

const API = 'https://en.wikipedia.org/w/api.php';
const UA = 'FootPlanRosterBot/1.0 (football manager game; shirt numbers)';
const OUT = resolve('src/data/shirtNumbers.json');
const SNAPSHOT = resolve('public/rosters-snapshot.json');
const DELAY_MS = 900;

const LEAGUE_HINT: Record<string, string> = {
  pl: 'English football club', championship: 'English football club',
  laliga: 'Spanish football club', laliga2: 'Spanish football club',
  bundesliga: 'German football club', bundesliga2: 'German football club',
  serieA: 'Italian football club', serieB: 'Italian football club',
  ligue1: 'French football club', ligue2: 'French football club',
  ligaPortugal: 'Portuguese football club', ligaPortugal2: 'Portuguese football club',
  eredivisie: 'Dutch football club', proLeague: 'Belgian football club',
  saudiProLeague: 'Saudi football club', mls: 'American soccer club',
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function api(params: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  let status = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${API}?${qs}`, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    if (res.ok) return res.json();
    status = res.status;
    const retryAfter = Number(res.headers.get('retry-after')) || 0;
    await sleep(Math.max(retryAfter * 1000, 4000 * (attempt + 1)));
  }
  throw new Error(`Wikipedia respondeu ${status} para ${params.action}`);
}

async function wikitext(title: string): Promise<string | null> {
  const d = await api({ action: 'parse', page: title, prop: 'wikitext', redirects: '1' }) as { parse?: { wikitext?: string } };
  return d.parse?.wikitext ?? null;
}

async function search(q: string): Promise<string[]> {
  const d = await api({ action: 'query', list: 'search', srsearch: q, srlimit: '5', srnamespace: '0' }) as { query?: { search?: { title: string }[] } };
  return (d.query?.search ?? []).map(r => r.title)
    .filter(t => !/season|list of|stadium|women|history|academy|reserves|under-\d|B team|II$/i.test(t));
}

/** Acha o artigo do clube que tem o elenco; confere que o elenco bate com o nosso. */
async function findSquad(teamName: string, leagueId: string, ourPlayers: string[]): Promise<ShirtNumberTeam | null> {
  const ours = new Set(ourPlayers.map(normalizePlayerName));
  const candidates = await search(`${teamName} ${LEAGUE_HINT[leagueId] ?? 'football club'}`);
  for (const title of candidates.slice(0, 3)) {
    await sleep(DELAY_MS);
    const text = await wikitext(title);
    if (!text) continue;
    const players = parseSquad(text);
    const keys = Object.keys(players);
    if (keys.length < 11) continue;
    // Pelo menos 5 sobrenomes em comum: evita pegar o artigo errado (clube homônimo).
    const ourLast = new Set([...ours].map(n => n.split(' ').pop()));
    const overlap = keys.filter(k => ourLast.has(k.split(' ').pop())).length;
    if (overlap < 5) continue;
    return { source: title, players };
  }
  return null;
}

async function main() {
  const onlyArg = process.argv.indexOf('--only');
  const only = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(',')) : null;
  const snap = JSON.parse(readFileSync(SNAPSHOT, 'utf8')) as { rosters: Record<string, { id: string; name: string; squad: { name: string }[] }[]> };
  const out: ShirtNumberMap = existsSync(OUT)
    ? JSON.parse(readFileSync(OUT, 'utf8')) as ShirtNumberMap
    : { updatedAt: '', leagues: {} };

  // Número de camisa muda pouco: na tarefa diária, só busca de novo depois de 6 dias.
  const ageDays = out.updatedAt ? (Date.now() - Date.parse(out.updatedAt)) / 86_400_000 : Infinity;
  if (!only && !process.argv.includes('--force') && ageDays < 6) {
    console.log(`Números de camisa buscados há ${ageDays.toFixed(1)} dia(s) — pulando (use --force pra buscar agora).`);
    return;
  }

  let ok = 0, miss = 0;
  const missing: string[] = [];
  for (const [leagueId, teams] of Object.entries(snap.rosters)) {
    if (only && !only.has(leagueId)) continue;
    out.leagues[leagueId] ??= {};
    for (const team of teams) {
      try {
        const found = await findSquad(team.name, leagueId, team.squad.map(p => p.name));
        if (found) { out.leagues[leagueId][team.id] = found; ok++; }
        else { miss++; missing.push(`${leagueId}:${team.name}`); }
      } catch (e) {
        miss++; missing.push(`${leagueId}:${team.name} (${(e as Error).message})`);
      }
      await sleep(DELAY_MS);
    }
    console.log(`✔ ${leagueId}: ${Object.keys(out.leagues[leagueId]).length}/${teams.length} times com números`);
  }
  out.updatedAt = new Date().toISOString();
  writeFileSync(OUT, JSON.stringify(out, null, 0) + '\n');
  console.log(`\nTimes com números: ${ok} · sem: ${miss}`);
  if (missing.length) console.log('Sem números:\n  ' + missing.join('\n  '));
}

main().catch(e => { console.error(e); process.exit(1); });
