import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Team, Strategy, Formation, Mentality, Intensity, DefensiveLine, Width } from '../engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';
import { FORMATIONS, MENTALITIES, INTENSITIES, DEF_LINES, WIDTHS } from '../engine/constants';
import { cloneTeam, getAvgOvr } from '../utils/teamUtils';
import type { UsePeerConnectionReturn } from '../hooks/usePeerConnection';
import { allLeagues } from '../data/leagues';
import TacticLabel from './TacticLabel';
import styles from './OnlineLobbyScreen.module.css';
import { crestSrc } from '../utils/crest';

interface Props {
  onStartMatch: (home: Team, away: Team, seed: number) => void;
  onBack: () => void;
  onGoHome: () => void;
  peer: UsePeerConnectionReturn;
}

type PeerMessage =
  | { type: 'host-team'; teamId: string }
  | { type: 'guest-team'; teamId: string }
  | { type: 'confirm-tactics'; strategy: Strategy }
  | { type: 'start'; seed: number; homeTeamId: string; awayTeamId: string; homeStrategy: Strategy; awayStrategy: Strategy };

const allTeamsMap = new Map<string, Team>(
  allLeagues.flatMap(l => l.teams.map(t => [t.id, t]))
);

export default function OnlineLobbyScreen({ onStartMatch, onBack, onGoHome, peer }: Props) {
  const [joinCode, setJoinCode] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copiar');

  const [hostTeamId, setHostTeamId] = useState<string | null>(null);
  const [guestTeamId, setGuestTeamId] = useState<string | null>(null);

  const [filterLeagueId, setFilterLeagueId] = useState<string>(allLeagues[0].id);

  // Tactics phase
  const [myStrategy, setMyStrategy] = useState<Strategy | null>(null);
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [opponentConfirmed, setOpponentConfirmed] = useState(false);
  const [opponentStrategy, setOpponentStrategy] = useState<Strategy | null>(null);

  const filteredTeams = useMemo(
    () => allLeagues.find(l => l.id === filterLeagueId)?.teams ?? [],
    [filterLeagueId]
  );

  // Use ref to avoid stale closures in the data handler
  const isHostRef = useRef(peer.isHost);
  isHostRef.current = peer.isHost;
  const onStartMatchRef = useRef(onStartMatch);
  onStartMatchRef.current = onStartMatch;

  // Register data handler once (stable)
  useEffect(() => {
    peer.setOnData((data: unknown) => {
      const msg = data as PeerMessage;
      if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

      if (msg.type === 'host-team' && !isHostRef.current) {
        setHostTeamId(msg.teamId);
      }
      if (msg.type === 'guest-team' && isHostRef.current) {
        setGuestTeamId(msg.teamId);
      }
      if (msg.type === 'confirm-tactics') {
        setOpponentConfirmed(true);
        setOpponentStrategy(msg.strategy);
      }
      if (msg.type === 'start' && !isHostRef.current) {
        const home = allTeamsMap.get(msg.homeTeamId);
        const away = allTeamsMap.get(msg.awayTeamId);
        if (!home || !away) return;
        const h = cloneTeam(home);
        const a = cloneTeam(away);
        h.strategy = msg.homeStrategy;
        a.strategy = msg.awayStrategy;
        onStartMatchRef.current(h, a, msg.seed);
      }
    });
    return () => peer.setOnData(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable — reads from refs

  const selectMyTeam = useCallback((teamId: string) => {
    const team = allTeamsMap.get(teamId);
    if (!team) return;
    // Reset tactics/confirmation when changing team
    setMyStrategy({ ...team.strategy });
    setMyConfirmed(false);
    setOpponentConfirmed(false);
    setOpponentStrategy(null);
    if (peer.isHost) {
      setHostTeamId(teamId);
      peer.send({ type: 'host-team', teamId });
    } else {
      setGuestTeamId(teamId);
      peer.send({ type: 'guest-team', teamId });
    }
  }, [peer]);

  const handleConfirmTactics = useCallback(() => {
    if (!myStrategy) return;
    setMyConfirmed(true);
    peer.send({ type: 'confirm-tactics', strategy: myStrategy });
  }, [peer, myStrategy]);

  const handleStart = useCallback(() => {
    if (!hostTeamId || !guestTeamId || !peer.isHost) return;
    const homeTeam = allTeamsMap.get(hostTeamId);
    const awayTeam = allTeamsMap.get(guestTeamId);
    if (!homeTeam || !awayTeam) return;
    const seed = (Math.random() * 0xFFFFFFFF) >>> 0;
    const h = cloneTeam(homeTeam);
    const a = cloneTeam(awayTeam);
    if (myStrategy) h.strategy = myStrategy;
    if (opponentStrategy) a.strategy = opponentStrategy;
    peer.send({ type: 'start', seed, homeTeamId: h.id, awayTeamId: a.id, homeStrategy: h.strategy, awayStrategy: a.strategy });
    onStartMatch(h, a, seed);
  }, [hostTeamId, guestTeamId, myStrategy, opponentStrategy, peer, onStartMatch]);

  const handleCopyRoom = async () => {
    if (!peer.roomId) return;
    try { await navigator.clipboard.writeText(peer.roomId); } catch { /**/ }
    setCopyLabel('Copiado!');
    setTimeout(() => setCopyLabel('Copiar'), 2000);
  };

  const hostTeam = hostTeamId ? allTeamsMap.get(hostTeamId) ?? null : null;
  const guestTeam = guestTeamId ? allTeamsMap.get(guestTeamId) ?? null : null;
  const myTeamId = peer.isHost ? hostTeamId : guestTeamId;
  const myTeam = myTeamId ? allTeamsMap.get(myTeamId) ?? null : null;
  const bothPicked = hostTeamId !== null && guestTeamId !== null;

  const topNav = (disconnect?: boolean) => (
    <div className="top-nav">
      <button className="slot-nav-btn" onClick={() => { if (disconnect) peer.disconnect(); onBack(); }}>← Voltar</button>
      <header className="app-header">
        <h1>FootPlan</h1>
        <p className="subtitle">Jogar Online</p>
      </header>
      <button className="slot-nav-btn" onClick={() => { if (disconnect) peer.disconnect(); onGoHome(); }}>Menu Principal</button>
    </div>
  );

  const roomCodeBadge = peer.isHost && peer.roomId ? (
    <div className={styles.roomCodeBadge}>
      <span className={styles.roomLabel}>Sala:</span>
      <code className={styles.roomCode}>
        {peer.roomId}
      </code>
      <button className={styles.copyBtn} onClick={handleCopyRoom}>{copyLabel}</button>
    </div>
  ) : null;

  // ── Phase 1: connect ──────────────────────────────────────────────────────
  if (!peer.peerConnected && !(peer.isHost && peer.state === 'connected')) {
    return (
      <div className="team-select-screen">
        {topNav()}
        {peer.error && (
          <div className="color-conflict-warning">
            <span>{peer.error}</span>
            <button className="conflict-fix-btn" onClick={() => peer.disconnect()}>Tentar novamente</button>
          </div>
        )}
        <div className="select-instruction">
          {peer.state === 'connecting' ? 'Conectando...' : 'Crie uma sala ou entre em uma existente'}
        </div>
        <div className={styles.connectContainer}>
          <button
            className={`slot-nav-btn slot-nav-btn-primary ${styles.connectBtn}`}
            onClick={() => peer.createRoom()}
            disabled={peer.state === 'connecting'}
          >
            {peer.state === 'connecting' ? 'Conectando...' : '🌐 Criar Sala'}
          </button>
          <div className={styles.divider}>
            <span className={styles.dividerText}>OU</span>
          </div>
          <div className={styles.joinRow}>
            <input
              type="text" placeholder="Código (4 letras)" maxLength={4}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              onKeyDown={e => e.key === 'Enter' && joinCode.trim().length === 4 && peer.joinRoom(joinCode.trim())}
              className={styles.joinCodeInput}
            />
            <button
              className="slot-nav-btn slot-nav-btn-primary"
              onClick={() => peer.joinRoom(joinCode.trim())}
              disabled={peer.state === 'connecting' || joinCode.trim().length < 4}
            >Entrar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase 1b: host waiting for guest ─────────────────────────────────────
  if (peer.isHost && peer.state === 'connected' && !peer.peerConnected) {
    return (
      <div className="team-select-screen">
        {topNav(true)}
        {roomCodeBadge}
        <div className={styles.waitingBox}>
          Aguardando adversário entrar com o código...
        </div>
        <div className={styles.waitingDots}>· · ·</div>
      </div>
    );
  }

  // ── Phase 2: pick teams ───────────────────────────────────────────────────
  if (!bothPicked) {
    const opponentPick = peer.isHost ? guestTeamId : hostTeamId;
    return (
      <div className="team-select-screen">
        {topNav(true)}
        {roomCodeBadge}
        {!peer.isHost && <div className={styles.statusBadge}>● Conectado</div>}

        <div className="select-summary">
          {renderSlot(hostTeam, 'CASA', 'home-slot')}
          <div className="select-vs">VS</div>
          {renderSlot(guestTeam, 'FORA', 'away-slot')}
        </div>

        <div className="select-instruction">
          {myTeamId ? 'Aguardando adversário escolher...' : 'Escolha seu time'}
        </div>

        {/* League filter tabs */}
        <div className={styles.teamRow}>
          {allLeagues.map(l => {
            const isActive = filterLeagueId === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setFilterLeagueId(l.id)}
                className={`${styles.teamCard} ${isActive ? styles.teamCardActive : ''}`}
                style={isActive ? {
                  borderColor: l.color,
                  background: l.color + '18',
                  color: 'var(--text-primary)',
                } : undefined}
              >
                <img src={l.logo} alt={l.name} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                {l.name}
              </button>
            );
          })}
        </div>

        <div className="team-grid">
          {filteredTeams.map(team => {
            const isHostPick = team.id === hostTeamId;
            const isGuestPick = team.id === guestTeamId;
            const isMyPick = team.id === myTeamId;
            const isOpponentPick = team.id === opponentPick;
            return (
              <button
                key={team.id}
                className={`team-tile ${isHostPick ? 'picked-home' : ''} ${isGuestPick ? 'picked-away' : ''} ${(isHostPick || isGuestPick) ? 'selected' : ''}`}
                style={(isHostPick || isGuestPick) ? { borderColor: team.color, background: team.color + '10' } : undefined}
                onClick={() => !isOpponentPick && selectMyTeam(team.id)}
                disabled={isOpponentPick}
              >
                <img className="tile-crest" src={crestSrc(team.logoUrl)} alt={team.name} />
                <span className="tile-name">{team.name}</span>
                <span className="tile-ovr">{isMyPick ? '✓' : getAvgOvr(team)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Phase 3: configure tactics ────────────────────────────────────────────
  const myColor = peer.isHost ? (hostTeam?.color ?? 'var(--accent)') : (guestTeam?.color ?? 'var(--accent)');
  const bothConfirmed = myConfirmed && opponentConfirmed;

  return (
    <div className="team-select-screen">
      {topNav(true)}
      {roomCodeBadge}

      {/* Match preview */}
      <div className="select-summary">
        {renderSlot(hostTeam, 'CASA', 'home-slot')}
        <div className="select-vs">VS</div>
        {renderSlot(guestTeam, 'FORA', 'away-slot')}
      </div>

      {/* Status */}
      <div className="select-action">
        {peer.isHost && bothConfirmed
          ? <button className="slot-nav-btn slot-nav-btn-primary" onClick={handleStart}>Iniciar Partida →</button>
          : <div className="select-instruction">
              {myConfirmed
                ? (opponentConfirmed ? '✓ Ambos prontos!' : 'Aguardando adversário confirmar...')
                : 'Configure suas táticas e confirme'}
            </div>
        }
      </div>

      {/* Own team tactics editor */}
      {myTeam && myStrategy && (
        <div className={`${'halftime-inner'} ${styles.tacticsPanel}`}>
          <div className={styles.tacticsTitle}>
            <img src={crestSrc(myTeam.logoUrl)} alt={myTeam.name} className={styles.tacticsTitleImg} />
            <strong className={styles.tacticsTitleStrong} style={{ color: myColor }}>
              {myTeam.name} — Seu Time
            </strong>
          </div>

          <div className="halftime-team" style={{ width: '100%' }}>
            <div className="setup-select">
              <TacticLabel tacticKey="formation" />
              <select
                value={myStrategy.formation}
                onChange={e => setMyStrategy(s => s ? { ...s, formation: e.target.value as Formation } : s)}
                disabled={myConfirmed}
              >
                {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="setup-select">
              <TacticLabel tacticKey="mentality" />
              <select
                value={myStrategy.mentality}
                onChange={e => setMyStrategy(s => s ? { ...s, mentality: e.target.value as Mentality } : s)}
                disabled={myConfirmed}
              >
                {MENTALITIES.map(m => <option key={m} value={m}>{MENTALITY_LABELS[m]}</option>)}
              </select>
            </div>
            <div className="setup-select">
              <TacticLabel tacticKey="intensity" />
              <select
                value={myStrategy.intensity}
                onChange={e => setMyStrategy(s => s ? { ...s, intensity: e.target.value as Intensity } : s)}
                disabled={myConfirmed}
              >
                {INTENSITIES.map(i => <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>)}
              </select>
            </div>
            <div className="setup-select">
              <TacticLabel tacticKey="defensiveLine" />
              <select
                value={myStrategy.defensiveLine}
                onChange={e => setMyStrategy(s => s ? { ...s, defensiveLine: e.target.value as DefensiveLine } : s)}
                disabled={myConfirmed}
              >
                {DEF_LINES.map(d => <option key={d} value={d}>{DEFENSIVE_LINE_LABELS[d]}</option>)}
              </select>
            </div>
            <div className="setup-select">
              <TacticLabel tacticKey="width" />
              <select
                value={myStrategy.width}
                onChange={e => setMyStrategy(s => s ? { ...s, width: e.target.value as Width } : s)}
                disabled={myConfirmed}
              >
                {WIDTHS.map(w => <option key={w} value={w}>{WIDTH_LABELS[w]}</option>)}
              </select>
            </div>
          </div>

          {!myConfirmed && (
            <button
              className={`slot-nav-btn slot-nav-btn-primary ${styles.confirmBtn}`}
              onClick={handleConfirmTactics}
            >
              ✓ Confirmar Táticas
            </button>
          )}
          {myConfirmed && (
            <div className={styles.confirmedMsg} style={{ color: 'var(--accent)' }}>
              ✓ Táticas confirmadas
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderSlot(
  team: { name: string; logoUrl: string; color: string } | null,
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
          <img className="slot-crest" src={crestSrc(team.logoUrl)} alt={team.name} />
          <span className="slot-name">{team.name}</span>
        </>
      ) : (
        <span className="slot-empty">{label}</span>
      )}
    </div>
  );
}
