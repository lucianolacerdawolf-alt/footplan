// =============================================================================
// FONTE — Wikipedia (elencos das segundas divisões)
// =============================================================================
// SportAPI7 (sem cota) e API-Football (sem assinatura) eram as únicas fontes das 2ª
// divisões, e os elencos ficaram parados em 2023-24 (Parma/Como na Serie B). A Wikipedia
// tem a temporada atual: o artigo "2026–27 Serie B" lista os times e o artigo de cada
// clube traz o elenco com número e posição. Entra como ÚLTIMA fonte do sync (só roda
// quando as APIs falham) e só no `rosters:sync` (o jogo não sincroniza no cliente).

import type { RemotePlayer, RemoteTeam } from './footballApi';
import { parseSquadEntries } from '../utils/shirtNumberMap';

const API = 'https://en.wikipedia.org/w/api.php';
const UA = 'FootPlanRosterBot/1.0 (football manager game; squads)';
const DELAY_MS = 700;

/** Liga interna → nome do artigo de temporada (sem o "2026–27 "). */
const SEASON_ARTICLE: Record<string, string> = {
  laliga2: 'Segunda División',
  bundesliga2: '2. Bundesliga',
  serieB: 'Serie B',
  ligue2: 'Ligue 2',
  ligaPortugal2: 'Liga Portugal 2',
};

export function isWikipediaLeagueMapped(leagueId: string): boolean {
  return leagueId in SEASON_ARTICLE;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** "2026–27" — a temporada europeia começa em julho. */
export function seasonLabel(now = new Date()): string {
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}–${String((y + 1) % 100).padStart(2, '0')}`;
}

async function wikitext(title: string): Promise<string | null> {
  const qs = new URLSearchParams({ action: 'parse', page: title, prop: 'wikitext', redirects: '1', format: 'json', formatversion: '2', origin: '*' });
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`${API}?${qs}`, { headers: { 'Api-User-Agent': UA } });
    if (res.ok) {
      const d = await res.json() as { parse?: { wikitext?: string }; error?: unknown };
      return d.parse?.wikitext ?? null;
    }
    await sleep(4000 * (attempt + 1));
  }
  throw new Error(`Wikipedia indisponível ao ler "${title}"`);
}

interface ClubLink { article: string; label: string; code: string }

/** Times da temporada: `name_XXX=[[Artigo|Rótulo]]` (Module:Sports table), na própria
 *  página ou no template "… table"; senão, os rótulos do mapa da seção Teams. */
export function parseSeasonClubs(text: string): ClubLink[] {
  const out = new Map<string, ClubLink>();
  for (const m of text.matchAll(/\|\s*name_([^\s=|]+)\s*=\s*(?:\{\{\s*nowrap\s*\|\s*)?\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g)) {
    const [, code, article, label] = m;
    if (!out.has(article)) out.set(article, { article, label: (label ?? article).trim(), code });
  }
  if (out.size === 0) {
    for (const m of text.matchAll(/Location map~[^}]*?label=\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g)) {
      const [, article, label] = m;
      const clean = (label ?? article).replace(/-?<br\s*\/?>/g, '').trim();
      if (!out.has(article)) out.set(article, { article, label: clean, code: '' });
    }
  }
  return [...out.values()];
}

const POSITION: Record<string, string> = { GK: 'Goalkeeper', DF: 'Defence', MF: 'Midfield', FW: 'Offence' };

/** Id numérico estável a partir do nome (o merge usa id só pra deduplicar). */
function hashId(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export async function fetchWikipediaLeague(leagueId: string, log: (m: string) => void = () => {}): Promise<RemoteTeam[]> {
  const base = SEASON_ARTICLE[leagueId];
  if (!base) throw new Error(`Liga "${leagueId}" sem artigo mapeado na Wikipedia.`);
  const season = `${seasonLabel()} ${base}`;
  const seasonText = await wikitext(season);
  if (!seasonText) throw new Error(`Artigo "${season}" não encontrado na Wikipedia.`);

  let clubs = parseSeasonClubs(seasonText);
  // A tabela às vezes vive num template transcluído ("{{2026–27 Ligue 2 table}}").
  const tableTpl = /\{\{\s*([^{}|]*?\btable)\s*[|}]/.exec(seasonText)?.[1];
  if (tableTpl) {
    await sleep(DELAY_MS);
    const tplText = await wikitext(`Template:${tableTpl.trim()}`);
    const fromTpl = tplText ? parseSeasonClubs(tplText) : [];
    if (fromTpl.length > clubs.length) clubs = fromTpl;
  }
  if (clubs.length < 16) throw new Error(`Só ${clubs.length} times achados em "${season}".`);

  const teams: RemoteTeam[] = [];
  for (const club of clubs) {
    await sleep(DELAY_MS);
    const text = await wikitext(club.article);
    const entries = text ? parseSquadEntries(text) : [];
    if (entries.length < 15) { log(`  ⚠ ${club.label}: elenco não encontrado (${entries.length})`); continue; }
    const squad: RemotePlayer[] = entries.map(e => ({
      id: hashId(`${club.article}:${e.name}`),
      name: e.name,
      position: POSITION[e.pos] ?? null,
      dateOfBirth: null,
      nationality: e.nat || null,
      shirtNumber: e.no,
    }));
    teams.push({
      id: hashId(club.article),
      name: club.label,
      shortName: club.label,
      tla: club.code,
      crest: '',
      squad,
    });
  }
  if (teams.length < clubs.length - 2) throw new Error(`Elenco de só ${teams.length}/${clubs.length} times na Wikipedia.`);
  return teams;
}
