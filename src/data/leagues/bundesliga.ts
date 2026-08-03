import type { LeagueDefinition } from './types';
import type { Player } from '@/engine/types';
import { p, makeFullTeam } from './teamFactory';

// ---------------------------------------------------------------------------
// BUNDESLIGA 2024/25 — 18 times com elencos realistas
// Escala 1-99: 90+ elite, 85-89 craque, 80-84 muito bom, 75-79 bom, 70-74 médio
// ---------------------------------------------------------------------------


// =========================================================================
// BAYERN MÜNCHEN (OVR 87)
// =========================================================================
const bayernXI: Player[] = [
  p('bay-1',  'Manuel Neuer',       1,  'GK',  36, 78, 62, 12, 18, 22, 68, 92),
  p('bay-2',  'Joshua Kimmich',     6,  'DEF', 72, 88, 76, 36, 86, 66, 70, 88),
  p('bay-3',  'Dayot Upamecano',    5,  'DEF', 76, 86, 68, 32, 90, 56, 60, 90),
  p('bay-4',  'Min-jae Kim',        3,  'DEF', 80, 88, 70, 34, 92, 54, 62, 92),
  p('bay-5',  'Alphonso Davies',    19, 'DEF', 94, 86, 72, 36, 78, 82, 64, 80),
  p('bay-6',  'Leon Goretzka',      8,  'MID', 76, 90, 84, 68, 72, 76, 82, 78),
  p('bay-7',  'Aleksandar Pavlović',16, 'MID', 72, 86, 82, 58, 68, 72, 80, 74),
  p('bay-8',  'Jamal Musiala',      42, 'MID', 80, 86, 88, 72, 52, 92, 86, 78),
  p('bay-9',  'Leroy Sané',         10, 'FWD', 94, 84, 78, 82, 32, 92, 78, 76),
  p('bay-10', 'Harry Kane',         9,  'FWD', 78, 86, 80, 94, 34, 76, 82, 92),
  p('bay-11', 'Serge Gnabry',       7,  'FWD', 88, 82, 72, 82, 30, 88, 74, 78),
];
const bayernBench: Player[] = [
  p('bay-b1', 'Sven Ulreich',       26, 'GK',  33, 72, 54, 10, 14, 16, 58, 80),
  p('bay-b2', 'Eric Dier',          4,  'DEF', 64, 84, 66, 34, 88, 50, 58, 86),
  p('bay-b3', 'Konrad Laimer',      27, 'DEF', 84, 88, 70, 34, 82, 72, 60, 74),
  p('bay-b4', 'Thomas Müller',      25, 'MID', 66, 84, 84, 70, 48, 70, 90, 84),
  p('bay-b5', 'Raphael Guerreiro',  22, 'MID', 80, 84, 78, 54, 64, 78, 76, 72),
  p('bay-b6', 'Kingsley Coman',     11, 'FWD', 92, 80, 72, 76, 28, 90, 72, 70),
  p('bay-b7', 'Mathys Tel',         39, 'FWD', 86, 78, 64, 76, 26, 84, 68, 72),
];

// =========================================================================
// BAYER LEVERKUSEN (OVR 82)
// =========================================================================
const leverkusenXI: Player[] = [
  p('b04-1',  'Lukáš Hrádecký',    1,  'GK',  35, 76, 58, 10, 16, 18, 64, 88),
  p('b04-2',  'Edmond Tapsoba',    5,  'DEF', 72, 84, 66, 30, 88, 58, 60, 88),
  p('b04-3',  'Jonathan Tah',      4,  'DEF', 70, 84, 70, 32, 88, 52, 62, 88),
  p('b04-4',  'Piero Hincapié',    3,  'DEF', 74, 82, 64, 26, 84, 62, 56, 84),
  p('b04-5',  'Alejandro Grimaldo', 12, 'DEF', 82, 84, 76, 36, 76, 76, 68, 78),
  p('b04-6',  'Granit Xhaka',      34, 'MID', 62, 86, 86, 54, 76, 64, 86, 80),
  p('b04-7',  'Robert Andrich',    8,  'MID', 66, 88, 76, 52, 80, 62, 74, 76),
  p('b04-8',  'Florian Wirtz',     10, 'MID', 74, 84, 92, 74, 44, 92, 92, 78),
  p('b04-9',  'Jeremie Frimpong',  30, 'FWD', 90, 84, 70, 72, 30, 84, 66, 72),
  p('b04-10', 'Victor Boniface',   9,  'FWD', 82, 82, 68, 84, 30, 80, 68, 80),
  p('b04-11', 'Jonas Hofmann',     7,  'FWD', 80, 84, 74, 74, 36, 78, 74, 72),
];
const leverkusenBench: Player[] = [
  p('b04-b1', 'Matej Kovař',       15, 'GK',  34, 70, 54, 10, 14, 18, 58, 80),
  p('b04-b2', 'Odilon Kossounou',  2,  'DEF', 76, 82, 60, 28, 86, 54, 52, 82),
  p('b04-b3', 'Arthur Augusto',    23, 'DEF', 68, 78, 60, 24, 78, 60, 54, 76),
  p('b04-b4', 'Exequiel Palacios', 25, 'MID', 64, 84, 76, 48, 72, 64, 76, 70),
  p('b04-b5', 'Amine Adli',        18, 'MID', 74, 80, 70, 60, 36, 78, 72, 64),
  p('b04-b6', 'Patrik Schick',     14, 'FWD', 72, 78, 62, 84, 22, 64, 60, 80),
  p('b04-b7', 'Martin Terrier',    11, 'FWD', 78, 80, 66, 72, 28, 76, 66, 68),
];

