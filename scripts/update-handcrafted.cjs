'use strict';
const fs   = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '../public/data');

const TICKER_FILE = {
  '005930.KS':'005930.KS','051910.KS':'051910.KS','000660.KS':'000660.KS',
  '247540.KQ':'247540.KQ','011170.KS':'011170.KS','TSLA':'TSLA','NVDA':'NVDA',
  'BTC-USD':'BTC_USD','^GSPC':'GSPC','GSPC2007':'GSPC_2007','KS11':'KS11',
  'SSE':'SSE','IXIC':'IXIC','N225':'N225','GME':'GME','SEEGENE':'SEEGENE',
  'META':'META','035720.KS':'035720.KS','035420.KS':'035420.KS',
  '005380.KS':'005380.KS','AAPL':'AAPL','AMD':'AMD','GLD':'GLD',
  '086520.KQ':'086520.KQ','068270.KS':'068270.KS',
};

function parseCSV(fp){
  const lines=fs.readFileSync(fp,'utf8').trim().split('\n');
  const r=[];
  for(let i=1;i<lines.length;i++){
    const p=lines[i].split(',');
    if(p.length<5) continue;
    const c=parseFloat(p[4]);
    if(isNaN(c)||c<=0) continue;
    r.push({date:p[0].trim(),close:c});
  }
  return r;
}

function toKoMonth(d){ const y=d.slice(0,4),m=parseInt(d.slice(5,7)); return `${y}년 ${m}월`; }
function toAns(p){ if(p>=0.15)return 0; if(p>=0.05)return 1; if(p>-0.05)return 2; return 3; }
const AL=['급등','상승','횡보','하락'];

// Direction label based purely on pct (for explanation/result text)
function pctLabel(pct) {
  if (pct >= 0.15) return '급등';
  if (pct >= 0.05) return '상승';
  if (pct > -0.05) return '횡보';
  return '하락';
}

// Find the correct answer index using category-specific keyword matching
function toAnsFromChoices(pct, choices) {
  if (!choices || choices.length === 0) return toAns(pct);

  // Primary keyword match — exact pct category
  let primaryKw;
  if (pct >= 0.15)      primaryKw = ['급등','폭등'];
  else if (pct >= 0.05) primaryKw = ['상승','오른다','우상향','회복','반등','전환된다','추가 상승'];
  else if (pct > -0.05) primaryKw = ['횡보','유지','박스','눌림','숨 고르기','완만','점진적'];
  else                  primaryKw = ['하락','급락','폭락','빠진다','이탈','추가 하락','추가 급락'];

  for (let i = 0; i < choices.length; i++) {
    if (primaryKw.some(k => choices[i].includes(k))) return i;
  }

  // Secondary: any directional match
  const upKw   = ['급등','폭등','상승','오른다','회복','반등','전환된다'];
  const downKw = ['하락','급락','폭락','빠진다','이탈'];
  if (pct >= 0.05) {
    for (let i = 0; i < choices.length; i++) {
      if (upKw.some(k => choices[i].includes(k))) return i;
    }
  } else if (pct <= -0.05) {
    for (let i = 0; i < choices.length; i++) {
      if (downKw.some(k => choices[i].includes(k))) return i;
    }
  }

  return toAns(pct); // final fallback
}

// Load choices from the handcrafted TS file
const SRC = path.join(__dirname,'../src/data/problems.handcrafted.ts');

function loadHandcraftedChoices(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content
    .replace(/^import type .*$/gm, '')
    .replace(/: Problem\[\]/g, '')
    .replace(/export const \w+\s*=\s*/, 'return ');
  try {
    const problems = new Function(content)();
    const map = {};
    for (const p of problems) map[p.id] = p.choices;
    return map;
  } catch(e) {
    console.error('choices 로드 실패:', e.message);
    return {};
  }
}

const choicesMap = loadHandcraftedChoices(SRC);

