import { useState, useEffect } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, Area, ComposedChart, Bar, Cell,
} from 'recharts';

import { COLORS } from '../constants/colors';
import { RANKS, LEVEL_UP_POINTS, MAX_RANK_IDX } from '../constants/ranks';
import { PROBLEM_POOL, difficultyShuffle } from '../data/problems';
import { generateChart } from '../utils/chartGenerator';
import { loadChartData } from '../utils/dataLoader';
import { useGameStorage } from '../hooks/useGameStorage';
import { useSound } from '../hooks/useSound';
import type { ChartDataPoint, Problem } from '../types';
import EvolutionFigure from './EvolutionFigure';
import { GlossaryText, GlossaryModal } from './GlossaryText';
import Tutorial from './Tutorial';
import { TUTORIAL_PROBLEM } from '../data/tutorialProblem';
import {
  GlowBox, GlowBtn, LegendItem, Screen, FontLoader,
  toggleBtn, TITLE_FONT, KOREAN_FONT, GLOBAL_STYLES,
} from './GameUI';

interface Props {
  onOpenWrongNote: () => void;
}

export default function ChartQuizGame({ onOpenWrongNote }: Props) {
  const { data: storage, save: saveStorage, reset: resetStorage } = useGameStorage();
  const play = useSound(storage.settings.soundEnabled, storage.settings.volume);

  const [phase, setPhase] = useState<'intro' | 'playing' | 'levelup' | 'gameover' | 'ending'>('intro');
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [hp, setHp] = useState(3);
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState(0);
  const [combo, setCombo] = useState(0);
  const [runCount, setRunCount] = useState(1);
  const [pendingLevelUp, setPendingLevelUp] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [problemQueue, setProblemQueue] = useState<Problem[]>(() => difficultyShuffle(PROBLEM_POOL));
  const [problemIdx, setProblemIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [lastGain, setLastGain] = useState(0);
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
  // 답 선택 즉시 미래 구간 표시 (제출 전에도)
  const showFuture = selected !== null || revealed;
  const visibleData = showFuture ? fullData : fullData.slice(0, problem.revealDay);
  // 미래 구간 오버레이용 데이터키 (revealDay 이후만 금색으로 표시)
  const visibleDataWithReveal = visibleData.map(d => ({
    ...d,
    종가_미래: d.day >= problem.revealDay - 1 ? d.종가 : undefined,
  }));
  const minPrice = fullData.length ? Math.min(...fullData.map(d => d.종가)) * 0.97 : 0;
  const maxPrice = fullData.length ? Math.max(...fullData.map(d => d.종가)) * 1.03 : 100;

  const persistSession = (overrides: { problemIdx?: number; hp?: number; points?: number; rank?: number; combo?: number } = {}) => {
    saveStorage({
      savedSession: {
        hp: overrides.hp ?? hp,
        points: overrides.points ?? points,
        rank: overrides.rank ?? rank,
        combo: overrides.combo ?? combo,
        runCount,
        problemQueueIds: problemQueue.map(p => p.id),
        problemIdx: overrides.problemIdx ?? problemIdx,
      },
    });
  };

  const startGame = () => {
    play('click');
    const newRunCount = runCount + (phase !== 'intro' ? 1 : 0);
    const queue = difficultyShuffle(PROBLEM_POOL);
    setPhase('playing');
    setHp(3); setPoints(0); setRank(0); setCombo(0);
    setRunCount(newRunCount);
    setProblemQueue(queue);
    setProblemIdx(0);
    setSelected(null); setSubmitted(false); setRevealed(false);
    setPendingLevelUp(false);
    saveStorage({
      totalRuns: storage.totalRuns + 1,
      savedSession: {
        hp: 3, points: 0, rank: 0, combo: 0,
        runCount: newRunCount,
        problemQueueIds: queue.map(p => p.id),
        problemIdx: 0,
      },
    });
  };

  const resumeGame = () => {
    play('click');
    const s = storage.savedSession!;
    const queue = s.problemQueueIds
      .map(id => PROBLEM_POOL.find(p => p.id === id))
      .filter(Boolean) as Problem[];
    setHp(s.hp); setPoints(s.points); setRank(s.rank); setCombo(s.combo);
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

    // ── Tutorial problem: no HP/score/storage effects ──────────────────────
    if (problem.isTutorial) {
      play(correct ? 'correct' : 'incorrect');
      setLastGain(0);
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
      play(newCombo >= 3 ? 'combo' : 'correct');
      const base = problem.difficulty === 'hard' ? 35 : problem.difficulty === 'medium' ? 25 : 20;
      const bonus = newCombo >= 3 ? (newCombo - 2) * 5 : 0;
      const gain = base + bonus;
      const newPoints = points + gain;
      setLastGain(gain);
      setCombo(newCombo);
      setPoints(newPoints);

      const newRank = Math.min(MAX_RANK_IDX, Math.floor(newPoints / LEVEL_UP_POINTS));
      if (newRank > rank) {
        setRank(newRank);
        if (newRank > storage.bestRank) saveStorage({ bestRank: newRank });
        setPendingLevelUp(true);
      }
      if (newPoints > storage.bestPoints) saveStorage({ bestPoints: newPoints });
    } else {
      const newHp = hp - 1;
      setHp(newHp);
      setCombo(0);
      setLastGain(-1);
      if (newHp <= 0) {
        saveStorage({ savedSession: null });
        play('gameover');
        setTimeout(() => setPhase('gameover'), 1500);
      } else {
        play('incorrect');
      }
    }
  };

  const handleNext = () => {
    // ── Tutorial complete: save flag → go to intro ─────────────────────────
    if (problem.isTutorial) {
      play('click');
      localStorage.setItem('tutorialCompleted', 'true');
      setTutorialStep(null);
      setPhase('intro');
      setHp(3); setPoints(0); setRank(0); setCombo(0);
      setProblemQueue(difficultyShuffle(PROBLEM_POOL));
      setProblemIdx(0);
      setSelected(null); setSubmitted(false); setRevealed(false); setLastGain(0);
      return;
    }

    if (pendingLevelUp) {
      if (rank >= MAX_RANK_IDX) {
        saveStorage({ clearCount: storage.clearCount + 1, savedSession: null });
        play('ending');
        setPhase('ending');
      } else {
        persistSession({ problemIdx: problemIdx + 1 });
        play('levelup');
        setPhase('levelup');
      }
      return;
    }
    persistSession({ problemIdx: problemIdx + 1 });
    setProblemIdx(problemIdx + 1);
    setSelected(null); setSubmitted(false); setRevealed(false); setLastGain(0);
  };

  const continueAfterLevelup = () => {
    play('click');
    setPendingLevelUp(false);
    setPhase('playing');
    setProblemIdx(problemIdx + 1);
    setSelected(null); setSubmitted(false); setRevealed(false); setLastGain(0);
  };

  const retry = () => { startGame(); };

  // ─── Tutorial controls ────────────────────────────────────────────────────
  const startTutorialGame = () => {
    play('click');
    localStorage.removeItem('tutorialCompleted');
    setTutorialStep(0);
    setPhase('playing');
    setProblemQueue([TUTORIAL_PROBLEM]);
    setProblemIdx(0);
    setSelected(null); setSubmitted(false); setRevealed(false); setLastGain(0);
    setHp(3); setPoints(0); setRank(0); setCombo(0); setPendingLevelUp(false);
    setShowSettings(false);
  };

  const advanceTutorialStep = () => {
    if (tutorialStep === null) return;
    play('tick');
    if (tutorialStep < 4) {
      setTutorialStep(tutorialStep + 1);
    } else {
      // Last step done — dismiss overlay so user can interact
      setTutorialStep(null);
    }
  };

  const skipTutorial = () => {
    play('click');
    localStorage.setItem('tutorialCompleted', 'true');
    setTutorialStep(null);
    setPhase('intro');
    setHp(3); setPoints(0); setRank(0); setCombo(0);
    setProblemQueue(difficultyShuffle(PROBLEM_POOL));
    setProblemIdx(0);
    setSelected(null); setSubmitted(false); setRevealed(false);
  };

  const handleReset = () => {
    play('click');
    resetStorage();
    setShowResetConfirm(false);
    setPhase('intro');
    setHp(3); setPoints(0); setRank(0); setCombo(0); setRunCount(1);
    setProblemQueue(difficultyShuffle(PROBLEM_POOL));
    setProblemIdx(0);
  };

  // ─── Settings modal (shared between intro and playing phases) ───────────────
  const settingsModal = showSettings ? (
    <div
      onClick={() => setShowSettings(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 280, width: '100%', background: COLORS.bgPanel, border: `3px solid ${COLORS.border}`, boxShadow: `4px 4px 0 0 ${COLORS.border}`, padding: '22px 20px', fontFamily: KOREAN_FONT }}
      >
        <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: COLORS.textBright, fontFamily: TITLE_FONT, letterSpacing: '0.3em', marginBottom: 20 }}>
          ⚙ 설 정
        </div>

        {/* Sound on/off */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: COLORS.text }}>🔊 효과음</span>
          <button
            onClick={() => {
              const next = !storage.settings.soundEnabled;
              saveStorage({ settings: { ...storage.settings, soundEnabled: next } });
              if (next) play('click');
            }}
            style={{
              padding: '4px 16px', fontSize: 12, fontWeight: 700,
              background: storage.settings.soundEnabled ? COLORS.green : COLORS.bgDeep,
              color: storage.settings.soundEnabled ? '#fff' : COLORS.textDim,
              border: `2px solid ${storage.settings.soundEnabled ? COLORS.green : COLORS.border}`,
              boxShadow: storage.settings.soundEnabled ? `2px 2px 0 0 ${COLORS.green}` : 'none',
              cursor: 'pointer', letterSpacing: '0.15em', fontFamily: TITLE_FONT,
            }}
          >{storage.settings.soundEnabled ? 'ON' : 'OFF'}</button>
        </div>

        {/* Volume slider */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: COLORS.text }}>음량</span>
            <span style={{ fontSize: 12, color: COLORS.textDim, fontFamily: TITLE_FONT, fontWeight: 700 }}>
              {Math.round(storage.settings.volume * 100)}%
            </span>
          </div>
          <input
            type="range" min="0" max="1" step="0.05"
            value={storage.settings.volume}
            onChange={e => saveStorage({ settings: { ...storage.settings, volume: parseFloat(e.target.value) } })}
            style={{ width: '100%', accentColor: COLORS.border, cursor: 'pointer' }}
          />
        </div>

        {/* Tutorial replay */}
        <div style={{ borderTop: `1px solid ${COLORS.borderDark}`, paddingTop: 14, marginBottom: 14 }}>
          <button
            onClick={startTutorialGame}
            style={{
              width: '100%', padding: '8px 0',
              background: COLORS.bgDeep, color: COLORS.textBright,
              border: `1px solid ${COLORS.border}`,
              fontFamily: KOREAN_FONT, fontSize: 12, fontWeight: 700,
              letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >🎓 튜토리얼 다시 보기</button>
        </div>

        <GlowBtn onClick={() => { play('click'); setShowSettings(false); }}>닫기</GlowBtn>
      </div>
    </div>
  ) : null;

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

          {/* Gear icon */}
          <button
            onClick={() => { play('click'); setShowSettings(true); }}
            title="설정"
            style={{
              position: 'absolute', top: 20, right: 8,
              background: COLORS.bgDeep, border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              fontSize: 16, cursor: 'pointer', color: COLORS.textBright, padding: '4px 7px',
              lineHeight: 1, boxShadow: `1px 1px 0 0 ${COLORS.borderDark}`,
            }}
          >⚙</button>

          <div style={{ textAlign: 'center', marginBottom: 6, marginTop: 22, fontSize: 9, color: COLORS.textDim, letterSpacing: '0.25em' }}>
            ANALYZING · BUYING · PRAYING
          </div>
          <div style={{ textAlign: 'center', marginBottom: 4, fontSize: 12, color: COLORS.red, fontWeight: 600, letterSpacing: '0.15em' }}>
            ～ 이 론 편 ～
          </div>

          <div style={{ position: 'relative', marginBottom: 6 }}>
            <div style={{ textAlign: 'center', fontSize: 44, fontWeight: 900, color: COLORS.textBright, letterSpacing: '0.38em', lineHeight: 1.1, textShadow: `1px 1px 0 ${COLORS.bgDeep}` }}>
              투기의<br/>정석
            </div>
            <div style={{ position: 'absolute', right: 0, bottom: -28, textAlign: 'right' }}>
              <div style={{ fontSize: 8, color: COLORS.textDim, letterSpacing: '0.25em' }}>저자</div>
              <div style={{ fontSize: 11, color: COLORS.textBright, fontWeight: 700, letterSpacing: '0.15em' }}>마자유</div>
            </div>
          </div>

          <div style={{ marginBottom: 8, marginTop: 72 }}>
            <div style={{ borderTop: `2px solid ${COLORS.border}` }}/>
            <div style={{ borderTop: `1px solid ${COLORS.red}`, marginTop: 2 }}/>
          </div>

          <div style={{ marginBottom: 4, marginTop: 6, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 0 }}>
            <div style={{ flex: 1, textAlign: 'center', paddingRight: 4 }}>
              <div style={{ transform: 'scale(0.75)', transformOrigin: 'center bottom' }}>
                <EvolutionFigure stage={0} color={COLORS.textBright} />
              </div>
              <div style={{ fontSize: 10, marginTop: 2, color: COLORS.textDim, letterSpacing: '0.12em', fontWeight: 600 }}>유인원</div>
              <div style={{ fontSize: 8, marginTop: 1, color: COLORS.textMute, fontStyle: 'italic' }}>감으로 매매</div>
            </div>
            <div style={{ alignSelf: 'center', padding: '0 2px' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.red, border: `2px solid ${COLORS.red}`, borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bgPanel }}>VS</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', paddingLeft: 4 }}>
              <div style={{ transform: 'scale(0.75)', transformOrigin: 'center bottom' }}>
                <EvolutionFigure stage={4} color={COLORS.textBright} />
              </div>
              <div style={{ fontSize: 10, marginTop: 2, color: COLORS.textDim, letterSpacing: '0.12em', fontWeight: 600 }}>현자</div>
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
            <div>① HP 3 · 오답 1칸 차감 · 0이면 재시작</div>
            <div>② 정답 시 +20~35점 · 콤보 보너스</div>
            <div>③ 100점마다 진화 (7단계 도달 = 수료)</div>
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
                ▷ 이어하기 ({storage.savedSession!.points}점 · HP {storage.savedSession!.hp})
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
                onClick={() => { play('click'); onOpenWrongNote(); }}
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
                onClick={() => { play('click'); setShowResetConfirm(true); }}
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
                <GlowBtn onClick={() => { play('click'); setShowResetConfirm(false); }} style={{ fontSize: 13 }}>취소</GlowBtn>
              </div>
            </div>
          </div>
        )}

        {settingsModal}
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
          <div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.25em', marginBottom: 20 }}>체력이 모두 소진되었습니다</div>
          <div style={{ fontSize: 64, marginBottom: 14, filter: 'grayscale(0.4)' }}>💀</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 6, fontFamily: TITLE_FONT, letterSpacing: '0.15em' }}>최종 도달 단계</div>
          <div style={{ fontSize: 52, marginBottom: 4 }}>{r.emoji}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, fontFamily: TITLE_FONT, color: COLORS.textBright, letterSpacing: '0.1em' }}>{r.name}</div>
          <div style={{ display: 'inline-block', padding: '5px 14px', marginBottom: 22, border: `1px solid ${COLORS.border}`, fontSize: 11, fontFamily: TITLE_FONT, color: COLORS.textDim, letterSpacing: '0.15em' }}>{points}점 · {r.lv}단계</div>
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
            최종 {points}점 · 누적 {storage.clearCount}회 수료
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
  const pointsInLevel = points - rank * LEVEL_UP_POINTS;
  const progressPct = (pointsInLevel / LEVEL_UP_POINTS) * 100;
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
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ fontSize: 16, color: i < hp ? COLORS.red : '#c4b6a0', transition: 'all 0.3s' }}>♥</span>
              ))}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 50 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textBright, fontFamily: TITLE_FONT, lineHeight: 1 }}>
                {points}<span style={{ fontSize: 10, color: COLORS.textDim, marginLeft: 2 }}>점</span>
              </div>
              {combo >= 3 && (
                <div style={{ fontSize: 10, fontFamily: TITLE_FONT, color: COLORS.red, fontWeight: 700, animation: 'blink 0.5s infinite' }}>🔥 {combo}연속</div>
              )}
            </div>
            <button
              onClick={() => { play('click'); setPhase('intro'); }}
              style={{ padding: '2px 7px', fontSize: 10, background: 'none', border: `1px solid ${COLORS.borderDark}`, cursor: 'pointer', fontFamily: TITLE_FONT, color: COLORS.textDim, letterSpacing: '0.05em', flexShrink: 0 }}
            >메뉴</button>
            <button
              onClick={() => { play('click'); setShowSettings(true); }}
              title="설정"
              style={{ padding: '2px 6px', fontSize: 12, background: 'none', border: `1px solid ${COLORS.borderDark}`, cursor: 'pointer', color: COLORS.textDim, flexShrink: 0, lineHeight: 1 }}
            >⚙</button>
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
          <span style={{ padding: '3px 8px', background: problem.difficulty === 'hard' ? COLORS.red : problem.difficulty === 'medium' ? COLORS.orange : COLORS.green, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>{problem.difficulty}</span>
          {problem.isTutorial && (
            <span style={{ padding: '3px 8px', background: COLORS.gold, color: '#fff', letterSpacing: '0.12em', fontWeight: 700, fontSize: 10, fontFamily: TITLE_FONT }}>✦ 연습</span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
            <button onClick={() => setShowRSI(!showRSI)} style={toggleBtn(showRSI, COLORS.red)}>
              {showRSI ? '✓ RSI' : '+ RSI 보기'}
            </button>
          </div>
        </div>

        {/* 차트 */}
        <GlowBox id="tut-chart" color={COLORS.border} bg={COLORS.bgChart} style={{ padding: '6px 6px 2px', marginBottom: 6 }}>
          <div id="tut-legend" style={{ display: 'flex', gap: 10, marginBottom: 4, paddingLeft: 4, fontSize: 9, fontFamily: TITLE_FONT, fontWeight: 700, letterSpacing: '0.02em', flexWrap: 'wrap' }}>
            <LegendItem color={COLORS.blueBright} label="종가" />
            <LegendItem color={COLORS.yellow} label="MA5" dashed />
            <LegendItem color={COLORS.purple} label="MA20" dashed />
            <LegendItem color={COLORS.orange} label="MA60" dashed />
            {showFuture && <LegendItem color={COLORS.gold} label="문제시점" vertical />}
            {showFuture && <LegendItem color={COLORS.goldBright} label="실제결과" />}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={visibleDataWithReveal} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.blueBright} stopOpacity={0.4}/>
                  <stop offset="100%" stopColor={COLORS.blueBright} stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="pg_reveal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.25}/>
                  <stop offset="100%" stopColor={COLORS.gold} stopOpacity={0.03}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={COLORS.textMute} vertical={false} opacity={0.3}/>
              <XAxis dataKey="day" ticks={xTicks} tick={{ fontSize: 10, fill: COLORS.textDim, fontFamily: 'monospace' }}
                tickFormatter={(d) => { const item = fullData[d]; return item ? item.date : ''; }}
                axisLine={{ stroke: COLORS.borderDark }} tickLine={{ stroke: COLORS.borderDark }}/>
              <YAxis domain={[minPrice, maxPrice]} tick={{ fontSize: 10, fill: COLORS.textDim, fontFamily: 'monospace' }}
                tickLine={false} width={42} tickFormatter={(v) => v.toFixed(0)} axisLine={{ stroke: COLORS.borderDark }}/>
              <Tooltip
                contentStyle={{ background: COLORS.bgDeep, border: `2px solid ${COLORS.gold}`, fontSize: 11, borderRadius: 2, fontFamily: 'monospace', color: COLORS.text }}
                labelFormatter={(d) => { const item = fullData[d as number]; return item ? `📅 ${item.date}` : ''; }}
                labelStyle={{ color: COLORS.goldBright, fontSize: 11, fontWeight: 700 }}
              />
              {/* 미래 구간 배경 틴트 */}
              {showFuture && <ReferenceArea x1={problem.revealDay - 1} x2={fullData.length - 1} fill={COLORS.gold} fillOpacity={0.08} stroke="none"/>}
              {/* 문제시점 수직선 */}
              {showFuture && <ReferenceLine x={problem.revealDay} stroke={COLORS.gold} strokeWidth={2} strokeDasharray="4 4"
                label={{ value: '◆ 문제시점', fill: COLORS.goldBright, fontSize: 11, position: 'top', fontFamily: 'monospace', fontWeight: 700 }}/>}
              {/* 과거 구간 파란 Area */}
              <Area type="monotone" dataKey="종가" stroke={COLORS.blueBright} strokeWidth={2} fill="url(#pg)" isAnimationActive={false}/>
              {/* 미래 구간 금색 Line 오버레이 */}
              {showFuture && <Line type="monotone" dataKey="종가_미래" stroke={COLORS.goldBright} strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls={false}/>}
              <Line type="monotone" dataKey="MA5" stroke={COLORS.yellow} strokeWidth={1.2} strokeDasharray="3 3" dot={false} isAnimationActive={false}/>
              <Line type="monotone" dataKey="MA20" stroke={COLORS.purple} strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false}/>
              <Line type="monotone" dataKey="MA60" stroke={COLORS.orange} strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false}/>
            </ComposedChart>
          </ResponsiveContainer>

          <div id="tut-volume">
            <div style={{ fontSize: 9, fontFamily: TITLE_FONT, color: COLORS.blueBright, letterSpacing: '0.1em', paddingLeft: 4, marginTop: 3, marginBottom: 1, fontWeight: 700 }}>거래량</div>
            <ResponsiveContainer width="100%" height={50}>
              <ComposedChart data={visibleDataWithReveal} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={COLORS.textMute} vertical={false} opacity={0.2}/>
                <XAxis dataKey="day" tick={false} axisLine={{ stroke: COLORS.borderDark }}/>
                <YAxis tick={{ fontSize: 9, fill: COLORS.textDim, fontFamily: 'monospace' }} tickLine={false} width={42}
                  tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`}
                  axisLine={{ stroke: COLORS.borderDark }}/>
                <Tooltip contentStyle={{ background: COLORS.bgDeep, border: `2px solid ${COLORS.blue}`, fontSize: 11, fontFamily: 'monospace', color: COLORS.text }}
                  formatter={(v) => [Number(v).toLocaleString(), '거래량']}
                  labelFormatter={(d) => { const item = fullData[d as number]; return item ? item.date : ''; }}/>
                {showFuture && <ReferenceArea x1={problem.revealDay - 1} x2={fullData.length - 1} fill={COLORS.gold} fillOpacity={0.08} stroke="none"/>}
                {showFuture && <ReferenceLine x={problem.revealDay} stroke={COLORS.gold} strokeDasharray="4 4"/>}
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
                <ComposedChart data={visibleDataWithReveal} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={COLORS.textMute} vertical={false} opacity={0.2}/>
                  <XAxis dataKey="day" tick={false} axisLine={{ stroke: COLORS.borderDark }}/>
                  <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fontSize: 9, fill: COLORS.textDim, fontFamily: 'monospace' }} tickLine={false} width={42} axisLine={{ stroke: COLORS.borderDark }}/>
                  <Tooltip contentStyle={{ background: COLORS.bgDeep, border: `2px solid ${COLORS.pink}`, fontSize: 11, fontFamily: 'monospace', color: COLORS.text }}
                    labelFormatter={(d) => { const item = fullData[d as number]; return item ? item.date : ''; }}/>
                  <ReferenceLine y={70} stroke={COLORS.red} strokeDasharray="2 3" opacity={0.6}/>
                  <ReferenceLine y={30} stroke={COLORS.green} strokeDasharray="2 3" opacity={0.6}/>
                  {showFuture && <ReferenceArea x1={problem.revealDay - 1} x2={fullData.length - 1} fill={COLORS.gold} fillOpacity={0.08} stroke="none"/>}
                  {showFuture && <ReferenceLine x={problem.revealDay} stroke={COLORS.gold} strokeDasharray="4 4"/>}
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
            <div id="tut-macro" style={{ marginBottom: 6 }}>
              {/* 매크로 헤더 */}
              <div style={{ background: COLORS.bgPanel, border: `2px solid ${COLORS.border}`, boxShadow: `2px 2px 0 0 ${COLORS.border}`, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.15em', fontWeight: 700 }}>매크로</span>
                <span style={{ display: 'flex', gap: 3 }}>
                  {problem.macroHints.map((h, i) => {
                    const c = h.tone === 'positive' ? COLORS.green : h.tone === 'negative' ? COLORS.red : COLORS.textDim;
                    return <span key={i} style={{ width: 8, height: 8, background: c, display: 'inline-block', border: `1px solid ${COLORS.border}` }}/>;
                  })}
                </span>
                <span style={{ fontSize: 12, color: toneColor, fontWeight: 700, letterSpacing: '0.1em' }}>{toneLabel}</span>
              </div>
              {/* 매크로 카드 — 항상 표시 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6 }}>
                {problem.macroHints.map((h, i) => {
                  const c = h.tone === 'positive' ? COLORS.green : h.tone === 'negative' ? COLORS.red : COLORS.textDim;
                  return (
                    <div key={i} style={{ background: COLORS.bgPanel, border: `1px solid ${c}`, borderLeft: `4px solid ${c}`, padding: '6px 9px' }}>
                      <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: TITLE_FONT }}><GlossaryText text={h.label} onTerm={setActiveTerm} /></div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: KOREAN_FONT }}>{h.value}</div>
                      <div style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.35, fontFamily: KOREAN_FONT }}><GlossaryText text={h.trend} onTerm={setActiveTerm} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 질문 */}
        <div style={{ padding: '6px 10px', marginBottom: 6, borderLeft: `3px solid ${COLORS.red}`, background: COLORS.bgPanel }}>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: COLORS.textBright, fontFamily: KOREAN_FONT }}>
            <span style={{ color: COLORS.red, fontWeight: 700, marginRight: 6, fontFamily: TITLE_FONT, fontSize: 12 }}>문.</span>
            {problem.question}
          </div>
        </div>

        {/* 보기 */}
        <div id="tut-choices" style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
          {problem.choices.map((c, i) => {
            const isSel = selected === i;
            const isAns = submitted && i === problem.answer;
            const isWrong = submitted && isSel && i !== problem.answer;
            let bg: string = COLORS.bgPanel, bd: string = COLORS.border, col: string = COLORS.text;
            if (isAns) { bg = '#dcf5e0'; bd = COLORS.green; col = '#14532d'; }
            else if (isWrong) { bg = '#fde2e1'; bd = COLORS.red; col = '#7f1d1d'; }
            else if (isSel) { bg = '#fff7d6'; bd = COLORS.red; col = COLORS.textBright; }
            return (
              <button key={i} onClick={() => !submitted && setSelected(i)} disabled={submitted}
                style={{ display: 'flex', gap: 8, padding: '7px 10px', background: bg, border: `2px solid ${bd}`, boxShadow: isSel || isAns || isWrong ? `2px 2px 0 0 ${bd}` : `2px 2px 0 0 ${COLORS.border}`, borderRadius: 2, color: col, cursor: submitted ? 'default' : 'pointer', textAlign: 'left', fontSize: 12.5, lineHeight: 1.4, fontFamily: KOREAN_FONT, transition: 'all 0.1s' }}>
                <span style={{ fontFamily: TITLE_FONT, color: isAns ? COLORS.green : COLORS.red, fontWeight: 700, flexShrink: 0, fontSize: 12.5 }}>{['①', '②', '③', '④'][i]}</span>
                <span><GlossaryText text={c} onTerm={setActiveTerm} /></span>
              </button>
            );
          })}
        </div>

        {/* 점수 변동 */}
        {submitted && lastGain !== 0 && (
          <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 22, fontWeight: 700, color: lastGain > 0 ? COLORS.greenBright : COLORS.redBright, fontFamily: TITLE_FONT, animation: 'bounce 0.4s' }}>
            {lastGain > 0 ? `+${lastGain} POINTS!` : '-1 ♥'}
            {combo >= 3 && lastGain > 0 && <span style={{ fontSize: 14, color: COLORS.pink, marginLeft: 12 }}>🔥 x{combo}</span>}
          </div>
        )}

        {/* 해설 */}
        {submitted && (
          <GlowBox color={isCorrect ? COLORS.greenBright : COLORS.redBright} bg={COLORS.bgPanel} style={{ padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontFamily: TITLE_FONT, letterSpacing: '0.15em', color: isCorrect ? COLORS.greenBright : COLORS.redBright, marginBottom: 8, fontWeight: 700 }}>
              {isCorrect ? '✓ 정답!' : '✗ 오답'} · 답: {['1', '2', '3', '4'][problem.answer]}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: COLORS.text, fontFamily: KOREAN_FONT, marginBottom: 10 }}>
              <GlossaryText text={problem.explanation} onTerm={setActiveTerm} />
            </div>
            {problem.odds && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: COLORS.bgDeep, borderLeft: `3px solid ${COLORS.orange}`, borderRadius: 2 }}>
                <div style={{ fontSize: 10, fontFamily: TITLE_FONT, letterSpacing: '0.15em', color: COLORS.orange, marginBottom: 4, fontWeight: 700 }}>📊 통계적 관점</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.65, color: COLORS.textDim, fontFamily: KOREAN_FONT, fontStyle: 'italic' }}>
                  <GlossaryText text={problem.odds} onTerm={setActiveTerm} />
                </div>
              </div>
            )}
          </GlowBox>
        )}

        {/* Reveal */}
        {submitted && problem.reveal && (
          <GlowBox color={COLORS.gold} bg={COLORS.bgPanel} style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontFamily: TITLE_FONT, letterSpacing: '0.2em', color: COLORS.goldBright, marginBottom: 8, fontWeight: 700 }}>━ 실제 종목 공개 ━</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textBright, marginBottom: 3, fontFamily: KOREAN_FONT }}>{problem.reveal.title}</div>
            <div style={{ fontSize: 11, fontFamily: TITLE_FONT, color: COLORS.textDim, marginBottom: 14, letterSpacing: '0.05em' }}>{problem.reveal.market} · {problem.reveal.period}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontFamily: TITLE_FONT, color: COLORS.blueBright, letterSpacing: '0.15em', marginBottom: 5, fontWeight: 700 }}>▶ 실제 결과</div>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: COLORS.text, fontFamily: KOREAN_FONT }}>
                <GlossaryText text={problem.reveal.result} onTerm={setActiveTerm} />
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: '10px 12px', background: COLORS.bgDeep, border: `2px solid ${COLORS.purple}` }}>
              <div style={{ fontSize: 11, fontFamily: TITLE_FONT, color: COLORS.purple, letterSpacing: '0.15em', marginBottom: 5, fontWeight: 700 }}>▶ 매크로 배경</div>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: COLORS.text, fontFamily: KOREAN_FONT }}>
                <GlossaryText text={problem.reveal.macro} onTerm={setActiveTerm} />
              </div>
            </div>
            {problem.reveal.counterCase && (
              <div style={{ marginBottom: 12, padding: '10px 12px', background: COLORS.bgDeep, border: `2px solid ${COLORS.pink}` }}>
                <div style={{ fontSize: 11, fontFamily: TITLE_FONT, color: COLORS.pink, letterSpacing: '0.15em', marginBottom: 5, fontWeight: 700 }}>⚠ 반례 / 다른 가능성</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: COLORS.text, fontFamily: KOREAN_FONT }}>
                  <GlossaryText text={problem.reveal.counterCase} onTerm={setActiveTerm} />
                </div>
              </div>
            )}
            <div style={{ borderTop: `2px dashed ${COLORS.goldDark}`, paddingTop: 10, fontSize: 13.5, lineHeight: 1.65, color: COLORS.goldBright, fontFamily: KOREAN_FONT, fontWeight: 600 }}>
              <span style={{ fontFamily: TITLE_FONT, fontSize: 12, marginRight: 4 }}>★</span>
              <GlossaryText text={problem.reveal.lesson} onTerm={setActiveTerm} />
            </div>
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

      {settingsModal}
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
