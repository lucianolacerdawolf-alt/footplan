import type { Team } from '../engine/types';
import type { LeagueState, LeagueFixture, Standing } from '../engine/tournament';
import { computeStandings } from '../engine/tournament';
import styles from './LeagueScreen.module.css';

interface Props {
  state: LeagueState;
  onPlayMatch: (fixture: LeagueFixture, homeTeam: Team, awayTeam: Team) => void;
  onSimulateUserMatch: () => void;
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

export default function LeagueScreen({ state, onPlayMatch, onSimulateUserMatch, onSimulateRound, onNextRound, onBack }: Props) {
  const { teams, userTeamId, fixtures, currentRound, phase } = state;
  const standings = computeStandings(teams, fixtures);

  if (phase === 'done') {
    const champion = teamById(teams, standings[0].teamId);
    const userStanding = standings.find(s => s.teamId === userTeamId)!;
    const userPos = standings.findIndex(s => s.teamId === userTeamId) + 1;
    return (
      <div className={styles.screen}>
        <header className={styles.header}>
          <button className="back-btn-secondary" onClick={onBack}>← Menu Principal</button>
        </header>
        <div className={styles.champion}>
          <div className={styles.championCrown}>🏆</div>
          <img src={champion.logoUrl} alt={champion.name} className={styles.championCrest} />
          <div className={styles.championName} style={{ color: champion.color }}>{champion.name}</div>
          <div className={styles.championSub}>Campeão da Temporada</div>
        </div>
        <div className={styles.userResult}>
          Você terminou em <strong>{userPos}º lugar</strong> com {userStanding.points} pontos
        </div>
        <StandingsTable standings={standings} teams={teams} userTeamId={userTeamId} />
        <button className="start-btn" onClick={onBack}>Nova Partida</button>
      </div>
    );
  }

  const round = fixtures[currentRound];
  const userFixture = round.find(f => f.homeTeamId === userTeamId || f.awayTeamId === userTeamId)!;
  const otherFixtures = round.filter(f => f !== userFixture);
  const roundComplete = round.every(f => f.played);
  const othersComplete = otherFixtures.every(f => f.played);

  const renderScore = (f: LeagueFixture) => {
    if (!f.played) return <span className={styles.fixtureVs}>vs</span>;
    return <span className={styles.fixtureScore}>{f.homeScore} – {f.awayScore}</span>;
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <button className="back-btn-secondary" onClick={onBack}>← Menu Principal</button>
        <div className={styles.headerCenter}>
          <span className={styles.leagueTitle}>Premier League</span>
          <span className={styles.roundLabel}>Rodada {currentRound + 1} / {fixtures.length}</span>
        </div>
      </header>

      <div className={styles.body}>
        {/* Coluna esquerda — jogos */}
        <div className={styles.fixturesCol}>
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
                <div className={styles.userMatchBtns}>
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
                  <button className={styles.simOwnBtn} onClick={onSimulateUserMatch}>
                    Simular
                  </button>
                </div>
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
        </div>

        {/* Coluna direita — tabela */}
        <div className={styles.standingsCol}>
          <div className={styles.sectionLabel}>Classificação</div>
          <div className={styles.standingsScroll}>
            <StandingsTable standings={standings} teams={teams} userTeamId={userTeamId} />
          </div>
        </div>
      </div>
    </div>
  );
}
