import type { LeagueDefinition } from './types';
import type { Team, Player } from '../../engine/types';

// ---------------------------------------------------------------------------
// SERIE A 2024/25 — 20 times com elencos realistas
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
// INTER MILAN (OVR 84)
// =========================================================================
const interXI: Player[] = [
  p('int-1',  'Yann Sommer',         1,  'GK',  36, 76, 60, 12, 18, 22, 66, 90),
  p('int-2',  'Benjamin Pavard',     28, 'DEF', 72, 84, 70, 36, 86, 56, 62, 88),
  p('int-3',  'Stefan de Vrij',      6,  'DEF', 62, 84, 68, 34, 88, 48, 64, 90),
  p('int-4',  'Francesco Acerbi',    15, 'DEF', 58, 82, 66, 30, 86, 44, 62, 88),
  p('int-5',  'Federico Dimarco',    32, 'DEF', 74, 84, 72, 38, 78, 64, 66, 80),
  p('int-6',  'Nicolò Barella',      23, 'MID', 76, 86, 84, 58, 68, 78, 84, 76),
  p('int-7',  'Hakan Calhanoglu',    20, 'MID', 62, 82, 88, 64, 58, 72, 90, 74),
  p('int-8',  'Henrikh Mkhitaryan',  22, 'MID', 68, 80, 82, 56, 54, 74, 82, 72),
  p('int-9',  'Denzel Dumfries',     2,  'FWD', 84, 84, 72, 62, 48, 72, 62, 74),
  p('int-10', 'Marcus Thuram',       9,  'FWD', 84, 84, 70, 82, 32, 80, 68, 80),
  p('int-11', 'Lautaro Martínez',    10, 'FWD', 80, 84, 76, 90, 34, 82, 76, 86),
];
const interBench: Player[] = [
  p('int-b1', 'Josep Martínez',      13, 'GK',  34, 70, 52, 10, 14, 16, 56, 80),
  p('int-b2', 'Yann Bisseck',        31, 'DEF', 70, 80, 60, 28, 80, 50, 52, 80),
  p('int-b3', 'Alessandro Bastoni',  95, 'DEF', 68, 84, 74, 32, 84, 60, 68, 84),
  p('int-b4', 'Kristjan Asllani',    21, 'MID', 60, 78, 78, 44, 52, 62, 76, 66),
  p('int-b5', 'Piotr Zielinski',     7,  'MID', 60, 78, 84, 58, 44, 66, 82, 68),
  p('int-b6', 'Mehdi Taremi',        99, 'FWD', 72, 80, 68, 80, 30, 70, 66, 78),
  p('int-b7', 'Marko Arnautovic',    8,  'FWD', 68, 76, 60, 76, 28, 62, 58, 72),
];

// =========================================================================
// AC MILAN (OVR 81)
// =========================================================================
const acmXI: Player[] = [
  p('acm-1',  'Mike Maignan',        16, 'GK',  38, 76, 58, 12, 18, 22, 64, 90),
  p('acm-2',  'Davide Calabria',     2,  'DEF', 70, 84, 68, 32, 80, 60, 58, 80),
  p('acm-3',  'Fikayo Tomori',       23, 'DEF', 76, 84, 62, 28, 86, 54, 54, 84),
  p('acm-4',  'Matteo Gabbia',       46, 'DEF', 64, 80, 58, 26, 82, 44, 52, 82),
  p('acm-5',  'Theo Hernández',      19, 'DEF', 82, 84, 72, 44, 72, 78, 64, 76),
  p('acm-6',  'Yunus Musah',         80, 'MID', 72, 82, 74, 46, 64, 70, 68, 70),
  p('acm-7',  'Youssouf Fofana',     29, 'MID', 70, 84, 72, 44, 80, 62, 66, 74),
  p('acm-8',  'Tijjani Reijnders',   14, 'MID', 74, 82, 80, 60, 54, 76, 80, 72),
  p('acm-9',  'Christian Pulisic',   11, 'FWD', 80, 82, 78, 76, 36, 84, 74, 74),
  p('acm-10', 'Álvaro Morata',       7,  'FWD', 78, 80, 70, 80, 38, 72, 70, 82),
  p('acm-11', 'Rafael Leão',         10, 'FWD', 90, 82, 70, 80, 28, 88, 68, 76),
];
const acmBench: Player[] = [
  p('acm-b1', 'Marco Sportiello',    57, 'GK',  32, 68, 46, 10, 12, 14, 50, 76),
  p('acm-b2', 'Pierre Kalulu',       20, 'DEF', 68, 78, 58, 24, 78, 52, 50, 76),
  p('acm-b3', 'Filippo Terracciano', 42, 'DEF', 66, 76, 54, 22, 74, 54, 48, 72),
  p('acm-b4', 'Ruben Loftus-Cheek',  8,  'MID', 66, 80, 72, 54, 58, 68, 68, 66),
  p('acm-b5', 'Samuel Chukwueze',    21, 'MID', 84, 76, 62, 62, 28, 80, 54, 56),
  p('acm-b6', 'Tammy Abraham',       90, 'FWD', 74, 78, 52, 76, 24, 64, 52, 72),
  p('acm-b7', 'Luka Jovic',          17, 'FWD', 62, 72, 54, 74, 20, 60, 52, 68),
];

// =========================================================================
// JUVENTUS (OVR 81)
// =========================================================================
const juvXI: Player[] = [
  p('juv-1',  'Michele Di Gregorio', 1,  'GK',  36, 74, 56, 10, 16, 18, 60, 88),
  p('juv-2',  'Andrea Cambiaso',     27, 'DEF', 78, 84, 72, 36, 78, 70, 64, 78),
  p('juv-3',  'Federico Gatti',      3,  'DEF', 70, 82, 60, 30, 84, 48, 54, 84),
  p('juv-4',  'Gleison Bremer',      24, 'DEF', 72, 84, 58, 28, 88, 46, 52, 86),
  p('juv-5',  'Nicolás González',    11, 'DEF', 74, 82, 66, 32, 76, 62, 58, 76),
  p('juv-6',  'Manuel Locatelli',    5,  'MID', 58, 82, 80, 46, 68, 62, 80, 70),
  p('juv-7',  'Nicolò Fagioli',      31, 'MID', 62, 78, 80, 50, 46, 70, 80, 66),
  p('juv-8',  'Weston McKennie',     16, 'MID', 70, 82, 70, 52, 66, 64, 66, 70),
  p('juv-9',  'Kenan Yildiz',        10, 'FWD', 78, 78, 72, 72, 28, 82, 72, 68),
  p('juv-10', 'Dušan Vlahović',      9,  'FWD', 76, 82, 60, 88, 30, 70, 62, 86),
  p('juv-11', 'Teun Koopmeiners',    8,  'FWD', 70, 82, 78, 72, 46, 74, 80, 72),
];
const juvBench: Player[] = [
  p('juv-b1', 'Mattia Perin',        36, 'GK',  34, 70, 50, 10, 14, 16, 54, 82),
  p('juv-b2', 'Daniele Rugani',      24, 'DEF', 52, 76, 52, 28, 78, 36, 48, 76),
  p('juv-b3', 'Mattia De Sciglio',   2,  'DEF', 64, 76, 58, 24, 72, 52, 50, 70),
  p('juv-b4', 'Hans Nicolussi',      25, 'MID', 58, 76, 70, 42, 52, 56, 68, 62),
  p('juv-b5', 'Fabio Miretti',       20, 'MID', 62, 74, 72, 44, 50, 62, 70, 60),
  p('juv-b6', 'Timothy Weah',        22, 'FWD', 80, 78, 62, 62, 28, 76, 56, 58),
  p('juv-b7', 'Arkadiusz Milik',     14, 'FWD', 62, 72, 52, 76, 22, 54, 50, 72),
];

