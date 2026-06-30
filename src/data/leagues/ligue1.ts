import type { LeagueDefinition } from './types';
import type { Team, Player } from '../../engine/types';

// ---------------------------------------------------------------------------
// LIGUE 1 2024/25 — 18 times com elencos realistas
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
// PSG (OVR 86)
// =========================================================================
const psgXI: Player[] = [
  p('psg-1',  'Gianluigi Donnarumma', 99, 'GK',  36, 76, 60, 12, 18, 22, 66, 90),
  p('psg-2',  'Achraf Hakimi',         2, 'DEF', 88, 84, 74, 40, 76, 74, 68, 78),
  p('psg-3',  'Marquinhos',            5, 'DEF', 70, 88, 72, 36, 92, 56, 68, 92),
  p('psg-4',  'Willian Pacho',        17, 'DEF', 74, 86, 66, 30, 88, 52, 58, 88),
  p('psg-5',  'Nuno Mendes',          25, 'DEF', 82, 86, 70, 34, 78, 72, 64, 80),
  p('psg-6',  'Fabián Ruiz',           8, 'MID', 68, 84, 88, 58, 62, 74, 88, 76),
  p('psg-7',  'Vitinha',               17,'MID', 70, 86, 90, 56, 56, 80, 90, 78),
  p('psg-8',  'João Neves',            87,'MID', 72, 86, 82, 50, 74, 72, 80, 74),
  p('psg-9',  'Ousmane Dembélé',       10,'FWD', 94, 82, 76, 80, 30, 92, 74, 72),
  p('psg-10', 'Gonçalo Ramos',         9, 'FWD', 78, 82, 68, 86, 28, 72, 64, 84),
  p('psg-11', 'Bradley Barcola',       29,'FWD', 92, 82, 70, 78, 26, 88, 68, 74),
];
const psgBench: Player[] = [
  p('psg-b1', 'Matvei Safonov',        16, 'GK',  34, 72, 52, 10, 14, 18, 58, 80),
  p('psg-b2', 'Lucas Hernández',        21,'DEF', 70, 82, 64, 28, 80, 56, 58, 80),
  p('psg-b3', 'Nordi Mukiele',          3, 'DEF', 76, 80, 60, 26, 74, 62, 52, 74),
  p('psg-b4', 'Warren Zaïre-Emery',    33, 'MID', 72, 82, 80, 52, 60, 76, 78, 70),
  p('psg-b5', 'Kang-in Lee',           19, 'FWD', 74, 80, 80, 72, 34, 82, 78, 66),
  p('psg-b6', 'Désiré Doué',           24, 'FWD', 84, 78, 70, 68, 28, 84, 70, 64),
  p('psg-b7', 'Randal Kolo Muani',     23, 'FWD', 84, 80, 64, 76, 26, 76, 60, 72),
];

// =========================================================================
// MONACO (OVR 79) — id: asm
// =========================================================================
const asmXI: Player[] = [
  p('asm-1',  'Radosław Majecki',       16, 'GK',  34, 72, 54, 10, 14, 16, 60, 84),
  p('asm-2',  'Vanderson',               2, 'DEF', 80, 82, 66, 32, 76, 68, 58, 76),
  p('asm-3',  'Thilo Kehrer',            5, 'DEF', 68, 82, 64, 28, 82, 50, 56, 82),
  p('asm-4',  'Wilfried Singo',         30, 'DEF', 78, 84, 60, 28, 80, 64, 52, 78),
  p('asm-5',  'Caio Henrique',          27, 'DEF', 74, 82, 66, 30, 72, 66, 60, 72),
  p('asm-6',  'Denis Zakaria',          29, 'MID', 68, 84, 76, 48, 78, 62, 70, 74),
  p('asm-7',  'Youssouf Camara',        32, 'MID', 70, 86, 72, 44, 80, 60, 66, 72),
  p('asm-8',  'Aleksandr Golovin',      17, 'MID', 68, 80, 84, 56, 46, 80, 84, 70),
  p('asm-9',  'Eliesse Ben Seghir',     22, 'FWD', 78, 78, 72, 74, 24, 82, 72, 68),
  p('asm-10', 'Breel Embolo',            9, 'FWD', 80, 80, 62, 80, 30, 74, 60, 76),
  p('asm-11', 'Maghnes Akliouche',      20, 'FWD', 80, 78, 68, 72, 22, 80, 68, 66),
];
const asmBench: Player[] = [
  p('asm-b1', 'Philipp Köhn',            1, 'GK',  34, 70, 50, 10, 12, 14, 56, 78),
  p('asm-b2', 'Chrislain Matsima',      14, 'DEF', 68, 78, 58, 24, 78, 48, 50, 76),
  p('asm-b3', 'Soungoutou Magassa',     28, 'DEF', 66, 78, 54, 22, 76, 46, 48, 72),
  p('asm-b4', 'Takumi Minamino',        18, 'MID', 72, 82, 74, 60, 48, 72, 72, 66),
  p('asm-b5', 'Georgios Vagiannidis',    3, 'MID', 74, 78, 62, 30, 68, 60, 52, 64),
  p('asm-b6', 'Folarin Balogun',        11, 'FWD', 80, 76, 58, 74, 22, 70, 54, 68),
  p('asm-b7', 'Myron Boadu',            10, 'FWD', 78, 74, 52, 70, 18, 68, 50, 64),
];

