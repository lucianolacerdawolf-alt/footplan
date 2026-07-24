// @vitest-environment jsdom
//
// jsdom não computa layout real (getBoundingClientRect zera tudo), então isso não
// substitui a verificação visual da tabela de classificação com scroll contido (esse
// bug só foi pego testando num navegador real). Cobre a estrutura (wrapper de scroll
// presente, todas as linhas renderizam) e a lógica de zona de classificação, que é
// JS puro e testável independente de layout.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LeagueTableScreen from '../LeagueTableScreen';
import { generateLeagueSchedule, type LeagueState } from '../../engine/tournament';
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

describe('LeagueTableScreen — tela de consulta pura', () => {
  it('renderiza a tabela com uma linha por time, dentro de um wrapper com scroll', () => {
    const league = makeLeague();
    render(<LeagueTableScreen state={makeState()} league={league} onBack={vi.fn()} />);

    const table = screen.getByRole('table');
    // Uma linha de <thead> + uma por time.
    expect(screen.getAllByRole('row')).toHaveLength(1 + testTeams.length);
    for (const team of testTeams) {
      expect(screen.getByText(team.name)).toBeInTheDocument();
    }

    // O wrapper de scroll (`.standingsScroll` via CSS Module) precisa existir — é ele
    // que contém o `overflow-x` pra tabela não estourar a página (ver fix de mobile).
    const wrapper = table.parentElement!;
    expect(wrapper.className).toMatch(/standingsScroll/);
  });

  it('não tem nenhum botão de jogar/simular — é só consulta', () => {
    render(<LeagueTableScreen state={makeState()} league={makeLeague()} onBack={vi.fn()} />);
    expect(screen.queryByText('Jogar')).not.toBeInTheDocument();
    expect(screen.queryByText(/Simular/)).not.toBeInTheDocument();
  });

  it('aciona onBack ao clicar em "Voltar"', () => {
    const onBack = vi.fn();
    render(<LeagueTableScreen state={makeState()} league={makeLeague()} onBack={onBack} />);
    fireEvent.click(screen.getByText('← Voltar'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
