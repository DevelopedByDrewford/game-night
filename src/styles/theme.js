function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const bigint = parseInt(value, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const ink = '#2E2013';
const inkDarkMode = '#F5E6C7';
const pageBg = '#E8DABF';
const pageBgDarkMode = '#251B13';

const shared = {
  fonts: {
    display: "'Bree Serif', serif",
    body: "'Work Sans', sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  radii: {
    card: '20px',
    cardSm: '16px',
    pill: '30px',
    badge: '14px',
    badgeSm: '12px',
  },
  shadows: {
    card: '0 12px 28px rgba(46,32,19,.14)',
    button: '0 8px 20px rgba(46,32,19,.18)',
  },
  maxWidth: {
    grid: '1100px',
    single: '640px',
  },
  gap: {
    grid: '20px',
    gridWide: '22px',
  },
};

export const lightTheme = {
  mode: 'light',
  ...shared,
  colors: {
    ink,
    pageBg,
    surface: '#F5ECD8',
    terracotta: '#C8592F',
    mustard: '#E3A73E',
    avocado: '#7C8C4A',
    muted: '#b0a48c',
    border: rgba(ink, 0.16),
    inkFaint: rgba(ink, 0.55),
    inkFainter: rgba(ink, 0.4),
  },
};

export const darkTheme = {
  mode: 'dark',
  ...shared,
  colors: {
    ink: inkDarkMode,
    pageBg: pageBgDarkMode,
    surface: '#F5ECD8',
    terracotta: '#C8592F',
    mustard: '#E3A73E',
    avocado: '#7C8C4A',
    muted: '#b0a48c',
    border: rgba(inkDarkMode, 0.18),
    inkFaint: rgba(inkDarkMode, 0.6),
    inkFainter: rgba(inkDarkMode, 0.42),
  },
};
