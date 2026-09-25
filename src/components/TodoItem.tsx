/**
 * A single todo card.
 *
 * Gestures (all on the UI thread):
 *  - Tap           → toggle complete
 *  - Swipe right   → complete (mint reveal)
 *  - Swipe left    → delete   (coral reveal, card flies off)
 *
 * Crossing the commit threshold ticks a haptic so the user feels the point
 * of no return before they let go.
 */
import { memo, useCallback } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { isOverdue, subtaskProgress, todayISO, useCategory, useTodo } from '../store/todoStore';
import { priorityColors, tagColors, useTheme } from '../theme';
import { durations, easings, haptics, springs, useCheckAnimation, useStrikeAnimation } from '../motion';
import type { DueDate, ID } from '../types';

const THRESHOLD = 88;

type Props = {
  id: ID;
  onToggle: (id: ID) => void;
  onDelete: (id: ID) => void;
};

function TodoItem({ id, onToggle, onDelete }: Props) {
  const todo = useTodo(id);
  const category = useCategory(todo?.categoryId ?? null);
  const t = useTheme();
  const { width } = useWindowDimensions();

  const completed = todo?.completed ?? false;
  const check = useCheckAnimation(completed, { border: t.colors.checkboxBorder, fill: t.colors.checkboxFill });
  const strike = useStrikeAnimation(completed);

  const x = useSharedValue(0);
  const pressed = useSharedValue(0);
  const armed = useSharedValue(0); // -1 delete, 0 idle, 1 complete

  const toggle = useCallback(() => onToggle(id), [id, onToggle]);
  const remove = useCallback(() => onDelete(id), [id, onDelete]);

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      // Rubber-band past the threshold so the card feels tethered.
      const d = e.translationX;
      const over = Math.max(0, Math.abs(d) - THRESHOLD);
      x.value = Math.sign(d) * (Math.min(Math.abs(d), THRESHOLD) + over * 0.55);

      const next = d > THRESHOLD ? 1 : d < -THRESHOLD ? -1 : 0;
      if (next !== armed.value) {
        armed.value = next;
        if (next !== 0) scheduleOnRN(haptics.toggle);
      }
    })
    .onEnd(() => {
      if (armed.value === -1) {
        x.value = withTiming(-width, { duration: durations.base, easing: easings.exit }, (done) => {
          if (done) scheduleOnRN(remove);
        });
      } else {
        if (armed.value === 1) scheduleOnRN(toggle);
        x.value = withSpring(0, springs.bouncy);
      }
      armed.value = 0;
    });

  const tap = Gesture.Tap()
    .maxDuration(400)
    .onBegin(() => {
      pressed.value = withSpring(1, springs.press);
    })
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(toggle);
    })
    .onFinalize(() => {
      pressed.value = withSpring(0, springs.bouncy);
    });

  const gesture = Gesture.Exclusive(pan, tap);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { scale: interpolate(pressed.value, [0, 1], [1, 0.975]) },
      { rotateZ: `${interpolate(x.value, [-width, 0, width], [-4, 0, 4])}deg` },
    ],
  }));

  const leftReveal = useAnimatedStyle(() => {
    const p = interpolate(x.value, [0, THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: p,
      transform: [{ scale: interpolate(p, [0, 1], [0.5, x.value > THRESHOLD ? 1.15 : 1]) }],
    };
  });
  const rightReveal = useAnimatedStyle(() => {
    const p = interpolate(x.value, [-THRESHOLD, 0], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: p,
      transform: [{ scale: interpolate(p, [0, 1], [0.5, x.value < -THRESHOLD ? 1.15 : 1]) }],
    };
  });
  const trackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(x.value), [0, 24], [0, 1], Extrapolation.CLAMP),
    backgroundColor: x.value >= 0 ? t.colors.successMuted : t.colors.dangerMuted,
  }));

  if (!todo) return null;

  const tag = category ? tagColors[category.color] : null;
  const progress = subtaskProgress(todo);
  const overdue = isOverdue(todo);
  const hasPriority = todo.priority !== 'none';

  return (
    <View className="mx-5">
      {/* Swipe track */}
      <Animated.View
        style={trackStyle}
        className="absolute inset-0 flex-row items-center justify-between rounded-lg px-6"
      >
        <Animated.View style={leftReveal} className="flex-row items-center gap-2">
          <Ionicons name={completed ? 'arrow-undo' : 'checkmark-circle'} size={22} color={t.colors.success} />
          <Text className="text-[13px] font-semibold text-mint">{completed ? 'Reopen' : 'Done'}</Text>
        </Animated.View>
        <Animated.View style={rightReveal} className="flex-row items-center gap-2">
          <Text className="text-[13px] font-semibold text-coral">Delete</Text>
          <Ionicons name="trash" size={20} color={t.colors.danger} />
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={cardStyle}
          className="flex-row items-center gap-3.5 overflow-hidden rounded-lg border border-white/[0.07] bg-ink-900 py-3.5 pl-4 pr-4"
        >
          {/* Priority spine */}
          {hasPriority && (
            <View
              className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full"
              style={{ backgroundColor: priorityColors[todo.priority], opacity: completed ? 0.3 : 1 }}
            />
          )}

          <Animated.View
            style={check.boxStyle}
            className="h-6 w-6 items-center justify-center rounded-full border-[1.5px]"
          >
            <Animated.View style={check.checkStyle}>
              <Ionicons name="checkmark" size={15} color={t.colors.textOnAccent} />
            </Animated.View>
          </Animated.View>

          <View className="flex-1 gap-1.5">
            <Animated.View style={strike.textStyle} className="max-w-full self-start">
              <Text numberOfLines={2} className="text-[17px] leading-[23px] tracking-tight text-ink-50">
                {todo.title}
              </Text>
              <Animated.View
                style={[strike.lineStyle, { transformOrigin: 'left' }]}
                className="absolute left-0 right-0 top-[11px] h-[1.5px] bg-ink-300"
              />
            </Animated.View>

            {(tag || todo.due || progress.total > 0) && (
              <View className="flex-row flex-wrap items-center gap-2" style={{ opacity: completed ? 0.5 : 1 }}>
                {tag && category && (
                  <View className="flex-row items-center gap-1.5 rounded-full px-2 py-0.5" style={{ backgroundColor: tag.muted }}>
                    <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.solid }} />
                    <Text className="text-[12px] font-medium" style={{ color: tag.solid }}>
                      {category.name}
                    </Text>
                  </View>
                )}
                {todo.due && (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="calendar-clear-outline" size={12} color={overdue ? t.colors.danger : t.colors.textTertiary} />
                    <Text className={`text-[12px] font-medium ${overdue ? 'text-coral' : 'text-ink-400'}`}>
                      {formatDue(todo.due)}
                    </Text>
                  </View>
                )}
                {progress.total > 0 && (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="git-commit-outline" size={12} color={t.colors.textTertiary} />
                    <Text className="text-[12px] font-medium text-ink-400" style={{ fontVariant: ['tabular-nums'] }}>
                      {progress.done}/{progress.total}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {hasPriority && !completed && (
            <Ionicons name="flag" size={14} color={priorityColors[todo.priority]} />
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default memo(TodoItem);

const DAY = 86_400_000;

function formatDue({ date, time }: DueDate) {
  const today = todayISO();
  const diff = Math.round((new Date(`${date}T00:00`).getTime() - new Date(`${today}T00:00`).getTime()) / DAY);
  const label =
    diff === 0
      ? 'Today'
      : diff === 1
        ? 'Tomorrow'
        : diff === -1
          ? 'Yesterday'
          : new Date(`${date}T00:00`).toLocaleDateString(undefined, {
              weekday: Math.abs(diff) < 7 ? 'short' : undefined,
              month: Math.abs(diff) < 7 ? undefined : 'short',
              day: Math.abs(diff) < 7 ? undefined : 'numeric',
            });
  return time ? `${label}, ${time}` : label;
}
