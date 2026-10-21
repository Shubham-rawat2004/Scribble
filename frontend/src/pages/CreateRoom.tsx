import React, { useState } from 'react';
import { socket } from '../services/socket';
import { CreateRoomPayload, CreateRoomResponse, RoomDTO, PlayerDTO, RoomSettings } from '../types/game';
import { SkribblAvatarPicker } from '../components/SkribblAvatarPicker';
import {
  User,
  BookOpen,
  Clock,
  RotateCw,
  Gamepad2,
  Layers,
  HelpCircle,
  ArrowLeft,
  Play,
  Lock,
} from 'lucide-react';

interface CreateRoomProps {
  initialNickname?: string;
  initialAvatarId?: string;
  onRoomCreated: (room: RoomDTO, host: PlayerDTO) => void;
  onBack: () => void;
}

const PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const LANGUAGE_OPTIONS = ['English', 'German', 'Spanish', 'French', 'Italian', 'Portuguese', 'Russian'];
const DRAWTIME_OPTIONS = [30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 180, 210, 240];
const ROUND_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const GAME_MODE_OPTIONS = ['Normal', 'Hidden', 'Combination'];
const WORD_COUNT_OPTIONS = [1, 2, 3, 4, 5];
const HINT_OPTIONS = [0, 1, 2, 3, 4, 5];

