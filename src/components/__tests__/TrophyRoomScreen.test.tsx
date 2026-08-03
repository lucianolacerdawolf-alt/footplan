// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TrophyRoomScreen from '../TrophyRoomScreen';
import type { CareerSeasonHistoryEntry, TransferRecord } from '@/engine/career';
import type { Player } from '@/engine/types';

type SquadPlayer = Player;

function makeTransfer(overrides: Partial<TransferRecord> = {}): TransferRecord {
  return {
    id: 't1', date: 'Temporada 1 · Rodada 3', seasonYear: 1,
    type: 'BUY', playerName: 'Jogador Teste', playerPosition: 'MID',
    fromTeam: 'Time A', toTeam: 'Time B', amount: 5_000_000,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<CareerSeasonHistoryEntry> = {}): CareerSeasonHistoryEntry {
  return {
    year: 1,
    leagueId: 'pl',
    leagueChampionId: 'other',
    userLeaguePosition: 5,
    cupResult: 'quarterfinal',
    tradesUsed: 1,
    reputationDelta: 2,
    ...overrides,
  };
}

describe('TrophyRoomScreen', () => {
  it('mostra estado vazio quando não há temporadas concluídas', () => {
    render(<TrophyRoomScreen history={[]} />);
    expect(screen.getByText('A galeria ainda está vazia')).toBeInTheDocument();
    // Sem dados da temporada em curso, o vazio ao menos explica o que falta.
    expect(screen.getByText(/Conclua uma temporada de liga e copa/)).toBeInTheDocument();
  });

  it('estado vazio resume a temporada em curso quando ela é conhecida', () => {
    render(
      <TrophyRoomScreen
        history={[]}
        currentSeason={{
          leagueName: 'Bundesliga', position: 3, round: 12, totalRounds: 34,
          wins: 7, draws: 2, losses: 3, cupStageLabel: 'Quartas',
        }}
      />
    );
    expect(screen.getByText('Bundesliga')).toBeInTheDocument();
    expect(screen.getByText('3º')).toBeInTheDocument();
    expect(screen.getByText('12/34')).toBeInTheDocument();
    expect(screen.getByText('7V 2E 3D')).toBeInTheDocument();
    expect(screen.getByText('Quartas')).toBeInTheDocument();
  });

  it('renderiza um card por temporada, em ordem crescente de ano', () => {
    render(<TrophyRoomScreen history={[makeEntry({ year: 2 }), makeEntry({ year: 1 })]} />);
    // Escopa aos cards (botões) — o painel Minha Carreira no topo também tem números
    // soltos (ex.: "Temporadas: 2") que uma busca no documento inteiro capturaria.
    const cards = screen.getAllByRole('button');
    const years = cards.map(btn => within(btn).getByText(/^[12]$/).textContent);
    expect(years).toEqual(['1', '2']);
  });

  it('expande o card ao clicar e mostra artilheiro, campanha e finanças', () => {
    const entry = makeEntry({
      userTopScorer: { name: 'Fulano', goals: 12 },
      userWins: 10, userDraws: 5, userLosses: 3,
      userGoalsFor: 30, userGoalsAgainst: 20,
      budgetDelta: 2_500_000,
    });
    render(<TrophyRoomScreen history={[entry]} />);

    // Escopado ao card: os mesmos números aparecem no painel Minha Carreira (agregado
    // de 1 temporada = igual à própria temporada), então a asserção precisa olhar só o card.
    const card = screen.getByText('5º na liga').closest('button')!;
    expect(within(card).queryByText('Fulano (12)')).not.toBeInTheDocument();
    fireEvent.click(card);

    expect(within(card).getByText('Fulano (12)')).toBeInTheDocument();
    expect(within(card).getByText('10V 5E 3D')).toBeInTheDocument();
    expect(within(card).getByText('30 pró · 20 contra')).toBeInTheDocument();
    expect(within(card).getByText('+€2.5M')).toBeInTheDocument();
  });

  it('mostra o selo de Técnico da Temporada quando managerOfSeason é true', () => {
    render(<TrophyRoomScreen history={[makeEntry({ managerOfSeason: true })]} />);
    expect(screen.getByText('⭐ Técnico da Temporada')).toBeInTheDocument();
  });

  it('não mostra nenhum botão de voltar — a navegação é só pela barra de abas fixa', () => {
    render(<TrophyRoomScreen history={[makeEntry()]} />);
    expect(screen.queryByText(/Voltar/)).not.toBeInTheDocument();
  });

  it('mostra o FinancePanel quando finances é passado (aba Meu Clube)', () => {
    render(
      <TrophyRoomScreen
        history={[]}
        finances={{ budget: 20_000_000, wageBill: 500_000, weeklyIncome: 450_000 }}
      />
    );
    expect(screen.getByText('€20.0M')).toBeInTheDocument();
    expect(screen.getByText('€500K/sem')).toBeInTheDocument();
  });

  it('não mostra o FinancePanel quando finances não é passado', () => {
    render(<TrophyRoomScreen history={[]} />);
    expect(screen.queryByText('💰 Orçamento')).not.toBeInTheDocument();
  });

  it('não mostra a seção de transferências quando não há registros', () => {
    render(<TrophyRoomScreen history={[]} transfers={[]} />);
    expect(screen.queryByText(/Histórico de Transferências/)).not.toBeInTheDocument();
  });

  it('BUY mostra valor negativo (saída de caixa)', () => {
    render(<TrophyRoomScreen history={[]} transfers={[makeTransfer({ type: 'BUY', amount: 5_000_000 })]} />);
    expect(screen.getByText('-€5.0M')).toBeInTheDocument();
  });

  it('SELL mostra valor positivo (entrada de caixa)', () => {
    render(<TrophyRoomScreen history={[]} transfers={[makeTransfer({ type: 'SELL', amount: 3_000_000 })]} />);
    expect(screen.getByText('+€3.0M')).toBeInTheDocument();
  });

  it('SIGN_FREE_AGENT com luva mostra valor negativo; sem luva não mostra valor', () => {
    const { rerender } = render(
      <TrophyRoomScreen history={[]} transfers={[makeTransfer({ id: 'fa1', type: 'SIGN_FREE_AGENT', amount: 200_000, fromTeam: 'Free Agent' })]} />
    );
    expect(screen.getByText('-€200K')).toBeInTheDocument();

    rerender(<TrophyRoomScreen history={[]} transfers={[makeTransfer({ id: 'fa2', type: 'SIGN_FREE_AGENT', amount: 0, fromTeam: 'Free Agent' })]} />);
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });

  it('TRADE com compensação em dinheiro mostra valor negativo; TRADE seca não mostra valor', () => {
    const { rerender } = render(
      <TrophyRoomScreen history={[]} transfers={[makeTransfer({ id: 't2', type: 'TRADE', amount: 1_000_000, playerName: 'A ↔ B' })]} />
    );
    expect(screen.getByText('-€1.0M')).toBeInTheDocument();

    rerender(<TrophyRoomScreen history={[]} transfers={[makeTransfer({ id: 't3', type: 'TRADE', amount: 0, playerName: 'A ↔ B' })]} />);
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });

  it('lista em ordem reverse-cronológica (mais recente primeiro)', () => {
    render(
      <TrophyRoomScreen
        history={[]}
        transfers={[
          makeTransfer({ id: 'first', playerName: 'Primeiro Jogador' }),
          makeTransfer({ id: 'second', playerName: 'Segundo Jogador' }),
        ]}
      />
    );
    const names = screen.getAllByText(/Jogador$/).map(el => el.textContent);
    expect(names).toEqual(['Segundo Jogador', 'Primeiro Jogador']);
  });

  it('lista contratos a expirar e renova ao clicar', () => {
    const onRenewContract = vi.fn();
    const userSquad = [
      { id: 'p1', name: 'Zagueiro X', number: 4, position: 'DEF', currentFatigue: 0, contractSeasonsLeft: 1,
        attributes: { speed: 60, stamina: 60, passing: 60, finishing: 60, tackling: 60, dribbling: 60, vision: 60, positioning: 60 } },
      { id: 'p2', name: 'Atacante Y', number: 9, position: 'FWD', currentFatigue: 0, contractSeasonsLeft: 2,
        attributes: { speed: 80, stamina: 80, passing: 80, finishing: 80, tackling: 80, dribbling: 80, vision: 80, positioning: 80 } },
    ] as SquadPlayer[];
    render(<TrophyRoomScreen history={[]} transfers={[]} userSquad={userSquad} onRenewContract={onRenewContract} />);

    expect(screen.getByText('📋 Gestão de Contratos')).toBeInTheDocument();
    // Só o jogador com contrato ≤1 aparece na lista de vencimento.
    expect(screen.getByText('Zagueiro X')).toBeInTheDocument();
    expect(screen.queryByText('Atacante Y')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Renovar'));
    expect(onRenewContract).toHaveBeenCalledWith('p1');
  });

  it('mostra mensagem quando nenhum contrato vence', () => {
    const userSquad = [
      { id: 'p1', name: 'Zagueiro X', number: 4, position: 'DEF', currentFatigue: 0, contractSeasonsLeft: 3,
        attributes: { speed: 60, stamina: 60, passing: 60, finishing: 60, tackling: 60, dribbling: 60, vision: 60, positioning: 60 } },
    ] as SquadPlayer[];
    render(<TrophyRoomScreen history={[]} transfers={[]} userSquad={userSquad} />);
    expect(screen.getByText(/Nenhum contrato vencendo/)).toBeInTheDocument();
  });

  it('sem elenco (userSquad ausente) não renderiza a seção de contratos', () => {
    render(<TrophyRoomScreen history={[]} transfers={[]} />);
    expect(screen.queryByText('📋 Gestão de Contratos')).not.toBeInTheDocument();
  });

  it('mostra identidade do clube no hero (nome, liga, temporada e estádio)', () => {
    render(
      <TrophyRoomScreen
        history={[]}
        userTeamName="Palmeiras"
        userTeamLogo="logo.png"
        leagueName="Serie A"
        leagueFlag="🇧🇷"
        seasonYear={3}
        stadium="Allianz Parque"
      />
    );
    expect(screen.getByText('Palmeiras')).toBeInTheDocument();
    expect(screen.getByText(/Serie A/)).toBeInTheDocument();
    expect(screen.getByText(/Temporada 3/)).toBeInTheDocument();
    expect(screen.getByText(/Allianz Parque/)).toBeInTheDocument();
  });

  it('sem identidade (sala usada fora do modo carreira) não mostra hero', () => {
    render(<TrophyRoomScreen history={[]} />);
    expect(screen.queryByText(/Temporada/)).not.toBeInTheDocument();
  });

  it('botão de negociar patrocínio chama onRenegotiateSponsor', () => {
    const onRenegotiateSponsor = vi.fn();
    render(
      <TrophyRoomScreen
        history={[]}
        sponsorName="Banco X"
        nextSponsorTier="global"
        onRenegotiateSponsor={onRenegotiateSponsor}
      />
    );
    fireEvent.click(screen.getByText(/Negociar patrocínio/));
    expect(onRenegotiateSponsor).toHaveBeenCalled();
  });

  it('sem patrocínio elegível não mostra botão de negociação', () => {
    render(<TrophyRoomScreen history={[]} sponsorLabel="Global" nextSponsorTier={null} onRenegotiateSponsor={vi.fn()} />);
    expect(screen.queryByText(/Negociar patrocínio/)).not.toBeInTheDocument();
  });
});
