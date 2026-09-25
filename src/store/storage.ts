/**
 * MMKV-backed persistence. MMKV is synchronous, so the store hydrates before
 * the first render — no loading flash.
 */
import { createMMKV } from 'react-native-mmkv';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

export const mmkv = createMMKV({ id: 'todo-app' });

const mmkvStateStorage: StateStorage = {
  getItem: (key) => mmkv.getString(key) ?? null,
  setItem: (key, value) => mmkv.set(key, value),
  removeItem: (key) => {
    mmkv.remove(key);
  },
};

/** Drop-in `storage` option for zustand's `persist` middleware. */
export const zustandStorage = createJSONStorage(() => mmkvStateStorage);
