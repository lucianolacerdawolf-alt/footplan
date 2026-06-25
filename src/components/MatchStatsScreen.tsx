import type { MatchResult } from '../engine/types';
import type { MatchRecord } from '../hooks/useMatchHistory';

interface Props {
  result: MatchResult;
  history: MatchRecord[];
  onPlayAgain: () => void;
  onMenu: () => void;
  onClearHistory: () => void;
}

interface StatRowProps {
  label: string;
  home: number;
  away: number;
  homeColor: string;
  awayColor: string;
  icon?: string;
}

function StatRow({ label, home, away, homeColor, awayColor, icon }: StatRowProps) {
  const total = home + away || 1;
  const homePct = (home / total) * 100;
  return (
    <div className="stat-row">
      <span className="stat-val home" style={{ color: homeColor }}>{home}</span>
      <div className="stat-mid">
        <div className="stat-bar-wrap">
          <div className="stat-bar-home" style={{ width: `${homePct}%`, background: homeColor }} />
          <div className="stat-bar-away" style={{ width: `${100 - homePct}%`, background: awayColor }} />
        </div>
        <span className="stat-label">{icon && <span className="stat-icon">{icon}</span>}{label}</span>
      </div>
      <span className="stat-val away" style={{ color: awayColor }}>{away}</span>
    </div>
  );
}

function PossessionRow({ home, away, homeColor, awayColor }: { home: number; away: number; homeColor: string; awayColor: string }) {
  return (
    <div className="stat-row">
      <span className="stat-val home" style={{ color: homeColor }}>{home}%</span>
      <div className="stat-mid">
        <div className="stat-bar-wrap">
          <div className="stat-bar-home" style={{ width: `${home}%`, background: homeColor }} />
          <div className="stat-bar-away" style={{ width: `${away}%`, background: awayColor }} />
        </div>
        <span className="stat-label">Posse de Bola</span>
      </div>
      <span className="stat-val away" style={{ color: awayColor }}>{away}%</span>
    </div>
  );
}

function ResultBadge({ homeScore, awayScore }: { homeScore: number; awayScore: number }) {
  if (homeScore > awayScore) return <span className="result-badge win">Vitória</span>;
  if (awayScore > homeScore) return <span className="result-badge loss">Derrota</span>;
  return <span className="result-badge draw">Empate</span>;
}

export default function MatchStatsScreen({ result, history, onPlayAgain, onMenu, onClearHistory }: Props) {
  const { homeTeam, awayTeam, homeScore, awayScore, homePossession, awayPossession, homeStats, awayStats } = result;

  return (
    <div className="stats-screen">
      {/* Header */}
      <div className="stats-header">
        <div className="stats-team home-team">
          <img src={homeTeam.logoUrl} alt={homeTeam.name} className="stats-crest" />
          <span className="stats-team-name" style={{ color: homeTeam.color }}>{homeTeam.abbreviation}</span>
        </div>
        <div className="stats-score-block">
          <div className="stats-score">
            <span style={{ color: homeTeam.color }}>{homeScore}</span>
            <span className="stats-score-sep">–</span>
            <span style={{ color: awayTeam.color }}>{awayScore}</span>
          </div>
          <ResultBadge homeScore={homeScore} awayScore={awayScore} />
          <span className="stats-label">Estatísticas</span>
        </div>
        <div className="stats-team away-team">
          <img src={awayTeam.logoUrl} alt={awayTeam.name} className="stats-crest" />
          <span className="stats-team-name" style={{ color: awayTeam.color }}>{awayTeam.abbreviation}</span>
        </div>
      </div>

      {/* Stats table */}
      <div className="stats-table">
        <PossessionRow home={homePossession} away={awayPossession} homeColor={homeTeam.color} awayColor={awayTeam.color} />
        <StatRow label="Chutes" home={homeStats.shots} away={awayStats.shots} homeColor={homeTeam.color} awayColor={awayTeam.color} />
        <StatRow label="No Alvo" home={homeStats.shotsOnTarget} away={awayStats.shotsOnTarget} homeColor={homeTeam.color} awayColor={awayTeam.color} icon="🎯" />
        <StatRow label="Faltas" home={homeStats.fouls} away={awayStats.fouls} homeColor={homeTeam.color} awayColor={awayTeam.color} />
        <StatRow label="Amarelos" home={homeStats.yellowCards} away={awayStats.yellowCards} homeColor={homeTeam.color} awayColor={awayTeam.color} icon="🟨" />
        {(homeStats.redCards > 0 || awayStats.redCards > 0) && (
          <StatRow label="Vermelhos" home={homeStats.redCards} away={awayStats.redCards} homeColor={homeTeam.color} awayColor={awayTeam.color} icon="🟥" />
        )}
      </div>

      {/* Actions */}
      <div className="stats-actions">
        <button className="back-btn-secondary" onClick={onMenu}>Menu</button>
        <button className="start-btn" onClick={onPlayAgain}>Jogar Novamente</button>
      </div>

      {/* Histórico */}
      {history.length > 0 && (
        <details className="history-section">
          <summary className="history-summary">
            Histórico <span className="history-count">{history.length}</span>
          </summary>
          <div className="history-list">
            {history.map(r => (
              <div key={r.id} className="history-row">
                <span className="history-date">{r.date}</span>
                <div className="history-match">
                  <img src={r.homeTeam.logoUrl} alt={r.homeTeam.abbreviation} className="history-crest" />
                  <span className="history-abbr" style={{ color: r.homeTeam.color }}>{r.homeTeam.abbreviation}</span>
                  <span className="history-score">{r.homeScore}–{r.awayScore}</span>
                  <span className="history-abbr" style={{ color: r.awayTeam.color }}>{r.awayTeam.abbreviation}</span>
                  <img src={r.awayTeam.logoUrl} alt={r.awayTeam.abbreviation} className="history-crest" />
                </div>
              </div>
            ))}
          </div>
          <button className="clear-history-btn" onClick={onClearHistory}>Limpar histórico</button>
        </details>
      )}
    </div>
  );
}
