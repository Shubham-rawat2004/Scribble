// Automated Test: Vector Stroke Engine, Coordinate Normalization & Undo History
const assert = require('assert');

console.log('=== Phase 4 Standalone Canvas Engine Test Suite ===\n');

// 1. Test Coordinate Normalization
function normalizePoint(clientX, clientY, rect) {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  return { x, y };
}

console.log('--- Test 1: Coordinate Normalization ---');
const rect = { left: 100, top: 50, width: 800, height: 600 };

// Center point
const centerPt = normalizePoint(500, 350, rect);
assert.strictEqual(centerPt.x, 0.5, 'Center X should be 0.5');
assert.strictEqual(centerPt.y, 0.5, 'Center Y should be 0.5');
console.log('✅ Center point (500, 350) ->', centerPt);

// Top-left origin
const originPt = normalizePoint(100, 50, rect);
assert.strictEqual(originPt.x, 0.0, 'Origin X should be 0.0');
assert.strictEqual(originPt.y, 0.0, 'Origin Y should be 0.0');
console.log('✅ Top-left origin (100, 50) ->', originPt);

// Bottom-right corner
const cornerPt = normalizePoint(900, 650, rect);
assert.strictEqual(cornerPt.x, 1.0, 'Corner X should be 1.0');
assert.strictEqual(cornerPt.y, 1.0, 'Corner Y should be 1.0');
console.log('✅ Bottom-right corner (900, 650) ->', cornerPt);

// Out-of-bounds clamping
const clampedNeg = normalizePoint(50, 20, rect);
assert.strictEqual(clampedNeg.x, 0.0, 'Negative coordinate clamped to 0.0');
assert.strictEqual(clampedNeg.y, 0.0, 'Negative coordinate clamped to 0.0');

const clampedExcess = normalizePoint(1200, 1000, rect);
assert.strictEqual(clampedExcess.x, 1.0, 'Excess coordinate clamped to 1.0');
assert.strictEqual(clampedExcess.y, 1.0, 'Excess coordinate clamped to 1.0');
console.log('✅ Out-of-bounds coordinates safely clamped to [0.0, 1.0]');

// 2. Test Cross-Resolution Reprojection (Phase 5 Foundation)
console.log('\n--- Test 2: Cross-Resolution Vector Reprojection ---');
function reprojectPoint(normalizedPt, targetWidth, targetHeight) {
  return {
    screenX: Math.round(normalizedPt.x * targetWidth),
    screenY: Math.round(normalizedPt.y * targetHeight),
  };
}

const testPt = { x: 0.25, y: 0.75 };
const mobileReproject = reprojectPoint(testPt, 400, 300);
assert.deepStrictEqual(mobileReproject, { screenX: 100, screenY: 225 });
console.log('✅ Mobile 400x300 Reprojection:', mobileReproject);

const desktop4kReproject = reprojectPoint(testPt, 3840, 2160);
assert.deepStrictEqual(desktop4kReproject, { screenX: 960, screenY: 1620 });
console.log('✅ Desktop 4K 3840x2160 Reprojection:', desktop4kReproject);

// 3. Test Vector Stroke Buffer & Undo Stack Operations
console.log('\n--- Test 3: Vector Stroke Buffer & Undo Stack ---');
let strokes = [];

function addStroke(tool, color, size, points) {
  const stroke = {
    id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tool,
    color,
    size,
    points,
  };
  strokes.push(stroke);
  return stroke;
}

function undoStroke() {
  if (strokes.length === 0) return null;
  return strokes.pop();
}

function clearStrokes() {
  strokes = [];
}

// Add Stroke 1: Brush red
addStroke('brush', '#ef130b', 10, [
  { x: 0.1, y: 0.1 },
  { x: 0.2, y: 0.2 },
  { x: 0.3, y: 0.3 },
]);
assert.strictEqual(strokes.length, 1);

// Add Stroke 2: Brush blue
addStroke('brush', '#231fd3', 20, [
  { x: 0.4, y: 0.4 },
  { x: 0.5, y: 0.5 },
]);
assert.strictEqual(strokes.length, 2);

// Add Stroke 3: Eraser
addStroke('eraser', '#ffffff', 36, [
  { x: 0.25, y: 0.25 },
]);
assert.strictEqual(strokes.length, 3);
console.log('✅ 3 distinct vector strokes added to history stack');

// Test Undo
const poppedStroke = undoStroke();
assert.strictEqual(poppedStroke.tool, 'eraser', 'Popped stroke should be eraser');
assert.strictEqual(strokes.length, 2, 'History stack should have 2 strokes remaining');
console.log('✅ Undo operation cleanly popped stroke ID:', poppedStroke.id);

// Add another stroke after undo
addStroke('brush', '#00cc00', 4, [{ x: 0.6, y: 0.6 }]);
assert.strictEqual(strokes.length, 3);
assert.strictEqual(strokes[2].color, '#00cc00');
console.log('✅ New stroke successfully appended after undo');

// Test Clear Canvas
clearStrokes();
assert.strictEqual(strokes.length, 0, 'Canvas clear should empty stroke array');
console.log('✅ Canvas clear emptied the stroke history buffer');

// Ensure undo on empty history does not crash
const emptyUndo = undoStroke();
assert.strictEqual(emptyUndo, null);
console.log('✅ Safe handling of undo on empty history');

console.log('\n🎉 ALL PHASE 4 CANVAS VECTOR ENGINE TESTS PASSED!');
