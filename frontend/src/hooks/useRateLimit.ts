import { useState, useCallback } from 'react';

const STORAGE_KEY = 'thoughts-ratelimit';

interface RateLimitState {
  remaining: number | null;
  resetAt: number | null;
}

function loadCached(): RateLimitState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { remaining: null, resetAt: null };
    const parsed = JSON.parse(raw) as RateLimitState;
    // Discard stale data — once resetAt has passed the limit has reset
    if (parsed.resetAt && Math.floor(Date.now() / 1000) > parsed.resetAt) {
      localStorage.removeItem(STORAGE_KEY);
      return { remaining: null, resetAt: null };
    }
    return parsed;
  } catch {
    return { remaining: null, resetAt: null };
  }
}

function persist(state: RateLimitState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function useRateLimit() {
  const [state, setState] = useState<RateLimitState>(loadCached);

  /**
   * Call this after every successful API response to sync the remaining count
   * from the X-RateLimit-Remaining and X-RateLimit-Reset response headers.
   */
  const updateFromResponse = useCallback((response: Response) => {
    const remainingHeader = response.headers.get('X-RateLimit-Remaining');
    const resetHeader = response.headers.get('X-RateLimit-Reset');
    if (remainingHeader === null || resetHeader === null) return;

    const remaining = parseInt(remainingHeader, 10);
    const resetAt = parseInt(resetHeader, 10);
    if (isNaN(remaining) || isNaN(resetAt)) return;

    const next = { remaining, resetAt };
    setState(next);
    persist(next);
  }, []);

  /**
   * Call this when the API returns 429 to immediately mark the limit as hit.
   */
  const handleRateLimitExceeded = useCallback((resetAt: number) => {
    const next = { remaining: 0, resetAt };
    setState(next);
    persist(next);
  }, []);

  const isLimited = state.remaining === 0;

  // Format the reset time as a human-readable local time string (e.g. "12:00 AM")
  const resetAtLabel = (() => {
    if (!state.resetAt) return null;
    return new Date(state.resetAt * 1000).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  })();

  return {
    remaining: state.remaining,
    resetAt: state.resetAt,
    isLimited,
    resetAtLabel,
    updateFromResponse,
    handleRateLimitExceeded,
  };
}