// =========================================================================
// BORUSSIA DORTMUND (OVR 80)
// =========================================================================
const dortmundXI: Player[] = [
  p('bvb-1',  'Gregor Kobel',       1,  'GK',  35, 74, 56, 10, 16, 18, 62, 86),
  p('bvb-2',  'Julian Ryerson',     2,  'DEF', 76, 82, 64, 28, 82, 64, 56, 80),
  p('bvb-3',  'Niklas Süle',        25, 'DEF', 66, 84, 64, 34, 86, 48, 56, 84),
  p('bvb-4',  'Nico Schlotterbeck', 4,  'DEF', 68, 84, 66, 30, 88, 50, 58, 86),
  p('bvb-5',  'Ramy Bensebaini',    16, 'DEF', 74, 80, 64, 28, 80, 62, 54, 78),
  p('bvb-6',  'Julian Brandt',      19, 'MID', 72, 82, 86, 60, 48, 80, 86, 74),
  p('bvb-7',  'Emre Can',           23, 'MID', 68, 86, 74, 50, 82, 60, 68, 78),
  p('bvb-8',  'Marcel Sabitzer',    20, 'MID', 70, 84, 80, 58, 64, 72, 80, 72),
  p('bvb-9',  'Karim Adeyemi',      27, 'FWD', 88, 80, 68, 78, 28, 82, 68, 72),
  p('bvb-10', 'Serhou Guirassy',    9,  'FWD', 82, 82, 68, 86, 26, 72, 66, 80),
  p('bvb-11', 'Donyell Malen',      21, 'FWD', 86, 80, 66, 78, 24, 82, 66, 72),
];
const dortmundBench: Player[] = [
  p('bvb-b1', 'Alexander Meyer',   35, 'GK',  33, 70, 50, 8,  12, 14, 52, 78),
  p('bvb-b2', 'Yan Couto',         3,  'DEF', 78, 80, 66, 28, 76, 70, 58, 72),
  p('bvb-b3', 'Nico Schlotterbeck',34, 'DEF', 62, 78, 58, 26, 80, 46, 52, 78),
  p('bvb-b4', 'Felix Nmecha',      8,  'MID', 70, 82, 72, 52, 66, 68, 70, 68),
  p('bvb-b5', 'Jamie Bynoe-Gittens',43,'MID', 84, 76, 62, 58, 30, 82, 60, 58),
  p('bvb-b6', 'Maximilian Beier',  17, 'FWD', 82, 78, 62, 74, 24, 74, 60, 68),
  p('bvb-b7', 'Giovanni Reyna',    7,  'FWD', 74, 74, 74, 62, 28, 80, 74, 60),
];

// =========================================================================
// RB LEIPZIG (OVR 79)
// =========================================================================
const leipzigXI: Player[] = [
  p('rbl-1',  'Péter Gulácsi',      1,  'GK',  35, 74, 56, 10, 16, 18, 62, 86),
  p('rbl-2',  'Mohamed Simakan',    5,  'DEF', 74, 82, 64, 28, 84, 60, 58, 82),
  p('rbl-3',  'Willi Orban',        4,  'DEF', 64, 82, 64, 34, 84, 46, 58, 82),
  p('rbl-4',  'Lutsharel Geertruida',19,'DEF', 76, 80, 66, 28, 82, 62, 58, 80),
  p('rbl-5',  'David Raum',         3,  'DEF', 80, 82, 68, 28, 78, 68, 60, 76),
  p('rbl-6',  'Nicolas Seiwald',    30, 'MID', 68, 86, 76, 46, 78, 62, 72, 74),
  p('rbl-7',  'Kevin Kampl',        44, 'MID', 60, 82, 82, 50, 64, 68, 82, 72),
  p('rbl-8',  'Xavi Simons',        10, 'MID', 74, 82, 88, 70, 44, 86, 86, 72),
  p('rbl-9',  'Lois Openda',        11, 'FWD', 88, 82, 68, 84, 26, 80, 64, 78),
  p('rbl-10', 'Benjamin Šeško',     9,  'FWD', 82, 80, 62, 82, 24, 72, 62, 76),
  p('rbl-11', 'Antonio Nusa',       7,  'FWD', 86, 78, 68, 70, 24, 84, 66, 68),
];
const leipzigBench: Player[] = [
  p('rbl-b1', 'Janis Blaswich',     12, 'GK',  33, 70, 50, 8,  12, 14, 54, 78),
  p('rbl-b2', 'Lukas Klostermann',  6,  'DEF', 70, 80, 60, 26, 80, 56, 52, 78),
  p('rbl-b3', 'Castello Lukeba',    23, 'DEF', 72, 80, 62, 26, 84, 54, 54, 80),
  p('rbl-b4', 'Christoph Baumgartner',18,'MID',66, 80, 78, 58, 48, 72, 76, 68),
  p('rbl-b5', 'Amadou Haidara',     40, 'MID', 70, 84, 72, 46, 76, 66, 66, 70),
  p('rbl-b6', 'Yussuf Poulsen',     20, 'FWD', 76, 80, 58, 74, 24, 62, 52, 72),
  p('rbl-b7', 'Fabio Carvalho',     17, 'FWD', 72, 76, 70, 62, 28, 74, 70, 62),
];

// =========================================================================
// EINTRACHT FRANKFURT (OVR 76)
// =========================================================================
const frankfurtXI: Player[] = [
  p('sge-1',  'Kevin Trapp',        1,  'GK',  34, 74, 54, 10, 14, 18, 60, 84),
  p('sge-2',  'Tuta',               3,  'DEF', 74, 82, 62, 28, 82, 58, 56, 80),
  p('sge-3',  'Robin Koch',         4,  'DEF', 66, 80, 64, 30, 82, 48, 58, 80),
  p('sge-4',  'Nnamdi Collins',     27, 'DEF', 72, 80, 62, 26, 80, 54, 54, 78),
  p('sge-5',  'Rasmus Kristensen',  2,  'DEF', 74, 82, 64, 26, 76, 62, 56, 74),
  p('sge-6',  'Oscar Højlund',      8,  'MID', 66, 82, 74, 50, 68, 64, 72, 70),
  p('sge-7',  'Mario Götze',        10, 'MID', 60, 80, 86, 60, 44, 76, 88, 72),
  p('sge-8',  'Hugo Larsson',       17, 'MID', 70, 82, 76, 52, 62, 70, 74, 68),
  p('sge-9',  'Farés Chaïbi',       18, 'FWD', 76, 78, 72, 68, 30, 78, 72, 64),
  p('sge-10', 'Hugo Ekitiké',       9,  'FWD', 82, 80, 64, 80, 22, 78, 62, 74),
  p('sge-11', 'Ansgar Knauff',      28, 'FWD', 84, 80, 64, 68, 28, 80, 64, 64),
];
const frankfurtBench: Player[] = [
  p('sge-b1', 'Diant Ramaj',        21, 'GK',  33, 68, 46, 8,  12, 14, 50, 74),
  p('sge-b2', 'Arthur Theate',      5,  'DEF', 70, 78, 60, 26, 80, 52, 52, 76),
  p('sge-b3', 'Junior Dina Ebimbe', 22, 'DEF', 76, 80, 62, 28, 72, 68, 58, 68),
  p('sge-b4', 'Ellyes Skhiri',      6,  'MID', 58, 82, 68, 40, 78, 50, 62, 70),
  p('sge-b5', 'Nathaniel Brown',    25, 'MID', 64, 76, 66, 44, 56, 64, 64, 60),
  p('sge-b6', 'Can Uzun',           14, 'FWD', 78, 76, 64, 70, 24, 76, 64, 62),
  p('sge-b7', 'Omar Marmoush',      7,  'FWD', 84, 78, 68, 78, 26, 80, 68, 68),
];

