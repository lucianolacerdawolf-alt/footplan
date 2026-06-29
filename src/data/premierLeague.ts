// @deprecated — Legacy data file. Now used as data source for src/data/leagues/premierLeague.ts.
// Do not import directly in new code — use getLeague('pl') from src/data/leagues instead.
import type { Team, Player } from '../engine/types';

// ---------------------------------------------------------------------------
// PREMIER LEAGUE 2025/26 — 20 times com elencos realistas
// Escala 1-99: 90+ elite, 85-89 craque, 80-84 muito bom, 75-79 bom, 70-74 médio
// ---------------------------------------------------------------------------

function p(
  id: string, name: string, number: number, pos: Player['position'],
  speed: number, stamina: number, passing: number, finishing: number,
  tackling: number, dribbling: number, vision: number, positioning: number
): Player {
  return { id, name, number, position: pos, attributes: { speed, stamina, passing, finishing, tackling, dribbling, vision, positioning }, currentFatigue: 0 };
}

// =========================================================================
// ARSENAL
// =========================================================================
const arsenalXI: Player[] = [
  p('ars-1', 'David Raya', 22, 'GK', 38, 72, 55, 14, 18, 22, 58, 86),
  p('ars-2', 'William Saliba', 2, 'DEF', 72, 84, 68, 32, 88, 54, 65, 90),
  p('ars-3', 'Gabriel Magalhães', 6, 'DEF', 65, 82, 62, 45, 90, 48, 58, 88),
  p('ars-4', 'Ben White', 4, 'DEF', 74, 85, 70, 38, 82, 62, 60, 84),
  p('ars-5', 'Jurriën Timber', 12, 'DEF', 76, 80, 72, 30, 80, 68, 62, 78),
  p('ars-6', 'Declan Rice', 41, 'MID', 75, 90, 82, 55, 85, 68, 78, 82),
  p('ars-7', 'Martin Ødegaard', 8, 'MID', 68, 82, 92, 65, 45, 82, 94, 75),
  p('ars-8', 'Thomas Partey', 5, 'MID', 62, 78, 78, 50, 80, 55, 72, 76),
  p('ars-9', 'Bukayo Saka', 7, 'FWD', 86, 84, 82, 78, 48, 88, 82, 80),
  p('ars-10', 'Kai Havertz', 29, 'FWD', 74, 82, 74, 80, 52, 72, 76, 82),
  p('ars-11', 'Gabriel Martinelli', 11, 'FWD', 90, 80, 68, 75, 42, 86, 68, 74),
];
const arsenalBench: Player[] = [
  p('ars-b1', 'Aaron Ramsdale', 1, 'GK', 37, 68, 50, 10, 14, 18, 52, 78),
  p('ars-b2', 'Jakub Kiwior', 15, 'DEF', 62, 76, 60, 28, 76, 48, 54, 74),
  p('ars-b3', 'Oleksandr Zinchenko', 35, 'DEF', 66, 78, 78, 30, 62, 72, 76, 66),
  p('ars-b4', 'Jorginho', 20, 'MID', 45, 74, 84, 42, 55, 50, 86, 68),
  p('ars-b5', 'Mikel Merino', 23, 'MID', 58, 80, 76, 52, 72, 58, 70, 74),
  p('ars-b6', 'Leandro Trossard', 19, 'FWD', 72, 78, 74, 76, 35, 78, 72, 70),
  p('ars-b7', 'Gabriel Jesus', 9, 'FWD', 80, 78, 68, 78, 30, 84, 68, 74),
];

// =========================================================================
// ASTON VILLA
// =========================================================================
const astonVillaXI: Player[] = [
  p('avl-1', 'Emiliano Martínez', 1, 'GK', 35, 75, 50, 12, 16, 20, 55, 90),
  p('avl-2', 'Ezri Konsa', 4, 'DEF', 68, 82, 62, 30, 84, 50, 55, 82),
  p('avl-3', 'Pau Torres', 14, 'DEF', 62, 78, 75, 28, 78, 52, 72, 80),
  p('avl-4', 'Lucas Digne', 12, 'DEF', 76, 82, 72, 35, 72, 65, 68, 74),
  p('avl-5', 'Matty Cash', 2, 'DEF', 78, 84, 65, 32, 76, 62, 58, 72),
  p('avl-6', 'Youri Tielemans', 8, 'MID', 60, 80, 85, 58, 58, 68, 84, 72),
  p('avl-7', 'Boubacar Kamara', 44, 'MID', 64, 82, 74, 40, 84, 60, 68, 80),
  p('avl-8', 'John McGinn', 7, 'MID', 66, 86, 76, 55, 68, 64, 76, 70),
  p('avl-9', 'Morgan Rogers', 27, 'FWD', 78, 78, 72, 72, 38, 80, 70, 68),
  p('avl-10', 'Ollie Watkins', 11, 'FWD', 84, 84, 62, 88, 28, 72, 64, 86),
  p('avl-11', 'Leon Bailey', 31, 'FWD', 90, 76, 62, 68, 30, 86, 62, 64),
];
const astonVillaBench: Player[] = [
  p('avl-b1', 'Robin Olsen', 25, 'GK', 33, 68, 44, 10, 12, 15, 48, 72),
  p('avl-b2', 'Diego Carlos', 3, 'DEF', 58, 76, 56, 34, 80, 44, 50, 78),
  p('avl-b3', 'Ian Maatsen', 22, 'DEF', 82, 78, 64, 28, 68, 72, 58, 66),
  p('avl-b4', 'Amadou Onana', 24, 'MID', 66, 82, 72, 46, 78, 60, 66, 76),
  p('avl-b5', 'Ross Barkley', 6, 'MID', 56, 74, 74, 56, 52, 62, 72, 64),
  p('avl-b6', 'Emiliano Buendía', 10, 'FWD', 64, 76, 78, 62, 32, 76, 78, 62),
  p('avl-b7', 'Jhon Durán', 9, 'FWD', 78, 72, 46, 74, 18, 62, 44, 66),
];

