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

// [id, ticker, oldStartDate, oldRevealDay]
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
];

// 각 문제의 새 파라미터 계산
const computed = {};
for(const [id,ticker,startDate,oldRev] of probs){
  const fname=TICKER_FILE[ticker]??ticker;
  const fp=path.join(DATA_DIR,`${fname}.csv`);
  const rows=parseCSV(fp);
  const si=rows.findIndex(r=>r.date>=startDate);
  const keyIdx=Math.min(si+oldRev-1,rows.length-1);
  const newStartIdx=Math.max(0,keyIdx-125);
  const endIdx=Math.min(keyIdx+21,rows.length-1);
  const chartEndIdx=Math.min(keyIdx+21,rows.length-1); // same as endIdx for period calc
  const pct=(rows[endIdx].close-rows[keyIdx].close)/rows[keyIdx].close;
  computed[id]={
    newStartDate: rows[newStartIdx].date,
    endDate: rows[chartEndIdx].date,
    pct,
    pctStr: (pct>=0?'+':'')+(pct*100).toFixed(0)+'%',
    ans: toAns(pct),
    ansLabel: AL[toAns(pct)],
  };
}

// 문자열 치환 헬퍼
function replaceNMonths(q){
  // "N개월 후" → "1개월 후"
  return q.replace(/\d+개월\s*후/g,'1개월 후');
}

// explanation 재생성
function makeExplanation(id, pctStr, ans, oldExpl){
  // 기존 설명의 첫 부분(패턴 설명)을 살리고 결과만 교체
  // "패턴설명. N개월 +/-X%." 형태 → "패턴설명. 1개월 뒤 결과(±pct)."
  const label = AL[ans];
  // 기존 설명에서 뒷부분(숫자/월 참조) 제거하고 새 결과 붙임
  const base = oldExpl.replace(/\.\s*\d+개월[^.]+\.?\s*$/, '');
  return `${base}. 1개월 뒤 ${label} (${pctStr}).`;
}

// reveal.result 재생성
function makeResult(ans, pctStr){
  return `1개월 후 ${AL[ans]} (${pctStr}).`;
}

// problems.handcrafted.ts 파일을 블록 단위로 처리
const SRC = path.join(__dirname,'../src/data/problems.handcrafted.ts');
let src = fs.readFileSync(SRC,'utf8');

for(const [id] of probs){
  const c = computed[id];
  if(!c) continue;

  // ID 기반으로 해당 블록 위치 찾기 (id: N, 으로 시작하는 블록)
  // 각 필드를 개별 regex로 치환

  // 1) startDate
  src = src.replace(
    new RegExp(`(id: ${id},.*?startDate: ')([^']+)(')`,'s'),
    (m,pre,old,post) => pre + c.newStartDate + post
  );

  // 2) revealDay & chartDays (같은 줄에 있음)
  // "revealDay: XX, chartDays: XX, difficulty" 패턴
  // 블록 내에서 해당 id 앞부분부터만 처리하기 위해 순차 치환
  // 더 안전한 방법: id 위치를 찾아서 그 이후 첫 revealDay만 교체
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
        const base = old.replace(/[\.,]\s*\d+개월[^.]*\.*$/, '').trim();
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
    const newBlock = block.replace(/(result: ')(.*?)(')/, `$1${makeResult(c.ans, c.pctStr)}$3`);
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
