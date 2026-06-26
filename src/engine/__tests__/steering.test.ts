import { describe, it, expect } from 'vitest';
import { updatePlayers, determineState, computeTarget, buildBaseCoords, buildSteeringPlayers, type SteeringPlayer } from '../steering';
import type { MatchEvent, Team, Player } from '../types';

function makePlayer(id: string, pos: Player['position'], num: number, ovr = 70): Player {
  return {
    id, name: `Player ${id}`, number: num, position: pos, currentFatigue: 0,
    attributes: { speed: ovr, stamina: ovr, passing: ovr, finishing: ovr, tackling: ovr, dribbling: ovr, vision: ovr, positioning: ovr },
  };
}

function makeTeam(id: string, name: string, formation: Team['strategy']['formation'] = '4-3-3'): Team {
  return {
    id, name, abbreviation: name.slice(0, 3).toUpperCase(), color: '#3b82f6', secondaryColor: '#ef4444',
    logoUrl: '',
    squad: [
      makePlayer(`${id}-gk1`, 'GK', 1), makePlayer(`${id}-gk2`, 'GK', 21),
      makePlayer(`${id}-d1`, 'DEF', 2), makePlayer(`${id}-d2`, 'DEF', 3),
      makePlayer(`${id}-d3`, 'DEF', 4), makePlayer(`${id}-d4`, 'DEF', 5),
      makePlayer(`${id}-d5`, 'DEF', 22),
      makePlayer(`${id}-m1`, 'MID', 6), makePlayer(`${id}-m2`, 'MID', 7), makePlayer(`${id}-m3`, 'MID', 8),
      makePlayer(`${id}-m4`, 'MID', 23), makePlayer(`${id}-m5`, 'MID', 24),
      makePlayer(`${id}-f1`, 'FWD', 9), makePlayer(`${id}-f2`, 'FWD', 10), makePlayer(`${id}-f3`, 'FWD', 11),
      makePlayer(`${id}-f4`, 'FWD', 25),
    ],
    strategy: { formation, mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

function makeGk(id: string, team: 'home' | 'away', x: number, y: number): SteeringPlayer {
  return { id, x, y, vx: 0, vy: 0, targetX: x, targetY: y, state: 'IDLE', baseX: x, baseY: y, position: 'GK', team, speedAttr: 80, dribbleAttr: 30, staminaAttr: 80, fatigue: 0 };
}

function makeOutfield(id: string, team: 'home' | 'away', pos: 'DEF'|'MID'|'FWD', x: number, y: number): SteeringPlayer {
  return { id, x, y, vx: 0, vy: 0, targetX: x, targetY: y, state: 'IDLE', baseX: x, baseY: y, position: pos, team, speedAttr: 70, dribbleAttr: 60, staminaAttr: 70, fatigue: 0 };
}

function makeEvent(type: MatchEvent['type'], teamId: string | null = null): MatchEvent {
  return { minute: 30, type, description: `Test ${type} event`, teamId } as MatchEvent;
}

// ── determineState ──────────────────────────────────────────────────────────
describe('determineState', () => {
  it('FWD with ball returns ATTACKING', () => {
    const p = makeOutfield('p1', 'home', 'FWD', 68, 35);
    expect(determineState(p, true, 'possession', 'possession')).toBe('ATTACKING');
    expect(determineState(p, true, 'attack', 'possession')).toBe('ATTACKING');
  });

  it('MID with ball at attack event returns ATTACKING', () => {
    const p = makeOutfield('p1', 'home', 'MID', 46, 35);
    expect(determineState(p, true, 'attack', 'possession')).toBe('ATTACKING');
    expect(determineState(p, true, 'possession', 'possession')).toBe('SUPPORT');
  });

  it('DEF with ball returns IDLE (unless high-press + attack)', () => {
    const p = makeOutfield('p1', 'home', 'DEF', 23, 35);
    expect(determineState(p, true, 'possession', 'possession')).toBe('IDLE');
    expect(determineState(p, true, 'possession', 'high-press')).toBe('SUPPORT');
    expect(determineState(p, true, 'attack', 'possession')).toBe('SUPPORT');
  });

  it('without ball: FWD with high-press defends, MID/DEF always defend', () => {
    const fwd = makeOutfield('p1', 'home', 'FWD', 68, 35);
    expect(determineState(fwd, false, 'possession', 'possession')).toBe('IDLE');
    expect(determineState(fwd, false, 'possession', 'high-press')).toBe('DEFENDING');

    const mid = makeOutfield('p2', 'home', 'MID', 46, 35);
    expect(determineState(mid, false, 'possession', 'possession')).toBe('DEFENDING');

    const def = makeOutfield('p3', 'home', 'DEF', 23, 35);
    expect(determineState(def, false, 'possession', 'possession')).toBe('DEFENDING');
  });

  it('without event returns IDLE', () => {
    const p = makeOutfield('p1', 'home', 'FWD', 68, 35);
    expect(determineState(p, true, null, 'possession')).toBe('IDLE');
  });
});

// ── computeTarget ───────────────────────────────────────────────────────────
describe('computeTarget', () => {
  it('ATTACKING pushes forward', () => {
    const p = makeOutfield('p1', 'home', 'FWD', 68, 35);
    p.state = 'ATTACKING';
    const t = computeTarget(p, true, makeEvent('possession', 'home'), 'possession', 0, 1);
    // FWD should push beyond baseX
    expect(t.tx).toBeGreaterThan(68);
  });

  it('DEFENDING pulls back toward own goal', () => {
    const p = makeOutfield('p1', 'home', 'DEF', 23, 35);
    p.state = 'DEFENDING';
    const t = computeTarget(p, false, makeEvent('possession', 'away'), 'possession', 0, 1);
    // DEF should stay within reasonable range of base (not push far forward)
    expect(t.tx).toBeLessThan(50);
  });

  it('SUPPORT positions behind attack', () => {
    const p = makeOutfield('p1', 'home', 'MID', 46, 35);
    p.state = 'SUPPORT';
    const t = computeTarget(p, true, makeEvent('attack', 'home'), 'possession', 0, 1);
    expect(t.tx).toBeLessThan(80);
  });

  it('IDLE stays near base', () => {
    const p = makeOutfield('p1', 'home', 'MID', 46, 35);
    p.state = 'IDLE';
    const t = computeTarget(p, false, null, 'possession', 0, 1);
    expect(Math.abs(t.tx - 46)).toBeLessThan(10);
    expect(Math.abs(t.ty - 35)).toBeLessThan(10);
  });
});

// ── buildBaseCoords / buildSteeringPlayers ──────────────────────────────────
describe('buildBaseCoords', () => {
  it('returns 11+ players for a valid team', () => {
    const t = makeTeam('t1', 'Test');
    const coords = buildBaseCoords(t, 'home');
    expect(coords.length).toBeGreaterThanOrEqual(11);
    expect(coords[0].position).toBe('GK');
    expect(coords[0].team).toBe('home');
  });

  it('produces valid SteeringPlayers map', () => {
    const t = makeTeam('t1', 'Test');
    const coords = buildBaseCoords(t, 'away');
    const players = buildSteeringPlayers(coords);
    expect(players.size).toBe(coords.length);
    for (const c of coords) {
      const sp = players.get(c.id);
      expect(sp).toBeDefined();
      expect(sp!.x).toBe(c.x);
      expect(sp!.baseX).toBe(c.x);
    }
  });
});

// ── updatePlayers GK ────────────────────────────────────────────────────────
describe('updatePlayers - GK constraints', () => {
  it('home GK stays within penalty area X bounds [2, 18]', () => {
    const gk = makeGk('gk1', 'home', 6, 35);
    const players = new Map<string, SteeringPlayer>([[gk.id, gk]]);
    for (let i = 0; i < 200; i++) updatePlayers(players, [], makeEvent('attack', 'away'), false, true, 'possession', 'possession', 0, 0, 0, 0, 60, 35);
    expect(gk.x).toBeGreaterThanOrEqual(2);
    expect(gk.x).toBeLessThanOrEqual(18);
  });

  it('away GK stays within penalty area X bounds [100, 118]', () => {
    const gk = makeGk('gk2', 'away', 114, 35);
    const players = new Map<string, SteeringPlayer>([[gk.id, gk]]);
    for (let i = 0; i < 200; i++) updatePlayers(players, [], makeEvent('attack', 'home'), true, false, 'possession', 'possession', 0, 0, 0, 0, 60, 35);
    expect(gk.x).toBeGreaterThanOrEqual(100);
    expect(gk.x).toBeLessThanOrEqual(118);
  });

  it('GK Y stays within [18, 52]', () => {
    const gk = makeGk('gk1', 'home', 6, 35);
    const players = new Map<string, SteeringPlayer>([[gk.id, gk]]);
    for (let i = 0; i < 200; i++) updatePlayers(players, [], makeEvent('attack', 'away'), false, true, 'possession', 'possession', 0, 0, 0, 0, 60, 35);
    expect(gk.y).toBeGreaterThanOrEqual(18);
    expect(gk.y).toBeLessThanOrEqual(52);
  });

  it('GK reacts to ball Y position', () => {
    const gk = makeGk('gk1', 'home', 6, 35);
    const players = new Map<string, SteeringPlayer>([[gk.id, gk]]);
    for (let i = 0; i < 100; i++) updatePlayers(players, [], makeEvent('attack', 'away'), false, true, 'possession', 'possession', 0, 0, 0, 0, 60, 10);
    const yTop = gk.y;
    gk.y = 35; gk.vy = 0;
    for (let i = 0; i < 100; i++) updatePlayers(players, [], makeEvent('attack', 'away'), false, true, 'possession', 'possession', 0, 0, 0, 0, 60, 60);
    expect(yTop).toBeLessThan(35);
    expect(gk.y).toBeGreaterThan(35);
  });

  it('GK stays near base when no event', () => {
    const gk = makeGk('gk1', 'home', 6, 35);
    const players = new Map<string, SteeringPlayer>([[gk.id, gk]]);
    for (let i = 0; i < 50; i++) updatePlayers(players, [], null, false, false, 'possession', 'possession', 0, 0, 0, 0, 60, 35);
    expect(Math.abs(gk.x - 6)).toBeLessThan(2);
    expect(Math.abs(gk.y - 35)).toBeLessThan(2);
  });

  it('GK with ball does not rush forward significantly', () => {
    const gk = makeGk('gk1', 'home', 6, 35);
    const players = new Map<string, SteeringPlayer>([[gk.id, gk]]);
    for (let i = 0; i < 100; i++) updatePlayers(players, [], makeEvent('possession', 'home'), true, false, 'possession', 'possession', 0, 0, 0, 0, 60, 35);
    expect(gk.x).toBeLessThan(12);
  });
});

// ── updatePlayers outfield ──────────────────────────────────────────────────
describe('updatePlayers - outfield movement', () => {
  it('outfield players move from base positions with event', () => {
    const fwd = makeOutfield('f1', 'home', 'FWD', 68, 35);
    const mid = makeOutfield('m1', 'home', 'MID', 46, 35);
    const players = new Map<string, SteeringPlayer>([[fwd.id, fwd], [mid.id, mid]]);
    const initialX_fwd = fwd.x;
    const initialX_mid = mid.x;
    for (let i = 0; i < 100; i++) updatePlayers(players, [fwd, mid], makeEvent('possession', 'home'), true, false, 'possession', 'possession', 0, 0, 1, 1, 60, 35);
    // Players should have moved (not stuck at base)
    expect(fwd.x).not.toBe(initialX_fwd);
    expect(mid.x).not.toBe(initialX_mid);
  });

  it('outfield players stay within full pitch bounds', () => {
    const fwd = makeOutfield('f1', 'home', 'FWD', 68, 35);
    const def = makeOutfield('d1', 'home', 'DEF', 23, 35);
    const players = new Map<string, SteeringPlayer>([[fwd.id, fwd], [def.id, def]]);
    const active = [fwd, def];
    for (let i = 0; i < 200; i++) {
      updatePlayers(players, active, makeEvent('attack', 'home'), true, false, 'high-press', 'possession', 1.5, 0, 1.5, 1, 60, 35);
      expect(fwd.x).toBeGreaterThanOrEqual(2);
      expect(fwd.x).toBeLessThanOrEqual(118);
      expect(fwd.y).toBeGreaterThanOrEqual(3);
      expect(fwd.y).toBeLessThanOrEqual(67);
      expect(def.x).toBeGreaterThanOrEqual(2);
      expect(def.x).toBeLessThanOrEqual(118);
    }
  });

  it('away team players move in opposite direction', () => {
    const homeFwd = makeOutfield('hf1', 'home', 'FWD', 68, 35);
    const awayDef = makeOutfield('ad1', 'away', 'DEF', 97, 35);
    const players = new Map<string, SteeringPlayer>([[homeFwd.id, homeFwd], [awayDef.id, awayDef]]);
    for (let i = 0; i < 50; i++) updatePlayers(players, [homeFwd, awayDef], makeEvent('attack', 'home'), true, false, 'possession', 'possession', 0, 0, 1, 1, 80, 35);
    // Home FWD attacks right (x increases from 68)
    expect(homeFwd.x).toBeGreaterThan(68);
    // Away DEF retreats toward own goal (x increases from 97 toward 114)
    expect(awayDef.x).toBeGreaterThan(97);
  });
});
