#!/usr/bin/env node
/**
 * 문제 자동 생성 스크립트
 * CSV 데이터를 읽어 흥미로운 가격 변동 구간을 찾고 문제를 생성한다.
 * 출력: src/data/problems.generated.ts
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const DATA_DIR   = path.join(__dirname, '../public/data');
const OUTPUT     = path.join(__dirname, '../src/data/problems.generated.ts');
const MAX_PER_TICKER = 14;  // 티커당 최대 문제 수
const MIN_STEP = 40;        // 최소 시작일 간격 (거래일)
const MIN_CHANGE = 0.08;    // 최소 |%변화|
const REVEAL_DAY = 55;      // 차트 절단 지점 (거래일)
const AFTER_DAYS = 65;      // 절단 후 표시 기간
const CHART_DAYS = REVEAL_DAY + AFTER_DAYS; // = 120

// ---------- 티커 메타 ----------
const TICKER_META = {
  '005930.KS': { name: '삼성전자',   market: 'KOSPI',  sector: '반도체',        file: '005930.KS' },
  '051910.KS': { name: 'LG화학',     market: 'KOSPI',  sector: '화학·배터리',   file: '051910.KS' },
  '000660.KS': { name: 'SK하이닉스', market: 'KOSPI',  sector: '반도체',        file: '000660.KS' },
  '247540.KQ': { name: '에코프로비엠',market: 'KOSDAQ', sector: '배터리소재',    file: '247540.KQ' },
  '011170.KS': { name: '롯데케미칼', market: 'KOSPI',  sector: '석유화학',      file: '011170.KS' },
  'TSLA':      { name: '테슬라',     market: 'NASDAQ', sector: 'EV·자율주행',   file: 'TSLA'      },
  'NVDA':      { name: '엔비디아',   market: 'NASDAQ', sector: 'AI·반도체',     file: 'NVDA'      },
  'BTC-USD':   { name: '비트코인',   market: 'CRYPTO', sector: '가상자산',      file: 'BTC_USD'   },
  '^GSPC':     { name: 'S&P 500',    market: 'NYSE',   sector: '미국 대형주',   file: 'GSPC'      },
  'GSPC2007':  { name: 'S&P 500',    market: 'NYSE',   sector: '미국 대형주',   file: 'GSPC_2007' },
  'KS11':      { name: 'KOSPI',      market: 'KOSPI',  sector: '한국 대형주',   file: 'KS11'      },
  'SSE':       { name: '상하이종합', market: 'SSE',    sector: '중국 시장',     file: 'SSE'       },
  'IXIC':      { name: '나스닥',     market: 'NASDAQ', sector: '기술주 지수',   file: 'IXIC'      },
  'N225':      { name: '니케이 225', market: 'TSE',    sector: '일본 시장',     file: 'N225'      },
  'GME':       { name: '게임스톱',   market: 'NYSE',   sector: '밈주·공매도',   file: 'GME'       },
  'SEEGENE':   { name: '씨젠',       market: 'KOSDAQ', sector: '바이오·진단',   file: 'SEEGENE'   },
  'META':      { name: '메타',       market: 'NASDAQ', sector: '소셜미디어·AI', file: 'META'      },
  '035720.KS': { name: '카카오',     market: 'KOSPI',  sector: '인터넷·플랫폼', file: '035720.KS' },
  '035420.KS': { name: '네이버',     market: 'KOSPI',  sector: '인터넷·플랫폼', file: '035420.KS' },
  '005380.KS': { name: '현대차',     market: 'KOSPI',  sector: 'EV·자동차',     file: '005380.KS' },
  'AAPL':      { name: '애플',       market: 'NASDAQ', sector: '테크·소비자',   file: 'AAPL'      },
  'AMD':       { name: 'AMD',        market: 'NASDAQ', sector: 'AI·반도체',     file: 'AMD'       },
  'GLD':       { name: '금 ETF',     market: 'NYSE',   sector: '원자재·금',     file: 'GLD'       },
  '086520.KQ': { name: '에코프로',   market: 'KOSDAQ', sector: '배터리소재',    file: '086520.KQ' },
  '068270.KS': { name: '셀트리온',   market: 'KOSPI',  sector: '바이오·CMO',    file: '068270.KS' },
};

// 기존 문제가 이미 다루는 구간 (ticker → [{start, end}])
const EXISTING = {
  '005930.KS': [{ s:'2020-09-01', e:'2021-01-31' }, { s:'2019-08-01', e:'2019-12-31' }],
  '051910.KS': [{ s:'2020-11-01', e:'2021-03-31' }],
  '000660.KS': [{ s:'2018-01-02', e:'2018-08-31' }],
  '247540.KQ': [{ s:'2023-09-01', e:'2024-03-31' }],
  '011170.KS': [{ s:'2021-09-01', e:'2022-04-30' }],
  'TSLA':      [{ s:'2021-11-01', e:'2022-09-30' }, { s:'2019-06-01', e:'2020-05-31' }],
  'NVDA':      [{ s:'2022-10-03', e:'2023-04-30' }, { s:'2018-09-01', e:'2019-05-31' }],
  'BTC-USD':   [{ s:'2022-05-01', e:'2022-11-30' }, { s:'2017-05-01', e:'2017-12-31' },
                { s:'2023-10-01', e:'2024-03-31' }, { s:'2018-11-15', e:'2019-07-31' },
                { s:'2020-03-01', e:'2020-07-31' }, { s:'2021-04-01', e:'2021-09-30' }],
  '^GSPC':     [{ s:'2020-03-01', e:'2020-07-31' }, { s:'2023-02-01', e:'2023-07-31' },
                { s:'2018-10-01', e:'2019-06-30' }, { s:'2022-01-03', e:'2022-07-31' }],
  'GSPC2007':  [{ s:'2008-08-01', e:'2009-01-31' }],
  'KS11':      [{ s:'1997-07-01', e:'1998-02-28' }],
  'SSE':       [{ s:'2015-04-01', e:'2015-09-30' }],
  'IXIC':      [{ s:'1999-07-01', e:'2000-01-31' }],
  'N225':      [{ s:'1989-10-01', e:'1990-08-31' }],
  'GME':       [{ s:'2020-11-01', e:'2021-04-30' }],
  'SEEGENE':   [{ s:'2020-01-02', e:'2020-09-30' }],
  'META':      [{ s:'2022-10-01', e:'2023-08-31' }],
  '035720.KS': [{ s:'2021-06-01', e:'2022-01-31' }],
  '035420.KS': [{ s:'2022-10-01', e:'2023-04-30' }],
  '005380.KS': [{ s:'2020-09-01', e:'2021-04-30' }],
  'AAPL':      [{ s:'2018-10-01', e:'2019-04-30' }],
  'AMD':       [{ s:'2022-10-01', e:'2023-06-30' }],
  'GLD':       [{ s:'2020-03-01', e:'2020-06-30' }],
  '086520.KQ': [{ s:'2023-01-02', e:'2023-08-31' }],
  '068270.KS': [],
};

// ---------- 매크로 힌트 (날짜 기반) ----------
function getMacroHints(dateStr) {
  const y = parseInt(dateStr.slice(0, 4));
  const m = parseInt(dateStr.slice(5, 7));
  const ym = y * 100 + m;

  if (ym >= 198601 && ym <= 198812) return [
    { label: '일본 버블', value: '최고조', trend: '부동산·주식 동반 폭등', tone: 'positive' },
    { label: '엔화', value: '엔고 지속', trend: '플라자 합의 후 강세', tone: 'mixed' },
    { label: '닛케이225', value: '연간 +40%', trend: '사상 최고가 갱신 행진', tone: 'positive' },
    { label: '토지가격', value: '전국 폭등', trend: '담보대출 과열·투기 절정', tone: 'negative' },
  ];
  if (ym >= 198901 && ym <= 198912) return [
    { label: '일본 금리', value: '대폭 인상 예고', trend: 'BOJ 버블 억제 시작', tone: 'negative' },
    { label: '닛케이', value: '38,957 고점', trend: '버블 최고점 형성', tone: 'negative' },
    { label: '부동산', value: '도쿄 폭등', trend: '대출 과잉·투기 극단', tone: 'negative' },
    { label: '일본 GDP', value: '4% 성장', trend: '실물과 자산 괴리 극대', tone: 'mixed' },
  ];
  if (ym >= 199001 && ym <= 199312) return [
    { label: '닛케이', value: '급락 중', trend: '버블 붕괴 -60%+', tone: 'negative' },
    { label: '일본 경기', value: '침체 돌입', trend: '잃어버린 10년 시작', tone: 'negative' },
    { label: '부동산', value: '30~50% 하락', trend: '담보가치 폭락·부실 급증', tone: 'negative' },
    { label: '은행권', value: '부실채권 폭증', trend: '금융기관 연쇄 부실', tone: 'negative' },
  ];
  if (ym >= 199401 && ym <= 199606) return [
    { label: '미국 경기', value: '클린턴 호황', trend: '나스닥 IT 성장세', tone: 'positive' },
    { label: '금리', value: '안정적', trend: 'Fed 점진 인상 중', tone: 'mixed' },
    { label: 'S&P500', value: '연간 +20%', trend: '기술주 주도 강세장', tone: 'positive' },
    { label: '인플레이션', value: '2~3%', trend: '저물가·안정 성장', tone: 'positive' },
  ];
  if (ym >= 199607 && ym <= 199706) return [
    { label: '아시아', value: '위기 전야', trend: '태국 바트화 흔들림', tone: 'negative' },
    { label: '한국 경제', value: '경상적자', trend: '외환보유고 고갈', tone: 'negative' },
    { label: '태국 바트', value: '고정환율 위기', trend: '경상적자 지속·외채 급증', tone: 'negative' },
    { label: '한국 외채', value: '1,500억달러', trend: '단기외채 비중 과다', tone: 'negative' },
  ];
  if (ym >= 199707 && ym <= 199812) return [
    { label: 'IMF 외환위기', value: '구제금융', trend: '원화 -50% 이상 절하', tone: 'negative' },
    { label: 'USD/KRW', value: '2000원 돌파', trend: '기업 연쇄 부도', tone: 'negative' },
    { label: '코스피', value: '저점 280', trend: '금융위기 패닉 셀링', tone: 'negative' },
    { label: '기준금리', value: '30% 폭등', trend: 'IMF 고금리 조건 이행', tone: 'negative' },
  ];
  if (ym >= 199901 && ym <= 200003) return [
    { label: '닷컴 붐', value: '과열 극점', trend: '나스닥 PER 100x+', tone: 'negative' },
    { label: '기술주', value: '폭발적 상승', trend: '인터넷 기업 IPO 러시', tone: 'positive' },
    { label: '나스닥', value: '5,000 돌파', trend: '3년간 +500% 상승', tone: 'positive' },
    { label: '인터넷기업', value: 'PER 수백배', trend: '매출 없어도 주가 급등', tone: 'negative' },
  ];
  if (ym >= 200004 && ym <= 200206) return [
    { label: '닷컴버블', value: '붕괴', trend: '나스닥 -78% 하락', tone: 'negative' },
    { label: 'Fed', value: '금리 인하', trend: '경기 침체 대응', tone: 'positive' },
    { label: '나스닥', value: '저점 1,114', trend: '2년간 급락 지속', tone: 'negative' },
    { label: '실업률', value: '6% 상승', trend: 'IT업계 대규모 감원', tone: 'negative' },
  ];
  if (ym >= 200207 && ym <= 200612) return [
    { label: '미국 경기', value: '저금리 성장', trend: '주택 붐 + 소비 확대', tone: 'positive' },
    { label: 'Fed 금리', value: '1%→5.25%', trend: '점진적 정상화', tone: 'mixed' },
    { label: '주택가격', value: '연간 10%+', trend: '서브프라임 대출 폭증', tone: 'negative' },
    { label: '원자재', value: '슈퍼사이클', trend: '중국 수요 주도 강세', tone: 'positive' },
  ];
  if (ym >= 200701 && ym <= 200709) return [
    { label: '서브프라임', value: '균열 시작', trend: '주택시장 버블 경고', tone: 'negative' },
    { label: '시장', value: '사상 최고', trend: '위기 인식 부재', tone: 'negative' },
    { label: '주택담보대출', value: '연체율 상승', trend: '저신용 대출 부실화', tone: 'negative' },
    { label: 'CDO·MBS', value: '신용등급 의심', trend: '구조화상품 리스크 부각', tone: 'negative' },
  ];
  if (ym >= 200710 && ym <= 200903) return [
    { label: '글로벌 금융위기', value: '리먼 파산', trend: '시스템 붕괴 공포', tone: 'negative' },
    { label: 'Fed', value: '제로금리·QE', trend: '긴급 양적완화', tone: 'mixed' },
    { label: 'S&P500', value: '저점 -56%', trend: '13개월 만에 반토막', tone: 'negative' },
    { label: 'VIX', value: '80 이상', trend: '역대 최고 공포 지수', tone: 'negative' },
  ];
  if (ym >= 200904 && ym <= 201206) return [
    { label: 'QE 1·2차', value: '유동성 공급', trend: '위기 후 회복 국면', tone: 'positive' },
    { label: '미국 경기', value: '완만한 회복', trend: '실업률 서서히 하락', tone: 'positive' },
    { label: '금값', value: '1,900달러 고점', trend: '안전자산 선호 강세', tone: 'mixed' },
    { label: '신흥국', value: '자금 유입', trend: '달러 약세·캐리트레이드', tone: 'positive' },
  ];
  if (ym >= 201207 && ym <= 201412) return [
    { label: 'Fed 테이퍼링', value: 'QE 축소', trend: '신흥국 자금 이탈', tone: 'mixed' },
    { label: '미국 경기', value: '안정 성장', trend: 'S&P 강세 지속', tone: 'positive' },
    { label: '달러', value: '강세 전환', trend: '신흥국 통화 압박', tone: 'mixed' },
    { label: 'S&P500', value: '연간 +30%', trend: '버냉키 풋 기대 지속', tone: 'positive' },
  ];
  if (ym >= 201501 && ym <= 201509) return [
    { label: '중국 증시', value: '급락', trend: '상하이 -45% 폭락', tone: 'negative' },
    { label: '위안화', value: '평가절하', trend: '신흥국 불안 확산', tone: 'negative' },
    { label: '원자재', value: '급락 지속', trend: '중국 수요 둔화 공포', tone: 'negative' },
    { label: '코스피', value: '2000 지지', trend: '외국인 이탈 우려', tone: 'negative' },
  ];
  if (ym >= 201510 && ym <= 201609) return [
    { label: 'Fed 첫 인상', value: '0.25%', trend: '9년 만의 금리 인상', tone: 'mixed' },
    { label: '원자재', value: '약세', trend: '유가·광물 급락', tone: 'negative' },
    { label: '달러', value: '강세 지속', trend: '신흥국 자금 이탈', tone: 'negative' },
    { label: '브렉시트', value: '불확실성', trend: '영국 EU 탈퇴 투표', tone: 'negative' },
  ];
  if (ym >= 201610 && ym <= 201709) return [
    { label: '트럼프 효과', value: '감세 기대', trend: '인프라·규제 완화 기대', tone: 'positive' },
    { label: '글로벌 경기', value: '동반 회복', trend: '저물가·성장 동시', tone: 'positive' },
    { label: '다우', value: '2만 돌파', trend: '사상 첫 2만 돌파', tone: 'positive' },
    { label: '반도체', value: '사이클 상승', trend: '메모리 수요 급증', tone: 'positive' },
  ];
  if (ym >= 201710 && ym <= 201801) return [
    { label: '비트코인', value: '2만달러', trend: '암호화폐 투기 열풍', tone: 'positive' },
    { label: 'CME 선물', value: '상장', trend: '기관 참여 확대', tone: 'positive' },
    { label: '알트코인', value: '폭발 상승', trend: '이더리움·리플 수백%', tone: 'positive' },
    { label: '개인투자자', value: '대거 참여', trend: 'FOMO 극단적 과열', tone: 'negative' },
  ];
  if (ym >= 201802 && ym <= 201812) return [
    { label: 'Fed 금리', value: '연 4회 인상', trend: '긴축 가속', tone: 'negative' },
    { label: '미중 무역전쟁', value: '관세 충돌', trend: '성장 둔화 우려', tone: 'negative' },
    { label: '신흥국', value: '통화위기', trend: '터키·아르헨 급락', tone: 'negative' },
    { label: '나스닥', value: '연말 -20%', trend: '기술주 조정 가속', tone: 'negative' },
  ];
  if (ym >= 201901 && ym <= 201912) return [
    { label: 'Fed 피벗', value: '인하 전환', trend: '긴축 종료 기대', tone: 'positive' },
    { label: '미중 협상', value: '1단계 합의', trend: '무역전쟁 완화', tone: 'positive' },
    { label: 'S&P500', value: '연간 +29%', trend: '강세장 재개', tone: 'positive' },
    { label: '코스피', value: '2,000~2,200', trend: '박스권 횡보 지속', tone: 'mixed' },
  ];
  if (ym >= 202001 && ym <= 202003) return [
    { label: 'COVID-19', value: '팬데믹 선언', trend: '전 세계 봉쇄 시작', tone: 'negative' },
    { label: 'Fed', value: '긴급 제로금리', trend: '무제한 QE 선언', tone: 'mixed' },
    { label: 'S&P500', value: '33일 -34%', trend: '역사상 가장 빠른 폭락', tone: 'negative' },
    { label: '원유', value: '마이너스 거래', trend: '저장 공간 부족 초유 사태', tone: 'negative' },
  ];
  if (ym >= 202004 && ym <= 202012) return [
    { label: 'QE·부양책', value: '역대 최대', trend: '유동성 폭발적 공급', tone: 'positive' },
    { label: '기준금리', value: '0.25%', trend: '초저금리·동학개미', tone: 'positive' },
    { label: '코스피', value: '3,000 돌파', trend: '동학개미 순매수 48조', tone: 'positive' },
    { label: '백신', value: '개발 성공', trend: '리오프닝 기대감 급부상', tone: 'positive' },
  ];
  if (ym >= 202101 && ym <= 202112) return [
    { label: '인플레이션', value: '급등 조짐', trend: '공급망 충격·유동성', tone: 'negative' },
    { label: 'QE·저금리', value: '지속', trend: '주식·코인 동반 강세', tone: 'positive' },
    { label: '비트코인', value: '6만달러 ATH', trend: '기관·ETF 자금 유입', tone: 'positive' },
    { label: '코스피', value: '3,316 신고가', trend: '외국인·기관 동반 매수', tone: 'positive' },
  ];
  if (ym >= 202201 && ym <= 202212) return [
    { label: 'Fed 금리', value: '0→4.5%', trend: '40년래 최고속 긴축', tone: 'negative' },
    { label: '인플레이션', value: '9.1%', trend: '경기침체 공포 확산', tone: 'negative' },
    { label: '코스피', value: '2,200 저점', trend: '외국인 대규모 이탈', tone: 'negative' },
    { label: '미국채', value: '역사적 하락', trend: '60/40 포트 동반 하락', tone: 'negative' },
  ];
  if (ym >= 202301 && ym <= 202312) return [
    { label: 'ChatGPT·AI', value: '폭발적 성장', trend: 'AI 투자 붐 시작', tone: 'positive' },
    { label: 'Fed 금리', value: '5.25% 고점', trend: '인상 종료 기대', tone: 'positive' },
    { label: '엔비디아', value: '연간 +240%', trend: 'AI 칩 독점 지위', tone: 'positive' },
    { label: '나스닥', value: '반등 +43%', trend: '기술주 급반등', tone: 'positive' },
  ];
  if (ym >= 202401) return [
    { label: 'AI 인프라', value: '투자 급증', trend: 'NVDA 주도 AI 사이클', tone: 'positive' },
    { label: 'Fed', value: '인하 시작', trend: '연착륙 기대', tone: 'positive' },
    { label: '비트코인', value: '신고가 경신', trend: '현물 ETF 승인·기관 매수', tone: 'positive' },
    { label: '코스피', value: '불안정', trend: '환율·경기 불확실', tone: 'negative' },
  ];
  return [
    { label: '시장', value: '변동성', trend: '추세 불확실', tone: 'mixed' },
    { label: '경기', value: '중립', trend: '특이 이벤트 없음', tone: 'mixed' },
    { label: '금리', value: '보통 수준', trend: '중립 스탠스', tone: 'mixed' },
    { label: '환율', value: '안정적', trend: '특이 변동 없음', tone: 'mixed' },
  ];
}

// ---------- 패턴 감지 ----------
function detectPattern(closes, revealDay) {
  const w = 20;
  const recent  = closes.slice(Math.max(0, revealDay - w), revealDay);
  const earlier = closes.slice(Math.max(0, revealDay - w*2), revealDay - w);
  if (!recent.length || !earlier.length) return 'sideways';
  const rAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const eAvg = earlier.reduce((s, v) => s + v, 0) / earlier.length;
  const chg = (rAvg - eAvg) / eAvg;
  if (chg > 0.20) return 'uptrend';
  if (chg < -0.20) return 'downtrend';
  if (chg > 0.05) return 'breakout';
  if (chg < -0.05) return 'reversal';
  return 'sideways';
}

// ---------- 문제 텍스트 생성 (보통체 · 종목명 제외) ----------
const TEMPLATES = {
  uptrend: [
    (_n, m) => `꾸준히 우상향하며 매수세가 계속 몰리고 있다. ${m}개월 뒤 주가는 어떻게 됐을까?`,
    (_n, m) => `이평선 위에서 강한 상승 흐름을 이어가는 중이다. ${m}개월 후 결과는?`,
    (_n, m) => `정배열 상태에서 거래량까지 늘고 있다. 이 추세, ${m}개월 뒤에도 이어졌을까?`,
    (_n, m) => `연속으로 신고가를 갱신하며 상승 중이다. ${m}개월 뒤 어떻게 됐을까?`,
    (_n, m) => `MA20 위에서 완만하게 우상향하고 있다. ${m}개월 뒤 결과는?`,
  ],
  downtrend: [
    (_n, m) => `연속으로 신저가를 갱신하며 하락 중이다. ${m}개월 뒤 주가는?`,
    (_n, m) => `이평선 아래에서 매도세가 이어지고 있다. ${m}개월 후 결과는?`,
    (_n, m) => `계속 빠지고 있다. 이 하락세, ${m}개월 뒤에 어떻게 됐을까?`,
    (_n, m) => `역배열 상태에서 반등 없이 흘러내리고 있다. ${m}개월 후는?`,
    (_n, m) => `고점 대비 많이 빠진 상태다. 지금부터 ${m}개월, 어떻게 됐을까?`,
  ],
  breakout: [
    (_n, m) => `오랫동안 막혀 있던 저항선을 뚫었다. 이번엔 진짜일까? ${m}개월 후?`,
    (_n, m) => `박스권 상단을 돌파하며 거래량이 터졌다. ${m}개월 뒤 어떻게 됐을까?`,
    (_n, m) => `52주 신고가를 경신하며 돌파에 성공했다. ${m}개월 뒤 결과는?`,
    (_n, m) => `고점 저항을 돌파하는 강한 양봉이 나왔다. ${m}개월 후?`,
    (_n, m) => `중요 저항선을 상향 돌파했다. 추세 전환이 시작된 걸까? ${m}개월 뒤는?`,
  ],
  reversal: [
    (_n, m) => `크게 빠진 후 바닥에서 반등 신호가 나왔다. ${m}개월 뒤 어떻게 됐을까?`,
    (_n, m) => `급락 이후 저점에서 강한 양봉이 나오기 시작했다. ${m}개월 후?`,
    (_n, m) => `하락을 멈추고 바닥을 다지는 것 같다. ${m}개월 뒤 결과는?`,
    (_n, m) => `과매도 구간에서 거래량을 동반한 반등 시도를 하고 있다. ${m}개월 후?`,
    (_n, m) => `긴 하락 후 지지선에서 힘을 받는 모습이다. ${m}개월 뒤 어떻게 됐을까?`,
  ],
  sideways: [
    (_n, m) => `박스권에서 방향을 잡지 못하고 오르내리고 있다. ${m}개월 뒤 어디로 갔을까?`,
    (_n, m) => `일정 범위 안에서만 움직이고 있다. ${m}개월 뒤 탈출에 성공했을까?`,
    (_n, m) => `횡보 구간에서 돌파 시도를 이어가고 있다. ${m}개월 뒤 결과는?`,
    (_n, m) => `추세 없이 박스권을 유지 중이다. ${m}개월 뒤 어떻게 됐을까?`,
    (_n, m) => `눌림목 구간에서 쉬어가고 있다. ${m}개월 후 방향은?`,
  ],
};

function pickQ(pattern, name, months) {
  const list = TEMPLATES[pattern] || TEMPLATES.sideways;
  return list[Math.floor(Math.random() * list.length)](name, months);
}

// ---------- 정답 범주 ----------
function toAnswer(pct) {
  if (pct >= 0.30) return 0; // 급등
  if (pct >= 0.10) return 1; // 상승
  if (pct > -0.10) return 2; // 횡보
  return 3;                  // 하락
}

function answerLabel(ans) {
  return ['급등', '상승', '횡보', '하락'][ans];
}

// ---------- 난이도 ----------
function toDifficulty(pct, pattern) {
  const abs = Math.abs(pct);
  if (abs >= 0.30 && pattern !== 'sideways') return 'easy';
  if (abs >= 0.15) return 'medium';
  return 'hard';
}

// ---------- 설명 문장 ----------
const LESSON_MAP = {
  0: {
    uptrend:   '추세 + 매크로가 같은 방향일 때 가장 강한 상승이 나온다.',
    breakout:  '거래량 동반 돌파는 진짜 신호. 이 패턴은 성공률이 높다.',
    reversal:  '바닥에서 강한 반등 = 사이클 전환 초입. 빠른 대응이 수익 차이를 만든다.',
    downtrend: '하락 추세 중 역배열 돌파는 드물지만 성공 시 큰 수익이 따른다.',
    sideways:  '오랜 박스권 돌파 후 상승은 눌렸던 에너지가 한 번에 풀리는 것.',
  },
  1: {
    uptrend:   '추세는 유지됐지만 기대만큼 크지 않았다. 고점 매수의 위험성을 기억하자.',
    breakout:  '돌파 후 적당한 상승. 기대감은 맞았지만 속도는 예상보다 느렸다.',
    reversal:  '반등은 성공했지만 완전한 추세 전환까지는 시간이 걸렸다.',
    downtrend: '하락 후 반전 성공. 패닉 구간에서 버텼거나 매수했다면 수익이 났다.',
    sideways:  '박스권 상단 돌파 후 천천히 상승. 기다림이 보상받는 패턴.',
  },
  2: {
    uptrend:   '상승 후 숨 고르기. 추세는 살아있지만 단기 모멘텀은 소진됐다.',
    breakout:  '돌파 시도가 무산되고 다시 박스권으로. 가짜 돌파 (페이크아웃)였다.',
    reversal:  '반등 후 다시 지지부진. 진짜 전환인지 확인하려면 더 기다려야 했다.',
    downtrend: '하락이 일시 멈췄지만 추세 전환이라 보기엔 애매한 구간.',
    sideways:  '박스권이 계속됐다. 기다림에 지쳐 손절한 사람들이 가장 많이 나오는 패턴.',
  },
  3: {
    uptrend:   '올랐던 주식이 결국 꺾였다. 추세의 끝을 알아보는 것이 가장 어렵다.',
    breakout:  '돌파처럼 보였지만 실패하고 되돌림. 거래량과 매크로를 항상 같이 봐야 한다.',
    reversal:  '바닥인 줄 알고 들어갔다가 더 빠졌다. 반등 실패 시 손절 기준이 중요하다.',
    downtrend: '하락 추세가 가속됐다. 약세장에서 매수 시도는 항상 위험하다.',
    sideways:  '박스 하단을 이탈하며 하락. 지지선 붕괴 시 빠른 대응이 핵심.',
  },
};

function makeLesson(ans, pattern) {
  return (LESSON_MAP[ans] && LESSON_MAP[ans][pattern]) || '차트 패턴과 매크로를 동시에 확인하는 것이 핵심이다.';
}

function makeExplanation(ans, pctStr, months, pattern) {
  const lbl = answerLabel(ans);
  const verb = {
    reversal: '반등 시도 후', downtrend: '하락 지속하며', breakout: '돌파 이후', uptrend: '상승 추세 이어가며', sideways: '횡보 끝에',
  }[pattern] || '이후';
  return `${verb} ${months}개월 뒤 ${lbl} (${pctStr}).`;
}

function makeOdds(ans, pattern) {
  const odds = {
    uptrend: [
      '강세 추세가 계속될 확률은 55~65%. 매크로가 동행할수록 확률이 오른다.',
      '추세 유지 확률은 있지만, 기대 대비 상승폭이 작을 가능성도 40% 정도.',
      '강세 후 숨 고르기 확률 30~40%. 고점 매수자들의 물량이 부담이 될 수 있다.',
      '강세가 꺾이는 경우는 드물지만, 일어나면 급격히 빠지는 경향이 있다.',
    ],
    downtrend: [
      '하락 추세 반전 성공률은 30~40%. 지지선과 거래량을 같이 봐야 한다.',
      '하락세가 멈추고 소폭 반등할 확률 약 40%. 하지만 추세 전환은 아닐 수 있다.',
      '하락이 일시 멈추는 경우도 있지만 다시 빠질 가능성이 더 높은 구간이다.',
      '하락 추세 가속 확률이 50~60%. 약세장에서 매수는 항상 위험하다.',
    ],
    breakout: [
      '거래량 동반 돌파 성공률은 50~60%. 매크로가 맞아떨어지면 더 높아진다.',
      '돌파 후 상승 확률은 약 50%. 하지만 속도는 예측하기 어렵다.',
      '가짜 돌파(페이크아웃) 확률이 40~50%. 돌파 후 눌림목을 기다리는 전략이 유리하다.',
      '돌파 실패 후 되돌림 확률 약 45%. 박스 상단 저항이 강할수록 조심해야 한다.',
    ],
    reversal: [
      '과매도 반등 성공률은 45~55%. 지지선과 거래량이 반등의 질을 결정한다.',
      '반등 후 추가 상승까지 이어지는 경우는 약 40%. 진짜 전환인지 확인이 필요하다.',
      '단기 반등 후 재하락 확률 약 45%. 섣불리 매수하면 더 빠질 수도 있다.',
      '반등 실패 후 추가 하락 확률 35~45%. 손절선 없이 들어가면 위험하다.',
    ],
    sideways: [
      '박스권 상향 돌파 확률은 약 50%. 방향을 알 수 없는 구간이라 손절선이 중요하다.',
      '상단 돌파 성공 확률은 35~45%. 매크로 호재가 촉매가 될 수 있다.',
      '횡보 지속 확률 40~50%. 특별한 촉매 없이 돌파하기 어려운 구간이다.',
      '하단 이탈 후 하락 확률 약 35%. 지지선 붕괴 시 빠른 대응이 중요하다.',
    ],
  };
  return (odds[pattern] || odds.sideways)[ans];
}

// ---------- CSV 파싱 ----------
function parseCSV(filepath) {
  const text = fs.readFileSync(filepath, 'utf8');
  const lines = text.trim().split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 5) continue;
    rows.push({ date: parts[0].trim(), close: parseFloat(parts[4]) });
  }
  return rows;
}

// 날짜 겹침 검사
function overlaps(date, existing) {
  if (!existing) return false;
  return existing.some(r => date >= r.s && date <= r.e);
}

// 날짜 포맷 변환: '2020-09-01' → '2020년 9월'
function toKoMonth(d) {
  const y = d.slice(0, 4), m = parseInt(d.slice(5, 7));
  return `${y}년 ${m}월`;
}

// ---------- 메인 ----------
let nextId = 36;
const allProblems = [];

for (const [ticker, meta] of Object.entries(TICKER_META)) {
  const csvPath = path.join(DATA_DIR, `${meta.file}.csv`);
  if (!fs.existsSync(csvPath)) { console.warn(`SKIP: ${csvPath}`); continue; }

  const rows = parseCSV(csvPath);
  if (rows.length < CHART_DAYS + 10) { console.warn(`TOO SHORT: ${ticker} (${rows.length})`); continue; }

  const existing = EXISTING[ticker] || [];
  const usable   = rows.length - CHART_DAYS;
  const step     = Math.max(MIN_STEP, Math.floor(usable / MAX_PER_TICKER));

  const generated = [];

  for (let si = 0; si < usable; si += step) {
    const startDate = rows[si].date;

    // 이미 다루는 구간이면 스킵
    if (overlaps(startDate, existing)) continue;

    const closes = rows.slice(si, si + CHART_DAYS).map(r => r.close);
    if (closes.length < CHART_DAYS) continue;
    if (closes.some(v => isNaN(v) || v <= 0)) continue;

    const revealClose = closes[REVEAL_DAY - 1];
    const endClose    = closes[CHART_DAYS - 1];
    const pct         = (endClose - revealClose) / revealClose;

    // 횡보 문제는 25%만 포함 (나머지는 너무 평범)
    if (Math.abs(pct) < MIN_CHANGE && Math.random() > 0.25) continue;

    const months  = Math.round(AFTER_DAYS / 21) || 3;
    const pattern = detectPattern(closes, REVEAL_DAY);
    const answer  = toAnswer(pct);
    const pctStr  = (pct >= 0 ? '+' : '') + (pct * 100).toFixed(0) + '%';
    const endDate = rows[si + CHART_DAYS - 1].date;

    generated.push({
      id:          nextId++,
      market:      meta.market,
      ticker,
      pattern,
      revealDay:   REVEAL_DAY,
      chartDays:   CHART_DAYS,
      difficulty:  toDifficulty(pct, pattern),
      startDate,
      question:    pickQ(pattern, meta.name, months),
      macroHints:  getMacroHints(startDate),
      choices:     getChoices(pattern),
      answer,
      odds:        makeOdds(answer, pattern),
      explanation: makeExplanation(answer, pctStr, months, pattern),
      reveal: {
        title:  `${meta.name} (${ticker})`,
        market: `${meta.market} · ${meta.sector}`,
        period: `${toKoMonth(startDate)} ~ ${toKoMonth(endDate)}`,
        result: `${months}개월 ${answerLabel(answer)} (${pctStr}).`,
        macro:  getMacroHints(startDate).map(h => `${h.label} ${h.value}`).join(', ') + '.',
        lesson: makeLesson(answer, pattern),
      },
    });

    if (generated.length >= MAX_PER_TICKER) break;
  }

  allProblems.push(...generated);
  console.log(`${ticker}: ${generated.length}개 생성`);
}

// ---------- 패턴별 choices ----------
function getChoices(pattern) {
  switch (pattern) {
    case 'breakout':
      return [
        '돌파 성공 → 강한 추세 지속 (+30%+)',
        '돌파 후 점진적 상승 (+10~30%)',
        '가짜 돌파 → 박스권 재진입 (±10%)',
        '돌파 실패 → 되돌림 하락 (-10%+)',
      ];
    case 'reversal':
      return [
        '강한 반등 → 추세 전환 (+30%+)',
        '저점 확인 → 점진적 회복 (+10~30%)',
        '단기 반등 후 재하락 (±10%)',
        '반등 실패 → 추가 급락 (-10%+)',
      ];
    case 'uptrend':
      return [
        '추세 가속 → 신고가 경신 (+30%+)',
        '추세 유지 → 완만한 우상향 (+10~30%)',
        '상승 피로 → 숨 고르기 (±10%)',
        '추세 꺾임 → 조정 국면 (-10%+)',
      ];
    case 'downtrend':
      return [
        '급격한 반전 → 강한 상승 (+30%+)',
        '하락 멈춤 → 반등 회복 (+10~30%)',
        '하락 감속 → 바닥 다지기 (±10%)',
        '하락 가속 → 추가 급락 (-10%+)',
      ];
    case 'sideways':
    default:
      return [
        '박스 상향 돌파 → 급등 (+30%+)',
        '상단 돌파 → 추세 형성 (+10~30%)',
        '박스권 지속 (±10%)',
        '하단 이탈 → 하락 가속 (-10%+)',
      ];
  }
}

// ---------- TypeScript 직렬화 ----------
function esc(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function strProp(k, v) { return `    ${k}: '${esc(v)}'`; }

function serializeProblem(p) {
  const mh = p.macroHints.map(h =>
    `      { label: '${esc(h.label)}', value: '${esc(h.value)}', trend: '${esc(h.trend)}', tone: '${h.tone}' }`
  ).join(',\n');
  const ch = p.choices.map(c => `      '${esc(c)}'`).join(',\n');

  return `  {
    id: ${p.id}, market: '${p.market}', ticker: '${esc(p.ticker)}', pattern: '${p.pattern}',
    revealDay: ${p.revealDay}, chartDays: ${p.chartDays}, difficulty: '${p.difficulty}',
    startDate: '${p.startDate}',
    question: '${esc(p.question)}',
    macroHints: [
${mh},
    ],
    choices: [
${ch},
    ],
    answer: ${p.answer},
    odds: '${esc(p.odds)}',
    explanation: '${esc(p.explanation)}',
    reveal: {
${strProp('title', p.reveal.title)},
${strProp('market', p.reveal.market)},
${strProp('period', p.reveal.period)},
${strProp('result', p.reveal.result)},
${strProp('macro', p.reveal.macro)},
${strProp('lesson', p.reveal.lesson)},
    },
  }`;
}

const ts = `import type { Problem } from '../types';

// 자동 생성 문제 (scripts/generate-problems.js)
// 생성일: ${new Date().toISOString().slice(0, 10)}
// 총 ${allProblems.length}개
export const GENERATED_PROBLEMS: Problem[] = [
${allProblems.map(serializeProblem).join(',\n')}
];
`;

fs.writeFileSync(OUTPUT, ts, 'utf8');
console.log(`\n✅ 총 ${allProblems.length}개 문제 생성 → ${OUTPUT}`);
