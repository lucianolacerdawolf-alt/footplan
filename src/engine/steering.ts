// =============================================================================
// STEERING BEHAVIORS + MÁQUINA DE ESTADOS — Movimentação dos jogadores
// =============================================================================
import type { MatchEvent, Team } from './types';
import { FORMATION_COUNTS } from './constants';

export type PlayerState = 'IDLE' | 'ATTACKING' | 'DEFENDING' | 'SUPPORT';

export interface SteeringPlayer {
  id: string;
  x: number; y: number;
  vx: number; vy: number;
  targetX: number; targetY: number;
  state: PlayerState;
  baseX: number; baseY: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  team: 'home' | 'away';
  speedAttr: number;
  dribbleAttr: number;
  staminaAttr: number;
  fatigue: number;
}

// ---------------------------------------------------------------------------
// Parâmetros base (multiplicados pelos atributos do jogador)
// ---------------------------------------------------------------------------
const BASE_MAX_SPEED: Record<string, number> = { GK: 56, DEF: 76, MID: 92, FWD: 108 };
const MAX_FORCE: Record<string, number> = { GK: 120, DEF: 170, MID: 190, FWD: 220 };
const SLOWING_RADIUS = 10;
const SEPARATION_DIST = 5;
const SEPARATION_FORCE = 55;
const DT = 1 / 60;
const FRICTION = 0.995;

function getMaxSpeed(p: SteeringPlayer): number {
  const base = BASE_MAX_SPEED[p.position] ?? 40;
  // speedAttr 0-99 normaliza para 0.7-1.3x, stamina alta + dribble ajudam na agilidade
  const speedMult = 0.7 + (p.speedAttr / 99) * 0.6;
  const dribbleBonus = (p.dribbleAttr / 99) * 0.15;
  const fatiguePenalty = 1 - (p.fatigue / 250);
  return base * speedMult * (1 + dribbleBonus) * fatiguePenalty;
}

// ---------------------------------------------------------------------------
// Máquina de Estados
// ---------------------------------------------------------------------------
export function determineState(
  player: SteeringPlayer,
  hasBall: boolean,
  eventType: string | null,
  mentality: string
): PlayerState {
  if (!eventType) return 'IDLE';
  if (player.position === 'GK') return 'IDLE'; // goleiro sempre na base

  if (eventType === 'goal' || eventType === 'halftime' || eventType === 'fulltime') {
    return 'IDLE';
  }

  if (hasBall) {
    // Meu time tem a posse
    if (player.position === 'FWD') return 'ATTACKING';
    if (player.position === 'MID') {
      if (eventType === 'attack') return 'ATTACKING';
      return 'SUPPORT';
    }
    if (player.position === 'DEF') {
      if (mentality === 'high-press') return 'SUPPORT';
      if (eventType === 'attack') return 'SUPPORT';
      return 'IDLE';
    }
  } else {
    // Adversário tem a posse
    if (player.position === 'FWD') {
      if (mentality === 'high-press') return 'DEFENDING';
      return 'IDLE';
    }
    if (player.position === 'MID') return 'DEFENDING';
    if (player.position === 'DEF') return 'DEFENDING';
  }

  return 'IDLE';
}

// ---------------------------------------------------------------------------
// Steering: Arrive (desacelera ao se aproximar)
// ---------------------------------------------------------------------------
function arrive(
  px: number, py: number, vx: number, vy: number,
  tx: number, ty: number, maxSpeed: number, maxForce: number
): { fx: number; fy: number } {
  const dx = tx - px;
  const dy = ty - py;
  const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
  const speed = dist < SLOWING_RADIUS ? maxSpeed * (dist / SLOWING_RADIUS) : maxSpeed;
  const desiredVx = (dx / dist) * speed;
  const desiredVy = (dy / dist) * speed;
  let fx = desiredVx - vx;
  let fy = desiredVy - vy;
  const f = Math.sqrt(fx * fx + fy * fy);
  if (f > maxForce) {
    fx = (fx / f) * maxForce;
    fy = (fy / f) * maxForce;
  }
  return { fx, fy };
}

// ---------------------------------------------------------------------------
// Steering: Separation (evita colisão com companheiros)
// ---------------------------------------------------------------------------
function separation(
  id: string, px: number, py: number,
  others: SteeringPlayer[]
): { fx: number; fy: number } {
  let fx = 0, fy = 0;
  for (const o of others) {
    if (o.id === id) continue;
    const dx = px - o.x;
    const dy = py - o.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
    if (dist < SEPARATION_DIST) {
      const strength = (SEPARATION_DIST - dist) / SEPARATION_DIST;
      fx += (dx / dist) * strength * SEPARATION_FORCE;
      fy += (dy / dist) * strength * SEPARATION_FORCE;
    }
  }
  return { fx, fy };
}