// =========================================================================
// VfB STUTTGART (OVR 76)
// =========================================================================
const stuttgartXI: Player[] = [
  p('vfb-1',  'Alexander Nübel',    1,  'GK',  35, 74, 56, 10, 14, 18, 60, 84),
  p('vfb-2',  'Joël Vagnoman',      27, 'DEF', 78, 82, 64, 28, 78, 66, 58, 76),
  p('vfb-3',  'Jeff Chabot',        5,  'DEF', 70, 80, 62, 30, 82, 50, 54, 80),
  p('vfb-4',  'Dan-Axel Zagadou',   4,  'DEF', 68, 78, 60, 28, 82, 50, 52, 80),
  p('vfb-5',  'Maximilian Mittelstädt',16,'DEF',80, 84, 68, 28, 74, 72, 60, 72),
  p('vfb-6',  'Angelo Stiller',     28, 'MID', 62, 84, 82, 50, 70, 66, 80, 72),
  p('vfb-7',  'Atakan Karazor',     8,  'MID', 58, 86, 74, 42, 80, 54, 68, 76),
  p('vfb-8',  'Enzo Millot',        14, 'MID', 72, 80, 76, 60, 46, 74, 76, 66),
  p('vfb-9',  'Chris Führich',      11, 'FWD', 82, 82, 68, 68, 30, 78, 66, 66),
  p('vfb-10', 'Ermedin Demirović',  9,  'FWD', 78, 80, 62, 80, 24, 70, 60, 76),
  p('vfb-11', 'Nick Woltemade',     7,  'FWD', 82, 78, 62, 74, 24, 72, 62, 70),
];
const stuttgartBench: Player[] = [
  p('vfb-b1', 'Fabian Bredlow',     23, 'GK',  33, 68, 46, 8,  12, 14, 50, 72),
  p('vfb-b2', 'Anthony Rouault',    3,  'DEF', 68, 78, 58, 26, 80, 48, 52, 76),
  p('vfb-b3', 'Leonidas Stergiou',  22, 'DEF', 70, 78, 58, 24, 76, 56, 50, 72),
  p('vfb-b4', 'Yannik Keitel',      6,  'MID', 56, 78, 70, 40, 68, 52, 66, 64),
  p('vfb-b5', 'Jamie Leweling',     17, 'MID', 80, 78, 60, 56, 32, 78, 56, 56),
  p('vfb-b6', 'Deniz Undav',        29, 'FWD', 76, 78, 66, 76, 26, 72, 64, 70),
  p('vfb-b7', 'El Bilal Touré',     19, 'FWD', 84, 76, 56, 72, 22, 72, 54, 66),
];

// =========================================================================
// VfL WOLFSBURG (OVR 74)
// =========================================================================
const wolfsburgXI: Player[] = [
  p('wob-1',  'Kamil Grabara',      1,  'GK',  34, 72, 52, 10, 14, 16, 56, 80),
  p('wob-2',  'Kilian Fischer',     5,  'DEF', 66, 78, 60, 26, 78, 52, 52, 76),
  p('wob-3',  'Maxence Lacroix',    4,  'DEF', 70, 80, 62, 26, 80, 48, 52, 78),
  p('wob-4',  'Paulo Otávio',       16, 'DEF', 68, 80, 60, 24, 76, 58, 52, 74),
  p('wob-5',  'Ridle Baku',         2,  'DEF', 78, 80, 64, 28, 72, 68, 56, 70),
  p('wob-6',  'Mattias Svanberg',   8,  'MID', 62, 84, 72, 46, 68, 60, 70, 68),
  p('wob-7',  'Maximilian Arnold',  27, 'MID', 56, 80, 78, 48, 68, 54, 78, 70),
  p('wob-8',  'Patrick Wimmer',     6,  'MID', 74, 78, 70, 56, 42, 72, 68, 62),
  p('wob-9',  'Mohammed Amoura',    11, 'FWD', 84, 78, 64, 74, 26, 78, 62, 66),
  p('wob-10', 'Jonas Wind',         9,  'FWD', 76, 78, 60, 76, 22, 68, 56, 72),
  p('wob-11', 'Tiago Tomás',        7,  'FWD', 80, 76, 60, 70, 22, 74, 58, 66),
];
const wolfsburgBench: Player[] = [
  p('wob-b1', 'Diant Ramaj',        20, 'GK',  33, 68, 44, 8,  10, 14, 48, 72),
  p('wob-b2', 'Micky van de Ven',   3,  'DEF', 80, 78, 60, 26, 78, 58, 50, 74),
  p('wob-b3', 'Joakim Maehle',      15, 'DEF', 76, 78, 62, 22, 72, 64, 52, 68),
  p('wob-b4', 'Yannick Gerhardt',   14, 'MID', 58, 82, 66, 40, 68, 50, 62, 66),
  p('wob-b5', 'Kevin Paredes',      19, 'MID', 78, 76, 60, 52, 32, 74, 56, 56),
  p('wob-b6', 'Lovro Majer',        10, 'FWD', 68, 76, 74, 60, 30, 72, 72, 60),
  p('wob-b7', 'Jakub Kaminski',     17, 'FWD', 76, 74, 60, 64, 24, 72, 58, 60),
];

