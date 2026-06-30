import type { LeagueDefinition } from './types';
import type { Team, Player } from '../../engine/types';

// ---------------------------------------------------------------------------
// LA LIGA 2024/25 — 20 times com elencos realistas
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
// REAL MADRID (OVR 85)
// =========================================================================
const realMadridXI: Player[] = [
  p('rma-1',  'Thibaut Courtois',    1,  'GK',  36, 76, 58, 12, 18, 22, 66, 90),
  p('rma-2',  'Dani Carvajal',       2,  'DEF', 72, 82, 72, 36, 82, 66, 68, 84),
  p('rma-3',  'Éder Militão',        3,  'DEF', 74, 84, 68, 34, 88, 56, 60, 88),
  p('rma-4',  'Antonio Rüdiger',     22, 'DEF', 68, 86, 62, 30, 90, 50, 56, 88),
  p('rma-5',  'Ferland Mendy',       23, 'DEF', 78, 84, 66, 28, 82, 70, 58, 80),
  p('rma-6',  'Federico Valverde',   15, 'MID', 80, 88, 80, 66, 74, 76, 78, 80),
  p('rma-7',  'Eduardo Camavinga',   12, 'MID', 76, 86, 78, 52, 72, 82, 76, 74),
  p('rma-8',  'Jude Bellingham',     5,  'MID', 78, 86, 88, 78, 62, 86, 88, 82),
  p('rma-9',  'Rodrygo',             11, 'FWD', 84, 82, 76, 80, 36, 86, 76, 76),
  p('rma-10', 'Kylian Mbappé',       9,  'FWD', 96, 84, 78, 92, 30, 88, 80, 88),
  p('rma-11', 'Vinícius Jr.',        7,  'FWD', 94, 82, 72, 82, 28, 96, 74, 78),
];
const realMadridBench: Player[] = [
  p('rma-b1', 'Andriy Lunin',        13, 'GK',  35, 72, 52, 10, 14, 18, 58, 82),
  p('rma-b2', 'Lucas Vázquez',       17, 'DEF', 72, 80, 66, 30, 74, 62, 58, 72),
  p('rma-b3', 'Aurelien Tchouaméni', 18, 'DEF', 68, 82, 70, 38, 84, 56, 64, 78),
  p('rma-b4', 'Luka Modrić',         10, 'MID', 52, 78, 90, 52, 48, 74, 94, 68),
  p('rma-b5', 'Arda Güler',          24, 'MID', 64, 74, 82, 64, 36, 80, 84, 66),
  p('rma-b6', 'Endrick',             16, 'FWD', 82, 76, 56, 76, 22, 78, 56, 70),
  p('rma-b7', 'Brahim Díaz',         21, 'FWD', 78, 76, 76, 66, 28, 82, 74, 62),
];

// =========================================================================
// BARCELONA (OVR 83)
// =========================================================================
const barcelonaXI: Player[] = [
  p('fcb-1',  'Marc-André ter Stegen', 1,  'GK',  38, 74, 62, 12, 18, 24, 68, 88),
  p('fcb-2',  'Jules Koundé',           23, 'DEF', 76, 84, 72, 34, 86, 68, 66, 86),
  p('fcb-3',  'Pau Cubarsí',            34, 'DEF', 66, 80, 70, 28, 86, 54, 68, 84),
  p('fcb-4',  'Iñigo Martínez',         5,  'DEF', 62, 80, 68, 32, 86, 48, 62, 84),
  p('fcb-5',  'Alejandro Baldé',        3,  'DEF', 82, 82, 68, 28, 76, 72, 60, 76),
  p('fcb-6',  'Frenkie de Jong',        21, 'MID', 68, 82, 86, 54, 60, 78, 86, 74),
  p('fcb-7',  'Pedri',                  8,  'MID', 72, 82, 88, 60, 54, 86, 90, 76),
  p('fcb-8',  'Gavi',                   6,  'MID', 74, 86, 82, 52, 72, 82, 82, 72),
  p('fcb-9',  'Lamine Yamal',           27, 'FWD', 88, 78, 78, 76, 28, 92, 80, 72),
  p('fcb-10', 'Robert Lewandowski',     9,  'FWD', 74, 82, 72, 94, 24, 72, 74, 90),
  p('fcb-11', 'Dani Olmo',              20, 'FWD', 76, 82, 82, 76, 44, 82, 82, 74),
];
const barcelonaBench: Player[] = [
  p('fcb-b1', 'Iñaki Peña',            13, 'GK',  34, 70, 52, 10, 14, 18, 54, 78),
  p('fcb-b2', 'Héctor Fort',           28, 'DEF', 72, 76, 60, 24, 72, 60, 52, 68),
  p('fcb-b3', 'Andreas Christensen',   15, 'DEF', 58, 76, 62, 28, 80, 44, 56, 76),
  p('fcb-b4', 'Marc Casadó',           30, 'MID', 60, 78, 72, 38, 72, 56, 66, 70),
  p('fcb-b5', 'Fermín López',          16, 'MID', 64, 76, 76, 58, 46, 72, 74, 64),
  p('fcb-b6', 'Ferran Torres',         7,  'FWD', 80, 78, 70, 72, 30, 76, 68, 68),
  p('fcb-b7', 'Ansu Fati',             10, 'FWD', 84, 72, 64, 68, 24, 82, 62, 62),
];

// =========================================================================
// ATLÉTICO MADRID (OVR 80)
// =========================================================================
const atleticoXI: Player[] = [
  p('atm-1',  'Jan Oblak',            13, 'GK',  36, 76, 56, 12, 16, 20, 62, 92),
  p('atm-2',  'Nahuel Molina',        16, 'DEF', 76, 82, 68, 34, 78, 66, 60, 76),
  p('atm-3',  'José María Giménez',   2,  'DEF', 68, 82, 62, 34, 88, 50, 58, 86),
  p('atm-4',  'Clément Lenglet',      15, 'DEF', 60, 78, 66, 28, 82, 46, 60, 82),
  p('atm-5',  'Reinildo Mandava',     23, 'DEF', 74, 82, 58, 24, 80, 64, 52, 78),
  p('atm-6',  'Koke',                 6,  'MID', 58, 84, 84, 50, 60, 72, 84, 72),
  p('atm-7',  'Rodrigo De Paul',      5,  'MID', 72, 82, 80, 56, 68, 74, 78, 72),
  p('atm-8',  'Conor Gallagher',      12, 'MID', 76, 86, 74, 52, 78, 64, 68, 76),
  p('atm-9',  'Marcos Llorente',      14, 'FWD', 78, 84, 74, 64, 52, 70, 70, 70),
  p('atm-10', 'Antoine Griezmann',    7,  'FWD', 76, 82, 82, 84, 38, 78, 82, 80),
  p('atm-11', 'Julián Álvarez',       19, 'FWD', 78, 84, 72, 82, 42, 76, 74, 78),
];
const atleticoBench: Player[] = [
  p('atm-b1', 'Juan Musso',           1,  'GK',  34, 70, 48, 10, 14, 16, 52, 80),
  p('atm-b2', 'César Azpilicueta',    3,  'DEF', 64, 78, 62, 28, 74, 56, 54, 72),
  p('atm-b3', 'Javi Galán',           18, 'DEF', 72, 80, 58, 22, 72, 60, 50, 68),
  p('atm-b4', 'Pablo Barrios',        20, 'MID', 62, 78, 70, 42, 66, 60, 66, 64),
  p('atm-b5', 'Ángel Correa',         10, 'MID', 74, 78, 68, 62, 40, 76, 62, 62),
  p('atm-b6', 'Axel Witsel',          17, 'MID', 50, 76, 68, 38, 76, 46, 62, 70),
  p('atm-b7', 'Alexander Sørloth',    9,  'FWD', 78, 80, 56, 78, 28, 58, 50, 76),
];

