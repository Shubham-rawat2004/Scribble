# Feature 04: Standalone HTML5 Drawing Canvas & Toolbar

This document details the complete design, mathematics, code implementation, testing, and interview defense for Phase 4: **Standalone HTML5 Drawing Canvas & Toolbar**.

---

## 1. Feature Overview
Phase 4 provides the client-side vector drawing engine for the Skribbl.io clone. It implements an interactive 2D HTML5 canvas supporting smooth quadratic Bézier curve interpolation, High-DPI (Retina) scaling, an authentic 22-color Skribbl palette, 4 brush thickness levels, an eraser tool, vector stroke undo, and canvas clear. All coordinates are normalized between `0.0` and `1.0` to guarantee resolution-independent rendering across different display sizes before network synchronization in Phase 5.

---

## 2. Requirements Mapping
From [`docs/requirements-checklist.md`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/docs/requirements-checklist.md):
- **REQ-MH-10:** Basic drawing tools: Brush/pen, color palette, brush size selector, undo, and clear canvas. *(Must Have — Page 2, 4, 5)*
- **REQ-NH-02:** Eraser drawing tool with brush size adjustments. *(Bonus/Nice-to-Have — Page 2, 5)*
- **High-DPI Scaling:** Automatic detection and handling of `window.devicePixelRatio`.
- **Coordinate Normalization:** Mapping mouse/pointer inputs to $[0.0, 1.0]$.
- **Vector Undo Engine:** Non-destructive vector history stack.

---

## 3. User Workflow
1. User clicks **"🎨 Practice Drawing Canvas (Sandbox)"** on the Home screen.
2. The user sees the crisp white drawing canvas with the authentic Skribbl toolbar and technical telemetry readout.
3. User clicks on any of the **22 palette colors** (e.g. Red `#ef130b`) or selects a **brush tip size** (Small `4px`, Medium `10px`, Large `20px`, Extra Large `36px`).
4. Drawing with mouse or touchpad renders smooth, anti-aliased curves in real time at 60 FPS.
5. Clicking **🧹 Eraser** switches the tool to erase strokes back to white.
6. Clicking **↩️ Undo** instantly removes the most recent stroke from the canvas using vector history.
7. Clicking **🗑️ Clear** resets the canvas surface back to pure white.
8. The technical telemetry bar displays live active strokes, point count, normalized coordinates `(normX, normY)`, and in-memory vector footprint.

---

## 4. Mathematical & Algorithmic Foundation

### A. Coordinate Normalization Formula
To ensure resolution-independent rendering across different screens (mobile phones, laptops, 4K monitors):
$$\text{normX} = \max\left(0, \min\left(1, \frac{\text{clientX} - \text{rect.left}}{\text{rect.width}}\right)\right)$$
$$\text{normY} = \max\left(0, \min\left(1, \frac{\text{clientY} - \text{rect.top}}{\text{rect.height}}\right)\right)$$

When rendering on a target display with width $W$ and height $H$:
$$\text{pixelX} = \text{normX} \times W, \quad \text{pixelY} = \text{normY} \times H$$

### B. High-DPI (Retina Display) DPR Scaling
Without DPR scaling, HTML5 canvases on Apple Retina, 4K, or mobile screens appear blurry.
```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = Math.floor(rect.width * dpr);
canvas.height = Math.floor(rect.height * dpr);
ctx.scale(dpr, dpr);
```

### C. Quadratic Bézier Curve Smoothing
Raw pointer events produce jagged polygonal lines. Midpoint quadratic Bézier smoothing calculates midpoints between consecutive points:
$$M_i = \left(\frac{P_i.x + P_{i+1}.x}{2}, \frac{P_i.y + P_{i+1}.y}{2}\right)$$
```typescript
ctx.beginPath();
ctx.moveTo(pts[0].x * width, pts[0].y * height);
for (let i = 1; i < pts.length - 1; i++) {
  const midX = ((pts[i].x + pts[i + 1].x) / 2) * width;
  const midY = ((pts[i].y + pts[i + 1].y) / 2) * height;
  ctx.quadraticCurveTo(pts[i].x * width, pts[i].y * height, midX, midY);
}
ctx.lineTo(last.x * width, last.y * height);
ctx.stroke();
```

---

## 5. Vector Stroke Model & Undo Architecture

Instead of saving 500 KB raster bitmap snapshots for every stroke, drawings are saved as a lightweight array of **Vector Strokes**:

```typescript
export interface CanvasPoint {
  x: number; // Normalized coordinate [0.0 - 1.0]
  y: number; // Normalized coordinate [0.0 - 1.0]
}

export interface DrawStroke {
  id: string; // Unique stroke UUID
  tool: 'brush' | 'eraser';
  color: string; // Hex color code (e.g. '#000000', '#ffffff')
  size: number; // Brush diameter in logical pixels (4, 10, 20, 36)
  points: CanvasPoint[];
}
```

```
[Stroke 1 (Brush, Red, 10px)] ──► [Stroke 2 (Brush, Blue, 20px)] ──► [Stroke 3 (Eraser, White, 36px)]
                                                                               ▲
                                                                     undo() pops Stroke 3
                                                                     Redraws 1 & 2 in <2ms
```

---

## 6. File-by-File Breakdown

