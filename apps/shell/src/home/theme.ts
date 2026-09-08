import { useCallback, useState } from 'react';

export type Theme = 'vintage' | 'modern';

const KEY = 'arcade:theme';

/**
 * A per-device display preference, so `localStorage` is the right home for it.
 * This is not game state — that goes through `sdk.save()`.
 */
function read(): Theme {
  try {
    return window.localStorage.getItem(KEY) === 'modern' ? 'modern' : 'vintage';
  } catch {
    return 'vintage';
  }
}

export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(read);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* private mode or blocked storage: the choice just does not persist */
    }
  }, []);

  return [theme, setTheme];
}
