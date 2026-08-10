// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CareerTabBar from '../CareerTabBar';
import { CAREER_TAB_SCREENS, getCareerTabForScreen } from '../../utils/careerTabs';

describe('CareerTabBar', () => {
  it('renderiza as 5 abas', () => {
    render(
      <CareerTabBar
        active="central"
        onCentral={vi.fn()} onElenco={vi.fn()} onTransferencias={vi.fn()}
        onMeuClube={vi.fn()} onEscritorio={vi.fn()}
      />
    );
    expect(screen.getByText('Central')).toBeInTheDocument();
    expect(screen.getByText('Elenco')).toBeInTheDocument();
    expect(screen.getByText('Transferências')).toBeInTheDocument();
    expect(screen.getByText('Meu Clube')).toBeInTheDocument();
    expect(screen.getByText('Escritório')).toBeInTheDocument();
  });

  it('destaca a aba ativa via aria-current', () => {
    render(
      <CareerTabBar
        active="transferencias"
        onCentral={vi.fn()} onElenco={vi.fn()} onTransferencias={vi.fn()}
        onMeuClube={vi.fn()} onEscritorio={vi.fn()}
      />
    );
    expect(screen.getByText('Transferências').closest('button')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Central').closest('button')).not.toHaveAttribute('aria-current');
  });

  it('aciona o callback correto ao clicar em cada aba', () => {
    const onCentral = vi.fn();
    const onElenco = vi.fn();
    const onTransferencias = vi.fn();
    const onMeuClube = vi.fn();
    const onEscritorio = vi.fn();
    render(
      <CareerTabBar
        active={null}
        onCentral={onCentral} onElenco={onElenco} onTransferencias={onTransferencias}
        onMeuClube={onMeuClube} onEscritorio={onEscritorio}
      />
    );
    fireEvent.click(screen.getByText('Elenco'));
    expect(onElenco).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Escritório'));
    expect(onEscritorio).toHaveBeenCalledTimes(1);
    expect(onCentral).not.toHaveBeenCalled();
    expect(onTransferencias).not.toHaveBeenCalled();
    expect(onMeuClube).not.toHaveBeenCalled();
  });
});

describe('getCareerTabForScreen', () => {
  it('mapeia cada tela pra aba correta', () => {
    expect(getCareerTabForScreen('career-hub')).toBe('central');
    expect(getCareerTabForScreen('transfer-market')).toBe('transferencias');
    expect(getCareerTabForScreen('career-trophy-room')).toBe('meu-clube');
    expect(getCareerTabForScreen('career-league')).toBe('escritorio');
    expect(getCareerTabForScreen('career-league-table')).toBe('escritorio');
    expect(getCareerTabForScreen('career-bracket')).toBe('escritorio');
  });

  it('retorna null pra telas fora do conjunto de abas (setup/match/stats)', () => {
    expect(getCareerTabForScreen('setup')).toBeNull();
    expect(getCareerTabForScreen('match')).toBeNull();
    expect(getCareerTabForScreen('stats')).toBeNull();
    expect(getCareerTabForScreen('season-end')).toBeNull();
  });
});

describe('CAREER_TAB_SCREENS', () => {
  it('contém exatamente as telas que devem mostrar a barra', () => {
    expect(CAREER_TAB_SCREENS.has('career-hub')).toBe(true);
    expect(CAREER_TAB_SCREENS.has('transfer-market')).toBe(true);
    expect(CAREER_TAB_SCREENS.has('career-trophy-room')).toBe(true);
    expect(CAREER_TAB_SCREENS.has('career-league')).toBe(true);
    expect(CAREER_TAB_SCREENS.has('career-league-table')).toBe(true);
    expect(CAREER_TAB_SCREENS.has('career-bracket')).toBe(true);
    expect(CAREER_TAB_SCREENS.has('setup')).toBe(false);
    expect(CAREER_TAB_SCREENS.has('match')).toBe(false);
    expect(CAREER_TAB_SCREENS.has('stats')).toBe(false);
    expect(CAREER_TAB_SCREENS.has('season-end')).toBe(false);
  });
});