// =========================================================================
// NAPOLI (OVR 80)
// =========================================================================
const napXI: Player[] = [
  p('nap-1',  'Alex Meret',          1,  'GK',  36, 74, 56, 12, 18, 20, 62, 88),
  p('nap-2',  'Giovanni Di Lorenzo', 22, 'DEF', 74, 84, 72, 36, 80, 62, 64, 80),
  p('nap-3',  'Amir Rrahmani',       13, 'DEF', 68, 82, 62, 28, 84, 46, 56, 84),
  p('nap-4',  'Juan Jesus',          5,  'DEF', 60, 78, 58, 26, 80, 40, 52, 78),
  p('nap-5',  'Mathias Olivera',     17, 'DEF', 72, 84, 64, 28, 78, 62, 56, 76),
  p('nap-6',  'André-Frank Zambo Anguissa', 99, 'MID', 70, 86, 72, 48, 78, 66, 68, 72),
  p('nap-7',  'Stanislav Lobotka',   68, 'MID', 54, 82, 88, 44, 68, 66, 88, 72),
  p('nap-8',  'Scott McTominay',     8,  'MID', 72, 84, 76, 58, 76, 62, 70, 72),
  p('nap-9',  'Matteo Politano',     21, 'FWD', 74, 80, 72, 68, 32, 78, 68, 66),
  p('nap-10', 'Romelu Lukaku',       11, 'FWD', 76, 82, 62, 82, 30, 70, 60, 84),
  p('nap-11', 'David Neres',         7,  'FWD', 84, 80, 68, 72, 28, 84, 66, 68),
];
const napBench: Player[] = [
  p('nap-b1', 'Elia Caprile',        25, 'GK',  34, 68, 48, 10, 12, 14, 52, 78),
  p('nap-b2', 'Mario Rui',           6,  'DEF', 70, 78, 64, 22, 72, 58, 54, 70),
  p('nap-b3', 'Pasquale Mazzocchi',  23, 'DEF', 70, 78, 60, 24, 72, 56, 50, 70),
  p('nap-b4', 'Jens Cajuste',        17, 'MID', 64, 76, 68, 42, 64, 58, 62, 64),
  p('nap-b5', 'Billy Gilmour',       27, 'MID', 52, 76, 76, 38, 58, 60, 76, 62),
  p('nap-b6', 'Cyril Ngonge',        11, 'FWD', 78, 76, 62, 62, 24, 74, 56, 58),
  p('nap-b7', 'Giovanni Simeone',    18, 'FWD', 74, 80, 52, 76, 22, 60, 50, 72),
];

// =========================================================================
// ATALANTA (OVR 79)
// =========================================================================
const ataXI: Player[] = [
  p('ata-1',  'Marco Carnesecchi',   29, 'GK',  36, 72, 58, 12, 16, 20, 62, 86),
  p('ata-2',  'Raoul Bellanova',     2,  'DEF', 76, 84, 70, 32, 76, 68, 60, 76),
  p('ata-3',  'Berat Djimsiti',      19, 'DEF', 66, 82, 60, 28, 84, 46, 54, 82),
  p('ata-4',  'Sead Kolasinac',      5,  'DEF', 62, 80, 58, 26, 82, 46, 52, 78),
  p('ata-5',  'Davide Zappacosta',   77, 'DEF', 76, 82, 68, 30, 76, 64, 58, 72),
  p('ata-6',  'Marten de Roon',      15, 'MID', 60, 84, 72, 44, 80, 54, 68, 76),
  p('ata-7',  'Éderson',             13, 'MID', 64, 82, 76, 52, 72, 66, 74, 70),
  p('ata-8',  'Mario Pasalic',       88, 'MID', 66, 80, 72, 60, 54, 64, 72, 68),
  p('ata-9',  'Ademola Lookman',     11, 'FWD', 84, 80, 68, 80, 28, 88, 68, 72),
  p('ata-10', 'Mateo Retegui',       32, 'FWD', 74, 82, 62, 86, 28, 66, 62, 80),
  p('ata-11', 'Charles De Ketelaere',17, 'FWD', 72, 80, 74, 72, 34, 76, 76, 68),
];
const ataBench: Player[] = [
  p('ata-b1', 'Francesco Rossi',     1,  'GK',  32, 68, 46, 10, 12, 14, 50, 76),
  p('ata-b2', 'Giorgio Scalvini',    42, 'DEF', 68, 78, 60, 26, 78, 50, 52, 76),
  p('ata-b3', 'Matteo Ruggeri',      3,  'DEF', 72, 78, 62, 26, 74, 58, 52, 70),
  p('ata-b4', 'Nicolò Zaniolo',      10, 'MID', 72, 76, 66, 60, 40, 72, 64, 60),
  p('ata-b5', 'Lazar Samardžić',     72, 'MID', 60, 76, 74, 54, 42, 68, 74, 62),
  p('ata-b6', 'El Bilal Touré',      9,  'FWD', 76, 76, 56, 70, 22, 70, 52, 64),
  p('ata-b7', 'Gianluca Scamacca',   90, 'FWD', 74, 78, 54, 76, 24, 62, 52, 70),
];

