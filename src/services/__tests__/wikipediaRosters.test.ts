import { describe, it, expect } from 'vitest';
import { parseSeasonClubs, seasonLabel, isWikipediaLeagueMapped } from '../wikipediaRosters';
import { parseSquadEntries } from '../../utils/shirtNumberMap';

describe('Wikipedia como fonte das 2ª divisões', () => {
  it('temporada europeia vira em julho', () => {
    expect(seasonLabel(new Date('2026-11-18'))).toBe('2026–27');
    expect(seasonLabel(new Date('2027-03-01'))).toBe('2026–27');
    expect(seasonLabel(new Date('2027-07-15'))).toBe('2027–28');
  });

  it('lê os times da tabela (name_XXX) sem repetir', () => {
    const t = `|name_ARE=[[SS Arezzo|Arezzo]]\n|name_ASC=[[Ascoli Calcio 1898 FC|Ascoli]]\n|name_ARE=[[SS Arezzo|Arezzo]]`;
    expect(parseSeasonClubs(t)).toEqual([
      { article: 'SS Arezzo', label: 'Arezzo', code: 'ARE' },
      { article: 'Ascoli Calcio 1898 FC', label: 'Ascoli', code: 'ASC' },
    ]);
  });

  it('sem tabela, usa os rótulos do mapa da seção Teams', () => {
    const t = `{{Location map~|Germany|lat=52.5|long=13.2|label=[[Hertha BSC|Hertha]]|position=top}}
{{Location map~|Germany|lat=52.2|long=10.5|label=[[Eintracht Braunschweig|Braun-<br>schweig]]|position=bottom}}`;
    expect(parseSeasonClubs(t).map(c => c.label)).toEqual(['Hertha', 'Braunschweig']);
  });

  it('elenco atual para antes dos emprestados', () => {
    const w = `==Players==
{{Fs player|no=1|nat=ITA|pos=GK|name=[[Samuele Vitale]]}}
{{Fs player|no= 3|pos=DF|nat=ITA|name=[[Marco Sala (footballer, born 1999)|Marco Sala]]}}
===Out on loan===
{{Fs player|no=—|nat=ITA|pos=FW|name=[[Emprestado Fulano]]}}`;
    expect(parseSquadEntries(w)).toEqual([
      { no: 1, pos: 'GK', nat: 'ITA', name: 'Samuele Vitale' },
      { no: 3, pos: 'DF', nat: 'ITA', name: 'Marco Sala' },
    ]);
  });

  it('só as segundas divisões usam essa fonte', () => {
    expect(isWikipediaLeagueMapped('serieB')).toBe(true);
    expect(isWikipediaLeagueMapped('pl')).toBe(false);
  });
});

describe('Wikipedia — casos que escapavam', () => {
  it('sigla com acento (SÜD) e nome dentro de {{nowrap}}', () => {
    const t = `|name_SÜD=[[FC Südtirol|Südtirol]]\n|name_STE={{nowrap|[[AS Saint-Étienne|Saint-Étienne]]}}`;
    expect(parseSeasonClubs(t).map(c => c.label)).toEqual(['Südtirol', 'Saint-Étienne']);
  });
});
