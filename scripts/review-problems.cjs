#!/usr/bin/env node
/**
 * 문제 품질 검토·자동 수정 스크립트
 *
 * 검사 항목:
 *  A. 질문 과거완료형 동사 — "돌파하였다", "급등하였다" 등 결과 사전 서술
 *  B. 질문↔정답 방향 모순 — 질문이 상승 암시인데 답이 횡보·하락 (또는 반대)
 *  C. 선택지 문구 불일치   — choices[answer] 키워드가 실제 pct 방향과 불일치
 *
 * 사용법:
 *   node scripts/review-problems.cjs           # 문제 목록만 출력 (dry-run)
 *   node scripts/review-problems.cjs --fix     # Claude API로 텍스트 자동 수정
 *   ANTHROPIC_API_KEY=sk-... node scripts/review-problems.cjs --fix
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const APPLY_FIXES = process.argv.includes('--fix');
const DATA_DIR    = path.join(__dirname, '../public/data');
const HC_FILE     = path.join(__dirname, '../src/data/problems.handcrafted.ts');
const GEN_FILE    = path.join(__dirname, '../src/data/problems.generated.ts');
const API_KEY     = process.env.ANTHROPIC_API_KEY;

// ── 티커→CSV 파일명 ──────────────────────────────────────────────────────────
const TICKER_FILE = {
  '005930.KS':'005930.KS','051910.KS':'051910.KS','000660.KS':'000660.KS',
  '247540.KQ':'247540.KQ','011170.KS':'011170.KS','TSLA':'TSLA','NVDA':'NVDA',
  'BTC-USD':'BTC_USD','^GSPC':'GSPC','GSPC2007':'GSPC_2007','KS11':'KS11',
  'SSE':'SSE','IXIC':'IXIC','N225':'N225','GME':'GME','SEEGENE':'SEEGENE',
  'META':'META','035720.KS':'035720.KS','035420.KS':'035420.KS',
  '005380.KS':'005380.KS','AAPL':'AAPL','AMD':'AMD','GLD':'GLD',
  '086520.KQ':'086520.KQ','068270.KS':'068270.KS',
};

// ── CSV 파싱 (validate-problems.cjs와 동일) ──────────────────────────────────
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

// ── TS 파일 파싱 ─────────────────────────────────────────────────────────────
function loadProblems(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content
    .replace(/^import type .*$/gm, '')
    .replace(/: Problem\[\]/g, '')
    .replace(/export const \w+\s*=\s*/, 'return ');
  try { return new Function(content)(); }
  catch (e) { console.error(`파싱 실패 (${path.basename(file)}):`, e.message); return []; }
}

function toAnswer(pct) {
  if (pct >= 0.15) return 0;
  if (pct >= 0.05) return 1;
  if (pct > -0.05) return 2;
  return 3;
}

// ── A. 과거완료형 동사 감지 ───────────────────────────────────────────────────
const PAST_TENSE = [
  '돌파하였다', '돌파했다',
  '급등하였다', '급등했다',
  '폭등하였다', '폭등했다',
  '상승하였다', '상승했다',
  '하락하였다', '하락했다',
  '급락하였다', '급락했다',
  '폭락하였다', '폭락했다',
  '붕괴하였다', '붕괴했다',
  '돌파하고',   '상향 돌파하',
];

function detectPastTense(question) {
  return PAST_TENSE.filter(v => question.includes(v));
}

// ── B. 질문 방향↔정답 모순 감지 ──────────────────────────────────────────────
const Q_UP_SIGNALS   = ['돌파', '급등', '폭등', '강하게 상승', '크게 상승', '신고가', '강세를 보이'];
const Q_DOWN_SIGNALS = ['급락', '폭락', '붕괴', '강하게 하락', '급격히 하락'];