// =========================================================================
// BORUSSIA MÖNCHENGLADBACH (OVR 73)
// =========================================================================
const gladbachXI: Player[] = [
  p('bmg-1',  'Moritz Nicolas',     1,  'GK',  33, 70, 50, 10, 12, 14, 54, 80),
  p('bmg-2',  'Joseph Scally',      25, 'DEF', 72, 78, 60, 24, 76, 60, 52, 72),
  p('bmg-3',  'Nico Elvedi',        5,  'DEF', 62, 78, 62, 28, 80, 44, 54, 78),
  p('bmg-4',  'Marvin Friedrich',   4,  'DEF', 64, 80, 58, 26, 80, 46, 50, 76),
  p('bmg-5',  'Ramy Bensebaini',    14, 'DEF', 72, 78, 62, 26, 76, 60, 52, 72),
  p('bmg-6',  'Julian Weigl',       8,  'MID', 52, 82, 80, 42, 68, 52, 78, 70),
  p('bmg-7',  'Florian Neuhaus',    10, 'MID', 62, 80, 78, 52, 54, 64, 76, 68),
  p('bmg-8',  'Rocco Reitz',        27, 'MID', 64, 80, 72, 48, 62, 64, 70, 64),
  p('bmg-9',  'Franck Honorat',     11, 'FWD', 82, 78, 60, 68, 26, 76, 58, 62),
  p('bmg-10', 'Tim Kleindienst',    9,  'FWD', 74, 78, 58, 76, 22, 66, 54, 70),
  p('bmg-11', 'Ko Itakura',         6,  'FWD', 70, 76, 60, 64, 30, 68, 58, 64),
];
const gladbachBench: Player[] = [
  p('bmg-b1', 'Jonas Omlin',        35, 'GK',  33, 68, 46, 8,  12, 14, 48, 74),
  p('bmg-b2', 'Jordan',             2,  'DEF', 60, 74, 54, 22, 74, 50, 46, 70),
  p('bmg-b3', 'Luca Netz',          29, 'DEF', 74, 76, 58, 22, 68, 64, 50, 64),
  p('bmg-b4', 'Tomas Cvancara',     22, 'MID', 68, 76, 58, 56, 26, 64, 52, 60),
  p('bmg-b5', 'Nathan Ngoumou',     20, 'MID', 82, 74, 52, 54, 24, 76, 48, 52),
  p('bmg-b6', 'Alassane Plea',      24, 'FWD', 72, 74, 58, 68, 24, 70, 56, 62),
  p('bmg-b7', 'Robin Hack',         18, 'FWD', 80, 74, 56, 64, 22, 74, 52, 60),
];

// =========================================================================
// SC FREIBURG (OVR 73)
// =========================================================================
const freiburgXI: Player[] = [
  p('scf-1',  'Noah Atubolu',       1,  'GK',  33, 72, 52, 10, 12, 14, 56, 80),
  p('scf-2',  'Lukas Kübler',       5,  'DEF', 70, 80, 60, 24, 78, 60, 52, 74),
  p('scf-3',  'Matthias Ginter',    28, 'DEF', 60, 80, 66, 28, 80, 46, 58, 78),
  p('scf-4',  'Philipp Lienhart',   4,  'DEF', 64, 78, 60, 26, 78, 48, 52, 76),
  p('scf-5',  'Christian Günter',   14, 'DEF', 72, 82, 64, 24, 74, 62, 54, 70),
  p('scf-6',  'Maximilian Eggestein',6,  'MID', 58, 82, 74, 46, 66, 56, 72, 68),
  p('scf-7',  'Lucas Höler',        9,  'MID', 64, 84, 68, 52, 60, 60, 64, 66),
  p('scf-8',  'Vincenzo Grifo',     32, 'MID', 60, 78, 76, 60, 38, 68, 76, 62),
  p('scf-9',  'Roland Sallai',      22, 'FWD', 78, 78, 66, 68, 28, 76, 62, 64),
  p('scf-10', 'Ritsu Doan',         10, 'FWD', 78, 78, 68, 70, 28, 76, 68, 64),
  p('scf-11', 'Michael Gregoritsch',18, 'FWD', 72, 78, 58, 74, 22, 64, 56, 70),
];
const freiburgBench: Player[] = [
  p('scf-b1', 'Mark Flekken',       18, 'GK',  34, 70, 50, 8,  12, 14, 52, 76),
  p('scf-b2', 'Kiliann Sildillia',  2,  'DEF', 72, 76, 56, 22, 72, 60, 46, 68),
  p('scf-b3', 'Nico Schlotterbeck', 31, 'DEF', 62, 76, 58, 24, 76, 46, 50, 72),
  p('scf-b4', 'Yannik Keitel',      35, 'MID', 54, 78, 66, 36, 66, 50, 62, 62),
  p('scf-b5', 'Luca Waldschmidt',   11, 'MID', 72, 74, 66, 60, 28, 70, 62, 58),
  p('scf-b6', 'Junior Adamu',       17, 'FWD', 80, 74, 52, 64, 20, 70, 48, 58),
  p('scf-b7', 'Eren Dinkci',        21, 'FWD', 76, 72, 54, 62, 22, 72, 52, 58),
];

// =========================================================================
// TSG HOFFENHEIM (OVR 72)
// =========================================================================
const hoffenheimXI: Player[] = [
  p('tsg-1',  'Oliver Baumann',     1,  'GK',  33, 70, 50, 8,  12, 14, 56, 80),
  p('tsg-2',  'Stanley Nsoki',      3,  'DEF', 66, 76, 58, 22, 74, 54, 48, 72),
  p('tsg-3',  'Kevin Vogt',         5,  'DEF', 58, 76, 60, 26, 76, 40, 52, 74),
  p('tsg-4',  'Pavel Kadeřábek',    24, 'DEF', 70, 78, 60, 22, 72, 60, 48, 68),
  p('tsg-5',  'David Jurasek',      16, 'DEF', 72, 76, 58, 22, 70, 62, 48, 66),
  p('tsg-6',  'Grischa Prömel',     8,  'MID', 60, 80, 70, 44, 66, 54, 66, 66),
  p('tsg-7',  'Tom Bischof',        21, 'MID', 62, 78, 74, 48, 52, 64, 72, 62),
  p('tsg-8',  'Maximilian Beier',   11, 'MID', 80, 78, 64, 60, 36, 76, 62, 60),
  p('tsg-9',  'Marius Bülter',      22, 'FWD', 76, 78, 60, 70, 24, 70, 56, 64),
  p('tsg-10', 'Andrej Kramarić',    27, 'FWD', 70, 76, 62, 76, 20, 68, 60, 70),
  p('tsg-11', 'Mergim Berisha',     14, 'FWD', 74, 76, 58, 72, 20, 68, 54, 66),
];
const hoffenheimBench: Player[] = [
  p('tsg-b1', 'Luca Philipp',       30, 'GK',  31, 66, 42, 8,  10, 12, 46, 70),
  p('tsg-b2', 'John Anthony Brooks',4,  'DEF', 54, 74, 56, 26, 74, 36, 48, 72),
  p('tsg-b3', 'Angelo Stiller',     19, 'DEF', 64, 76, 58, 22, 70, 54, 50, 66),
  p('tsg-b4', 'Dennis Geiger',      6,  'MID', 54, 76, 68, 40, 58, 52, 68, 60),
  p('tsg-b5', 'Florian Grillitsch', 18, 'MID', 50, 78, 70, 36, 60, 50, 70, 62),
  p('tsg-b6', 'Ihlas Bebou',        15, 'FWD', 82, 74, 52, 62, 20, 72, 46, 56),
  p('tsg-b7', 'Umut Tohumcu',       33, 'FWD', 72, 72, 54, 64, 18, 68, 50, 60),
];

