// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContractRenewalModal from '../ContractRenewalModal';
import type { Player } from '@/engine/types';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1', name: 'Teste FC', number: 9, position: 'FWD', currentFatigue: 0,
    age: 25, marketValue: 10_000_000, weeklyWage: 20_000, contractSeasonsLeft: 1,
    attributes: { speed: 80, stamina: 80, passing: 80, finishing: 80, tackling: 80, dribbling: 80, vision: 80, positioning: 80 },
    ...overrides,
  };
}

describe('ContractRenewalModal', () => {
  it('renderiza as opções e confirma com os termos negociados', () => {
    const onConfirm = vi.fn();
    render(<ContractRenewalModal player={makePlayer()} budget={50_000_000} currentSeasonYear={1} onConfirm={onConfirm} onClose={vi.fn()} />);

    expect(screen.getByText('Anos de contrato')).toBeInTheDocument();
    expect(screen.getByText('Salário semanal')).toBeInTheDocument();
    expect(screen.getByText('Bônus de assinatura (à vista)')).toBeInTheDocument();
    expect(screen.getByText('Meta de contrato (bônus no fim da temporada)')).toBeInTheDocument();

    // "+50%" + bônus de 10% + meta de 15 gols.
    fireEvent.click(screen.getByText('+50%'));
    fireEvent.click(screen.getByText('10%'));
    fireEvent.click(screen.getByText('15 gols'));
    fireEvent.click(screen.getByText('Confirmar Renovação'));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      years: 1,
      signingBonus: 1_000_000,
      contractGoal: { type: 'goals', target: 15, bonus: 1_000_000 },
    }));
  });

  it('bloqueia o confirmar quando a proposta é recusada pelo jogador', () => {
    const onConfirm = vi.fn();
    // OVR muito alto (≥85) eleva a demanda; "Manter" fica abaixo de 85% → recusa.
    const star = makePlayer({
      attributes: { speed: 92, stamina: 92, passing: 92, finishing: 92, tackling: 92, dribbling: 92, vision: 92, positioning: 92 },
      marketValue: 30_000_000, weeklyWage: 40_000,
    });
    render(<ContractRenewalModal player={star} budget={50_000_000} currentSeasonYear={1} onConfirm={onConfirm} onClose={vi.fn()} />);

    expect(screen.getByText(/recusa/)).toBeInTheDocument();
    const confirmBtn = screen.getByText('Confirmar Renovação');
    expect(confirmBtn).toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('aceitar contraproposta preenche os termos e libera o confirmar', () => {
    const onConfirm = vi.fn();
    // OVR baixo = demanda baixa → o padrão "Manter" gera contraproposta (não recusa).
    const weak = makePlayer({
      attributes: { speed: 50, stamina: 50, passing: 50, finishing: 50, tackling: 50, dribbling: 50, vision: 50, positioning: 50 },
      marketValue: 2_000_000, weeklyWage: 4_000,
    });
    render(<ContractRenewalModal player={weak} budget={50_000_000} currentSeasonYear={1} onConfirm={onConfirm} onClose={vi.fn()} />);

    const counterBtn = screen.getByText('✅ Aceitar contraproposta');
    fireEvent.click(counterBtn);

    const confirmBtn = screen.getByText('Confirmar Renovação');
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('mostra banner de cooldown e bloqueia tudo quando renovou na safra atual', () => {
    const onConfirm = vi.fn();
    render(<ContractRenewalModal player={makePlayer({ lastRenewedSeasonYear: 2 })} budget={50_000_000} currentSeasonYear={2} onConfirm={onConfirm} onClose={vi.fn()} />);

    expect(screen.getAllByText(/renovou recentemente/).length).toBeGreaterThan(0);
    expect(screen.getByText('Confirmar Renovação')).toBeDisabled();
  });
});
