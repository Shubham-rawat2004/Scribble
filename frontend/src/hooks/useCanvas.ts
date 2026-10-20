import { useRef, useState, useEffect, useCallback } from 'react';
import { CanvasPoint, DrawStroke, DrawingTool } from '../types/canvas';

interface UseCanvasOptions {
  initialTool?: DrawingTool;
  initialColor?: string;
  initialSize?: number;
  readOnly?: boolean;
  onStrokeComplete?: (stroke: DrawStroke) => void;
  onCanvasClear?: () => void;
  onUndo?: () => void;
  // Real-time synchronization emitter callbacks
  onEmitStrokeStart?: (stroke: DrawStroke) => void;
  onEmitStrokeMove?: (strokeId: string, points: CanvasPoint[]) => void;
  onEmitStrokeEnd?: (strokeId: string) => void;
  onEmitUndo?: () => void;
  onEmitClear?: () => void;
}

export function useCanvas({
  initialTool = 'brush',
  initialColor = '#000000',
  initialSize = 10,
  readOnly = false,
  onStrokeComplete,
  onCanvasClear,
  onUndo,
  onEmitStrokeStart,
  onEmitStrokeMove,
  onEmitStrokeEnd,
  onEmitUndo,
  onEmitClear,
}: UseCanvasOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing tool states
  const [tool, setTool] = useState<DrawingTool>(initialTool);
  const [color, setColor] = useState<string>(initialColor);
  const [size, setSize] = useState<number>(initialSize);

  // Synchronous drawing state refs (immune to React render batching and stale closures)
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<DrawStroke | null>(null);
  const strokesRef = useRef<DrawStroke[]>([]);
  const remoteStrokesRef = useRef<Map<string, DrawStroke>>(new Map());
  const canvasDimensionsRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  // Callbacks ref to prevent stale closures and avoid recreating handlers
  const callbacksRef = useRef({
    onStrokeComplete,
    onCanvasClear,
    onUndo,
    onEmitStrokeStart,
    onEmitStrokeMove,
    onEmitStrokeEnd,
    onEmitUndo,
    onEmitClear,
    readOnly,
    tool,
    color,
    size,
  });

  // Keep callbacks ref updated with latest props & tool state
  useEffect(() => {
    callbacksRef.current = {
      onStrokeComplete,
      onCanvasClear,
      onUndo,
      onEmitStrokeStart,
      onEmitStrokeMove,
      onEmitStrokeEnd,
      onEmitUndo,
      onEmitClear,
      readOnly,
      tool,
      color,
      size,
    };
  });

  // Stroke vector buffer in React state (for UI counters, undo button availability, telemetry)
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [cursorPoint, setCursorPoint] = useState<CanvasPoint | null>(null);

  // Helper to calculate normalized coordinate [0.0 - 1.0]
  const getNormalizedPoint = useCallback((clientX: number, clientY: number): CanvasPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  }, []);

  // Draw a single stroke with smooth quadratic Bézier curve interpolation
  const renderStroke = useCallback(
    (ctx: CanvasRenderingContext2D, stroke: DrawStroke, width: number, height: number) => {
      const pts = stroke.points;
      if (!pts || pts.length === 0) return;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.size;
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;

      if (pts.length === 1) {
        // Single tap dot
        ctx.beginPath();
        ctx.arc(pts[0].x * width, pts[0].y * height, stroke.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x * width, pts[0].y * height);

        for (let i = 1; i < pts.length - 1; i++) {
          const midX = ((pts[i].x + pts[i + 1].x) / 2) * width;
          const midY = ((pts[i].y + pts[i + 1].y) / 2) * height;
          ctx.quadraticCurveTo(pts[i].x * width, pts[i].y * height, midX, midY);
        }

        const last = pts[pts.length - 1];
        ctx.lineTo(last.x * width, last.y * height);
        ctx.stroke();
      }

      ctx.restore();
    },
    []
  );

  // Complete canvas re-render from vector history
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return;

    // Reset background to pure canvas white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw all committed strokes
    for (const stroke of strokesRef.current) {
      renderStroke(ctx, stroke, width, height);
    }

    // Draw active local stroke in progress
    if (currentStrokeRef.current) {
      renderStroke(ctx, currentStrokeRef.current, width, height);
    }

    // Draw active remote strokes in progress
    for (const remoteStroke of remoteStrokesRef.current.values()) {
      renderStroke(ctx, remoteStroke, width, height);
    }
  }, [renderStroke]);

  const redrawCanvasRef = useRef(redrawCanvas);
  useEffect(() => {
    redrawCanvasRef.current = redrawCanvas;
  }, [redrawCanvas]);

  // Handle High-DPI (Retina) scaling and window resizing
  // CRITICAL: Only updates canvas.width / canvas.height if pixel dimensions actually changed.
  // Reassigning canvas.width / canvas.height during active drawing wipes context and drops pointer capture.
  const setupCanvasDpi = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const pixelWidth = Math.floor(rect.width * dpr);
    const pixelHeight = Math.floor(rect.height * dpr);

    if (pixelWidth === 0 || pixelHeight === 0) return;

    if (
      canvas.width !== pixelWidth ||
      canvas.height !== pixelHeight ||
      canvasDimensionsRef.current.dpr !== dpr
    ) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvasDimensionsRef.current = { width: rect.width, height: rect.height, dpr };

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      redrawCanvasRef.current();
    }
  }, []);

  useEffect(() => {
    setupCanvasDpi();

    // Observe size changes via ResizeObserver
    const canvas = canvasRef.current;
    let observer: ResizeObserver | null = null;
    if (canvas && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        setupCanvasDpi();
      });
      observer.observe(canvas);
    }

    const handleResize = () => setupCanvasDpi();
    window.addEventListener('resize', handleResize);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [setupCanvasDpi]);

  // Draw direct line segment for 0ms latency incremental rendering
  const drawDirectSegment = (
    p1: CanvasPoint,
    p2: CanvasPoint,
    strokeTool: DrawingTool,
    strokeColor: string,
    strokeSize: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeSize;
    ctx.strokeStyle = strokeTool === 'eraser' ? '#ffffff' : strokeColor;

    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();

    ctx.restore();
  };

  // Draw direct dot for single tap
  const drawDirectDot = (
    pt: CanvasPoint,
    strokeTool: DrawingTool,
    strokeColor: string,
    strokeSize: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.save();
    ctx.beginPath();
    ctx.arc(pt.x * width, pt.y * height, strokeSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = strokeTool === 'eraser' ? '#ffffff' : strokeColor;
    ctx.fill();
    ctx.restore();
  };

  // --- Pointer Event Handlers (Active Drawer) ---
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (callbacksRef.current.readOnly) return;
    const pt = getNormalizedPoint(e.clientX, e.clientY);
    if (!pt) return;

    // Capture pointer events for uninterrupted drawing across canvas boundaries
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_err) {
      // Ignored if unsupported
    }

    const currentTool = callbacksRef.current.tool;
    const currentColor = callbacksRef.current.color;
    const currentSize = callbacksRef.current.size;

    const newStroke: DrawStroke = {
      id: Math.random().toString(36).substring(2, 9),
      tool: currentTool,
      color: currentTool === 'eraser' ? '#ffffff' : currentColor,
      size: currentSize,
      points: [pt],
    };

    isDrawingRef.current = true;
    currentStrokeRef.current = newStroke;
    setIsDrawing(true);
    setCursorPoint(pt);

    // Draw initial dot immediately
    drawDirectDot(pt, newStroke.tool, newStroke.color, newStroke.size);

    // Real-time network emission to room spectators
    callbacksRef.current.onEmitStrokeStart?.(newStroke);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getNormalizedPoint(e.clientX, e.clientY);
    if (pt) setCursorPoint(pt);

    if (callbacksRef.current.readOnly || !isDrawingRef.current || !currentStrokeRef.current) return;
    if (!pt) return;

    const stroke = currentStrokeRef.current;
    const prevPt = stroke.points[stroke.points.length - 1];

    // Append point synchronously to active stroke vector
    stroke.points.push(pt);

    // Render continuous segment directly to canvas (60-120 FPS buttery smooth)
    drawDirectSegment(prevPt, pt, stroke.tool, stroke.color, stroke.size);

    // Real-time network streaming to room spectators
    callbacksRef.current.onEmitStrokeMove?.(stroke.id, [pt]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch (_err) {
      // Ignored
    }

    if (callbacksRef.current.readOnly || !isDrawingRef.current || !currentStrokeRef.current) return;

    const completedStroke = currentStrokeRef.current;
    isDrawingRef.current = false;
    currentStrokeRef.current = null;
    setIsDrawing(false);

    if (completedStroke.points.length > 0) {
      strokesRef.current.push(completedStroke);
      setStrokes([...strokesRef.current]);
      callbacksRef.current.onStrokeComplete?.(completedStroke);
    }

    // Smooth final curve with quadratic Bézier anti-aliasing
    redrawCanvasRef.current();

    // Notify spectators stroke ended
    callbacksRef.current.onEmitStrokeEnd?.(completedStroke.id);
  };

  const handlePointerLeave = () => {
    setCursorPoint(null);
  };

  // --- Toolbar Actions ---
  const handleUndo = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokes([...strokesRef.current]);
    redrawCanvasRef.current();

    callbacksRef.current.onUndo?.();
    callbacksRef.current.onEmitUndo?.();
  }, []);

  const handleClear = useCallback(() => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    remoteStrokesRef.current.clear();
    setStrokes([]);
    redrawCanvasRef.current();

    callbacksRef.current.onCanvasClear?.();
    callbacksRef.current.onEmitClear?.();
  }, []);

  // --- Remote Drawing Receiver Methods (Guesser Mode) ---
  const applyRemoteStrokeStart = useCallback((stroke: DrawStroke) => {
    remoteStrokesRef.current.set(stroke.id, stroke);
    if (stroke.points.length > 0) {
      drawDirectDot(stroke.points[0], stroke.tool, stroke.color, stroke.size);
    }
  }, []);

  const applyRemoteStrokeMove = useCallback((strokeId: string, points: CanvasPoint[]) => {
    let remoteStroke = remoteStrokesRef.current.get(strokeId);
    if (!remoteStroke) {
      // In case start packet was dropped, synthesize active stroke
      remoteStroke = {
        id: strokeId,
        tool: 'brush',
        color: '#000000',
        size: 10,
        points: [],
      };
      remoteStrokesRef.current.set(strokeId, remoteStroke);
    }

    for (const pt of points) {
      if (remoteStroke.points.length > 0) {
        const prevPt = remoteStroke.points[remoteStroke.points.length - 1];
        drawDirectSegment(prevPt, pt, remoteStroke.tool, remoteStroke.color, remoteStroke.size);
      } else {
        drawDirectDot(pt, remoteStroke.tool, remoteStroke.color, remoteStroke.size);
      }
      remoteStroke.points.push(pt);
    }
  }, []);

  const applyRemoteStrokeEnd = useCallback((strokeId: string) => {
    const remoteStroke = remoteStrokesRef.current.get(strokeId);
    if (remoteStroke) {
      remoteStrokesRef.current.delete(strokeId);
      strokesRef.current.push(remoteStroke);
      setStrokes([...strokesRef.current]);
      redrawCanvasRef.current();
    }
  }, []);

  const applyRemoteUndo = useCallback(() => {
    strokesRef.current.pop();
    setStrokes([...strokesRef.current]);
    redrawCanvasRef.current();
  }, []);

  const applyRemoteClear = useCallback(() => {
    strokesRef.current = [];
    remoteStrokesRef.current.clear();
    setStrokes([]);
    redrawCanvasRef.current();
  }, []);

  const hydrateStrokes = useCallback((initialStrokes: DrawStroke[]) => {
    strokesRef.current = [...initialStrokes];
    remoteStrokesRef.current.clear();
    setStrokes([...strokesRef.current]);
    redrawCanvasRef.current();
  }, []);

  // Calculate total points and memory size for technical interview telemetry
  const totalPoints = strokes.reduce((acc, s) => acc + s.points.length, 0);
  const estimatedMemoryKb = ((totalPoints * 16 + strokes.length * 64) / 1024).toFixed(2);

  return {
    canvasRef,
    tool,
    setTool,
    color,
    setColor,
    size,
    setSize,
    strokes,
    isDrawing,
    cursorPoint,
    totalPoints,
    estimatedMemoryKb,
    canUndo: strokes.length > 0,
    handleUndo,
    handleClear,
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerLeave,
    },
    // Remote synchronization API
    applyRemoteStrokeStart,
    applyRemoteStrokeMove,
    applyRemoteStrokeEnd,
    applyRemoteUndo,
    applyRemoteClear,
    hydrateStrokes,
  };
}