// =========================================================================
// REAL SOCIEDAD (OVR 77)
// =========================================================================
const realSociedadXI: Player[] = [
  p('rso-1',  'Alex Remiro',          1,  'GK',  34, 72, 54, 10, 14, 18, 56, 84),
  p('rso-2',  'Aritz Elustondo',      6,  'DEF', 60, 78, 60, 26, 82, 44, 54, 80),
  p('rso-3',  'Igor Zubeldia',        5,  'DEF', 62, 80, 64, 28, 80, 48, 58, 80),
  p('rso-4',  'Aihen Muñoz',          18, 'DEF', 76, 80, 64, 24, 76, 66, 56, 72),
  p('rso-5',  'Álvaro Odriozola',     2,  'DEF', 72, 78, 60, 26, 74, 62, 54, 72),
  p('rso-6',  'Martín Zubimendi',     4,  'MID', 64, 82, 80, 42, 78, 66, 78, 74),
  p('rso-7',  'Mikel Merino',         24, 'MID', 66, 82, 76, 50, 72, 62, 74, 72),
  p('rso-8',  'Brais Méndez',         19, 'MID', 70, 80, 78, 60, 52, 72, 74, 68),
  p('rso-9',  'Mikel Oyarzabal',      10, 'FWD', 74, 82, 78, 80, 38, 76, 76, 78),
  p('rso-10', 'Alexander Sørloth',    9,  'FWD', 78, 80, 58, 78, 26, 60, 52, 76),
  p('rso-11', 'Take Kubo',            14, 'FWD', 80, 78, 74, 70, 32, 84, 72, 66),
];
const realSociedadBench: Player[] = [
  p('rso-b1', 'Mathew Ryan',          13, 'GK',  33, 68, 48, 8,  12, 14, 50, 74),
  p('rso-b2', 'Nayef Aguerd',         16, 'DEF', 58, 76, 54, 24, 76, 42, 48, 72),
  p('rso-b3', 'Jon Pacheco',          25, 'DEF', 62, 76, 56, 22, 74, 50, 48, 70),
  p('rso-b4', 'Ander Barrenetxea',    17, 'MID', 78, 74, 66, 58, 36, 74, 60, 58),
  p('rso-b5', 'Pablo Marín',          21, 'MID', 56, 74, 68, 40, 56, 54, 66, 60),
  p('rso-b6', 'André Silva',          11, 'FWD', 70, 76, 50, 74, 20, 58, 46, 70),
  p('rso-b7', 'Ander Herrera',        8,  'FWD', 58, 78, 72, 44, 60, 58, 68, 60),
];

// =========================================================================
// ATHLETIC BILBAO (OVR 76)
// =========================================================================
const athleticBilbaoXI: Player[] = [
  p('ath-1',  'Julen Agirrezabala',   1,  'GK',  34, 72, 52, 10, 14, 16, 54, 82),
  p('ath-2',  'Oscar de Marcos',      18, 'DEF', 72, 82, 64, 30, 78, 62, 58, 76),
  p('ath-3',  'Dani Vivian',          3,  'DEF', 66, 82, 60, 28, 84, 46, 54, 82),
  p('ath-4',  'Yeray Álvarez',        20, 'DEF', 64, 80, 58, 28, 82, 42, 50, 80),
  p('ath-5',  'Yuri Berchiche',       16, 'DEF', 72, 80, 62, 24, 76, 60, 54, 74),
  p('ath-6',  'Dani García',          14, 'MID', 56, 82, 72, 40, 78, 52, 68, 74),
  p('ath-7',  'Oihan Sancet',         15, 'MID', 68, 80, 74, 60, 56, 68, 72, 68),
  p('ath-8',  'Ander Herrera',        8,  'MID', 60, 80, 74, 46, 64, 60, 70, 68),
  p('ath-9',  'Nico Williams',        11, 'FWD', 90, 80, 70, 72, 28, 88, 64, 66),
  p('ath-10', 'Iñaki Williams',       9,  'FWD', 86, 82, 62, 76, 32, 78, 58, 72),
  p('ath-11', 'Alex Berenguer',       10, 'FWD', 80, 78, 66, 68, 34, 76, 60, 64),
];
const athleticBilbaoBench: Player[] = [
  p('ath-b1', 'Unai Simón',           25, 'GK',  36, 70, 50, 10, 14, 16, 52, 80),
  p('ath-b2', 'Mikel Vesga',          21, 'DEF', 58, 76, 56, 26, 74, 46, 50, 70),
  p('ath-b3', 'Aitor Paredes',        5,  'DEF', 60, 78, 54, 24, 78, 40, 46, 74),
  p('ath-b4', 'Beñat García',         22, 'MID', 58, 76, 70, 44, 58, 56, 66, 62),
  p('ath-b5', 'Jon Morcillo',         27, 'MID', 72, 74, 60, 52, 34, 68, 54, 56),
  p('ath-b6', 'Gorka Guruzeta',       7,  'FWD', 70, 76, 50, 72, 24, 54, 44, 68),
  p('ath-b7', 'Unai Vencedor',        6,  'FWD', 58, 76, 66, 40, 64, 52, 60, 64),
];

