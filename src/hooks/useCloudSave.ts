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
  const retryRef = useRef<{ state: CareerState; seq: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cadeia de promessas que serializa os saves: dois enqueueCloudSave seguidos não
  // podem mais gravar fora de ordem no Supabase (um estado mais velho chegando
  // depois de um mais novo).
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const seqRef = useRef(0);
  // Seq do último save que REALMENTE foi gravado com sucesso — um retry nunca
  // regrava um estado mais velho do que o último sucesso conhecido.
  const lastSavedSeqRef = useRef(0);

  const hasEnv = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  const performSave = useCallback((state: CareerState, seq: number) => {
    if (!hasEnv) return;
    setStatus('saving');
    chainRef.current = chainRef.current
      .catch(() => { /* o nó anterior já marcou offline e guardou o pendente */ })
      .then(async () => {
        try {
          await saveCareer(state);
          lastSavedSeqRef.current = Math.max(lastSavedSeqRef.current, seq);
          setStatus('saved');
          // Se um save mais novo falhou antes e ainda não foi persistido, tenta de novo.
          if (retryRef.current && retryRef.current.seq > lastSavedSeqRef.current) {
            const retry = retryRef.current;
            retryRef.current = null;
            await performSave(retry.state, retry.seq);
          }
        } catch {
          // Guarda o pendente mais novo (nunca um mais velho sobrescreve um mais novo).
          if (!retryRef.current || seq >= retryRef.current.seq) {
            retryRef.current = { state, seq };
          }
          setStatus('offline');
        }
      });
  }, [hasEnv]);

  const enqueueCloudSave = useCallback((state: CareerState) => {
    if (!hasEnv) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    const seq = ++seqRef.current;
    timerRef.current = setTimeout(() => {
      performSave(state, seq);
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
      const pending = retryRef.current;
      retryRef.current = null;
      // Só regrava se nenhum save mais novo já foi gravado com sucesso depois.
      if (pending.seq > lastSavedSeqRef.current) {
        performSave(pending.state, pending.seq);
      }
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
