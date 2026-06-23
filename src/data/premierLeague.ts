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

// --- ARSENAL ---
const arsenal: Player[] = [
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

// --- ASTON VILLA ---
const astonVilla: Player[] = [
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

// --- BOURNEMOUTH ---
const bournemouth: Player[] = [
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

// --- BRENTFORD ---
const brentford: Player[] = [
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

// --- BRIGHTON ---
const brighton: Player[] = [
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

// --- CHELSEA ---
const chelsea: Player[] = [
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

// --- CRYSTAL PALACE ---
const crystalPalace: Player[] = [
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

// --- EVERTON ---
const everton: Player[] = [
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

// --- FULHAM ---
const fulham: Player[] = [
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

// --- IPSWICH TOWN ---
const ipswich: Player[] = [
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

// --- LEICESTER CITY ---
const leicester: Player[] = [
  p('lei-1', 'Mads Hermansen', 1, 'GK', 38, 70, 54, 10, 14, 20, 56, 76),
  p('lei-2', 'Wout Faes', 3, 'DEF', 56, 78, 52, 30, 78, 40, 48, 76),
  p('lei-3', 'Jannik Vestergaard', 23, 'DEF', 40, 74, 58, 32, 76, 34, 52, 74),
  p('lei-4', 'James Justin', 2, 'DEF', 74, 80, 58, 28, 74, 60, 52, 72),
  p('lei-5', 'Ricardo Pereira', 21, 'DEF', 72, 78, 62, 26, 72, 64, 56, 70),
  p('lei-6', 'Harry Winks', 8, 'MID', 50, 78, 76, 38, 56, 54, 74, 64),
  p('lei-7', 'Kiernan Dewsbury-Hall', 22, 'MID', 62, 82, 76, 58, 52, 66, 74, 66),
  p('lei-8', 'Wilfred Ndidi', 25, 'MID', 58, 84, 64, 42, 84, 50, 56, 76),
  p('lei-9', 'Stephy Mavididi', 10, 'FWD', 82, 78, 58, 66, 24, 78, 54, 60),
  p('lei-10', 'Jamie Vardy', 9, 'FWD', 80, 74, 48, 82, 18, 62, 46, 78),
  p('lei-11', 'Patson Daka', 20, 'FWD', 86, 76, 42, 72, 20, 66, 42, 68),
];

// --- LIVERPOOL ---
const liverpool: Player[] = [
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

// --- MANCHESTER CITY ---
const manCity: Player[] = [
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

// --- MANCHESTER UNITED ---
const manUtd: Player[] = [
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

// --- NEWCASTLE UNITED ---
const newcastle: Player[] = [
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

// --- NOTTINGHAM FOREST ---
const nottmForest: Player[] = [
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

// --- SOUTHAMPTON ---
const southampton: Player[] = [
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

// --- TOTTENHAM ---
const tottenham: Player[] = [
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

// --- WEST HAM ---
const westHam: Player[] = [
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

// --- WOLVES ---
const wolves: Player[] = [
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

// ---------------------------------------------------------------------------
// Times montados
// ---------------------------------------------------------------------------

// --- Bench player generator ---
function genBench(prefix: string, squad: Player[], level: number): Player[] {
  // level: 1=top 4, 2=top8, 3=mid, 4=bottom
  const baseOvr = level === 1 ? 84 : level === 2 ? 80 : level === 3 ? 76 : 72;
  const benchNames: { name: string; pos: Player['position'] }[] = [
    { name: 'Backup GK', pos: 'GK' },
    { name: 'Reserva DEF', pos: 'DEF' },
    { name: 'Reserva DEF 2', pos: 'DEF' },
    { name: 'Reserva MID', pos: 'MID' },
    { name: 'Reserva MID 2', pos: 'MID' },
    { name: 'Reserva FWD', pos: 'FWD' },
    { name: 'Reserva FWD 2', pos: 'FWD' },
  ];
  const maxNum = Math.max(...squad.map(p => p.number), 20);
  return benchNames.map((bn, i) => {
    const variation = (Math.random() - 0.5) * 6;
    const ovr = Math.round(baseOvr + variation - i * 2);
    const r = () => Math.max(1, Math.min(99, ovr + Math.round((Math.random() - 0.5) * 12)));
    return p(`${prefix}-b${i}`, bn.name, maxNum + i + 1, bn.pos,
      r(), r(), r(), r(), r(), r(), r(), r());
  });
}

function teamLevel(squad: Player[]): number {
  const avg = squad.reduce((s, p) => s + (p.attributes.speed + p.attributes.stamina + p.attributes.passing +
    p.attributes.finishing + p.attributes.tackling + p.attributes.dribbling +
    p.attributes.vision + p.attributes.positioning) / 8, 0) / squad.length;
  if (avg > 83) return 1;
  if (avg > 79) return 2;
  if (avg > 75) return 3;
  return 4;
}

function makeTeam(id: string, name: string, abbr: string, color: string, secondary: string, squad: Player[]): Team {
  const level = teamLevel(squad);
  const fullSquad = [...squad, ...genBench(id, squad, level)];
  return {
    id, name, abbreviation: abbr, color, secondaryColor: secondary, squad: fullSquad,
    strategy: { formation: '4-3-3', mentality: 'possession', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}

export const premierLeagueTeams: Team[] = [
  makeTeam('arsenal', 'Arsenal', 'ARS', '#EF0107', '#FFFFFF', arsenal),
  makeTeam('aston-villa', 'Aston Villa', 'AVL', '#670E36', '#95BFE5', astonVilla),
  makeTeam('bournemouth', 'Bournemouth', 'BOU', '#DA291C', '#000000', bournemouth),
  makeTeam('brentford', 'Brentford', 'BRE', '#E30613', '#FFFFFF', brentford),
  makeTeam('brighton', 'Brighton', 'BRI', '#0057AD', '#FFFFFF', brighton),
  makeTeam('chelsea', 'Chelsea', 'CHE', '#034694', '#FFFFFF', chelsea),
  makeTeam('crystal-palace', 'Crystal Palace', 'CRY', '#1B458F', '#C4122E', crystalPalace),
  makeTeam('everton', 'Everton', 'EVE', '#003399', '#FFFFFF', everton),
  makeTeam('fulham', 'Fulham', 'FUL', '#FFFFFF', '#000000', fulham),
  makeTeam('ipswich', 'Ipswich Town', 'IPS', '#0033A0', '#FFFFFF', ipswich),
  makeTeam('leicester', 'Leicester City', 'LEI', '#003090', '#FFFFFF', leicester),
  makeTeam('liverpool', 'Liverpool', 'LIV', '#C8102E', '#00B2A9', liverpool),
  makeTeam('man-city', 'Manchester City', 'MCI', '#6CABDD', '#1C2C4C', manCity),
  makeTeam('man-utd', 'Manchester United', 'MUN', '#DA291C', '#000000', manUtd),
  makeTeam('newcastle', 'Newcastle United', 'NEW', '#241F20', '#FFFFFF', newcastle),
  makeTeam('nottm-forest', 'Nottingham Forest', 'NFO', '#DD0000', '#FFFFFF', nottmForest),
  makeTeam('southampton', 'Southampton', 'SOU', '#D71920', '#FFFFFF', southampton),
  makeTeam('tottenham', 'Tottenham', 'TOT', '#132257', '#FFFFFF', tottenham),
  makeTeam('west-ham', 'West Ham United', 'WHU', '#7A263A', '#95BFE5', westHam),
  makeTeam('wolves', 'Wolverhampton', 'WOL', '#FDB913', '#000000', wolves),
];

export function getTeamById(id: string): Team | undefined {
  return premierLeagueTeams.find(t => t.id === id);
}