// =========================================================================
// BOURNEMOUTH
// =========================================================================
const bournemouthXI: Player[] = [
  p('bou-1', 'Neto', 1, 'GK', 36, 70, 48, 12, 15, 20, 52, 78),
  p('bou-2', 'Illia Zabarnyi', 27, 'DEF', 62, 80, 58, 24, 82, 42, 54, 80),
  p('bou-3', 'Marcos Senesi', 25, 'DEF', 58, 78, 62, 28, 80, 48, 56, 78),
  p('bou-4', 'Milos Kerkez', 3, 'DEF', 78, 82, 64, 28, 72, 68, 56, 70),
  p('bou-5', 'Adam Smith', 15, 'DEF', 72, 78, 60, 25, 74, 58, 52, 72),
  p('bou-6', 'Lewis Cook', 4, 'MID', 56, 80, 74, 38, 70, 54, 70, 68),
  p('bou-7', 'Ryan Christie', 10, 'MID', 64, 84, 72, 52, 56, 62, 72, 66),
  p('bou-8', 'Alex Scott', 14, 'MID', 62, 78, 76, 48, 50, 72, 76, 64),
  p('bou-9', 'Antoine Semenyo', 24, 'FWD', 84, 80, 58, 72, 30, 78, 58, 66),
  p('bou-10', 'Dominic Solanke', 9, 'FWD', 78, 82, 58, 82, 22, 68, 60, 80),
  p('bou-11', 'Justin Kluivert', 19, 'FWD', 82, 76, 64, 68, 28, 82, 62, 62),
];
const bournemouthBench: Player[] = [
  p('bou-b1', 'Mark Travers', 42, 'GK', 34, 66, 44, 10, 12, 14, 46, 70),
  p('bou-b2', 'Chris Mepham', 6, 'DEF', 52, 74, 50, 26, 76, 40, 46, 74),
  p('bou-b3', 'James Hill', 23, 'DEF', 56, 72, 48, 22, 72, 42, 44, 68),
  p('bou-b4', 'Philip Billing', 29, 'MID', 52, 76, 66, 52, 56, 50, 62, 66),
  p('bou-b5', 'David Brooks', 7, 'MID', 62, 74, 70, 58, 38, 68, 68, 60),
  p('bou-b6', 'Dango Ouattara', 11, 'FWD', 84, 76, 52, 58, 26, 76, 48, 56),
  p('bou-b7', 'Enes Ünal', 26, 'FWD', 54, 72, 48, 74, 20, 52, 44, 68),
];

// =========================================================================
// BRENTFORD
// =========================================================================
const brentfordXI: Player[] = [
  p('bre-1', 'Mark Flekken', 1, 'GK', 34, 72, 55, 10, 14, 18, 56, 80),
  p('bre-2', 'Ethan Pinnock', 5, 'DEF', 56, 80, 52, 35, 84, 38, 50, 82),
  p('bre-3', 'Nathan Collins', 22, 'DEF', 60, 78, 58, 28, 80, 44, 52, 78),
  p('bre-4', 'Rico Henry', 3, 'DEF', 85, 82, 62, 24, 76, 68, 56, 72),
  p('bre-5', 'Aaron Hickey', 2, 'DEF', 72, 80, 64, 28, 74, 62, 54, 70),
  p('bre-6', 'Christian Nørgaard', 6, 'MID', 54, 82, 72, 42, 78, 48, 68, 76),
  p('bre-7', 'Mathias Jensen', 8, 'MID', 58, 80, 78, 50, 50, 62, 78, 66),
  p('bre-8', 'Vitaly Janelt', 27, 'MID', 56, 84, 68, 45, 76, 50, 62, 72),
  p('bre-9', 'Bryan Mbeumo', 19, 'FWD', 84, 82, 68, 78, 32, 82, 70, 74),
  p('bre-10', 'Yoane Wissa', 11, 'FWD', 82, 80, 58, 80, 25, 76, 58, 76),
  p('bre-11', 'Kevin Schade', 7, 'FWD', 90, 76, 52, 65, 22, 78, 50, 62),
];
const brentfordBench: Player[] = [
  p('bre-b1', 'Hákon Valdimarsson', 12, 'GK', 32, 66, 42, 8, 12, 14, 44, 68),
  p('bre-b2', 'Ben Mee', 16, 'DEF', 42, 72, 46, 30, 78, 32, 44, 76),
  p('bre-b3', 'Mads Roerslev', 30, 'DEF', 68, 76, 54, 20, 70, 56, 48, 66),
  p('bre-b4', 'Frank Onyeka', 15, 'MID', 64, 82, 60, 38, 74, 52, 52, 68),
  p('bre-b5', 'Keane Lewis-Potter', 23, 'MID', 74, 78, 58, 52, 40, 72, 54, 58),
  p('bre-b6', 'Mikkel Damsgaard', 24, 'FWD', 66, 76, 76, 56, 30, 72, 74, 58),
  p('bre-b7', 'Igor Thiago', 9, 'FWD', 72, 76, 44, 72, 18, 56, 40, 64),
];

// =========================================================================
// BRIGHTON
// =========================================================================
const brightonXI: Player[] = [
  p('bri-1', 'Bart Verbruggen', 1, 'GK', 36, 68, 58, 10, 14, 22, 58, 78),
  p('bri-2', 'Lewis Dunk', 5, 'DEF', 54, 78, 64, 32, 84, 44, 60, 84),
  p('bri-3', 'Jan Paul van Hecke', 29, 'DEF', 58, 76, 60, 24, 78, 42, 54, 76),
  p('bri-4', 'Pervis Estupiñán', 30, 'DEF', 80, 82, 68, 30, 74, 68, 62, 72),
  p('bri-5', 'Tariq Lamptey', 2, 'DEF', 88, 76, 60, 24, 68, 78, 54, 64),
  p('bri-6', 'Carlos Baleba', 20, 'MID', 66, 80, 72, 42, 74, 64, 68, 70),
  p('bri-7', 'Billy Gilmour', 11, 'MID', 54, 78, 80, 38, 55, 62, 80, 64),
  p('bri-8', 'Pascal Groß', 13, 'MID', 50, 86, 84, 48, 60, 52, 86, 72),
  p('bri-9', 'Kaoru Mitoma', 22, 'FWD', 86, 82, 72, 70, 35, 90, 72, 68),
  p('bri-10', 'João Pedro', 9, 'FWD', 78, 80, 68, 78, 25, 82, 68, 72),
  p('bri-11', 'Simon Adingra', 24, 'FWD', 84, 78, 60, 65, 28, 82, 58, 62),
];
const brightonBench: Player[] = [
  p('bri-b1', 'Jason Steele', 23, 'GK', 34, 66, 52, 8, 12, 16, 50, 72),
  p('bri-b2', 'Adam Webster', 4, 'DEF', 50, 74, 54, 28, 78, 42, 48, 76),
  p('bri-b3', 'Joël Veltman', 34, 'DEF', 60, 76, 58, 22, 74, 50, 52, 72),
  p('bri-b4', 'Matt O\'Riley', 33, 'MID', 58, 76, 78, 52, 48, 64, 76, 62),
  p('bri-b5', 'Yankuba Minteh', 17, 'MID', 84, 74, 56, 58, 28, 80, 52, 54),
  p('bri-b6', 'Julio Enciso', 10, 'FWD', 74, 72, 66, 64, 24, 74, 62, 58),
  p('bri-b7', 'Evan Ferguson', 28, 'FWD', 68, 74, 48, 76, 22, 56, 46, 68),
];

