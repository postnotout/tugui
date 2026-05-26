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
const MIN_CHANGE = 0.05;    // 최소 |%변화| (1개월 기준 완화)
const REVEAL_DAY = 126;     // 과거 6개월 (≈ 21 거래일 × 6)
const AFTER_DAYS = 21;      // 예측 1개월 (≈ 21 거래일)
const CHART_DAYS = REVEAL_DAY + AFTER_DAYS; // = 147

// 배열에서 n개 무작위 선택
function pickN(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

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

// ── 티커별 역사적 밸류에이션 룩업 (시기별 PER/PBR + 시장 시각) ──────────────
// 각 항목: from/to = 'YYYY-MM', hints = ValuationHint[]
const TICKER_VALUATION = {
  'NVDA': [
    { from:'2017-01', to:'2018-08', hints:[
      { label:'PER', value:'~30배', context:'데이터센터·게이밍 확장, AI 이전 프리미엄', tone:'expensive' },
      { label:'시장 시각', value:'성장주 기대', context:'CUDA 생태계 독점 지위에 강한 기대감', tone:'fair' },
    ]},
    { from:'2018-09', to:'2019-12', hints:[
      { label:'PER', value:'~20~25배', context:'암호화폐 수요 소멸 후 조정, 고점 대비 저평가', tone:'fair' },
      { label:'시장 시각', value:'중립', context:'데이터센터 둔화 우려, 재고 조정 시작', tone:'neutral' },
    ]},
    { from:'2020-01', to:'2022-09', hints:[
      { label:'PER', value:'~50~80배', context:'팬데믹 데이터센터 폭발, 높은 성장 프리미엄', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'GPU 공급 부족·클라우드 수요 지속 상승', tone:'fair' },
    ]},
    { from:'2022-10', to:'2023-04', hints:[
      { label:'PER', value:'~35배', context:'금리 인상 밸류에이션 조정, AI 이전 저점 진입', tone:'fair' },
      { label:'시장 시각', value:'중립', context:'반도체 다운사이클 우려 vs AI 수요 기대 혼재', tone:'neutral' },
    ]},
    { from:'2023-05', to:'2025-12', hints:[
      { label:'PER', value:'~40~60배', context:'ChatGPT 이후 AI 칩 독점 프리미엄, 실적 서프라이즈 반복', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'데이터센터 GPU 수요 사상 최대, 공급 독점 지속', tone:'fair' },
    ]},
  ],
  'TSLA': [
    { from:'2019-01', to:'2020-06', hints:[
      { label:'PER', value:'적자 구간', context:'모델3 생산 위기·적자 지속, P/E 산출 불가', tone:'expensive' },
      { label:'시장 시각', value:'반반', context:'머스크 리스크 vs 전기차 선구자 기대 혼재', tone:'neutral' },
    ]},
    { from:'2020-07', to:'2021-12', hints:[
      { label:'PER', value:'~300~800배', context:'흑자 전환 + 전기차 붐, 역사적 고평가 논란', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'S&P 500 편입, 기관 매수 본격화', tone:'fair' },
    ]},
    { from:'2022-01', to:'2022-12', hints:[
      { label:'PER', value:'~40~60배', context:'금리 인상·머스크 트위터 인수, 멀티플 급조정', tone:'fair' },
      { label:'시장 시각', value:'약세 우위', context:'머스크 집중도 분산 우려, 중국 경쟁 심화', tone:'neutral' },
    ]},
    { from:'2023-01', to:'2025-12', hints:[
      { label:'PER', value:'~60~80배', context:'자율주행·AI 기대감 포함된 성장 프리미엄', tone:'expensive' },
      { label:'시장 시각', value:'중립~강세', context:'FSD 기술 기대 vs 마진 압박 논쟁 지속', tone:'neutral' },
    ]},
  ],
  'AAPL': [
    { from:'2018-01', to:'2019-06', hints:[
      { label:'PER', value:'~15~18배', context:'아이폰 성장 둔화 우려, 서비스 전환 과도기', tone:'fair' },
      { label:'시장 시각', value:'중립', context:'하드웨어 의존에서 서비스 중심 전환 초입', tone:'neutral' },
    ]},
    { from:'2019-07', to:'2021-12', hints:[
      { label:'PER', value:'~25~35배', context:'서비스 매출 급증, 팬데믹 비대면 수혜 고평가', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'버핏 포지션 유지, 시총 3조달러 가시권', tone:'fair' },
    ]},
    { from:'2022-01', to:'2023-06', hints:[
      { label:'PER', value:'~22~27배', context:'금리 인상 압박, 고점 대비 조정 후 재평가', tone:'fair' },
      { label:'시장 시각', value:'중립~강세', context:'서비스 고성장 지속, 빅테크 대비 방어적 평가', tone:'neutral' },
    ]},
    { from:'2023-07', to:'2025-12', hints:[
      { label:'PER', value:'~28~32배', context:'AI 기기 전환 기대 반영, 프리미엄 구간 진입', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'애플 인텔리전스 기대, 생태계 잠금효과 강화', tone:'fair' },
    ]},
  ],
  'META': [
    { from:'2020-01', to:'2021-12', hints:[
      { label:'PER', value:'~20~25배', context:'광고 매출 급증, 팬데믹 비대면 수혜', tone:'fair' },
      { label:'시장 시각', value:'강세 우위', context:'디지털 광고 독점, 월간 활성 사용자 30억 돌파', tone:'fair' },
    ]},
    { from:'2022-01', to:'2022-12', hints:[
      { label:'PER', value:'~10~15배', context:'-74% 폭락 후 빅테크 역대 최저 멀티플 진입', tone:'cheap' },
      { label:'시장 시각', value:'약세 우위', context:'메타버스 투자 의구심, ATT 광고 타격 심각', tone:'neutral' },
    ]},
    { from:'2023-01', to:'2025-12', hints:[
      { label:'PER', value:'~20~25배', context:'효율의 해 수익성 급개선, 정상화 구간 재진입', tone:'fair' },
      { label:'시장 시각', value:'강세 우위', context:'AI 광고 타겟팅 고도화, Reels 수익화 성공', tone:'fair' },
    ]},
  ],
  'AMD': [
    { from:'2019-01', to:'2020-12', hints:[
      { label:'PER', value:'~80~150배', context:'젠 아키텍처 턴어라운드 초입, 높은 성장 프리미엄', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'인텔 점유율 잠식 시작, 데이터센터 진입 성공', tone:'fair' },
    ]},
    { from:'2021-01', to:'2022-09', hints:[
      { label:'PER', value:'~40~60배', context:'자일링스 인수 완료, AI·HPC 수요 급증', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'NVDA와 함께 AI 반도체 투톱 구도 형성', tone:'fair' },
    ]},
    { from:'2022-10', to:'2023-06', hints:[
      { label:'PER', value:'~20~35배', context:'금리 인상·PC 수요 급락, 적정가치 재탐색', tone:'fair' },
      { label:'시장 시각', value:'중립', context:'AI GPU 시장 NVDA 독주, AMD 추격 가능성 의문', tone:'neutral' },
    ]},
    { from:'2023-07', to:'2025-12', hints:[
      { label:'PER', value:'~30~50배', context:'MI300 AI 칩 출시, NVDA 대안으로 기대감 재부각', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'AI 인프라 투자 급증, GPU 대안 수요 확대', tone:'fair' },
    ]},
  ],
  'GME': [
    { from:'2017-01', to:'2020-06', hints:[
      { label:'PER', value:'~5~10배', context:'콘솔 게임 유통 사양 산업, 낮은 멀티플 적용', tone:'cheap' },
      { label:'시장 시각', value:'약세 우위', context:'디지털 다운로드 전환, 오프라인 매장 위기', tone:'neutral' },
    ]},
    { from:'2020-07', to:'2021-02', hints:[
      { label:'공매도 잔고', value:'~140%', context:'유동주식 대비 공매도 비율 역대 최고, 숏스퀴즈 조건', tone:'neutral' },
      { label:'시장 시각', value:'극단적 혼재', context:'레딧 WSB 주도 개인 vs 헤지펀드 전쟁 국면', tone:'neutral' },
    ]},
    { from:'2021-03', to:'2025-12', hints:[
      { label:'PER', value:'적자~적정', context:'밈주 이후 정상화 시도, 비즈니스 모델 전환 중', tone:'neutral' },
      { label:'시장 시각', value:'투기적', context:'로어링 키티 복귀 등 이슈마다 급변동', tone:'neutral' },
    ]},
  ],
  '005930.KS': [
    { from:'2017-01', to:'2018-06', hints:[
      { label:'PER', value:'~8~12배', context:'메모리 슈퍼사이클 이익 급증, 저평가 구간', tone:'cheap' },
      { label:'시장 시각', value:'강세 우위', context:'DRAM 가격 급등, 반도체 글로벌 시총 1위 진입', tone:'fair' },
    ]},
    { from:'2018-07', to:'2019-06', hints:[
      { label:'PER', value:'~10~15배', context:'메모리 가격 하락 사이클 진입, 이익 감소 예상', tone:'fair' },
      { label:'시장 시각', value:'약세 우위', context:'중국 반도체 굴기 우려, 수요 둔화 시작', tone:'neutral' },
    ]},
    { from:'2019-07', to:'2021-12', hints:[
      { label:'PER', value:'~15~20배', context:'이익 회복 사이클, 5G·비대면 수요 구조적 증가', tone:'fair' },
      { label:'시장 시각', value:'중립~강세', context:'동학개미 매수 집중, 외국인 복귀 흐름', tone:'neutral' },
    ]},
    { from:'2022-01', to:'2025-12', hints:[
      { label:'PER', value:'~10~15배', context:'반도체 다운사이클·AI 업사이클 교차 구간', tone:'fair' },
      { label:'시장 시각', value:'중립', context:'HBM 수혜 기대 vs 레거시 재고 부담', tone:'neutral' },
    ]},
  ],
  '000660.KS': [
    { from:'2017-01', to:'2018-06', hints:[
      { label:'PER', value:'~6~8배', context:'DRAM 슈퍼사이클, 사상 최대 이익에도 저평가', tone:'cheap' },
      { label:'시장 시각', value:'강세 우위', context:'메모리 수급 초과 수요, 이익 성장 가속', tone:'fair' },
    ]},
    { from:'2018-07', to:'2020-06', hints:[
      { label:'PER', value:'~15~30배', context:'이익 급감으로 PER 급등, 사이클 저점 탐색 중', tone:'expensive' },
      { label:'시장 시각', value:'약세 우위', context:'DRAM 가격 40%+ 하락, 적자 가시성 증대', tone:'neutral' },
    ]},
    { from:'2020-07', to:'2025-12', hints:[
      { label:'PER', value:'~10~20배', context:'HBM 수혜 핵심 플레이어, AI 메모리 성장 기대', tone:'fair' },
      { label:'시장 시각', value:'중립~강세', context:'HBM 독점 공급, NVDA 핵심 파트너 지위 확보', tone:'fair' },
    ]},
  ],
  '247540.KQ': [
    { from:'2021-01', to:'2022-06', hints:[
      { label:'PER', value:'~100배+', context:'전기차 배터리 소재 성장 프리미엄, 고평가 논란', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'테슬라·GM 공급 계약, 배터리 소재 필수 기업화', tone:'fair' },
    ]},
    { from:'2022-07', to:'2023-08', hints:[
      { label:'PER', value:'~50~200배', context:'이차전지 테마 폭등, 단기 과열 우려 극단적', tone:'expensive' },
      { label:'시장 시각', value:'투기적 강세', context:'코스닥 시총 2위 진입, 개인 집중 매수 최고조', tone:'neutral' },
    ]},
    { from:'2023-09', to:'2025-12', hints:[
      { label:'PER', value:'~20~40배', context:'전기차 성장 둔화로 멀티플 급격 조정 진행', tone:'fair' },
      { label:'시장 시각', value:'약세 우위', context:'배터리 공급과잉 우려, 중국 경쟁사 부상', tone:'neutral' },
    ]},
  ],
  '035720.KS': [
    { from:'2019-01', to:'2020-12', hints:[
      { label:'PER', value:'~30~50배', context:'카카오톡 플랫폼 확장, 높은 성장 프리미엄', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'카카오뱅크·카카오페이 성장, 자회사 IPO 기대', tone:'fair' },
    ]},
    { from:'2021-01', to:'2021-12', hints:[
      { label:'PER', value:'~100배+', context:'자회사 IPO 기대감 최고조, 역대 최고 고평가', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'카카오뱅크 상장 성공, 플랫폼 독점 낙관 극대화', tone:'fair' },
    ]},
    { from:'2022-01', to:'2025-12', hints:[
      { label:'PER', value:'~30~60배', context:'규제 리스크·성장 둔화로 멀티플 급격 조정', tone:'expensive' },
      { label:'시장 시각', value:'약세~중립', context:'플랫폼 규제 강화, SM엔터 인수 부담 논란', tone:'neutral' },
    ]},
  ],
  '035420.KS': [
    { from:'2019-01', to:'2021-06', hints:[
      { label:'PER', value:'~40~80배', context:'광고·커머스 폭발 성장, 플랫폼 독점 프리미엄', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'네이버페이·스마트스토어 성장, 동학개미 선호', tone:'fair' },
    ]},
    { from:'2021-07', to:'2023-06', hints:[
      { label:'PER', value:'~20~35배', context:'성장 둔화·금리 인상 압박으로 멀티플 조정', tone:'fair' },
      { label:'시장 시각', value:'중립', context:'ChatGPT 충격 초기, 자체 LLM 개발 대응 주목', tone:'neutral' },
    ]},
    { from:'2023-07', to:'2025-12', hints:[
      { label:'PER', value:'~20~30배', context:'하이퍼클로바 AI 전략, 적정가치 재평가 구간', tone:'fair' },
      { label:'시장 시각', value:'중립~강세', context:'AI 포털 전환, 라인·웹툰 글로벌 확장 기대', tone:'neutral' },
    ]},
  ],
  '005380.KS': [
    { from:'2018-01', to:'2020-06', hints:[
      { label:'PER', value:'~5~8배', context:'자동차 업종 저평가, 전기차 전환 전 디스카운트', tone:'cheap' },
      { label:'시장 시각', value:'약세 우위', context:'내연기관 피크아웃 우려, 글로벌 완성차 저평가', tone:'neutral' },
    ]},
    { from:'2020-07', to:'2021-12', hints:[
      { label:'PER', value:'~10~15배', context:'전기차 전환 선언, 전통 자동차 대비 멀티플 확대', tone:'fair' },
      { label:'시장 시각', value:'강세 우위', context:'아이오닉 성공, 글로벌 전기차 판매 폭증', tone:'fair' },
    ]},
    { from:'2022-01', to:'2025-12', hints:[
      { label:'PER', value:'~5~10배', context:'금리 인상·전기차 경쟁에도 저평가 유지', tone:'cheap' },
      { label:'시장 시각', value:'중립', context:'전기차 성장 둔화 우려, 내연기관 브릿지 논쟁', tone:'neutral' },
    ]},
  ],
  '051910.KS': [
    { from:'2020-01', to:'2021-06', hints:[
      { label:'PER', value:'~30~50배', context:'배터리 분사 기대감, 화학·배터리 복합 프리미엄', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'테슬라 배터리 공급, LG에너지솔루션 IPO 기대', tone:'fair' },
    ]},
    { from:'2021-07', to:'2025-12', hints:[
      { label:'PER', value:'~15~25배', context:'LG에너지솔루션 분사 후 화학 본업 재평가', tone:'fair' },
      { label:'시장 시각', value:'중립~약세', context:'석유화학 다운사이클, 배터리 경쟁 심화', tone:'neutral' },
    ]},
  ],
  '011170.KS': [
    { from:'2020-01', to:'2021-12', hints:[
      { label:'PER', value:'~8~15배', context:'석유화학 경기 회복, 낮은 멀티플 유지', tone:'cheap' },
      { label:'시장 시각', value:'중립', context:'원자재 가격 상승 수혜, 구조적 성장 제한적', tone:'neutral' },
    ]},
    { from:'2022-01', to:'2025-12', hints:[
      { label:'PER', value:'적자~10배', context:'원가 급등·수요 둔화로 수익성 악화 심각', tone:'neutral' },
      { label:'시장 시각', value:'약세 우위', context:'석유화학 공급과잉, 중국 저가 공세', tone:'neutral' },
    ]},
  ],
  '086520.KQ': [
    { from:'2022-01', to:'2023-08', hints:[
      { label:'PER', value:'~200~500배', context:'이차전지 테마 광풍, 극단적 고평가 거품 논란', tone:'expensive' },
      { label:'시장 시각', value:'투기적 강세', context:'코스닥 시총 1위 진입, 개인 집중 매수 최고조', tone:'neutral' },
    ]},
    { from:'2023-09', to:'2025-12', hints:[
      { label:'PER', value:'~30~80배', context:'전기차 성장 둔화로 멀티플 급조정 진행 중', tone:'expensive' },
      { label:'시장 시각', value:'약세 우위', context:'배터리 공급과잉 우려, 버블 해소 과정', tone:'neutral' },
    ]},
  ],
  '068270.KS': [
    { from:'2020-01', to:'2021-06', hints:[
      { label:'PER', value:'~50~80배', context:'코로나 백신·치료제 기대감, 바이오 버블 동승', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'바이오시밀러 글로벌 매출 급성장', tone:'fair' },
    ]},
    { from:'2021-07', to:'2025-12', hints:[
      { label:'PER', value:'~20~40배', context:'바이오시밀러 경쟁 심화, 합병 이슈 소화 중', tone:'fair' },
      { label:'시장 시각', value:'중립', context:'해외 매출 확대 vs 바이오시밀러 가격 경쟁', tone:'neutral' },
    ]},
  ],
  'BTC-USD': [
    { from:'2017-01', to:'2018-01', hints:[
      { label:'시총', value:'~3천억달러', context:'ICO 붐·개인 투기 과열, 역대 최초 2만달러 돌파', tone:'expensive' },
      { label:'시장 시각', value:'투기 극단', context:'가족·지인까지 진입, 카페에서 비트코인 대화', tone:'neutral' },
    ]},
    { from:'2018-02', to:'2020-02', hints:[
      { label:'Mayer Multiple', value:'0.5~0.8배', context:'200일 이평 대비 역사적 저평가 구간', tone:'cheap' },
      { label:'시장 시각', value:'약세 우위', context:'ICO 사기 폭로, 규제 공포로 기관 외면 지속', tone:'neutral' },
    ]},
    { from:'2020-03', to:'2021-11', hints:[
      { label:'Mayer Multiple', value:'2~4배', context:'기관 매수·테슬라 보유 선언, 역사적 고평가', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'마이크로스트래티지·테슬라 보유, 제도권 자산화', tone:'fair' },
    ]},
    { from:'2021-12', to:'2023-01', hints:[
      { label:'Mayer Multiple', value:'0.4~0.8배', context:'FTX 파산·금리 인상 복합 충격, 역대 두 번째 저점', tone:'cheap' },
      { label:'시장 시각', value:'극단적 약세', context:'FTX·루나 연쇄 사기, 신뢰 붕괴·규제 강화 가속', tone:'neutral' },
    ]},
    { from:'2023-02', to:'2025-12', hints:[
      { label:'현물 ETF', value:'승인 진행', context:'블랙록·피델리티 ETF 승인, 기관 자금 본격 유입', tone:'fair' },
      { label:'시장 시각', value:'강세 우위', context:'반감기(2024.04) + ETF 수요, 제도권 편입 가속', tone:'fair' },
    ]},
  ],
  '^GSPC': [
    { from:'1994-01', to:'1999-12', hints:[
      { label:'S&P500 PER', value:'~20~30배', context:'닷컴 버블 팽창, 역대 평균(~16배) 크게 초과', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'인터넷 혁명 기대감, 이익 없는 기업도 수백억 시총', tone:'neutral' },
    ]},
    { from:'2000-01', to:'2002-12', hints:[
      { label:'S&P500 PER', value:'~25~35배', context:'버블 붕괴에도 이익 급감으로 PER 여전히 높음', tone:'expensive' },
      { label:'시장 시각', value:'극단적 약세', context:'나스닥 -78%, IT버블 청산 과정 진행 중', tone:'neutral' },
    ]},
    { from:'2003-01', to:'2007-09', hints:[
      { label:'S&P500 PER', value:'~15~18배', context:'경기 회복기, 역대 평균 수준의 적정 밸류에이션', tone:'fair' },
      { label:'시장 시각', value:'강세 우위', context:'저금리·신용 팽창, 주택 버블 동반 강세장', tone:'neutral' },
    ]},
    { from:'2007-10', to:'2009-06', hints:[
      { label:'S&P500 PER', value:'이익 급감 왜곡', context:'리먼 위기로 이익 붕괴, PER 정상적 해석 불가', tone:'neutral' },
      { label:'시장 시각', value:'극단적 약세', context:'VIX 80+, 패닉 셀링, 시스템 붕괴 공포', tone:'neutral' },
    ]},
    { from:'2009-07', to:'2019-12', hints:[
      { label:'Shiller CAPE', value:'~20~30배', context:'역대 평균(~17배) 초과하지만 저금리로 정당화', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'Fed 지원 하의 강세장, 11년 불마켓', tone:'fair' },
    ]},
    { from:'2020-01', to:'2020-03', hints:[
      { label:'S&P500 PER', value:'~20배→급락', context:'팬데믹 충격 -34%, 고점에서 급격한 밸류 압축', tone:'neutral' },
      { label:'시장 시각', value:'극단적 공포', context:'VIX 80 이상, 역사상 가장 빠른 20% 폭락', tone:'neutral' },
    ]},
    { from:'2020-04', to:'2021-12', hints:[
      { label:'Shiller CAPE', value:'~30~38배', context:'무제한 QE·제로금리, 역대 2위 고평가 수준', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'Fed 풋, 재정부양 5조달러, FOMO 매수 극대화', tone:'neutral' },
    ]},
    { from:'2022-01', to:'2022-12', hints:[
      { label:'S&P500 PER', value:'~17~19배', context:'금리 인상으로 멀티플 압축, 역대 평균 수준 회귀', tone:'fair' },
      { label:'시장 시각', value:'약세 우위', context:'40년래 최고 인플레 + 금리 쇼크, 침체 공포', tone:'neutral' },
    ]},
    { from:'2023-01', to:'2025-12', hints:[
      { label:'S&P500 PER', value:'~20~22배', context:'AI 기대감·연착륙 낙관론, 평균 위 고평가', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'Magnificent 7 주도, AI 수혜 집중', tone:'fair' },
    ]},
  ],
  'GSPC2007': [
    { from:'2007-10', to:'2009-06', hints:[
      { label:'S&P500 PER', value:'이익 붕괴 왜곡', context:'금융위기 이익 급감, PER 정상적 해석 불가', tone:'neutral' },
      { label:'시장 시각', value:'극단적 약세', context:'리먼 파산·베어스턴스 구제, 공황 수준 패닉', tone:'neutral' },
    ]},
  ],
  'KS11': [
    { from:'1997-07', to:'1998-12', hints:[
      { label:'코스피 PER', value:'~3~5배', context:'IMF 위기 폭락, 극단적 저평가 역사적 저점', tone:'cheap' },
      { label:'시장 시각', value:'극단적 공포', context:'원화 -50% 절하, 30% 고금리, 기업 연쇄 부도', tone:'neutral' },
    ]},
    { from:'2020-01', to:'2020-03', hints:[
      { label:'코스피 PER', value:'~7~10배', context:'팬데믹 폭락, 글로벌 저점 수준 저평가', tone:'cheap' },
      { label:'시장 시각', value:'극단적 공포', context:'외국인 대규모 이탈, 동학개미 역매수 시작', tone:'neutral' },
    ]},
    { from:'2020-04', to:'2021-12', hints:[
      { label:'코스피 PER', value:'~12~15배', context:'동학개미 매수 + QE, 역대 최고가 3316 경신', tone:'fair' },
      { label:'시장 시각', value:'강세 우위', context:'개인투자자 48조 순매수, 반도체·전기차 집중', tone:'fair' },
    ]},
    { from:'2022-01', to:'2025-12', hints:[
      { label:'코스피 PER', value:'~8~11배', context:'외국인 이탈·환율 압박, 선진국 대비 만성 저평가', tone:'cheap' },
      { label:'시장 시각', value:'중립~약세', context:'코리아 디스카운트 지속, 밸류업 정책 기대 혼재', tone:'neutral' },
    ]},
  ],
  'SSE': [
    { from:'2014-07', to:'2015-06', hints:[
      { label:'상하이 PER', value:'~50~80배', context:'레버리지 개인 투자 광풍, 극단적 버블 구간', tone:'expensive' },
      { label:'시장 시각', value:'투기 극단', context:'반년 만에 +150%, 신용·레버리지 매수 절정', tone:'neutral' },
    ]},
    { from:'2015-07', to:'2025-12', hints:[
      { label:'상하이 PER', value:'~10~15배', context:'버블 붕괴 후 정상화, 신흥국 대비 적정 수준', tone:'fair' },
      { label:'시장 시각', value:'약세~중립', context:'경기 부양 기대 vs 부동산 위기·디플레 우려', tone:'neutral' },
    ]},
  ],
  'IXIC': [
    { from:'1999-01', to:'2000-03', hints:[
      { label:'나스닥 PER', value:'~150~200배+', context:'닷컴 버블 최고조, 이익 없는 기업 수백억 시총', tone:'expensive' },
      { label:'시장 시각', value:'투기 극단', context:'IPO 당일 +300%, 인터넷 기업이면 무조건 매수', tone:'neutral' },
    ]},
    { from:'2000-04', to:'2002-12', hints:[
      { label:'나스닥 PER', value:'이익 붕괴 왜곡', context:'-78% 폭락, 이익 급감으로 PER 왜곡 극심', tone:'neutral' },
      { label:'시장 시각', value:'극단적 약세', context:'닷컴 기업 대량 파산, IT업계 대규모 감원', tone:'neutral' },
    ]},
    { from:'2003-01', to:'2025-12', hints:[
      { label:'나스닥 PER', value:'~25~50배', context:'기술주 성장 프리미엄, 평균 이상 고평가 구간', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'빅테크 독과점, AI·클라우드 성장 기대 지속', tone:'fair' },
    ]},
  ],
  'N225': [
    { from:'1989-01', to:'1989-12', hints:[
      { label:'닛케이 PER', value:'~60~70배', context:'일본 버블 최고조, 선진국 역대 최고 과열 기록', tone:'expensive' },
      { label:'시장 시각', value:'투기 극단', context:'부동산+주식 동반 폭등, 도쿄 땅값으로 미국 전체 살 수 있다는 얘기', tone:'neutral' },
    ]},
    { from:'1990-01', to:'1993-12', hints:[
      { label:'닛케이 PER', value:'~30~50배(이익 급감)', context:'버블 붕괴 -60%, 이익 감소로 PER 여전히 높음', tone:'expensive' },
      { label:'시장 시각', value:'극단적 약세', context:'은행 부실채권 폭증, 잃어버린 10년 시작', tone:'neutral' },
    ]},
    { from:'1994-01', to:'2019-12', hints:[
      { label:'닛케이 PER', value:'~15~25배', context:'장기 저성장·디플레 구간, 적정~고평가 혼재', tone:'fair' },
      { label:'시장 시각', value:'중립', context:'아베노믹스 부양 vs 구조적 성장 한계', tone:'neutral' },
    ]},
    { from:'2020-01', to:'2025-12', hints:[
      { label:'닛케이 PER', value:'~15~20배', context:'엔저 효과·버핏 매수, 34년 만의 신고가 도전', tone:'fair' },
      { label:'시장 시각', value:'중립~강세', context:'엔화 약세로 수출 기업 실적 개선, 기업 지배구조 개선', tone:'fair' },
    ]},
  ],
  'GLD': [
    { from:'2008-01', to:'2011-12', hints:[
      { label:'금/S&P 비율', value:'~0.8~1.2배', context:'금융위기 안전자산 선호, 금값 사상 최고 근접', tone:'expensive' },
      { label:'시장 시각', value:'강세 우위', context:'달러 신뢰 약화·인플레 우려로 금 수요 급증', tone:'fair' },
    ]},
    { from:'2012-01', to:'2019-12', hints:[
      { label:'금/S&P 비율', value:'~0.3~0.5배', context:'강달러·위험자산 선호로 금 상대적 약세', tone:'fair' },
      { label:'시장 시각', value:'중립~약세', context:'주식 강세장에서 안전자산 필요성 감소', tone:'neutral' },
    ]},
    { from:'2020-01', to:'2025-12', hints:[
      { label:'금/S&P 비율', value:'~0.5~0.7배', context:'팬데믹·인플레 헤지 수요, 중앙은행 매수 급증', tone:'fair' },
      { label:'시장 시각', value:'강세 우위', context:'달러 신뢰 약화·지정학 리스크, 안전자산 수요 지속', tone:'fair' },
    ]},
  ],
  'SEEGENE': [
    { from:'2020-01', to:'2020-12', hints:[
      { label:'PER', value:'급반등(특수)', context:'코로나 진단키트 독점 수혜, 이익 수백% 폭증', tone:'fair' },
      { label:'시장 시각', value:'강세 우위', context:'PCR 진단키트 세계 수출 1위, 전량 선주문 완판', tone:'fair' },
    ]},
    { from:'2021-01', to:'2025-12', hints:[
      { label:'PER', value:'~10~30배', context:'코로나 특수 소멸, 기저효과로 이익 급감', tone:'fair' },
      { label:'시장 시각', value:'약세 우위', context:'포스트 코로나 매출 급감, 신사업 성과 미진', tone:'neutral' },
    ]},
  ],
};

function getValuationHints(ticker, startDate) {
  const ym = startDate.slice(0, 7); // 'YYYY-MM'
  const periods = TICKER_VALUATION[ticker];
  if (!periods || !periods.length) return [];
  const match = periods.find(p => ym >= p.from && ym <= p.to);
  return match ? match.hints : [];
}

// 기존 문제가 이미 다루는 구간 (ticker → [{start, end}])
const EXISTING = {
  '005930.KS': [{ s:'2020-09-01', e:'2021-01-31' }, { s:'2019-08-01', e:'2019-12-31' },
                { s:'2017-04-01', e:'2017-11-30' }],
  '051910.KS': [{ s:'2020-11-01', e:'2021-03-31' }, { s:'2020-08-01', e:'2021-01-31' }],
  '000660.KS': [{ s:'2018-01-02', e:'2018-08-31' }, { s:'2023-05-01', e:'2023-11-30' }],
  '247540.KQ': [{ s:'2023-09-01', e:'2024-03-31' }],
  '011170.KS': [{ s:'2021-09-01', e:'2022-04-30' }],
  'TSLA':      [{ s:'2021-11-01', e:'2022-09-30' }, { s:'2019-06-01', e:'2020-05-31' },
                { s:'2020-07-01', e:'2020-12-31' }],
  'NVDA':      [{ s:'2022-10-03', e:'2023-04-30' }, { s:'2018-09-01', e:'2019-05-31' },
                { s:'2023-05-01', e:'2023-11-30' }],
  'BTC-USD':   [{ s:'2022-05-01', e:'2022-11-30' }, { s:'2017-05-01', e:'2017-12-31' },
                { s:'2023-10-01', e:'2024-03-31' }, { s:'2018-11-15', e:'2019-07-31' },
                { s:'2020-03-01', e:'2020-07-31' }, { s:'2021-04-01', e:'2021-09-30' },
                { s:'2020-05-01', e:'2020-09-30' }, { s:'2024-01-01', e:'2024-05-31' }],
  '^GSPC':     [{ s:'2020-03-01', e:'2020-07-31' }, { s:'2023-02-01', e:'2023-07-31' },
                { s:'2018-10-01', e:'2019-06-30' }, { s:'2022-01-03', e:'2022-07-31' },
                { s:'2020-03-01', e:'2020-09-30' }, { s:'2023-01-01', e:'2023-08-31' }],
  'GSPC2007':  [{ s:'2008-08-01', e:'2009-01-31' }],
  'KS11':      [{ s:'1997-07-01', e:'1998-02-28' }],
  'SSE':       [{ s:'2015-04-01', e:'2015-09-30' }],
  'IXIC':      [{ s:'1999-07-01', e:'2000-01-31' }],
  'N225':      [{ s:'1989-10-01', e:'1990-08-31' }],
  'GME':       [{ s:'2020-11-01', e:'2021-04-30' }],
  'SEEGENE':   [{ s:'2020-01-02', e:'2020-09-30' }],
  'META':      [{ s:'2022-10-01', e:'2023-08-31' }, { s:'2022-11-01', e:'2023-06-30' }],
  '035720.KS': [{ s:'2021-06-01', e:'2022-01-31' }, { s:'2021-06-01', e:'2022-01-31' }],
  '035420.KS': [{ s:'2022-10-01', e:'2023-04-30' }, { s:'2020-04-01', e:'2020-11-30' }],
  '005380.KS': [{ s:'2020-09-01', e:'2021-04-30' }],
  'AAPL':      [{ s:'2018-10-01', e:'2019-04-30' }, { s:'2019-01-01', e:'2019-08-31' },
                { s:'2020-06-01', e:'2020-11-30' }],
  'AMD':       [{ s:'2022-10-01', e:'2023-06-30' }, { s:'2019-06-01', e:'2019-12-31' },
                { s:'2023-01-01', e:'2023-08-31' }],
  'GLD':       [{ s:'2020-03-01', e:'2020-06-30' }, { s:'2020-06-01', e:'2020-11-30' }],
  '086520.KQ': [{ s:'2023-01-02', e:'2023-08-31' }],
  '068270.KS': [{ s:'2020-02-01', e:'2020-09-30' }],
};

// ---------- 매크로 힌트 (날짜 기반 — 풀에서 4개 무작위 선택) ----------
function getMacroHints(dateStr) {
  const y = parseInt(dateStr.slice(0, 4));
  const m = parseInt(dateStr.slice(5, 7));
  const ym = y * 100 + m;

  if (ym >= 198601 && ym <= 198812) return pickN([
    { label: '일본 버블', value: '최고조', trend: '부동산·주식 동반 폭등', tone: 'positive' },
    { label: '엔화', value: '엔고 지속', trend: '플라자 합의 후 강세', tone: 'mixed' },
    { label: '닛케이225', value: '연간 +40%', trend: '사상 최고가 갱신 행진', tone: 'positive' },
    { label: '토지가격', value: '전국 폭등', trend: '담보대출 과열·투기 절정', tone: 'negative' },
    { label: '기업 부채', value: '급증', trend: '은행 대출로 주식·부동산 매입', tone: 'negative' },
    { label: '경제성장률', value: '4~5%', trend: '실물과 자산 괴리 확대', tone: 'mixed' },
  ], 4);
  if (ym >= 198901 && ym <= 198912) return pickN([
    { label: '일본 금리', value: '대폭 인상 예고', trend: 'BOJ 버블 억제 시작', tone: 'negative' },
    { label: '닛케이', value: '38,957 고점', trend: '버블 최고점 형성', tone: 'negative' },
    { label: '부동산', value: '도쿄 폭등', trend: '대출 과잉·투기 극단', tone: 'negative' },
    { label: '일본 GDP', value: '4% 성장', trend: '실물과 자산 괴리 극대', tone: 'mixed' },
    { label: 'BOJ 정책', value: '긴축 전환', trend: '6% 기준금리로 인상', tone: 'negative' },
    { label: '외국인', value: '순매도 전환', trend: '고점 인식·차익실현', tone: 'negative' },
  ], 4);
  if (ym >= 199001 && ym <= 199312) return pickN([
    { label: '닛케이', value: '급락 중', trend: '버블 붕괴 -60%+', tone: 'negative' },
    { label: '일본 경기', value: '침체 돌입', trend: '잃어버린 10년 시작', tone: 'negative' },
    { label: '부동산', value: '30~50% 하락', trend: '담보가치 폭락·부실 급증', tone: 'negative' },
    { label: '은행권', value: '부실채권 폭증', trend: '금융기관 연쇄 부실', tone: 'negative' },
    { label: '기업 도산', value: '급증', trend: '레버리지 청산 압박', tone: 'negative' },
    { label: '소비', value: '급감', trend: '자산효과 역전·긴축 심리', tone: 'negative' },
  ], 4);
  if (ym >= 199401 && ym <= 199606) return pickN([
    { label: '미국 경기', value: '클린턴 호황', trend: '나스닥 IT 성장세', tone: 'positive' },
    { label: '금리', value: '안정적', trend: 'Fed 점진 인상 중', tone: 'mixed' },
    { label: 'S&P500', value: '연간 +20%', trend: '기술주 주도 강세장', tone: 'positive' },
    { label: '인플레이션', value: '2~3%', trend: '저물가·안정 성장', tone: 'positive' },
    { label: '실업률', value: '5.4%', trend: '완전고용 근접', tone: 'positive' },
    { label: '달러', value: '안정', trend: '글로벌 기축통화 지위 강화', tone: 'positive' },
  ], 4);
  if (ym >= 199607 && ym <= 199706) return pickN([
    { label: '아시아', value: '위기 전야', trend: '태국 바트화 흔들림', tone: 'negative' },
    { label: '한국 경제', value: '경상적자', trend: '외환보유고 고갈', tone: 'negative' },
    { label: '태국 바트', value: '고정환율 위기', trend: '경상적자 지속·외채 급증', tone: 'negative' },
    { label: '한국 외채', value: '1,500억달러', trend: '단기외채 비중 과다', tone: 'negative' },
    { label: '재벌 부채비율', value: '400%+', trend: '과다 레버리지로 이자 감당 한계', tone: 'negative' },
    { label: '환율', value: '900원대', trend: '고평가된 원화, 경쟁력 약화', tone: 'negative' },
  ], 4);
  if (ym >= 199707 && ym <= 199812) return pickN([
    { label: 'IMF 외환위기', value: '구제금융', trend: '원화 -50% 이상 절하', tone: 'negative' },
    { label: 'USD/KRW', value: '2000원 돌파', trend: '기업 연쇄 부도', tone: 'negative' },
    { label: '코스피', value: '저점 280', trend: '금융위기 패닉 셀링', tone: 'negative' },
    { label: '기준금리', value: '30% 폭등', trend: 'IMF 고금리 조건 이행', tone: 'negative' },
    { label: '기업 부도', value: '연쇄 발생', trend: '대기업 부채비율 400% 파국', tone: 'negative' },
    { label: '실업률', value: '7~9%', trend: '대규모 구조조정 가속', tone: 'negative' },
  ], 4);
  if (ym >= 199901 && ym <= 200003) return pickN([
    { label: '닷컴 붐', value: '과열 극점', trend: '나스닥 PER 100x+', tone: 'negative' },
    { label: '기술주', value: '폭발적 상승', trend: '인터넷 기업 IPO 러시', tone: 'positive' },
    { label: '나스닥', value: '5,000 돌파', trend: '3년간 +500% 상승', tone: 'positive' },
    { label: '인터넷기업', value: 'PER 수백배', trend: '매출 없어도 주가 급등', tone: 'negative' },
    { label: 'Fed 금리', value: '5%대', trend: '과열 억제 인상 시도', tone: 'mixed' },
    { label: '개인투자자', value: 'IPO 청약 폭주', trend: 'FOMO 심리 극대화', tone: 'negative' },
  ], 4);
  if (ym >= 200004 && ym <= 200206) return pickN([
    { label: '닷컴버블', value: '붕괴', trend: '나스닥 -78% 하락', tone: 'negative' },
    { label: 'Fed', value: '금리 인하', trend: '경기 침체 대응', tone: 'positive' },
    { label: '나스닥', value: '저점 1,114', trend: '2년간 급락 지속', tone: 'negative' },
    { label: '실업률', value: '6% 상승', trend: 'IT업계 대규모 감원', tone: 'negative' },
    { label: '9·11 테러', value: '경기 충격', trend: '소비·투자 심리 급랭', tone: 'negative' },
    { label: '기업 회계분식', value: '엔론·월드컴', trend: '기업 신뢰 붕괴', tone: 'negative' },
  ], 4);
  if (ym >= 200207 && ym <= 200612) return pickN([
    { label: '미국 경기', value: '저금리 성장', trend: '주택 붐 + 소비 확대', tone: 'positive' },
    { label: 'Fed 금리', value: '1%→5.25%', trend: '점진적 정상화', tone: 'mixed' },
    { label: '주택가격', value: '연간 10%+', trend: '서브프라임 대출 폭증', tone: 'negative' },
    { label: '원자재', value: '슈퍼사이클', trend: '중국 수요 주도 강세', tone: 'positive' },
    { label: '중국 경제', value: '연 10% 성장', trend: 'WTO 가입 후 수출 폭발', tone: 'positive' },
    { label: '신용팽창', value: '역대급', trend: '파생상품·레버리지 확대', tone: 'negative' },
  ], 4);
  if (ym >= 200701 && ym <= 200709) return pickN([
    { label: '서브프라임', value: '균열 시작', trend: '주택시장 버블 경고', tone: 'negative' },
    { label: '시장', value: '사상 최고', trend: '위기 인식 부재', tone: 'negative' },
    { label: '주택담보대출', value: '연체율 상승', trend: '저신용 대출 부실화', tone: 'negative' },
    { label: 'CDO·MBS', value: '신용등급 의심', trend: '구조화상품 리스크 부각', tone: 'negative' },
    { label: '유가', value: '100달러 근접', trend: '원자재 과열 동반', tone: 'negative' },
    { label: '달러', value: '약세 지속', trend: '경상적자·재정적자 쌍둥이', tone: 'negative' },
  ], 4);
  if (ym >= 200710 && ym <= 200903) return pickN([
    { label: '글로벌 금융위기', value: '리먼 파산', trend: '시스템 붕괴 공포', tone: 'negative' },
    { label: 'Fed', value: '제로금리·QE', trend: '긴급 양적완화', tone: 'mixed' },
    { label: 'S&P500', value: '저점 -56%', trend: '13개월 만에 반토막', tone: 'negative' },
    { label: 'VIX', value: '80 이상', trend: '역대 최고 공포 지수', tone: 'negative' },
    { label: '신용경색', value: '금융 마비', trend: '인터뱅크 대출 정지', tone: 'negative' },
    { label: '실업률', value: '10% 급등', trend: '900만명 일자리 소멸', tone: 'negative' },
  ], 4);
  if (ym >= 200904 && ym <= 201206) return pickN([
    { label: 'QE 1·2차', value: '유동성 공급', trend: '위기 후 회복 국면', tone: 'positive' },
    { label: '미국 경기', value: '완만한 회복', trend: '실업률 서서히 하락', tone: 'positive' },
    { label: '금값', value: '1,900달러 고점', trend: '안전자산 선호 강세', tone: 'mixed' },
    { label: '신흥국', value: '자금 유입', trend: '달러 약세·캐리트레이드', tone: 'positive' },
    { label: '유로존 위기', value: '그리스 구제금융', trend: '유럽 채무위기 불안', tone: 'negative' },
    { label: '기업 실적', value: '빠른 회복', trend: '비용 절감 + 수요 반등', tone: 'positive' },
  ], 4);
  if (ym >= 201207 && ym <= 201412) return pickN([
    { label: 'Fed 테이퍼링', value: 'QE 축소', trend: '신흥국 자금 이탈', tone: 'mixed' },
    { label: '미국 경기', value: '안정 성장', trend: 'S&P 강세 지속', tone: 'positive' },
    { label: '달러', value: '강세 전환', trend: '신흥국 통화 압박', tone: 'mixed' },
    { label: 'S&P500', value: '연간 +30%', trend: '버냉키 풋 기대 지속', tone: 'positive' },
    { label: '실업률', value: '6%대', trend: '고용 회복 지속', tone: 'positive' },
    { label: '중국 성장', value: '7%대', trend: '신창타이 성장 둔화 시작', tone: 'mixed' },
  ], 4);
  if (ym >= 201501 && ym <= 201509) return pickN([
    { label: '중국 증시', value: '급락', trend: '상하이 -45% 폭락', tone: 'negative' },
    { label: '위안화', value: '평가절하', trend: '신흥국 불안 확산', tone: 'negative' },
    { label: '원자재', value: '급락 지속', trend: '중국 수요 둔화 공포', tone: 'negative' },
    { label: '코스피', value: '2000 지지', trend: '외국인 이탈 우려', tone: 'negative' },
    { label: '그리스', value: '디폴트 위기', trend: '유로존 이탈 가능성', tone: 'negative' },
    { label: '유가', value: '50달러대', trend: '공급과잉·수요 둔화', tone: 'negative' },
  ], 4);
  if (ym >= 201510 && ym <= 201609) return pickN([
    { label: 'Fed 첫 인상', value: '0.25%', trend: '9년 만의 금리 인상', tone: 'mixed' },
    { label: '원자재', value: '약세', trend: '유가·광물 급락', tone: 'negative' },
    { label: '달러', value: '강세 지속', trend: '신흥국 자금 이탈', tone: 'negative' },
    { label: '브렉시트', value: '불확실성', trend: '영국 EU 탈퇴 투표', tone: 'negative' },
    { label: '중국 성장', value: '6.5%', trend: '위안화 절하 압박 지속', tone: 'negative' },
    { label: '기업 실적', value: '성장 정체', trend: '강달러로 수출 기업 타격', tone: 'negative' },
  ], 4);
  if (ym >= 201610 && ym <= 201709) return pickN([
    { label: '트럼프 효과', value: '감세 기대', trend: '인프라·규제 완화 기대', tone: 'positive' },
    { label: '글로벌 경기', value: '동반 회복', trend: '저물가·성장 동시', tone: 'positive' },
    { label: '다우', value: '2만 돌파', trend: '사상 첫 2만 돌파', tone: 'positive' },
    { label: '반도체', value: '사이클 상승', trend: '메모리 수요 급증', tone: 'positive' },
    { label: '달러', value: '강세', trend: '트럼프 랠리 지속', tone: 'positive' },
    { label: '실업률', value: '4.4%', trend: '완전고용 수준', tone: 'positive' },
  ], 4);
  if (ym >= 201710 && ym <= 201801) return pickN([
    { label: '비트코인', value: '2만달러', trend: '암호화폐 투기 열풍', tone: 'positive' },
    { label: 'CME 선물', value: '상장', trend: '기관 참여 확대', tone: 'positive' },
    { label: '알트코인', value: '폭발 상승', trend: '이더리움·리플 수백%', tone: 'positive' },
    { label: '개인투자자', value: '대거 참여', trend: 'FOMO 극단적 과열', tone: 'negative' },
    { label: '미국 감세', value: '법인세 인하', trend: '실적 개선 기대감', tone: 'positive' },
    { label: '가상화폐 규제', value: '논의 시작', trend: '각국 규제 우려 증가', tone: 'negative' },
  ], 4);
  if (ym >= 201802 && ym <= 201812) return pickN([
    { label: 'Fed 금리', value: '연 4회 인상', trend: '긴축 가속', tone: 'negative' },
    { label: '미중 무역전쟁', value: '관세 충돌', trend: '성장 둔화 우려', tone: 'negative' },
    { label: '신흥국', value: '통화위기', trend: '터키·아르헨 급락', tone: 'negative' },
    { label: '나스닥', value: '연말 -20%', trend: '기술주 조정 가속', tone: 'negative' },
    { label: '유가', value: '급락 전환', trend: '과잉공급·수요 우려', tone: 'negative' },
    { label: '달러', value: '강세 지속', trend: '신흥국 자금 이탈 가속', tone: 'negative' },
  ], 4);
  if (ym >= 201901 && ym <= 201912) return pickN([
    { label: 'Fed 피벗', value: '인하 전환', trend: '긴축 종료 기대', tone: 'positive' },
    { label: '미중 협상', value: '1단계 합의', trend: '무역전쟁 완화', tone: 'positive' },
    { label: 'S&P500', value: '연간 +29%', trend: '강세장 재개', tone: 'positive' },
    { label: '코스피', value: '2,000~2,200', trend: '박스권 횡보 지속', tone: 'mixed' },
    { label: '실업률', value: '3.5%', trend: '역대 최저 수준', tone: 'positive' },
    { label: '기업 실적', value: '완만한 회복', trend: '무역분쟁 완화 효과', tone: 'positive' },
  ], 4);
  if (ym >= 202001 && ym <= 202003) return pickN([
    { label: 'COVID-19', value: '팬데믹 선언', trend: '전 세계 봉쇄 시작', tone: 'negative' },
    { label: 'Fed', value: '긴급 제로금리', trend: '무제한 QE 선언', tone: 'mixed' },
    { label: 'S&P500', value: '33일 -34%', trend: '역사상 가장 빠른 폭락', tone: 'negative' },
    { label: '원유', value: '마이너스 거래', trend: '저장 공간 부족 초유 사태', tone: 'negative' },
    { label: '실업청구', value: '주 600만건', trend: '대공황 이후 최대 실업', tone: 'negative' },
    { label: 'VIX', value: '82 급등', trend: '2008 금융위기 수준 공포', tone: 'negative' },
  ], 4);
  if (ym >= 202004 && ym <= 202012) return pickN([
    { label: 'QE·부양책', value: '역대 최대', trend: '유동성 폭발적 공급', tone: 'positive' },
    { label: '기준금리', value: '0.25%', trend: '초저금리·동학개미', tone: 'positive' },
    { label: '코스피', value: '3,000 돌파', trend: '동학개미 순매수 48조', tone: 'positive' },
    { label: '백신', value: '개발 성공', trend: '리오프닝 기대감 급부상', tone: 'positive' },
    { label: '나스닥', value: '+80% 반등', trend: '비대면·기술주 폭발 성장', tone: 'positive' },
    { label: '부양책', value: '5조달러+', trend: '재정지출 사상 최대', tone: 'positive' },
  ], 4);
  if (ym >= 202101 && ym <= 202112) return pickN([
    { label: '인플레이션', value: '급등 조짐', trend: '공급망 충격·유동성', tone: 'negative' },
    { label: 'QE·저금리', value: '지속', trend: '주식·코인 동반 강세', tone: 'positive' },
    { label: '비트코인', value: '6만달러 ATH', trend: '기관·ETF 자금 유입', tone: 'positive' },
    { label: '코스피', value: '3,316 신고가', trend: '외국인·기관 동반 매수', tone: 'positive' },
    { label: '공급망', value: '병목 심화', trend: '반도체·물류 부족 장기화', tone: 'negative' },
    { label: '부동산', value: '급등 지속', trend: '유동성 과잉·저금리 효과', tone: 'negative' },
  ], 4);
  if (ym >= 202201 && ym <= 202212) return pickN([
    { label: 'Fed 금리', value: '0→4.5%', trend: '40년래 최고속 긴축', tone: 'negative' },
    { label: '인플레이션', value: '9.1%', trend: '경기침체 공포 확산', tone: 'negative' },
    { label: '코스피', value: '2,200 저점', trend: '외국인 대규모 이탈', tone: 'negative' },
    { label: '미국채', value: '역사적 하락', trend: '60/40 포트 동반 하락', tone: 'negative' },
    { label: '러-우 전쟁', value: '에너지 위기', trend: '유가·천연가스 급등', tone: 'negative' },
    { label: '달러', value: '20년래 최강', trend: '신흥국·한국 원화 급락', tone: 'negative' },
  ], 4);
  if (ym >= 202301 && ym <= 202312) return pickN([
    { label: 'ChatGPT·AI', value: '폭발적 성장', trend: 'AI 투자 붐 시작', tone: 'positive' },
    { label: 'Fed 금리', value: '5.25% 고점', trend: '인상 종료 기대', tone: 'positive' },
    { label: '엔비디아', value: '연간 +240%', trend: 'AI 칩 독점 지위', tone: 'positive' },
    { label: '나스닥', value: '반등 +43%', trend: '기술주 급반등', tone: 'positive' },
    { label: '은행위기', value: 'SVB 파산', trend: '중소형 은행 불안 확산', tone: 'negative' },
    { label: '인플레', value: '3~4%대 안정', trend: '연착륙 기대 강화', tone: 'positive' },
  ], 4);
  if (ym >= 202401) return pickN([
    { label: 'AI 인프라', value: '투자 급증', trend: 'NVDA 주도 AI 사이클', tone: 'positive' },
    { label: 'Fed', value: '인하 시작', trend: '연착륙 기대', tone: 'positive' },
    { label: '비트코인', value: '신고가 경신', trend: '현물 ETF 승인·기관 매수', tone: 'positive' },
    { label: '코스피', value: '불안정', trend: '환율·경기 불확실', tone: 'negative' },
    { label: '엔화', value: '약세 지속', trend: 'BOJ 금리 인상 논란', tone: 'mixed' },
    { label: '관세 전쟁', value: '재확산', trend: '트럼프 무역정책 불확실', tone: 'negative' },
  ], 4);
  return pickN([
    { label: '시장', value: '변동성', trend: '추세 불확실', tone: 'mixed' },
    { label: '경기', value: '중립', trend: '특이 이벤트 없음', tone: 'mixed' },
    { label: '금리', value: '보통 수준', trend: '중립 스탠스', tone: 'mixed' },
    { label: '환율', value: '안정적', trend: '특이 변동 없음', tone: 'mixed' },
  ], 4);
}

// ---------- 패턴 감지 ----------
// ※ 구간 평균이 아닌 종가 직접 비교:
//   평균 방식은 "급등 후 급락" 시 평균이 상쇄돼 uptrend로 오분류하는 버그 발생.
//   현재가(revealDay-1) vs 20일 전/40일 전 종가를 직접 비교한다.
function detectPattern(closes, revealDay) {
  const cur = closes[revealDay - 1];
  const p10 = closes[Math.max(0, revealDay - 10)];
  const p20 = closes[Math.max(0, revealDay - 20)];
  const p40 = closes[Math.max(0, revealDay - 40)];
  const p60 = closes[Math.max(0, revealDay - 60)];
  if (!cur || !p20 || !p40) return 'sideways';

  const chg10 = p10 ? (cur - p10) / p10 : 0;
  const chg20 = (cur - p20) / p20;
  const chg40 = (cur - p40) / p40;
  const chg60 = p60 ? (cur - p60) / p60 : chg40;

  // 포물선 상승: 20일 내 폭발적 상승 + 40~60일도 강한 상승 (가속 구조)
  if (chg20 > 0.18 && chg40 > 0.25) return 'parabolic';
  // 이중 천장: 40~60일 강세 → 최근 20일 하락 반전 (고점 후 약세 전환)
  if (chg60 > 0.10 && chg20 < -0.04 && chg40 < chg60 * 0.6) return 'doubletop';
  // 지지선 붕괴(breakdown): 단기·중기 급락으로 지지선 이탈
  if (chg20 < -0.10 && chg40 < -0.18) return 'breakdown';
  // 추세적 상승: 단기·중기 모두 양수이며, 중기 상승이 단기보다 커야 함
  if (chg20 > 0.04 && chg40 > 0.12 && chg40 > chg20 * 1.2) return 'uptrend';
  // 추세적 하락: 단기·중기 모두 음(-)
  if (chg20 < -0.04 && chg40 < -0.12) return 'downtrend';
  // 최근 급등: 되돌림 중이면 reversal, 아니면 breakout
  // chg10 < -0.04 = 최근 10일 하락 중 → 고점 돌파 후 되돌림 구간 → reversal
  if (chg20 > 0.08) return (chg40 < -0.05 || chg10 < -0.04) ? 'reversal' : 'breakout';
  // 최근 급락
  if (chg20 < -0.08) return 'reversal';
  // 중기 방향성만 존재: 최근 10일 되돌림 중이면 reversal
  if (chg40 > 0.10) return chg10 < -0.04 ? 'reversal' : 'breakout';
  if (chg40 < -0.10) return 'reversal';
  return 'sideways';
}

// ---------- 문제 텍스트 생성 (수능 문제 스타일 · 종목명 제외) ----------
const TEMPLATES = {
  uptrend: [
    (_n, m) => `꾸준히 우상향하며 매수세가 지속되고 있다. ${m}개월 후 주가의 변화로 가장 적절한 것은?`,
    (_n, m) => `이평선 위에서 강한 상승 흐름이 이어지고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `정배열 상태에서 거래량이 증가하고 있다. ${m}개월 후 추세의 전개로 옳은 것은?`,
    (_n, m) => `신고가를 연속 갱신하며 상승세를 이어가고 있다. ${m}개월 후 주가의 흐름으로 적절한 것은?`,
    (_n, m) => `MA20 위에서 완만한 우상향이 나타나고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `이평선이 정배열을 유지하며 매번 눌림목에서 반등이 나타나고 있다. ${m}개월 후 주가의 전개로 옳은 것은?`,
    (_n, m) => `고점을 경신할 때마다 거래량이 뒷받침되고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `상승 추세가 수개월째 유지되며 조정폭이 점점 줄어들고 있다. ${m}개월 후 주가의 변화로 옳은 것은?`,
    (_n, m) => `강세 추세 속에서 단기 눌림목 이후 재상승이 반복되고 있다. ${m}개월 후 결과로 가장 적절한 것은?`,
    (_n, m) => `52주 고점 부근에서 강한 매수세가 유지되고 있다. ${m}개월 후 주가의 흐름으로 옳은 것은?`,
    (_n, m) => `주가가 5·20일 이평선 위에서 층층이 지지받으며 상승 중이다. ${m}개월 후 추세로 알맞은 것은?`,
    (_n, m) => `상승 채널 상단을 향해 꾸준히 오르고 있다. ${m}개월 후 주가의 전개로 옳은 것은?`,
  ],
  downtrend: [
    (_n, m) => `신저가를 연속 갱신하며 하락세가 이어지고 있다. ${m}개월 후 주가의 변화로 옳은 것은?`,
    (_n, m) => `이평선 아래에서 매도세가 지속되고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `역배열 상태에서 반등 없이 하락이 이어지고 있다. ${m}개월 후 결과로 옳은 것은?`,
    (_n, m) => `고점 대비 큰 폭으로 하락한 상태이다. ${m}개월 후 주가의 전개로 옳은 것은?`,
    (_n, m) => `하락 채널 안에서 반등마다 저항에 막히고 있다. ${m}개월 후 주가의 변화로 옳은 것은?`,
    (_n, m) => `매도세가 거래량을 동반하며 하락을 이어가고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `반등 시도가 번번이 실패하며 저점을 낮추고 있다. ${m}개월 후 주가의 흐름으로 옳은 것은?`,
    (_n, m) => `단기 반등마다 매물이 쏟아지며 추가 하락이 이어지고 있다. ${m}개월 후 결과로 가장 적절한 것은?`,
    (_n, m) => `주요 지지선을 잇따라 이탈하며 역배열이 심화되고 있다. ${m}개월 후 추세의 전개로 옳은 것은?`,
    (_n, m) => `하락 추세가 수개월째 지속되며 저점을 갱신하고 있다. ${m}개월 후 주가의 방향으로 옳은 것은?`,
  ],
  breakout: [
    (_n, m) => `최근 단기 급등 후 전 고점 부근에서 거래되고 있다. ${m}개월 후 주가의 흐름으로 옳은 것은?`,
    (_n, m) => `이평선 정배열 상태에서 고점 저항 구간에 진입하고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `박스권 상단 근처에서 상승 모멘텀이 유지되고 있다. ${m}개월 후 결과로 적절한 것은?`,
    (_n, m) => `중요 저항 구간을 앞두고 거래량이 증가하고 있다. ${m}개월 후 주가의 변화로 옳은 것은?`,
    (_n, m) => `단기 강세 속에서 전 고점 부근까지 회복한 상태다. ${m}개월 후 추세의 전개로 옳은 것은?`,
    (_n, m) => `이평선들이 정배열을 이루며 고점 저항대에 근접하고 있다. ${m}개월 후 결과로 옳은 것은?`,
    (_n, m) => `수개월 만에 고점 수준으로 회복하며 저항대를 테스트하고 있다. ${m}개월 후 주가의 변화로 옳은 것은?`,
    (_n, m) => `MA5·MA20이 정배열을 유지하며 52주 고점 인근에서 거래 중이다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `단기 급등 이후 전 고점 구간에서 눌림 없이 강세가 유지되고 있다. ${m}개월 후 주가의 전개로 옳은 것은?`,
    (_n, m) => `장기 저항 구간 근처에서 매수 우위가 이어지고 있다. ${m}개월 후 추세의 전개로 적절한 것은?`,
    (_n, m) => `이동평균선들이 수렴 후 상방으로 벌어지며 상승 에너지가 높아지고 있다. ${m}개월 후 결과로 옳은 것은?`,
    (_n, m) => `고점 저항 구간에서 매수세가 매도세를 압도하는 흐름이 보인다. ${m}개월 후 주가의 흐름으로 적절한 것은?`,
  ],
  reversal: [
    (_n, m) => `최근 하락세가 둔화되며 저점에서 반등 신호가 나타나고 있다. ${m}개월 후 주가의 변화로 옳은 것은?`,
    (_n, m) => `이평선 하방에서 하락하던 주가가 저점에서 강한 양봉을 형성하고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `하락세가 멈추고 바닥을 다지는 흐름이 나타나고 있다. ${m}개월 후 결과로 옳은 것은?`,
    (_n, m) => `과매도 구간에서 거래량을 동반한 반등이 시도되고 있다. ${m}개월 후 주가의 전개로 적절한 것은?`,
    (_n, m) => `하락 이후 지지선에서 반등 조짐이 나타나고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `급락 이후 저점에서 양봉이 연속으로 나타나며 반등 신호가 감지되고 있다. ${m}개월 후 결과로 옳은 것은?`,
    (_n, m) => `하락 채널 하단을 이탈한 뒤 강한 매수세로 빠르게 회복하고 있다. ${m}개월 후 주가의 변화로 옳은 것은?`,
    (_n, m) => `주가가 장기 지지선에서 반등을 시도하며 RSI가 과매도 구간에서 반전하고 있다. ${m}개월 후 결과로 적절한 것은?`,
    (_n, m) => `하락 속에 거래량이 급증하며 저점을 확인하는 흐름이 나타나고 있다. ${m}개월 후 추세의 전개로 옳은 것은?`,
    (_n, m) => `강한 하락 이후 반등 시도에서 전 저점을 하회하지 않고 있다. ${m}개월 후 결과로 알맞은 것은?`,
  ],
  sideways: [
    (_n, m) => `박스권 내에서 방향성이 나타나지 않고 있다. ${m}개월 후 주가의 흐름으로 가장 적절한 것은?`,
    (_n, m) => `일정 범위 안에서 등락이 반복되고 있다. ${m}개월 후 주가의 방향으로 옳은 것은?`,
    (_n, m) => `횡보 구간에서 돌파 시도가 이어지고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `뚜렷한 추세 없이 박스권이 유지되고 있다. ${m}개월 후 주가의 전개로 옳은 것은?`,
    (_n, m) => `눌림목 구간에서 추세 재개를 대기하고 있다. ${m}개월 후 방향으로 적절한 것은?`,
    (_n, m) => `상단과 하단 사이에서 등락을 반복하며 에너지를 축적하고 있다. ${m}개월 후 주가의 변화로 옳은 것은?`,
    (_n, m) => `오랜 횡보로 변동성이 극도로 낮아진 상태이다. ${m}개월 후 주가의 흐름으로 적절한 것은?`,
    (_n, m) => `거래량이 감소하며 박스권 수렴이 지속되고 있다. ${m}개월 후 결과로 옳은 것은?`,
    (_n, m) => `박스권 안에서 매수·매도 균형이 유지되고 있다. ${m}개월 후 주가의 전개로 알맞은 것은?`,
  ],
  doubletop: [
    (_n, m) => `큰 상승 이후 고점 부근에서 두 번의 정상을 형성하고 있다. ${m}개월 후 주가의 변화로 옳은 것은?`,
    (_n, m) => `전 고점을 재차 시험하였지만 돌파하지 못하고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `고점에서 재차 저항에 막혀 쌍봉 패턴이 나타나고 있다. ${m}개월 후 주가의 전개로 옳은 것은?`,
    (_n, m) => `강한 상승 후 고점을 두 번 시험했지만 돌파에 실패하고 있다. ${m}개월 후 결과로 적절한 것은?`,
    (_n, m) => `상승세가 고점에서 두 번 막히며 매수세가 소진되는 모습이다. ${m}개월 후 주가의 흐름으로 옳은 것은?`,
    (_n, m) => `고점 부근에서 고가가 반응하지 않으며 상승 모멘텀이 약해지고 있다. ${m}개월 후 결과로 알맞은 것은?`,
  ],
  breakdown: [
    (_n, m) => `주요 지지선을 하향 이탈하며 하락이 가속되고 있다. ${m}개월 후 주가의 변화로 옳은 것은?`,
    (_n, m) => `장기 지지대가 붕괴되며 강한 매도세가 유입되고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `핵심 지지선을 이탈하는 장대 음봉이 출현하였다. ${m}개월 후 주가의 전개로 옳은 것은?`,
    (_n, m) => `이동평균선을 모두 하향 이탈하며 역배열이 완성되고 있다. ${m}개월 후 결과로 적절한 것은?`,
    (_n, m) => `지지 구간이 붕괴되며 매도 물량이 쏟아지고 있다. ${m}개월 후 주가의 흐름으로 옳은 것은?`,
  ],
  parabolic: [
    (_n, m) => `단기간에 급격한 포물선 상승이 나타나고 있다. ${m}개월 후 주가의 변화로 옳은 것은?`,
    (_n, m) => `가파른 가속 상승이 이어지며 단기 고점 우려가 높아지고 있다. ${m}개월 후 결과로 알맞은 것은?`,
    (_n, m) => `기하급수적인 상승 속도로 과열 신호가 나타나고 있다. ${m}개월 후 주가의 전개로 옳은 것은?`,
    (_n, m) => `단기 급등으로 이격도가 크게 벌어지며 추세가 가파르다. ${m}개월 후 결과로 적절한 것은?`,
    (_n, m) => `연속 급등으로 단기 과매수 신호가 강하게 나타나고 있다. ${m}개월 후 주가의 흐름으로 옳은 것은?`,
  ],
};

// review-problems.cjs와 동일한 방향 신호 키워드
const Q_UP_SIGNALS   = ['돌파', '급등', '폭등', '강하게 상승', '크게 상승', '신고가', '강세를 보이'];
const Q_DOWN_SIGNALS = ['급락', '폭락', '붕괴', '강하게 하락', '급격히 하락'];

function pickQ(pattern, name, months, answer) {
  const list = TEMPLATES[pattern] || TEMPLATES.sideways;
  const isUpAnswer   = answer === 0 || answer === 1;
  const isDownAnswer = answer === 2 || answer === 3;

  // answer가 있을 때: 방향 모순 템플릿 제외
  if (answer !== undefined) {
    const filtered = list.filter(fn => {
      const q = fn(name, months);
      const hasUp   = Q_UP_SIGNALS.some(s => q.includes(s));
      const hasDown = Q_DOWN_SIGNALS.some(s => q.includes(s));
      if (isDownAnswer && hasUp && !hasDown) return false;
      if (isUpAnswer   && hasDown && !hasUp) return false;
      return true;
    });
    const pool = filtered.length > 0 ? filtered : list;
    return pool[Math.floor(Math.random() * pool.length)](name, months);
  }

  return list[Math.floor(Math.random() * list.length)](name, months);
}

// ---------- 정답 범주 (1개월 기준 임계값) ----------
function toAnswer(pct) {
  if (pct >= 0.15) return 0; // 급등 (1개월 +15%+)
  if (pct >= 0.05) return 1; // 상승 (1개월 +5%~+15%)
  if (pct > -0.05) return 2; // 횡보 (-5%~+5%)
  return 3;                  // 하락 (1개월 -5%이하)
}

function answerLabel(ans) {
  return ['급등', '상승', '횡보', '하락'][ans];
}

// ---------- 난이도 ----------
function toDifficulty(pct, pattern) {
  const abs = Math.abs(pct);
  if (abs >= 0.20 && pattern !== 'sideways') return 'easy';
  if (abs >= 0.08) return 'medium';
  return 'hard';
}

// ---------- 설명 문장 ----------
// (ans × pattern) 기본 교훈 — 매크로 조건별로 추가 레이어 덧씌움
const LESSON_MAP = {
  0: {
    uptrend:   '추세와 매크로가 같은 방향일 때 상승 에너지가 가장 강하다. 역사적으로 이 조합의 1개월 성공률은 65%를 상회한다. 단, 추세가 꺾일 때는 거래량 감소가 먼저 신호를 보낸다.',
    breakout:  '거래량 동반 돌파는 추세 추종 매매의 핵심 신호다. 돌파 이후 전 저항선이 지지로 바뀌는지 확인하는 것이 포지션 유지의 기준이 된다.',
    reversal:  '바닥에서의 강한 반등은 사이클 전환 초입을 알리는 신호다. 첫 반등보다 두 번째 저점 확인이 더 중요하며, 전 저점을 하회하지 않으면 매수세가 살아있다는 뜻이다.',
    downtrend: '하락 추세 중 역발상 반등은 드물지만, 매크로 개선 신호와 동반할 때 성공률이 높아진다. 손절선 없이 진입하면 단기 반등도 손실로 이어질 수 있다.',
    sideways:  '오랜 박스권 돌파 후 급등은 억눌렸던 매수 에너지가 한꺼번에 풀리는 패턴이다. 박스권 기간이 길수록 돌파 후 상승 지속력이 강한 경향이 있다.',
    doubletop: '쌍봉에서 강하게 반등했다면 고점 저항이 없는 새 국면이다. 전 고점 돌파는 다음 단계의 시작이다.',
    breakdown: '지지선 붕괴 후 강한 반등은 드물지만, 매크로가 개선될 때 V자 회복으로 이어지기도 한다.',
    parabolic: '포물선 상승은 모멘텀이 극도로 강할 때 나타난다. 지속력은 짧지만 방향이 맞으면 단기 수익이 크다.',
  },
  1: {
    uptrend:   '추세는 유지됐지만 기대만큼 크지 않았다. 추세 추종은 정확한 목표가보다 손절선 관리가 수익을 결정한다.',
    breakout:  '돌파 후 점진적 상승. 기대감은 맞았지만 속도가 느렸다. 돌파 초기에 전량 진입보다 분할 매수로 리스크를 낮추는 전략이 유효하다.',
    reversal:  '반등에 성공했지만 완전한 추세 전환까지는 더 시간이 필요했다. 바닥 매수는 분할로 접근하고, 추세 전환 확인 후 비중을 늘리는 것이 안전하다.',
    downtrend: '하락 후 반전 성공. 패닉 구간에서 버텼거나 매수했다면 수익이 났다. 하지만 반전 초기에는 항상 재하락 가능성을 열어두고 손절선을 미리 정해야 한다.',
    sideways:  '박스권 상단 돌파 후 천천히 상승했다. 박스권 탈출에는 인내가 필요하며, 충분한 에너지 축적 후의 돌파가 더 오래 이어진다.',
    doubletop: '쌍봉 패턴에서 예상을 뒤집고 완만히 상승했다. 매크로 호재가 패턴을 무력화했다.',
    breakdown: '붕괴 이후 저점 매수세가 유입되며 점진적으로 회복했다.',
    parabolic: '급등 이후에도 상승 동력이 남아 있었다. 추세가 이어지는 동안 이른 차익실현은 기회 손실이다.',
  },
  2: {
    uptrend:   '상승 추세에서 숨 고르기가 나타났다. 추세 자체는 살아있지만 단기 모멘텀이 소진됐다. 눌림목을 추가 매수 기회로 볼지, 추세 종료 신호로 볼지가 핵심 판단이다.',
    breakout:  '돌파 시도가 무산되고 박스권으로 재진입했다. 거래량 없는 돌파 시도는 페이크아웃 확률이 높다. 돌파 확인 후 진입하는 전략이 손실을 줄인다.',
    reversal:  '반등 후 재차 지지부진했다. 진짜 추세 전환과 데드캣 반등은 두 번째 저점 확인으로 구분할 수 있다. 손절선 없는 바닥 매수는 가장 흔한 실수다.',
    downtrend: '하락이 일시 멈췄지만 추세 전환까지는 더 시간이 필요했다. 하락 추세에서 횡보는 이탈 전 최후의 경고일 수 있다.',
    sideways:  '박스권이 계속됐다. 기다림에 지쳐 손절한 투자자들이 가장 많이 나오는 구간이다. 방향성이 결정될 때까지 포지션 사이즈를 줄이는 것이 정답이다.',
    doubletop: '쌍봉 경고에도 불구하고 횡보로 에너지를 소화했다. 방향 결정이 지연되는 구간이다.',
    breakdown: '붕괴 이후 추가 매도세와 저점 매수세가 균형을 이루며 횡보가 이어졌다.',
    parabolic: '급등 이후 속도 조절 구간으로 진입했다. 이격 해소 후 추세 방향이 재결정된다.',
  },
  3: {
    uptrend:   '올랐던 주식이 결국 꺾였다. 추세 종료 신호는 대개 거래량 이상과 고점 불경신으로 나타난다. 상승장에서 익숙해진 매수 본능이 가장 위험한 순간이다.',
    breakout:  '돌파처럼 보였지만 결국 실패하고 되돌렸다. 거래량이 동반되지 않은 돌파는 항상 의심해야 한다. 매크로가 역방향이면 차트 신호는 더 신뢰하기 어렵다.',
    reversal:  '바닥인 줄 알고 들어갔다가 더 빠졌다. 첫 반등이 항상 바닥은 아니다. 전 저점을 하회하면 즉시 손절하는 원칙이 손실을 최소화한다.',
    downtrend: '하락 추세가 가속됐다. 약세장에서 "싸 보인다"는 감각은 항상 틀린다. 추세 전환 신호가 나올 때까지 관망이 최선이다.',
    sideways:  '박스 하단을 이탈하며 하락이 가속됐다. 오랜 횡보 후 이탈은 에너지가 아래로 풀리는 것이다. 지지선 붕괴 시 즉각적인 대응이 핵심이다.',
    doubletop: '쌍봉 패턴이 현실화됐다. 고점에서 호재에 반응이 없었다면 매수세 소진이다.',
    breakdown: '지지선 붕괴 이후 추가 하락이 이어졌다. 붕괴는 끝이 아닌 시작이다.',
    parabolic: '포물선 끝에서 급격한 조정이 나타났다. 어떤 추세도 영원히 지속될 수 없다.',
  },
};

// 매크로 tone별 추가 교훈 레이어
const MACRO_LESSON = {
  // 상승 결과 + 부정 매크로
  up_neg: [
    '매크로가 불리해도 가격과 수급이 버티면 시장은 이미 악재를 소화한 것이다. 가격 행동이 뉴스보다 앞서간다.',
    '나쁜 뉴스 속 강한 주가 = 숨겨진 매수 주체가 있다는 뜻이다. 거래량과 수급 흐름을 뉴스보다 먼저 봐야 한다.',
    '악재 속 상승은 "이미 반영됐다"는 신호다. 시장은 6개월 앞을 본다는 원칙이 여기서도 작동했다.',
    '부정적 매크로에도 주가가 버텼다면 그 자산에는 강력한 매수 주체가 있다. 악재가 호재가 되는 순간이 매수 기회다.',
    '시장 참여자 대부분이 비관적일 때 오히려 바닥이 확인된다. 최악의 시나리오가 가격에 충분히 반영됐을 때 반전이 나타난다.',
    '역발상의 본질은 비관론이 극대화됐을 때 매수하는 것이다. 매크로 뉴스가 암울할수록 가격 저항선이 더 단단해진다.',
  ],
  // 하락 결과 + 긍정 매크로
  down_pos: [
    '호재가 있어도 가격이 무너지면 시장은 다른 위험을 먼저 보고 있다는 뜻이다. 뉴스보다 가격을 믿어야 한다.',
    '좋은 뉴스에 가격이 반응하지 않으면 매수세가 소진된 것이다. "호재 무반응"은 매도 신호다.',
    '매크로가 긍정적이어도 수급이 이탈하면 주가는 버티지 못한다. 펀더멘털과 수급은 항상 함께 봐야 한다.',
    '낙관론이 정점에 달했을 때 주가는 이미 기대치를 선반영한다. 호재 발표 후 하락은 "소문에 사고 뉴스에 판다"의 전형이다.',
    '매크로 개선은 필요조건이지 충분조건이 아니다. 이미 고평가된 자산은 좋은 환경에서도 하락할 수 있다.',
    '긍정적 매크로 속 약세는 더 큰 하락의 전조다. 시장이 호재를 무시하기 시작했다면 매도 압력이 이미 구조적으로 쌓인 것이다.',
  ],
  // 상승 결과 + 긍정 매크로
  up_pos: [
    '차트와 매크로가 같은 방향이면 추세가 이어질 확률이 높아진다. 두 가지 모두 확인됐을 때 포지션을 늘리는 것이 유리하다.',
    '추세 + 유동성이 동행할 때 상승 에너지가 배가된다. 이런 구간에서 일찍 차익실현하면 남은 상승을 놓친다.',
    '강세 차트에 강한 매크로가 더해지면 추세 가속이 나타난다. 조정이 와도 추세를 유지하는 경우가 많다.',
    '모든 조건이 맞아떨어지는 구간에서 포지션을 축소하는 것은 실수다. 추세가 살아있는 동안은 시장의 편에 서야 한다.',
    '긍정적 매크로와 차트 모멘텀의 동행은 가장 강력한 매수 신호다. 이 조합이 깨질 때까지 포지션을 유지하는 것이 수익 극대화의 핵심이다.',
    '강세장에서 "이미 많이 올랐다"는 생각이 가장 많은 수익 기회를 앗아간다. 추세는 예상보다 훨씬 오래 지속된다.',
  ],
  // 하락/횡보 결과 + 부정 매크로
  down_neg: [
    '약한 차트와 부정적 매크로가 겹치면 반등보다 리스크 관리가 먼저다. 손절 기준을 미리 정해두지 않으면 손실이 커진다.',
    '매크로와 차트가 모두 부정적이면 반등을 기다리며 버티는 것은 위험하다. 손실 제한이 수익보다 중요한 구간이다.',
    '이중 악재 구간에서는 "언젠가 오르겠지"라는 생각이 가장 위험하다. 확실한 전환 신호가 나올 때까지 현금이 최선이다.',
    '하락하는 칼날을 잡으려 하지 마라. 차트와 매크로가 모두 부정적일 때 저가 매수는 수익 기회가 아닌 손실 확대다.',
    '약세장에서 가장 큰 실수는 평균단가를 낮추기 위한 추가 매수다. 잘못된 포지션은 줄여야지 늘려서는 안 된다.',
    '이중 악재 국면에서 반등은 짧고 하락은 길다. 손절의 타이밍을 놓치면 회복에 수년이 걸릴 수 있다.',
  ],
};

function macroTone(hints) {
  const pos = hints.filter(h => h.tone === 'positive').length;
  const neg = hints.filter(h => h.tone === 'negative').length;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'mixed';
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeLesson(ans, pattern, hints) {
  const tone = macroTone(hints);
  const isUp = ans === 0 || ans === 1;

  // 매크로-결과 충돌 / 동행 케이스: 특화 레이어 우선 적용
  if (isUp && tone === 'negative') return pickRandom(MACRO_LESSON.up_neg);
  if (!isUp && tone === 'positive') return pickRandom(MACRO_LESSON.down_pos);
  if (isUp && tone === 'positive') return pickRandom(MACRO_LESSON.up_pos);
  if (!isUp && tone === 'negative') return pickRandom(MACRO_LESSON.down_neg);

  // mixed 또는 기타: 패턴-결과 기반 기본 교훈
  return (LESSON_MAP[ans] && LESSON_MAP[ans][pattern]) || '차트 패턴과 매크로를 동시에 확인하는 것이 핵심이다.';
}

// ---------- 설명 문장 (2~3문장으로 확장) ----------
const EXPLANATION_CONTEXT = {
  // (ans, pattern) → 두 번째 문장 (왜 이런 결과가 나왔는지)
  '0_breakout':  '거래량이 동반된 돌파가 진짜 추세 전환을 확인시켜 주었다.',
  '0_uptrend':   '추세가 이어지며 모멘텀이 가속되는 흐름이 나타났다.',
  '0_reversal':  '바닥에서 강한 수급이 유입되며 추세가 빠르게 반전됐다.',
  '0_downtrend': '예상을 뒤집는 매수세가 유입되며 추세가 급반전했다.',
  '0_sideways':  '에너지 축적 이후 방향이 결정되자 빠르게 상승이 진행됐다.',
  '0_doubletop': '고점 저항을 돌파하며 쌍봉 패턴이 무력화됐다.',
  '0_breakdown': '붕괴 직후 강한 매수세가 유입되며 V자 반등이 나타났다.',
  '0_parabolic': '포물선 가속이 멈추지 않으며 추가 급등이 이어졌다.',
  '1_breakout':  '돌파 이후 전 저항선이 지지선으로 전환되며 점진적 상승이 이어졌다.',
  '1_uptrend':   '추세는 유지됐지만 단기 과매수에 따른 속도 조절이 나타났다.',
  '1_reversal':  '반등에 성공했지만 완전한 추세 전환까지는 시간이 더 필요했다.',
  '1_downtrend': '매도 압력이 줄어들며 저점 매수 세력이 점차 우위를 점했다.',
  '1_sideways':  '박스권 상단 돌파 이후 이전 저항이 지지로 바뀌며 완만히 올랐다.',
  '1_doubletop': '쌍봉 우려에도 불구하고 점진적 상승이 이어졌다.',
  '1_breakdown': '붕괴 이후 저점 매수가 유입되며 완만한 회복세가 나타났다.',
  '1_parabolic': '급등 이후에도 추세가 지속되며 상승이 이어졌다.',
  '2_breakout':  '거래량 없는 돌파는 페이크아웃으로 끝나며 다시 박스권으로 회귀했다.',
  '2_uptrend':   '단기 모멘텀이 소진되며 관망세가 늘어 방향성이 약해졌다.',
  '2_reversal':  '반등 시도가 이어졌지만 매도 매물이 쌓여 방향을 결정짓지 못했다.',
  '2_downtrend': '하락 속도가 줄었지만 매수 주체가 충분하지 않아 추세 전환까지는 이르지 못했다.',
  '2_sideways':  '특별한 촉매 없이 박스권이 그대로 유지됐다.',
  '2_doubletop': '고점 경계에서 매수·매도 균형으로 방향성이 없었다.',
  '2_breakdown': '붕괴 이후 반등과 재하락이 반복되며 방향을 정하지 못했다.',
  '2_parabolic': '급등 후 이격 해소 과정에서 박스권 횡보가 이어졌다.',
  '3_breakout':  '거래량과 수급이 뒷받침되지 않은 돌파였고, 결국 되돌림이 나타났다.',
  '3_uptrend':   '상승 피로가 누적된 상태에서 매도 세력이 우위를 점하며 추세가 꺾였다.',
  '3_reversal':  '반등이 실패하며 추가 하락이 나타났다. 바닥 확인 전 섣부른 매수의 위험을 보여준다.',
  '3_downtrend': '매도 압력이 지속되며 하락이 가속됐다.',
  '3_sideways':  '지지선이 붕괴되며 하락 에너지가 한꺼번에 쏟아졌다.',
  '3_doubletop': '쌍봉 패턴이 완성되며 네크라인 이탈 후 하락이 가속됐다.',
  '3_breakdown': '붕괴 후 추가 매도세가 유입되며 하락이 지속됐다.',
  '3_parabolic': '포물선 상승이 급격히 꺾이며 과열 해소 하락이 나타났다.',
};

function makeExplanation(ans, pctStr, months, pattern) {
  const lbl = answerLabel(ans);
  let verb;
  if (ans === 0 || ans === 1) {
    verb = {
      reversal:  '반등에 성공하며',
      downtrend: '예상 외 강하게 반등하며',
      breakout:  '돌파에 성공하며',
      uptrend:   '추세를 이어가며',
      sideways:  '박스권을 돌파하며',
    }[pattern] || '이후';
  } else if (ans === 2) {
    verb = {
      reversal:  '반등 시도 후 재차 눌리며',
      downtrend: '하락이 일시 멈추며',
      breakout:  '돌파 시도가 무산되며',
      uptrend:   '상승 피로 누적 후',
      sideways:  '방향성 없이',
    }[pattern] || '이후';
  } else {
    verb = {
      reversal:  '반등 실패 후',
      downtrend: '하락을 이어가며',
      breakout:  '돌파 실패로 되밀리며',
      uptrend:   '추세가 꺾이며',
      sideways:  '하단을 이탈하며',
    }[pattern] || '이후';
  }
  const first = `${verb} ${months}개월 뒤 ${lbl} (${pctStr}).`;
  const ctx = EXPLANATION_CONTEXT[`${ans}_${pattern}`] || '';
  return ctx ? `${first} ${ctx}` : first;
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

// ---------- 분포 목표 (GEN 전체) ----------
// HC 51개: 급등15, 상승11, 횡보14, 하락11
// 합산 목표: 급등≤15%, 상승25-30%, 횡보35-40%, 하락20-25%
// GEN 목표: 급등17, 상승47, 횡보65, 하락37 = 166개
const DIST_TARGET = { 0: 17, 1: 47, 2: 65, 3: 37 };

// ---------- 메인 ----------
const candidates = [];

for (const [ticker, meta] of Object.entries(TICKER_META)) {
  const csvPath = path.join(DATA_DIR, `${meta.file}.csv`);
  if (!fs.existsSync(csvPath)) { console.warn(`SKIP: ${csvPath}`); continue; }

  const rows = parseCSV(csvPath);
  if (rows.length < CHART_DAYS + 10) { console.warn(`TOO SHORT: ${ticker} (${rows.length})`); continue; }

  const existing = EXISTING[ticker] || [];
  const usable   = rows.length - CHART_DAYS;
  const step     = Math.max(MIN_STEP, Math.floor(usable / MAX_PER_TICKER));

  let tickerCount = 0;

  const WARMUP_ROWS = 120; // dataLoader.ts와 맞춤 — 이 미만이면 합성 패딩 발생

  for (let si = 0; si < usable; si += step) {
    if (si < WARMUP_ROWS) continue; // MA 계산에 충분한 실제 워밍업 데이터 없음
    const startDate = rows[si].date;
    if (overlaps(startDate, existing)) continue;

    const closes = rows.slice(si, si + CHART_DAYS).map(r => r.close);
    if (closes.length < CHART_DAYS) continue;
    if (closes.some(v => isNaN(v) || v <= 0)) continue;

    const revealClose = closes[REVEAL_DAY - 1];
    const endClose    = closes[CHART_DAYS - 1];
    const pct         = (endClose - revealClose) / revealClose;

    const pattern = detectPattern(closes, REVEAL_DAY);
    const months  = Math.round(AFTER_DAYS / 21) || 1;
    const answer  = toAnswer(pct);
    const pctStr  = (pct >= 0 ? '+' : '') + (pct * 100).toFixed(0) + '%';
    const endDate = rows[si + CHART_DAYS - 1].date;
    const macroHints = getMacroHints(startDate);

    candidates.push({
      market:      meta.market,
      ticker,
      pattern,
      revealDay:   REVEAL_DAY,
      chartDays:   CHART_DAYS,
      difficulty:  toDifficulty(pct, pattern),
      startDate,
      question:    pickQ(pattern, meta.name, months, answer),
      macroHints,
      valuationHints: getValuationHints(ticker, startDate),
      choices:     getChoices(pattern),
      answer,
      explanation: makeExplanation(answer, pctStr, months, pattern),
      reveal: {
        title:  `${meta.name} (${ticker})`,
        market: `${meta.market} · ${meta.sector}`,
        period: `${toKoMonth(startDate)} ~ ${toKoMonth(endDate)}`,
        result: `1개월 후 ${answerLabel(answer)} (${pctStr}).`,
        macro:  macroHints.map(h => `${h.label} ${h.value}`).join(', ') + '.',
        lesson: makeLesson(answer, pattern, macroHints),
      },
    });

    tickerCount++;
    if (tickerCount >= MAX_PER_TICKER) break;
  }

  console.log(`${ticker}: ${tickerCount}개 후보`);
}

// ---------- 분포 제어 (답 카테고리별 목표 수만큼 추출) ----------
const byAnswer = { 0: [], 1: [], 2: [], 3: [] };
for (const c of candidates) byAnswer[c.answer].push(c);

// 각 카테고리를 랜덤 셔플 후 목표 수만큼 선택
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const selected = [];
for (const ans of [0, 1, 2, 3]) {
  const pool = shuffle(byAnswer[ans]);
  const take = Math.min(DIST_TARGET[ans], pool.length);
  selected.push(...pool.slice(0, take));
  console.log(`  답=${ans}(${['급등','상승','횡보','하락'][ans]}): 후보 ${pool.length}개 → ${take}개 선택`);
}

// ID 배정 (날짜순 정렬)
selected.sort((a, b) => {
  if (a.ticker < b.ticker) return -1;
  if (a.ticker > b.ticker) return 1;
  return a.startDate < b.startDate ? -1 : 1;
});

let nextId = 56;
const allProblems = selected.map(p => ({ id: nextId++, ...p }));

// ---------- 패턴별 choices ----------
function getChoices(pattern) {
  switch (pattern) {
    case 'breakout':
      return [
        '돌파에 성공하여 강한 추세가 지속된다',
        '돌파 이후 점진적으로 상승한다',
        '가짜 돌파 후 박스권으로 재진입한다',
        '돌파에 실패하고 되돌림 하락이 나타난다',
      ];
    case 'reversal':
      return [
        '강하게 반등하여 추세가 전환된다',
        '저점을 확인하고 점진적으로 회복한다',
        '단기 반등 후 재하락한다',
        '반등에 실패하고 추가 급락한다',
      ];
    case 'uptrend':
      return [
        '추세가 가속화되어 신고가를 경신한다',
        '추세를 유지하며 완만하게 우상향한다',
        '상승 피로로 횡보하며 숨 고르기를 한다',
        '추세가 꺾이고 조정 국면에 진입한다',
      ];
    case 'downtrend':
      return [
        '급격히 반전되어 강하게 상승한다',
        '하락이 멈추고 반등하여 회복한다',
        '하락이 감속되어 바닥을 다진다',
        '하락이 가속화되어 추가 급락한다',
      ];
    case 'doubletop':
      return [
        '고점 저항을 돌파하여 강하게 상승한다',
        '매수세가 유입되어 점진적으로 상승한다',
        '쌍봉 부근에서 방향성 없이 횡보한다',
        '쌍봉 패턴이 완성되어 하락한다',
      ];
    case 'breakdown':
      return [
        '강한 저점 매수세로 빠르게 급반등한다',
        '붕괴 이후 점진적으로 회복한다',
        '붕괴 이후 방향성 없이 횡보한다',
        '붕괴 이후 추가 하락이 이어진다',
      ];
    case 'parabolic':
      return [
        '포물선 상승이 계속되어 추가 급등한다',
        '상승 모멘텀이 유지되며 완만히 오른다',
        '급등 이후 이격 해소로 횡보한다',
        '포물선 상승이 꺾이며 급격히 하락한다',
      ];
    case 'sideways':
    default:
      return [
        '박스권 상단을 돌파하여 급등한다',
        '상단 돌파 후 새로운 추세가 형성된다',
        '박스권이 지속된다',
        '하단을 이탈하여 하락이 가속된다',
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

  const vhLines = (p.valuationHints || []).map(v =>
    `      { label: '${esc(v.label)}', value: '${esc(v.value)}', context: '${esc(v.context)}', tone: '${v.tone}' }`
  ).join(',\n');
  const vhBlock = vhLines ? `\n    valuationHints: [\n${vhLines},\n    ],` : '';

  return `  {
    id: ${p.id}, market: '${p.market}', ticker: '${esc(p.ticker)}', pattern: '${p.pattern}',
    revealDay: ${p.revealDay}, chartDays: ${p.chartDays}, difficulty: '${p.difficulty}',
    startDate: '${p.startDate}',
    question: '${esc(p.question)}',
    macroHints: [
${mh},
    ],${vhBlock}
    choices: [
${ch},
    ],
    answer: ${p.answer},
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

// 생성 후 자동 검증
const { execSync } = require('child_process');
try {
  execSync('node ' + path.join(__dirname, 'validate-problems.cjs'), { stdio: 'inherit' });
} catch (e) {
  console.error('\n⚠️  생성 후 검증 실패 — 위 이슈를 확인하세요.');
  process.exit(1);
}
