import React, { useState } from 'react';
import { socket } from '../services/socket';
import { JoinRoomPayload, JoinRoomResponse, RoomDTO, PlayerDTO } from '../types/game';
import { AvatarPicker, AVATARS } from '../components/AvatarPicker';
import { ArrowLeft, LogIn, KeyRound } from 'lucide-react';

interface JoinRoomProps {
  initialRoomCode?: string;
  onRoomJoined: (room: RoomDTO, player: PlayerDTO) => void;
  onBack: () => void;
}

export const JoinRoom: React.FC<JoinRoomProps> = ({ initialRoomCode = '', onRoomJoined, onBack }) => {
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode.toUpperCase());
  const [nickname, setNickname] = useState<string>('');
  const [avatarId, setAvatarId] = useState<string>('avatar_2');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanName = nickname.trim();

    if (!cleanCode) {
      setError('Please enter a 6-character room code.');
      return;
    }
    if (!cleanName) {
      setError('Please enter your nickname.');
      return;
    }
    if (cleanName.length > 30) {
      setError('Nickname must be 30 characters or less.');
      return;
    }

    setError(null);
    setLoading(true);

    const payload: JoinRoomPayload = {
      roomId: cleanCode,
      playerName: cleanName,
      avatarId,
    };

    socket.emit('join_room', payload, (response: JoinRoomResponse) => {
      setLoading(false);
      if (response.success && response.room && response.player) {
        onRoomJoined(response.room, response.player);
      } else {
        setError(response.error || 'Failed to join room.');
      }
    });
  };

  const selectedAvatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0];

  return (
    <div className="card" style={{ maxWidth: '540px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-outline"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a' }}>Join a Game</h2>
        <div style={{ width: '60px' }}></div>
      </div>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Room Code */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
            Room Code
          </label>
          <div style={{ position: 'relative' }}>
            <KeyRound
              size={18}
              color="#94a3b8"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. SALNXJ"
              maxLength={8}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '1.1rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Nickname */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
            Your Nickname
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '1.8rem',
                background: selectedAvatar.bg,
                padding: '0.3rem 0.6rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
              }}
            >
              {selectedAvatar.emoji}
            </span>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. SuperGuesser"
              maxLength={30}
              required
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Avatar Picker */}
        <AvatarPicker selectedAvatarId={avatarId} onSelect={setAvatarId} />

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%', padding: '0.85rem', fontSize: '1.05rem', marginTop: '0.5rem' }}
        >
          {loading ? 'Joining Room...' : (
            <>
              <LogIn size={18} /> Join Room
            </>
          )}
        </button>
      </form>
    </div>
  );
};
