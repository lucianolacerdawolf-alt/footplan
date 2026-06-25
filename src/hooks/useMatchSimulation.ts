import { useState, useEffect, useRef, useCallback } from 'react';
import type { Team, MatchResult, MatchEvent } from '../engine/types';
import { simularPrimeiroTempo, simularSegundoTempo, type MatchState } from '../engine/matchEngine';
import { cloneTeam } from '../utils/teamUtils';
import { sfx } from '../utils/audio';

const BASE_HALF_DURATION_MS = 120000;
const CLOCK_TICK_MS = 50;
const HALF_SECONDS = 45 * 60;

function combineFatigue(home: Map<string, number>, away: Map<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, v] of home) out[id] = v;
  for (const [id, v] of away) out[id] = v;
  return out;
}

export function useMatchSimulation(initialHomeId: string, speedRef?: { current: number }) {
  const getHalfDuration = () => BASE_HALF_DURATION_MS / (speedRef?.current ?? 1);
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

  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hScoreRef = useRef(0);
  const aScoreRef = useRef(0);
  const engineStateRef = useRef<MatchState | null>(null);

  useEffect(() => () => {
    if (replayRef.current) clearInterval(replayRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const startReplay = useCallback((
    events: MatchEvent[],
    halfOffsetSec: number,
    initialHomeScore: number,
    initialAwayScore: number,
    onHalftime: () => void,
    onDone: () => void
  ) => {
    if (replayRef.current) clearInterval(replayRef.current);

    const queue = [...events];
    const startTime = Date.now();
    const halfDurationMs = getHalfDuration();
    const maxSec = halfOffsetSec + HALF_SECONDS;

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
      const elapsed = Date.now() - startTime;
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

        if (evt.type === 'redCard' && evt.playerId) {
          setExpelledIds(prev => [...prev, evt.playerId!]);
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

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const { state } = simularPrimeiroTempo(cloneTeam(home), cloneTeam(away));
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
      const matchResult = simularSegundoTempo(cloneTeam(home), cloneTeam(away), engineStateRef.current!);
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

  return {
    result, simulating, replayEvents, currentEvent,
    homeScore, awayScore, showOverlay, phase, started, clockSeconds,
    fatigueMap, expelledIds, engineStateRef,
    runFirstHalf, runSecondHalf,
  };
}