// =========================================================================
// VILLARREAL (OVR 74)
// =========================================================================
const villarrealXI: Player[] = [
  p('vil-1',  'Filip Jörgensen',      13, 'GK',  36, 70, 50, 10, 14, 18, 54, 80),
  p('vil-2',  'Juan Foyth',           2,  'DEF', 76, 80, 62, 30, 80, 60, 56, 76),
  p('vil-3',  'Raúl Albiol',          18, 'DEF', 52, 78, 66, 28, 84, 40, 60, 84),
  p('vil-4',  'Eric Bailly',          5,  'DEF', 68, 76, 54, 26, 80, 52, 48, 78),
  p('vil-5',  'Alberto Moreno',       18, 'DEF', 76, 78, 62, 24, 72, 64, 54, 70),
  p('vil-6',  'Etienne Capoue',       29, 'MID', 54, 80, 70, 42, 76, 52, 66, 72),
  p('vil-7',  'Dani Parejo',          8,  'MID', 48, 80, 86, 48, 52, 56, 88, 70),
  p('vil-8',  'Alex Baena',           19, 'MID', 72, 78, 78, 62, 40, 76, 74, 64),
  p('vil-9',  'Yeremi Pino',          7,  'FWD', 82, 78, 68, 68, 28, 78, 64, 62),
  p('vil-10', 'Ayoze Pérez',          17, 'FWD', 74, 78, 70, 72, 30, 68, 68, 68),
  p('vil-11', 'Thierno Barry',        9,  'FWD', 82, 76, 54, 74, 22, 72, 50, 68),
];
const villarrealBench: Player[] = [
  p('vil-b1', 'Pepe Reina',           25, 'GK',  32, 68, 46, 8,  12, 14, 50, 74),
  p('vil-b2', 'Kiko Femenía',         17, 'DEF', 72, 76, 54, 22, 70, 56, 46, 66),
  p('vil-b3', 'Alfonso Pedraza',      23, 'DEF', 74, 76, 60, 22, 68, 62, 52, 66),
  p('vil-b4', 'José Luis Morales',    11, 'MID', 64, 74, 66, 58, 30, 70, 60, 56),
  p('vil-b5', 'Álex Comesaña',        14, 'MID', 58, 76, 66, 38, 64, 52, 62, 62),
  p('vil-b6', 'Ilias Akhomach',       22, 'FWD', 80, 72, 60, 58, 24, 78, 54, 54),
  p('vil-b7', 'Samu Chukwueze',       21, 'FWD', 84, 72, 56, 62, 22, 80, 52, 52),
];

// =========================================================================
// REAL BETIS (OVR 74)
// =========================================================================
const realBetisXI: Player[] = [
  p('bet-1',  'Rui Silva',            13, 'GK',  34, 72, 54, 10, 14, 18, 56, 82),
  p('bet-2',  'Youssouf Sabaly',      2,  'DEF', 74, 80, 60, 28, 76, 62, 52, 74),
  p('bet-3',  'Marc Bartra',          15, 'DEF', 60, 78, 64, 26, 80, 46, 58, 78),
  p('bet-4',  'Natan',                23, 'DEF', 68, 78, 58, 24, 80, 50, 50, 76),
  p('bet-5',  'Juan Miranda',         3,  'DEF', 74, 80, 62, 22, 74, 64, 54, 72),
  p('bet-6',  'Johnny Cardoso',       6,  'MID', 62, 80, 70, 42, 74, 58, 66, 70),
  p('bet-7',  'Guido Rodríguez',      14, 'MID', 50, 78, 68, 36, 78, 44, 60, 74),
  p('bet-8',  'Lo Celso',             20, 'MID', 62, 78, 80, 54, 52, 72, 80, 66),
  p('bet-9',  'Ayoze Pérez',          17, 'FWD', 72, 76, 70, 68, 30, 66, 68, 64),
  p('bet-10', 'Isco',                 22, 'FWD', 52, 74, 84, 62, 32, 82, 86, 62),
  p('bet-11', 'Antony',               11, 'FWD', 76, 74, 64, 64, 28, 82, 58, 60),
];
const realBetisBench: Player[] = [
  p('bet-b1', 'Adrián San Miguel',    1,  'GK',  32, 68, 46, 8,  12, 14, 48, 74),
  p('bet-b2', 'Héctor Bellerín',      17, 'DEF', 68, 76, 56, 22, 68, 56, 48, 66),
  p('bet-b3', 'Ricardo Rodríguez',    12, 'DEF', 62, 74, 58, 22, 72, 50, 50, 66),
  p('bet-b4', 'Sergi Altimira',       8,  'MID', 56, 76, 66, 38, 60, 52, 62, 62),
  p('bet-b5', 'William Carvalho',     14, 'MID', 50, 76, 72, 34, 72, 46, 64, 68),
  p('bet-b6', 'Jesús Rodríguez',      10, 'FWD', 76, 72, 58, 62, 24, 74, 54, 56),
  p('bet-b7', 'Willian José',         9,  'FWD', 66, 74, 46, 74, 18, 52, 42, 68),
];

// =========================================================================
// SEVILLA (OVR 73)
// =========================================================================
const sevillaXI: Player[] = [
  p('sev-1',  'Orjan Nyland',         13, 'GK',  34, 72, 50, 10, 14, 16, 54, 80),
  p('sev-2',  'Jesús Navas',          16, 'DEF', 68, 78, 62, 26, 74, 58, 56, 72),
  p('sev-3',  'Loïc Badé',            4,  'DEF', 66, 78, 60, 26, 82, 48, 52, 78),
  p('sev-4',  'Nemanja Gudelj',       6,  'DEF', 54, 76, 64, 28, 78, 40, 58, 78),
  p('sev-5',  'Karim Rekik',          3,  'DEF', 64, 74, 56, 22, 74, 48, 48, 72),
  p('sev-6',  'Djibril Sow',          18, 'MID', 62, 80, 70, 44, 72, 58, 64, 70),
  p('sev-7',  'Lucien Agoumé',        21, 'MID', 64, 78, 68, 42, 70, 58, 62, 66),
  p('sev-8',  'Ivan Rakitić',         10, 'MID', 46, 76, 84, 52, 52, 60, 84, 66),
  p('sev-9',  'Dodi Lukebakio',       11, 'FWD', 82, 76, 62, 68, 28, 78, 58, 62),
  p('sev-10', 'Youssef En-Nesyri',    24, 'FWD', 78, 80, 52, 78, 24, 60, 48, 74),
  p('sev-11', 'Suso',                 8,  'FWD', 68, 74, 74, 58, 32, 74, 70, 58),
];
const sevillaBench: Player[] = [
  p('sev-b1', 'Álvaro Fernández',     1,  'GK',  33, 68, 44, 8,  12, 14, 48, 72),
  p('sev-b2', 'Marcos Acuña',         19, 'DEF', 70, 76, 56, 22, 68, 60, 48, 64),
  p('sev-b3', 'Adrià Pedrosa',        23, 'DEF', 66, 74, 54, 20, 66, 56, 46, 66),
  p('sev-b4', 'Óliver Torres',        7,  'MID', 62, 74, 70, 44, 50, 62, 66, 60),
  p('sev-b5', 'Joan Jordán',          14, 'MID', 56, 76, 64, 38, 62, 52, 60, 62),
  p('sev-b6', 'Theo Ndicka',          5,  'DEF', 62, 76, 54, 24, 76, 44, 46, 72),
  p('sev-b7', 'Isaac Romero',         9,  'FWD', 72, 74, 46, 70, 20, 56, 40, 66),
];