// =========================================================================
// ROMA (OVR 77)
// =========================================================================
const romXI: Player[] = [
  p('rom-1',  'Mile Svilar',         99, 'GK',  36, 72, 56, 12, 16, 20, 60, 86),
  p('rom-2',  'Zeki Çelik',          37, 'DEF', 74, 82, 64, 28, 78, 60, 54, 76),
  p('rom-3',  'Gianluca Mancini',    23, 'DEF', 66, 82, 62, 30, 84, 46, 56, 82),
  p('rom-4',  'Evan Ndicka',         5,  'DEF', 70, 82, 60, 26, 82, 52, 54, 80),
  p('rom-5',  'Angelino',            3,  'DEF', 72, 82, 68, 28, 74, 64, 60, 72),
  p('rom-6',  'Bryan Cristante',     4,  'MID', 58, 82, 74, 48, 72, 54, 72, 70),
  p('rom-7',  'Leandro Paredes',     16, 'MID', 50, 76, 82, 46, 56, 58, 82, 68),
  p('rom-8',  'Lorenzo Pellegrini',  7,  'MID', 64, 80, 80, 58, 52, 68, 80, 68),
  p('rom-9',  'Paulo Dybala',        21, 'FWD', 72, 76, 80, 80, 28, 86, 82, 72),
  p('rom-10', 'Artem Dovbyk',        11, 'FWD', 70, 78, 60, 84, 26, 64, 60, 80),
  p('rom-11', 'Stephan El Shaarawy', 92, 'FWD', 78, 78, 66, 72, 28, 78, 62, 68),
];
const romBench: Player[] = [
  p('rom-b1', 'Rui Patrício',        1,  'GK',  34, 68, 46, 10, 12, 14, 48, 78),
  p('rom-b2', 'Rick Karsdorp',       2,  'DEF', 68, 76, 58, 24, 72, 54, 50, 70),
  p('rom-b3', 'Nicola Zalewski',     59, 'DEF', 72, 76, 62, 26, 68, 62, 56, 64),
  p('rom-b4', 'Enzo Le Fée',         25, 'MID', 64, 76, 72, 44, 52, 62, 70, 60),
  p('rom-b5', 'Tommaso Baldanzi',    27, 'MID', 66, 74, 68, 52, 38, 66, 68, 58),
  p('rom-b6', 'Alexis Saelemaekers', 18, 'FWD', 76, 78, 66, 58, 34, 72, 58, 56),
  p('rom-b7', 'Eldor Shomurodov',    14, 'FWD', 68, 76, 52, 68, 22, 58, 46, 62),
];

// =========================================================================
// LAZIO (OVR 76)
// =========================================================================
const lazXI: Player[] = [
  p('laz-1',  'Ivan Provedel',       94, 'GK',  34, 72, 54, 10, 16, 18, 60, 84),
  p('laz-2',  'Manuel Lazzari',      29, 'DEF', 78, 82, 64, 30, 74, 68, 56, 72),
  p('laz-3',  'Mario Gila',          5,  'DEF', 68, 80, 62, 26, 80, 48, 54, 80),
  p('laz-4',  'Alessio Romagnoli',   13, 'DEF', 64, 80, 64, 28, 82, 44, 58, 80),
  p('laz-5',  'Adam Marusic',        77, 'DEF', 74, 82, 64, 28, 74, 62, 56, 72),
  p('laz-6',  'Mattéo Guendouzi',    8,  'MID', 68, 84, 76, 46, 68, 64, 74, 68),
  p('laz-7',  'Nicolò Rovella',      6,  'MID', 60, 80, 76, 44, 68, 60, 74, 66),
  p('laz-8',  'Fisayo Dele-Bashiru', 10, 'MID', 70, 80, 66, 52, 62, 66, 64, 64),
  p('laz-9',  'Gustav Isaksen',      20, 'FWD', 82, 78, 64, 68, 26, 78, 60, 62),
  p('laz-10', 'Taty Castellanos',    11, 'FWD', 76, 80, 60, 78, 24, 66, 58, 74),
  p('laz-11', 'Mattia Zaccagni',     10, 'FWD', 78, 80, 68, 74, 28, 80, 66, 68),
];
const lazBench: Player[] = [
  p('laz-b1', 'Christos Mandas',     1,  'GK',  32, 68, 46, 10, 12, 14, 50, 76),
  p('laz-b2', 'Patric',              26, 'DEF', 64, 76, 56, 22, 74, 48, 46, 72),
  p('laz-b3', 'Elseid Hysaj',        23, 'DEF', 66, 76, 56, 20, 72, 52, 48, 68),
  p('laz-b4', 'Vecino',              5,  'MID', 58, 76, 68, 44, 60, 52, 64, 62),
  p('laz-b5', 'Luis Alberto',        10, 'MID', 50, 72, 84, 48, 38, 60, 84, 62),
  p('laz-b6', 'Pedro',               9,  'FWD', 64, 74, 70, 68, 28, 72, 68, 60),
  p('laz-b7', 'Boulaye Dia',         7,  'FWD', 76, 78, 58, 72, 22, 70, 52, 64),
];

// =========================================================================
// FIORENTINA (OVR 75)
// =========================================================================
const fioXI: Player[] = [
  p('fio-1',  'Pietro Terracciano',  1,  'GK',  34, 72, 52, 10, 14, 16, 56, 82),
  p('fio-2',  'Dodô',                2,  'DEF', 80, 82, 68, 30, 72, 70, 58, 72),
  p('fio-3',  'Nikola Milenkovic',   4,  'DEF', 68, 80, 60, 28, 82, 44, 54, 80),
  p('fio-4',  'Luca Ranieri',        5,  'DEF', 62, 78, 58, 24, 78, 42, 50, 76),
  p('fio-5',  'Cristiano Biraghi',   3,  'DEF', 66, 80, 68, 26, 72, 58, 60, 68),
  p('fio-6',  'Rolando Mandragora',  38, 'MID', 56, 80, 70, 42, 68, 52, 68, 66),
  p('fio-7',  'Arthur Melo',         63, 'MID', 52, 76, 78, 38, 58, 64, 80, 62),
  p('fio-8',  'Lucas Beltran',       9,  'MID', 70, 78, 68, 58, 44, 68, 66, 62),
  p('fio-9',  'Nico González',       10, 'FWD', 78, 78, 70, 70, 28, 78, 68, 64),
  p('fio-10', 'Andrea Belotti',      9,  'FWD', 68, 78, 54, 76, 26, 62, 52, 72),
  p('fio-11', 'Riccardo Sottil',     11, 'FWD', 82, 76, 62, 64, 24, 78, 58, 58),
];
const fioBench: Player[] = [
  p('fio-b1', 'Oliver Christensen',  69, 'GK',  34, 68, 46, 10, 12, 14, 50, 74),
  p('fio-b2', 'Lucas Martínez Quarta',28,'DEF', 66, 76, 58, 24, 76, 46, 50, 74),
  p('fio-b3', 'Michael Kayode',      7,  'DEF', 74, 76, 56, 22, 68, 62, 48, 66),
  p('fio-b4', 'Sofyan Amrabat',      34, 'MID', 60, 80, 66, 34, 74, 52, 60, 64),
  p('fio-b5', 'Maxime López',        24, 'MID', 52, 74, 70, 36, 58, 54, 68, 58),
  p('fio-b6', 'Jonathan Ikoné',      21, 'FWD', 78, 74, 62, 60, 24, 76, 58, 54),
  p('fio-b7', "M'Bala Nzola",        14, 'FWD', 72, 74, 48, 70, 18, 62, 42, 62),
];

