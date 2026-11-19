// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TransferMarketScreen from '../TransferMarketScreen';
import RoundSummaryModal from '../RoundSummaryModal';
import PlayerDetailModal from '../PlayerDetailModal';
import JobMarketScreen from '../JobMarketScreen';
import { makeTeam } from './testFixtures';
import { playerOvr } from '@/utils/playerOvr';
import { ovrText } from '@/engine/scouting';
import type { RoundSummary, JobOffer } from '@/engine/career';
import type { Team } from '@/engine/types';

// O Mercado só sincroniza elenco ao abrir outra liga — nunca nestes testes, mas sem rede.
vi.mock('@/services/rosterSync', () => ({ syncLeagueRoster: vi.fn(() => Promise.resolve({ source: 'static' })) }));

const user = makeTeam('meu', 'Meu Time', 'MEU');
const rival = makeTeam('rival', 'Rival', 'RIV');
const foreign = makeTeam('estr', 'Estrangeiro', 'EST');
const rosters: Record<string, Team[]> = { pl: [user, rival], laliga: [foreign] };

function renderMarket(over: Partial<React.ComponentProps<typeof TransferMarketScreen>> = {}) {
  const props: React.ComponentProps<typeof TransferMarketScreen> = {
    userTeam: user, userLeagueId: 'pl', rosters, freeAgents: [], transferListPlayerIds: [],
    budget: 500_000_000, isWindowOpen: true,
    scouting: { scoutedIds: [], reportsLeft: 3 },
    onScoutPlayer: vi.fn(() => true),
    onBuyPlayer: vi.fn(() => ({ success: true, reason: 'ok' })),
    onListPlayerForSale: vi.fn(() => ({ success: true, reason: 'ok' })),
    onUnlistPlayerForSale: vi.fn(),
    onSignFreeAgent: vi.fn(() => ({ success: true, reason: 'ok' })),
    ...over,
  };
  render(<TransferMarketScreen {...props} />);
  return props;
}

function search(text: string) {
  fireEvent.change(screen.getByPlaceholderText(/Buscar jogador/), { target: { value: text } });
}

describe('Mercado com olheiros', () => {
  it('jogador de outra liga aparece só com a faixa de OVR; da própria liga, com o OVR exato', () => {
    renderMarket();
    expect(screen.getByText(/3<\/strong>|relatórios nesta rodada/)).toBeInTheDocument();

    search('Estrangeiro Atacante');
    const fwd = foreign.squad.find(p => p.position === 'FWD')!;
    expect(screen.getByText(ovrText(fwd, false))).toBeInTheDocument();
    expect(ovrText(fwd, false)).toMatch(/^\d+-\d+$/);

    search('Rival Atacante');
    const rivalFwd = rival.squad.find(p => p.position === 'FWD')!;
    const row = screen.getByText('Rival Atacante').closest('button')!;
    expect(within(row).getByText(String(playerOvr(rivalFwd)))).toBeInTheDocument();
  });

  it('jogador já observado mostra o OVR exato', () => {
    const fwd = foreign.squad.find(p => p.position === 'FWD')!;
    renderMarket({ scouting: { scoutedIds: [fwd.id], reportsLeft: 2 } });
    search('Estrangeiro Atacante');
    const row = screen.getByText('Estrangeiro Atacante').closest('button')!;
    expect(within(row).getByText(String(playerOvr(fwd)))).toBeInTheDocument();
  });

  it('a ficha de quem não foi observado esconde os atributos e manda o olheiro', () => {
    const props = renderMarket();
    search('Estrangeiro Atacante');
    fireEvent.click(screen.getByLabelText('Ver detalhes de Estrangeiro Atacante'));
    expect(screen.getAllByText('?').length).toBe(8);
    fireEvent.click(screen.getByText(/Mandar olheiro \(3 restantes\)/));
    expect(props.onScoutPlayer).toHaveBeenCalledWith(foreign.squad.find(p => p.position === 'FWD')!.id);
  });

  it('proposta que estoura o teto salarial avisa e não deixa confirmar', () => {
    renderMarket({ wageCap: 1 });
    search('Estrangeiro Atacante');
    fireEvent.click(screen.getByText('Estrangeiro Atacante').closest('button')!);
    expect(screen.getByText('A diretoria vai vetar: estoura o teto salarial.')).toBeInTheDocument();
    expect(screen.getByText('Confirmar Oferta')).toBeDisabled();
  });

  it('sem olheiros configurados (saves de teste antigos), tudo fica visível', () => {
    renderMarket({ scouting: undefined });
    search('Estrangeiro Atacante');
    const fwd = foreign.squad.find(p => p.position === 'FWD')!;
    const row = screen.getByText('Estrangeiro Atacante').closest('button')!;
    expect(within(row).getByText(String(playerOvr(fwd)))).toBeInTheDocument();
    expect(screen.queryByText(/relatórios? nesta rodada/)).not.toBeInTheDocument();
  });
});