// =========================================================================
// WERDER BREMEN (OVR 71)
// =========================================================================
const bremenXI: Player[] = [
  p('svw-1',  'Michael Zetterer',   1,  'GK',  33, 70, 50, 8,  12, 14, 54, 80),
  p('svw-2',  'Marco Friedl',       32, 'DEF', 68, 78, 60, 24, 74, 58, 52, 70),
  p('svw-3',  'Niklas Stark',       5,  'DEF', 62, 78, 58, 26, 76, 44, 50, 72),
  p('svw-4',  'Milos Veljković',    4,  'DEF', 60, 76, 56, 24, 76, 42, 48, 72),
  p('svw-5',  'Amos Pieper',        28, 'DEF', 62, 76, 56, 22, 74, 46, 46, 70),
  p('svw-6',  'Dawid Kownacki',     8,  'MID', 68, 78, 68, 54, 46, 64, 64, 62),
  p('svw-7',  'Romano Schmid',      11, 'MID', 66, 80, 72, 50, 52, 66, 70, 62),
  p('svw-8',  'Christian Stage',    27, 'MID', 64, 80, 68, 46, 60, 60, 66, 62),
  p('svw-9',  'Jens Stage',         20, 'FWD', 72, 78, 60, 66, 26, 66, 58, 62),
  p('svw-10', 'Marvin Ducksch',     9,  'FWD', 74, 76, 58, 74, 20, 68, 56, 68),
  p('svw-11', 'Olivier Deman',      29, 'FWD', 78, 74, 56, 62, 22, 72, 52, 58),
];
const bremenBench: Player[] = [
  p('svw-b1', 'Stefanos Kapino',    33, 'GK',  31, 66, 42, 8,  10, 12, 46, 70),
  p('svw-b2', 'Mitchell Weiser',    2,  'DEF', 72, 76, 60, 22, 70, 60, 48, 66),
  p('svw-b3', 'Augustinsson',       22, 'DEF', 70, 76, 58, 20, 68, 60, 46, 64),
  p('svw-b4', 'Florian Grillitsch', 21, 'MID', 50, 76, 68, 36, 58, 48, 68, 60),
  p('svw-b5', 'Senne Lynen',        25, 'MID', 60, 76, 62, 40, 58, 58, 60, 58),
  p('svw-b6', 'Justin Njinmah',     13, 'FWD', 80, 72, 52, 60, 18, 72, 46, 54),
  p('svw-b7', 'Eren Dinkci',        7,  'FWD', 74, 70, 52, 60, 18, 68, 48, 56),
];

// =========================================================================
// FC AUGSBURG (OVR 70)
// =========================================================================
const augsburgXI: Player[] = [
  p('fca-1',  'Finn Dahmen',        1,  'GK',  32, 70, 48, 8,  12, 14, 52, 78),
  p('fca-2',  'Maximilian Bauer',   5,  'DEF', 64, 76, 56, 22, 74, 50, 46, 70),
  p('fca-3',  'Jeffrey Gouweleeuw', 4,  'DEF', 56, 76, 58, 26, 74, 38, 48, 72),
  p('fca-4',  'Mads Pedersen',      15, 'DEF', 72, 78, 60, 22, 72, 60, 48, 66),
  p('fca-5',  'Iago',               19, 'DEF', 68, 76, 58, 22, 70, 58, 46, 66),
  p('fca-6',  'Elvis Rexhbecaj',    8,  'MID', 58, 78, 66, 42, 62, 54, 62, 62),
  p('fca-7',  'Fredrik Jensen',     11, 'MID', 64, 78, 68, 46, 48, 62, 66, 60),
  p('fca-8',  'Arne Engels',        27, 'MID', 62, 76, 68, 46, 46, 60, 66, 58),
  p('fca-9',  'Alexis Claude-Maurice',7,'FWD', 78, 74, 60, 64, 22, 72, 58, 58),
  p('fca-10', 'Ermedin Demirović',  17, 'FWD', 76, 76, 56, 72, 20, 66, 52, 66),
  p('fca-11', 'Phillip Tietz',      9,  'FWD', 70, 74, 50, 70, 18, 60, 46, 64),
];
const augsburgBench: Player[] = [
  p('fca-b1', 'Tomas Koubek',       21, 'GK',  31, 66, 40, 8,  10, 12, 44, 68),
  p('fca-b2', 'Raphael Framberger', 18, 'DEF', 66, 74, 52, 20, 68, 54, 42, 62),
  p('fca-b3', 'Robert Gumny',       20, 'DEF', 68, 72, 52, 20, 66, 56, 42, 62),
  p('fca-b4', 'Niklas Dorsch',      6,  'MID', 52, 76, 64, 36, 60, 46, 60, 58),
  p('fca-b5', 'Tim Civeja',         22, 'MID', 58, 74, 60, 38, 50, 54, 56, 54),
  p('fca-b6', 'Samuel Essende',     29, 'FWD', 72, 72, 46, 64, 18, 60, 40, 58),
  p('fca-b7', 'Elvis Kamsoba',      14, 'FWD', 80, 70, 50, 56, 18, 72, 44, 50),
];

