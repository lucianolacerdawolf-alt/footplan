import { useState, useEffect } from 'react';
import type { Team } from '../engine/types';
import type { LeagueDefinition } from '../data/leagues/types';
import { cloneTeam, getAvgOvr } from '../utils/teamUtils';
import { useLiveRoster } from '../hooks/useLiveRoster';

export type TournamentMode = 'league' | 'bracket' | 'career';

interface Props {
  mode: TournamentMode;
  league: LeagueDefinition;
  onBack: () => void;
  onGoHome: () => void;
  onStart: (userTeam: Team, managerName?: string) => void;
  onRosterSynced?: (league: LeagueDefinition) => void;
}

const MODE_BTN: Record<TournamentMode, string> = {
  league: 'Iniciar Temporada →',
  bracket: 'Sortear Copa →',
  career: 'Iniciar Carreira →',
};

function sanitizeManagerName(raw: string): string {
  return raw.replace(/[\x00-\x1F\x7F]/g, '').slice(0, 24);
}

export default function TournamentSetupScreen({ mode, league, onBack, onGoHome, onStart, onRosterSynced }: Props) {
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [managerName, setManagerName] = useState('');
  const { syncing, lastSource, lastError, sync } = useLiveRoster();

  // Auto-sync roster from API on mount
  useEffect(() => {
    sync(league).then(updated => {
      if (updated !== league) onRosterSynced?.(updated);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league.id]);

  const handleStart = () => {
    if (!userTeamId) return;
    const team = cloneTeam(league.teams.find(t => t.id === userTeamId)!);
    if (mode === 'career') {
      const trimmedName = managerName.trim();
      if (!trimmedName) return;
      onStart(team, trimmedName);
    } else {
      onStart(team);
    }
  };

  const selectedTeam = league.teams.find(t => t.id === userTeamId) ?? null;

  const isCup = mode === 'bracket';
  const title = isCup ? league.cupName : league.name;

  return (
    <div className="team-select-screen">
      <div className="top-nav">
        <button className="slot-nav-btn" onClick={onBack}>← Voltar</button>
        <header className="app-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {isCup && league.cupLogo ? (
            <img src={league.cupLogo} alt={league.cupName} style={{ width: 52, height: 52, objectFit: 'contain' }} />
          ) : (
            <h1>FootPlan</h1>
          )}
          <p className="subtitle">{title}</p>
        </header>
        <button className="slot-nav-btn" onClick={onGoHome}>Menu Principal</button>
      </div>

      <div className="roster-sync-row">
        {syncing && (
          <span className="roster-sync-status ok">🔄 Sincronizando elencos...</span>
        )}
        {!syncing && lastSource === 'live' && (
          <span className="roster-sync-status ok">✓ Elencos atualizados via API</span>
        )}
        {!syncing && lastSource === 'cache' && (
          <span className="roster-sync-status ok">✓ Elencos carregados do cache</span>
        )}
        {!syncing && (lastSource === 'static' || lastSource === 'error') && (
          <span className="roster-sync-status warn" title={lastError ?? undefined}>
            ⚠ Usando elencos offline{lastError ? ` (${lastError})` : ''}
          </span>
        )}
      </div>

      {mode === 'career' && (
        <div className="manager-name-row" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', margin: '8px 0' }}>
          <label htmlFor="manager-name-input">Nome do Técnico</label>
          <input
            id="manager-name-input"
            type="text"
            maxLength={24}
            value={managerName}
            onChange={e => setManagerName(sanitizeManagerName(e.target.value))}
            placeholder="Seu nome"
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'inherit', fontSize: 14 }}
          />
        </div>
      )}

      <div className="select-instruction">
        {userTeamId ? 'Time selecionado! Pode começar.' : 'Escolha seu time'}
      </div>

      <div className="select-summary" style={{ justifyContent: 'center' }}>
        <div
          className={`select-slot home-slot ${selectedTeam ? 'filled' : ''}`}
          onClick={selectedTeam ? () => setUserTeamId(null) : undefined}
          style={selectedTeam ? { borderColor: selectedTeam.color, background: selectedTeam.color + '12' } : undefined}
        >
          {selectedTeam ? (
            <>
              <img className="slot-crest" src={selectedTeam.logoUrl} alt={selectedTeam.name} />
              <span className="slot-name">{selectedTeam.name}</span>
              <span className="slot-ovr">{getAvgOvr(selectedTeam)} OVR</span>
            </>
          ) : (
            <span className="slot-empty">SEU TIME</span>
          )}
        </div>
      </div>

      <div className="select-action">
        {selectedTeam && (mode !== 'career' || managerName.trim().length > 0) && (
          <button
            className="slot-nav-btn slot-nav-btn-primary"
            onClick={handleStart}
            disabled={syncing}
            title={syncing ? 'Aguardando sincronização do elenco (idades reais dos jogadores)...' : undefined}
          >
            {syncing ? 'Sincronizando elenco...' : MODE_BTN[mode]}
          </button>
        )}
      </div>

      <div className="team-grid">
        {[...league.teams].sort((a, b) => a.name.localeCompare(b.name)).map(team => {
          const isSelected = team.id === userTeamId;
          return (
            <button
              key={team.id}
              className={`team-tile ${isSelected ? 'picked-home selected' : ''}`}
              style={isSelected ? { borderColor: team.color, background: team.color + '10' } : undefined}
              onClick={() => setUserTeamId(isSelected ? null : team.id)}
            >
              <img className="tile-crest" src={team.logoUrl} alt={team.name} />
              <span className="tile-name">{team.name}</span>
              <span className="tile-ovr">{getAvgOvr(team)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
