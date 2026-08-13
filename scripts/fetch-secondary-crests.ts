/**
 * Gera src/data/secondDivisionCrests.ts — mapa `teamId -> URL de badge` das 6 segundas
 * divisões, puxado do TheSportsDB (gratuito, sem chave paga: usa a test key pública "3").
 *
 * Por que existe: times de 2ª divisão nascem com logoUrl vazio (makeSecondDivisionTeam),
 * então dependiam do sync ao vivo (football-data / API-Football) pra ter escudo — e essas
 * URLs hotlinkadas quebram no navegador. Com o badge do TheSportsDB gravado como logoUrl
 * ESTÁTICO, o crestSrc() serve local (após crests:download) e o sync não sobrescreve
 * (guarda de rosterSync.ts: só preenche crest quando logoUrl está vazio).
 *
 * Uso: npx vite-node scripts/fetch-secondary-crests.ts
 * Depois: npm run crests:download   (baixa e bundla os badges novos)
 *
 * A chave "3" limita search_all_teams a 10 resultados e lookup_all_teams?id= vem quebrado
 * (ignora o id), então a busca é POR TIME (searchteams.php?t=) com scoring pra escolher
 * o candidato certo (evita times femininos, juvenis e clubes homônimos de outro país).
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { allLeagues } from '../src/data/leagues';

// Mescla com o que já foi resolvido antes (re-rodar só rebusca o que falta). --force ignora.
let existing: Record<string, string> = {};
try { existing = (await import('../src/data/secondDivisionCrests')).SECOND_DIVISION_CRESTS ?? {}; } catch { /* 1ª execução */ }
const FORCE = process.argv.includes('--force');

// Queries extras pra nomes que a busca simples do TheSportsDB erra (acento, sigla, homônimo).
const ALIASES: Record<string, string[]> = {
  'Saint-Étienne': ['Etienne', 'AS Saint-Etienne'],
  'Sporting Gijón': ['Real Sporting', 'Sporting de Gijon'],
  'AVS': ['AVS Futebol SAD', 'Vila das Aves', 'Aves'],
  'Nacional': ['CD Nacional', 'Nacional Madeira'],
  'Hamburger SV': ['Hamburg'],
  'Paris FC': ['Paris FC'],
};

const API = 'https://www.thesportsdb.com/api/v1/json/3';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'secondDivisionCrests.ts');

// id interno da liga -> país no TheSportsDB (pra desambiguar homônimos).
const SECOND_DIVISIONS: Record<string, string> = {
  championship: 'England',
  laliga2: 'Spain',
  serieB: 'Italy',
  bundesliga2: 'Germany',
  ligue2: 'France',
  ligaPortugal2: 'Portugal',
};

