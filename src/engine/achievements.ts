import type { MatchResult, MatchEvent } from './types';
import type { LeagueState, BracketState } from './tournament';
import { computeStandings } from './tournament';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  hint: string;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

export interface AchievementsData {
  unlocked: UnlockedAchievement[];
  totalMatchesPlayed: number;
}

export function defaultAchievementsData(): AchievementsData {
  return { unlocked: [], totalMatchesPlayed: 0 };
}

export interface AchievementCheckContext {
  result: MatchResult;
  userTeamId: string;
  matchContext: 'regular' | 'league' | 'bracket';
  leagueState?: LeagueState | null;
  bracketState?: BracketState | null;
  totalMatchesPlayed: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function userIsHome(ctx: AchievementCheckContext): boolean {
  return ctx.result.homeTeam.id === ctx.userTeamId;
}

function userScore(home: number, away: number, isHome: boolean): number {
  return isHome ? home : away;
}

function oppScore(home: number, away: number, isHome: boolean): number {
  return isHome ? away : home;
}

function countUserGoals(events: MatchEvent[], userTeamId: string): Map<string, number> {
  const tally = new Map<string, number>();
  for (const e of events) {
    if (e.type === 'goal' && e.teamId === userTeamId && e.scorer) {
      tally.set(e.scorer, (tally.get(e.scorer) ?? 0) + 1);
    }
  }
  return tally;
}

function countUserCards(events: MatchEvent[], userTeamId: string): { yellow: number; red: number } {
  let yellow = 0, red = 0;
  for (const e of events) {
    if (e.teamId !== userTeamId) continue;
    if (e.type === 'yellowCard') yellow++;
    if (e.type === 'redCard') red++;
  }
  return { yellow, red };
}

function parseHalftimeScores(htEvent: MatchEvent): { home: number; away: number } | null {
  const match = htEvent.description.match(/(\d+)x(\d+)/);
  if (!match) return null;
  const a = parseInt(match[1]);
  const b = parseInt(match[2]);
  if (htEvent.description.includes('visitante')) {
    return { home: b, away: a };
  }
  return { home: a, away: b };
}

/** Compute longest consecutive league streak for the user from fixtures (most-recent-first). */
function computeLeagueStreaks(
  leagueState: LeagueState,
  userTeamId: string,
): { maxConsecutiveWins: number; maxConsecutiveUnbeaten: number; maxConsecutiveScoring3: number } {
  const fixtures = leagueState.fixtures;
  const results: Array<{ won: boolean; draw: boolean; scored: number }> = [];

  for (let r = leagueState.currentRound; r >= 0; r--) {
    const round = fixtures[r];
    for (const f of round) {
      if (!f.played || f.homeScore == null || f.awayScore == null) continue;
      const isUserHome = f.homeTeamId === userTeamId;
      const isUserAway = f.awayTeamId === userTeamId;
      if (!isUserHome && !isUserAway) continue;
      const us = isUserHome ? f.homeScore : f.awayScore;
      const os = isUserHome ? f.awayScore : f.homeScore;
      results.push({ won: us > os, draw: us === os, scored: us });
    }
  }

  results.reverse(); // chronological order now

  let maxWins = 0, maxUnbeaten = 0, maxScoring3 = 0;
  let curWins = 0, curUnbeaten = 0, curScoring3 = 0;

  for (const r of results) {
    if (r.won) { curWins++; curUnbeaten++; }
    else { curWins = 0; if (r.draw) curUnbeaten++; else curUnbeaten = 0; }
    if (r.scored >= 3) curScoring3++; else curScoring3 = 0;
    if (curWins > maxWins) maxWins = curWins;
    if (curUnbeaten > maxUnbeaten) maxUnbeaten = curUnbeaten;
    if (curScoring3 > maxScoring3) maxScoring3 = curScoring3;
  }

  return { maxConsecutiveWins: maxWins, maxConsecutiveUnbeaten: maxUnbeaten, maxConsecutiveScoring3: maxScoring3 };
}

// ── Achievements list ────────────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'debut',
    name: 'Estreia',
    description: 'Complete sua primeira partida',
    icon: '🎮',
    hint: 'Jogue uma partida',
  },
  {
    id: 'hat_trick',
    name: 'Hat-Trick',
    description: 'Um jogador do seu time marcou 3 gols em uma partida',
    icon: '⚽',
    hint: 'Um jogador marcando 3 vezes na mesma partida',
  },
  {
    id: 'clean_sheet',
    name: 'Muralha',
    description: 'Vença uma partida sem sofrer gols',
    icon: '🧤',
    hint: 'Ganhar sem o adversário marcar',
  },
  {
    id: 'rout',
    name: 'Goleada',
    description: 'Vença por 5 ou mais gols de diferença',
    icon: '🔥',
    hint: 'Uma vitória elástica',
  },
  {
    id: 'penalty_hero',
    name: 'Herói dos Pênaltis',
    description: 'Vença uma disputa de pênaltis',
    icon: '⏱️',
    hint: 'Sobreviva à prorrogação e brilhe nas penalidades',
  },
  {
    id: 'comeback',
    name: 'Virada Épica',
    description: 'Estava perdendo no intervalo e venceu a partida',
    icon: '🔄',
    hint: 'Reverter um placar adverso depois do intervalo',
  },
  {
    id: 'red_card',
    name: 'Expulso!',
    description: 'Um jogador do seu time foi expulso',
    icon: '🔴',
    hint: 'Levar um cartão vermelho',
  },
  {
    id: 'fair_play',
    name: 'Fair Play',
    description: 'Complete uma partida sem receber nenhum cartão',
    icon: '🤝',
    hint: 'Uma partida limpa, sem amarelos nem vermelhos',
  },
  {
    id: 'league_champion',
    name: 'Campeão',
    description: 'Vença a Premier League',
    icon: '👑',
    hint: 'Termine a temporada no topo da tabela',
  },
  {
    id: 'cup_king',
    name: 'Rei da Copa',
    description: 'Vença a FA Cup',
    icon: '🏆',
    hint: 'Levante o troféu da copa',
  },
  {
    id: 'invincible',
    name: 'Invencível',
    description: 'Fique 10 partidas consecutivas sem perder na liga',
    icon: '🛡️',
    hint: 'Uma longa sequência invicta na Premier League',
  },
  {
    id: 'streak_5',
    name: 'Embalado',
    description: 'Vença 5 partidas consecutivas na liga',
    icon: '💪',
    hint: 'Emendar 5 vitórias seguidas',
  },
  {
    id: 'goal_streak',
    name: 'Artilheiro',
    description: 'Marque 3 ou mais gols em 3 partidas consecutivas da liga',
    icon: '🥅',
    hint: 'Fazer 3+ gols em três jogos seguidos',
  },
  {
    id: 'marathon',
    name: 'Maratonista',
    description: 'Jogue 20 partidas no total',
    icon: '📊',
    hint: 'Acumular 20 jogos disputados',
  },
  {
    id: 'cup_invincible',
    name: 'Invicto na Copa',
    description: 'Vença a FA Cup sem perder nenhuma partida (só vitórias)',
    icon: '💎',
    hint: 'Campanha perfeita na copa',
  },
];

