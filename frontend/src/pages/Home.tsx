import React, { useState } from 'react';
import { SkribblLogo } from '../components/SkribblLogo';
import { SkribblAvatarPicker } from '../components/SkribblAvatarPicker';
import { SkribblAvatar, serializeAvatarConfig } from '../components/SkribblAvatar';
import { Plus, Globe } from 'lucide-react';

interface HomeProps {
  initialNickname?: string;
  initialAvatarId?: string;
  invitedRoomCode?: string;
  onQuickPlay: (nickname: string, avatarId: string, roomCode?: string) => void;
  onCreateRoom: (nickname: string, avatarId: string) => void;
  onJoinRoom: (nickname: string, avatarId: string, roomCode: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  initialNickname = '',
  initialAvatarId = 'skribbl_0_0_0',
  invitedRoomCode = '',
  onQuickPlay,
  onCreateRoom,
  onJoinRoom,
}) => {
  const [nickname, setNickname] = useState<string>(initialNickname);
  const [avatarId, setAvatarId] = useState<string>(initialAvatarId);
  const [language, setLanguage] = useState<string>('English');
  const [error, setError] = useState<string | null>(null);

  const handlePlayClick = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nickname.trim();
    if (!cleanName) {
      setError('Please enter your nickname first!');
      return;
    }
    setError(null);

    if (invitedRoomCode) {
      onJoinRoom(cleanName, avatarId, invitedRoomCode);
    } else {
      onQuickPlay(cleanName, avatarId);
    }
  };

  const handleCreatePrivateRoomClick = () => {
    const cleanName = nickname.trim() || 'Player';
    onCreateRoom(cleanName, avatarId);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '85vh',
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        padding: '1rem',
      }}
    >
      {/* Decorative avatar peeking banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '-12px',
          zIndex: 1,
          opacity: 0.95,
        }}
      >
        <SkribblAvatar avatarId={serializeAvatarConfig({ colorIndex: 1, eyesIndex: 1, mouthIndex: 1 })} size={42} />
        <SkribblAvatar avatarId={serializeAvatarConfig({ colorIndex: 3, eyesIndex: 4, mouthIndex: 2 })} size={46} />
        <SkribblAvatar avatarId={serializeAvatarConfig({ colorIndex: 0, eyesIndex: 2, mouthIndex: 0 })} size={52} />
        <SkribblAvatar avatarId={serializeAvatarConfig({ colorIndex: 4, eyesIndex: 3, mouthIndex: 3 })} size={46} />
        <SkribblAvatar avatarId={serializeAvatarConfig({ colorIndex: 2, eyesIndex: 7, mouthIndex: 4 })} size={42} />
      </div>

      {/* Skribbl Bubbly Logo */}
      <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
        <SkribblLogo size="lg" />
      </div>

      {/* Main Game Center Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '2rem 1.75rem',
          width: '100%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          border: '3px solid #1e293b',
          position: 'relative',
        }}
      >
        {/* Validation Error Message */}
        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #f87171',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* Name Input */}
        <div style={{ marginBottom: '1.25rem' }}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Enter your name"
            maxLength={25}
            autoFocus
            style={{
              width: '100%',
              padding: '0.9rem 1.25rem',
              borderRadius: '12px',
              border: '2.5px solid #cbd5e1',
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#0f172a',
              outline: 'none',
              textAlign: 'center',
              background: '#f8fafc',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </div>

        {/* Language Selector */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.85rem',
              background: '#f1f5f9',
              borderRadius: '9999px',
              border: '1px solid #e2e8f0',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            <Globe size={15} color="#64748b" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="English">English</option>
              <option value="Spanish">Español</option>
              <option value="German">Deutsch</option>
              <option value="French">Français</option>
            </select>
          </div>
        </div>

        {/* Skribbl Avatar Picker (< [Avatar] > + 🎲) */}
        <SkribblAvatarPicker selectedAvatarId={avatarId} onSelect={setAvatarId} size={110} />

        {/* Big Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
          {/* Big Green Play Button */}
          <button
            type="button"
            onClick={handlePlayClick}
            className="skribbl-btn skribbl-btn-green"
            style={{
              width: '100%',
              padding: '0.95rem 1.5rem',
              fontSize: '1.25rem',
              fontWeight: 900,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <Globe size={22} />
            {invitedRoomCode ? 'Play!' : 'Play Online (Random Players)'}
          </button>

          {/* Blue Create Private Room Button */}
          <button
            type="button"
            onClick={handleCreatePrivateRoomClick}
            className="skribbl-btn skribbl-btn-blue"
            style={{
              width: '100%',
              padding: '0.85rem 1.25rem',
              fontSize: '1.05rem',
              fontWeight: 800,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={20} strokeWidth={3} />
            Create Private Room (Friends)
          </button>
        </div>
      </div>
    </div>
  );
};
