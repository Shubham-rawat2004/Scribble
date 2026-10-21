import React, { useState } from 'react';
import { SkribblLogo } from '../components/SkribblLogo';
import { SkribblAvatarPicker } from '../components/SkribblAvatarPicker';
import { SkribblAvatar, serializeAvatarConfig } from '../components/SkribblAvatar';
import { Plus, Globe, Sparkles, KeyRound, ArrowRight, Palette } from 'lucide-react';

interface HomeProps {
  initialNickname?: string;
  initialAvatarId?: string;
  invitedRoomCode?: string;
  onQuickPlay: (nickname: string, avatarId: string, roomCode?: string, isSpectator?: boolean) => void;
  onCreateRoom: (nickname: string, avatarId: string) => void;
  onJoinRoom: (nickname: string, avatarId: string, roomCode: string, isSpectator?: boolean) => void;
  onOpenCanvasSandbox: () => void;
  onOpenDiagnostics: () => void;
  isBackendHealthy: boolean;
}

export const Home: React.FC<HomeProps> = ({
  initialNickname = '',
  initialAvatarId = 'skribbl_0_0_0',
  invitedRoomCode = '',
  onQuickPlay,
  onCreateRoom,
  onJoinRoom,
  onOpenCanvasSandbox,
  onOpenDiagnostics,
  isBackendHealthy,
}) => {
  const [nickname, setNickname] = useState<string>(initialNickname);
  const [avatarId, setAvatarId] = useState<string>(initialAvatarId);
  const [language, setLanguage] = useState<string>('English');
  const [manualRoomCode, setManualRoomCode] = useState<string>(invitedRoomCode);
  const [showManualJoin, setShowManualJoin] = useState<boolean>(!invitedRoomCode);
  const [isSpectator, setIsSpectator] = useState<boolean>(false);
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
    setManualRoomCode(extractCode(raw));
  };

  const handleRoomCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cleaned = extractCode(pastedText);
    setManualRoomCode(cleaned);
  };

  const handlePlayClick = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nickname.trim();
    if (!cleanName) {
      setError('Please enter your nickname first!');
      return;
    }
    setError(null);

    const targetCode = invitedRoomCode || manualRoomCode.trim();
    if (targetCode) {
      onJoinRoom(cleanName, avatarId, targetCode, isSpectator);
    } else {
      onQuickPlay(cleanName, avatarId, undefined, isSpectator);
    }
  };

  const handleCreatePrivateRoomClick = () => {
    const cleanName = nickname.trim() || 'Player';
    onCreateRoom(cleanName, avatarId);
  };

  const handleDirectJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nickname.trim();
    if (!cleanName) {
      setError('Please enter your nickname first!');
      return;
    }
    const cleanCode = manualRoomCode.trim();
    if (!cleanCode) {
      setError('Please enter a 6-character room code or paste an invite link.');
      return;
    }
    setError(null);
    onJoinRoom(cleanName, avatarId, cleanCode, isSpectator);
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
        {/* Invited Room Banner (if user came from link ?ROOMCODE) */}
        {invitedRoomCode && (
          <div
            style={{
              background: '#eff6ff',
              border: '2px dashed #3b82f6',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
            }}
          >
            <Sparkles size={20} color="#2563eb" />
            <div style={{ fontSize: '0.92rem', color: '#1e40af' }}>
              You were invited to room <b style={{ letterSpacing: '0.08em', fontSize: '1.05rem', color: '#1d4ed8' }}>{invitedRoomCode}</b>!
            </div>
          </div>
        )}

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

        {/* Join as Spectator Option */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0.65rem 0' }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: isSpectator ? '#6d28d9' : '#475569',
              backgroundColor: isSpectator ? '#f5f3ff' : '#f8fafc',
              border: `1.5px solid ${isSpectator ? '#c4b5fd' : '#e2e8f0'}`,
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              transition: 'all 0.15s ease',
            }}
          >
            <input
              type="checkbox"
              checked={isSpectator}
              onChange={(e) => setIsSpectator(e.target.checked)}
              style={{ width: '15px', height: '15px', accentColor: '#7c3aed', cursor: 'pointer' }}
            />
            <span>Join as Spectator 👁️ (watch & chat only)</span>
          </label>
        </div>

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
            {invitedRoomCode ? `Play in ${invitedRoomCode}!` : manualRoomCode ? `Join ${manualRoomCode}!` : 'Play Online (Random Players)'}
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

          {/* Practice Drawing Canvas Button */}
          <button
            type="button"
            onClick={onOpenCanvasSandbox}
            style={{
              width: '100%',
              padding: '0.75rem 1.25rem',
              fontSize: '0.95rem',
              fontWeight: 800,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              background: '#f8fafc',
              border: '2px solid #cbd5e1',
              color: '#334155',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#eff6ff';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.color = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#334155';
            }}
          >
            <Palette size={18} /> Practice Drawing Canvas (Sandbox)
          </button>
        </div>

        {/* Optional Manual Room Code Drawer */}
        {!invitedRoomCode && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            {!showManualJoin ? (
              <button
                type="button"
                onClick={() => setShowManualJoin(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <KeyRound size={15} /> Join with Room Code / Invite Link
              </button>
            ) : (
              <form onSubmit={handleDirectJoinSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    value={manualRoomCode}
                    onChange={handleRoomCodeChange}
                    onPaste={handleRoomCodePaste}
                    placeholder="Enter code or paste invite URL"
                    maxLength={100}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '0.65rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                  }}
                >
                  Join <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Floating Diagnostics Pill Button at Bottom */}
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <button
          type="button"
          onClick={onOpenDiagnostics}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            borderRadius: '9999px',
            color: '#e2e8f0',
            fontSize: '0.82rem',
            fontWeight: 600,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(15, 23, 42, 0.65)')}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isBackendHealthy ? '#22c55e' : '#ef4444',
              boxShadow: isBackendHealthy ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
              display: 'inline-block',
            }}
          />
          🛠️ Architecture & System Diagnostics
        </button>
      </div>
    </div>
  );
};