// =========================================================================
// CHELSEA
// =========================================================================
const chelseaXI: Player[] = [
  p('che-1', 'Robert Sánchez', 1, 'GK', 38, 72, 52, 12, 16, 18, 54, 80),
  p('che-2', 'Reece James', 24, 'DEF', 78, 80, 76, 40, 84, 72, 72, 82),
  p('che-3', 'Levi Colwill', 6, 'DEF', 62, 78, 68, 28, 80, 54, 60, 80),
  p('che-4', 'Benoît Badiashile', 5, 'DEF', 60, 76, 64, 26, 82, 48, 56, 78),
  p('che-5', 'Marc Cucurella', 3, 'DEF', 72, 84, 68, 24, 76, 64, 60, 74),
  p('che-6', 'Moises Caicedo', 25, 'MID', 68, 86, 78, 48, 86, 64, 72, 80),
  p('che-7', 'Enzo Fernández', 8, 'MID', 58, 80, 86, 58, 58, 70, 88, 70),
  p('che-8', 'Cole Palmer', 20, 'FWD', 72, 78, 84, 82, 38, 84, 86, 78),
  p('che-9', 'Christopher Nkunku', 10, 'FWD', 80, 78, 76, 84, 30, 86, 78, 76),
  p('che-10', 'Nicolas Jackson', 15, 'FWD', 84, 82, 58, 78, 24, 76, 56, 74),
  p('che-11', 'Raheem Sterling', 7, 'FWD', 88, 78, 66, 74, 28, 86, 64, 68),
];
const chelseaBench: Player[] = [
  p('che-b1', 'Filip Jörgensen', 12, 'GK', 36, 68, 48, 10, 14, 18, 50, 74),
  p('che-b2', 'Axel Disasi', 2, 'DEF', 54, 78, 54, 30, 80, 42, 48, 78),
  p('che-b3', 'Malo Gusto', 27, 'DEF', 78, 80, 64, 22, 72, 68, 56, 70),
  p('che-b4', 'Roméo Lavia', 45, 'MID', 62, 76, 74, 42, 72, 58, 68, 66),
  p('che-b5', 'Kiernan Dewsbury-Hall', 22, 'MID', 58, 80, 76, 52, 48, 64, 74, 64),
  p('che-b6', 'Noni Madueke', 11, 'FWD', 82, 74, 58, 62, 28, 82, 54, 56),
  p('che-b7', 'Mykhailo Mudryk', 10, 'FWD', 92, 72, 54, 58, 22, 82, 50, 52),
];

// =========================================================================
// CRYSTAL PALACE
// =========================================================================
const crystalPalaceXI: Player[] = [
  p('cry-1', 'Dean Henderson', 1, 'GK', 36, 72, 48, 12, 14, 16, 52, 82),
  p('cry-2', 'Marc Guéhi', 6, 'DEF', 64, 82, 58, 28, 86, 46, 56, 84),
  p('cry-3', 'Joachim Andersen', 5, 'DEF', 52, 80, 62, 30, 82, 40, 58, 80),
  p('cry-4', 'Tyrick Mitchell', 3, 'DEF', 74, 84, 62, 22, 78, 60, 54, 76),
  p('cry-5', 'Daniel Muñoz', 12, 'DEF', 78, 82, 58, 28, 72, 64, 52, 70),
  p('cry-6', 'Jefferson Lerma', 8, 'MID', 60, 82, 68, 48, 78, 52, 62, 74),
  p('cry-7', 'Will Hughes', 19, 'MID', 54, 80, 72, 38, 64, 54, 68, 66),
  p('cry-8', 'Eberechi Eze', 10, 'FWD', 78, 80, 78, 74, 32, 88, 80, 70),
  p('cry-9', 'Michael Olise', 7, 'FWD', 80, 78, 82, 72, 30, 86, 82, 66),
  p('cry-10', 'Jean-Philippe Mateta', 14, 'FWD', 72, 80, 52, 78, 22, 62, 50, 76),
  p('cry-11', 'Odsonne Édouard', 22, 'FWD', 76, 78, 54, 76, 20, 68, 52, 72),
];
const crystalPalaceBench: Player[] = [
  p('cry-b1', 'Sam Johnstone', 1, 'GK', 35, 70, 44, 10, 12, 14, 48, 74),
  p('cry-b2', 'Chris Richards', 26, 'DEF', 60, 76, 54, 24, 76, 44, 48, 72),
  p('cry-b3', 'Nathaniel Clyne', 17, 'DEF', 62, 74, 52, 20, 72, 50, 46, 70),
  p('cry-b4', 'Cheick Doucouré', 28, 'MID', 60, 82, 66, 40, 80, 54, 58, 72),
  p('cry-b5', 'Daichi Kamada', 18, 'MID', 58, 78, 78, 54, 42, 68, 76, 62),
  p('cry-b6', 'Ismaïla Sarr', 23, 'FWD', 88, 76, 54, 62, 28, 80, 50, 56),
  p('cry-b7', 'Eddie Nketiah', 9, 'FWD', 76, 78, 50, 76, 20, 64, 46, 68),
];

// =========================================================================
// EVERTON
// =========================================================================
const evertonXI: Player[] = [
  p('eve-1', 'Jordan Pickford', 1, 'GK', 40, 76, 58, 14, 18, 22, 60, 88),
  p('eve-2', 'James Tarkowski', 6, 'DEF', 48, 82, 52, 40, 88, 36, 50, 86),
  p('eve-3', 'Jarrad Branthwaite', 32, 'DEF', 58, 78, 54, 28, 84, 42, 50, 82),
  p('eve-4', 'Vitaliy Mykolenko', 19, 'DEF', 68, 80, 56, 22, 78, 54, 48, 76),
  p('eve-5', 'Séamus Coleman', 23, 'DEF', 62, 76, 54, 24, 76, 52, 50, 74),
  p('eve-6', 'Amadou Onana', 8, 'MID', 66, 82, 70, 45, 82, 58, 64, 76),
  p('eve-7', 'Idrissa Gueye', 27, 'MID', 62, 84, 68, 38, 80, 52, 58, 74),
  p('eve-8', 'James Garner', 37, 'MID', 58, 80, 74, 48, 62, 56, 72, 66),
  p('eve-9', 'Dwight McNeil', 7, 'FWD', 72, 82, 74, 62, 40, 74, 70, 64),
  p('eve-10', 'Dominic Calvert-Lewin', 9, 'FWD', 76, 78, 50, 82, 22, 60, 48, 80),
  p('eve-11', 'Jack Harrison', 11, 'FWD', 78, 80, 64, 60, 38, 72, 58, 62),
];
const evertonBench: Player[] = [
  p('eve-b1', 'João Virgínia', 1, 'GK', 34, 66, 42, 8, 12, 14, 44, 68),
  p('eve-b2', 'Michael Keane', 5, 'DEF', 42, 72, 48, 36, 76, 30, 44, 74),
  p('eve-b3', 'Ashley Young', 18, 'DEF', 56, 70, 56, 20, 68, 48, 52, 66),
  p('eve-b4', 'Abdoulaye Doucouré', 16, 'MID', 56, 78, 66, 52, 68, 52, 58, 68),
  p('eve-b5', 'Tim Iroegbunam', 42, 'MID', 60, 74, 62, 38, 66, 54, 54, 62),
  p('eve-b6', 'Youssef Chermiti', 28, 'FWD', 68, 72, 44, 66, 18, 56, 40, 60),
  p('eve-b7', 'Beto', 14, 'FWD', 72, 74, 40, 72, 16, 52, 36, 64),
];

