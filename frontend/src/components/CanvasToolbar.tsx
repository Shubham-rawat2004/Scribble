import React from 'react';
import { DrawingTool, SKRIBBL_PALETTE, BRUSH_SIZES } from '../types/canvas';
import { Paintbrush, Eraser, Undo2, Trash2 } from 'lucide-react';

interface CanvasToolbarProps {
  tool: DrawingTool;
  color: string;
  size: number;
  canUndo: boolean;
  onSelectTool: (tool: DrawingTool) => void;
  onSelectColor: (color: string) => void;
  onSelectSize: (size: number) => void;
  onUndo: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  tool,
  color,
  size,
  canUndo,
  onSelectTool,
  onSelectColor,
  onSelectSize,
  onUndo,
  onClear,
  disabled = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.65rem 1rem',
        background: '#ffffff',
        borderRadius: '14px',
        border: '2px solid #1e293b',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        userSelect: 'none',
      }}
    >
      {/* 1. Tools: Brush & Eraser */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectTool('brush')}
          title="Pen / Brush"
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: tool === 'brush' ? '2px solid #2563eb' : '1px solid #cbd5e1',
            background: tool === 'brush' ? '#eff6ff' : '#ffffff',
            color: tool === 'brush' ? '#1d4ed8' : '#475569',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: tool === 'brush' ? '0 2px 4px rgba(37, 99, 235, 0.2)' : 'none',
            transition: 'all 0.12s ease',
          }}
        >
          <Paintbrush size={16} /> Brush
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectTool('eraser')}
          title="Eraser Tool"
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: tool === 'eraser' ? '2px solid #2563eb' : '1px solid #cbd5e1',
            background: tool === 'eraser' ? '#eff6ff' : '#ffffff',
            color: tool === 'eraser' ? '#1d4ed8' : '#475569',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: tool === 'eraser' ? '0 2px 4px rgba(37, 99, 235, 0.2)' : 'none',
            transition: 'all 0.12s ease',
          }}
        >
          <Eraser size={16} /> Eraser
        </button>
      </div>

      {/* 2. Brush Size Selector (4 circles) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', padding: '0 0.6rem' }}>
        {BRUSH_SIZES.map((b) => {
          const isSelected = size === b.size;
          return (
            <button
              key={b.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectSize(b.size)}
              title={`${b.label} (${b.size}px)`}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: isSelected ? '#eff6ff' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transform: isSelected ? 'scale(1.1)' : 'none',
                transition: 'all 0.12s ease',
              }}
            >
              {/* Visual circle tip representation */}
              <span
                style={{
                  width: `${Math.min(20, Math.max(4, b.size * 0.6))}px`,
                  height: `${Math.min(20, Math.max(4, b.size * 0.6))}px`,
                  borderRadius: '50%',
                  background: tool === 'eraser' ? '#94a3b8' : color,
                  display: 'inline-block',
                }}
              />
            </button>
          );
        })}
      </div>

      {/* 3. 22-Color Skribbl Palette (2 rows of 11) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {SKRIBBL_PALETTE.map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: 'flex', gap: '3px' }}>
            {row.map((c) => {
              const isSelected = tool !== 'eraser' && color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onSelectColor(c);
                    if (tool === 'eraser') onSelectTool('brush');
                  }}
                  title={c}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '3px',
                    background: c,
                    border: isSelected ? '2px solid #2563eb' : '1px solid rgba(0, 0, 0, 0.25)',
                    boxShadow: isSelected ? '0 0 0 2px #93c5fd' : 'none',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transform: isSelected ? 'scale(1.2)' : 'none',
                    zIndex: isSelected ? 2 : 1,
                    transition: 'transform 0.1s ease',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* 4. Undo and Clear Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <button
          type="button"
          disabled={disabled || !canUndo}
          onClick={onUndo}
          title="Undo last stroke"
          style={{
            padding: '0.5rem 0.65rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: canUndo ? '#f8fafc' : '#f1f5f9',
            color: canUndo ? '#334155' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            cursor: canUndo && !disabled ? 'pointer' : 'not-allowed',
            opacity: canUndo ? 1 : 0.6,
          }}
        >
          <Undo2 size={16} /> Undo
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          title="Clear canvas"
          style={{
            padding: '0.5rem 0.65rem',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#dc2626',
            fontWeight: 700,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <Trash2 size={16} /> Clear
        </button>
      </div>
    </div>
  );
};