// =========================================================================
// MARSEILLE (OVR 78)
// =========================================================================
const omXI: Player[] = [
  p('om-1',  'Pau López',               16, 'GK',  34, 72, 52, 10, 14, 16, 58, 84),
  p('om-2',  'Faris Moumbagna',          7, 'DEF', 76, 82, 60, 28, 78, 60, 52, 76),
  p('om-3',  'Leonardo Balerdi',         5, 'DEF', 68, 80, 62, 28, 82, 48, 56, 82),
  p('om-4',  'Samuel Gigot',            21, 'DEF', 66, 80, 60, 26, 80, 44, 54, 80),
  p('om-5',  'Adrien Rabiot',           14, 'DEF', 72, 84, 70, 34, 74, 62, 64, 72),
  p('om-6',  'Geoffrey Kondogbia',      29, 'MID', 68, 84, 72, 42, 80, 56, 64, 72),
  p('om-7',  'Pierre-Emerick Aubameyang',10,'MID', 72, 80, 70, 76, 28, 72, 66, 72),
  p('om-8',  'Amine Harit',             29, 'MID', 68, 78, 80, 58, 42, 78, 80, 66),
  p('om-9',  'Mason Greenwood',         11, 'FWD', 84, 80, 74, 82, 32, 86, 72, 74),
  p('om-10', 'Elye Wahi',               9,  'FWD', 82, 78, 60, 78, 24, 76, 60, 72),
  p('om-11', 'Ismaïla Sarr',            23, 'FWD', 86, 78, 62, 72, 26, 80, 60, 66),
];
const omBench: Player[] = [
  p('om-b1', 'Geronimo Rulli',           1, 'GK',  34, 70, 48, 10, 12, 14, 52, 78),
  p('om-b2', 'Chancel Mbemba',          99, 'DEF', 62, 78, 54, 28, 80, 42, 46, 76),
  p('om-b3', 'Ulisses Garcia',          37, 'DEF', 66, 76, 52, 20, 70, 54, 46, 68),
  p('om-b4', 'Jordan Veretout',         6,  'MID', 58, 78, 74, 50, 58, 56, 72, 64),
  p('om-b5', 'Jean Onana',              17, 'MID', 62, 78, 64, 36, 74, 50, 56, 66),
  p('om-b6', 'Jonathan Clauss',          2, 'FWD', 76, 80, 66, 56, 40, 68, 62, 58),
  p('om-b7', 'Valentin Rongier',        21, 'FWD', 62, 78, 70, 44, 52, 60, 68, 58),
];

// =========================================================================
// LYON (OVR 76)
// =========================================================================
const olXI: Player[] = [
  p('ol-1',  'Lucas Perri',             1,  'GK',  34, 70, 52, 10, 14, 16, 56, 82),
  p('ol-2',  'Malo Gusto',              27, 'DEF', 80, 80, 66, 28, 72, 66, 56, 72),
  p('ol-3',  'Moussa Niakhate',         22, 'DEF', 66, 80, 62, 28, 82, 48, 54, 80),
  p('ol-4',  'Duje Caleta-Car',          5, 'DEF', 64, 78, 60, 30, 80, 44, 52, 78),
  p('ol-5',  'Nicolas Tagliafico',       3, 'DEF', 72, 82, 66, 28, 74, 62, 58, 72),
  p('ol-6',  'Corentin Tolisso',        12, 'MID', 66, 82, 80, 58, 66, 68, 78, 74),
  p('ol-7',  'Nemanja Matić',           10, 'MID', 50, 78, 76, 36, 80, 46, 72, 76),
  p('ol-8',  'Maxence Caqueret',        18, 'MID', 66, 82, 78, 52, 58, 70, 76, 68),
  p('ol-9',  'Rayan Cherki',            18, 'FWD', 78, 76, 78, 72, 28, 86, 78, 66),
  p('ol-10', 'Alexandre Lacazette',      9, 'FWD', 70, 78, 66, 84, 24, 72, 62, 82),
  p('ol-11', 'Ernest Nuamah',           11, 'FWD', 88, 76, 58, 68, 24, 82, 56, 62),
];
const olBench: Player[] = [
  p('ol-b1', 'Anthony Lopes',            1, 'GK',  34, 68, 48, 10, 12, 14, 52, 76),
  p('ol-b2', 'Clinton Mata',            26, 'DEF', 70, 78, 54, 22, 74, 52, 46, 70),
  p('ol-b3', 'Jake O\'Brien',           14, 'DEF', 62, 76, 50, 24, 76, 40, 44, 72),
  p('ol-b4', 'Saël Kumbedi',             2, 'MID', 74, 76, 62, 28, 66, 60, 52, 62),
  p('ol-b5', 'Said Benrahma',           11, 'MID', 72, 76, 74, 60, 34, 76, 72, 60),
  p('ol-b6', 'Orel Mangala',            14, 'FWD', 62, 78, 66, 40, 58, 58, 64, 58),
  p('ol-b7', 'Gift Orban',              9,  'FWD', 80, 74, 52, 72, 18, 70, 48, 64),
];

// =========================================================================
// LILLE (OVR 76)
// =========================================================================
const loscXI: Player[] = [
  p('losc-1',  'Lucas Chevalier',        1, 'GK',  34, 72, 54, 10, 14, 16, 58, 82),
  p('losc-2',  'Thomas Meunier',         23,'DEF', 74, 82, 66, 30, 76, 60, 58, 74),
  p('losc-3',  'Alexsandro',             6, 'DEF', 68, 80, 60, 26, 80, 46, 52, 80),
  p('losc-4',  'Bafodé Diakité',        20, 'DEF', 70, 80, 58, 26, 78, 50, 50, 78),
  p('losc-5',  'Ismaël Gudmundsson',    14, 'DEF', 76, 82, 64, 28, 72, 62, 56, 70),
  p('losc-6',  'Ayyoub Bouaddi',        16, 'MID', 62, 80, 76, 46, 62, 68, 76, 68),
  p('losc-7',  'Ángel Gomes',            8, 'MID', 66, 80, 82, 56, 48, 74, 84, 68),
  p('losc-8',  'Rémy Cabella',          10, 'MID', 64, 78, 80, 58, 42, 76, 80, 66),
  p('losc-9',  'Jonathan David',         9, 'FWD', 80, 80, 68, 88, 26, 76, 68, 80),
  p('losc-10', 'Edon Zhegrova',         11, 'FWD', 84, 78, 68, 72, 24, 82, 66, 68),
  p('losc-11', 'Hakon Haraldsson',       7, 'FWD', 78, 78, 68, 68, 26, 76, 66, 64),
];
const loscBench: Player[] = [
  p('losc-b1', 'Vito Mannone',          16, 'GK',  32, 68, 46, 8,  12, 14, 52, 74),
  p('losc-b2', 'Tiago Santos',          26, 'DEF', 78, 78, 58, 22, 72, 58, 48, 68),
  p('losc-b3', 'Gabriel Gudmundsson',   17, 'DEF', 70, 76, 56, 20, 70, 52, 46, 66),
  p('losc-b4', 'Benjamin André',        32, 'MID', 54, 80, 72, 38, 72, 48, 66, 70),
  p('losc-b5', 'Osame Sahraoui',        19, 'MID', 74, 76, 68, 56, 30, 74, 64, 60),
  p('losc-b6', 'Mohamed Bayo',          11, 'FWD', 80, 76, 52, 70, 20, 68, 50, 62),
  p('losc-b7', 'Mitchel Bakker',        15, 'FWD', 74, 78, 60, 44, 36, 62, 54, 56),
];