// =========================================================================
// FULHAM
// =========================================================================
const fulhamXI: Player[] = [
  p('ful-1', 'Bernd Leno', 1, 'GK', 36, 74, 52, 10, 14, 18, 54, 84),
  p('ful-2', 'Calvin Bassey', 3, 'DEF', 66, 78, 56, 24, 80, 48, 50, 76),
  p('ful-3', 'Issa Diop', 31, 'DEF', 58, 76, 52, 26, 78, 40, 48, 74),
  p('ful-4', 'Antonee Robinson', 33, 'DEF', 84, 86, 64, 22, 76, 66, 56, 72),
  p('ful-5', 'Timothy Castagne', 21, 'DEF', 72, 82, 60, 28, 74, 58, 54, 74),
  p('ful-6', 'João Palhinha', 26, 'MID', 58, 84, 68, 42, 90, 48, 60, 82),
  p('ful-7', 'Andreas Pereira', 18, 'MID', 60, 80, 80, 58, 48, 68, 78, 66),
  p('ful-8', 'Sasa Lukic', 28, 'MID', 56, 82, 72, 45, 70, 54, 66, 70),
  p('ful-9', 'Willian', 20, 'FWD', 74, 76, 78, 60, 28, 82, 76, 62),
  p('ful-10', 'Rodrigo Muniz', 19, 'FWD', 72, 78, 48, 78, 22, 62, 46, 74),
  p('ful-11', 'Alex Iwobi', 22, 'FWD', 76, 82, 68, 58, 40, 72, 64, 60),
];
const fulhamBench: Player[] = [
  p('ful-b1', 'Marek Rodák', 1, 'GK', 34, 66, 42, 8, 12, 14, 44, 68),
  p('ful-b2', 'Kenny Tete', 2, 'DEF', 70, 78, 54, 22, 74, 56, 48, 70),
  p('ful-b3', 'Jorge Cuenca', 5, 'DEF', 54, 72, 50, 24, 74, 40, 46, 70),
  p('ful-b4', 'Harrison Reed', 6, 'MID', 52, 78, 66, 38, 64, 50, 62, 66),
  p('ful-b5', 'Emile Smith Rowe', 32, 'MID', 64, 74, 78, 56, 40, 72, 76, 62),
  p('ful-b6', 'Adama Traoré', 11, 'FWD', 96, 74, 48, 52, 22, 80, 44, 48),
  p('ful-b7', 'Raúl Jiménez', 7, 'FWD', 52, 72, 52, 72, 18, 54, 54, 68),
];

// =========================================================================
// IPSWICH TOWN
// =========================================================================
const ipswichXI: Player[] = [
  p('ips-1', 'Christian Walton', 1, 'GK', 34, 68, 46, 10, 12, 16, 48, 72),
  p('ips-2', 'Luke Woolfenden', 6, 'DEF', 50, 74, 48, 28, 74, 34, 44, 72),
  p('ips-3', 'Cameron Burgess', 15, 'DEF', 45, 72, 46, 32, 72, 30, 42, 70),
  p('ips-4', 'Leif Davis', 3, 'DEF', 72, 80, 62, 24, 68, 60, 56, 66),
  p('ips-5', 'Axel Tuanzebe', 40, 'DEF', 62, 74, 50, 22, 72, 46, 46, 70),
  p('ips-6', 'Sam Morsy', 5, 'MID', 48, 78, 64, 38, 72, 44, 58, 68),
  p('ips-7', 'Massimo Luongo', 25, 'MID', 52, 76, 62, 42, 66, 48, 56, 64),
  p('ips-8', 'Conor Chaplin', 10, 'MID', 58, 78, 68, 58, 38, 62, 64, 60),
  p('ips-9', 'Wes Burns', 7, 'FWD', 82, 76, 56, 52, 28, 68, 50, 56),
  p('ips-10', 'George Hirst', 27, 'FWD', 62, 74, 42, 68, 18, 48, 40, 66),
  p('ips-11', 'Nathan Broadhead', 33, 'FWD', 74, 72, 54, 62, 22, 72, 52, 58),
];
const ipswichBench: Player[] = [
  p('ips-b1', 'Vaclav Hladky', 31, 'GK', 32, 64, 40, 8, 10, 12, 42, 66),
  p('ips-b2', 'Jacob Greaves', 4, 'DEF', 48, 72, 44, 24, 70, 36, 40, 68),
  p('ips-b3', 'Ben Johnson', 18, 'DEF', 64, 74, 50, 20, 68, 52, 44, 64),
  p('ips-b4', 'Jens Cajuste', 12, 'MID', 56, 74, 62, 38, 62, 50, 56, 60),
  p('ips-b5', 'Omari Hutchinson', 20, 'MID', 72, 72, 62, 54, 30, 74, 56, 54),
  p('ips-b6', 'Marcus Harness', 11, 'FWD', 66, 74, 56, 56, 28, 64, 50, 54),
  p('ips-b7', 'Liam Delap', 19, 'FWD', 70, 72, 38, 64, 18, 52, 36, 58),
];

// =========================================================================
// LEICESTER CITY
// =========================================================================
const leicesterXI: Player[] = [
  p('lei-1', 'Mads Hermansen', 1, 'GK', 38, 70, 54, 10, 14, 20, 56, 76),
  p('lei-2', 'Wout Faes', 3, 'DEF', 56, 78, 52, 30, 78, 40, 48, 76),
  p('lei-3', 'Jannik Vestergaard', 23, 'DEF', 40, 74, 58, 32, 76, 34, 52, 74),
  p('lei-4', 'James Justin', 2, 'DEF', 74, 80, 58, 28, 74, 60, 52, 72),
  p('lei-5', 'Ricardo Pereira', 21, 'DEF', 72, 78, 62, 26, 72, 64, 56, 70),
  p('lei-6', 'Harry Winks', 8, 'MID', 50, 78, 76, 38, 56, 54, 74, 64),
  p('lei-7', 'Wilfred Ndidi', 25, 'MID', 58, 84, 64, 42, 84, 50, 56, 76),
  p('lei-8', 'Facundo Buonanotte', 40, 'MID', 68, 74, 72, 54, 38, 76, 68, 58),
  p('lei-9', 'Stephy Mavididi', 10, 'FWD', 82, 78, 58, 66, 24, 78, 54, 60),
  p('lei-10', 'Jamie Vardy', 9, 'FWD', 80, 74, 48, 82, 18, 62, 46, 78),
  p('lei-11', 'Patson Daka', 20, 'FWD', 86, 76, 42, 72, 20, 66, 42, 68),
];
const leicesterBench: Player[] = [
  p('lei-b1', 'Danny Ward', 1, 'GK', 33, 66, 42, 8, 12, 14, 44, 68),
  p('lei-b2', 'Conor Coady', 4, 'DEF', 40, 74, 48, 30, 76, 30, 46, 74),
  p('lei-b3', 'Caleb Okoli', 5, 'DEF', 54, 72, 44, 22, 72, 38, 40, 68),
  p('lei-b4', 'Boubakary Soumaré', 24, 'MID', 54, 76, 66, 36, 68, 52, 58, 64),
  p('lei-b5', 'Bobby De Cordova-Reid', 14, 'MID', 68, 78, 62, 54, 42, 66, 56, 60),
  p('lei-b6', 'Kasey McAteer', 35, 'FWD', 72, 74, 52, 56, 28, 66, 46, 54),
  p('lei-b7', 'Jordan Ayew', 18, 'FWD', 62, 78, 58, 58, 36, 64, 54, 60),
];

