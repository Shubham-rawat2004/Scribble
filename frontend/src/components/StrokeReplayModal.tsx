import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DrawStroke } from '../types/canvas';
import { Play, Pause, RotateCcw, X, Film } from 'lucide-react';

interface StrokeReplayModalProps {
  secretWord: string;
  drawerName?: string;
  strokes: DrawStroke[];
  onClose: () => void;
}

export const StrokeReplayModal: React.FC<StrokeReplayModalProps> = ({
  secretWord,
  drawerName = 'Drawer',
  strokes = [],
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(2); // 1x, 2x, 4x
  const [strokeIdx, setStrokeIdx] = useState<number>(0);
  const [pointIdx, setPointIdx] = useState<number>(0);

  // References for playback loop
  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;
  const speedRef = useRef<number>(speed);
  speedRef.current = speed;
  const strokeIdxRef = useRef<number>(strokeIdx);
  strokeIdxRef.current = strokeIdx;
  const pointIdxRef = useRef<number>(pointIdx);
  pointIdxRef.current = pointIdx;

  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const CANVAS_WIDTH = 560;
  const CANVAS_HEIGHT = 350;

  // Render a stroke up to a specific point count
  const renderSingleStroke = (
    ctx: CanvasRenderingContext2D,
    stroke: DrawStroke,
    width: number,
    height: number,
    upToCount?: number
  ) => {
    const pts = stroke.points;
    if (!pts || pts.length === 0) return;
    const count = upToCount !== undefined ? Math.min(pts.length, upToCount) : pts.length;
    if (count <= 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.size;
    ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;

    if (count === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x * width, pts[0].y * height, stroke.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(pts[0].x * width, pts[0].y * height);

      for (let i = 1; i < count - 1; i++) {
        const midX = ((pts[i].x + pts[i + 1].x) / 2) * width;
        const midY = ((pts[i].y + pts[i + 1].y) / 2) * height;
        ctx.quadraticCurveTo(pts[i].x * width, pts[i].y * height, midX, midY);
      }

      const last = pts[count - 1];
      ctx.lineTo(last.x * width, last.y * height);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Full repaint up to current stroke and point index
  const redrawAll = useCallback(
    (sIdx: number, pIdx: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);

      // Clean white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw all completed strokes prior to current
      for (let i = 0; i < Math.min(sIdx, strokes.length); i++) {
        renderSingleStroke(ctx, strokes[i], CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // Draw active stroke up to current point index
      if (sIdx < strokes.length) {
        renderSingleStroke(ctx, strokes[sIdx], CANVAS_WIDTH, CANVAS_HEIGHT, pIdx);
      }

      ctx.restore();
    },
    [strokes]
  );

  // Setup High-DPI canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    redrawAll(strokeIdxRef.current, pointIdxRef.current);
  }, [redrawAll]);

  // Main Animation / Playback Loop
  useEffect(() => {
    if (strokes.length === 0) {
      setIsPlaying(false);
      return;
    }

    const step = (now: number) => {
      if (!isPlayingRef.current) return;

      // Rate limit according to speed: base 16ms, at 2x: 8ms, at 4x: 4ms
      const intervalMs = Math.max(4, 20 / speedRef.current);
      if (now - lastTickRef.current >= intervalMs) {
        lastTickRef.current = now;

        let sIdx = strokeIdxRef.current;
        let pIdx = pointIdxRef.current;

        if (sIdx >= strokes.length) {
          // Replay reached end
          setIsPlaying(false);
          isPlayingRef.current = false;
          return;
        }

        const currentStroke = strokes[sIdx];
        if (!currentStroke || currentStroke.points.length === 0) {
          sIdx += 1;
          pIdx = 0;
        } else {
          // Advance points based on speed (higher speed skips more points per frame)
          const stepSize = speedRef.current === 4 ? 3 : speedRef.current === 2 ? 2 : 1;
          pIdx += stepSize;
          if (pIdx >= currentStroke.points.length) {
            sIdx += 1;
            pIdx = 0;
          }
        }

        strokeIdxRef.current = sIdx;
        pointIdxRef.current = pIdx;
        setStrokeIdx(sIdx);
        setPointIdx(pIdx);
        redrawAll(sIdx, pIdx);
      }

      animationFrameRef.current = requestAnimationFrame(step);
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(step);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, strokes, redrawAll]);

  const handleTogglePlay = () => {
    if (strokeIdx >= strokes.length) {
      // If at end, restart from beginning
      setStrokeIdx(0);
      setPointIdx(0);
      strokeIdxRef.current = 0;
      pointIdxRef.current = 0;
      redrawAll(0, 0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleRestart = () => {
    setStrokeIdx(0);
    setPointIdx(0);
    strokeIdxRef.current = 0;
    pointIdxRef.current = 0;
    redrawAll(0, 0);
    setIsPlaying(true);
  };

  const handleScrub = (newStrokeIdx: number) => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setStrokeIdx(newStrokeIdx);
    setPointIdx(0);
    strokeIdxRef.current = newStrokeIdx;
    pointIdxRef.current = 0;
    redrawAll(newStrokeIdx, 0);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          border: '4px solid #1e293b',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            backgroundColor: '#1e293b',
            color: '#ffffff',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '3px solid #0f172a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Film size={22} color="#38bdf8" />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>
                Turn Stroke Replay
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f8fafc' }}>
                Word:{' '}
                <span style={{ color: '#fde047', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {secretWord || '???'}
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', marginLeft: '0.5rem' }}>
                  (by {drawerName})
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close Replay"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              transition: 'background 0.2s, color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = '#334155';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'none';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Canvas Replay Area */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '2px solid #cbd5e1',
              backgroundColor: '#ffffff',
              position: 'relative',
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
            }}
          >
            <canvas ref={canvasRef} />
            {strokes.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                No strokes recorded for this turn.
              </div>
            )}
          </div>
        </div>

        {/* Playback Controls & Progress Bar */}
        <div
          style={{
            padding: '0.9rem 1.25rem',
            backgroundColor: '#ffffff',
            borderTop: '2px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {/* Progress Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="range"
              min={0}
              max={Math.max(1, strokes.length)}
              value={strokeIdx}
              onChange={(e) => handleScrub(Number(e.target.value))}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: '#0284c7',
              }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', minWidth: '70px', textAlign: 'right' }}>
              {strokeIdx} / {strokes.length}
            </span>
          </div>

          {/* Action Buttons & Speed Selection */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Play / Pause Button */}
              <button
                type="button"
                onClick={handleTogglePlay}
                disabled={strokes.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 1rem',
                  borderRadius: '10px',
                  backgroundColor: isPlaying ? '#f59e0b' : '#0284c7',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: strokes.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isPlaying ? 'Pause' : strokeIdx >= strokes.length ? 'Replay' : 'Play'}
              </button>

              {/* Restart Button */}
              <button
                type="button"
                onClick={handleRestart}
                disabled={strokes.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '10px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  border: '1.5px solid #cbd5e1',
                  cursor: strokes.length === 0 ? 'not-allowed' : 'pointer',
                }}
                title="Restart from beginning"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Speed Selector (1x, 2x, 4x) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginRight: '0.2rem' }}>
                Speed:
              </span>
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSpeed(spd)}
                  style={{
                    padding: '0.25rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: speed === spd ? '#0284c7' : '#f1f5f9',
                    color: speed === spd ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
