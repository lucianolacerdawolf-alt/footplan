import { useState, useMemo } from 'react';
import type { Team } from '../engine/types';
import type { LeagueState, LeagueFixture } from '../engine/tournament';
import type { LeagueDefinition } from '../data/leagues/types';
import { computeStandings } from '../engine/tournament';
import { FORMATION_COUNTS } from '../engine/constants';
import { StandingsTable } from './LeagueTableScreen';
import styles from './LeagueScreen.module.css';

function squadHealth(team: Team) {
  const counts = FORMATION_COUNTS[team.strategy.formation];
  const starterCount = 1 + counts.DEF + counts.MID + counts.FWD;
  const starters = team.squad.slice(0, starterCount);
  const tired = starters.filter(p => p.currentFatigue > 70).length;
  const injured = team.squad.filter(p => p.injuredRounds && p.injuredRounds > 0).length;
  return { tired, injured };
}

interface Props {
  state: LeagueState;
  league: LeagueDefinition;
  onPlayMatch: (fixture: LeagueFixture, homeTeam: Team, awayTeam: Team) => void;
  onSimulateUserMatch: () => void;
  onSimulateRound: (roundIndex: number) => void;
  onNextRound: () => void;
  onEditTactics: () => void;
  onViewTable: () => void;
  onBack: () => void;
  /** Só usado no Modo Carreira: motivo pra bloquear "Avançar Rodada" (ex: mensagem obrigatória não lida) */
  blockAdvanceReason?: string;
  /** Só passado no Modo Carreira — abre a copa nacional correspondente (aba "Escritório"). */
  onViewCup?: () => void;
}

function teamById(teams: Team[], id: string): Team {
  return teams.find(t => t.id === id)!;
}

export default function LeagueScreen({ state, league, onPlayMatch, onSimulateUserMatch, onSimulateRound, onNextRound, onEditTactics, onViewTable, onBack, blockAdvanceReason, onViewCup }: Props) {
  const { teams, userTeamId, fixtures, currentRound, phase } = state;
  const [simulating, setSimulating] = useState(false);
  const runSim = (fn: () => void) => {
    setSimulating(true);
    setTimeout(() => { fn(); setSimulating(false); }, 200);
  };

  if (phase === 'done') {
    const standings = computeStandings(teams, fixtures);
    const champion = teamById(teams, standings[0].teamId);
    const userStanding = standings.find(s => s.teamId === userTeamId)!;
    const userPos = standings.findIndex(s => s.teamId === userTeamId) + 1;
    return (
      <div className={`${styles.screen} app-screen`}>
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
        <StandingsTable standings={standings} teams={teams} userTeamId={userTeamId} league={league} />
        <button className="start-btn" onClick={onBack}>Nova Partida</button>
      </div>
    );
  }

  const round = fixtures[currentRound];
  const userFixture = round.find(f => f.homeTeamId === userTeamId || f.awayTeamId === userTeamId)!;
  const otherFixtures = round.filter(f => f !== userFixture);
  const roundComplete = round.every(f => f.played);
  const othersComplete = otherFixtures.every(f => f.played);

  const seasonStats = useMemo(() => {
    let totalGoals = 0, playedCount = 0, homeWins = 0, draws = 0;
    let userGF = 0, userGA = 0, userClean = 0;
    for (const round of fixtures) {
      for (const f of round) {
        if (!f.played || f.homeScore == null || f.awayScore == null) continue;
        totalGoals += f.homeScore + f.awayScore;
        playedCount++;
        if (f.homeScore > f.awayScore) homeWins++;
        else if (f.homeScore === f.awayScore) draws++;
        if (f.homeTeamId === userTeamId) { userGF += f.homeScore; userGA += f.awayScore; if (f.awayScore === 0) userClean++; }
        else if (f.awayTeamId === userTeamId) { userGF += f.awayScore; userGA += f.homeScore; if (f.homeScore === 0) userClean++; }
      }
    }
    if (playedCount === 0) return null;
    return (
      <div className={styles.statsStrip}>
        <span className={styles.statItem}>⚽ Gols: <b>{totalGoals}</b></span>
        <span className={styles.statItem}>📊 Média: <b>{(totalGoals / playedCount).toFixed(2)}</b></span>
        <span className={styles.statItem}>🏟️ Casa: <b>{(homeWins / playedCount * 100).toFixed(0)}%</b></span>
        <span className={styles.statItem}>🤝 Empate: <b>{(draws / playedCount * 100).toFixed(0)}%</b></span>
        <span className={styles.statItem}>🔢 Seu time: <b>{userGF} GP · {userGA} GC {userGF - userGA >= 0 ? '+' : ''}{userGF - userGA}</b></span>
        <span className={styles.statItem}>🧤 Clean sheets: <b>{userClean}</b></span>
      </div>
    );
  }, [fixtures, userTeamId]);

  const renderScore = (f: LeagueFixture) => {
    if (!f.played) return <span className={styles.fixtureVs}>vs</span>;
    return <span className={styles.fixtureScore}>{f.homeScore} – {f.awayScore}</span>;
  };

  return (
    <div className={`${styles.screen} app-screen`}>
      <header className={styles.header}>
        <button className="back-btn-secondary" onClick={onEditTactics}>← Editar Táticas</button>
        <div className={styles.headerCenter}>
          <span className={styles.leagueTitle}>{league.name}</span>
          <span className={styles.roundLabel}>Rodada {currentRound + 1} / {fixtures.length}</span>
          {(() => {
            const user = teams.find(t => t.id === userTeamId);
            if (!user) return null;
            const h = squadHealth(user);
            if (h.tired === 0 && h.injured === 0) return null;
            return (
              <span className={styles.healthBadges}>
                {h.tired > 0 && <span className={styles.healthTired}>⚠ {h.tired} cansado{h.tired > 1 ? 's' : ''}</span>}
                {h.injured > 0 && <span className={styles.healthInjured}>🤕 {h.injured} lesionado{h.injured > 1 ? 's' : ''}</span>}
              </span>
            );
          })()}
        </div>
        <button className="back-btn-secondary" onClick={onBack}>Menu Principal →</button>
      </header>

      {seasonStats}

      <div className={styles.viewTableRow}>
        <button className={styles.viewTableLink} onClick={onViewTable}>📊 Ver Classificação →</button>
        {onViewCup && (
          <button className={styles.viewTableLink} onClick={onViewCup}>🏆 Ver Copa →</button>
        )}
      </div>

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
                <button className={styles.simOwnBtn} onClick={() => runSim(onSimulateUserMatch)} disabled={simulating}>
                  {simulating ? 'Simulando…' : 'Simular'}
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
              <button className={styles.simAllBtn} onClick={() => runSim(() => onSimulateRound(currentRound))} disabled={simulating}>
                {simulating ? 'Simulando…' : 'Simular Todos'}
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
          <>
            <button
              className="start-btn"
              onClick={onNextRound}
              disabled={!!blockAdvanceReason}
              title={blockAdvanceReason}
            >
              {currentRound + 1 < fixtures.length ? `Rodada ${currentRound + 2} →` : 'Ver Classificação Final →'}
            </button>
            {blockAdvanceReason && <div className={styles.blockNotice}>🔔 {blockAdvanceReason}</div>}
          </>
        )}
      </div>
    </div>
  );
}
