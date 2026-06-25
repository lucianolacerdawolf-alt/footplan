import { useState } from 'react';
import type { Team } from '../engine/types';
import type { LeagueState, LeagueFixture, Standing } from '../engine/tournament';
import { computeStandings } from '../engine/tournament';
import styles from './LeagueScreen.module.css';

interface Props {
  state: LeagueState;
  onPlayMatch: (fixture: LeagueFixture, homeTeam: Team, awayTeam: Team) => void;
  onSimulateRound: (roundIndex: number) => void;
  onNextRound: () => void;
  onBack: () => void;
}

function teamById(teams: Team[], id: string): Team {
  return teams.find(t => t.id === id)!;
}

function StandingsTable({ standings, teams, userTeamId }: { standings: Standing[]; teams: Team[]; userTeamId: string }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.thPos}>#</th>
          <th className={styles.thTeam}>Time</th>
          <th>J</th><th>V</th><th>E</th><th>D</th>
          <th>GP</th><th>GC</th><th>SG</th><th className={styles.thPts}>Pts</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => {
          const team = teamById(teams, s.teamId);
          const isUser = s.teamId === userTeamId;
          return (
            <tr key={s.teamId} className={`${styles.row} ${isUser ? styles.rowUser : ''}`}>
              <td className={styles.tdPos}>{i + 1}</td>
              <td className={styles.tdTeam}>
                <img src={team.logoUrl} alt={team.abbreviation} className={styles.tableCrest} />
                <span style={{ color: team.color }}>{team.abbreviation}</span>
              </td>
              <td>{s.played}</td>
              <td>{s.won}</td>
              <td>{s.drawn}</td>
              <td>{s.lost}</td>
              <td>{s.goalsFor}</td>
              <td>{s.goalsAgainst}</td>
              <td>{s.goalsFor - s.goalsAgainst >= 0 ? '+' : ''}{s.goalsFor - s.goalsAgainst}</td>
              <td className={styles.tdPts}>{s.points}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function LeagueScreen({ state, onPlayMatch, onSimulateRound, onNextRound, onBack }: Props) {
  const [showTable, setShowTable] = useState(false);
  const { teams, userTeamId, fixtures, currentRound, phase } = state;

  if (phase === 'done') {
    const standings = computeStandings(teams, fixtures);
    const champion = teamById(teams, standings[0].teamId);
    const userStanding = standings.find(s => s.teamId === userTeamId)!;
    const userPos = standings.findIndex(s => s.teamId === userTeamId) + 1;
    return (
      <div className={styles.screen}>
        <div className={styles.champion}>
          <div className={styles.championCrown}>🏆</div>
          <img src={champion.logoUrl} alt={champion.name} className={styles.championCrest} />
          <div className={styles.championName} style={{ color: champion.color }}>{champion.name}</div>
          <div className={styles.championSub}>Campeão da Temporada</div>
        </div>
        <div className={styles.userResult}>
          Você terminou em <strong>{userPos}º lugar</strong> com {userStanding.points} pontos
        </div>
        <details className={styles.details} open>
          <summary className={styles.detailsSummary}>Classificação Final</summary>
          <StandingsTable standings={standings} teams={teams} userTeamId={userTeamId} />
        </details>
        <button className="start-btn" onClick={onBack}>Nova Partida</button>
      </div>
    );
  }

  const round = fixtures[currentRound];
  const userFixture = round.find(f => f.homeTeamId === userTeamId || f.awayTeamId === userTeamId)!;
  const otherFixtures = round.filter(f => f !== userFixture);
  const roundComplete = round.every(f => f.played);
  const othersComplete = otherFixtures.every(f => f.played);
  const standings = computeStandings(teams, fixtures);

  const renderScore = (f: LeagueFixture) => {
    if (!f.played) return <span className={styles.fixtureVs}>vs</span>;
    return <span className={styles.fixtureScore}>{f.homeScore} – {f.awayScore}</span>;
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className="back-btn-secondary" onClick={onBack}>← Sair</button>
        <div className={styles.headerCenter}>
          <span className={styles.leagueTitle}>Premier League</span>
          <span className={styles.roundLabel}>Rodada {currentRound + 1} / {fixtures.length}</span>
        </div>
      </header>

      {/* Jogo do usuário */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Seu Jogo</div>
        <div className={`${styles.fixture} ${styles.fixtureUser}`}>
          <div className={styles.fixtureTeam}>
            <img src={teamById(teams, userFixture.homeTeamId).logoUrl} className={styles.fixtureCrest} alt="" />
            <span style={{ color: teamById(teams, userFixture.homeTeamId).color }}>
              {teamById(teams, userFixture.homeTeamId).abbreviation}
            </span>
          </div>
          {renderScore(userFixture)}
          <div className={`${styles.fixtureTeam} ${styles.fixtureTeamAway}`}>
            <span style={{ color: teamById(teams, userFixture.awayTeamId).color }}>
              {teamById(teams, userFixture.awayTeamId).abbreviation}
            </span>
            <img src={teamById(teams, userFixture.awayTeamId).logoUrl} className={styles.fixtureCrest} alt="" />
          </div>
          {!userFixture.played && (
            <button
              className={styles.playBtn}
              onClick={() => onPlayMatch(
                userFixture,
                teamById(teams, userFixture.homeTeamId),
                teamById(teams, userFixture.awayTeamId)
              )}
            >
              Jogar
            </button>
          )}
        </div>
      </div>

      {/* Outros jogos */}
      <div className={styles.section}>
        <div className={styles.sectionLabelRow}>
          <span className={styles.sectionLabel}>Outros Jogos</span>
          {!othersComplete && (
            <button className={styles.simAllBtn} onClick={() => onSimulateRound(currentRound)}>
              Simular Todos
            </button>
          )}
        </div>
        {otherFixtures.map(f => (
          <div key={f.id} className={styles.fixture}>
            <div className={styles.fixtureTeam}>
              <img src={teamById(teams, f.homeTeamId).logoUrl} className={styles.fixtureCrest} alt="" />
              <span style={{ color: teamById(teams, f.homeTeamId).color }}>
                {teamById(teams, f.homeTeamId).abbreviation}
              </span>
            </div>
            {renderScore(f)}
            <div className={`${styles.fixtureTeam} ${styles.fixtureTeamAway}`}>
              <span style={{ color: teamById(teams, f.awayTeamId).color }}>
                {teamById(teams, f.awayTeamId).abbreviation}
              </span>
              <img src={teamById(teams, f.awayTeamId).logoUrl} className={styles.fixtureCrest} alt="" />
            </div>
          </div>
        ))}
      </div>

      {roundComplete && (
        <button className="start-btn" onClick={onNextRound}>
          {currentRound + 1 < fixtures.length ? `Rodada ${currentRound + 2} →` : 'Ver Classificação Final →'}
        </button>
      )}

      {/* Tabela */}
      <details className={styles.details} open={showTable} onToggle={e => setShowTable((e.target as HTMLDetailsElement).open)}>
        <summary className={styles.detailsSummary}>
          Classificação {standings.length > 0 && <span className={styles.userPos}>
            {(() => { const pos = standings.findIndex(s => s.teamId === userTeamId) + 1; const team = teamById(teams, userTeamId); return <span style={{ color: team.color }}>{team.abbreviation} {pos}º</span>; })()}
          </span>}
        </summary>
        <StandingsTable standings={standings} teams={teams} userTeamId={userTeamId} />
      </details>
    </div>
  );
}
