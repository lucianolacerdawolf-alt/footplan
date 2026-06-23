import { useMemo } from 'react';
import type { Team, MatchEvent, Formation } from '../engine/types';

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
// Posições base (viewBox 120x70, horizontal)
// ---------------------------------------------------------------------------
const Y_SLOTS: Record<number, number[]> = {
  1: [35], 2: [18, 52], 3: [12, 35, 58], 4: [7, 24, 46, 63], 5: [5, 18, 35, 52, 65],
};
const X_ZONES = {
  home: { GK: 6, DEF: 23, MID: 46, FWD: 68 },
  away: { GK: 114, DEF: 97, MID: 74, FWD: 52 },
};
const FORMATION: Record<Formation, Record<string, number>> = {
  '4-3-3': { DEF: 4, MID: 3, FWD: 3 },
  '4-4-2': { DEF: 4, MID: 4, FWD: 2 },
  '3-5-2': { DEF: 3, MID: 5, FWD: 2 },
  '4-2-3-1': { DEF: 4, MID: 5, FWD: 1 },
  '5-3-2': { DEF: 5, MID: 3, FWD: 2 },
};

// ---------------------------------------------------------------------------
// Coordenadas base (estáveis, sem offset tático)
// ---------------------------------------------------------------------------
interface PlayerCoord {
  id: string; name: string; number: number;
  x: number; y: number; position: string; team: 'home' | 'away';
}

function baseCoords(team: Team, side: 'home' | 'away'): PlayerCoord[] {
  const counts = FORMATION[team.strategy.formation] ?? FORMATION['4-4-2'];
  const xz = X_ZONES[side];
  const coords: PlayerCoord[] = [];

  for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as const) {
    const players = team.squad.filter(p => p.position === pos);
    const count = counts[pos] ?? players.length;
    const slots = Y_SLOTS[count] ?? [35];

    players.slice(0, count).forEach((p, i) => {
      const hx = seed(p.id + 'x');
      const hy = seed(p.id + 'y');
      coords.push({
        id: p.id, name: p.name, number: p.number,
        x: xz[pos] + (hx - 0.5) * 3,
        y: (slots[i] ?? 35) + (hy - 0.5) * 4,
        position: p.position, team: side,
      });
    });
  }
  return coords;
}

// ---------------------------------------------------------------------------
// =============================================================================
// Movimentação tática PROPORCIONAL à distância da ação
// Principio: jogador perto da bola mexe mais, longe ancora a formação.
// Isso evita compressão e sobreposição — o time "estica" como sanfona.
// =============================================================================
type Shift = { dx: number; dy: number; angle: number };

