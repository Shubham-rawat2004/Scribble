import React from 'react';

export interface SkribblAvatarConfig {
  colorIndex: number;
  eyesIndex: number;
  mouthIndex: number;
}

export const AVATAR_COLORS = [
  '#facc15', // 0: Yellow
  '#38bdf8', // 1: Sky Blue
  '#4ade80', // 2: Lime Green
  '#f43f5e', // 3: Coral Red
  '#a855f7', // 4: Purple
  '#fb923c', // 5: Orange
  '#2dd4bf', // 6: Mint / Cyan
  '#f472b6', // 7: Bubblegum Pink
  '#60a5fa', // 8: Royal Blue
  '#fbbf24', // 9: Amber Gold
];

export const TOTAL_EYES = 8;
export const TOTAL_MOUTHS = 8;
export const TOTAL_COLORS = AVATAR_COLORS.length;

export function parseAvatarId(avatarId: string): SkribblAvatarConfig {
  if (avatarId && avatarId.startsWith('skribbl_')) {
    const parts = avatarId.split('_');
    const c = parseInt(parts[1], 10);
    const e = parseInt(parts[2], 10);
    const m = parseInt(parts[3], 10);
    return {
      colorIndex: isNaN(c) ? 0 : Math.abs(c) % TOTAL_COLORS,
      eyesIndex: isNaN(e) ? 0 : Math.abs(e) % TOTAL_EYES,
      mouthIndex: isNaN(m) ? 0 : Math.abs(m) % TOTAL_MOUTHS,
    };
  }

  // Legacy avatar mappings (avatar_1 to avatar_8)
  const legacyMap: Record<string, SkribblAvatarConfig> = {
    avatar_1: { colorIndex: 0, eyesIndex: 0, mouthIndex: 0 }, // Panda-ish / Happy
    avatar_2: { colorIndex: 5, eyesIndex: 1, mouthIndex: 1 }, // Fox / Joy
    avatar_3: { colorIndex: 1, eyesIndex: 3, mouthIndex: 3 }, // Cat / Cute
    avatar_4: { colorIndex: 9, eyesIndex: 2, mouthIndex: 4 }, // Lion / Cool
    avatar_5: { colorIndex: 2, eyesIndex: 7, mouthIndex: 2 }, // Frog / Derp
    avatar_6: { colorIndex: 6, eyesIndex: 5, mouthIndex: 6 }, // Robot / Calm
    avatar_7: { colorIndex: 4, eyesIndex: 4, mouthIndex: 2 }, // Alien / Wink
    avatar_8: { colorIndex: 7, eyesIndex: 0, mouthIndex: 1 }, // Koala / Laugh
  };

  if (legacyMap[avatarId]) {
    return legacyMap[avatarId];
  }

  return { colorIndex: 0, eyesIndex: 0, mouthIndex: 0 };
}

export function serializeAvatarConfig(config: SkribblAvatarConfig): string {
  return `skribbl_${config.colorIndex}_${config.eyesIndex}_${config.mouthIndex}`;
}

export function getRandomAvatarConfig(): SkribblAvatarConfig {
  return {
    colorIndex: Math.floor(Math.random() * TOTAL_COLORS),
    eyesIndex: Math.floor(Math.random() * TOTAL_EYES),
    mouthIndex: Math.floor(Math.random() * TOTAL_MOUTHS),
  };
}

interface SkribblAvatarProps {
  avatarId?: string;
  config?: SkribblAvatarConfig;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const SkribblAvatar: React.FC<SkribblAvatarProps> = ({
  avatarId,
  config: propConfig,
  size = 72,
  className = '',
  style = {},
}) => {
  const config = propConfig || parseAvatarId(avatarId || 'skribbl_0_0_0');
  const bg = AVATAR_COLORS[config.colorIndex % TOTAL_COLORS];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '50%',
        filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))',
        ...style,
      }}
    >
      {/* Head Circle */}
      <circle
        cx="50"
        cy="50"
        r="44"
        fill={bg}
        stroke="#1e293b"
        strokeWidth="6"
      />

      {/* Rosy Cheeks */}
      <circle cx="24" cy="58" r="6" fill="#f43f5e" opacity="0.4" />
      <circle cx="76" cy="58" r="6" fill="#f43f5e" opacity="0.4" />

      {/* Eyes Layer */}
      {renderEyes(config.eyesIndex)}

      {/* Mouth Layer */}
      {renderMouth(config.mouthIndex)}
    </svg>
  );
};

