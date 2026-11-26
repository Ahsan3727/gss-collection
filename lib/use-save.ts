'use client';

import { useCallback, useRef, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useSave() {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string>('');
  const lastFnRef = useRef<(() => Promise<void>) | null>(null);

  const run = useCallback(async (action: () => Promise<void>) => {
    lastFnRef.current = action;
    setStatus('saving');
    setError('');
    try {
      await action();
      setStatus('saved');
    } catch (err: unknown) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Save failed. Please retry.');
    }
  }, []);

  const retry = useCallback(async () => {
    if (lastFnRef.current) {
      await run(lastFnRef.current);
    }
  }, [run]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError('');
  }, []);

  return { status, error, run, retry, reset };
}
