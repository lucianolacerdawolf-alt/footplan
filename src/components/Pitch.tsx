import { useMemo, useEffect, useRef } from 'react';
import type { Team, MatchEvent } from '../engine/types';
import {
  buildBaseCoords,
  buildSteeringPlayers,
  updatePlayers,
  type SteeringPlayer,
  type PlayerCoord,
} from '../engine/steering';

interface Props {
  homeTeam: Team;
  awayTeam: Team;
  currentEvent: MatchEvent | null;
  phase: 'idle' | 'simulating' | 'done';
  result: {
    homeScore: number; awayScore: number;
    homePossession: number; awayPossession: number;
    shots: number; goals: number;
  } | null;
  halftime: {
    homeScore: number; awayScore: number;
  } | null;
  fatigueMap?: Record<string, number>;
  expelledIds?: string[];
}

// ---------------------------------------------------------------------------
// Hash determinístico
// ---------------------------------------------------------------------------
function seed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return (h & 0xffff) / 0xffff;
}

// ---------------------------------------------------------------------------
// Portador da bola
// ---------------------------------------------------------------------------
function getBallCarrier(
  event: MatchEvent | null,
  homeTeamId: string,
  allPlayers: PlayerCoord[]
): PlayerCoord | null {
  if (!event || !event.teamId) return null;

  const teamPlayers = allPlayers.filter(p => {
    const isHome = p.team === 'home';
    return event.teamId === homeTeamId ? isHome : !isHome;
  });
  if (teamPlayers.length === 0) return null;

  const s = seed(event.description + 'carrier');

  switch (event.type) {
    case 'possession': {
      const mids = teamPlayers.filter(p => p.position === 'MID' || p.position === 'FWD');
      return mids.length > 0 ? mids[Math.floor(s * mids.length)] : teamPlayers[0];
    }
    case 'attack': {
      const fwds = teamPlayers.filter(p => p.position === 'FWD');
      if (fwds.length > 0) {
        const isHome = teamPlayers[0].team === 'home';
        return isHome
          ? fwds.reduce((a, b) => a.x > b.x ? a : b)
          : fwds.reduce((a, b) => a.x < b.x ? a : b);
      }
      return teamPlayers[Math.floor(s * teamPlayers.length)];
    }
    case 'goal':
    case 'miss':
    case 'post': {
      const fwds2 = teamPlayers.filter(p => p.position === 'FWD');
      if (fwds2.length > 0) {
        const isHome2 = teamPlayers[0].team === 'home';
        return isHome2
          ? fwds2.reduce((a, b) => a.x > b.x ? a : b)
          : fwds2.reduce((a, b) => a.x < b.x ? a : b);
      }
      return teamPlayers[0];
    }
    case 'save': {
      const gk = allPlayers.find(p => p.position === 'GK' && (
        (p.team === 'home' && event.teamId !== homeTeamId) ||
        (p.team === 'away' && event.teamId === homeTeamId)
      ));
      return gk ?? null;
    }
    default:
      return teamPlayers[Math.floor(s * teamPlayers.length)];
  }
}