| File | Purpose |
|---|---|
| [`frontend/src/types/canvas.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/types/canvas.ts) | Types for `CanvasPoint`, `DrawStroke`, `DrawingTool`, `SKRIBBL_PALETTE` (22 colors), and `BRUSH_SIZES` |
| [`frontend/src/hooks/useCanvas.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/hooks/useCanvas.ts) | Custom hook managing DPR scaling, pointer event capture, normalized coordinates, Bézier smoothing, undo, and clear |
| [`frontend/src/components/Canvas.tsx`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/components/Canvas.tsx) | Reusable HTML5 `<canvas>` component with touch-action isolation |
| [`frontend/src/components/CanvasToolbar.tsx`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/components/CanvasToolbar.tsx) | Toolbar featuring 22-color palette, 4 brush tip sizes with circle indicators, pen, eraser, undo, and clear |
| [`frontend/src/pages/CanvasSandbox.tsx`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/pages/CanvasSandbox.tsx) | Interactive practice sandbox with real-time technical telemetry bar |
| [`backend/tests/canvas_vector.test.js`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/tests/canvas_vector.test.js) | Automated unit test suite verifying normalization, boundary clamping, cross-resolution reprojection, and undo stack |

---

## 7. Testing & Verification

Executed automated test suite [`backend/tests/canvas_vector.test.js`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/tests/canvas_vector.test.js):
```text
=== Phase 4 Standalone Canvas Engine Test Suite ===

--- Test 1: Coordinate Normalization ---
✅ Center point (500, 350) -> { x: 0.5, y: 0.5 }
✅ Top-left origin (100, 50) -> { x: 0, y: 0 }
✅ Bottom-right corner (900, 650) -> { x: 1, y: 1 }
✅ Out-of-bounds coordinates safely clamped to [0.0, 1.0]

--- Test 2: Cross-Resolution Vector Reprojection ---
✅ Mobile 400x300 Reprojection: { screenX: 100, screenY: 225 }
✅ Desktop 4K 3840x2160 Reprojection: { screenX: 960, screenY: 1620 }

--- Test 3: Vector Stroke Buffer & Undo Stack ---
✅ 3 distinct vector strokes added to history stack
✅ Undo operation cleanly popped stroke ID: stroke_1792485167485_paain
✅ New stroke successfully appended after undo
✅ Canvas clear emptied the stroke history buffer
✅ Safe handling of undo on empty history

🎉 ALL PHASE 4 CANVAS VECTOR ENGINE TESTS PASSED!
```
- **Frontend Production Build:** `npm.cmd --prefix frontend run build` completed cleanly in `3.35s` with **0 errors**.

---

## 8. Technical Interview Preparation (5 Questions & Answers)

### Q1: Why use normalized floating-point coordinates instead of absolute pixel coordinates?
**Answer:** "In a multiplayer drawing game, players connect using devices with different screen resolutions, viewports, and aspect ratios (e.g. 1920×1080 desktop vs 800×600 tablet). If the drawer transmits absolute pixel coordinates $(x, y)$, strokes on a smaller screen will clip or appear stretched. By normalizing coordinates to floats between $0.0$ and $1.0$, each client device simply multiplies the normalized coordinate by their local canvas width and height, guaranteeing identical visual fidelity across all form factors."

### Q2: Why is vector stroke undo better than canvas `getImageData()` or `toDataURL()` snapshot undo?
**Answer:** "Storing full canvas bitmap snapshots (`ImageData` or base64 PNGs) consumes $300\text{ KB} - 1.5\text{ MB}$ of memory per stroke. With 30 strokes, a player's browser would allocate dozens of megabytes, leading to garbage collection pauses and stuttering. In contrast, our vector stroke format only stores coordinates $(\approx 16\text{ bytes per point})$, consuming under $5\text{ KB}$ for a complex drawing. Calling `undo()` simply pops the vector stroke from the array and redraws the canvas in $< 2\text{ms}$ with zero memory bloat."

### Q3: How do you prevent jagged, polygonal lines when the user draws rapidly?
**Answer:** "Browser pointer events fire at discrete intervals (typically 60Hz to 120Hz). Connecting these points directly with `lineTo` creates sharp, polygonal vertices. We smooth strokes using midpoint quadratic Bézier curve interpolation (`quadraticCurveTo`), where each curve uses the previous point as a control point and terminates at the midpoint between the current and next point. Combined with `lineCap = 'round'` and `lineJoin = 'round'`, this produces continuous calligraphy."

### Q4: How do you handle High-DPI / Retina displays to prevent canvas blurriness?
**Answer:** "Browsers render standard canvas pixels according to CSS dimensions, but high-density screens have a `devicePixelRatio` of 2 or 3. If an $800 \times 600$ CSS canvas is given a backing buffer of $800 \times 600$, the browser upscales it by $2\times$, resulting in fuzzy lines. We multiply the canvas's physical buffer width and height by `window.devicePixelRatio`, while keeping CSS dimensions at $100\%$, and apply `ctx.scale(dpr, dpr)` so drawing commands match CSS pixels at native screen sharpness."

### Q5: How do you prevent touch scrolling and gesture interference when drawing on mobile or touchscreens?
**Answer:** "We set CSS `touch-action: none` on the `<canvas>` element and call `(e.target as HTMLElement).setPointerCapture(e.pointerId)` on `pointerdown`. This tells the browser that pointer gestures belong exclusively to the canvas, disabling pinch-to-zoom, page panning, and pull-to-refresh gestures during active drawing."

---

## 9. Comparison with Java / Spring Boot / Desktop Technologies
- **HTML5 Canvas 2D Context:** Equivalent to Java AWT / Swing `Graphics2D` (`draw(Path2D)`, `setStroke(new BasicStroke(...))`) or JavaFX `Canvas.getGraphicsContext2D()`.
- **Vector Stroke History:** Analogous to the Command Pattern / Memento Pattern in desktop drawing software (e.g. Eclipse GEF or Java Swing Paint applications).
- **Normalized Coordinates:** Identical to standard 3D/2D computer graphics pipelines using Normalized Device Coordinates (NDC) before viewport transformation.
