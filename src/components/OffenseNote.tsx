import { useState, useEffect } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, ComposedChart, Bar, Cell,
} from 'recharts';

import { COLORS } from '../constants/colors';
import { PROBLEM_POOL } from '../data/problems';
import { loadChartData } from '../utils/dataLoader';
import { generateChart } from '../utils/chartGenerator';
import { formatPrice, formatVolume, getNicePriceScale, getPriceUnit } from '../utils/chartFormat';
import { GlossaryText, GlossaryModal } from './GlossaryText';
import {
  GlowBox, GlowBtn, LegendItem, Screen, FontLoader,
  toggleBtn, TITLE_FONT, KOREAN_FONT, GLOBAL_STYLES,
} from './GameUI';
import type { ChartDataPoint } from '../types';
import { useGameStorage } from '../hooks/useGameStorage';

interface Props {
  onClose: () => void;
}

type NoteView = 'list' | 'review';

export default function OffenseNote({ onClose }: Props) {
  const { data: storage, save: saveStorage } = useGameStorage();
  const solvedProblems = storage.solvedProblems;
  const [view, setView] = useState<NoteView>('list');
  const [reviewQueue, setReviewQueue] = useState<typeof PROBLEM_POOL>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMacroDetail, setShowMacroDetail] = useState(false);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [sessionResults, setSessionResults] = useState<Record<number, boolean>>({});

  // 오답 문제 목록 (한 번이라도 틀린 것)
  const wrongProblems = PROBLEM_POOL.filter(
    p => solvedProblems[p.id]?.wrongCount > 0
  );
  const notAttempted = PROBLEM_POOL.filter(p => !solvedProblems[p.id]);
  const correctProblems = PROBLEM_POOL.filter(
    p => solvedProblems[p.id] && solvedProblems[p.id].wrongCount === 0
  );

  const attempted = PROBLEM_POOL.length - notAttempted.length;
  const accuracy = attempted > 0
    ? Math.round((correctProblems.length / attempted) * 100)
    : 0;

  const currentProblem = reviewQueue[reviewIdx];

  useEffect(() => {
    if (view !== 'review' || !currentProblem) return;
    let cancelled = false;
    setChartLoading(true);
    setChartData([]);
    loadChartData(currentProblem.ticker, currentProblem.startDate, currentProblem.chartDays ?? 120)
      .then(data => { if (!cancelled) { setChartData(data); setChartLoading(false); } })
      .catch(() => {
        if (!cancelled) {
          setChartData(generateChart(
            (currentProblem.id * 137), currentProblem.pattern, currentProblem.startDate
          ));
          setChartLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [currentProblem, view]);

  const startReview = (problems: typeof PROBLEM_POOL) => {
    setReviewQueue(problems);
    setReviewIdx(0);
    setSelected(null);
    setSubmitted(false);
    setRevealed(false);
    setSessionResults({});
    setView('review');
  };

  const handleSubmit = () => {
    if (selected === null) return;
    const correct = selected === currentProblem.answer;
    setSubmitted(true);
    setRevealed(true);
    setSessionResults(prev => ({ ...prev, [currentProblem.id]: correct }));
    const prev = storage.solvedProblems[currentProblem.id];
    saveStorage({
      solvedProblems: {
        ...storage.solvedProblems,
        [currentProblem.id]: {
          correct,
          attempts: (prev?.attempts ?? 0) + 1,
          wrongCount: (prev?.wrongCount ?? 0) + (correct ? 0 : 1),
        },
      },
    });
  };

  const handleNext = () => {
    if (reviewIdx + 1 >= reviewQueue.length) {
      setView('list');
      return;
    }
    setReviewIdx(reviewIdx + 1);
    setSelected(null);
    setSubmitted(false);
    setRevealed(false);
  };

  // ─── List View ─────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <Screen tight>
        <FontLoader />
        <div style={{
          maxWidth: 400, width: '100%',
          background: COLORS.bgPanel,
          border: `2px solid ${COLORS.border}`,
          boxShadow: `3px 3px 0 0 ${COLORS.border}`,
          padding: '20px 18px 16px',
          fontFamily: KOREAN_FONT,
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 10, left: 0, right: 0, borderTop: `2px solid ${COLORS.red}` }}/>
          <div style={{ position: 'absolute', top: 14, left: 0, right: 0, borderTop: `1px solid ${COLORS.blue}` }}/>

          {/* 헤더 */}
          <div style={{ marginTop: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.3em', textAlign: 'center', marginBottom: 4 }}>
              ━ 오 답 노 트 ━
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, textAlign: 'center', color: COLORS.textBright, letterSpacing: '0.1em' }}>
              학습 기록
            </div>
          </div>

          {/* 통계 카드 */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14,
          }}>
            {[
              { label: '시도', value: attempted, color: COLORS.textDim },
              { label: '정답', value: correctProblems.length, color: COLORS.green },
              { label: '오답', value: wrongProblems.length, color: COLORS.red },
              { label: '정답률', value: `${accuracy}%`, color: COLORS.blue },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                textAlign: 'center',
                padding: '8px 4px',
                border: `1px solid ${COLORS.border}`,
                background: COLORS.bgPanelLight,
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: TITLE_FONT }}>{value}</div>
                <div style={{ fontSize: 9, color: COLORS.textMute, letterSpacing: '0.1em', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* 문제 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
            {PROBLEM_POOL.map(p => {
              const rec = solvedProblems[p.id];
              const isWrong = rec?.wrongCount > 0;
              const isCorrect = rec && !isWrong;
              const isNew = !rec;
              const reviewedCorrect = sessionResults[p.id] === true;
              const diffColor = p.difficulty === 'hard' ? COLORS.red : p.difficulty === 'medium' ? COLORS.orange : COLORS.green;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px',
                  border: `1px solid ${isWrong ? COLORS.red : isCorrect ? COLORS.green : COLORS.borderDark}`,
                  background: isWrong ? '#fff5f5' : isCorrect ? '#f0fdf4' : COLORS.bgPanelLight,
                  opacity: isNew ? 0.6 : 1,
                }}>
                  <span style={{ fontSize: 14, width: 18 }}>
                    {reviewedCorrect ? '✅' : isWrong ? '❌' : isCorrect ? '✓' : '·'}
                  </span>
                  <span style={{
                    fontSize: 9, padding: '1px 5px',
                    background: diffColor, color: '#fff',
                    fontFamily: TITLE_FONT, letterSpacing: '0.05em',
                    flexShrink: 0,
                  }}>{p.difficulty.toUpperCase()}</span>
                  <span style={{ flex: 1, fontSize: 12, color: COLORS.text, fontFamily: KOREAN_FONT, lineHeight: 1.3 }}>
                    {p.reveal.title}
                  </span>
                  {rec && (
                    <span style={{ fontSize: 9, color: COLORS.textMute, flexShrink: 0 }}>
                      {rec.attempts}회
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 버튼 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {wrongProblems.length > 0 && (
              <GlowBtn onClick={() => startReview(wrongProblems)} color={COLORS.red}>
                ✗ 오답만 다시 풀기 ({wrongProblems.length}문제)
              </GlowBtn>
            )}
            <GlowBtn onClick={() => startReview(PROBLEM_POOL)} color={COLORS.blue}>
              전체 다시 풀기
            </GlowBtn>
            <GlowBtn onClick={onClose}>
              ← 메인으로
            </GlowBtn>
          </div>
        </div>
        <GlossaryModal term={activeTerm} onClose={() => setActiveTerm(null)} />
      </Screen>
    );
  }

  // ─── Review View ───────────────────────────────────────────────────────────
  if (chartLoading || !currentProblem) {
    return (
      <Screen>
        <FontLoader />
        <div style={{ textAlign: 'center', fontFamily: TITLE_FONT }}>
          <div style={{ fontSize: 32, marginBottom: 16, animation: 'bounce 1s infinite' }}>📊</div>
          <div style={{ fontSize: 14, color: COLORS.textDim, letterSpacing: '0.2em' }}>차트 데이터 로딩 중...</div>
        </div>
        <style>{GLOBAL_STYLES}</style>
      </Screen>
    );
  }

  const fullData = chartData;
  const visibleData = revealed ? fullData : fullData.slice(0, currentProblem.revealDay);
  const minPrice = fullData.length ? Math.min(...fullData.map(d => d.종가)) * 0.97 : 0;
  const maxPrice = fullData.length ? Math.max(...fullData.map(d => d.종가)) * 1.03 : 100;
  const priceUnit = getPriceUnit(currentProblem);
  const priceScale = getNicePriceScale(minPrice, maxPrice, 4);
  const isCorrect = submitted && selected === currentProblem.answer;
  const progress = `${reviewIdx + 1} / ${reviewQueue.length}`;

  const xTicks: number[] = [];
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor((visibleData.length - 1) * (i / 4));
    if (visibleData[idx]) xTicks.push(visibleData[idx].day);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at top, ${COLORS.bgPanel} 0%, ${COLORS.bg} 40%, ${COLORS.bgDeep} 100%)`,
      color: COLORS.text, fontFamily: KOREAN_FONT, padding: '6px 8px',
    }}>
      <FontLoader />

      {/* 오답노트 HUD */}
      <div style={{ maxWidth: 720, margin: '0 auto 6px' }}>
        <GlowBox color={COLORS.border} bg={COLORS.bgPanel} style={{ padding: '6px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.red, fontFamily: TITLE_FONT, letterSpacing: '0.15em', flex: 1 }}>
              ✗ 오답노트 연습
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.textBright, fontFamily: TITLE_FONT }}>
              {progress}
            </span>
            <button
              onClick={() => setView('list')}
              style={{
                padding: '3px 10px', fontSize: 11,
                background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`,
                cursor: 'pointer', fontFamily: TITLE_FONT, letterSpacing: '0.1em',
              }}
            >목록</button>
          </div>
          {/* 진행 바 */}
          <div style={{ height: 3, background: COLORS.bgDeep, border: `1px solid ${COLORS.border}`, marginTop: 5 }}>
            <div style={{ height: '100%', width: `${((reviewIdx + 1) / reviewQueue.length) * 100}%`, background: COLORS.red, transition: 'width 0.4s' }}/>
          </div>
        </GlowBox>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* 문제 뱃지 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 4, fontSize: 10, fontFamily: TITLE_FONT, alignItems: 'center' }}>
          <span style={{ padding: '3px 8px', background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, fontWeight: 700 }}>{currentProblem.market}</span>
          <span style={{ padding: '3px 8px', background: currentProblem.difficulty === 'hard' ? COLORS.red : currentProblem.difficulty === 'medium' ? COLORS.orange : COLORS.green, color: '#fff', fontWeight: 700, textTransform: 'uppercase' }}>{currentProblem.difficulty}</span>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setShowRSI(!showRSI)} style={toggleBtn(showRSI, COLORS.red)}>
              {showRSI ? '✓ RSI' : '+ RSI 보기'}
            </button>
          </div>
        </div>

        {/* 차트 */}
        <GlowBox color={COLORS.border} bg={COLORS.bgChart} style={{ padding: '6px 6px 2px', marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 4, paddingLeft: 4, fontSize: 9, fontFamily: TITLE_FONT, fontWeight: 700, flexWrap: 'wrap' }}>
            <LegendItem color={COLORS.blueBright} label={`종가(${priceUnit})`} />
            <LegendItem color={COLORS.yellow} label="MA5" dashed />
            <LegendItem color={COLORS.purple} label="MA20" dashed />
            <LegendItem color={COLORS.orange} label="MA60" dashed />
            {revealed && <LegendItem color={COLORS.gold} label="문제시점" vertical />}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={visibleData} margin={{ top: 5, right: 22, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.blueBright} stopOpacity={0.4}/>
                  <stop offset="100%" stopColor={COLORS.blueBright} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={COLORS.textMute} vertical={false} opacity={0.3}/>
              <XAxis dataKey="day" ticks={xTicks} tick={{ fontSize: 10, fill: COLORS.textDim, fontFamily: 'monospace' }}
                tickFormatter={(d) => { const item = fullData[d]; return item ? item.date : ''; }}
                axisLine={{ stroke: COLORS.borderDark }} tickLine={{ stroke: COLORS.borderDark }}/>
              <YAxis domain={[priceScale.min, priceScale.max]} ticks={priceScale.ticks} allowDecimals={false}
                tick={{ fontSize: 8, fill: COLORS.textDim, fontFamily: 'monospace' }}
                tickLine={false} width={50} tickFormatter={(v) => formatPrice(Number(v), priceUnit)} axisLine={{ stroke: COLORS.borderDark }}/>
              <Tooltip
                contentStyle={{ background: COLORS.bgDeep, border: `2px solid ${COLORS.gold}`, fontSize: 11, fontFamily: 'monospace' }}
                labelFormatter={(d) => { const item = fullData[d as number]; return item ? `📅 ${item.date}` : ''; }}
                labelStyle={{ color: COLORS.goldBright, fontWeight: 700 }}
                formatter={(v, n) => [typeof v === 'number' ? formatPrice(v, priceUnit) : v, n]}
              />
              {revealed && <ReferenceLine x={currentProblem.revealDay} stroke={COLORS.gold} strokeWidth={2} strokeDasharray="4 4"
                label={{ value: '◆ 문제시점', fill: COLORS.goldBright, fontSize: 11, position: 'top', fontFamily: 'monospace', fontWeight: 700 }}/>}
              <Area type="monotone" dataKey="종가" stroke={COLORS.blueBright} strokeWidth={2} fill="url(#pg2)" isAnimationActive={false}/>
              <Line type="monotone" dataKey="MA5" stroke={COLORS.yellow} strokeWidth={1.2} strokeDasharray="3 3" dot={false} isAnimationActive={false}/>
              <Line type="monotone" dataKey="MA20" stroke={COLORS.purple} strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false}/>
              <Line type="monotone" dataKey="MA60" stroke={COLORS.orange} strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false}/>
            </ComposedChart>
          </ResponsiveContainer>

          <div style={{ fontSize: 9, fontFamily: TITLE_FONT, color: COLORS.blueBright, paddingLeft: 4, marginTop: 3, marginBottom: 1, fontWeight: 700 }}>거래량</div>
          <ResponsiveContainer width="100%" height={45}>
            <ComposedChart data={visibleData} margin={{ top: 0, right: 22, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" tick={false} axisLine={{ stroke: COLORS.borderDark }}/>
              <YAxis tick={{ fontSize: 8, fill: COLORS.textDim, fontFamily: 'monospace' }} tickLine={false} width={50}
                tickFormatter={(v) => formatVolume(Number(v))}
                axisLine={{ stroke: COLORS.borderDark }}/>
              <Tooltip contentStyle={{ background: COLORS.bgDeep, border: `2px solid ${COLORS.blue}`, fontSize: 11, fontFamily: 'monospace' }}
                formatter={(v) => [Number(v).toLocaleString(), '거래량']}
                labelFormatter={(d) => { const item = fullData[d as number]; return item ? item.date : ''; }}/>
              {revealed && <ReferenceLine x={currentProblem.revealDay} stroke={COLORS.gold} strokeDasharray="4 4"/>}
              <Bar dataKey="거래량">
                {visibleData.map((d, i) => {
                  const prev = i > 0 ? visibleData[i - 1].종가 : d.종가;
                  return <Cell key={i} fill={d.종가 >= prev ? COLORS.green : COLORS.red} fillOpacity={0.7}/>;
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>

          {showRSI && (
            <>
              <div style={{ fontSize: 9, fontFamily: TITLE_FONT, color: COLORS.red, paddingLeft: 4, marginTop: 3, marginBottom: 1, fontWeight: 700 }}>RSI(14) · 70↑과매수 / 30↓과매도</div>
              <ResponsiveContainer width="100%" height={45}>
                <ComposedChart data={visibleData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="day" tick={false} axisLine={{ stroke: COLORS.borderDark }}/>
                  <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fontSize: 9, fill: COLORS.textDim, fontFamily: 'monospace' }} tickLine={false} width={42}/>
                  <ReferenceLine y={70} stroke={COLORS.red} strokeDasharray="2 3" opacity={0.6}/>
                  <ReferenceLine y={30} stroke={COLORS.green} strokeDasharray="2 3" opacity={0.6}/>
                  {revealed && <ReferenceLine x={currentProblem.revealDay} stroke={COLORS.gold} strokeDasharray="4 4"/>}
                  <Line type="monotone" dataKey="RSI" stroke={COLORS.pink} strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </>
          )}
        </GlowBox>

        {/* 매크로 */}
        <div style={{ marginBottom: 6 }}>
          <button onClick={() => setShowMacroDetail(!showMacroDetail)} style={{ width: '100%', background: COLORS.bgPanel, border: `2px solid ${COLORS.border}`, boxShadow: `2px 2px 0 0 ${COLORS.border}`, padding: '5px 10px', fontFamily: TITLE_FONT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.15em', fontWeight: 700 }}>매크로</span>
              <span style={{ display: 'flex', gap: 3 }}>
                {currentProblem.macroHints.map((h, i) => {
                  const c = h.tone === 'positive' ? COLORS.green : h.tone === 'negative' ? COLORS.red : COLORS.textDim;
                  return <span key={i} style={{ width: 8, height: 8, background: c, display: 'inline-block', border: `1px solid ${COLORS.border}` }}/>;
                })}
              </span>
            </div>
            <span style={{ fontSize: 10, color: COLORS.textDim }}>{showMacroDetail ? '▲ 접기' : '▼ 상세'}</span>
          </button>
          {showMacroDetail && (
            <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6 }}>
              {currentProblem.macroHints.map((h, i) => {
                const c = h.tone === 'positive' ? COLORS.green : h.tone === 'negative' ? COLORS.red : COLORS.textDim;
                return (
                  <div key={i} style={{ background: COLORS.bgPanel, border: `1px solid ${c}`, borderLeft: `4px solid ${c}`, padding: '6px 9px' }}>
                    <div style={{ fontSize: 10, color: COLORS.textDim }}><GlossaryText text={h.label} onTerm={setActiveTerm}/></div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c }}>{h.value}</div>
                    <div style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.35 }}><GlossaryText text={h.trend} onTerm={setActiveTerm}/></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 문제 */}
        <div style={{ padding: '6px 10px', marginBottom: 6, borderLeft: `3px solid ${COLORS.red}`, background: COLORS.bgPanel }}>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: COLORS.textBright, fontFamily: KOREAN_FONT }}>
            <span style={{ color: COLORS.red, fontWeight: 700, marginRight: 6, fontSize: 12 }}>문.</span>
            {currentProblem.question}
          </div>
        </div>

        {/* 보기 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
          {currentProblem.choices.map((c, i) => {
            const isSel = selected === i;
            const isAns = submitted && i === currentProblem.answer;
            const isWrong = submitted && isSel && i !== currentProblem.answer;
            let bg: string = COLORS.bgPanel, bd: string = COLORS.border, col: string = COLORS.text;
            if (isAns) { bg = '#dcf5e0'; bd = COLORS.green; col = '#14532d'; }
            else if (isWrong) { bg = '#fde2e1'; bd = COLORS.red; col = '#7f1d1d'; }
            else if (isSel) { bg = '#fff7d6'; bd = COLORS.red; col = COLORS.textBright; }
            return (
              <button key={i} onClick={() => !submitted && setSelected(i)} disabled={submitted}
                style={{ display: 'flex', gap: 8, padding: '7px 10px', background: bg, border: `2px solid ${bd}`, boxShadow: isSel || isAns || isWrong ? `2px 2px 0 0 ${bd}` : `2px 2px 0 0 ${COLORS.border}`, borderRadius: 2, color: col, cursor: submitted ? 'default' : 'pointer', textAlign: 'left', fontSize: 12.5, lineHeight: 1.4, fontFamily: KOREAN_FONT }}>
                <span style={{ color: isAns ? COLORS.green : COLORS.red, fontWeight: 700, flexShrink: 0 }}>{['①', '②', '③', '④'][i]}</span>
                <span><GlossaryText text={c} onTerm={setActiveTerm}/></span>
              </button>
            );
          })}
        </div>

        {/* 해설 */}
        {submitted && (
          <GlowBox color={isCorrect ? COLORS.greenBright : COLORS.redBright} bg={COLORS.bgPanel} style={{ padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontFamily: TITLE_FONT, letterSpacing: '0.15em', color: isCorrect ? COLORS.greenBright : COLORS.redBright, marginBottom: 6, fontWeight: 700 }}>
              {isCorrect ? '✓ 정답!' : '✗ 오답'} · 답: {['1', '2', '3', '4'][currentProblem.answer]}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: COLORS.text, marginBottom: 8 }}>
              <GlossaryText text={currentProblem.explanation} onTerm={setActiveTerm}/>
            </div>
            <div style={{ padding: '8px 10px', background: COLORS.bgDeep, borderLeft: `3px solid ${COLORS.gold}` }}>
              <div style={{ fontSize: 10, color: COLORS.goldBright, fontWeight: 700, marginBottom: 3, letterSpacing: '0.1em' }}>★ 교훈</div>
              <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.6 }}>
                <GlossaryText text={currentProblem.reveal.lesson} onTerm={setActiveTerm}/>
              </div>
            </div>
          </GlowBox>
        )}

        {/* 버튼 */}
        {submitted ? (
          <GlowBtn onClick={handleNext} color={COLORS.greenBright}>
            {reviewIdx + 1 >= reviewQueue.length ? '목록으로 ▶' : '다음 문제 ▶'}
          </GlowBtn>
        ) : (
          <GlowBtn onClick={handleSubmit} disabled={selected === null}>
            ▶ 제출하기
          </GlowBtn>
        )}
      </div>

      <style>{GLOBAL_STYLES}</style>
      <GlossaryModal term={activeTerm} onClose={() => setActiveTerm(null)} />
    </div>
  );
}
