// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CareerHubScreen from '../CareerHubScreen';
import { createCareerSeason } from '@/engine/career';
import type { CareerState } from '@/engine/career';
import { getLeague } from '@/data/leagues';
import type { Team } from '@/engine/types';
import type { PressConferenceQuestion } from '@/engine/pressConference';

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

function renderHub(
  state: CareerState,
  onMarkInboxRead = vi.fn(),
  onRespondConversation = vi.fn(),
  f3: {
    onApplyTraining?: (c: 'intense' | 'light' | 'rest') => void;
    onOpenPressConference?: (t: Team) => void;
    onAnswerPressConference?: (i: number) => void;
    onClosePressConference?: () => void;
    pressQuestion?: PressConferenceQuestion | null;
    pressDone?: boolean;
  } = {},
) {
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
      onApplyTraining={f3.onApplyTraining ?? vi.fn()}
      onOpenPressConference={f3.onOpenPressConference ?? vi.fn()}
      onAnswerPressConference={f3.onAnswerPressConference ?? vi.fn()}
      onClosePressConference={f3.onClosePressConference ?? vi.fn()}
      pressQuestion={f3.pressQuestion}
      pressDone={f3.pressDone}
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

describe('CareerHubScreen — preparação pré-jogo (Fase 3)', () => {
  it('mostra opções de treino e chama onApplyTraining ao escolher', () => {
    const onApplyTraining = vi.fn();
    renderHub(makeCareerState(), vi.fn(), vi.fn(), { onApplyTraining });

    expect(screen.getByText('🎙️ Preparação Pré-Jogo')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Treino Intenso'));
    expect(onApplyTraining).toHaveBeenCalledWith('intense');
    fireEvent.click(screen.getByText('Descanso'));
    expect(onApplyTraining).toHaveBeenCalledWith('rest');
  });

  it('treino já feito desabilita os botões', () => {
    const onApplyTraining = vi.fn();
    renderHub(makeCareerState({ preMatchDoneRound: 0 }), vi.fn(), vi.fn(), { onApplyTraining });

    const btn = screen.getByText('Treino Intenso');
    expect(btn.closest('button')).toBeDisabled();
  });

  it('abre a coletiva com a pergunta e responde chamando onAnswerPressConference', () => {
    const onOpenPressConference = vi.fn();
    const onAnswerPressConference = vi.fn();
    const onClosePressConference = vi.fn();
    const pressQuestion: PressConferenceQuestion = {
      id: 'press-1', context: 'neutral', question: 'Como o elenco chega?',
      responses: [
        { label: 'Confiante', moraleDelta: 2 },
        { label: 'Focado', moraleDelta: 0 },
        { label: 'Com dúvidas', moraleDelta: -2 },
      ],
    };
    renderHub(makeCareerState(), vi.fn(), vi.fn(), {
      onOpenPressConference, onAnswerPressConference, onClosePressConference, pressQuestion,
    });

    expect(screen.getByText('🎤 Conceder Coletiva →')).toBeInTheDocument();
    // A pergunta ativa é renderizada no modal.
    expect(screen.getByText('Como o elenco chega?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confiante'));
    expect(onAnswerPressConference).toHaveBeenCalledWith(0);
  });

  it('coletiva já feita desabilita o botão', () => {
    const onOpenPressConference = vi.fn();
    renderHub(makeCareerState({ pressDoneRound: 0 }), vi.fn(), vi.fn(), {
      onOpenPressConference, pressDone: true,
    });

    const btn = screen.getByText(/Conceder Coletiva/);
    expect(btn).toBeDisabled();
  });
});

describe('CareerHubScreen — status do backup na nuvem', () => {
  function renderWithCloud(cloudStatus?: 'idle' | 'loading' | 'saving' | 'saved' | 'offline', onRetryCloudSave = vi.fn()) {
    return render(
      <CareerHubScreen
        state={makeCareerState()}
        league={getLeague('pl')!}
        onViewCup={vi.fn()}
        onViewContinental={vi.fn()}
        onPlayNext={vi.fn()}
        onPlayNextCup={vi.fn()}
        onPlayNextContinental={vi.fn()}
        onAdvanceSeason={vi.fn()}
        onNewCareer={vi.fn()}
        onBack={vi.fn()}
        onMarkInboxRead={vi.fn()}
        onAcceptTransferOffer={vi.fn()}
        onRejectTransferOffer={vi.fn()}
        onNextRound={vi.fn()}
        onOpenJobMarket={vi.fn()}
        jobOfferCount={0}
        onViewLeague={vi.fn()}
        cloudStatus={cloudStatus}
        onRetryCloudSave={onRetryCloudSave}
      />
    );
  }

  it('não mostra nada quando a nuvem não está configurada (idle)', () => {
    renderWithCloud('idle');
    expect(screen.queryByText(/Backup na nuvem/)).not.toBeInTheDocument();
  });

  it('não mostra nada durante o load inicial (loading)', () => {
    renderWithCloud('loading');
    expect(screen.queryByText(/Backup na nuvem/)).not.toBeInTheDocument();
  });

  it('mostra confirmação discreta quando o backup está em dia', () => {
    renderWithCloud('saved');
    expect(screen.getByText(/Backup na nuvem em dia/)).toBeInTheDocument();
  });

  it('mostra a falha e chama onRetryCloudSave ao clicar em "Tentar de novo"', () => {
    const onRetryCloudSave = vi.fn();
    renderWithCloud('offline', onRetryCloudSave);

    expect(screen.getByText(/Backup na nuvem falhou/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Tentar de novo'));
    expect(onRetryCloudSave).toHaveBeenCalledTimes(1);
  });
});
