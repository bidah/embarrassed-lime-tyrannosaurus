/**
 * Design system — "Nocturne"
 *
 * Dark-first, near-black canvas with layered graphite surfaces and a single
 * signature accent (iris). Secondary accents are reserved for meaning:
 * priority, list tags, success and destructive states. Everything else is
 * grayscale so the accent always reads as "the thing to touch".
 */
import { Platform, useColorScheme, type TextStyle, type ViewStyle } from 'react-native';

// ─── Raw palette ────────────────────────────────────────────────────────────
// Named hues, never used directly in components — go through `colors`.
export const palette = {
  // Neutrals: very slightly cool, so blacks feel deep rather than muddy.
  ink950: '#08080B',
  ink900: '#0E0E13',
  ink850: '#14141A',
  ink800: '#1B1B23',
  ink700: '#26262F',
  ink600: '#34343F',
  ink500: '#4A4A57',
  ink400: '#6E6E7C',
  ink300: '#9A9AA8',
  ink200: '#C7C7D1',
  ink100: '#E6E6EC',
  ink50: '#F5F5F8',
  white: '#FFFFFF',

  // Signature accent
  iris500: '#8B7CFF',
  iris400: '#A396FF',
  iris600: '#7262F2',
  iris700: '#5B4BD6',

  // Semantic accents
  mint: '#4FE0B0',
  amber: '#FFB547',
  coral: '#FF6B6B',
  sky: '#5AC8FA',
  rose: '#FF7AC6',
  lime: '#B8F05A',
} as const;

/** Adds alpha to a #RRGGBB hex. */
export const alpha = (hex: string, a: number) =>
  `${hex}${Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0')}`;

// ─── Semantic colors ────────────────────────────────────────────────────────
const dark = {
  // Surfaces, from back to front
  background: palette.ink950,
  surface: palette.ink900,
  surfaceElevated: palette.ink850,
  surfaceOverlay: palette.ink800,
  surfacePressed: palette.ink700,

  // Hairlines
  border: alpha(palette.white, 0.07),
  borderStrong: alpha(palette.white, 0.12),
  separator: alpha(palette.white, 0.05),

  // Text
  text: palette.ink50,
  textSecondary: palette.ink300,
  textTertiary: palette.ink400,
  textDisabled: palette.ink500,
  textOnAccent: palette.white,

  // Accent
  accent: palette.iris500,
  accentPressed: palette.iris600,
  accentMuted: alpha(palette.iris500, 0.16),
  accentGlow: alpha(palette.iris500, 0.45),

  // Semantic
  success: palette.mint,
  successMuted: alpha(palette.mint, 0.14),
  warning: palette.amber,
  warningMuted: alpha(palette.amber, 0.14),
  danger: palette.coral,
  dangerMuted: alpha(palette.coral, 0.14),
  info: palette.sky,

  // Checkbox
  checkboxBorder: palette.ink500,
  checkboxFill: palette.iris500,

  scrim: alpha(palette.ink950, 0.72),
};

export type ColorTokens = { [K in keyof typeof dark]: string };

const light: ColorTokens = {
  background: '#F7F7FA',
  surface: palette.white,
  surfaceElevated: palette.white,
  surfaceOverlay: palette.white,
  surfacePressed: palette.ink100,

  border: alpha(palette.ink950, 0.07),
  borderStrong: alpha(palette.ink950, 0.12),
  separator: alpha(palette.ink950, 0.05),

  text: palette.ink950,
  textSecondary: palette.ink400,
  textTertiary: palette.ink300,
  textDisabled: palette.ink200,
  textOnAccent: palette.white,

  accent: palette.iris600,
  accentPressed: palette.iris700,
  accentMuted: alpha(palette.iris600, 0.1),
  accentGlow: alpha(palette.iris600, 0.3),

  success: '#1FB889',
  successMuted: alpha('#1FB889', 0.12),
  warning: '#E89B1C',
  warningMuted: alpha('#E89B1C', 0.12),
  danger: '#E5484D',
  dangerMuted: alpha('#E5484D', 0.1),
  info: '#0A84FF',

  checkboxBorder: palette.ink200,
  checkboxFill: palette.iris600,

  scrim: alpha(palette.ink950, 0.35),
};

