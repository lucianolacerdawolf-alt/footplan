import { useState, useCallback } from 'react';
import type { Team, Strategy, Mentality, Intensity, Formation, DefensiveLine, Width } from '../engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';
import { cloneTeam } from '../utils/teamUtils';
import { FORMATIONS, MENTALITIES, INTENSITIES, DEF_LINES, WIDTHS, FORMATION_COUNTS } from '../engine/constants';
import { isPlayerUnavailable, rebalanceForFormation, getStarterCount } from '../engine/squadUtils';
import { FORMATION_BONUS, getTacticalHardCounter } from '../engine/matchConfig';
import TacticLabel from './TacticLabel';
import TacticPresets from './shared/TacticPresets';
import { useH2H } from '../hooks/useH2H';
import { useLocalStorage } from '../hooks/useLocalStorage';
import TutorialOverlay from './TutorialOverlay';
import OpponentAnalysisModal from './OpponentAnalysisModal';

function getTacticalInsight(home: Team, away: Team): string {
  const hf = home.strategy.formation;
  const af = away.strategy.formation;
  const hm = home.strategy.mentality;
  const hdl = home.strategy.defensiveLine;
  const hb = FORMATION_BONUS[hf];
  const ab = FORMATION_BONUS[af];

  const insights: string[] = [];

  if (hb.atk > 1.05) insights.push(`🔺 ${hf} é ofensivo`);
  if (hb.def > 1.05) insights.push(`🔻 ${hf} é defensivo`);
  if (hm === 'high-press') insights.push(`⚡ Pressão alta — muita intensidade`);
  if (hm === 'counter-attack') insights.push(`🏃 Contra-ataque — velocidade nas costas`);
  if (hm === 'defensive') insights.push(`🛡️ Retranca — difícil de furar`);
  if (home.strategy.defensiveLine === 'high') insights.push(`⚠️ Linha alta — risco de bola nas costas`);
  if (home.strategy.defensiveLine === 'low') insights.push(`🧱 Linha baixa — compacto atrás`);

  // Hard counter analysis — reveals the engine's actual tactical counter system
  const counter = getTacticalHardCounter(hm, hdl, away.strategy.mentality, away.strategy.defensiveLine);
  if (counter.atkBonus > 1) {
    const desc = hm === 'counter-attack'
      ? `💪 Contra-ataque explode linha alta adversária (+${Math.round((counter.atkBonus - 1) * 100)}% ataque)`
      : `💪 Sua tática tem vantagem sobre a defesa adversária (+${Math.round((counter.atkBonus - 1) * 100)}% ataque)`;
    insights.push(desc);
  } else if (counter.defBonus > 1) {
    insights.push(`🛡️ Retranca neutraliza ataque adversário (+${Math.round((counter.defBonus - 1) * 100)}% defesa)`);
  }

  // Opponent matchup
  if (hb.atk > 1 && ab.def < 1) insights.push(`✅ Seu ataque enfrenta defesa frágil`);
  if (hb.def > 1 && ab.atk > 1) insights.push(`⚠️ Defesa sólida contra ataque forte`);
  if (af === '5-3-2') insights.push(`ℹ️ ${away.name} usa 5 defensores`);
  if (af === '4-2-3-1' && hf !== '4-2-3-1') insights.push(`ℹ️ ${away.name} tem meio-campo criativo`);

  if (insights.length === 0) return `Confronto equilibrado. Sua tática será testada.`;
  return insights.slice(0, 3).join(' · ');
}

interface Props {
  homeTeam: Team;
  awayTeam: Team;
  onStartMatch: (home: Team, away: Team) => void;
  onBack: () => void;
  lockAway?: boolean;
  /** Em modo solo (lockAway), qual lado é o time do usuário — decide qual card aparece
   *  editável na tela. Sem isso, a tela sempre mostrava/editava o time "home" mesmo
   *  quando o usuário era o visitante da partida (bug real, reportado em Modo Carreira).
   *  Default true preserva o comportamento antigo pros modos sem esse conceito. */
  userIsHome?: boolean;
  isTacticsOnly?: boolean;
  mode?: 'single' | 'league' | 'cup' | 'career' | 'online';
  goesToPreview?: boolean;
}

/** Move lesionados/suspensos pro banco e promove substitutos disponíveis da mesma posicao */
function autoBenchUnavailable(team: Team): Team {
  const counts = FORMATION_COUNTS[team.strategy?.formation ?? '4-3-3'];
  const starterCount = 1 + counts.DEF + counts.MID + counts.FWD;
  const squad = [...team.squad];
  for (let i = 0; i < starterCount; i++) {
    const p = squad[i];
    if (!isPlayerUnavailable(p)) continue;
    const replacement = squad.findIndex((q, idx) => idx >= starterCount && !isPlayerUnavailable(q) && q.position === p.position);
    if (replacement < 0) continue;
    [squad[i], squad[replacement]] = [squad[replacement], squad[i]];
  }
  return { ...team, squad };
}

