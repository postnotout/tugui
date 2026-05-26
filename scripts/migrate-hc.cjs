#!/usr/bin/env node
/**
 * HC 문제 마이그레이션: 구 4분류(급등/상승/횡보/하락) → 신 4분류(상승/횡보/하락/급락)
 * 1. answer 재매핑
 * 2. choices 재작성 (패턴 기반)
 * 3. explanation / reveal.result 텍스트 레이블 교체
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const HC_FILE  = path.join(__dirname, '../src/data/problems.handcrafted.ts');
const DATA_DIR = path.join(__dirname, '../public/data');

// ── 새 toAnswer ──────────────────────────────────────────────────────────────
function toAnswer(pct) {
  if (pct >= 0.05)  return 0; // 상승
  if (pct > -0.05)  return 1; // 횡보
  if (pct > -0.15)  return 2; // 하락
  return 3;                   // 급락
}

const ANSWER_LABEL = ['상승', '횡보', '하락', '급락'];

// ── 패턴별 신규 choices (0=상승, 1=횡보, 2=하락, 3=급락) ──────────────────────
function getChoices(pattern) {
  switch (pattern) {
    case 'breakout':
      return ['돌파에 성공하여 강한 상승 추세가 지속된다', '가짜 돌파 후 박스권으로 재진입한다', '돌파에 실패하고 되돌림 하락이 나타난다', '돌파 실패 후 매도세가 몰리며 급락한다'];
    case 'reversal':
      return ['강하게 반등하여 추세가 전환된다', '단기 반등 후 재차 눌리며 횡보한다', '반등이 실패하고 하락이 재개된다', '반등에 실패하고 추가 급락한다'];
    case 'uptrend':
      return ['추세를 유지하며 추가 상승이 이어진다', '상승 피로로 횡보하며 숨 고르기를 한다', '추세가 꺾이고 조정이 나타난다', '추세가 급격히 역전되며 큰 폭으로 하락한다'];
    case 'downtrend':
      return ['강하게 반등하여 추세가 역전된다', '하락이 감속되어 바닥을 다진다', '하락이 지속되며 추가 조정이 나타난다', '하락이 가속화되어 급락이 이어진다'];
    case 'doubletop':
      return ['고점 저항을 돌파하여 상승이 지속된다', '쌍봉 부근에서 방향성 없이 횡보한다', '쌍봉 패턴이 확인되며 하락한다', '쌍봉 패턴이 완성되어 급격히 하락한다'];
    case 'breakdown':
      return ['저점 매수세가 강하게 유입되어 반등한다', '붕괴 이후 방향성 없이 횡보한다', '붕괴 이후 완만한 추가 하락이 이어진다', '붕괴 이후 패닉 매도로 급락이 가속된다'];
    case 'parabolic':
      return ['상승 모멘텀이 유지되며 추가 상승이 이어진다', '급등 이후 이격 해소로 횡보한다', '포물선 상승이 꺾이며 되돌림 하락이 나타난다', '과열이 급격히 해소되며 큰 폭으로 급락한다'];
    case 'sideways':
    default:
      return ['박스권 상단을 돌파하여 상승이 이어진다', '박스권이 지속된다', '하단을 이탈하여 하락한다', '하단을 이탈하며 급락이 가속된다'];
  }
}

// ── CSV 파싱 ──────────────────────────────────────────────────────────────────
const TICKER_FILE = {
  '005930.KS':'005930.KS','051910.KS':'051910.KS','000660.KS':'000660.KS',
  '247540.KQ':'247540.KQ','011170.KS':'011170.KS','TSLA':'TSLA','NVDA':'NVDA',
  'BTC-USD':'BTC_USD','^GSPC':'GSPC','GSPC2007':'GSPC_2007','KS11':'KS11',
  'SSE':'SSE','IXIC':'IXIC','N225':'N225','GME':'GME','SEEGENE':'SEEGENE',
  'META':'META','035720.KS':'035720.KS','035420.KS':'035420.KS',
  '005380.KS':'005380.KS','AAPL':'AAPL','AMD':'AMD','GLD':'GLD',
  '086520.KQ':'086520.KQ','068270.KS':'068270.KS',
};
function parseCSV(fp) {
  return fs.readFileSync(fp, 'utf8').trim().split('\n').slice(1).map(line => {
    const p = line.split(',');
    return { date: p[0].trim(), close: parseFloat(p[4]) };
  }).filter(r => !isNaN(r.close));
}
const csvCache = {};
function getActualPct(ticker, startDate, revealDay, chartDays) {
  const fname = TICKER_FILE[ticker] ?? ticker;
  if (!csvCache[fname]) {
    const fp = path.join(DATA_DIR, `${fname}.csv`);
    if (!fs.existsSync(fp)) return null;
    csvCache[fname] = parseCSV(fp);
  }
  const rows = csvCache[fname];
  const si = rows.findIndex(r => r.date >= startDate);
  if (si === -1) return null;
  const ri = si + revealDay - 1;
  const ei = si + chartDays - 1;
  if (ei >= rows.length) return null;
  return (rows[ei].close - rows[ri].close) / rows[ri].close;
}

// ── HC 파일 파싱 (정규식 기반) ────────────────────────────────────────────────
function loadProblems(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/^import type .*$/gm, '').replace(/: Problem\[\]/g, '').replace(/export const \w+\s*=\s*/, 'return ');
  return new Function(content)();
}

