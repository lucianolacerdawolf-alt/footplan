import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Team, Strategy } from '../engine/types';
import { cloneTeam } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';
import type { UsePeerConnectionReturn } from '../hooks/usePeerConnection';
import { allLeagues } from '../data/leagues';

interface Props {
  onStartMatch: (home: Team, away: Team, seed: number) => void;
  onBack: () => void;
  onGoHome: () => void;
  peer: UsePeerConnectionReturn;
}

interface PeerMessage {
  type: 'host-team' | 'guest-team' | 'start';
  teamId?: string;
  leagueId?: string;
  seed?: number;
  homeTeamId?: string;
  homeLeagueId?: string;
  awayTeamId?: string;
  awayLeagueId?: string;
  homeStrategy?: Strategy;
  awayStrategy?: Strategy;
}

// Flat map of all teams across all leagues for fast lookup
const allTeamsMap = new Map<string, Team>(
  allLeagues.flatMap(l => l.teams.map(t => [t.id, t]))
);

export default function OnlineLobbyScreen({ onStartMatch, onBack, onGoHome, peer }: Props) {
  const [joinCode, setJoinCode] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copiar');

  // Each side's chosen team (by id)
  const [hostTeamId, setHostTeamId] = useState<string | null>(null);
  const [guestTeamId, setGuestTeamId] = useState<string | null>(null);

  // League filter for the local player's team picker
  const [filterLeagueId, setFilterLeagueId] = useState<string>(allLeagues[0].id);

  const filteredTeams = useMemo(
    () => allLeagues.find(l => l.id === filterLeagueId)?.teams ?? [],
    [filterLeagueId]
  );

  const getAvgOvr = (team: Team) => {
    const starters = team.squad.slice(0, 11);
    return Math.round(starters.reduce((acc, p) => acc + playerOvr(p), 0) / starters.length);
  };

  const selectMyTeam = useCallback((teamId: string) => {
    if (peer.isHost) {
      setHostTeamId(teamId);
      peer.send({ type: 'host-team', teamId, leagueId: filterLeagueId });
    } else {
      setGuestTeamId(teamId);
      peer.send({ type: 'guest-team', teamId, leagueId: filterLeagueId });
    }
  }, [peer, filterLeagueId]);

  // Handle incoming messages
  useEffect(() => {
    peer.setOnData((data: unknown) => {
      const msg = data as PeerMessage;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'host-team' && msg.teamId && !peer.isHost) {
        setHostTeamId(msg.teamId);
      }
      if (msg.type === 'guest-team' && msg.teamId && peer.isHost) {
        setGuestTeamId(msg.teamId);
      }
      if (msg.type === 'start' && msg.seed != null && msg.homeTeamId && msg.awayTeamId && !peer.isHost) {
        const home = allTeamsMap.get(msg.homeTeamId);
        const away = allTeamsMap.get(msg.awayTeamId);
        if (!home || !away) return;
        const h = cloneTeam(home);
        const a = cloneTeam(away);
        if (msg.homeStrategy) h.strategy = msg.homeStrategy;
        if (msg.awayStrategy) a.strategy = msg.awayStrategy;
        onStartMatch(h, a, msg.seed!);
      }
    });
    return () => peer.setOnData(null);
  }, [peer, onStartMatch]);

  const handleCreateRoom = () => peer.createRoom();
  const handleJoinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (code) peer.joinRoom(code);
  };

  const handleCopyRoom = async () => {
    if (!peer.roomId) return;
    try { await navigator.clipboard.writeText(peer.roomId); } catch { /**/ }
    setCopyLabel('Copiado!');
    setTimeout(() => setCopyLabel('Copiar'), 2000);
  };

  const handleStart = () => {
    if (!hostTeamId || !guestTeamId || !peer.isHost) return;
    const homeTeam = allTeamsMap.get(hostTeamId);
    const awayTeam = allTeamsMap.get(guestTeamId);
    if (!homeTeam || !awayTeam) return;
    const seed = (Math.random() * 0xFFFFFFFF) >>> 0;
    const h = cloneTeam(homeTeam);
    const a = cloneTeam(awayTeam);
    peer.send({
      type: 'start', seed,
      homeTeamId: h.id, awayTeamId: a.id,
      homeStrategy: h.strategy, awayStrategy: a.strategy,
    });
    onStartMatch(h, a, seed);
  };

  const hostTeam = hostTeamId ? allTeamsMap.get(hostTeamId) ?? null : null;
  const guestTeam = guestTeamId ? allTeamsMap.get(guestTeamId) ?? null : null;
  const myTeamId = peer.isHost ? hostTeamId : guestTeamId;
  const picked = myTeamId !== null;

  // ── Phase 1: connect ──────────────────────────────────────────────────────
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

  // ── Phase 2: pick teams ───────────────────────────────────────────────────
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
      {!peer.isHost && (
        <div className="select-instruction">● Conectado à sala</div>
      )}

      {/* Scoreboard */}
      <div className="select-summary">
        {renderSlot(hostTeam, 'home', 'CASA', 'home-slot')}
        <div className="select-vs">VS</div>
        {renderSlot(guestTeam, 'away', 'FORA', 'away-slot')}
      </div>

      {/* Start button (host only, when both picked) */}
      <div className="select-action">
        {peer.isHost && hostTeamId && guestTeamId
          ? <button className="slot-nav-btn slot-nav-btn-primary" onClick={handleStart}>Iniciar Partida →</button>
          : !peer.isHost && hostTeamId && guestTeamId
          ? <div className="select-instruction">Aguardando host iniciar...</div>
          : <div className="select-instruction">{picked ? 'Aguardando oponente...' : 'Escolha seu time'}</div>
        }
      </div>

      {/* League filter tabs */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
        padding: '0 16px', maxWidth: 540, margin: '0 auto 8px',
      }}>
        {allLeagues.map(l => (
          <button
            key={l.id}
            onClick={() => setFilterLeagueId(l.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--heading)', cursor: 'pointer',
              border: `1.5px solid ${filterLeagueId === l.id ? l.color : 'var(--border)'}`,
              background: filterLeagueId === l.id ? l.color + '18' : 'transparent',
              color: filterLeagueId === l.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}
          >
            <img src={l.logo} alt={l.name} style={{ width: 16, height: 16, objectFit: 'contain' }} />
            {l.name}
          </button>
        ))}
      </div>

      {/* Team grid */}
      <div className="team-grid">
        {filteredTeams.map(team => {
          const isHostPick = team.id === hostTeamId;
          const isGuestPick = team.id === guestTeamId;
          const isMyPick = team.id === myTeamId;
          const isOpponentPick = peer.isHost ? isGuestPick : isHostPick;
          return (
            <button
              key={team.id}
              className={`team-tile ${isHostPick ? 'picked-home' : ''} ${isGuestPick ? 'picked-away' : ''} ${(isHostPick || isGuestPick) ? 'selected' : ''}`}
              style={(isHostPick || isGuestPick) ? { borderColor: team.color, background: team.color + '10' } : undefined}
              onClick={() => !isOpponentPick && selectMyTeam(team.id)}
              disabled={isOpponentPick}
            >
              <img className="tile-crest" src={team.logoUrl} alt={team.name} />
              <span className="tile-name">{team.name}</span>
              <span className="tile-ovr">{isMyPick ? '✓' : getAvgOvr(team)}</span>
            </button>
          );
        })}
      </div>
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
