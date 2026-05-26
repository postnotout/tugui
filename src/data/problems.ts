import type { Problem } from '../types';
import { HANDCRAFTED_PROBLEMS } from './problems.handcrafted';
import { GENERATED_PROBLEMS } from './problems.generated';

export const PROBLEM_POOL: Problem[] = [
  ...HANDCRAFTED_PROBLEMS,
  ...GENERATED_PROBLEMS,
];

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 단계별 난이도 구성 (Easy/Medium/Hard 비율)
const STAGE_DIFFICULTY_MIX = [
  { easy: 14, medium: 6,  hard: 0  }, // Stage 0 — 입문
  { easy: 10, medium: 8,  hard: 2  }, // Stage 1 — 기초
  { easy: 6,  medium: 10, hard: 4  }, // Stage 2 — 초급
  { easy: 2,  medium: 10, hard: 8  }, // Stage 3 — 중급
  { easy: 0,  medium: 8,  hard: 12 }, // Stage 4 — 고급
  { easy: 0,  medium: 4,  hard: 16 }, // Stage 5 — 심화
  { easy: 0,  medium: 0,  hard: 20 }, // Stage 6 — 마스터
] as const;

/** 단계별 20문제 선택. 매 호출마다 셔플되어 순서가 달라진다. */
export function selectStageProblems(stageIdx: number, pool: Problem[]): Problem[] {
  const mix = STAGE_DIFFICULTY_MIX[Math.min(stageIdx, STAGE_DIFFICULTY_MIX.length - 1)];
  const easyPool   = shuffle(pool.filter(p => p.difficulty === 'easy'   && !p.isTutorial));
  const mediumPool = shuffle(pool.filter(p => p.difficulty === 'medium' && !p.isTutorial));
  const hardPool   = shuffle(pool.filter(p => p.difficulty === 'hard'   && !p.isTutorial));
  const picked = [
    ...easyPool.slice(0,   mix.easy),
    ...mediumPool.slice(0, mix.medium),
    ...hardPool.slice(0,   mix.hard),
  ];
  return shuffle(picked);
}