// =========================================================================
// NICE (OVR 74)
// =========================================================================
const ogcXI: Player[] = [
  p('ogc-1',  'Marcin Bulka',            1, 'GK',  34, 70, 52, 10, 14, 16, 56, 80),
  p('ogc-2',  'Jonathan Clauss',         2, 'DEF', 76, 80, 64, 28, 70, 60, 54, 70),
  p('ogc-3',  'Dante',                   4, 'DEF', 52, 78, 64, 28, 80, 40, 62, 82),
  p('ogc-4',  'Jean-Clair Todibo',      14, 'DEF', 72, 80, 60, 26, 82, 50, 52, 78),
  p('ogc-5',  'Melvin Bard',             3, 'DEF', 70, 78, 58, 22, 70, 56, 50, 68),
  p('ogc-6',  'Hicham Boudaoui',        30, 'MID', 66, 82, 70, 46, 72, 64, 66, 68),
  p('ogc-7',  'Pablito Rosario',        10, 'MID', 62, 80, 74, 44, 68, 62, 72, 68),
  p('ogc-8',  'Ndombele',               25, 'MID', 64, 78, 76, 50, 58, 68, 74, 64),
  p('ogc-9',  'Gaëtan Laborde',          9, 'FWD', 74, 78, 62, 78, 28, 68, 60, 74),
  p('ogc-10', 'Terem Moffi',            11, 'FWD', 84, 76, 54, 76, 20, 72, 52, 68),
  p('ogc-11', 'Evann Guessand',         17, 'FWD', 80, 78, 56, 72, 22, 70, 54, 66),
];
const ogcBench: Player[] = [
  p('ogc-b1', 'Alban Lafont',            16,'GK',  32, 68, 46, 8,  12, 14, 50, 72),
  p('ogc-b2', 'Youssouf Ndayishimiye',  22, 'DEF', 62, 76, 54, 22, 72, 46, 44, 70),
  p('ogc-b3', 'Alexis Beka Beka',       27, 'DEF', 66, 76, 54, 20, 70, 52, 48, 66),
  p('ogc-b4', 'Sofiane Diop',           28, 'MID', 68, 76, 72, 54, 36, 70, 68, 58),
  p('ogc-b5', 'Badredine Bouanani',     19, 'MID', 72, 74, 62, 52, 28, 72, 58, 54),
  p('ogc-b6', 'Jeremie Boga',           11, 'FWD', 80, 74, 62, 60, 24, 80, 60, 56),
  p('ogc-b7', 'Ayase Ueda',              9, 'FWD', 74, 74, 50, 68, 20, 60, 48, 62),
];

// =========================================================================
// LENS (OVR 73)
// =========================================================================
const rclXI: Player[] = [
  p('rcl-1',  'Brice Samba',             1, 'GK',  34, 70, 50, 10, 14, 14, 54, 80),
  p('rcl-2',  'Przemysław Frankowski',   2, 'DEF', 78, 80, 64, 28, 68, 62, 56, 70),
  p('rcl-3',  'Kevin Danso',             5, 'DEF', 74, 82, 58, 28, 82, 50, 50, 78),
  p('rcl-4',  'Facundo Medina',          3, 'DEF', 68, 80, 56, 26, 80, 46, 48, 76),
  p('rcl-5',  'Deiver Machado',         15, 'DEF', 72, 80, 58, 24, 72, 58, 50, 68),
  p('rcl-6',  'Cheick Doucouré',        28, 'MID', 62, 82, 66, 40, 80, 52, 62, 70),
  p('rcl-7',  'Salis Abdul Samed',      18, 'MID', 60, 80, 68, 38, 76, 50, 62, 68),
  p('rcl-8',  'Angelo Fulgini',         10, 'MID', 64, 78, 76, 52, 48, 68, 74, 64),
  p('rcl-9',  'Florian Sotoca',          9, 'FWD', 72, 80, 62, 72, 28, 68, 58, 68),
  p('rcl-10', 'Arnaud Kalimuendo',      23, 'FWD', 76, 78, 58, 74, 22, 72, 54, 68),
  p('rcl-11', 'David Pereira da Costa', 11, 'FWD', 78, 76, 60, 68, 24, 72, 56, 64),
];
const rclBench: Player[] = [
  p('rcl-b1', 'Guillaume Restes',       40, 'GK',  32, 66, 44, 8,  10, 12, 46, 70),
  p('rcl-b2', 'Jonathan Gradit',        21, 'DEF', 60, 76, 52, 22, 74, 40, 44, 70),
  p('rcl-b3', 'Neil El Aynaoui',        24, 'DEF', 66, 76, 58, 24, 70, 50, 50, 66),
  p('rcl-b4', 'Adrien Thomasson',        8, 'MID', 58, 76, 68, 46, 46, 58, 66, 60),
  p('rcl-b5', 'Jimmy Cabot',            17, 'MID', 72, 76, 58, 44, 40, 62, 52, 56),
  p('rcl-b6', 'Rémy Labeau Lascary',   27, 'FWD', 74, 74, 52, 62, 18, 66, 48, 58),
  p('rcl-b7', 'M\'Bala Nzola',         19, 'FWD', 72, 74, 46, 68, 16, 60, 44, 60),
];