/** Tag colors for lists / projects. Each has a solid and a tinted fill. */
export const tagColors = {
  iris: { solid: palette.iris500, muted: alpha(palette.iris500, 0.16) },
  mint: { solid: palette.mint, muted: alpha(palette.mint, 0.14) },
  amber: { solid: palette.amber, muted: alpha(palette.amber, 0.14) },
  coral: { solid: palette.coral, muted: alpha(palette.coral, 0.14) },
  sky: { solid: palette.sky, muted: alpha(palette.sky, 0.14) },
  rose: { solid: palette.rose, muted: alpha(palette.rose, 0.14) },
  lime: { solid: palette.lime, muted: alpha(palette.lime, 0.14) },
} as const;
export type TagColor = keyof typeof tagColors;

export const priorityColors = {
  none: palette.ink500,
  low: palette.sky,
  medium: palette.amber,
  high: palette.coral,
} as const;
export type Priority = keyof typeof priorityColors;

// ─── Spacing (4pt grid) ─────────────────────────────────────────────────────
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
  '6xl': 72,
} as const;

/** Standard layout measurements. */
export const layout = {
  screenPadding: spacing.xl,
  rowMinHeight: 56,
  rowGap: spacing.sm,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
  checkboxSize: 24,
  fabSize: 60,
  iconSize: { sm: 16, md: 20, lg: 24 },
} as const;

// ─── Radii ──────────────────────────────────────────────────────────────────
export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────
// SF Pro on iOS (system font). Tracking follows Apple's optical sizing:
// tighter at display sizes, neutral at body.
const fontFamily = Platform.select({ ios: undefined, default: 'System' });

const type = (
  fontSize: number,
  lineHeight: number,
  fontWeight: TextStyle['fontWeight'],
  letterSpacing = 0,
): TextStyle => ({ fontFamily, fontSize, lineHeight, fontWeight, letterSpacing });

export const typography = {
  display: type(40, 44, '700', -0.8),
  largeTitle: type(34, 40, '700', -0.6),
  title: type(28, 34, '700', -0.4),
  title2: type(22, 28, '600', -0.3),
  headline: type(17, 22, '600', -0.2),
  body: type(17, 24, '400', -0.2),
  bodyMedium: type(17, 24, '500', -0.2),
  callout: type(16, 22, '400', -0.15),
  subhead: type(15, 20, '400', -0.1),
  footnote: type(13, 18, '400', 0),
  caption: type(12, 16, '500', 0.1),
  /** Small uppercase section labels ("TODAY", "UPCOMING"). */
  overline: type(12, 16, '600', 1.2),
  /** Counters and dates — tabular figures so numbers don't jitter. */
  numeric: { ...type(15, 20, '500', 0), fontVariant: ['tabular-nums'] } as TextStyle,
} as const;

// ─── Elevation ──────────────────────────────────────────────────────────────
// On dark, shadows barely read — depth comes from lighter surfaces plus a
// hairline border. Shadows stay soft and large for the few floating elements.
const shadow = (
  color: string,
  y: number,
  blur: number,
  opacity: number,
  elevation: number,
): ViewStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: y },
  shadowRadius: blur,
  shadowOpacity: opacity,
  elevation,
});

export const shadows = {
  none: shadow('#000', 0, 0, 0, 0),
  sm: shadow('#000', 1, 3, 0.25, 1),
  md: shadow('#000', 6, 16, 0.35, 4),
  lg: shadow('#000', 16, 32, 0.45, 10),
  /** Colored bloom under the primary action. */
  glow: shadow(palette.iris500, 8, 24, 0.55, 8),
} as const;

// ─── Opacity ────────────────────────────────────────────────────────────────
export const opacity = {
  disabled: 0.38,
  pressed: 0.7,
  completed: 0.45,
} as const;

// ─── Theme object ───────────────────────────────────────────────────────────
export const themes = { dark, light } as const;

export const theme = {
  colors: dark,
  palette,
  tagColors,
  priorityColors,
  spacing,
  layout,
  radii,
  typography,
  shadows,
  opacity,
} as const;

export type Theme = Omit<typeof theme, 'colors'> & { colors: ColorTokens; scheme: 'dark' | 'light' };

/** Dark is the default; light follows the system only when asked to. */
export function useTheme(followSystem = false): Theme {
  const system = useColorScheme();
  const scheme = followSystem && system === 'light' ? 'light' : 'dark';
  return { ...theme, colors: themes[scheme], scheme };
}