// =========================================================================
// LIVERPOOL
// =========================================================================
const liverpoolXI: Player[] = [
  p('liv-1', 'Alisson', 1, 'GK', 42, 76, 60, 14, 20, 24, 64, 92),
  p('liv-2', 'Virgil van Dijk', 4, 'DEF', 68, 88, 76, 48, 94, 58, 72, 94),
  p('liv-3', 'Ibrahima Konaté', 5, 'DEF', 70, 82, 64, 34, 88, 52, 58, 86),
  p('liv-4', 'Trent Alexander-Arnold', 66, 'DEF', 74, 84, 92, 54, 62, 74, 94, 72),
  p('liv-5', 'Andy Robertson', 26, 'DEF', 78, 88, 74, 35, 78, 68, 72, 80),
  p('liv-6', 'Ryan Gravenberch', 38, 'MID', 64, 80, 78, 48, 58, 76, 74, 68),
  p('liv-7', 'Alexis Mac Allister', 10, 'MID', 60, 84, 86, 58, 66, 74, 86, 76),
  p('liv-8', 'Dominik Szoboszlai', 8, 'MID', 72, 84, 82, 68, 48, 78, 82, 72),
  p('liv-9', 'Mohamed Salah', 11, 'FWD', 88, 86, 78, 94, 30, 88, 82, 92),
  p('liv-10', 'Darwin Núñez', 9, 'FWD', 86, 82, 56, 82, 24, 68, 52, 76),
  p('liv-11', 'Luis Díaz', 7, 'FWD', 88, 82, 68, 78, 32, 88, 68, 74),
];
const liverpoolBench: Player[] = [
  p('liv-b1', 'Caoimhín Kelleher', 62, 'GK', 36, 68, 52, 10, 14, 18, 52, 78),
  p('liv-b2', 'Joe Gomez', 2, 'DEF', 72, 80, 62, 28, 80, 56, 54, 78),
  p('liv-b3', 'Jarell Quansah', 78, 'DEF', 64, 74, 58, 26, 76, 46, 50, 74),
  p('liv-b4', 'Wataru Endo', 3, 'MID', 54, 82, 68, 38, 78, 48, 60, 74),
  p('liv-b5', 'Harvey Elliott', 19, 'MID', 60, 76, 80, 56, 42, 74, 78, 62),
  p('liv-b6', 'Cody Gakpo', 18, 'FWD', 76, 80, 72, 78, 32, 78, 70, 72),
  p('liv-b7', 'Diogo Jota', 20, 'FWD', 80, 78, 62, 86, 28, 76, 62, 80),
];

// =========================================================================
// MANCHESTER CITY
// =========================================================================
const manCityXI: Player[] = [
  p('mci-1', 'Ederson', 31, 'GK', 44, 78, 78, 16, 22, 28, 72, 88),
  p('mci-2', 'Rúben Dias', 3, 'DEF', 58, 86, 70, 38, 92, 48, 64, 94),
  p('mci-3', 'John Stones', 5, 'DEF', 60, 82, 74, 40, 86, 56, 68, 88),
  p('mci-4', 'Joško Gvardiol', 24, 'DEF', 68, 84, 72, 38, 86, 62, 64, 84),
  p('mci-5', 'Kyle Walker', 2, 'DEF', 86, 82, 66, 28, 80, 64, 58, 80),
  p('mci-6', 'Rodri', 16, 'MID', 56, 90, 88, 52, 90, 60, 86, 92),
  p('mci-7', 'Kevin De Bruyne', 17, 'MID', 62, 80, 96, 72, 42, 74, 98, 78),
  p('mci-8', 'Bernardo Silva', 20, 'MID', 68, 86, 86, 62, 52, 88, 86, 76),
  p('mci-9', 'Phil Foden', 47, 'FWD', 78, 82, 84, 80, 35, 88, 84, 80),
  p('mci-10', 'Erling Haaland', 9, 'FWD', 86, 86, 58, 98, 22, 72, 60, 94),
  p('mci-11', 'Jérémy Doku', 11, 'FWD', 94, 78, 64, 68, 28, 92, 62, 64),
];
const manCityBench: Player[] = [
  p('mci-b1', 'Stefan Ortega', 18, 'GK', 38, 70, 58, 10, 14, 20, 56, 80),
  p('mci-b2', 'Nathan Aké', 6, 'DEF', 64, 80, 66, 32, 84, 54, 58, 82),
  p('mci-b3', 'Manuel Akanji', 25, 'DEF', 68, 82, 68, 30, 84, 56, 60, 82),
  p('mci-b4', 'Mateo Kovacic', 8, 'MID', 56, 78, 82, 48, 58, 68, 80, 68),
  p('mci-b5', 'Matheus Nunes', 27, 'MID', 64, 80, 78, 52, 52, 72, 74, 64),
  p('mci-b6', 'Jack Grealish', 10, 'FWD', 68, 78, 80, 58, 32, 84, 78, 62),
  p('mci-b7', 'Oscar Bobb', 52, 'FWD', 74, 72, 72, 62, 28, 82, 68, 56),
];

