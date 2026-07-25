import type { Team, Player, Strategy } from '@/engine/types';

const FIRST_NAMES = [
  'Marco', 'Luca', 'André', 'Diego', 'Hugo', 'Rui', 'Tiago', 'Nico', 'Pablo', 'Sergio',
  'Carlos', 'Miguel', 'Rafael', 'Felipe', 'Bruno', 'João', 'Pedro', 'Luís', 'Enzo', 'Thiago',
  'Matteo', 'Lorenzo', 'Alessandro', 'Francesco', 'Leonardo', 'Riccardo', 'Federico', 'Simone',
  'Antonio', 'Giovanni', 'Marco', 'Fabio', 'Daniele', 'Stefano', 'Lukas', 'Felix', 'Max',
  'Jonas', 'Niklas', 'Leon', 'Timo', 'Kai', 'Florian', 'Julian', 'Toni', 'Manuel', 'Mats',
  'Bastian', 'Thomas', 'Karim', 'Antoine', 'Kylian', 'Olivier', 'Adrien', 'Hugo', 'Lucas',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Costa', 'Pereira', 'Ferreira', 'Rodriguez', 'Garcia', 'Martinez',
  'Lopez', 'Gonzalez', 'Hernandez', 'Torres', 'Ruiz', 'Rossi', 'Bianchi', 'Romano',
  'Colombo', 'Ferrari', 'Ricci', 'Conti', 'Mueller', 'Schmidt', 'Schneider', 'Fischer',
  'Weber', 'Wagner', 'Becker', 'Hoffmann', 'Moreno', 'Jimenez', 'Navarro', 'Ortega',
  'Blanco', 'Delgado', 'Castro', 'Mendes', 'Alves', 'Sousa', 'Machado', 'Ribeiro',
];

const GK_NAMES = [
  'Buffon', 'Casillas', 'Neuer', 'Courtois', 'Alisson', 'Ederson', 'Ter Stegen',
  'Oblak', 'Donnarumma', 'Lloris', 'Navas', 'Maignan', 'Onana', 'Sommer', 'Kobel',
];

