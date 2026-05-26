#!/usr/bin/env node
/**
 * GEN 문제 품질 향상 스크립트 (Claude API 후처리)
 *
 * 역할:
 *   generate-problems.cjs가 생성한 problems.generated.ts를 읽어
 *   각 문제마다 Claude API를 호출해 question / explanation /
 *   valuationHints / lesson 을 역사적 맥락이 담긴 고품질 텍스트로 교체한다.
 *
 * 사용법:
 *   ANTHROPIC_API_KEY=sk-... node scripts/enrich-generated.cjs
 *   ANTHROPIC_API_KEY=sk-... node scripts/enrich-generated.cjs --force   # 캐시 무시
 *   ANTHROPIC_API_KEY=sk-... node scripts/enrich-generated.cjs --id 56   # 특정 ID만
 *   ANTHROPIC_API_KEY=sk-... node scripts/enrich-generated.cjs --dry-run # API 없이 캐시만
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const GEN_FILE    = path.join(__dirname, '../src/data/problems.generated.ts');
const CACHE_FILE  = path.join(__dirname, '../src/data/enrichment-cache.json');
const API_KEY     = process.env.ANTHROPIC_API_KEY;

const FORCE    = process.argv.includes('--force');
const DRY_RUN  = process.argv.includes('--dry-run');
const ID_ARG   = (() => { const i = process.argv.indexOf('--id'); return i !== -1 ? parseInt(process.argv[i + 1]) : null; })();
const DELAY_MS = 400;

// ---------- TS 파싱 ----------
function loadProblems(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content
    .replace(/^import type .*$/gm, '')
    .replace(/: Problem\[\]/g, '')
    .replace(/export const \w+\s*=\s*/, 'return ');
  try { return new Function(content)(); }
  catch (e) { console.error('파싱 실패:', e.message); process.exit(1); }
}

// ---------- 캐시 ----------
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); }
    catch { return {}; }
  }
  return {};
}
function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

// ---------- Claude API ----------
async function callClaude(prompt) {
  if (!API_KEY) return null;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    console.error('API 오류:', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? null;
}

// ---------- 프롬프트 생성 ----------
function buildPrompt(p) {
  const ANSWER_LABEL = ['급등(+15%+)', '상승(+5~15%)', '횡보(±5%)', '하락(-5% 이하)'];
  const macroStr = (p.macroHints || [])
    .map(h => `  · ${h.label}: ${h.value} (${h.trend}, ${h.tone})`)
    .join('\n');

  // reveal.result에서 퍼센트 추출
  const pctMatch = p.reveal?.result?.match(/([+-]?\d+(\.\d+)?%)/);
  const pctStr   = pctMatch ? pctMatch[1] : '?%';

  return `너는 주식·지수 차트 퀴즈 문제 편집자다. 아래 문제의 텍스트를 역사적 맥락이 담긴 고품질 한국어로 재작성해야 한다.

[문제 정보]
- 종목: ${p.ticker} (${p.market})
- 기간: ${p.startDate} 시작, 이후 1개월 결과 포함
- 차트 패턴: ${p.pattern}
- 정답: ${ANSWER_LABEL[p.answer]}
- 실제 결과: ${p.reveal?.result ?? pctStr}
- 매크로 환경:
${macroStr}
- 현재 question: "${p.question}"
- 현재 explanation: "${p.explanation}"

[재작성 원칙]
1. question: revealDay 시점(과거 6개월 차트 끝)에서 관찰 가능한 것만 현재형으로 서술. 결과 암시 금지. 1~2문장 + "N개월 후 결과로 옳은 것은?" 형식. 종목 이름 언급 가능.
2. explanation: 인과관계(패턴 + 매크로/이벤트 → 결과) 구체적 역사 언급 포함. "1개월 뒤 {급등|상승|횡보|하락} (${pctStr})." 로 끝낼 것. ~60자.
3. valuationHints: 2개만 생성. 첫째는 당시 밸류에이션 지표(PER, PBR, CAPE, EV/매출, 부채비율 중 적합한 것), 둘째는 시장 컨센서스(당시 분위기 한 문장). tone은 cheap/fair/expensive/neutral 중 택1.
4. lesson: 이 문제에서 배울 수 있는 투자 원칙 한 문장. 구체적이고 기억에 남을 것. ~35자.

[반드시 아래 JSON만 출력 — 설명·마크다운 없음]
{
  "question": "...",
  "explanation": "...",
  "valuationHints": [
    {"label": "...", "value": "...", "context": "...", "tone": "cheap|fair|expensive|neutral"},
    {"label": "시장 컨센서스", "value": "...", "context": "...", "tone": "cheap|fair|expensive|neutral"}
  ],
  "lesson": "..."
}`;
}

// ---------- JSON 파싱 (LLM 출력 허용적으로) ----------
function parseJSON(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); }
  catch { return null; }
}

