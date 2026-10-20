export interface CanvasPoint {
  x: number; // Normalized coordinate [0.0 - 1.0]
  y: number; // Normalized coordinate [0.0 - 1.0]
}

export type DrawingTool = 'brush' | 'eraser';

export interface DrawStroke {
  id: string; // Unique stroke UUID
  tool: DrawingTool;
  color: string; // Hex color code (e.g. '#000000', '#ffffff')
  size: number; // Brush diameter in logical pixels (4, 10, 20, 36)
  points: CanvasPoint[];
}

export interface CanvasState {
  strokes: DrawStroke[];
  currentStroke: DrawStroke | null;
  tool: DrawingTool;
  color: string;
  size: number;
}

export const SKRIBBL_PALETTE: string[][] = [
  // Row 1 (11 colors)
  [
    '#ffffff', // White
    '#c1c1c1', // Light Gray
    '#ef130b', // Red
    '#ff7100', // Orange
    '#ffe400', // Yellow
    '#00cc00', // Green
    '#00b2ff', // Cyan / Light Blue
    '#231fd3', // Blue
    '#a300ba', // Purple
    '#df69a7', // Pink
    '#a0522d', // Brown
  ],
  // Row 2 (11 colors)
  [
    '#000000', // Black
    '#4c4c4c', // Dark Gray
    '#740b07', // Dark Red
    '#c23800', // Dark Orange
    '#e8a200', // Gold / Dark Yellow
    '#005510', // Dark Green
    '#00569e', // Dark Cyan
    '#0e0865', // Dark Blue
    '#550069', // Dark Purple
    '#a75574', // Dark Pink
    '#63300d', // Dark Brown
  ],
];

export const BRUSH_SIZES = [
  { id: 'small', label: 'Small', size: 4 },
  { id: 'medium', label: 'Medium', size: 10 },
  { id: 'large', label: 'Large', size: 20 },
  { id: 'xlarge', label: 'Extra Large', size: 36 },
] as const;
