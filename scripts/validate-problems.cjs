#!/usr/bin/env node
/**
 * 문제 검증 스크립트
 * 모든 핸드크래프트·생성 문제의 answer/choices/explanation이
 * 실제 CSV 데이터와 일치하는지 검증한다.
 *
 * 검증 항목:
 *  ① answer 정확성   — CSV 실제 pct로 계산한 answer == 저장된 answer?
 *  ② choices 일관성  — choices[answer] 텍스트가 실제 pct 방향과 일치?
 *  ③ reveal.result   — 결과 문구가 상승/하락 방향과 모순이 없는지?
 *  ④ 데이터 충분성   — startDate + chartDays 범위가 CSV에 존재하는지?
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../public/data');
const HC_FILE  = path.join(__dirname, '../src/data/problems.handcrafted.ts');
const GEN_FILE = path.join(__dirname, '../src/data/problems.generated.ts');

const TICKER_FILE = {
  '005930.KS':'005930.KS','051910.KS':'051910.KS','000660.KS':'000660.KS',
  '247540.KQ':'247540.KQ','011170.KS':'011170.KS','TSLA':'TSLA','NVDA':'NVDA',
  'BTC-USD':'BTC_USD','^GSPC':'GSPC','GSPC2007':'GSPC_2007','KS11':'KS11',
  'SSE':'SSE','IXIC':'IXIC','N225':'N225','GME':'GME','SEEGENE':'SEEGENE',
  'META':'META','035720.KS':'035720.KS','035420.KS':'035420.KS',
  '005380.KS':'005380.KS','AAPL':'AAPL','AMD':'AMD','GLD':'GLD',
  '086520.KQ':'086520.KQ','068270.KS':'068270.KS',
};

// ---------- CSV 파싱 ----------
function parseCSV(fp) {
  const lines = fs.readFileSync(fp, 'utf8').trim().split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(',');
    if (p.length < 5) continue;
    const c = parseFloat(p[4]);
    if (isNaN(c) || c <= 0) continue;
    rows.push({ date: p[0].trim(), close: c });
  }
  return rows;
}

// ---------- TypeScript 문제 파일 파싱 ----------
function loadProblems(file) {
  let content = fs.readFileSync(file, 'utf8');
  // TypeScript 전용 구문 제거
  content = content
    .replace(/^import type .*$/gm, '')
    .replace(/: Problem\[\]/g, '')
    .replace(/export const \w+\s*=\s*/, 'return ');
  try {
    return new Function(content)();
  } catch (e) {
    console.error(`파일 파싱 실패 (${path.basename(file)}):`, e.message);
    return [];
  }
}

// ---------- 정답 계산 (0=상승, 1=횡보, 2=하락, 3=급락) ----------
function toAnswer(pct) {
  if (pct >= 0.05)  return 0; // 상승
  if (pct > -0.05)  return 1; // 횡보
  if (pct > -0.15)  return 2; // 하락
  return 3;                   // 급락
}

const ANSWER_LABEL = ['상승', '횡보', '하락', '급락'];

// ---------- choices 텍스트 방향성 키워드 ----------
const UP_KW    = ['상승', '급등', '폭등', '오른다', '강하게', '회복', '반등', '추세 가속', '신고가', '전환된다'];
const DOWN_KW  = ['하락', '급락', '폭락', '하락한다', '빠진다', '이탈', '가속된다'];
const STEEP_KW = ['급락', '폭락', '급격히', '가속된다', '패닉'];
const FLAT_KW  = ['횡보', '유지', '박스', '지속된다', '눌림', '숨 고르기', '완만', '점진적'];

function choiceMatchesPct(choiceText, pct) {
  if (pct >= 0.05) {
    return UP_KW.some(k => choiceText.includes(k));
  } else if (pct <= -0.15) {
    return STEEP_KW.some(k => choiceText.includes(k)) || DOWN_KW.some(k => choiceText.includes(k));
  } else if (pct <= -0.05) {
    return DOWN_KW.some(k => choiceText.includes(k));
  } else {
    return FLAT_KW.some(k => choiceText.includes(k));
  }
}

// ---------- 메인 ----------
const handcrafted = loadProblems(HC_FILE);
const generated   = loadProblems(GEN_FILE);
const allProblems = [...handcrafted, ...generated];

console.log(`\n📋 검증 대상: 핸드크래프트 ${handcrafted.length}개 + 생성 ${generated.length}개 = 총 ${allProblems.length}개\n`);

let totalIssues = 0;
let csvErrors = 0;
let answerErrors = 0;
let choiceErrors = 0;
let resultErrors = 0;
let dataErrors = 0;