// ---------- 직렬화 ----------
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function strProp(k, v) { return `    ${k}: '${esc(v)}'`; }

function serializeProblem(p) {
  const mh = (p.macroHints || []).map(h =>
    `      { label: '${esc(h.label)}', value: '${esc(h.value)}', trend: '${esc(h.trend)}', tone: '${h.tone}' }`
  ).join(',\n');
  const ch = (p.choices || []).map(c => `      '${esc(c)}'`).join(',\n');

  let vhBlock = '';
  if (p.valuationHints && p.valuationHints.length > 0) {
    const vh = p.valuationHints.map(v =>
      `      { label: '${esc(v.label)}', value: '${esc(v.value)}', context: '${esc(v.context)}', tone: '${v.tone}' }`
    ).join(',\n');
    vhBlock = `\n    valuationHints: [\n${vh},\n    ],`;
  }

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

function writeGenerated(problems) {
  const ts = `import type { Problem } from '../types';

// 자동 생성 문제 (scripts/generate-problems.js → scripts/enrich-generated.cjs)
// 강화일: ${new Date().toISOString().slice(0, 10)}
// 총 ${problems.length}개
export const GENERATED_PROBLEMS: Problem[] = [
${problems.map(serializeProblem).join(',\n')}
];
`;
  fs.writeFileSync(GEN_FILE, ts, 'utf8');
}

// ---------- 메인 ----------
async function main() {
  console.log('\n🔧 GEN 문제 품질 강화 (Claude API 후처리)');

  if (!API_KEY && !DRY_RUN) {
    console.error('⚠️  ANTHROPIC_API_KEY 환경변수가 없습니다.');
    console.error('   export ANTHROPIC_API_KEY=sk-... 후 재실행하세요.');
    console.error('   캐시 적용만 하려면: node scripts/enrich-generated.cjs --dry-run');
    process.exit(1);
  }

  const problems = loadProblems(GEN_FILE);
  const cache    = loadCache();
  console.log(`   GEN 문제: ${problems.length}개`);
  console.log(`   캐시:     ${Object.keys(cache).length}개`);
  console.log(`   모드:     ${DRY_RUN ? 'dry-run (캐시만)' : FORCE ? '--force (전체 재생성)' : '일반 (미캐시만 API 호출)'}`);
  if (ID_ARG) console.log(`   대상:     ID ${ID_ARG}만`);
  console.log();

  let apiCalls = 0;
  let cacheHits = 0;
  let skipped = 0;
  let failed = 0;

  const enriched = [...problems];

  for (let i = 0; i < enriched.length; i++) {
    const p = enriched[i];
    if (ID_ARG && p.id !== ID_ARG) continue;

    const cacheKey = `${p.id}_${p.startDate}`;
    const cached   = !FORCE && cache[cacheKey];

    if (cached) {
      cacheHits++;
      enriched[i] = applyEnrichment(p, cached);
      continue;
    }

    if (DRY_RUN) {
      skipped++;
      continue;
    }

    process.stdout.write(`  [ID ${String(p.id).padStart(3)}] ${p.ticker} ${p.startDate} (${p.pattern}) ... `);

    const prompt = buildPrompt(p);
    const raw    = await callClaude(prompt);
    const parsed = parseJSON(raw);

    if (!parsed) {
      console.log('❌ 파싱 실패 (원본 유지)');
      if (raw) console.log('     원본:', raw.slice(0, 120));
      failed++;
    } else {
      // 캐시 저장
      cache[cacheKey] = parsed;
      saveCache(cache);

      enriched[i] = applyEnrichment(p, parsed);
      apiCalls++;
      console.log('✅');
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  // 파일 덮어쓰기
  writeGenerated(enriched);

  console.log();
  console.log('='.repeat(55));
  console.log(`완료: API ${apiCalls}회 호출, 캐시 ${cacheHits}건, 스킵 ${skipped}건, 실패 ${failed}건`);
  console.log(`✅ 저장 → ${GEN_FILE}`);
  if (!DRY_RUN && failed === 0) {
    console.log('\nnpm run validate 를 실행해 검증하세요.');
  }
}

function applyEnrichment(p, parsed) {
  const result = { ...p };
  if (parsed.question)        result.question = parsed.question;
  if (parsed.explanation)     result.explanation = parsed.explanation;
  if (parsed.valuationHints)  result.valuationHints = parsed.valuationHints;
  if (parsed.lesson)          result.reveal = { ...p.reveal, lesson: parsed.lesson };
  return result;
}

main().catch(e => { console.error(e); process.exit(1); });