describe('Ficha do jogador', () => {
  const p = makeTeam('x', 'Fulano', 'FUL').squad[3];

  it('conhecido: mostra o OVR e os 8 atributos', () => {
    render(<PlayerDetailModal player={p} onClose={vi.fn()} />);
    // Atleta de teste tem todos os atributos = 75 (= OVR): 1 no selo + 8 atributos.
    expect(screen.getAllByText(String(playerOvr(p)))).toHaveLength(9);
    expect(screen.queryByText('?')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mandar olheiro/)).not.toBeInTheDocument();
  });

  it('sem relatórios na rodada, o botão do olheiro fica desabilitado', () => {
    render(<PlayerDetailModal player={p} onClose={vi.fn()} hidden scoutReportsLeft={0} onScout={vi.fn()} />);
    expect(screen.getByText('Sem relatórios nesta rodada')).toBeDisabled();
    expect(screen.getByText(ovrText(p, false))).toBeInTheDocument();
  });
});

describe('Resumo da rodada', () => {
  const summary: RoundSummary = {
    seasonYear: 1, round: 7,
    user: { homeName: 'Meu Time', awayName: 'Rival', homeScore: 2, awayScore: 0, userHome: true, scorers: ['Fulano (2)'] },
    others: [{ home: 'A', away: 'B', homeScore: 1, awayScore: 1 }],
    positionBefore: 6, positionAfter: 4, totalTeams: 20,
    money: { sponsor: 1_000_000, tickets: 500_000, merch: 0, wages: 900_000, opex: 300_000, events: 0, net: 300_000, budget: 40_000_000 },
    confidence: { before: 58, after: 63, reasons: ['Vitória contra Rival: +5'] },
    seen: false,
  };

  it('mostra resultado, subida na tabela, dinheiro e motivos da diretoria', () => {
    const onClose = vi.fn();
    render(<RoundSummaryModal summary={summary} onClose={onClose} />);
    expect(screen.getByText('Resumo · Rodada 7')).toBeInTheDocument();
    expect(screen.getByText('2 – 0')).toBeInTheDocument();
    expect(screen.getByText('⚽ Fulano (2)')).toBeInTheDocument();
    expect(screen.getByText('▲ subiu 2')).toBeInTheDocument();
    expect(screen.getByText('63%')).toBeInTheDocument();
    expect(screen.getByText('Vitória contra Rival: +5')).toBeInTheDocument();
    expect(screen.getByText('Bilheteria')).toBeInTheDocument();
    expect(screen.queryByText('Produtos')).not.toBeInTheDocument(); // linha zerada some
    expect(screen.getByText('Outros jogos')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Continuar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('derrota e queda na tabela aparecem como queda', () => {
    render(<RoundSummaryModal summary={{
      ...summary, positionBefore: 3, positionAfter: 5,
      user: { ...summary.user!, homeScore: 0, awayScore: 1 },
      confidence: { before: 60, after: 55, reasons: [] },
    }} onClose={vi.fn()} />);
    expect(screen.getByText('▼ caiu 2')).toBeInTheDocument();
    expect(screen.getByText(/▼ 5/)).toBeInTheDocument();
  });
});

describe('Mercado de Treinador demitido', () => {
  const offer = (id: string): JobOffer => ({ id, clubId: rival.id, leagueId: 'pl', clubName: `Clube ${id}`, reputationRequired: 0, offeredSeasonYear: 1 });
  const base = { reputation: 10, currentClubName: 'Meu Time', rosters, onAccept: vi.fn(), onDecline: vi.fn(), onBack: vi.fn() };

  it('com a última proposta, esconde o Recusar e explica', () => {
    render(<JobMarketScreen {...base} offers={[offer('a')]} sacked />);
    expect(screen.queryByText('Recusar')).not.toBeInTheDocument();
    expect(screen.getByText(/Você está sem clube/)).toBeInTheDocument();
  });

  it('com mais de uma proposta ainda pode recusar', () => {
    render(<JobMarketScreen {...base} offers={[offer('a'), offer('b')]} sacked />);
    expect(screen.getAllByText('Recusar')).toHaveLength(2);
  });

  it('fora da demissão, sempre pode recusar', () => {
    render(<JobMarketScreen {...base} offers={[offer('a')]} />);
    expect(screen.getByText('Recusar')).toBeInTheDocument();
  });
});
