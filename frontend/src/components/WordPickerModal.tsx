import React, { useState, useEffect } from 'react';

export interface WordChoice {
  word: string;
  category: string;
  difficulty?: string;
}

interface WordPickerModalProps {
  words: WordChoice[];
  durationSeconds?: number;
  onSelectWord: (word: string) => void;
}

export const WordPickerModal: React.FC<WordPickerModalProps> = ({
  words,
  durationSeconds = 15,
  onSelectWord,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(durationSeconds);

  useEffect(() => {
    if (words.length === 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-select first word when timer runs out
          onSelectWord(words[0].word);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [words, onSelectWord]);

  if (words.length === 0) return null;

  const progressPercent = Math.max(0, Math.min(100, (secondsLeft / durationSeconds) * 100));

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '2rem',
          maxWidth: '560px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '3px solid #1e293b',
        }}
      >
        <span
          style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: '#2563eb',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Your Turn to Draw!
        </span>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0.25rem 0 0.75rem' }}>
          CHOOSE A WORD
        </h2>

        {/* 15-Second Countdown Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem' }}>
            <span>Time to pick</span>
            <span style={{ color: secondsLeft <= 5 ? '#ef4444' : '#2563eb' }}>{secondsLeft}s</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: secondsLeft <= 5 ? '#ef4444' : '#22c55e',
                borderRadius: '9999px',
                transition: 'width 1s linear',
              }}
            />
          </div>
        </div>

        {/* Word Selection Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem' }}>
          {words.map((choice) => (
            <button
              key={choice.word}
              type="button"
              onClick={() => onSelectWord(choice.word)}
              className="skribbl-btn skribbl-btn-green"
              style={{
                padding: '1.25rem 0.85rem',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {choice.word}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.05em',
                }}
              >
                {choice.category}
              </span>
            </button>
          ))}
        </div>

        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '1.25rem', marginBottom: 0 }}>
          💡 Pick quickly! If time runs out, a word will be chosen automatically.
        </p>
      </div>
    </div>
  );
};
