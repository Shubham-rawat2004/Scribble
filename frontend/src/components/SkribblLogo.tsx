import React from 'react';
import { Pencil } from 'lucide-react';

export const SkribblLogo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'lg' }) => {
  const isLarge = size === 'lg';
  const isMedium = size === 'md';

  const letterStyle: React.CSSProperties = {
    display: 'inline-block',
    fontFamily: '"Fredoka", "Arial Rounded MT Bold", -apple-system, sans-serif',
    fontWeight: 900,
    fontSize: isLarge ? '3.75rem' : isMedium ? '2.5rem' : '1.8rem',
    lineHeight: 1,
    filter: 'drop-shadow(0 4px 0 #0f172a) drop-shadow(0 6px 8px rgba(0,0,0,0.3))',
    WebkitTextStroke: isLarge ? '3.5px #0f172a' : '2.5px #0f172a',
    letterSpacing: '-0.02em',
    transition: 'transform 0.15s ease',
    userSelect: 'none',
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'default',
        padding: '0.5rem 1rem',
      }}
    >
      <span style={{ ...letterStyle, color: '#ef4444' }}>s</span>
      <span style={{ ...letterStyle, color: '#22c55e', position: 'relative' }}>
        k
        {/* Tilted cute pencil icon decorating the 'k' */}
        <span
          style={{
            position: 'absolute',
            top: isLarge ? '-12px' : '-8px',
            right: isLarge ? '-10px' : '-6px',
            transform: 'rotate(-45deg)',
            display: 'inline-flex',
            color: '#fbbf24',
            filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
          }}
        >
          <Pencil size={isLarge ? 28 : isMedium ? 20 : 16} strokeWidth={2.5} />
        </span>
      </span>
      <span style={{ ...letterStyle, color: '#3b82f6' }}>r</span>
      <span style={{ ...letterStyle, color: '#a855f7' }}>i</span>
      <span style={{ ...letterStyle, color: '#f97316' }}>b</span>
      <span style={{ ...letterStyle, color: '#eab308' }}>b</span>
      <span style={{ ...letterStyle, color: '#14b8a6' }}>l</span>
      <span
        style={{
          ...letterStyle,
          color: '#ffffff',
          fontSize: isLarge ? '2.6rem' : isMedium ? '1.8rem' : '1.3rem',
          marginLeft: '2px',
        }}
      >
        .io
      </span>
    </div>
  );
};