// [id, ticker, anchorStartDate, oldRevealDay]
// For new problems (IDs 36+): oldRevealDay=1 means anchorStartDate IS the reveal key date
const probs=[
  [1,'005930.KS','2020-09-01',40],[2,'051910.KS','2020-11-01',35],
  [3,'000660.KS','2018-01-02',85],[4,'NVDA','2022-10-03',80],
  [5,'TSLA','2021-11-01',75],[6,'011170.KS','2021-09-01',78],
  [7,'247540.KQ','2023-09-01',78],[8,'BTC-USD','2022-05-01',82],
  [9,'^GSPC','2020-03-01',45],[10,'BTC-USD','2017-05-01',100],
  [11,'BTC-USD','2023-10-01',75],[12,'^GSPC','2023-02-01',40],
  [13,'GSPC2007','2008-08-01',30],[14,'KS11','1997-07-01',60],
  [15,'SSE','2015-04-01',55],[16,'IXIC','1999-07-01',90],
  [17,'N225','1989-10-01',60],[18,'GME','2020-11-01',45],
  [19,'SEEGENE','2020-01-02',60],[20,'^GSPC','2018-10-01',46],
  [21,'^GSPC','2022-01-03',60],[22,'NVDA','2018-09-01',45],
  [23,'TSLA','2019-06-01',80],[24,'BTC-USD','2018-11-15',65],
  [25,'BTC-USD','2020-03-01',45],[26,'BTC-USD','2021-04-01',60],
  [27,'005930.KS','2019-08-01',60],[28,'META','2022-10-01',50],
  [29,'035720.KS','2021-06-01',65],[30,'035420.KS','2022-10-01',60],
  [31,'005380.KS','2020-09-01',65],[32,'AAPL','2018-10-01',45],
  [33,'AMD','2022-10-01',60],[34,'GLD','2020-03-01',30],
  [35,'086520.KQ','2023-01-02',130],
  // New handcrafted problems (oldRev=1 → anchorDate is the reveal key date)
  [36,'TSLA','2020-07-09',1],
  [37,'^GSPC','2020-03-23',1],
  [38,'META','2022-11-04',1],
  [40,'AAPL','2019-01-14',1],
  [42,'BTC-USD','2020-05-15',1],
  [43,'^GSPC','2023-01-06',1],
  [44,'005930.KS','2017-04-03',1],
  [45,'035420.KS','2020-04-03',1],
  [46,'035720.KS','2021-06-28',1],
  [47,'GLD','2020-06-05',1],
  [48,'NVDA','2023-05-26',1],
  [50,'BTC-USD','2024-01-12',1],
  [51,'051910.KS','2020-08-14',1],
  [52,'GME','2021-01-08',1],
  [54,'AMD','2023-01-20',1],
  [55,'000660.KS','2023-05-12',1],
];

// 각 문제의 새 파라미터 계산
const computed = {};
for(const [id,ticker,startDate,oldRev] of probs){
  const fname=TICKER_FILE[ticker]??ticker;
  const fp=path.join(DATA_DIR,`${fname}.csv`);
  const rows=parseCSV(fp);
  const si=rows.findIndex(r=>r.date>=startDate);
  if(si===-1){ console.warn(`⚠️  ID ${id}: ${startDate} CSV에 없음 (${ticker}), 건너뜀`); continue; }
  const keyIdx=Math.min(si+oldRev-1,rows.length-1);
  const newStartIdx=Math.max(0,keyIdx-125);
  const endIdx=Math.min(keyIdx+21,rows.length-1);
  const pct=(rows[endIdx].close-rows[keyIdx].close)/rows[keyIdx].close;
  const choices = choicesMap[id] || [];
  const ans = toAnsFromChoices(pct, choices);
  computed[id]={
    newStartDate: rows[newStartIdx].date,
    endDate: rows[endIdx].date,
    pct,
    pctStr: (pct>=0?'+':'')+(pct*100).toFixed(0)+'%',
    ans,
    ansLabel: pctLabel(pct),  // direction label for explanation/result text
  };
}

// 문자열 치환 헬퍼
function replaceNMonths(q){
  return q.replace(/\d+개월\s*후/g,'1개월 후');
}

// reveal.result 재생성 (ansLabel = pct 방향 레이블)
function makeResult(ansLabel, pctStr){
  return `1개월 후 ${ansLabel} (${pctStr}).`;
}

