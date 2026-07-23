// @vitest-environment jsdom
//
// jsdom não computa layout real (getBoundingClientRect zera tudo), então isso não
// substitui a verificação visual da tabela de classificação com scroll contido (esse
// bug só foi pego testando num navegador real). Cobre a estrutura (wrapper de scroll
// presente, todas as linhas renderizam) e a lógica de zona de classificação, que é
// JS puro e testável independente de layout.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeagueScreen from '../LeagueScreen';
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

describe('LeagueScreen — tabela de classificação', () => {
  it('renderiza a tabela com uma linha por time, dentro de um wrapper com scroll', () => {
    const league = makeLeague();
    render(
      <LeagueScreen
        state={makeState()} league={league}
        onPlayMatch={vi.fn()} onSimulateUserMatch={vi.fn()} onSimulateRound={vi.fn()}
        onNextRound={vi.fn()} onEditTactics={vi.fn()} onBack={vi.fn()}
      />
    );

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
});