// =========================================================================
// MAINZ 05 (OVR 70)
// =========================================================================
const mainzXI: Player[] = [
  p('m05-1',  'Robin Zentner',      1,  'GK',  33, 70, 50, 8,  12, 14, 54, 78),
  p('m05-2',  'Stefan Bell',        5,  'DEF', 56, 76, 56, 28, 74, 38, 48, 72),
  p('m05-3',  'Andreas Hanche-Olsen',4,'DEF', 60, 76, 58, 24, 74, 42, 48, 70),
  p('m05-4',  'Silvan Widmer',      28, 'DEF', 74, 78, 62, 24, 72, 62, 50, 68),
  p('m05-5',  'Phillipp Mwene',     18, 'DEF', 70, 76, 56, 22, 70, 58, 46, 64),
  p('m05-6',  'Leandro Barreiro',   8,  'MID', 58, 80, 68, 44, 64, 56, 64, 62),
  p('m05-7',  'Dominik Kohr',       6,  'MID', 52, 80, 66, 36, 70, 46, 62, 64),
  p('m05-8',  'Maxim Leitsch',      27, 'MID', 60, 78, 64, 40, 62, 54, 60, 60),
  p('m05-9',  'Karim Onisiwo',      14, 'FWD', 76, 78, 58, 64, 24, 66, 54, 60),
  p('m05-10', 'Jonathan Burkardt',  9,  'FWD', 72, 76, 56, 72, 20, 64, 52, 66),
  p('m05-11', 'Paul Nebel',         23, 'FWD', 72, 74, 60, 64, 22, 68, 58, 58),
];
const mainzBench: Player[] = [
  p('m05-b1', 'Finn Dahmen',        31, 'GK',  31, 64, 40, 8,  10, 12, 44, 68),
  p('m05-b2', 'Aaron Martin',       2,  'DEF', 72, 74, 56, 22, 68, 60, 44, 62),
  p('m05-b3', 'Alexander Hack',     3,  'DEF', 54, 72, 50, 24, 70, 36, 44, 68),
  p('m05-b4', 'Anton Stach',        11, 'MID', 56, 78, 66, 38, 58, 52, 64, 58),
  p('m05-b5', 'Kaishu Sano',        25, 'MID', 60, 76, 62, 36, 58, 56, 58, 56),
  p('m05-b6', 'Jae-sung Lee',       7,  'FWD', 68, 74, 64, 62, 24, 68, 60, 58),
  p('m05-b7', 'Nelson Weiper',      21, 'FWD', 72, 70, 48, 64, 16, 62, 44, 58),
];

// =========================================================================
// UNION BERLIN (OVR 69)
// =========================================================================
const unionBerlinXI: Player[] = [
  p('fcu-1',  'Frederik Rönnow',    1,  'GK',  32, 70, 48, 8,  12, 14, 50, 76),
  p('fcu-2',  'Christopher Trimmel',29, 'DEF', 68, 76, 58, 22, 72, 58, 48, 66),
  p('fcu-3',  'Danilho Doekhi',     4,  'DEF', 62, 76, 56, 24, 74, 46, 46, 70),
  p('fcu-4',  'Robin Knoche',       31, 'DEF', 56, 74, 54, 26, 72, 38, 46, 70),
  p('fcu-5',  'Niko Gießelmann',    14, 'DEF', 66, 74, 56, 20, 68, 54, 44, 62),
  p('fcu-6',  'Rani Khedira',       8,  'MID', 54, 80, 64, 36, 66, 46, 58, 64),
  p('fcu-7',  'Janik Haberer',      16, 'MID', 60, 78, 68, 44, 52, 58, 66, 60),
  p('fcu-8',  'Kevin Volland',      21, 'MID', 66, 76, 68, 56, 38, 64, 64, 60),
  p('fcu-9',  'Sheraldo Becker',    11, 'FWD', 82, 76, 56, 66, 22, 74, 52, 60),
  p('fcu-10', 'Jordan Siebatcheu',  9,  'FWD', 68, 74, 50, 68, 18, 58, 44, 64),
  p('fcu-11', 'Benedict Hollerbach',7,  'FWD', 76, 74, 52, 60, 20, 68, 48, 56),
];
const unionBerlinBench: Player[] = [
  p('fcu-b1', 'Lennart Grill',      33, 'GK',  31, 64, 40, 8,  10, 12, 42, 66),
  p('fcu-b2', 'Paul Jaeckel',       5,  'DEF', 56, 72, 50, 22, 70, 38, 40, 64),
  p('fcu-b3', 'Josip Juranović',    2,  'DEF', 70, 72, 54, 20, 66, 58, 42, 60),
  p('fcu-b4', 'Miro Muheim',        25, 'MID', 62, 72, 58, 34, 54, 52, 52, 54),
  p('fcu-b5', 'Andreu Fontas',      15, 'MID', 48, 72, 54, 28, 62, 36, 48, 60),
  p('fcu-b6', 'Sven Michel',        13, 'FWD', 68, 70, 52, 62, 18, 60, 46, 56),
  p('fcu-b7', 'Tim Skarke',         19, 'FWD', 72, 70, 52, 56, 18, 66, 46, 50),
];

// =========================================================================
// VfL BOCHUM (OVR 68)
// =========================================================================
const bochumXI: Player[] = [
  p('boc-1',  'Patrick Drewes',     1,  'GK',  32, 68, 44, 8,  12, 12, 48, 74),
  p('boc-2',  'Erhan Mašović',      5,  'DEF', 60, 72, 52, 20, 68, 46, 40, 66),
  p('boc-3',  'Ivan Ordets',        4,  'DEF', 58, 72, 50, 22, 68, 40, 40, 64),
  p('boc-4',  'Bernardo',           15, 'DEF', 64, 72, 52, 20, 66, 50, 40, 62),
  p('boc-5',  'Lukas Daschner',     27, 'DEF', 68, 72, 54, 20, 64, 56, 42, 60),
  p('boc-6',  'Kevin Stöger',       8,  'MID', 56, 74, 66, 40, 56, 50, 64, 58),
  p('boc-7',  'Philipp Hofmann',    11, 'MID', 58, 74, 60, 42, 54, 50, 58, 58),
  p('boc-8',  'Moritz Broschinski', 19, 'MID', 64, 72, 60, 44, 44, 60, 58, 54),
  p('boc-9',  'Takuma Asano',       14, 'FWD', 80, 72, 52, 62, 18, 70, 46, 54),
  p('boc-10', 'Myron Boadu',        9,  'FWD', 74, 70, 50, 64, 16, 64, 44, 58),
  p('boc-11', 'Christopher Antwi-Adjei',18,'FWD',76, 70, 50, 60, 18, 66, 46, 52),
];
const bochumBench: Player[] = [
  p('boc-b1', 'Michael Esser',      33, 'GK',  30, 62, 38, 8,  10, 10, 42, 66),
  p('boc-b2', 'Cristian Gamboa',    22, 'DEF', 62, 68, 46, 18, 62, 50, 36, 58),
  p('boc-b3', 'Keven Schlotterbeck',29, 'DEF', 58, 70, 46, 20, 64, 38, 38, 60),
  p('boc-b4', 'Anthony Losilla',    6,  'MID', 46, 74, 58, 30, 60, 36, 52, 56),
  p('boc-b5', 'Gregor Kobel',       28, 'MID', 54, 68, 56, 34, 46, 48, 52, 50),
  p('boc-b6', 'Simon Zoller',       7,  'FWD', 66, 68, 50, 58, 16, 60, 42, 52),
  p('boc-b7', 'Philipp Förster',    10, 'FWD', 60, 68, 56, 52, 20, 56, 50, 50),
];

