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
