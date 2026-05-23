import { COLORS } from '../constants/colors';

interface Props {
  stage: number;
  color?: string;
}

export default function EvolutionFigure({ stage, color = '#1a1a1a' }: Props) {
  const accent = COLORS.red;
  const skin = '#d4a574';

  if (stage === 0) {
    return (
      <svg width="90" height="110" viewBox="0 0 90 110" style={{ display: 'block', margin: '0 auto' }}>
        <ellipse cx="34" cy="100" rx="9" ry="7" fill={color}/>
        <ellipse cx="56" cy="100" rx="9" ry="7" fill={color}/>
        <path d="M 32 78 Q 30 90, 34 95" stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d="M 58 78 Q 60 90, 56 95" stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"/>
        <ellipse cx="45" cy="68" rx="20" ry="18" fill={color}/>
        <ellipse cx="45" cy="72" rx="13" ry="11" fill={skin} opacity="0.85"/>
        <path d="M 28 62 Q 18 78, 22 92" stroke={color} strokeWidth="9" fill="none" strokeLinecap="round"/>
        <circle cx="22" cy="93" r="6" fill={color}/>
        <path d="M 62 62 Q 72 70, 74 80" stroke={color} strokeWidth="9" fill="none" strokeLinecap="round"/>
        <circle cx="74" cy="80" r="5.5" fill={color}/>
        <path d="M 72 76 Q 80 68, 84 60" stroke="#fbbf24" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <path d="M 72 76 Q 80 68, 84 60" stroke={color} strokeWidth="1" fill="none" strokeLinecap="round"/>
        <ellipse cx="45" cy="32" rx="18" ry="17" fill={color}/>
        <ellipse cx="45" cy="35" rx="12" ry="11" fill={skin}/>
        <circle cx="28" cy="30" r="4" fill={color}/>
        <circle cx="62" cy="30" r="4" fill={color}/>
        <circle cx="28" cy="30" r="2" fill={skin}/>
        <circle cx="62" cy="30" r="2" fill={skin}/>
        <path d="M 37 28 Q 39 27, 41 29" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M 49 29 Q 51 27, 53 28" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <circle cx="39" cy="33" r="1.8" fill={color}/>
        <circle cx="51" cy="33" r="1.8" fill={color}/>
        <circle cx="43" cy="38" r="0.8" fill={color}/>
        <circle cx="47" cy="38" r="0.8" fill={color}/>
        <ellipse cx="45" cy="43" rx="4" ry="2" fill={color}/>
        <ellipse cx="45" cy="42.5" rx="2.5" ry="1" fill="#fde2e1"/>
      </svg>
    );
  }

  return (
    <svg width="90" height="110" viewBox="0 0 90 110" style={{ display: 'block', margin: '0 auto' }}>
      <rect x="36" y="78" width="8" height="24" fill={color}/>
      <rect x="46" y="78" width="8" height="24" fill={color}/>
      <ellipse cx="40" cy="103" rx="6" ry="3" fill={color}/>
      <ellipse cx="50" cy="103" rx="6" ry="3" fill={color}/>
      <path d="M 26 56 L 30 78 L 60 78 L 64 56 L 56 50 L 34 50 Z" fill={color}/>
      <path d="M 38 50 L 45 60 L 52 50 Z" fill="#ffffff"/>
      <path d="M 43 58 L 45 60 L 47 58 L 48 75 L 42 75 Z" fill={accent}/>
      <path d="M 43 58 L 45 60 L 47 58 L 47 56 L 43 56 Z" fill={accent}/>
      <rect x="60" y="56" width="7" height="20" rx="3" fill={color}/>
      <circle cx="63.5" cy="78" r="4" fill={skin}/>
      <rect x="23" y="56" width="7" height="18" rx="3" fill={color} transform="rotate(-15 26.5 65)"/>
      <circle cx="18" cy="72" r="4" fill={skin}/>
      <rect x="8" y="60" width="16" height="14" fill="#ffffff" stroke={color} strokeWidth="1"/>
      <polyline points="10,71 13,68 15,69 17,65 19,66 22,62" fill="none" stroke={accent} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M 20 64 L 22 62 L 22 65" stroke={accent} strokeWidth="1" fill="none"/>
      <rect x="42" y="44" width="6" height="8" fill={skin}/>
      <ellipse cx="45" cy="32" rx="14" ry="15" fill={skin}/>
      <path d="M 32 24 Q 35 16, 45 16 Q 56 16, 58 24 Q 58 22, 56 21 L 40 22 Q 34 22, 32 24 Z" fill={color}/>
      <path d="M 36 19 Q 42 14, 50 17" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <ellipse cx="32" cy="33" rx="2" ry="3" fill={skin}/>
      <ellipse cx="58" cy="33" rx="2" ry="3" fill={skin}/>
      <circle cx="39" cy="32" r="4.5" fill="none" stroke={color} strokeWidth="1.8"/>
      <circle cx="51" cy="32" r="4.5" fill="none" stroke={color} strokeWidth="1.8"/>
      <line x1="34.5" y1="32" x2="32" y2="32" stroke={color} strokeWidth="1.5"/>
      <line x1="55.5" y1="32" x2="58" y2="32" stroke={color} strokeWidth="1.5"/>
      <line x1="43.5" y1="32" x2="46.5" y2="32" stroke={color} strokeWidth="1.5"/>
      <circle cx="39" cy="32" r="3" fill="#e0f2fe" opacity="0.5"/>
      <circle cx="51" cy="32" r="3" fill="#e0f2fe" opacity="0.5"/>
      <circle cx="39" cy="32" r="1.2" fill={color}/>
      <circle cx="51" cy="32" r="1.2" fill={color}/>
      <path d="M 45 35 L 44 39 L 46 39 Z" fill={color} opacity="0.3"/>
      <path d="M 41 42 Q 45 44, 49 42" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}
