import React, { useState } from 'react';
import { socket } from '../services/socket';
import { JoinRoomPayload, JoinRoomResponse, RoomDTO, PlayerDTO, GameSessionDTO } from '../types/game';
import { SkribblAvatarPicker } from '../components/SkribblAvatarPicker';
import { ArrowLeft, LogIn, KeyRound } from 'lucide-react';

interface JoinRoomProps {
  initialRoomCode?: string;
  initialNickname?: string;
  initialAvatarId?: string;
  onRoomJoined: (room: RoomDTO, player: PlayerDTO, session?: GameSessionDTO) => void;
  onBack: () => void;
}

export const JoinRoom: React.FC<JoinRoomProps> = ({
  initialRoomCode = '',
  initialNickname = '',
  initialAvatarId = 'skribbl_0_0_0',
  onRoomJoined,
  onBack,
}) => {
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode.toUpperCase());
  const [nickname, setNickname] = useState<string>(initialNickname);
  const [avatarId, setAvatarId] = useState<string>(initialAvatarId);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to extract clean 6-character room code from raw string or full URL
  const extractCode = (input: string): string => {
    const trimmed = input.trim();
    // 1. Authentic Skribbl URL: ?ROOMCODE (e.g. ?SALNXJ or https://skribbl.io/?f1CF68YI)
    const authenticMatch = trimmed.match(/\?([A-Za-z0-9]{6,8})(?:$|[&#])/);
    if (authenticMatch) {
      return authenticMatch[1].toUpperCase();
    }
    // 2. Named query parameter: ?join=CODE or ?room=CODE
    const namedQueryMatch = trimmed.match(/[?&](?:join|room)=([A-Za-z0-9]{6,8})/i);
    if (namedQueryMatch) {
      return namedQueryMatch[1].toUpperCase();
    }
    // 3. Path parameter: /join/CODE
    const pathMatch = trimmed.match(/\/join\/([A-Za-z0-9]{6,8})/i);
    if (pathMatch) {
      return pathMatch[1].toUpperCase();
    }
    // 4. Raw code: e.g. "SALNXJ"
    const rawMatch = trimmed.match(/^[A-Za-z0-9]{6,8}$/);
    if (rawMatch) {
      return rawMatch[0].toUpperCase();
    }
    return trimmed.toUpperCase();
  };

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRoomCode(extractCode(raw));
  };

  const handleRoomCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cleaned = extractCode(pastedText);
    setRoomCode(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = extractCode(roomCode);
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
        onRoomJoined(response.room, response.player, response.session);
      } else {
        setError(response.error || 'Failed to join room.');
      }
    });
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '2rem 1.75rem',
        maxWidth: '520px',
        margin: '2rem auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        border: '3px solid #1e293b',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-outline"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a' }}>Join Game</h2>
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
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Room Code with Smart Paste */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
            Room Code / Invite URL
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
              onChange={handleRoomCodeChange}
              onPaste={handleRoomCodePaste}
              placeholder="e.g. SALNXJ or paste link"
              maxLength={100}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                borderRadius: '8px',
                border: '2px solid #cbd5e1',
                fontSize: '1.1rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                outline: 'none',
              }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
            💡 You can paste a full invite URL (e.g. <code>http://localhost:5173/?SALNXJ</code>) and we'll extract the code!
          </span>
        </div>

        {/* Nickname */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
            Your Nickname
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. SuperGuesser"
            maxLength={30}
            required
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: '2px solid #cbd5e1',
              fontSize: '1rem',
              fontWeight: 600,
              outline: 'none',
            }}
          />
        </div>

        {/* Skribbl Avatar Picker */}
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
            Customize Avatar
          </label>
          <SkribblAvatarPicker selectedAvatarId={avatarId} onSelect={setAvatarId} size={90} />
        </div>

        <button
          type="submit"
          className="skribbl-btn skribbl-btn-green"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.9rem',
            fontSize: '1.15rem',
            fontWeight: 800,
            borderRadius: '12px',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {loading ? 'Joining Room...' : (
            <>
              <LogIn size={20} /> Join Room
            </>
          )}
        </button>
      </form>
    </div>
  );
};
