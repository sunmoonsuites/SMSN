import { useState, useEffect, useCallback } from 'react';

export type PMSThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'pms_portal_theme';
const LEGACY_THEME_KEY = 'theme';
const AUTO_NIGHT_SHIFT_KEY = 'pms_auto_night_shift';
const THEME_CHANGE_EVENT = 'pms_theme_changed';

/**
 * Checks if current local time falls within standard hotel night-shift hours (19:00 to 06:30)
 */
export function isNightShiftHours(date: Date = new Date()): boolean {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  // 19:00 (1140 mins) to 06:30 (390 mins)
  return totalMinutes >= 19 * 60 || totalMinutes < 6 * 60 + 30;
}

export function getAutoNightShift(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTO_NIGHT_SHIFT_KEY) === 'true';
}

export function setAutoNightShift(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_NIGHT_SHIFT_KEY, enabled ? 'true' : 'false');
  if (enabled && isNightShiftHours()) {
    setPMSTheme('dark');
  } else {
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, {
        detail: { theme: getPMSTheme(), autoNightShift: enabled },
      })
    );
  }
}

export function getPMSTheme(): PMSThemeMode {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  if (getAutoNightShift() && isNightShiftHours()) {
    return 'dark';
  }
  return 'light';
}

export function applyPMSThemeToDocument(theme: PMSThemeMode, isPMSActive: boolean = true): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute('data-pms-theme', theme);

  if (isPMSActive && theme === 'dark') {
    root.classList.add('dark', 'pms-dark');
    root.setAttribute('data-theme', 'dark');
    body?.classList.add('pms-dark-body');
  } else {
    root.classList.remove('dark', 'pms-dark');
    root.setAttribute('data-theme', 'light');
    body?.classList.remove('pms-dark-body');
  }
}

export function setPMSTheme(theme: PMSThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  localStorage.setItem(LEGACY_THEME_KEY, theme);
  applyPMSThemeToDocument(theme, true);
  window.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { theme, autoNightShift: getAutoNightShift() },
    })
  );
}

export function togglePMSTheme(): PMSThemeMode {
  const next: PMSThemeMode = getPMSTheme() === 'dark' ? 'light' : 'dark';
  setPMSTheme(next);
  return next;
}

export function usePMSTheme(syncDocument: boolean = true) {
  const [theme, setThemeState] = useState<PMSThemeMode>(() => getPMSTheme());
  const [autoNightShift, setAutoNightShiftState] = useState<boolean>(() => getAutoNightShift());

  useEffect(() => {
    if (syncDocument) {
      applyPMSThemeToDocument(theme, true);
    }
  }, [theme, syncDocument]);

  useEffect(() => {
    const handleThemeChange = () => {
      const latestTheme = getPMSTheme();
      setThemeState(latestTheme);
      setAutoNightShiftState(getAutoNightShift());
      if (syncDocument) {
        applyPMSThemeToDocument(latestTheme, true);
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener('storage', handleThemeChange);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
    };
  }, [syncDocument]);

  const updateTheme = useCallback((newTheme: PMSThemeMode) => {
    setPMSTheme(newTheme);
    setThemeState(newTheme);
  }, []);

  const handleToggleTheme = useCallback(() => {
    const next = togglePMSTheme();
    setThemeState(next);
    return next;
  }, []);

  const updateAutoNightShift = useCallback((enabled: boolean) => {
    setAutoNightShift(enabled);
    setAutoNightShiftState(enabled);
    setThemeState(getPMSTheme());
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    setTheme: updateTheme,
    toggleTheme: handleToggleTheme,
    autoNightShift,
    setAutoNightShift: updateAutoNightShift,
    isNightHours: isNightShiftHours(),
  };
}