// ── Condition functions ──────────────────────────────────────────────────────

const ACHIEVEMENT_CONDITIONS: Record<string, (ctx: AchievementCheckContext) => boolean> = {
  debut(ctx) {
    return ctx.totalMatchesPlayed >= 1;
  },
  hat_trick(ctx) {
    const goals = countUserGoals(ctx.result.events, ctx.userTeamId);
    return [...goals.values()].some(g => g >= 3);
  },
  clean_sheet(ctx) {
    const isHome = userIsHome(ctx);
    const { homeScore, awayScore } = ctx.result;
    const us = userScore(homeScore, awayScore, isHome);
    const them = oppScore(homeScore, awayScore, isHome);
    return us > them && them === 0;
  },
  rout(ctx) {
    const isHome = userIsHome(ctx);
    const { homeScore, awayScore } = ctx.result;
    const us = userScore(homeScore, awayScore, isHome);
    const them = oppScore(homeScore, awayScore, isHome);
    return us - them >= 5;
  },
  penalty_hero(ctx) {
    const pr = ctx.result.penaltyResult;
    if (!pr) return false;
    const isHome = userIsHome(ctx);
    return (isHome && pr.winner === 'home') || (!isHome && pr.winner === 'away');
  },
  comeback(ctx) {
    const htEvent = ctx.result.events.find(e => e.type === 'halftime');
    if (!htEvent) return false;
    const ht = parseHalftimeScores(htEvent);
    if (!ht) return false;
    const isHome = userIsHome(ctx);
    const { homeScore, awayScore } = ctx.result;
    const htUser = userScore(ht.home, ht.away, isHome);
    const htOpp = oppScore(ht.home, ht.away, isHome);
    const finalUser = userScore(homeScore, awayScore, isHome);
    const finalOpp = oppScore(homeScore, awayScore, isHome);
    return htUser < htOpp && finalUser > finalOpp;
  },
  red_card(ctx) {
    const cards = countUserCards(ctx.result.events, ctx.userTeamId);
    return cards.red > 0;
  },
  fair_play(ctx) {
    const cards = countUserCards(ctx.result.events, ctx.userTeamId);
    return cards.yellow === 0 && cards.red === 0;
  },
  league_champion(ctx) {
    if (ctx.matchContext !== 'league' || !ctx.leagueState) return false;
    if (ctx.leagueState.phase !== 'done') return false;
    const standings = computeStandings(ctx.leagueState.teams, ctx.leagueState.fixtures);
    return standings.length > 0 && standings[0].teamId === ctx.userTeamId;
  },
  cup_king(ctx) {
    if (ctx.matchContext !== 'bracket' || !ctx.bracketState) return false;
    return ctx.bracketState.stage === 'champion' && ctx.bracketState.championId === ctx.userTeamId;
  },
  invincible(ctx) {
    if (ctx.matchContext !== 'league' || !ctx.leagueState) return false;
    const streaks = computeLeagueStreaks(ctx.leagueState, ctx.userTeamId);
    return streaks.maxConsecutiveUnbeaten >= 10;
  },
  streak_5(ctx) {
    if (ctx.matchContext !== 'league' || !ctx.leagueState) return false;
    const streaks = computeLeagueStreaks(ctx.leagueState, ctx.userTeamId);
    return streaks.maxConsecutiveWins >= 5;
  },
  goal_streak(ctx) {
    if (ctx.matchContext !== 'league' || !ctx.leagueState) return false;
    const streaks = computeLeagueStreaks(ctx.leagueState, ctx.userTeamId);
    return streaks.maxConsecutiveScoring3 >= 3;
  },
  marathon(ctx) {
    return ctx.totalMatchesPlayed >= 20;
  },
  cup_invincible(ctx) {
    if (ctx.matchContext !== 'bracket' || !ctx.bracketState) return false;
    if (ctx.bracketState.stage !== 'champion' || ctx.bracketState.championId !== ctx.userTeamId) return false;
    const stages: Array<Array<{ homeTeamId: string | null; awayTeamId: string | null; homeScore?: number; awayScore?: number; played: boolean; winnerId?: string }>> = [
      ctx.bracketState.roundOf16,
      ctx.bracketState.quarterFinals,
      ctx.bracketState.semiFinals,
      [ctx.bracketState.final],
    ];
    for (const matches of stages) {
      for (const m of matches) {
        if (!m.played || m.homeScore == null || m.awayScore == null) continue;
        const isUserHome = m.homeTeamId === ctx.userTeamId;
        const isUserAway = m.awayTeamId === ctx.userTeamId;
        if (!isUserHome && !isUserAway) continue;
        const us = isUserHome ? m.homeScore : m.awayScore;
        const them = isUserHome ? m.awayScore : m.homeScore;
        if (us <= them) return false; // lost or drew
      }
    }
    return true;
  },
};

// ── Public API ───────────────────────────────────────────────────────────────

export function checkAchievements(ctx: AchievementCheckContext): Achievement[] {
  return ACHIEVEMENTS.filter(a => {
    const cond = ACHIEVEMENT_CONDITIONS[a.id];
    if (!cond) return false;
    try {
      return cond(ctx);
    } catch {
      return false;
    }
  });
}
