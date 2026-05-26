import { useState, useEffect } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, ComposedChart, Bar, Cell,
} from 'recharts';

import { COLORS } from '../constants/colors';
import { RANKS, TOTAL_STAGES, STAGE_PROBLEMS_PER_STAGE, MAX_RANK_IDX } from '../constants/ranks';
import { PROBLEM_POOL, selectStageProblems } from '../data/problems';
import { generateChart } from '../utils/chartGenerator';
import { loadChartData } from '../utils/dataLoader';
import { formatPrice, formatVolume, getNicePriceScale, getPriceUnit } from '../utils/chartFormat';
import { useGameStorage } from '../hooks/useGameStorage';
import type { ChartDataPoint, Problem } from '../types';
import EvolutionFigure from './EvolutionFigure';
import { GlossaryText, GlossaryModal } from './GlossaryText';
import Tutorial from './Tutorial';
import { TUTORIAL_PROBLEM } from '../data/tutorialProblem';
import {
  GlowBox, GlowBtn, LegendItem, Screen, FontLoader,
  toggleBtn, TITLE_FONT, KOREAN_FONT, GLOBAL_STYLES,
} from './GameUI';

// 선택지 미리보기 색상 (0=상승 녹색, 1=횡보 노랑, 2=하락 주황, 3=급락 빨강)
const CHOICE_PREVIEW_COLORS = ['#4caf50', '#ffc107', '#ff7043', '#ef5350'];

// 이동평균선 색상 — 각 기간이 명확히 구분되도록
const MA_COLORS = {
  MA5:   '#0ea5e9', // 하늘색 (단기 · 빠름)
  MA20:  '#f59e0b', // 앰버 (중기)
  MA60:  '#a855f7', // 보라 (장기)
  MA120: '#ef4444', // 빨강 (중장기 · 반년선)
} as const;

/** 질문에서 종목명 제거 (답 노출 방지) */
function anonymizeQ(question: string, revealTitle: string): string {
  const name = revealTitle.split(' (')[0];
  if (!name) return question;
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return question
    .replace(new RegExp(esc + '이\\(가\\)\\s?', 'g'), '')
    .replace(new RegExp(esc + '[이가의은는]\\s?', 'g'), '')
    .replace(new RegExp(esc + '\\s', 'g'), '')
    .replace(new RegExp(esc, 'g'), '')
    .replace(/^\s+/, '');
}

/**
 * 선택지 미리보기용 합성 궤적 생성 — 명확한 방향성과 곡선 형태 차별화
 * 0=상승(+45%), 1=횡보(0%), 2=하락(-30%), 3=급락(-65%)
 *
 * 곡선 형태:
 *   0 (상승) → S자: 부드럽게 우상향
 *   1 (횡보) → 진동: 방향성 없이 오르내림
 *   2 (하락) → 완만 하락: 초반 가속 후 완화
 *   3 (급락) → 폭포형: 초반에 빠르게 떨어지고 후반 가속
 */
function generatePreviewPath(
  startPrice: number,
  choiceIdx: number,
  numPoints: number,
  yAxisRange = 0, // y축 전체 범위 — 스파이크 차트에서 진폭 보정에 사용
): number[] {
  const targets4 = [0.45,  0.00, -0.30, -0.65];
  const targetPct = targets4[choiceIdx] ?? 0;

  // ── 횡보: 사인 진동 (방향성 없음) ─────────────────────────────────────
  if (Math.abs(targetPct) < 0.02) {
    const waveAmp = yAxisRange > 0
      ? Math.max(startPrice * 0.055, yAxisRange * 0.025)
      : startPrice * 0.055;
    return Array.from({ length: numPoints }, (_, i) => {
      const t = i / Math.max(numPoints - 1, 1);
      return startPrice
        + waveAmp * Math.sin(t * Math.PI * 4.5)
        + waveAmp * 0.36 * Math.sin(t * Math.PI * 10.3);
    });
  }

  // 진폭: price-based vs range-based 중 절댓값이 더 큰 쪽 사용
  // → y축 범위가 넓은 스파이크 차트에서 미리보기가 시각적으로 의미 있게 보이도록 보정
  const priceBasedDelta = targetPct * startPrice;
  const rangeBasedDelta = yAxisRange > 0 ? targetPct * yAxisRange * 0.45 : 0;
  let targetDelta = Math.abs(rangeBasedDelta) > Math.abs(priceBasedDelta)
    ? rangeBasedDelta
    : priceBasedDelta;
  // 하락 시 가격이 0 이하로 내려가지 않도록 제한
  if (startPrice + targetDelta < startPrice * 0.05) targetDelta = -(startPrice * 0.90);

  return Array.from({ length: numPoints }, (_, i) => {
    const t = i / Math.max(numPoints - 1, 1);

    let progress: number;
    if (targetPct > 0) {
      progress = t * t * (3 - 2 * t);        // S자 (상승)
    } else if (targetPct > -0.50) {
      progress = 1 - Math.pow(1 - t, 1.8);   // 완만 하락 (하락)
    } else {
      progress = 1 - Math.pow(1 - t, 3.5);   // 폭포형 (급락)
    }

    const noise = 0.014 * Math.sin(t * Math.PI * 6.3) * Math.exp(-t * 2);
    return startPrice + targetDelta * progress + noise * startPrice;
  });
}


interface Props {
  onOpenWrongNote: () => void;
}

