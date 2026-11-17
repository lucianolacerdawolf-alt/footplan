import type { Strategy, Team } from '../engine/types';
import { ensureAuth } from './supabaseClient';
import {
  friendSchedule, dueRoundCount, simulateFriendRound, utcToday, newLeagueCode,
  type FriendMember, type FriendRoundResult,
} from '../engine/friendLeague';

// Camada de rede da Liga entre Amigos (tabelas friend_leagues / _members / _rounds,
// ver scripts/sql/setup-supabase.sql). A lógica de jogo fica em engine/friendLeague.ts.

export interface FriendLeague {
  id: string;
  code: string;
  name: string;
  baseLeagueId: string;
  startDate: string;
  seed: number;
  createdBy: string;
  teams: Team[];
}

export interface FriendLeagueData {
  league: FriendLeague;
  members: FriendMember[];
  rounds: Map<number, FriendRoundResult[]>;
  myUserId: string;
}

interface LeagueRow { id: string; code: string; name: string; base_league_id: string; start_date: string; seed: number; created_by: string; teams: Team[] }
interface MemberRow { user_id: string; team_id: string; manager_name: string; strategy: Strategy | null }

const toLeague = (r: LeagueRow): FriendLeague => ({
  id: r.id, code: r.code, name: r.name, baseLeagueId: r.base_league_id, startDate: r.start_date,
  seed: Number(r.seed), createdBy: r.created_by, teams: r.teams ?? [],
});
const toMember = (r: MemberRow): FriendMember => ({ userId: r.user_id, teamId: r.team_id, managerName: r.manager_name, strategy: r.strategy });

async function myId(): Promise<{ sb: Awaited<ReturnType<typeof ensureAuth>>; uid: string }> {
  const sb = await ensureAuth();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error('Sem login (o jogo usa login anônimo — confira a conexão).');
  return { sb, uid: data.user.id };
}

/** Cria a liga (clubes congelados na criação) e já entra com o clube escolhido. */
export async function createFriendLeague(name: string, baseLeagueId: string, teams: Team[], teamId: string, managerName: string): Promise<FriendLeague> {
  const { sb } = await myId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newLeagueCode();
    const seed = Math.floor(Math.random() * 2 ** 31);
    const { data, error } = await sb.from('friend_leagues')
      .insert({ code, name: name.trim().slice(0, 40), base_league_id: baseLeagueId, seed, teams })
      .select().single();
    if (error?.code === '23505') continue; // código repetido: tenta outro
    if (error) throw new Error(`Não foi possível criar a liga: ${error.message}`);
    const league = toLeague(data as LeagueRow);
    await joinFriendLeague(league.id, teamId, managerName);
    return league;
  }
  throw new Error('Não foi possível gerar um código de liga livre. Tente de novo.');
}

export async function findFriendLeagueByCode(code: string): Promise<FriendLeague | null> {
  const { sb } = await myId();
  const { data, error } = await sb.from('friend_leagues').select('*').eq('code', code.trim().toUpperCase()).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toLeague(data as LeagueRow) : null;
}

export async function joinFriendLeague(leagueId: string, teamId: string, managerName: string): Promise<void> {
  const { sb } = await myId();
  const { error } = await sb.from('friend_league_members')
    .insert({ league_id: leagueId, team_id: teamId, manager_name: managerName.trim().slice(0, 24) || 'Técnico' });
  if (error?.code === '23505') throw new Error('Esse clube já tem dono, ou você já está nessa liga.');
  if (error) throw new Error(`Não foi possível entrar na liga: ${error.message}`);
}

export async function listMyFriendLeagues(): Promise<FriendLeague[]> {
  const { sb, uid } = await myId();
  const { data: mine, error } = await sb.from('friend_league_members').select('league_id').eq('user_id', uid);
  if (error) throw new Error(error.message);
  const ids = (mine ?? []).map(m => m.league_id as string);
  if (ids.length === 0) return [];
  const { data, error: e2 } = await sb.from('friend_leagues').select('*').in('id', ids).order('created_at', { ascending: false });
  if (e2) throw new Error(e2.message);
  return (data as LeagueRow[]).map(toLeague);
}

export async function loadFriendLeague(leagueId: string): Promise<FriendLeagueData> {
  const { sb, uid } = await myId();
  const [{ data: lg, error: e1 }, { data: mem, error: e2 }, { data: rds, error: e3 }] = await Promise.all([
    sb.from('friend_leagues').select('*').eq('id', leagueId).single(),
    sb.from('friend_league_members').select('user_id, team_id, manager_name, strategy').eq('league_id', leagueId),
    sb.from('friend_league_rounds').select('round, results').eq('league_id', leagueId),
  ]);
  const err = e1 ?? e2 ?? e3;
  if (err) throw new Error(err.message);
  const rounds = new Map<number, FriendRoundResult[]>((rds ?? []).map(r => [r.round as number, r.results as FriendRoundResult[]]));
  return { league: toLeague(lg as LeagueRow), members: (mem as MemberRow[]).map(toMember), rounds, myUserId: uid };
}

export async function saveFriendStrategy(leagueId: string, strategy: Strategy): Promise<void> {
  const { sb, uid } = await myId();
  const { error } = await sb.from('friend_league_members').update({ strategy }).eq('league_id', leagueId).eq('user_id', uid);
  if (error) throw new Error(`Não foi possível salvar a tática: ${error.message}`);
}

/**
 * Simula e grava as rodadas que já venceram e ninguém gravou ainda. Se outro membro
 * gravar a mesma rodada antes (conflito de chave), mantém a dele — o placar seria o
 * mesmo com as mesmas táticas. Devolve quantas rodadas este aparelho gravou.
 */
export async function settleDueRounds(data: FriendLeagueData): Promise<number> {
  const { league, members, rounds } = data;
  if (!members.some(m => m.userId === data.myUserId)) return 0;
  const schedule = friendSchedule(league.teams);
  const due = dueRoundCount(league.startDate, utcToday(), schedule.length);
  const { sb } = await myId();
  let written = 0;
  for (let r = 0; r < due; r++) {
    if (rounds.has(r)) continue;
    const results = simulateFriendRound(league.teams, members, schedule, r, league.seed);
    const { error } = await sb.from('friend_league_rounds').insert({ league_id: league.id, round: r, results });
    if (error && error.code !== '23505') throw new Error(`Falha ao gravar a rodada ${r + 1}: ${error.message}`);
    if (!error) written++;
  }
  return written;
}
