/**
 * Animated list of todos. Rows stagger in on first mount, slide out on delete,
 * and neighbours spring into the gap. Completed items sink below a divider.
 */
import { useCallback, useEffect, useRef, type ReactElement } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import TodoItem from './TodoItem';
import { enterRow, exitRow, fadeIn, layoutTransition } from '../motion';
import { useTheme } from '../theme';
import type { ID, Todo } from '../types';

type Row = { kind: 'todo'; id: ID } | { kind: 'divider'; count: number };

type Props = {
  todos: Todo[];
  onToggle: (id: ID) => void;
  onDelete: (id: ID) => void;
  header?: ReactElement;
  emptyTitle?: string;
  emptyMessage?: string;
  bottomInset?: number;
};

export default function TodoList({
  todos,
  onToggle,
  onDelete,
  header,
  emptyTitle = 'A clear mind',
  emptyMessage = 'Nothing here. Add something below.',
  bottomInset = 0,
}: Props) {
  const done = todos.filter((t) => t.completed);
  const open = todos.length - done.length;
  const rows: Row[] = todos.map((t) => ({ kind: 'todo', id: t.id }));
  // Only show the divider when both groups exist — a lone "Completed" header
  // above a list of completed items is noise.
  if (done.length && open) rows.splice(open, 0, { kind: 'divider', count: done.length });

  // Stagger only the first paint; later additions should appear immediately.
  const settled = useRef(false);
  useEffect(() => {
    const id = setTimeout(() => (settled.current = true), 600);
    return () => clearTimeout(id);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Row; index: number }) =>
      item.kind === 'divider' ? (
        <Animated.View entering={fadeIn} className="mx-6 mb-1 mt-5 flex-row items-center gap-3">
          <Text className="text-[12px] font-semibold tracking-[1.2px] text-ink-400">COMPLETED</Text>
          <Text className="text-[12px] font-semibold text-ink-500">{item.count}</Text>
          <View className="h-px flex-1 bg-white/[0.06]" />
        </Animated.View>
      ) : (
        <Animated.View entering={enterRow(settled.current ? 0 : index)} exiting={exitRow}>
          <TodoItem id={item.id} onToggle={onToggle} onDelete={onDelete} />
        </Animated.View>
      ),
    [onToggle, onDelete],
  );

  return (
    <Animated.FlatList
      data={rows}
      keyExtractor={(r) => (r.kind === 'todo' ? r.id : 'divider')}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState title={emptyTitle} message={emptyMessage} />}
      ItemSeparatorComponent={() => <View className="h-2" />}
      itemLayoutAnimation={layoutTransition}
      contentContainerStyle={{ paddingBottom: bottomInset + 24, flexGrow: 1 }}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  const t = useTheme();
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float]);

  const orb = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 * float.value }, { scale: 1 + 0.04 * float.value }],
    shadowOpacity: 0.35 + 0.3 * float.value,
  }));

  return (
    <Animated.View entering={fadeIn} className="flex-1 items-center justify-center px-10 pb-16 pt-12">
      <Animated.View
        style={[orb, { shadowColor: t.colors.accent, shadowRadius: 28, shadowOffset: { width: 0, height: 0 } }]}
        className="h-20 w-20 items-center justify-center rounded-full border border-iris-500/30 bg-iris-500/10"
      >
        <Ionicons name="sparkles" size={30} color={t.colors.accent} />
      </Animated.View>
      <Text className="mt-6 text-[20px] font-semibold tracking-tight text-ink-50">{title}</Text>
      <Text className="mt-1.5 text-center text-[15px] leading-5 text-ink-400">{message}</Text>
    </Animated.View>
  );
}