// =========================================================================
// MANCHESTER UNITED
// =========================================================================
const manUtdXI: Player[] = [
  p('mun-1', 'André Onana', 24, 'GK', 40, 74, 64, 12, 16, 24, 62, 84),
  p('mun-2', 'Lisandro Martínez', 6, 'DEF', 60, 82, 72, 32, 88, 54, 66, 86),
  p('mun-3', 'Raphaël Varane', 19, 'DEF', 64, 78, 58, 34, 86, 46, 56, 84),
  p('mun-4', 'Diogo Dalot', 20, 'DEF', 76, 84, 68, 32, 76, 66, 58, 76),
  p('mun-5', 'Luke Shaw', 23, 'DEF', 72, 80, 72, 30, 76, 64, 66, 78),
  p('mun-6', 'Casemiro', 18, 'MID', 48, 78, 72, 48, 86, 44, 66, 82),
  p('mun-7', 'Kobbie Mainoo', 37, 'MID', 58, 78, 78, 48, 64, 72, 76, 68),
  p('mun-8', 'Bruno Fernandes', 8, 'MID', 64, 86, 92, 76, 45, 74, 94, 78),
  p('mun-9', 'Marcus Rashford', 10, 'FWD', 90, 80, 68, 82, 28, 84, 66, 76),
  p('mun-10', 'Rasmus Højlund', 11, 'FWD', 82, 80, 48, 80, 22, 66, 46, 76),
  p('mun-11', 'Alejandro Garnacho', 17, 'FWD', 88, 78, 58, 68, 24, 86, 56, 62),
];
const manUtdBench: Player[] = [
  p('mun-b1', 'Altay Bayindir', 1, 'GK', 36, 66, 46, 8, 14, 18, 48, 72),
  p('mun-b2', 'Harry Maguire', 5, 'DEF', 40, 74, 54, 38, 80, 34, 52, 78),
  p('mun-b3', 'Noussair Mazraoui', 3, 'DEF', 72, 78, 64, 26, 74, 62, 54, 72),
  p('mun-b4', 'Mason Mount', 7, 'MID', 64, 78, 78, 58, 48, 68, 76, 64),
  p('mun-b5', 'Christian Eriksen', 14, 'MID', 42, 72, 86, 52, 38, 56, 88, 60),
  p('mun-b6', 'Antony', 21, 'FWD', 74, 74, 58, 56, 30, 84, 52, 50),
  p('mun-b7', 'Joshua Zirkzee', 9, 'FWD', 66, 76, 62, 70, 22, 70, 58, 64),
];

// =========================================================================
// NEWCASTLE UNITED
// =========================================================================
const newcastleXI: Player[] = [
  p('new-1', 'Nick Pope', 1, 'GK', 36, 74, 48, 10, 14, 16, 50, 86),
  p('new-2', 'Sven Botman', 4, 'DEF', 54, 82, 60, 30, 88, 44, 56, 86),
  p('new-3', 'Fabian Schär', 5, 'DEF', 50, 80, 64, 38, 82, 46, 60, 84),
  p('new-4', 'Kieran Trippier', 2, 'DEF', 66, 82, 82, 36, 72, 58, 78, 76),
  p('new-5', 'Dan Burn', 33, 'DEF', 42, 80, 50, 38, 84, 34, 46, 82),
  p('new-6', 'Bruno Guimarães', 39, 'MID', 58, 84, 88, 52, 68, 70, 88, 76),
  p('new-7', 'Joelinton', 7, 'MID', 66, 86, 70, 54, 76, 62, 64, 74),
  p('new-8', 'Sandro Tonali', 8, 'MID', 64, 84, 82, 50, 72, 64, 80, 72),
  p('new-9', 'Anthony Gordon', 10, 'FWD', 86, 84, 68, 72, 35, 82, 66, 68),
  p('new-10', 'Alexander Isak', 14, 'FWD', 84, 82, 58, 88, 24, 82, 58, 82),
  p('new-11', 'Miguel Almirón', 24, 'FWD', 84, 82, 62, 68, 32, 78, 58, 64),
];
const newcastleBench: Player[] = [
  p('new-b1', 'Martin Dúbravka', 1, 'GK', 34, 68, 42, 8, 12, 14, 44, 72),
  p('new-b2', 'Jamaal Lascelles', 6, 'DEF', 44, 74, 48, 32, 80, 34, 44, 78),
  p('new-b3', 'Lewis Hall', 20, 'DEF', 72, 76, 62, 24, 68, 64, 56, 66),
  p('new-b4', 'Sean Longstaff', 36, 'MID', 52, 80, 66, 48, 64, 50, 58, 68),
  p('new-b5', 'Joe Willock', 28, 'MID', 68, 78, 68, 54, 48, 66, 62, 62),
  p('new-b6', 'Harvey Barnes', 15, 'FWD', 84, 78, 58, 68, 28, 78, 54, 60),
  p('new-b7', 'Callum Wilson', 9, 'FWD', 72, 74, 46, 82, 18, 54, 44, 78),
];

// =========================================================================
// NOTTINGHAM FOREST
// =========================================================================
const nottmForestXI: Player[] = [
  p('nfo-1', 'Matt Turner', 1, 'GK', 34, 68, 46, 10, 12, 14, 46, 74),
  p('nfo-2', 'Murillo', 40, 'DEF', 62, 76, 54, 28, 78, 48, 50, 76),
  p('nfo-3', 'Willy Boly', 30, 'DEF', 44, 72, 46, 32, 76, 34, 42, 74),
  p('nfo-4', 'Ola Aina', 43, 'DEF', 74, 78, 56, 26, 72, 60, 50, 70),
  p('nfo-5', 'Neco Williams', 7, 'DEF', 76, 78, 58, 24, 68, 64, 52, 66),
  p('nfo-6', 'Ryan Yates', 22, 'MID', 50, 80, 58, 42, 76, 44, 50, 70),
  p('nfo-7', 'Morgan Gibbs-White', 10, 'MID', 68, 80, 80, 62, 40, 74, 82, 68),
  p('nfo-8', 'Nicolás Domínguez', 16, 'MID', 54, 78, 68, 44, 70, 52, 64, 66),
  p('nfo-9', 'Anthony Elanga', 21, 'FWD', 88, 76, 54, 60, 24, 80, 50, 58),
  p('nfo-10', 'Taiwo Awoniyi', 9, 'FWD', 78, 76, 42, 76, 18, 56, 40, 72),
  p('nfo-11', 'Chris Wood', 11, 'FWD', 52, 74, 38, 78, 20, 44, 36, 74),
];
const nottmForestBench: Player[] = [
  p('nfo-b1', 'Carlos Miguel', 33, 'GK', 32, 64, 38, 8, 10, 12, 40, 66),
  p('nfo-b2', 'Andrew Omobamidele', 32, 'DEF', 54, 72, 48, 22, 72, 40, 42, 68),
  p('nfo-b3', 'Harry Toffolo', 15, 'DEF', 64, 76, 54, 20, 68, 56, 48, 66),
  p('nfo-b4', 'Danilo', 28, 'MID', 58, 76, 66, 42, 62, 54, 62, 62),
  p('nfo-b5', 'Elliot Anderson', 8, 'MID', 56, 74, 68, 44, 48, 58, 64, 58),
  p('nfo-b6', 'Callum Hudson-Odoi', 14, 'FWD', 78, 74, 62, 58, 24, 78, 56, 52),
  p('nfo-b7', 'Jota Silva', 17, 'FWD', 72, 72, 54, 56, 20, 72, 48, 50),
];

