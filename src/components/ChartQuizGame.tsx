import { useState, useEffect } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, ComposedChart, Bar, Cell,
} from 'recharts';

import { COLORS } from '../constants/colors';
import { RANKS, RANK_CAPITALS, START_CAPITAL, GAMEOVER_CAPITAL, MAX_RANK_IDX } from '../constants/ranks';
import { PROBLEM_POOL, difficultyShuffle } from '../data/problems';
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

// 선택지 미리보기 색상 (0=급등 녹색, 1=상승 연녹, 2=횡보 노랑, 3=하락 빨강, 4=급락 보라)
const CHOICE_PREVIEW_COLORS = ['#4caf50', '#8bc34a', '#ffc107', '#ef5350', '#9c27b0'];

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
 * choiceIdx 0 = 최상(급등), N-1 = 최하(급락)
 *
 * 곡선 형태:
 *   0 (강한 상승) → 가속형: 완만하게 시작 후 후반에 급격히 치솟음
 *   1 (완만 상승) → S자: 부드럽게 우상향
 *   2 (횡보)     → 진동: 방향성 없이 오르내림
 *   3 (하락)     → 폭포형: 초반에 빠르게 떨어지고 후반 완만
 */
function generatePreviewPath(
  startPrice: number,
  choiceIdx: number,
  numPoints: number,
  numChoices = 4,
  yAxisRange = 0, // y축 전체 범위 — 스파이크 차트에서 진폭 보정에 사용
): number[] {
  const targets4 = [0.68,  0.28,  0.00, -0.45];
  const targets5 = [0.75,  0.35,  0.00, -0.30, -0.58];
  const tgts = numChoices >= 5 ? targets5 : targets4;
  const targetPct = tgts[choiceIdx] ?? 0;

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
    if (targetPct >= 0.5) {
      progress = Math.pow(t, 1.5);           // 가속형 (급등)
    } else if (targetPct > 0) {
      progress = t * t * (3 - 2 * t);        // S자 (완만 상승)
    } else if (targetPct > -0.25) {
      progress = 1 - Math.pow(1 - t, 1.8);   // 완만 하락
    } else {
      progress = 1 - Math.pow(1 - t, 3.5);   // 폭포형 (급락)
    }

    const noise = 0.014 * Math.sin(t * Math.PI * 6.3) * Math.exp(-t * 2);
    return startPrice + targetDelta * progress + noise * startPrice;
  });
}

function getRankByCapital(capital: number) {
  let idx = 0;
  for (let i = 0; i < RANK_CAPITALS.length; i++) {
    if (capital >= RANK_CAPITALS[i]) idx = i;
  }
  return Math.min(MAX_RANK_IDX, idx);
}