// =========================================================================
// RENNES (OVR 72)
// =========================================================================
const srfcXI: Player[] = [
  p('srfc-1',  'Steve Mandanda',         30,'GK',  32, 70, 52, 10, 14, 14, 56, 80),
  p('srfc-2',  'Lorenz Assignon',         4,'DEF', 74, 78, 60, 24, 70, 58, 50, 68),
  p('srfc-3',  'Christopher Wooh',       15,'DEF', 68, 78, 56, 24, 78, 44, 48, 76),
  p('srfc-4',  'Arthur Theate',           5,'DEF', 70, 80, 62, 26, 78, 50, 54, 74),
  p('srfc-5',  'Adrien Truffert',         3,'DEF', 72, 78, 60, 24, 70, 60, 52, 66),
  p('srfc-6',  'Baptiste Santamaria',    19,'MID', 58, 82, 68, 38, 74, 48, 64, 70),
  p('srfc-7',  'Glen Kamara',            18,'MID', 60, 80, 72, 40, 68, 54, 66, 66),
  p('srfc-8',  'Flavien Tait',           22,'MID', 64, 78, 72, 52, 44, 66, 70, 62),
  p('srfc-9',  'Ludovic Blas',           10,'FWD', 72, 78, 72, 72, 28, 74, 70, 64),
  p('srfc-10', 'Benjamin Bourigeaud',     8,'FWD', 70, 80, 70, 68, 30, 68, 68, 64),
  p('srfc-11', 'Jota',                   11,'FWD', 76, 76, 60, 68, 22, 74, 58, 60),
];
const srfcBench: Player[] = [
  p('srfc-b1', 'Dogan Alemdar',          16,'GK',  32, 64, 42, 8,  10, 12, 44, 66),
  p('srfc-b2', 'Warmed Omari',           25,'DEF', 60, 74, 50, 22, 72, 38, 42, 68),
  p('srfc-b3', 'Fabian Rieder',          20,'DEF', 68, 76, 58, 24, 68, 52, 50, 62),
  p('srfc-b4', 'Martin Terrier',          7,'MID', 72, 76, 68, 60, 30, 68, 64, 58),
  p('srfc-b5', 'Alidu Seidu',            27,'MID', 70, 78, 56, 26, 68, 58, 46, 62),
  p('srfc-b6', 'Arnaud Kalimuendo',      11,'FWD', 76, 76, 56, 70, 20, 68, 52, 62),
  p('srfc-b7', 'Mathis Picouleau',       23,'FWD', 72, 74, 52, 60, 18, 66, 48, 56),
];

// =========================================================================
// STRASBOURG (OVR 71)
// =========================================================================
const rcsaXI: Player[] = [
  p('rcsa-1',  'Matz Sels',              1, 'GK',  32, 68, 48, 8,  12, 14, 52, 78),
  p('rcsa-2',  'Gerzino Nyamsi',        15, 'DEF', 64, 76, 52, 24, 76, 40, 44, 72),
  p('rcsa-3',  'Dilane Bakwa',          14, 'DEF', 70, 76, 56, 22, 70, 52, 46, 68),
  p('rcsa-4',  'Emanuel Emegha',         9, 'DEF', 66, 76, 52, 24, 70, 46, 44, 70),
  p('rcsa-5',  'Lebo Mothiba',          12, 'DEF', 64, 74, 50, 24, 68, 44, 42, 68),
  p('rcsa-6',  'Nordine Kandil',        22, 'MID', 56, 76, 66, 38, 62, 50, 62, 64),
  p('rcsa-7',  'Habib Diallo',          10, 'MID', 62, 78, 62, 54, 44, 56, 56, 64),
  p('rcsa-8',  'Jean-Ricner Bellegarde', 8, 'MID', 66, 78, 66, 50, 44, 66, 62, 60),
  p('rcsa-9',  'Yahia Fofana',           7, 'FWD', 74, 74, 54, 66, 22, 68, 52, 62),
  p('rcsa-10', 'Kevin Gameiro',          9, 'FWD', 68, 72, 52, 70, 20, 62, 50, 66),
  p('rcsa-11', 'Lamine Diaby-Fadiga',   11, 'FWD', 80, 72, 52, 64, 18, 74, 50, 58),
];
const rcsaBench: Player[] = [
  p('rcsa-b1', 'Guillaume Restes',      40, 'GK',  30, 64, 40, 8,  10, 12, 44, 68),
  p('rcsa-b2', 'Colin Dagba',           26, 'DEF', 64, 72, 48, 20, 66, 50, 40, 62),
  p('rcsa-b3', 'Iyad Bakaji',           17, 'DEF', 60, 72, 46, 20, 66, 42, 38, 62),
  p('rcsa-b4', 'Youssef Fofana',        25, 'MID', 58, 74, 62, 36, 54, 50, 58, 60),
  p('rcsa-b5', 'Maxime Le Marchand',    31, 'MID', 50, 74, 60, 30, 60, 42, 54, 60),
  p('rcsa-b6', 'Adrien Thomasson',      16, 'FWD', 58, 72, 60, 46, 28, 56, 54, 54),
  p('rcsa-b7', 'Kevin Zohi',            27, 'FWD', 66, 70, 50, 58, 16, 60, 44, 54),
];

// =========================================================================
// BREST (OVR 71)
// =========================================================================
const sb29XI: Player[] = [
  p('sb29-1',  'Marco Bizot',            1, 'GK',  34, 68, 50, 8,  12, 14, 54, 78),
  p('sb29-2',  'Lala',                   2, 'DEF', 74, 78, 60, 24, 68, 58, 50, 68),
  p('sb29-3',  'Brendan Chardonnet',     5, 'DEF', 62, 76, 52, 24, 76, 40, 44, 72),
  p('sb29-4',  'Abdallah Coulibaly',    15, 'DEF', 64, 76, 50, 22, 74, 40, 42, 70),
  p('sb29-5',  'Haris Belkebla',        29, 'DEF', 66, 78, 54, 22, 70, 52, 48, 68),
  p('sb29-6',  'Pierre Lees-Melou',     18, 'MID', 60, 80, 70, 44, 62, 56, 68, 64),
  p('sb29-7',  'Mathias Pereira Lage',  14, 'MID', 68, 80, 68, 50, 46, 64, 66, 62),
  p('sb29-8',  'Youcef Belaïli',        11, 'MID', 64, 76, 68, 54, 38, 66, 64, 60),
  p('sb29-9',  'Romain Del Castillo',   10, 'FWD', 72, 76, 66, 70, 24, 70, 64, 62),
  p('sb29-10', 'Romain Faivre',         7,  'FWD', 74, 74, 66, 68, 24, 72, 62, 60),
  p('sb29-11', 'Steve Mounié',          19, 'FWD', 70, 76, 50, 72, 22, 60, 50, 64),
];
const sb29Bench: Player[] = [
  p('sb29-b1', 'Gautier Larsonneur',    16, 'GK',  30, 66, 42, 8,  10, 12, 44, 68),
  p('sb29-b2', 'Bradley Locko',        20, 'DEF', 62, 72, 48, 18, 66, 48, 40, 62),
  p('sb29-b3', 'Achraf Dari',          22, 'DEF', 60, 72, 46, 20, 68, 40, 38, 64),
  p('sb29-b4', 'Kamory Doumbia',        8, 'MID', 60, 74, 60, 36, 56, 52, 54, 58),
  p('sb29-b5', 'Kenny Lala',            3, 'MID', 68, 74, 56, 28, 60, 52, 48, 56),
  p('sb29-b6', 'Hugo Magnetti',        31, 'FWD', 62, 74, 60, 52, 28, 58, 58, 54),
  p('sb29-b7', 'Julien Le Cardinal',   27, 'FWD', 58, 70, 44, 50, 16, 52, 40, 52),
];

