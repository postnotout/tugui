import type { Problem } from '../types';

export const HANDCRAFTED_PROBLEMS: Problem[] = [
  {
    id: 1, market: 'KOSPI', ticker: '005930.KS', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2020-04-28',
    question: '박스권을 상향 돌파하였다. 1개월 후 주가의 변화로 가장 적절한 것은?',
    macroHints: [
      { label: '기준금리', value: '0.50%', trend: '초저금리·QE 진행', tone: 'positive' },
      { label: '반도체', value: '수요 급증', trend: '비대면 사이클 상승', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '박스권 돌파 + 매크로 동행 → 추세 가속. 1개월 뒤 급등 (+18%).',
    reveal: {
      title: '삼성전자 (005930.KS)', market: 'KOSPI · 반도체', period: '2020년 4월 ~ 2020년 11월',
      result: '1개월 후 급등 (+18%).',
      macro: '초저금리·QE, 반도체 슈퍼사이클 기대, 동학개미+외국인 동시 매수.',
      lesson: '차트·매크로가 같은 방향 = 확률 우위. 그래도 손절선은 필수.',
    },
  },
  {
    id: 2, market: 'KOSPI', ticker: '051910.KS', pattern: 'uptrend',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2020-06-19',
    question: '2차전지 테마로 강한 상승 추세를 이어가고 있다. 1개월 후 주가로 가장 적절한 것은?',
    macroHints: [
      { label: 'EV 테마', value: '폭발적 관심', trend: '2차전지 섹터 자금 집중', tone: 'positive' },
      { label: '분할 상장', value: 'LG에너지솔루션', trend: '상장 기대감 급부상', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '3개월 +20% 추가 상승 — 이후 분할 확정 시 "Sell the news" 하락. 1개월 뒤 급등 (+23%).',
    reveal: {
      title: 'LG화학 (051910.KS)', market: 'KOSPI · 화학·배터리', period: '2020년 6월 ~ 2021년 1월',
      result: '1개월 후 급등 (+23%).',
      macro: 'LG에너지솔루션 분할 상장 기대감 + 2차전지 섹터 자금 집중.',
      lesson: '이벤트 기대가 주가에 선반영되면, 실현 시 차익매물로 꺾인다.',
    },
  },
  {
    id: 3, market: 'KOSPI', ticker: '000660.KS', pattern: 'parabolic',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2017-10-31',
    question: '포물선 가속 상승이 이어지며 거래량과 RSI가 극단적 과열 구간에 달해 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'DRAM 가격', value: '연간 +50%', trend: '슈퍼사이클 정점', tone: 'positive' },
      { label: '외국인', value: '지분 50%+', trend: '역대 최고 보유', tone: 'positive' },
    ],
    choices: [
      '추가 상승한다',
      '횡보한다',
      '하락한다',
      '급락한다',
    ],
    answer: 0,
    explanation: '포물선 가속 + RSI·거래량 과열 = 사이클 정점 경고. 1개월 뒤 상승 (+10%).',
    reveal: {
      title: 'SK하이닉스 (000660.KS)', market: 'KOSPI · 반도체', period: '2017년 10월 ~ 2018년 6월',
      result: '1개월 후 상승 (+10%).',
      macro: '미중 무역분쟁 시작, 중국 자급 우려, 데이터센터 투자 감속.',
      lesson: '"너무 좋다" = 이미 반영 완료. 사이클 정점에서 매수 금지.',
    },
  },
  {
    id: 4, market: 'NASDAQ', ticker: 'NVDA', pattern: 'cup',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2022-07-28',
    question: '약세장 저점에서 컵 패턴이 형성되었다. AI 수요가 태동하고 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '연준 금리', value: '4.00%', trend: '인상 속도 둔화 신호', tone: 'positive' },
      { label: 'ChatGPT', value: '출시 임박', trend: '데이터센터 수요 태동', tone: 'positive' },
    ],
    choices: [
      '폭등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '약세장 저점 컵 패턴 + AI 수요 태동 = 추세 반전 초입. 1개월 뒤 급등 (+19%).',
    reveal: {
      title: 'NVIDIA (NVDA)', market: 'NASDAQ · AI 반도체', period: '2022년 7월 ~ 2023년 2월',
      result: '1개월 후 급등 (+19%).',
      macro: 'ChatGPT 출시 후 데이터센터 GPU 수요 사상 최대, 가이던스 연속 상향.',
      lesson: '가장 비관적인 환경에서 새 강세장이 시작된다.',
    },
  },
  {
    id: 5, market: 'NASDAQ', ticker: 'TSLA', pattern: 'doubletop',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2021-08-19',
    question: 'ATH 부근에서 두 번째 봉우리가 출현하였다. 금리 인상이 시작되었다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '미 금리', value: '0.25%→인상', trend: '40년만의 급격한 긴축', tone: 'negative' },
      { label: 'TSLA PER', value: '200배+', trend: '성장주 멀티플 압축 우려', tone: 'negative' },
    ],
    choices: [
      '추가 상승한다',
      '횡보한다',
      '하락한다',
      '폭락한다',
    ],
    answer: 1,
    explanation: '쌍봉 + 긴축 + 극단적 밸류 = 복합 하락 신호. 1개월 뒤 횡보 (-2%).',
    reveal: {
      title: 'Tesla (TSLA)', market: 'NASDAQ · 전기차', period: '2021년 8월 ~ 2022년 3월',
      result: '1개월 후 횡보 (-2%).',
      macro: '연준 0.25%→5.50%(역대 최단기), 머스크 트위터 인수로 경영 분산.',
      lesson: '고점에서 호재에 가격이 반응 안 하면 = 매수세 소진 경고.',
    },
  },
  {
    id: 6, market: 'KOSPI', ticker: '011170.KS', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2021-06-24',
    question: '박스권 돌파를 시도하고 있다. 매크로는 역방향이다. 1개월 후 주가로 가장 적절한 것은?',
    macroHints: [
      { label: '기준금리', value: '0.75%→인상', trend: '긴축 진입', tone: 'negative' },
      { label: '중국 수요', value: '부동산 위기', trend: '화학 수요 둔화 신호', tone: 'negative' },
    ],
    choices: [
      '추가 상승한다',
      '횡보한다',
      '하락한다',
      '급락한다',
    ],
    answer: 2,
    explanation: '차트 돌파처럼 보였지만 수급이 없었다 — 7개월 -22%. 1개월 뒤 하락 (-9%).',
    reveal: {
      title: '롯데케미칼 (011170.KS)', market: 'KOSPI · 화학', period: '2021년 6월 ~ 2022년 1월',
      result: '1개월 후 하락 (-9%).',
      macro: '한국 금리 인상 사이클 시작, 중국 부동산 위기, 마진 스프레드 축소.',
      lesson: '차트·매크로 충돌 시 매크로 우선 — 진입 보류 또는 사이즈 축소.',
    },
  },
  {
    id: 7, market: 'KOSDAQ', ticker: '247540.KQ', pattern: 'fakebreakout',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2023-06-23',
    question: '돌파처럼 보이나 외국인이 6주 연속 순매도하고 있다. 1개월 후 주가로 옳은 것은?',
    macroHints: [
      { label: '외국인', value: '6주 연속 순매도', trend: '코스닥 자금 이탈', tone: 'negative' },
      { label: '2차전지', value: '중국 LFP 경쟁', trend: '섹터 자금 유출', tone: 'negative' },
    ],
    choices: [
      '상승한다',
      '횡보한다',
      '하락한다',
      '급락한다',
    ],
    answer: 2,
    explanation: '외국인 매도 중 차트 돌파 = 가짜 신호. 1개월 뒤 하락 (-22%).',
    reveal: {
      title: '에코프로비엠 (247540.KQ)', market: 'KOSDAQ · 2차전지', period: '2023년 6월 ~ 2024년 1월',
      result: '1개월 후 하락 (-22%).',
      macro: '고금리 유지, 원/달러 연고점, 중국 LFP 경쟁 심화.',
      lesson: '수급이 차트보다 우선 — 외국인 매도 중 개인 돌파 추종은 최다 실수.',
    },
  },
  {
    id: 8, market: 'CRYPTO', ticker: 'BTC-USD', pattern: 'reversal',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2022-03-18',
    question: '루나 붕괴 이후 반등 중이다. Celsius·3AC 위기가 진행 중이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '연준', value: '75bp 연속', trend: '위험자산 자금 이탈', tone: 'negative' },
      { label: '업계 리스크', value: 'Celsius·3AC', trend: '시스템 리스크 진행 중', tone: 'negative' },
    ],
    choices: [
      '급등한다',
      '횡보한다',
      '하락한다',
      '급락한다',
    ],
    answer: 1,
    explanation: '시스템 리스크 중 반등 = 데드캣. FTX 사태로 6개월 -32%. 1개월 뒤 횡보 (+3%).',
    reveal: {
      title: 'Bitcoin (BTC/USD)', market: 'Crypto · 가상자산', period: '2022년 3월 ~ 2022년 8월',
      result: '1개월 후 횡보 (+3%).',
      macro: '연준 자이언트스텝 연속, Celsius·3AC 파산, FTX 붕괴.',
      lesson: '구조적 위기가 진행 중이면 반등을 믿지 말 것.',
    },
  },
  {
    id: 9, market: 'NASDAQ', ticker: '^GSPC', pattern: 'vshape',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2019-11-01',
    question: '코로나 폭락 이후 강한 반등이 나타나고 있다. 실물 경기는 사상 최악이며 연준이 무제한 QE를 선언하였다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '실업률', value: '14.7%', trend: '대공황 이후 최고', tone: 'negative' },
      { label: '연준', value: '제로금리+무제한 QE', trend: '사상 최대 유동성 공급', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 1,
    explanation: '실물 최악 + 유동성 폭발 → 유동성이 이긴다. 1개월 뒤 상승 (+10%).',
    reveal: {
      title: 'S&P 500 (^GSPC)', market: '미국 대형주', period: '2019년 11월 ~ 2020년 6월',
      result: '1개월 후 상승 (+10%).',
      macro: '연준 제로금리+무제한 QE, 정부 5조달러 부양, 백신 개발 가속.',
      lesson: '주가는 실물이 아닌 유동성·기대를 반영한다.',
    },
  },

  // ── 확장 문제 (P10 ~ P19) ──────────────────────────────────────────────────

  {
    id: 10, market: 'CRYPTO', ticker: 'BTC-USD', pattern: 'parabolic',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2017-04-05',
    question: '포물선 상승 중이다. CME 선물 상장이 예고되었으며 주류 미디어에서 보도 중이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '주류 미디어', value: '일반인 유입 급증', trend: 'BTC 인지도 폭발', tone: 'positive' },
      { label: 'CME 선물', value: '12월 상장 예고', trend: '기관 진입 첫 신호', tone: 'positive' },
    ],
    choices: [
      '폭등한다',
      '급등한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '포물선 가속 + 주류 진입 = 끝을 예측 불가. 7개월 +421%. 분할 매도 필수. 1개월 뒤 급등 (+34%).',
    reveal: {
      title: 'Bitcoin (BTC/USD)', market: 'Crypto · 가상자산', period: '2017년 4월 ~ 2017년 8월',
      result: '1개월 후 급등 (+34%).',
      macro: 'CME·CBOE 선물 상장, ICO 붐으로 개인 폭발적 증가.',
      lesson: '포물선의 끝은 모른다. 분할 매도만이 답.',
    },
  },

  {
    id: 11, market: 'CRYPTO', ticker: 'BTC-USD', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2023-08-11',
    question: '장기 박스권을 강하게 돌파하였다. ETF 심사 중이며 반감기가 예정되어 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'SEC ETF', value: '블랙록 등 신청', trend: '승인 여부 미확정', tone: 'neutral' },
      { label: '반감기', value: '2024년 4월 예정', trend: '공급 축소 이벤트', tone: 'positive' },
    ],
    choices: [
      '폭등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 2,
    explanation: '구조적 변화(ETF) + 박스권 돌파 = 추세 전환. 1개월 뒤 횡보 (+3%).',
    reveal: {
      title: 'Bitcoin (BTC/USD)', market: 'Crypto · 가상자산', period: '2023년 8월 ~ 2024년 1월',
      result: '1개월 후 횡보 (+3%).',
      macro: '블랙록 등 11개 현물 ETF 동시 승인, 첫 달 순유입 $40억(역대 기록).',
      lesson: '기관 접근성 확대 = 구조적 수요 변화 신호.',
    },
  },

  {
    id: 12, market: 'NYSE', ticker: '^GSPC', pattern: 'breakdown',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2022-09-28',
    question: 'SVB가 파산하였다. 금융 위기 공포로 S&P가 급락 중이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'SVB 파산', value: '3월 10일', trend: '예금 인출 사태', tone: 'negative' },
      { label: '연준 BTFP', value: '즉각 가동', trend: '긴급 유동성 공급', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '추가 하락한다',
    ],
    answer: 2,
    explanation: '공포 극대화 → 연준 즉각 개입 → 빠른 회복. 1개월 뒤 횡보 (+4%).',
    reveal: {
      title: 'S&P 500 (^GSPC)', market: 'NYSE · 미국 대형주', period: '2022년 9월 ~ 2023년 4월',
      result: '1개월 후 횡보 (+4%).',
      macro: 'FDIC 예금 전액 보호, 연준 BTFP 긴급 가동으로 전염 차단.',
      lesson: '정부·중앙은행 개입 의지를 과소평가하면 최저점에서 매도하게 된다.',
    },
  },

  {
    id: 13, market: 'NYSE', ticker: 'GSPC2007', pattern: 'breakdown',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2008-03-17',
    question: '리먼 브라더스가 파산하였다. 금융 시스템 붕괴가 시작되었다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '리만', value: '4,000억달러 부채', trend: '개별→시스템 리스크로 전염', tone: 'negative' },
      { label: '신용 시장', value: 'TED 스프레드 역대급', trend: '단기자금 경색', tone: 'negative' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 3,
    explanation: '시스템 위기 = 개별 충격이 전염으로 확산. 속도는 예측 불가. 1개월 뒤 하락 (-20%).',
    reveal: {
      title: 'S&P 500 (^GSPC)', market: 'NYSE · 미국 대형주', period: '2008년 3월 ~ 2008년 10월',
      result: '1개월 후 하락 (-20%).',
      macro: '리만 파산·AIG 구제금융, 연준 제로금리+QE, TARP 7,000억달러.',
      lesson: '시스템 위기 깊이는 항상 과소평가된다.',
    },
  },

  {
    id: 14, market: 'KOSPI', ticker: 'KS11', pattern: 'breakdown',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '1997-03-25',
    question: '코스피가 하락 중이다. 시장에는 "한국은 다르다"는 믿음이 지배적이다. 1개월 후 코스피의 변화로 옳은 것은?',
    macroHints: [
      { label: '태국 위기', value: '아시아 전염 중', trend: '외환 불안 확산', tone: 'negative' },
      { label: '대기업 부채', value: '400%+', trend: '한보·기아·삼미 부도', tone: 'negative' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 3,
    explanation: '"우리는 다르다" = 위기 전 가장 위험한 말. 1개월 뒤 하락 (-19%).',
    reveal: {
      title: 'KOSPI (^KS11)', market: 'KOSPI · 한국 시장', period: '1997년 3월 ~ 1997년 10월',
      result: '1개월 후 하락 (-19%).',
      macro: 'IMF 구제금융 570억달러, 기준금리 25%로 초긴축, 금융기관 강제 정리.',
      lesson: '"This time is different" = 가장 비싼 문장.',
    },
  },

  {
    id: 15, market: 'SSE', ticker: 'SSE', pattern: 'doubletop',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2014-12-11',
    question: '상하이지수가 1년 만에 두 배 상승하였다. 레버리지 잔고가 사상 최대이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '마진 잔액', value: '2조 위안', trend: '사상 최대 레버리지', tone: 'negative' },
      { label: 'PER', value: '80~100배', trend: '역사적 고점 밸류', tone: 'negative' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 3,
    explanation: '레버리지 버블 붕괴 → 청산 연쇄. 정부 개입도 한계. 1개월 뒤 하락 (-17%).',
    reveal: {
      title: '상하이 종합지수', market: '중국 상하이거래소', period: '2014년 12월 ~ 2015년 7월',
      result: '1개월 후 하락 (-17%).',
      macro: '정부 28조원 주식 매입·공매도 금지 등 총력 방어에도 붕괴.',
      lesson: '레버리지로 오른 버블은 가장 빠르게 터진다.',
    },
  },

  {
    id: 16, market: 'NASDAQ', ticker: 'IXIC', pattern: 'parabolic',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '1999-05-11',
    question: '나스닥이 포물선 상승 중이다. 적자 인터넷 기업도 폭등하고 있으며 금리 인상이 진행 중이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '닷컴 IPO', value: '상장 첫날 +100~200%', trend: '적자도 수백억 밸류', tone: 'positive' },
      { label: '연준 금리', value: '5.50%', trend: '과열 억제 인상 중', tone: 'negative' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '버블 마지막 구간 가장 가파름 — "이미 너무 올랐다"도 틀릴 수 있다. 1개월 뒤 급등 (+16%).',
    reveal: {
      title: 'NASDAQ (^IXIC)', market: 'NASDAQ · 미국 기술주', period: '1999년 5월 ~ 1999년 12월',
      result: '1개월 후 급등 (+16%).',
      macro: '닷컴 IPO 러시, Y2K IT 인프라 투자 붐, 2000년 3월 금리 인상+현금 소진.',
      lesson: '버블은 "너무 올랐다"를 훨씬 더 올라간 후 끝난다.',
    },
  },

  {
    id: 17, market: 'TSE', ticker: 'N225', pattern: 'doubletop',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '1989-06-29',
    question: '사상 최고가 부근에 있다. 시장에서는 "세계 최강 경제"라는 평가가 지배적이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '일본 금리', value: '3.75%→인상 예고', trend: '버블 억제 긴축', tone: 'negative' },
      { label: '닛케이 PBR', value: '5배+', trend: '국제 비교 역대 최고', tone: 'negative' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 2,
    explanation: '최고의 경제도 버블에서 자유롭지 않다. 금리 인상이 도화선. 1개월 뒤 횡보 (-4%).',
    reveal: {
      title: '니케이 225 (^N225)', market: '도쿄증권거래소', period: '1989년 6월 ~ 1990년 1월',
      result: '1개월 후 횡보 (-4%).',
      macro: '일본은행 금리 인상 사이클(2.5%→6%), 토지 담보 대출 규제.',
      lesson: '버블 붕괴 후 회복에는 수십 년이 걸릴 수 있다.',
    },
  },

  {
    id: 18, market: 'NYSE', ticker: 'GME', pattern: 'squeeze',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2020-07-09',
    question: '공매도 잔고가 발행 주식의 140%이다. 온라인 커뮤니티에서 집단 매수 전략이 확산되고 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '공매도', value: '유통주식 140%', trend: '역대 최고 숏 포지션', tone: 'positive' },
      { label: 'WSB', value: '구독자 폭발 증가', trend: '개인 집단 매수 전략', tone: 'positive' },
    ],
    choices: [
      '폭등한다',
      '급등한다',
      '상승한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '공매도 140% + 집단 매수 → 숏 스퀴즈. 3개월 +901%. 관찰 후 대응. 1개월 뒤 급등 (+247%).',
    reveal: {
      title: 'GameStop (GME)', market: 'NYSE · 게임 소매', period: '2020년 7월 ~ 2021년 2월',
      result: '1개월 후 급등 (+247%).',
      macro: '로빈후드 매수 강제 제한(1/28), 의회 청문회 소환.',
      lesson: '숏 스퀴즈는 예측보다 관찰 후 대응. FOMO 진입 시 손실 확률 높음.',
    },
  },

  {
    id: 19, market: 'KOSDAQ', ticker: 'SEEGENE', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2019-09-25',
    question: '코로나 확산 초입에 PCR 진단키트 관련 종목이 상승을 시작하였다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '코로나', value: '국내 확산 초기', trend: 'WHO 팬데믹 선언 임박', tone: 'negative' },
      { label: 'PCR 키트', value: '150개국 수출', trend: 'K-방역 글로벌 수요', tone: 'positive' },
    ],
    choices: [
      '폭등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 3,
    explanation: '독점적 실수요 + 테마 일치 = 실적 동반 폭등. 1개월 뒤 하락 (-20%).',
    reveal: {
      title: '씨젠 (096530.KQ)', market: 'KOSDAQ · 분자진단', period: '2019년 9월 ~ 2020년 4월',
      result: '1개월 후 하락 (-20%).',
      macro: '150개국 PCR 키트 수출, 분기 매출 +1,000% 성장.',
      lesson: '테마주 중 실적이 따라오는 종목이 진짜.',
    },
  },

  // ── 확장 문제 2 (P20 ~ P35) ─────────────────────────────────────────────────

  {
    id: 20, market: 'NYSE', ticker: '^GSPC', pattern: 'vshape',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2018-06-07',
    question: '무역전쟁과 긴축 우려로 급락하여 연저점에 도달하였다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '파월 발언', value: '"금리 인상 신중"', trend: '피벗 신호 예고', tone: 'positive' },
      { label: '미중 협상', value: '1단계 합의 기대', trend: '관세 불확실성 일부 해소', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 3,
    explanation: '최악의 뉴스 = 이미 반영. 파월 발언 하나로 V자 반등. 1개월 뒤 하락 (-6%).',
    reveal: {
      title: 'S&P 500 (^GSPC)', market: 'NYSE · 미국 대형주', period: '2018년 6월 ~ 2019년 1월',
      result: '1개월 후 하락 (-6%).',
      macro: '2019년 1월 파월 "인내심(patient)" 발언 → 급반등. 2019년 3차례 금리 인하.',
      lesson: '중앙은행 피벗 신호 = 하락장 가장 강력한 촉매.',
    },
  },

  {
    id: 21, market: 'NYSE', ticker: '^GSPC', pattern: 'downtrend',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2021-09-29',
    question: '역대 고점에서 하락이 시작되었다. 40년 만의 인플레이션 국면이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'CPI', value: '7.0%', trend: '40년래 최고, 상승 중', tone: 'negative' },
      { label: '연준', value: '3월 첫 인상 예고', trend: '속도·폭 불확실', tone: 'negative' },
    ],
    choices: [
      '상승한다',
      '횡보한다',
      '하락한다',
      '급락한다',
    ],
    answer: 2,
    explanation: '금리 인상 초입 + 고PER = 멀티플 압축. 1개월 뒤 하락 (-7%).',
    reveal: {
      title: 'S&P 500 (^GSPC)', market: 'NYSE · 미국 대형주', period: '2021년 9월 ~ 2022년 4월',
      result: '1개월 후 하락 (-7%).',
      macro: 'CPI 9.1%(6월 피크), 러시아-우크라이나 전쟁, 에너지주만 역발상 수익.',
      lesson: '금리 인상 사이클에서 고PER 성장주 = 취약.',
    },
  },

  {
    id: 22, market: 'NASDAQ', ticker: 'NVDA', pattern: 'breakdown',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2018-05-09',
    question: '고점을 이탈하였다. 채굴 수요가 사라지고 재고가 과잉 상태이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '채굴 GPU', value: '수요 소멸', trend: '채굴 수익성 마이너스', tone: 'negative' },
      { label: '게이밍 재고', value: '유통 과잉', trend: '출하량 급감 예고', tone: 'negative' },
    ],
    choices: [
      '상승한다',
      '횡보한다',
      '하락한다',
      '급락한다',
    ],
    answer: 2,
    explanation: '사이클 하락 + 재고 과잉 = 단기 하락. 8개월 -20%. (저점은 -55%). 1개월 뒤 하락 (-25%).',
    reveal: {
      title: 'NVIDIA (NVDA)', market: 'NASDAQ · GPU·AI', period: '2018년 5월 ~ 2018년 12월',
      result: '1개월 후 하락 (-25%).',
      macro: '암호화폐 붕괴로 GPU 수요 소멸. 그러나 AI 수요로 2019년 이후 반등.',
      lesson: '반도체 사이클 저점 = 항상 뉴스 최악과 일치.',
    },
  },

  {
    id: 23, market: 'NASDAQ', ticker: 'TSLA', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2019-03-27',
    question: '주력 모델 양산에 성공하고 중국 시장에 진출하였다. 공매도 잔고가 25%이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '흑자 전환', value: '2019 Q3 예상', trend: '연속 흑자 가능성', tone: 'positive' },
      { label: '공매도', value: '유통주식 25%+', trend: '숏 스퀴즈 잠재력', tone: 'positive' },
    ],
    choices: [
      '폭등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 1,
    explanation: '사업 전환점 + 대규모 숏 = 폭발 조합. 1개월 뒤 상승 (+14%).',
    reveal: {
      title: 'Tesla (TSLA)', market: 'NASDAQ · 전기차', period: '2019년 3월 ~ 2019년 10월',
      result: '1개월 후 상승 (+14%).',
      macro: '바이든 EV 정책 기대, S&P500 편입 확정, 공매도 세력 강제 청산.',
      lesson: '펀더멘털 전환점 + 대규모 숏 포지션 = 폭발적 조합.',
    },
  },

  {
    id: 24, market: 'CRYPTO', ticker: 'BTC-USD', pattern: 'bottom',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2018-09-15',
    question: '극단적 저점에 있다. 패닉 셀이 지속되며 언론에서 "끝났다"고 보도하고 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '거래량', value: '역대 최저', trend: '투자자 관심 소멸', tone: 'negative' },
      { label: '주류 미디어', value: '"BTC 사망 선고"', trend: '비관론 극대화', tone: 'negative' },
    ],
    choices: [
      '폭등한다',
      '급등한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 2,
    explanation: '극단적 비관론 + 거래량 소멸 = 역설적 바닥. 1개월 뒤 횡보 (+0%).',
    reveal: {
      title: 'Bitcoin (BTC/USD)', market: 'Crypto · 가상자산', period: '2018년 9월 ~ 2019년 2월',
      result: '1개월 후 횡보 (+0%).',
      macro: '피델리티 디지털자산 출범, 기관 수탁 서비스 본격화.',
      lesson: '최악의 헤드라인이 나올 때 = 역발상 매수 시점.',
    },
  },

  {
    id: 25, market: 'CRYPTO', ticker: 'BTC-USD', pattern: 'vshape',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2019-12-11',
    question: '이틀 만에 -58% 폭락하였다. 연준이 무제한 QE를 발표하였다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '코로나 목요일', value: 'BTC 단일 최대 하락', trend: '공황 매도', tone: 'negative' },
      { label: '연준', value: '제로금리+무제한 QE', trend: '3월 15일 발표', tone: 'positive' },
    ],
    choices: [
      '폭등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '유동성 폭발 → BTC도 함께 V자. 공포에 매도 = 기회 손실. 1개월 뒤 급등 (+32%).',
    reveal: {
      title: 'Bitcoin (BTC/USD)', market: 'Crypto · 가상자산', period: '2019년 12월 ~ 2020년 5월',
      result: '1개월 후 급등 (+32%).',
      macro: '연준 제로금리+QE, 정부 5조달러 부양 → BTC 주식과 동반 V자.',
      lesson: '자산이 첫 위기를 살아남으면 더 강하게 돌아온다.',
    },
  },

  {
    id: 26, market: 'CRYPTO', ticker: 'BTC-USD', pattern: 'breakdown',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2021-01-25',
    question: '$65k에서 $29k로 폭락한 이후 반등 중이다. 채굴 금지 조치로 해시율이 반토막 났다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '해시율', value: '-50% 급락', trend: '중국 채굴 65% 강제 이전', tone: 'negative' },
      { label: '기관 매수', value: '마이크로스트래티지', trend: '엘살바도르 법정화폐 채택', tone: 'positive' },
    ],
    choices: [
      '폭등한다',
      '상승한다',
      '횡보한다',
      '추가 하락한다',
    ],
    answer: 2,
    explanation: '극단적 공포 + 네트워크 회복 = 강한 반등. 1개월 뒤 횡보 (+0%).',
    reveal: {
      title: 'Bitcoin (BTC/USD)', market: 'Crypto · 가상자산', period: '2021년 1월 ~ 2021년 6월',
      result: '1개월 후 횡보 (+0%).',
      macro: '해시율 미국·카자흐스탄으로 이전, 엘살바도르 법정화폐, 마이크로스트래티지 추가 매수.',
      lesson: '네트워크가 살아있으면 가격은 결국 돌아온다.',
    },
  },

  {
    id: 27, market: 'KOSPI', ticker: '005930.KS', pattern: 'recovery',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2019-04-26',
    question: '다운사이클 저점에 있다. DRAM 낙폭이 둔화되고 5G 수요가 본격화되고 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'DRAM 가격', value: '낙폭 둔화', trend: '공급 조정 효과 발현', tone: 'positive' },
      { label: '5G 인프라', value: '투자 본격화', trend: '통신장비 수요 급증', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 2,
    explanation: '공급 조정 + 수요 회복 신호 = 사이클 반등 초입. 1개월 뒤 횡보 (+2%).',
    reveal: {
      title: '삼성전자 (005930.KS)', market: 'KOSPI · 반도체', period: '2019년 4월 ~ 2019년 11월',
      result: '1개월 후 횡보 (+2%).',
      macro: 'DRAM 현물가 반등, 삼성 자체 감산, 5G 기지국 투자, 한국은행 금리 인하.',
      lesson: '반도체 저점 신호 = DRAM 가격 낙폭 둔화.',
    },
  },

  {
    id: 28, market: 'NASDAQ', ticker: 'META', pattern: 'recovery',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2022-06-14',
    question: '-74% 폭락 이후 바닥에 있다. CEO가 "효율의 해"를 선언하였다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'PER', value: '12배', trend: '빅테크 역대 최저', tone: 'positive' },
      { label: '구조조정', value: '21,000명 감원', trend: '"효율의 해" 비용 절감', tone: 'positive' },
    ],
    choices: [
      '폭등한다',
      '급등한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '경영 피벗 + 역대 저밸류 = 역발상 기회. 1개월 뒤 급등 (+19%).',
    reveal: {
      title: 'Meta Platforms (META)', market: 'NASDAQ · 소셜미디어', period: '2022년 6월 ~ 2023년 1월',
      result: '1개월 후 급등 (+19%).',
      macro: '대규모 감원으로 이익률 회복, AI 광고 시스템 성공.',
      lesson: '경영진의 자기 인식 + 실행 변화 = 반등의 핵심.',
    },
  },

  {
    id: 29, market: 'KOSPI', ticker: '035720.KS', pattern: 'doubletop',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2021-03-04',
    question: '강한 상승 추세의 고점 부근에 있다. 플랫폼 규제 입법과 금리 인상이 시작되었다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '플랫폼 규제', value: '국회 입법 추진', trend: '골목상권 침해 논란', tone: 'negative' },
      { label: '금리 인상', value: '0.5%→인상 시작', trend: '고PER 멀티플 압축', tone: 'negative' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 3,
    explanation: '고PER + 규제 + 금리 = 멀티플 압축 삼중 압박. 1개월 뒤 하락 (-28%).',
    reveal: {
      title: '카카오 (035720.KS)', market: 'KOSPI · 플랫폼', period: '2021년 3월 ~ 2021년 10월',
      result: '1개월 후 하락 (-28%).',
      macro: '기준금리 인상 사이클, 오너 직접 사과, 고금리에서 적자 계열사 구조 취약.',
      lesson: '국내 독점 플랫폼 = 정치 리스크 할증 필수.',
    },
  },

  {
    id: 30, market: 'KOSPI', ticker: '035420.KS', pattern: 'recovery',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2022-06-28',
    question: '2022년 급락 이후 저점에 있다. ChatGPT 충격이 발생하였으며 자체 LLM을 개발 중이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'ChatGPT', value: '검색 패러다임 위협', trend: '구글·빙 AI 공세', tone: 'negative' },
      { label: 'HyperCLOVA', value: '자체 LLM 개발', trend: '한국 시장 방어 가능성', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 1,
    explanation: '기존 플랫폼 AI 전환 = 빠른 수익화. 1개월 뒤 상승 (+14%).',
    reveal: {
      title: '네이버 (035420.KS)', market: 'KOSPI · 인터넷·AI', period: '2022년 6월 ~ 2023년 1월',
      result: '1개월 후 상승 (+14%).',
      macro: '금리 동결 전환, 자체 LLM 발표, AI 검색 베타 출시.',
      lesson: 'AI 변곡점 = 기존 강자가 1차 수혜.',
    },
  },

  {
    id: 31, market: 'KOSPI', ticker: '005380.KS', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2020-06-05',
    question: 'EV 브랜드를 출범하고 강하게 상승 중이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'IONIQ', value: '전용 EV 플랫폼', trend: '글로벌 EV 전략 공식화', tone: 'positive' },
      { label: 'EV 보조금', value: '미국·유럽 확대', trend: '내연기관 퇴출 정책', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 1,
    explanation: '산업 전환 초기 + 실물 실적 동반 = 추세 유효. 1개월 뒤 상승 (+7%).',
    reveal: {
      title: '현대자동차 (005380.KS)', market: 'KOSPI · 자동차·EV', period: '2020년 6월 ~ 2021년 1월',
      result: '1개월 후 상승 (+7%).',
      macro: 'IONIQ 브랜드 공식화, 미국 EV 세액공제, 초저금리.',
      lesson: '산업 전환 초기에 가장 공격적인 기업이 프리미엄.',
    },
  },

  {
    id: 32, market: 'NASDAQ', ticker: 'AAPL', pattern: 'breakdown',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2018-06-06',
    question: '중국 매출 경고와 공급망 리스크로 급락 중이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '중국 매출', value: '역성장 경고', trend: '화웨이 제재 역풍', tone: 'negative' },
      { label: '서비스 매출', value: '고성장 지속', trend: '하드웨어→서비스 전환', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 3,
    explanation: '하드웨어→서비스 구조 전환 인식 = 밸류에이션 재편 촉매. 1개월 뒤 하락 (-20%).',
    reveal: {
      title: 'Apple (AAPL)', market: 'NASDAQ · 빅테크', period: '2018년 6월 ~ 2019년 1월',
      result: '1개월 후 하락 (-20%).',
      macro: '2018년 11월 쿡 CEO 실적 경고 → 대폭락. 2019년 서비스 전략 선언.',
      lesson: '사업 구조 전환 인식 = 밸류에이션 재편 촉매.',
    },
  },

  {
    id: 33, market: 'NASDAQ', ticker: 'AMD', pattern: 'cup',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2022-06-29',
    question: '반도체 다운사이클 저점에 있다. AI 칩 경쟁이 시작되기 직전이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'PC 수요', value: '역대 최대 역성장', trend: '재고 과잉 정점', tone: 'negative' },
      { label: 'AI 데이터센터', value: 'EPYC CPU 수주', trend: 'MI300 GPU 출시 예정', tone: 'positive' },
    ],
    choices: [
      '폭등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '사이클 저점 + AI 구조적 수요 = 반등 이중 동력. 1개월 뒤 급등 (+19%).',
    reveal: {
      title: 'AMD', market: 'NASDAQ · 반도체', period: '2022년 6월 ~ 2023년 1월',
      result: '1개월 후 급등 (+19%).',
      macro: 'ChatGPT 이후 AI GPU 수요 폭발, CUDA 대안 수요 증가.',
      lesson: '산업 변곡점 = 1등뿐 아니라 2등도 크게 오른다.',
    },
  },

  {
    id: 34, market: 'ETF', ticker: 'GLD', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2019-10-11',
    question: '코로나 패닉과 연준의 무제한 QE가 동시에 발생하였다. 이 ETF, 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '연준', value: '제로금리+무제한 QE', trend: '실질 금리 마이너스 전환', tone: 'positive' },
      { label: '달러', value: 'DXY 급등', trend: '안전자산 수요', tone: 'neutral' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 2,
    explanation: '실질 금리 마이너스 = 금 기회비용 소멸 → 상승. 1개월 뒤 횡보 (-1%).',
    reveal: {
      title: 'SPDR Gold Shares (GLD)', market: 'ETF · 금 현물', period: '2019년 10월 ~ 2020년 5월',
      result: '1개월 후 횡보 (-1%).',
      macro: '연준 QE → 실질금리 마이너스 → 금 기회비용 소멸.',
      lesson: '실질 금리가 답 — 마이너스면 금 강세.',
    },
  },

  {
    id: 35, market: 'KOSDAQ', ticker: '086520.KQ', pattern: 'parabolic',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2023-01-06',
    question: '6개월 만에 수배 상승하였다. PER이 수백 배 수준이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '개인 비중', value: '90%+', trend: '코스닥 시총 1위·열풍', tone: 'negative' },
      { label: 'PER', value: '수백 배', trend: '이익 대비 주가 극단적 괴리', tone: 'negative' },
    ],
    choices: [
      '추가 폭등한다',
      '횡보한다',
      '하락한다',
      '급락한다',
    ],
    answer: 0,
    explanation: 'PER 수백 배 + 개인 90% = 포물선 붕괴 전형 패턴. 1개월 뒤 급등 (+15%).',
    reveal: {
      title: '에코프로 (086520.KQ)', market: 'KOSDAQ · 2차전지 모회사', period: '2023년 1월 ~ 2023년 8월',
      result: '1개월 후 급등 (+15%).',
      macro: '2023년 7월 금융당국 과열 경고, 공매도 재개 압박.',
      lesson: '+1,000% 오른 주식이 "더 간다"는 기대 자체가 버블의 속성.',
    },
  },

  // ── 확장 문제 3 (P36 ~ P55) ─────────────────────────────────────────────────

  {
    id: 36, market: 'NASDAQ', ticker: 'TSLA', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2020-01-09',
    question: '장기 박스권을 강하게 상향 돌파하였다. EV 보조금 정책이 확정되고 S&P500 편입이 거론되고 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'S&P500 편입', value: '가능성 부각', trend: '지수 추종 펀드 강제 매수 기대', tone: 'positive' },
      { label: 'EV 보조금', value: '미국·유럽 확대', trend: '내연기관 퇴출 정책 가속', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 2,
    explanation: 'S&P500 편입 기대 + EV 테마 = 기관 강제 매수 예고. 1개월 뒤 급등 (+85%). 편입 전 FOMO 매수가 추가 가속시켰다.. 1개월 뒤 횡보 (+4%).',
    reveal: {
      title: 'Tesla (TSLA)', market: 'NASDAQ · 전기차', period: '2020년 1월 ~ 2020년 8월',
      result: '1개월 후 횡보 (+4%).',
      macro: '2020년 12월 S&P500 정식 편입, 기관 강제 매수 + EV 보조금 + 초저금리.',
      lesson: '지수 편입은 기계적 매수를 부른다. 편입 확정 후 오히려 "Sell the news"가 나오는 경우도 있으니 타이밍을 구분해야 한다.',
    },
  },

  {
    id: 37, market: 'NYSE', ticker: '^GSPC', pattern: 'vshape',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2019-09-23',
    question: '33일 만에 -34% 폭락하였다. 역사상 가장 빠른 하락이다. 연준이 무제한 QE를 선언하고 정부가 5조 달러 부양책을 예고하였다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '연준', value: '무제한 QE 선언', trend: '역대 최대 속도 유동성 공급', tone: 'positive' },
      { label: '정부 부양', value: '5조 달러', trend: '직접 현금 지급 포함', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '연준 무제한 QE + 5조 달러 부양 = 유동성 폭발. 1개월 뒤 급등 (+26%). 실업률 14.7%에도 주가는 V자를 그렸다.. 1개월 뒤 급등 (+25%).',
    reveal: {
      title: 'S&P 500 (^GSPC)', market: 'NYSE · 미국 대형주', period: '2019년 9월 ~ 2020년 4월',
      result: '1개월 후 급등 (+25%).',
      macro: '연준 제로금리+무제한 QE, 정부 CARES Act 2.2조달러, 백신 개발 경쟁 시작.',
      lesson: '주가는 실물 경기가 아닌 유동성과 기대를 6개월 앞서 반영한다. 공포 극대화 시점이 역발상 매수 기회다.',
    },
  },

  {
    id: 38, market: 'NASDAQ', ticker: 'META', pattern: 'recovery',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2022-05-09',
    question: '-74% 폭락 후 바닥에 있다. CEO가 대규모 구조조정과 "효율의 해"를 선언하며 비용 절감에 나섰다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'PER', value: '12배', trend: '빅테크 역대 최저 밸류', tone: 'positive' },
      { label: '구조조정', value: '21,000명 감원', trend: '이익률 회복 기대', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '경영 피벗 + 역대 저밸류 + AI 광고 수익화 = 역발상 기회. 1개월 뒤 급등 (+23%). 감원 발표 후 이익률이 빠르게 회복됐다.. 1개월 뒤 급등 (+26%).',
    reveal: {
      title: 'Meta Platforms (META)', market: 'NASDAQ · 소셜미디어·AI', period: '2022년 5월 ~ 2022년 12월',
      result: '1개월 후 급등 (+26%).',
      macro: '대규모 감원으로 영업이익률 29%→40% 회복, AI 광고 추천 시스템 성공, Fed 금리 인상 속도 둔화.',
      lesson: '경영진이 스스로 실패를 인정하고 구체적으로 실행하면 주가는 빠르게 반응한다. "효율의 해"는 투자자 신뢰를 되찾는 신호였다.',
    },
  },

  {
    id: 40, market: 'NASDAQ', ticker: 'AAPL', pattern: 'recovery',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2018-07-16',
    question: '중국 매출 경고로 -35% 폭락한 이후 저점에 있다. CEO가 하드웨어에서 서비스 중심으로 사업 구조를 전환하겠다고 선언하였다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '서비스 매출', value: '연간 +20% 성장', trend: '앱스토어·구독 매출 확대', tone: 'positive' },
      { label: 'Fed 피벗', value: '"인내심" 발언', trend: '금리 인상 중단 신호', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 1,
    explanation: '하드웨어→서비스 전환 + Fed 피벗 = 밸류 리레이팅 촉매. 1개월 뒤 급등 (+22%). 서비스 매출 비중이 처음으로 20%를 돌파했다.. 1개월 뒤 상승 (+14%).',
    reveal: {
      title: 'Apple (AAPL)', market: 'NASDAQ · 빅테크', period: '2018년 7월 ~ 2019년 2월',
      result: '1개월 후 상승 (+14%).',
      macro: '2019년 서비스 스트래티지 발표, Fed 금리 인상 중단, 중국 무역협상 1단계 기대.',
      lesson: '사업 구조 전환을 시장이 믿기 시작하면 밸류에이션이 한 단계 뛰어오른다. 전환 초기가 가장 강한 진입 시점이다.',
    },
  },

  {
    id: 42, market: 'CRYPTO', ticker: 'BTC-USD', pattern: 'sideways',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2020-01-11',
    question: '반감기 직후 횡보가 이어지고 있다. 공급이 절반으로 줄었으나 즉각적인 가격 반응은 없다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '반감기', value: '2020년 5월 완료', trend: '채굴 보상 12.5→6.25BTC', tone: 'positive' },
      { label: '연준 QE', value: '무제한 진행 중', trend: '위험자산 유동성 공급', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 2,
    explanation: '반감기 후 공급 감소 효과는 지연 반영된다. 1개월 뒤 상승 (+14%). 이후 12개월 동안 +500% 이상 상승이 이어졌다.. 1개월 뒤 횡보 (+4%).',
    reveal: {
      title: 'Bitcoin (BTC/USD)', market: 'Crypto · 가상자산', period: '2020년 1월 ~ 2020년 6월',
      result: '1개월 후 횡보 (+4%).',
      macro: '반감기 공급 쇼크, 연준 QE, 마이크로스트래티지 첫 BTC 매수(8월), 페이팔 지원 선언.',
      lesson: '반감기 효과는 즉각 반영되지 않는다. 3번 모두 반감기 후 6~18개월이 최대 상승 구간이었다.',
    },
  },

  {
    id: 43, market: 'NYSE', ticker: '^GSPC', pattern: 'uptrend',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2022-07-11',
    question: '2022년 약세장 저점에서 반등하여 강한 상승 추세가 이어지고 있다. AI 투자 붐과 함께 인플레이션이 둔화 중이다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'AI 붐', value: 'ChatGPT 출시 직후', trend: '나스닥 빅테크 주도 상승', tone: 'positive' },
      { label: 'CPI', value: '6%→3%대 하락', trend: '금리 인상 종료 기대', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 1,
    explanation: 'AI 테마 + 인플레이션 둔화 = 강세장 재개. 1개월 뒤 급등 (+16%). 엔비디아가 지수 상승을 주도했다.. 1개월 뒤 상승 (+7%).',
    reveal: {
      title: 'S&P 500 (^GSPC)', market: 'NYSE · 미국 대형주', period: '2022년 7월 ~ 2023년 2월',
      result: '1개월 후 상승 (+7%).',
      macro: 'ChatGPT 충격 이후 AI 투자 붐, Fed 인상 종료 기대, S&P500 2023년 연간 +24%.',
      lesson: '새로운 기술 패러다임 + 매크로 개선이 겹치면 시장은 빠르게 재평가한다. 약세장 직후 새 강세장 초기가 가장 공격적인 투자 시점이다.',
    },
  },

  {
    id: 44, market: 'KOSPI', ticker: '005930.KS', pattern: 'uptrend',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2016-10-04',
    question: 'DRAM 가격이 급등하며 강한 상승 추세가 이어지고 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'DRAM 가격', value: '연간 +70%', trend: '서버·모바일 동반 수요 급증', tone: 'positive' },
      { label: '데이터센터', value: '투자 폭증', trend: '클라우드 확장으로 서버 수요', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 1,
    explanation: 'DRAM 슈퍼사이클 + 클라우드 서버 수요 = 실적 동반 급등. 1개월 뒤 급등 (+20%). 분기 영업이익이 사상 최초 10조를 돌파했다.. 1개월 뒤 상승 (+10%).',
    reveal: {
      title: '삼성전자 (005930.KS)', market: 'KOSPI · 반도체', period: '2016년 10월 ~ 2017년 5월',
      result: '1개월 후 상승 (+10%).',
      macro: 'DRAM 현물가 +70%, 서버·모바일 동반 수요, 외국인 지분 역대 최고.',
      lesson: '반도체 슈퍼사이클은 가격 상승이 실적을 직접 끌어올린다. 사이클 확인 후 진입해도 충분한 수익을 낼 수 있다.',
    },
  },

  {
    id: 45, market: 'KOSPI', ticker: '035420.KS', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2019-10-02',
    question: '코로나 봉쇄로 인한 비대면 수요 폭발로 강하게 돌파하였다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '비대면', value: '수요 폭발', trend: '쇼핑·광고·교육 모두 온라인 전환', tone: 'positive' },
      { label: '동학개미', value: '신규 계좌 폭증', trend: '국내 플랫폼 트래픽 급증', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: '비대면 가속 + 광고·커머스 폭발 = 실적 서프라이즈. 1개월 뒤 급등 (+32%). 광고 매출이 전년 대비 30% 급증했다.. 1개월 뒤 급등 (+24%).',
    reveal: {
      title: '네이버 (035420.KS)', market: 'KOSPI · 인터넷·플랫폼', period: '2019년 10월 ~ 2020년 5월',
      result: '1개월 후 급등 (+24%).',
      macro: 'COVID 비대면 수요, 스마트스토어 거래액 +60%, 동학개미 유입으로 금융 트래픽 급증.',
      lesson: '위기는 디지털 전환을 5년 앞당겼다. 수혜 기업을 찾아 집중하는 것이 핵심이다.',
    },
  },

  {
    id: 46, market: 'KOSPI', ticker: '035720.KS', pattern: 'doubletop',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2020-12-23',
    question: '고점 부근에서 두 번째 봉우리가 형성되고 있다. 플랫폼 규제 압박이 심화되고 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '플랫폼 규제', value: '국회 입법 추진', trend: '공정거래·골목상권 침해 논란', tone: 'negative' },
      { label: 'PER', value: '70배+', trend: '고성장 프리미엄 과대 반영 우려', tone: 'negative' },
    ],
    choices: [
      '상승한다',
      '횡보한다',
      '하락한다',
      '급락한다',
    ],
    answer: 1,
    explanation: '규제 현실화 + 고PER 멀티플 압축 = 급락 시작. 1개월 뒤 하락 (-18%). 6개월 후에는 고점 대비 -60%를 기록했다.. 1개월 뒤 횡보 (-5%).',
    reveal: {
      title: '카카오 (035720.KS)', market: 'KOSPI · 인터넷·플랫폼', period: '2020년 12월 ~ 2021년 7월',
      result: '1개월 후 횡보 (-5%).',
      macro: '금융위원회 카카오페이 제재, 오너 직접 사과, 한국은행 금리 인상 사이클 시작.',
      lesson: '국내 플랫폼 독점 기업에는 정치 리스크 할인이 필수다. 규제는 기대보다 빠르게 현실화된다.',
    },
  },

  {
    id: 47, market: 'NYSE', ticker: 'GLD', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2019-12-05',
    question: '9년 만에 전 고점을 돌파하였다. 코로나 부양책으로 실질 금리가 마이너스로 전환되었다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '실질 금리', value: '-1%대', trend: 'QE + 인플레이션 기대 = 마이너스 전환', tone: 'positive' },
      { label: '달러 약세', value: 'DXY 하락 중', trend: '무제한 QE로 달러 가치 훼손', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 1,
    explanation: '9년 전 고점 돌파 + 실질 금리 마이너스 = 금 강세장 재개. 1개월 뒤 급등 (+11%). 8월에는 사상 최고가 $2,075를 기록했다.. 1개월 뒤 상승 (+7%).',
    reveal: {
      title: 'SPDR Gold Shares (GLD)', market: 'NYSE · 금 ETF', period: '2019년 12월 ~ 2020년 7월',
      result: '1개월 후 상승 (+7%).',
      macro: '연준 QE로 실질금리 마이너스, 달러 약세, 인플레이션 기대 상승, 지정학적 불확실성.',
      lesson: '금의 적(敵)은 실질 금리다. 실질 금리가 오르면 금은 약해지고, 내리면 강해진다. 이 원칙 하나만 기억해도 금 투자의 절반은 성공이다.',
    },
  },

  {
    id: 48, market: 'NASDAQ', ticker: 'NVDA', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2022-11-25',
    question: '전 고점을 강하게 돌파하였다. AI 데이터센터 GPU 수요가 예상을 3배 상회하는 실적 가이던스가 발표되었다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'ChatGPT 수요', value: 'GPU 주문 폭발', trend: '데이터센터 GPU 대기 6~9개월', tone: 'positive' },
      { label: '가이던스', value: '+53% 상향', trend: '역대 가장 강력한 실적 예고', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 1,
    explanation: '가이던스 +53% 상향 = 시장 기대의 3배. 1개월 뒤 급등 (+35%). 이 발표 이후 엔비디아는 반년 만에 시가총액 1조 달러를 돌파했다.. 1개월 뒤 상승 (+6%).',
    reveal: {
      title: 'NVIDIA (NVDA)', market: 'NASDAQ · AI 반도체', period: '2022년 11월 ~ 2023년 6월',
      result: '1개월 후 상승 (+6%).',
      macro: 'ChatGPT 출시 후 H100 GPU 수요 폭발, 빅테크 AI 인프라 투자 경쟁, 가이던스 연속 상향.',
      lesson: '구조적 수요 변화는 일반 사이클과 다르다. AI 인프라 투자는 단기 트렌드가 아닌 장기 인프라 사이클이었다.',
    },
  },

  {
    id: 50, market: 'CRYPTO', ticker: 'BTC-USD', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2023-09-09',
    question: '현물 ETF가 역대 최초로 승인된 직후이다. 장기 박스권을 강하게 돌파하였다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '현물 ETF', value: '1월 10일 승인', trend: '블랙록·피델리티 등 11개 동시 상장', tone: 'positive' },
      { label: '반감기', value: '2024년 4월 예정', trend: '공급 절반 감소 이벤트', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 2,
    explanation: 'ETF 구조적 수요 + 반감기 공급 감소 = 이중 호재. 1개월 뒤 급등 (+22%). 첫 달 순유입 $40억으로 ETF 역대 최고 기록을 세웠다.. 1개월 뒤 횡보 (+1%).',
    reveal: {
      title: 'Bitcoin (BTC/USD)', market: 'Crypto · 가상자산', period: '2023년 9월 ~ 2024년 2월',
      result: '1개월 후 횡보 (+1%).',
      macro: '블랙록 IBIT 상장 후 순유입 역대 최고, 반감기(4월) 후 공급 감소, Fed 금리 인하 기대.',
      lesson: '기관 접근성 확대는 일회성 이벤트가 아니라 구조적 수요 증가다. ETF 승인 이후 BTC는 3개월 내 사상 최고가를 경신했다.',
    },
  },

  {
    id: 51, market: 'KOSPI', ticker: '051910.KS', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2020-02-17',
    question: '배터리 사업 분할 상장 기대감으로 박스권을 돌파하였다. EV 수요가 폭발적으로 증가하고 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'LG에너지솔루션', value: '상장 기대감', trend: '배터리 사업 분리 = 화학+배터리 재평가', tone: 'positive' },
      { label: 'EV 수요', value: 'GM·폭스바겐 수주', trend: '글로벌 배터리 공급 계약 폭증', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 2,
    explanation: '분할 상장 기대 + EV 수주 = 숨겨진 가치 발견. 1개월 뒤 급등 (+25%). 이후 LG에너지솔루션 IPO는 당시 역대 최대 규모였다.. 1개월 뒤 횡보 (+4%).',
    reveal: {
      title: 'LG화학 (051910.KS)', market: 'KOSPI · 화학·배터리', period: '2020년 2월 ~ 2020년 9월',
      result: '1개월 후 횡보 (+4%).',
      macro: 'LG에너지솔루션 분할 상장 공식화, GM 얼티엄 배터리 공급 계약, 초저금리 EV 투자 붐.',
      lesson: '사업 분리는 숨겨진 가치를 드러내는 촉매다. 복합 기업의 핵심 자산이 독립할 때 리레이팅 기회가 생긴다.',
    },
  },

  {
    id: 52, market: 'NYSE', ticker: 'GME', pattern: 'parabolic',
    revealDay: 126, chartDays: 147, difficulty: 'hard',
    startDate: '2020-07-13',
    question: '공매도 140%에서 개인 집단 매수로 포물선 급등이 진행 중이다. 증권사들이 매수를 제한하기 시작하였다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: '로빈후드', value: '매수 제한 조치', trend: '개인 매수 인위적 차단', tone: 'negative' },
      { label: '공매도 청산', value: '90% 이상 완료', trend: '숏 스퀴즈 연료 소진', tone: 'negative' },
    ],
    choices: [
      '추가 폭등한다',
      '횡보한다',
      '하락한다',
      '급락한다',
    ],
    answer: 0,
    explanation: '매수 제한 + 공매도 청산 완료 = 연료 소진. 1개월 뒤 급락 (-67%). 기업 가치와 괴리된 가격은 반드시 회귀한다.. 1개월 뒤 급등 (+184%).',
    reveal: {
      title: 'GameStop (GME)', market: 'NYSE · 게임 소매', period: '2020년 7월 ~ 2021년 2월',
      result: '1개월 후 급등 (+184%).',
      macro: '로빈후드 매수 제한(1/28), 의회 청문회 소환, 공매도 잔고 소진으로 숏 스퀴즈 종료.',
      lesson: '숏 스퀴즈는 예측하고 진입하는 게 아니라 관찰하고 빠져나오는 것이다. FOMO로 고점 진입 시 손실 확률이 극도로 높다.',
    },
  },

  {
    id: 54, market: 'NASDAQ', ticker: 'AMD', pattern: 'cup',
    revealDay: 126, chartDays: 147, difficulty: 'medium',
    startDate: '2022-07-22',
    question: '반도체 다운사이클 저점에서 컵 패턴이 형성되었다. MI300 AI GPU 출시가 예정되어 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'MI300 GPU', value: 'NVIDIA 대안 수요', trend: 'AI 데이터센터 공급 부족', tone: 'positive' },
      { label: 'PC 사이클', value: '재고 정점 통과', trend: '소비자 PC 수요 회복 조짐', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 1,
    explanation: 'AI GPU 대안 + 사이클 저점 = 이중 상승 동력. 1개월 뒤 급등 (+25%). MI300 출시 후 AMD의 데이터센터 매출이 분기 $10억을 돌파했다.. 1개월 뒤 상승 (+10%).',
    reveal: {
      title: 'AMD', market: 'NASDAQ · AI 반도체', period: '2022년 7월 ~ 2023년 2월',
      result: '1개월 후 상승 (+10%).',
      macro: 'ChatGPT 수요 폭증으로 NVDA H100 품귀, AMD MI300 AI GPU 사전 수주 폭발, PC 재고 정상화.',
      lesson: '산업 변곡점에서는 1등만 오르지 않는다. 1등이 공급을 따라가지 못할 때 2등은 더 빠르게 성장하기도 한다.',
    },
  },

  {
    id: 55, market: 'KOSPI', ticker: '000660.KS', pattern: 'breakout',
    revealDay: 126, chartDays: 147, difficulty: 'easy',
    startDate: '2022-11-10',
    question: 'HBM(고대역폭 메모리) 공급 계약 소식으로 장기 저항선을 돌파하였다. AI 반도체 수요가 폭발적으로 증가하고 있다. 1개월 후 결과로 옳은 것은?',
    macroHints: [
      { label: 'HBM 수요', value: 'NVDA H100·H200', trend: 'AI GPU당 HBM 8개 이상 탑재', tone: 'positive' },
      { label: 'AI 인프라', value: '투자 폭증', trend: '빅테크 데이터센터 확장 경쟁', tone: 'positive' },
    ],
    choices: [
      '급등한다',
      '상승한다',
      '횡보한다',
      '하락한다',
    ],
    answer: 0,
    explanation: 'HBM 독점 공급 + AI 인프라 투자 폭증 = 구조적 수요. 1개월 뒤 급등 (+23%). SK하이닉스는 HBM 시장점유율 50%를 확보했다.. 1개월 뒤 급등 (+36%).',
    reveal: {
      title: 'SK하이닉스 (000660.KS)', market: 'KOSPI · 반도체·HBM', period: '2022년 11월 ~ 2023년 6월',
      result: '1개월 후 급등 (+36%).',
      macro: 'NVDA H100 HBM 단독 공급 계약, AI 데이터센터 투자 $1,000억 돌파, 삼성 대비 HBM 기술 우위.',
      lesson: 'AI 인프라 사이클에서 가장 중요한 부품의 독점 공급자를 찾는 것이 핵심이다. HBM은 AI 반도체의 병목이었다.',
    },
  },
];

