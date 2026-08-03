import { useCallback } from 'react';
import { getInbox, type CareerState } from '@/engine/career';

interface UseCareerInboxParams {
  setCareerState: React.Dispatch<React.SetStateAction<CareerState | null>>;
}

export function useCareerInbox({ setCareerState }: UseCareerInboxParams) {
  const handleMarkInboxRead = useCallback((messageId: string) => {
    setCareerState(prev => {
      if (!prev) return prev;
      return { ...prev, inbox: getInbox(prev).map(m => m.id === messageId ? { ...m, isRead: true } : m) };
    });
  }, [setCareerState]);

  const handleMarkAllInboxRead = useCallback(() => {
    setCareerState(prev => {
      if (!prev) return prev;
      return { ...prev, inbox: getInbox(prev).map(m => ({ ...m, isRead: true })) };
    });
  }, [setCareerState]);

  return {
    handleMarkInboxRead, handleMarkAllInboxRead,
  };
}