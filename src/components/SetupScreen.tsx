import { useState, useCallback } from 'react';
import type { Team, Strategy, Mentality, Intensity, Formation, DefensiveLine, Width } from '../engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';
import { cloneTeam } from '../utils/teamUtils';
import { FORMATIONS, MENTALITIES, INTENSITIES, DEF_LINES, WIDTHS, FORMATION_COUNTS } from '../engine/constants';
import { useH2H } from '../hooks/useH2H';
import { useLocalStorage } from '../hooks/useLocalStorage';
import TutorialOverlay from './TutorialOverlay';

interface Props {
  homeTeam: Team;
  awayTeam: Team;
  onStartMatch: (home: Team, away: Team) => void;
  onBack: () => void;
  lockAway?: boolean;
}

/** Move lesionados pro banco e promove substitutos saudaveis da mesma posicao */
function autoBenchInjured(team: Team): Team {
  const counts = FORMATION_COUNTS[team.strategy?.formation ?? '4-3-3'];
  const starterCount = 1 + counts.DEF + counts.MID + counts.FWD;
  const squad = [...team.squad];
  for (let i = 0; i < starterCount; i++) {
    const p = squad[i];
    if (!p.injuredRounds) continue;
    const replacement = squad.findIndex((q, idx) => idx >= starterCount && !q.injuredRounds && q.position === p.position);
    if (replacement < 0) continue;
    [squad[i], squad[replacement]] = [squad[replacement], squad[i]];
  }
  return { ...team, squad };
}

/** Reorganiza titulares/reservas conforme a formação */
function rebalanceSquad(team: Team, formation: Formation): Team {
  const counts = FORMATION_COUNTS[formation];
  const squad = [...team.squad];
  // Separa por posição (todos os jogadores)
  const gk = squad.filter(p => p.position === 'GK');
  const defs = squad.filter(p => p.position === 'DEF');
  const mids = squad.filter(p => p.position === 'MID');
  const fwds = squad.filter(p => p.position === 'FWD');
  // Monta titulares: 1 GK + N DEF + N MID + N FWD
  const starters = [
    ...gk.slice(0, 1),
    ...defs.slice(0, counts.DEF),
    ...mids.slice(0, counts.MID),
    ...fwds.slice(0, counts.FWD),
  ];
  const bench = [
    ...gk.slice(1),
    ...defs.slice(counts.DEF),
    ...mids.slice(counts.MID),
    ...fwds.slice(counts.FWD),
  ];
  return { ...team, squad: [...starters, ...bench], strategy: { ...team.strategy, formation } };
}

import { playerOvr } from '../utils/playerOvr';