// =========================================================================
// VALENCIA (OVR 72)
// =========================================================================
const valenciaXI: Player[] = [
  p('val-1',  'Giorgi Mamardashvili', 25, 'GK',  36, 72, 52, 10, 14, 18, 56, 82),
  p('val-2',  'Thierry Correia',      2,  'DEF', 70, 78, 58, 24, 72, 58, 50, 70),
  p('val-3',  'Mouctar Diakhaby',     5,  'DEF', 68, 76, 50, 24, 78, 46, 44, 74),
  p('val-4',  'César Tárrega',        15, 'DEF', 62, 76, 56, 22, 76, 42, 48, 72),
  p('val-5',  'José Gayà',            14, 'DEF', 72, 78, 62, 24, 72, 62, 56, 70),
  p('val-6',  'Pepelu',               22, 'MID', 60, 78, 72, 42, 64, 56, 68, 66),
  p('val-7',  'André Almeida',        8,  'MID', 62, 76, 66, 44, 64, 58, 62, 62),
  p('val-8',  'Javi Guerra',          17, 'MID', 62, 76, 66, 50, 58, 60, 64, 62),
  p('val-9',  'Diego López',          7,  'FWD', 74, 76, 62, 64, 28, 66, 58, 60),
  p('val-10', 'Rafa Mir',             21, 'FWD', 68, 74, 50, 72, 20, 56, 44, 68),
  p('val-11', 'Dani Gómez',           11, 'FWD', 76, 74, 60, 66, 26, 68, 56, 62),
];
const valenciaBench: Player[] = [
  p('val-b1', 'Cristhian Mosquera',   3,  'DEF', 62, 72, 48, 22, 72, 40, 42, 68),
  p('val-b2', 'Cenk Özkacar',         6,  'DEF', 60, 72, 50, 22, 72, 38, 44, 68),
  p('val-b3', 'Stole Dimitrievski',   1,  'GK',  33, 68, 44, 8,  12, 14, 46, 70),
  p('val-b4', 'Justin Kluivert',      10, 'FWD', 80, 74, 62, 66, 26, 78, 60, 58),
  p('val-b5', 'Hugo Duro',            9,  'FWD', 70, 72, 46, 68, 20, 54, 40, 62),
  p('val-b6', 'Giorgi Kochorashvili', 28, 'MID', 58, 74, 62, 36, 64, 52, 58, 60),
  p('val-b7', 'Sergi Canós',          19, 'MID', 70, 70, 58, 54, 28, 66, 50, 52),
];

// =========================================================================
// GIRONA (OVR 72)
// =========================================================================
const gironaXI: Player[] = [
  p('gir-1',  'Paulo Gazzaniga',      1,  'GK',  34, 72, 52, 10, 14, 16, 54, 80),
  p('gir-2',  'Arnau Martínez',       22, 'DEF', 70, 78, 60, 26, 74, 60, 52, 70),
  p('gir-3',  'Daley Blind',          17, 'DEF', 56, 74, 72, 26, 72, 46, 68, 72),
  p('gir-4',  'Juanpe',               3,  'DEF', 62, 76, 54, 26, 78, 40, 48, 74),
  p('gir-5',  'Miguel Gutiérrez',     16, 'DEF', 74, 78, 60, 24, 70, 62, 54, 68),
  p('gir-6',  'Oriol Romeu',          5,  'MID', 52, 78, 72, 36, 72, 46, 66, 68),
  p('gir-7',  'Aleix García',         4,  'MID', 60, 78, 78, 40, 62, 56, 76, 66),
  p('gir-8',  'Van de Beek',          14, 'MID', 62, 76, 74, 48, 56, 64, 70, 62),
  p('gir-9',  'Yangel Herrera',       6,  'MID', 68, 78, 72, 50, 64, 60, 66, 64),
  p('gir-10', 'Cristhian Stuani',     7,  'FWD', 70, 76, 54, 76, 22, 58, 48, 72),
  p('gir-11', 'Viktor Tsygankov',     11, 'FWD', 78, 76, 64, 68, 26, 74, 60, 62),
];
const gironaBench: Player[] = [
  p('gir-b1', 'Astralaga',            13, 'GK',  32, 66, 42, 8,  10, 12, 44, 68),
  p('gir-b2', 'David López',          2,  'DEF', 58, 74, 54, 22, 72, 40, 46, 68),
  p('gir-b3', 'Eric García',          24, 'DEF', 60, 72, 60, 22, 72, 44, 52, 68),
  p('gir-b4', 'Iván Martín',          20, 'MID', 64, 74, 70, 50, 40, 64, 66, 58),
  p('gir-b5', 'Bojan Miocinovic',     18, 'MID', 58, 72, 62, 38, 52, 54, 58, 56),
  p('gir-b6', 'Taty Castellanos',     9,  'FWD', 74, 74, 52, 72, 22, 60, 46, 66),
  p('gir-b7', 'Savinho',              10, 'FWD', 82, 72, 60, 58, 20, 78, 52, 52),
];

// =========================================================================
// CELTA VIGO (OVR 71)
// =========================================================================
const celtaVigoXI: Player[] = [
  p('cel-1',  'Iván Villar',          1,  'GK',  34, 70, 48, 10, 12, 14, 50, 78),
  p('cel-2',  'Hugo Mallo',           2,  'DEF', 64, 76, 58, 24, 72, 52, 50, 68),
  p('cel-3',  'Carl Starfelt',        4,  'DEF', 60, 76, 56, 24, 76, 42, 48, 74),
  p('cel-4',  'Unai Núñez',           5,  'DEF', 62, 74, 54, 22, 74, 40, 46, 72),
  p('cel-5',  'Jailson',              14, 'DEF', 68, 74, 54, 22, 70, 52, 46, 66),
  p('cel-6',  'Fran Beltrán',         6,  'MID', 56, 78, 70, 38, 64, 52, 68, 64),
  p('cel-7',  'Carles Pérez',         19, 'MID', 72, 76, 66, 56, 36, 70, 60, 58),
  p('cel-8',  'Luca de la Torre',     22, 'MID', 58, 74, 68, 42, 50, 58, 66, 60),
  p('cel-9',  'Iago Aspas',           10, 'FWD', 68, 78, 76, 76, 28, 78, 76, 72),
  p('cel-10', 'Williot Swedberg',     11, 'FWD', 80, 72, 58, 62, 22, 72, 52, 58),
  p('cel-11', 'Borja Iglesias',       9,  'FWD', 66, 74, 52, 72, 20, 56, 44, 66),
];
const celtaVigoBench: Player[] = [
  p('cel-b1', 'Guaita',               13, 'GK',  32, 66, 44, 8,  12, 14, 46, 70),
  p('cel-b2', 'Kevin Vázquez',        16, 'DEF', 64, 72, 52, 20, 66, 52, 44, 64),
  p('cel-b3', 'Joseph Aidoo',         3,  'DEF', 60, 72, 48, 22, 72, 38, 40, 66),
  p('cel-b4', 'Gabri Veiga',          24, 'MID', 64, 74, 70, 52, 40, 64, 64, 56),
  p('cel-b5', 'Oscar Rodríguez',      17, 'MID', 58, 72, 70, 46, 36, 60, 66, 58),
  p('cel-b6', 'Franco Cervi',         21, 'FWD', 74, 70, 58, 56, 22, 72, 52, 52),
  p('cel-b7', 'Gonçalo Paciência',    18, 'FWD', 64, 72, 46, 68, 18, 50, 38, 62),
];

