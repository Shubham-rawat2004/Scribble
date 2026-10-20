import React from 'react';

export const DoodleBackground: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
        backgroundColor: '#0a3d8f',
        backgroundImage: `radial-gradient(circle at 50% 30%, #1552b5 0%, #083378 100%)`,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* SVG Doodle Pattern Overlay */}
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0.12 }}
      >
        <defs>
          <pattern id="skribblDoodles" width="220" height="220" patternUnits="userSpaceOnUse">
            {/* Pencil */}
            <path
              d="M 30 30 L 50 10 L 60 20 L 40 40 L 25 45 Z"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Palette */}
            <circle cx="160" cy="40" r="22" fill="none" stroke="#ffffff" strokeWidth="2.5" />
            <circle cx="152" cy="35" r="3" fill="#ffffff" />
            <circle cx="168" cy="35" r="3" fill="#ffffff" />
            <circle cx="160" cy="48" r="3" fill="#ffffff" />
            {/* Swirl */}
            <path
              d="M 120 130 Q 140 110 160 130 T 170 150"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Lightbulb */}
            <circle cx="45" cy="150" r="14" fill="none" stroke="#ffffff" strokeWidth="2.5" />
            <line x1="39" y1="166" x2="51" y2="166" stroke="#ffffff" strokeWidth="2.5" />
            <line x1="41" y1="171" x2="49" y2="171" stroke="#ffffff" strokeWidth="2" />
            {/* Star */}
            <polygon
              points="100,50 104,62 116,62 106,70 110,82 100,74 90,82 94,70 84,62 96,62"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
            />
            {/* Smiley Face */}
            <circle cx="170" cy="180" r="16" fill="none" stroke="#ffffff" strokeWidth="2" />
            <circle cx="164" cy="176" r="2" fill="#ffffff" />
            <circle cx="176" cy="176" r="2" fill="#ffffff" />
            <path d="M 164 184 Q 170 190 176 184" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            {/* Question Mark */}
            <path
              d="M 80 140 Q 85 130 95 135 Q 105 140 95 150 L 95 156"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="95" cy="164" r="2" fill="#ffffff" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#skribblDoodles)" />
      </svg>
    </div>
  );
};