// =========================================================================
// TOULOUSE (OVR 70)
// =========================================================================
const tfcXI: Player[] = [
  p('tfc-1',  'Guillaume Restes',        16,'GK',  32, 66, 46, 8,  12, 14, 50, 76),
  p('tfc-2',  'Mikkel Desler',            2,'DEF', 70, 76, 56, 20, 68, 52, 46, 66),
  p('tfc-3',  'Logan Costa',              5,'DEF', 64, 76, 54, 24, 76, 42, 46, 72),
  p('tfc-4',  'Anthony Rouault',         21,'DEF', 60, 74, 52, 22, 74, 38, 44, 70),
  p('tfc-5',  'Stijn Spierings',          3,'DEF', 62, 76, 54, 22, 68, 48, 46, 66),
  p('tfc-6',  'Rasmus Nicolaisen',       24,'MID', 56, 78, 62, 36, 68, 44, 58, 66),
  p('tfc-7',  'Brecht Dejaegere',        18,'MID', 54, 76, 68, 42, 60, 52, 64, 62),
  p('tfc-8',  'Gabriel Suazo',           11,'MID', 66, 76, 62, 40, 56, 58, 58, 60),
  p('tfc-9',  'Thijs Dallinga',           9,'FWD', 70, 74, 52, 74, 20, 62, 50, 66),
  p('tfc-10', 'Zakaria Aboukhlal',       10,'FWD', 76, 74, 58, 68, 20, 72, 56, 60),
  p('tfc-11', 'Frank Magri',             7, 'FWD', 70, 74, 56, 66, 20, 68, 52, 58),
];
const tfcBench: Player[] = [
  p('tfc-b1', 'Maxime Dupé',             1, 'GK',  30, 64, 40, 8,  10, 12, 44, 66),
  p('tfc-b2', 'Niklas Schmidt',         14, 'DEF', 58, 72, 48, 18, 62, 42, 38, 62),
  p('tfc-b3', 'Warren Kamanzi',         28, 'DEF', 60, 72, 46, 18, 62, 44, 38, 60),
  p('tfc-b4', 'Denis Genreau',          20, 'MID', 54, 74, 62, 36, 52, 48, 58, 56),
  p('tfc-b5', 'Christopher Jullien',    23, 'MID', 44, 70, 50, 22, 68, 34, 42, 62),
  p('tfc-b6', 'Branco van den Boomen', 17, 'FWD', 54, 72, 68, 42, 28, 54, 64, 52),
  p('tfc-b7', 'Yann Gboho',            11, 'FWD', 72, 70, 50, 58, 16, 64, 46, 52),
];

// =========================================================================
// REIMS (OVR 69)
// =========================================================================
const sdrXI: Player[] = [
  p('sdr-1',  'Yehvann Diouf',           1, 'GK',  32, 66, 46, 8,  12, 12, 48, 74),
  p('sdr-2',  'Emmanuel Agbadou',       14, 'DEF', 62, 74, 50, 22, 74, 38, 42, 70),
  p('sdr-3',  'Wout Faes',               3, 'DEF', 58, 74, 50, 24, 72, 36, 44, 68),
  p('sdr-4',  'Andrew Gravillon',        5, 'DEF', 60, 72, 48, 20, 70, 38, 40, 66),
  p('sdr-5',  'Emmanuel Lamine',        22, 'DEF', 64, 72, 52, 20, 66, 48, 42, 62),
  p('sdr-6',  'Moreto Cassama',         17, 'MID', 56, 76, 62, 34, 64, 46, 58, 62),
  p('sdr-7',  'Valon Berisha',          16, 'MID', 54, 74, 66, 40, 54, 52, 64, 60),
  p('sdr-8',  'Thibault De Smet',        8, 'MID', 60, 74, 64, 42, 50, 54, 60, 58),
  p('sdr-9',  'Junya Ito',              11, 'FWD', 80, 72, 58, 68, 18, 74, 54, 60),
  p('sdr-10', 'Emmanuel Agbadou',        9, 'FWD', 70, 74, 50, 68, 18, 64, 48, 62),
  p('sdr-11', 'Largie Ramazani',        7,  'FWD', 78, 70, 52, 64, 18, 72, 50, 58),
];
const sdrBench: Player[] = [
  p('sdr-b1', 'Patrick Pentz',          40, 'GK',  30, 62, 38, 6,  10, 10, 42, 64),
  p('sdr-b2', 'Yunis Abdelhamid',       25, 'DEF', 46, 68, 44, 18, 66, 28, 38, 62),
  p('sdr-b3', 'Emmanuel Lamine',        23, 'DEF', 60, 70, 44, 18, 62, 40, 36, 58),
  p('sdr-b4', 'Alexis Flips',           20, 'MID', 54, 72, 60, 36, 46, 50, 58, 54),
  p('sdr-b5', 'Nicolas Penneteau',      24, 'MID', 44, 70, 54, 30, 50, 36, 50, 56),
  p('sdr-b6', 'Mitchell van Bergen',    26, 'FWD', 74, 68, 50, 60, 14, 66, 46, 52),
  p('sdr-b7', 'Keito Nakamura',         10, 'FWD', 72, 70, 54, 60, 16, 66, 52, 52),
];

