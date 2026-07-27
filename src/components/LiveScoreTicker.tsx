import { useMemo } from 'react';
import type { Team } from '../engine/types';
import type { LeagueFixture } from '../engine/tournament';
import { simularFixtureAuto } from '../engine/tournament';
import styles from './LiveScoreTicker.module.css';

interface Props {
  fixtures: LeagueFixture[];
  teams: Team[];
  userFixtureId: string;
}

export default function LiveScoreTicker({ fixtures, teams, userFixtureId }: Props) {
  const scores = useMemo(() =>
    fixtures
      .filter(f => f.id !== userFixtureId)
      .map(f => {
        const simulated = simularFixtureAuto(f, teams);
        const home = teams.find(t => t.id === f.homeTeamId);
        const away = teams.find(t => t.id === f.awayTeamId);
        return {
          homeAbbr: home?.abbreviation ?? '???',
          awayAbbr: away?.abbreviation ?? '???',
          homeScore: simulated.homeScore,
          awayScore: simulated.awayScore,
          id: f.id,
        };
      }),
    [fixtures, teams, userFixtureId]
  );

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
