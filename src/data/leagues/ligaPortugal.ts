import type { LeagueDefinition } from './types';
import type { Team, Player } from '../../engine/types';

// ---------------------------------------------------------------------------
// LIGA PORTUGAL BETCLIC 2024/25 — 18 times com elencos realistas
// Escala 1-99: 90+ elite, 85-89 craque, 80-84 muito bom, 75-79 bom, 70-74 médio
// ---------------------------------------------------------------------------

function p(
  id: string, name: string, number: number, pos: Player['position'],
  speed: number, stamina: number, passing: number, finishing: number,
  tackling: number, dribbling: number, vision: number, positioning: number
): Player {
  return { id, name, number, position: pos, attributes: { speed, stamina, passing, finishing, tackling, dribbling, vision, positioning }, currentFatigue: 0 };
}

function makeFullTeam(id: string, name: string, abbr: string, color: string, secondary: string, logoUrl: string, xi: Player[], bench: Player[]): Team {
  return {
    id, name, abbreviation: abbr, color, secondaryColor: secondary,
    logoUrl,
    squad: [...xi, ...bench],
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

// =========================================================================
// SPORTING CP (OVR 83)
// =========================================================================
const scpXI: Player[] = [
  p('scp-1',  'Franco Israel',        1,  'GK',  38, 80, 62, 12, 20, 24, 68, 88),
  p('scp-2',  'Pedro Porro',          2,  'DEF', 84, 84, 74, 38, 72, 72, 64, 76),
  p('scp-3',  'Gonçalo Inácio',       15, 'DEF', 72, 86, 72, 36, 88, 58, 70, 90),
  p('scp-4',  'Ousmane Diomande',     24, 'DEF', 76, 86, 66, 32, 90, 56, 62, 88),
  p('scp-5',  'Rúben Vinagre',        25, 'DEF', 80, 84, 70, 30, 74, 70, 60, 76),
  p('scp-6',  'Morten Hjulmand',       6, 'MID', 70, 88, 80, 48, 82, 66, 80, 72),
  p('scp-7',  'Hidemasa Morita',       3, 'MID', 72, 86, 82, 50, 76, 68, 82, 74),
  p('scp-8',  'Pedro Gonçalves',      28, 'MID', 78, 84, 84, 72, 44, 82, 84, 76),
  p('scp-9',  'Trincão',              7,  'FWD', 86, 82, 76, 74, 30, 84, 72, 72),
  p('scp-10', 'Viktor Gyökeres',       9, 'FWD', 88, 88, 68, 94, 36, 82, 74, 90),
  p('scp-11', 'Marcus Edwards',       27, 'FWD', 84, 80, 72, 70, 28, 86, 68, 68),
];
const scpBench: Player[] = [
  p('scp-b1', 'Diogo Pinto',          99, 'GK',  34, 72, 52, 10, 14, 18, 56, 80),
  p('scp-b2', 'Matheus Reis',          5, 'DEF', 72, 80, 64, 24, 76, 58, 56, 76),
  p('scp-b3', 'Jeremiah St. Juste',    4, 'DEF', 70, 82, 62, 28, 82, 48, 58, 82),
  p('scp-b4', 'Geny Catamo',          32, 'MID', 88, 80, 68, 64, 28, 82, 60, 62),
  p('scp-b5', 'Daniel Bragança',       8, 'MID', 72, 82, 80, 52, 60, 70, 78, 68),
  p('scp-b6', 'Rodrigo Ribeiro',      17, 'FWD', 80, 78, 62, 70, 20, 78, 58, 66),
  p('scp-b7', 'Conrad Harder',        19, 'FWD', 82, 78, 60, 72, 22, 76, 56, 68),
];

// =========================================================================
// SL BENFICA (OVR 82)
// =========================================================================
const slbXI: Player[] = [
  p('slb-1',  'Anatoliy Trubin',      13, 'GK',  40, 80, 64, 12, 20, 22, 70, 90),
  p('slb-2',  'Alexander Bah',         2, 'DEF', 80, 82, 70, 34, 74, 68, 62, 76),
  p('slb-3',  'António Silva',         4, 'DEF', 72, 86, 68, 34, 88, 54, 68, 90),
  p('slb-4',  'Nicolás Otamendi',     30, 'DEF', 64, 80, 66, 32, 86, 48, 66, 88),
  p('slb-5',  'Álvaro Carreras',      27, 'DEF', 78, 84, 72, 30, 76, 68, 62, 76),
  p('slb-6',  'Florentino Luís',       6, 'MID', 70, 86, 78, 44, 80, 62, 76, 72),
  p('slb-7',  'Orkun Kökcü',           8, 'MID', 72, 84, 88, 60, 54, 76, 88, 74),
  p('slb-8',  'Fredrik Aursnes',       5, 'MID', 76, 84, 80, 52, 70, 66, 78, 72),
  p('slb-9',  'Kerem Aktürkoğlu',      7, 'FWD', 88, 80, 74, 76, 26, 86, 70, 70),
  p('slb-10', 'Arthur Cabral',         9, 'FWD', 76, 82, 64, 84, 28, 70, 64, 84),
  p('slb-11', 'Rafa Silva',           11, 'FWD', 84, 80, 74, 76, 28, 84, 72, 70),
];
const slbBench: Player[] = [
  p('slb-b1', 'Samuel Soares',         1, 'GK',  34, 72, 52, 10, 14, 16, 56, 80),
  p('slb-b2', 'Tomás Araújo',          3, 'DEF', 70, 82, 62, 28, 82, 46, 58, 82),
  p('slb-b3', 'Jan Vertonghen',        14,'DEF', 58, 74, 66, 24, 80, 42, 64, 80),
  p('slb-b4', 'Tiago Gouveia',        17, 'MID', 82, 78, 70, 64, 28, 80, 62, 62),
  p('slb-b5', 'Ángel Di María',        11,'FWD', 78, 74, 82, 72, 26, 84, 86, 66),
  p('slb-b6', 'Andreas Schjelderup',  36, 'FWD', 80, 78, 68, 68, 24, 78, 64, 64),
  p('slb-b7', 'Kacper Urbanski',      21, 'MID', 72, 80, 76, 50, 60, 66, 72, 66),
];

// =========================================================================
// FC PORTO (OVR 80)
// =========================================================================
const fcpXI: Player[] = [
  p('fcp-1',  'Diogo Costa',           1, 'GK',  42, 82, 64, 12, 22, 26, 72, 92),
  p('fcp-2',  'João Mário',            5, 'DEF', 82, 84, 72, 36, 76, 72, 64, 78),
  p('fcp-3',  'David Carmo',           4, 'DEF', 68, 82, 62, 28, 86, 46, 58, 86),
  p('fcp-4',  'Nehuen Perez',          3, 'DEF', 70, 84, 64, 28, 84, 50, 58, 84),
  p('fcp-5',  'Wendell',              14, 'DEF', 76, 82, 68, 28, 72, 66, 58, 74),
  p('fcp-6',  'Alan Varela',           6, 'MID', 68, 86, 78, 46, 80, 62, 76, 72),
  p('fcp-7',  'Pepê',                 77, 'MID', 82, 82, 74, 68, 38, 78, 70, 68),
  p('fcp-8',  'Marko Grujić',         24, 'MID', 72, 84, 76, 44, 78, 58, 74, 68),
  p('fcp-9',  'Galeno',               22, 'FWD', 90, 82, 72, 76, 28, 88, 68, 70),
  p('fcp-10', 'Samu Omorodion',        9, 'FWD', 80, 82, 58, 82, 28, 70, 56, 80),
  p('fcp-11', 'Namaso',               29, 'FWD', 88, 80, 64, 72, 22, 82, 60, 66),
];
const fcpBench: Player[] = [
  p('fcp-b1', 'Cláudio Ramos',        13, 'GK',  34, 74, 52, 10, 14, 16, 58, 80),
  p('fcp-b2', 'Iván Marcano',          5, 'DEF', 58, 74, 58, 22, 80, 36, 56, 80),
  p('fcp-b3', 'Fábio Cardoso',        16, 'DEF', 64, 78, 56, 22, 78, 40, 52, 78),
  p('fcp-b4', 'Rodrigo Mora',         11, 'FWD', 80, 76, 66, 66, 24, 80, 66, 62),
  p('fcp-b5', 'Danny Loader',         28, 'FWD', 76, 76, 60, 66, 22, 72, 58, 60),
  p('fcp-b6', 'Nico González',        23, 'MID', 76, 78, 76, 54, 46, 72, 76, 66),
  p('fcp-b7', 'Martim Fernandes',     38, 'MID', 78, 78, 68, 52, 50, 70, 62, 60),
];

// =========================================================================
// SC BRAGA (OVR 77)
// =========================================================================
const scbXI: Player[] = [
  p('scb-1',  'Matheus',               1, 'GK',  36, 76, 58, 10, 18, 18, 62, 86),
  p('scb-2',  'João Ferreira',          2, 'DEF', 76, 82, 66, 28, 74, 64, 58, 72),
  p('scb-3',  'Paulo Oliveira',         4, 'DEF', 60, 80, 60, 24, 82, 42, 56, 82),
  p('scb-4',  'Sikou Niakhaté',         5, 'DEF', 74, 82, 60, 26, 84, 52, 54, 80),
  p('scb-5',  'Nuno Tavares',          14, 'DEF', 82, 82, 68, 32, 70, 70, 58, 70),
  p('scb-6',  'Al Musrati',             8, 'MID', 66, 84, 76, 40, 80, 58, 74, 68),
  p('scb-7',  'Vítor Carvalho',        25, 'MID', 64, 82, 72, 36, 76, 54, 68, 64),
  p('scb-8',  'Djibril Sow',            6, 'MID', 70, 82, 72, 46, 72, 60, 68, 66),
  p('scb-9',  'Ricardo Horta',         21, 'FWD', 78, 80, 76, 72, 28, 78, 72, 70),
  p('scb-10', 'Abel Ruiz',              9, 'FWD', 70, 80, 66, 76, 24, 68, 62, 76),
  p('scb-11', 'El Ouazzane',           11, 'FWD', 82, 78, 66, 70, 22, 78, 60, 66),
];
const scbBench: Player[] = [
  p('scb-b1', 'Tiago Sá',             16, 'GK',  32, 70, 50, 8,  12, 14, 54, 78),
  p('scb-b2', 'Diogo Leite',           3, 'DEF', 68, 78, 58, 22, 78, 44, 54, 78),
  p('scb-b3', 'Cristian Borja',       22, 'DEF', 70, 78, 62, 24, 68, 56, 52, 66),
  p('scb-b4', 'André Castro',         20, 'MID', 58, 76, 68, 34, 62, 46, 62, 58),
  p('scb-b5', 'Iuri Medeiros',        18, 'MID', 76, 74, 66, 52, 30, 74, 58, 56),
  p('scb-b6', 'Rodrigo Gomes',        19, 'FWD', 80, 76, 64, 62, 24, 76, 58, 60),
  p('scb-b7', 'Vítor Tormena',        13, 'DEF', 62, 76, 54, 20, 74, 38, 48, 72),
];

// =========================================================================
// VITÓRIA SC (OVR 74)
// =========================================================================
const vscXI: Player[] = [
  p('vsc-1',  'Bruno Varela',          1, 'GK',  34, 74, 54, 10, 16, 16, 58, 84),
  p('vsc-2',  'Ibrahima Bamba',         2, 'DEF', 76, 80, 62, 26, 72, 62, 54, 70),
  p('vsc-3',  'Manu Silva',             4, 'DEF', 64, 78, 60, 22, 80, 44, 54, 78),
  p('vsc-4',  'Zé Carlos',              5, 'DEF', 60, 78, 58, 20, 78, 40, 50, 76),
  p('vsc-5',  'Mikel Villanueva',      14, 'DEF', 72, 78, 62, 22, 70, 60, 52, 68),
  p('vsc-6',  'Nélson Oliveira',        6, 'MID', 62, 78, 70, 34, 70, 52, 66, 62),
  p('vsc-7',  'Tomás Händel',          28, 'MID', 70, 78, 72, 46, 48, 66, 68, 64),
  p('vsc-8',  'Ibrahima Camará',       21, 'MID', 68, 80, 64, 36, 72, 54, 60, 60),
  p('vsc-9',  'Jota Silva',            11, 'FWD', 82, 76, 68, 68, 24, 76, 62, 64),
  p('vsc-10', 'Alfa Semedo',            9, 'FWD', 74, 76, 60, 68, 22, 68, 56, 66),
  p('vsc-11', 'Anderson Silva',        10, 'FWD', 76, 74, 64, 66, 22, 72, 58, 62),
];
const vscBench: Player[] = [
  p('vsc-b1', 'Matous Trmal',         16, 'GK',  30, 66, 44, 8,  10, 12, 46, 72),
  p('vsc-b2', 'Miguel Maga',           3, 'DEF', 68, 74, 56, 18, 66, 50, 46, 64),
  p('vsc-b3', 'Vitor Tormena',        13, 'DEF', 60, 72, 52, 18, 70, 36, 44, 68),
  p('vsc-b4', 'Gui Ferreira',         20, 'MID', 64, 74, 60, 30, 54, 54, 56, 54),
  p('vsc-b5', 'Lucas Furtado',        22, 'MID', 66, 72, 62, 36, 42, 58, 56, 52),
  p('vsc-b6', 'Samu',                 19, 'FWD', 70, 72, 56, 60, 18, 64, 50, 56),
  p('vsc-b7', 'Bruno Duarte',         17, 'FWD', 72, 72, 52, 60, 18, 62, 48, 56),
];

// =========================================================================
// FC FAMALICÃO (OVR 72)
// =========================================================================
const fcfXI: Player[] = [
  p('fcf-1',  'Rafael Defendi',         1, 'GK',  32, 72, 50, 8,  14, 14, 54, 80),
  p('fcf-2',  'Jorge Fernandes',         2, 'DEF', 68, 76, 58, 20, 74, 46, 50, 72),
  p('fcf-3',  'Riccardo Marchizza',      5, 'DEF', 62, 74, 56, 18, 72, 40, 48, 70),
  p('fcf-4',  'Rafael Vieira',           4, 'DEF', 60, 74, 54, 18, 70, 38, 46, 68),
  p('fcf-5',  'Iván Jaime',            14, 'DEF', 72, 76, 64, 26, 66, 60, 56, 64),
  p('fcf-6',  'Gustavo Assunção',        8, 'MID', 62, 76, 68, 34, 66, 50, 62, 58),
  p('fcf-7',  'Luis Mota',             25, 'MID', 66, 74, 66, 38, 50, 60, 62, 58),
  p('fcf-8',  'Vítor Gonçalves',        6, 'MID', 64, 74, 64, 34, 60, 52, 60, 56),
  p('fcf-9',  'Fábio Martins',         10, 'FWD', 76, 72, 64, 64, 20, 72, 58, 60),
  p('fcf-10', 'Sikou Niakaté',          9, 'FWD', 70, 72, 52, 62, 22, 60, 50, 60),
  p('fcf-11', 'Gabriel Silva',         11, 'FWD', 72, 72, 58, 60, 18, 66, 52, 58),
];
const fcfBench: Player[] = [
  p('fcf-b1', 'Rafael Fernandes',      16, 'GK',  28, 64, 40, 6,  10, 10, 40, 66),
  p('fcf-b2', 'Cássio',                3, 'DEF', 62, 70, 50, 16, 64, 36, 40, 60),
  p('fcf-b3', 'Diogo Calila',         22, 'DEF', 60, 68, 48, 14, 62, 34, 38, 58),
  p('fcf-b4', 'Yaw Yeboah',           18, 'MID', 72, 70, 58, 48, 24, 68, 48, 50),
  p('fcf-b5', 'Gauld',                20, 'MID', 62, 68, 62, 36, 38, 58, 60, 52),
  p('fcf-b6', 'Anderson Oliveira',    17, 'FWD', 66, 68, 50, 52, 16, 58, 44, 50),
  p('fcf-b7', 'Heliton',             27, 'FWD', 64, 68, 44, 50, 14, 54, 40, 48),
];

// =========================================================================
// CASA PIA AC (OVR 71)
// =========================================================================
const cpaXI: Player[] = [
  p('cpa-1',  'Jhonatan',               1, 'GK',  32, 72, 50, 8,  14, 14, 54, 80),
  p('cpa-2',  'João Nunes',             2, 'DEF', 66, 74, 56, 18, 70, 46, 46, 68),
  p('cpa-3',  'Lucas Soares',           5, 'DEF', 60, 74, 52, 16, 70, 36, 44, 68),
  p('cpa-4',  'Gonçalo Cardoso',        4, 'DEF', 68, 76, 58, 20, 72, 46, 50, 70),
  p('cpa-5',  'Matchoi Djalo',         14, 'DEF', 70, 74, 58, 22, 66, 56, 48, 62),
  p('cpa-6',  'Zach Booth',            25, 'MID', 60, 74, 64, 32, 62, 48, 60, 56),
  p('cpa-7',  'Platiny',                6, 'MID', 64, 74, 62, 36, 52, 58, 58, 54),
  p('cpa-8',  'Nuno Santos',           10, 'MID', 66, 72, 64, 42, 42, 60, 62, 56),
  p('cpa-9',  'Clayton',               11, 'FWD', 74, 70, 58, 62, 16, 68, 52, 56),
  p('cpa-10', 'Maurides',               9, 'FWD', 68, 70, 52, 62, 18, 60, 48, 58),
  p('cpa-11', 'Godwin',                7, 'FWD', 76, 70, 56, 60, 16, 66, 48, 54),
];
const cpaBench: Player[] = [
  p('cpa-b1', 'Caio Secco',           16, 'GK',  28, 64, 40, 6,  10, 10, 40, 66),
  p('cpa-b2', 'Thibang Phete',         3, 'DEF', 60, 68, 46, 14, 62, 32, 36, 58),
  p('cpa-b3', 'Luís Rocha',           22, 'DEF', 58, 68, 46, 14, 60, 32, 34, 56),
  p('cpa-b4', 'Romário Baró',         20, 'MID', 64, 68, 60, 34, 38, 56, 56, 50),
  p('cpa-b5', 'Tiago Morais',         27, 'MID', 58, 66, 58, 30, 36, 50, 52, 46),
  p('cpa-b6', 'Rafael Brito',         17, 'FWD', 64, 66, 50, 50, 12, 58, 40, 46),
  p('cpa-b7', 'Nuno Moreira',         19, 'FWD', 60, 66, 48, 48, 12, 54, 38, 44),
];

// =========================================================================
// GIL VICENTE FC (OVR 70)
// =========================================================================
const gvaXI: Player[] = [
  p('gva-1',  'Andrew',                 1, 'GK',  30, 70, 48, 8,  12, 12, 50, 78),
  p('gva-2',  'Vítor Carvalho',          2, 'DEF', 62, 72, 54, 18, 68, 44, 44, 66),
  p('gva-3',  'Samuel Ivo',              5, 'DEF', 58, 72, 50, 16, 68, 34, 42, 66),
  p('gva-4',  'Tiago Ilori',             4, 'DEF', 62, 72, 54, 18, 70, 40, 46, 68),
  p('gva-5',  'Zé Carlos',              14, 'DEF', 66, 72, 56, 20, 64, 52, 46, 60),
  p('gva-6',  'Lamine Ghilas',           6, 'MID', 60, 72, 62, 32, 60, 46, 58, 54),
  p('gva-7',  'Pedrão',                 8, 'MID', 62, 72, 60, 34, 50, 56, 56, 52),
  p('gva-8',  'António Domingos',       25, 'MID', 64, 70, 58, 36, 44, 56, 54, 52),
  p('gva-9',  'Rodrigo Ramos',         10, 'FWD', 70, 68, 58, 60, 16, 64, 50, 54),
  p('gva-10', 'Mesaque Dju',            11, 'FWD', 74, 68, 54, 58, 14, 66, 46, 52),
  p('gva-11', 'Fran Navarro',            9, 'FWD', 66, 68, 52, 62, 16, 58, 46, 56),
];
const gvaBench: Player[] = [
  p('gva-b1', 'Luís Maximiano',        16, 'GK',  28, 62, 38, 6,  8,  8,  38, 62),
  p('gva-b2', 'Thibault De Smet',       3, 'DEF', 58, 66, 46, 14, 58, 34, 32, 54),
  p('gva-b3', 'Paulo Santos',          22, 'DEF', 56, 66, 44, 14, 58, 30, 30, 52),
  p('gva-b4', 'Toni Martinez',         17, 'MID', 60, 66, 54, 40, 28, 56, 46, 48),
  p('gva-b5', 'Fujimoto',             20, 'MID', 60, 64, 56, 34, 30, 52, 52, 46),
  p('gva-b6', 'Renato Neto',          23, 'FWD', 62, 64, 48, 50, 12, 56, 38, 46),
  p('gva-b7', 'Kelvin',               19, 'FWD', 64, 64, 46, 50, 10, 58, 36, 44),
];

// =========================================================================
// RIO AVE FC (OVR 70)
// =========================================================================
const rafXI: Player[] = [
  p('raf-1',  'Jhonatan',               1, 'GK',  30, 70, 48, 8,  12, 12, 50, 78),
  p('raf-2',  ' Hélder Sá',              2, 'DEF', 64, 72, 56, 18, 68, 48, 46, 64),
  p('raf-3',  'Aderllan Santos',         5, 'DEF', 62, 72, 52, 16, 72, 40, 44, 68),
  p('raf-4',  'Gabriel Amorim',          4, 'DEF', 60, 72, 50, 16, 70, 38, 42, 66),
  p('raf-5',  'Costinha',               14, 'DEF', 66, 72, 58, 20, 62, 52, 48, 60),
  p('raf-6',  'Aziz Dervisoglu',         8, 'MID', 68, 72, 62, 46, 38, 62, 54, 54),
  p('raf-7',  'Filipe Augusto',          6, 'MID', 60, 72, 64, 32, 58, 46, 60, 54),
  p('raf-8',  'Vítor Gomes',            25, 'MID', 62, 70, 60, 34, 52, 50, 56, 52),
  p('raf-9',  'Pelé',                  11, 'FWD', 76, 70, 58, 60, 18, 68, 50, 54),
  p('raf-10', 'Levi García',             9, 'FWD', 78, 68, 56, 58, 16, 70, 48, 52),
  p('raf-11', 'Carlos Mané',            10, 'FWD', 74, 68, 60, 58, 18, 68, 54, 52),
];
const rafBench: Player[] = [
  p('raf-b1', 'Cláudio Ramos',         16, 'GK',  28, 62, 38, 6,  8,  8,  38, 62),
  p('raf-b2', 'Marko Grujic',           3, 'DEF', 58, 66, 46, 14, 60, 34, 32, 54),
  p('raf-b3', 'Tarantini',             22, 'DEF', 56, 66, 44, 14, 58, 32, 30, 52),
  p('raf-b4', 'Patrick William',       18, 'MID', 64, 66, 54, 38, 28, 60, 46, 48),
  p('raf-b5', 'Brandão',              20, 'MID', 58, 66, 56, 30, 44, 44, 52, 46),
  p('raf-b6', 'Guga',                 17, 'FWD', 64, 64, 48, 50, 12, 56, 38, 46),
  p('raf-b7', 'Danilo Veiga',         23, 'FWD', 60, 64, 50, 48, 12, 54, 42, 44),
];

// =========================================================================
// MOREIRENSE FC (OVR 69)
// =========================================================================
const mfcXI: Player[] = [
  p('mfc-1',  'Mateus',                 1, 'GK',  30, 70, 46, 8,  12, 12, 50, 76),
  p('mfc-2',  'Sori Mané',              2, 'DEF', 64, 72, 54, 18, 66, 46, 44, 62),
  p('mfc-3',  'Abdu Conté',             5, 'DEF', 62, 72, 50, 16, 68, 38, 42, 64),
  p('mfc-4',  'Fábio China',            4, 'DEF', 60, 70, 50, 16, 66, 38, 42, 62),
  p('mfc-5',  'Walterson',             14, 'DEF', 66, 70, 54, 20, 62, 52, 44, 58),
  p('mfc-6',  'Ângelo',                 6, 'MID', 62, 70, 60, 34, 58, 50, 56, 52),
  p('mfc-7',  'Ibrahima Ndiaye',       25, 'MID', 64, 70, 60, 38, 48, 56, 54, 52),
  p('mfc-8',  'Filipe Soares',          8, 'MID', 60, 70, 58, 30, 52, 46, 54, 50),
  p('mfc-9',  'Imortal',               11, 'FWD', 72, 68, 54, 58, 14, 64, 46, 52),
  p('mfc-10', 'Nicola Nunes',           9, 'FWD', 66, 68, 50, 58, 16, 58, 44, 54),
  p('mfc-11', 'Anderson',              10, 'FWD', 70, 68, 54, 56, 14, 62, 46, 50),
];
const mfcBench: Player[] = [
  p('mfc-b1', 'Kewin',                16, 'GK',  28, 62, 36, 6,  8,  8,  36, 60),
  p('mfc-b2', 'André Amaro',           3, 'DEF', 56, 64, 44, 14, 58, 32, 30, 52),
  p('mfc-b3', 'Steven Vitoria',       22, 'DEF', 54, 64, 44, 14, 60, 28, 30, 52),
  p('mfc-b4', 'Amine Derbali',        18, 'MID', 60, 64, 52, 32, 34, 52, 46, 44),
  p('mfc-b5', 'Rúben Freitas',        20, 'MID', 56, 64, 52, 28, 42, 40, 48, 44),
  p('mfc-b6', 'Carlos Daniel',        17, 'FWD', 64, 64, 46, 50, 12, 56, 36, 44),
  p('mfc-b7', 'Mor Ndiaye',          27, 'FWD', 62, 62, 44, 48, 10, 54, 36, 42),
];

// =========================================================================
// FC AROUCA (OVR 68)
// =========================================================================
const aroXI: Player[] = [
  p('aro-1',  'Renan',                  1, 'GK',  30, 68, 46, 8,  10, 10, 46, 74),
  p('aro-2',  'Leandrinho',             2, 'DEF', 64, 70, 52, 16, 64, 46, 42, 60),
  p('aro-3',  'Nuno Coelho',            5, 'DEF', 58, 70, 50, 14, 66, 34, 40, 62),
  p('aro-4',  'Seck',                   4, 'DEF', 60, 70, 48, 14, 66, 36, 38, 62),
  p('aro-5',  'Antunes',               14, 'DEF', 66, 70, 54, 18, 60, 50, 42, 56),
  p('aro-6',  'Mehdi Taremi',           8, 'MID', 58, 70, 58, 30, 56, 44, 54, 48),
  p('aro-7',  'David Simão',           10, 'MID', 62, 68, 60, 38, 38, 58, 56, 50),
  p('aro-8',  'Oday Dabbagh',          25, 'MID', 60, 68, 54, 36, 44, 50, 50, 48),
  p('aro-9',  'Bukia',                  7, 'FWD', 72, 68, 54, 58, 14, 64, 46, 50),
  p('aro-10', 'Mansila',                9, 'FWD', 64, 68, 48, 56, 16, 58, 42, 52),
  p('aro-11', 'Léo Bolgado',           11, 'FWD', 70, 66, 52, 56, 12, 62, 42, 48),
];
const aroBench: Player[] = [
  p('aro-b1', 'Mika Mäkinen',         16, 'GK',  26, 60, 36, 6,  8,  8,  36, 60),
  p('aro-b2', 'Yaw Wireko',            3, 'DEF', 56, 62, 44, 12, 56, 30, 28, 48),
  p('aro-b3', 'Rodrigo Valentim',     22, 'DEF', 54, 62, 42, 12, 54, 28, 28, 48),
  p('aro-b4', 'Pedro Moreira',        18, 'MID', 58, 64, 50, 28, 36, 46, 44, 44),
  p('aro-b5', 'Rashid Boukhari',      20, 'FWD', 66, 62, 48, 48, 14, 58, 38, 44),
  p('aro-b6', 'Pedro Marques',        17, 'FWD', 60, 62, 44, 46, 12, 52, 36, 42),
  p('aro-b7', 'Sana',                 27, 'FWD', 64, 62, 42, 46, 10, 56, 34, 42),
];

// =========================================================================
// ESTORIL PRAIA (OVR 68)
// =========================================================================
const eprXI: Player[] = [
  p('epr-1',  'André Ferreira',         1, 'GK',  30, 68, 46, 8,  10, 10, 46, 74),
  p('epr-2',  'João Correia',           2, 'DEF', 64, 70, 52, 16, 64, 46, 42, 60),
  p('epr-3',  'Nélson Semedo',          5, 'DEF', 82, 72, 62, 24, 68, 64, 52, 64),
  p('epr-4',  'Victor Letícia',         4, 'DEF', 58, 70, 48, 14, 66, 34, 38, 62),
  p('epr-5',  'Ailton',                14, 'DEF', 64, 70, 54, 18, 60, 50, 42, 56),
  p('epr-6',  'Lucas Áfrico',           8, 'MID', 60, 70, 58, 30, 56, 44, 54, 48),
  p('epr-7',  'Tiago Gouveia',         10, 'MID', 76, 68, 64, 54, 28, 72, 56, 52),
  p('epr-8',  'Arthur Gomes',          25, 'MID', 68, 68, 56, 42, 36, 62, 52, 50),
  p('epr-9',  'Cléber',                11, 'FWD', 68, 66, 52, 56, 14, 62, 44, 50),
  p('epr-10', 'Derik Lacerda',          9, 'FWD', 70, 66, 50, 58, 14, 62, 44, 52),
  p('epr-11', 'Evandro',                7, 'FWD', 66, 66, 54, 54, 14, 60, 46, 48),
];
const eprBench: Player[] = [
  p('epr-b1', 'Thiago Rodrigues',     16, 'GK',  26, 60, 36, 6,  8,  8,  36, 60),
  p('epr-b2', 'Eduardo Quaresma',      3, 'DEF', 60, 64, 48, 14, 60, 36, 32, 52),
  p('epr-b3', 'Zé Valente',          22, 'DEF', 58, 64, 44, 14, 60, 30, 30, 50),
  p('epr-b4', 'Thiago Cabral',        18, 'MID', 60, 62, 52, 32, 34, 50, 46, 44),
  p('epr-b5', 'Gamboa',              20, 'MID', 58, 62, 52, 28, 42, 42, 48, 42),
  p('epr-b6', 'Ricardo Gomes',        17, 'FWD', 62, 62, 44, 48, 12, 54, 36, 44),
  p('epr-b7', 'Rodrigo Valente',      23, 'FWD', 60, 60, 42, 46, 10, 52, 34, 42),
];

// =========================================================================
// CD NACIONAL (OVR 67)
// =========================================================================
const nacXI: Player[] = [
  p('nac-1',  'Vaná',                   1, 'GK',  28, 68, 44, 6,  10, 10, 44, 72),
  p('nac-2',  'Romain Correia',          2, 'DEF', 62, 68, 50, 16, 62, 44, 40, 58),
  p('nac-3',  'Iván Marcano',            5, 'DEF', 56, 68, 50, 14, 66, 32, 40, 64),
  p('nac-4',  'Adolfo Gaich',            4, 'DEF', 64, 68, 50, 16, 64, 40, 40, 60),
  p('nac-5',  'Mateus Quaresma',        14, 'DEF', 68, 68, 52, 18, 58, 50, 40, 54),
  p('nac-6',  'Zé Rui',                  6, 'MID', 58, 68, 58, 28, 54, 42, 52, 46),
  p('nac-7',  'Duarte',                 8, 'MID', 60, 68, 56, 32, 44, 50, 50, 48),
  p('nac-8',  'Mickael Figueiredo',     25, 'MID', 58, 66, 54, 28, 48, 40, 48, 46),
  p('nac-9',  'Diego Rosa',             11, 'FWD', 68, 66, 50, 56, 12, 60, 42, 48),
  p('nac-10', 'Miguel Sousa',            9, 'FWD', 60, 66, 48, 54, 14, 54, 40, 50),
  p('nac-11', 'Rodrigo Dias',           10, 'FWD', 64, 64, 50, 52, 12, 58, 42, 46),
];
const nacBench: Player[] = [
  p('nac-b1', 'Ivan Reko',             16, 'GK',  26, 58, 34, 6,  8,  8,  34, 58),
  p('nac-b2', 'Alain Pires',            3, 'DEF', 54, 62, 42, 12, 56, 28, 28, 48),
  p('nac-b3', 'Sam Larsson',           22, 'DEF', 56, 62, 44, 14, 54, 32, 30, 48),
  p('nac-b4', 'Kiko',                  18, 'MID', 56, 62, 50, 28, 34, 44, 44, 42),
  p('nac-b5', 'Pedrinho',             20, 'MID', 60, 62, 50, 30, 30, 50, 44, 42),
  p('nac-b6', 'Alhassan Wakaso',       17, 'FWD', 62, 62, 42, 46, 10, 52, 34, 42),
  p('nac-b7', 'Francisco Moura',       27, 'FWD', 58, 60, 42, 44, 10, 50, 34, 40),
];

// =========================================================================
// AVS FUTEBOL SAD (OVR 67)
// =========================================================================
const avsXI: Player[] = [
  p('avs-1',  'Léo Jardim',             1, 'GK',  28, 68, 44, 6,  10, 10, 44, 72),
  p('avs-2',  'Inácio Pussetto',         2, 'DEF', 60, 68, 50, 16, 62, 44, 40, 58),
  p('avs-3',  'Euller',                  5, 'DEF', 58, 68, 46, 14, 64, 32, 38, 62),
  p('avs-4',  'Vasco Fernandes',         4, 'DEF', 56, 68, 48, 14, 62, 32, 38, 60),
  p('avs-5',  'Yusupha Njie',           14, 'DEF', 66, 70, 52, 20, 58, 48, 40, 54),
  p('avs-6',  'Paulo Henrique',          6, 'MID', 58, 68, 56, 28, 52, 40, 50, 46),
  p('avs-7',  'Maga',                   8, 'MID', 62, 66, 54, 32, 42, 50, 48, 48),
  p('avs-8',  'João Pinto',            25, 'MID', 56, 66, 52, 26, 46, 38, 46, 44),
  p('avs-9',  'Emile Mpenza',          11, 'FWD', 64, 64, 48, 54, 12, 58, 40, 48),
  p('avs-10', 'Daniel Penha',           9, 'FWD', 60, 64, 46, 52, 14, 52, 38, 48),
  p('avs-11', 'Ryan',                  10, 'FWD', 66, 64, 50, 52, 12, 58, 42, 46),
];
const avsBench: Player[] = [
  p('avs-b1', 'Diogo Fernandes',       16, 'GK',  26, 58, 34, 6,  8,  8,  34, 58),
  p('avs-b2', 'Diogo Amado',            3, 'DEF', 54, 62, 42, 12, 54, 28, 28, 48),
  p('avs-b3', 'Rodrigo Pinho',         22, 'DEF', 52, 60, 40, 12, 52, 26, 26, 46),
  p('avs-b4', 'Rodrigo Conceição',     18, 'MID', 64, 62, 52, 36, 26, 58, 44, 44),
  p('avs-b5', 'Toni Borevkovic',       20, 'MID', 52, 62, 48, 24, 40, 36, 42, 40),
  p('avs-b6', 'Zé Turbo',             17, 'FWD', 60, 62, 40, 44, 10, 50, 32, 40),
  p('avs-b7', 'Samuel Celestino',      27, 'FWD', 58, 60, 38, 42, 10, 48, 32, 38),
];

// =========================================================================
// BOAVISTA FC (OVR 67)
// =========================================================================
const boaXI: Player[] = [
  p('boa-1',  'Léo Jardim',             1, 'GK',  28, 68, 44, 6,  10, 10, 44, 72),
  p('boa-2',  'Makouta',                 2, 'DEF', 62, 68, 50, 16, 62, 44, 40, 58),
  p('boa-3',  'Filipe Ferreira',         5, 'DEF', 60, 68, 48, 14, 64, 36, 40, 62),
  p('boa-4',  'Erwin Sánchez',           4, 'DEF', 58, 68, 48, 14, 64, 34, 38, 62),
  p('boa-5',  'Salvador Agra',          14, 'DEF', 70, 68, 56, 20, 58, 56, 44, 56),
  p('boa-6',  'Tiago Ilori',             6, 'MID', 60, 68, 56, 28, 58, 42, 52, 48),
  p('boa-7',  'Nathan',                  8, 'MID', 62, 68, 54, 32, 46, 52, 50, 48),
  p('boa-8',  'Koffi Kouao',           25, 'MID', 60, 66, 52, 28, 48, 44, 48, 44),
  p('boa-9',  'Hamidou Keyta',         11, 'FWD', 70, 66, 50, 56, 12, 62, 42, 50),
  p('boa-10', 'Idris Brun',             9, 'FWD', 62, 66, 46, 54, 14, 54, 40, 50),
  p('boa-11', 'Reggie Cannon',         10, 'FWD', 72, 64, 50, 52, 14, 62, 42, 48),
];
const boaBench: Player[] = [
  p('boa-b1', 'Bracali',               16, 'GK',  26, 60, 36, 6,  8,  8,  36, 60),
  p('boa-b2', 'Quintanilha',            3, 'DEF', 54, 62, 42, 12, 54, 30, 28, 48),
  p('boa-b3', 'Paulo Melo',            22, 'DEF', 52, 62, 40, 12, 54, 26, 26, 46),
  p('boa-b4', 'Artur Jorge',           18, 'MID', 56, 62, 50, 28, 34, 44, 44, 42),
  p('boa-b5', 'Pablo',                 20, 'MID', 54, 62, 50, 24, 38, 38, 42, 40),
  p('boa-b6', 'Musa',                  17, 'FWD', 60, 60, 42, 46, 10, 52, 34, 42),
  p('boa-b7', 'Pepelu',               27, 'FWD', 58, 60, 44, 44, 10, 50, 36, 40),
];

// =========================================================================
// CD SANTA CLARA (OVR 67)
// =========================================================================
const scaXI: Player[] = [
  p('sca-1',  'Marco',                  1, 'GK',  28, 68, 44, 6,  10, 10, 44, 72),
  p('sca-2',  'Cryzan',                 2, 'DEF', 62, 68, 50, 16, 62, 44, 40, 58),
  p('sca-3',  'Rui Costa',              5, 'DEF', 58, 68, 48, 14, 64, 34, 38, 62),
  p('sca-4',  'Rafael Ramos',           4, 'DEF', 62, 68, 52, 16, 64, 42, 42, 62),
  p('sca-5',  'Lincoln',               14, 'DEF', 64, 68, 52, 18, 60, 50, 40, 56),
  p('sca-6',  'Henrique Araújo',        6, 'MID', 60, 68, 56, 30, 52, 44, 52, 48),
  p('sca-7',  'Allano',                 8, 'MID', 62, 66, 54, 36, 40, 54, 50, 50),
  p('sca-8',  'Morita',                25, 'MID', 60, 66, 60, 28, 52, 46, 56, 46),
  p('sca-9',  'Thiago Santana',        11, 'FWD', 66, 64, 48, 56, 12, 58, 42, 50),
  p('sca-10', 'Carlos Jr.',             9, 'FWD', 68, 64, 52, 54, 14, 60, 44, 48),
  p('sca-11', 'Zé Manuel',             10, 'FWD', 64, 66, 50, 60, 14, 56, 46, 54),
];
const scaBench: Player[] = [
  p('sca-b1', 'Saisai',               16, 'GK',  26, 58, 34, 6,  8,  8,  34, 58),
  p('sca-b2', 'Ícaro',                 3, 'DEF', 54, 62, 42, 12, 54, 28, 28, 48),
  p('sca-b3', 'Guga',                 22, 'DEF', 56, 62, 44, 14, 52, 32, 30, 48),
  p('sca-b4', 'Costinha',             18, 'MID', 56, 62, 50, 28, 34, 44, 44, 42),
  p('sca-b5', 'Dadashov',            20, 'MID', 58, 62, 48, 30, 30, 50, 44, 42),
  p('sca-b6', 'Anderson',             17, 'FWD', 60, 62, 40, 46, 10, 50, 34, 42),
  p('sca-b7', 'Thiago',              27, 'FWD', 58, 60, 40, 44, 10, 48, 32, 40),
];

// =========================================================================
// ESTRELA DA AMADORA (OVR 65)
// =========================================================================
const edaXI: Player[] = [
  p('eda-1',  'Beunardeau',             1, 'GK',  28, 66, 42, 6,  10, 10, 42, 70),
  p('eda-2',  'Umaro Candé',            2, 'DEF', 60, 66, 48, 14, 60, 42, 38, 56),
  p('eda-3',  'Pedro Silva',             5, 'DEF', 56, 66, 46, 12, 62, 30, 36, 58),
  p('eda-4',  'Miguel Rodrigues',        4, 'DEF', 54, 66, 46, 12, 60, 28, 34, 56),
  p('eda-5',  'Diogo Calila',           14, 'DEF', 60, 66, 50, 16, 56, 42, 36, 52),
  p('eda-6',  'André Vidigal',           6, 'MID', 58, 66, 54, 28, 48, 40, 48, 44),
  p('eda-7',  'Paulinho',               8, 'MID', 56, 66, 52, 28, 42, 42, 46, 44),
  p('eda-8',  'João Tavares',          25, 'MID', 54, 64, 50, 24, 44, 36, 44, 42),
  p('eda-9',  'Giorgi Gabedava',       11, 'FWD', 64, 64, 46, 52, 10, 56, 38, 46),
  p('eda-10', 'Anderson Abreu',         9, 'FWD', 60, 64, 44, 50, 12, 52, 36, 46),
  p('eda-11', 'Javier Manquillo',      10, 'FWD', 66, 62, 48, 50, 12, 58, 40, 44),
];
const edaBench: Player[] = [
  p('eda-b1', 'Diogo Batista',         16, 'GK',  24, 56, 32, 6,  8,  8,  32, 56),
  p('eda-b2', 'Luís Martins',           3, 'DEF', 52, 60, 40, 10, 52, 26, 26, 46),
  p('eda-b3', 'Fábio Lopes',          22, 'DEF', 50, 60, 38, 10, 50, 24, 24, 44),
  p('eda-b4', 'Seferovic',            18, 'MID', 56, 60, 48, 26, 30, 40, 40, 40),
  p('eda-b5', 'Vítor Gomes',          20, 'MID', 52, 60, 46, 22, 36, 34, 38, 38),
  p('eda-b6', 'Caio Lopes',           17, 'FWD', 58, 60, 38, 42, 8,  48, 30, 38),
  p('eda-b7', 'Jorge Simão',          27, 'FWD', 56, 58, 36, 40, 8,  46, 28, 36),
];

// =========================================================================
// SC FARENSE (OVR 65)
// =========================================================================
const farXI: Player[] = [
  p('far-1',  'Ricardo Velho',           1, 'GK',  28, 66, 42, 6,  10, 10, 42, 70),
  p('far-2',  'João Filipe',             2, 'DEF', 58, 66, 46, 14, 60, 40, 36, 54),
  p('far-3',  'Fábio Soares',            5, 'DEF', 54, 66, 44, 12, 60, 28, 34, 56),
  p('far-4',  'Licá',                    4, 'DEF', 56, 66, 46, 14, 58, 32, 34, 54),
  p('far-5',  'Vítor Gonçalves',        14, 'DEF', 60, 66, 50, 16, 54, 42, 36, 50),
  p('far-6',  'Tomás Domingos',          6, 'MID', 56, 66, 52, 26, 48, 38, 46, 42),
  p('far-7',  'Ferreiro',                8, 'MID', 54, 64, 50, 26, 40, 40, 44, 42),
  p('far-8',  'Bilal Medjouri',         25, 'MID', 60, 64, 50, 34, 30, 52, 44, 44),
  p('far-9',  'Douglas',               11, 'FWD', 64, 62, 44, 50, 10, 56, 36, 44),
  p('far-10', 'Jonatan Del Campo',       9, 'FWD', 62, 64, 48, 52, 12, 56, 40, 46),
  p('far-11', 'Fabrício',              10, 'FWD', 60, 62, 44, 48, 10, 54, 36, 42),
];
const farBench: Player[] = [
  p('far-b1', 'Hugo Marques',          16, 'GK',  24, 56, 32, 6,  8,  8,  32, 56),
  p('far-b2', 'Luís Rocha',             3, 'DEF', 50, 60, 38, 10, 50, 24, 24, 44),
  p('far-b3', 'Kelechi',               22, 'DEF', 52, 60, 38, 10, 52, 26, 24, 44),
  p('far-b4', 'Vasco Lopes',           18, 'MID', 54, 60, 46, 24, 28, 38, 38, 38),
  p('far-b5', 'Marcelo Ribeiro',       20, 'MID', 50, 60, 44, 22, 34, 32, 36, 36),
  p('far-b6', 'Makouta',               17, 'FWD', 58, 60, 36, 40, 8,  48, 28, 36),
  p('far-b7', 'Tomás Handel',          27, 'FWD', 54, 58, 36, 38, 8,  44, 28, 34),
];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ligaPortugal: LeagueDefinition = {
  id: 'ligaPortugal',
  name: 'Liga Portugal',
  country: 'Portugal',
  flag: '🇵🇹',
  color: '#006600',
  logo: 'https://www.thesportsdb.com/images/media/league/badge/3tgdke1782689102.png',
  cupName: 'Taça de Portugal',
  cupLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Ta%C3%A7a_de_Portugal_Trophy.svg/250px-Ta%C3%A7a_de_Portugal_Trophy.svg.png',
  totalRounds: 34,
  relegationSpots: 3,
  europeanSlots: {
    championsLeague: 2,
    europaLeague: 2,
    conferenceLeague: 1,
  },
  cpuProfile: {
    pressingMod: 0.95,
    defensiveLineMod: 0.92,
    tempoMod: 0.95,
    passingFocusMod: 1.05,
  },
  teams: [
    makeFullTeam('scp', 'Sporting CP',           'SCP', '#006600', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/ohj6ih1628855978.png', scpXI,  scpBench),
    makeFullTeam('slb', 'SL Benfica',            'SLB', '#DA251D', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/hj4kyc1781152436.png', slbXI,  slbBench),
    makeFullTeam('fcp', 'FC Porto',              'FCP', '#003DA5', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/xu47rb1628855600.png', fcpXI,  fcpBench),
    makeFullTeam('scb', 'SC Braga',              'SCB', '#D4021D', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/8g4aod1678717261.png', scbXI,  scbBench),
    makeFullTeam('vsc', 'Vitória SC',            'VSC', '#006B3C', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/af52z61628855707.png', vscXI,  vscBench),
    makeFullTeam('fcf', 'FC Famalicão',          'FCF', '#0033A0', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/a3f4er1563653256.png', fcfXI,  fcfBench),
    makeFullTeam('cpa', 'Casa Pia AC',           'CPA', '#003DA5', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/d8ugsc1678717133.png', cpaXI,  cpaBench),
    makeFullTeam('gva', 'Gil Vicente FC',        'GVA', '#000000', '#FFD700', 'https://r2.thesportsdb.com/images/media/team/badge/88bsg41626201503.png', gvaXI,  gvaBench),
    makeFullTeam('raf', 'Rio Ave FC',            'RAF', '#006600', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/ngbklq1628851239.png', rafXI,  rafBench),
    makeFullTeam('mfc', 'Moreirense FC',         'MFC', '#007B3A', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/yrquxu1471878153.png', mfcXI,  mfcBench),
    makeFullTeam('aro', 'FC Arouca',             'ARO', '#FFD700', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/vgbzjq1628853833.png', aroXI,  aroBench),
    makeFullTeam('epr', 'Estoril Praia',         'EPR', '#FFD700', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/lq9h8m1628854051.png', eprXI,  eprBench),
    makeFullTeam('nac', 'CD Nacional',           'NAC', '#000000', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/1ln5fe1628850538.png', nacXI,  nacBench),
    makeFullTeam('avs', 'AVS Futebol SAD',       'AVS', '#CC0000', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/xp8oqb1688676544.png', avsXI,  avsBench),
    makeFullTeam('boa', 'Boavista FC',           'BOA', '#000000', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/usi98v1628853974.png', boaXI,  boaBench),
    makeFullTeam('sca', 'CD Santa Clara',        'SCA', '#DA251D', '#003DA5', 'https://r2.thesportsdb.com/images/media/team/badge/7337a61724860742.png', scaXI,  scaBench),
    makeFullTeam('eda', 'Estrela da Amadora',    'EDA', '#DA251D', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/2tx5621626095555.png', edaXI,  edaBench),
    makeFullTeam('far', 'SC Farense',            'FAR', '#FF6B00', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/0a09qc1690493592.png', farXI,  farBench),
  ],
};