// =========================================================================
// LE HAVRE (OVR 68)
// =========================================================================
const hacXI: Player[] = [
  p('hac-1',  'Arthur Desmas',           1, 'GK',  30, 64, 44, 8,  10, 12, 46, 72),
  p('hac-2',  'Arouna Sangante',         3, 'DEF', 60, 72, 46, 18, 68, 40, 38, 64),
  p('hac-3',  'Alexis Flips',           15, 'DEF', 56, 70, 44, 18, 66, 36, 36, 62),
  p('hac-4',  'Gautier Lloris',          5, 'DEF', 58, 70, 46, 20, 66, 36, 38, 62),
  p('hac-5',  'Emmanuel Casimir',        2, 'DEF', 60, 70, 46, 18, 64, 42, 36, 60),
  p('hac-6',  'Abdoulaye Touré',        14, 'MID', 56, 74, 60, 32, 60, 44, 54, 58),
  p('hac-7',  'Daler Kuzyaev',          10, 'MID', 58, 72, 64, 40, 48, 54, 60, 58),
  p('hac-8',  'Yoann Salmier',          27, 'MID', 50, 72, 58, 30, 58, 40, 52, 56),
  p('hac-9',  'Loïc Nego',              24, 'FWD', 68, 70, 52, 60, 18, 60, 46, 56),
  p('hac-10', 'Josué Casimir',          22, 'FWD', 66, 70, 48, 62, 16, 58, 44, 56),
  p('hac-11', 'Sinaly Diomandé',        11, 'FWD', 70, 70, 46, 60, 16, 62, 42, 56),
];
const hacBench: Player[] = [
  p('hac-b1', 'Fabien Farnolle',        16, 'GK',  28, 60, 36, 6,  8,  10, 38, 62),
  p('hac-b2', 'Niels Nkounkou',         17, 'DEF', 64, 68, 44, 16, 60, 48, 34, 56),
  p('hac-b3', 'Chris Mavinga',          20, 'DEF', 52, 68, 40, 16, 62, 32, 34, 58),
  p('hac-b4', 'Jules Keita',            32, 'MID', 54, 68, 54, 28, 50, 44, 48, 52),
  p('hac-b5', 'Lassana Coulibaly',       8, 'MID', 52, 70, 56, 28, 54, 40, 50, 52),
  p('hac-b6', 'Nabil Alioui',            9, 'FWD', 66, 68, 44, 58, 12, 56, 40, 52),
  p('hac-b7', 'Yoann Cathline',         21, 'FWD', 64, 66, 44, 56, 14, 56, 40, 50),
];

// =========================================================================
// MONTPELLIER (OVR 67)
// =========================================================================
const mhscXI: Player[] = [
  p('mhsc-1',  'Benjamin Lecomte',       1, 'GK',  32, 64, 44, 8,  10, 12, 44, 70),
  p('mhsc-2',  'Arnaud Nordin',          7, 'DEF', 60, 70, 50, 20, 64, 42, 38, 62),
  p('mhsc-3',  'Mamadou Sakho',          3, 'DEF', 52, 68, 46, 20, 68, 32, 36, 64),
  p('mhsc-4',  'Christopher Jullien',   21, 'DEF', 46, 68, 46, 20, 66, 30, 40, 64),
  p('mhsc-5',  'Théo Sainte-Luce',      23, 'DEF', 62, 70, 48, 20, 62, 44, 36, 60),
  p('mhsc-6',  'Joris Chotard',          8, 'MID', 56, 72, 62, 34, 60, 48, 58, 58),
  p('mhsc-7',  'Téji Savanier',         10, 'MID', 52, 70, 66, 44, 44, 52, 66, 58),
  p('mhsc-8',  'Jordan Ferri',          18, 'MID', 50, 72, 60, 32, 58, 42, 56, 56),
  p('mhsc-9',  'Elye Wahi',              9, 'FWD', 74, 70, 46, 66, 16, 64, 46, 58),
  p('mhsc-10', 'Wahbi Khazri',          19, 'FWD', 62, 66, 56, 64, 18, 60, 58, 56),
  p('mhsc-11', 'Akor Adams',            11, 'FWD', 70, 70, 44, 64, 16, 60, 42, 54),
];
const mhscBench: Player[] = [
  p('mhsc-b1', 'Jonas Omlin',           26, 'GK',  30, 62, 40, 6,  8,  10, 40, 62),
  p('mhsc-b2', 'Kiki Kouyaté',         25, 'DEF', 54, 66, 40, 16, 60, 32, 32, 58),
  p('mhsc-b3', 'Nicolas Cozza',         33, 'DEF', 60, 66, 44, 16, 58, 42, 32, 56),
  p('mhsc-b4', 'Enzo Tchato',           20, 'MID', 58, 68, 54, 28, 48, 44, 48, 50),
  p('mhsc-b5', 'Florent Mollet',        22, 'MID', 50, 68, 60, 36, 38, 48, 58, 52),
  p('mhsc-b6', 'Khalil Fayad',          14, 'FWD', 62, 66, 42, 52, 12, 54, 38, 48),
  p('mhsc-b7', 'Brayann Pereira',       17, 'FWD', 60, 66, 40, 52, 12, 52, 38, 46),
];

// =========================================================================
// NANTES (OVR 67)
// =========================================================================
const fcnXI: Player[] = [
  p('fcn-1',  'Alban Lafont',            1, 'GK',  32, 66, 44, 8,  10, 12, 46, 70),
  p('fcn-2',  'Przemysław Frankowski',   2, 'DEF', 62, 70, 52, 20, 64, 44, 42, 62),
  p('fcn-3',  'Jean-Charles Castelletto',5,'DEF', 60, 72, 48, 22, 70, 36, 38, 64),
  p('fcn-4',  'Nicolas Pallois',         4, 'DEF', 52, 70, 46, 18, 66, 30, 36, 62),
  p('fcn-5',  'Quentin Merlin',         20, 'DEF', 64, 70, 52, 18, 62, 48, 40, 60),
  p('fcn-6',  'Pedro Chirivella',        8, 'MID', 52, 70, 62, 30, 56, 44, 60, 56),
  p('fcn-7',  'Moussa Sissoko',         29, 'MID', 54, 72, 60, 32, 60, 44, 54, 58),
  p('fcn-8',  'Florian Sotoca',         10, 'MID', 62, 72, 58, 44, 38, 56, 54, 56),
  p('fcn-9',  'Moses Simon',            11, 'FWD', 80, 72, 54, 66, 16, 72, 50, 58),
  p('fcn-10', 'Mostafa Mohamed',         9, 'FWD', 68, 70, 44, 66, 16, 58, 42, 58),
  p('fcn-11', 'Matthis Abline',         23, 'FWD', 66, 70, 46, 62, 14, 60, 42, 54),
];
const fcnBench: Player[] = [
  p('fcn-b1', 'Rémy Descamps',          16, 'GK',  30, 62, 38, 6,  8,  10, 40, 62),
  p('fcn-b2', 'Dennis Appiah',           3, 'DEF', 58, 66, 44, 16, 60, 38, 34, 56),
  p('fcn-b3', 'Andrei Girotto',         25, 'DEF', 48, 68, 44, 16, 62, 28, 34, 58),
  p('fcn-b4', 'Samuel Moutoussamy',     14, 'MID', 56, 70, 58, 30, 52, 44, 50, 52),
  p('fcn-b5', 'Marcus Coco',            17, 'MID', 66, 70, 52, 38, 28, 62, 44, 48),
  p('fcn-b6', 'Guido Quagliata',        28, 'FWD', 64, 68, 48, 52, 14, 56, 40, 48),
  p('fcn-b7', 'Youssef Msakni',         10, 'FWD', 62, 66, 56, 56, 14, 58, 52, 48),
];

