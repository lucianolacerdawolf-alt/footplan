import { describe, it, expect } from 'vitest';
import { normalizePlayerName, lookupShirtNumber, applyShirtNumberMap, parseSquad } from '../shirtNumberMap';
import type { Team, Player } from '../../engine/types';

const P = (id: string, name: string, number: number): Player => ({
  id, name, number, position: 'MID', currentFatigue: 0,
  attributes: { speed: 70, stamina: 70, passing: 70, finishing: 70, tackling: 70, dribbling: 70, vision: 70, positioning: 70 },
});

describe('números de camisa da Wikipedia', () => {
  it('lê os dois modelos de elenco e tira links', () => {
    const wt = `{{Fs player|no=7|nat=ENG|pos=FW|name=[[Bukayo Saka]]}}
{{football squad player|no=5|nat=BRA|pos=DF|name=[[Murillo (footballer)|Murillo]]}}
{{Fs player|no=8|nat=NOR|pos=MF|name=[[Martin Ødegaard]]|other=[[Captain (association football)|captain]]}}`;
    expect(parseSquad(wt)).toEqual({ 'bukayo saka': 7, murillo: 5, 'martin odegaard': 8 });
  });

  it('normaliza acentos e letras especiais', () => {
    expect(normalizePlayerName('Viktor Gyökeres')).toBe('viktor gyokeres');
    expect(normalizePlayerName('Martin Ødegaard')).toBe('martin odegaard');
  });

  it('casa por nome completo, primeiro+último ou sobrenome único', () => {
    const team = { source: 'x', players: { 'gabriel dos santos magalhaes': 6, 'viktor gyokeres': 14, 'ben white': 4 } };
    expect(lookupShirtNumber(team, 'Viktor Gyökeres')).toBe(14);
    expect(lookupShirtNumber(team, 'Gabriel Magalhães')).toBe(6);
    expect(lookupShirtNumber(team, 'Benjamin White')).toBe(4);
    expect(lookupShirtNumber(team, 'Desconhecido Silva')).toBeNull();
  });

  it('aplica no time: número confirmado ganha, número antigo repetido vira 0', () => {
    const team: Team = { id: 'ars', name: 'Arsenal', abbreviation: 'ARS', color: '#f00', secondaryColor: '#fff', logoUrl: '',
      strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
      squad: [P('a', 'David Raya', 22), P('b', 'Kepa Arrizabalaga', 1), P('c', 'Viktor Gyökeres', 0), P('d', 'Fulano Sem Wiki', 30)] };
    const out = applyShirtNumberMap([team], { ars: { source: 'Arsenal F.C.', players: { 'david raya': 1, 'kepa arrizabalaga': 13, 'viktor gyokeres': 14 } } });
    expect(out[0].squad.map(p => p.number)).toEqual([1, 13, 14, 30]);
  });
});