function renderEyes(index: number) {
  switch (index) {
    case 0:
      // Classic cute round eyes with gleam
      return (
        <g>
          <circle cx="34" cy="42" r="7.5" fill="#1e293b" />
          <circle cx="66" cy="42" r="7.5" fill="#1e293b" />
          <circle cx="36" cy="40" r="2.5" fill="#ffffff" />
          <circle cx="68" cy="40" r="2.5" fill="#ffffff" />
        </g>
      );

    case 1:
      // Happy arch eyes (^ ^)
      return (
        <g stroke="#1e293b" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M 26 44 Q 34 33 42 44" />
          <path d="M 58 44 Q 66 33 74 44" />
        </g>
      );

    case 2:
      // Cool Sunglasses
      return (
        <g>
          <path
            d="M 20 38 L 44 38 L 41 50 L 25 50 Z"
            fill="#0f172a"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M 56 38 L 80 38 L 75 50 L 59 50 Z"
            fill="#0f172a"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Bridge */}
          <line x1="44" y1="41" x2="56" y2="41" stroke="#0f172a" strokeWidth="4" />
          {/* Glare line */}
          <line x1="25" y1="42" x2="35" y2="46" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          <line x1="60" y1="42" x2="70" y2="46" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </g>
      );

    case 3:
      // Star Sparkle Eyes
      return (
        <g fill="#1e293b">
          <polygon points="34,32 36,40 44,42 36,44 34,52 32,44 24,42 32,40" />
          <polygon points="66,32 68,40 76,42 68,44 66,52 64,44 56,42 64,40" />
        </g>
      );

    case 4:
      // Wink: Left eye arched, Right eye round with gleam
      return (
        <g>
          <path
            d="M 25 44 Q 34 34 43 44"
            stroke="#1e293b"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="66" cy="42" r="7.5" fill="#1e293b" />
          <circle cx="68" cy="40" r="2.5" fill="#ffffff" />
        </g>
      );

    case 5:
      // Sleepy / Zen relaxed dashes (- -)
      return (
        <g stroke="#1e293b" strokeWidth="5" strokeLinecap="round">
          <line x1="26" y1="43" x2="42" y2="43" />
          <line x1="58" y1="43" x2="74" y2="43" />
        </g>
      );

    case 6:
      // Wide open curious / surprised circles
      return (
        <g stroke="#1e293b" strokeWidth="4" fill="#ffffff">
          <circle cx="34" cy="42" r="9" />
          <circle cx="66" cy="42" r="9" />
          <circle cx="34" cy="42" r="4.5" fill="#1e293b" stroke="none" />
          <circle cx="66" cy="42" r="4.5" fill="#1e293b" stroke="none" />
        </g>
      );

    case 7:
    default:
      // Derpy / Googly eyes
      return (
        <g stroke="#1e293b" strokeWidth="3.5" fill="#ffffff">
          <circle cx="33" cy="41" r="10" />
          <circle cx="67" cy="43" r="8" />
          <circle cx="31" cy="43" r="4" fill="#1e293b" stroke="none" />
          <circle cx="69" cy="41" r="3.5" fill="#1e293b" stroke="none" />
        </g>
      );
  }
}

function renderMouth(index: number) {
  switch (index) {
    case 0:
      // Classic friendly curve smile
      return (
        <path
          d="M 34 62 Q 50 74 66 62"
          stroke="#1e293b"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      );

    case 1:
      // Big open happy mouth with tongue
      return (
        <g>
          <path
            d="M 33 60 Q 50 82 67 60 Z"
            fill="#1e293b"
            stroke="#1e293b"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M 42 70 Q 50 63 58 70 Q 50 78 42 70 Z"
            fill="#f43f5e"
          />
        </g>
      );

    case 2:
      // Cheeky tongue sticking out
      return (
        <g>
          <path
            d="M 35 62 Q 50 70 65 62"
            stroke="#1e293b"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 45 66 C 45 78 57 78 57 66 Z"
            fill="#f43f5e"
            stroke="#1e293b"
            strokeWidth="3.5"
          />
          <line x1="51" y1="67" x2="51" y2="73" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
        </g>
      );

    case 3:
      // Cute cat mouth (:3)
      return (
        <path
          d="M 36 63 Q 43 70 50 63 Q 57 70 64 63"
          stroke="#1e293b"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
      );

    case 4:
      // Big toothy grin
      return (
        <g>
          <path
            d="M 32 60 Q 50 78 68 60 Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="4"
          />
          <line x1="32" y1="60" x2="68" y2="60" stroke="#1e293b" strokeWidth="3" />
          <line x1="50" y1="60" x2="50" y2="72" stroke="#1e293b" strokeWidth="2" />
        </g>
      );

    case 5:
      // Surprised / Whistle 'O'
      return (
        <circle
          cx="50"
          cy="66"
          r="6.5"
          fill="#1e293b"
          stroke="#1e293b"
          strokeWidth="3"
        />
      );

    case 6:
      // Cheeky smirk
      return (
        <path
          d="M 38 66 Q 54 68 64 58"
          stroke="#1e293b"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
      );

    case 7:
    default:
      // Straight serious line
      return (
        <line
          x1="38"
          y1="64"
          x2="62"
          y2="64"
          stroke="#1e293b"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      );
  }
}
