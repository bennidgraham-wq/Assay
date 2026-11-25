// Tiny global stores (search overlay, recently viewed, compare list) built on
// useSyncExternalStore. Per-viewer conveniences persist in localStorage when available;
// everything works without it.
import { useSyncExternalStore } from 'react';

function createStore<T>(initial: T, persistKey?: string) {
  let state = initial;
  if (persistKey) {
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) state = JSON.parse(raw) as T;
    } catch {
      /* storage unavailable */
    }
  }
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next: T | ((prev: T) => T)) {
      state = typeof next === 'function' ? (next as (p: T) => T)(state) : next;
      if (persistKey) {
        try {
          localStorage.setItem(persistKey, JSON.stringify(state));
        } catch {
          /* storage unavailable */
        }
      }
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

function useStore<T>(s: ReturnType<typeof createStore<T>>) {
  return useSyncExternalStore(s.subscribe, s.get, s.get);
}

// ---- Search overlay ----
export const searchStore = createStore<{ open: boolean; query: string }>({ open: false, query: '' });
export const useSearchState = () => useStore(searchStore);
export const openSearch = (query = '') => searchStore.set({ open: true, query });
export const closeSearch = () => searchStore.set((s) => ({ ...s, open: false }));

// ---- Recently viewed ----
export interface RecentItem {
  kind: 'supplement' | 'claim';
  id: string;
  title: string;
  sub?: string;
}
export const recentStore = createStore<RecentItem[]>([], 'assay-recent-v1');
export const useRecent = () => useStore(recentStore);
export function pushRecent(item: RecentItem) {
  recentStore.set((list) => [item, ...list.filter((r) => !(r.kind === item.kind && r.id === item.id))].slice(0, 6));
}
export const clearRecent = () => recentStore.set([]);

// ---- Compare ----
export const COMPARE_MAX = 3;
export const compareStore = createStore<{ ids: string[]; open: boolean }>({ ids: [], open: false }, 'assay-compare-v1');
export const useCompare = () => useStore(compareStore);
export function toggleCompare(id: string) {
  compareStore.set((s) => {
    if (s.ids.includes(id)) return { ...s, ids: s.ids.filter((x) => x !== id) };
    if (s.ids.length >= COMPARE_MAX) return s;
    return { ...s, ids: [...s.ids, id] };
  });
}
export const setCompareOpen = (open: boolean) => compareStore.set((s) => ({ ...s, open }));
export const clearCompare = () => compareStore.set({ ids: [], open: false });
// The drawer never reopens by itself after a reload; only the selection is remembered.
compareStore.set((s) => ({ ids: Array.isArray(s.ids) ? s.ids : [], open: false }));
