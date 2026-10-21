import React, { useState, useEffect } from 'react';

export interface WordChoice {
  word: string;
  category?: string;
  difficulty?: string;
}

interface WordPickerOverlayProps {
  words: WordChoice[];
  durationSeconds?: number;
  onSelectWord: (word: string) => void;
}

export const WordPickerOverlay: React.FC<WordPickerOverlayProps> = ({
  words,
  durationSeconds = 15,
  onSelectWord,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(durationSeconds);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

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

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#2c3545',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.75rem',
        animation: 'fadeIn 0.15s ease',
        userSelect: 'none',
      }}
    >
      {/* Title matching Screenshot 1443 */}
      <h2
        style={{
          color: '#ffffff',
          fontSize: '2.4rem',
          fontWeight: 800,
          margin: 0,
          letterSpacing: '0.03em',
          fontFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif",
          textShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}
      >
        Choose a word
      </h2>

      {/* Horizontal Word Buttons matching Screenshot 1443 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
          padding: '0 1rem',
          maxWidth: '90%',
        }}
      >
        {words.map((choice) => {
          const isHovered = hoveredWord === choice.word;

          return (
            <button
              key={choice.word}
              type="button"
              onClick={() => onSelectWord(choice.word)}
              onMouseEnter={() => setHoveredWord(choice.word)}
              onMouseLeave={() => setHoveredWord(null)}
              style={{
                backgroundColor: isHovered ? '#ffffff' : '#2c3545',
                color: isHovered ? '#1e293b' : '#ffffff',
                border: '3px solid #ffffff',
                borderRadius: '4px',
                padding: '0.75rem 2rem',
                fontSize: '1.65rem',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'background-color 0.1s ease, color 0.1s ease, transform 0.08s ease',
                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                boxShadow: isHovered
                  ? '0 6px 16px rgba(0,0,0,0.4)'
                  : '0 2px 6px rgba(0,0,0,0.25)',
                letterSpacing: '0.02em',
                fontFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif",
              }}
            >
              {choice.word.toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* Small countdown status in footer */}
      <div style={{ color: '#94a3b8', fontSize: '0.88rem', fontWeight: 700 }}>
        Auto-selecting in <span style={{ color: '#fde047', fontWeight: 900 }}>{secondsLeft}s</span>
      </div>
    </div>
  );
};