const EXCLUDE = /\b(women|ladies|femin|frauen|femenino|feminino|fem|w)\b|\bu-?1[0-9]\b|\bu-?2[0-3]\b|youth|sub-?\d|junior|academy/i;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Normaliza nome de clube: sem acento, minúsculo, sem ruído (FC, CF, prefixos, "de"...). */
function norm(s: string): string {
  return stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(fc|cf|sc|ac|as|ss|us|sd|ud|cd|sv|afc|rcd|rc|cp|1|calcio|futebol|football|club|deportivo|de|do|da|del|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(norm(s).split(' ').filter(Boolean));
}

/** Similaridade 0..10 entre nome nosso e nome do candidato. */
function nameScore(ours: string, cand: string): number {
  const a = norm(ours), b = norm(cand);
  if (!a || !b) return 0;
  if (a === b) return 10;
  if (a.includes(b) || b.includes(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return 5 + 3 * ratio;
  }
  const ta = tokens(ours), tb = tokens(cand);
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = new Set([...ta, ...tb]).size;
  return union ? (inter / union) * 7 : 0;
}

interface Cand { strTeam: string; strBadge?: string; strSport?: string; strCountry?: string; strLeague?: string }

async function search(query: string): Promise<Cand[]> {
  const url = `${API}/searchteams.php?t=${encodeURIComponent(query)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) { await sleep(4000); continue; }
      if (!res.ok) return [];
      const data = await res.json() as { teams: Cand[] | null };
      return data.teams ?? [];
    } catch {
      await sleep(1500);
    }
  }
  return [];
}

/** Variantes de query: nome cheio, sem prefixo comum, sem acento, primeiro token forte. */
function queryVariants(name: string): string[] {
  const v = new Set<string>();
  v.add(name);
  for (const a of ALIASES[name] ?? []) v.add(a);
  v.add(name.replace(/^(1\.?\s*)?(FC|SC|SV|AS|AC|CD|UD|RCD|US|SS|AFC|CF|Real|Sporting)\s+/i, '').trim());
  v.add(stripAccents(name));
  const toks = norm(name).split(' ').filter(t => t.length > 3);
  if (toks[0]) v.add(toks[0]);
  return [...v].filter(Boolean);
}

async function bestBadge(name: string, country: string): Promise<{ badge: string; chosen: string; sc: number } | null> {
  const seen = new Map<string, Cand>();
  for (const q of queryVariants(name)) {
    for (const c of await search(q)) {
      if (c.strTeam) seen.set(c.strTeam, c);
    }
    await sleep(700);
    // Se já achou match forte num nome exato, pode parar cedo.
    if ([...seen.values()].some(c => norm(c.strTeam) === norm(name) && c.strCountry === country)) break;
  }

  let best: { badge: string; chosen: string; sc: number } | null = null;
  for (const c of seen.values()) {
    if (c.strSport !== 'Soccer') continue;
    if (!c.strBadge) continue;
    if (EXCLUDE.test(c.strTeam)) continue;
    let sc = nameScore(name, c.strTeam);
    if (sc < 4) continue; // nome muito distante — descarta
    if (c.strCountry === country) sc += 3;
    else sc -= 1.5; // país diferente: penaliza homônimo estrangeiro
    if (!best || sc > best.sc) best = { badge: c.strBadge, chosen: `${c.strTeam} (${c.strCountry}/${c.strLeague})`, sc };
  }
  return best;
}

async function main() {
  const map: Record<string, string> = FORCE ? {} : { ...existing };
  const unmatched: string[] = [];
  console.log(`Partindo de ${Object.keys(map).length} badges já resolvidos${FORCE ? ' (IGNORADO: --force)' : ''}.`);

  for (const league of allLeagues) {
    const country = SECOND_DIVISIONS[league.id];
    if (!country) continue;
    const pending = league.teams.filter(t => !map[t.id]);
    if (pending.length === 0) continue;
    console.log(`\n=== ${league.id} (${country}) — ${pending.length}/${league.teams.length} faltando ===`);
    for (const team of pending) {
      const hit = await bestBadge(team.name, country);
      if (hit && hit.sc >= 6) {
        map[team.id] = hit.badge;
        console.log(`  ✓ ${team.name.padEnd(22)} -> ${hit.chosen}  [${hit.sc.toFixed(1)}]`);
      } else {
        console.log(`  ✗ ${team.name.padEnd(22)} -> ${hit ? `fraco: ${hit.chosen} [${hit.sc.toFixed(1)}]` : 'NADA'}`);
        unmatched.push(`${league.id}/${team.id} ${team.name}${hit ? ` (melhor: ${hit.chosen} ${hit.sc.toFixed(1)})` : ''}`);
      }
      await sleep(700);
    }
  }

  const entries = Object.keys(map).sort()
    .map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(map[k])},`)
    .join('\n');
  const banner = `// GERADO POR scripts/fetch-secondary-crests.ts — NÃO EDITE À MÃO (mas pode corrigir\n` +
    `// entradas erradas manualmente; o gerador reescreve tudo quando re-rodado).\n` +
    `// Mapa: teamId da 2ª divisão -> URL de badge (TheSportsDB). Consumido por\n` +
    `// makeSecondDivisionTeam (logoUrl estático) e bundlado por crests:download.\n\n`;
  writeFileSync(OUT, `${banner}export const SECOND_DIVISION_CRESTS: Record<string, string> = {\n${entries}\n};\n`);

  console.log(`\n📝 ${Object.keys(map).length} badges gravados em src/data/secondDivisionCrests.ts`);
  if (unmatched.length) {
    console.log(`\n⚠ ${unmatched.length} sem match (ficam com logoUrl vazio):`);
    unmatched.forEach(u => console.log(`   - ${u}`));
  }
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1); });
