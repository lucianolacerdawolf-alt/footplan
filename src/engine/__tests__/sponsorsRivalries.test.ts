// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getStartingTier, generateSponsor } from '../sponsors';
import { isDerby, getDerbyName } from '../rivalries';

const ITALIAN_POOL = ['Banca Tirrena', 'Pastificio Aurora', 'Vespina', 'Assicurazioni Duomo', 'Caffè Leone', 'Energia Ligure', 'Scommesse Sole', 'Telecom Adria', 'Moto Riviera', 'Gelati Fiore'];
const PORTUGUESE_POOL = ['Cerveja Atlântica', 'Banco Lusitano', 'Tejo Telecom', 'Seguros Douro', 'Energia Minho', 'Apostas Galo', 'Conservas Mar Azul', 'Voa Açores', 'Café Barlavento', 'Auto Algarve'];

describe('sponsors — marcas fictícias', () => {
  it('nenhum patrocinador gerado é marca real conhecida', () => {
    const real = /emirates|bet365|adidas|nike|puma|santander|sky|betano|rakuten|allianz|pirelli|orange|renault/i;
    for (const lg of ['pl', 'championship', 'laliga', 'bundesliga', 'serieA', 'ligue1', 'ligaPortugal']) {
      for (let i = 0; i < 40; i++) expect(generateSponsor(lg, `team-${i}`, 'global').name).not.toMatch(real);
    }
  });
});

describe('sponsors — chaves de liga (regressão)', () => {
  it('Serie A (id serieA) começa em nacional (global é meta de reputação) e usa pool italiano', () => {
    expect(getStartingTier('serieA')).toBe('national');
    expect(ITALIAN_POOL).toContain(generateSponsor('serieA', 'int', 'global').name);
  });

  it('Serie B (id serieB) começa em local', () => {
    expect(getStartingTier('serieB')).toBe('local');
  });

  it('Liga Portugal (id ligaPortugal) começa em regional e usa pool português', () => {
    expect(getStartingTier('ligaPortugal')).toBe('regional');
    expect(PORTUGUESE_POOL).toContain(generateSponsor('ligaPortugal', 'slb', 'regional').name);
  });

  it('Liga Portugal 2 (id ligaPortugal2) começa em local', () => {
    expect(getStartingTier('ligaPortugal2')).toBe('local');
  });
});

describe('rivalries — ids reais (regressão)', () => {
  it('derbies da Premier League disparam com os ids reais', () => {
    expect(isDerby('arsenal', 'man-utd')).toBe(true);
    expect(isDerby('man-utd', 'man-city')).toBe(true);
    expect(isDerby('arsenal', 'tottenham')).toBe(true);
    expect(isDerby('liverpool', 'everton')).toBe(true);
    expect(getDerbyName('arsenal', 'man-utd')).toBe('Arsenal × United');
  });

  it('derbies das outras ligas disparam com os ids reais', () => {
    expect(isDerby('rma', 'fcb')).toBe(true);
    expect(getDerbyName('rma', 'fcb')).toBe('El Clásico');
    expect(isDerby('bay', 'bvb')).toBe(true);
    expect(isDerby('juv', 'int')).toBe(true);
    expect(isDerby('int', 'acm')).toBe(true);
    expect(isDerby('psg', 'om')).toBe(true);
    expect(isDerby('slb', 'scp')).toBe(true);
    expect(getDerbyName('slb', 'fcp')).toBe('O Clássico');
  });

  it('par não-rival não é derby, e placeholders antigos não disparam mais', () => {
    expect(isDerby('arsenal', 'man-city')).toBe(false);
    expect(isDerby('pl-t0', 'pl-mu')).toBe(false);
    expect(isDerby('laliga-t0', 'laliga-t1')).toBe(false);
  });
});
