import { describe, it, expect } from 'vitest';
import { playerOvr } from '../playerOvr';
import { allLeagues } from '@/data/leagues';
import type { Player } from '@/engine/types';

function makePlayer(attrs: Partial<Player['attributes']> = {}, position: Player['position'] = 'MID'): Player {
  return {
    id: 'p1', name: 'Test', number: 10, position,
    currentFatigue: 0,
    attributes: {
      speed: 70, stamina: 70, passing: 70, finishing: 70,
      tackling: 70, dribbling: 70, vision: 70, positioning: 70,
      ...attrs,
    },
  };
}

describe('playerOvr', () => {
  it('retorna valor entre 1 e 99', () => {
    const ovr = playerOvr(makePlayer());
    expect(ovr).toBeGreaterThanOrEqual(1);
    expect(ovr).toBeLessThanOrEqual(99);
  });

  it('jogador com atributos maximos tem OVR alto', () => {
    const maxAttrs = { speed: 99, stamina: 99, passing: 99, finishing: 99, tackling: 99, dribbling: 99, vision: 99, positioning: 99 };
    expect(playerOvr(makePlayer(maxAttrs))).toBeGreaterThanOrEqual(90);
  });

  it('jogador com atributos minimos tem OVR baixo', () => {
    const minAttrs = { speed: 1, stamina: 1, passing: 1, finishing: 1, tackling: 1, dribbling: 1, vision: 1, positioning: 1 };
    expect(playerOvr(makePlayer(minAttrs))).toBeLessThanOrEqual(15);
  });

  it('GK valoriza positioning e stamina', () => {
    const gkHigh = makePlayer({ positioning: 99, stamina: 99 }, 'GK');
    const gkLow = makePlayer({ positioning: 1, stamina: 1 }, 'GK');
    expect(playerOvr(gkHigh)).toBeGreaterThan(playerOvr(gkLow));
  });

  it('FWD com finishing alto tem OVR maior que FWD com finishing baixo', () => {
    const striker = makePlayer({ finishing: 99, speed: 99 }, 'FWD');
    const weak = makePlayer({ finishing: 1, speed: 1 }, 'FWD');
    expect(playerOvr(striker)).toBeGreaterThan(playerOvr(weak));
  });

  it('DEF com tackling alto tem OVR maior que DEF com tackling baixo', () => {
    const cb = makePlayer({ tackling: 99, positioning: 99 }, 'DEF');
    const weak = makePlayer({ tackling: 1, positioning: 1 }, 'DEF');
    expect(playerOvr(cb)).toBeGreaterThan(playerOvr(weak));
  });

  it('nunca retorna um OVR maior que o próprio maior atributo do jogador (regressão)', () => {
    // A média ponderada só usa os atributos relevantes da posição (ex: um zagueiro não
    // conta finalização/drible/visão), e o boost em cima dela podia gerar um OVR maior
    // que QUALQUER atributo mostrado no card — ex: Van Dijk com Desarme/Posicionamento 94
    // saindo com OVR 99. Achado analisando 4212 jogadores reais: 79,4% tinham esse gap.
    const cases: Array<[Partial<Player['attributes']>, Player['position']]> = [
      [{ speed: 68, stamina: 88, passing: 76, finishing: 48, tackling: 94, dribbling: 58, vision: 72, positioning: 94 }, 'DEF'],
      [{ speed: 50, stamina: 90, passing: 90, finishing: 10, tackling: 10, dribbling: 10, vision: 90, positioning: 10 }, 'MID'],
      [{ speed: 90, stamina: 40, passing: 40, finishing: 90, tackling: 10, dribbling: 90, vision: 10, positioning: 40 }, 'FWD'],
      [{ speed: 10, stamina: 90, passing: 90, finishing: 10, tackling: 10, dribbling: 10, vision: 90, positioning: 90 }, 'GK'],
    ];
    for (const [attrs, position] of cases) {
      const player = makePlayer(attrs, position);
      const maxAttr = Math.max(...Object.values(player.attributes));
      expect(playerOvr(player)).toBeLessThanOrEqual(maxAttr);
    }
  });

  it('nenhum jogador real dos dados estáticos tem OVR maior que o próprio maior atributo (regressão)', () => {
    for (const league of allLeagues) {
      for (const team of league.teams) {
        for (const p of team.squad) {
          const maxAttr = Math.max(...Object.values(p.attributes));
          expect(playerOvr(p)).toBeLessThanOrEqual(maxAttr);
        }
      }
    }
  });
});
