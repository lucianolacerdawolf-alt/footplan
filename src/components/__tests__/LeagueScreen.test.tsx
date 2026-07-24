// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LeagueScreen from '../LeagueScreen';
import { generateLeagueSchedule, type LeagueState } from '@/engine/tournament';
import { makeLeague, testTeams } from './testFixtures';

function makeState(): LeagueState {
  return {
    teams: testTeams,
    userTeamId: testTeams[0].id,
    fixtures: generateLeagueSchedule(testTeams),
    currentRound: 0,
    phase: 'playing',
  };
}

describe('LeagueScreen — dia de jogo (matchday)', () => {
  it('renderiza "Seu Jogo" e "Outros Jogos", sem a tabela de classificação', () => {
    render(
      <LeagueScreen
        state={makeState()} league={makeLeague()}
        onPlayMatch={vi.fn()} onSimulateUserMatch={vi.fn()} onSimulateRound={vi.fn()}
        onNextRound={vi.fn()} onEditTactics={vi.fn()} onViewTable={vi.fn()} onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Seu Jogo')).toBeInTheDocument();
    expect(screen.getByText('Outros Jogos')).toBeInTheDocument();
    expect(screen.getByText('Jogar')).toBeInTheDocument();
    // A tabela de classificação saiu pra LeagueTableScreen — não deve mais aparecer aqui.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('aciona onViewTable ao clicar em "Ver Classificação"', () => {
    const onViewTable = vi.fn();
    render(
      <LeagueScreen
        state={makeState()} league={makeLeague()}
        onPlayMatch={vi.fn()} onSimulateUserMatch={vi.fn()} onSimulateRound={vi.fn()}
        onNextRound={vi.fn()} onEditTactics={vi.fn()} onViewTable={onViewTable} onBack={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Ver Classificação/));
    expect(onViewTable).toHaveBeenCalledTimes(1);
  });

  it('aciona onPlayMatch com a fixture do usuário ao clicar em "Jogar"', () => {
    const onPlayMatch = vi.fn();
    const state = makeState();
    render(
      <LeagueScreen
        state={state} league={makeLeague()}
        onPlayMatch={onPlayMatch} onSimulateUserMatch={vi.fn()} onSimulateRound={vi.fn()}
        onNextRound={vi.fn()} onEditTactics={vi.fn()} onViewTable={vi.fn()} onBack={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Jogar'));
    expect(onPlayMatch).toHaveBeenCalledTimes(1);
    const [fixture] = onPlayMatch.mock.calls[0];
    expect(fixture.homeTeamId === state.userTeamId || fixture.awayTeamId === state.userTeamId).toBe(true);
  });
});
