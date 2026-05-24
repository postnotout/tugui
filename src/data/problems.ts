import type { Problem } from '../types';

export const PROBLEM_POOL: Problem[] = [
  {
    id: 1, market: 'KOSPI', ticker: '005930.KS', pattern: 'breakout', revealDay: 80, difficulty: 'easy',
    startDate: '2020-09-01',
    question: '차트가 끝나는 현재 시점, 이 종목은 이후 어떻게 됐을까?',
    macroHints: [
      { label: '한국 기준금리', value: '0.50%', trend: '초저금리 유지', tone: 'positive' },
      { label: '글로벌 유동성', value: 'QE 진행', trend: '양적완화 폭증', tone: 'positive' },
      { label: '반도체 업황', value: '슈퍼사이클 기대', trend: '비대면 수요 폭증', tone: 'positive' },
      { label: '외국인 수급', value: '순매수 전환', trend: '원화 강세', tone: 'positive' },
    ],
    choices: [
      '대세 상승 (추가 급등)',
      '대세 하락 (추세 반전)',
      '횡보 지속',
      '단기 급락 후 회복',
    ],
    answer: 0,
    odds: '박스권 돌파 패턴 자체의 통계적 적중률은 50~60% 수준. 다만 우호적 매크로가 동반될 때 확률이 의미있게 상승.',
    explanation: '이 사례는 차트와 매크로가 같은 방향을 가리킨 케이스로, 결과적으로 대세 상승했습니다. 다만 같은 패턴 + 같은 환경이라도 결과가 다를 수 있음을 기억하세요. 박스권 돌파의 적중률은 50~60%이며, 매크로 동행이 확률을 높일 뿐 보장하지 않습니다.',
    reveal: {
      title: '삼성전자 (005930.KS)', market: 'KOSPI · 반도체', period: '2020년 9월 ~ 2021년 1월',
      result: '약 5만원대 박스권 돌파 후 2021년 1월 11일 96,800원 사상최고가 도달 (약 +80%)',
      macro: '한국 기준금리 0.5%, 미 연준 양적완화 지속, 코로나 비대면 수요로 메모리 반도체 슈퍼사이클 기대, 동학개미 운동과 외국인 매수 동시 유입.',
      counterCase: '반례 - 동일 시기 LG디스플레이는 비슷한 박스권 돌파 시도가 있었으나 OLED 전환 비용 부담으로 곧 되밀려 횡보. 같은 매크로 환경에서도 종목 펀더멘털에 따라 결과는 갈립니다.',
      lesson: '차트 + 매크로 일치는 확률을 높이지만 결과를 보장하지 않습니다. 손절선 설정은 필수.',
    },
  },
  {
    id: 2, market: 'KOSPI', ticker: '051910.KS', pattern: 'uptrend', revealDay: 35, chartDays: 150, difficulty: 'easy',
    startDate: '2020-11-01',
    question: '강한 상승 추세 초입. 이 종목은 이후 어떻게 됐을까?',
    macroHints: [
      { label: '유가 (WTI)', value: '$41', trend: '코로나 저점 회복세', tone: 'positive' },
      { label: '2차전지 테마', value: '폭발적 관심', trend: 'EV 전환 가속화', tone: 'positive' },
      { label: '한국 기준금리', value: '0.50%', trend: '초저금리 유지', tone: 'positive' },
      { label: '배터리 자회사', value: 'LG에너지솔루션', trend: '분할 상장 추진', tone: 'positive' },
    ],
    choices: [
      '상승 추세 지속',
      '단기 급락 후 횡보',
      '추세 반전 (하락 전환)',
      '횡보 지속',
    ],
    answer: 0,
    odds: '강한 추세에 역행하는 매매(역추세 매매)의 성공률은 일반적으로 낮습니다. 단 추세는 영원하지 않으며 어디서 꺾일지는 사후에만 확인 가능.',
    explanation: '추세 + 매크로가 모두 우호적이면 추세 지속 확률이 높습니다. 다만 "이미 너무 올랐다"는 직관은 자주 틀립니다. 손절선만 분명하다면 추세 추종이 합리적인 선택지 중 하나입니다.',
    reveal: {
      title: 'LG화학 (051910.KS)', market: 'KOSPI · 화학·배터리', period: '2020년 11월 ~ 2021년 1월',
      result: '60만원대 → 105만원대 사상최고가 도달 (약 +75%)',
      macro: '코로나 회복으로 원유 가격 상승, 중국 화학 수요 회복, 2차전지 자회사 LG에너지솔루션 분할 상장 기대감, 마진 스프레드 확대.',
      counterCase: '반례 - 그러나 2021년 1월 고점 이후 LG화학은 LG에너지솔루션 분할 상장 결정과 함께 -30% 이상 조정. 호재 기대감이 실현되는 순간 차익실현 매물에 짓눌리는 "Sell the news" 현상도 흔합니다.',
      lesson: '추세는 친구지만 영원한 친구는 아닙니다. 트레일링 스탑으로 따라가되 분할 매도 계획도 동시에.',
    },
  },
  {
    id: 3, market: 'KOSPI', ticker: '000660.KS', pattern: 'parabolic', revealDay: 85, chartDays: 270, difficulty: 'easy',
    startDate: '2018-01-02',
    question: '강한 상승이 수개월 이어진 후 포물선 가속 구간. 이 종목은 이후 어떻게 됐을까?',
    macroHints: [
      { label: 'DRAM 가격', value: '연간 +50%', trend: '슈퍼사이클 정점', tone: 'positive' },
      { label: '한국 수출', value: '사상최대', trend: '반도체 견인', tone: 'positive' },
      { label: '실적 가이던스', value: '연속 상향', trend: '어닝 서프라이즈', tone: 'positive' },
      { label: '외국인 지분율', value: '50%+', trend: '역대 최고 수준', tone: 'positive' },
    ],
    choices: [
      '추세 지속 (추가 상승)',
      '고점 형성 후 장기 조정',
      '횡보 후 재상승',
      '단기 조정 후 신고가',
    ],
    answer: 1,
    odds: '실적 정점에서 주가가 미리 꺾이는 경우는 매우 흔합니다. "주가는 실적을 6개월 선행한다"는 격언이 있을 정도. 그러나 정확한 고점 시점은 사후에만 알 수 있습니다.',
    explanation: '차트와 매크로가 모두 우호적으로 보였지만, 사이클 정점에서는 오히려 반전 위험이 큽니다. 모든 지표가 너무 좋을 때야말로 의심해야 합니다. 다만 이 판단은 결과론적이며, 실시간으로 정점을 잡는 것은 거의 불가능합니다.',
    reveal: {
      title: 'SK하이닉스 (000660.KS)', market: 'KOSPI · 반도체', period: '2017년 ~ 2019년',
      result: '2018년 5월 97,700원 고점 → 2019년 1월 60,500원까지 약 -38% 조정. DRAM 가격 정점과 동시에 주가 꺾임.',
      macro: '2017년 슈퍼사이클 정점에서 모든 지표가 최고치를 기록. 그러나 미중 무역분쟁 시작, 중국 메모리 자급 우려, 데이터센터 자본지출 감속이 동시 진행되며 사이클 하강 시작.',
      counterCase: '반례 - 동일 시기 삼성전자는 -25% 수준 조정으로 SK하이닉스보다 선방. 같은 업종 같은 매크로에도 사업 구조(메모리 의존도)에 따라 결과가 갈립니다.',
      lesson: '"모든 지표가 너무 좋다"는 그 자체로 경계 신호입니다. 사이클 산업은 정점에서 매수하지 않는 것이 첫 번째 생존 원칙.',
    },
  },
  {
    id: 4, market: 'NASDAQ', ticker: 'NVDA', pattern: 'cup', revealDay: 80, chartDays: 175, difficulty: 'medium',
    startDate: '2022-10-03',
    question: '약세장 저점 부근에서 컵 패턴 형성 중. 이 종목은 이후 어떻게 됐을까?',
    macroHints: [
      { label: '연준 정책', value: '4.00%', trend: '75bp 연속 인상', tone: 'negative' },
      { label: 'AI 인프라', value: 'ChatGPT 출시 예정', trend: '데이터센터 수요 태동', tone: 'positive' },
      { label: 'NVDA 데이터센터', value: '+61% 성장', trend: '게임 부진 상쇄', tone: 'positive' },
      { label: '나스닥', value: '연초대비 -33%', trend: '기술주 약세장', tone: 'negative' },
    ],
    choices: [
      '대세 상승 (장기 우상향)',
      '단기 조정 후 횡보',
      '추세 반전 (고점 형성)',
      '급락',
    ],
    answer: 0,
    odds: '강력한 차트 패턴 + 명확한 매크로 모멘텀이 동행할 때 추세 추종 매수의 승률은 의미있게 상승. 그러나 이런 환경은 1년에 몇 번 안 옵니다.',
    explanation: '이 사례는 차트, 매크로, 실적, 모멘텀이 모두 같은 방향을 가리킨 드문 케이스로 대세 상승이 이어졌습니다. 다만 진입 시점이 이미 많이 오른 후라면, "너무 늦었나" 하는 망설임이 더 큰 수익을 놓치게 만들기도 합니다. 또한 이런 강세 사이클 후에는 반드시 큰 조정이 옵니다.',
    reveal: {
      title: 'NVIDIA (NVDA)', market: 'NASDAQ · AI 반도체', period: '2023년 1월 ~ 2024년 6월',
      result: '컵 형성 후 신고가 행진. 2023년 초 약 $14대(액면분할 반영) → 2024년 6월 $140대 도달 (약 +900%)',
      macro: 'ChatGPT 이후 AI 인프라 투자 사상 최대, 하이퍼스케일러(MS·구글·메타·아마존) 자본지출 폭증, 데이터센터 매출 가이던스 연속 상향, 연준 금리 인하 사이클 진입 기대.',
      counterCase: '반례 - 같은 AI 테마에서 Palantir, C3.ai 등은 변동성이 훨씬 컸고, AMD는 NVDA만큼 폭등하지 못함. "AI 수혜주"라는 카테고리만으로는 종목 선택 기준이 부족합니다.',
      lesson: '강한 차트 + 강한 매크로 + 압도적 실적이 동행할 때만 추세 추종 매수가 정당화됩니다. "AI 관련주"라는 막연한 이유로는 부족.',
    },
  },
  {
    id: 5, market: 'NASDAQ', ticker: 'TSLA', pattern: 'doubletop', revealDay: 75, chartDays: 300, difficulty: 'medium',
    startDate: '2021-11-01',
    question: '고점 부근에서 두 번째 봉우리 형성. 이 종목은 이후 어떻게 됐을까?',
    macroHints: [
      { label: '미 기준금리', value: '0.25% → 인상', trend: '40년만의 급격한 긴축', tone: 'negative' },
      { label: 'CPI', value: '8.5%', trend: '40년래 최고', tone: 'negative' },
      { label: '10년물 금리', value: '2.8%', trend: '급등 중', tone: 'negative' },
      { label: '성장주 PER', value: '50배+', trend: '멀티플 압축 우려', tone: 'negative' },
    ],
    choices: [
      '대세 하락 (추세 반전)',
      '단기 조정 후 재상승',
      '횡보 지속',
      'V자 반등',
    ],
    answer: 0,
    odds: '쌍봉 패턴의 단독 적중률은 약 60% 수준이지만, 긴축 사이클에서 고PER 성장주의 쌍봉은 훨씬 위험. 그러나 정확한 하락 폭과 기간은 예측 불가.',
    explanation: '쌍봉 + 긴축 환경 + 고밸류에이션이 겹친 사례로, 결과적으로 큰 폭의 하락이 나왔습니다. 다만 -75%까지의 깊이는 사전에 예측 불가능했습니다. 모든 매도 시점이 정답이지만 어디가 바닥인지는 알 수 없습니다.',
    reveal: {
      title: 'Tesla (TSLA)', market: 'NASDAQ · 전기차', period: '2021년 11월 ~ 2023년 1월',
      result: '414달러 사상최고가 → 2022년 4월 재상승 실패(쌍봉 형성) → 2023년 1월 100달러 부근까지 약 -75% 폭락',
      macro: '연준이 2022년 3월부터 2023년 7월까지 0.25%→5.50%로 5.25%p 인상(40년만의 최단기 인상), 인플레이션 9.1% 정점, 머스크의 트위터 인수(440억$)로 테슬라 지분 매각 및 경영 분산 우려.',
      counterCase: '반례 - Tesla는 2023년부터 다시 회복해 2024년 말 한때 $400대를 재돌파. 만약 -75% 시점에 손절한 후 재진입을 못 했다면, 결과적으로 큰 손실. 쌍봉이 "영원한 하락"을 의미하지는 않습니다.',
      lesson: '쌍봉 + 긴축은 매도 신호로 작용했지만, 손절 후 재진입 전략이 없으면 추세 전환 시 수익을 놓칩니다.',
    },
  },
  {
    id: 6, market: 'KOSPI', ticker: '011170.KS', pattern: 'breakout', revealDay: 78, chartDays: 220, difficulty: 'medium',
    startDate: '2021-09-01',
    question: '박스권 돌파 시도. 차트는 우호적이지만 매크로는 혼재. 이 종목은 이후?',
    macroHints: [
      { label: '한국 기준금리', value: '0.75% → 인상 시작', trend: '점진적 긴축 진입', tone: 'negative' },
      { label: '코스피 모멘텀', value: '횡보', trend: '3,200대 박스권', tone: 'neutral' },
      { label: '글로벌 화학', value: '수요 둔화 신호', trend: '중국 부동산 위기', tone: 'negative' },
      { label: '실적', value: '전년대비 +20%', trend: '하지만 정점 우려', tone: 'positive' },
    ],
    choices: [
      '가짜 돌파 후 하락',
      '추가 상승 지속',
      '횡보 후 재돌파',
      '강한 추세 반전',
    ],
    answer: 0,
    odds: '차트와 매크로 신호가 충돌(차트 ✓ / 매크로 ✗)할 때는 매크로의 무게가 더 큰 경우가 흔합니다. 다만 절대 법칙은 아닙니다.',
    explanation: '차트만 봤다면 매수 신호로 보이지만, 매크로가 받쳐주지 않으면 가짜 돌파로 끝나는 경우가 많습니다. 특히 사이클 정점 신호가 동반될 때 위험. 이 사례는 "차트만 보면 안 된다"는 교훈이 강하게 드러납니다.',
    reveal: {
      title: '롯데케미칼 (011170.KS)', market: 'KOSPI · 화학', period: '2021년 9월 ~ 2022년 6월',
      result: '약 26만원대에서 박스권 돌파 시도 → 곧 되밀려 하락 시작 → 2022년 6월 17만원대까지 약 -35% 하락',
      macro: '한국 기준금리 인상 사이클 시작, 중국 부동산 위기로 화학 수요 둔화, 유가 정점 후 마진 스프레드 축소, 글로벌 경기 침체 우려.',
      counterCase: '반례 - 같은 시기 정유주(S-Oil 등)는 정제 마진 호조로 오히려 상승. 같은 화학 섹터 안에서도 사업 구조에 따라 결과가 갈렸습니다.',
      lesson: '차트 신호와 매크로가 충돌할 때는 진입을 보류하거나 포지션 사이즈를 줄이는 것이 합리적입니다.',
    },
  },
  {
    id: 7, market: 'KOSDAQ', ticker: '247540.KQ', pattern: 'fakebreakout', revealDay: 78, difficulty: 'hard',
    startDate: '2023-09-01',
    question: '차트는 돌파 시그널처럼 보이지만 매크로는 부정적. 이 종목은 이후?',
    macroHints: [
      { label: '한국 기준금리', value: '3.50%', trend: '고금리 유지', tone: 'negative' },
      { label: '코스피 외국인', value: '순매도', trend: '6주 연속', tone: 'negative' },
      { label: '환율 (원/달러)', value: '1,380원', trend: '연고점 부근', tone: 'negative' },
      { label: '2차전지 섹터', value: '자금 유출', trend: '중국 LFP 경쟁 부각', tone: 'negative' },
    ],
    choices: [
      '가짜 돌파 후 급락',
      '돌파 성공 후 추가 상승',
      '횡보 지속',
      '단기 조정 후 재돌파',
    ],
    answer: 0,
    odds: '매크로가 부정적일 때 차트 돌파 시도의 적중률은 크게 떨어집니다. 그러나 시장 전체의 시점 결정은 누구도 정확히 못 합니다.',
    explanation: '차트만 따라가는 단순 매매가 위험한 사례입니다. 매크로 환경이 받쳐주지 않으면 매수세가 부족해 곧 되밀립니다. 특히 외국인이 적극 매도하는 종목은 개인의 힘만으로 추세를 만들기 어렵습니다.',
    reveal: {
      title: '에코프로비엠 (247540.KQ)', market: 'KOSDAQ · 2차전지 양극재', period: '2023년 9월 ~ 2023년 12월',
      result: '7월 고점 약 58만원에서 조정 후, 9월~10월 단기 반등 시도 → 매크로 압박과 외국인 매도로 되밀려 약 -40% 추가 하락',
      macro: '한국 기준금리 3.5% 유지, 외국인 코스피·코스닥 동시 순매도, 원/달러 1,380원 연고점, 2차전지 섹터 자금 유출 및 중국 LFP 배터리 경쟁 우려 부각.',
      counterCase: '반례 - 동일 시기 같은 2차전지 그룹의 에코프로(086520)는 변동성은 컸으나 상대적으로 빠른 회복. 같은 그룹 같은 매크로에서도 종목별 수급에 따라 결과가 갈립니다.',
      lesson: '외국인이 매도하는 종목에서 차트 돌파를 따라가는 건 개인의 가장 흔한 실수입니다. 수급이 차트보다 우선.',
    },
  },
  {
    id: 8, market: 'CRYPTO', ticker: 'BTC-USD', pattern: 'reversal', revealDay: 82, chartDays: 205, difficulty: 'hard',
    startDate: '2022-05-01',
    question: '큰 하락 후 단기 반등 중. 매크로는 시스템 리스크 진행 중. 이후 흐름은?',
    macroHints: [
      { label: '연준 정책', value: '75bp 연속', trend: '위험자산 자금 이탈', tone: 'negative' },
      { label: '업계 사건', value: 'Terra/Luna 붕괴', trend: '600억$ 증발 직후', tone: 'negative' },
      { label: '대출 플랫폼', value: 'Celsius·3AC 위기', trend: '시스템 리스크 진행', tone: 'negative' },
      { label: 'DXY (달러지수)', value: '105 돌파', trend: '20년래 최고', tone: 'negative' },
    ],
    choices: [
      '데드캣 바운스 (단기 반등 후 추가 급락)',
      'V자 회복 (전고점 돌파)',
      '횡보 지속',
      '점진적 회복',
    ],
    answer: 0,
    odds: '시스템 리스크 진행 중인 자산 클래스의 단기 반등은 추가 하락으로 이어질 확률이 높습니다. 그러나 정확한 바닥은 누구도 모릅니다.',
    explanation: '거래량 동반 반등이라도, 매크로 악재가 추가로 터질 가능성이 있으면 함정입니다. 자산 클래스 전체의 신뢰가 무너진 상황에서는 개별 차트 패턴이 큰 의미가 없습니다.',
    reveal: {
      title: 'Bitcoin (BTC/KRW, Upbit)', market: 'Upbit · 가상자산', period: '2022년 5월 ~ 2022년 12월',
      result: '5,000만원대 → 2,500만원(루나 사태) → 3,000만원대 단기 반등 → 1,900만원대 신저점(FTX 사태)',
      macro: '연준 자이언트스텝 연속, 2022년 5월 Terra/Luna 붕괴로 약 600억$ 시가총액 증발, 6~7월 Celsius·3AC 파산 도미노, 11월 FTX 사태로 업계 신뢰 붕괴.',
      counterCase: '반례 - 그러나 2023년부터 BTC는 회복을 시작해 2024년 ETF 승인 후 1억원을 돌파. "데드캣"이라 판단해 영원히 시장을 떠난 투자자는 큰 기회를 놓쳤습니다. 패닉 매도 후 시장 복귀의 어려움도 동등하게 큰 리스크.',
      lesson: '시스템 리스크 중인 자산은 의심해야 하지만, 영원한 하락은 없습니다. 진짜 어려운 것은 다시 들어가야 할 시점을 잡는 것.',
    },
  },
  {
    id: 9, market: 'NASDAQ', ticker: '^GSPC', pattern: 'vshape', revealDay: 45, difficulty: 'hard',
    startDate: '2020-03-01',
    question: '폭락 후 강한 반등 중. 차트는 V자 형태. 매크로는 사상 최악. 이후는?',
    macroHints: [
      { label: '코로나 팬데믹', value: '전 세계 확산', trend: 'WHO 팬데믹 선언', tone: 'negative' },
      { label: '실업률', value: '14.7%', trend: '대공황 이후 최고', tone: 'negative' },
      { label: 'GDP', value: '-31% 연환산', trend: '2분기 사상 최악', tone: 'negative' },
      { label: '연준 대응', value: '제로금리 + 무제한 QE', trend: '사상 최대 부양', tone: 'positive' },
    ],
    choices: [
      '추가 폭락 (실물 경제 반영)',
      'V자 반등 후 신고가 (유동성 장세)',
      '횡보 지속',
      'L자 침체 (장기 부진)',
    ],
    answer: 1,
    odds: '실물 경제 vs 유동성이 충돌할 때, 단기적으로는 유동성이 자산 가격을 결정하는 경우가 더 많습니다. 그러나 이는 결과론적이며 당시엔 누구도 확신할 수 없었습니다.',
    explanation: '모든 매크로 지표가 사상 최악이었지만, 사상 최대 유동성 공급이 모든 것을 뒤집은 사례. "실물과 주가의 괴리"가 극대화된 케이스로, 이때 "비합리적"이라 판단해 시장을 떠난 투자자가 가장 큰 손해를 봤습니다.',
    reveal: {
      title: 'S&P 500 / 나스닥 종합', market: '미국 주요 지수', period: '2020년 3월 ~ 2021년 12월',
      result: '2020년 3월 코로나 폭락 → 사상 최단 V자 반등 → 2021년 말까지 약 +100% 상승. 실물 경제가 회복되기도 전에 주가가 먼저 신고가.',
      macro: '연준이 제로금리 + 무제한 QE 발표, 미 정부 5조 달러 부양책, 백신 개발 가속. 사상 최악의 실물 경제에도 불구하고 사상 최대 유동성이 자산 가격을 끌어올림.',
      counterCase: '반례 - 같은 시기 항공·여행·오프라인 소매(크루즈, 영화관 등)는 2년 이상 약세 지속. 같은 V자 시장에서도 섹터별로 결과가 극단적으로 갈렸습니다.',
      lesson: '"실물이 나쁜데 왜 주가가 올라?"라는 직관은 자주 틀립니다. 시장은 6개월~1년 선행하며, 유동성이 펀더멘털을 압도할 수 있습니다.',
    },
  },
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
  const easy = shuffle(arr.filter(p => p.difficulty === 'easy'));
  const medium = shuffle(arr.filter(p => p.difficulty === 'medium'));
  const hard = shuffle(arr.filter(p => p.difficulty === 'hard'));
  return [...easy, ...medium, ...hard];
}
