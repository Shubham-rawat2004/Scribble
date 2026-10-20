import React, { useState } from 'react';
import {
  SkribblAvatar,
  SkribblAvatarConfig,
  parseAvatarId,
  serializeAvatarConfig,
  getRandomAvatarConfig,
  AVATAR_COLORS,
  TOTAL_EYES,
  TOTAL_MOUTHS,
} from './SkribblAvatar';
import { ChevronLeft, ChevronRight, Dices, Palette } from 'lucide-react';

interface SkribblAvatarPickerProps {
  selectedAvatarId: string;
  onSelect: (avatarId: string) => void;
  size?: number;
}

export const SkribblAvatarPicker: React.FC<SkribblAvatarPickerProps> = ({
  selectedAvatarId,
  onSelect,
  size = 110,
}) => {
  const [config, setConfig] = useState<SkribblAvatarConfig>(() => parseAvatarId(selectedAvatarId));
  const [diceRolling, setDiceRolling] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const updateConfig = (newCfg: SkribblAvatarConfig) => {
    setConfig(newCfg);
    onSelect(serializeAvatarConfig(newCfg));
  };

  const handlePrev = () => {
    // Cycles through eyes & mouths smoothly
    let nextEyes = config.eyesIndex - 1;
    let nextMouth = config.mouthIndex;
    if (nextEyes < 0) {
      nextEyes = TOTAL_EYES - 1;
      nextMouth = (config.mouthIndex - 1 + TOTAL_MOUTHS) % TOTAL_MOUTHS;
    }
    updateConfig({
      ...config,
      eyesIndex: nextEyes,
      mouthIndex: nextMouth,
    });
  };

  const handleNext = () => {
    let nextEyes = config.eyesIndex + 1;
    let nextMouth = config.mouthIndex;
    if (nextEyes >= TOTAL_EYES) {
      nextEyes = 0;
      nextMouth = (config.mouthIndex + 1) % TOTAL_MOUTHS;
    }
    updateConfig({
      ...config,
      eyesIndex: nextEyes,
      mouthIndex: nextMouth,
    });
  };

  const handleRandomize = () => {
    setDiceRolling(true);
    const newCfg = getRandomAvatarConfig();
    updateConfig(newCfg);
    setTimeout(() => setDiceRolling(false), 300);
  };

  const handleColorChange = (cIndex: number) => {
    updateConfig({ ...config, colorIndex: cIndex });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        {/* Previous Avatar Button */}
        <button
          type="button"
          onClick={handlePrev}
          title="Previous Face"
          className="avatar-arrow-btn"
          style={{
            background: '#ffffff',
            border: '2px solid #cbd5e1',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronLeft size={22} color="#334155" />
        </button>

        {/* Central Avatar Display */}
        <div
          style={{
            position: 'relative',
            padding: '0.4rem',
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 8px 16px -2px rgba(0, 0, 0, 0.12), 0 0 0 4px #e2e8f0',
          }}
        >
          <SkribblAvatar config={config} size={size} />

          {/* Dice Randomizer button on bottom right */}
          <button
            type="button"
            onClick={handleRandomize}
            title="Randomize Avatar"
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '-6px',
              background: '#fbbf24',
              color: '#78350f',
              border: '2px solid #ffffff',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
              transform: diceRolling ? 'rotate(360deg) scale(1.15)' : 'none',
              transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <Dices size={20} />
          </button>

          {/* Palette button on bottom left */}
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Choose Color"
            style={{
              position: 'absolute',
              bottom: '2px',
              left: '-6px',
              background: '#38bdf8',
              color: '#075985',
              border: '2px solid #ffffff',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.15)',
            }}
          >
            <Palette size={18} />
          </button>
        </div>

        {/* Next Avatar Button */}
        <button
          type="button"
          onClick={handleNext}
          title="Next Face"
          className="avatar-arrow-btn"
          style={{
            background: '#ffffff',
            border: '2px solid #cbd5e1',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronRight size={22} color="#334155" />
        </button>
      </div>

      {/* Color Swatch Drawer */}
      {showColorPicker && (
        <div
          style={{
            marginTop: '0.75rem',
            display: 'flex',
            gap: '0.4rem',
            padding: '0.4rem 0.6rem',
            background: '#ffffff',
            borderRadius: '9999px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {AVATAR_COLORS.map((col, idx) => (
            <button
              key={col}
              type="button"
              onClick={() => handleColorChange(idx)}
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: col,
                border: config.colorIndex === idx ? '3px solid #1e293b' : '2px solid #ffffff',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                transform: config.colorIndex === idx ? 'scale(1.2)' : 'none',
                transition: 'transform 0.1s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
