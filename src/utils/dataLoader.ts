import Papa from 'papaparse';
import type { ChartDataPoint } from '../types';

interface RawRow {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

// ticker → CSV ファイル名のマッピング
const TICKER_FILE: Record<string, string> = {
  '005930.KS': '005930.KS',
  '051910.KS': '051910.KS',
  '000660.KS': '000660.KS',
  '247540.KQ': '247540.KQ',
  '011170.KS': '011170.KS',
  'TSLA':      'TSLA',
  'NVDA':      'NVDA',
  'BTC-USD':   'BTC_USD',
  '^GSPC':     'GSPC',
  // 확장 데이터 (역사적 사건)
  'GSPC2007':  'GSPC_2007',   // 2008 금융위기
  'KS11':      'KS11',        // IMF 외환위기
  'SSE':       'SSE',         // 중국 상하이
  'IXIC':      'IXIC',        // 나스닥 닷컴버블
  'N225':      'N225',        // 니케이 버블
  'GME':       'GME',         // 게임스톱
  'SEEGENE':   'SEEGENE',     // 씨젠 K방역
  // 확장 데이터 (현대 종목)
  'META':      'META',        // 메타
  '035720.KS': '035720.KS',  // 카카오
  '035420.KS': '035420.KS',  // 네이버
  '005380.KS': '005380.KS',  // 현대차
  'AAPL':      'AAPL',        // 애플
  'AMD':       'AMD',         // AMD
  'GLD':       'GLD',         // 금 ETF
  '086520.KQ': '086520.KQ',  // 에코프로
  '068270.KS': '068270.KS',  // 셀트리온
};

async function fetchCSV(ticker: string): Promise<RawRow[]> {
  const filename = TICKER_FILE[ticker] ?? ticker;
  const url = `/data/${filename}.csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CSV not found: ${url}`);
  const text = await res.text();
  const result = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true });
  return result.data;
}

function sma(data: number[], idx: number, period: number): number | null {
  if (idx < period - 1) return null;
  let sum = 0;
  for (let j = idx - period + 1; j <= idx; j++) sum += data[j];
  return +(sum / period).toFixed(2);
}

function rsi14(data: number[], idx: number): number | null {
  const period = 14;
  if (idx < period) return null;
  let gains = 0, losses = 0;
  for (let j = idx - period + 1; j <= idx; j++) {
    const diff = data[j] - data[j - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return +(100 - 100 / (1 + rs)).toFixed(1);
}

/**
 * ticker 종목의 startDate 기준 days개 봉을 로드.
 * startDate 이전 최대 120개를 워밍업에 사용하되,
 * CSV 시작일이 startDate와 같거나 가까워 이전 행이 부족할 경우
 * 첫 종가로 합성 패딩을 추가해 MA60·MA120이 항상 유효하도록 한다.
 */
export async function loadChartData(
  ticker: string,
  startDate: string,
  days: number,
): Promise<ChartDataPoint[]> {
  const rows = await fetchCSV(ticker);

  const startIdx = rows.findIndex(r => r.date >= startDate);
  if (startIdx === -1) throw new Error(`No data from ${startDate} for ${ticker}`);

  const WARMUP = 120;
  const sliceStart = Math.max(0, startIdx - WARMUP);
  const sliceEnd   = Math.min(rows.length, startIdx + days);
  const slice = rows.slice(sliceStart, sliceEnd);

  // CSV에 실제로 있는 워밍업 행 수
  const actualWarmup  = startIdx - sliceStart;
  // 부족한 만큼 합성 패딩 추가 (첫 가시 데이터 가격으로 평탄하게)
  const syntheticPad  = WARMUP - actualWarmup;
  const firstClose    = parseFloat(rows[sliceStart]?.close ?? rows[0].close);

  // closes[WARMUP + i] = slice[i] 의 종가
  const closes: number[] = [
    ...Array<number>(syntheticPad).fill(firstClose),
    ...slice.map(r => parseFloat(r.close)),
  ];

  const points: ChartDataPoint[] = slice.map((r, i) => {
    const ci = syntheticPad + i; // closes[] 내 인덱스
    return {
      day:    i - actualWarmup,  // 0-base from startDate
      date:   r.date.slice(5).replace('-', '/'), // MM/DD
      종가:   parseFloat(r.close),
      거래량: parseInt(r.volume, 10) || 0,
      MA5:    sma(closes, ci, 5),
      MA20:   sma(closes, ci, 20),
      MA60:   sma(closes, ci, 60),
      MA120:  sma(closes, ci, 120),
      RSI:    rsi14(closes, ci),
    };
  });

  // 워밍업 구간 제거 (day < 0)
  return points.filter(p => p.day >= 0);
}
