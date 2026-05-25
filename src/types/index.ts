export interface ChartDataPoint {
  day: number;
  date: string;
  종가: number;
  거래량: number;
  MA5: number | null;
  MA20: number | null;
  MA60: number | null;
  MA120: number | null;
  RSI: number | null;
}

export interface MacroHint {
  label: string;
  value: string;
  trend: string;
  tone: 'positive' | 'negative' | 'neutral' | 'mixed';
}

export interface RevealInfo {
  title: string;
  market: string;
  period: string;
  result: string;
  macro: string;
  counterCase?: string;
  lesson: string;
}

export interface Problem {
  id: number;
  isTutorial?: boolean;
  market: string;
  ticker: string;
  pattern: string;
  revealDay: number;
  chartDays?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  startDate: string;
  question: string;
  macroHints: MacroHint[];
  choices: string[];
  answer: number;
  odds: string;
  explanation: string;
  reveal: RevealInfo;
}

export interface Rank {
  lv: number;
  emoji: string;
  name: string;
  desc: string;
}

export type GamePhase = 'intro' | 'playing' | 'levelup' | 'gameover' | 'ending';