// ---------------------------------------------------------------------------
// Cálculo do alvo tático baseado no estado
// ---------------------------------------------------------------------------
export function computeTarget(
  player: SteeringPlayer,
  hasBall: boolean,
  event: MatchEvent | null,
  mentality: string,
  defLineMod: number,
  widthMod: number
): { tx: number; ty: number } {
  let tx = player.baseX;
  let ty = player.baseY;

  if (!event) return { tx, ty };

  const isHome = player.team === 'home';
  const dir = isHome ? 1 : -1; // direção de ataque
  const posIdx = player.position === 'GK' ? 0 : player.position === 'DEF' ? 1 : player.position === 'MID' ? 2 : 3;
  const yOff = ty - 35; // distância do centro vertical
  const ySign = yOff >= 0 ? 1 : -1;

  switch (player.state) {
    case 'ATTACKING': {
      // Empurra pra frente — quanto mais ofensivo o jogador, mais avança
      const push = 8 + posIdx * 6;
      tx += push * dir;
      // Abre nas pontas se for amplitude wide
      if (posIdx >= 2) {
        ty += ySign * Math.min(Math.abs(yOff), 18) * (0.4 + widthMod * 0.5);
      }
      break;
    }
    case 'DEFENDING': {
      // Recua, mais compacto
      const pull = 6 + (3 - posIdx) * 4;
      tx -= pull * dir;
      // Compacta no centro
      ty += -yOff * 0.35;
      if (!hasBall && posIdx <= 1) {
        tx += defLineMod * (1.5 + posIdx * 0.6) * dir;
      }
      break;
    }
    case 'SUPPORT': {
      // Meio-campo: oferece opções de passe, avança junto
      tx += (4 + posIdx * 3) * dir;
      ty += ySign * Math.min(Math.abs(yOff) * 0.7, 12) * widthMod;
      break;
    }
    case 'IDLE':
    default: {
      if (mentality === 'high-press' && hasBall && posIdx <= 1) {
        tx += 5 * dir;
      }
      if (mentality === 'defensive' && !hasBall) {
        tx -= 4 * dir;
      }
      // Posse: todo time sobe junto
      if (hasBall && posIdx >= 1) {
        tx += (1 + posIdx) * dir;
      }
      break;
    }
  }

  // Aplica amplitude
  if (player.position !== 'GK') {
    const spread = Math.abs(yOff) * (0.05 + widthMod * 0.15);
    ty += ySign * spread;
  }

  return { tx, ty };
}

// ---------------------------------------------------------------------------
// Game Loop: integra forças e atualiza posições
// ---------------------------------------------------------------------------
export function updatePlayers(
  players: Map<string, SteeringPlayer>,
  activePlayers: SteeringPlayer[],
  event: MatchEvent | null,
  homeHasBall: boolean,
  awayHasBall: boolean,
  homeMentality: string,
  awayMentality: string,
  homeDefLine: number,
  awayDefLine: number,
  homeWidth: number,
  awayWidth: number,
  ballX: number,
  ballY: number,
): void {
  const all = [...players.values()];

  for (const p of activePlayers) {
    const hasBall = p.team === 'home' ? homeHasBall : awayHasBall;
    const mentality = p.team === 'home' ? homeMentality : awayMentality;
    const defLine = p.team === 'home' ? homeDefLine : awayDefLine;
    const widthMod = p.team === 'home' ? homeWidth : awayWidth;

    // Atualiza estado
    p.state = determineState(p, hasBall, event?.type ?? null, mentality);

    // Calcula alvo
    const target = computeTarget(p, hasBall, event, mentality, defLine, widthMod);
    p.targetX = target.tx;
    p.targetY = target.ty;

    // Forças de steering
    const maxSpd = getMaxSpeed(p);
    const maxFrc = MAX_FORCE[p.position] ?? 45;
    const arr = arrive(p.x, p.y, p.vx, p.vy, p.targetX, p.targetY, maxSpd, maxFrc);
    const sep = separation(p.id, p.x, p.y, all);

    // Combina forças
    const fx = arr.fx * 0.7 + sep.fx * 0.3;
    const fy = arr.fy * 0.7 + sep.fy * 0.3;

    // Integração de Euler
    p.vx += fx * DT;
    p.vy += fy * DT;

    // Clamp velocidade
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > maxSpd) {
      p.vx = (p.vx / speed) * maxSpd;
      p.vy = (p.vy / speed) * maxSpd;
    }

    p.x += p.vx * DT;
    p.y += p.vy * DT;

    // Friction (desaceleração leve)
    p.vx *= FRICTION;
    p.vy *= FRICTION;

    // Clamp dentro do campo
    p.x = Math.max(2, Math.min(118, p.x));
    p.y = Math.max(3, Math.min(67, p.y));
  }

  // Goleiros: movimento reativo à bola, contido na área
  for (const p of all) {
    if (p.position !== 'GK') continue;
    const hasBall = p.team === 'home' ? homeHasBall : awayHasBall;
    const mentality = p.team === 'home' ? homeMentality : awayMentality;
    const maxSpd = getMaxSpeed(p);
    const maxFrc = MAX_FORCE['GK'];
    const isHome = p.team === 'home';

    let gkTargetX = p.baseX;
    let gkTargetY = p.baseY;
    if (event) {
      if (!hasBall) {
        // Track ball laterally and forward/back from goal
        const ballDy = ballY - 35;
        gkTargetY = p.baseY + Math.max(-10, Math.min(10, ballDy * 0.7));
        const ballDx = ballX - p.baseX;
        gkTargetX += Math.max(-3, Math.min(3, ballDx * 0.15));
        if (event.type === 'attack') {
          const dir = isHome ? 1 : -1;
          gkTargetX += dir * (mentality === 'high-press' ? 4 : 2);
        }
      }
      if (event.type === 'save') {
        const dir = isHome ? -1 : 1;
        gkTargetX += dir * 3;
        const ballDy2 = ballY - 35;
        gkTargetY = p.baseY + Math.max(-8, Math.min(8, ballDy2 * 0.6));
      }
    }
    p.targetX = gkTargetX;
    p.targetY = gkTargetY;

    const arr = arrive(p.x, p.y, p.vx, p.vy, p.targetX, p.targetY, maxSpd, maxFrc);
    p.vx += arr.fx * DT;
    p.vy += arr.fy * DT;
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (spd > maxSpd) { p.vx = (p.vx / spd) * maxSpd; p.vy = (p.vy / spd) * maxSpd; }
    p.x += p.vx * DT;
    p.y += p.vy * DT;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.x = Math.max(isHome ? 2 : 100, Math.min(isHome ? 18 : 118, p.x));
    p.y = Math.max(18, Math.min(52, p.y));
  }
}

