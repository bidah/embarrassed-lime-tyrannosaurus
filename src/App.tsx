import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import AddTodo from './components/AddTodo';
import TodoList from './components/TodoList';
import { mmkv } from './store/storage';
import { todayISO, todoActions, useTodoList, useTodoStore } from './store/todoStore';
import { palette, useTheme } from './theme';
import { easings, haptics, springs, useProgress } from './motion';
import type { ID, NewTodo, Todo } from './types';

seedDemoOnce();

type Tab = 'today' | 'all' | 'done';
const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'all', label: 'All' },
  { key: 'done', label: 'Done' },
];

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Home />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Home() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('today');

  const today = useTodoList({ kind: 'smart', list: 'today' });
  const open = useTodoList({ kind: 'smart', list: 'all' });
  const done = useTodoList({ kind: 'smart', list: 'completed' });
  const doneToday = done.filter((t) => t.completedAt?.startsWith(todayISO()) ?? false);

  const lists: Record<Tab, Todo[]> = {
    today: [...today, ...doneToday.filter((t) => t.due && t.due.date <= todayISO())],
    all: [...open, ...done],
    done,
  };

  // Progress is always about today: what's due plus what you finished.
  const todayDone = lists.today.filter((t) => t.completed).length;
  const todayTotal = lists.today.length;

  const [undo, setUndo] = useState<Todo | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onToggle = useCallback((id: ID) => {
    const { toggleTodo } = todoActions();
    const wasOpen = !useTodoStore.getState().todos[id]?.completed;
    toggleTodo(id);
    const remaining = Object.values(useTodoStore.getState().todos).filter(
      (t) => !t.completed && t.due && t.due.date <= todayISO(),
    ).length;
    if (wasOpen && remaining === 0) haptics.success();
    else haptics.toggle();
  }, []);

  const onDelete = useCallback((id: ID) => {
    const removed = todoActions().deleteTodo(id);
    haptics.heavy();
    if (!removed) return;
    setUndo(removed);
    clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 4000);
  }, []);

  const onUndo = () => {
    if (undo) todoActions().restoreTodo(undo);
    haptics.tap();
    clearTimeout(undoTimer.current);
    setUndo(null);
  };

  const onAdd = useCallback((input: NewTodo) => {
    todoActions().addTodo(input);
  }, []);

  const empty: Record<Tab, [string, string]> = {
    today: ['Today is clear', 'Enjoy it — or plan something below.'],
    all: ['A clear mind', 'Nothing on your plate yet.'],
    done: ['Nothing finished yet', 'Swipe a task right to complete it.'],
  };

  return (
    <View className="flex-1 bg-ink-950">
      <StatusBar style="light" />
      {/* Ambient iris glow behind the header */}
      <LinearGradient
        colors={['#8B7CFF26', '#8B7CFF08', 'transparent']}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 420 }}
        pointerEvents="none"
      />

      <View style={{ flex: 1, paddingTop: insets.top }}>
        <TodoList
          todos={lists[tab]}
          onToggle={onToggle}
          onDelete={onDelete}
          emptyTitle={empty[tab][0]}
          emptyMessage={empty[tab][1]}
          bottomInset={insets.bottom + 90}
          header={
            <View className="px-5 pb-4 pt-4">
              <Header done={todayDone} total={todayTotal} />
              <Tabs value={tab} onChange={setTab} counts={{ today: today.length, all: open.length, done: done.length }} />
            </View>
          }
        />
      </View>

      {undo && (
        <Animated.View
          entering={FadeInDown.springify().damping(springs.bouncy.damping)}
          exiting={FadeOutDown.duration(180).easing(easings.exit)}
          style={{ bottom: insets.bottom + 92 }}
          className="absolute left-5 right-5 flex-row items-center justify-between rounded-full border border-white/10 bg-ink-800 py-2.5 pl-5 pr-2"
        >
          <Text numberOfLines={1} className="mr-3 flex-1 text-[15px] text-ink-100">
            Deleted “{undo.title}”
          </Text>
          <Pressable onPress={onUndo} hitSlop={8} className="rounded-full bg-iris-500/20 px-4 py-2">
            <Text className="text-[14px] font-semibold text-iris-400">Undo</Text>
          </Pressable>
        </Animated.View>
      )}

      <AddTodo onAdd={onAdd} />
    </View>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function Header({ done, total }: { done: number; total: number }) {
  const t = useTheme();
  const date = new Date()
    .toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();
  const all = total > 0 && done === total;
  const left = total - done;

  return (
    <View>
      <Text className="text-[12px] font-semibold tracking-[1.2px] text-iris-400">{date}</Text>
      <View className="mt-1 flex-row items-end justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-[40px] font-bold leading-[44px] tracking-[-0.8px] text-ink-50">{greeting()}</Text>
          <Text className="mt-2 text-[15px] leading-5 text-ink-300">
            {total === 0
              ? 'Nothing due today.'
              : all
                ? 'Everything for today is done. ✦'
                : `${left} ${left === 1 ? 'task' : 'tasks'} left for today`}
          </Text>
        </View>
        <ProgressRing value={total ? done / total : 0} label={total ? `${Math.round((done / total) * 100)}%` : '—'} color={all ? t.colors.success : undefined} />
      </View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING = 76;
const STROKE = 7;
const R = (RING - STROKE) / 2;
const C = 2 * Math.PI * R;

function ProgressRing({ value, label, color }: { value: number; label: string; color?: string }) {
  const progress = useProgress(value);
  const props = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - progress.value) }));

  return (
    <View style={{ width: RING, height: RING }} className="items-center justify-center">
      <Svg width={RING} height={RING} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color ?? palette.iris400} />
            <Stop offset="1" stopColor={color ?? palette.iris700} />
          </SvgGradient>
        </Defs>
        <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={palette.ink800} strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          stroke="url(#ring)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${C} ${C}`}
          animatedProps={props}
        />
      </Svg>
      <Text className="text-[15px] font-semibold text-ink-50" style={{ fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Tabs ───────────────────────────────────────────────────────────────────

function Tabs({ value, onChange, counts }: { value: Tab; onChange: (t: Tab) => void; counts: Record<Tab, number> }) {
  const [widths, setWidths] = useState<number[]>([]);
  const index = TABS.findIndex((x) => x.key === value);
  const x = useSharedValue(0);
  const w = useSharedValue(0);

  useEffect(() => {
    if (widths.length !== TABS.length) return;
    x.value = withSpring(widths.slice(0, index).reduce((a, b) => a + b, 0), springs.gentle);
    w.value = withSpring(widths[index], springs.gentle);
  }, [index, widths, x, w]);

  const pill = useAnimatedStyle(() => ({ width: w.value, transform: [{ translateX: x.value }] }));

  const measure = (i: number) => (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    setWidths((prev) => {
      if (prev[i] === width) return prev;
      const next = [...prev];
      next[i] = width;
      return next;
    });
  };

  return (
    <View className="mt-7 flex-row self-start rounded-full border border-white/[0.07] bg-ink-900 p-1">
      <Animated.View style={pill} className="absolute bottom-1 left-1 top-1 rounded-full bg-ink-700" />
      {TABS.map((tab, i) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onLayout={measure(i)}
            onPress={() => {
              if (active) return;
              haptics.tap();
              onChange(tab.key);
            }}
            className="flex-row items-center gap-1.5 px-4 py-2"
          >
            <Text className={`text-[15px] font-semibold ${active ? 'text-ink-50' : 'text-ink-400'}`}>{tab.label}</Text>
            <Text
              className={`text-[13px] font-semibold ${active ? 'text-iris-400' : 'text-ink-500'}`}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {counts[tab.key]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Late night' : h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
}

/** First launch only: a few example tasks so the app isn't a blank page. */
function seedDemoOnce() {
  if (mmkv.getBoolean('demo-seeded')) return;
  mmkv.set('demo-seeded', true);
  const { todos, categories } = useTodoStore.getState();
  if (Object.keys(todos).length) return;

  const cat = (name: string) => Object.values(categories).find((c) => c.name === name)?.id ?? null;
  const day = (offset: number) => todayISO(new Date(Date.now() + offset * 86_400_000));
  const { addTodo, toggleTodo } = todoActions();

  addTodo({ title: 'Review launch deck with the team', categoryId: cat('Work'), priority: 'high', due: { date: day(0), time: '10:30' }, subtasks: ['Metrics slide', 'Pricing', 'Q&A prep'] });
  addTodo({ title: 'Morning run, 5 km', categoryId: cat('Personal'), due: { date: day(0), time: null } });
  addTodo({ title: 'Pick up flowers for Sam', categoryId: cat('Errands'), priority: 'low', due: { date: day(0), time: null } });
  addTodo({ title: 'Reply to design feedback', categoryId: cat('Work'), priority: 'medium', due: { date: day(-1), time: null } });
  addTodo({ title: 'Book dentist appointment', categoryId: cat('Personal'), due: { date: day(2), time: null } });
  addTodo({ title: 'Read one chapter', categoryId: null });
  const doneId = addTodo({ title: 'Water the plants', categoryId: cat('Errands'), due: { date: day(0), time: null } });
  toggleTodo(doneId);
}
