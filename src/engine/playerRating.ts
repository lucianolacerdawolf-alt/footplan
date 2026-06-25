import type { MatchResult, MatchEvent, Player, Team } from './types';

export interface PlayerMatchRating {
  player: Player;
  team: Team;
  rating: number;
  goals: number;
  yellow: number;
  red: number;
  isGK: boolean;
}

function playersInMatch(team: Team): Player[] {
  // titulares = primeiros 11 (substituições já refletem swap in-place no time mutado)
  return team.squad.slice(0, 11);
}

function findPlayerByName(players: Player[], name: string | undefined): Player | null {
  if (!name) return null;
  return players.find(p => p.name === name) ?? null;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function calculateRatings(result: MatchResult): PlayerMatchRating[] {
  const { homeTeam, awayTeam, events, homeScore, awayScore } = result;
  const homePlayers = playersInMatch(homeTeam);
  const awayPlayers = playersInMatch(awayTeam);

  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;
  const homeResultMod = homeWon ? 0.5 : awayWon ? -0.3 : 0;
  const awayResultMod = awayWon ? 0.5 : homeWon ? -0.3 : 0;

  const ratings = new Map<string, PlayerMatchRating>();

  const init = (player: Player, team: Team) => {
    const isGK = player.position === 'GK';
    const teamMod = team.id === homeTeam.id ? homeResultMod : awayResultMod;
    let base = 6.5 + teamMod;
    if (isGK) {
      const goalsConceded = team.id === homeTeam.id ? awayScore : homeScore;
      base -= goalsConceded * 0.4;
      const saves = events.filter(e => e.type === 'save' && e.teamId !== team.id).length;
      base += Math.min(2.0, saves * 0.3);
    }
    ratings.set(player.id, {
      player, team, rating: base, goals: 0, yellow: 0, red: 0, isGK,
    });
  };

  homePlayers.forEach(p => init(p, homeTeam));
  awayPlayers.forEach(p => init(p, awayTeam));

  const adjustByEvent = (evt: MatchEvent) => {
    if (evt.type === 'goal') {
      const team = evt.teamId === homeTeam.id ? homeTeam : evt.teamId === awayTeam.id ? awayTeam : null;
      if (!team) return;
      const players = team.id === homeTeam.id ? homePlayers : awayPlayers;
      const scorer = findPlayerByName(players, evt.scorer);
      if (scorer) {
        const r = ratings.get(scorer.id);
        if (r) { r.goals++; r.rating += 1.5; }
      }
    } else if (evt.type === 'yellowCard' && evt.playerId) {
      const r = ratings.get(evt.playerId);
      if (r) { r.yellow++; r.rating -= 0.5; }
    } else if (evt.type === 'redCard' && evt.playerId) {
      const r = ratings.get(evt.playerId);
      if (r) { r.red++; r.rating -= 2.0; }
    }
  };

  events.forEach(adjustByEvent);

  // Clamp final
  for (const r of ratings.values()) {
    r.rating = Math.round(clamp(r.rating, 4.0, 10.0) * 10) / 10;
  }

  return [...ratings.values()].sort((a, b) => b.rating - a.rating);
}

export function manOfTheMatch(ratings: PlayerMatchRating[]): PlayerMatchRating | null {
  return ratings[0] ?? null;
}

export interface GoalEntry {
  minute: number;
  scorer: string;
  team: Team;
}

export function goalScorers(result: MatchResult): GoalEntry[] {
  const { events, homeTeam, awayTeam } = result;
  return events
    .filter(e => e.type === 'goal' && e.scorer)
    .map(e => ({
      minute: e.minute,
      scorer: e.scorer!,
      team: e.teamId === homeTeam.id ? homeTeam : awayTeam,
    }));
}

export interface CardEntry {
  minute: number;
  player: Player | null;
  team: Team;
  type: 'yellow' | 'red';
}

export function cardEvents(result: MatchResult): CardEntry[] {
  const { events, homeTeam, awayTeam } = result;
  const all = [...playersInMatch(homeTeam), ...playersInMatch(awayTeam)];
  return events
    .filter(e => e.type === 'yellowCard' || e.type === 'redCard')
    .map(e => {
      const team = e.teamId === homeTeam.id ? homeTeam : awayTeam;
      const player = e.playerId ? all.find(p => p.id === e.playerId) ?? null : null;
      return { minute: e.minute, player, team, type: e.type === 'yellowCard' ? 'yellow' as const : 'red' as const };
    });
}