function tacticalShift(
  event: MatchEvent | null,
  homeTeamId: string,
  player: PlayerCoord,
  ballX: number,
  ballY: number
): Shift {
  if (!event) return { dx: 0, dy: 0, angle: 0 };

  const isHome = player.team === 'home';
  const eventTeam = event.teamId;
  const iHaveBall = eventTeam !== null && (
    (isHome && eventTeam === homeTeamId) || (!isHome && eventTeam !== homeTeamId)
  );
  const theyHaveBall = eventTeam !== null && !iHaveBall;

  // --- Distância do jogador à bola (normalizada 0~1) ---
  const bdx = ballX - player.x;
  const bdy = ballY - player.y;
  const distToBall = Math.sqrt(bdx * bdx + bdy * bdy);
  const distNorm = Math.min(distToBall / 50, 1); // 0=colado, 1=muito longe

  // --- Parâmetros por tipo de evento ---
  let maxShift = 0;      // deslocamento máximo no eixo X (para o jogador mais próximo)
  let ySpread = 0;       // abertura lateral máxima
  const dir = iHaveBall ? 1 : -1; // direção: positivo = avança, negativo = recua
  const s = seed(event.description + player.id);
  const jitter = (s - 0.5) * 1.5;

  switch (event.type) {
    case 'possession':
      maxShift = iHaveBall ? 6 : 5;
      ySpread = iHaveBall ? 5 : 2;
      break;
    case 'attack':
    case 'miss':
    case 'post':
      maxShift = iHaveBall ? 18 : 12;
      ySpread = iHaveBall ? 4 : 1.5;
      break;
    case 'goal':
      maxShift = iHaveBall ? 22 : 6;
      ySpread = iHaveBall ? 10 : 7;
      break;
    case 'save':
      maxShift = theyHaveBall ? 14 : 8;
      ySpread = theyHaveBall ? 5 : 2;
      break;
    case 'kickoff':
      maxShift = 1;
      ySpread = 1;
      break;
    default:
      maxShift = 1;
      ySpread = 1;
  }

  // --- Cálculo proporcional ---
  // Quanto mais perto da bola, mais mexe (1 - distNorm)
  // GK mexe menos (×0.3), DEF menos (×0.5), MID normal (×0.75), FWD mais (×1.0)
  const posFactor = player.position === 'GK' ? 0.25 : player.position === 'DEF' ? 0.5 : player.position === 'MID' ? 0.75 : 1.0;
  const proximity = 1 - distNorm; // 1 = colado na bola, 0 = longe
  const shiftX = maxShift * proximity * posFactor * dir + jitter * 0.8;

  // Y: abre/fecha conforme distância ao centro (y=35)
  const yCenter = 35;
  const yOffset = player.y - yCenter;
  const ySign = yOffset > 0 ? 1 : -1;
  const yProximity = 1 - Math.min(Math.abs(yOffset) / 30, 1); // jogadores centrais abrem mais
  const shiftY = ySpread * yProximity * ySign * (0.5 + s * 0.5) + jitter * 0.5;

  // --- Atração sutil à bola (apenas jogadores próximos) ---
  const attractStrength = (iHaveBall ? 0.3 : 0.15) * (1 - distNorm);
  const ballDx = distToBall > 0.5 ? (bdx / distToBall) * attractStrength * 3 : 0;
  const ballDy = distToBall > 0.5 ? (bdy / distToBall) * attractStrength * 3 : 0;

  // --- Rotação sutil em direção à bola ---
  const angle = Math.atan2(bdy, bdx) * (180 / Math.PI) * 0.06;

  return {
    dx: shiftX + ballDx,
    dy: shiftY + ballDy,
    angle,
  };
}