// =========================================================================
// BOLOGNA (OVR 74)
// =========================================================================
const bolXI: Player[] = [
  p('bol-1',  'Lukasz Skorupski',    28, 'GK',  34, 72, 52, 10, 14, 16, 56, 82),
  p('bol-2',  'Stefan Posch',        3,  'DEF', 72, 82, 62, 28, 78, 56, 52, 76),
  p('bol-3',  'Sam Beukema',         4,  'DEF', 68, 80, 60, 26, 80, 44, 52, 78),
  p('bol-4',  'Jhon Lucumí',         17, 'DEF', 66, 80, 58, 24, 78, 42, 50, 76),
  p('bol-5',  'Victor Kristiansen',  5,  'DEF', 70, 80, 62, 24, 72, 58, 54, 68),
  p('bol-6',  'Remo Freuler',        23, 'MID', 62, 82, 74, 44, 70, 58, 72, 68),
  p('bol-7',  'Lewis Ferguson',      19, 'MID', 66, 82, 72, 52, 68, 62, 68, 66),
  p('bol-8',  'Michel Aebischer',    8,  'MID', 62, 78, 68, 44, 64, 56, 66, 62),
  p('bol-9',  'Riccardo Orsolini',   7,  'FWD', 76, 78, 68, 70, 26, 76, 64, 64),
  p('bol-10', 'Santiago Castro',     9,  'FWD', 74, 78, 60, 72, 24, 70, 58, 66),
  p('bol-11', 'Dan Ndoye',           11, 'FWD', 82, 78, 60, 64, 24, 78, 56, 58),
];
const bolBench: Player[] = [
  p('bol-b1', 'Nicola Bagnolini',    1,  'GK',  30, 64, 42, 8,  10, 12, 44, 70),
  p('bol-b2', 'Lykogiannis',         6,  'DEF', 68, 74, 58, 20, 68, 52, 48, 64),
  p('bol-b3', 'Nicolás Valentini',   40, 'DEF', 60, 74, 54, 22, 72, 40, 46, 70),
  p('bol-b4', 'Tommaso Urbanski',    35, 'MID', 58, 74, 66, 40, 50, 56, 64, 58),
  p('bol-b5', 'Giovanni Fabbian',    29, 'MID', 60, 76, 64, 46, 56, 54, 62, 62),
  p('bol-b6', 'Jesper Karlsson',     44, 'FWD', 78, 74, 60, 62, 22, 70, 52, 54),
  p('bol-b7', 'Alexis Saelemaekers', 24, 'FWD', 76, 76, 64, 56, 32, 70, 56, 54),
];

// =========================================================================
// TORINO (OVR 73)
// =========================================================================
const torXI: Player[] = [
  p('tor-1',  'Vanja Milinkovic-Savic',32,'GK', 36, 72, 52, 10, 14, 16, 54, 82),
  p('tor-2',  'Mergim Vojvoda',       6,  'DEF', 68, 80, 60, 26, 76, 52, 50, 72),
  p('tor-3',  'Saúl Coco',            3,  'DEF', 64, 78, 58, 24, 78, 44, 50, 74),
  p('tor-4',  'Alessandro Buongiorno',14, 'DEF', 70, 82, 62, 26, 82, 46, 54, 78),
  p('tor-5',  'Valentino Lazaro',     19, 'DEF', 74, 78, 62, 28, 70, 62, 54, 68),
  p('tor-6',  'Samuele Ricci',        28, 'MID', 58, 80, 74, 42, 66, 58, 72, 64),
  p('tor-7',  'Alieu Tameze',         61, 'MID', 60, 80, 64, 38, 72, 50, 58, 66),
  p('tor-8',  'Karol Linetty',        8,  'MID', 58, 78, 66, 44, 60, 52, 64, 62),
  p('tor-9',  'Nikola Vlasic',        10, 'FWD', 68, 78, 68, 66, 32, 72, 68, 62),
  p('tor-10', 'Antonio Sanabria',     9,  'FWD', 68, 76, 52, 74, 22, 62, 52, 70),
  p('tor-11', 'Che Adams',            11, 'FWD', 76, 78, 54, 70, 24, 66, 52, 64),
];
const torBench: Player[] = [
  p('tor-b1', 'Luca Gemello',         1,  'GK',  30, 64, 40, 8,  10, 12, 42, 70),
  p('tor-b2', 'Perr Schuurs',         5,  'DEF', 62, 76, 56, 22, 74, 42, 48, 70),
  p('tor-b3', 'Ricardo Rodriguez',    2,  'DEF', 60, 74, 60, 20, 70, 48, 52, 66),
  p('tor-b4', 'Ivan Ilic',            37, 'MID', 58, 74, 68, 42, 56, 54, 66, 60),
  p('tor-b5', 'Emirhan İlkhan',       40, 'MID', 58, 72, 64, 38, 54, 52, 60, 58),
  p('tor-b6', 'Yann Karamoh',         17, 'FWD', 82, 72, 52, 56, 20, 72, 46, 50),
  p('tor-b7', 'Nemanja Radonjic',     11, 'FWD', 78, 72, 54, 58, 20, 72, 50, 50),
];

// =========================================================================
// UDINESE (OVR 72)
// =========================================================================
const udiXI: Player[] = [
  p('udi-1',  'Marco Silvestri',      1,  'GK',  34, 70, 50, 10, 14, 14, 52, 80),
  p('udi-2',  'Destiny Udogie',       3,  'DEF', 78, 80, 62, 26, 72, 66, 54, 68),
  p('udi-3',  'Jaka Bijol',           5,  'DEF', 66, 78, 58, 24, 78, 42, 50, 74),
  p('udi-4',  'Lautaro Giannetti',    17, 'DEF', 60, 76, 54, 22, 74, 40, 46, 72),
  p('udi-5',  'Hassane Kamara',       33, 'DEF', 72, 78, 58, 22, 70, 58, 50, 66),
  p('udi-6',  'Walace',               27, 'MID', 56, 78, 64, 38, 70, 48, 60, 64),
  p('udi-7',  'Sandi Lovric',         8,  'MID', 60, 78, 68, 44, 60, 56, 66, 60),
  p('udi-8',  'Jean-Victor Makengo',  29, 'MID', 66, 78, 60, 42, 60, 58, 56, 60),
  p('udi-9',  'Florian Thauvin',      11, 'FWD', 70, 74, 70, 66, 26, 74, 68, 60),
  p('udi-10', 'Lorenzo Lucca',        17, 'FWD', 74, 78, 54, 74, 22, 60, 52, 68),
  p('udi-11', 'Isaac Success',        10, 'FWD', 76, 76, 54, 62, 22, 72, 48, 58),
];
const udiBench: Player[] = [
  p('udi-b1', 'Maduka Okoye',         24, 'GK',  32, 66, 42, 8,  10, 12, 44, 72),
  p('udi-b2', 'Nehuen Pérez',         6,  'DEF', 64, 74, 54, 20, 72, 40, 44, 68),
  p('udi-b3', 'Adam Masina',          5,  'DEF', 58, 72, 52, 18, 68, 42, 44, 64),
  p('udi-b4', 'Iker Bravo',           20, 'MID', 62, 72, 62, 44, 44, 60, 58, 56),
  p('udi-b5', 'Martin Payero',        22, 'MID', 60, 74, 60, 40, 58, 52, 56, 58),
  p('udi-b6', 'Ilija Nestorovski',    21, 'FWD', 66, 70, 46, 66, 18, 56, 42, 58),
  p('udi-b7', 'Luca Brenner',         99, 'FWD', 62, 70, 44, 62, 16, 52, 40, 56),
];

