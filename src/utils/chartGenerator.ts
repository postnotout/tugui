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

function pricePath(pattern: string, i: number): number {
  if (pattern === 'breakout') {
    if (i < 60) return 1.0;
    if (i < 85) return 1.0 + ((i - 60) / 25) * 0.5;
    return 1.5 + ((i - 85) / 34) * 0.2;
  }
  if (pattern === 'doubletop') {
    if (i < 30) return 1.0 + (i / 30) * 0.4;
    if (i < 50) return 1.4 - ((i - 30) / 20) * 0.25;
    if (i < 70) return 1.15 + ((i - 50) / 20) * 0.27;
    if (i < 95) return 1.42 - ((i - 70) / 25) * 0.37;
    return 1.05 - ((i - 95) / 24) * 0.30;
  }
  if (pattern === 'reversal') {
    if (i < 70) return 1.0 - (i / 70) * 0.45;
    if (i < 88) return 0.55 + ((i - 70) / 18) * 0.25;
    if (i < 115) return 0.80 - ((i - 88) / 27) * 0.35;
    return 0.45 + ((i - 115) / 4) * 0.02;
  }
  if (pattern === 'uptrend') return 1.0 + (i / 119) * 0.7;
  if (pattern === 'parabolic') {
    if (i < 80) return 1.0 + (i / 80) * 0.5;
    return 1.5 + Math.pow((i - 80) / 20, 1.3) * 0.5;
  }
  if (pattern === 'vshape') {
    if (i < 25) return 1.0 - (i / 25) * 0.35;
    if (i < 50) return 0.65 + ((i - 25) / 25) * 0.40;
    return 1.05 + ((i - 50) / 69) * 0.65;
  }
  if (pattern === 'fakebreakout') {
    if (i < 60) return 1.0;
    if (i < 75) return 1.0 + ((i - 60) / 15) * 0.18;
    return 1.18 - ((i - 75) / 44) * 0.35;
  }
  if (pattern === 'cup') {
    if (i < 80) return 1.0 - Math.sin((i / 80) * Math.PI) * 0.22;
    return 1.0 + ((i - 80) / 39) * 0.25;
  }
  return 1.0;
}

function volPath(pattern: string, i: number): number {
  if (pattern === 'breakout') {
    if (i < 60) return 0.5;
    if (i < 75) return 2.0;
    return 1.1;
  }
  if (pattern === 'doubletop') {
    if (i < 30) return 1.3;
    if (i < 50) return 0.7;
    if (i < 70) return 0.55;
    if (i < 95) return 1.6;
    return 1.3;
  }
  if (pattern === 'reversal') {
    if (i < 70) return 0.7;
    if (i < 85) return 2.2;
    return 1.2;
  }
  if (pattern === 'fakebreakout') {
    if (i < 60) return 0.6;
    if (i < 75) return 1.3;
    return 1.5;
  }
  if (pattern === 'cup') {
    if (i < 40) return 1.1;
    if (i < 70) return 0.6;
    return 1.4;
  }
  return 1.0;
}

export function generateChart(seed: number, pattern: string, startDate: string): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const rng = mulberry32(seed);
  const basePrice = 100 + (seed % 50);
  const baseDate = new Date(startDate);

  for (let i = 0; i < 120; i++) {
    const targetPrice = basePrice * pricePath(pattern, i);
    const noise = (rng() - 0.5) * 0.03;
    const close = targetPrice * (1 + noise);
    const vol = Math.floor(volPath(pattern, i) * 800000 * (0.85 + rng() * 0.3));
    const dt = new Date(baseDate);
    dt.setDate(dt.getDate() + i);
    data.push({
      day: i,
      date: dt.toISOString().slice(5, 10).replace('-', '/'),
      종가: +close.toFixed(2),
      거래량: vol,
      MA5: null,
      MA20: null,
      MA60: null,
      RSI: null,
    });
  }

  const sma = (idx: number, period: number): number | null => {
    if (idx < period - 1) return null;
    let sum = 0;
    for (let j = idx - period + 1; j <= idx; j++) sum += data[j].종가;
    return +(sum / period).toFixed(2);
  };

  const rsi = (idx: number): number | null => {
    const period = 14;
    if (idx < period) return null;
    let gains = 0, losses = 0;
    for (let j = idx - period + 1; j <= idx; j++) {
      const diff = data[j].종가 - data[j - 1].종가;
      if (diff > 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return +(100 - (100 / (1 + rs))).toFixed(1);
  };

  data.forEach((d, i) => {
    d.MA5 = sma(i, 5);
    d.MA20 = sma(i, 20);
    d.MA60 = sma(i, 60);
    d.RSI = rsi(i);
  });

  return data;
}
