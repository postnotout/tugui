import { useState } from 'react';
import { COLORS } from '../constants/colors';

export function GlowBox({
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

export function GlowBtn({
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
        border: `2px solid ${disabled ? '#a89a7a' : color}`,
        boxShadow: pressed || disabled ? 'none' : `3px 3px 0 0 ${color}`,
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

export function LegendItem({ color, label, dashed, vertical }: {
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

export function Screen({ children, tight }: { children: React.ReactNode; tight?: boolean }) {
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

export function FontLoader() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DotGothic16&family=Noto+Serif+KR:wght@400;500;600;700;900&family=Nanum+Myeongjo:wght@400;700;800&display=swap');
    `}</style>
  );
}

export function toggleBtn(active: boolean, color: string): React.CSSProperties {
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

export const TITLE_FONT = '"Noto Serif KR", "Nanum Myeongjo", serif';
export const KOREAN_FONT = '"Noto Serif KR", "Nanum Myeongjo", serif';

export const GLOBAL_STYLES = `
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
`;