export default function SetupScreen({ homeTeam: initialHome, awayTeam: initialAway, onStartMatch, onBack, lockAway }: Props) {
  const [homeTeam, setHomeTeam] = useState<Team>(() => {
    const t = cloneTeam(initialHome);
    if (!t.strategy) t.strategy = { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' };
    return autoBenchInjured(t);
  });
  const [awayTeam, setAwayTeam] = useState<Team>(() => {
    const t = cloneTeam(initialAway);
    if (!t.strategy) t.strategy = { formation: '4-4-2', mentality: 'counter-attack', intensity: 'medium', defensiveLine: 'normal', width: 'normal' };
    return autoBenchInjured(t);
  });

  const [homeSelected, setHomeSelected] = useState<string | null>(null);
  const [awaySelected, setAwaySelected] = useState<string | null>(null);
  const { get: getH2H } = useH2H();
  const h2h = getH2H(initialHome.id, initialAway.id);
  const [tutorialSeen] = useLocalStorage<string>('fp:tutorialSeen', '');
  const [showTutorial, setShowTutorial] = useState(!tutorialSeen);

  const updateHome = useCallback((s: Strategy) => {
    if (s.formation !== homeTeam.strategy.formation) {
      setHomeTeam(prev => rebalanceSquad(prev, s.formation));
    } else {
      setHomeTeam(prev => ({ ...prev, strategy: s }));
    }
  }, [homeTeam.strategy.formation]);
  const updateAway = useCallback((s: Strategy) => {
    if (s.formation !== awayTeam.strategy.formation) {
      setAwayTeam(prev => rebalanceSquad(prev, s.formation));
    } else {
      setAwayTeam(prev => ({ ...prev, strategy: s }));
    }
  }, [awayTeam.strategy.formation]);

  // Swap: troca um reserva (idx >= 11) com um titular (idx < 11) da mesma posição
  const swapPlayers = (team: Team, setTeam: (t: Team) => void, benchIdx: number, starterIdx: number) => {
    const squad = [...team.squad];
    [squad[benchIdx], squad[starterIdx]] = [squad[starterIdx], squad[benchIdx]];
    setTeam({ ...team, squad });
  };

  const handleSwapHome = (benchIdx: number, starterIdx: number) => {
    swapPlayers(homeTeam, setHomeTeam, benchIdx, starterIdx);
    setHomeSelected(null);
  };
  const handleSwapAway = (benchIdx: number, starterIdx: number) => {
    swapPlayers(awayTeam, setAwayTeam, benchIdx, starterIdx);
    setAwaySelected(null);
  };

  const renderSquad = (
    team: Team,
    selected: string | null,
    setSelected: (id: string | null) => void,
    handleSwap: (benchIdx: number, starterIdx: number) => void,
    locked: boolean
  ) => {
    const counts = FORMATION_COUNTS[team.strategy.formation];
    const starterCount = 1 + counts.DEF + counts.MID + counts.FWD;
    const starters = team.squad.slice(0, starterCount);
    const bench = team.squad.slice(starterCount);

    const realIdx = (playerId: string) => team.squad.findIndex(p => p.id === playerId);
    const selectedIdx = selected ? realIdx(selected) : -1;
    const selectedIsBench = selectedIdx >= starterCount;

    return (
      <div className="squad-panel">
        <div className="squad-section">
          <div className="squad-section-title">Titulares ({starterCount})</div>
          {starters.map((p, i) => {
            const isSelected = p.id === selected;
            const canSwap = selected && !locked && team.squad[selectedIdx]?.position === p.position
              && ((selectedIsBench) || (selectedIdx !== i && !selectedIsBench));
            return (
              <div
                key={p.id}
                className={`squad-row starter ${isSelected ? 'selected' : ''} ${canSwap || (!selected && !locked) ? 'clickable' : ''}`}
                onClick={() => {
                  if (locked) return;
                  if (selected) {
                    // Swap: bench→starter or starter→starter (re-select)
                    if (selectedIsBench && team.squad[selectedIdx].position === p.position) {
                      handleSwap(selectedIdx, i);
                    } else {
                      setSelected(isSelected ? null : p.id);
                    }
                  } else {
                    setSelected(p.id);
                  }
                }}
              >
                <span className="sq-num">#{p.number}</span>
                <span className="sq-name">{p.name}</span>
                {p.injuredRounds ? <span className="sq-injury">🤕 {p.injuredRounds}j</span> : null}
                <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                <span className="sq-ovr">{playerOvr(p)}</span>
              </div>
            );
          })}
        </div>
        {bench.length > 0 && (
          <div className="squad-section bench-section">
            <div className="squad-section-title">Reservas ({bench.length})</div>
            {bench.map((p) => {
              const isSelected = p.id === selected;
              const bi = realIdx(p.id);
              return (
                <div
                  key={p.id}
                  className={`squad-row bench ${isSelected ? 'selected' : ''} ${!locked ? 'clickable' : ''}`}
                  onClick={() => {
                    if (locked) return;
                    if (selected && !selectedIsBench && team.squad[selectedIdx].position === p.position) {
                      // starter→bench swap
                      handleSwap(selectedIdx, bi);
                    } else {
                      setSelected(isSelected ? null : p.id);
                    }
                  }}
                >
                  <span className="sq-num">#{p.number}</span>
                  <span className="sq-name">{p.name}</span>
                  <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                  <span className="sq-ovr">{playerOvr(p)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const countByPos = (team: Team, pos: string) => {
    const counts = FORMATION_COUNTS[team.strategy.formation];
    const starterCount = 1 + counts.DEF + counts.MID + counts.FWD;
    return team.squad.slice(0, starterCount).filter(p => p.position === pos).length;
  };

  const renderCard = (team: Team, onStrategy: (s: Strategy) => void, side: 'home' | 'away', disabled = false) => (
    <div className={`setup-team-card ${side} ${disabled ? 'locked' : ''}`} style={{ borderTopColor: team.color }}>
      <div className="setup-team-header">
        <div className="setup-team-crest">
          <img src={team.logoUrl} alt={team.name} className="crest-img" />
        </div>
        <div>
          <h2>{team.name}</h2>
          <span className="setup-team-sub">{team.strategy.formation} · {Math.round(team.squad.slice(0, 11).reduce((s, p) => s + playerOvr(p), 0) / 11)} OVR {disabled ? '🔒 CPU' : ''}</span>
        </div>
      </div>

      <div className="setup-squad-badges">
        <span className="squad-badge gk">GK {countByPos(team, 'GK')}</span>
        <span className="squad-badge def">DEF {countByPos(team, 'DEF')}</span>
        <span className="squad-badge mid">MID {countByPos(team, 'MID')}</span>
        <span className="squad-badge fwd">FWD {countByPos(team, 'FWD')}</span>
      </div>

      <div className="setup-controls">
        <div className="setup-select">
          <label>Formação</label>
          <select value={team.strategy.formation} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, formation: e.target.value as Formation })}>
            {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <label>Mentalidade</label>
          <select value={team.strategy.mentality} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, mentality: e.target.value as Mentality })}>
            {MENTALITIES.map(m => <option key={m} value={m}>{MENTALITY_LABELS[m]}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <label>Intensidade</label>
          <select value={team.strategy.intensity} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, intensity: e.target.value as Intensity })}>
            {INTENSITIES.map(i => <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <label>Linha Defensiva</label>
          <select value={team.strategy.defensiveLine} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, defensiveLine: e.target.value as DefensiveLine })}>
            {DEF_LINES.map(d => <option key={d} value={d}>{DEFENSIVE_LINE_LABELS[d]}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <label>Amplitude</label>
          <select value={team.strategy.width} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, width: e.target.value as Width })}>
            {WIDTHS.map(w => <option key={w} value={w}>{WIDTH_LABELS[w]}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="setup-screen">
      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
      <div className="setup-topbar">
        <button className="back-btn-secondary" onClick={onBack}>← Voltar</button>
        <header className="app-header" style={{ flex: 1 }}>
          <h1>FootPlan</h1>
          <p className="subtitle">Configuração Tática</p>
        </header>
        <button className="start-btn" onClick={() => onStartMatch(homeTeam, awayTeam)}>
          Iniciar Partida →
        </button>
      </div>

      {(() => {
        const moraleTeam = lockAway ? homeTeam : null; // só mostra em torneios
        const m = moraleTeam?.morale ?? 0;
        if (!moraleTeam || m === 0) return null;
        const icon = m >= 6 ? '😄' : m >= 2 ? '😊' : m <= -6 ? '😟' : m <= -2 ? '😕' : '😐';
        const color = m > 0 ? '#4ade80' : '#f87171';
        return (
          <div className="morale-strip">
            <span className="morale-label">Moral do time</span>
            <span className="morale-value" style={{ color }}>
              {icon} {m > 0 ? '+' : ''}{m}
            </span>
            <span className="morale-hint">{m > 0 ? 'Em alta' : 'Em baixa'} · afeta ataque em {Math.abs(m)}%</span>
          </div>
        );
      })()}

      {h2h && (h2h.wins + h2h.draws + h2h.losses) > 0 && (
        <details className="h2h-details">
          <summary className="h2h-strip">
            <span className="h2h-label">Histórico {initialHome.abbreviation} vs {initialAway.abbreviation}</span>
            <span className="h2h-record">
              <span className="h2h-w">{h2h.wins}V</span> · <span className="h2h-d">{h2h.draws}E</span> · <span className="h2h-l">{h2h.losses}D</span>
            </span>
            <span className="h2h-label">Gols {h2h.gf}–{h2h.ga}</span>
            {h2h.last.length > 0 && (
              <span className="h2h-form" aria-label={`Últimos resultados: ${h2h.last.map(r => r === 'W' ? 'vitória' : r === 'D' ? 'empate' : 'derrota').join(', ')}`}>
                {h2h.last.map((r, i) => <span key={i} className={`h2h-pill ${r}`} aria-hidden="true">{r}</span>)}
              </span>
            )}
          </summary>
          {h2h.log && h2h.log.length > 0 && (
            <div className="h2h-log">
              {h2h.log.map((m, i) => (
                <div key={`${m.date}-${i}`} className="h2h-log-row">
                  <span className={`h2h-pill ${m.result}`} aria-hidden="true">{m.result}</span>
                  <span className="h2h-log-date">{m.date}</span>
                  <span className="h2h-log-score" style={{ color: initialHome.color }}>{m.gf}</span>
                  <span className="h2h-log-sep">–</span>
                  <span className="h2h-log-score" style={{ color: initialAway.color }}>{m.ga}</span>
                </div>
              ))}
            </div>
          )}
        </details>
      )}

      <div className={lockAway ? 'setup-layout setup-layout-solo' : 'setup-layout'}>
        <div className="setup-left">
          {renderCard(homeTeam, updateHome, 'home')}
          {renderSquad(homeTeam, homeSelected, setHomeSelected, handleSwapHome, false)}
        </div>

        {!lockAway && (
          <>
            <div className="setup-center">
              <div className="setup-vs-col">
                <div className="setup-vs-circle">VS</div>
              </div>
            </div>
            <div className="setup-right">
              {renderCard(awayTeam, updateAway, 'away', false)}
              {renderSquad(awayTeam, awaySelected, setAwaySelected, handleSwapAway, false)}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