// =========================================================================
// OSASUNA (OVR 70)
// =========================================================================
const osasunaXI: Player[] = [
  p('osa-1',  'Sergio Herrera',       1,  'GK',  33, 70, 48, 10, 12, 14, 50, 78),
  p('osa-2',  'Nacho Vidal',          2,  'DEF', 68, 76, 56, 24, 72, 54, 48, 68),
  p('osa-3',  'David García',         14, 'DEF', 60, 76, 56, 24, 76, 40, 48, 74),
  p('osa-4',  'Juan Cruz',            16, 'DEF', 64, 74, 52, 22, 72, 46, 44, 68),
  p('osa-5',  'Alejandro Catena',     5,  'DEF', 58, 74, 52, 22, 74, 38, 44, 72),
  p('osa-6',  'Lucas Torró',          6,  'MID', 52, 76, 62, 36, 72, 44, 58, 66),
  p('osa-7',  'Moi Gómez',            11, 'MID', 66, 74, 66, 52, 40, 66, 60, 58),
  p('osa-8',  'Jon Moncayola',        20, 'MID', 62, 76, 64, 40, 62, 56, 58, 60),
  p('osa-9',  'Ante Budimir',         10, 'FWD', 66, 76, 50, 76, 22, 56, 44, 70),
  p('osa-10', 'Aimar Oroz',           21, 'FWD', 68, 74, 64, 62, 26, 62, 62, 58),
  p('osa-11', 'Bryan Zaragoza',       17, 'FWD', 78, 72, 56, 60, 22, 74, 50, 54),
];
const osasunaBench: Player[] = [
  p('osa-b1', 'Juan Pérez',           25, 'GK',  32, 66, 42, 8,  10, 12, 44, 68),
  p('osa-b2', 'Jesús Areso',          15, 'DEF', 66, 72, 52, 20, 66, 50, 42, 62),
  p('osa-b3', 'Pablo Ibáñez',         4,  'DEF', 58, 72, 50, 22, 70, 36, 42, 66),
  p('osa-b4', 'Darko Brasanac',       8,  'MID', 50, 72, 62, 36, 60, 46, 58, 58),
  p('osa-b5', 'Rubén García',         7,  'MID', 60, 72, 64, 46, 34, 60, 58, 54),
  p('osa-b6', 'Chimy Ávila',          9,  'FWD', 76, 72, 46, 66, 22, 62, 40, 60),
  p('osa-b7', 'Kike García',          22, 'FWD', 62, 72, 42, 66, 18, 48, 36, 60),
];

// =========================================================================
// GETAFE (OVR 69)
// =========================================================================
const getafeXI: Player[] = [
  p('get-1',  'David Soria',          13, 'GK',  33, 70, 48, 10, 12, 14, 50, 78),
  p('get-2',  'Damián Suárez',        2,  'DEF', 62, 76, 54, 24, 70, 52, 46, 66),
  p('get-3',  'Djené Dakonam',        3,  'DEF', 70, 76, 48, 20, 76, 44, 40, 72),
  p('get-4',  'Gastón Álvarez',       5,  'DEF', 62, 74, 52, 22, 72, 40, 44, 70),
  p('get-5',  'Aleñá',                15, 'DEF', 64, 72, 54, 22, 66, 52, 48, 64),
  p('get-6',  'Mauro Arambarri',      4,  'MID', 56, 78, 60, 36, 72, 46, 54, 64),
  p('get-7',  'Óscar Rodríguez',      10, 'MID', 60, 72, 68, 46, 38, 58, 64, 56),
  p('get-8',  'Nemanja Maksimovic',   6,  'MID', 52, 74, 62, 34, 68, 44, 56, 62),
  p('get-9',  'Enes Ünal',            14, 'FWD', 58, 72, 46, 72, 20, 52, 40, 66),
  p('get-10', 'Borja Mayoral',        9,  'FWD', 68, 72, 52, 68, 22, 58, 46, 62),
  p('get-11', 'Mason Greenwood',      7,  'FWD', 78, 74, 62, 70, 28, 78, 58, 60),
];
const getafeBench: Player[] = [
  p('get-b1', 'Rubén Yáñez',          1,  'GK',  32, 66, 42, 8,  12, 14, 46, 70),
  p('get-b2', 'Juan Iglesias',        16, 'DEF', 58, 70, 48, 20, 66, 42, 40, 62),
  p('get-b3', 'Stefan Mitrovic',      22, 'DEF', 58, 72, 46, 22, 70, 36, 40, 66),
  p('get-b4', 'Yellu',                20, 'MID', 52, 70, 56, 30, 56, 46, 50, 54),
  p('get-b5', 'Christantus Uche',     11, 'MID', 70, 70, 52, 50, 24, 66, 42, 50),
  p('get-b6', 'Juanmi',               21, 'FWD', 66, 70, 50, 62, 20, 58, 44, 56),
  p('get-b7', 'Carles Aleñá',         8,  'FWD', 58, 70, 64, 42, 34, 58, 60, 52),
];

// =========================================================================
// MALLORCA (OVR 69)
// =========================================================================
const mallorcaXI: Player[] = [
  p('mal-1',  'Predrag Rajković',     1,  'GK',  33, 70, 48, 10, 12, 14, 52, 78),
  p('mal-2',  'Pablo Maffeo',         2,  'DEF', 70, 78, 54, 22, 72, 58, 46, 66),
  p('mal-3',  'Martin Valjent',       4,  'DEF', 62, 74, 52, 22, 74, 38, 44, 72),
  p('mal-4',  'Antonio Raillo',       5,  'DEF', 56, 72, 50, 22, 72, 34, 42, 70),
  p('mal-5',  'Jaume Costa',          3,  'DEF', 62, 72, 52, 20, 66, 50, 44, 62),
  p('mal-6',  'Samú Costa',           18, 'MID', 58, 76, 60, 34, 68, 48, 54, 62),
  p('mal-7',  'Dani Rodríguez',       17, 'MID', 62, 74, 62, 44, 44, 58, 56, 56),
  p('mal-8',  'Morlanes',             10, 'MID', 58, 72, 62, 40, 48, 54, 58, 56),
  p('mal-9',  'Vedat Muriqi',         9,  'FWD', 70, 74, 44, 70, 20, 52, 38, 66),
  p('mal-10', 'Abdón Prats',          7,  'FWD', 66, 72, 48, 66, 20, 56, 42, 62),
  p('mal-11', 'Larin',                11, 'FWD', 74, 72, 48, 66, 22, 60, 42, 60),
];
const mallorcaBench: Player[] = [
  p('mal-b1', 'Leo Román',            13, 'GK',  32, 66, 42, 8,  10, 12, 44, 68),
  p('mal-b2', 'José Copete',          15, 'DEF', 58, 70, 48, 20, 66, 38, 40, 64),
  p('mal-b3', 'David López',          6,  'DEF', 56, 70, 50, 20, 68, 36, 42, 62),
  p('mal-b4', 'Cufré',                19, 'MID', 52, 70, 56, 32, 54, 44, 50, 52),
  p('mal-b5', 'Samu Costa',           8,  'MID', 58, 72, 58, 34, 62, 46, 52, 56),
  p('mal-b6', 'Takuma Asano',         21, 'FWD', 78, 70, 52, 58, 20, 66, 44, 50),
  p('mal-b7', 'Cyle Larin',           11, 'FWD', 72, 70, 46, 62, 18, 54, 38, 56),
];

