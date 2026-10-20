export interface RoomSettings {
  maxPlayers: number;       // 2 to 20
  totalRounds: number;      // 2 to 10
  drawTimeSeconds: number;  // 15 to 240
  wordOptionsCount: number; // 1 to 5
  hintsAllowed: number;     // 0 to 5
  isPrivate: boolean;
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
