import { useMemo } from 'react';
import { forceSimulation, forceCollide, forceX, forceY } from 'd3-force';
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
  1: [35], 2: [15, 55], 3: [9, 35, 61], 4: [5, 20, 50, 65], 5: [3, 15, 35, 55, 67],
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
// Movimentação tática — BLOCO (linhas movem juntas, não proporcionais)
// =============================================================================
type Shift = { dx: number; dy: number; angle: number };

function tacticalShift(
  event: MatchEvent | null,
  team: Team,
  player: PlayerCoord
): Shift {
  if (!event) return { dx: 0, dy: 0, angle: 0 };

  const isHome = player.team === 'home';
  const eventTeam = event.teamId;
  const iHaveBall = eventTeam !== null && (
    (isHome && eventTeam === team.id) || (!isHome && eventTeam !== team.id)
  );

  // Modificadores visuais da estratégia
  const dlMod = team.strategy.defensiveLine === 'high' ? 0.8 : team.strategy.defensiveLine === 'low' ? -0.8 : 0;
  const wMod = team.strategy.width === 'wide' ? 1.3 : team.strategy.width === 'narrow' ? 0.7 : 1.0;

  const s = seed(event.description + player.id);
  const jx = (s - 0.5) * 0.6;
  const jy = (seed(event.description + 'y' + player.id) - 0.5) * 1.2;

  const posIdx = player.position === 'GK' ? 0 : player.position === 'DEF' ? 1 : player.position === 'MID' ? 2 : 3;

  let baseDx = 0, lineDelta = 0, baseDy = 0;
  const dir = iHaveBall ? 1 : -1;

  switch (event.type) {
    case 'possession':
      baseDx = iHaveBall ? 2.5 : 2; lineDelta = 0.6; baseDy = iHaveBall ? 3 : 1.5;
      break;
    case 'attack':
      baseDx = iHaveBall ? 5 : 3.5; lineDelta = 1.0; baseDy = iHaveBall ? 2 : 1;
      break;
    case 'miss':
    case 'post':
      baseDx = iHaveBall ? 3 : 2; lineDelta = 0.5; baseDy = iHaveBall ? 1.5 : 1;
      break;
    case 'goal':
      baseDx = iHaveBall ? 6 : 2; lineDelta = 1.5; baseDy = iHaveBall ? 4 : 2;
      break;
    case 'save':
      baseDx = iHaveBall ? 2 : 4; lineDelta = 0.5; baseDy = iHaveBall ? 1 : 2.5;
      break;
    default:
      baseDx = 0.5; lineDelta = 0.2; baseDy = 0.5;
  }

  // Linha defensiva: alta empurra time pra frente, baixa recua
  const dlOffset = dlMod * (iHaveBall ? 1 : -1) * (1 + posIdx * 0.3);
  const shiftX = (baseDx + posIdx * lineDelta + dlOffset) * dir + jx;

  // Amplitude: wide = mais abertura lateral, narrow = compacto
  const yOff = player.y - 35;
  const ySign = yOff > 0 ? 1 : -1;
  const yFactor = Math.min(Math.abs(yOff) / 25, 1);
  const shiftY = baseDy * yFactor * ySign * wMod * (0.4 + s * 0.6) + jy;

  const angle = dir * 0.5 + jx * 0.5;

  return { dx: shiftX, dy: shiftY, angle };
}

// =============================================================================
// Portador da bola — quem está com ela agora
// =============================================================================
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
    case 'possession':
      // Um meia ou atacante conduz
      const mids = teamPlayers.filter(p => p.position === 'MID' || p.position === 'FWD');
      return mids.length > 0 ? mids[Math.floor(s * mids.length)] : teamPlayers[0];
    case 'attack':
      // O atacante mais avançado (maior x para home, menor para away)
      const fwds = teamPlayers.filter(p => p.position === 'FWD');
      if (fwds.length > 0) {
        const isHome = teamPlayers[0].team === 'home';
        return isHome
          ? fwds.reduce((a, b) => a.x > b.x ? a : b)
          : fwds.reduce((a, b) => a.x < b.x ? a : b);
      }
      return teamPlayers[Math.floor(s * teamPlayers.length)];
    case 'goal':
    case 'miss':
    case 'post': {
      // Chute: o atacante mais avançado chutou
      const fwds2 = teamPlayers.filter(p => p.position === 'FWD');
      if (fwds2.length > 0) {
        const isHome2 = teamPlayers[0].team === 'home';
        return isHome2
          ? fwds2.reduce((a, b) => a.x > b.x ? a : b)
          : fwds2.reduce((a, b) => a.x < b.x ? a : b);
      }
      return teamPlayers[0];
    }
    case 'save':
      // Goleiro do time que defendeu
      const gk = allPlayers.find(p => p.position === 'GK' && (
        (p.team === 'home' && event.teamId !== homeTeamId) ||
        (p.team === 'away' && event.teamId === homeTeamId)
      ));
      return gk ?? null;
    default:
      return teamPlayers[Math.floor(s * teamPlayers.length)];
  }
}

