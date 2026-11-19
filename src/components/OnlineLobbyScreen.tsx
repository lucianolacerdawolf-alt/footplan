import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Team, Strategy, Formation, Mentality, Intensity, DefensiveLine, Width } from '../engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';
import { FORMATIONS, MENTALITIES, INTENSITIES, DEF_LINES, WIDTHS } from '../engine/constants';
import { cloneTeam, getAvgOvr } from '../utils/teamUtils';
import type { UsePeerConnectionReturn } from '../hooks/usePeerConnection';
import { allLeagues } from '../data/leagues';
import { syncLeagueRoster } from '../services/rosterSync';
import TacticLabel from './TacticLabel';
import styles from './OnlineLobbyScreen.module.css';
import { crestSrc } from '../utils/crest';
import { ScreenHeader, Button } from './ui';

interface Props {
  onStartMatch: (home: Team, away: Team, seed: number) => void;
  onBack: () => void;
  onGoHome: () => void;
  peer: UsePeerConnectionReturn;
}

// `team` / `homeTeam` / `awayTeam` levam o time inteiro: cada lado podia ter um
// snapshot de elencos de dia diferente, e com só o id cada um simulava com o SEU
// elenco — partida dessincronizada. O guest usa os times enviados pelo host no start.
type PeerMessage =
  | { type: 'host-team'; teamId: string; team?: Team }
  | { type: 'guest-team'; teamId: string; team?: Team }
  | { type: 'confirm-tactics'; strategy: Strategy }
  | { type: 'start'; seed: number; homeTeamId: string; awayTeamId: string; homeStrategy: Strategy; awayStrategy: Strategy; homeTeam?: Team; awayTeam?: Team };

/** Times conhecidos por id: estático de base + ligas atualizadas + times recebidos do outro lado. */
const allTeamsMap = new Map<string, Team>(
  allLeagues.flatMap(l => l.teams.map(t => [t.id, t]))
);
const registerTeams = (teams: Team[]) => { for (const t of teams) allTeamsMap.set(t.id, t); };

