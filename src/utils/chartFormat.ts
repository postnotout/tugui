import type { Problem } from '../types';

export type PriceUnit = '원' | '$' | 'pt';

export function getPriceUnit(problem: Problem): PriceUnit {
  const ticker = problem.ticker;
  if (ticker.endsWith('.KS') || ticker.endsWith('.KQ') || ticker === 'KS11' || ticker === 'SEEGENE') return '원';
  if (ticker.startsWith('^') || ['GSPC2007', 'IXIC', 'N225', 'SSE'].includes(ticker)) return 'pt';
  return '$';
}

export function formatPrice(value: number, unit: PriceUnit) {
  const rounded = Math.round(value).toLocaleString();
  if (unit === '$') return `$${rounded}`;
  return `${rounded}${unit}`;
}

function niceNum(range: number, round: boolean) {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction: number;

  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }

  return niceFraction * Math.pow(10, exponent);
}

export function getNicePriceScale(min: number, max: number, tickCount = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] };
  }

  const range = niceNum(max - min, false);
  const step = niceNum(range / Math.max(tickCount - 1, 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];

  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    ticks.push(Math.round(v));
  }

  return { min: niceMin, max: niceMax, ticks };
}

function compact(value: number, divisor: number, suffix: string) {
  const n = value / divisor;
  const digits = n >= 100 ? 0 : n >= 10 ? 1 : 1;
  return `${n.toFixed(digits).replace(/\.0$/, '')}${suffix}`;
}

export function formatVolume(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1_000_000_000) return compact(value, 1_000_000_000, 'B');
  if (value >= 1_000_000) return compact(value, 1_000_000, 'M');
  if (value >= 1_000) return compact(value, 1_000, 'K');
  return Math.round(value).toLocaleString();
}