// =========================================================================
// SOUTHAMPTON
// =========================================================================
const southamptonXI: Player[] = [
  p('sou-1', 'Gavin Bazunu', 1, 'GK', 36, 68, 50, 10, 12, 16, 52, 72),
  p('sou-2', 'Taylor Harwood-Bellis', 6, 'DEF', 54, 74, 52, 26, 74, 40, 46, 72),
  p('sou-3', 'Jan Bednarek', 5, 'DEF', 46, 72, 46, 28, 72, 34, 42, 70),
  p('sou-4', 'Ryan Manning', 3, 'DEF', 66, 76, 58, 22, 68, 56, 52, 66),
  p('sou-5', 'Kyle Walker-Peters', 2, 'DEF', 74, 78, 56, 20, 70, 62, 50, 68),
  p('sou-6', 'Will Smallbone', 16, 'MID', 52, 76, 66, 45, 54, 54, 64, 60),
  p('sou-7', 'Stuart Armstrong', 17, 'MID', 58, 78, 70, 52, 48, 60, 68, 62),
  p('sou-8', 'Flynn Downes', 4, 'MID', 48, 78, 64, 36, 68, 44, 56, 66),
  p('sou-9', 'Adam Armstrong', 9, 'FWD', 74, 80, 52, 72, 20, 62, 48, 68),
  p('sou-10', 'Ché Adams', 10, 'FWD', 72, 78, 46, 72, 18, 56, 42, 66),
  p('sou-11', 'Samuel Edozie', 23, 'FWD', 82, 72, 48, 52, 20, 78, 44, 52),
];
const southamptonBench: Player[] = [
  p('sou-b1', 'Alex McCarthy', 1, 'GK', 32, 66, 40, 8, 10, 12, 42, 68),
  p('sou-b2', 'Jack Stephens', 5, 'DEF', 42, 70, 46, 26, 70, 32, 42, 68),
  p('sou-b3', 'Yukinari Sugawara', 16, 'DEF', 68, 74, 52, 20, 64, 56, 46, 62),
  p('sou-b4', 'Joe Aribo', 7, 'MID', 54, 76, 62, 44, 56, 60, 56, 60),
  p('sou-b5', 'Lesley Ugochukwu', 26, 'MID', 56, 72, 58, 36, 64, 48, 50, 62),
  p('sou-b6', 'Kamaldeen Sulemana', 20, 'FWD', 90, 72, 48, 50, 20, 80, 44, 46),
  p('sou-b7', 'Ben Brereton Díaz', 17, 'FWD', 68, 76, 50, 68, 24, 58, 46, 62),
];

// =========================================================================
// TOTTENHAM
// =========================================================================
const tottenhamXI: Player[] = [
  p('tot-1', 'Guglielmo Vicario', 1, 'GK', 40, 74, 54, 12, 16, 20, 56, 86),
  p('tot-2', 'Cristian Romero', 17, 'DEF', 62, 82, 60, 38, 90, 50, 54, 84),
  p('tot-3', 'Micky van de Ven', 37, 'DEF', 86, 80, 58, 28, 84, 54, 52, 80),
  p('tot-4', 'Pedro Porro', 23, 'DEF', 76, 84, 74, 40, 72, 68, 70, 72),
  p('tot-5', 'Destiny Udogie', 13, 'DEF', 80, 82, 68, 30, 74, 72, 62, 72),
  p('tot-6', 'Yves Bissouma', 8, 'MID', 64, 82, 76, 48, 78, 68, 70, 74),
  p('tot-7', 'Pape Matar Sarr', 29, 'MID', 66, 82, 74, 48, 68, 62, 70, 68),
  p('tot-8', 'James Maddison', 10, 'MID', 62, 78, 88, 68, 35, 82, 90, 70),
  p('tot-9', 'Dejan Kulusevski', 21, 'FWD', 74, 84, 78, 72, 42, 80, 78, 68),
  p('tot-10', 'Son Heung-min', 7, 'FWD', 88, 84, 72, 92, 25, 82, 76, 88),
  p('tot-11', 'Richarlison', 9, 'FWD', 76, 80, 52, 80, 28, 64, 48, 76),
];
const tottenhamBench: Player[] = [
  p('tot-b1', 'Fraser Forster', 20, 'GK', 30, 66, 40, 8, 10, 12, 42, 72),
  p('tot-b2', 'Radu Dragusin', 6, 'DEF', 54, 74, 48, 28, 78, 38, 44, 74),
  p('tot-b3', 'Ben Davies', 33, 'DEF', 52, 76, 54, 22, 72, 46, 50, 70),
  p('tot-b4', 'Rodrigo Bentancur', 30, 'MID', 56, 78, 78, 48, 64, 60, 74, 68),
  p('tot-b5', 'Archie Gray', 14, 'MID', 56, 74, 68, 38, 48, 58, 64, 58),
  p('tot-b6', 'Brennan Johnson', 22, 'FWD', 88, 78, 54, 64, 24, 78, 50, 58),
  p('tot-b7', 'Timo Werner', 16, 'FWD', 92, 74, 52, 58, 20, 76, 48, 54),
];

// =========================================================================
// WEST HAM
// =========================================================================
const westHamXI: Player[] = [
  p('whu-1', 'Alphonse Areola', 1, 'GK', 38, 72, 48, 10, 14, 16, 50, 80),
  p('whu-2', 'Kurt Zouma', 4, 'DEF', 48, 78, 48, 38, 84, 36, 46, 82),
  p('whu-3', 'Nayef Aguerd', 27, 'DEF', 58, 80, 56, 30, 82, 44, 50, 80),
  p('whu-4', 'Emerson Palmieri', 33, 'DEF', 74, 80, 64, 28, 72, 64, 56, 72),
  p('whu-5', 'Vladimír Coufal', 5, 'DEF', 66, 82, 62, 24, 76, 52, 54, 74),
  p('whu-6', 'Edson Álvarez', 19, 'MID', 54, 82, 66, 38, 84, 46, 58, 78),
  p('whu-7', 'Tomás Soucek', 28, 'MID', 50, 86, 60, 56, 74, 42, 54, 76),
  p('whu-8', 'James Ward-Prowse', 7, 'MID', 48, 84, 86, 62, 48, 52, 84, 68),
  p('whu-9', 'Jarrod Bowen', 20, 'FWD', 82, 84, 68, 80, 32, 76, 66, 76),
  p('whu-10', 'Mohammed Kudus', 14, 'FWD', 84, 80, 70, 74, 30, 88, 68, 66),
  p('whu-11', 'Lucas Paquetá', 10, 'FWD', 60, 78, 82, 68, 42, 82, 82, 64),
];
const westHamBench: Player[] = [
  p('whu-b1', 'Lukasz Fabianski', 1, 'GK', 30, 66, 40, 8, 10, 12, 42, 72),
  p('whu-b2', 'Konstantinos Mavropanos', 15, 'DEF', 56, 74, 48, 28, 76, 40, 44, 72),
  p('whu-b3', 'Aaron Wan-Bissaka', 29, 'DEF', 76, 80, 54, 20, 82, 58, 46, 70),
  p('whu-b4', 'Guido Rodríguez', 24, 'MID', 48, 78, 66, 36, 76, 42, 58, 72),
  p('whu-b5', 'Andy Irving', 39, 'MID', 42, 72, 60, 34, 58, 40, 56, 60),
  p('whu-b6', 'Crysencio Summerville', 17, 'FWD', 84, 76, 56, 58, 24, 82, 52, 52),
  p('whu-b7', 'Niclas Füllkrug', 11, 'FWD', 52, 74, 50, 78, 18, 48, 50, 74),
];

