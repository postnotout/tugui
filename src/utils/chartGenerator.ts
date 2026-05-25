import type { ChartDataPoint } from '../types';

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// i runs 0..146 (CHART - 1). Breakpoints scaled ×(147/120) from original 120-point version.
function pricePath(pattern: string, i: number): number {
  if (pattern === 'breakout') {
    // flat 75일 → 돌파 30일 (+50%) → 완만한 상승
    if (i < 75) return 1.0;
    if (i < 105) return 1.0 + ((i - 75) / 30) * 0.5;
    return 1.5 + ((i - 105) / 41) * 0.2;
  }
  if (pattern === 'doubletop') {
    if (i < 37) return 1.0 + (i / 37) * 0.4;
    if (i < 61) return 1.4 - ((i - 37) / 24) * 0.25;
    if (i < 86) return 1.15 + ((i - 61) / 25) * 0.27;
    if (i < 116) return 1.42 - ((i - 86) / 30) * 0.37;
    return 1.05 - ((i - 116) / 30) * 0.30;
  }
  if (pattern === 'reversal') {
    if (i < 86) return 1.0 - (i / 86) * 0.45;
    if (i < 108) return 0.55 + ((i - 86) / 22) * 0.25;
    if (i < 141) return 0.80 - ((i - 108) / 33) * 0.35;
    return 0.45 + ((i - 141) / 5) * 0.02;
  }
  if (pattern === 'uptrend') return 1.0 + (i / 146) * 0.7;
  if (pattern === 'parabolic') {
    if (i < 98) return 1.0 + (i / 98) * 0.5;
    return 1.5 + Math.pow((i - 98) / 24, 1.3) * 0.5;
  }
  if (pattern === 'vshape') {
    if (i < 31) return 1.0 - (i / 31) * 0.35;
    if (i < 61) return 0.65 + ((i - 31) / 30) * 0.40;
    return 1.05 + ((i - 61) / 85) * 0.65;
  }
  if (pattern === 'fakebreakout') {
    if (i < 75) return 1.0;
    if (i < 92) return 1.0 + ((i - 75) / 17) * 0.18;
    return 1.18 - ((i - 92) / 54) * 0.35;
  }
  if (pattern === 'cup') {
    if (i < 98) return 1.0 - Math.sin((i / 98) * Math.PI) * 0.22;
    return 1.0 + ((i - 98) / 48) * 0.25;
  }
  return 1.0;
}

function volPath(pattern: string, i: number): number {
  if (pattern === 'breakout') {
    if (i < 75) return 0.5;
    if (i < 92) return 2.0;
    return 1.1;
  }
  if (pattern === 'doubletop') {
    if (i < 37) return 1.3;
    if (i < 61) return 0.7;
    if (i < 86) return 0.55;
    if (i < 116) return 1.6;
    return 1.3;
  }
  if (pattern === 'reversal') {
    if (i < 86) return 0.7;
    if (i < 104) return 2.2;
    return 1.2;
  }
  if (pattern === 'fakebreakout') {
    if (i < 75) return 0.6;
    if (i < 92) return 1.3;
    return 1.5;
  }
  if (pattern === 'cup') {
    if (i < 49) return 1.1;
    if (i < 86) return 0.6;
    return 1.4;
  }
  return 1.0;
}

/**
 * 합성 차트 생성.
 * MA60·MA120 워밍업을 위해 내부적으로 WARMUP(120)개를 먼저 생성하고
 * 실제 반환은 chartDays(120)개만 한다 → 첫날부터 모든 이평선 유효.
 */
export function generateChart(seed: number, pattern: string, startDate: string): ChartDataPoint[] {
  const WARMUP = 120;
  const CHART  = 147; // 과거 6개월(126) + 예측 1개월(21)
  const TOTAL  = WARMUP + CHART;

  const rng       = mulberry32(seed);
  const basePrice = 100 + (seed % 50);
  const baseDate  = new Date(startDate);

  // ── 전체(WARMUP + CHART) 가격·거래량 생성 ──────────────────────────────
  const prices: number[] = [];
  const vols:   number[] = [];

  for (let i = 0; i < TOTAL; i++) {
    const ci = i - WARMUP; // 차트 인덱스 (음수 = 워밍업 구간)
    const targetPrice = ci < 0 ? basePrice : basePrice * pricePath(pattern, ci);
    const volFactor   = ci < 0 ? 1.0       : volPath(pattern, ci);
    const noise       = (rng() - 0.5) * 0.03;
    prices.push(targetPrice * (1 + noise));
    vols.push(Math.floor(volFactor * 800000 * (0.85 + rng() * 0.3)));
  }

  // ── MA / RSI 계산 (전체 배열 기준) ─────────────────────────────────────
  const sma = (idx: number, period: number): number | null => {
    if (idx < period - 1) return null;
    let sum = 0;
    for (let j = idx - period + 1; j <= idx; j++) sum += prices[j];
    return +(sum / period).toFixed(2);
  };

  const rsi = (idx: number): number | null => {
    const period = 14;
    if (idx < period) return null;
    let gains = 0, losses = 0;
    for (let j = idx - period + 1; j <= idx; j++) {
      const diff = prices[j] - prices[j - 1];
      if (diff > 0) gains += diff; else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return +(100 - 100 / (1 + avgGain / avgLoss)).toFixed(1);
  };

  // ── WARMUP 이후 구간만 반환 ─────────────────────────────────────────────
  const result: ChartDataPoint[] = [];
  for (let i = 0; i < CHART; i++) {
    const ai = i + WARMUP; // prices[] 상의 실제 인덱스
    const dt = new Date(baseDate);
    dt.setDate(dt.getDate() + i);
    result.push({
      day:   i,
      date:  dt.toISOString().slice(5, 10).replace('-', '/'),
      종가:  +prices[ai].toFixed(2),
      거래량: vols[ai],
      MA5:   sma(ai, 5),
      MA20:  sma(ai, 20),
      MA60:  sma(ai, 60),
      MA120: sma(ai, 120),
      RSI:   rsi(ai),
    });
  }

  return result;
}
