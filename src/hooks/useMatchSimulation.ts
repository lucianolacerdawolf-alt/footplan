import { useState, useEffect, useRef, useCallback } from 'react';
import type { Team, MatchResult, MatchEvent, RandomFn } from '../engine/types';
import { beginMatchState, simularProximoBloco, buildMatchResult, type MatchState } from '../engine/matchEngine';
import { FIRST_HALF_CYCLES, TOTAL_CYCLES } from '../engine/matchConfig';
import { cloneTeam } from '../utils/teamUtils';
import type { SubWindow } from '../utils/liveMatchPersistence';

const BASE_HALF_DURATION_MS = 120000;
const CLOCK_TICK_MS = 50;
export const HALF_SECONDS = 45 * 60;

export type MatchPhase = 'idle' | 'simulating' | 'halftime' | 'done';

/** Qual das 3 janelas de pausa (pra fins de limite de substituições) a partida está
 *  em cada momento — só existem essas 3 paradas possíveis (pausa no 1º tempo, intervalo,
 *  pausa no 2º tempo), então o limite de "no máximo 3 janelas" é garantido pela própria
 *  estrutura da partida, não precisa de checagem separada. */
export function getSubWindow(phase: MatchPhase, clockSeconds: number): SubWindow {
  if (phase === 'halftime') return 'halftime';
  return clockSeconds < HALF_SECONDS ? 'firstHalfPause' : 'secondHalfPause';
}
// Multiplicador real aplicado ao tick do relógio por nível de velocidade (botões 1x-4x
// na UI). Progressão geométrica (1, 2, 4, 8) em vez de linear (1, 2, 3, 4) — cada nível
// dobra o anterior, então o 4x fica bem mais rápido do que "4 vezes mais rápido que o 1x"
// seria sob a progressão linear antiga (~15s de jogo real por tempo, contra ~30s antes).
const SPEED_MULTIPLIERS: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8 };
// Ciclos simulados por vez (2 ciclos = 4min de jogo). Simular em blocos pequenos, em vez do
// tempo inteiro de uma vez, é o que permite uma substituição feita numa pausa afetar os
// ciclos seguintes de verdade — antes, o tempo inteiro já estava calculado antes da pausa
// sequer existir, então trocar jogador na pausa não mudava nada no que já ia ser narrado.
const CHUNK_CYCLES = 2;

function combineFatigue(home: Map<string, number>, away: Map<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, v] of home) out[id] = v;
  for (const [id, v] of away) out[id] = v;
  return out;
}