// =========================================================================
// RAYO VALLECANO (OVR 68)
// =========================================================================
const rayoVallecanoXI: Player[] = [
  p('ray-1',  'Augusto Batalla',       1,  'GK',  33, 70, 46, 10, 12, 14, 48, 76),
  p('ray-2',  'Iván Balliu',          2,  'DEF', 64, 74, 52, 22, 68, 52, 44, 62),
  p('ray-3',  'Florian Lejeune',      4,  'DEF', 56, 72, 52, 22, 72, 36, 44, 68),
  p('ray-4',  'Alejandro Catena',     5,  'DEF', 58, 72, 50, 20, 70, 36, 42, 66),
  p('ray-5',  'Fran García',          3,  'DEF', 70, 74, 56, 22, 68, 58, 48, 62),
  p('ray-6',  'Óscar Valentín',       8,  'MID', 56, 74, 60, 36, 64, 48, 54, 60),
  p('ray-7',  'Álvaro García',        14, 'MID', 64, 72, 60, 46, 36, 62, 52, 54),
  p('ray-8',  'Pathé Ciss',           25, 'MID', 58, 76, 58, 32, 70, 46, 52, 62),
  p('ray-9',  'Radamel Falcao',       9,  'FWD', 56, 68, 52, 72, 18, 54, 52, 68),
  p('ray-10', 'Sergio Camello',       11, 'FWD', 72, 72, 50, 64, 22, 62, 46, 60),
  p('ray-11', 'Randy Nteka',          10, 'FWD', 68, 72, 56, 60, 26, 64, 50, 56),
];
const rayoVallecanoBench: Player[] = [
  p('ray-b1', 'Cássio',               12, 'GK',  31, 64, 42, 8,  10, 12, 44, 68),
  p('ray-b2', 'Mario Suárez',         16, 'DEF', 52, 68, 46, 18, 62, 36, 38, 60),
  p('ray-b3', 'Esteban Saveljich',    15, 'DEF', 54, 70, 46, 20, 68, 34, 38, 62),
  p('ray-b4', 'Unai López',           17, 'MID', 54, 70, 58, 36, 52, 48, 54, 54),
  p('ray-b5', 'Isi Palazón',          6,  'MID', 56, 72, 60, 36, 46, 56, 52, 52),
  p('ray-b6', 'Pedro Díaz',           19, 'FWD', 64, 68, 50, 56, 20, 58, 44, 52),
  p('ray-b7', 'Bebé',                 7,  'FWD', 64, 70, 54, 56, 22, 64, 48, 50),
];

// =========================================================================
// ALAVÉS (OVR 67)
// =========================================================================
const alavesXI: Player[] = [
  p('ala-1',  'Antonio Sivera',       1,  'GK',  33, 68, 46, 8,  12, 14, 48, 74),
  p('ala-2',  'Nahuel Tenaglia',      2,  'DEF', 62, 72, 50, 20, 68, 46, 42, 62),
  p('ala-3',  'Abqar Abqar',          5,  'DEF', 56, 70, 48, 20, 68, 36, 40, 64),
  p('ala-4',  'Florian Lejeune',      4,  'DEF', 56, 70, 50, 20, 68, 34, 42, 64),
  p('ala-5',  'Rubén Duarte',         22, 'DEF', 64, 72, 52, 20, 64, 50, 42, 60),
  p('ala-6',  'Jon Guridi',           6,  'MID', 54, 74, 58, 34, 62, 44, 52, 58),
  p('ala-7',  'Manu Sánchez',         20, 'MID', 62, 72, 58, 38, 44, 56, 52, 54),
  p('ala-8',  'Toni Moya',            8,  'MID', 56, 72, 60, 36, 54, 50, 56, 56),
  p('ala-9',  'Kike García',          9,  'FWD', 62, 72, 44, 64, 18, 50, 36, 60),
  p('ala-10', 'Carlos Vicente',       10, 'FWD', 68, 70, 52, 60, 22, 60, 46, 56),
  p('ala-11', 'Mamadou Sylla',        11, 'FWD', 72, 70, 46, 60, 18, 60, 38, 54),
];
const alavesBench: Player[] = [
  p('ala-b1', 'Pelayo Fernández',     25, 'GK',  32, 62, 40, 8,  10, 12, 42, 66),
  p('ala-b2', 'Moussa Diallo',        15, 'DEF', 54, 68, 44, 18, 62, 34, 36, 58),
  p('ala-b3', 'Victor Laguardia',     24, 'DEF', 52, 68, 44, 18, 66, 30, 36, 60),
  p('ala-b4', 'Ander Guevara',        7,  'MID', 50, 70, 58, 30, 58, 42, 52, 52),
  p('ala-b5', 'Luis Rioja',           16, 'MID', 64, 68, 56, 42, 30, 62, 48, 50),
  p('ala-b6', 'Owusu',                19, 'FWD', 68, 68, 44, 54, 16, 58, 36, 50),
  p('ala-b7', 'Jon Karrikaburu',      21, 'FWD', 70, 68, 44, 56, 16, 58, 38, 50),
];

