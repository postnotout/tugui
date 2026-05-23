import { GLOSSARY } from '../constants/glossary';
import { COLORS } from '../constants/colors';

interface Props {
  text: string;
  onTerm: (term: string) => void;
}

export function GlossaryText({ text, onTerm }: Props) {
  if (!text) return null;

  const terms = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
  const matches: { start: number; end: number; term: string }[] = [];

  for (const term of terms) {
    let idx = 0;
    while ((idx = text.indexOf(term, idx)) !== -1) {
      if (!matches.some(m => idx >= m.start && idx < m.end)) {
        matches.push({ start: idx, end: idx + term.length, term });
      }
      idx += term.length;
    }
  }
  matches.sort((a, b) => a.start - b.start);

  if (matches.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (cursor < m.start) parts.push(<span key={`t${i}`}>{text.slice(cursor, m.start)}</span>);
    parts.push(
      <span
        key={`g${i}`}
        onClick={(e) => { e.stopPropagation(); onTerm(m.term); }}
        style={{
          color: COLORS.goldBright,
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textDecorationColor: COLORS.gold,
          textUnderlineOffset: '3px',
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >{text.slice(m.start, m.end)}</span>
    );
    cursor = m.end;
  });
  if (cursor < text.length) parts.push(<span key="end">{text.slice(cursor)}</span>);

  return <>{parts}</>;
}

interface ModalProps {
  term: string | null;
  onClose: () => void;
}

export function GlossaryModal({ term, onClose }: ModalProps) {
  if (!term) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
        animation: 'fadeIn 0.2s',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 420, width: '100%',
          background: COLORS.bgPanel,
          border: `3px solid ${COLORS.goldBright}`,
          borderRadius: 4,
          padding: '18px 20px',
          animation: 'levelup 0.3s',
        }}
      >
        <div style={{
          fontSize: 11, fontFamily: '"DotGothic16", monospace',
          letterSpacing: '0.2em', color: COLORS.gold, marginBottom: 8,
          fontWeight: 700,
        }}>━ 용어 사전 ━</div>
        <div style={{
          fontSize: 22, fontWeight: 700, color: COLORS.goldBright,
          marginBottom: 12, fontFamily: '"DotGothic16", monospace',
        }}>{term}</div>
        <div style={{
          fontSize: 14, lineHeight: 1.75, color: COLORS.text,
          fontFamily: '"DotGothic16", monospace',
          marginBottom: 16,
        }}>{GLOSSARY[term]}</div>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '10px',
            background: `linear-gradient(180deg, ${COLORS.goldBright} 0%, ${COLORS.gold} 100%)`,
            color: COLORS.bgDeep,
            border: `2px solid ${COLORS.bgDeep}`,
            borderRadius: 3,
            fontFamily: '"DotGothic16", monospace',
            fontSize: 14, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `inset 1px 1px 0 0 rgba(255,255,255,0.4), 0 2px 0 0 ${COLORS.bgDeep}`,
          }}
        >확인 ▶</button>
      </div>
    </div>
  );
}