export function useMatchSimulation(initialHomeId: string, speedRef?: { current: number }, rng?: RandomFn) {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [replayEvents, setReplayEvents] = useState<MatchEvent[]>([]);
  const [currentEvent, setCurrentEvent] = useState<MatchEvent | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'simulating' | 'halftime' | 'done'>('idle');
  const [started, setStarted] = useState(false);
  const [clockSeconds, setClockSeconds] = useState(0);
  const [fatigueMap, setFatigueMap] = useState<Record<string, number>>({});
  const [expelledIds, setExpelledIds] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const [isGoalPause, setIsGoalPause] = useState(false);
  const [pausesRemaining, setPausesRemaining] = useState(2);

  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hScoreRef = useRef(0);
  const aScoreRef = useRef(0);
  const engineStateRef = useRef<MatchState | null>(null);
  // Espelham o state React em refs pra `resumeReplay` (useCallback estável) sempre ler o
  // valor mais recente sem precisar recriar a função a cada mudança.
  const replayEventsRef = useRef<MatchEvent[]>([]);
  useEffect(() => { replayEventsRef.current = replayEvents; }, [replayEvents]);
  const clockSecondsRef = useRef(0);
  useEffect(() => { clockSecondsRef.current = clockSeconds; }, [clockSeconds]);
  const rngRef = useRef(rng);
  rngRef.current = rng;
  const pausedRef = useRef(false);
  const injuryCbRef = useRef<((playerId: string) => void) | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Elenco/tática "ao vivo" — atualizado a cada substituição/troca de tática feita durante
  // uma pausa, pra que o PRÓXIMO bloco simulado (ainda não calculado) já reflita a mudança.
  const liveHomeRef = useRef<Team | null>(null);
  const liveAwayRef = useRef<Team | null>(null);
  const isFirstHalfRef = useRef(true);
  const nextCycleRef = useRef(0);

  const updateLiveTeams = useCallback((home: Team, away: Team) => {
    liveHomeRef.current = home;
    liveAwayRef.current = away;
  }, []);

  /** Simula o próximo bloco de ciclos usando o elenco/tática mais recentes. Retorna null
   *  quando o tempo atual já foi todo simulado (nada mais a gerar). */
  const produceMoreEvents = useCallback((): MatchEvent[] | null => {
    const state = engineStateRef.current;
    const home = liveHomeRef.current;
    const away = liveAwayRef.current;
    if (!state || !home || !away) return null;
    const isFirstHalf = isFirstHalfRef.current;
    const halfEnd = isFirstHalf ? FIRST_HALF_CYCLES : TOTAL_CYCLES;
    if (nextCycleRef.current >= halfEnd) return null;
    const toCycle = Math.min(halfEnd, nextCycleRef.current + CHUNK_CYCLES);
    const events = simularProximoBloco(home, away, state, nextCycleRef.current, toCycle, isFirstHalf, rngRef.current ?? Math.random);
    nextCycleRef.current = toCycle;
    return events;
  }, []);
  const produceMoreRef = useRef(produceMoreEvents);
  produceMoreRef.current = produceMoreEvents;

  useEffect(() => () => {
    if (replayRef.current) clearInterval(replayRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const pauseReplay = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const consumePause = useCallback((): boolean => {
    if (pausesRemaining <= 0) return false;
    setPausesRemaining(p => p - 1);
    pauseReplay();
    return true;
  }, [pausesRemaining, pauseReplay]);

  const resetPauses = useCallback(() => {
    setPausesRemaining(1);
  }, []);

  const startReplay = useCallback((
    events: MatchEvent[],
    halfOffsetSec: number,
    initialHomeScore: number,
    initialAwayScore: number,
    onHalftime: () => void,
    onDone: () => void,
    /** Segundos já percorridos dentro do tempo atual — usado só ao retomar uma sessão
     *  restaurada (F5) no meio de um tempo, pra não reiniciar o relógio do zero. */
    initialElapsedInHalfSec = 0,
    /** Eventos já mostrados antes da restauração — preserva o histórico na cronologia
     *  em vez de zerar `replayEvents` (só relevante numa retomada pós-F5). */
    priorReplayEvents: MatchEvent[] = [],
  ) => {
    if (replayRef.current) clearInterval(replayRef.current);
    pausedRef.current = false;
    setPaused(false);

    const queue = [...events];
    const maxSec = halfOffsetSec + HALF_SECONDS;
    const baseDuration = BASE_HALF_DURATION_MS;
    const clampedElapsed = Math.min(HALF_SECONDS, Math.max(0, initialElapsedInHalfSec));
    let pauseAccumMs = (clampedElapsed / HALF_SECONDS) * baseDuration;

    hScoreRef.current = initialHomeScore;
    aScoreRef.current = initialAwayScore;
    setHomeScore(initialHomeScore);
    setAwayScore(initialAwayScore);
    setReplayEvents(priorReplayEvents);
    setClockSeconds(halfOffsetSec + clampedElapsed);

    if (priorReplayEvents.length === 0 && queue.length > 0 && queue[0].minute * 60 <= halfOffsetSec + 1) {
      const kickoff = queue.shift()!;
      setCurrentEvent(kickoff);
      setReplayEvents([kickoff]);
    }

    replayRef.current = setInterval(() => {
      if (pausedRef.current) {
        pauseAccumMs += CLOCK_TICK_MS;
        return;
      }

      const speed = speedRef?.current ?? 1;
      pauseAccumMs += CLOCK_TICK_MS * (SPEED_MULTIPLIERS[speed] ?? speed);
      const inGameSec = Math.min(HALF_SECONDS, Math.floor((pauseAccumMs / baseDuration) * HALF_SECONDS));
      const effectiveSec = halfOffsetSec + inGameSec;

      setClockSeconds(effectiveSec);

      if (queue.length === 0) {
        const more = produceMoreRef.current();
        if (more && more.length > 0) queue.push(...more);
      }

      if (queue.length > 0 && queue[0].minute * 60 <= effectiveSec) {
        const evt = queue.shift()!;

        if (evt.type === 'halftime') {
          setCurrentEvent(evt);
          setReplayEvents(prev => [...prev, evt]);
          if (replayRef.current) { clearInterval(replayRef.current); replayRef.current = null; }
          setPhase('halftime');
          setSimulating(false);
          setClockSeconds(maxSec);
          onHalftime();
          return;
        }

        if (evt.type === 'fulltime') {
          setCurrentEvent(evt);
          setReplayEvents(prev => [...prev, evt]);
          if (replayRef.current) { clearInterval(replayRef.current); replayRef.current = null; }
          setClockSeconds(maxSec);
          onDone();
          return;
        }

        if (evt.type === 'goal') {
          if (evt.teamId === initialHomeId) { hScoreRef.current++; setHomeScore(hScoreRef.current); }
          else { aScoreRef.current++; setAwayScore(aScoreRef.current); }
          pausedRef.current = true;
          setPaused(true);
          setIsGoalPause(true);
          setTimeout(() => {
            if (mountedRef.current && replayRef.current) {
              pausedRef.current = false;
              setPaused(false);
              setIsGoalPause(false);
            }
          }, 2500);
        }

        if (evt.type === 'penalty' && evt.scorer) {
          if (evt.description.includes('⚽')) {
            if (evt.teamId === initialHomeId) { hScoreRef.current++; setHomeScore(hScoreRef.current); }
            else { aScoreRef.current++; setAwayScore(aScoreRef.current); }
            pausedRef.current = true;
            setPaused(true);
            setIsGoalPause(true);
            setTimeout(() => {
              if (mountedRef.current && replayRef.current) {
                pausedRef.current = false;
                setPaused(false);
                setIsGoalPause(false);
              }
            }, 2500);
          }
        }

        if (evt.type === 'redCard' && evt.playerId) {
          setExpelledIds(prev => [...prev, evt.playerId!]);
        }

        if (evt.type === 'injury' && evt.playerId) {
          injuryCbRef.current?.(evt.playerId);
        }

        setCurrentEvent(evt);
        setReplayEvents(prev => [...prev, evt]);
      }

      if (inGameSec >= HALF_SECONDS) {
        if (replayRef.current) { clearInterval(replayRef.current); replayRef.current = null; }
        setClockSeconds(maxSec);
        onDone();
      }
    }, CLOCK_TICK_MS);
  }, [initialHomeId, speedRef]);

  /**
   * Retoma a partida. Se o interval de replay ainda existir (pausa normal dentro da
   * mesma sessão), só destrava. Se não existir (sessão restaurada após F5 — ver
   * `restoreSnapshot`), recria o replay a partir do que já foi simulado, usando o
   * elenco/tática atuais (`home`/`away`) — obrigatório nesse segundo caso.
   */
  const resumeReplay = useCallback((home?: Team, away?: Team) => {
    if (replayRef.current) {
      pausedRef.current = false;
      setPaused(false);
      return;
    }
    const state = engineStateRef.current;
    if (!home || !away || !state) {
      pausedRef.current = false;
      setPaused(false);
      return;
    }
    liveHomeRef.current = home;
    liveAwayRef.current = away;
    const isFirstHalf = isFirstHalfRef.current;
    const halfOffsetSec = isFirstHalf ? 0 : HALF_SECONDS;
    const elapsed = clockSecondsRef.current - halfOffsetSec;
    const shown = replayEventsRef.current;
    const remaining = state.events.slice(shown.length);
    setSimulating(true);
    setPhase('simulating');

    if (isFirstHalf) {
      startReplay(remaining, 0, hScoreRef.current, aScoreRef.current, () => {}, () => {}, elapsed, shown);
    } else {
      startReplay(
        remaining, HALF_SECONDS, hScoreRef.current, aScoreRef.current,
        () => {},
        () => {
          setSimulating(false);
          setPhase('done');
          setShowOverlay(true);
          const finalHome = liveHomeRef.current ?? home;
          const finalAway = liveAwayRef.current ?? away;
          const matchResult = buildMatchResult(finalHome, finalAway, state);
          setResult(matchResult);
          setHomeScore(matchResult.homeScore);
          setAwayScore(matchResult.awayScore);
        },
        elapsed, shown,
      );
    }
  }, [startReplay]);

  /**
   * Restaura uma partida ao vivo salva (F5) — sempre aterrissa em estado pausado,
   * mesmo que não estivesse pausada no momento do save. Retomar de verdade (recriar o
   * replay) acontece só quando o usuário clica em "Retomar" (ver `resumeReplay` acima).
   */
  const restoreSnapshot = useCallback((snap: {
    phase: 'idle' | 'simulating' | 'halftime' | 'done';
    isFirstHalf: boolean;
    nextCycle: number;
    clockSeconds: number;
    homeScore: number;
    awayScore: number;
    replayEvents: MatchEvent[];
    fatigueMap: Record<string, number>;
    expelledIds: string[];
    pausesRemaining: number;
    engineState: MatchState | null;
  }) => {
    if (replayRef.current) clearInterval(replayRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    engineStateRef.current = snap.engineState;
    isFirstHalfRef.current = snap.isFirstHalf;
    nextCycleRef.current = snap.nextCycle;
    hScoreRef.current = snap.homeScore;
    aScoreRef.current = snap.awayScore;
    replayEventsRef.current = snap.replayEvents;
    clockSecondsRef.current = snap.clockSeconds;

    setStarted(snap.phase !== 'idle');
    setSimulating(snap.phase === 'simulating');
    setPhase(snap.phase);
    setClockSeconds(snap.clockSeconds);
    setHomeScore(snap.homeScore);
    setAwayScore(snap.awayScore);
    setReplayEvents(snap.replayEvents);
    setCurrentEvent(snap.replayEvents.length > 0 ? snap.replayEvents[snap.replayEvents.length - 1] : null);
    setFatigueMap(snap.fatigueMap);
    setExpelledIds(snap.expelledIds);
    setPausesRemaining(snap.pausesRemaining);
    setResult(null);
    setShowOverlay(false);

    // Só o meio de um tempo (não intervalo, não fim) precisa aterrissar pausado — nos
    // outros casos `paused` não é usado pela UI.
    const shouldPause = snap.phase === 'simulating';
    pausedRef.current = shouldPause;
    setPaused(shouldPause);
    setIsGoalPause(false);
  }, []);

  const runFirstHalf = useCallback((home: Team, away: Team) => {
    if (replayRef.current) clearInterval(replayRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSimulating(true);
    setStarted(true);
    setResult(null);
    setReplayEvents([]);
    setCurrentEvent(null);
    setHomeScore(0);
    setAwayScore(0);
    setShowOverlay(false);
    setPhase('simulating');
    setClockSeconds(0);
    setFatigueMap({});
    setExpelledIds([]);
    setPausesRemaining(2);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const clonedHome = cloneTeam(home, true);
      const clonedAway = cloneTeam(away, true);
      liveHomeRef.current = clonedHome;
      liveAwayRef.current = clonedAway;
      isFirstHalfRef.current = true;
      nextCycleRef.current = 0;

      const state = beginMatchState(clonedHome, clonedAway, rngRef.current);
      engineStateRef.current = state;
      setFatigueMap(combineFatigue(state.fatigueHome, state.fatigueAway));

      const firstChunk = simularProximoBloco(clonedHome, clonedAway, state, 0, CHUNK_CYCLES, true, rngRef.current ?? Math.random);
      nextCycleRef.current = Math.min(FIRST_HALF_CYCLES, CHUNK_CYCLES);

      startReplay(firstChunk, 0, 0, 0, () => {}, () => {});
    }, 150);
  }, [startReplay]);

  const runSecondHalf = useCallback((home: Team, away: Team) => {
    if (!engineStateRef.current) return;

    setPausesRemaining(1);
    const firstHalfHome = engineStateRef.current.homeScore;
    const firstHalfAway = engineStateRef.current.awayScore;

    if (replayRef.current) clearInterval(replayRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSimulating(true);
    setPhase('simulating');
    setClockSeconds(HALF_SECONDS);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const clonedHome = cloneTeam(home, true);
      const clonedAway = cloneTeam(away, true);
      liveHomeRef.current = clonedHome;
      liveAwayRef.current = clonedAway;
      isFirstHalfRef.current = false;

      const state = engineStateRef.current!;
      const firstChunkTo = Math.min(TOTAL_CYCLES, FIRST_HALF_CYCLES + CHUNK_CYCLES);
      const firstChunk = simularProximoBloco(clonedHome, clonedAway, state, FIRST_HALF_CYCLES, firstChunkTo, false, rngRef.current ?? Math.random);
      nextCycleRef.current = firstChunkTo;
      setFatigueMap(combineFatigue(state.fatigueHome, state.fatigueAway));

      startReplay(
        firstChunk, HALF_SECONDS, firstHalfHome, firstHalfAway,
        () => {},
        () => {
          setSimulating(false);
          setPhase('done');
          setShowOverlay(true);
          const finalHome = liveHomeRef.current ?? clonedHome;
          const finalAway = liveAwayRef.current ?? clonedAway;
          const matchResult = buildMatchResult(finalHome, finalAway, state);
          setResult(matchResult);
          setHomeScore(matchResult.homeScore);
          setAwayScore(matchResult.awayScore);
        }
      );
    }, 150);
  }, [startReplay]);

  const setInjuryCallback = useCallback((cb: ((playerId: string) => void) | null) => {
    injuryCbRef.current = cb;
  }, []);

  const skipToEnd = useCallback(() => {
    if (!engineStateRef.current || phase === 'done' || phase === 'idle') return;
    if (replayRef.current) clearInterval(replayRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const home = liveHomeRef.current;
    const away = liveAwayRef.current;
    if (!home || !away) return;
    const matchResult = buildMatchResult(home, away, engineStateRef.current);
    setResult(matchResult);
    setSimulating(false);
    setPhase('done');
    setHomeScore(matchResult.homeScore);
    setAwayScore(matchResult.awayScore);
    setShowOverlay(true);
    setPaused(false);
    setIsGoalPause(false);
    setClockSeconds(HALF_SECONDS + (nextCycleRef.current >= FIRST_HALF_CYCLES ? HALF_SECONDS : 0));
  }, [phase]);

  return {
    result, simulating, replayEvents, currentEvent,
    homeScore, awayScore, showOverlay, phase, started, clockSeconds,
    fatigueMap, expelledIds, engineStateRef, isFirstHalfRef, nextCycleRef,
    runFirstHalf, runSecondHalf, updateLiveTeams, restoreSnapshot,
    paused, isGoalPause, pauseReplay, resumeReplay, consumePause, pausesRemaining, resetPauses, setInjuryCallback,
    skipToEnd,
  };
}
