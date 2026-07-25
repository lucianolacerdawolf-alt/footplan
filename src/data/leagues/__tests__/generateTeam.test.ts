import { describe, it, expect } from 'vitest';
import { generatePlayer, generatePlayerWithSubtype } from '../generateTeam';
import { allLeagues } from '..';
import { playerOvr } from '@/utils/playerOvr';
import { getAvgOvr } from '@/utils/teamUtils';
import type { Position } from '@/engine/types';

describe('generatePlayer — calibração de OVR (regressão)', () => {
  // Sem essa calibração, um alvo de OVR 70 saía calculando ~83-87 de playerOvr() de
  // verdade, e qualquer alvo de 85+ clampava em 99 — apagando toda diferença entre um
  // time OVR 85 e um OVR 95. Achado investigando por que times de 2ª divisão (alvo
  // 72-77 nos dados) saíam com OVR médio 86-93 na prática, mais forte que a 1ª divisão
  // do mesmo país. Recalibrado de novo depois que playerOvr() passou a limitar o OVR ao
  // maior atributo do jogador (ver utils/playerOvr.ts) — esse cap reduz o boost com mais
  // força nos alvos altos, então a constante de correção mudou. Ver o comentário em
  // generateTeam.ts pra derivação atual.
  const positions: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

  it('a média de playerOvr() de jogadores gerados fica perto do OVR alvo, em qualquer posição', () => {
    const targets = [60, 70, 80, 90];
    const samplesPerTarget = 150;
    const tolerance = 6; // pontos de OVR

    for (const pos of positions) {
      for (const target of targets) {
        let sum = 0;
        for (let i = 0; i < samplesPerTarget; i++) {
          sum += playerOvr(generatePlayer(`x${i}`, 'X', 1, pos, target));
        }
        const avg = sum / samplesPerTarget;
        expect(Math.abs(avg - target)).toBeLessThan(tolerance);
      }
    }
  });

  it('generatePlayerWithSubtype também fica calibrado (subtypes chave por posição)', () => {
    const subtypesByPos: Record<Position, string[]> = {
      GK: ['GK'], DEF: ['CB', 'FB'], MID: ['CM', 'CDM', 'CAM'], FWD: ['ST', 'W'],
    };
    const targets = [65, 80];
    const samplesPerTarget = 150;
    const tolerance = 7; // subtypes desviam um pouco mais que o gerador puro

    for (const pos of positions) {
      for (const subtype of subtypesByPos[pos]) {
        for (const target of targets) {
          let sum = 0;
          for (let i = 0; i < samplesPerTarget; i++) {
            sum += playerOvr(generatePlayerWithSubtype(`x${i}`, 'X', 1, pos, target, subtype));
          }
          const avg = sum / samplesPerTarget;
          expect(Math.abs(avg - target)).toBeLessThan(tolerance);
        }
      }
    }
  });

  it('todo atributo gerado é sempre um número inteiro (regressão)', () => {
    // A calibração acima faz (ovr-4)/1.15, que raramente dá um número redondo (ex: 1800/23
    // = 78.26086956521739) — sem arredondar esse resultado ANTES de virar a base dos
    // atributos, esse decimal vazava pra dentro de todos os 8 atributos do jogador, e
    // apareceu na tela (ex: "78.26086956521739" em vez de "78" no modal de detalhes).
    const subtypesByPos: Record<Position, string[]> = {
      GK: ['GK'], DEF: ['CB', 'FB'], MID: ['CM', 'CDM', 'CAM'], FWD: ['ST', 'W'],
    };
    for (const pos of positions) {
      for (const target of [50, 60, 65, 70, 75, 80, 85, 90, 95]) {
        for (let i = 0; i < 20; i++) {
          const plain = generatePlayer(`x${i}`, 'X', 1, pos, target);
          for (const v of Object.values(plain.attributes)) {
            expect(Number.isInteger(v)).toBe(true);
          }
          for (const subtype of subtypesByPos[pos]) {
            const withSubtype = generatePlayerWithSubtype(`y${i}`, 'Y', 1, pos, target, subtype);
            for (const v of Object.values(withSubtype.attributes)) {
              expect(Number.isInteger(v)).toBe(true);
            }
          }
        }
      }
    }
  });
});

describe('2ª divisão — força relativa à 1ª divisão do mesmo país (regressão)', () => {
  it('cada liga de acesso tem OVR médio de time abaixo da 1ª divisão correspondente', () => {
    const pairs: Array<[string, string]> = [
      ['pl', 'championship'], ['laliga', 'laliga2'], ['bundesliga', 'bundesliga2'],
      ['serieA', 'serieB'], ['ligue1', 'ligue2'], ['ligaPortugal', 'ligaPortugal2'],
    ];
    for (const [topId, secondId] of pairs) {
      const top = allLeagues.find(l => l.id === topId)!;
      const second = allLeagues.find(l => l.id === secondId)!;
      const topAvg = top.teams.reduce((s, t) => s + getAvgOvr(t), 0) / top.teams.length;
      const secondAvg = second.teams.reduce((s, t) => s + getAvgOvr(t), 0) / second.teams.length;
      expect(secondAvg).toBeLessThan(topAvg);
    }
  });
});
