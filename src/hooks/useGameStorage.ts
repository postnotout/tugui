import { useState, useCallback } from 'react';

const KEY = 'tuggi_v1';

export interface SolvedRecord {
  correct: boolean;   // 가장 최근 시도 결과
  attempts: number;   // 총 시도 횟수
  wrongCount: number; // 오답 횟수 (오답노트용)
}

export interface SavedSession {
  hp: number;
  points: number;
  rank: number;
  combo: number;
  runCount: number;
  problemQueueIds: number[];
  problemIdx: number;
}

export interface GameStorageData {
  bestRank: number;
  bestPoints: number;
  totalRuns: number;
  clearCount: number;
  lastPlayed: string;
  solvedProblems: Record<number, SolvedRecord>;
  settings: { soundEnabled: boolean; rsiDefault: boolean };
  savedSession: SavedSession | null;
}

const DEFAULT: GameStorageData = {
  bestRank: 0,
  bestPoints: 0,
  totalRuns: 0,
  clearCount: 0,
  lastPlayed: '',
  solvedProblems: {},
  settings: { soundEnabled: true, rsiDefault: false },
  savedSession: null,
};

function load(): GameStorageData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function useGameStorage() {
  const [data, setData] = useState<GameStorageData>(load);

  const save = useCallback((partial: Partial<GameStorageData>) => {
    setData(prev => {
      const next = { ...prev, ...partial, lastPlayed: new Date().toISOString() };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch {}
    setData({ ...DEFAULT });
  }, []);

  return { data, save, reset };
}
