import { useLayoutEffect, useState } from 'react';
import { COLORS } from '../constants/colors';
import { KOREAN_FONT, TITLE_FONT } from './GameUI';

// ─── Step definitions ───────────────────────────────────────────────────────
interface Step { targetId: string; title: string; message: string; }

const STEPS: Step[] = [
  {
    targetId: 'tut-chart',
    title: '① 가격 차트',
    message:
      '파란 영역이 이 종목의 주가 흐름입니다. 왼쪽이 과거, 오른쪽이 현재예요. ' +
      '차트가 끝나는 시점 이후를 예측하는 것이 목표입니다.',
  },
  {
    targetId: 'tut-legend',
    title: '② 이동평균선 (MA)',
    message:
      'MA5(노랑)·MA20(보라)·MA60(주황)은 각각 1주·1달·3달 평균 주가입니다. ' +
      '주가가 이평선 위에 있으면 상승 추세, 아래면 하락 추세로 해석해요.',
  },
  {
    targetId: 'tut-volume',
    title: '③ 거래량',
    message:
      '거래량은 그날 거래된 주식 수량입니다. 초록색은 상승일, 빨간색은 하락일이에요. ' +
      '거래량이 폭발적으로 늘면서 주가가 오르면 신뢰도가 높아집니다.',
  },
  {
    targetId: 'tut-macro',
    title: '④ 매크로 힌트',
    message:
      '당시 시장 환경입니다. 금리·환율·업황 등 주가에 영향을 주는 외부 요인이에요. ' +
      '▼ 상세를 눌러 펼칠 수 있습니다. 반드시 차트와 함께 확인하세요!',
  },
  {
    targetId: 'tut-choices',
    title: '⑤ 이제 선택해보세요!',
    message:
      '차트와 매크로를 종합해 이후 흐름을 예측해보세요. ' +
      '연습 문제라 HP와 점수에 영향이 없습니다. 틀려도 괜찮아요 — 해설이 핵심입니다!',
  },
];

const DARK = 'rgba(12,10,6,0.82)';
const PAD = 8;
const MARGIN = 14;

interface Props {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}

export default function Tutorial({ step, onNext, onSkip }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const currentStep: Step | undefined = STEPS[step];

  useLayoutEffect(() => {
    if (!currentStep) { setRect(null); return; }
    const measure = () => {
      const el = document.getElementById(currentStep.targetId);
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setRect(el.getBoundingClientRect());
    };
    measure();
    // Re-measure after scroll animation settles
    const tid = window.setTimeout(measure, 340);
    return () => window.clearTimeout(tid);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentStep) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Spotlight rectangle (with padding)
  const sp = rect
    ? {
        top: Math.max(0, rect.top - PAD),
        left: Math.max(0, rect.left - PAD),
        width: Math.min(vw, rect.width + PAD * 2),
        height: Math.min(vh - Math.max(0, rect.top - PAD), rect.height + PAD * 2),
      }
    : null;

  // ─── 4-rectangle "spotlight hole" technique ─────────────────────────────
  // Covers the entire screen EXCEPT the spotlight area with dark background.
  // Each rect has pointer-events: all to block clicks during the tour.
  type R = React.CSSProperties;
  const base: R = {
    position: 'fixed', background: DARK, zIndex: 9000, pointerEvents: 'all',
  };
  const rects: R[] = sp
    ? [
        // Top strip
        { ...base, top: 0, left: 0, right: 0, height: sp.top },
        // Left strip
        { ...base, top: sp.top, left: 0, width: sp.left, height: sp.height },
        // Right strip
        { ...base, top: sp.top, left: sp.left + sp.width, right: 0, height: sp.height },
        // Bottom strip
        { ...base, top: sp.top + sp.height, left: 0, right: 0, bottom: 0 },
      ]
    : [{ ...base, top: 0, left: 0, right: 0, bottom: 0 }];

  // ─── Tooltip position (below or above spotlight) ─────────────────────────
  const TOOLTIP_H = 215;
  let tooltipTop: number;
  if (sp) {
    const belowY = sp.top + sp.height + 12;
    const aboveY = sp.top - TOOLTIP_H - 12;
    tooltipTop = belowY + TOOLTIP_H < vh - MARGIN ? belowY : Math.max(MARGIN, aboveY);
  } else {
    tooltipTop = vh / 2 - TOOLTIP_H / 2;
  }

  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Dark rectangles surrounding the spotlight */}
      {rects.map((style, i) => <div key={i} style={style} />)}

      {/* Golden spotlight border (pointer-events: none — just visual) */}
      {sp && (
        <div
          style={{
            position: 'fixed',
            top: sp.top, left: sp.left,
            width: sp.width, height: sp.height,
            border: `3px solid ${COLORS.gold}`,
            boxShadow: `0 0 14px 6px ${COLORS.gold}50`,
            zIndex: 9001,
            pointerEvents: 'none',
            borderRadius: 3,
            transition: 'top 0.28s ease, left 0.28s ease, width 0.28s ease, height 0.28s ease',
          }}
        />
      )}

      {/* Tooltip card (z-index above dark rects, pointer-events: all) */}
      <div
        style={{
          position: 'fixed',
          top: tooltipTop,
          left: MARGIN,
          right: MARGIN,
          zIndex: 9002,
          pointerEvents: 'all',
          transition: 'top 0.28s ease',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            margin: '0 auto',
            background: COLORS.bgPanel,
            border: `3px solid ${COLORS.gold}`,
            boxShadow: `4px 4px 0 0 ${COLORS.goldDark}`,
            padding: '16px 18px',
            fontFamily: KOREAN_FONT,
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.gold, fontFamily: TITLE_FONT, letterSpacing: '0.12em' }}>
              {currentStep.title}
            </div>
            <div style={{ fontSize: 10, color: COLORS.textMute, fontFamily: TITLE_FONT, letterSpacing: '0.08em' }}>
              {step + 1} / {STEPS.length}
            </div>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 18 : 6,
                  height: 6,
                  background: i <= step ? COLORS.gold : COLORS.borderDark,
                  borderRadius: 3,
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>

          {/* Message */}
          <div style={{ fontSize: 13, lineHeight: 1.78, color: COLORS.text, marginBottom: 16 }}>
            {currentStep.message}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onNext}
              style={{
                flex: 1, padding: '10px 0',
                background: COLORS.bgDeep, color: COLORS.textBright,
                border: `2px solid ${COLORS.gold}`,
                boxShadow: `2px 2px 0 0 ${COLORS.goldDark}`,
                fontFamily: TITLE_FONT, fontSize: 13, fontWeight: 700,
                letterSpacing: '0.18em', cursor: 'pointer',
              }}
            >
              {isLast ? '풀어보기 ▶' : '다 음 ▶'}
            </button>
            <button
              onClick={onSkip}
              style={{
                padding: '10px 14px',
                background: 'none', color: COLORS.textDim,
                border: `1px solid ${COLORS.borderDark}`,
                fontFamily: TITLE_FONT, fontSize: 11,
                letterSpacing: '0.08em', cursor: 'pointer',
              }}
            >
              건너뛰기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