// ── 직렬화 ────────────────────────────────────────────────────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

function serializeProblem(p) {
  const mh = p.macroHints.map(h =>
    `      { label: '${esc(h.label)}', value: '${esc(h.value)}', trend: '${esc(h.trend)}', tone: '${h.tone}' }`
  ).join(',\n');
  const ch = p.choices.map(c => `      '${esc(c)}'`).join(',\n');

  const vhLines = (p.valuationHints || []).map(v =>
    `      { label: '${esc(v.label)}', value: '${esc(v.value)}', context: '${esc(v.context)}', tone: '${v.tone}' }`
  ).join(',\n');
  const vhBlock = vhLines ? `\n    valuationHints: [\n${vhLines},\n    ],` : '';

  const tutProp = p.isTutorial ? `\n    isTutorial: true,` : '';

  return `  {
    id: ${p.id}, market: '${p.market}', ticker: '${esc(p.ticker)}', pattern: '${p.pattern}',${tutProp}
    revealDay: ${p.revealDay ?? 126}, chartDays: ${p.chartDays ?? 147}, difficulty: '${p.difficulty}',
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
      title: '${esc(p.reveal.title)}',
      market: '${esc(p.reveal.market)}',
      period: '${esc(p.reveal.period)}',
      result: '${esc(p.reveal.result)}',
      macro: '${esc(p.reveal.macro)}',
      lesson: '${esc(p.reveal.lesson)}',
    },
  }`;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
const OLD_LABELS = ['급등', '상승', '횡보', '하락'];

const problems = loadProblems(HC_FILE);
let changed = 0;

const migrated = problems.map(p => {
  const pct = getActualPct(p.ticker, p.startDate, p.revealDay ?? 126, p.chartDays ?? 147);
  const newAnswer = pct !== null ? toAnswer(pct) : (() => {
    // pct 계산 실패 시 구 answer 재매핑으로 대체
    if (p.answer === 0 || p.answer === 1) return 0;
    if (p.answer === 2) return 1;
    return 2; // 구 하락 → 하락 (급락 판별 불가)
  })();

  const newChoices = getChoices(p.pattern);

  // explanation & reveal.result 텍스트에서 구 레이블 교체
  let newExplanation = p.explanation;
  let newResult = p.reveal.result;
  const oldLbl = OLD_LABELS[p.answer];   // 구 레이블
  const newLbl = ANSWER_LABEL[newAnswer]; // 신 레이블

  if (oldLbl !== newLbl) {
    newExplanation = newExplanation.replace(oldLbl, newLbl);
    newResult = newResult.replace(oldLbl, newLbl);
  }

  if (p.answer !== newAnswer ||
      JSON.stringify(p.choices) !== JSON.stringify(newChoices) ||
      newExplanation !== p.explanation || newResult !== p.reveal.result) {
    changed++;
    console.log(`  [ID ${p.id}] ${p.ticker} answer: ${p.answer}(${OLD_LABELS[p.answer]}) → ${newAnswer}(${ANSWER_LABEL[newAnswer]}) pct=${pct !== null ? ((pct*100).toFixed(1)+'%') : 'N/A'}`);
  }

  return {
    ...p,
    answer: newAnswer,
    choices: newChoices,
    explanation: newExplanation,
    reveal: { ...p.reveal, result: newResult },
  };
});

const ts = `import type { Problem } from '../types';

export const HANDCRAFTED_PROBLEMS: Problem[] = [
${migrated.map(serializeProblem).join(',\n')}
];
`;

fs.writeFileSync(HC_FILE, ts, 'utf8');
console.log(`\n✅ HC 마이그레이션 완료: ${changed}개 변경 → ${HC_FILE}`);
