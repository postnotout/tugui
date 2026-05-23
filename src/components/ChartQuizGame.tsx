import { useState, useEffect } from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, ComposedChart, Bar, Cell,
} from 'recharts';

import { COLORS } from '../constants/colors';
import { RANKS, LEVEL_UP_POINTS, MAX_RANK_IDX } from '../constants/ranks';
import { PROBLEM_POOL, difficultyShuffle } from '../data/problems';
import { generateChart } from '../utils/chartGenerator';
import { loadChartData } from '../utils/dataLoader';
import type { ChartDataPoint } from '../types';
import EvolutionFigure from './EvolutionFigure';
import { GlossaryText, GlossaryModal } from './GlossaryText';

// ─── Shared UI primitives ──────────────────────────────────────────────────────

function GlowBox({
  children,
  color = COLORS.border,
  bg,
  style = {},
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { color?: string; bg?: string }) {
  return (
    <div
      style={{
        background: bg || COLORS.bgPanel,
        border: `2px solid ${color}`,
        boxShadow: `3px 3px 0 0 ${color}`,
        borderRadius: 2,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

function GlowBtn({
  children,
  onClick,
  disabled,
  color = COLORS.border,
  style = {},
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color?: string;
  style?: React.CSSProperties;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        width: '100%',
        padding: '14px 16px',
        background: disabled ? '#d4c8a8' : COLORS.bgPanel,
        color: disabled ? COLORS.textMute : COLORS.textBright,
        border: `2px solid ${disabled ? '#a89a7a' : COLORS.border}`,
        boxShadow: pressed || disabled ? 'none' : `3px 3px 0 0 ${COLORS.border}`,
        transform: pressed ? 'translate(3px, 3px)' : 'none',
        borderRadius: 2,
        fontFamily: '"Noto Serif KR", serif',
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: '0.15em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform 0.08s, box-shadow 0.08s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function LegendItem({ color, label, dashed, vertical }: {
  color: string; label: string; dashed?: boolean; vertical?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color }}>
      {vertical ? (
        <span style={{
          display: 'inline-block', width: 2, height: 12,
          background: `repeating-linear-gradient(0deg, ${color} 0 2px, transparent 2px 4px)`,
        }}/>
      ) : (
        <span style={{
          display: 'inline-block', width: 16, height: 2,
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)`
            : color,
        }}/>
      )}
      <span>{label}</span>
    </div>
  );
}

function Screen({ children, tight }: { children: React.ReactNode; tight?: boolean }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at top, ${COLORS.bgPanel} 0%, ${COLORS.bg} 60%, ${COLORS.bgDeep} 100%)`,
      color: COLORS.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: tight ? '8px' : 20,
      position: 'relative',
      fontFamily: '"Noto Serif KR", serif',
    }}>
      {children}
    </div>
  );
}

function FontLoader() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DotGothic16&family=Noto+Serif+KR:wght@400;500;600;700;900&family=Nanum+Myeongjo:wght@400;700;800&display=swap');
    `}</style>
  );
}

function toggleBtn(active: boolean, color: string): React.CSSProperties {
  return {
    padding: '3px 8px',
    fontSize: 10,
    fontFamily: '"Noto Serif KR", serif',
    background: active ? color : COLORS.bgPanel,
    color: active ? '#fff' : COLORS.textDim,
    border: `1px solid ${active ? color : COLORS.border}`,
    borderRadius: 2,
    cursor: 'pointer',
    letterSpacing: '0.1em',
    fontWeight: 700,
    transition: 'all 0.15s',
  };
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ChartQuizGame() {
  const titleFont = '"Noto Serif KR", "Nanum Myeongjo", serif';
  const koreanFont = '"Noto Serif KR", "Nanum Myeongjo", serif';

  const [phase, setPhase] = useState<'intro' | 'playing' | 'levelup' | 'gameover' | 'ending'>('intro');
  const [hp, setHp] = useState(3);
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestRank, setBestRank] = useState(0);
  const [runCount, setRunCount] = useState(1);
  const [pendingLevelUp, setPendingLevelUp] = useState(false);

  const [problemQueue, setProblemQueue] = useState(() => difficultyShuffle(PROBLEM_POOL));
  const [problemIdx, setProblemIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [lastGain, setLastGain] = useState(0);
  const [showRSI, setShowRSI] = useState(false);
  const [showMacroDetail, setShowMacroDetail] = useState(false);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  const problem = problemQueue[problemIdx % problemQueue.length];

  // 실제 CSV 데이터 로드, 실패 시 시뮬레이션 fallback
  useEffect(() => {
    if (phase !== 'playing') return;
    let cancelled = false;
    setChartLoading(true);
    loadChartData(problem.ticker, problem.startDate, 120)
      .then(data => {
        if (!cancelled) { setChartData(data); setChartLoading(false); }
      })
      .catch(() => {
        if (!cancelled) {
          setChartData(
            generateChart((problem.id + runCount * 100) * 137, problem.pattern, problem.startDate)
          );
          setChartLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [problem, phase, runCount]);

  const fullData = chartData;
  const visibleData = revealed ? fullData : fullData.slice(0, problem.revealDay);
  const minPrice = fullData.length ? Math.min(...fullData.map(d => d.종가)) * 0.97 : 0;
  const maxPrice = fullData.length ? Math.max(...fullData.map(d => d.종가)) * 1.03 : 100;

  const startGame = () => {
    setPhase('playing');
    setHp(3); setPoints(0); setRank(0); setCombo(0);
    setProblemQueue(difficultyShuffle(PROBLEM_POOL));
    setProblemIdx(0); setSelected(null); setSubmitted(false); setRevealed(false);
    setPendingLevelUp(false);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    const correct = selected === problem.answer;
    setSubmitted(true);
    setRevealed(true);

    if (correct) {
      const newCombo = combo + 1;
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
        setBestRank(b => Math.max(b, newRank));
        setPendingLevelUp(true);
      }
    } else {
      const newHp = hp - 1;
      setHp(newHp);
      setCombo(0);
      setLastGain(-1);
      if (newHp <= 0) {
        setTimeout(() => setPhase('gameover'), 1500);
      }
    }
  };

  const handleNext = () => {
    if (pendingLevelUp) {
      if (rank >= MAX_RANK_IDX) setPhase('ending');
      else setPhase('levelup');
      return;
    }
    setProblemIdx(problemIdx + 1);
    setSelected(null); setSubmitted(false); setRevealed(false); setLastGain(0);
  };

  const continueAfterLevelup = () => {
    setPendingLevelUp(false);
    setPhase('playing');
    setProblemIdx(problemIdx + 1);
    setSelected(null); setSubmitted(false); setRevealed(false); setLastGain(0);
  };

  const retry = () => { setRunCount(c => c + 1); startGame(); };

  // ─── Intro ─────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <Screen tight>
        <FontLoader />
        <div style={{
          maxWidth: 360, width: '100%',
          background: COLORS.bgPanel,
          border: `2px solid ${COLORS.border}`,
          boxShadow: `3px 3px 0 0 ${COLORS.border}, 6px 6px 12px rgba(0,0,0,0.15)`,
          padding: '22px 20px 16px',
          position: 'relative',
          fontFamily: koreanFont,
        }}>
          <div style={{ position: 'absolute', top: 10, left: 0, right: 0, borderTop: `2px solid ${COLORS.red}` }}/>
          <div style={{ position: 'absolute', top: 14, left: 0, right: 0, borderTop: `1px solid ${COLORS.blue}` }}/>

          <div style={{ textAlign: 'center', marginBottom: 6, marginTop: 6, fontSize: 9, color: COLORS.textDim, letterSpacing: '0.25em' }}>
            CHART · TRADING · LEARNING
          </div>
          <div style={{ textAlign: 'center', marginBottom: 4, fontSize: 12, color: COLORS.red, fontWeight: 600, letterSpacing: '0.15em' }}>
            ～ 이 론 편 ～
          </div>

          <div style={{ position: 'relative', marginBottom: 6 }}>
            <div style={{ textAlign: 'center', fontSize: 44, fontWeight: 900, color: COLORS.textBright, letterSpacing: '0.08em', lineHeight: 1.1, textShadow: `1px 1px 0 ${COLORS.bgDeep}` }}>
              투기의<br/>정석
            </div>
            <div style={{ position: 'absolute', right: 0, bottom: -2, textAlign: 'right' }}>
              <div style={{ fontSize: 8, color: COLORS.textDim, letterSpacing: '0.25em' }}>저자</div>
              <div style={{ fontSize: 11, color: COLORS.textBright, fontWeight: 700, letterSpacing: '0.15em' }}>마자유</div>
            </div>
          </div>

          <div style={{ marginBottom: 8, marginTop: 12 }}>
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
              <div style={{ fontSize: 14, fontWeight: 900, color: COLORS.red, letterSpacing: '0.02em', border: `2px solid ${COLORS.red}`, borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.bgPanel }}>VS</div>
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

          {bestRank > 0 && (
            <div style={{ textAlign: 'center', fontSize: 10, color: COLORS.red, marginBottom: 8, letterSpacing: '0.1em', fontWeight: 600 }}>
              최고 기록: {RANKS[bestRank].emoji} {bestRank + 1}단계
            </div>
          )}

          <button
            onClick={startGame}
            style={{
              width: '100%', padding: '10px',
              background: COLORS.bgPanel, color: COLORS.textBright,
              border: `2px solid ${COLORS.border}`,
              boxShadow: `3px 3px 0 0 ${COLORS.border}`,
              fontFamily: '"Noto Serif KR", serif',
              fontSize: 14, fontWeight: 700, letterSpacing: '0.25em',
              cursor: 'pointer', transition: 'all 0.1s',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translate(3px, 3px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `3px 3px 0 0 ${COLORS.border}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `3px 3px 0 0 ${COLORS.border}`; }}
          >
            {runCount > 1 ? `${runCount}회차 학습 시작` : '학 습 시 작'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 9, color: COLORS.textMute, letterSpacing: '0.18em' }}>
            ― 남영동 방구석에서 펴냄 ―
          </div>
        </div>
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
          <div style={{ fontSize: 12, fontFamily: titleFont, letterSpacing: '0.4em', color: COLORS.red, marginBottom: 8, marginTop: 10, fontWeight: 700 }}>진 급 증</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.25em', marginBottom: 20 }}>다음 단계 진입</div>
          <div style={{ fontSize: 100, marginBottom: 12, lineHeight: 1, animation: 'bounce 0.5s' }}>{r.emoji}</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6, fontFamily: titleFont, color: COLORS.textBright, letterSpacing: '0.15em' }}>{r.name}</div>
          <div style={{ fontSize: 13, color: COLORS.textDim, marginBottom: 12, fontFamily: titleFont, fontStyle: 'italic' }}>『{r.desc}』</div>
          <div style={{ display: 'inline-block', padding: '6px 18px', border: `2px solid ${COLORS.border}`, marginBottom: 24, fontSize: 13, fontFamily: titleFont, fontWeight: 700, letterSpacing: '0.2em', color: COLORS.textBright }}>{r.lv} / 7 단계</div>
          <div style={{ maxWidth: 280, margin: '0 auto' }}>
            <GlowBtn onClick={continueAfterLevelup}>다음 학습 ▶</GlowBtn>
          </div>
        </div>
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
          <div style={{ fontSize: 13, fontFamily: titleFont, letterSpacing: '0.4em', color: COLORS.red, marginBottom: 8, marginTop: 14, fontWeight: 700 }}>학 습 중 단</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.25em', marginBottom: 20 }}>체력이 모두 소진되었습니다</div>
          <div style={{ fontSize: 64, marginBottom: 14, filter: 'grayscale(0.4)' }}>💀</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 6, fontFamily: titleFont, letterSpacing: '0.15em' }}>최종 도달 단계</div>
          <div style={{ fontSize: 52, marginBottom: 4 }}>{r.emoji}</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, fontFamily: titleFont, color: COLORS.textBright, letterSpacing: '0.1em' }}>{r.name}</div>
          <div style={{ display: 'inline-block', padding: '5px 14px', marginBottom: 22, border: `1px solid ${COLORS.border}`, fontSize: 11, fontFamily: titleFont, color: COLORS.textDim, letterSpacing: '0.15em' }}>{points}점 · {r.lv}단계 · {runCount}회차</div>
          <div style={{ maxWidth: 280, margin: '0 auto' }}>
            <GlowBtn onClick={retry}>다시 학습하기 ▶</GlowBtn>
          </div>
        </div>
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
          <div style={{ fontSize: 13, fontFamily: titleFont, letterSpacing: '0.4em', color: COLORS.red, marginBottom: 6, marginTop: 12, fontWeight: 700 }}>수 료 증</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.25em', marginBottom: 24 }}>본 학습 과정을 수료하였음을 증명함</div>
          <div style={{ fontSize: 100, marginBottom: 12, lineHeight: 1, animation: 'bounce 1.5s infinite' }}>{r.emoji}</div>
          <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 6, fontFamily: titleFont, color: COLORS.textBright, letterSpacing: '0.2em' }}>{r.name}</div>
          <div style={{ display: 'inline-block', padding: '6px 18px', marginBottom: 22, border: `2px solid ${COLORS.red}`, fontSize: 13, fontFamily: titleFont, fontWeight: 700, letterSpacing: '0.25em', color: COLORS.red }}>7 단계 완 주</div>
          <div style={{ padding: '16px 14px', marginBottom: 18, border: `1px solid ${COLORS.border}`, background: COLORS.bgPanelLight, fontSize: 13, color: COLORS.text, lineHeight: 1.9, fontFamily: titleFont, fontStyle: 'italic' }}>
            『시장은 인내가 없는 사람으로부터<br/>인내가 있는 사람에게로<br/>재화가 흘러가는 곳이다』
          </div>
          <div style={{ fontSize: 11, fontFamily: titleFont, color: COLORS.textDim, letterSpacing: '0.2em', marginBottom: 22 }}>최종 {points}점 · {runCount}회차 학습</div>
          <div style={{ maxWidth: 320, margin: '0 auto' }}>
            <GlowBtn onClick={retry}>{runCount + 1}회차 학습 ▶</GlowBtn>
          </div>
          <div style={{ marginTop: 22, fontSize: 10, color: COLORS.textMute, fontFamily: titleFont, letterSpacing: '0.2em' }}>시장학습사 인증</div>
        </div>
      </Screen>
    );
  }

  // ─── Playing ───────────────────────────────────────────────────────────────
  const r = RANKS[rank];
  const pointsInLevel = points - rank * LEVEL_UP_POINTS;
  const progressPct = (pointsInLevel / LEVEL_UP_POINTS) * 100;
  const isCorrect = submitted && selected === problem.answer;

  const xTicks: number[] = [];
  const tickCount = 5;
  for (let i = 0; i < tickCount; i++) {
    const idx = Math.floor((visibleData.length - 1) * (i / (tickCount - 1)));
    if (visibleData[idx]) xTicks.push(visibleData[idx].day);
  }

  // 로딩 중 스피너
  if (chartLoading) {
    return (
      <Screen>
        <FontLoader />
        <div style={{ textAlign: 'center', fontFamily: titleFont }}>
          <div style={{ fontSize: 32, marginBottom: 16, animation: 'bounce 1s infinite' }}>📊</div>
          <div style={{ fontSize: 14, color: COLORS.textDim, letterSpacing: '0.2em' }}>차트 데이터 로딩 중...</div>
          <div style={{ fontSize: 11, color: COLORS.textMute, marginTop: 8, letterSpacing: '0.1em' }}>{problem.ticker}</div>
        </div>
      </Screen>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at top, ${COLORS.bgPanel} 0%, ${COLORS.bg} 40%, ${COLORS.bgDeep} 100%)`,
      color: COLORS.text,
      fontFamily: koreanFont,
      padding: '6px 8px',
      position: 'relative',
    }}>
      <FontLoader />

      {/* HUD */}
      <div style={{ maxWidth: 720, margin: '0 auto 6px' }}>
        <GlowBox color={COLORS.border} bg={COLORS.bgPanel} style={{ padding: '6px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{r.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, fontFamily: koreanFont, color: COLORS.textBright, letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
              <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: titleFont, letterSpacing: '0.1em' }}>{r.lv}단계 · {runCount}회차</div>
            </div>
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ fontSize: 16, color: i < hp ? COLORS.red : '#c4b6a0', transition: 'all 0.3s' }}>♥</span>
              ))}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 50 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textBright, fontFamily: titleFont, lineHeight: 1 }}>
                {points}<span style={{ fontSize: 10, color: COLORS.textDim, marginLeft: 2 }}>점</span>
              </div>
              {combo >= 3 && (
                <div style={{ fontSize: 10, fontFamily: titleFont, color: COLORS.red, fontWeight: 700, animation: 'blink 0.5s infinite' }}>🔥 {combo}연속</div>
              )}
            </div>
          </div>
          <div style={{ height: 4, background: COLORS.bgDeep, border: `1px solid ${COLORS.border}`, position: 'relative' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: COLORS.border, transition: 'width 0.5s' }}/>
          </div>
        </GlowBox>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Problem meta + RSI toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap', fontSize: 10, fontFamily: titleFont, alignItems: 'center' }}>
          <span style={{ padding: '3px 8px', background: COLORS.bgPanel, color: COLORS.textBright, border: `1px solid ${COLORS.border}`, letterSpacing: '0.1em', fontWeight: 700 }}>{problem.market}</span>
          <span style={{ padding: '3px 8px', background: problem.difficulty === 'hard' ? COLORS.red : problem.difficulty === 'medium' ? COLORS.orange : COLORS.green, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>{problem.difficulty}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'center' }}>
            <button onClick={() => setShowRSI(!showRSI)} style={toggleBtn(showRSI, COLORS.red)}>
              {showRSI ? '✓ RSI' : '+ RSI 보기'}
            </button>
          </div>
        </div>

        {/* Chart */}
        <GlowBox color={COLORS.border} bg={COLORS.bgChart} style={{ padding: '6px 6px 2px', marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 4, paddingLeft: 4, fontSize: 9, fontFamily: titleFont, fontWeight: 700, letterSpacing: '0.02em', flexWrap: 'wrap' }}>
            <LegendItem color={COLORS.blueBright} label="종가" />
            <LegendItem color={COLORS.yellow} label="MA5" dashed />
            <LegendItem color={COLORS.purple} label="MA20" dashed />
            <LegendItem color={COLORS.orange} label="MA60" dashed />
            {revealed && <LegendItem color={COLORS.gold} label="문제시점" vertical />}
          </div>

          <ResponsiveContainer width="100%" height={140}>
            <ComposedChart data={visibleData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.blueBright} stopOpacity={0.4}/>
                  <stop offset="100%" stopColor={COLORS.blueBright} stopOpacity={0.05}/>
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
              {revealed && (
                <ReferenceLine x={problem.revealDay} stroke={COLORS.gold} strokeWidth={2} strokeDasharray="4 4"
                  label={{ value: '◆ 문제시점', fill: COLORS.goldBright, fontSize: 11, position: 'top', fontFamily: 'monospace', fontWeight: 700 }}/>
              )}
              <Area type="monotone" dataKey="종가" stroke={COLORS.blueBright} strokeWidth={2} fill="url(#pg)" isAnimationActive={false}/>
              <Line type="monotone" dataKey="MA5" stroke={COLORS.yellow} strokeWidth={1.2} strokeDasharray="3 3" dot={false} isAnimationActive={false}/>
              <Line type="monotone" dataKey="MA20" stroke={COLORS.purple} strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false}/>
              <Line type="monotone" dataKey="MA60" stroke={COLORS.orange} strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false}/>
            </ComposedChart>
          </ResponsiveContainer>

          {/* Volume */}
          <div style={{ fontSize: 9, fontFamily: titleFont, color: COLORS.blueBright, letterSpacing: '0.1em', paddingLeft: 4, marginTop: 3, marginBottom: 1, fontWeight: 700 }}>거래량</div>
          <ResponsiveContainer width="100%" height={50}>
            <ComposedChart data={visibleData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={COLORS.textMute} vertical={false} opacity={0.2}/>
              <XAxis dataKey="day" tick={false} axisLine={{ stroke: COLORS.borderDark }}/>
              <YAxis tick={{ fontSize: 9, fill: COLORS.textDim, fontFamily: 'monospace' }} tickLine={false} width={42}
                tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`}
                axisLine={{ stroke: COLORS.borderDark }}/>
              <Tooltip
                contentStyle={{ background: COLORS.bgDeep, border: `2px solid ${COLORS.blue}`, fontSize: 11, fontFamily: 'monospace', color: COLORS.text }}
                formatter={(v) => [Number(v).toLocaleString(), '거래량']}
                labelFormatter={(d) => { const item = fullData[d as number]; return item ? item.date : ''; }}
              />
              {revealed && <ReferenceLine x={problem.revealDay} stroke={COLORS.gold} strokeDasharray="4 4"/>}
              <Bar dataKey="거래량">
                {visibleData.map((d, i) => {
                  const prev = i > 0 ? visibleData[i - 1].종가 : d.종가;
                  const up = d.종가 >= prev;
                  return <Cell key={i} fill={up ? COLORS.green : COLORS.red} fillOpacity={0.7}/>;
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>

          {/* RSI */}
          {showRSI && (
            <>
              <div style={{ fontSize: 9, fontFamily: titleFont, color: COLORS.red, letterSpacing: '0.1em', paddingLeft: 4, marginTop: 3, marginBottom: 1, fontWeight: 700 }}>RSI(14) · 70↑과매수 / 30↓과매도</div>
              <ResponsiveContainer width="100%" height={50}>
                <ComposedChart data={visibleData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={COLORS.textMute} vertical={false} opacity={0.2}/>
                  <XAxis dataKey="day" tick={false} axisLine={{ stroke: COLORS.borderDark }}/>
                  <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={{ fontSize: 9, fill: COLORS.textDim, fontFamily: 'monospace' }} tickLine={false} width={42} axisLine={{ stroke: COLORS.borderDark }}/>
                  <Tooltip
                    contentStyle={{ background: COLORS.bgDeep, border: `2px solid ${COLORS.pink}`, fontSize: 11, fontFamily: 'monospace', color: COLORS.text }}
                    labelFormatter={(d) => { const item = fullData[d as number]; return item ? item.date : ''; }}
                  />
                  <ReferenceLine y={70} stroke={COLORS.red} strokeDasharray="2 3" opacity={0.6}/>
                  <ReferenceLine y={30} stroke={COLORS.green} strokeDasharray="2 3" opacity={0.6}/>
                  {revealed && <ReferenceLine x={problem.revealDay} stroke={COLORS.gold} strokeDasharray="4 4"/>}
                  <Line type="monotone" dataKey="RSI" stroke={COLORS.pink} strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </>
          )}
        </GlowBox>

        {/* Macro hints */}
        {(() => {
          const posCount = problem.macroHints.filter(h => h.tone === 'positive').length;
          const negCount = problem.macroHints.filter(h => h.tone === 'negative').length;
          const overallTone = posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'mixed';
          const toneLabel = overallTone === 'positive' ? '우호적' : overallTone === 'negative' ? '부정적' : '혼재';
          const toneColor = overallTone === 'positive' ? COLORS.green : overallTone === 'negative' ? COLORS.red : COLORS.textDim;

          return (
            <div style={{ marginBottom: 6 }}>
              <button onClick={() => setShowMacroDetail(!showMacroDetail)} style={{ width: '100%', background: COLORS.bgPanel, border: `2px solid ${COLORS.border}`, boxShadow: `2px 2px 0 0 ${COLORS.border}`, padding: '5px 10px', fontFamily: titleFont, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, color: COLORS.textDim, letterSpacing: '0.15em', fontWeight: 700 }}>매크로</span>
                  <span style={{ display: 'flex', gap: 3 }}>
                    {problem.macroHints.map((h, i) => {
                      const c = h.tone === 'positive' ? COLORS.green : h.tone === 'negative' ? COLORS.red : COLORS.textDim;
                      return <span key={i} style={{ width: 8, height: 8, background: c, display: 'inline-block', border: `1px solid ${COLORS.border}` }}/>;
                    })}
                  </span>
                  <span style={{ fontSize: 12, color: toneColor, fontWeight: 700, letterSpacing: '0.1em' }}>{toneLabel}</span>
                </div>
                <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: titleFont, letterSpacing: '0.1em' }}>{showMacroDetail ? '▲ 접기' : '▼ 상세'}</span>
              </button>

              {showMacroDetail && (
                <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 6 }}>
                  {problem.macroHints.map((h, i) => {
                    const c = h.tone === 'positive' ? COLORS.green : h.tone === 'negative' ? COLORS.red : COLORS.textDim;
                    return (
                      <div key={i} style={{ background: COLORS.bgPanel, border: `1px solid ${c}`, borderLeft: `4px solid ${c}`, padding: '6px 9px' }}>
                        <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: titleFont }}><GlossaryText text={h.label} onTerm={setActiveTerm} /></div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: koreanFont }}>{h.value}</div>
                        <div style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.35, fontFamily: koreanFont }}><GlossaryText text={h.trend} onTerm={setActiveTerm} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Question */}
        <div style={{ padding: '6px 10px', marginBottom: 6, borderLeft: `3px solid ${COLORS.red}`, background: COLORS.bgPanel }}>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: COLORS.textBright, fontFamily: koreanFont }}>
            <span style={{ color: COLORS.red, fontWeight: 700, marginRight: 6, fontFamily: titleFont, fontSize: 12 }}>문.</span>
            {problem.question}
          </div>
        </div>

        {/* Choices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
          {problem.choices.map((c, i) => {
            const isSel = selected === i;
            const isAns = submitted && i === problem.answer;
            const isWrong = submitted && isSel && i !== problem.answer;
            let bg = COLORS.bgPanel, bd = COLORS.border, col = COLORS.text;
            if (isAns) { bg = '#dcf5e0'; bd = COLORS.green; col = '#14532d'; }
            else if (isWrong) { bg = '#fde2e1'; bd = COLORS.red; col = '#7f1d1d'; }
            else if (isSel) { bg = '#fff7d6'; bd = COLORS.red; col = COLORS.textBright; }
            return (
              <button key={i} onClick={() => !submitted && setSelected(i)} disabled={submitted}
                style={{ display: 'flex', gap: 8, padding: '7px 10px', background: bg, border: `2px solid ${bd}`, boxShadow: isSel || isAns || isWrong ? `2px 2px 0 0 ${bd}` : `2px 2px 0 0 ${COLORS.border}`, borderRadius: 2, color: col, cursor: submitted ? 'default' : 'pointer', textAlign: 'left', fontSize: 12.5, lineHeight: 1.4, fontFamily: koreanFont, transition: 'all 0.1s' }}>
                <span style={{ fontFamily: titleFont, color: isAns ? COLORS.green : isWrong ? COLORS.red : COLORS.red, fontWeight: 700, flexShrink: 0, fontSize: 12.5 }}>{['①', '②', '③', '④'][i]}</span>
                <span><GlossaryText text={c} onTerm={setActiveTerm} /></span>
              </button>
            );
          })}
        </div>

        {/* Score change */}
        {submitted && lastGain !== 0 && (
          <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 22, fontWeight: 700, color: lastGain > 0 ? COLORS.greenBright : COLORS.redBright, fontFamily: titleFont, animation: 'bounce 0.4s' }}>
            {lastGain > 0 ? `+${lastGain} POINTS!` : '-1 ♥'}
            {combo >= 3 && lastGain > 0 && <span style={{ fontSize: 14, color: COLORS.pink, marginLeft: 12 }}>🔥 x{combo}</span>}
          </div>
        )}

        {/* Explanation */}
        {submitted && (
          <GlowBox color={isCorrect ? COLORS.greenBright : COLORS.redBright} bg={COLORS.bgPanel} style={{ padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontFamily: titleFont, letterSpacing: '0.15em', color: isCorrect ? COLORS.greenBright : COLORS.redBright, marginBottom: 8, fontWeight: 700 }}>
              {isCorrect ? '✓ 정답!' : '✗ 오답'} · 답: {['1', '2', '3', '4'][problem.answer]}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.75, color: COLORS.text, fontFamily: koreanFont, marginBottom: 10 }}>
              <GlossaryText text={problem.explanation} onTerm={setActiveTerm} />
            </div>
            {problem.odds && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: COLORS.bgDeep, borderLeft: `3px solid ${COLORS.orange}`, borderRadius: 2 }}>
                <div style={{ fontSize: 10, fontFamily: titleFont, letterSpacing: '0.15em', color: COLORS.orange, marginBottom: 4, fontWeight: 700 }}>📊 통계적 관점</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.65, color: COLORS.textDim, fontFamily: koreanFont, fontStyle: 'italic' }}>
                  <GlossaryText text={problem.odds} onTerm={setActiveTerm} />
                </div>
              </div>
            )}
          </GlowBox>
        )}

        {/* Reveal */}
        {submitted && problem.reveal && (
          <GlowBox color={COLORS.gold} bg={COLORS.bgPanel} style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontFamily: titleFont, letterSpacing: '0.2em', color: COLORS.goldBright, marginBottom: 8, fontWeight: 700 }}>━ 실제 종목 공개 ━</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textBright, marginBottom: 3, fontFamily: koreanFont }}>{problem.reveal.title}</div>
            <div style={{ fontSize: 11, fontFamily: titleFont, color: COLORS.textDim, marginBottom: 14, letterSpacing: '0.05em' }}>{problem.reveal.market} · {problem.reveal.period}</div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontFamily: titleFont, color: COLORS.blueBright, letterSpacing: '0.15em', marginBottom: 5, fontWeight: 700 }}>▶ 실제 결과</div>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: COLORS.text, fontFamily: koreanFont }}>
                <GlossaryText text={problem.reveal.result} onTerm={setActiveTerm} />
              </div>
            </div>

            <div style={{ marginBottom: 12, padding: '10px 12px', background: COLORS.bgDeep, border: `2px solid ${COLORS.purple}` }}>
              <div style={{ fontSize: 11, fontFamily: titleFont, color: COLORS.purple, letterSpacing: '0.15em', marginBottom: 5, fontWeight: 700 }}>▶ 매크로 배경</div>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: COLORS.text, fontFamily: koreanFont }}>
                <GlossaryText text={problem.reveal.macro} onTerm={setActiveTerm} />
              </div>
            </div>

            {problem.reveal.counterCase && (
              <div style={{ marginBottom: 12, padding: '10px 12px', background: COLORS.bgDeep, border: `2px solid ${COLORS.pink}` }}>
                <div style={{ fontSize: 11, fontFamily: titleFont, color: COLORS.pink, letterSpacing: '0.15em', marginBottom: 5, fontWeight: 700 }}>⚠ 반례 / 다른 가능성</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: COLORS.text, fontFamily: koreanFont }}>
                  <GlossaryText text={problem.reveal.counterCase} onTerm={setActiveTerm} />
                </div>
              </div>
            )}

            <div style={{ borderTop: `2px dashed ${COLORS.goldDark}`, paddingTop: 10, fontSize: 13.5, lineHeight: 1.65, color: COLORS.goldBright, fontFamily: koreanFont, fontWeight: 600 }}>
              <span style={{ fontFamily: titleFont, fontSize: 12, marginRight: 4 }}>★</span>
              <GlossaryText text={problem.reveal.lesson} onTerm={setActiveTerm} />
            </div>
          </GlowBox>
        )}

        {/* Action button */}
        {submitted ? (
          <GlowBtn onClick={handleNext} color={pendingLevelUp ? COLORS.goldBright : COLORS.greenBright}>
            {pendingLevelUp ? '★ 다음 (LEVEL UP!) ▶' : '다음 문제 ▶'}
          </GlowBtn>
        ) : (
          <GlowBtn onClick={handleSubmit} disabled={selected === null} color={COLORS.goldBright}>
            ▶ 제출하기
          </GlowBtn>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.4; } }
        @keyframes bounce {
          0% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
          60% { transform: translateY(0); }
          80% { transform: translateY(-3px); }
          100% { transform: translateY(0); }
        }
        @keyframes levelup {
          0% { opacity: 0; transform: scale(0.5); }
          50% { transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <GlossaryModal term={activeTerm} onClose={() => setActiveTerm(null)} />
    </div>
  );
}
