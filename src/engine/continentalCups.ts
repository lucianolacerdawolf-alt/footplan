import type { Team } from './types';
import type { LeagueDefinition } from '../data/leagues/types';
import { createBracket, type BracketState } from './tournament';
import { getAvgOvr } from '../utils/teamUtils';

// =============================================================================
// COMPETIÇÕES CONTINENTAIS (UCL / UEL / UECL) — Modo Carreira
// =============================================================================
//
// Ao fim de cada temporada, a posição final na liga do usuário define se (e em
// qual) competição continental ele entra na temporada seguinte. O torneio usa o
// mesmo formato mata-mata de 16 times do `createBracket` doméstico; só o time do
// usuário é jogável, os demais confrontos são simulados.
//
// Este módulo é PURO (sem estado/React) e não importa `career.ts` — é `career.ts`
// que importa `ContinentalCupDef` daqui (o campo `season.continentalCupDef`), então
// a dependência tem que ser em mão única pra não criar ciclo.

/** Resultado do usuário numa copa — mesmo union de `CareerSeasonHistoryEntry.cupResult`
 *  (duplicado aqui de propósito pra não importar `career.ts` e criar ciclo). */
export type ContinentalResult =
  | 'champion' | 'runner-up' | 'semifinal' | 'quarterfinal' | 'roundOf16' | 'not-played';

export type ContinentalCupId = 'ucl' | 'uel' | 'uecl';

export interface ContinentalCupDef {
  id: ContinentalCupId;
  name: string;       // 'Liga dos Campeões', 'Liga Europa', 'Liga Conferência'
  shortName: string;  // 'UCL', 'UEL', 'UECL'
  logo: string;       // emoji
  color: string;      // cor de branding do bracket
  totalTeams: 16;
  qualificationKey: 'championsLeague' | 'europaLeague' | 'conferenceLeague';
  prizeMoney: {
    champion: number;
    runnerUp: number;
    semifinal: number;
    quarterfinal: number;
    roundOf16: number;
  };
}

export const CONTINENTAL_CUPS: ContinentalCupDef[] = [
  {
    id: 'ucl', name: 'Liga dos Campeões', shortName: 'UCL',
    logo: '🏆', color: '#1d9bf0', totalTeams: 16,
    qualificationKey: 'championsLeague',
    prizeMoney: {
      champion: 15_000_000, runnerUp: 8_000_000,
      semifinal: 4_000_000, quarterfinal: 2_000_000, roundOf16: 1_000_000,
    },
  },
  {
    id: 'uel', name: 'Liga Europa', shortName: 'UEL',
    logo: '🥈', color: '#e85d04', totalTeams: 16,
    qualificationKey: 'europaLeague',
    prizeMoney: {
      champion: 8_000_000, runnerUp: 4_000_000,
      semifinal: 2_000_000, quarterfinal: 1_000_000, roundOf16: 500_000,
    },
  },
  {
    id: 'uecl', name: 'Liga Conferência', shortName: 'UECL',
    logo: '🥉', color: '#38a169', totalTeams: 16,
    qualificationKey: 'conferenceLeague',
    prizeMoney: {
      champion: 4_000_000, runnerUp: 2_000_000,
      semifinal: 1_000_000, quarterfinal: 500_000, roundOf16: 250_000,
    },
  },
];

export function getContinentalCup(id: string): ContinentalCupDef | undefined {
  return CONTINENTAL_CUPS.find(c => c.id === id);
}

/**
 * Qual copa continental o time do usuário disputa na próxima temporada, a partir
 * da posição final na liga e dos `europeanSlots` da liga. Retorna `null` se a
 * posição ficou fora de toda zona de classificação (ou a liga não dá vagas, como
 * as segundas divisões, todas com slots 0).
 */
export function determineUserContinentalCup(
  league: LeagueDefinition,
  leaguePosition: number,
): ContinentalCupDef | null {
  const slots = league.europeanSlots;
  const uclCut = slots.championsLeague;
  const uelCut = uclCut + slots.europaLeague;
  const ueclCut = uelCut + slots.conferenceLeague;
  if (leaguePosition >= 1 && leaguePosition <= uclCut) return getContinentalCup('ucl')!;
  if (leaguePosition <= uelCut) return getContinentalCup('uel')!;
  if (leaguePosition <= ueclCut) return getContinentalCup('uecl')!;
  return null;
}