function rand(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Exportado pra ser reaproveitado pela sincronização de elenco via API (src/services) —
 *  gera atributos calibrados pra jogadores novos que a API traz mas que a gente ainda
 *  não tem dados reais (ex: uma transferência recente). */
export function generatePlayer(id: string, name: string, number: number, pos: Player['position'], ovr: number, age?: number): Player {
  // playerOvr() aplica um multiplicador de 1.15 + offset de +3 em cima de uma média já
  // inflada pelos boosts abaixo (ver utils/playerOvr.ts) — sem essa correção, um alvo de
  // OVR 70 saía calculado como ~83-87, e qualquer alvo de 85+ clampava em 99, apagando a
  // diferença entre um time OVR 85 e um OVR 95. Medido empiricamente (200 amostras por
  // combinação posição/alvo): a relação real é ~1.15×alvo + 4, então essa correção inverte
  // isso ANTES de gerar os atributos, pra playerOvr(gerado) ≈ ovr de novo. Achado analisando
  // por que times de 2ª divisão (alvo 72-77 nos dados) saíam com OVR médio 86-93 na prática —
  // mais forte que a 1ª divisão do mesmo país.
  const calibratedOvr = (ovr - 4) / 1.15;
  const base = calibratedOvr - 7;
  const spread = Math.min(10, Math.floor(ovr / 8));
  const attr = () => Math.max(1, Math.min(99, base + rand(-spread, spread)));
  const boost = (n: number) => Math.max(1, Math.min(99, attr() + n));

  const result: Player = {
    id, name, number, position: pos, currentFatigue: 0,
    attributes: {
      speed: pos === 'FWD' || pos === 'DEF' ? boost(8) : attr(),
      stamina: boost(2),
      passing: pos === 'MID' ? boost(10) : attr(),
      finishing: pos === 'FWD' ? boost(12) : pos === 'MID' ? boost(4) : attr(),
      tackling: pos === 'DEF' ? boost(12) : pos === 'MID' ? boost(4) : attr(),
      dribbling: pos === 'FWD' || pos === 'MID' ? boost(6) : attr(),
      vision: pos === 'MID' ? boost(8) : pos === 'FWD' ? boost(4) : attr(),
      positioning: pos === 'GK' ? boost(14) : boost(4),
    },
  };

  if (age !== undefined) {
    result.age = age;
  }

  return result;
}

export function generatePlayerWithSubtype(id: string, name: string, number: number, pos: Player['position'], ovr: number, subtype: string, age?: number): Player {
  const p = generatePlayer(id, name, number, pos, ovr, age);
  const { attributes } = p;

  // Refine attributes based on position subtype for more realism
  switch (subtype) {
    case 'CB': // Center-back: more tackling, positioning; less speed, dribbling
      attributes.tackling = Math.min(99, attributes.tackling + 4);
      attributes.positioning = Math.min(99, attributes.positioning + 4);
      attributes.speed = Math.max(1, attributes.speed - 4);
      attributes.dribbling = Math.max(1, attributes.dribbling - 4);
      break;
    case 'FB': // Fullback: more speed, dribbling, passing; less tackling
      attributes.speed = Math.min(99, attributes.speed + 6);
      attributes.dribbling = Math.min(99, attributes.dribbling + 4);
      attributes.passing = Math.min(99, attributes.passing + 2);
      attributes.tackling = Math.max(1, attributes.tackling - 4);
      attributes.positioning = Math.max(1, attributes.positioning - 2);
      break;
    case 'CDM': // Defensive mid: more tackling, positioning; less finishing, dribbling
      attributes.tackling = Math.min(99, attributes.tackling + 6);
      attributes.positioning = Math.min(99, attributes.positioning + 4);
      attributes.finishing = Math.max(1, attributes.finishing - 6);
      attributes.dribbling = Math.max(1, attributes.dribbling - 2);
      break;
    case 'CAM': // Attacking mid: more finishing, dribbling, vision; less tackling
      attributes.finishing = Math.min(99, attributes.finishing + 4);
      attributes.dribbling = Math.min(99, attributes.dribbling + 4);
      attributes.vision = Math.min(99, attributes.vision + 4);
      attributes.tackling = Math.max(1, attributes.tackling - 6);
      break;
    case 'W': // Winger: more speed, dribbling; less tackling, positioning
      attributes.speed = Math.min(99, attributes.speed + 6);
      attributes.dribbling = Math.min(99, attributes.dribbling + 6);
      attributes.tackling = Math.max(1, attributes.tackling - 4);
      attributes.positioning = Math.max(1, attributes.positioning - 4);
      break;
    case 'ST': // Striker: more finishing, positioning; less passing, tackling
      attributes.finishing = Math.min(99, attributes.finishing + 6);
      attributes.positioning = Math.min(99, attributes.positioning + 4);
      attributes.passing = Math.max(1, attributes.passing - 2);
      attributes.tackling = Math.max(1, attributes.tackling - 4);
      break;
    default: // 'CM', 'GK', or unknown — keep defaults
      break;
  }

  return p;
}

// No uniqueness tracking: over many seasons of retirements across 6 leagues, duplicate names can occur — cosmetic only, since player.id (not name) is the unique identifier everywhere else in the codebase.
export function generateRandomName(rng: () => number = Math.random): string {
  const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

export function crestSvg(primaryColor: string, text: string, secondaryColor = '#ffffff'): string {
  const fontSize = text.length > 3 ? '20' : text.length > 2 ? '26' : '30';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 116">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${primaryColor};stop-opacity:0.85"/>
    </linearGradient>
  </defs>
  <path d="M50 4 L92 18 L92 60 Q92 92 50 112 Q8 92 8 60 L8 18 Z"
    fill="url(#g)" stroke="${secondaryColor}" stroke-width="3" stroke-opacity="0.7"/>
  <path d="M8 60 L92 60 Q92 92 50 112 Q8 92 8 60 Z"
    fill="${secondaryColor}" fill-opacity="0.2"/>
  <text x="50" y="52" text-anchor="middle" dominant-baseline="middle"
    fill="${secondaryColor}" font-family="Arial Black,Arial,sans-serif"
    font-weight="900" font-size="${fontSize}" letter-spacing="1">${text}</text>
</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

const DEFAULT_FORMATIONS = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'] as const;

export function generateTeam(
  idPrefix: string, name: string, abbreviation: string,
  color: string, secondaryColor: string, logoUrl: string,
  ovr: number,
): Team {
  const formation = DEFAULT_FORMATIONS[Math.floor(Math.random() * DEFAULT_FORMATIONS.length)];
  const strategy: Strategy = {
    formation,
    mentality: 'possession',
    intensity: 'medium',
    defensiveLine: 'normal',
    width: 'normal',
  };

  const players: Player[] = [];
  const usedNames = new Set<string>();
  function uniqueGkName(): string { let n; do { n = pick(GK_NAMES); } while (usedNames.has(n)); usedNames.add(n); return n; }
  function uniqueName(): string {
    let n: string;
    do { n = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; } while (usedNames.has(n));
    usedNames.add(n);
    return n;
  }

  players.push(generatePlayer(`${idPrefix}-1`, uniqueGkName(), 1, 'GK', ovr - rand(2, 6)));

  const positions: Player['position'][] = ['DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
  positions.forEach((pos, i) => {
    players.push(generatePlayer(`${idPrefix}-${i + 2}`, uniqueName(), i + 2, pos, ovr + rand(-3, 3)));
  });

  for (let i = 0; i < 7; i++) {
    const benchPos = i < 1 ? 'GK' : i < 3 ? 'DEF' : i < 5 ? 'MID' : 'FWD';
    players.push(generatePlayer(`${idPrefix}-b${i + 1}`, uniqueName(), 12 + i, benchPos, ovr - rand(4, 8)));
  }

  const crest = logoUrl || crestSvg(color, abbreviation, secondaryColor);

  return { id: idPrefix, name, abbreviation, color, secondaryColor, logoUrl: crest, squad: players, strategy };
}
