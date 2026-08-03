import { useState, useCallback, useRef, useEffect } from 'react';
import type { CareerState } from '../engine/career';
import { loadCareer, saveCareer } from '../services/cloudSave';
import { getSupabaseClient, resetAuth } from '../services/supabaseClient';

export type CloudStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'offline';

const DEBOUNCE_MS = 2000;

interface UseCloudSaveResult {
  status: CloudStatus;
  loadFromCloud: () => Promise<{ state: CareerState; updatedAt: string } | null>;
  enqueueCloudSave: (state: CareerState) => void;
  retry: () => void;
}

export function useCloudSave(): UseCloudSaveResult {
  const [status, setStatus] = useState<CloudStatus>('idle');
  const retryRef = useRef<CareerState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasEnv = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  const performSave = useCallback(async (state: CareerState) => {
    if (!hasEnv) return;
    setStatus('saving');
    try {
      await saveCareer(state);
      setStatus('saved');
    } catch {
      setStatus('offline');
      retryRef.current = state;
    }
  }, [hasEnv]);

  const enqueueCloudSave = useCallback((state: CareerState) => {
    if (!hasEnv) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('saving');
    timerRef.current = setTimeout(() => {
      performSave(state);
    }, DEBOUNCE_MS);
  }, [hasEnv, performSave]);

  const loadFromCloud = useCallback(async (): Promise<{ state: CareerState; updatedAt: string } | null> => {
    if (!hasEnv) {
      setStatus('idle');
      return null;
    }
    setStatus('loading');
    try {
      getSupabaseClient();
      const data = await loadCareer();
      if (data) {
        setStatus('saved');
        return data;
      }
      setStatus('idle');
      return null;
    } catch {
      setStatus('offline');
      return null;
    }
  }, [hasEnv]);

  const retry = useCallback(() => {
    if (retryRef.current) {
      performSave(retryRef.current);
    }
  }, [performSave]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { status, loadFromCloud, enqueueCloudSave, retry };
}

export { resetAuth };
