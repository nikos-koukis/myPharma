import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@search-history';
const MAX = 20;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setHistory(JSON.parse(raw));
    });
  }, []);

  const persist = useCallback((next: string[]) => {
    setHistory(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const add = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      const next = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, MAX);
      persist(next);
    },
    [history, persist],
  );

  const clear = useCallback(() => {
    persist([]);
  }, [persist]);

  return { history, add, clear };
}
