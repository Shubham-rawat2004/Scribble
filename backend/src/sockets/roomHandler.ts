import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  CreateRoomPayload,
  CreateRoomResponse,
  JoinRoomPayload,
  JoinRoomResponse,
  RoomSettings,
  StartGameResponse,
} from '../types/room.js';
import { RoomManager } from '../game/RoomManager.js';

const DEFAULT_SETTINGS: RoomSettings = {
  maxPlayers: 8,
  totalRounds: 3,
  drawTimeSeconds: 80,
  wordOptionsCount: 3,
  hintsAllowed: 2,
  isPrivate: false,
};

/**
 * Validates and sanitizes room creation parameters.
 */
function sanitizeSettings(input?: Partial<RoomSettings>): RoomSettings {
  const maxPlayers = Math.min(Math.max(Number(input?.maxPlayers) || DEFAULT_SETTINGS.maxPlayers, 2), 20);
  const totalRounds = Math.min(Math.max(Number(input?.totalRounds) || DEFAULT_SETTINGS.totalRounds, 2), 10);
  const drawTimeSeconds = Math.min(Math.max(Number(input?.drawTimeSeconds) || DEFAULT_SETTINGS.drawTimeSeconds, 15), 240);
  const wordOptionsCount = Math.min(Math.max(Number(input?.wordOptionsCount) || DEFAULT_SETTINGS.wordOptionsCount, 1), 5);
  const hintsAllowed = Math.min(Math.max(Number(input?.hintsAllowed) || DEFAULT_SETTINGS.hintsAllowed, 0), 5);
  const isPrivate = Boolean(input?.isPrivate);

  return {
    maxPlayers,
    totalRounds,
    drawTimeSeconds,
    wordOptionsCount,
    hintsAllowed,
    isPrivate,
  };
}

/**
 * Registers Room and Lobby socket event listeners.
 */
