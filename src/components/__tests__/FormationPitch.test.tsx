// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Player, Team } from '../../engine/types';
import FormationPitch from '../FormationPitch';
import { pitchRows } from '../../utils/pitchRows';

const P = (id: string, position: Player['position'], number: number, skill = 75): Player => ({
  id, name: `Jogador ${id}`, number, position, currentFatigue: 0,
  attributes: { speed: skill, stamina: skill, passing: skill, finishing: skill, tackling: skill, dribbling: skill, vision: skill, positioning: skill },
});

// 4-2-3-1: 1 GK, 4 DEF, 5 MID, 1 FWD + reservas
const team = (): Team => ({
  id: 't', name: 'Time', abbreviation: 'TIM', color: '#000', secondaryColor: '#fff', logoUrl: '',
  strategy: { formation: '4-2-3-1', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  squad: [
    P('gk', 'GK', 1), P('d1', 'DEF', 2), P('d2', 'DEF', 3), P('d3', 'DEF', 4), P('d4', 'DEF', 5),
    P('m1', 'MID', 6), P('m2', 'MID', 7), P('m3', 'MID', 8), P('m4', 'MID', 10), P('m5', 'MID', 11),
    P('f1', 'FWD', 9),
    P('f2', 'FWD', 19, 85), P('m6', 'MID', 16),
  ],
});

describe('pitchRows', () => {
  it('desenha 4-2-3-1 em GK / 4 / 2 / 3 / 1', () => {
    const t = team();
    expect(pitchRows('4-2-3-1', t.squad.slice(0, 11)).map(r => r.length)).toEqual([1, 4, 2, 3, 1]);
  });
  it('4-4-2 sem linhas de meio extras', () => {
    const t = team();
    const starters = [t.squad[0], ...t.squad.slice(1, 5), ...t.squad.slice(5, 9), t.squad[10], t.squad[11]];
    expect(pitchRows('4-4-2', starters).map(r => r.length)).toEqual([1, 4, 4, 2]);
  });
});

describe('FormationPitch', () => {
  it('tocar no titular mostra só reservas da mesma posição e troca', () => {
    const onSwap = vi.fn();
    const onSelect = vi.fn();
    const t = team();
    const { rerender } = render(<FormationPitch team={t} selectedId={null} onSelect={onSelect} onSwap={onSwap} />);
    fireEvent.click(screen.getByLabelText(/^Jogador f1,/));
    expect(onSelect).toHaveBeenCalledWith('f1');
    rerender(<FormationPitch team={t} selectedId="f1" onSelect={onSelect} onSwap={onSwap} />);
    expect(screen.getByText(/Trocar f1/)).toBeInTheDocument();
    expect(screen.queryByText(/Jogador m6/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/#19 Jogador f2/));
    expect(onSwap).toHaveBeenCalledWith(11, 10);
  });

  it('chips de formação chamam onFormation', () => {
    const onFormation = vi.fn();
    render(<FormationPitch team={team()} selectedId={null} onSelect={vi.fn()} onSwap={vi.fn()} onFormation={onFormation} />);
    fireEvent.click(screen.getByRole('button', { name: '4-4-2' }));
    expect(onFormation).toHaveBeenCalledWith('4-4-2');
  });
});
