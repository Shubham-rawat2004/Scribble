import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface RoundAnnouncementModalProps {
  roundNumber: number;
  totalRounds: number;
  durationMs?: number;
  onDismiss: () => void;
}

export const RoundAnnouncementModal: React.FC<RoundAnnouncementModalProps> = ({
  roundNumber,
  totalRounds,
  durationMs = 2200,
  onDismiss,
}) => {
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    // Start fade out animation 350ms before dismiss
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(500, durationMs - 350));

    // Fully dismiss after durationMs
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, [durationMs, onDismiss]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 80,
        padding: '1rem',
        pointerEvents: 'none', // Do not block underlying interactions if any
        transition: 'opacity 0.35s ease',
        opacity: isFadingOut ? 0 : 1,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)',
          borderRadius: '28px',
          border: '5px solid #ffffff',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 35px rgba(56, 189, 248, 0.4)',
          padding: '2.25rem 2rem',
          textAlign: 'center',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.6rem',
          transform: isFadingOut ? 'scale(0.92)' : 'scale(1)',
          transition: 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          animation: 'popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {/* Top Tag Banner */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            padding: '0.35rem 1rem',
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#fde047',
            border: '1.5px solid rgba(253, 224, 71, 0.4)',
          }}
        >
          <Sparkles size={16} /> Get Ready!
        </div>

        {/* Main Prominent Round Announcement Title */}
        <h1
          style={{
            fontSize: '3.6rem',
            fontWeight: 900,
            margin: '0.3rem 0 0 0',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#fef08a',
            textShadow: '0 4px 10px rgba(0, 0, 0, 0.4)',
            lineHeight: 1.1,
            fontFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif",
          }}
        >
          Round {roundNumber}
        </h1>

        {/* Subtitle with total rounds */}
        <div
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: '#e0f2fe',
            letterSpacing: '0.02em',
          }}
        >
          Round {roundNumber} of {totalRounds}
        </div>
      </div>
    </div>
  );
};
