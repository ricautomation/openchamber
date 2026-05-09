/**
 * usePinState — Hook to manage pin-to-repeat state for a session.
 *
 * Fetches and caches the current pin state from the API.
 * Provides actions to set, clear, and update pin repeat count.
 */

import React from 'react';
import { useSessionUIStore } from '@/sync/session-ui-store';
import { opencodeClient } from '@/lib/opencode/client';

export interface PinState {
  messageId: string;
  promptText: string;
  repeatCount: number;
  repeatIndex: number;
  pinnedAt: number;
}

export interface UsePinStateResult {
  pinState: PinState | null;
  isPinned: boolean;
  remainingRepeats: number;
  isLoading: boolean;
  error: string | null;
  setPin: (messageId: string, promptText: string, repeatCount: number) => Promise<void>;
  clearPin: () => Promise<void>;
  refetch: () => Promise<void>;
}

// Module-level cache to survive React re-renders without re-fetching
const pinCache = new Map<string, PinState>();
let fetchController: AbortController | null = null;

async function fetchPinState(sessionId: string): Promise<PinState | null> {
  if (fetchController) {
    fetchController.abort();
  }
  fetchController = new AbortController();

  try {
    const baseUrl = opencodeClient.getBaseUrl();
    const url = `${baseUrl}/session/${encodeURIComponent(sessionId)}/pin`;
    const response = await fetch(url, { signal: fetchController.signal });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch pin state: ${response.status}`);
    }

    const data = await response.json();
    return data.pin as PinState | null;
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null;
    throw err;
  }
}

export function usePinState(sessionId: string | null | undefined): UsePinStateResult {
  const [pinState, setPinState] = React.useState<PinState | null>(() => {
    if (sessionId) return pinCache.get(sessionId) ?? null;
    return null;
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fetchCountRef = React.useRef(0);

  React.useEffect(() => {
    if (!sessionId) {
      setPinState(null);
      return;
    }
    const cached = pinCache.get(sessionId);
    setPinState(cached ?? null);
  }, [sessionId]);

  const refetch = React.useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    fetchCountRef.current += 1;
    const fetchId = fetchCountRef.current;

    try {
      const result = await fetchPinState(sessionId);
      if (fetchId !== fetchCountRef.current) return;

      if (result) pinCache.set(sessionId, result);
      else pinCache.delete(sessionId);
      setPinState(result);
    } catch (err) {
      if (fetchId !== fetchCountRef.current) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (fetchId === fetchCountRef.current) setIsLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    if (!sessionId || pinCache.has(sessionId)) return;
    void refetch();
  }, [sessionId, refetch]);

  const setPin = React.useCallback(
    async (messageId: string, promptText: string, repeatCount: number) => {
      if (!sessionId) return;
      setIsLoading(true);
      setError(null);

      try {
        const baseUrl = opencodeClient.getBaseUrl();
        const url = `${baseUrl}/session/${encodeURIComponent(sessionId)}/pin`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, promptText, repeatCount }),
        });

        if (!response.ok) throw new Error(`Failed to set pin: ${response.status}`);

        const data = await response.json();
        const newPin = data.pin as PinState;
        pinCache.set(sessionId, newPin);
        setPinState(newPin);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId],
  );

  const clearPin = React.useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = opencodeClient.getBaseUrl();
      const url = `${baseUrl}/session/${encodeURIComponent(sessionId)}/pin`;
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) throw new Error(`Failed to clear pin: ${response.status}`);

      pinCache.delete(sessionId);
      setPinState(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  return {
    pinState,
    isPinned: pinState !== null && pinState.repeatIndex < pinState.repeatCount,
    remainingRepeats: pinState ? Math.max(0, pinState.repeatCount - pinState.repeatIndex) : 0,
    isLoading,
    error,
    setPin,
    clearPin,
    refetch,
  };
}

export function useCurrentSessionPinState(): UsePinStateResult {
  const currentSessionId = useSessionUIStore((state) => state.currentSessionId);
  return usePinState(currentSessionId);
}