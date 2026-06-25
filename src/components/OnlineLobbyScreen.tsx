import { useState, useEffect, useCallback } from 'react';
import { premierLeagueTeams } from '../data/premierLeague';
import type { Team, Strategy } from '../engine/types';
import { cloneTeam } from '../utils/teamUtils';
import { usePeerConnection } from '../hooks/usePeerConnection';
import styles from './OnlineLobbyScreen.module.css';

interface Props {
  onStartMatch: (home: Team, away: Team, seed: number) => void;
  onBack: () => void;
}

type LobbyPhase = 'connection' | 'team-select' | 'ready';

interface PeerMessage {
  type: 'host-team' | 'guest-team' | 'start';
  teamId?: string;
  seed?: number;
  homeTeamId?: string;
  awayTeamId?: string;
  homeStrategy?: Strategy;
  awayStrategy?: Strategy;
}

export default function OnlineLobbyScreen({ onStartMatch, onBack }: Props) {
  const peer = usePeerConnection();
  const [phase, setPhase] = useState<LobbyPhase>('connection');
  const [joinCode, setJoinCode] = useState('');
  const [hostTeamId, setHostTeamId] = useState<string | null>(null);
  const [guestTeamId, setGuestTeamId] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState('Copiar');

  const lookupTeam = useCallback((id: string): Team | undefined =>
    premierLeagueTeams.find(t => t.id === id), []);

  const selectHostTeam = useCallback((id: string) => {
    setHostTeamId(id);
    peer.send({ type: 'host-team', teamId: id });
    if (guestTeamId) setPhase('ready');
  }, [peer, guestTeamId]);

  const selectGuestTeam = useCallback((id: string) => {
    setGuestTeamId(id);
    peer.send({ type: 'guest-team', teamId: id });
    if (hostTeamId) setPhase('ready');
  }, [peer, hostTeamId]);

  useEffect(() => {
    if (hostTeamId && guestTeamId) setPhase('ready');
  }, [hostTeamId, guestTeamId]);

  // Handle incoming data
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
        const home = lookupTeam(msg.homeTeamId);
        const away = lookupTeam(msg.awayTeamId);
        if (!home || !away) return;
        const h = cloneTeam(home);
        const a = cloneTeam(away);
        if (msg.homeStrategy) h.strategy = msg.homeStrategy;
        if (msg.awayStrategy) a.strategy = msg.awayStrategy;
        onStartMatch(h, a, msg.seed);
      }
    });

    return () => peer.setOnData(null);
  }, [peer, lookupTeam, onStartMatch]);

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
      const input = document.createElement('input');
      input.value = peer.roomId;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
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
    // Send to guest with strategies (defaults for now, they can edit on setup)
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

  const teamList = premierLeagueTeams;
  const sharedTeamIds = new Set([hostTeamId, guestTeamId].filter(Boolean) as string[]);

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => { peer.disconnect(); onBack(); }} aria-label="Voltar">
          ← Voltar
        </button>
        <h1 className={styles.title}>Jogar Online</h1>
        {peer.state === 'connected' && <span className={styles.status}>● Conectado</span>}
      </div>

      {peer.error && (
        <div className={styles.errorBox}>
          <span>{peer.error}</span>
          <button className={styles.retryBtn} onClick={() => { setPhase('connection'); setHostTeamId(null); setGuestTeamId(null); peer.disconnect(); }}>
            Tentar novamente
          </button>
        </div>
      )}

      {peer.state !== 'connected' && phase === 'connection' && (
        <div className={styles.connectSection}>
          <div className={styles.connectCard}>
            <h2 className={styles.cardTitle}>Criar Sala</h2>
            <p className={styles.cardDesc}>Crie uma sala e compartilhe o código com seu amigo</p>
            <button className={styles.primaryBtn} onClick={handleCreateRoom} disabled={peer.state === 'connecting'}>
              {peer.state === 'connecting' ? 'Conectando...' : 'Criar Sala'}
            </button>
          </div>

          <div className={styles.divider}>
            <span className={styles.dividerText}>ou</span>
          </div>

          <div className={styles.connectCard}>
            <h2 className={styles.cardTitle}>Entrar em Sala</h2>
            <p className={styles.cardDesc}>Cole o código que seu amigo compartilhou</p>
            <div className={styles.joinRow}>
              <input
                className={styles.joinInput}
                type="text"
                placeholder="Ex: ABCD"
                maxLength={4}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
              />
              <button className={styles.primaryBtn} onClick={handleJoinRoom} disabled={peer.state === 'connecting' || !joinCode.trim()}>
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      {peer.state === 'connected' && (
        <div className={styles.lobbySection}>
          {peer.isHost && peer.roomId && (
            <div className={styles.roomBox}>
              <span className={styles.roomLabel}>Código da sala:</span>
              <code className={styles.roomCode}>{peer.roomId}</code>
              <button className={styles.copyBtn} onClick={handleCopyRoom}>{copyLabel}</button>
            </div>
          )}
          {!peer.isHost && (
            <div className={styles.roomBox}>
              <span className={styles.roomLabel}>Conectado à sala</span>
            </div>
          )}

          <div className={styles.vsSection}>
            <div className={`${styles.teamSlot} ${hostTeamId ? styles.filled : ''}`}>
              <span className={styles.slotLabel}>Mandante (Você{!peer.isHost ? ' · Oponente' : ''})</span>
              {hostTeamId ? (
                <div className={styles.pickedTeam} style={{ borderLeftColor: lookupTeam(hostTeamId)?.color ?? '#666' }}>
                  <img className={styles.teamLogo} src={lookupTeam(hostTeamId)?.logoUrl} alt="" />
                  <span className={styles.teamName}>{lookupTeam(hostTeamId)?.name}</span>
                </div>
              ) : peer.isHost ? (
                <span className={styles.hint}>Escolha seu time abaixo</span>
              ) : (
                <span className={styles.hint}>Aguardando host escolher...</span>
              )}
            </div>

            <span className={styles.vsText}>vs</span>

            <div className={`${styles.teamSlot} ${guestTeamId ? styles.filled : ''}`}>
              <span className={styles.slotLabel}>Visitante (Você{peer.isHost ? ' · Oponente' : ''})</span>
              {guestTeamId ? (
                <div className={styles.pickedTeam} style={{ borderLeftColor: lookupTeam(guestTeamId)?.color ?? '#666' }}>
                  <img className={styles.teamLogo} src={lookupTeam(guestTeamId)?.logoUrl} alt="" />
                  <span className={styles.teamName}>{lookupTeam(guestTeamId)?.name}</span>
                </div>
              ) : !peer.isHost ? (
                <span className={styles.hint}>Escolha seu time abaixo</span>
              ) : (
                <span className={styles.hint}>Aguardando visitante escolher...</span>
              )}
            </div>
          </div>

          {((peer.isHost && !hostTeamId) || (!peer.isHost && !guestTeamId)) && (
            <div className={styles.teamGrid}>
              {teamList.map(t => (
                <button
                  key={t.id}
                  className={`${styles.teamBtn} ${sharedTeamIds.has(t.id) ? styles.teamTaken : ''}`}
                  style={{ borderColor: sharedTeamIds.has(t.id) ? 'transparent' : t.color + '40' }}
                  disabled={sharedTeamIds.has(t.id)}
                  onClick={() => peer.isHost ? selectHostTeam(t.id) : selectGuestTeam(t.id)}
                >
                  <img className={styles.teamLogoSmall} src={t.logoUrl} alt="" />
                  <div className={styles.teamBtnInfo}>
                    <span className={styles.teamBtnName}>{t.name}</span>
                    <span className={styles.teamBtnAbbr}>{t.abbreviation}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {phase === 'ready' && hostTeamId && guestTeamId && peer.isHost && (
            <button className={styles.startBtn} onClick={handleStart}>
              Iniciar Partida
            </button>
          )}
          {phase === 'ready' && !peer.isHost && (
            <div className={styles.waitingBox}>
              Aguardando o host iniciar a partida...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