const csvCache = {};
const LAST_HC_ID = Math.max(...handcrafted.map(p => p.id));

for (const p of allProblems) {
  const source = p.id <= LAST_HC_ID ? 'HC' : 'GEN';
  const fname = TICKER_FILE[p.ticker] ?? p.ticker;
  const fp = path.join(DATA_DIR, `${fname}.csv`);

  // ④ CSV 파일 존재 확인
  if (!fs.existsSync(fp)) {
    console.log(`[ID ${String(p.id).padStart(3)} ${source}] ❌ CSV 없음: ${fname}.csv`);
    csvErrors++;
    totalIssues++;
    continue;
  }

  if (!csvCache[fname]) csvCache[fname] = parseCSV(fp);
  const rows = csvCache[fname];

  const startIdx = rows.findIndex(r => r.date >= p.startDate);
  if (startIdx === -1) {
    console.log(`[ID ${String(p.id).padStart(3)} ${source}] ❌ startDate ${p.startDate} CSV에 없음 (${p.ticker})`);
    dataErrors++;
    totalIssues++;
    continue;
  }

  const revealDay  = p.revealDay  ?? 126;
  const chartDays  = p.chartDays  ?? 147;
  const revealIdx  = startIdx + revealDay - 1;
  const endIdx     = startIdx + chartDays - 1;

  // ④ 데이터 충분성
  if (revealIdx >= rows.length || endIdx >= rows.length) {
    console.log(`[ID ${String(p.id).padStart(3)} ${source}] ❌ 데이터 부족: 필요=${endIdx+1}행, 실제=${rows.length}행 (${p.ticker}/${p.startDate})`);
    dataErrors++;
    totalIssues++;
    continue;
  }

  const revealClose = rows[revealIdx].close;
  const endClose    = rows[endIdx].close;
  const actualPct   = (endClose - revealClose) / revealClose;
  const actualAns   = toAnswer(actualPct);
  const pctStr      = (actualPct >= 0 ? '+' : '') + (actualPct * 100).toFixed(1) + '%';

  const problemIssues = [];
  const correctChoice = Array.isArray(p.choices) ? p.choices[p.answer] : null;

  // ① answer 정확성 (HC: choices 방향 검증, GEN: 표준 index 검증)
  if (source === 'HC') {
    if (!correctChoice || !choiceMatchesPct(correctChoice, actualPct)) {
      problemIssues.push(
        `① choices[${p.answer}]='${correctChoice || '(없음)'}' 방향 불일치 [pct=${pctStr}]`
      );
      answerErrors++;
    }
  } else {
    if (actualAns !== p.answer) {
      problemIssues.push(
        `① answer: stored=${p.answer}(${ANSWER_LABEL[p.answer]}) vs actual=${actualAns}(${ANSWER_LABEL[actualAns]}) [pct=${pctStr}]`
      );
      answerErrors++;
    }
  }

  // ③ reveal.result 텍스트 방향 일관성
  const resultText = (p.reveal && p.reveal.result) ? p.reveal.result : '';
  if (resultText) {
    const hasUp   = UP_KW.some(k => resultText.includes(k));
    const hasDown = DOWN_KW.some(k => resultText.includes(k));
    if (actualPct >= 0.05 && hasDown && !hasUp) {
      problemIssues.push(`③ reveal.result='${resultText}' → 실제 상승(${pctStr})인데 하락 표기`);
      resultErrors++;
    } else if (actualPct <= -0.05 && hasUp && !hasDown) {
      problemIssues.push(`③ reveal.result='${resultText}' → 실제 하락(${pctStr})인데 상승 표기`);
      resultErrors++;
    }
  }

  if (problemIssues.length > 0) {
    console.log(`[ID ${String(p.id).padStart(3)} ${source}] ${p.ticker} / ${p.startDate}`);
    problemIssues.forEach(iss => console.log(`    → ${iss}`));
    totalIssues += problemIssues.length;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`검증 결과:`);
console.log(`  ① answer/방향 오류: ${answerErrors}건`);
console.log(`  ③ result 텍스트:    ${resultErrors}건`);
console.log(`  CSV/데이터 오류:    ${csvErrors + dataErrors}건`);
console.log(`  총 이슈:            ${totalIssues}건`);

if (totalIssues === 0) {
  console.log('\n✅ 모든 문제 검증 통과');
} else {
  console.log(`\n❌ ${totalIssues}개 이슈 발견 — node scripts/update-handcrafted.cjs 실행 후 재검증 권장`);
  process.exit(1);
}