// =============================================================================
// Posição da bola — deriva do portador
// =============================================================================
function ballFromCarrier(
  event: MatchEvent | null,
  carrier: PlayerCoord | null,
  carrierX: number,  // posição final do portador (após d3-force)
  carrierY: number,
  homeTeamId: string,
  eventSeed: number
): { x: number; y: number; visible: boolean } {
  if (!event) return { x: 60, y: 35, visible: true };

  const r = eventSeed;
  const isHome = event.teamId === homeTeamId;

  switch (event.type) {
    case 'kickoff':
      return { x: 60, y: 35, visible: true };

    case 'possession':
    case 'attack':
      // Bola nos pés do portador, levemente à frente
      if (carrier) {
        const dir = isHome ? 1.5 : -1.5;
        return { x: carrierX + dir + (r - 0.5), y: carrierY + (r - 0.5) * 0.8, visible: true };
      }
      return { x: 60, y: 35, visible: true };

    case 'goal':
    case 'miss':
    case 'post':
      // Chute: bola SAI do portador em direção ao gol
      if (carrier) {
        const shotDir = isHome ? 1 : -1;
        // Posição do chute = entre o portador e o gol (intermediária/área)
        const shotX = carrierX + shotDir * (6 + r * 10); // distância do chute
        const shotY = carrierY + (r - 0.5) * 6;
        const clampedX = isHome ? Math.min(shotX, 114) : Math.max(shotX, 6);
        return { x: clampedX, y: Math.max(8, Math.min(62, shotY)), visible: true };
      }
      return { x: isHome ? 100 : 20, y: 35, visible: true };

    case 'save':
      // Perto do goleiro
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
export default function Pitch({ homeTeam, awayTeam, currentEvent, phase, result, halftime }: Props) {
  const homeBase = useMemo(() => baseCoords(homeTeam, 'home'), [homeTeam.id, homeTeam.strategy.formation]);
  const awayBase = useMemo(() => baseCoords(awayTeam, 'away'), [awayTeam.id, awayTeam.strategy.formation]);

  const eventId = currentEvent ? currentEvent.minute + '|' + currentEvent.type + '|' + currentEvent.description : '';
  const eventSeed = useMemo(() => seed(eventId), [eventId]);

  const isGoal = currentEvent?.type === 'goal' && phase !== 'done';
  const goalTeamId = isGoal ? currentEvent!.teamId : null;

  // --- Calcula posições dos jogadores (d3-force) + bola (do portador) ---
  const { allShifts, ball } = useMemo(() => {
    const allPlayers = [...homeBase, ...awayBase];
    const shifts = new Map<string, Shift>();

    // Passo 1: posição alvo = base + tático
    const nodes: { id: string; x: number; y: number; tx: number; ty: number }[] = [];
    for (const p of allPlayers) {
      const team = p.team === 'home' ? homeTeam : awayTeam;
      const s = tacticalShift(currentEvent, team, p);
      const tx = p.x + s.dx;
      const ty = p.y + s.dy;
      nodes.push({ id: p.id, x: tx, y: ty, tx, ty });
      shifts.set(p.id, { dx: 0, dy: 0, angle: s.angle });
    }

    // Passo 2: d3-force — colisão + atração ao alvo
    const sim = forceSimulation(nodes)
      .force('collide', forceCollide(3.5))
      .force('x', forceX((d: any) => d.tx).strength(0.15))
      .force('y', forceY((d: any) => d.ty).strength(0.15))
      .alpha(1).stop();
    for (let i = 0; i < 120; i++) sim.tick();

    // Clamp
    for (const node of nodes) {
      node.x = Math.max(2, Math.min(118, node.x));
      node.y = Math.max(3, Math.min(67, node.y));
    }

    // Extrai shifts
    for (const p of allPlayers) {
      const node = nodes.find(n => n.id === p.id)!;
      const s = shifts.get(p.id)!;
      shifts.set(p.id, { dx: node.x - p.x, dy: node.y - p.y, angle: s.angle });
    }

    // Portador da bola
    const carrier = getBallCarrier(currentEvent, homeTeam.id, allPlayers);
    let carrierX = 60, carrierY = 35;
    if (carrier) {
      const node = nodes.find(n => n.id === carrier.id);
      if (node) { carrierX = node.x; carrierY = node.y; }
    }

    // Posição da bola a partir do portador
    const ballPos = ballFromCarrier(currentEvent, carrier, carrierX, carrierY, homeTeam.id, eventSeed);

    return { allShifts: shifts, ball: ballPos };
  }, [homeBase, awayBase, currentEvent, eventSeed, homeTeam.id]);

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
           transition: 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1.2)',
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
