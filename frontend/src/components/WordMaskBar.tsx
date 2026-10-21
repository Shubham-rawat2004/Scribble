import React from 'react';

interface WordMaskBarProps {
  isDrawer: boolean;
  secretWord?: string;
  wordMask?: string;
  wordLength?: number;
  timeRemaining?: number;
  gameMode?: string;
  isChoosing?: boolean;
}

export const WordMaskBar: React.FC<WordMaskBarProps> = ({
  isDrawer,
  secretWord = '',
  wordMask = '',
  wordLength = 0,
  gameMode = 'Normal',
  isChoosing = false,
}) => {
  if (isChoosing) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: '1.25rem',
            fontWeight: 900,
            color: '#0f172a',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          WAITING
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Drawer: DRAW THIS + Word (matching Screenshot 1444) */}
      {isDrawer ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '0.76rem',
              fontWeight: 800,
              color: '#475569',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              lineHeight: 1,
              marginBottom: '2px',
            }}
          >
            DRAW THIS
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '0.04em',
                lineHeight: 1.1,
              }}
            >
              {secretWord ? secretWord.toLowerCase() : ''}
            </span>
            {gameMode && gameMode !== 'Normal' && (
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  backgroundColor: gameMode === 'Hidden' ? '#fef3c7' : '#ede9fe',
                  color: gameMode === 'Hidden' ? '#92400e' : '#6d28d9',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                }}
              >
                {gameMode}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Guesser: GUESS THIS + Mask */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#475569',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              lineHeight: 1,
              marginBottom: '2px',
            }}
          >
            GUESS THIS
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontSize: '1.65rem',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '0.22em',
                lineHeight: 1.1,
                fontFamily: 'monospace',
              }}
            >
              {wordMask || (wordLength > 0 ? '_ '.repeat(wordLength).trim() : '???')}
            </span>
            {wordLength > 0 && gameMode !== 'Hidden' && (
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>
                ({wordLength})
              </span>
            )}
            {gameMode && gameMode !== 'Normal' && (
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  backgroundColor: gameMode === 'Hidden' ? '#fef3c7' : '#ede9fe',
                  color: gameMode === 'Hidden' ? '#92400e' : '#6d28d9',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                }}
              >
                {gameMode}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
