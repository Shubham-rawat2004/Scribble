import React, { useState } from 'react';
import { socket } from '../services/socket';
import { CreateRoomPayload, CreateRoomResponse, RoomDTO, PlayerDTO, RoomSettings } from '../types/game';
import { SkribblAvatarPicker } from '../components/SkribblAvatarPicker';
import { Users, Clock, Hash, HelpCircle, Lock, Play, ArrowLeft } from 'lucide-react';

interface CreateRoomProps {
  initialNickname?: string;
  initialAvatarId?: string;
  onRoomCreated: (room: RoomDTO, host: PlayerDTO) => void;
  onBack: () => void;
}

export const CreateRoom: React.FC<CreateRoomProps> = ({
  initialNickname = '',
  initialAvatarId = 'skribbl_0_0_0',
  onRoomCreated,
  onBack,
}) => {
  const [nickname, setNickname] = useState<string>(initialNickname);
  const [avatarId, setAvatarId] = useState<string>(initialAvatarId);
  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [totalRounds, setTotalRounds] = useState<number>(3);
  const [drawTimeSeconds, setDrawTimeSeconds] = useState<number>(80);
  const [wordOptionsCount, setWordOptionsCount] = useState<number>(3);
  const [hintsAllowed, setHintsAllowed] = useState<number>(2);
  const [isPrivate, setIsPrivate] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: 'quick' | 'standard' | 'party') => {
    if (preset === 'quick') {
      setMaxPlayers(4);
      setTotalRounds(2);
      setDrawTimeSeconds(60);
      setWordOptionsCount(3);
      setHintsAllowed(1);
    } else if (preset === 'standard') {
      setMaxPlayers(8);
      setTotalRounds(3);
      setDrawTimeSeconds(80);
      setWordOptionsCount(3);
      setHintsAllowed(2);
    } else if (preset === 'party') {
      setMaxPlayers(12);
      setTotalRounds(5);
      setDrawTimeSeconds(90);
      setWordOptionsCount(4);
      setHintsAllowed(3);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('Please enter a nickname.');
      return;
    }
    if (trimmed.length > 30) {
      setError('Nickname must be 30 characters or less.');
      return;
    }

    setError(null);
    setLoading(true);

    const settings: RoomSettings = {
      maxPlayers,
      totalRounds,
      drawTimeSeconds,
      wordOptionsCount,
      hintsAllowed,
      isPrivate,
    };

    const payload: CreateRoomPayload = {
      hostName: trimmed,
      avatarId,
      settings,
    };

    socket.emit('create_room', payload, (response: CreateRoomResponse) => {
      setLoading(false);
      if (response.success && response.room && response.player) {
        onRoomCreated(response.room, response.player);
      } else {
        setError(response.error || 'Failed to create room.');
      }
    });
  };

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '2rem 1.75rem',
        maxWidth: '620px',
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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a' }}>Create Private Room</h2>
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

      {/* Quick Presets */}
      <div style={{ marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
          Quick Match Presets
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => applyPreset('quick')}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            ⚡ Quick (4p, 2r, 60s)
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => applyPreset('standard')}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            🎯 Standard (8p, 3r, 80s)
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => applyPreset('party')}
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            🎉 Party (12p, 5r, 90s)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Nickname Input */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
            Your Host Nickname
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. MasterDrawer"
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

        {/* Avatar Picker Component */}
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
            Host Avatar
          </label>
          <SkribblAvatarPicker selectedAvatarId={avatarId} onSelect={setAvatarId} size={90} />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1.25rem 0' }} />

        {/* Room Settings Sliders */}
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>
          Custom Room Rules
        </h3>

        {/* 1. Max Players */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={15} /> Maximum Players
            </label>
            <span style={{ fontWeight: 700, color: '#2563eb' }}>{maxPlayers} Players</span>
          </div>
          <input
            type="range"
            min={2}
            max={20}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#2563eb' }}
          />
        </div>

        {/* 2. Total Rounds */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Hash size={15} /> Total Rounds
            </label>
            <span style={{ fontWeight: 700, color: '#2563eb' }}>{totalRounds} Rounds</span>
          </div>
          <input
            type="range"
            min={2}
            max={10}
            value={totalRounds}
            onChange={(e) => setTotalRounds(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#2563eb' }}
          />
        </div>

        {/* 3. Draw Time Seconds */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={15} /> Draw Time (Seconds)
            </label>
            <span style={{ fontWeight: 700, color: '#2563eb' }}>{drawTimeSeconds} seconds</span>
          </div>
          <input
            type="range"
            min={15}
            max={240}
            step={5}
            value={drawTimeSeconds}
            onChange={(e) => setDrawTimeSeconds(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#2563eb' }}
          />
        </div>

        {/* 4. Word Options */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <HelpCircle size={15} /> Word Choices for Drawer
            </label>
            <span style={{ fontWeight: 700, color: '#2563eb' }}>{wordOptionsCount} Choices</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={wordOptionsCount}
            onChange={(e) => setWordOptionsCount(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#2563eb' }}
          />
        </div>

        {/* 5. Hints Allowed */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <HelpCircle size={15} /> Hints Revealed Over Time
            </label>
            <span style={{ fontWeight: 700, color: '#2563eb' }}>{hintsAllowed} Hints</span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            value={hintsAllowed}
            onChange={(e) => setHintsAllowed(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#2563eb' }}
          />
        </div>

        {/* 6. Private Room Toggle */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            id="privateRoom"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
          />
          <label htmlFor="privateRoom" style={{ fontSize: '0.9rem', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Lock size={15} /> Private Room (Invite-only via direct link / code)
          </label>
        </div>

        {/* Submit Button */}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
          }}
        >
          {loading ? 'Creating Room...' : (
            <>
              <Play size={20} fill="currentColor" /> Create Room & Enter Lobby
            </>
          )}
        </button>
      </form>
    </div>
  );
};