// =========================================================================
// FC ST. PAULI (OVR 67)
// =========================================================================
const stPauliXI: Player[] = [
  p('stp-1',  'Sascha Burchert',    1,  'GK',  31, 66, 42, 8,  10, 12, 46, 72),
  p('stp-2',  'Manolis Saliakas',   22, 'DEF', 60, 70, 52, 18, 64, 50, 38, 62),
  p('stp-3',  'Jakov Medić',        5,  'DEF', 58, 70, 50, 20, 64, 40, 38, 62),
  p('stp-4',  'Eric Smith',         4,  'DEF', 56, 70, 54, 20, 62, 38, 42, 60),
  p('stp-5',  'Karol Mets',         3,  'DEF', 54, 68, 48, 20, 62, 34, 38, 60),
  p('stp-6',  'Johannes Eggestein', 8,  'MID', 56, 72, 62, 40, 54, 50, 60, 56),
  p('stp-7',  'Philipp Treu',       17, 'MID', 60, 72, 60, 38, 50, 54, 58, 54),
  p('stp-8',  'Oladapo Afolabi',    27, 'MID', 66, 70, 56, 40, 42, 58, 54, 50),
  p('stp-9',  'Morgan Guilavogui',  11, 'FWD', 72, 70, 50, 62, 16, 62, 44, 54),
  p('stp-10', 'Elias Saad',         9,  'FWD', 74, 68, 48, 60, 14, 66, 42, 52),
  p('stp-11', 'Iván Prtajin',       7,  'FWD', 68, 68, 48, 62, 16, 58, 44, 56),
];
const stPauliBench: Player[] = [
  p('stp-b1', 'Dennis Smarsch',     30, 'GK',  30, 62, 36, 8,  10, 10, 40, 64),
  p('stp-b2', 'Lars Ritzka',        15, 'DEF', 58, 68, 44, 16, 60, 46, 34, 56),
  p('stp-b3', 'David Nemeth',       23, 'DEF', 56, 66, 44, 18, 60, 34, 36, 56),
  p('stp-b4', 'Connor Metcalfe',    18, 'MID', 56, 70, 58, 32, 48, 50, 54, 50),
  p('stp-b5', 'Carlo Boukhalfa',    21, 'MID', 54, 68, 56, 34, 44, 50, 52, 48),
  p('stp-b6', 'Maurides',           13, 'FWD', 66, 64, 44, 58, 12, 58, 38, 50),
  p('stp-b7', 'Leart Paqarada',     14, 'FWD', 70, 66, 50, 54, 16, 64, 44, 48),
];

// =========================================================================
// HOLSTEIN KIEL (OVR 66)
// =========================================================================
const kielXI: Player[] = [
  p('ksv-1',  'Thomas Dähne',       1,  'GK',  30, 64, 42, 6,  10, 10, 46, 72),
  p('ksv-2',  'Finn Porath',        11, 'DEF', 58, 68, 50, 18, 62, 44, 36, 60),
  p('ksv-3',  'Marco Komenda',      5,  'DEF', 54, 68, 48, 20, 62, 36, 36, 60),
  p('ksv-4',  'Timo Becker',        4,  'DEF', 56, 68, 48, 18, 62, 38, 36, 58),
  p('ksv-5',  'Timo Becker',        15, 'DEF', 60, 68, 48, 16, 60, 46, 36, 56),
  p('ksv-6',  'Lewis Holtby',       8,  'MID', 50, 68, 64, 34, 48, 48, 62, 54),
  p('ksv-7',  'Armin Gigovic',      16, 'MID', 54, 68, 60, 36, 42, 52, 58, 52),
  p('ksv-8',  'Fiete Arp',          9,  'MID', 62, 66, 58, 46, 30, 60, 54, 52),
  p('ksv-9',  'Shuto Machino',      17, 'FWD', 68, 66, 48, 62, 14, 60, 42, 52),
  p('ksv-10', 'Benedikt Pichler',   14, 'FWD', 66, 66, 48, 60, 14, 58, 42, 52),
  p('ksv-11', 'Phil Harres',        23, 'FWD', 70, 64, 46, 60, 14, 62, 40, 50),
];
const kielBench: Player[] = [
  p('ksv-b1', 'Timon Weiner',       21, 'GK',  29, 60, 36, 6,  8,  10, 38, 62),
  p('ksv-b2', 'Aleksandar Ignjovski',3, 'DEF', 54, 64, 44, 16, 58, 36, 32, 56),
  p('ksv-b3', 'Jannik Dehm',        2,  'DEF', 62, 64, 44, 14, 56, 50, 32, 52),
  p('ksv-b4', 'Max Geschwill',      20, 'MID', 48, 64, 56, 30, 40, 44, 52, 48),
  p('ksv-b5', 'Steve Mounié',       25, 'MID', 56, 64, 50, 38, 28, 52, 44, 46),
  p('ksv-b6', 'Pham Tien Linh',     19, 'FWD', 62, 62, 44, 56, 12, 58, 38, 46),
  p('ksv-b7', 'Kwasi Okyere Wriedt',7,  'FWD', 64, 62, 42, 60, 12, 56, 38, 48),
];