export const CreateRoom: React.FC<CreateRoomProps> = ({
  initialNickname = '',
  initialAvatarId = 'skribbl_0_0_0',
  onRoomCreated,
  onBack,
}) => {
  const [nickname, setNickname] = useState<string>(initialNickname);
  const [avatarId, setAvatarId] = useState<string>(initialAvatarId);
  const [maxPlayers, setMaxPlayers] = useState<number>(8);
  const [language, setLanguage] = useState<string>('English');
  const [drawTimeSeconds, setDrawTimeSeconds] = useState<number>(80);
  const [totalRounds, setTotalRounds] = useState<number>(3);
  const [gameMode, setGameMode] = useState<string>('Normal');
  const [wordOptionsCount, setWordOptionsCount] = useState<number>(3);
  const [hintsAllowed, setHintsAllowed] = useState<number>(2);
  const [customWordsText, setCustomWordsText] = useState<string>('');
  const [customWordsOnly, setCustomWordsOnly] = useState<boolean>(false);
  const [isPrivate, setIsPrivate] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

    const parsedCustomWords = customWordsText
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 2);

    const settings: RoomSettings = {
      maxPlayers,
      totalRounds,
      drawTimeSeconds,
      wordOptionsCount,
      hintsAllowed,
      isPrivate,
      customWords: parsedCustomWords.length > 0 ? parsedCustomWords : undefined,
      customWordsOnly,
      language,
      gameMode,
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
    <div style={{ maxWidth: '640px', margin: '1.5rem auto' }}>
      {/* Top Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-outline"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', background: '#ffffff' }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#1e3a8a', letterSpacing: '-0.02em' }}>
          Create Custom Room
        </h2>
        <div style={{ width: '70px' }}></div>
      </div>

      {error && (
        <div
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            textAlign: 'center',
            border: '1.5px solid #fca5a5',
          }}
        >
          {error}
        </div>
      )}

      {/* Host Profile Header Card */}
      <div
        className="card"
        style={{
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.85rem',
          padding: '1.25rem',
        }}
      >
        <SkribblAvatarPicker selectedAvatarId={avatarId} onSelect={setAvatarId} size={84} />
        <div style={{ width: '100%', maxWidth: '340px' }}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Choose your host nickname..."
            maxLength={30}
            required
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              border: '2px solid #cbd5e1',
              fontSize: '1rem',
              fontWeight: 700,
              textAlign: 'center',
              outline: 'none',
              color: '#0f172a',
            }}
          />
        </div>
      </div>

      {/* Authentic Skribbl.io Dark Settings Card (Screenshot 2026-10-21 132343.png) */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            background: '#2b3345',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            border: '2px solid #1e2538',
            marginBottom: '1.25rem',
          }}
        >
          {/* Row 1: Players */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '170px 1fr',
              alignItems: 'center',
              marginBottom: '0.75rem',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
              <User size={22} color="#ffffff" strokeWidth={2.3} />
              <span>Players</span>
            </div>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.95rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {PLAYER_OPTIONS.map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: Language */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '170px 1fr',
              alignItems: 'center',
              marginBottom: '0.75rem',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
              <BookOpen size={22} color="#ffffff" strokeWidth={2.3} />
              <span>Language</span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.95rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Row 3: Drawtime */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '170px 1fr',
              alignItems: 'center',
              marginBottom: '0.75rem',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
              <Clock size={22} color="#ffffff" strokeWidth={2.3} />
              <span>Drawtime</span>
            </div>
            <select
              value={drawTimeSeconds}
              onChange={(e) => setDrawTimeSeconds(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.95rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {DRAWTIME_OPTIONS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Row 4: Rounds */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '170px 1fr',
              alignItems: 'center',
              marginBottom: '0.75rem',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
              <RotateCw size={22} color="#ffffff" strokeWidth={2.3} />
              <span>Rounds</span>
            </div>
            <select
              value={totalRounds}
              onChange={(e) => setTotalRounds(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.95rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {ROUND_OPTIONS.map((rnd) => (
                <option key={rnd} value={rnd}>
                  {rnd}
                </option>
              ))}
            </select>
          </div>

          {/* Row 5: Game Mode */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '170px 1fr',
              alignItems: 'center',
              marginBottom: '0.75rem',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
              <Gamepad2 size={22} color="#ffffff" strokeWidth={2.3} />
              <span>Game Mode</span>
            </div>
            <select
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.95rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {GAME_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          {/* Row 6: Word Count */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '170px 1fr',
              alignItems: 'center',
              marginBottom: '0.75rem',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
              <Layers size={22} color="#ffffff" strokeWidth={2.3} />
              <span>Word Count</span>
            </div>
            <select
              value={wordOptionsCount}
              onChange={(e) => setWordOptionsCount(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.95rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {WORD_COUNT_OPTIONS.map((cnt) => (
                <option key={cnt} value={cnt}>
                  {cnt}
                </option>
              ))}
            </select>
          </div>

          {/* Row 7: Hints */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '170px 1fr',
              alignItems: 'center',
              marginBottom: '1rem',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ffffff', fontWeight: 700, fontSize: '0.98rem' }}>
              <HelpCircle size={22} color="#ffffff" strokeWidth={2.3} />
              <span>Hints</span>
            </div>
            <select
              value={hintsAllowed}
              onChange={(e) => setHintsAllowed(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                border: 'none',
                background: '#ffffff',
                color: '#0f172a',
                fontWeight: 700,
                fontSize: '0.95rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {HINT_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Words Section */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '0.85rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}
            >
              <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>
                Custom words
              </span>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>Use custom words only</span>
                <input
                  type="checkbox"
                  checked={customWordsOnly}
                  onChange={(e) => setCustomWordsOnly(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#2563eb',
                    cursor: 'pointer',
                  }}
                />
              </label>
            </div>

            <textarea
              value={customWordsText}
              onChange={(e) => setCustomWordsText(e.target.value)}
              placeholder="Minimum of 10 words. 1-32 characters per word! 20000 characters maximum. Separated by a , (comma)"
              rows={4}
              style={{
                width: '100%',
                borderRadius: '6px',
                border: 'none',
                background: '#ffffff',
                color: '#0f172a',
                padding: '0.75rem 0.85rem',
                fontSize: '0.88rem',
                fontWeight: 500,
                outline: 'none',
                resize: 'vertical',
                minHeight: '90px',
                lineHeight: 1.4,
              }}
            />
          </div>

          {/* Private Room Flag */}
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="privateToggle"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
            />
            <label
              htmlFor="privateToggle"
              style={{ color: '#cbd5e1', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Lock size={13} /> Private Room (Accessible only by invite code & link)
            </label>
          </div>
        </div>

        {/* Big Skribbl Green Create Button */}
        <button
          type="submit"
          className="skribbl-btn skribbl-btn-green"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.95rem',
            fontSize: '1.25rem',
            fontWeight: 900,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            letterSpacing: '0.025em',
          }}
        >
          {loading ? 'Creating Room...' : (
            <>
              <Play size={22} fill="currentColor" /> Create Room & Enter Lobby
            </>
          )}
        </button>
      </form>
    </div>
  );
};