export default function OnlineLobbyScreen({ onStartMatch, onBack, peer }: Props) {
  const [joinCode, setJoinCode] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copiar');

  // Guarda o OBJETO do time escolhido (o que está na tela), não só o id: lookup por id
  // num mapa global podia devolver outra versão do clube (estático × atualizado).
  const [hostTeam, setHostTeam] = useState<Team | null>(null);
  const [guestTeam, setGuestTeam] = useState<Team | null>(null);
  const hostTeamId = hostTeam?.id ?? null;
  const guestTeamId = guestTeam?.id ?? null;

  const [filterLeagueId, setFilterLeagueId] = useState<string>(allLeagues[0].id);

  // Tactics phase
  const [myStrategy, setMyStrategy] = useState<Strategy | null>(null);
  const [myConfirmed, setMyConfirmed] = useState(false);
  const [opponentConfirmed, setOpponentConfirmed] = useState(false);
  const [opponentStrategy, setOpponentStrategy] = useState<Strategy | null>(null);

  // Ligas atualizadas (cache/snapshot do sync) — antes o online usava só o estático
  // de 2024/25 (Leicester, Southampton na PL…), diferente do resto do jogo.
  const [liveTeams, setLiveTeams] = useState<Record<string, Team[]>>({});
  useEffect(() => {
    const league = allLeagues.find(l => l.id === filterLeagueId);
    if (!league || liveTeams[league.id]) return;
    let cancelled = false;
    syncLeagueRoster(league).then(r => {
      if (cancelled) return;
      registerTeams(r.league.teams);
      setLiveTeams(prev => ({ ...prev, [league.id]: r.league.teams }));
    }).catch(() => { /* fica no estático */ });
    return () => { cancelled = true; };
  }, [filterLeagueId, liveTeams]);

  const filteredTeams = useMemo(
    () => [...(liveTeams[filterLeagueId] ?? allLeagues.find(l => l.id === filterLeagueId)?.teams ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name)),
    [filterLeagueId, liveTeams]
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
        if (msg.team) registerTeams([msg.team]);
        setHostTeam(msg.team ?? allTeamsMap.get(msg.teamId) ?? null);
      }
      if (msg.type === 'guest-team' && isHostRef.current) {
        if (msg.team) registerTeams([msg.team]);
        setGuestTeam(msg.team ?? allTeamsMap.get(msg.teamId) ?? null);
      }
      if (msg.type === 'confirm-tactics') {
        setOpponentConfirmed(true);
        setOpponentStrategy(msg.strategy);
      }
      if (msg.type === 'start' && !isHostRef.current) {
        const home = msg.homeTeam ?? allTeamsMap.get(msg.homeTeamId);
        const away = msg.awayTeam ?? allTeamsMap.get(msg.awayTeamId);
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

  const selectMyTeam = useCallback((team: Team) => {
    const teamId = team.id;
    // Reset tactics/confirmation when changing team
    setMyStrategy({ ...team.strategy });
    setMyConfirmed(false);
    setOpponentConfirmed(false);
    setOpponentStrategy(null);
    if (peer.isHost) {
      setHostTeam(team);
      peer.send({ type: 'host-team', teamId, team });
    } else {
      setGuestTeam(team);
      peer.send({ type: 'guest-team', teamId, team });
    }
  }, [peer]);

  const handleConfirmTactics = useCallback(() => {
    if (!myStrategy) return;
    setMyConfirmed(true);
    peer.send({ type: 'confirm-tactics', strategy: myStrategy });
  }, [peer, myStrategy]);

  const handleStart = useCallback(() => {
    if (!hostTeam || !guestTeam || !peer.isHost) return;
    const homeTeam = hostTeam;
    const awayTeam = guestTeam;
    const seed = (Math.random() * 0xFFFFFFFF) >>> 0;
    const h = cloneTeam(homeTeam);
    const a = cloneTeam(awayTeam);
    if (myStrategy) h.strategy = myStrategy;
    if (opponentStrategy) a.strategy = opponentStrategy;
    peer.send({ type: 'start', seed, homeTeamId: h.id, awayTeamId: a.id, homeStrategy: h.strategy, awayStrategy: a.strategy, homeTeam: homeTeam, awayTeam: awayTeam });
    onStartMatch(h, a, seed);
  }, [hostTeam, guestTeam, myStrategy, opponentStrategy, peer, onStartMatch]);

  const handleCopyRoom = async () => {
    if (!peer.roomId) return;
    try { await navigator.clipboard.writeText(peer.roomId); } catch { /**/ }
    setCopyLabel('Copiado!');
    setTimeout(() => setCopyLabel('Copiar'), 2000);
  };

  const myTeam = peer.isHost ? hostTeam : guestTeam;
  const myTeamId = myTeam?.id ?? null;
  const bothPicked = hostTeamId !== null && guestTeamId !== null;

  const topNav = (disconnect?: boolean) => (
    <ScreenHeader onBack={() => { if (disconnect) peer.disconnect(); onBack(); }} kicker="Ao vivo com um amigo" title="Jogar Online" />
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
        <p className={styles.howTo}>
          {peer.state === 'connecting'
            ? 'Conectando…'
            : 'Um cria a sala e passa o código de 4 letras; o outro digita o código e entra. Cada um escolhe seu time e vocês jogam a mesma partida ao vivo.'}
        </p>
        <div className={styles.connectContainer}>
          <Button glow
            className={styles.connectBtn}
            onClick={() => peer.createRoom()}
            disabled={peer.state === 'connecting'}
          >
            {peer.state === 'connecting' ? 'Conectando...' : 'Criar sala'}
          </Button>
          <div className={styles.divider}>
            <span className={styles.dividerText}>OU</span>
          </div>
          <div className={styles.joinRow}>
            <input
              type="text" placeholder="Código da sala" maxLength={4}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              onKeyDown={e => e.key === 'Enter' && joinCode.trim().length === 4 && peer.joinRoom(joinCode.trim())}
              className={styles.joinCodeInput}
            />
            <Button glow
              onClick={() => peer.joinRoom(joinCode.trim())}
              disabled={peer.state === 'connecting' || joinCode.trim().length < 4}
            >Entrar</Button>
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
      <div className="team-select-screen fit-screen">
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
                <img src={crestSrc(l.logo)} alt={l.name} style={{ width: 16, height: 16, objectFit: 'contain' }} />
                {l.name}
              </button>
            );
          })}
        </div>

        <div className="team-grid fit-scroll">
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
                onClick={() => !isOpponentPick && selectMyTeam(team)}
                disabled={isOpponentPick}
                aria-label={`${team.name}, força ${getAvgOvr(team)}${isOpponentPick ? ', escolhido pelo adversário' : ''}`}
                aria-pressed={isMyPick}
              >
                <img className="tile-crest" src={crestSrc(team.logoUrl)} alt="" />
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
          ? <Button glow onClick={handleStart}>Iniciar Partida →</Button>
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
            <Button glow
              className={styles.confirmBtn}
              onClick={handleConfirmTactics}
            >
              ✓ Confirmar Táticas
            </Button>
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
