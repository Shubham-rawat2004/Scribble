import React from 'react';
import { DrawingTool } from '../types/canvas';

interface CanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  tool: DrawingTool;
  color: string;
  size: number;
  readOnly?: boolean;
  pointerHandlers: {
    onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
    onPointerLeave: () => void;
  };
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Canvas: React.FC<CanvasProps> = ({
  canvasRef,
  tool,
  readOnly = false,
  pointerHandlers,
  className = '',
  style = {},
  children,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        border: '3px solid #1e293b',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        display: 'flex',
        cursor: readOnly ? 'default' : tool === 'eraser' ? 'cell' : 'crosshair',
        ...style,
      }}
      className={className}
    >
      <canvas
        ref={canvasRef}
        {...pointerHandlers}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
        }}
      />
      {children}
    </div>
  );
};
