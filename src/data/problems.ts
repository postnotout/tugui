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

export function difficultyShuffle(arr: Problem[]): Problem[] {
  const easy   = shuffle(arr.filter(p => p.difficulty === 'easy'));
  const medium = shuffle(arr.filter(p => p.difficulty === 'medium'));
  const hard   = shuffle(arr.filter(p => p.difficulty === 'hard'));
  return [...easy, ...medium, ...hard];
}