export function registerRoomHandlers(io: SocketIOServer, socket: Socket): void {
  const roomManager = RoomManager.getInstance();

  /**
   * Event: create_room
   * Host requests the creation of a new room with custom rules.
   */
  socket.on(
    'create_room',
    async (payload: CreateRoomPayload, callback?: (res: CreateRoomResponse) => void) => {
      try {
        const rawName = payload?.hostName?.trim();
        if (!rawName || rawName.length === 0) {
          const errorRes: CreateRoomResponse = { success: false, error: 'Nickname is required.' };
          if (typeof callback === 'function') callback(errorRes);
          return;
        }

        if (rawName.length > 30) {
          const errorRes: CreateRoomResponse = { success: false, error: 'Nickname must be under 30 characters.' };
          if (typeof callback === 'function') callback(errorRes);
          return;
        }

        const avatarId = payload.avatarId || 'avatar_1';
        const settings = sanitizeSettings(payload.settings);

        const { room, host } = await roomManager.createRoom(rawName, avatarId, settings, socket.id);
        await socket.join(room.id);

        const response: CreateRoomResponse = {
          success: true,
          roomId: room.id,
          room: room.toDTO(),
          player: host.toDTO(),
        };

        if (typeof callback === 'function') {
          callback(response);
        }
        socket.emit('room_created', response);

        console.log(`[Socket.IO] Host "${rawName}" created and joined room "${room.id}"`);
      } catch (err) {
        console.error('[Socket.IO] Error in create_room:', err);
        const errorRes: CreateRoomResponse = { success: false, error: 'Failed to create room. Please try again.' };
        if (typeof callback === 'function') callback(errorRes);
      }
    }
  );

  /**
   * Event: join_room
   * Player joins an existing room via room code or invite link.
   */
  socket.on(
    'join_room',
    async (payload: JoinRoomPayload, callback?: (res: JoinRoomResponse) => void) => {
      try {
        const rawCode = payload?.roomId?.trim().toUpperCase();
        const rawName = payload?.playerName?.trim();

        if (!rawCode || rawCode.length === 0) {
          const errorRes: JoinRoomResponse = { success: false, error: 'Room code is required.' };
          if (typeof callback === 'function') callback(errorRes);
          return;
        }

        if (!rawName || rawName.length === 0) {
          const errorRes: JoinRoomResponse = { success: false, error: 'Nickname is required.' };
          if (typeof callback === 'function') callback(errorRes);
          return;
        }

        if (rawName.length > 30) {
          const errorRes: JoinRoomResponse = { success: false, error: 'Nickname must be under 30 characters.' };
          if (typeof callback === 'function') callback(errorRes);
          return;
        }

        const avatarId = payload.avatarId || 'avatar_1';

        // Join room in RoomManager
        const { room, player } = await roomManager.joinRoom(rawCode, rawName, avatarId, socket.id);
        await socket.join(room.id);

        const allPlayers = room.getPlayerList().map((p) => p.toDTO());

        // Broadcast to all existing players in the room (including host)
        socket.to(room.id).emit('player_joined', {
          player: player.toDTO(),
          players: allPlayers,
        });

        const response: JoinRoomResponse = {
          success: true,
          roomId: room.id,
          room: room.toDTO(),
          player: player.toDTO(),
        };

        if (typeof callback === 'function') {
          callback(response);
        }

        console.log(`[Socket.IO] Player "${rawName}" joined room "${room.id}" (Total: ${allPlayers.length})`);
      } catch (err) {
        const message = (err as Error).message || 'Failed to join room.';
        console.warn(`[Socket.IO] join_room failed: ${message}`);
        const errorRes: JoinRoomResponse = { success: false, error: message };
        if (typeof callback === 'function') callback(errorRes);
      }
    }
  );

  /**
   * Event: start_game
   * Host requests to start the game from the lobby.
   */
  socket.on(
    'start_game',
    async (payload: { roomId?: string }, callback?: (res: StartGameResponse) => void) => {
      try {
        const lookup = roomManager.getPlayerBySocket(socket.id);
        const targetRoomId = payload?.roomId || lookup?.room.id;

        if (!targetRoomId) {
          const errorRes: StartGameResponse = { success: false, error: 'No room found for this socket.' };
          if (typeof callback === 'function') callback(errorRes);
          return;
        }

        const { room, session } = await roomManager.startGame(targetRoomId, socket.id);

        // Broadcast game_started / start_game to ALL participants in the room
        io.to(room.id).emit('start_game', {
          roomId: room.id,
          session,
          room: room.toDTO(),
        });
        io.to(room.id).emit('game_started', {
          roomId: room.id,
          session,
        });

        if (typeof callback === 'function') {
          callback({ success: true, sessionId: session.sessionId, currentDrawerId: session.currentDrawerId });
        }

        console.log(`[Socket.IO] Game started in room "${room.id}" (Session: ${session.sessionId})`);
      } catch (err) {
        const message = (err as Error).message || 'Failed to start game.';
        console.warn(`[Socket.IO] start_game failed: ${message}`);
        const errorRes: StartGameResponse = { success: false, error: message };
        if (typeof callback === 'function') callback(errorRes);
      }
    }
  );

  /**
   * Socket disconnect event: notifies room participants and updates rosters.
   */
  socket.on('disconnect', async () => {
    try {
      const result = await roomManager.handleDisconnect(socket.id);
      if (result.room && result.player && result.wasRemoved) {
        const remainingPlayers = result.room.getPlayerList().map((p) => p.toDTO());
        io.to(result.room.id).emit('player_left', {
          playerId: result.player.id,
          players: remainingPlayers,
          newHostId: result.newHost?.id,
        });
        console.log(
          `[Socket.IO] Emitted player_left for ${result.player.name} in room ${result.room.id}. Remaining: ${remainingPlayers.length}`
        );
      }
    } catch (err) {
      console.error('[Socket.IO] Error handling socket disconnect:', err);
    }
  });
}
