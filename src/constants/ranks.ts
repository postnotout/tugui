import type { Rank } from '../types';

export const RANKS: Rank[] = [
  { lv: 1, emoji: '🐒', name: '유인원',        desc: '차트가 뭔지도 모름' },
  { lv: 2, emoji: '👶', name: '주린이',        desc: '갓 입문, 호기심 가득' },
  { lv: 3, emoji: '🧒', name: '초보 트레이더', desc: '용돈으로 첫 매수' },
  { lv: 4, emoji: '🧑', name: '직장인 개미',   desc: '평범한 투자자' },
  { lv: 5, emoji: '💼', name: '프로 트레이더', desc: '리스크 관리를 안다' },
  { lv: 6, emoji: '🎩', name: '펀드매니저',    desc: '매크로를 같이 본다' },
  { lv: 7, emoji: '👴', name: '워렌 뷔페',     desc: '시간이 친구' },
];

export const START_CAPITAL = 1000; // 만원
export const GAMEOVER_CAPITAL = 500; // 만원
export const RANK_CAPITALS = [1000, 1200, 1500, 2000, 3000, 5000, 10000];
export const MAX_RANK_IDX = RANKS.length - 1;