// =========================================================================
// FC HEIDENHEIM (OVR 66)
// =========================================================================
const heidenheimXI: Player[] = [
  p('fch-1',  'Kevin Müller',       1,  'GK',  30, 64, 42, 6,  10, 10, 46, 72),
  p('fch-2',  'Jan Schöppner',      5,  'DEF', 56, 68, 48, 18, 62, 40, 36, 60),
  p('fch-3',  'Patrick Mainka',     4,  'DEF', 54, 68, 46, 18, 62, 36, 36, 60),
  p('fch-4',  'Marnon Busch',       20, 'DEF', 66, 68, 50, 16, 60, 52, 36, 56),
  p('fch-5',  'Benedikt Gimber',    22, 'DEF', 58, 66, 48, 16, 60, 44, 36, 54),
  p('fch-6',  'Denis Thomalla',     8,  'MID', 52, 68, 62, 36, 46, 50, 60, 54),
  p('fch-7',  'Lennard Maloney',    16, 'MID', 56, 68, 62, 36, 44, 52, 60, 52),
  p('fch-8',  'Jonas Föhrenbach',   17, 'MID', 62, 66, 56, 38, 36, 58, 54, 50),
  p('fch-9',  'Jan-Niklas Beste',   11, 'FWD', 72, 66, 52, 62, 14, 64, 46, 54),
  p('fch-10', 'Marvin Pieringer',   9,  'FWD', 68, 64, 48, 60, 14, 60, 42, 52),
  p('fch-11', 'Tim Kleindienst',    14, 'FWD', 64, 64, 48, 62, 16, 56, 44, 54),
];
const heidenheimBench: Player[] = [
  p('fch-b1', 'Vitus Eicher',       33, 'GK',  29, 60, 36, 6,  8,  10, 38, 62),
  p('fch-b2', 'Valentin Gendrey',   2,  'DEF', 62, 64, 46, 14, 56, 50, 30, 52),
  p('fch-b3', 'Florian Pick',       7,  'DEF', 60, 64, 46, 16, 56, 46, 32, 52),
  p('fch-b4', 'Maximilian Breunig', 25, 'MID', 50, 66, 56, 30, 38, 46, 52, 48),
  p('fch-b5', 'Adrian Beck',        23, 'MID', 54, 64, 54, 32, 38, 48, 52, 46),
  p('fch-b6', 'Mathias Honsak',     19, 'FWD', 68, 62, 44, 56, 12, 60, 38, 46),
  p('fch-b7', 'Stefan Schimmer',    27, 'FWD', 60, 62, 42, 56, 12, 54, 38, 48),
];

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------
export const bundesliga: LeagueDefinition = {
  id: 'bundesliga',
  name: 'Bundesliga',
  country: 'Alemanha',
  cupName: 'DFB-Pokal',
  cupLogo: 'https://crests.football-data.org/DFB_CUP.png',
  flag: '🇩🇪',
  color: '#e32221',
  logo: 'https://r2.thesportsdb.com/images/media/league/badge/teqh1b1679952008.png',
  totalRounds: 34,
  teams: [
    makeFullTeam('bay', 'Bayern München',           'BAY', '#DC052D', '#0066B2', 'https://r2.thesportsdb.com/images/media/team/badge/01ogkh1716960412.png', bayernXI,      bayernBench),
    makeFullTeam('b04', 'Bayer Leverkusen',          'B04', '#E32221', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/3x9k851726760113.png', leverkusenXI,  leverkusenBench),
    makeFullTeam('bvb', 'Borussia Dortmund',         'BVB', '#FDE100', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/tqo8ge1716960353.png', dortmundXI,    dortmundBench),
    makeFullTeam('rbl', 'RB Leipzig',                'RBL', '#DD0741', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/zjgapo1594244951.png', leipzigXI,     leipzigBench),
    makeFullTeam('sge', 'Eintracht Frankfurt',       'SGE', '#E1000F', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/rurwpy1473453269.png', frankfurtXI,   frankfurtBench),
    makeFullTeam('vfb', 'VfB Stuttgart',             'VFB', '#E32221', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/yppyux1473454085.png', stuttgartXI,   stuttgartBench),
    makeFullTeam('wob', 'VfL Wolfsburg',             'WOB', '#65A832', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/ci9trv1778399557.png', wolfsburgXI,   wolfsburgBench),
    makeFullTeam('bmg', 'Borussia Mönchengladbach',  'BMG', '#000000', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/sysurw1473453380.png', gladbachXI,    gladbachBench),
    makeFullTeam('scf', 'SC Freiburg',               'SCF', '#CC0000', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/urwtup1473453288.png', freiburgXI,    freiburgBench),
    makeFullTeam('tsg', 'TSG Hoffenheim',            'TSG', '#1C63B7', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/9hwvb21621593919.png', hoffenheimXI,  hoffenheimBench),
    makeFullTeam('svw', 'Werder Bremen',             'SVW', '#1D9058', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/tkvqan1716960454.png', bremenXI,      bremenBench),
    makeFullTeam('fca', 'FC Augsburg',               'FCA', '#BA3733', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/xqyyvq1473453233.png', augsburgXI,    augsburgBench),
    makeFullTeam('m05', 'Mainz 05',                  'M05', '#ED1C24', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/fhm9v51552134916.png', mainzXI,       mainzBench),
    makeFullTeam('fcu', 'Union Berlin',              'FCU', '#D4011D', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/q0o5001599679795.png', unionBerlinXI, unionBerlinBench),
    makeFullTeam('boc', 'VfL Bochum',               'BOC', '#005CA9', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/kag3jy1599821108.png', bochumXI,      bochumBench),
    makeFullTeam('stp', 'FC St. Pauli',              'STP', '#825840', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/5qupxa1608237013.png', stPauliXI,     stPauliBench),
    makeFullTeam('ksv', 'Holstein Kiel',             'KSV', '#0055A5', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/1fpmgs1514394524.png', kielXI,        kielBench),
    makeFullTeam('fch', 'FC Heidenheim',             'FCH', '#D20021', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/lbj7g01608236988.png', heidenheimXI,  heidenheimBench),
  ],
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 1.05, defensiveLineMod: 0.95, tempoMod: 1.1, passingFocusMod: 0.95 },
  relegationSpots: 3,
};