function detectDirectionContradiction(question, answer) {
  const hasUp   = Q_UP_SIGNALS.some(s => question.includes(s));
  const hasDown = Q_DOWN_SIGNALS.some(s => question.includes(s));
  const isDownAnswer = answer === 2 || answer === 3; // 횡보·하락
  const isUpAnswer   = answer === 0 || answer === 1; // 급등·상승

  if (hasUp && !hasDown && isDownAnswer)
    return `질문 상승 암시(${Q_UP_SIGNALS.find(s => question.includes(s))}) ↔ 정답 ${['급등','상승','횡보','하락'][answer]}`;
  if (hasDown && !hasUp && isUpAnswer)
    return `질문 하락 암시(${Q_DOWN_SIGNALS.find(s => question.includes(s))}) ↔ 정답 ${['급등','상승','횡보','하락'][answer]}`;
  return null;
}

// ── C. 선택지 문구↔실제 pct 불일치 감지 (HC만) ────────────────────────────────
const UP_KW   = ['급등','폭등','상승','오른다','강하게','회복','반등','추세 가속','신고가','전환된다'];
const DOWN_KW = ['하락','급락','폭락','하락한다','빠진다','이탈','추가 급락','가속화'];
const FLAT_KW = ['횡보','유지','박스','지속된다','눌림','숨 고르기','완만','점진적'];

function detectChoiceMismatch(choices, answer, actualPct) {
  if (!Array.isArray(choices) || answer === undefined || answer >= choices.length) return null;
  const text = choices[answer];
  if (!text) return '선택지 텍스트 없음';

  const expectUp   = actualPct >= 0.05;
  const expectDown = actualPct <= -0.05;
  const expectFlat = !expectUp && !expectDown;

  if (expectUp   && !UP_KW.some(k => text.includes(k)))   return `choices[${answer}]='${text}' — 실제 +${(actualPct*100).toFixed(0)}%인데 상승 키워드 없음`;
  if (expectDown && !DOWN_KW.some(k => text.includes(k)))  return `choices[${answer}]='${text}' — 실제 ${(actualPct*100).toFixed(0)}%인데 하락 키워드 없음`;
  if (expectFlat && !FLAT_KW.some(k => text.includes(k)))  return `choices[${answer}]='${text}' — 실제 ${(actualPct*100).toFixed(0)}%인데 횡보 키워드 없음`;
  return null;
}

