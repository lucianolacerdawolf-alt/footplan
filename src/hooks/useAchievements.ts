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

  return { data, unlocked: data.unlocked, evaluate, isUnlocked, getAll };
}
