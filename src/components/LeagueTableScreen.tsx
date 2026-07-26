import type { Team } from '../engine/types';
import type { LeagueState, Standing } from '../engine/tournament';
import type { LeagueDefinition } from '../data/leagues/types';
import { computeStandings } from '../engine/tournament';
import styles from './LeagueTableScreen.module.css';

function teamById(teams: Team[], id: string): Team {
  return teams.find(t => t.id === id)!;
}

function getZoneColor(pos: number, league: LeagueDefinition): string {
  const clEnd = league.europeanSlots.championsLeague;
  const elEnd = clEnd + league.europeanSlots.europaLeague;
  const ecolEnd = elEnd + league.europeanSlots.conferenceLeague;
  const relStart = league.teams.length - league.relegationSpots + 1;
  if (pos <= clEnd) return '#1d9bf0';
  if (pos <= elEnd) return '#e85d04';
  if (pos <= ecolEnd) return '#38a169';
  if (pos >= relStart) return '#e53e3e';
  return 'transparent';
}

export function StandingsTable({ standings, teams, userTeamId, league }: { standings: Standing[]; teams: Team[]; userTeamId: string; league: LeagueDefinition }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.thZone} />
          <th className={styles.thPos}>#</th>
          <th className={styles.thTeam}>Clube</th>
          <th className={styles.thPts}>Pts</th>
          <th>J</th><th>V</th><th>E</th><th>D</th>
          <th>GP</th><th>GC</th><th className={styles.thSg}>SG</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => {
          const pos = i + 1;
          const team = teamById(teams, s.teamId);
          const isUser = s.teamId === userTeamId;
          const sg = s.goalsFor - s.goalsAgainst;
          return (
            <tr key={s.teamId} className={`${styles.row} ${isUser ? styles.rowUser : ''}`}>
              <td className={styles.tdZone} style={{ background: getZoneColor(pos, league) }} />
              <td className={styles.tdPos}>{pos}</td>
              <td className={styles.tdTeam}>
                <img src={team.logoUrl} alt={team.abbreviation} className={styles.tableCrest} />
                <span className={styles.teamName}>{team.name}</span>
              </td>
              <td className={styles.tdPts}>{s.points}</td>
              <td>{s.played}</td>
              <td>{s.won}</td>
              <td>{s.drawn}</td>
              <td>{s.lost}</td>
              <td>{s.goalsFor}</td>
              <td>{s.goalsAgainst}</td>
              <td className={sg >= 0 ? styles.sgPos : styles.sgNeg}>{sg > 0 ? '+' : ''}{sg}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface Props {
  state: LeagueState;
  league: LeagueDefinition;
  onBack: () => void;
  /** Só true no Modo Carreira — a barra de abas fixa já cobre essa navegação (aba Escritório). */
  hideTopNav?: boolean;
}

export default function LeagueTableScreen({ state, league, onBack, hideTopNav }: Props) {
  const { teams, userTeamId, fixtures } = state;
  const standings: Standing[] = computeStandings(teams, fixtures);

  return (
    <div className={`${styles.screen} app-screen`}>
      <header className={styles.header}>
        {!hideTopNav && (
          <button className="back-btn-secondary" onClick={onBack}>← Voltar</button>
        )}
        <div className={styles.headerCenter}>
          <span className={styles.leagueTitle}>{league.name}</span>
          <span className={styles.roundLabel}>Classificação</span>
        </div>
      </header>

      <div className={styles.standingsScroll}>
        <StandingsTable standings={standings} teams={teams} userTeamId={userTeamId} league={league} />
      </div>

      <div className={styles.zoneLegend}>
        <span className={styles.zoneDot} style={{ background: '#1d9bf0' }} />Champions League
        <span className={styles.zoneDot} style={{ background: '#e85d04' }} />Europa League
        <span className={styles.zoneDot} style={{ background: '#38a169' }} />Conference League
        <span className={styles.zoneDot} style={{ background: '#e53e3e' }} />Rebaixamento
      </div>
    </div>
  );
}
