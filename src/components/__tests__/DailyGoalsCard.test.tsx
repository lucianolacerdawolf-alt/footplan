// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DailyGoalsCard from '../DailyGoalsCard';

describe('DailyGoalsCard', () => {
  it('começa recolhido: mostra o resumo e esconde a lista', () => {
    render(<DailyGoalsCard />);
    const toggle = screen.getByRole('button', { name: /Metas de hoje/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(/^0\/3$/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('abre e fecha a lista ao tocar no resumo', () => {
    render(<DailyGoalsCard />);
    const toggle = screen.getByRole('button', { name: /Metas de hoje/ });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    fireEvent.click(toggle);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
