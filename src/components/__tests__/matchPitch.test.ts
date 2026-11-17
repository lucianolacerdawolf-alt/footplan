// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { protagonistName } from '../MatchScreen/MatchPitch';
import type { MatchEvent, Team } from '@/engine/types';

const team = (id: string, names: string[]): Team => ({
  id, name: id, abbreviation: id.slice(0, 3).toUpperCase(), color: '#000', secondaryColor: '#fff', logoUrl: '',
  strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  squad: names.map((n, i) => ({ id: `${id}-${i}`, name: n, number: i + 1, position: 'MID', currentFatigue: 0,
    attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 } })),
});
const home = team('cov', ['Matt Grimes', 'Taiwo Awoniyi', 'Bruno']);
const away = team('cry', ['Bruno Fernandes', 'Adam Wharton']);
const ev = (type: MatchEvent['type'], teamId: string, description: string, scorer?: string): MatchEvent => ({ minute: 10, type, teamId, description, scorer });

describe('protagonistName (campo 2D)', () => {
  it('pega o 1º jogador do time que agiu citado na narração', () => {
    expect(protagonistName(ev('pass', 'cov', 'Matt Grimes recebe de Taiwo Awoniyi e avança.'), home, away)).toBe('Matt Grimes');
  });
  it('prefere o nome mais longo (Bruno Fernandes, não Bruno)', () => {
    expect(protagonistName(ev('attack', 'cry', 'Bruno Fernandes arranca pela direita!'), home, away)).toBe('Bruno Fernandes');
  });
  it('gol usa o artilheiro; lance neutro ou sem nome conhecido devolve null', () => {
    expect(protagonistName(ev('goal', 'cry', 'GOL!', 'Adam Wharton'), home, away)).toBe('Adam Wharton');
    expect(protagonistName(ev('possession', 'cov', 'Coventry troca passes com paciência.'), home, away)).toBeNull();
    expect(protagonistName({ minute: 45, type: 'halftime', teamId: null, description: 'Intervalo' }, home, away)).toBeNull();
  });
});
