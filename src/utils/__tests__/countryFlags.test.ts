import { describe, it, expect } from 'vitest';
import { countryFlagEmoji } from '../countryFlags';

describe('countryFlagEmoji', () => {
  it('retorna a bandeira certa pra países comuns', () => {
    expect(countryFlagEmoji('Brazil')).toBe('🇧🇷');
    expect(countryFlagEmoji('Portugal')).toBe('🇵🇹');
    expect(countryFlagEmoji('France')).toBe('🇫🇷');
    expect(countryFlagEmoji('Argentina')).toBe('🇦🇷');
  });

  it('usa a bandeira do Reino Unido pras subdivisões (Inglaterra/Escócia/País de Gales)', () => {
    expect(countryFlagEmoji('England')).toBe('🇬🇧');
    expect(countryFlagEmoji('Scotland')).toBe('🇬🇧');
    expect(countryFlagEmoji('Wales')).toBe('🇬🇧');
  });

  it('aceita grafias alternativas do mesmo país', () => {
    expect(countryFlagEmoji('Ivory Coast')).toBe(countryFlagEmoji("Côte d'Ivoire"));
    expect(countryFlagEmoji('USA')).toBe(countryFlagEmoji('United States'));
  });

  it('retorna null sem inventar bandeira errada pra país desconhecido/vazio', () => {
    expect(countryFlagEmoji('Atlantis')).toBeNull();
    expect(countryFlagEmoji(undefined)).toBeNull();
    expect(countryFlagEmoji(null)).toBeNull();
    expect(countryFlagEmoji('')).toBeNull();
  });
});
