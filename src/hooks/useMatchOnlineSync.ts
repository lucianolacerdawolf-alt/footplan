import { useState, useEffect, useCallback, useRef } from 'react';
import type { Team, Strategy, MatchResult, Player } from '@/engine/types';
import type { SubWindow } from '@/utils/liveMatchPersistence';

export interface OnlineProps {
  isHost: boolean;
  send: (data: unknown) => void;
  setOnData: (handler: ((data: unknown) => void) | null) => void;
  peerConnected: boolean;
}

export type MatchSyncMsg =
  | { type: 'strategy-update'; side: 'home' | 'away'; strategy: Strategy }
  | { type: 'squad-update'; side: 'home' | 'away'; squad: Player[]; subsUsed: number }
  | { type: 'ready-halftime' }
  | { type: 'pause-game' }
  | { type: 'ready-resume' }
  | { type: 'start-simulate' };

export const ZERO_SUB_WINDOWS: Record<SubWindow, number> = { firstHalfPause: 0, halftime: 0, secondHalfPause: 0 };

type MatchPhase = 'idle' | 'simulating' | 'halftime' | 'done';

interface UseMatchOnlineSyncParams {
  online: OnlineProps | undefined;
  setHome: React.Dispatch<React.SetStateAction<Team>>;
  setAway: React.Dispatch<React.SetStateAction<Team>>;
  setSubsHome: React.Dispatch<React.SetStateAction<number>>;
  setSubsAway: React.Dispatch<React.SetStateAction<number>>;
  setSubWindowsHome: React.Dispatch<React.SetStateAction<Record<SubWindow, number>>>;
  setSubWindowsAway: React.Dispatch<React.SetStateAction<Record<SubWindow, number>>>;
  setInjuredIds: React.Dispatch<React.SetStateAction<string[]>>;
  setKnockoutResult: React.Dispatch<React.SetStateAction<MatchResult | null>>;
  knockoutResolvedRef: React.MutableRefObject<boolean>;
  pauseReplay: () => void;
  resumeReplay: () => void;
  runFirstHalf: (home: Team, away: Team) => void;
  runSecondHalf: (home: Team, away: Team) => void;
  home: Team;
  away: Team;
  phase: MatchPhase;
  paused: boolean;
}

/** Protocolo de sincronização online da partida (WebRTC via useOnlineMatch):
 *  helpers de envio, handler de mensagens recebidas e a coordenação de
 *  "pronto" (intervalo/pausa). Antes isso vivia inline no MatchScreen. */
export function useMatchOnlineSync({
  online, setHome, setAway, setSubsHome, setSubsAway, setSubWindowsHome, setSubWindowsAway,
  setInjuredIds, setKnockoutResult, knockoutResolvedRef, pauseReplay, resumeReplay,
  runFirstHalf, runSecondHalf, home, away, phase, paused,
}: UseMatchOnlineSyncParams) {
  const [hostReady, setHostReady] = useState(false);
  const [guestReady, setGuestReady] = useState(false);

  // Espelhos em ref dos times/fase: o handler de mensagens lê SEMPRE o valor mais
  // recente. Antes ele capturava home/away do render — se squad-update/strategy-update
  // e start-simulate chegassem no mesmo tick (o host envia tudo junto), o primeiro
  // tempo rodava com a escalação ANTERIOR às atualizações.
  const homeRef = useRef(home);
  const awayRef = useRef(away);
  const phaseRef = useRef(phase);
  useEffect(() => { homeRef.current = home; }, [home]);
  useEffect(() => { awayRef.current = away; }, [away]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const syncStrategy = useCallback((side: 'home' | 'away', strategy: Strategy) => {
    online?.send({ type: 'strategy-update', side, strategy } satisfies MatchSyncMsg);
  }, [online]);

  const syncSquad = useCallback((side: 'home' | 'away', squad: Player[], subsUsed: number) => {
    online?.send({ type: 'squad-update', side, squad, subsUsed } satisfies MatchSyncMsg);
  }, [online]);

  const sendReadyHalftime = useCallback(() => {
    if (online?.isHost) setHostReady(true);
    else setGuestReady(true);
    online?.send({ type: 'ready-halftime' } satisfies MatchSyncMsg);
  }, [online]);

  const sendPauseGame = useCallback(() => {
    online?.send({ type: 'pause-game' } satisfies MatchSyncMsg);
  }, [online]);

  const sendReadyResume = useCallback(() => {
    if (online?.isHost) setHostReady(true);
    else setGuestReady(true);
    online?.send({ type: 'ready-resume' } satisfies MatchSyncMsg);
  }, [online]);

  // Handle incoming peer data during match
  useEffect(() => {
    if (!online) return;
    const handler = (data: unknown) => {
      const msg = data as MatchSyncMsg;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'strategy-update') {
        if (msg.side === 'home') setHome(prev => ({ ...prev, strategy: msg.strategy }));
        else setAway(prev => ({ ...prev, strategy: msg.strategy }));
      }
      if (msg.type === 'squad-update') {
        if (msg.side === 'home') { setHome(prev => ({ ...prev, squad: msg.squad })); setSubsHome(msg.subsUsed); }
        else { setAway(prev => ({ ...prev, squad: msg.squad })); setSubsAway(msg.subsUsed); }
      }
      if (msg.type === 'ready-halftime') {
        if (online.isHost) { setGuestReady(true); }
        else { setHostReady(true); }
      }
      if (msg.type === 'pause-game') {
        setHostReady(false);
        setGuestReady(false);
        pauseReplay();
      }
      if (msg.type === 'ready-resume') {
        if (online.isHost) { setGuestReady(true); }
        else { setHostReady(true); }
      }
      if (msg.type === 'start-simulate' && !online.isHost) {
        // Guarda de fase: um start-simulate duplicado não reinicia o 1º tempo.
        if (phaseRef.current !== 'idle') return;
        knockoutResolvedRef.current = false;
        setKnockoutResult(null);
        setSubsHome(0); setSubsAway(0); setSubWindowsHome(ZERO_SUB_WINDOWS); setSubWindowsAway(ZERO_SUB_WINDOWS); setInjuredIds([]);
        runFirstHalf(homeRef.current, awayRef.current);
      }
    };
    online.setOnData(handler);
    return () => online.setOnData(null);
  }, [online, pauseReplay, runFirstHalf, setHome, setAway, setSubsHome, setSubsAway, setSubWindowsHome, setSubWindowsAway, setInjuredIds, setKnockoutResult, knockoutResolvedRef]);

  // Reset ready states when entering halftime
  useEffect(() => {
    if (phase === 'halftime') {
      setHostReady(false);
      setGuestReady(false);
    }
  }, [phase]);

  // Auto-start second half when both ready in online mode
  useEffect(() => {
    if (!online || phase !== 'halftime') return;
    if (hostReady && guestReady) {
      runSecondHalf(home, away);
    }
  }, [online, phase, hostReady, guestReady, home, away, runSecondHalf]);

  // Auto-resume when both ready in online pause
  useEffect(() => {
    if (!online || !paused) return;
    if (hostReady && guestReady) {
      setHostReady(false);
      setGuestReady(false);
      resumeReplay();
    }
  }, [online, paused, hostReady, guestReady, resumeReplay]);

  return {
    hostReady, guestReady,
    syncStrategy, syncSquad, sendReadyHalftime, sendPauseGame, sendReadyResume,
  };
}