export default function ChartQuizGame({ onOpenWrongNote }: Props) {
  const { data: storage, save: saveStorage, reset: resetStorage } = useGameStorage();

  const [phase, setPhase] = useState<'intro' | 'playing' | 'stageComplete' | 'graduated'>('intro');
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [currentStage, setCurrentStage] = useState(0);           // 0–6
  const [stageProblems, setStageProblems] = useState<Problem[]>(() => selectStageProblems(0, PROBLEM_POOL));
  const [stageIdx, setStageIdx] = useState(0);                   // 0–19
  const [stageCorrect, setStageCorrect] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [, setRevealed] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  const problem = stageProblems[stageIdx] ?? stageProblems[0];

  useEffect(() => {
    if (phase !== 'playing') return;
    let cancelled = false;
    setChartLoading(true);
    loadChartData(problem.ticker, problem.startDate, problem.chartDays ?? 120)
      .then(data => { if (!cancelled) { setChartData(data); setChartLoading(false); } })
      .catch(() => {
        if (!cancelled) {
          setChartData(generateChart(problem.id * 137, problem.pattern, problem.startDate));
          setChartLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [problem, phase]);

  const fullData = chartData;
  // 선택: 합성 미리보기 / 제출 후: 실제 금색 선
  const showPreview     = selected !== null && !submitted;
  const showActualFuture = submitted;
  const showFutureZone  = showPreview || showActualFuture;
  const visibleData = showFutureZone ? fullData : fullData.slice(0, problem.revealDay);

  // Y축 base 도메인 (과거 구간만) — previewPath 진폭 계산에 먼저 사용
  const revealPrice = fullData[problem.revealDay - 1]?.종가 ?? 0;
  const pastZoneData = fullData.slice(0, problem.revealDay);
  const baseMin = pastZoneData.length ? Math.min(...pastZoneData.map(d => d.종가)) * 0.96 : 0;
  const baseMax = pastZoneData.length ? Math.max(...pastZoneData.map(d => d.종가)) * 1.04 : 100;
  const yAxisRange = baseMax - baseMin; // 스파이크 차트 보정용

  // 미리보기 궤적 (선택지 인덱스 기반 합성 곡선)
  const previewPath: number[] | null = (showPreview && selected !== null && revealPrice > 0)
    ? generatePreviewPath(revealPrice, selected, fullData.length - problem.revealDay + 1, yAxisRange)
    : null;

  const visibleDataWithReveal = visibleData.map(d => {
    const pi = d.day - (problem.revealDay - 1);
    const isFuture = d.day >= problem.revealDay;
    return {
      ...d,
      // 미래 구간 이동평균선 숨김 (항상 — 정답 노출 방지)
      MA5:   isFuture ? null : d.MA5,
      MA20:  isFuture ? null : d.MA20,
      MA60:  isFuture ? null : d.MA60,
      MA120: isFuture ? null : d.MA120,
      // 미래 구간 RSI·거래량: 제출 전 숨김, 제출 후 공개
      RSI:    (isFuture && !submitted) ? null : d.RSI,
      거래량: (isFuture && !submitted) ? null : d.거래량,
      종가_past:    d.day < problem.revealDay ? d.종가 : null,
      종가_미래:    (showActualFuture && d.day >= problem.revealDay - 1) ? d.종가 : null,
      종가_preview: (previewPath && pi >= 0 && pi < previewPath.length) ? previewPath[pi] : null,
    };
  });

  // 제출 후: 실제 미래 가격도 포함하여 Y축 확장
  const fullMin = fullData.length ? Math.min(...fullData.map(d => d.종가)) * 0.96 : baseMin;
  const fullMax = fullData.length ? Math.max(...fullData.map(d => d.종가)) * 1.04 : baseMax;
  const domainMin = submitted ? Math.min(baseMin, fullMin) : baseMin;
  const domainMax = submitted ? Math.max(baseMax, fullMax) : baseMax;
  const prevMin = previewPath ? Math.min(...previewPath) * 0.97 : domainMin;
  const prevMax = previewPath ? Math.max(...previewPath) * 1.03 : domainMax;
  const minPrice = showPreview ? Math.min(domainMin, prevMin) : domainMin;
  const maxPrice = showPreview ? Math.max(domainMax, prevMax) : domainMax;
  const priceUnit = getPriceUnit(problem);
  const priceScale = getNicePriceScale(minPrice, maxPrice, 4);

  const persistSession = (overrides: { stageIdx?: number; stageCorrect?: number } = {}) => {
    saveStorage({
      savedSession: {
        currentStage,
        stageIdx: overrides.stageIdx ?? stageIdx,
        stageCorrect: overrides.stageCorrect ?? stageCorrect,
        stageProblemsIds: stageProblems.map(p => p.id),
      },
    });
  };

  const startStage = (stageIndex: number) => {
    const problems = selectStageProblems(stageIndex, PROBLEM_POOL);
    setCurrentStage(stageIndex);
    setStageProblems(problems);
    setStageIdx(0);
    setStageCorrect(0);
    setSelected(null); setSubmitted(false); setRevealed(false);
    setPhase('playing');
    saveStorage({
      savedSession: {
        currentStage: stageIndex,
        stageIdx: 0,
        stageCorrect: 0,
        stageProblemsIds: problems.map(p => p.id),
      },
    });
  };

  const resumeGame = () => {
    const s = storage.savedSession!;
    const problems = s.stageProblemsIds
      .map(id => PROBLEM_POOL.find(p => p.id === id))
      .filter(Boolean) as Problem[];
    setCurrentStage(s.currentStage);
    setStageProblems(problems);
    setStageIdx(s.stageIdx);
    setStageCorrect(s.stageCorrect);
    setSelected(null); setSubmitted(false); setRevealed(false);
    setPhase('playing');
  };

  const handleSubmit = () => {
    if (selected === null) return;
    const correct = selected === problem.answer;
    setSubmitted(true);
    setRevealed(true);

    if (problem.isTutorial) return;

    const newStageCorrect = stageCorrect + (correct ? 1 : 0);
    setStageCorrect(newStageCorrect);

    const existing = storage.solvedProblems[problem.id];
    saveStorage({
      solvedProblems: {
        ...storage.solvedProblems,
        [problem.id]: {
          correct,
          attempts: (existing?.attempts ?? 0) + 1,
          wrongCount: (existing?.wrongCount ?? 0) + (correct ? 0 : 1),
        },
      },
    });
  };

  const handleNext = () => {
    // ── Tutorial complete → go to intro ───────────────────────────────────
    if (problem.isTutorial) {
      localStorage.setItem('tutorialCompleted', 'true');
      setTutorialStep(null);
      setPhase('intro');
      setSelected(null); setSubmitted(false); setRevealed(false);
      return;
    }

    const nextIdx = stageIdx + 1;
    if (nextIdx >= STAGE_PROBLEMS_PER_STAGE) {
      // 단계 완료
      const completedStage = currentStage;
      if (completedStage + 1 >= TOTAL_STAGES) {
        saveStorage({ clearCount: storage.clearCount + 1, savedSession: null,
          bestStageCompleted: Math.max(storage.bestStageCompleted, TOTAL_STAGES) });
        setPhase('graduated');
      } else {
        saveStorage({ savedSession: null,
          bestStageCompleted: Math.max(storage.bestStageCompleted, completedStage + 1) });
        setPhase('stageComplete');
      }
    } else {
      setStageIdx(nextIdx);
      setSelected(null); setSubmitted(false); setRevealed(false);
      persistSession({ stageIdx: nextIdx, stageCorrect });
    }
  };

  const continueAfterStage = () => {
    startStage(currentStage + 1);
  };

  // ─── Tutorial controls ────────────────────────────────────────────────────
  const startTutorialGame = () => {
    localStorage.removeItem('tutorialCompleted');
    setTutorialStep(0);
    setPhase('playing');
    setStageProblems([TUTORIAL_PROBLEM]);
    setStageIdx(0);
    setSelected(null); setSubmitted(false); setRevealed(false);
  };

  const advanceTutorialStep = () => {
    if (tutorialStep === null) return;
    if (tutorialStep < 4) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setTutorialStep(null);
    }
  };

  const skipTutorial = () => {
    localStorage.setItem('tutorialCompleted', 'true');
    setTutorialStep(null);
    setPhase('intro');
    setSelected(null); setSubmitted(false); setRevealed(false);
  };

  const handleReset = () => {
    resetStorage();
    setShowResetConfirm(false);
    setPhase('intro');
    setCurrentStage(0);
    setStageProblems(selectStageProblems(0, PROBLEM_POOL));
    setStageIdx(0); setStageCorrect(0);
  };

  // ─── Intro ─────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    const hasSave = !!storage.savedSession;
    const s = storage;
    return (
      <Screen tight>
        <FontLoader />
        <div style={{
          maxWidth: 360, width: '100%',
          background: COLORS.bgPanel,
          border: `2px solid ${COLORS.border}`,
          boxShadow: `3px 3px 0 0 ${COLORS.border}, 6px 6px 12px rgba(0,0,0,0.15)`,
          padding: '22px 20px 16px',
          position: 'relative', fontFamily: KOREAN_FONT,
        }}>
          <div style={{ position: 'absolute', top: 10, left: 0, right: 0, borderTop: `2px solid ${COLORS.red}` }}/>
          <div style={{ position: 'absolute', top: 14, left: 0, right: 0, borderTop: `1px solid ${COLORS.blue}` }}/>

          <div style={{ position: 'absolute', top: 20, right: 10, fontSize: 9, color: COLORS.textMute, fontFamily: TITLE_FONT, letterSpacing: '0.1em' }}>#4</div>

          <div style={{ textAlign: 'center', marginBottom: 7, marginTop: 24, fontSize: 9, color: COLORS.textDim, letterSpacing: '0.28em' }}>
            ANALYZING · BUYING · PRAYING
          </div>
          <div style={{ textAlign: 'center', marginBottom: 7, fontSize: 12, color: COLORS.red, fontWeight: 600, letterSpacing: '0.17em' }}>
            ～ 7 단 계 학 습 편 ～
          </div>

          <div style={{ position: 'relative', marginBottom: 0 }}>
            <div style={{ textAlign: 'center', fontSize: 41, fontWeight: 900, color: COLORS.textBright, letterSpacing: '0.48em', lineHeight: 1.18, textShadow: `1px 1px 0 ${COLORS.bgDeep}`, paddingLeft: '0.48em' }}>
              투기의<br/>정석
            </div>
            <div style={{ position: 'absolute', right: 2, bottom: -18, textAlign: 'right' }}>
              <div style={{ fontSize: 8, color: COLORS.textDim, letterSpacing: '0.25em' }}>저자</div>
              <div style={{ fontSize: 11, color: COLORS.textBright, fontWeight: 700, letterSpacing: '0.15em' }}>마자유</div>
            </div>
          </div>

          <div style={{ marginBottom: 5, marginTop: 46 }}>
            <div style={{ borderTop: `2px solid ${COLORS.border}` }}/>
            <div style={{ borderTop: `1px solid ${COLORS.red}`, marginTop: 2 }}/>
          </div>

          <div style={{ marginBottom: 4, marginTop: -2, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 0 }}>
            <div style={{ flex: 1, textAlign: 'center', paddingRight: 4 }}>
              <div style={{ height: 78, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                <div style={{ transform: 'scale(0.78) translateY(-8px)', transformOrigin: 'center top' }}>
                  <EvolutionFigure stage={0} color={COLORS.textBright} />
                </div>
              </div>
              <div style={{ fontSize: 10, marginTop: 0, color: COLORS.textDim, letterSpacing: '0.12em', fontWeight: 600 }}>유인원</div>
              <div style={{ fontSize: 8, marginTop: 1, color: COLORS.textMute, fontStyle: 'italic' }}>감으로 매매</div>
            </div>
            <div style={{ alignSelf: 'center', padding: '0 2px' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.red, border: `2px solid ${COLORS.red}`, borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bgPanel }}>VS</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', paddingLeft: 4 }}>
              <div style={{ height: 78, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                <div style={{ transform: 'scale(0.78) translateY(-8px)', transformOrigin: 'center top' }}>
                  <EvolutionFigure stage={4} color={COLORS.textBright} />
                </div>
              </div>
              <div style={{ fontSize: 10, marginTop: 0, color: COLORS.textDim, letterSpacing: '0.12em', fontWeight: 600 }}>현자</div>
              <div style={{ fontSize: 8, marginTop: 1, color: COLORS.textMute, fontStyle: 'italic' }}>차트·매크로 분석</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 12, color: COLORS.red, letterSpacing: '0.15em', fontWeight: 700, marginTop: 8, marginBottom: 10 }}>
            당신은 어느 쪽이 될 것인가
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ borderTop: `1px solid ${COLORS.blue}` }}/>
            <div style={{ borderTop: `2px solid ${COLORS.border}`, marginTop: 2 }}/>
          </div>

          <div style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.7, marginBottom: 10, padding: '0 2px' }}>
            <div style={{ fontSize: 10, color: COLORS.red, fontWeight: 700, marginBottom: 3, letterSpacing: '0.15em' }}>● 학습 규칙</div>
            <div>① 7단계 각 20문제 · 총 140문제</div>
            <div>② 정답 확인 후 다음 문제로 (패널티 없음)</div>
            <div>③ 단계를 완주할수록 진화 (7단계 = 수료)</div>
          </div>

          {/* 기록 패널 */}
          {(s.bestStageCompleted > 0 || s.clearCount > 0) && (
            <div style={{
              marginBottom: 10, padding: '8px 10px',
              border: `1px solid ${COLORS.borderDark}`,
              background: COLORS.bgPanelLight,
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 6, textAlign: 'center',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.gold, fontFamily: TITLE_FONT }}>
                  {RANKS[Math.min(s.bestStageCompleted, MAX_RANK_IDX)].emoji} {s.bestStageCompleted}단계
                </div>
                <div style={{ fontSize: 9, color: COLORS.textMute, letterSpacing: '0.1em' }}>최고 달성 단계</div>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.clearCount > 0 ? COLORS.red : COLORS.textDim, fontFamily: TITLE_FONT }}>
                  {s.clearCount > 0 ? `★ ${s.clearCount}회` : '―'}
                </div>
                <div style={{ fontSize: 9, color: COLORS.textMute, letterSpacing: '0.1em' }}>수료 횟수</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {hasSave && (
              <button
                onClick={resumeGame}
                style={{
                  width: '100%', padding: '10px',
                  background: COLORS.bgDeep, color: COLORS.textBright,
                  border: `2px solid ${COLORS.border}`,
                  boxShadow: `3px 3px 0 0 ${COLORS.border}`,
                  fontFamily: '"Noto Serif KR", serif',
                  fontSize: 13, fontWeight: 700, letterSpacing: '0.2em',
                  cursor: 'pointer',
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'translate(3px,3px)'; e.currentTarget.style.boxShadow = 'none'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `3px 3px 0 0 ${COLORS.border}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `3px 3px 0 0 ${COLORS.border}`; }}
              >
                ▷ 이어하기 ({storage.savedSession!.currentStage + 1}단계 · {storage.savedSession!.stageIdx + 1}/{STAGE_PROBLEMS_PER_STAGE}번 문제)
              </button>
            )}
            <button
              onClick={() => {
                if (!hasSave && !localStorage.getItem('tutorialCompleted')) {
                  startTutorialGame();
                } else {
                  startStage(0);
                }
              }}
              style={{
                width: '100%', padding: '10px',
                background: COLORS.bgPanel, color: COLORS.textBright,
                border: `2px solid #4a8c5c`,
                boxShadow: `3px 3px 0 0 #2e5c3a`,
                fontFamily: '"Noto Serif KR", serif',
                fontSize: 14, fontWeight: 700, letterSpacing: '0.25em',
                cursor: 'pointer',
              }}
              onMouseDown={e => { e.currentTarget.style.transform = 'translate(3px,3px)'; e.currentTarget.style.boxShadow = 'none'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `3px 3px 0 0 ${COLORS.border}`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `3px 3px 0 0 ${COLORS.border}`; }}
            >
              {hasSave ? '1단계부터 다시 시작' : '학 습 시 작'}
            </button>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => { onOpenWrongNote(); }}
                style={{
                  flex: 1, padding: '8px 4px',
                  background: COLORS.bgPanel, color: COLORS.red,
                  border: `2px solid ${COLORS.red}`,
                  boxShadow: `2px 2px 0 0 ${COLORS.red}`,
                  fontFamily: '"Noto Serif KR", serif',
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
              >✗ 오답노트</button>
              <button
                onClick={() => { setShowResetConfirm(true); }}
                style={{
                  flex: 1, padding: '8px 4px',
                  background: COLORS.bgPanel, color: COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  fontFamily: '"Noto Serif KR", serif',
                  fontSize: 11, letterSpacing: '0.05em',
                  cursor: 'pointer',
                }}
              >전체 초기화</button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 9, color: COLORS.textMute, letterSpacing: '0.18em' }}>
            ― 남영동 방구석에서 펴냄 ―
          </div>
        </div>

        {/* 초기화 확인 모달 */}
        {showResetConfirm && (
          <div onClick={() => setShowResetConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ maxWidth: 300, width: '100%', background: COLORS.bgPanel, border: `3px solid ${COLORS.red}`, padding: '20px 18px', fontFamily: KOREAN_FONT }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.red, textAlign: 'center', marginBottom: 8, letterSpacing: '0.15em' }}>⚠ 전체 초기화</div>
              <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.7, marginBottom: 16, textAlign: 'center' }}>
                모든 기록(회차, 오답노트, 이어하기)이<br/>삭제됩니다. 계속하시겠습니까?
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <GlowBtn onClick={handleReset} color={COLORS.red} style={{ fontSize: 13 }}>초기화</GlowBtn>
                <GlowBtn onClick={() => { setShowResetConfirm(false); }} style={{ fontSize: 13 }}>취소</GlowBtn>
              </div>
            </div>
          </div>
        )}

        <style>{GLOBAL_STYLES}</style>
      </Screen>
    );
  }

  // ─── Level Up ──────────────────────────────────────────────────────────────
  // ─── Stage Complete ────────────────────────────────────────────────────────
  if (phase === 'stageComplete') {
    const nextStage = currentStage + 1;
    const nextR = RANKS[Math.min(nextStage, MAX_RANK_IDX)];
    const accuracy = Math.round((stageCorrect / STAGE_PROBLEMS_PER_STAGE) * 100);
    return (
      <Screen>
        <FontLoader />
        <div style={{ textAlign: 'center', animation: 'levelup 0.6s', maxWidth: 380, width: '100%', background: COLORS.bgPanel, border: `2px solid ${COLORS.border}`, boxShadow: `4px 4px 0 0 ${COLORS.border}`, padding: '32px 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 10, left: 0, right: 0, borderTop: `2px solid ${COLORS.red}` }}/>
          <div style={{ position: 'absolute', top: 16, left: 0, right: 0, borderTop: `1px solid ${COLORS.blue}` }}/>
          <div style={{ fontSize: 12, fontFamily: TITLE_FONT, letterSpacing: '0.4em', color: COLORS.red, marginBottom: 8, marginTop: 10, fontWeight: 700 }}>단 계 완 료</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.25em', marginBottom: 20 }}>{currentStage + 1}단계 완주</div>
          <div style={{ fontSize: 100, marginBottom: 12, lineHeight: 1, animation: 'bounce 0.5s' }}>{nextR.emoji}</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, fontFamily: TITLE_FONT, color: COLORS.textBright, letterSpacing: '0.15em' }}>{nextR.name}</div>
          <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 14, fontFamily: TITLE_FONT, fontStyle: 'italic' }}>『{nextR.desc}』</div>
          <div style={{ display: 'inline-block', padding: '5px 14px', border: `1px solid ${COLORS.border}`, marginBottom: 8, fontSize: 12, fontFamily: TITLE_FONT, color: COLORS.textDim, letterSpacing: '0.1em' }}>
            정답률 {stageCorrect} / {STAGE_PROBLEMS_PER_STAGE} ({accuracy}%)
          </div>
          <div style={{ display: 'inline-block', padding: '5px 14px', border: `2px solid ${COLORS.border}`, marginBottom: 24, marginLeft: 6, fontSize: 12, fontFamily: TITLE_FONT, fontWeight: 700, letterSpacing: '0.2em', color: COLORS.textBright }}>
            다음: {nextStage + 1} / {TOTAL_STAGES} 단계
          </div>
          <div style={{ maxWidth: 280, margin: '0 auto' }}>
            <GlowBtn onClick={continueAfterStage}>{nextStage + 1}단계 시작 ▶</GlowBtn>
          </div>
        </div>
        <style>{GLOBAL_STYLES}</style>
      </Screen>
    );
  }

  // ─── Graduated ─────────────────────────────────────────────────────────────
  if (phase === 'graduated') {
    const r = RANKS[MAX_RANK_IDX];
    return (
      <Screen>
        <FontLoader />
        <div style={{ textAlign: 'center', maxWidth: 420, width: '100%', background: COLORS.bgPanel, border: `3px double ${COLORS.border}`, boxShadow: `5px 5px 0 0 ${COLORS.border}`, padding: '36px 28px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 12, left: 0, right: 0, borderTop: `2px solid ${COLORS.red}` }}/>
          <div style={{ position: 'absolute', top: 18, left: 0, right: 0, borderTop: `1px solid ${COLORS.blue}` }}/>
          <div style={{ fontSize: 13, fontFamily: TITLE_FONT, letterSpacing: '0.4em', color: COLORS.red, marginBottom: 6, marginTop: 12, fontWeight: 700 }}>수 료 증</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.25em', marginBottom: 24 }}>본 학습 과정을 수료하였음을 증명함</div>
          <div style={{ fontSize: 100, marginBottom: 12, lineHeight: 1, animation: 'bounce 1.5s infinite' }}>{r.emoji}</div>
          <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 6, fontFamily: TITLE_FONT, color: COLORS.textBright, letterSpacing: '0.2em' }}>{r.name}</div>
          <div style={{ display: 'inline-block', padding: '6px 18px', marginBottom: 22, border: `2px solid ${COLORS.red}`, fontSize: 13, fontFamily: TITLE_FONT, fontWeight: 700, letterSpacing: '0.25em', color: COLORS.red }}>7 단계 완 주</div>
          <div style={{ padding: '16px 14px', marginBottom: 18, border: `1px solid ${COLORS.border}`, background: COLORS.bgPanelLight, fontSize: 13, color: COLORS.text, lineHeight: 1.9, fontFamily: TITLE_FONT, fontStyle: 'italic' }}>
            『시장은 인내가 없는 사람으로부터<br/>인내가 있는 사람에게로<br/>재화가 흘러가는 곳이다』
          </div>
          <div style={{ fontSize: 11, fontFamily: TITLE_FONT, color: COLORS.textDim, letterSpacing: '0.2em', marginBottom: 22 }}>
            누적 {storage.clearCount}회 수료
          </div>
          <div style={{ maxWidth: 320, margin: '0 auto' }}>
            <GlowBtn onClick={() => { startStage(0); }}>처음부터 다시 ▶</GlowBtn>
          </div>
          <div style={{ marginTop: 22, fontSize: 10, color: COLORS.textMute, fontFamily: TITLE_FONT, letterSpacing: '0.2em' }}>시장학습사 인증</div>
        </div>
        <style>{GLOBAL_STYLES}</style>
      </Screen>
    );
  }

  // ─── Playing ───────────────────────────────────────────────────────────────
  const r = RANKS[Math.min(currentStage, MAX_RANK_IDX)];
  const progressPct = Math.round((stageIdx / STAGE_PROBLEMS_PER_STAGE) * 100);
  const isCorrect = submitted && selected === problem.answer;

  const xTicks: number[] = [];
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor((visibleData.length - 1) * (i / 4));
    if (visibleData[idx]) xTicks.push(visibleData[idx].day);
  }

  if (chartLoading) {
    return (
      <Screen>
        <FontLoader />
        <div style={{ textAlign: 'center', fontFamily: TITLE_FONT }}>
          <div style={{ fontSize: 32, marginBottom: 16, animation: 'bounce 1s infinite' }}>📊</div>
          <div style={{ fontSize: 14, color: COLORS.textDim, letterSpacing: '0.2em' }}>차트 데이터 로딩 중...</div>
          <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 8, letterSpacing: '0.1em' }}>{problem.ticker}</div>
        </div>
        <style>{GLOBAL_STYLES}</style>
      </Screen>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at top, ${COLORS.bgPanel} 0%, ${COLORS.bg} 40%, ${COLORS.bgDeep} 100%)`,
      color: COLORS.text, fontFamily: KOREAN_FONT, padding: '6px 8px', position: 'relative',
    }}>
      <FontLoader />

      {/* HUD */}
      <div style={{ maxWidth: 720, margin: '0 auto 6px' }}>
        <GlowBox color={COLORS.border} bg={COLORS.bgPanel} style={{ padding: '6px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{r.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, fontFamily: KOREAN_FONT, color: COLORS.textBright, letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
              <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: TITLE_FONT, letterSpacing: '0.1em' }}>{currentStage + 1}단계 / {TOTAL_STAGES}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textBright, fontFamily: TITLE_FONT, lineHeight: 1 }}>
                {stageIdx + 1} / {STAGE_PROBLEMS_PER_STAGE}
              </div>
              <div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: TITLE_FONT, letterSpacing: '0.05em' }}>
                정답 {stageCorrect}
              </div>
            </div>
            <button
              onClick={() => { setPhase('intro'); }}
              style={{ padding: '2px 7px', fontSize: 10, background: 'none', border: `1px solid ${COLORS.borderDark}`, cursor: 'pointer', fontFamily: TITLE_FONT, color: COLORS.textDim, letterSpacing: '0.05em', flexShrink: 0 }}
            >메뉴</button>
          </div>
          <div style={{ height: 4, background: COLORS.bgDeep, border: `1px solid ${COLORS.border}` }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: COLORS.border, transition: 'width 0.5s' }}/>
          </div>
        </GlowBox>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* 문제 메타 */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap', fontSize: 10, fontFamily: TITLE_FONT, alignItems: 'center' }}>
          <span style={{ padding: '3px 8px', background: COLORS.bgPanel, color: COLORS.textBright, border: `1px solid ${COLORS.border}`, letterSpacing: '0.1em', fontWeight: 700 }}>{problem.market}</span>
          {(() => {
            const sector = problem.reveal.market.split(' · ').slice(1).join(' · ');
            return sector ? <span style={{ padding: '3px 8px', background: COLORS.bgPanel, color: COLORS.textDim, border: `1px solid ${COLORS.border}`, letterSpacing: '0.05em', fontWeight: 700 }}>{sector}</span> : null;
          })()}
          {problem.isTutorial && (
            <span style={{ padding: '3px 8px', background: COLORS.gold, color: '#fff', letterSpacing: '0.12em', fontWeight: 700, fontSize: 10, fontFamily: TITLE_FONT }}>✦ 연습</span>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setShowRSI(!showRSI)} style={toggleBtn(showRSI, COLORS.red)}>
              {showRSI ? '✓ RSI' : '+ RSI 보기'}
            </button>
          </div>
        </div>

        {/* 차트 */}
        <GlowBox id="tut-chart" color={COLORS.border} bg={COLORS.bgChart} style={{ padding: '6px 6px 2px', marginBottom: 6 }}>
          <div id="tut-legend" style={{ display: 'flex', gap: 10, marginBottom: 4, paddingLeft: 4, fontSize: 9, fontFamily: TITLE_FONT, fontWeight: 700, letterSpacing: '0.02em', flexWrap: 'wrap' }}>
            <LegendItem color={COLORS.blueBright} label={`종가(${priceUnit})`} />
            <LegendItem color={MA_COLORS.MA5}   label="MA5"   dashed />
            <LegendItem color={MA_COLORS.MA20}  label="MA20"  dashed />
            <LegendItem color={MA_COLORS.MA60}  label="MA60"  dashed />
            <LegendItem color={MA_COLORS.MA120} label="MA120" dashed />
            {showFutureZone && <LegendItem color={COLORS.gold} label="문제시점" vertical />}
            {showPreview && selected !== null && (
              <LegendItem color={CHOICE_PREVIEW_COLORS[selected] ?? COLORS.textDim} label={`예측 ${['①','②','③','④'][selected]}`} dashed />
            )}
            {showActualFuture && <LegendItem color={COLORS.goldBright} label="실제결과" />}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={visibleDataWithReveal} margin={{ top: 5, right: 22, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={COLORS.textMute} vertical={false} opacity={0.3}/>
              <XAxis dataKey="day" ticks={xTicks} tick={{ fontSize: 10, fill: COLORS.textDim, fontFamily: 'monospace' }}
                tickFormatter={(d) => { const item = fullData[d]; return item ? item.date : ''; }}
                axisLine={{ stroke: COLORS.borderDark }} tickLine={{ stroke: COLORS.borderDark }}/>
              <YAxis domain={[priceScale.min, priceScale.max]} ticks={priceScale.ticks} allowDecimals={false}
                tick={{ fontSize: 8, fill: COLORS.textDim, fontFamily: 'monospace' }}
                tickLine={false} width={50} tickFormatter={(v) => formatPrice(Number(v), priceUnit)} axisLine={{ stroke: COLORS.borderDark }}/>
              <Tooltip
                contentStyle={{ background: COLORS.bgDeep, border: `2px solid ${COLORS.gold}`, fontSize: 11, borderRadius: 2, fontFamily: 'monospace', color: COLORS.text }}
                labelFormatter={(d) => { const item = fullData[d as number]; return item ? `📅 ${item.date}` : ''; }}
                labelStyle={{ color: COLORS.goldBright, fontSize: 11, fontWeight: 700 }}
                formatter={(v, n) => [typeof v === 'number' ? formatPrice(v, priceUnit) : v, n]}
              />
              {/* 미래 구간 배경 틴트 */}
              {showFutureZone && <ReferenceArea x1={problem.revealDay - 1} x2={fullData.length - 1} fill={COLORS.gold} fillOpacity={0.07} stroke="none"/>}
              {/* 문제시점 수직선 */}
              {showFutureZone && <ReferenceLine x={problem.revealDay} stroke={COLORS.gold} strokeWidth={2} strokeDasharray="4 4"
                label={{ value: '◆ 문제시점', fill: COLORS.goldBright, fontSize: 11, position: 'top', fontFamily: 'monospace', fontWeight: 700 }}/>}
              {/* 과거 구간 파란 Line (revealDay 이전만) */}
              <Line type="monotone" dataKey="종가_past" stroke={COLORS.blueBright} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false}/>
              {/* 선택지 미리보기: 합성 dashed 컬러 선 (제출 전) */}
              {showPreview && selected !== null && (
                <Line type="monotone" dataKey="종가_preview"
                  stroke={CHOICE_PREVIEW_COLORS[selected] ?? COLORS.textDim}
                  strokeWidth={2.5} strokeDasharray="8 4"
                  dot={false} isAnimationActive={false} connectNulls={false}/>
              )}
              {/* 실제 결과: 금색 선 (제출 후) */}
              {showActualFuture && (
                <Line type="monotone" dataKey="종가_미래" stroke={COLORS.goldBright} strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={false}/>
              )}
              {/* MA5: 하늘색 · 촘촘한 점선 (단기) */}
              <Line type="monotone" dataKey="MA5"   stroke={MA_COLORS.MA5}   strokeWidth={0.8} strokeDasharray="2 2" dot={false} isAnimationActive={false}/>
              {/* MA20: 앰버 · 중간 점선 (중기) */}
              <Line type="monotone" dataKey="MA20"  stroke={MA_COLORS.MA20}  strokeWidth={0.9} strokeDasharray="4 2" dot={false} isAnimationActive={false}/>
              {/* MA60: 보라 · 긴 점선 (장기) */}
              <Line type="monotone" dataKey="MA60"  stroke={MA_COLORS.MA60}  strokeWidth={1.0} strokeDasharray="7 2" dot={false} isAnimationActive={false}/>
              {/* MA120: 빨강 · 실선 (반년선 · 가장 느림) */}
              <Line type="monotone" dataKey="MA120" stroke={MA_COLORS.MA120} strokeWidth={1.1} strokeDasharray="10 3" dot={false} isAnimationActive={false}/>
            </ComposedChart>
          </ResponsiveContainer>

          <div id="tut-volume">
            <div style={{ fontSize: 9, fontFamily: TITLE_FONT, color: COLORS.blueBright, letterSpacing: '0.1em', paddingLeft: 4, marginTop: 3, marginBottom: 1, fontWeight: 700 }}>거래량</div>
            <ResponsiveContainer width="100%" height={36}>
                <ComposedChart data={visibleDataWithReveal} margin={{ top: 0, right: 22, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={COLORS.textMute} vertical={false} opacity={0.2}/>
                <XAxis dataKey="day" tick={false} height={0} axisLine={false}/>
                <YAxis tick={{ fontSize: 8, fill: COLORS.textDim, fontFamily: 'monospace' }} tickLine={false} width={50}
                  tickFormatter={(v) => formatVolume(Number(v))}
                  axisLine={{ stroke: COLORS.borderDark }}/>
                <Tooltip contentStyle={{ background: COLORS.bgDeep, border: `2px solid ${COLORS.blue}`, fontSize: 11, fontFamily: 'monospace', color: COLORS.text }}
                  formatter={(v) => [Number(v).toLocaleString(), '거래량']}
                  labelFormatter={(d) => { const item = fullData[d as number]; return item ? item.date : ''; }}/>
                {showFutureZone && <ReferenceArea x1={problem.revealDay - 1} x2={fullData.length - 1} fill={COLORS.gold} fillOpacity={0.07} stroke="none"/>}
                {showFutureZone && <ReferenceLine x={problem.revealDay} stroke={COLORS.gold} strokeDasharray="4 4"/>}
                <Bar dataKey="거래량">
                  {visibleDataWithReveal.map((d, i) => {
                    const prev = i > 0 ? visibleDataWithReveal[i - 1].종가 : d.종가;
                    return <Cell key={i} fill={d.종가 >= prev ? COLORS.green : COLORS.red} fillOpacity={0.7}/>;
                  })}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {showRSI && (
            <>
              <div style={{ fontSize: 9, fontFamily: TITLE_FONT, color: COLORS.red, letterSpacing: '0.1em', paddingLeft: 4, marginTop: 3, marginBottom: 1, fontWeight: 700 }}>RSI(14) · 70↑과매수 / 30↓과매도</div>
              <ResponsiveContainer width="100%" height={50}>
                <ComposedChart data={visibleDataWithReveal} margin={{ top: 0, right: 22, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={COLORS.textMute} vertical={false} opacity={0.2}/>
                  <XAxis dataKey="day" tick={false} height={0} axisLine={false}/>
                  <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fontSize: 9, fill: COLORS.textDim, fontFamily: 'monospace' }} tickLine={false} width={50} axisLine={{ stroke: COLORS.borderDark }}/>
                  <Tooltip contentStyle={{ background: COLORS.bgDeep, border: `2px solid ${COLORS.pink}`, fontSize: 11, fontFamily: 'monospace', color: COLORS.text }}
                    labelFormatter={(d) => { const item = fullData[d as number]; return item ? item.date : ''; }}/>
                  <ReferenceLine y={70} stroke={COLORS.red} strokeDasharray="2 3" opacity={0.6}/>
                  <ReferenceLine y={30} stroke={COLORS.green} strokeDasharray="2 3" opacity={0.6}/>
                  {showFutureZone && <ReferenceArea x1={problem.revealDay - 1} x2={fullData.length - 1} fill={COLORS.gold} fillOpacity={0.08} stroke="none"/>}
                  {showFutureZone && <ReferenceLine x={problem.revealDay} stroke={COLORS.gold} strokeDasharray="4 4"/>}
                  <Line type="monotone" dataKey="RSI" stroke={COLORS.pink} strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </>
          )}
        </GlowBox>

        {/* 매크로 */}
        {(() => {
          const posCount = problem.macroHints.filter(h => h.tone === 'positive').length;
          const negCount = problem.macroHints.filter(h => h.tone === 'negative').length;
          const overallTone = posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'mixed';
          const toneLabel = overallTone === 'positive' ? '우호적' : overallTone === 'negative' ? '부정적' : '혼재';
          const toneColor = overallTone === 'positive' ? COLORS.green : overallTone === 'negative' ? COLORS.red : COLORS.textDim;
          return (
            <div id="tut-macro" style={{ marginBottom: 8, background: COLORS.bgPanel, border: `2px solid ${COLORS.border}`, boxShadow: `2px 2px 0 0 ${COLORS.borderDark}`, padding: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 2px 7px', marginBottom: 7, borderBottom: `1px dashed ${COLORS.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.15em', fontWeight: 700, fontFamily: TITLE_FONT }}>매크로 환경</span>
                  <span style={{ display: 'flex', gap: 3 }}>
                    {problem.macroHints.map((h, i) => {
                      const c = h.tone === 'positive' ? COLORS.green : h.tone === 'negative' ? COLORS.red : COLORS.textDim;
                      return <span key={i} style={{ width: 8, height: 8, background: c, display: 'inline-block', border: `1px solid ${COLORS.border}` }}/>;
                    })}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: toneColor, fontWeight: 700, letterSpacing: '0.1em', fontFamily: KOREAN_FONT }}>{toneLabel}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
                {problem.macroHints.map((h, i) => {
                  const c = h.tone === 'positive' ? COLORS.green : h.tone === 'negative' ? COLORS.red : COLORS.textDim;
                  return (
                    <div key={i} style={{ background: COLORS.bgPanelLight, border: `1px solid ${c}`, borderLeft: `4px solid ${c}`, padding: '6px 9px', minHeight: 58 }}>
                      <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: TITLE_FONT }}><GlossaryText text={h.label} onTerm={setActiveTerm} /></div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: KOREAN_FONT }}><GlossaryText text={h.value} onTerm={setActiveTerm} /></div>
                      <div style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.35, fontFamily: KOREAN_FONT }}><GlossaryText text={h.trend} onTerm={setActiveTerm} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 밸류에이션 */}
        {problem.valuationHints && problem.valuationHints.length > 0 && (
          <div style={{ marginBottom: 8, background: COLORS.bgPanel, border: `2px solid ${COLORS.border}`, boxShadow: `2px 2px 0 0 ${COLORS.borderDark}`, padding: 8 }}>
            <div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.15em', fontWeight: 700, fontFamily: TITLE_FONT, marginBottom: 7, paddingBottom: 7, borderBottom: `1px dashed ${COLORS.border}` }}>밸류에이션</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
              {problem.valuationHints.map((v, i) => {
                const c = v.tone === 'cheap' ? COLORS.blue : v.tone === 'expensive' ? COLORS.red : v.tone === 'fair' ? COLORS.green : COLORS.textDim;
                return (
                  <div key={i} style={{ background: COLORS.bgPanelLight, border: `1px solid ${c}`, borderLeft: `4px solid ${c}`, padding: '6px 9px' }}>
                    <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: TITLE_FONT }}>{v.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: KOREAN_FONT }}>{v.value}</div>
                    <div style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.35, fontFamily: KOREAN_FONT }}>{v.context}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 질문 + 보기 */}
        <div id="tut-choices" style={{ marginBottom: 8, background: COLORS.bgPanel, border: `2px solid ${COLORS.border}`, boxShadow: `2px 2px 0 0 ${COLORS.borderDark}`, padding: 8 }}>
          <div style={{ padding: '2px 2px 8px', marginBottom: 8, borderBottom: `1px dashed ${COLORS.border}` }}>
            <div style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: '0.15em', fontFamily: TITLE_FONT, fontWeight: 700, marginBottom: 4 }}>문제</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: COLORS.textBright, fontFamily: KOREAN_FONT, fontWeight: 600 }}>
              {anonymizeQ(problem.question, problem.reveal.title)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
            {problem.choices.map((c, i) => {
              const isSel = selected === i;
              const isAns = submitted && i === problem.answer;
              const isWrong = submitted && isSel && i !== problem.answer;
              const pColor = CHOICE_PREVIEW_COLORS[i] ?? COLORS.red;
              let bg: string = COLORS.bgPanelLight, bd: string = COLORS.border, col: string = COLORS.text;
              if (isAns) { bg = '#dcf5e0'; bd = COLORS.green; col = '#14532d'; }
              else if (isWrong) { bg = '#fde2e1'; bd = COLORS.red; col = '#7f1d1d'; }
              else if (isSel && !submitted) { bg = `${pColor}18`; bd = pColor; col = COLORS.textBright; }
              else if (isSel && submitted) { bg = '#fff7d6'; bd = COLORS.red; col = COLORS.textBright; }
              return (
                <button key={i} onClick={() => !submitted && setSelected(prev => prev === i ? null : i)} disabled={submitted}
                  style={{ display: 'flex', gap: 8, padding: '8px 9px', minHeight: 46, background: bg, border: `2px solid ${bd}`, boxShadow: isSel || isAns || isWrong ? `2px 2px 0 0 ${bd}` : `2px 2px 0 0 ${COLORS.border}`, borderRadius: 2, color: col, cursor: submitted ? 'default' : 'pointer', textAlign: 'left', fontSize: 12.5, lineHeight: 1.35, fontFamily: KOREAN_FONT, transition: 'all 0.1s', alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: TITLE_FONT, color: isAns ? COLORS.green : isSel && !submitted ? pColor : COLORS.red, fontWeight: 700, flexShrink: 0, fontSize: 12.5 }}>{['①', '②', '③', '④', '⑤'][i]}</span>
                  <span><GlossaryText text={c} onTerm={setActiveTerm} /></span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 해설 + 종목 공개 통합 박스 */}
        {submitted && (
          <GlowBox color={isCorrect ? COLORS.greenBright : COLORS.redBright} bg={COLORS.bgPanel} style={{ padding: '14px 16px', marginBottom: 10 }}>
            {/* 헤더: 정답/오답 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontFamily: TITLE_FONT, letterSpacing: '0.15em', color: isCorrect ? COLORS.greenBright : COLORS.redBright, fontWeight: 700 }}>
                {isCorrect ? '✓ 정답!' : '✗ 오답'} · 답: {['1', '2', '3', '4'][problem.answer]}
              </div>
              <div style={{ fontSize: 10, fontFamily: TITLE_FONT, color: COLORS.textDim }}>
                {stageIdx + 1} / {STAGE_PROBLEMS_PER_STAGE}
              </div>
            </div>

            {/* 설명 */}
            <div style={{ fontSize: 14, lineHeight: 1.75, color: COLORS.text, fontFamily: KOREAN_FONT, marginBottom: 10 }}>
              <GlossaryText text={problem.explanation} onTerm={setActiveTerm} />
            </div>

            {/* 실제 종목 공개 (인라인) */}
            {problem.reveal && (
              <div style={{ marginBottom: 10, padding: '8px 10px', background: COLORS.bgDeep, borderLeft: `3px solid ${COLORS.gold}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.textBright, fontFamily: KOREAN_FONT }}>{problem.reveal.title}</div>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: TITLE_FONT, letterSpacing: '0.05em' }}>{problem.reveal.market} · {problem.reveal.period}</div>
              </div>
            )}

          </GlowBox>
        )}

        {submitted ? (
          <GlowBtn onClick={handleNext} color={stageIdx + 1 >= STAGE_PROBLEMS_PER_STAGE ? COLORS.goldBright : COLORS.greenBright}>
            {problem.isTutorial ? '학습 시작하기 ▶' : stageIdx + 1 >= STAGE_PROBLEMS_PER_STAGE ? '★ 단계 완료 ▶' : '다음 문제 ▶'}
          </GlowBtn>
        ) : (
          <GlowBtn onClick={handleSubmit} disabled={selected === null} color={COLORS.goldBright}>
            ▶ 제출하기
          </GlowBtn>
        )}
      </div>

      <style>{GLOBAL_STYLES}</style>
      <GlossaryModal term={activeTerm} onClose={() => setActiveTerm(null)} />

      {/* Tutorial overlay — rendered on top of everything when active */}
      {tutorialStep !== null && (
        <Tutorial
          step={tutorialStep}
          onNext={advanceTutorialStep}
          onSkip={skipTutorial}
        />
      )}
    </div>
  );
}
