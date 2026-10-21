import React from 'react';

interface SkribblAlarmClockProps {
  timeRemaining: number;
  size?: number;
}

export const SkribblAlarmClock: React.FC<SkribblAlarmClockProps> = ({
  timeRemaining,
  size = 48,
}) => {
  const isUrgent = timeRemaining <= 10;

  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        userSelect: 'none',
        animation: isUrgent ? 'pulse 0.8s infinite' : 'none',
      }}
      title={`${timeRemaining}s remaining`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left and Right Top Bells */}
        <path
          d="M9 13C9 8 15 5 18 8L15 14"
          stroke="#1e293b"
          strokeWidth="3"
          strokeLinecap="round"
          fill="#cbd5e1"
        />
        <path
          d="M39 13C39 8 33 5 30 8L33 14"
          stroke="#1e293b"
          strokeWidth="3"
          strokeLinecap="round"
          fill="#cbd5e1"
        />

        {/* Top Hammer / Button */}
        <path
          d="M21 7H27V11H21V7Z"
          fill="#64748b"
          stroke="#1e293b"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Bottom Legs */}
        <path
          d="M12 40L8 45"
          stroke="#1e293b"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M36 40L40 45"
          stroke="#1e293b"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Clock Body Circle */}
        <circle
          cx="24"
          cy="26"
          r="16"
          fill="#ffffff"
          stroke="#1e293b"
          strokeWidth="3.5"
        />
      </svg>

      {/* Timer Digits Centered inside Clock Face */}
      <span
        style={{
          position: 'absolute',
          top: '56%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontWeight: 900,
          fontSize: timeRemaining >= 100 ? '0.85rem' : '1.15rem',
          color: isUrgent ? '#ef4444' : '#0f172a',
          fontFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif",
          letterSpacing: '-0.03em',
        }}
      >
        {timeRemaining}
      </span>
    </div>
  );
};
