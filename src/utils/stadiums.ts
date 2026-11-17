type Config = [string, string, number, number]; // prefix, suffix, minCap, maxCap

const CONFIGS: Config[] = [
  ['', ' Stadium', 25000, 80000],
  ['', ' Arena', 18000, 60000],
  ['', ' Park', 12000, 45000],
  ['Estádio ', '', 15000, 55000],
  ['', ' Ground', 8000, 30000],
  ['Estádio do ', '', 20000, 50000],
];

export function generateStadium(teamName: string, seed: number): { name: string; capacity: number } {
  const cfg = CONFIGS[seed % CONFIGS.length];
  const name = cfg[0] + teamName + cfg[1];
  const range = cfg[3] - cfg[2];
  const capacity = Math.round(cfg[2] + (seed * 7919 % 1000) / 1000 * range);
  return { name, capacity: Math.round(capacity / 1000) * 1000 };
}

/**
 * Estádio de um time — fonte única pra todas as telas. Antes a pré-partida e a tela
 * da partida geravam cada uma o seu com sementes diferentes (a da pré-partida dependia
 * até do adversário): o mesmo clube tinha "Crystal Palace Stadium · 53.000" numa tela
 * e "Crystal Palace Arena · 29.000" na outra. Agora usa o estádio real gravado pelo
 * sync (`team.stadium`) e só cai no nome gerado — estável por clube — quando não há
 * dado. Capacidade só aparece quando é real (`team.capacity`); não inventa número.
 */
export function teamStadium(team: { id: string; name: string; stadium?: string; capacity?: number }): { name: string; capacity?: number } {
  if (team.stadium) return { name: team.stadium, capacity: team.capacity };
  const seed = team.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return { name: generateStadium(team.name, seed).name };
}