// ── Claude API를 이용한 질문 재작성 ──────────────────────────────────────────
async function rewriteQuestion(p, issues, actualPct) {
  if (!API_KEY) return null;

  const answerLabel = ['급등(+15%+)','상승(+5~15%)','횡보(±5%)','하락(-5%이하)'][p.answer];
  const pctStr = (actualPct >= 0 ? '+' : '') + (actualPct * 100).toFixed(1) + '%';
  const macroStr = (p.macroHints || []).map(h => `${h.label}: ${h.value} (${h.trend})`).join('\n');

  const prompt = `너는 주식 차트 퀴즈 문제의 질문을 수정하는 편집자다.

[문제 정보]
- 종목: ${p.ticker} (${p.market})
- 차트 패턴: ${p.pattern}
- 정답: ${answerLabel} (실제 ${pctStr})
- 매크로 힌트:
${macroStr}

[현재 질문 (문제 있음)]
"${p.question}"

[발견된 문제]
${issues.join('\n')}

[수정 원칙]
1. revealDay 시점 차트에서 '관찰 가능한 것'만 서술 — "~하고 있다", "~에 있다", "~이다", "~되고 있다"
2. 결과를 사전에 서술하는 완료형 금지 — "~하였다", "~했다", "~돌파하였다" 금지
3. 매크로 이유는 현재 상황 맥락만 — "코로나 부양책으로 실질금리가 마이너스 수준이다" 형태
4. 정답 방향을 암시하는 키워드 금지 — 상승 암시(돌파·급등)와 하락 암시(붕괴·급락) 모두 금지
5. 1~2문장, 간결하게
6. 반드시 "N개월 후 결과로 옳은 것은?" 또는 "N개월 후 주가의 흐름으로 옳은 것은?" 등 원본 결말 문장으로 끝낼 것

수정된 질문 텍스트만 출력하라. 따옴표·설명·번호 없음.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) { console.error('API 오류:', res.status, await res.text()); return null; }
    const data = await res.json();
    return data.content?.[0]?.text?.trim() ?? null;
  } catch (e) {
    console.error('API 호출 실패:', e.message);
    return null;
  }
}

// ── HC 파일에서 특정 ID의 question 필드를 교체 ────────────────────────────────
function applyQuestionFix(hcContent, problemId, oldQuestion, newQuestion) {
  // 해당 id 블록 내의 question 필드만 교체 (id 기반으로 범위 특정)
  const escapedOld = oldQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(id:\\s*${problemId}[\\s\\S]*?question:\\s*')[^']*(')`);
  const replaced = hcContent.replace(pattern, (match, pre, post) => {
    return `${pre}${newQuestion}${post}`;
  });
  if (replaced === hcContent) {
    // Fallback: 단순 문자열 치환
    return hcContent.replace(
      `question: '${oldQuestion}'`,
      `question: '${newQuestion}'`,
    );
  }
  return replaced;
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  const handcrafted = loadProblems(HC_FILE);
  const generated   = loadProblems(GEN_FILE);
  const LAST_HC_ID  = Math.max(...handcrafted.map(p => p.id));

  console.log(`\n🔍 문제 품질 검토`);
  console.log(`   HC ${handcrafted.length}개 + GEN ${generated.length}개 = 총 ${handcrafted.length + generated.length}개`);
  console.log(`   모드: ${APPLY_FIXES ? (API_KEY ? '✅ --fix (자동수정)' : '⚠️  --fix (API키 없음, 텍스트 수정 스킵)') : '📋 dry-run (목록만 출력)'}\n`);

  const csvCache = {};
  const issues   = [];   // { id, source, p, reasons, actualPct }
  let checkCount = 0;

  for (const p of [...handcrafted, ...generated]) {
    const source = p.id <= LAST_HC_ID ? 'HC' : 'GEN';
    const fname  = TICKER_FILE[p.ticker] ?? p.ticker;
    const fp     = path.join(DATA_DIR, `${fname}.csv`);
    if (!fs.existsSync(fp)) continue;

    if (!csvCache[fname]) csvCache[fname] = parseCSV(fp);
    const rows = csvCache[fname];

    const startIdx = rows.findIndex(r => r.date >= p.startDate);
    if (startIdx === -1) continue;

    const revealDay = p.revealDay ?? 126;
    const chartDays = p.chartDays ?? 147;
    const revealIdx = startIdx + revealDay - 1;
    const endIdx    = startIdx + chartDays - 1;
    if (endIdx >= rows.length || revealIdx >= rows.length) continue;

    const actualPct = (rows[endIdx].close - rows[revealIdx].close) / rows[revealIdx].close;
    checkCount++;

    const reasons = [];

    // ── A. 과거완료형 동사 (HC만: GEN 템플릿은 이미 수정됨) ────────────────
    if (source === 'HC') {
      const pastHits = detectPastTense(p.question);
      if (pastHits.length) reasons.push(`A. 과거완료형: "${pastHits.join('", "')}"`);
    }

    // ── B. 질문↔정답 방향 모순 (HC + GEN) ───────────────────────────────────
    const contradiction = detectDirectionContradiction(p.question, p.answer);
    if (contradiction) reasons.push(`B. 방향 모순: ${contradiction}`);

    // ── C. 선택지 문구 불일치 (HC만: GEN은 validate-problems.cjs 담당) ─────
    if (source === 'HC') {
      const mismatch = detectChoiceMismatch(p.choices, p.answer, actualPct);
      if (mismatch) reasons.push(`C. 선택지: ${mismatch}`);
    }

    if (reasons.length) {
      issues.push({ id: p.id, source, p, reasons, actualPct });
      const label = ['급등','상승','횡보','하락'][p.answer];
      const pctStr = (actualPct >= 0 ? '+' : '') + (actualPct * 100).toFixed(1) + '%';
      console.log(`[ID ${String(p.id).padStart(3)} ${source}] ${p.ticker} / answer=${label}(${pctStr})`);
      for (const r of reasons) console.log(`  └ ${r}`);
      console.log(`  질문: "${p.question}"`);
      console.log();
    }
  }

  // ── 요약 ────────────────────────────────────────────────────────────────────
  console.log('='.repeat(60));
  console.log(`검사 완료: ${checkCount}개`);
  console.log(`이슈 발견: ${issues.length}개`);
  const aCount = issues.filter(i => i.reasons.some(r => r.startsWith('A.'))).length;
  const bCount = issues.filter(i => i.reasons.some(r => r.startsWith('B.'))).length;
  const cCount = issues.filter(i => i.reasons.some(r => r.startsWith('C.'))).length;
  if (aCount) console.log(`  A. 과거완료형 동사:     ${aCount}건`);
  if (bCount) console.log(`  B. 질문↔정답 방향 모순: ${bCount}건`);
  if (cCount) console.log(`  C. 선택지 문구 불일치:  ${cCount}건`);

  if (!APPLY_FIXES) {
    if (issues.length) console.log(`\n수정하려면: node scripts/review-problems.cjs --fix`);
    return;
  }

  // ── 자동 수정 단계 ────────────────────────────────────────────────────────
  const textFixNeeded = issues.filter(i =>
    i.source === 'HC' && i.reasons.some(r => r.startsWith('A.') || r.startsWith('B.')),
  );

  if (!textFixNeeded.length) {
    console.log('\n질문 텍스트 수정 대상 없음.');
    return;
  }

  if (!API_KEY) {
    console.log('\n⚠️  ANTHROPIC_API_KEY 환경변수가 없습니다. 텍스트 자동 수정을 건너뜁니다.');
    console.log('   export ANTHROPIC_API_KEY=sk-... 후 재실행하세요.');
  } else {
    console.log(`\n🤖 Claude API로 질문 텍스트 자동 수정 (${textFixNeeded.length}개)...\n`);

    let hcContent = fs.readFileSync(HC_FILE, 'utf8');
    let fixedCount = 0;

    for (const item of textFixNeeded) {
      const { p, reasons, actualPct } = item;
      process.stdout.write(`  ID ${p.id} (${p.ticker}) 수정 중... `);

      const newQuestion = await rewriteQuestion(p, reasons, actualPct);
      if (!newQuestion || newQuestion === p.question) {
        console.log('변경 없음 (스킵)');
        continue;
      }

      const updated = applyQuestionFix(hcContent, p.id, p.question, newQuestion);
      if (updated === hcContent) {
        console.log('❌ 교체 실패 (수동 확인 필요)');
        console.log(`     기존: "${p.question}"`);
        console.log(`     제안: "${newQuestion}"`);
      } else {
        hcContent = updated;
        fixedCount++;
        console.log('✅');
        console.log(`     기존: "${p.question}"`);
        console.log(`     수정: "${newQuestion}"`);
      }

      // API rate limit 방지 (0.3초 대기)
      await new Promise(r => setTimeout(r, 300));
    }

    if (fixedCount > 0) {
      fs.writeFileSync(HC_FILE, hcContent, 'utf8');
      console.log(`\n✅ ${fixedCount}개 수정 저장 → ${HC_FILE}`);
      console.log('   npm run validate 실행을 권장합니다.');
    } else {
      console.log('\n변경된 항목 없음.');
    }
  }

  // ── C. 선택지 문구 불일치: 자동 수정 불가 (수동 확인 필요) ──────────────────
  const cIssues = issues.filter(i => i.reasons.some(r => r.startsWith('C.')));
  if (cIssues.length) {
    console.log(`\n⚠️  선택지 문구 불일치 ${cIssues.length}건은 자동 수정 불가 — 수동 검토 필요:`);
    for (const item of cIssues) {
      const r = item.reasons.find(r => r.startsWith('C.'));
      console.log(`  ID ${item.id} (${item.p.ticker}): ${r}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
