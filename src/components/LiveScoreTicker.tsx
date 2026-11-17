import { useMemo } from 'react';
import type { Team } from '../engine/types';
import type { LeagueFixture } from '../engine/tournament';
import styles from './LiveScoreTicker.module.css';

interface Props {
  fixtures: LeagueFixture[];
  teams: Team[];
  /** Times da partida do usuário — o jogo dele não entra no ticker (o placar real está no topo). */
  userTeamIds: [string, string];
}

/**
 * Placar dos OUTROS jogos da rodada que já foram disputados.
 *
 * Antes simulava cada jogo na hora com Math.random: os placares exibidos não eram os
 * que depois iam pra tabela, e o jogo do próprio usuário aparecia com um placar
 * inventado (diferente do placar real no topo da tela). Agora mostra só resultado
 * gravado; se nenhum outro jogo foi disputado ainda, o ticker não aparece.
 */
export default function LiveScoreTicker({ fixtures, teams, userTeamIds }: Props) {
  const scores = useMemo(() => {
    const byId = new Map(teams.map(t => [t.id, t]));
    return fixtures
      .filter(f => f.played && f.homeScore !== undefined && f.awayScore !== undefined)
      .filter(f => !(userTeamIds.includes(f.homeTeamId) && userTeamIds.includes(f.awayTeamId)))
      .map(f => ({
        id: f.id,
        homeAbbr: byId.get(f.homeTeamId)?.abbreviation ?? '???',
        awayAbbr: byId.get(f.awayTeamId)?.abbreviation ?? '???',
        homeScore: f.homeScore!,
        awayScore: f.awayScore!,
      }));
  }, [fixtures, teams, userTeamIds]);

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
