// @vitest-environment jsdom
//
// Cobre o comportamento de `mode="league"` (regressão — roster-sync automático ao
// montar, sem input de nome) e `mode="career"` (novo — roster-sync também visível,
// input de nome do técnico com sanitização de caracteres de controle e cap de 24
// chars aplicado antes de chegar no state, conforme T-04.4-01).
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TournamentSetupScreen from '../TournamentSetupScreen';
import { makeLeague } from './testFixtures';

describe('TournamentSetupScreen — mode="league" (regressão)', () => {
  it('mostra o status de sincronização de elenco (auto-sync ao montar)', () => {
    render(
      <TournamentSetupScreen mode="league" league={makeLeague()} onBack={vi.fn()} onGoHome={vi.fn()} onStart={vi.fn()} />
    );
    expect(screen.getByText(/elencos/i)).toBeInTheDocument();
  });
});

describe('TournamentSetupScreen — mode="career"', () => {
  it('mostra o status de sincronização de elenco e o input de nome do técnico', () => {
    render(
      <TournamentSetupScreen mode="career" league={makeLeague()} onBack={vi.fn()} onGoHome={vi.fn()} onStart={vi.fn()} />
    );
    expect(screen.getByText(/elencos/i)).toBeInTheDocument();
    expect(screen.getByText('Nome do Técnico')).toBeInTheDocument();
  });

  it('remove caracteres de controle do nome do técnico ao digitar', () => {
    render(
      <TournamentSetupScreen mode="career" league={makeLeague()} onBack={vi.fn()} onGoHome={vi.fn()} onStart={vi.fn()} />
    );
    const input = screen.getByPlaceholderText('Seu nome') as HTMLInputElement;
    const dirty = String.fromCharCode(1) + 'Alex' + String.fromCharCode(2);
    fireEvent.change(input, { target: { value: dirty } });
    expect(input.value).toBe('Alex');
  });

  it('limita o nome do técnico a 24 caracteres', () => {
    render(
      <TournamentSetupScreen mode="career" league={makeLeague()} onBack={vi.fn()} onGoHome={vi.fn()} onStart={vi.fn()} />
    );
    const input = screen.getByPlaceholderText('Seu nome') as HTMLInputElement;
    const long = 'A'.repeat(40);
    fireEvent.change(input, { target: { value: long } });
    expect(input.value).toHaveLength(24);
  });
});
