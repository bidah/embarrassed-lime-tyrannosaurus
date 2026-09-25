/**
 * Motion system — quiet by default, springy on touch.
 *
 * Rules:
 *  - Direct manipulation (press, toggle) uses springs, so it feels physical
 *    and can be interrupted mid-flight.
 *  - Appearing / disappearing content uses short eased timing, never bounce.
 *  - Every state change the user causes gets a light haptic.
 */
import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutLeft,
  LinearTransition,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// ─── Tokens ─────────────────────────────────────────────────────────────────
export const durations = {
  instant: 90,
  fast: 160,
  base: 240,
  slow: 360,
  stagger: 45,
} as const;

export const easings = {
  /** Apple-like ease-out: fast start, long gentle settle. */
  standard: Easing.bezier(0.2, 0.8, 0.2, 1),
  emphasized: Easing.bezier(0.3, 0, 0, 1),
  exit: Easing.bezier(0.4, 0, 1, 1),
} as const;

export const springs = {
  /** Button press-in: firm, no overshoot. */
  press: { damping: 22, stiffness: 420, mass: 0.6 },
  /** Release / toggles: a hint of overshoot. */
  bouncy: { damping: 13, stiffness: 260, mass: 0.7 },
  /** Layout moves, sheets. */
  gentle: { damping: 20, stiffness: 180, mass: 1 },
} as const;

// ─── Layout animation presets (entering / exiting / layout props) ───────────
export const enterRow = (index = 0) =>
  FadeInDown.duration(durations.slow)
    .delay(Math.min(index, 10) * durations.stagger)
    .easing(easings.standard)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });

export const exitRow = FadeOutLeft.duration(durations.base).easing(easings.exit);

export const fadeIn = FadeIn.duration(durations.base).easing(easings.standard);
export const fadeOut = FadeOut.duration(durations.fast).easing(easings.exit);

/** Smooth reflow when rows are added, removed or reordered. */
export const layoutTransition = LinearTransition.springify()
  .damping(springs.gentle.damping)
  .stiffness(springs.gentle.stiffness);

// ─── Haptics ────────────────────────────────────────────────────────────────
export const haptics = {
  tap: () => Haptics.selectionAsync().catch(() => {}),
  toggle: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Press feedback: scales down and dims slightly while held, springs back on
 * release. Spread `handlers` onto a Pressable and `style` onto an Animated.View.
 */
export function usePressScale(to = 0.97) {
  const pressed = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, to]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.92]),
  }));

  const onPressIn = useCallback(() => {
    pressed.value = withSpring(1, springs.press);
  }, [pressed]);
  const onPressOut = useCallback(() => {
    pressed.value = withSpring(0, springs.bouncy);
  }, [pressed]);

  return { style, handlers: { onPressIn, onPressOut } };
}

/**
 * Checkbox completion: the ring fills with color, the check pops in with a
 * small overshoot, and the whole control does a tiny "pulse".
 */
export function useCheckAnimation(
  checked: boolean,
  colors: { border: string; fill: string },
) {
  const progress = useDerivedValue(() =>
    withTiming(checked ? 1 : 0, { duration: durations.base, easing: easings.standard }),
  );
  const pop = useDerivedValue(() =>
    checked ? withSpring(1, springs.bouncy) : withTiming(0, { duration: durations.fast }),
  );

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', colors.fill]),
    borderColor: interpolateColor(progress.value, [0, 1], [colors.border, colors.fill]),
    transform: [{ scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.12, 1]) }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: interpolate(pop.value, [0, 1], [0.4, 1]) }],
  }));

  return { boxStyle, checkStyle, progress };
}

/** Completed task text: fades back and the strike line draws left → right. */
export function useStrikeAnimation(checked: boolean) {
  const progress = useDerivedValue(() =>
    withTiming(checked ? 1 : 0, { duration: durations.slow, easing: easings.emphasized }),
  );
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0.45]),
  }));
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
    opacity: progress.value > 0.01 ? 1 : 0,
  }));
  return { textStyle, lineStyle };
}

/** Gentle horizontal shake for invalid input (e.g. empty task title). */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = useCallback(() => {
    const t = { duration: 50 };
    x.value = withSequence(
      withTiming(-6, t),
      withTiming(6, t),
      withTiming(-4, t),
      withTiming(4, t),
      withSpring(0, springs.press),
    );
    haptics.warning();
  }, [x]);
  return { style, shake };
}

/** Animates a 0→1 fraction (e.g. daily progress ring / bar). */
export function useProgress(value: number) {
  return useDerivedValue(() => withSpring(value, springs.gentle));
}
