import { useMemo } from 'react';
import type { Team } from '../engine/types';
import type { LeagueFixture } from '../engine/tournament';
import styles from './LiveScoreTicker.module.css';

interface Props {
  fixtures: LeagueFixture[];
  teams: Team[];
  /** Times da partida do usuário — o jogo dele não entra no ticker (o placar real está no topo). */
  userTeamIds: [string, string];
  /** Relógio da partida do usuário (segundos). Com ele, os gols dos outros jogos aparecem
   *  conforme o tempo passa; sem ele (partida encerrada), mostra o placar final. */
  clockSeconds?: number;
}

/** Hash estável de string → [0, 1). */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

/** Minutos dos gols de um jogo — só pra revelar no relógio. Determinístico pelo id do
 *  jogo, então o mesmo jogo sempre "acontece" igual; o placar final é o gravado. */
export function goalMinutes(fixtureId: string, home: number, away: number): Array<{ minute: number; side: 'home' | 'away' }> {
  const goals: Array<{ minute: number; side: 'home' | 'away' }> = [];
  for (let i = 0; i < home; i++) goals.push({ minute: 1 + Math.floor(hash01(`${fixtureId}:h${i}`) * 90), side: 'home' });
  for (let i = 0; i < away; i++) goals.push({ minute: 1 + Math.floor(hash01(`${fixtureId}:a${i}`) * 90), side: 'away' });
  return goals.sort((a, b) => a.minute - b.minute);
}

/**
 * Placar dos OUTROS jogos da rodada. Os jogos são simulados de verdade quando a partida
 * ao vivo do usuário começa (como se fossem simultâneos) e o ticker revela os gols no
 * relógio — antes inventava placares com Math.random que não eram os gravados.
 */
export default function LiveScoreTicker({ fixtures, teams, userTeamIds, clockSeconds }: Props) {
  const minuteNow = clockSeconds === undefined ? Infinity : Math.floor(clockSeconds / 60);
  const scores = useMemo(() => {
    const byId = new Map(teams.map(t => [t.id, t]));
    return fixtures
      .filter(f => f.played && f.homeScore !== undefined && f.awayScore !== undefined)
      .filter(f => !(userTeamIds.includes(f.homeTeamId) && userTeamIds.includes(f.awayTeamId)))
      .map(f => {
        const goals = goalMinutes(f.id, f.homeScore!, f.awayScore!).filter(g => g.minute <= minuteNow);
        return {
          id: f.id,
          homeAbbr: byId.get(f.homeTeamId)?.abbreviation ?? '???',
          awayAbbr: byId.get(f.awayTeamId)?.abbreviation ?? '???',
          homeScore: goals.filter(g => g.side === 'home').length,
          awayScore: goals.filter(g => g.side === 'away').length,
        };
      });
  }, [fixtures, teams, userTeamIds, minuteNow]);

  if (scores.length === 0) return null;

  return (
    <div className={styles.ticker}>
      <span className={styles.tickerLabel}>Rodada</span>
      <div className={styles.tickerScroll}>
        {scores.map(s => (
          <span key={s.id} className={styles.tickerItem}>
            {s.homeAbbr} <strong>{s.homeScore}</strong> – <strong>{s.awayScore}</strong> {s.awayAbbr}
          </span>
        ))}
      </div>
    </div>
  );
}
