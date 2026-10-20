import React from 'react';

export interface AvatarOption {
  id: string;
  name: string;
  emoji: string;
  bg: string;
}

export const AVATARS: AvatarOption[] = [
  { id: 'avatar_1', name: 'Panda', emoji: '🐼', bg: '#f1f5f9' },
  { id: 'avatar_2', name: 'Fox', emoji: '🦊', bg: '#ffedd5' },
  { id: 'avatar_3', name: 'Cat', emoji: '🐱', bg: '#fef3c7' },
  { id: 'avatar_4', name: 'Lion', emoji: '🦁', bg: '#fef08a' },
  { id: 'avatar_5', name: 'Frog', emoji: '🐸', bg: '#dcfce7' },
  { id: 'avatar_6', name: 'Robot', emoji: '🤖', bg: '#e0f2fe' },
  { id: 'avatar_7', name: 'Alien', emoji: '👾', bg: '#ede9fe' },
  { id: 'avatar_8', name: 'Koala', emoji: '🐨', bg: '#fce7f3' },
];

interface AvatarPickerProps {
  selectedAvatarId: string;
  onSelect: (avatarId: string) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ selectedAvatarId, onSelect }) => {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: '#334155',
          marginBottom: '0.5rem',
        }}
      >
        Choose Your Avatar
      </label>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.75rem',
        }}
      >
        {AVATARS.map((av) => {
          const isSelected = av.id === selectedAvatarId;
          return (
            <button
              type="button"
              key={av.id}
              onClick={() => onSelect(av.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.6rem 0.4rem',
                borderRadius: '10px',
                background: av.bg,
                border: isSelected ? '3px solid #2563eb' : '1px solid #cbd5e1',
                cursor: 'pointer',
                transform: isSelected ? 'scale(1.05)' : 'none',
                boxShadow: isSelected ? '0 4px 6px -1px rgba(37, 99, 235, 0.2)' : 'none',
                transition: 'all 0.15s ease-in-out',
              }}
            >
              <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>{av.emoji}</span>
              <span style={{ fontSize: '0.75rem', marginTop: '0.35rem', fontWeight: 600, color: '#475569' }}>
                {av.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
