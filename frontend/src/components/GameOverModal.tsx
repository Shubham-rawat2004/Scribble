import React from 'react';
import { PlayerDTO, GameOverPayload } from '../types/game';
import { SkribblAvatar } from './SkribblAvatar';
import { Trophy, RotateCcw, LogOut, Sparkles, Crown } from 'lucide-react';

interface GameOverModalProps {
  gameOverData: GameOverPayload;
  currentPlayer: PlayerDTO;
  onReturnToLobby: () => void;
  onLeave: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameOverData,
  currentPlayer,
  onReturnToLobby,
  onLeave,
}) => {
  const { winner, podium, leaderboard, totalRoundsPlayed, message, winnerByDefault } = gameOverData;
  const isHost = currentPlayer.isHost || Boolean(winner && winner.id === currentPlayer.id);

  const firstPlace = podium[0] || null;
  const secondPlace = podium[1] || null;
  const thirdPlace = podium[2] || null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          border: '4px solid #1e293b',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {/* Victory Header Banner */}
        <div
          style={{
            backgroundColor: '#1e3a8a',
            padding: '1.5rem',
            textAlign: 'center',
            color: '#ffffff',
            borderBottom: '4px solid #1e40af',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: winnerByDefault ? '#fde047' : '#93c5fd' }}>
            <Sparkles size={18} /> {winnerByDefault ? 'Match Terminated Early' : `Match Complete (${totalRoundsPlayed} Rounds)`}
          </div>
          <h1
            style={{
              fontSize: '2.4rem',
              fontWeight: 900,
              margin: '0.35rem 0 0 0',
              color: '#fef08a',
              textShadow: '0 3px 6px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
            }}
          >
            <Trophy size={38} color="#eab308" /> {winnerByDefault ? 'WINNER BY DEFAULT!' : 'VICTORY PODIUM!'}
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.95rem', color: '#e0f2fe', fontWeight: 600 }}>
            Winner: <b style={{ color: '#ffffff' }}>{winner?.name || 'Player'}</b> with <b>{winner?.score || 0} pts</b>!
          </p>
        </div>

        {/* Default Winner Notice matching Requirement 4 */}
        {message && (
          <div
            style={{
              backgroundColor: '#fef3c7',
              borderBottom: '2px solid #fcd34d',
              padding: '0.85rem 1.25rem',
              textAlign: 'center',
              color: '#92400e',
              fontWeight: 800,
              fontSize: '1.05rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>🏆</span>
            <span>{message}</span>
          </div>
        )}

        {/* 3-Tier Olympic Podium */}
        <div
          style={{
            padding: '1.5rem 1.5rem 0 1.5rem',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '0.75rem',
            minHeight: '260px',
            borderBottom: '2px solid #e2e8f0',
          }}
        >
          {/* 2nd Place (Silver - Left) */}
          {secondPlace && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '130px' }}>
              <div style={{ position: 'relative', marginBottom: '0.5rem', textAlign: 'center' }}>
                <SkribblAvatar avatarId={secondPlace.avatarId} size={50} />
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginTop: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                  {secondPlace.name}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                  {secondPlace.score} pts
                </div>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '110px',
                  backgroundColor: '#cbd5e1',
                  borderTopLeftRadius: '14px',
                  borderTopRightRadius: '14px',
                  border: '3px solid #94a3b8',
                  borderBottom: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#475569',
                  boxShadow: 'inset 0 4px 6px rgba(255,255,255,0.6)',
                }}
              >
                <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>2</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em' }}>SILVER</span>
              </div>
            </div>
          )}

          {/* 1st Place (Gold - Center) */}
          {firstPlace && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '150px' }}>
              <div style={{ position: 'relative', marginBottom: '0.5rem', textAlign: 'center' }}>
                <div style={{ color: '#eab308', display: 'flex', justifyContent: 'center', marginBottom: '-6px' }}>
                  <Crown size={28} />
                </div>
                <SkribblAvatar avatarId={firstPlace.avatarId} size={64} />
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#1e3a8a', marginTop: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                  {firstPlace.name}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#16a34a' }}>
                  {firstPlace.score} pts
                </div>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '155px',
                  backgroundColor: '#fde047',
                  borderTopLeftRadius: '18px',
                  borderTopRightRadius: '18px',
                  border: '4px solid #ca8a04',
                  borderBottom: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#854d0e',
                  boxShadow: 'inset 0 4px 6px rgba(255,255,255,0.8), 0 -4px 12px rgba(234, 179, 8, 0.3)',
                }}
              >
                <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>1</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '0.08em' }}>WINNER</span>
              </div>
            </div>
          )}

          {/* 3rd Place (Bronze - Right) */}
          {thirdPlace && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '130px' }}>
              <div style={{ position: 'relative', marginBottom: '0.5rem', textAlign: 'center' }}>
                <SkribblAvatar avatarId={thirdPlace.avatarId} size={46} />
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginTop: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                  {thirdPlace.name}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                  {thirdPlace.score} pts
                </div>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '80px',
                  backgroundColor: '#fed7aa',
                  borderTopLeftRadius: '14px',
                  borderTopRightRadius: '14px',
                  border: '3px solid #f97316',
                  borderBottom: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#9a3412',
                  boxShadow: 'inset 0 4px 6px rgba(255,255,255,0.6)',
                }}
              >
                <span style={{ fontSize: '1.6rem', fontWeight: 900 }}>3</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em' }}>BRONZE</span>
              </div>
            </div>
          )}
        </div>

        {/* Complete Final Leaderboard List */}
        <div style={{ padding: '1rem 1.5rem', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Full Leaderboard
          </div>
          {leaderboard.map((p, idx) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0.75rem',
                borderRadius: '10px',
                backgroundColor: p.id === currentPlayer.id ? '#eff6ff' : '#ffffff',
                border: p.id === currentPlayer.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', width: '22px', textAlign: 'center' }}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </span>
                <SkribblAvatar avatarId={p.avatarId} size={28} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                  {p.name} {p.id === currentPlayer.id && '(You)'}
                </span>
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#16a34a' }}>
                {p.score} pts
              </span>
            </div>
          ))}
        </div>

        {/* Action Buttons Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#f1f5f9',
            borderTop: '2px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onLeave}
            className="btn btn-outline"
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#dc2626',
              borderColor: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <LogOut size={16} /> Main Menu
          </button>

          {isHost ? (
            <button
              type="button"
              onClick={onReturnToLobby}
              className="btn btn-primary"
              style={{
                padding: '0.55rem 1.25rem',
                fontSize: '0.95rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#16a34a',
                borderColor: '#15803d',
              }}
            >
              <RotateCcw size={18} /> Play Again (Return to Lobby)
            </button>
          ) : (
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', fontWeight: 600 }}>
              Waiting for host to start a new match...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
