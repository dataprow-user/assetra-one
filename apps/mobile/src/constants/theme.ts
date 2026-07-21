// Single fixed dark theme — mirrors apps/web/src/index.css :root variables
// exactly, so the mobile app reads as the same product, not a reskin.

export const Colors = {
  bgPrimary: '#070b14',
  bgSecondary: '#0d1117',
  panel: 'rgba(255,255,255,0.04)',
  panelHover: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.15)',
  text1: '#f0f4ff',
  text2: '#8b9ab5',
  text3: '#4a5568',
  accent: '#6366f1',
  accentLight: '#818cf8',
  accent2: '#a855f7',
  accentGradient: ['#6366f1', '#a855f7'] as const,
  accentGlow: 'rgba(99,102,241,0.25)',
  green: '#10b981',
  greenBg: 'rgba(16,185,129,0.1)',
  red: '#f43f5e',
  redBg: 'rgba(244,63,94,0.1)',
  yellow: '#f59e0b',
  yellowBg: 'rgba(245,158,11,0.1)',
  blue: '#3b82f6',
  blueBg: 'rgba(59,130,246,0.1)',
  white: '#ffffff',
};

export const Radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 36 };

export const FontSize = { xs: 11, sm: 12, base: 13, md: 15, lg: 17, xl: 20, xxl: 26, xxxl: 32 };

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
    shadowOpacity: 0.45, shadowRadius: 20, elevation: 8,
  },
};

// Semantic group colors, ported 1:1 from web's Budgets/CategoryManager groupColor map.
export const GroupColors: Record<string, string> = {
  Needs: Colors.blue,
  Wants: Colors.accentLight,
  'Need & Want': '#f97316',
  Contribution: Colors.yellow,
  Investment: Colors.green,
  Insurance: Colors.red,
  Savings: '#06b6d4',
  Income: Colors.green,
};
