import { useCallback } from 'react';
import { usePersistedState } from './usePersistedState';
import type { AchievementsData, Achievement, UnlockedAchievement, AchievementCheckContext } from '../engine/achievements';
import { defaultAchievementsData, checkAchievements, ACHIEVEMENTS } from '../engine/achievements';

export type AchievementEvalInput = Omit<AchievementCheckContext, 'totalMatchesPlayed'>;

export interface UseAchievementsReturn {
  data: AchievementsData;
  unlocked: UnlockedAchievement[];
  /** Evaluate and unlock any newly-earned achievements. Returns the newly unlocked ones. */
  evaluate: (input: AchievementEvalInput) => Achievement[];
  /** Check if an achievement is already unlocked */
  isUnlocked: (id: string) => boolean;
  /** Unlock a specific achievement by id, idempotente. Retorna a conquista se foi
   *  destravada agora (null se já estava ou o id não existe). Usado por gatilhos
   *  que não são "fim de partida" — ex.: Tríplice Coroa no fechamento da temporada. */
  unlockById: (id: string) => Achievement | null;
  /** Get all achievements with their unlock state */
  getAll: () => Array<Achievement & { unlocked: boolean; unlockedAt?: number }>;
}

export function useAchievements(): UseAchievementsReturn {
  const [data, setData] = usePersistedState<AchievementsData>(
    'fp:achievements',
    defaultAchievementsData,
  );

  const isUnlocked = useCallback(
    (id: string) => data.unlocked.some(u => u.id === id),
    [data.unlocked],
  );

  const getAll = useCallback(() => {
    const unlockedMap = new Map(data.unlocked.map(u => [u.id, u.unlockedAt]));
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id),
    }));
  }, [data.unlocked]);

  const evaluate = useCallback(
    (input: AchievementEvalInput): Achievement[] => {
      const newlyUnlocked: Achievement[] = [];
      setData(prev => {
        const newTotal = prev.totalMatchesPlayed + 1;
        const ctx: AchievementCheckContext = { ...input, totalMatchesPlayed: newTotal };
        const alreadyIds = new Set(prev.unlocked.map(u => u.id));
        const eligible = checkAchievements(ctx);
        let newUnlocked = prev.unlocked;
        for (const ach of eligible) {
          if (alreadyIds.has(ach.id)) continue;
          newUnlocked = [...newUnlocked, { id: ach.id, unlockedAt: Date.now() }];
          newlyUnlocked.push(ach);
        }
        return { unlocked: newUnlocked, totalMatchesPlayed: newTotal };
      });
      return newlyUnlocked;
    },
    [setData],
  );

  const unlockById = useCallback(
    (id: string): Achievement | null => {
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (!ach) return null;
      let newly: Achievement | null = null;
      setData(prev => {
        if (prev.unlocked.some(u => u.id === id)) return prev;
        newly = ach;
        return { ...prev, unlocked: [...prev.unlocked, { id, unlockedAt: Date.now() }] };
      });
      return newly;
    },
    [setData],
  );

  return { data, unlocked: data.unlocked, evaluate, isUnlocked, unlockById, getAll };
}
