/**
 * Floating composer. Rides the keyboard on the UI thread, expands an options
 * tray (category, priority, due today) while focused, and answers every
 * interaction with a haptic — a shake + warning when submitted empty.
 */
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { todayISO, useCategories } from '../store/todoStore';
import { priorityColors, tagColors, useTheme } from '../theme';
import { durations, easings, fadeIn, fadeOut, haptics, springs, usePressScale, useShake } from '../motion';
import { PRIORITIES, type ID, type NewTodo, type Priority } from '../types';

type Props = {
  onAdd: (input: NewTodo) => void;
  /** Pre-selected category (e.g. when viewing a category). */
  defaultCategoryId?: ID | null;
};

const PRIORITY_LABEL: Record<Priority, string> = { none: 'Priority', low: 'Low', medium: 'Medium', high: 'High' };

export default function AddTodo({ onAdd, defaultCategoryId = null }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const categories = useCategories();

  const [title, setTitle] = useState('');
  const [focused, setFocused] = useState(false);
  const [categoryId, setCategoryId] = useState<ID | null>(defaultCategoryId);
  const [priority, setPriority] = useState<Priority>('none');
  const [dueToday, setDueToday] = useState(false);

  const keyboard = useAnimatedKeyboard();
  const { style: shakeStyle, shake } = useShake();
  const send = usePressScale(0.88);

  const hasText = title.trim().length > 0;
  const ready = useDerivedValue(() => withSpring(hasText ? 1 : 0, springs.bouncy));
  const focus = useDerivedValue(() =>
    withTiming(focused ? 1 : 0, { duration: durations.base, easing: easings.standard }),
  );

  const dock = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.height.value - insets.bottom) }],
  }));

  const field = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [t.colors.border, t.colors.accentGlow]),
    shadowOpacity: interpolate(focus.value, [0, 1], [0, 0.4]),
  }));

  const sendStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(ready.value, [0, 1], [t.colors.surfacePressed, t.colors.accent]),
    transform: [{ rotate: `${interpolate(ready.value, [0, 1], [-90, 0])}deg` }],
  }));

  const submit = () => {
    if (!hasText) {
      shake();
      return;
    }
    onAdd({ title, categoryId, priority, due: dueToday ? { date: todayISO(), time: null } : null });
    haptics.success();
    setTitle('');
    setPriority('none');
    setDueToday(false);
  };

  const cyclePriority = () => {
    haptics.tap();
    setPriority((p) => PRIORITIES[(PRIORITIES.indexOf(p) + 1) % PRIORITIES.length]);
  };

  return (
    <Animated.View style={dock} className="absolute bottom-0 left-0 right-0">
      <BlurView
        intensity={40}
        tint="dark"
        style={{ paddingBottom: insets.bottom + 8, borderTopWidth: 1, borderTopColor: t.colors.separator }}
      >
        <View className="absolute inset-0 bg-ink-950/70" />

        {focused && (
          <Animated.View entering={fadeIn} exiting={fadeOut}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 8 }}
            >
              <Chip
                active={dueToday}
                icon="sunny"
                label="Today"
                color={t.colors.warning}
                onPress={() => {
                  haptics.tap();
                  setDueToday((v) => !v);
                }}
              />
              <Chip
                active={priority !== 'none'}
                icon="flag"
                label={PRIORITY_LABEL[priority]}
                color={priorityColors[priority === 'none' ? 'high' : priority]}
                onPress={cyclePriority}
              />
              <View className="mx-1 w-px self-stretch bg-white/[0.08]" />
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  active={categoryId === c.id}
                  dot
                  label={c.name}
                  color={tagColors[c.color].solid}
                  onPress={() => {
                    haptics.tap();
                    setCategoryId((cur) => (cur === c.id ? null : c.id));
                  }}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <View className="flex-row items-center gap-2.5 px-4 pt-3">
          <Animated.View
            style={[field, shakeStyle, { shadowColor: t.colors.accent, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }]}
            className="h-[52px] flex-1 flex-row items-center rounded-full border bg-ink-850 pl-5 pr-2"
          >
            <TextInput
              value={title}
              onChangeText={setTitle}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={submit}
              submitBehavior="submit"
              returnKeyType="done"
              placeholder="What needs doing?"
              placeholderTextColor={t.colors.textTertiary}
              selectionColor={t.colors.accent}
              keyboardAppearance="dark"
              className="flex-1 text-[17px] text-ink-50"
            />
          </Animated.View>

          <Pressable onPress={submit} {...send.handlers} hitSlop={8} accessibilityLabel="Add task">
            <Animated.View style={[send.style]}>
              <Animated.View style={sendStyle} className="h-[52px] w-[52px] items-center justify-center rounded-full">
                <Ionicons name="arrow-up" size={24} color={t.colors.textOnAccent} />
              </Animated.View>
            </Animated.View>
          </Pressable>
        </View>
      </BlurView>
    </Animated.View>
  );
}

type ChipProps = {
  label: string;
  color: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  dot?: boolean;
};

function Chip({ label, color, active, onPress, icon, dot }: ChipProps) {
  const t = useTheme();
  const press = usePressScale(0.94);
  const on = useDerivedValue(() => withSpring(active ? 1 : 0, springs.bouncy));
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [t.colors.surfaceElevated, `${color}26`]),
    borderColor: interpolateColor(on.value, [0, 1], [t.colors.border, `${color}66`]),
  }));
  const tint = active ? color : t.colors.textSecondary;

  return (
    <Pressable onPress={onPress} {...press.handlers}>
      <Animated.View style={[style, press.style]} className="h-9 flex-row items-center gap-1.5 rounded-full border px-3.5">
        {icon && <Ionicons name={icon} size={13} color={tint} />}
        {dot && <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
        <Text className="text-[14px] font-medium" style={{ color: active ? color : t.colors.textSecondary }}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
