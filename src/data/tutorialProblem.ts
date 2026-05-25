import type { Problem } from '../types';

/**
 * 튜토리얼 전용 연습 문제 (id: 0).
 * 정답을 맞춰도 시드머니에 영향 없음.
 * 삼성전자 2020년 코로나 회복 → 박스권 돌파 사례.
 */
export const TUTORIAL_PROBLEM: Problem = {
  id: 0,
  isTutorial: true,
  market: 'KOSPI',
  ticker: '005930.KS',
  pattern: 'breakout',
  revealDay: 55,
  chartDays: 90,
  difficulty: 'easy',
  startDate: '2020-04-06',
  question: '[연습] 코로나 급락 이후 회복 중입니다. 이 종목은 이후 어떻게 됐을까요?',
  macroHints: [
    { label: '한국 기준금리', value: '0.75%', trend: '코로나 긴급 인하 (↓0.5%p)', tone: 'positive' },
    { label: '연준 정책', value: '무제한 QE', trend: '사상 최대 유동성 공급', tone: 'positive' },
    { label: '반도체 수요', value: '비대면 특수', trend: '서버·PC 수요 급증', tone: 'positive' },
    { label: '원/달러', value: '1,220원', trend: 'COVID 공포 정점 후 안정', tone: 'neutral' },
  ],
  choices: [
    '추가 상승 (회복 추세 지속)',
    '추세 반전 (2차 폭락)',
    '횡보 지속',
    '단기 급락 후 재회복',
  ],
  answer: 0,
  odds: '위기 직후 대규모 QE가 동반된 회복은 역사적으로 강세로 이어진 경우가 많습니다. 다만 당시엔 누구도 확신할 수 없었습니다.',
  explanation:
    '삼성전자는 코로나 급락 이후 연준 무제한 QE·한국 기준금리 인하·비대면 수요에 힘입어 추세 회복에 성공했습니다. ' +
    '유동성과 업황 개선이 동시에 맞아떨어진 교과서적 사례예요. ' +
    '이처럼 차트 패턴 하나가 아니라 매크로 환경을 함께 보는 것이 핵심입니다.',
  reveal: {
    title: '삼성전자 (005930.KS)',
    market: 'KOSPI · 반도체',
    period: '2020년 4월 ~ 2020년 8월',
    result: '43,900원 저점 회복 후 박스권 상향 돌파. 이후 2021년 1월 96,800원 사상 최고가 달성.',
    macro:
      '연준 무제한 QE(2020년 3월), 한국 기준금리 0.5%p 긴급 인하(연 0.75%), ' +
      '재택근무 확산으로 서버·PC 반도체 수요 급증, 동학개미 운동으로 개인 자금 대거 유입.',
    lesson:
      '위기 직후 유동성 공급이 극대화될 때, 실물 경제 악화에도 불구하고 자산 가격이 선반등하는 경우가 많습니다. ' +
      '"차트 + 매크로 동반"이 확률을 높이는 핵심입니다.',
  },
};
