import { memo, useMemo, useState } from 'react';
import type { Team } from '../engine/types';
import type { LeagueState, Standing, LeagueFixture } from '../engine/tournament';
import type { LeagueDefinition } from '../data/leagues/types';
import { computeStandings } from '../engine/tournament';
import TopScorersTable from './TopScorersTable';
import styles from './LeagueTableScreen.module.css';
import { crestSrc } from '../utils/crest';
import { ScreenHeader } from './ui';

function getRecentForm(teamId: string, fixtures: LeagueFixture[][]): ('W' | 'D' | 'L')[] {
  const results: ('W' | 'D' | 'L')[] = [];
  for (let r = fixtures.length - 1; r >= 0 && results.length < 5; r--) {
    const round = fixtures[r];
    for (const f of round) {
      if (!f.played || f.homeScore == null || f.awayScore == null) continue;
      if (f.homeTeamId === teamId) {
        results.unshift(f.homeScore > f.awayScore ? 'W' : f.homeScore === f.awayScore ? 'D' : 'L');
        break;
      }
      if (f.awayTeamId === teamId) {
        results.unshift(f.awayScore > f.homeScore ? 'W' : f.awayScore === f.homeScore ? 'D' : 'L');
        break;
      }
    }
  }
  return results;
}

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

export function StandingsTable({ standings, teams, userTeamId, league, fixtures }: { standings: Standing[]; teams: Team[]; userTeamId: string; league: LeagueDefinition; fixtures?: LeagueFixture[][] }) {
  const showForm = !!fixtures;
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.thZone} />
          <th className={styles.thPos}>#</th>
          <th className={styles.thTeam}>Clube</th>
          <th className={styles.thPts}>Pts</th>
          <th>J</th><th className={styles.colExtra}>V</th><th className={styles.colExtra}>E</th><th className={styles.colExtra}>D</th>
          <th className={styles.colExtra}>GP</th><th className={styles.colExtra}>GC</th><th className={styles.thSg}>SG</th>
          {showForm && <th className={`${styles.thForm} ${styles.colExtra}`}>Forma</th>}
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => {
          const pos = i + 1;
          const team = teamById(teams, s.teamId);
          const isUser = s.teamId === userTeamId;
          const sg = s.goalsFor - s.goalsAgainst;
          const form = fixtures ? getRecentForm(s.teamId, fixtures) : null;
          return (
            <tr key={s.teamId} className={`${styles.row} ${isUser ? styles.rowUser : ''}`}>
              <td className={styles.tdZone} style={{ background: getZoneColor(pos, league) }} />
              <td className={styles.tdPos}>{pos}</td>
              <td className={styles.tdTeam}>
                <img src={crestSrc(team.logoUrl)} alt={team.abbreviation} className={styles.tableCrest} />
                <span className={styles.teamName}>{team.name}</span>
              </td>
              <td className={styles.tdPts}>{s.points}</td>
              <td>{s.played}</td>
              <td className={styles.colExtra}>{s.won}</td>
              <td className={styles.colExtra}>{s.drawn}</td>
              <td className={styles.colExtra}>{s.lost}</td>
              <td className={styles.colExtra}>{s.goalsFor}</td>
              <td className={styles.colExtra}>{s.goalsAgainst}</td>
              <td className={sg >= 0 ? styles.sgPos : styles.sgNeg}>{sg > 0 ? '+' : ''}{sg}</td>
              {showForm && form && (
                <td className={`${styles.tdForm} ${styles.colExtra}`}>
                  {form.map((r, idx) => (
                    <span key={idx} className={`${styles.formDot} ${r === 'W' ? styles.formWin : r === 'D' ? styles.formDraw : styles.formLoss}`}>
                      {r === 'W' ? 'V' : r === 'D' ? 'E' : 'D'}
                    </span>
                  ))}
                </td>
              )}
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
  /** Mantido por compatibilidade: a Classificação é subtela e sempre mostra o Voltar. */
  hideTopNav?: boolean;
}

function LeagueTableScreen({ state, league, onBack }: Props) {
  const { teams, userTeamId, fixtures } = state;
  const standings: Standing[] = computeStandings(teams, fixtures);
  const [view, setView] = useState<'table' | 'scorers'>('table');
  const scorers = useMemo(() => {
    const map = new Map<string, { name: string; goals: number; team: string }>();
    for (const round of fixtures) {
      for (const f of round) {
        if (!f.scorers) continue;
        for (const s of f.scorers) {
          const existing = map.get(s.playerName);
          if (existing) { existing.goals += s.goals; }
          else {
            const team = teams.find(t => t.id === s.teamId);
            map.set(s.playerName, { name: s.playerName, goals: s.goals, team: team?.abbreviation ?? '???' });
          }
        }
      }
    }
    return [...map.values()].sort((a, b) => b.goals - a.goals).slice(0, 15);
  }, [fixtures, teams]);

  return (
    <div className={`${styles.screen} app-screen fit-screen`}>
      <ScreenHeader onBack={onBack} kicker={league.name} title="Classificação" />

      <div className={styles.viewTabs} role="tablist">
        <button role="tab" aria-selected={view === 'table'} className={`${styles.viewTab} ${view === 'table' ? styles.viewTabOn : ''}`} onClick={() => setView('table')}>Tabela</button>
        <button role="tab" aria-selected={view === 'scorers'} className={`${styles.viewTab} ${view === 'scorers' ? styles.viewTabOn : ''}`} onClick={() => setView('scorers')}>Artilheiros</button>
      </div>

      {view === 'table' ? (
        <>
          <div className={`${styles.standingsScroll} fit-scroll`}>
            <StandingsTable standings={standings} teams={teams} userTeamId={userTeamId} league={league} fixtures={fixtures} />
          </div>
          <div className={styles.zoneLegend}>
            <span className={styles.zoneDot} style={{ background: '#1d9bf0' }} />Champions
            <span className={styles.zoneDot} style={{ background: '#e85d04' }} />Europa
            <span className={styles.zoneDot} style={{ background: '#38a169' }} />Conference
            <span className={styles.zoneDot} style={{ background: '#e53e3e' }} />Rebaixamento
          </div>
        </>
      ) : (
        <div className="fit-scroll">
          <TopScorersTable scorers={scorers} />
        </div>
      )}
    </div>
  );
}

export default memo(LeagueTableScreen);
