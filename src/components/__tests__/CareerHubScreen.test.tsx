// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CareerHubScreen from '../CareerHubScreen';
import { createCareerSeason } from '@/engine/career';
import type { CareerState } from '@/engine/career';
import { getLeague } from '@/data/leagues';

function makeCareerState(overrides: Partial<CareerState> = {}): CareerState {
  const leagueDef = getLeague('pl')!;
  const userTeam = leagueDef.teams[0];
  const { league, cup } = createCareerSeason(userTeam, leagueDef.teams, leagueDef, () => 0.5);
  return {
    version: 1,
    leagueId: 'pl',
    manager: { name: 'Alex', reputation: 10 },
    currentSeasonYear: 1,
    season: { league, cup, tradesUsedThisSeason: 0 },
    rosters: { pl: leagueDef.teams },
    history: [],
    finances: { budget: 20_000_000, wageBill: 500_000, weeklyIncome: 450_000 },
    inbox: [],
    ...overrides,
  };
}

function renderHub(state: CareerState, onMarkInboxRead = vi.fn()) {
  return render(
    <CareerHubScreen
      state={state}
      league={getLeague('pl')!}
      onViewLeague={vi.fn()}
      onViewCup={vi.fn()}
      onPlayNext={vi.fn()}
      onProposeTrade={vi.fn()}
      onAdvanceSeason={vi.fn()}
      onNewCareer={vi.fn()}
      onBack={vi.fn()}
      onMarkInboxRead={onMarkInboxRead}
      onViewTrophyRoom={vi.fn()}
    />
  );
}

describe('CareerHubScreen — finanças e inbox', () => {
  it('mostra orçamento, folha salarial e inbox vazia', () => {
    renderHub(makeCareerState());
    expect(screen.getByText('€20.0M')).toBeInTheDocument();
    expect(screen.getByText('€500K/sem')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma mensagem por enquanto.')).toBeInTheDocument();
  });

  it('mostra mensagens da inbox e marca como lida ao clicar', () => {
    const onMarkInboxRead = vi.fn();
    const state = makeCareerState({
      inbox: [{ id: 'm1', date: 'T1', isRead: false, isMandatory: false, type: 'BOARD_UPDATE', subject: 'Bem-vindo', body: 'Boa sorte!' }],
    });
    renderHub(state, onMarkInboxRead);

    fireEvent.click(screen.getByText('Bem-vindo'));
    expect(onMarkInboxRead).toHaveBeenCalledWith('m1');
    expect(screen.getByText('Boa sorte!')).toBeInTheDocument();
  });

  it('marca mensagem obrigatória com selo "Obrigatória" enquanto não lida', () => {
    const state = makeCareerState({
      inbox: [{ id: 'm2', date: 'T1', isRead: false, isMandatory: true, type: 'INJURY_REPORT', subject: 'Lesão: Fulano', body: 'Fora por 2 rodadas.' }],
    });
    renderHub(state);
    expect(screen.getByText('Obrigatória')).toBeInTheDocument();
  });

  it('carreira sem finances/inbox (salva antes desta feature) usa o padrão sem quebrar', () => {
    const state = makeCareerState({ finances: undefined, inbox: undefined });
    renderHub(state);
    expect(screen.getByText('€20.0M')).toBeInTheDocument(); // DEFAULT_FINANCES.budget
    expect(screen.getByText('Nenhuma mensagem por enquanto.')).toBeInTheDocument();
  });
});
