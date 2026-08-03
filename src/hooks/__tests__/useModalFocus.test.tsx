// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useModalFocus } from '../useModalFocus';

function Modal({ onClose }: { onClose: () => void }) {
  const ref = useModalFocus<HTMLDivElement>(true, onClose);
  return (
    <div data-testid="dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby="t">
      <h2 id="t">Título</h2>
      <button>Primeiro</button>
      <button>Último</button>
    </div>
  );
}

describe('useModalFocus', () => {
  it('move o foco para o primeiro elemento focável ao abrir', () => {
    render(
      <div>
        <button data-testid="trigger">Abrir</button>
        <Modal onClose={vi.fn()} />
      </div>
    );
    // Primeiro elemento focável do modal (o botão "Primeiro") deve receber o foco.
    expect(screen.getByText('Primeiro')).toHaveFocus();
  });

  it('chama onClose ao pressionar Escape', () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    // O listener é registrado no document num listener de captura.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('fecha com tab na borda sem vazar (trap mantém no modal)', () => {
    render(
      <div>
        <button data-testid="outside">Fora</button>
        <Modal onClose={vi.fn()} />
      </div>
    );
    const last = screen.getByText('Último');
    last.focus();
    // Foca o último botão e pressiona Tab no document — o trap deve voltar pro 1º.
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByText('Primeiro')).toHaveFocus();
  });

  it('shift+tab na primeira borda volta pro último', () => {
    render(
      <div>
        <button data-testid="outside">Fora</button>
        <Modal onClose={vi.fn()} />
      </div>
    );
    const first = screen.getByText('Primeiro');
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByText('Último')).toHaveFocus();
  });
});
