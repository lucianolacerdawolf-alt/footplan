// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SquadManagementScreen from '../SquadManagementScreen';
import type { Team, Player } from '@/engine/types';

function makePlayer(id: string, name: string, position: Player['position'], number: number): Player {
  return {
    id, name, number, position, currentFatigue: 0,
    attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
  };
}

function makeTeam(): Team {
  return {
    id: 't1', name: 'Time Teste', abbreviation: 'TST', color: '#111', secondaryColor: '#222', logoUrl: '',
    squad: [
      // titulares (4-3-3: 1 GK + 4 DEF + 3 MID + 3 FWD)
      makePlayer('gk1', 'Goleiro Titular', 'GK', 1),
      makePlayer('def1', 'Zagueiro A', 'DEF', 2),
      makePlayer('def2', 'Zagueiro B', 'DEF', 3),
      makePlayer('def3', 'Zagueiro C', 'DEF', 4),
      makePlayer('def4', 'Zagueiro D', 'DEF', 5),
      makePlayer('mid1', 'Meia A', 'MID', 6),
      makePlayer('mid2', 'Meia B', 'MID', 7),
      makePlayer('mid3', 'Meia C', 'MID', 8),
      makePlayer('fwd1', 'Atacante A', 'FWD', 9),
      makePlayer('fwd2', 'Atacante B', 'FWD', 10),
      makePlayer('fwd3', 'Atacante C', 'FWD', 11),
      // reservas
      makePlayer('gk2', 'Goleiro Reserva', 'GK', 12),
      makePlayer('def5', 'Zagueiro Reserva', 'DEF', 13),
      makePlayer('mid4', 'Meia Reserva', 'MID', 14),
      makePlayer('mid5', 'Meia Reserva 2', 'MID', 16),
      makePlayer('fwd4', 'Atacante Reserva', 'FWD', 15),
    ],
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

describe('SquadManagementScreen', () => {
  it('mostra nome do time e a lista de reservas', () => {
    render(<SquadManagementScreen team={makeTeam()} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Time Teste')).toBeInTheDocument();
    expect(screen.getByText('Reservas (5)')).toBeInTheDocument();
    expect(screen.getByText('Atacante Reserva')).toBeInTheDocument();
  });

  it('troca um reserva por um titular da mesma posição ao selecionar os dois', () => {
    const onSave = vi.fn();
    render(<SquadManagementScreen team={makeTeam()} onSave={onSave} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Atacante Reserva'));
    fireEvent.click(screen.getByLabelText('Atacante A, FWD, #9'));
    fireEvent.click(screen.getByText('Salvar Escalação ✓'));

    const saved: Team = onSave.mock.calls[0][0];
    expect(saved.squad.slice(0, 11).map(p => p.id)).toContain('fwd4');
    expect(saved.squad.slice(0, 11).map(p => p.id)).not.toContain('fwd1');
    expect(saved.squad.slice(11).map(p => p.id)).toContain('fwd1');
  });

  it('não troca jogadores de posições diferentes', () => {
    const onSave = vi.fn();
    const original = makeTeam();
    render(<SquadManagementScreen team={original} onSave={onSave} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Zagueiro Reserva')); // DEF
    fireEvent.click(screen.getByLabelText('Atacante A, FWD, #9')); // FWD — posição diferente, não troca
    fireEvent.click(screen.getByText('Salvar Escalação ✓'));

    const saved: Team = onSave.mock.calls[0][0];
    expect(saved.squad.map(p => p.id)).toEqual(original.squad.map(p => p.id));
  });

  it('trocar formação reorganiza titulares/reservas por posição', () => {
    const onSave = vi.fn();
    render(<SquadManagementScreen team={makeTeam()} onSave={onSave} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Formação'), { target: { value: '4-2-3-1' } });
    fireEvent.click(screen.getByText('Salvar Escalação ✓'));

    const saved: Team = onSave.mock.calls[0][0];
    expect(saved.strategy.formation).toBe('4-2-3-1');
    const starters = saved.squad.slice(0, 11); // 1 GK + 4 DEF + 5 MID + 1 FWD
    expect(starters.filter(p => p.position === 'MID')).toHaveLength(5);
    expect(starters.filter(p => p.position === 'FWD')).toHaveLength(1);
  });

  it('chama onClose ao clicar no botão de fechar', () => {
    const onClose = vi.fn();
    render(<SquadManagementScreen team={makeTeam()} onSave={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Fechar sem salvar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não deixa escalar um reserva suspenso', () => {
    const onSave = vi.fn();
    const team = makeTeam();
    const idx = team.squad.findIndex(p => p.id === 'fwd4');
    team.squad[idx] = { ...team.squad[idx], isSuspended: true, suspendedRounds: 1 };
    render(<SquadManagementScreen team={team} onSave={onSave} onClose={vi.fn()} />);

    expect(screen.getByTitle('Suspenso')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Atacante Reserva')); // suspenso — clique não deve selecionar
    fireEvent.click(screen.getByLabelText('Atacante A, FWD, #9'));
    fireEvent.click(screen.getByText('Salvar Escalação ✓'));

    const saved: Team = onSave.mock.calls[0][0];
    expect(saved.squad.map(p => p.id)).toEqual(team.squad.map(p => p.id));
  });
});
