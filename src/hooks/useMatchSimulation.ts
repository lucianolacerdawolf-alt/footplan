import { useState, useEffect, useRef, useCallback } from 'react';
import type { Team, MatchResult, MatchEvent, RandomFn } from '../engine/types';
import { simularPrimeiroTempo, simularSegundoTempo, type MatchState } from '../engine/matchEngine';
import { cloneTeam } from '../utils/teamUtils';
import { sfx } from '../utils/audio';

const BASE_HALF_DURATION_MS = 120000;
const SPEED_DURATIONS: Record<number, number> = {
  1: 120000,   // 2 min
  2: 90000,    // 1 min 30s
  3: 60000,    // 1 min
  4: 45000,    // 45s
};
const CLOCK_TICK_MS = 50;
const HALF_SECONDS = 45 * 60;

function combineFatigue(home: Map<string, number>, away: Map<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, v] of home) out[id] = v;
  for (const [id, v] of away) out[id] = v;
  return out;
}

export function useMatchSimulation(initialHomeId: string, speedRef?: { current: number }, rng?: RandomFn) {
  const getHalfDuration = () => SPEED_DURATIONS[speedRef?.current ?? 1] ?? BASE_HALF_DURATION_MS;
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

  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hScoreRef = useRef(0);
  const aScoreRef = useRef(0);
  const engineStateRef = useRef<MatchState | null>(null);
  const rngRef = useRef(rng);
  rngRef.current = rng;
  const pausedRef = useRef(false);
  const injuryCbRef = useRef<((playerId: string) => void) | null>(null);

  useEffect(() => () => {
    if (replayRef.current) clearInterval(replayRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const pauseReplay = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const resumeReplay = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
  }, []);

  const startReplay = useCallback((
    events: MatchEvent[],
    halfOffsetSec: number,
    initialHomeScore: number,
    initialAwayScore: number,
    onHalftime: () => void,
    onDone: () => void,
  ) => {
    if (replayRef.current) clearInterval(replayRef.current);
    pausedRef.current = false;
    setPaused(false);

    const queue = [...events];
    const startTime = Date.now();
    const halfDurationMs = getHalfDuration();
    const maxSec = halfOffsetSec + HALF_SECONDS;
    let pauseAccumMs = 0;

    hScoreRef.current = initialHomeScore;
    aScoreRef.current = initialAwayScore;
    setHomeScore(initialHomeScore);
    setAwayScore(initialAwayScore);
    setReplayEvents([]);
    setClockSeconds(halfOffsetSec);

    if (queue.length > 0 && queue[0].minute * 60 <= halfOffsetSec + 1) {
      const kickoff = queue.shift()!;
      setCurrentEvent(kickoff);
      setReplayEvents([kickoff]);
    }

    replayRef.current = setInterval(() => {
      if (pausedRef.current) {
        pauseAccumMs += CLOCK_TICK_MS;
        return;
      }

      const elapsed = Date.now() - startTime - pauseAccumMs;
      const inGameSec = Math.min(HALF_SECONDS, Math.floor((elapsed / halfDurationMs) * HALF_SECONDS));
      const effectiveSec = halfOffsetSec + inGameSec;

      setClockSeconds(effectiveSec);

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
          sfx.whistleEnd();
          onDone();
          return;
        }

        if (evt.type === 'goal') {
          if (evt.teamId === initialHomeId) { hScoreRef.current++; setHomeScore(hScoreRef.current); }
          else { aScoreRef.current++; setAwayScore(aScoreRef.current); }
          sfx.goal();
        }

        if (evt.type === 'foul') {
          sfx.foulWhistle();
        }

        if (evt.type === 'post') {
          sfx.postHit();
        }

        if (evt.type === 'miss' || evt.type === 'save') {
          sfx.nearMiss();
        }

        if (evt.type === 'yellowCard' || evt.type === 'redCard') {
          sfx.cardReaction();
        }

        if (evt.type === 'penalty' && evt.scorer) {
          if (evt.description.includes('⚽')) {
            if (evt.teamId === initialHomeId) { hScoreRef.current++; setHomeScore(hScoreRef.current); }
            else { aScoreRef.current++; setAwayScore(aScoreRef.current); }
            sfx.goal();
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

      if (elapsed >= halfDurationMs) {
        if (replayRef.current) { clearInterval(replayRef.current); replayRef.current = null; }
        setClockSeconds(maxSec);
        onDone();
      }
    }, CLOCK_TICK_MS);
  }, [initialHomeId]);

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
    sfx.whistleStart();
    sfx.crowdMurmur();

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const { state } = simularPrimeiroTempo(cloneTeam(home), cloneTeam(away), rngRef.current);
      engineStateRef.current = state;
      setFatigueMap(combineFatigue(state.fatigueHome, state.fatigueAway));

      startReplay([...state.events], 0, state.homeScore, state.awayScore, () => {}, () => {});
    }, 150);
  }, [startReplay]);

  const runSecondHalf = useCallback((home: Team, away: Team) => {
    if (!engineStateRef.current) return;

    const firstHalfHome = engineStateRef.current.homeScore;
    const firstHalfAway = engineStateRef.current.awayScore;

    if (replayRef.current) clearInterval(replayRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSimulating(true);
    setPhase('simulating');
    setClockSeconds(HALF_SECONDS);

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const matchResult = simularSegundoTempo(cloneTeam(home), cloneTeam(away), engineStateRef.current!, rngRef.current);
      setResult(matchResult);
      setFatigueMap(combineFatigue(engineStateRef.current!.fatigueHome, engineStateRef.current!.fatigueAway));

      const halfIdx = matchResult.events.findLastIndex(e => e.type === 'kickoff' && e.minute === 45);
      const secondHalfEvents = halfIdx >= 0 ? matchResult.events.slice(halfIdx) : matchResult.events;

      startReplay(
        secondHalfEvents, HALF_SECONDS, firstHalfHome, firstHalfAway,
        () => {},
        () => {
          setSimulating(false);
          setPhase('done');
          setShowOverlay(true);
          setHomeScore(matchResult.homeScore);
          setAwayScore(matchResult.awayScore);
        }
      );
    }, 150);
  }, [startReplay]);

  const setInjuryCallback = useCallback((cb: ((playerId: string) => void) | null) => {
    injuryCbRef.current = cb;
  }, []);

  return {
    result, simulating, replayEvents, currentEvent,
    homeScore, awayScore, showOverlay, phase, started, clockSeconds,
    fatigueMap, expelledIds, engineStateRef,
    runFirstHalf, runSecondHalf,
    paused, pauseReplay, resumeReplay, setInjuryCallback,
  };
}