import { playerOvr } from '../utils/playerOvr';
import { fireClick } from '../utils/fireClick';

export default function SetupScreen({ homeTeam: initialHome, awayTeam: initialAway, onStartMatch, onBack, lockAway, userIsHome = true, isTacticsOnly, mode, goesToPreview }: Props) {
  const [homeTeam, setHomeTeam] = useState<Team>(() => {
    const t = cloneTeam(initialHome);
    if (!t.strategy) t.strategy = { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' };
    return autoBenchUnavailable(t);
  });
  const [awayTeam, setAwayTeam] = useState<Team>(() => {
    const t = cloneTeam(initialAway);
    if (!t.strategy) t.strategy = { formation: '4-4-2', mentality: 'counter-attack', intensity: 'medium', defensiveLine: 'normal', width: 'normal' };
    return autoBenchUnavailable(t);
  });

  const [homeSelected, setHomeSelected] = useState<string | null>(null);
  const [awaySelected, setAwaySelected] = useState<string | null>(null);
  const { get: getH2H } = useH2H();
  const [showOpponentAnalysis, setShowOpponentAnalysis] = useState(false);
  const h2h = getH2H(initialHome.id, initialAway.id);
  const [tutorialSeen] = useLocalStorage<string>('fp:tutorialSeen', '');
  const [showTutorial, setShowTutorial] = useState(!tutorialSeen);
  const [setupTab, setSetupTab] = useState<'tactics' | 'squad'>('tactics');

  // Em modo solo (lockAway), o time do usuário pode ser home OU away — o calendário do
  // torneio/carreira decide quem manda em cada rodada, não é sempre "home". Centraliza
  // aqui pra não duplicar essa checagem em cada lugar que precisa saber "qual é o meu".
  const mySide: 'home' | 'away' = lockAway && !userIsHome ? 'away' : 'home';
  const myTeam = mySide === 'away' ? awayTeam : homeTeam;
  const theirTeam = mySide === 'away' ? homeTeam : awayTeam;

  const updateHome = useCallback((s: Strategy) => {
    if (s.formation !== homeTeam.strategy.formation) {
      setHomeTeam(prev => rebalanceForFormation(prev, s.formation));
    } else {
      setHomeTeam(prev => ({ ...prev, strategy: s }));
    }
  }, [homeTeam.strategy.formation]);
  const updateAway = useCallback((s: Strategy) => {
    if (s.formation !== awayTeam.strategy.formation) {
      setAwayTeam(prev => rebalanceForFormation(prev, s.formation));
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
                role="button"
                tabIndex={0}
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
                onKeyDown={e => fireClick(e)}
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
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (locked) return;
                    if (selected && !selectedIsBench && team.squad[selectedIdx].position === p.position) {
                      // starter→bench swap
                      handleSwap(selectedIdx, bi);
                    } else {
                      setSelected(isSelected ? null : p.id);
                    }
                  }}
                  onKeyDown={e => fireClick(e)}
                >
                  <span className="sq-num">#{p.number}</span>
                  <span className="sq-name">{p.name}</span>
                  {p.injuredRounds ? <span className="sq-injury">🤕 {p.injuredRounds}j</span> : null}
                  {p.isSuspended ? <span className="sq-injury">🚫 {p.suspendedRounds ?? 1}j</span> : null}
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
    const starterCount = getStarterCount(team.strategy.formation);
    return team.squad.slice(0, starterCount).filter(p => p.position === pos).length;
  };

  const avgOvr = (team: Team) => {
    const starters = team.squad.slice(0, getStarterCount(team.strategy.formation));
    return Math.round(starters.reduce((s, p) => s + playerOvr(p), 0) / starters.length);
  };

  const renderCard = (team: Team, onStrategy: (s: Strategy) => void, side: 'home' | 'away', disabled = false) => (
    <div className={`setup-team-card ${side} ${disabled ? 'locked' : ''}`} style={{ borderTopColor: team.color }}>
      <div className="setup-team-header">
        <div className="setup-team-crest">
          <img src={team.logoUrl} alt={team.name} className="crest-img" />
        </div>
        <div style={{ flex: 1 }}>
          <h2>{team.name}</h2>
          <span className="setup-team-sub">{team.strategy.formation} · {avgOvr(team)} OVR {disabled ? '🔒 CPU' : ''}</span>
        </div>
      </div>

      <div className="setup-squad-badges">
        <span className="squad-badge gk">GK {countByPos(team, 'GK')}</span>
        <span className="squad-badge def">DEF {countByPos(team, 'DEF')}</span>
        <span className="squad-badge mid">MID {countByPos(team, 'MID')}</span>
        <span className="squad-badge fwd">FWD {countByPos(team, 'FWD')}</span>
      </div>

      <div className="setup-presets">
        <label>Táticas Predefinidas</label>
        <TacticPresets onApply={onStrategy} currentStrategy={team.strategy} />
      </div>

      <div className="setup-controls">
        <div className="setup-select">
          <TacticLabel tacticKey="formation" />
          <select value={team.strategy.formation} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, formation: e.target.value as Formation })}>
            {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <TacticLabel tacticKey="mentality" />
          <select value={team.strategy.mentality} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, mentality: e.target.value as Mentality })}>
            {MENTALITIES.map(m => <option key={m} value={m}>{MENTALITY_LABELS[m]}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <TacticLabel tacticKey="intensity" />
          <select value={team.strategy.intensity} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, intensity: e.target.value as Intensity })}>
            {INTENSITIES.map(i => <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <TacticLabel tacticKey="defensiveLine" />
          <select value={team.strategy.defensiveLine} disabled={disabled} onChange={e => onStrategy({ ...team.strategy, defensiveLine: e.target.value as DefensiveLine })}>
            {DEF_LINES.map(d => <option key={d} value={d}>{DEFENSIVE_LINE_LABELS[d]}</option>)}
          </select>
        </div>
        <div className="setup-select">
          <TacticLabel tacticKey="width" />
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
          <p className="subtitle">
            {mode === 'league' ? 'Campeonato' : mode === 'cup' ? 'Mata-mata' : mode === 'career' ? 'Modo Carreira' : mode === 'online' ? 'Online' : 'Configuração Tática'}
          </p>
        </header>
        <button className="start-btn" onClick={() => onStartMatch(homeTeam, awayTeam)}>
          {isTacticsOnly ? 'Confirmar Táticas ✓' : goesToPreview ? 'Confirmar e Continuar →' : 'Iniciar Partida →'}
        </button>
      </div>

      {(() => {
        const moraleTeam = lockAway ? myTeam : null; // só mostra em torneios, do lado do usuário
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

      {/* ── Tactical Matchup Insight ── */}
      <div className="morale-strip" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', justifyContent: 'space-between' }}>
        <span className="morale-label" style={{ color: 'var(--accent)' }}>📋 Análise Tática</span>
        <span className="morale-value" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-h)', flex: 1, textAlign: 'center' }}>
          {getTacticalInsight(lockAway ? myTeam : homeTeam, lockAway ? theirTeam : awayTeam)}
        </span>
        <button
          className="back-btn-secondary"
          style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' }}
          onClick={() => setShowOpponentAnalysis(true)}
        >
          🔍 Analisar Oponente
        </button>
      </div>

      <div className="ht-tabs" style={{ margin: '8px 0', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
        <button
          className={`ht-tab ${setupTab === 'tactics' ? 'active' : ''}`}
          onClick={() => setSetupTab('tactics')}
        >
          Táticas
        </button>
        <button
          className={`ht-tab ${setupTab === 'squad' ? 'active' : ''}`}
          onClick={() => setSetupTab('squad')}
        >
          Gerenciar Elenco
        </button>
      </div>

      <div className={lockAway ? 'setup-layout setup-layout-solo' : 'setup-layout'}>
        <div className="setup-left">
          {(() => {
            const updateFn = mySide === 'away' ? updateAway : updateHome;
            const selected = mySide === 'away' ? awaySelected : homeSelected;
            const setSelected = mySide === 'away' ? setAwaySelected : setHomeSelected;
            const swapFn = mySide === 'away' ? handleSwapAway : handleSwapHome;
            return setupTab === 'tactics'
              ? renderCard(myTeam, updateFn, mySide)
              : renderSquad(myTeam, selected, setSelected, swapFn, false);
          })()}
        </div>

        {!lockAway && (
          <>
            <div className="setup-center">
              <div className="setup-vs-col">
                <div className="setup-vs-circle">VS</div>
              </div>
            </div>
            <div className="setup-right">
              {setupTab === 'tactics'
                ? renderCard(awayTeam, updateAway, 'away', false)
                : renderSquad(awayTeam, awaySelected, setAwaySelected, handleSwapAway, false)
              }
            </div>
          </>
        )}
      </div>

      {showOpponentAnalysis && (
        <OpponentAnalysisModal
          opponent={lockAway ? theirTeam : awayTeam}
          userTeam={lockAway ? myTeam : homeTeam}
          h2h={getH2H(myTeam.id, (lockAway ? theirTeam : awayTeam).id)}
          onClose={() => setShowOpponentAnalysis(false)}
        />
      )}
    </div>
  );
}