// =========================================================================
// SAINT-ÉTIENNE (OVR 66)
// =========================================================================
const asseXI: Player[] = [
  p('asse-1',  'Gautier Larsonneur',     1, 'GK',  30, 64, 40, 6,  10, 10, 44, 68),
  p('asse-2',  'Yvann Maçon',            2, 'DEF', 62, 68, 46, 18, 60, 44, 36, 58),
  p('asse-3',  'Leny Yoro',              4, 'DEF', 64, 70, 48, 18, 66, 40, 38, 62),
  p('asse-4',  'Dylan Chambost',         3, 'DEF', 58, 68, 46, 18, 62, 38, 36, 58),
  p('asse-5',  'Léo Pétrot',            14, 'DEF', 58, 68, 44, 16, 60, 36, 34, 56),
  p('asse-6',  'Benjamin Bouchouari',   18, 'MID', 52, 68, 58, 30, 56, 42, 52, 52),
  p('asse-7',  'Mathieu Cafaro',        10, 'MID', 58, 68, 58, 40, 36, 54, 54, 52),
  p('asse-8',  'Léo Nkounkou',          17, 'MID', 60, 68, 54, 32, 40, 52, 48, 50),
  p('asse-9',  'Irvin Cardona',          9, 'FWD', 68, 68, 46, 62, 14, 60, 42, 52),
  p('asse-10', 'Lucas Stassin',         11, 'FWD', 66, 68, 44, 60, 12, 58, 40, 50),
  p('asse-11', 'Zuriko Davitashvili',    7, 'FWD', 72, 68, 50, 60, 14, 66, 44, 52),
];
const asseBench: Player[] = [
  p('asse-b1', 'Etienne Green',         16, 'GK',  28, 60, 36, 6,  8,  8,  38, 60),
  p('asse-b2', 'Pierre Cornud',         24, 'DEF', 56, 64, 40, 14, 56, 34, 30, 52),
  p('asse-b3', 'Mickaël Nadé',          21, 'DEF', 58, 66, 42, 16, 60, 32, 32, 54),
  p('asse-b4', 'Ayman Aiki',            28, 'MID', 56, 64, 50, 28, 38, 46, 44, 46),
  p('asse-b5', 'Anthony Briançon',      15, 'MID', 46, 66, 44, 18, 58, 28, 38, 52),
  p('asse-b6', 'Thomas Monconduit',     30, 'FWD', 52, 64, 46, 44, 12, 46, 40, 44),
  p('asse-b7', 'Augustine Boakye',      27, 'FWD', 68, 64, 40, 52, 12, 56, 36, 46),
];

// =========================================================================
// AUXERRE (OVR 65)
// =========================================================================
const ajaXI: Player[] = [
  p('aja-1',  'Benoit Costil',           1, 'GK',  30, 62, 40, 6,  10, 10, 42, 68),
  p('aja-2',  'Gauthier Hein',           7, 'DEF', 60, 68, 46, 16, 58, 42, 34, 56),
  p('aja-3',  'Théo Forget',             4, 'DEF', 54, 68, 42, 16, 62, 32, 32, 58),
  p('aja-4',  'Mathieu Peybernes',       5, 'DEF', 50, 66, 40, 16, 60, 28, 30, 56),
  p('aja-5',  'Jubal',                  22, 'DEF', 62, 68, 44, 16, 58, 44, 34, 54),
  p('aja-6',  'Gideon Mensah',           3, 'DEF', 60, 66, 42, 14, 56, 40, 32, 52),
  p('aja-7',  'Nuno Da Costa',          11, 'MID', 56, 66, 56, 40, 34, 50, 52, 50),
  p('aja-8',  'Elisha Owusu',           21, 'MID', 54, 68, 56, 28, 52, 42, 48, 50),
  p('aja-9',  'Lassine Sinayoko',       18, 'FWD', 72, 66, 44, 60, 12, 62, 40, 50),
  p('aja-10', 'Enzo Rocolan',           10, 'FWD', 60, 66, 52, 56, 14, 54, 46, 48),
  p('aja-11', 'Rémy Dugimont',           9, 'FWD', 62, 66, 44, 58, 12, 54, 40, 48),
];
const ajaBench: Player[] = [
  p('aja-b1', 'Maxime Zapi',            16, 'GK',  28, 58, 34, 6,  8,  8,  36, 58),
  p('aja-b2', 'Hamza Sakhi',            24, 'DEF', 52, 62, 38, 12, 54, 28, 28, 48),
  p('aja-b3', 'Donovan Léon',           14, 'DEF', 54, 62, 38, 12, 54, 30, 28, 48),
  p('aja-b4', 'Haris Mesanovic',        27, 'MID', 48, 62, 50, 24, 38, 38, 44, 44),
  p('aja-b5', 'Lassana Coulibaly',       8, 'MID', 50, 66, 52, 26, 48, 38, 46, 46),
  p('aja-b6', 'Sidy Sarr',             20, 'FWD', 64, 62, 38, 50, 10, 54, 34, 44),
  p('aja-b7', 'Ahmed El Messaoudi',    23, 'FWD', 58, 62, 44, 50, 10, 52, 40, 42),
];