function formatCapital(capital: number) {
  if (capital >= 10000) {
    const eok = capital / 10000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억`;
  }
  return `${Math.round(capital).toLocaleString()}만`;
}

function getTradeReturn(problem: Problem, correct: boolean, combo: number, lossStreak: number) {
  if (correct) {
    const base = problem.difficulty === 'hard' ? 0.08 : problem.difficulty === 'medium' ? 0.065 : 0.05;
    const bonus = combo >= 2 ? Math.min(0.03, (combo - 1) * 0.01) : 0;
    return base + bonus;
  }
  return lossStreak >= 2 ? -0.15 : lossStreak === 1 ? -0.1 : -0.07;
}

interface Props {
  onOpenWrongNote: () => void;
}

export default function ChartQuizGame({ onOpenWrongNote }: Props) {
  const { data: storage, save: saveStorage, reset: resetStorage } = useGameStorage();

  const [phase, setPhase] = useState<'intro' | 'playing' | 'levelup' | 'gameover' | 'ending'>('intro');
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [capital, setCapital] = useState(START_CAPITAL);
  const [peakCapital, setPeakCapital] = useState(START_CAPITAL);
  const [rank, setRank] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lossStreak, setLossStreak] = useState(0);
  const [runCount, setRunCount] = useState(1);
  const [pendingLevelUp, setPendingLevelUp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [problemQueue, setProblemQueue] = useState<Problem[]>(() => difficultyShuffle(PROBLEM_POOL));
  const [problemIdx, setProblemIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [, setRevealed] = useState(false);
  const [lastReturnPct, setLastReturnPct] = useState(0);
  const [lastCapitalDelta, setLastCapitalDelta] = useState(0);
  const [showRSI, setShowRSI] = useState(false);
  // macro is always visible — toggle removed
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  const problem = problemQueue[problemIdx % problemQueue.length];

  useEffect(() => {
    if (phase !== 'playing') return;
    let cancelled = false;
    setChartLoading(true);
    loadChartData(problem.ticker, problem.startDate, problem.chartDays ?? 120)
      .then(data => { if (!cancelled) { setChartData(data); setChartLoading(false); } })
      .catch(() => {
        if (!cancelled) {
          setChartData(generateChart((problem.id + runCount * 100) * 137, problem.pattern, problem.startDate));
          setChartLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [problem, phase, runCount]);

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
    ? generatePreviewPath(revealPrice, selected, fullData.length - problem.revealDay + 1, problem.choices.length, yAxisRange)
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

  const resetAccount = () => {
    setCapital(START_CAPITAL);
    setPeakCapital(START_CAPITAL);
    setRank(0);
    setCombo(0);
    setLossStreak(0);
    setLastReturnPct(0);
    setLastCapitalDelta(0);
  };

  const persistSession = (overrides: { problemIdx?: number; capital?: number; peakCapital?: number; rank?: number; combo?: number; lossStreak?: number } = {}) => {
    saveStorage({
      savedSession: {
        capital: overrides.capital ?? capital,
        peakCapital: overrides.peakCapital ?? peakCapital,
        rank: overrides.rank ?? rank,
        combo: overrides.combo ?? combo,
        lossStreak: overrides.lossStreak ?? lossStreak,
        runCount,
        problemQueueIds: problemQueue.map(p => p.id),
        problemIdx: overrides.problemIdx ?? problemIdx,
      },
    });
  };

  const startGame = () => {
    const newRunCount = runCount + (phase !== 'intro' ? 1 : 0);
    const queue = difficultyShuffle(PROBLEM_POOL);
    setPhase('playing');
    resetAccount();
    setRunCount(newRunCount);
    setProblemQueue(queue);
    setProblemIdx(0);
    setSelected(null); setSubmitted(false); setRevealed(false);
    setPendingLevelUp(false);
    saveStorage({
      totalRuns: storage.totalRuns + 1,
      savedSession: {
        capital: START_CAPITAL, peakCapital: START_CAPITAL, rank: 0, combo: 0, lossStreak: 0,
        runCount: newRunCount,
        problemQueueIds: queue.map(p => p.id),
        problemIdx: 0,
      },
    });
  };

  const resumeGame = () => {
    const s = storage.savedSession!;
    const queue = s.problemQueueIds
      .map(id => PROBLEM_POOL.find(p => p.id === id))
      .filter(Boolean) as Problem[];
    const restoredCapital = s.capital ?? START_CAPITAL + (s.points ?? 0);
    setCapital(restoredCapital);
    setPeakCapital(s.peakCapital ?? Math.max(START_CAPITAL, restoredCapital));
    setRank(s.rank);
    setCombo(s.combo);
    setLossStreak(s.lossStreak ?? 0);
    setRunCount(s.runCount);
    setProblemQueue(queue);
    setProblemIdx(s.problemIdx);
    setSelected(null); setSubmitted(false); setRevealed(false);
    setPendingLevelUp(false);
    setPhase('playing');
  };

  const handleSubmit = () => {
    if (selected === null) return;
    const correct = selected === problem.answer;
    setSubmitted(true);
    setRevealed(true);

    // ── Tutorial problem: no account/storage effects ───────────────────────
    if (problem.isTutorial) {
      setLastReturnPct(0);
      setLastCapitalDelta(0);
      return;
    }

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

    if (correct) {
      const newCombo = combo + 1;
      const returnPct = getTradeReturn(problem, true, newCombo, 0);
      const delta = capital * returnPct;
      const newCapital = Math.round(capital + delta);
      const newPeakCapital = Math.max(peakCapital, newCapital);
      setLastReturnPct(returnPct);
      setLastCapitalDelta(delta);
      setCombo(newCombo);
      setLossStreak(0);
      setCapital(newCapital);
      setPeakCapital(newPeakCapital);

      const newRank = getRankByCapital(newCapital);
      if (newRank > rank) {
        setRank(newRank);
        if (newRank > storage.bestRank) saveStorage({ bestRank: newRank });
        setPendingLevelUp(true);
      }
      if (newCapital > storage.bestPoints) saveStorage({ bestPoints: newCapital });
    } else {
      const newLossStreak = lossStreak + 1;
      const returnPct = getTradeReturn(problem, false, combo, newLossStreak);
      const delta = capital * returnPct;
      const newCapital = Math.max(0, Math.round(capital + delta));
      setCapital(newCapital);
      setCombo(0);
      setLossStreak(newLossStreak);
      setLastReturnPct(returnPct);
      setLastCapitalDelta(delta);
      if (newCapital <= GAMEOVER_CAPITAL) {
        saveStorage({ savedSession: null });
        setTimeout(() => setPhase('gameover'), 1500);
      }
    }
  };

  const handleNext = () => {
    // ── Tutorial complete: save flag → go to intro ─────────────────────────
    if (problem.isTutorial) {
      localStorage.setItem('tutorialCompleted', 'true');
      setTutorialStep(null);
      setPhase('intro');
      resetAccount();
      setProblemQueue(difficultyShuffle(PROBLEM_POOL));
      setProblemIdx(0);
      setSelected(null); setSubmitted(false); setRevealed(false);
      return;
    }

    if (pendingLevelUp) {
      if (rank >= MAX_RANK_IDX) {
        saveStorage({ clearCount: storage.clearCount + 1, savedSession: null });
        setPhase('ending');
      } else {
        persistSession({ problemIdx: problemIdx + 1 });
        setPhase('levelup');
      }
      return;
    }
    persistSession({ problemIdx: problemIdx + 1 });
    setProblemIdx(problemIdx + 1);
    setSelected(null); setSubmitted(false); setRevealed(false); setLastReturnPct(0); setLastCapitalDelta(0);
  };

  const continueAfterLevelup = () => {
    setPendingLevelUp(false);
    setPhase('playing');
    setProblemIdx(problemIdx + 1);
    setSelected(null); setSubmitted(false); setRevealed(false); setLastReturnPct(0); setLastCapitalDelta(0);
  };

  const retry = () => { startGame(); };

  // ─── Tutorial controls ────────────────────────────────────────────────────
  const startTutorialGame = () => {
    localStorage.removeItem('tutorialCompleted');
    setTutorialStep(0);
    setPhase('playing');
    setProblemQueue([TUTORIAL_PROBLEM]);
    setProblemIdx(0);
    setSelected(null); setSubmitted(false); setRevealed(false);
    resetAccount(); setPendingLevelUp(false);
  };

  const advanceTutorialStep = () => {
    if (tutorialStep === null) return;
    if (tutorialStep < 4) {
      setTutorialStep(tutorialStep + 1);
    } else {
      // Last step done — dismiss overlay so user can interact
      setTutorialStep(null);
    }
  };

  const skipTutorial = () => {
    localStorage.setItem('tutorialCompleted', 'true');
    setTutorialStep(null);
    setPhase('intro');
    resetAccount();
    setProblemQueue(difficultyShuffle(PROBLEM_POOL));
    setProblemIdx(0);
    setSelected(null); setSubmitted(false); setRevealed(false);
  };

  const handleReset = () => {
    resetStorage();
    setShowResetConfirm(false);
    setPhase('intro');
    resetAccount(); setRunCount(1);
    setProblemQueue(difficultyShuffle(PROBLEM_POOL));
    setProblemIdx(0);
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

          <div style={{ position: 'absolute', top: 20, right: 10, fontSize: 9, color: COLORS.textMute, fontFamily: TITLE_FONT, letterSpacing: '0.1em' }}>#3</div>

          <div style={{ textAlign: 'center', marginBottom: 7, marginTop: 24, fontSize: 9, color: COLORS.textDim, letterSpacing: '0.28em' }}>
            ANALYZING · BUYING · PRAYING
          </div>
          <div style={{ textAlign: 'center', marginBottom: 7, fontSize: 12, color: COLORS.red, fontWeight: 600, letterSpacing: '0.17em' }}>
            ～ 이 론 편 ～
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
            <div>① 시드 1,000만원으로 시작 · 500만원 이하면 퇴장</div>
            <div>② 정답은 수익 · 오답은 손실 · 연속 손실은 더 아픔</div>
            <div>③ 계좌가 커질수록 진화 (1억원 도달 = 수료)</div>
          </div>

          {/* 기록 패널 */}
          {(s.totalRuns > 0 || s.bestRank > 0) && (
            <div style={{
              marginBottom: 10, padding: '8px 10px',
              border: `1px solid ${COLORS.borderDark}`,
              background: COLORS.bgPanelLight,
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6, textAlign: 'center',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.textBright, fontFamily: TITLE_FONT }}>{s.totalRuns}</div>
                <div style={{ fontSize: 9, color: COLORS.textMute, letterSpacing: '0.1em' }}>총 회차</div>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.gold, fontFamily: TITLE_FONT }}>
                  {RANKS[s.bestRank].emoji} {s.bestRank + 1}단
                </div>
                <div style={{ fontSize: 9, color: COLORS.textMute, letterSpacing: '0.1em' }}>최고 단계</div>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.clearCount > 0 ? COLORS.red : COLORS.textDim, fontFamily: TITLE_FONT }}>
                  {s.clearCount > 0 ? `★ ${s.clearCount}회` : '0회'}
                </div>
                <div style={{ fontSize: 9, color: COLORS.textMute, letterSpacing: '0.1em' }}>엔딩 도달</div>
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
                ▷ 이어하기 ({formatCapital(storage.savedSession!.capital ?? START_CAPITAL + (storage.savedSession!.points ?? 0))})
              </button>
            )}
            <button
              onClick={() => {
                if (!hasSave && !localStorage.getItem('tutorialCompleted')) {
                  startTutorialGame();
                } else {
                  startGame();
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
              {hasSave ? '새 게임 시작' : '학 습 시 작'}
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
  if (phase === 'levelup') {
    const r = RANKS[rank];
    return (
      <Screen>
        <FontLoader />
        <div style={{ textAlign: 'center', animation: 'levelup 0.6s', maxWidth: 380, width: '100%', background: COLORS.bgPanel, border: `2px solid ${COLORS.border}`, boxShadow: `4px 4px 0 0 ${COLORS.border}`, padding: '32px 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 10, left: 0, right: 0, borderTop: `2px solid ${COLORS.red}` }}/>
          <div style={{ position: 'absolute', top: 16, left: 0, right: 0, borderTop: `1px solid ${COLORS.blue}` }}/>
          <div style={{ fontSize: 12, fontFamily: TITLE_FONT, letterSpacing: '0.4em', color: COLORS.red, marginBottom: 8, marginTop: 10, fontWeight: 700 }}>진 급 증</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.25em', marginBottom: 20 }}>다음 단계 진입</div>
          <div style={{ fontSize: 100, marginBottom: 12, lineHeight: 1, animation: 'bounce 0.5s' }}>{r.emoji}</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, fontFamily: TITLE_FONT, color: COLORS.textBright, letterSpacing: '0.15em' }}>{r.name}</div>
          <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 12, fontFamily: TITLE_FONT, fontStyle: 'italic' }}>『{r.desc}』</div>
          <div style={{ display: 'inline-block', padding: '6px 18px', border: `2px solid ${COLORS.border}`, marginBottom: 24, fontSize: 13, fontFamily: TITLE_FONT, fontWeight: 700, letterSpacing: '0.2em', color: COLORS.textBright }}>{r.lv} / 7 단계</div>
          <div style={{ maxWidth: 280, margin: '0 auto' }}>
            <GlowBtn onClick={continueAfterLevelup}>다음 학습 ▶</GlowBtn>
          </div>
        </div>
        <style>{GLOBAL_STYLES}</style>
      </Screen>
    );
  }

  // ─── Game Over ─────────────────────────────────────────────────────────────
  if (phase === 'gameover') {
    const r = RANKS[rank];
    return (
      <Screen>
        <FontLoader />
        <div style={{ textAlign: 'center', maxWidth: 380, width: '100%', background: COLORS.bgPanel, border: `2px solid ${COLORS.border}`, boxShadow: `4px 4px 0 0 ${COLORS.border}`, padding: '32px 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 10, left: 0, right: 0, borderTop: `3px solid ${COLORS.red}` }}/>
          <div style={{ position: 'absolute', top: 17, left: 0, right: 0, borderTop: `1px solid ${COLORS.red}` }}/>
          <div style={{ fontSize: 13, fontFamily: TITLE_FONT, letterSpacing: '0.4em', color: COLORS.red, marginBottom: 8, marginTop: 14, fontWeight: 700 }}>학 습 중 단</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.25em', marginBottom: 20 }}>시드머니가 위험선 아래로 내려갔습니다</div>
          <div style={{ fontSize: 64, marginBottom: 14, filter: 'grayscale(0.4)' }}>💀</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 6, fontFamily: TITLE_FONT, letterSpacing: '0.15em' }}>최종 도달 단계</div>
          <div style={{ fontSize: 52, marginBottom: 4 }}>{r.emoji}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, fontFamily: TITLE_FONT, color: COLORS.textBright, letterSpacing: '0.1em' }}>{r.name}</div>
          <div style={{ display: 'inline-block', padding: '5px 14px', marginBottom: 22, border: `1px solid ${COLORS.border}`, fontSize: 11, fontFamily: TITLE_FONT, color: COLORS.textDim, letterSpacing: '0.15em' }}>{formatCapital(capital)} · {r.lv}단계</div>
          <div style={{ maxWidth: 280, margin: '0 auto' }}>
            <GlowBtn onClick={retry}>다시 학습하기 ▶</GlowBtn>
          </div>
        </div>
        <style>{GLOBAL_STYLES}</style>
      </Screen>
    );
  }

  // ─── Ending ────────────────────────────────────────────────────────────────
  if (phase === 'ending') {
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
            최종 {formatCapital(capital)} · 누적 {storage.clearCount}회 수료
          </div>
          <div style={{ maxWidth: 320, margin: '0 auto' }}>
            <GlowBtn onClick={retry}>다시 학습 ▶</GlowBtn>
          </div>
          <div style={{ marginTop: 22, fontSize: 10, color: COLORS.textMute, fontFamily: TITLE_FONT, letterSpacing: '0.2em' }}>시장학습사 인증</div>
        </div>
        <style>{GLOBAL_STYLES}</style>
      </Screen>
    );
  }

  // ─── Playing ───────────────────────────────────────────────────────────────
  const r = RANKS[rank];
  const currentRankFloor = RANK_CAPITALS[rank] ?? START_CAPITAL;
  const nextRankTarget = RANK_CAPITALS[Math.min(rank + 1, MAX_RANK_IDX)] ?? RANK_CAPITALS[MAX_RANK_IDX];
  const progressPct = rank >= MAX_RANK_IDX
    ? 100
    : Math.max(0, Math.min(100, ((capital - currentRankFloor) / (nextRankTarget - currentRankFloor)) * 100));
  const drawdownPct = peakCapital > 0 ? ((capital - peakCapital) / peakCapital) * 100 : 0;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{r.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, fontFamily: KOREAN_FONT, color: COLORS.textBright, letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
              <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: TITLE_FONT, letterSpacing: '0.1em' }}>{r.lv}단계</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 88 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textBright, fontFamily: TITLE_FONT, lineHeight: 1 }}>
                {formatCapital(capital)}
              </div>
              <div style={{ fontSize: 9, color: drawdownPct < -10 ? COLORS.red : COLORS.textDim, fontFamily: TITLE_FONT, letterSpacing: '0.05em' }}>
                MDD {drawdownPct.toFixed(1)}%
              </div>
              {combo >= 3 && (
                <div style={{ fontSize: 10, fontFamily: TITLE_FONT, color: COLORS.red, fontWeight: 700, animation: 'blink 0.5s infinite' }}>🔥 {combo}연속</div>
              )}
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
              <LegendItem color={CHOICE_PREVIEW_COLORS[selected] ?? COLORS.textDim} label={`예측 ${['①','②','③','④','⑤'][selected]}`} dashed />
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
            {/* 헤더: 정답/오답 + 계좌 변화 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontFamily: TITLE_FONT, letterSpacing: '0.15em', color: isCorrect ? COLORS.greenBright : COLORS.redBright, fontWeight: 700 }}>
                {isCorrect ? '✓ 정답!' : '✗ 오답'} · 답: {['1', '2', '3', '4'][problem.answer]}
              </div>
              {lastReturnPct !== 0 && (
                <div style={{ fontSize: 11, fontFamily: TITLE_FONT, color: lastReturnPct > 0 ? COLORS.greenBright : COLORS.redBright, fontWeight: 700 }}>
                  {lastReturnPct > 0 ? '+' : ''}{(lastReturnPct * 100).toFixed(1)}%
                  <span style={{ marginLeft: 5 }}>
                    {lastCapitalDelta > 0 ? '+' : ''}{Math.round(lastCapitalDelta).toLocaleString()}만
                  </span>
                  {combo >= 3 && lastReturnPct > 0 && <span style={{ color: COLORS.pink, marginLeft: 4 }}>🔥×{combo}</span>}
                </div>
              )}
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

            {/* ★ 레슨 */}
          </GlowBox>
        )}

        {submitted ? (
          <GlowBtn onClick={handleNext} color={pendingLevelUp ? COLORS.goldBright : COLORS.greenBright}>
            {problem.isTutorial ? '학습 시작하기 ▶' : pendingLevelUp ? '★ 다음 (LEVEL UP!) ▶' : '다음 문제 ▶'}
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
