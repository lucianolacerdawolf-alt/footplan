// =============================================================================
// METAS DO DIA — motivo pra voltar todo dia (sequência de dias), sem mexer na economia
// =============================================================================
// 3 metas por dia, sorteadas pela data (iguais o dia todo, em qualquer modo de jogo).
// Progresso e sequência ficam no localStorage do aparelho. Não dá dinheiro nem
// reputação na carreira — a recompensa é a sequência (🔥), pra não desbalancear.

export type DailyMetric = 'matches' | 'liveFinished' | 'goals' | 'bigWinGoals';

export interface DailyGoal {
  id: string;
  label: string;
  metric: DailyMetric;
  target: number;
}

const POOL: DailyGoal[] = [
  { id: 'play2', label: 'Jogue 2 partidas', metric: 'matches', target: 2 },
  { id: 'play3', label: 'Jogue 3 partidas', metric: 'matches', target: 3 },
  { id: 'live1', label: 'Assista uma partida ao vivo até o apito final', metric: 'liveFinished', target: 1 },
  { id: 'live2', label: 'Assista 2 partidas ao vivo até o fim', metric: 'liveFinished', target: 2 },
  { id: 'goals4', label: 'Veja 4 gols nas suas partidas', metric: 'goals', target: 4 },
  { id: 'goals7', label: 'Veja 7 gols nas suas partidas', metric: 'goals', target: 7 },
  { id: 'big1', label: 'Uma partida com 4+ gols', metric: 'bigWinGoals', target: 1 },
];

export interface DailyState {
  date: string;                       // AAAA-MM-DD (fuso local)
  progress: Partial<Record<DailyMetric, number>>;
  streak: number;                     // dias seguidos com as 3 metas completas
  lastCompletedDate?: string;
}

export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** 3 metas do dia, sem repetir métrica. Determinístico pela data. */
export function goalsFor(date: string): DailyGoal[] {
  const picked: DailyGoal[] = [];
  const used = new Set<DailyMetric>();
  let i = 0;
  while (picked.length < 3 && i < 40) {
    const g = POOL[hash(`${date}:${i++}`) % POOL.length];
    if (used.has(g.metric)) continue;
    used.add(g.metric);
    picked.push(g);
  }
  return picked;
}

function previousDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return todayKey(new Date(y, m - 1, d - 1));
}

/** Estado do dia: zera o progresso quando muda o dia; sequência só sobrevive se ontem foi completo. */
export function normalize(state: DailyState | null, date: string): DailyState {
  if (!state) return { date, progress: {}, streak: 0 };
  if (state.date === date) return state;
  const keepStreak = state.lastCompletedDate === previousDay(date) || state.lastCompletedDate === date;
  return { date, progress: {}, streak: keepStreak ? state.streak : 0, lastCompletedDate: state.lastCompletedDate };
}

export function isComplete(state: DailyState): boolean {
  return goalsFor(state.date).every(g => (state.progress[g.metric] ?? 0) >= g.target);
}

/** Registra uma partida do usuário (qualquer modo). */
export function recordMatch(state: DailyState, totalGoals: number, live: boolean): DailyState {
  const p = { ...state.progress };
  p.matches = (p.matches ?? 0) + 1;
  p.goals = (p.goals ?? 0) + totalGoals;
  if (live) p.liveFinished = (p.liveFinished ?? 0) + 1;
  if (totalGoals >= 4) p.bigWinGoals = (p.bigWinGoals ?? 0) + 1;
  const next: DailyState = { ...state, progress: p };
  if (!isComplete(state) && isComplete(next)) {
    next.streak = state.lastCompletedDate === state.date ? state.streak : state.streak + 1;
    next.lastCompletedDate = state.date;
  }
  return next;
}

const KEY = 'fp:dailyGoals';

export function loadDaily(date: string = todayKey()): DailyState {
  try {
    const raw = localStorage.getItem(KEY);
    return normalize(raw ? JSON.parse(raw) as DailyState : null, date);
  } catch { return normalize(null, date); }
}

export function saveDaily(state: DailyState): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sem storage: metas só da sessão */ }
}

/** Atalho usado ao fim de cada partida do usuário. */
export function trackDailyMatch(totalGoals: number, live: boolean): void {
  saveDaily(recordMatch(loadDaily(), totalGoals, live));
}

/** Conquistas por sequência de dias (destravadas pelo App ao ver a sequência). */
export const STREAK_ACHIEVEMENTS: Array<{ days: number; id: string }> = [
  { days: 3, id: 'streak_3' },
  { days: 7, id: 'streak_7' },
  { days: 30, id: 'streak_30' },
];

/** Próxima conquista de sequência ainda não alcançada (pra mostrar no card). */
export function nextStreakReward(streak: number): { days: number; id: string } | null {
  return STREAK_ACHIEVEMENTS.find(a => streak < a.days) ?? null;
}
