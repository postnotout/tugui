import { useState, useCallback } from 'react';

const KEY = 'tuggi_v2';

export interface SolvedRecord {
  correct: boolean;   // 가장 최근 시도 결과
  attempts: number;   // 총 시도 횟수
  wrongCount: number; // 오답 횟수 (오답노트용)
}

export interface SavedSession {
  currentStage: number;       // 0–6
  stageIdx: number;           // 현재 단계 내 문제 인덱스 (0–19)
  stageCorrect: number;       // 현재 단계 정답 수
  stageProblemsIds: number[]; // 현재 단계 문제 ID 배열 (순서 포함)
}

export interface GameStorageData {
  bestStageCompleted: number; // 최고 완료 단계 (0 = 미완료)
  clearCount: number;         // 7단계 전체 수료 횟수
  lastPlayed: string;
  solvedProblems: Record<number, SolvedRecord>;
  settings: { rsiDefault: boolean };
  savedSession: SavedSession | null;
}

const DEFAULT: GameStorageData = {
  bestStageCompleted: 0,
  clearCount: 0,
  lastPlayed: '',
  solvedProblems: {},
  settings: { rsiDefault: false },
  savedSession: null,
};

function load(): GameStorageData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT,
      ...parsed,
      settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) },
    };
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