// =========================================================================
// GENOA (OVR 71)
// =========================================================================
const genXI: Player[] = [
  p('gen-1',  'Josep Martínez',       1,  'GK',  34, 70, 50, 10, 14, 16, 52, 78),
  p('gen-2',  'Johan Vasquez',        5,  'DEF', 64, 76, 54, 22, 74, 42, 46, 72),
  p('gen-3',  'Radu Drăgușin',        14, 'DEF', 64, 76, 54, 22, 76, 42, 46, 72),
  p('gen-4',  'Andrea Masiello',      6,  'DEF', 56, 74, 52, 20, 72, 36, 44, 70),
  p('gen-5',  'Aaron Martin',         3,  'DEF', 68, 76, 58, 22, 70, 54, 48, 66),
  p('gen-6',  'Morten Frendrup',      19, 'MID', 64, 78, 64, 40, 66, 56, 60, 62),
  p('gen-7',  'Milan Badelj',         16, 'MID', 50, 74, 68, 36, 62, 44, 66, 62),
  p('gen-8',  'Jakub Jankto',         8,  'MID', 62, 74, 64, 44, 54, 58, 60, 58),
  p('gen-9',  'Albert Gudmundsson',   11, 'FWD', 72, 76, 72, 74, 26, 76, 70, 64),
  p('gen-10', 'Mateo Retegui',        9,  'FWD', 68, 76, 54, 76, 22, 60, 52, 68),
  p('gen-11', 'Caleb Ekuban',         17, 'FWD', 78, 74, 52, 62, 22, 68, 46, 56),
];
const genBench: Player[] = [
  p('gen-b1', 'Leali',                25, 'GK',  30, 64, 40, 8,  10, 12, 42, 68),
  p('gen-b2', 'Stefano Sabelli',      25, 'DEF', 64, 72, 52, 20, 66, 50, 42, 62),
  p('gen-b3', 'Silvan Hefti',         2,  'DEF', 66, 72, 54, 18, 66, 52, 44, 62),
  p('gen-b4', 'Filippo Melegoni',     20, 'MID', 56, 70, 60, 36, 50, 50, 56, 54),
  p('gen-b5', 'Ruslan Malinovskiy',   18, 'MID', 60, 72, 70, 46, 42, 60, 68, 54),
  p('gen-b6', 'Vitinha',              10, 'FWD', 64, 72, 62, 62, 22, 68, 56, 52),
  p('gen-b7', 'Massimo Coda',         22, 'FWD', 52, 70, 48, 70, 16, 46, 44, 62),
];

// =========================================================================
// MONZA (OVR 71)
// =========================================================================
const monXI: Player[] = [
  p('mon-1',  'Stefano Turati',       1,  'GK',  34, 70, 50, 10, 12, 14, 52, 78),
  p('mon-2',  'Andrea Izzo',          5,  'DEF', 62, 76, 54, 22, 76, 42, 46, 72),
  p('mon-3',  'Pablo Marí',           4,  'DEF', 60, 76, 60, 22, 76, 40, 52, 72),
  p('mon-4',  'Luca Caldirola',       6,  'DEF', 58, 74, 54, 20, 74, 38, 46, 70),
  p('mon-5',  "D'Ambrosio",           33, 'DEF', 62, 72, 56, 20, 70, 46, 46, 66),
  p('mon-6',  'Matteo Pessina',       32, 'MID', 60, 78, 70, 44, 60, 58, 68, 64),
  p('mon-7',  'Warren Bondo',         42, 'MID', 64, 76, 62, 38, 66, 54, 58, 60),
  p('mon-8',  'Roberto Gagliardini',  5,  'MID', 58, 76, 64, 40, 62, 48, 58, 62),
  p('mon-9',  'Dany Mota',            19, 'FWD', 74, 74, 60, 66, 22, 70, 56, 60),
  p('mon-10', 'Andrea Colpani',       28, 'FWD', 72, 76, 68, 62, 24, 72, 66, 58),
  p('mon-11', 'Gianluca Caprari',     7,  'FWD', 68, 72, 66, 66, 22, 68, 64, 60),
];
const monBench: Player[] = [
  p('mon-b1', 'Michele Cragno',       30, 'GK',  32, 66, 42, 8,  10, 12, 44, 70),
  p('mon-b2', 'Luca Marrone',         26, 'DEF', 52, 70, 50, 18, 68, 34, 40, 64),
  p('mon-b3', 'Armando Izzo',         55, 'DEF', 58, 72, 50, 20, 70, 38, 42, 66),
  p('mon-b4', 'Mattia Valoti',        14, 'MID', 56, 72, 60, 40, 52, 50, 56, 56),
  p('mon-b5', 'Daniel Maldini',       8,  'MID', 62, 72, 64, 48, 36, 62, 62, 54),
  p('mon-b6', 'Andrea Petagna',       37, 'FWD', 56, 68, 46, 66, 16, 48, 40, 60),
  p('mon-b7', 'Maric',                99, 'FWD', 62, 68, 44, 58, 18, 54, 38, 52),
];

