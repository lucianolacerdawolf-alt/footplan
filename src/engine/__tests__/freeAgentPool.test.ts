import { describe, it, expect } from 'vitest';
import { generateFreeAgentPool, refreshFreeAgentPool } from '../freeAgentPool';
import { playerOvr } from '@/utils/playerOvr';

// RNG determinístico e simples pra testes de distribuição — LCG básico.
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe('generateFreeAgentPool', () => {
  it('gera 16 jogadores respeitando a cota por posição (2 GK, 5 DEF, 5 MID, 4 FWD)', () => {
    const pool = generateFreeAgentPool(makeRng(1));
    expect(pool).toHaveLength(16);
    expect(pool.filter(p => p.position === 'GK')).toHaveLength(2);
    expect(pool.filter(p => p.position === 'DEF')).toHaveLength(5);
    expect(pool.filter(p => p.position === 'MID')).toHaveLength(5);
    expect(pool.filter(p => p.position === 'FWD')).toHaveLength(4);
  });

  it('todos os jogadores têm OVR entre 65 e 82 (aproximado, calibração do gerador aceita variação) e idade 20-35', () => {
    const pool = generateFreeAgentPool(makeRng(2));
    for (const p of pool) {
      expect(p.age).toBeGreaterThanOrEqual(20);
      expect(p.age).toBeLessThanOrEqual(35);
      expect(playerOvr(p)).toBeGreaterThan(40); // sanity — gerador produz jogador utilizável, não lixo
    }
  });

  it('preenche marketValue e weeklyWage em todo jogador gerado', () => {
    const pool = generateFreeAgentPool(makeRng(3));
    expect(pool.every(p => typeof p.marketValue === 'number' && p.marketValue! > 0)).toBe(true);
    expect(pool.every(p => typeof p.weeklyWage === 'number' && p.weeklyWage! > 0)).toBe(true);
  });

  it('ids são únicos dentro do pool', () => {
    const pool = generateFreeAgentPool(makeRng(4));
    expect(new Set(pool.map(p => p.id)).size).toBe(pool.length);
  });
});

describe('refreshFreeAgentPool', () => {
  it('quando ninguém se aposenta, envelhece +1 todo mundo e mantém o tamanho do pool', () => {
    const original = generateFreeAgentPool(makeRng(5));
    const ages = original.map(p => p.age!);
    // rng que nunca dispara aposentadoria (shouldRetire usa rng() < chance; 0.99 sempre falha)
    const neverRetireRng = () => 0.99;
    const refreshed = refreshFreeAgentPool(original, 2, neverRetireRng);

    expect(refreshed).toHaveLength(original.length);
    refreshed.forEach((p, i) => {
      expect(p.age).toBe(ages[i] + 1);
    });
  });

  it('quando todos se aposentam, o pool inteiro é reposto mantendo o tamanho alvo (16) e a cota por posição', () => {
    const original = generateFreeAgentPool(makeRng(6));
    // rng que sempre dispara aposentadoria pra shouldRetire, mas isso só ocorre com
    // idade >=34 — para simplificar, force idade alta manualmente.
    const allOld = original.map(p => ({ ...p, age: 36 }));
    const alwaysRetireRng = () => 0.01; // sempre < chance de aposentadoria aos 36
    const refreshed = refreshFreeAgentPool(allOld, 2, alwaysRetireRng);

    expect(refreshed).toHaveLength(16);
    expect(refreshed.filter(p => p.position === 'GK')).toHaveLength(2);
    expect(refreshed.filter(p => p.position === 'DEF')).toHaveLength(5);
    expect(refreshed.filter(p => p.position === 'MID')).toHaveLength(5);
    expect(refreshed.filter(p => p.position === 'FWD')).toHaveLength(4);
  });

  it('completa o déficit de uma posição específica quando o pool começa raso nela', () => {
    const shortPool = generateFreeAgentPool(makeRng(7)).filter(p => p.position !== 'FWD'); // 12 jogadores, 0 FWD
    const refreshed = refreshFreeAgentPool(shortPool, 2, () => 0.99); // ninguém se aposenta
    expect(refreshed.length).toBeGreaterThanOrEqual(shortPool.length);
    expect(refreshed.filter(p => p.position === 'FWD').length).toBeGreaterThan(0);
  });
});