// ---------------------------------------------------------------------------
// Posição da bola a partir do portador
// ---------------------------------------------------------------------------
function ballPos(
  event: MatchEvent | null,
  carrierId: string | null,
  players: Map<string, SteeringPlayer>,
  homeTeamId: string,
  eventSeed: number
): { x: number; y: number; visible: boolean } {
  if (!event) return { x: 60, y: 35, visible: true };

  const r = eventSeed;
  const isHome = event.teamId === homeTeamId;

  const carrier = carrierId ? players.get(carrierId) : null;
  const cx = carrier?.x ?? 60;
  const cy = carrier?.y ?? 35;

  switch (event.type) {
    case 'kickoff':
      return { x: 60, y: 35, visible: true };
    case 'possession':
    case 'attack':
      if (carrier) {
        const dir = isHome ? 1.5 : -1.5;
        return { x: cx + dir + (r - 0.5), y: cy + (r - 0.5) * 0.8, visible: true };
      }
      return { x: 60, y: 35, visible: true };
    case 'goal':
    case 'miss':
    case 'post':
      if (carrier) {
        const shotDir = isHome ? 1 : -1;
        const sx = cx + shotDir * (6 + r * 10);
        const sy = cy + (r - 0.5) * 6;
        return { x: isHome ? Math.min(sx, 114) : Math.max(sx, 6), y: Math.max(8, Math.min(62, sy)), visible: true };
      }
      return { x: isHome ? 100 : 20, y: 35, visible: true };
    case 'save':
      return { x: isHome ? 108 : 12, y: 33 + (r - 0.5) * 8, visible: true };
    case 'halftime':
    case 'fulltime':
      return { x: 60, y: 35, visible: false };
    default:
      return { x: 60, y: 35, visible: true };
  }
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function Pitch({ homeTeam, awayTeam, currentEvent, phase, result, halftime, fatigueMap, expelledIds }: Props) {
  const expelledSet = useMemo(() => new Set(expelledIds ?? []), [expelledIds]);
  // Coordenadas base
  const homeBase = useMemo(() => buildBaseCoords(homeTeam, 'home'), [homeTeam.id, homeTeam.strategy.formation]);
  const awayBase = useMemo(() => buildBaseCoords(awayTeam, 'away'), [awayTeam.id, awayTeam.strategy.formation]);

  // Estado mutável dos jogadores (steering)
  const playersRef = useRef<Map<string, SteeringPlayer>>(new Map());
  const carriersRef = useRef<PlayerCoord[]>([]);
  const ballRef = useRef({ x: 60, y: 35, visible: true });
  const svgElsRef = useRef<Map<string, SVGGElement>>(new Map());
  const ballElRef = useRef<SVGCircleElement | null>(null);
  const rafRef = useRef<number>(0);
  const carrierIdRef = useRef<string | null>(null);
  const carrierTimerRef = useRef<number>(0);
  const ballTravelRef = useRef<{ srcX: number; srcY: number; dstX: number; dstY: number; t: number } | null>(null);
  const homeTeamRef = useRef(homeTeam);
  const awayTeamRef = useRef(awayTeam);
  const eventRef = useRef(currentEvent);
  const expelledSetRef = useRef(expelledSet);
  homeTeamRef.current = homeTeam;
  awayTeamRef.current = awayTeam;
  eventRef.current = currentEvent;
  expelledSetRef.current = expelledSet;

  const eventId = currentEvent ? currentEvent.minute + '|' + currentEvent.type + '|' + currentEvent.description : '';
  const eventSeed = useMemo(() => seed(eventId), [eventId]);

  const isGoal = currentEvent?.type === 'goal' && phase !== 'done';
  const goalTeamId = isGoal ? currentEvent!.teamId : null;

  // Inicializa/reinicia jogadores quando times ou formação mudam
  useEffect(() => {
    const coords = [...homeBase, ...awayBase];
    carriersRef.current = coords.map(c => ({ ...c }));
    playersRef.current = buildSteeringPlayers(coords);
    ballRef.current = { x: 60, y: 35, visible: true };
  }, [homeBase, awayBase]);

  // Aplica fadiga do engine aos steering players quando muda (início do 2º tempo)
  useEffect(() => {
    if (!fatigueMap) return;
    for (const [id, p] of playersRef.current) {
      const f = fatigueMap[id];
      if (f !== undefined) p.fatigue = f;
    }
  }, [fatigueMap]);

  // Game loop com requestAnimationFrame
  useEffect(() => {
    const running = phase === 'simulating';
    if (!running) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const players = playersRef.current;
      const home = homeTeamRef.current;
      const away = awayTeamRef.current;
      const event = eventRef.current;

      const hasPoss = event?.teamId !== null && event?.teamId !== undefined;
      const homeHasBall = hasPoss && event!.teamId === home.id;
      const awayHasBall = hasPoss && event!.teamId !== home.id;

      const defLine = (v: string) => v === 'high' ? 1.5 : v === 'low' ? -1.5 : 0;
      const width = (v: string) => v === 'wide' ? 1.3 : v === 'narrow' ? 0.7 : 1.0;

      const active = [...players.values()].filter(p => p.position !== 'GK' && !expelledSetRef.current.has(p.id));

      updatePlayers(
        players, active, event,
        homeHasBall, awayHasBall,
        home.strategy.mentality, away.strategy.mentality,
        defLine(home.strategy.defensiveLine), defLine(away.strategy.defensiveLine),
        width(home.strategy.width), width(away.strategy.width)
      );

      // Sincroniza DOM
      for (const [id, p] of players) {
        const el = svgElsRef.current.get(id);
        if (el) {
          el.setAttribute('transform', `translate(${(p.x - (p.baseX)).toFixed(2)},${(p.y - (p.baseY)).toFixed(2)})`);
        }
      }

      // Bola — rotaciona portador e anima passes
      carrierTimerRef.current += dt;
      const prevCarrierId = carrierIdRef.current;
      let carrier: PlayerCoord | null = null;
      if (event && event.teamId && (event.type === 'possession' || event.type === 'attack' || event.type === 'pass')) {
        const isHome = event.teamId === home.id;
        const eligible = carriersRef.current.filter(p => {
          const match = isHome ? p.team === 'home' : p.team === 'away';
          return match && (p.position === 'MID' || p.position === 'FWD');
        });
        if (eligible.length > 0) {
          if (!carrierIdRef.current || carrierTimerRef.current > 0.8) {
            const oldCarrier = carrierIdRef.current ? players.get(carrierIdRef.current) : null;
            const newId = eligible[Math.floor(Math.random() * eligible.length)].id;
            carrierIdRef.current = newId;
            carrierTimerRef.current = 0;
            // Anima passagem da bola
            if (oldCarrier) {
              const newCarrier = players.get(newId);
              if (newCarrier) {
                ballTravelRef.current = {
                  srcX: oldCarrier.x, srcY: oldCarrier.y,
                  dstX: newCarrier.x, dstY: newCarrier.y,
                  t: 0,
                };
              }
            }
          }
          carrier = carriersRef.current.find(p => p.id === carrierIdRef.current) ?? eligible[0];
        }
      } else if (event) {
        carrier = getBallCarrier(event, home.id, carriersRef.current);
        if (carrier && carrier.id !== prevCarrierId) {
          const oldCarrier = prevCarrierId ? players.get(prevCarrierId) : null;
          const newCarrier = players.get(carrier.id);
          if (oldCarrier && newCarrier) {
            ballTravelRef.current = {
              srcX: oldCarrier.x, srcY: oldCarrier.y,
              dstX: newCarrier.x, dstY: newCarrier.y,
              t: 0,
            };
          }
        }
        carrierIdRef.current = carrier?.id ?? null;
        carrierTimerRef.current = 0;
      } else {
        carrierIdRef.current = null;
        carrierTimerRef.current = 0;
      }

      // Posição da bola com animação de passe
      const b = ballPos(event, carrier?.id ?? null, players, home.id, eventSeed);
      const travel = ballTravelRef.current;
      if (travel && travel.t < 1) {
        travel.t += dt * 3; // ~333ms de animação
        const t = Math.min(1, travel.t);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
        const bx = travel.srcX + (travel.dstX - travel.srcX) * ease;
        const by = travel.srcY + (travel.dstY - travel.srcY) * ease;
        ballRef.current = { x: bx, y: by, visible: true };
        if (t >= 1) ballTravelRef.current = null;
      } else {
        ballRef.current = b;
      }
      if (ballElRef.current) {
        ballElRef.current.setAttribute('cx', ballRef.current.x.toFixed(2));
        ballElRef.current.setAttribute('cy', ballRef.current.y.toFixed(2));
        ballElRef.current.setAttribute('visibility', ballRef.current.visible ? 'visible' : 'hidden');
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, eventSeed, homeTeam.id]);

  // Limpa no unmount
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // Renderiza um jogador (SVG estático + ref para posicionamento dinâmico)
  const renderPlayer = (p: PlayerCoord) => {
    const gradId = `grad-${p.team}`;
    return (
      <g key={p.id}
         ref={(el) => { if (el) svgElsRef.current.set(p.id, el); }}
         className={`player-group ${phase === 'idle' ? 'idle-sway' : ''}`}
         style={{ transformOrigin: `${p.x}px ${p.y}px` }}>
        <circle cx={p.x} cy={p.y} r="3"
          fill={p.position === 'GK' ? 'url(#gkGrad)' : `url(#${gradId})`}
          stroke="#fff" strokeWidth="0.22" filter="url(#glow)" />
        <text x={p.x} y={p.y + 0.55} textAnchor="middle" fill="#fff"
          fontSize="1.4" fontWeight="bold" fontFamily="system-ui">{p.number}</text>
      </g>
    );
  };

  return (
    <div className="pitch-wrapper">
      <svg viewBox="0 0 120 70" className="pitch-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="grass" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#2d8a3e" /><stop offset="100%" stopColor="#1a5c28" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="shadow">
            <feDropShadow dx="0.2" dy="0.3" stdDeviation="0.6" floodOpacity="0.4" />
          </filter>
          <radialGradient id="grad-home" cx="35%" cy="30%">
            <stop offset="0%" stopColor={homeTeam.color} stopOpacity="1" />
            <stop offset="100%" stopColor={homeTeam.color} stopOpacity="0.65" />
          </radialGradient>
          <radialGradient id="grad-away" cx="35%" cy="30%">
            <stop offset="0%" stopColor={awayTeam.color} stopOpacity="1" />
            <stop offset="100%" stopColor={awayTeam.color} stopOpacity="0.65" />
          </radialGradient>
          <radialGradient id="gkGrad" cx="35%" cy="30%">
            <stop offset="0%" stopColor="#facc15" /><stop offset="100%" stopColor="#d97706" />
          </radialGradient>
        </defs>

        {/* Gramado */}
        <rect x="0" y="0" width="120" height="70" fill="url(#grass)" rx="1.5" />
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={`s-${i}`} x={i * 10} y="0" width="10" height="70"
            fill={i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)'} />
        ))}

        {/* Linhas */}
        <rect x="1.5" y="1.5" width="117" height="67" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.22" />
        <line x1="60" y1="1.5" x2="60" y2="68.5" stroke="rgba(255,255,255,0.75)" strokeWidth="0.22" />
        <circle cx="60" cy="35" r="8" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.22" />
        <circle cx="60" cy="35" r="0.7" fill="rgba(255,255,255,0.75)" />

        {/* Área esquerda */}
        <rect x="1.5" y="12" width="16" height="46" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.18" />
        <rect x="1.5" y="23" width="6" height="24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.13" />
        <rect x="0" y="30" width="2" height="10" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.85)" strokeWidth="0.25" rx="0.3" />
        <circle cx="6" cy="35" r="0.4" fill="rgba(255,255,255,0.5)" />

        {/* Área direita */}
        <rect x="102.5" y="12" width="16" height="46" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.18" />
        <rect x="112.5" y="23" width="6" height="24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.13" />
        <rect x="118" y="30" width="2" height="10" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.85)" strokeWidth="0.25" rx="0.3" />
        <circle cx="114" cy="35" r="0.4" fill="rgba(255,255,255,0.5)" />

        {/* Escanteios */}
        {[[1.5,1.5],[118.5,1.5],[1.5,68.5],[118.5,68.5]].map(([cx,cy], i) => (
          <circle key={`c-${i}`} cx={cx} cy={cy} r="0.4" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.12" />
        ))}

        {/* Flash do gol */}
        {isGoal && (
          <>
            <circle cx={goalTeamId === homeTeam.id ? 119 : 1} cy={35} r="4"
              fill="rgba(255,255,100,0.35)" className="goal-flash" />
            <text x="60" y="32" textAnchor="middle" fill="#FFD700" fontSize="14"
              fontWeight="900" fontFamily="system-ui" className="goal-text"
              stroke="#fff" strokeWidth="0.5" paintOrder="stroke">
              GOL!
            </text>
          </>
        )}

        {/* Jogadores */}
        {phase !== 'done' && (
          <>
            {homeBase.filter(p => !expelledSet.has(p.id)).map(renderPlayer)}
            {awayBase.filter(p => !expelledSet.has(p.id)).map(renderPlayer)}

            {/* Bola */}
            <g filter="url(#shadow)">
              <circle ref={ballElRef} cx="60" cy="35" r="1.3" fill="#fefefe"
                stroke="#ccc" strokeWidth="0.12" className="ball-dot" />
              <circle cx={-0.16} cy={-0.16} r="0.2" fill="rgba(0,0,0,0.08)"
                style={{ transform: `translate(${(ballRef.current.x - 0.16).toFixed(2)}px, ${(ballRef.current.y - 0.16).toFixed(2)}px)` }} />
            </g>
          </>
        )}

        {/* Overlay de intervalo */}
        {halftime && (
          <g>
            <rect x="22" y="18" width="76" height="32" rx="3"
              fill="rgba(0,0,0,0.8)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.2" />
            <text x="60" y="23.5" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="2" fontWeight="700">INTERVALO</text>
            <text x="60" y="32" textAnchor="middle" fill="#fff" fontSize="5" fontWeight="800" fontFamily="var(--mono)">{halftime.homeScore} - {halftime.awayScore}</text>
            <text x="60" y="42" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="1.8" fontWeight="600">Escolha as táticas abaixo</text>
          </g>
        )}

        {/* Overlay fim de jogo */}
        {phase === 'done' && result && (
          <g>
            <rect x="16" y="12" width="88" height="48" rx="3"
              fill="rgba(0,0,0,0.84)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.22" />
            <text x="60" y="18" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="2" fontWeight="700">FIM DE JOGO</text>
            <text x="36" y="27" textAnchor="middle" fill={homeTeam.color} fontSize="2.8" fontWeight="700">{homeTeam.abbreviation}</text>
            <text x="60" y="28.5" textAnchor="middle" fill="#fff" fontSize="6" fontWeight="800" fontFamily="var(--mono)">{result.homeScore} - {result.awayScore}</text>
            <text x="84" y="27" textAnchor="middle" fill={awayTeam.color} fontSize="2.8" fontWeight="700">{awayTeam.abbreviation}</text>
            <line x1="24" y1="33" x2="96" y2="33" stroke="rgba(255,255,255,0.1)" strokeWidth="0.15" />
            <text x="60" y="37.5" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="1.8" fontWeight="600">Posse de Bola</text>
            <rect x="28" y="40" width="64" height="3.5" rx="1.75" fill="rgba(255,255,255,0.06)" />
            <rect x="28" y="40" width={64 * result.homePossession / 100} height="3.5" rx="1.75" fill={homeTeam.color} />
            <rect x={28 + 64 * result.homePossession / 100 - 0.3} y="40" width="0.6" height="3.5" fill="rgba(255,255,255,0.4)" />
            <text x={28 + 64 * result.homePossession / 200} y="46.5" textAnchor="middle" fill={homeTeam.color} fontSize="2.4" fontWeight="700" fontFamily="var(--mono)">{result.homePossession}%</text>
            <text x={28 + 64 * result.homePossession / 100 + 64 * result.awayPossession / 200} y="46.5" textAnchor="middle" fill={awayTeam.color} fontSize="2.4" fontWeight="700" fontFamily="var(--mono)">{result.awayPossession}%</text>
            <line x1="60" y1="50" x2="60" y2="57" stroke="rgba(255,255,255,0.08)" strokeWidth="0.12" />
            <text x="46" y="55" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="1.9" fontWeight="600">{result.shots} chutes</text>
            <text x="74" y="55" textAnchor="middle" fill="#fbbf24" fontSize="1.9" fontWeight="600">{result.goals} gols</text>
          </g>
        )}
      </svg>

      <div className="pitch-labels">
        <span className="pitch-label-home" style={{ color: homeTeam.color }}>{homeTeam.abbreviation}</span>
        <span className="pitch-label-away" style={{ color: awayTeam.color }}>{awayTeam.abbreviation}</span>
      </div>
    </div>
  );
}