// ---------------------------------------------------------------------------
// Bola
// ---------------------------------------------------------------------------
function ballPos(
  event: MatchEvent | null, homeTeamId: string, phase: string, eventSeed: number
): { x: number; y: number; visible: boolean } {
  if (!event || phase === 'idle') return { x: 60, y: 35, visible: true };
  const r = eventSeed;
  const isHome = event.teamId === homeTeamId;
  switch (event.type) {
    case 'kickoff': return { x: 60, y: 35, visible: true };
    case 'possession':
      return { x: isHome ? 52 + r * 10 : 66 - r * 10, y: 25 + r * 20, visible: true };
    case 'attack': case 'miss': case 'post':
      return { x: isHome ? 82 + r * 10 : 38 - r * 10, y: 25 + r * 20, visible: true };
    case 'goal':
      return { x: isHome ? 118 + r : 2 - r, y: 33 + r * 4, visible: true };
    case 'save':
      return { x: isHome ? 108 : 12, y: 33 + (r - 0.5) * 6, visible: true };
    case 'halftime': case 'fulltime':
      return { x: 60, y: 35, visible: false };
    default: return { x: 60, y: 35, visible: true };
  }
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function Pitch({ homeTeam, awayTeam, currentEvent, phase, result, halftime }: Props) {
  const homeBase = useMemo(() => baseCoords(homeTeam, 'home'), [homeTeam.id, homeTeam.strategy.formation]);
  const awayBase = useMemo(() => baseCoords(awayTeam, 'away'), [awayTeam.id, awayTeam.strategy.formation]);

  const eventId = currentEvent ? currentEvent.minute + '|' + currentEvent.type + '|' + currentEvent.description : '';
  const eventSeed = useMemo(() => seed(eventId), [eventId]);
  const ball = ballPos(currentEvent, homeTeam.id, phase, eventSeed);

  const isGoal = currentEvent?.type === 'goal' && phase !== 'done';
  const goalTeamId = isGoal ? currentEvent!.teamId : null;

  // --- Calcula TODOS os shifts com repulsão anti-sobreposição ---
  const allShifts = useMemo(() => {
    const allPlayers = [...homeBase, ...awayBase];
    const shifts = new Map<string, Shift>();

    // Passo 1: shift tático individual + atração à bola
    for (const p of allPlayers) {
      shifts.set(p.id, tacticalShift(currentEvent, homeTeam.id, p, ball.x, ball.y));
    }

    // Passo 2: repulsão iterativa (6 passes) — safety net
    const MIN_DIST = 8;
    const REPULSE_STRENGTH = 1.5;

    for (let iter = 0; iter < 6; iter++) {
      for (let i = 0; i < allPlayers.length; i++) {
        for (let j = i + 1; j < allPlayers.length; j++) {
          const pi = allPlayers[i];
          const pj = allPlayers[j];
          const si = shifts.get(pi.id)!;
          const sj = shifts.get(pj.id)!;

          const ax = pi.x + si.dx;
          const ay = pi.y + si.dy;
          const bx = pj.x + sj.dx;
          const by = pj.y + sj.dy;

          const dx = ax - bx;
          const dy = ay - by;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MIN_DIST && dist > 0.01) {
            const overlap = (MIN_DIST - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            const sameTeam = pi.team === pj.team ? 0.3 : 1.0;
            const force = overlap * REPULSE_STRENGTH * sameTeam;

            shifts.set(pi.id, { ...shifts.get(pi.id)!, dx: shifts.get(pi.id)!.dx + nx * force, dy: shifts.get(pi.id)!.dy + ny * force });
            shifts.set(pj.id, { ...shifts.get(pj.id)!, dx: shifts.get(pj.id)!.dx - nx * force, dy: shifts.get(pj.id)!.dy - ny * force });
          }
        }
      }
    }

    // Passo 3: manter jogadores dentro do campo
    for (const p of allPlayers) {
      const s = shifts.get(p.id)!;
      const fx = p.x + s.dx;
      const fy = p.y + s.dy;
      let { dx, dy } = s;
      if (fx < 2) dx += (2 - fx) * 0.5;
      if (fx > 118) dx -= (fx - 118) * 0.5;
      if (fy < 3) dy += (3 - fy) * 0.5;
      if (fy > 67) dy -= (fy - 67) * 0.5;
      shifts.set(p.id, { ...s, dx, dy });
    }

    return shifts;
  }, [homeBase, awayBase, currentEvent, ball.x, ball.y, homeTeam.id]);

  // Renderiza um jogador com shift calculado
  const renderPlayer = (p: PlayerCoord) => {
    const gradId = `grad-${p.team}`;
    const shift = allShifts.get(p.id) ?? { dx: 0, dy: 0, angle: 0 };
    const hasShift = shift.dx !== 0 || shift.dy !== 0;
    return (
      <g key={p.id}
         className={`player-group ${!hasShift && phase === 'idle' ? 'idle-sway' : ''}`}
         style={{
           transform: `translate(${shift.dx}px, ${shift.dy}px) rotate(${shift.angle}deg)`,
           transition: 'transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1.2)',
           transformOrigin: `${p.x}px ${p.y}px`,
         }}>
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
          <circle cx={goalTeamId === homeTeam.id ? 119 : 1} cy={35} r="4"
            fill="rgba(255,255,100,0.35)" className="goal-flash" />
        )}

        {/* Jogadores */}
        {phase !== 'done' && (
          <>
            {homeBase.map(renderPlayer)}
            {awayBase.map(renderPlayer)}

            {/* Bola */}
            {ball.visible && (
              <g filter="url(#shadow)">
                <circle cx={ball.x} cy={ball.y} r="1.3" fill="#fefefe"
                  stroke="#ccc" strokeWidth="0.12" className="ball-dot" />
                <circle cx={ball.x - 0.16} cy={ball.y - 0.16} r="0.2" fill="rgba(0,0,0,0.08)" />
              </g>
            )}
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
