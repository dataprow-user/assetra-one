import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyTheme } from '../constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'a1_theme_mode';

type Ctx = { mode: ThemeMode; scheme: 'light' | 'dark'; version: number; setMode: (m: ThemeMode) => void };
const ThemeCtx = createContext<Ctx>({ mode: 'light', scheme: 'light', version: 0, setMode: () => {} });

const resolve = (mode: ThemeMode): 'light' | 'dark' =>
  mode === 'system' ? (Appearance.getColorScheme() === 'light' ? 'light' : 'dark') : mode;

// Holds the chosen theme (persisted). `version` changes on every switch so the
// root can remount the navigator and re-read Colors + createStyles().
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const commit = useCallback((m: ThemeMode) => {
    const s = resolve(m);
    applyTheme(s);
    setModeState(m);
    setScheme(s);
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => { commit(saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'light'); })
      .catch(() => commit('light'))
      .finally(() => setLoaded(true));
  }, [commit]);

  // Follow the phone's setting while in "system" mode.
  useEffect(() => {
    if (mode !== 'system') return;
    const sub = Appearance.addChangeListener(() => commit('system'));
    return () => sub.remove();
  }, [mode, commit]);

  const setMode = useCallback((m: ThemeMode) => {
    commit(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  }, [commit]);

  const value = useMemo(() => ({ mode, scheme, version, setMode }), [mode, scheme, version, setMode]);
  if (!loaded) return null; // splash screen is still up
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