// =========================================================================
// HELLAS VERONA (OVR 70)
// =========================================================================
const helXI: Player[] = [
  p('hel-1',  'Lorenzo Montipò',     1,  'GK',  34, 70, 50, 10, 12, 14, 50, 78),
  p('hel-2',  'Davide Faraoni',       2,  'DEF', 66, 76, 58, 22, 70, 52, 48, 66),
  p('hel-3',  'Isak Hien',            5,  'DEF', 68, 78, 56, 22, 76, 42, 48, 72),
  p('hel-4',  'Diego Coppola',        27, 'DEF', 62, 74, 52, 20, 72, 38, 44, 70),
  p('hel-5',  'Fabio Lazović',        29, 'DEF', 66, 76, 60, 22, 68, 54, 50, 64),
  p('hel-6',  'Miguel Veloso',        11, 'MID', 46, 72, 66, 34, 58, 44, 64, 60),
  p('hel-7',  'Adrien Tamèze',        61, 'MID', 60, 76, 60, 36, 66, 50, 54, 60),
  p('hel-8',  'Kevin Lasagna',        12, 'MID', 68, 74, 58, 52, 36, 60, 52, 56),
  p('hel-9',  'Darko Lazović',        21, 'FWD', 66, 74, 62, 60, 22, 66, 56, 56),
  p('hel-10', 'Thomas Henry',         9,  'FWD', 68, 74, 50, 70, 18, 60, 48, 62),
  p('hel-11', 'Ondrej Duda',          25, 'FWD', 64, 72, 64, 62, 24, 64, 62, 56),
];
const helBench: Player[] = [
  p('hel-b1', 'Simone Perilli',       22, 'GK',  30, 62, 40, 8,  10, 10, 40, 68),
  p('hel-b2', 'Federico Ceccherini',  16, 'DEF', 54, 70, 48, 18, 68, 34, 40, 66),
  p('hel-b3', 'Josh Doig',            55, 'DEF', 64, 72, 54, 20, 64, 50, 44, 60),
  p('hel-b4', 'Marco Frese',          20, 'MID', 52, 70, 56, 32, 54, 42, 52, 54),
  p('hel-b5', 'Alberto Denz',         7,  'MID', 56, 70, 58, 36, 42, 52, 56, 52),
  p('hel-b6', 'Grigoris Kastanos',    28, 'FWD', 60, 68, 58, 52, 20, 58, 54, 48),
  p('hel-b7', 'Cyril Ngonge',         45, 'FWD', 72, 70, 54, 60, 18, 66, 48, 50),
];

// =========================================================================
// LECCE (OVR 69)
// =========================================================================
const lecXI: Player[] = [
  p('lec-1',  'Wladimiro Falcone',    1,  'GK',  32, 68, 48, 10, 12, 12, 48, 76),
  p('lec-2',  'Valentin Gendrey',     25, 'DEF', 62, 74, 54, 20, 68, 48, 44, 64),
  p('lec-3',  'Marin Pongracic',      5,  'DEF', 66, 74, 52, 22, 72, 40, 44, 70),
  p('lec-4',  'Federico Baschirotto', 15, 'DEF', 60, 72, 50, 18, 70, 36, 42, 68),
  p('lec-5',  'Samuel Umtiti',        3,  'DEF', 56, 68, 54, 20, 68, 38, 46, 66),
  p('lec-6',  'Morten Hjulmand',      16, 'MID', 54, 76, 64, 36, 66, 48, 62, 60),
  p('lec-7',  'Ylber Ramadani',       4,  'MID', 52, 74, 60, 32, 64, 44, 56, 58),
  p('lec-8',  'Pontus Almqvist',      7,  'MID', 66, 70, 58, 46, 34, 60, 52, 54),
  p('lec-9',  'Nikola Krstović',      9,  'FWD', 68, 72, 52, 68, 18, 58, 46, 62),
  p('lec-10', 'Lameck Banda',         11, 'FWD', 76, 70, 50, 58, 18, 70, 44, 50),
  p('lec-11', 'Roberto Piccoli',      91, 'FWD', 62, 70, 46, 68, 16, 52, 42, 58),
];
const lecBench: Player[] = [
  p('lec-b1', 'Simy',                 27, 'GK',  30, 62, 38, 6,  10, 10, 38, 64),
  p('lec-b2', 'Antonino Gallo',       3,  'DEF', 58, 70, 48, 16, 62, 40, 38, 60),
  p('lec-b3', 'Kialonda Gaspar',      4,  'DEF', 56, 68, 46, 16, 62, 36, 36, 58),
  p('lec-b4', 'Rémi Oudin',           10, 'MID', 60, 68, 58, 40, 32, 56, 52, 48),
  p('lec-b5', 'Lassana Coulibaly',    40, 'MID', 56, 70, 56, 30, 56, 46, 50, 50),
  p('lec-b6', 'Gabriel Strefezza',    77, 'FWD', 68, 68, 58, 56, 20, 66, 52, 46),
  p('lec-b7', 'Lorenzo Colombo',      30, 'FWD', 64, 68, 46, 64, 14, 54, 40, 56),
];

// =========================================================================
// CAGLIARI (OVR 69)
// =========================================================================
const cagXI: Player[] = [
  p('cag-1',  'Simone Scuffet',       1,  'GK',  32, 68, 46, 10, 12, 12, 48, 76),
  p('cag-2',  'Alessandro Di Pardo',  2,  'DEF', 60, 72, 52, 20, 66, 46, 42, 62),
  p('cag-3',  'Razvan Marin',         6,  'DEF', 62, 72, 60, 30, 62, 50, 58, 60),
  p('cag-4',  'Giorgio Altare',       5,  'DEF', 60, 72, 50, 18, 68, 36, 42, 66),
  p('cag-5',  'Luca Augello',         30, 'DEF', 66, 72, 54, 18, 66, 52, 44, 62),
  p('cag-6',  'Antonello Rog',        16, 'MID', 52, 70, 62, 34, 54, 46, 58, 54),
  p('cag-7',  'Alessandro Deiola',    8,  'MID', 52, 72, 58, 32, 60, 42, 52, 56),
  p('cag-8',  'Gaetano Oristanio',    70, 'MID', 60, 70, 62, 42, 36, 58, 60, 52),
  p('cag-9',  'Zito Luvumbo',         77, 'FWD', 76, 70, 50, 60, 18, 70, 44, 50),
  p('cag-10', 'Gianluca Lapadula',    9,  'FWD', 66, 72, 48, 70, 18, 56, 44, 60),
  p('cag-11', 'Nadir Zortea',         77, 'FWD', 72, 70, 52, 56, 18, 64, 46, 50),
];
const cagBench: Player[] = [
  p('cag-b1', 'Boris Radunovic',      32, 'GK',  30, 62, 40, 8,  10, 10, 40, 66),
  p('cag-b2', 'Yerry Mina',           23, 'DEF', 56, 68, 46, 22, 68, 34, 40, 64),
  p('cag-b3', 'Adam Obert',           27, 'DEF', 58, 68, 48, 16, 62, 38, 38, 60),
  p('cag-b4', 'Michel Adopo',         14, 'MID', 56, 68, 54, 28, 52, 44, 48, 50),
  p('cag-b5', 'Piotr Zielinski',      9,  'MID', 48, 66, 62, 30, 42, 42, 58, 48),
  p('cag-b6', 'Leonardo Pavoletti',   35, 'FWD', 54, 64, 40, 66, 14, 42, 38, 56),
  p('cag-b7', 'Mattia Felici',        40, 'FWD', 70, 66, 48, 52, 16, 62, 40, 44),
];