/**
 * Pool de times classificados para uma copa continental. Como só a liga do
 * usuário tem tabela real, a posição das demais ligas é aproximada por OVR médio
 * do time — pega os top-N de cada liga conforme `europeanSlots`.
 *
 * Como a soma das vagas por copa pode ser < 16 (ex.: UEL/UECL somam menos que os
 * 16 exigidos pelo bracket), completa com os melhores times restantes por OVR
 * até chegar a `totalTeams`. `excludeTeamId` mantém o time do usuário fora do
 * pool — ele é inserido separadamente por `createContinentalBracket`, garantindo
 * que entre no chaveamento mesmo se o OVR dele não estiver entre os top-N.
 */
export function getQualifiedTeams(
  rosters: Record<string, Team[]>,
  leagues: LeagueDefinition[],
  cupDef: ContinentalCupDef,
  excludeTeamId?: string,
): Team[] {
  const chosen: Team[] = [];
  const chosenIds = new Set<string>();
  if (excludeTeamId) chosenIds.add(excludeTeamId);

  // Vagas por liga (top-N por OVR médio como proxy da posição na tabela).
  for (const league of leagues) {
    const slots = league.europeanSlots[cupDef.qualificationKey];
    if (slots <= 0) continue;
    const teams = rosters[league.id] ?? league.teams;
    const sorted = [...teams].sort((a, b) => getAvgOvr(b) - getAvgOvr(a));
    let added = 0;
    for (const t of sorted) {
      if (added >= slots) break;
      if (chosenIds.has(t.id)) continue;
      chosen.push(t); chosenIds.add(t.id); added++;
    }
  }

  // Backfill até 16 com os melhores restantes de todas as ligas.
  if (chosen.length < cupDef.totalTeams) {
    const rest = leagues
      .flatMap(l => rosters[l.id] ?? l.teams)
      .filter(t => !chosenIds.has(t.id))
      .sort((a, b) => getAvgOvr(b) - getAvgOvr(a));
    for (const t of rest) {
      if (chosen.length >= cupDef.totalTeams) break;
      chosen.push(t); chosenIds.add(t.id);
    }
  }

  return chosen.slice(0, cupDef.totalTeams);
}

/**
 * Cria o bracket continental reutilizando `createBracket`. `userTeam` (quando o
 * usuário se classificou) é sempre incluído; os outros 15 vêm do `pool`. O
 * parâmetro `leagueId` é o da liga do usuário, mantido no `BracketState` por
 * consistência com a copa doméstica (usado só como rótulo/id do chaveamento).
 */
export function createContinentalBracket(
  userTeam: Team | null,
  pool: Team[],
  cupDef: ContinentalCupDef,
  leagueId: string,
  rng: () => number = Math.random,
): BracketState {
  if (!userTeam) {
    // "Modo fantasma" — não usado no v1 (só criamos a copa quando o usuário se
    // classifica), mas defensivo caso um chamador passe null.
    return createBracket(pool[0], pool.slice(1, cupDef.totalTeams), cupDef.name, leagueId, rng);
  }
  const others = pool.filter(t => t.id !== userTeam.id).slice(0, cupDef.totalTeams - 1);
  return createBracket(userTeam, others, cupDef.name, leagueId, rng);
}

/** Premiação continental por estágio alcançado. Aceita o mesmo union de resultado
 *  usado no histórico (deriveCupResult); `not-played`, ids inválidos e resultados
 *  desconhecidos (builds antigos/histórico corrompido) rendem 0. */
export function getContinentalPrizeMoney(cupId: string, result: ContinentalResult): number {
  const cup = getContinentalCup(cupId);
  if (!cup || result === 'not-played') return 0;
  const key = result === 'runner-up' ? 'runnerUp' : result;
  return cup.prizeMoney[key] ?? 0;
}
