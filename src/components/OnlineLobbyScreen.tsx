import { useState, useEffect, useCallback } from 'react';
import type { Team, Strategy } from '../engine/types';
import { cloneTeam } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';
import type { UsePeerConnectionReturn } from '../hooks/usePeerConnection';
import { allLeagues, getLeague } from '../data/leagues';

interface Props {
  onStartMatch: (home: Team, away: Team, seed: number) => void;
  onBack: () => void;
  onGoHome: () => void;
  peer: UsePeerConnectionReturn;
}

interface PeerMessage {
  type: 'host-team' | 'guest-team' | 'start' | 'league';
  teamId?: string;
  seed?: number;
  homeTeamId?: string;
  awayTeamId?: string;
  homeStrategy?: Strategy;
  awayStrategy?: Strategy;
  leagueId?: string;
}

export default function OnlineLobbyScreen({ onStartMatch, onBack, onGoHome, peer }: Props) {
  const [joinCode, setJoinCode] = useState('');
  const [hostTeamId, setHostTeamId] = useState<string | null>(null);
  const [guestTeamId, setGuestTeamId] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copiar');
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(null);
  const [activeTeams, setActiveTeams] = useState<Team[]>([]);

  const activeLeague = activeLeagueId ? getLeague(activeLeagueId) ?? null : null;

  const lookupTeam = useCallback((id: string): Team | undefined =>
    activeTeams.find(t => t.id === id), [activeTeams]);

  const getAvgOvr = (team: Team) => {
    const starters = team.squad.slice(0, 11);
    return Math.round(starters.reduce((acc, p) => acc + playerOvr(p), 0) / starters.length);
  };

  const selectLeague = useCallback((leagueId: string) => {
    const league = getLeague(leagueId);
    if (!league) return;
    setActiveLeagueId(leagueId);
    setActiveTeams(league.teams);
    setHostTeamId(null);
    setGuestTeamId(null);
    peer.send({ type: 'league', leagueId });
  }, [peer]);

  const selectHostTeam = useCallback((id: string) => {
    setHostTeamId(id);
    peer.send({ type: 'host-team', teamId: id });
  }, [peer]);

  const selectGuestTeam = useCallback((id: string) => {
    setGuestTeamId(id);
    peer.send({ type: 'guest-team', teamId: id });
  }, [peer]);

  // Handle incoming data
  useEffect(() => {
    peer.setOnData((data: unknown) => {
      const msg = data as PeerMessage;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'league' && msg.leagueId && !peer.isHost) {
        const league = getLeague(msg.leagueId);
        if (league) {
          setActiveLeagueId(msg.leagueId);
          setActiveTeams(league.teams);
          setHostTeamId(null);
          setGuestTeamId(null);
        }
      }
      if (msg.type === 'host-team' && msg.teamId && !peer.isHost) {
        setHostTeamId(msg.teamId);
      }
      if (msg.type === 'guest-team' && msg.teamId && peer.isHost) {
        setGuestTeamId(msg.teamId);
      }
      if (msg.type === 'start' && msg.seed != null && msg.homeTeamId && msg.awayTeamId && !peer.isHost) {
        const home = activeTeams.find(t => t.id === msg.homeTeamId);
        const away = activeTeams.find(t => t.id === msg.awayTeamId);
        if (!home || !away) return;
        const h = cloneTeam(home);
        const a = cloneTeam(away);
        if (msg.homeStrategy) h.strategy = msg.homeStrategy;
        if (msg.awayStrategy) a.strategy = msg.awayStrategy;
        onStartMatch(h, a, msg.seed!);
      }
    });
    return () => peer.setOnData(null);
  }, [peer, activeTeams, onStartMatch]);

  const handleCreateRoom = () => peer.createRoom();

  const handleJoinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code) peer.joinRoom(code);
  };

  const handleCopyRoom = async () => {
    if (!peer.roomId) return;
    try {
      await navigator.clipboard.writeText(peer.roomId);
      setCopyLabel('Copiado!');
      setTimeout(() => setCopyLabel('Copiar'), 2000);
    } catch {
      setCopyLabel('Copiado!');
      setTimeout(() => setCopyLabel('Copiar'), 2000);
    }
  };

  const handleStart = () => {
    if (!hostTeamId || !guestTeamId || !peer.isHost) return;
    const homeTeam = lookupTeam(hostTeamId);
    const awayTeam = lookupTeam(guestTeamId);
    if (!homeTeam || !awayTeam) return;
    const seed = (Math.random() * 0xFFFFFFFF) >>> 0;
    const h = cloneTeam(homeTeam);
    const a = cloneTeam(awayTeam);
    peer.send({
      type: 'start',
      seed,
      homeTeamId: h.id,
      awayTeamId: a.id,
      homeStrategy: h.strategy,
      awayStrategy: a.strategy,
    });
    onStartMatch(h, a, seed);
  };

  const sharedTeamIds = new Set([hostTeamId, guestTeamId].filter(Boolean) as string[]);
  const hostTeam = hostTeamId ? lookupTeam(hostTeamId) ?? null : null;
  const guestTeam = guestTeamId ? lookupTeam(guestTeamId) ?? null : null;
  const canPick = peer.isHost ? !hostTeamId : !guestTeamId;

  // Phase 1 — connection
  if (peer.state !== 'connected') {
    return (
      <div className="team-select-screen">
        <div className="top-nav">
          <button className="slot-nav-btn" onClick={onBack}>← Voltar</button>
          <header className="app-header">
            <h1>FootPlan</h1>
            <p className="subtitle">Jogar Online</p>
          </header>
          <button className="slot-nav-btn" onClick={onGoHome}>Menu Principal</button>
        </div>

        {peer.error && (
          <div className="color-conflict-warning">
            <span>{peer.error}</span>
            <button className="conflict-fix-btn" onClick={() => peer.disconnect()}>
              Tentar novamente
            </button>
          </div>
        )}

        <div className="select-instruction">
          {peer.state === 'connecting' ? 'Conectando...' : 'Crie uma sala ou entre em uma existente'}
        </div>

        <div style={{ maxWidth: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="slot-nav-btn slot-nav-btn-primary"
            onClick={handleCreateRoom}
            disabled={peer.state === 'connecting'}
            style={{ width: '100%', padding: '14px 20px', fontSize: 15 }}
          >
            {peer.state === 'connecting' ? 'Conectando...' : '🌐 Criar Sala'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: 0.3 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)' }}>OU</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Código (4 letras)"
              maxLength={4}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
              style={{
                flex: 1, background: 'var(--code-bg)', border: '1.5px solid var(--border)',
                borderRadius: 8, padding: '10px 14px', fontSize: 18, fontFamily: 'var(--mono)',
                color: 'var(--text-h)', outline: 'none', textAlign: 'center',
                letterSpacing: 8, textTransform: 'uppercase',
              }}
            />
            <button
              className="slot-nav-btn slot-nav-btn-primary"
              onClick={handleJoinRoom}
              disabled={peer.state === 'connecting' || joinCode.trim().length < 4}
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Phase 2 — host picks league (guest waits)
  if (!activeLeagueId) {
    return (
      <div className="team-select-screen">
        <div className="top-nav">
          <button className="slot-nav-btn" onClick={() => { peer.disconnect(); onBack(); }}>← Voltar</button>
          <header className="app-header">
            <h1>FootPlan</h1>
            <p className="subtitle">Jogar Online</p>
          </header>
          <button className="slot-nav-btn" onClick={() => { peer.disconnect(); onGoHome(); }}>Menu Principal</button>
        </div>

        {peer.isHost && peer.roomId && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '10px 20px', margin: '0 auto 4px', maxWidth: 340,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, fontFamily: 'var(--mono)' }}>Sala:</span>
            <code style={{
              fontSize: 28, fontWeight: 900, fontFamily: 'var(--mono)', color: 'var(--accent)',
              letterSpacing: 6, userSelect: 'all',
            }}>{peer.roomId}</code>
            <button className="slot-nav-btn" onClick={handleCopyRoom} style={{ padding: '4px 12px', fontSize: 11 }}>
              {copyLabel}
            </button>
          </div>
        )}

        {peer.isHost ? (
          <>
            <div className="select-instruction">Escolha o campeonato</div>
            <div className="team-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 480, margin: '0 auto' }}>
              {allLeagues.map(league => (
                <button
                  key={league.id}
                  className="team-tile"
                  onClick={() => selectLeague(league.id)}
                  style={{ flexDirection: 'column', gap: 6, padding: '14px 8px' }}
                >
                  <img className="tile-crest" src={league.logo} alt={league.name} />
                  <span className="tile-name" style={{ fontSize: 11 }}>{league.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="select-instruction" style={{ marginTop: 48 }}>
            ● Conectado — aguardando host escolher campeonato...
          </div>
        )}
      </div>
    );
  }

  // Phase 3 — both pick teams
  return (
    <div className="team-select-screen">
      <div className="top-nav">
        <button className="slot-nav-btn" onClick={() => { peer.disconnect(); onBack(); }}>← Voltar</button>
        <header className="app-header">
          {activeLeague?.logo && (
            <img src={activeLeague.logo} alt={activeLeague.name} style={{ width: 32, height: 32, objectFit: 'contain' }} />
          )}
          <p className="subtitle">{activeLeague?.name ?? 'Online'}</p>
        </header>
        <button className="slot-nav-btn" onClick={() => { peer.disconnect(); onGoHome(); }}>Menu Principal</button>
      </div>

      {peer.isHost && peer.roomId && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '10px 20px', margin: '0 auto 4px', maxWidth: 340,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, fontFamily: 'var(--mono)' }}>Sala:</span>
          <code style={{
            fontSize: 28, fontWeight: 900, fontFamily: 'var(--mono)', color: 'var(--accent)',
            letterSpacing: 6, userSelect: 'all',
          }}>{peer.roomId}</code>
          <button className="slot-nav-btn" onClick={handleCopyRoom} style={{ padding: '4px 12px', fontSize: 11 }}>
            {copyLabel}
          </button>
        </div>
      )}
      {!peer.isHost && (
        <div className="select-instruction">● Conectado à sala — aguarde o host</div>
      )}

      <div className="select-instruction">
        {canPick ? 'Escolha seu time' : 'Time selecionado! Aguardando oponente...'}
      </div>

      <div className="select-summary">
        {renderSlot(hostTeam, 'home', 'CASA', 'home-slot')}
        <div className="select-vs">VS</div>
        {renderSlot(guestTeam, 'away', 'FORA', 'away-slot')}
      </div>

      <div className="select-action">
        {peer.isHost && hostTeamId && guestTeamId
          ? <button className="slot-nav-btn slot-nav-btn-primary" onClick={handleStart}>Iniciar Partida →</button>
          : !peer.isHost && hostTeamId && guestTeamId
          ? <div className="select-instruction">Host irá iniciar...</div>
          : null
        }
      </div>

      {canPick && (
        <div className="team-grid">
          {activeTeams.map(team => {
            const isHostPick = team.id === hostTeamId;
            const isGuestPick = team.id === guestTeamId;
            const isSelected = isHostPick || isGuestPick;
            return (
              <button
                key={team.id}
                className={`team-tile ${isHostPick ? 'picked-home' : ''} ${isGuestPick ? 'picked-away' : ''} ${isSelected ? 'selected' : ''}`}
                style={isSelected ? { borderColor: team.color, background: team.color + '10' } : undefined}
                onClick={() => peer.isHost ? selectHostTeam(team.id) : selectGuestTeam(team.id)}
                disabled={sharedTeamIds.has(team.id)}
              >
                <img className="tile-crest" src={team.logoUrl} alt={team.name} />
                <span className="tile-name">{team.name}</span>
                <span className="tile-ovr">{getAvgOvr(team)}</span>
              </button>
            );
          })}
        </div>
      )}

      {!canPick && hostTeam && guestTeam && (
        <div className="team-grid">
          {activeTeams.map(team => {
            const isHostPick = team.id === hostTeamId;
            const isGuestPick = team.id === guestTeamId;
            const isSelected = isHostPick || isGuestPick;
            return (
              <button
                key={team.id}
                className={`team-tile ${isHostPick ? 'picked-home' : ''} ${isGuestPick ? 'picked-away' : ''} ${isSelected ? 'selected' : ''}`}
                style={isSelected ? { borderColor: team.color, background: team.color + '10' } : undefined}
                disabled
              >
                <img className="tile-crest" src={team.logoUrl} alt={team.name} />
                <span className="tile-name">{team.name}</span>
                <span className="tile-ovr">{getAvgOvr(team)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderSlot(
  team: { name: string; logoUrl: string; color: string } | null,
  _side: 'home' | 'away',
  label: string,
  slotClass: string
) {
  return (
    <div
      className={`select-slot ${slotClass} ${team ? 'filled' : ''}`}
      style={team ? { borderColor: team.color, background: team.color + '12' } : undefined}
    >
      {team ? (
        <>
          <img className="slot-crest" src={team.logoUrl} alt={team.name} />
          <span className="slot-name">{team.name}</span>
        </>
      ) : (
        <span className="slot-empty">{label}</span>
      )}
    </div>
  );
}