// =========================================================================
// LAS PALMAS (OVR 66)
// =========================================================================
const lasPalmasXI: Player[] = [
  p('lpa-1',  'Álvaro Valles',        1,  'GK',  33, 68, 46, 8,  12, 14, 48, 74),
  p('lpa-2',  'Sergi Cardona',        3,  'DEF', 64, 72, 52, 22, 66, 52, 44, 60),
  p('lpa-3',  'Álex Suárez',          5,  'DEF', 58, 70, 48, 20, 68, 36, 40, 64),
  p('lpa-4',  'Florian Lejeune',      4,  'DEF', 56, 70, 50, 20, 66, 34, 42, 62),
  p('lpa-5',  'Mika Mármol',          15, 'DEF', 58, 70, 46, 18, 66, 36, 38, 62),
  p('lpa-6',  'Javi Muñoz',           8,  'MID', 56, 72, 60, 34, 58, 48, 56, 56),
  p('lpa-7',  'Manu Fuster',          10, 'MID', 58, 70, 64, 42, 40, 54, 60, 54),
  p('lpa-8',  'Álex Días',            6,  'MID', 52, 70, 58, 32, 56, 44, 52, 54),
  p('lpa-9',  'Sandro Ramírez',       9,  'FWD', 66, 70, 52, 64, 20, 60, 46, 60),
  p('lpa-10', 'Benito Ramírez',       11, 'FWD', 68, 68, 48, 62, 18, 60, 42, 56),
  p('lpa-11', 'Alberto Moleiro',      7,  'FWD', 72, 70, 58, 56, 20, 68, 52, 52),
];
const lasPalmasBench: Player[] = [
  p('lpa-b1', 'Raúl Fernández',       25, 'GK',  32, 62, 40, 8,  10, 12, 42, 66),
  p('lpa-b2', 'Óscar Clemente',       17, 'DEF', 54, 66, 44, 18, 62, 32, 36, 56),
  p('lpa-b3', 'McKenna',              19, 'DEF', 56, 68, 46, 18, 62, 34, 38, 58),
  p('lpa-b4', 'Loiodice',             14, 'MID', 50, 68, 56, 30, 52, 42, 52, 50),
  p('lpa-b5', 'Pejiño',               16, 'MID', 62, 66, 54, 38, 28, 58, 46, 48),
  p('lpa-b6', 'Marc Cardona',         21, 'FWD', 62, 66, 44, 58, 16, 54, 36, 52),
  p('lpa-b7', 'Coco',                 22, 'FWD', 60, 66, 50, 54, 18, 56, 42, 50),
];

// =========================================================================
// ESPANYOL (OVR 66)
// =========================================================================
const espanyolXI: Player[] = [
  p('esp-1',  'Joan García',          13, 'GK',  34, 68, 48, 10, 12, 14, 50, 74),
  p('esp-2',  'Alejo Véliz',          2,  'DEF', 62, 70, 50, 24, 66, 48, 42, 60),
  p('esp-3',  'Leandro Cabrera',      4,  'DEF', 56, 70, 48, 20, 68, 34, 40, 64),
  p('esp-4',  'Bernardo González',    5,  'DEF', 58, 70, 50, 20, 68, 36, 40, 62),
  p('esp-5',  'Adrià Pedrosa',        3,  'DEF', 66, 72, 52, 20, 64, 52, 44, 60),
  p('esp-6',  'Sergi Darder',         14, 'MID', 58, 72, 68, 42, 42, 56, 64, 58),
  p('esp-7',  'Brian Oliván',         19, 'MID', 60, 70, 58, 32, 52, 52, 52, 52),
  p('esp-8',  'Pol Lozano',           8,  'MID', 56, 70, 60, 36, 50, 48, 56, 54),
  p('esp-9',  'Javi Puado',           10, 'FWD', 70, 70, 56, 62, 22, 64, 50, 58),
  p('esp-10', 'Dani Gómez',           11, 'FWD', 66, 68, 52, 60, 20, 62, 46, 54),
  p('esp-11', 'Jorge Pascual',        18, 'FWD', 68, 70, 50, 58, 20, 60, 42, 52),
];
const espanyolBench: Player[] = [
  p('esp-b1', 'Diego López',          1,  'GK',  32, 64, 42, 8,  10, 12, 44, 66),
  p('esp-b2', 'Keidi Bare',           15, 'DEF', 54, 68, 46, 18, 60, 36, 38, 58),
  p('esp-b3', 'Sylla',                18, 'DEF', 56, 68, 44, 18, 62, 34, 36, 58),
  p('esp-b4', 'Miha Zajc',            16, 'MID', 52, 68, 58, 32, 52, 46, 52, 50),
  p('esp-b5', 'Manu Morlanes',        22, 'MID', 56, 68, 56, 30, 48, 46, 50, 50),
  p('esp-b6', 'Ruben Sánchez',        20, 'FWD', 66, 66, 46, 56, 18, 58, 38, 50),
  p('esp-b7', 'Luis Hevia',           9,  'FWD', 60, 66, 42, 58, 16, 50, 34, 54),
];

// =========================================================================
// VALLADOLID (OVR 65)
// =========================================================================
const valladolidXI: Player[] = [
  p('vll-1',  'Jordi Masip',          13, 'GK',  32, 66, 44, 8,  12, 14, 46, 72),
  p('vll-2',  'Luis Pérez',           2,  'DEF', 60, 70, 48, 18, 64, 44, 38, 58),
  p('vll-3',  'Javi Sánchez',         5,  'DEF', 56, 68, 48, 18, 66, 32, 38, 62),
  p('vll-4',  'Joaquín Fernández',    4,  'DEF', 54, 68, 46, 18, 64, 30, 36, 60),
  p('vll-5',  'Lucas Rosa',           3,  'DEF', 62, 70, 50, 18, 62, 46, 40, 56),
  p('vll-6',  'Iván Sánchez',         8,  'MID', 56, 70, 58, 32, 54, 46, 52, 52),
  p('vll-7',  'Meseguer',             16, 'MID', 52, 70, 54, 30, 54, 42, 50, 50),
  p('vll-8',  'Sylla',                14, 'MID', 54, 68, 54, 30, 50, 44, 48, 50),
  p('vll-9',  'Selim Amallah',        10, 'FWD', 62, 68, 56, 60, 22, 58, 50, 54),
  p('vll-10', 'Raúl Moro',            11, 'FWD', 68, 68, 52, 58, 20, 60, 46, 52),
  p('vll-11', 'Toni Villa',           9,  'FWD', 64, 68, 46, 60, 18, 54, 38, 56),
];
const valladolidBench: Player[] = [
  p('vll-b1', 'Aitor Fernández',      1,  'GK',  32, 64, 40, 8,  10, 12, 42, 66),
  p('vll-b2', 'Lautaro Montoya',      18, 'DEF', 52, 66, 44, 16, 58, 32, 34, 54),
  p('vll-b3', 'Pomares',              22, 'DEF', 54, 66, 44, 16, 60, 32, 34, 56),
  p('vll-b4', 'Aguado',               6,  'MID', 50, 66, 52, 28, 50, 40, 46, 48),
  p('vll-b5', 'El Yamiq',             17, 'MID', 52, 66, 50, 28, 52, 38, 44, 48),
  p('vll-b6', 'Anuar',                7,  'FWD', 62, 64, 44, 52, 16, 54, 36, 46),
  p('vll-b7', 'Kike Pérez',           21, 'FWD', 56, 66, 42, 54, 16, 48, 34, 50),
];