// =========================================================================
// EMPOLI (OVR 68)
// =========================================================================
const empXI: Player[] = [
  p('emp-1',  'Elia Caprile',         1,  'GK',  32, 66, 44, 8,  12, 12, 48, 74),
  p('emp-2',  'Sebastiano Luperto',   6,  'DEF', 56, 70, 50, 18, 66, 36, 42, 66),
  p('emp-3',  'Ardian Ismajli',       5,  'DEF', 64, 70, 52, 20, 70, 42, 44, 68),
  p('emp-4',  'Simone Bastoni',       35, 'DEF', 62, 70, 54, 18, 64, 48, 46, 62),
  p('emp-5',  'Tyronne Ebuehi',       27, 'DEF', 68, 72, 54, 18, 64, 54, 44, 60),
  p('emp-6',  'Alberto Grassi',       8,  'MID', 52, 70, 62, 32, 58, 44, 58, 54),
  p('emp-7',  'Liam Henderson',       16, 'MID', 50, 68, 64, 32, 52, 44, 60, 52),
  p('emp-8',  'Jacopo Fazzini',       28, 'MID', 58, 68, 62, 42, 36, 58, 60, 50),
  p('emp-9',  'Nedim Bajrami',        10, 'FWD', 66, 68, 62, 62, 20, 64, 58, 52),
  p('emp-10', 'Mattia Destro',        23, 'FWD', 58, 66, 48, 66, 16, 50, 44, 58),
  p('emp-11', 'Lorenzo Colombo',      9,  'FWD', 62, 68, 46, 64, 14, 54, 42, 56),
];
const empBench: Player[] = [
  p('emp-b1', 'Devis Vasquez',        22, 'GK',  30, 62, 38, 8,  10, 10, 40, 66),
  p('emp-b2', 'Petar Stojanovic',     2,  'DEF', 60, 68, 50, 16, 60, 44, 38, 58),
  p('emp-b3', 'Radu Drăgușin',        31, 'DEF', 56, 68, 46, 18, 64, 36, 38, 62),
  p('emp-b4', 'Szymon Zurkowski',     19, 'MID', 54, 68, 58, 34, 52, 46, 54, 50),
  p('emp-b5', 'Razvan Marin',         9,  'MID', 50, 66, 60, 30, 44, 42, 56, 48),
  p('emp-b6', 'Emmanuel Gyasi',       7,  'FWD', 72, 66, 48, 52, 18, 60, 40, 44),
  p('emp-b7', 'Francesco Caputo',     10, 'FWD', 56, 64, 44, 64, 14, 46, 40, 54),
];

// =========================================================================
// PARMA (OVR 68)
// =========================================================================
const parXI: Player[] = [
  p('par-1',  'Zion Suzuki',          1,  'GK',  30, 66, 42, 8,  10, 12, 44, 74),
  p('par-2',  'Yordan Osorio',        3,  'DEF', 62, 70, 50, 20, 68, 42, 44, 64),
  p('par-3',  'Botond Balogh',        5,  'DEF', 60, 70, 50, 18, 66, 38, 42, 64),
  p('par-4',  'Ivan Jurić',           4,  'DEF', 56, 68, 48, 18, 64, 36, 40, 62),
  p('par-5',  'Enrico Del Prato',     6,  'DEF', 54, 68, 46, 18, 64, 34, 40, 62),
  p('par-6',  'Adrian Bernabé',       8,  'MID', 62, 70, 66, 42, 46, 60, 62, 54),
  p('par-7',  'Woyo Coulibaly',       22, 'MID', 60, 70, 56, 32, 60, 46, 52, 54),
  p('par-8',  'Ange-Yoan Bonny',      10, 'MID', 64, 68, 62, 46, 36, 60, 58, 52),
  p('par-9',  'Valentin Mihăilă',     11, 'FWD', 68, 68, 56, 60, 18, 64, 52, 48),
  p('par-10', 'Dennis Man',           77, 'FWD', 70, 68, 58, 60, 18, 66, 52, 48),
  p('par-11', 'Pontus Almqvist',      23, 'FWD', 66, 66, 52, 58, 18, 62, 46, 46),
];
const parBench: Player[] = [
  p('par-b1', 'Adrian Semper',        30, 'GK',  28, 62, 38, 6,  10, 10, 38, 64),
  p('par-b2', 'Lautaro Valenti',      17, 'DEF', 54, 66, 44, 16, 62, 34, 36, 58),
  p('par-b3', 'Filippo Pittarello',   35, 'DEF', 56, 66, 44, 16, 60, 34, 36, 56),
  p('par-b4', 'Emanuele Valeri',      29, 'MID', 52, 66, 54, 30, 46, 44, 50, 46),
  p('par-b5', 'Mateus Lobo',          14, 'MID', 52, 64, 56, 28, 40, 44, 52, 44),
  p('par-b6', 'Charpentier',          9,  'FWD', 60, 64, 42, 56, 14, 52, 38, 48),
  p('par-b7', 'Yann Karamoh',         7,  'FWD', 72, 64, 46, 50, 16, 62, 38, 40),
];

// =========================================================================
// COMO (OVR 66)
// =========================================================================
const comXI: Player[] = [
  p('com-1',  'Emil Audero',          1,  'GK',  30, 64, 40, 8,  10, 10, 44, 72),
  p('com-2',  'Van der Brempt',       27, 'DEF', 58, 68, 50, 18, 62, 42, 40, 60),
  p('com-3',  'Edoardo Goldaniga',    4,  'DEF', 56, 68, 48, 16, 64, 32, 38, 62),
  p('com-4',  'Carlos Augusto',       3,  'DEF', 70, 70, 58, 20, 64, 52, 46, 62),
  p('com-5',  'Facundo Moreno',       5,  'DEF', 54, 66, 46, 16, 60, 34, 36, 58),
  p('com-6',  'Sergi Roberto',        8,  'MID', 50, 64, 66, 30, 52, 52, 62, 52),
  p('com-7',  'Pau Engelhardt',       14, 'MID', 52, 66, 58, 28, 54, 44, 54, 50),
  p('com-8',  'Nico Paz',             10, 'MID', 58, 64, 62, 42, 32, 60, 62, 50),
  p('com-9',  'Gabriel Strefezza',    11, 'FWD', 66, 64, 56, 56, 18, 64, 50, 44),
  p('com-10', 'Patrick Cutrone',      9,  'FWD', 60, 66, 46, 60, 16, 54, 42, 54),
  p('com-11', 'Alieu Fadera',         7,  'FWD', 72, 64, 50, 54, 16, 66, 42, 44),
];
const comBench: Player[] = [
  p('com-b1', 'Reina',                25, 'GK',  26, 60, 38, 6,  8,  10, 38, 66),
  p('com-b2', 'Alberto Barba',        6,  'DEF', 50, 64, 44, 14, 58, 32, 34, 56),
  p('com-b3', 'Marcus Dickmann',      30, 'DEF', 56, 64, 46, 14, 58, 38, 36, 54),
  p('com-b4', 'Ignace van der Brempt',77, 'MID', 50, 62, 52, 26, 42, 40, 48, 44),
  p('com-b5', 'Aleksei Miranchuk',    20, 'MID', 54, 62, 60, 36, 30, 54, 58, 46),
  p('com-b6', 'Lorenzo Cerri',        99, 'FWD', 56, 62, 40, 56, 12, 50, 36, 46),
  p('com-b7', 'Raffaele Cerri',       22, 'FWD', 54, 60, 38, 52, 12, 46, 34, 44),
];

