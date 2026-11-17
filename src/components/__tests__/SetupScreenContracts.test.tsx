// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SetupScreen from '../SetupScreen';
import { makeTeam } from './testFixtures';

describe('SetupScreen — renovação de contrato', () => {
  it('só quem vence ganha o botão Renovar; os outros renovam pelo badge', () => {
    const team = makeTeam('t1', 'Time A', 'TMA');
    const pos = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD', 'MID'] as const;
    const base = team.squad[0];
    team.squad = pos.map((position, i) => ({ ...base, id: `p${i}`, name: i === 1 ? 'Time A Zagueiro' : `Jogador ${i}`, number: i + 1, position, contractSeasonsLeft: i === 0 ? 1 : 3 }));
    const onRenew = vi.fn();
    render(
      <SetupScreen homeTeam={team} awayTeam={makeTeam('t2', 'Time B', 'TMB')} onStartMatch={vi.fn()} onBack={vi.fn()}
        lockAway userIsHome mode="career" isTacticsOnly onRenewContract={onRenew} currentSeasonYear={1} budget={1e9} />,
    );
    fireEvent.click(screen.getByText('Gerenciar Elenco'));
    expect(screen.getAllByText('Renovar')).toHaveLength(1);
    const before = screen.queryAllByRole('dialog').length;
    fireEvent.click(screen.getByLabelText('Contrato de Time A Zagueiro: 3 temporadas. Renovar'));
    expect(screen.queryAllByRole('dialog').length).toBe(before + 1);
  });
});