// problems.handcrafted.ts 파일을 블록 단위로 처리
let src = fs.readFileSync(SRC,'utf8');

for(const [id] of probs){
  const c = computed[id];
  if(!c) continue;

  // 1) startDate
  src = src.replace(
    new RegExp(`(id: ${id},.*?startDate: ')([^']+)(')`,'s'),
    (m,pre,old,post) => pre + c.newStartDate + post
  );

  // 2) revealDay & chartDays
  const idPos = src.indexOf(`id: ${id},`);
  if(idPos !== -1){
    const nextId = src.indexOf(`id: ${id+1},`, idPos);
    const block = nextId !== -1 ? src.slice(idPos, nextId) : src.slice(idPos);
    const newBlock = block.replace(
      /revealDay: \d+, chartDays: \d+/,
      'revealDay: 126, chartDays: 147'
    );
    src = src.slice(0,idPos) + newBlock + (nextId !== -1 ? src.slice(nextId) : '');
  }

  // 3) answer
  {
    const idPos2 = src.indexOf(`id: ${id},`);
    const nextId2 = src.indexOf(`id: ${id+1},`, idPos2);
    const block = nextId2 !== -1 ? src.slice(idPos2, nextId2) : src.slice(idPos2);
    const newBlock = block.replace(/answer: \d/, `answer: ${c.ans}`);
    src = src.slice(0,idPos2) + newBlock + (nextId2 !== -1 ? src.slice(nextId2) : '');
  }

  // 4) question: "N개월 후" → "1개월 후"
  {
    const idPos3 = src.indexOf(`id: ${id},`);
    const nextId3 = src.indexOf(`id: ${id+1},`, idPos3);
    const block = nextId3 !== -1 ? src.slice(idPos3, nextId3) : src.slice(idPos3);
    const newBlock = block.replace(/(question: '.*?)(\d+개월\s*후)(.*?')/, (_,a,_b,d)=>a+'1개월 후'+d);
    src = src.slice(0,idPos3) + newBlock + (nextId3 !== -1 ? src.slice(nextId3) : '');
  }

  // 5) explanation: 결과 부분 업데이트
  {
    const idPos4 = src.indexOf(`id: ${id},`);
    const nextId4 = src.indexOf(`id: ${id+1},`, idPos4);
    const block = nextId4 !== -1 ? src.slice(idPos4, nextId4) : src.slice(idPos4);
    const newBlock = block.replace(
      /(explanation: ')(.*?)(')/s,
      (_,a,old,d) => {
        const base = old.replace(/[\.,]\s*1?개월[^.]*\.*$/, '').trim();
        return `${a}${base}. 1개월 뒤 ${c.ansLabel} (${c.pctStr}).${d}`;
      }
    );
    src = src.slice(0,idPos4) + newBlock + (nextId4 !== -1 ? src.slice(nextId4) : '');
  }

  // 6) reveal.result
  {
    const idPos5 = src.indexOf(`id: ${id},`);
    const nextId5 = src.indexOf(`id: ${id+1},`, idPos5);
    const block = nextId5 !== -1 ? src.slice(idPos5, nextId5) : src.slice(idPos5);
    const newBlock = block.replace(/(result: ')(.*?)(')/, `$1${makeResult(c.ansLabel, c.pctStr)}$3`);
    src = src.slice(0,idPos5) + newBlock + (nextId5 !== -1 ? src.slice(nextId5) : '');
  }

  // 7) reveal.period
  {
    const idPos6 = src.indexOf(`id: ${id},`);
    const nextId6 = src.indexOf(`id: ${id+1},`, idPos6);
    const block = nextId6 !== -1 ? src.slice(idPos6, nextId6) : src.slice(idPos6);
    const period = `${toKoMonth(c.newStartDate)} ~ ${toKoMonth(c.endDate)}`;
    const newBlock = block.replace(/(period: ')(.*?)(')/, `$1${period}$3`);
    src = src.slice(0,idPos6) + newBlock + (nextId6 !== -1 ? src.slice(nextId6) : '');
  }
}

fs.writeFileSync(SRC, src, 'utf8');
console.log('✅ problems.handcrafted.ts 업데이트 완료');