// =========================================================================
// VENEZIA (OVR 65)
// =========================================================================
const venXI: Player[] = [
  p('ven-1',  'Filip Stankovic',      12, 'GK',  30, 62, 38, 6,  10, 10, 42, 70),
  p('ven-2',  'Michael Svoboda',      5,  'DEF', 56, 66, 46, 16, 62, 32, 38, 60),
  p('ven-3',  'Pietro Ceccaroni',     3,  'DEF', 56, 66, 48, 14, 62, 34, 38, 60),
  p('ven-4',  'Ridgeciano Haps',      29, 'DEF', 62, 66, 52, 16, 60, 48, 40, 58),
  p('ven-5',  'Nicolò Candela',       2,  'DEF', 58, 66, 50, 14, 58, 42, 38, 56),
  p('ven-6',  'Gianluca Busio',       19, 'MID', 50, 64, 60, 30, 44, 44, 56, 50),
  p('ven-7',  'Hans Nicolussi',       8,  'MID', 52, 64, 58, 28, 46, 44, 54, 48),
  p('ven-8',  'Dor Peretz',           20, 'MID', 48, 62, 60, 28, 42, 40, 56, 46),
  p('ven-9',  'Iyenoma Udogie',       77, 'FWD', 68, 64, 50, 56, 14, 60, 42, 44),
  p('ven-10', 'Joel Pohjanpalo',      9,  'FWD', 62, 64, 46, 64, 14, 50, 40, 54),
  p('ven-11', 'Gaetano Johnsen',      11, 'FWD', 66, 62, 48, 52, 14, 58, 40, 42),
];
const venBench: Player[] = [
  p('ven-b1', 'Jesper Löfgren',       1,  'GK',  28, 58, 34, 6,  8,  8,  36, 62),
  p('ven-b2', 'Elliot Balestrero',    4,  'DEF', 50, 62, 42, 14, 56, 28, 32, 54),
  p('ven-b3', 'Marco Modolo',         6,  'DEF', 48, 62, 42, 12, 56, 28, 32, 54),
  p('ven-b4', 'Luca Fiordilino',      21, 'MID', 46, 60, 52, 24, 38, 36, 50, 42),
  p('ven-b5', 'Emmanuel Gyasi',       17, 'MID', 68, 62, 44, 44, 16, 58, 36, 38),
  p('ven-b6', 'Théo Bongonda',        22, 'FWD', 66, 60, 46, 48, 12, 62, 38, 36),
  p('ven-b7', 'Raimonds Krollis',     15, 'FWD', 60, 60, 40, 50, 12, 52, 34, 40),
];

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------
export const serieA: LeagueDefinition = {
  id: 'serieA',
  name: 'Serie A',
  country: 'Itália',
  cupName: 'Coppa Italia',
  flag: '🇮🇹',
  color: '#004c97',
  logo: 'https://r2.thesportsdb.com/images/media/league/badge/67q3q21679951383.png',
  totalRounds: 38,
  teams: [
    makeFullTeam('int',  'Inter Milan',   'INT', '#010E80', '#FFD700', 'https://r2.thesportsdb.com/images/media/team/badge/ryhu6d1617113103.png',  interXI, interBench),
    makeFullTeam('acm',  'AC Milan',      'ACM', '#FB090B', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/wvspur1448806617.png',   acmXI,   acmBench),
    makeFullTeam('juv',  'Juventus',      'JUV', '#000000', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/uxf0gr1742983727.png',   juvXI,   juvBench),
    makeFullTeam('nap',  'Napoli',        'NAP', '#12A0D2', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/l8qyxv1742982541.png',   napXI,   napBench),
    makeFullTeam('ata',  'Atalanta',      'ATA', '#1C2A5E', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/qix5ku1780561327.png',   ataXI,   ataBench),
    makeFullTeam('rom',  'Roma',          'ROM', '#9C142C', '#FFB612', 'https://r2.thesportsdb.com/images/media/team/badge/jwro2s1760820674.png',   romXI,   romBench),
    makeFullTeam('laz',  'Lazio',         'LAZ', '#87CEEB', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/rwqyvs1448806608.png',   lazXI,   lazBench),
    makeFullTeam('fio',  'Fiorentina',    'FIO', '#5C2D91', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/hc8nhu1656098030.png',   fioXI,   fioBench),
    makeFullTeam('bol',  'Bologna',       'BOL', '#CE2939', '#0A1E47', 'https://r2.thesportsdb.com/images/media/team/badge/2qi1u31655592366.png',   bolXI,   bolBench),
    makeFullTeam('tor',  'Torino',        'TOR', '#8B0000', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/xxprty1448806802.png',   torXI,   torBench),
    makeFullTeam('udi',  'Udinese',       'UDI', '#000000', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/vwvstr1448806811.png',   udiXI,   udiBench),
    makeFullTeam('gen',  'Genoa',         'GEN', '#E60000', '#1C2A5E', 'https://r2.thesportsdb.com/images/media/team/badge/52s8dn1655553600.png',   genXI,   genBench),
    makeFullTeam('mon',  'Monza',         'MON', '#E60000', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/bxearg1603170113.png',   monXI,   monBench),
    makeFullTeam('hel',  'Hellas Verona', 'HEL', '#004C97', '#FFFF00', 'https://r2.thesportsdb.com/images/media/team/badge/p6camf1593457737.png',   helXI,   helBench),
    makeFullTeam('lec',  'Lecce',         'LEC', '#FFD700', '#D50032', 'https://r2.thesportsdb.com/images/media/team/badge/j4vznr1567365249.png',   lecXI,   lecBench),
    makeFullTeam('cag',  'Cagliari',      'CAG', '#003B73', '#D3212A', 'https://r2.thesportsdb.com/images/media/team/badge/wvsvxt1447534471.png',   cagXI,   cagBench),
    makeFullTeam('emp',  'Empoli',        'EMP', '#1E5AA0', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/c1ie6b1622561483.png',   empXI,   empBench),
    makeFullTeam('par',  'Parma',         'PAR', '#FFD700', '#003399', 'https://r2.thesportsdb.com/images/media/team/badge/6yiaxs1627406063.png',   parXI,   parBench),
    makeFullTeam('com',  'Como',          'COM', '#1E3A8A', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/02x81t1627405841.png',   comXI,   comBench),
    makeFullTeam('ven',  'Venezia',       'VEN', '#F57C00', '#004D00', 'https://r2.thesportsdb.com/images/media/team/badge/vbiget1781026964.png',   venXI,   venBench),
  ],
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 0.9, defensiveLineMod: 1.05, tempoMod: 0.95, passingFocusMod: 1.1 },
  relegationSpots: 3,
};
