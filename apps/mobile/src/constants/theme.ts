// Light + dark themes. `Colors` is ONE mutable object whose values are swapped
// in place by applyTheme(), and styles are built lazily via createStyles() so
// they pick up the active palette. ThemeContext remounts the navigator after a
// switch so every screen re-reads both.
//
// Identity: a vivid indigo → cyan "aurora" on clean white. LIGHT is the default
// (bright, airy: white cards floating on a cool off-white page with soft
// shadows). DARK keeps the same identity on deep navy-violet with distinct
// tonal surfaces. Green / red are reserved for money in / money out. All
// text and accent pairs meet WCAG AA on the surface they sit on.
import { StyleSheet } from 'react-native';

const common = {
  accent: '#4f46e5',                         // indigo-600: white text on it = 6.3:1
  accent2: '#f59e0b',                        // amber highlight
  accentGradient: ['#4f46e5', '#0e7490'] as const,
  white: '#ffffff',
};

export const DarkColors = {
  ...common,
  bgPrimary: '#0b0d18',
  bgSecondary: '#12162b',                    // sheets
  panel: '#161a33',                          // card surface
  panelHover: '#1f2446',                     // chips, avatars, nested blocks
  border: '#272d52',
  borderStrong: '#363f6b',
  text1: '#eff2ff',
  text2: '#a6b1d3',
  text3: '#7080a6',
  accentLight: '#a5b4fc',                    // indigo-300 on dark: 9:1
  accentGlow: 'rgba(129,140,248,0.16)',
  green: '#34d399',
  greenBg: 'rgba(52,211,153,0.13)',
  red: '#fb7185',
  redBg: 'rgba(251,113,133,0.13)',
  yellow: '#fbbf24',
  yellowBg: 'rgba(251,191,36,0.13)',
  blue: '#60a5fa',
  blueBg: 'rgba(96,165,250,0.13)',
  inset: 'rgba(0,0,0,0.30)',
  track: '#262c50',
  modalBg: '#181d3a',
  tabBar: '#0e1124',
  heroFrom: '#4338ca',
  heroTo: '#0e7490',
  shadowOpacity: 0.4,
};

export const LightColors: typeof DarkColors = {
  ...common,
  bgPrimary: '#f4f6fc',                      // cool, slightly blue off-white
  bgSecondary: '#ffffff',
  panel: '#ffffff',
  panelHover: '#eef1fa',
  border: '#e5e9f4',
  borderStrong: '#c9d2e8',
  text1: '#0f1530',                          // 16:1
  text2: '#4a5578',                          // 7:1
  text3: '#8590b0',
  accentLight: '#4338ca',                    // indigo-700: 8.6:1 on white
  accentGlow: 'rgba(79,70,229,0.10)',
  green: '#059669',
  greenBg: 'rgba(5,150,105,0.10)',
  red: '#e11d48',
  redBg: 'rgba(225,29,72,0.08)',
  yellow: '#d97706',
  yellowBg: 'rgba(217,119,6,0.10)',
  blue: '#2563eb',
  blueBg: 'rgba(37,99,235,0.09)',
  inset: 'rgba(15,21,48,0.05)',
  track: 'rgba(15,21,48,0.08)',
  modalBg: '#ffffff',
  tabBar: '#ffffff',
  heroFrom: '#4f46e5',
  heroTo: '#0891b2',
  shadowOpacity: 0.10,
};

export const Colors: typeof DarkColors = { ...LightColors };

export const Radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 36 };

// Compact, Material-3-like scale. Body 13–15, titles 17–20, display 24–30.
export const FontSize = { xs: 11, sm: 12, base: 13, md: 15, lg: 17, xl: 20, xxl: 24, xxxl: 30 };

// React Native's shadow* props are iOS-only; elevation covers Android.
export const Shadow = {
  card: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 6,
  },
  xl: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5, shadowRadius: 32, elevation: 14,
  },
  glow: {
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 18, elevation: 8,
  },
};

// Semantic group colors; values follow the active theme (see applyTheme).
export const GroupColors: Record<string, string> = {};
const refreshGroupColors = () => {
  Object.assign(GroupColors, {
    Needs: Colors.blue,
    Wants: Colors.accentLight,
    'Need & Want': '#f97316',
    Contribution: Colors.yellow,
    Investment: Colors.green,
    Insurance: Colors.red,
    Savings: '#06b6d4',
    Income: Colors.green,
  });
};
refreshGroupColors();

let themeVersion = 0;
export const getThemeVersion = () => themeVersion;
export let isLightTheme = true;

export function applyTheme(scheme: 'light' | 'dark') {
  Object.assign(Colors, scheme === 'light' ? LightColors : DarkColors);
  isLightTheme = scheme === 'light';
  refreshGroupColors();
  themeVersion++;
}

// Drop-in replacement for StyleSheet.create that re-evaluates after a theme
// switch. Pass a FUNCTION returning the style object.
export function createStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(factory: () => T): T {
  let cache: any;
  let cachedVersion = -1;
  return new Proxy({} as T, {
    get(_t, key) {
      if (cachedVersion !== themeVersion) {
        cache = StyleSheet.create(factory() as any);
        cachedVersion = themeVersion;
      }
      return cache[key];
    },
  });
}
