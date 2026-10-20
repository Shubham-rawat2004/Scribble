import React from 'react';
import { Clock } from 'lucide-react';

interface WordMaskBarProps {
  isDrawer: boolean;
  secretWord?: string;
  wordMask?: string;
  wordLength?: number;
  timeRemaining?: number;
}

export const WordMaskBar: React.FC<WordMaskBarProps> = ({
  isDrawer,
  secretWord = '',
  wordMask = '',
  wordLength = 0,
  timeRemaining = 80,
}) => {
  const isTimeCritical = timeRemaining <= 15;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '1rem',
        background: '#f8fafc',
        border: '2px solid #cbd5e1',
        borderRadius: '9999px',
        padding: '0.45rem 1.25rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* 1. Timer Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontWeight: 900,
          fontSize: '1.1rem',
          color: isTimeCritical ? '#ef4444' : '#1e3a8a',
          animation: isTimeCritical ? 'pulse 1s infinite' : 'none',
        }}
      >
        <Clock size={18} strokeWidth={2.5} />
        <span>{timeRemaining}s</span>
      </div>

      <div style={{ width: '1px', height: '20px', background: '#cbd5e1' }} />

      {/* 2. Word Display: Plaintext for Drawer, Mask for Guesser */}
      {isDrawer ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>
            Word:
          </span>
          <span
            style={{
              fontSize: '1.35rem',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {secretWord}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
            ({secretWord.length})
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: '#1e3a8a',
              letterSpacing: '0.25em',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            }}
          >
            {wordMask || '_ _ _ _ _'}
          </span>
          {wordLength > 0 && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
              ({wordLength})
            </span>
          )}
        </div>
      )}
    </div>
  );
};