// =========================================================================
// WOLVES
// =========================================================================
const wolvesXI: Player[] = [
  p('wol-1', 'José Sá', 1, 'GK', 36, 72, 48, 10, 14, 16, 52, 82),
  p('wol-2', 'Max Kilman', 23, 'DEF', 54, 82, 54, 32, 82, 40, 50, 82),
  p('wol-3', 'Craig Dawson', 15, 'DEF', 40, 76, 46, 36, 80, 30, 44, 78),
  p('wol-4', 'Rayan Aït-Nouri', 3, 'DEF', 76, 80, 62, 28, 70, 72, 56, 68),
  p('wol-5', 'Nélson Semedo', 22, 'DEF', 78, 80, 58, 26, 72, 66, 52, 72),
  p('wol-6', 'Mario Lemina', 5, 'MID', 58, 82, 68, 42, 78, 54, 62, 74),
  p('wol-7', 'João Gomes', 8, 'MID', 62, 82, 64, 44, 76, 50, 56, 72),
  p('wol-8', 'Pablo Sarabia', 21, 'FWD', 60, 76, 78, 62, 28, 68, 78, 60),
  p('wol-9', 'Pedro Neto', 7, 'FWD', 92, 78, 70, 64, 24, 90, 68, 58),
  p('wol-10', 'Matheus Cunha', 12, 'FWD', 78, 80, 72, 74, 22, 82, 72, 68),
  p('wol-11', 'Hwang Hee-chan', 11, 'FWD', 82, 80, 54, 76, 28, 72, 50, 72),
];
const wolvesBench: Player[] = [
  p('wol-b1', 'Dan Bentley', 25, 'GK', 34, 66, 42, 8, 12, 14, 44, 70),
  p('wol-b2', 'Toti Gomes', 24, 'DEF', 56, 78, 48, 26, 78, 42, 44, 74),
  p('wol-b3', 'Matt Doherty', 2, 'DEF', 62, 76, 52, 22, 68, 54, 48, 68),
  p('wol-b4', 'Tommy Doyle', 20, 'MID', 48, 74, 70, 42, 48, 52, 68, 58),
  p('wol-b5', 'Boubacar Traoré', 6, 'MID', 56, 78, 58, 36, 70, 50, 52, 64),
  p('wol-b6', 'Jean-Ricner Bellegarde', 27, 'FWD', 64, 76, 66, 52, 42, 72, 62, 56),
  p('wol-b7', 'Gonçalo Guedes', 29, 'FWD', 74, 74, 58, 62, 22, 72, 54, 56),
];

// ---------------------------------------------------------------------------
// Times montados (XI + Bench)
// ---------------------------------------------------------------------------
function makeFullTeam(id: string, name: string, abbr: string, color: string, secondary: string, logoId: string, xi: Player[], bench: Player[]): Team {
  return {
    id, name, abbreviation: abbr, color, secondaryColor: secondary,
    logoUrl: `https://resources.premierleague.com/premierleague/badges/${logoId}.png`,
    squad: [...xi, ...bench],
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

export const premierLeagueTeams: Team[] = [
  makeFullTeam('arsenal', 'Arsenal', 'ARS', '#EF0107', '#FFFFFF', 't3', arsenalXI, arsenalBench),
  makeFullTeam('aston-villa', 'Aston Villa', 'AVL', '#670E36', '#95BFE5', 't7', astonVillaXI, astonVillaBench),
  makeFullTeam('bournemouth', 'Bournemouth', 'BOU', '#DA291C', '#000000', 't91', bournemouthXI, bournemouthBench),
  makeFullTeam('brentford', 'Brentford', 'BRE', '#E30613', '#FFFFFF', 't94', brentfordXI, brentfordBench),
  makeFullTeam('brighton', 'Brighton', 'BRI', '#0057AD', '#FFFFFF', 't36', brightonXI, brightonBench),
  makeFullTeam('chelsea', 'Chelsea', 'CHE', '#034694', '#FFFFFF', 't8', chelseaXI, chelseaBench),
  makeFullTeam('crystal-palace', 'Crystal Palace', 'CRY', '#1B458F', '#C4122E', 't31', crystalPalaceXI, crystalPalaceBench),
  makeFullTeam('everton', 'Everton', 'EVE', '#003399', '#FFFFFF', 't11', evertonXI, evertonBench),
  makeFullTeam('fulham', 'Fulham', 'FUL', '#FFFFFF', '#000000', 't54', fulhamXI, fulhamBench),
  makeFullTeam('ipswich', 'Ipswich Town', 'IPS', '#0033A0', '#FFFFFF', 't40', ipswichXI, ipswichBench),
  makeFullTeam('leicester', 'Leicester City', 'LEI', '#003090', '#FFFFFF', 't13', leicesterXI, leicesterBench),
  makeFullTeam('liverpool', 'Liverpool', 'LIV', '#C8102E', '#00B2A9', 't14', liverpoolXI, liverpoolBench),
  makeFullTeam('man-city', 'Manchester City', 'MCI', '#6CABDD', '#1C2C4C', 't43', manCityXI, manCityBench),
  makeFullTeam('man-utd', 'Manchester United', 'MUN', '#DA291C', '#000000', 't1', manUtdXI, manUtdBench),
  makeFullTeam('newcastle', 'Newcastle United', 'NEW', '#241F20', '#FFFFFF', 't4', newcastleXI, newcastleBench),
  makeFullTeam('nottm-forest', 'Nottingham Forest', 'NFO', '#DD0000', '#FFFFFF', 't17', nottmForestXI, nottmForestBench),
  makeFullTeam('southampton', 'Southampton', 'SOU', '#D71920', '#FFFFFF', 't20', southamptonXI, southamptonBench),
  makeFullTeam('tottenham', 'Tottenham', 'TOT', '#132257', '#FFFFFF', 't6', tottenhamXI, tottenhamBench),
  makeFullTeam('west-ham', 'West Ham United', 'WHU', '#7A263A', '#95BFE5', 't21', westHamXI, westHamBench),
  makeFullTeam('wolves', 'Wolverhampton', 'WOL', '#FDB913', '#000000', 't39', wolvesXI, wolvesBench),
];

export function getTeamById(id: string): Team | undefined {
  return premierLeagueTeams.find(t => t.id === id);
}