// =========================================================================
// LEGANÉS (OVR 64)
// =========================================================================
const leganesXI: Player[] = [
  p('leg-1',  'Marko Dmitrović',      1,  'GK',  33, 66, 44, 8,  12, 14, 46, 72),
  p('leg-2',  'Sergio González',      2,  'DEF', 58, 68, 46, 16, 62, 40, 36, 56),
  p('leg-3',  'Miguel de la Fuente',  5,  'DEF', 54, 66, 44, 16, 62, 30, 34, 58),
  p('leg-4',  'Sergio Bustinza',      4,  'DEF', 52, 66, 44, 16, 60, 30, 34, 56),
  p('leg-5',  'Óscar Rodríguez',      3,  'DEF', 60, 68, 48, 16, 60, 44, 38, 54),
  p('leg-6',  'Gabriel Vega',         8,  'MID', 52, 68, 54, 28, 50, 42, 48, 48),
  p('leg-7',  'Darko Brasanac',       6,  'MID', 48, 68, 56, 28, 56, 38, 50, 50),
  p('leg-8',  'Renato Tapia',         15, 'MID', 52, 70, 56, 28, 60, 40, 50, 52),
  p('leg-9',  'Munir El Haddadi',     10, 'FWD', 64, 68, 54, 58, 20, 62, 48, 52),
  p('leg-10', 'Roberto Rosales',      7,  'FWD', 62, 66, 48, 56, 18, 56, 40, 52),
  p('leg-11', 'Yvan Neyou',           11, 'FWD', 64, 68, 48, 56, 22, 56, 40, 50),
];
const leganesBench: Player[] = [
  p('leg-b1', 'Iván Cuellar',         25, 'GK',  30, 62, 38, 8,  10, 12, 40, 64),
  p('leg-b2', 'Jonathan Silva',       17, 'DEF', 50, 64, 42, 14, 56, 30, 32, 52),
  p('leg-b3', 'Recio',                16, 'DEF', 52, 64, 42, 14, 56, 30, 32, 52),
  p('leg-b4', 'Cesc Fàbregas',        14, 'MID', 40, 60, 62, 28, 36, 42, 64, 46),
  p('leg-b5', 'Seydouba Cissé',       18, 'MID', 62, 64, 46, 36, 34, 56, 40, 44),
  p('leg-b6', 'Gaku Shibasaki',       19, 'FWD', 52, 62, 52, 46, 20, 50, 50, 44),
  p('leg-b7', 'Matija Nastasic',      9,  'FWD', 60, 66, 40, 58, 16, 44, 30, 52),
];

// ---------------------------------------------------------------------------
// LeagueDefinition export
// ---------------------------------------------------------------------------
export const laLiga: LeagueDefinition = {
  id: 'laliga',
  name: 'La Liga',
  country: 'Espanha',
  cupName: 'Copa del Rey',
  cupLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Copa_del_Rey_logo_%282021%29.svg/250px-Copa_del_Rey_logo_%282021%29.svg.png',
  flag: '🇪🇸',
  color: '#ff4d4d',
  logo: 'https://r2.thesportsdb.com/images/media/league/badge/ja4it51687628717.png',
  totalRounds: 38,
  teams: [
    makeFullTeam('rma', 'Real Madrid', 'RMA', '#FEBE10', '#00529F', 'https://r2.thesportsdb.com/images/media/team/badge/vwvwrw1473502969.png', realMadridXI, realMadridBench),
    makeFullTeam('fcb', 'Barcelona', 'FCB', '#A50044', '#004D98', 'https://r2.thesportsdb.com/images/media/team/badge/wq9sir1639406443.png', barcelonaXI, barcelonaBench),
    makeFullTeam('atm', 'Atlético Madrid', 'ATM', '#CB3524', '#27336C', 'https://r2.thesportsdb.com/images/media/team/badge/0ulh3q1719984315.png', atleticoXI, atleticoBench),
    makeFullTeam('rso', 'Real Sociedad', 'RSO', '#0B67C6', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/vptvpr1473502986.png', realSociedadXI, realSociedadBench),
    makeFullTeam('ath', 'Athletic Bilbao', 'ATH', '#EE2523', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/68w7fe1639408210.png', athleticBilbaoXI, athleticBilbaoBench),
    makeFullTeam('vil', 'Villarreal', 'VIL', '#FFE500', '#005187', 'https://r2.thesportsdb.com/images/media/team/badge/vrypqy1473503073.png', villarrealXI, villarrealBench),
    makeFullTeam('bet', 'Real Betis', 'BET', '#0A8C3E', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/2oqulv1663245386.png', realBetisXI, realBetisBench),
    makeFullTeam('sev', 'Sevilla', 'SEV', '#D50418', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/vpsqqx1473502977.png', sevillaXI, sevillaBench),
    makeFullTeam('val', 'Valencia', 'VAL', '#F8E250', '#EE3B33', 'https://r2.thesportsdb.com/images/media/team/badge/dm8l6o1655594864.png', valenciaXI, valenciaBench),
    makeFullTeam('gir', 'Girona', 'GIR', '#DA251D', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/kfu7zu1659897499.png', gironaXI, gironaBench),
    makeFullTeam('cel', 'Celta Vigo', 'CEL', '#87CEEB', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/xfjtku1690436219.png', celtaVigoXI, celtaVigoBench),
    makeFullTeam('osa', 'Osasuna', 'OSA', '#AC142C', '#0A3463', 'https://r2.thesportsdb.com/images/media/team/badge/rvspvt1473502960.png', osasunaXI, osasunaBench),
    makeFullTeam('get', 'Getafe', 'GET', '#004B9A', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/eyh2891655594452.png', getafeXI, getafeBench),
    makeFullTeam('mal', 'Mallorca', 'MAL', '#DD0000', '#FFDE00', 'https://r2.thesportsdb.com/images/media/team/badge/ssptsx1473503730.png', mallorcaXI, mallorcaBench),
    makeFullTeam('ray', 'Rayo Vallecano', 'RAY', '#D0122C', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/nzhu941655595465.png', rayoVallecanoXI, rayoVallecanoBench),
    makeFullTeam('ala', 'Alavés', 'ALA', '#004B9A', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/mfn99h1734673842.png', alavesXI, alavesBench),
    makeFullTeam('lpa', 'Las Palmas', 'LPA', '#FFDE00', '#004A9B', 'https://r2.thesportsdb.com/images/media/team/badge/mmhyb11616443601.png', lasPalmasXI, lasPalmasBench),
    makeFullTeam('esp', 'Espanyol', 'ESP', '#2167B0', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/867nzz1681703222.png', espanyolXI, espanyolBench),
    makeFullTeam('vll', 'Valladolid', 'VLL', '#7B2D8E', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/bnhu8b1719983736.png', valladolidXI, valladolidBench),
    makeFullTeam('leg', 'Leganés', 'LEG', '#007940', '#FFFFFF', 'https://r2.thesportsdb.com/images/media/team/badge/tm0adr1616443898.png', leganesXI, leganesBench),
  ],
  europeanSlots: { championsLeague: 4, europaLeague: 2, conferenceLeague: 1 },
  cpuProfile: { pressingMod: 0.95, defensiveLineMod: 1.0, tempoMod: 1.0, passingFocusMod: 1.05 },
  relegationSpots: 3,
};
