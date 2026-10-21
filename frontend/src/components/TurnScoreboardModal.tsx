import React, { useState, useEffect } from 'react';
import { SkribblAvatar } from './SkribblAvatar';
import { RoundScoreItem } from '../types/game';
import { Sparkles, Clock, CheckCircle2, Pencil, Film } from 'lucide-react';

interface TurnScoreboardModalProps {
  secretWord: string;
  roundScores: RoundScoreItem[];
  durationSeconds?: number;
  isRoundEnd?: boolean;
  currentRound?: number;
  onOpenReplay?: () => void;
}

export const TurnScoreboardModal: React.FC<TurnScoreboardModalProps> = ({
  secretWord,
  roundScores,
  durationSeconds = 4,
  isRoundEnd = false,
  currentRound,
  onOpenReplay,
}) => {
  const [countdown, setCountdown] = useState<number>(durationSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          border: '4px solid #1e293b',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            backgroundColor: '#0284c7',
            padding: '1.25rem 1.5rem',
            textAlign: 'center',
            color: '#ffffff',
            borderBottom: '3px solid #0369a1',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#bae6fd' }}>
            <Sparkles size={16} /> {isRoundEnd ? `Round ${currentRound ? currentRound + ' ' : ''}Concluded` : 'Turn Concluded'}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.25rem' }}>
            The secret word was:
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#fef08a',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              marginTop: '0.15rem',
            }}
          >
            {secretWord}
          </div>
        </div>

        {/* Scoreboard List */}
        <div style={{ padding: '1.25rem 1.5rem', maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '0.25rem' }}>
            <span>Rank & Player</span>
            <span>Turn Score & Total</span>
          </div>

          {roundScores.map((item, idx) => {
            const isWinner = idx === 0;
            const rankIcon = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

            return (
              <div
                key={item.playerId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.9rem',
                  borderRadius: '14px',
                  backgroundColor: isWinner ? '#fefce8' : '#f8fafc',
                  border: isWinner ? '2px solid #eab308' : '1.5px solid #e2e8f0',
                  boxShadow: isWinner ? '0 4px 6px -1px rgba(234, 179, 8, 0.2)' : 'none',
                }}
              >
                {/* Left: Rank, Avatar & Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, minWidth: '24px', textAlign: 'center' }}>
                    {rankIcon}
                  </span>
                  <SkribblAvatar avatarId={item.avatarId} size={36} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {item.playerName}
                      {item.role === 'DRAWER' && (
                        <span title="Drawer" style={{ color: '#eab308', display: 'inline-flex' }}>
                          <Pencil size={14} />
                        </span>
                      )}
                      {item.guessedCorrectly && (
                        <span title="Solved!" style={{ color: '#16a34a', display: 'inline-flex' }}>
                          <CheckCircle2 size={14} />
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      {item.role === 'DRAWER' ? 'Drawer' : item.guessedCorrectly ? 'Guessed' : 'Missed'}
                    </span>
                  </div>
                </div>

                {/* Right: Points Gained & Total Score */}
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: '1rem',
                      color: item.pointsEarned > 0 ? '#16a34a' : '#94a3b8',
                    }}
                  >
                    +{item.pointsEarned} pts
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 700 }}>
                    {item.totalScore} total
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with Next Drawer Countdown & Replay Trigger */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            backgroundColor: '#f1f5f9',
            borderTop: '2px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {onOpenReplay ? (
            <button
              type="button"
              onClick={onOpenReplay}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <Film size={15} /> Watch Replay 🎬
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.88rem', fontWeight: 700 }}>
              <Clock size={16} /> Next turn starting in:
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {onOpenReplay && (
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                Next turn:
              </span>
            )}
            <div
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '1rem',
                padding: '0.2rem 0.75rem',
                borderRadius: '999px',
              }}
            >
              {countdown}s
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
