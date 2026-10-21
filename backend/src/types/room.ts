export interface RoomSettings {
  maxPlayers: number;       // 2 to 20
  totalRounds: number;      // 2 to 10
  drawTimeSeconds: number;  // 15 to 240
  wordOptionsCount: number; // 1 to 5
  hintsAllowed: number;     // 0 to 5
  isPrivate: boolean;
  customWords?: string[];
  customWordsOnly?: boolean;
  language?: string;
  gameMode?: string;
}

export type RoomStatus = 'LOBBY' | 'PLAYING' | 'FINISHED' | 'ABANDONED';

export interface PlayerDTO {
  id: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  score: number;
  isConnected: boolean;
}

export interface DrawPoint {
  x: number; // Normalized coordinate [0.0 - 1.0]
  y: number; // Normalized coordinate [0.0 - 1.0]
}

export interface DrawStrokeDTO {
  id: string;
  tool: 'brush' | 'eraser';
  color: string;
  size: number;
  points: DrawPoint[];
}

export interface RoomDTO {
  id: string;
  name: string;
  hostName: string;
  hostPlayerId: string;
  settings: RoomSettings;
  status: RoomStatus;
  players: PlayerDTO[];
  currentDrawerId?: string | null;
  createdAt: string;
}

export interface CreateRoomPayload {
  hostName: string;
  avatarId?: string;
  settings?: Partial<RoomSettings>;
}

export interface CreateRoomResponse {
  success: boolean;
  roomId?: string;
  room?: RoomDTO;
  player?: PlayerDTO;
  error?: string;
}

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
  avatarId?: string;
}

export interface JoinRoomResponse {
  success: boolean;
  roomId?: string;
  room?: RoomDTO;
  player?: PlayerDTO;
  session?: GameSessionDTO;
  error?: string;
}

export interface GameSessionDTO {
  sessionId: string;
  roomId: string;
  status: string;
  currentDrawerId?: string | null;
  startedAt: string;
}

export interface StartGameResponse {
  success: boolean;
  sessionId?: string;
  currentDrawerId?: string | null;
  error?: string;
}

// --- Drawing WebSocket Protocols ---
export interface DrawStartPayload {
  roomId: string;
  stroke: DrawStrokeDTO;
}

export interface DrawMovePayload {
  roomId: string;
  strokeId: string;
  points: DrawPoint[];
}

export interface DrawEndPayload {
  roomId: string;
  strokeId: string;
}

export interface DrawUndoPayload {
  roomId: string;
}

export interface CanvasClearPayload {
  roomId: string;
}

export interface GameOverPayload {
  roomId: string;
  winner: PlayerDTO | null;
  podium: PlayerDTO[];
  leaderboard: PlayerDTO[];
  totalRoundsPlayed: number;
  reason?: string;
  message?: string;
  winnerByDefault?: boolean;
}
