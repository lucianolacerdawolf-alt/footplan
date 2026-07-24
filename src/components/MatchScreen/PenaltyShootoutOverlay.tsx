import { useState, useCallback, useEffect, useRef } from 'react';
import type { Team, Player, PenaltyResult } from '../../engine/types';

type Corner = 'left' | 'center' | 'right';

const CORNER_LABELS: Record<Corner, string> = { left: 'Esquerda', center: 'Centro', right: 'Direita' };
const CORNERS: Corner[] = ['left', 'center', 'right'];

function randomCorner(): Corner {
  return CORNERS[Math.floor(Math.random() * CORNERS.length)];
}

interface Props {
  homeTeam: Team;
  awayTeam: Team;
  userIsHome: boolean;
  homeShooters: Player[];
  awayShooters: Player[];
  onComplete: (result: PenaltyResult) => void;
}

interface KickResult {
  teamId: string;
  scored: boolean;
  shooterCorner: Corner;
  gkCorner: Corner;
  shooterName: string;
  gkName: string;
}

type Phase = 'pick' | 'result' | 'done';

export default function PenaltyShootoutOverlay({
  homeTeam, awayTeam, userIsHome, homeShooters, awayShooters, onComplete,
}: Props) {
  const cpuTeam = userIsHome ? awayTeam : homeTeam;
  const userShooters = userIsHome ? homeShooters : awayShooters;
  const cpuShooters = userIsHome ? awayShooters : homeShooters;

  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [kicks, setKicks] = useState<KickResult[]>([]);
  const [kickIndex, setKickIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('pick');
  const [resultFlash, setResultFlash] = useState<string | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const homeScoreRef = useRef(0);
  const awayScoreRef = useRef(0);
  const kicksRef = useRef<KickResult[]>([]);

  const totalRegularKicks = 10;

  const currentIsUserKick = kickIndex % 2 === 0;
  const currentIsHomeKick = userIsHome ? currentIsUserKick : !currentIsUserKick;
  const kickPairIndex = Math.floor(kickIndex / 2);

  const currentKickTeam = currentIsHomeKick ? homeTeam : awayTeam;
  const currentShooterList = currentIsHomeKick
    ? (userIsHome ? userShooters : cpuShooters)
    : (userIsHome ? cpuShooters : userShooters);
  const currentGKList = currentIsHomeKick
    ? (userIsHome ? cpuShooters : userShooters)
    : (userIsHome ? userShooters : cpuShooters);

  const currentShooter = currentShooterList[kickPairIndex % Math.max(1, currentShooterList.length)] ?? currentShooterList[0];
  const currentGKIndex = Math.min(kickPairIndex, 1);
  const currentGK = currentGKList[currentGKIndex] ?? currentGKList[0];

  const isSuddenDeath = kickIndex >= totalRegularKicks;

  const processKick = useCallback((userCorner: Corner, cpuCorner: Corner) => {
    const scored = userCorner !== cpuCorner;

    const kickResult: KickResult = {
      teamId: currentKickTeam.id,
      scored,
      shooterCorner: currentIsUserKick ? userCorner : cpuCorner,
      gkCorner: currentIsUserKick ? cpuCorner : userCorner,
      shooterName: currentShooter?.name ?? '?',
      gkName: currentGK?.name ?? '?',
    };

    if (currentIsHomeKick) {
      if (scored) { homeScoreRef.current++; setHomeScore(homeScoreRef.current); }
    } else {
      if (scored) { awayScoreRef.current++; setAwayScore(awayScoreRef.current); }
    }

    kicksRef.current = [...kicksRef.current, kickResult];
    setKicks(kicksRef.current);
    setPhase('result');
    setResultFlash(scored ? 'GOOOL!' : 'Defendeu!');

    resultTimerRef.current = setTimeout(() => {
      setResultFlash(null);
      setPhase('done');
    }, 1500);
  }, [currentIsHomeKick, currentIsUserKick, currentKickTeam.id, currentShooter, currentGK]);

  const onDoneRef = useRef(onComplete);
  onDoneRef.current = onComplete;

  const advanceKick = useCallback(() => {
    const newIndex = kickIndex + 1;
    const currentKicks = kicksRef.current;

    if (newIndex >= totalRegularKicks) {
      let h = 0;
      let a = 0;
      for (let i = 0; i < currentKicks.length; i++) {
        if (i % 2 === 0) h += currentKicks[i].scored ? 1 : 0;
        else a += currentKicks[i].scored ? 1 : 0;
      }
      if (h !== a) {
        const result: PenaltyResult = {
          homeScore: h, awayScore: a,
          winner: h > a ? 'home' : 'away',
          kicks: currentKicks.map(k => ({ teamId: k.teamId, scored: k.scored })),
        };
        onDoneRef.current(result);
        return;
      }
    }

    setKickIndex(newIndex);
    setPhase('pick');
  }, [kickIndex, totalRegularKicks, homeTeam.id, awayTeam.id]);

  const handleUserPick = useCallback((corner: Corner) => {
    if (phase !== 'pick' || !currentIsUserKick) return;
    const cpuCorner = randomCorner();
    processKick(corner, cpuCorner);
  }, [phase, currentIsUserKick, processKick]);

  useEffect(() => {
    if (phase !== 'pick' || currentIsUserKick) return;

    cpuTimerRef.current = setTimeout(() => {
      const cpuCorner = randomCorner();
      const gkCorner = randomCorner();
      processKick(cpuCorner, gkCorner);
    }, 1000);

    return () => {
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);
    };
  }, [phase, kickIndex, currentIsUserKick, processKick]);

  useEffect(() => {
    if (phase !== 'done') return;
    advanceKick();
  }, [phase, advanceKick]);

  useEffect(() => {
    return () => {
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      if (cpuTimerRef.current) clearTimeout(cpuTimerRef.current);
    };
  }, []);

  const kickDots = kicks.map((k, i) => ({
    scored: k.scored,
    teamColor: i % 2 === 0 ? homeTeam.color : awayTeam.color,
  }));

  return (
    <div className="penalty-overlay">
      {resultFlash && (
        <div className="penalty-result-flash" style={{ color: resultFlash === 'GOOOL!' ? '#4ade80' : '#f87171' }}>
          {resultFlash}
        </div>
      )}

      <div className="penalty-score">
        <span style={{ color: homeTeam.color }}>{homeTeam.abbreviation} {homeScore}</span>
        <span style={{ opacity: 0.35 }}>×</span>
        <span style={{ color: awayTeam.color }}>{awayScore} {awayTeam.abbreviation}</span>
      </div>

      {isSuddenDeath && <div className="penalty-sudden-death">MORTE SÚBITA</div>}

      <div className="penalty-kick-history">
        {kickDots.map((d, i) => (
          <div
            key={i}
            className="penalty-kick-dot"
            style={{
              background: d.scored ? d.teamColor : 'transparent',
              border: `2px solid ${d.teamColor}`,
            }}
          />
        ))}
      </div>

      <div className="penalty-shooter" style={{ color: currentKickTeam.color }}>
        {currentShooter?.name ?? '?'} ({currentKickTeam.abbreviation})
      </div>
      <div className="penalty-gk">
        Goleiro: {currentGK?.name ?? '?'}
      </div>

      {phase === 'pick' && currentIsUserKick ? (
        <div className="penalty-corners">
          {CORNERS.map(c => (
            <button
              key={c}
              className="penalty-corner-btn"
              onClick={() => handleUserPick(c)}
            >
              {CORNER_LABELS[c]}
            </button>
          ))}
        </div>
      ) : (
        <div className="penalty-waiting">
          {phase === 'pick' ? `${cpuTeam.abbreviation} está cobrando...` : '...'}
        </div>
      )}
    </div>
  );
}
