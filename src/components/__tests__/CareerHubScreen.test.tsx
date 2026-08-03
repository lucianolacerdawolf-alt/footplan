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

function renderHub(state: CareerState, onMarkInboxRead = vi.fn(), onRespondConversation = vi.fn()) {
  return render(
    <CareerHubScreen
      state={state}
      league={getLeague('pl')!}
      onViewCup={vi.fn()}
      onPlayNext={vi.fn()}
      onAdvanceSeason={vi.fn()}
      onNewCareer={vi.fn()}
      onBack={vi.fn()}
      onMarkInboxRead={onMarkInboxRead}
      onAcceptTransferOffer={vi.fn()}
      onRejectTransferOffer={vi.fn()}
      onRespondConversation={onRespondConversation}
    />
  );
}

describe('CareerHubScreen — inbox', () => {
  it('mostra inbox vazia', () => {
    renderHub(makeCareerState());
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

  it('carreira sem inbox (salva antes desta feature) usa o padrão sem quebrar', () => {
    const state = makeCareerState({ inbox: undefined });
    renderHub(state);
    expect(screen.getByText('Nenhuma mensagem por enquanto.')).toBeInTheDocument();
  });
});

describe('CareerHubScreen — conversas com atletas', () => {
  it('mostra conversa pendente e responde aplicando a escolha', () => {
    const onRespondConversation = vi.fn();
    const state = makeCareerState({
      playerConversations: [{
        id: 'c1', playerId: 'p1', playerName: 'Atacante', topic: 'praise',
        message: 'Que fase, treinador!', seasonYear: 1, round: 0, responded: false,
      }],
    });
    renderHub(state, vi.fn(), onRespondConversation);

    expect(screen.getByText('💬 Conversas com Atletas')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Atacante'));
    expect(screen.getByText(/Que fase, treinador!/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Continue assim/));
    expect(onRespondConversation).toHaveBeenCalledWith('c1', 0);
  });

  it('conversa respondida não oferece botões', () => {
    const onRespondConversation = vi.fn();
    const state = makeCareerState({
      playerConversations: [{
        id: 'c1', playerId: 'p1', playerName: 'Atacante', topic: 'form',
        message: 'Má fase.', seasonYear: 1, round: 0, responded: true,
      }],
    });
    renderHub(state, vi.fn(), onRespondConversation);

    fireEvent.click(screen.getByText('Atacante'));
    expect(screen.getByText('✓ Conversa encerrada')).toBeInTheDocument();
    expect(screen.queryByText(/Continue assim/)).not.toBeInTheDocument();
  });

  it('sem conversas mostra estado vazio', () => {
    renderHub(makeCareerState());
    expect(screen.getByText('Nenhuma conversa por enquanto.')).toBeInTheDocument();
  });
});