// =========================================================================
// ANGERS (OVR 64)
// =========================================================================
const scoXI: Player[] = [
  p('sco-1',  'Paul Bernardoni',         1, 'GK',  30, 62, 40, 6,  10, 10, 42, 68),
  p('sco-2',  'Chrislain Matsima',      22, 'DEF', 58, 66, 42, 14, 58, 36, 32, 56),
  p('sco-3',  'Romain Thomas',           4, 'DEF', 48, 66, 40, 16, 62, 28, 30, 58),
  p('sco-4',  'Abdoulaye Bamba',        15, 'DEF', 56, 66, 40, 14, 58, 36, 28, 54),
  p('sco-5',  'Nuno Da Costa',          20, 'DEF', 60, 66, 44, 14, 56, 40, 32, 52),
  p('sco-6',  'Batista Mendy',           8, 'MID', 52, 66, 56, 28, 46, 40, 50, 48),
  p('sco-7',  'Pierrick Capelle',       17, 'MID', 50, 64, 54, 30, 40, 42, 50, 46),
  p('sco-8',  'Mathias Perez',          14, 'MID', 52, 64, 52, 28, 38, 42, 46, 46),
  p('sco-9',  'Lenny Pintor',           11, 'FWD', 68, 64, 42, 58, 10, 58, 38, 48),
  p('sco-10', 'Mohamed-Ali Cho',         9, 'FWD', 74, 64, 44, 60, 12, 62, 40, 50),
  p('sco-11', 'Sofiane Boufal',         10, 'FWD', 70, 62, 52, 58, 14, 66, 50, 48),
];
const scoBench: Player[] = [
  p('sco-b1', 'Gauthier Gallon',        16, 'GK',  28, 58, 34, 6,  8,  8,  36, 58),
  p('sco-b2', 'Theoson Siebatcheu',     25, 'DEF', 50, 62, 36, 12, 52, 26, 26, 46),
  p('sco-b3', 'Vincent Manceau',         5, 'DEF', 52, 62, 38, 12, 54, 28, 26, 48),
  p('sco-b4', 'Hyun-seok Hong',         28, 'MID', 52, 62, 50, 26, 36, 42, 44, 44),
  p('sco-b5', 'Khaled Adenon',          18, 'MID', 48, 62, 48, 24, 36, 36, 42, 42),
  p('sco-b6', 'Enzo Le Fée',            27, 'FWD', 60, 62, 52, 50, 12, 54, 44, 44),
  p('sco-b7', 'Azzeddine Ounahi',       22, 'FWD', 62, 62, 54, 48, 14, 56, 46, 44),
];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const ligue1: LeagueDefinition = {
  id: 'ligue1',
  name: 'Ligue 1',
  country: 'França',
  flag: '🇫🇷',
  color: '#004899',
  logo: 'https://r2.thesportsdb.com/images/media/league/badge/wwwdkq1684612354.png',
  cupName: 'Coupe de France',
  totalRounds: 34,
  relegationSpots: 3,
  europeanSlots: {
    championsLeague: 2,
    europaLeague: 2,
    conferenceLeague: 1,
  },
  cpuProfile: {
    pressingMod: 1.0,
    defensiveLineMod: 0.95,
    tempoMod: 1.05,
    passingFocusMod: 1.0,
  },
  teams: [
    makeFullTeam('psg',   'Paris Saint-Germain', 'PSG', '#003D7C', '#ED2939', 'https://r2.thesportsdb.com/images/media/team/badge/xzqdr11617119122.png', psgXI,   psgBench),
    makeFullTeam('asm',   'AS Monaco',           'MON', '#D4021D', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/9oe8481679955010.png',  asmXI,   asmBench),
    makeFullTeam('om',    'Olympique Marseille', 'OM',  '#2196F3', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/vxrs9s1717417755.png',  omXI,    omBench),
    makeFullTeam('ol',    'Olympique Lyonnais',  'OL',  '#0033A0', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/rvquw11717931890.png',  olXI,    olBench),
    makeFullTeam('losc',  'Lille OSC',           'OSC', '#E8001C', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/tqxswq1514393268.png',  loscXI,  loscBench),
    makeFullTeam('ogc',   'OGC Nice',            'NIC', '#CC0000', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/5c8ubg1720450600.png',  ogcXI,   ogcBench),
    makeFullTeam('rcl',   'RC Lens',             'LEN', '#FFCC00', '#CF1B2B', 'https://r2.thesportsdb.com/images/media/team/badge/c12fko1679956282.png',  rclXI,   rclBench),
    makeFullTeam('srfc',  'Stade Rennais',       'REN', '#DA251D', '#000000', 'https://r2.thesportsdb.com/images/media/team/badge/uvjf9m1720187462.png',  srfcXI,  srfcBench),
    makeFullTeam('rcsa',  'RC Strasbourg',       'STR', '#1E3270', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/rtrrtt1514392022.png',  rcsaXI,  rcsaBench),
    makeFullTeam('sb29',  'Stade Brestois 29',   'BRE', '#E63329', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/svbtlr1720186819.png',  sb29XI,  sb29Bench),
    makeFullTeam('tfc',   'Toulouse FC',         'TFC', '#7B2D8E', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/qhh5nr1679956093.png',  tfcXI,   tfcBench),
    makeFullTeam('sdr',   'Stade de Reims',      'REI', '#DA251D', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/88vt821679956367.png',  sdrXI,   sdrBench),
    makeFullTeam('hac',   'Le Havre AC',         'HAC', '#0050A0', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/r5s3261720186748.png',  hacXI,   hacBench),
    makeFullTeam('mhsc',  'Montpellier HSC',     'MTP', '#F7941D', '#0033A0', 'https://r2.thesportsdb.com/images/media/team/badge/t44bxe1514392289.png',  mhscXI,  mhscBench),
    makeFullTeam('fcn',   'FC Nantes',           'NAN', '#FFCF00', '#008000', 'https://r2.thesportsdb.com/images/media/team/badge/suvuut1514392222.png',  fcnXI,   fcnBench),
    makeFullTeam('asse',  'AS Saint-Étienne',    'ASS', '#007E33', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/6f4d9u1679955812.png',  asseXI,  asseBench),
    makeFullTeam('aja',   'AJ Auxerre',          'AUX', '#0033A0', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/n93u981720186916.png',  ajaXI,   ajaBench),
    makeFullTeam('sco',   'Angers SCO',          'ANG', '#000000', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/htxpu11720187049.png',  scoXI,   scoBench),
  ],
};