// =============================================================================
// Coordenadas base da formação (exportado para o Pitch usar)
// =============================================================================

export interface PlayerCoord {
  id: string; name: string; x: number; y: number;
  position: 'GK'|'DEF'|'MID'|'FWD'; team: 'home'|'away'; number: number;
  speedAttr: number; dribbleAttr: number; staminaAttr: number;
}

const X_ZONES = {
  home: { GK: 6, DEF: 23, MID: 46, FWD: 68 },
  away: { GK: 114, DEF: 97, MID: 74, FWD: 52 },
};

const Y_SLOTS: Record<number, number[]> = {
  1: [35], 2: [15, 55], 3: [9, 35, 61], 4: [5, 20, 50, 65], 5: [3, 15, 35, 55, 67],
};

function seedStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return (h & 0x7fffffff) / 0x7fffffff;
}

export function buildBaseCoords(team: Team, side: 'home' | 'away'): PlayerCoord[] {
  const counts = FORMATION_COUNTS[team.strategy.formation] ?? FORMATION_COUNTS['4-4-2'];
  const xz = X_ZONES[side];
  const coords: PlayerCoord[] = [];

  for (const pos of ['GK', 'DEF', 'MID', 'FWD'] as const) {
    const players = team.squad.filter(p => p.position === pos);
    const count = counts[pos] ?? players.length;
    const slots = Y_SLOTS[count] ?? [35];

    players.slice(0, count).forEach((p, i) => {
      const s = seedStr(p.id + side);
      const jx = (s - 0.5) * 1.5;
      const jy = (s + 0.5 - Math.floor(s + 0.5) - 0.5) * 2;
      coords.push({
        id: p.id, name: p.name, number: p.number, position: pos, team: side,
        x: xz[pos] + jx,
        y: (slots[i] ?? 35) + jy,
        speedAttr: p.attributes.speed,
        dribbleAttr: p.attributes.dribbling,
        staminaAttr: p.attributes.stamina,
      });
    });
  }
  return coords;
}

export function buildSteeringPlayers(coords: PlayerCoord[]): Map<string, SteeringPlayer> {
  const map = new Map<string, SteeringPlayer>();
  for (const c of coords) {
    map.set(c.id, {
      id: c.id, x: c.x, y: c.y, vx: 0, vy: 0,
      targetX: c.x, targetY: c.y,
      state: 'IDLE', baseX: c.x, baseY: c.y,
      position: c.position, team: c.team,
      speedAttr: c.speedAttr,
      dribbleAttr: c.dribbleAttr,
      staminaAttr: c.staminaAttr,
      fatigue: 0,
    });
  }
  return map;
}
