import { DrawStroke } from './canvas';

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
  isSpectator?: boolean;
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
  isSpectator?: boolean;
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

// Drawing Sync Data Contracts
export interface RemoteDrawStartPayload {
  roomId: string;
  stroke: {
    id: string;
    tool: 'brush' | 'eraser';
    color: string;
    size: number;
    points: { x: number; y: number }[];
  };
}

export interface RemoteDrawMovePayload {
  roomId: string;
  strokeId: string;
  points: { x: number; y: number }[];
}

export interface RemoteDrawEndPayload {
  roomId: string;
  strokeId: string;
}

export interface RemoteDrawUndoPayload {
  roomId: string;
}

export interface RemoteCanvasClearPayload {
  roomId: string;
}

// Phase 7: Real-Time Chat & Guess Verification Contracts
export type ChatMessageType =
  | 'CHAT'
  | 'SYSTEM'
  | 'SUCCESS'
  | 'SELF_SUCCESS'
  | 'CLOSE_HINT'
  | 'GUESSED_CHAT'
  | 'WARNING'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'ROOM_OWNER'
  | 'SYSTEM_INFO';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type: ChatMessageType;
  timestamp: number;
}

export interface PlayerGuessedPayload {
  roomId: string;
  playerId: string;
  playerName: string;
  guessOrder: number;
  pointsEarned?: number;
  newScore?: number;
}

// Phase 8: Dynamic Scoring & Live Leaderboard Contracts
export interface ScoreUpdatePayload {
  roomId: string;
  playerId: string;
  playerName?: string;
  pointsEarned: number;
  newScore: number;
}

export interface RoundScoreItem {
  playerId: string;
  playerName: string;
  avatarId: string;
  role: 'DRAWER' | 'GUESSER';
  pointsEarned: number;
  totalScore: number;
  guessedCorrectly: boolean;
}

export interface TurnEndPayload {
  roomId: string;
  secretWord: string;
  reason: string;
  scores?: PlayerDTO[];
  roundScores?: RoundScoreItem[];
  strokes?: DrawStroke[];
  drawerName?: string;
}

// Phase 9: Game Over, Victory Podium & Match Statistics Contracts
export interface GameOverPayload {
  roomId: string;
  winner: PlayerDTO;
  podium: PlayerDTO[];
  leaderboard: PlayerDTO[];
  totalRoundsPlayed: number;
}



