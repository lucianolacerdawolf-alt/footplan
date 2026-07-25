import { describe, it, expect } from 'vitest';
import { formatMoney } from '../formatMoney';

describe('formatMoney', () => {
  it('valores >= 1 milhão usam sufixo M com 1 casa decimal', () => {
    expect(formatMoney(1_000_000)).toBe('€1.0M');
    expect(formatMoney(2_500_000)).toBe('€2.5M');
  });

  it('valores >= 1 mil (e < 1 milhão) usam sufixo K sem casas decimais', () => {
    expect(formatMoney(1_000)).toBe('€1K');
    expect(formatMoney(45_000)).toBe('€45K');
  });

  it('valores abaixo de 1 mil mostram o número cru', () => {
    expect(formatMoney(500)).toBe('€500');
    expect(formatMoney(0)).toBe('€0');
  });

  it('valores negativos mantêm o sinal', () => {
    expect(formatMoney(-2_500_000)).toBe('-€2.5M');
    expect(formatMoney(-500)).toBe('-€500');
  });
});
