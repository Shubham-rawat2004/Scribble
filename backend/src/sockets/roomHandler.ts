import { Server as SocketIOServer, Socket } from 'socket.io';
import {
  CreateRoomPayload,
  CreateRoomResponse,
  JoinRoomPayload,
  JoinRoomResponse,
  PlayerDTO,
  RoomSettings,
  StartGameResponse,
} from '../types/room.js';
import { RoomManager } from '../game/RoomManager.js';
import { Room } from '../game/Room.js';
import { Player } from '../game/Player.js';
import { HintManager } from '../game/HintManager.js';
import { triggerWordSelection, handlePlayerLeftGameCheck } from './gameHandler.js';
import crypto from 'crypto';

// Map of active countdowns for public rooms: roomId -> { timer, secondsLeft }
const publicLobbyCountdowns = new Map<string, { timer: NodeJS.Timeout; secondsLeft: number }>();

export function clearLobbyCountdown(io: SocketIOServer, roomId: string, broadcastCancel: boolean = false) {
  const existing = publicLobbyCountdowns.get(roomId);
  if (existing) {
    clearInterval(existing.timer);
    publicLobbyCountdowns.delete(roomId);
    if (broadcastCancel) {
      io.to(roomId).emit('lobby_countdown_cancelled', { reason: 'Waiting for players...' });
    }
  }
}

export function checkAndTriggerPublicCountdown(io: SocketIOServer, room: Room) {
  // Only public rooms in LOBBY state
  if (room.settings.isPrivate || room.status !== 'LOBBY') return;

  if (room.players.size >= 2) {
    if (!publicLobbyCountdowns.has(room.id)) {
      let secondsLeft = 10;
      console.log(`[Lobby] Public room ${room.id} assembled ${room.players.size} players. Starting 10s auto-start countdown.`);
      io.to(room.id).emit('lobby_countdown', { countdown: secondsLeft });

      const timer = setInterval(async () => {
        secondsLeft--;
        if (secondsLeft > 0) {
          io.to(room.id).emit('lobby_countdown', { countdown: secondsLeft });
        } else {
          clearLobbyCountdown(io, room.id);
          console.log(`[Lobby] Countdown finished for public room ${room.id}! Auto-starting match...`);
          await startMatch(io, room.id);
        }
      }, 1000);

      publicLobbyCountdowns.set(room.id, { timer, secondsLeft });
    }
  } else {
    // If dropped below 2 players, cancel countdown
    clearLobbyCountdown(io, room.id, true);
  }
}

export async function startMatch(
  io: SocketIOServer,
  roomId: string,
  socketId?: string
): Promise<{ success: boolean; sessionId?: string; currentDrawerId?: string | null; error?: string }> {
  const roomManager = RoomManager.getInstance();
  try {
    clearLobbyCountdown(io, roomId);
    const { room, session } = await roomManager.startGame(roomId, socketId);

    // Broadcast game_started / start_game to ALL participants in the room
    const roomDTO = room.toDTO();
    io.to(room.id).emit('start_game', {
      roomId: room.id,
      session,
      room: roomDTO,
    });
    io.to(room.id).emit('game_started', {
      roomId: room.id,
      session,
      room: roomDTO,
    });

    console.log(`[Socket.IO] Game started in room "${room.id}" (Session: ${session.sessionId})`);

    setTimeout(() => {
      triggerWordSelection(io, room.id);
    }, 600);

    return { success: true, sessionId: session.sessionId, currentDrawerId: session.currentDrawerId };
  } catch (err) {
    const message = (err as Error).message || 'Failed to start game.';
    console.warn(`[Socket.IO] startMatch failed for ${roomId}: ${message}`);
    return { success: false, error: message };
  }
}

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

  let customWords: string[] | undefined = undefined;
  if (Array.isArray(input?.customWords)) {
    customWords = input.customWords
      .map((w) => String(w).trim().toLowerCase())
      .filter((w) => w.length >= 2 && w.length <= 30 && /^[a-zA-Z\s-]+$/.test(w));
    if (customWords.length === 0) customWords = undefined;
  }

  return {
    maxPlayers,
    totalRounds,
    drawTimeSeconds,
    wordOptionsCount,
    hintsAllowed,
    isPrivate,
    customWords,
    customWordsOnly: Boolean(input?.customWordsOnly),
    language: typeof input?.language === 'string' ? input.language : 'English',
    gameMode: typeof input?.gameMode === 'string' ? input.gameMode : 'Normal',
  };
}

/**
 * Helper function: Handles player join logic for both LOBBY and active PLAYING matches (late joining).
 */
function handlePlayerJoinedRoom(
  io: SocketIOServer,
  socket: Socket,
  room: Room,
  player: Player,
  callback?: (res: JoinRoomResponse) => void
) {
  const roomManager = RoomManager.getInstance();
  const allPlayers = room.getPlayerList().map((p) => p.toDTO());

  // Broadcast to all existing players in the room
  socket.to(room.id).emit('player_joined', {
    player: player.toDTO(),
    players: allPlayers,
  });

  const turnManager = roomManager.getTurnManager(room.id);
  const isSolvedOrDrawer = Boolean(
    turnManager && (turnManager.hasPlayerGuessed(player.id) || turnManager.currentDrawerId === player.id)
  );

  // 1. Send existing chat history to the joining player (hiding solved-only messages if unsolved)
  socket.emit('chat_history', {
    roomId: room.id,
    messages: room.getChatHistory(isSolvedOrDrawer),
  });

  // 2. Announce in room chat: "[Player] joined the room!" (Skribbl-style green feed)
  const joinMsg = {
    id: crypto.randomUUID(),
    senderId: 'system',
    senderName: 'System',
    text: `${player.name} joined the room!`,
    type: 'PLAYER_JOINED',
    timestamp: Date.now(),
  };
  room.addChatMessage(joinMsg);
  io.to(room.id).emit('chat_message', joinMsg);

  if (room.status === 'LOBBY') {
    checkAndTriggerPublicCountdown(io, room);
  } else if (room.status === 'PLAYING') {
    // Add late-joining player to current round rotation
    if (turnManager) {
      turnManager.addPlayerToTurn(player.id);
      if (isSolvedOrDrawer) {
        socket.join(`room_${room.id}_solved`);
      }
    }

    // Hydrate existing canvas strokes for the newly joined guesser
    socket.emit('canvas_init', {
      roomId: room.id,
      strokes: room.getStrokeHistory(),
    });

    // Sync current turn phase (masked word for guesser, or choosing banner)
    if (turnManager && turnManager.turnPhase === 'DRAWING') {
      socket.emit('turn_start', {
        role: 'GUESSER',
        drawerId: turnManager.currentDrawerId,
        wordMask: HintManager.formatMaskString(turnManager.currentMask),
        wordLength: room.settings.gameMode === 'Hidden' ? 0 : (turnManager.secretWord ? turnManager.secretWord.length : 0),
        drawTimeSeconds: turnManager.timeRemaining,
        currentRound: turnManager.currentRound,
        totalRounds: room.settings.totalRounds,
        currentTurn: turnManager.currentTurn,
        totalTurnsInRound: room.players.size,
        gameMode: room.settings.gameMode || 'Normal',
      });
    } else if (turnManager && turnManager.turnPhase === 'WORD_SELECTION') {
      const drawer = room.getPlayer(turnManager.currentDrawerId || '');
      socket.emit('drawer_choosing_word', {
        roomId: room.id,
        drawerId: drawer?.id,
        drawerName: drawer?.name || 'Drawer',
        durationSeconds: 15,
      });
    }
  }

  const response: JoinRoomResponse = {
    success: true,
    roomId: room.id,
    room: room.toDTO(),
    player: player.toDTO(),
    session: room.status === 'PLAYING' && turnManager ? {
      sessionId: turnManager.sessionId,
      roomId: room.id,
      status: 'IN_PROGRESS',
      currentDrawerId: room.currentDrawerId,
      startedAt: new Date().toISOString(),
    } : undefined,
  };

  if (typeof callback === 'function') {
    callback(response);
  }

  console.log(`[Socket.IO] Player "${player.name}" joined room "${room.id}" (Status: ${room.status}, Total: ${allPlayers.length})`);
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

        // Skribbl-style room creation & minimum player feed notices
        const ownerMsg = {
          id: crypto.randomUUID(),
          senderId: 'system',
          senderName: 'System',
          text: `${rawName} is now the room owner!`,
          type: 'ROOM_OWNER',
          timestamp: Date.now(),
        };
        room.addChatMessage(ownerMsg);
        socket.emit('chat_message', ownerMsg);

        const needPlayersMsg = {
          id: crypto.randomUUID(),
          senderId: 'system',
          senderName: 'System',
          text: 'You need at least 2 players to start the game!',
          type: 'SYSTEM_INFO',
          timestamp: Date.now() + 1,
        };
        room.addChatMessage(needPlayersMsg);
        socket.emit('chat_message', needPlayersMsg);

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

        handlePlayerJoinedRoom(io, socket, room, player, callback);
      } catch (err) {
        const message = (err as Error).message || 'Failed to join room.';
        console.warn(`[Socket.IO] join_room failed: ${message}`);
        const errorRes: JoinRoomResponse = { success: false, error: message };
        if (typeof callback === 'function') callback(errorRes);
      }
    }
  );

  /**
   * Event: quick_play
   * Public room matchmaking: joins an existing open public lobby, active match with space, or spins up a new one.
   */
  socket.on(
    'quick_play',
    async (
      data: { playerName: string; avatarId?: string },
      callback?: (res: JoinRoomResponse) => void
    ) => {
      try {
        const rawName = (data?.playerName || 'Player').trim();
        const avatarId = data?.avatarId || 'skribbl_0_0_0';

        const openRoom = roomManager.findOpenPublicRoom();
        if (openRoom) {
          const { room, player } = await roomManager.joinRoom(openRoom.id, rawName, avatarId, socket.id);
          await socket.join(room.id);
          handlePlayerJoinedRoom(io, socket, room, player, callback);
          console.log(`[Socket.IO] Matchmaking: "${rawName}" matched into public room "${room.id}" (Status: ${room.status})`);
        } else {
          const { room, host } = await roomManager.createRoom(
            rawName,
            avatarId,
            { isPrivate: false, maxPlayers: 8, totalRounds: 3, drawTimeSeconds: 80, wordOptionsCount: 3, hintsAllowed: 2 },
            socket.id
          );
          await socket.join(room.id);

          // Skribbl-style room creation & minimum player notices
          const ownerMsg = {
            id: crypto.randomUUID(),
            senderId: 'system',
            senderName: 'System',
            text: `${rawName} is now the room owner!`,
            type: 'ROOM_OWNER',
            timestamp: Date.now(),
          };
          room.addChatMessage(ownerMsg);
          socket.emit('chat_message', ownerMsg);

          const needPlayersMsg = {
            id: crypto.randomUUID(),
            senderId: 'system',
            senderName: 'System',
            text: 'You need at least 2 players to start the game!',
            type: 'SYSTEM_INFO',
            timestamp: Date.now() + 1,
          };
          room.addChatMessage(needPlayersMsg);
          socket.emit('chat_message', needPlayersMsg);

          console.log(`[Socket.IO] Matchmaking: Created new public room "${room.id}" for host "${rawName}"`);
          if (typeof callback === 'function') {
            callback({ success: true, roomId: room.id, room: room.toDTO(), player: host.toDTO() });
          }
        }
      } catch (err) {
        const message = (err as Error).message || 'Failed to match into room.';
        console.warn(`[Socket.IO] quick_play failed: ${message}`);
        if (typeof callback === 'function') {
          callback({ success: false, error: message });
        }
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

        const res = await startMatch(io, targetRoomId, socket.id);
        if (typeof callback === 'function') {
          if (res.success) {
            callback({ success: true, sessionId: res.sessionId, currentDrawerId: res.currentDrawerId });
          } else {
            callback({ success: false, error: res.error });
          }
        }
      } catch (err) {
        const message = (err as Error).message || 'Failed to start game.';
        console.warn(`[Socket.IO] start_game failed: ${message}`);
        const errorRes: StartGameResponse = { success: false, error: message };
        if (typeof callback === 'function') callback(errorRes);
      }
    }
  );

  /**
   * Event: kick_player
   * Host moderates room by kicking a player from the lobby or match.
   */
  socket.on(
    'kick_player',
    async (
      data: { roomId: string; targetPlayerId: string },
      callback?: (res: { success: boolean; error?: string }) => void
    ) => {
      try {
        if (!data || !data.roomId || !data.targetPlayerId) {
          if (callback) callback({ success: false, error: 'Invalid parameters.' });
          return;
        }

        const room = roomManager.getRoom(data.roomId);
        if (!room) {
          if (callback) callback({ success: false, error: 'Room not found.' });
          return;
        }

        const hostPlayer = room.getPlayerBySocket(socket.id);
        if (!hostPlayer || !hostPlayer.isHost) {
          if (callback) callback({ success: false, error: 'Only the host can kick players.' });
          return;
        }

        const targetPlayer = room.getPlayer(data.targetPlayerId);
        if (!targetPlayer) {
          if (callback) callback({ success: false, error: 'Target player not found in room.' });
          return;
        }

        if (targetPlayer.isHost) {
          if (callback) callback({ success: false, error: 'Cannot kick the room host.' });
          return;
        }

        const targetSocketId = roomManager.getSocketIdByPlayerId(targetPlayer.id);

        // Remove target player from in-memory room and MySQL
        await roomManager.kickPlayer(room.id, targetPlayer.id);

        // Notify target client directly that they were kicked
        if (targetSocketId) {
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            targetSocket.emit('kicked', { reason: 'You were kicked from the room by the host.' });
            targetSocket.leave(room.id);
          }
        }

        // Broadcast player_left to remaining participants
        const remainingPlayers = room.getPlayerList().map((p) => p.toDTO());
        io.to(room.id).emit('player_left', {
          playerId: targetPlayer.id,
          players: remainingPlayers,
        });

        // Announce player left in room chat
        const leaveMsg = {
          id: crypto.randomUUID(),
          senderId: 'system',
          senderName: 'System',
          text: `${targetPlayer.name} left the room!`,
          type: 'PLAYER_LEFT',
          timestamp: Date.now(),
        };
        room.addChatMessage(leaveMsg);
        io.to(room.id).emit('chat_message', leaveMsg);

        checkAndTriggerPublicCountdown(io, room);
        await handlePlayerLeftGameCheck(io, room, targetPlayer.id);

        console.log(`[Socket.IO] Host "${hostPlayer.name}" kicked "${targetPlayer.name}" from room "${room.id}"`);
        if (callback) callback({ success: true });
      } catch (err) {
        console.error('[Socket.IO] Error in kick_player:', err);
        if (callback) callback({ success: false, error: 'Failed to kick player.' });
      }
    }
  );

  /**
   * Event: vote_kick
   * Democratic votekick: any player can vote to kick. If >= 50% threshold reached, player is kicked.
   */
  socket.on(
    'vote_kick',
    async (
      data: { roomId: string; targetPlayerId: string },
      callback?: (res: { success: boolean; error?: string; votes?: number; threshold?: number }) => void
    ) => {
      try {
        if (!data || !data.roomId || !data.targetPlayerId) {
          if (callback) callback({ success: false, error: 'Invalid parameters.' });
          return;
        }

        const room = roomManager.getRoom(data.roomId);
        if (!room) {
          if (callback) callback({ success: false, error: 'Room not found.' });
          return;
        }

        const voter = room.getPlayerBySocket(socket.id);
        if (!voter) {
          if (callback) callback({ success: false, error: 'Voter not recognized.' });
          return;
        }

        const target = room.getPlayer(data.targetPlayerId);
        if (!target) {
          if (callback) callback({ success: false, error: 'Target player not found.' });
          return;
        }

        if (voter.id === target.id) {
          if (callback) callback({ success: false, error: 'You cannot vote to kick yourself.' });
          return;
        }

        const { votes, threshold, passed } = room.voteKick(voter.id, target.id);

        if (passed) {
          const targetSocketId = roomManager.getSocketIdByPlayerId(target.id);
          await roomManager.kickPlayer(room.id, target.id);

          if (targetSocketId) {
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
              targetSocket.emit('kicked', { reason: 'You were kicked from the room by vote.' });
              targetSocket.leave(room.id);
            }
          }

          const remainingPlayers = room.getPlayerList().map((p) => p.toDTO());
          io.to(room.id).emit('player_left', {
            playerId: target.id,
            players: remainingPlayers,
          });

          const kickMsg = {
            id: crypto.randomUUID(),
            senderId: 'system',
            senderName: 'System',
            text: `${target.name} was kicked from the room by vote!`,
            type: 'PLAYER_LEFT',
            timestamp: Date.now(),
          };
          room.addChatMessage(kickMsg);
          io.to(room.id).emit('chat_message', kickMsg);

          checkAndTriggerPublicCountdown(io, room);
          await handlePlayerLeftGameCheck(io, room, target.id);
          console.log(`[Socket.IO] Target "${target.name}" kicked by democratic vote (${votes}/${threshold})`);
          if (callback) callback({ success: true, votes, threshold });
        } else {
          // Announce vote progress in chat feed
          const voteNotice = {
            id: crypto.randomUUID(),
            senderId: 'system',
            senderName: 'System',
            text: `${voter.name} voted to kick ${target.name} (${votes}/${threshold})`,
            type: 'SYSTEM_INFO',
            timestamp: Date.now(),
          };
          room.addChatMessage(voteNotice);
          io.to(room.id).emit('chat_message', voteNotice);

          console.log(`[Socket.IO] Votekick progress for "${target.name}": ${votes}/${threshold}`);
          if (callback) callback({ success: true, votes, threshold });
        }
      } catch (err) {
        console.error('[Socket.IO] Error in vote_kick:', err);
        if (callback) callback({ success: false, error: 'Failed to process vote.' });
      }
    }
  );

  /**
   * Event: get_room_players
   * Provides immediate synchronization of active players in the room.
   */
  socket.on(
    'get_room_players',
    (data: { roomId: string }, callback?: (res: { players: PlayerDTO[] }) => void) => {
      const room = roomManager.getRoom(data?.roomId);
      const players = room ? room.getPlayerList().map((p) => p.toDTO()) : [];
      if (typeof callback === 'function') {
        callback({ players });
      }
    }
  );

  /**
   * Event: leave_room
   * Explicit leave room event triggered when a player clicks "Leave" or "Main Menu".
   */
  socket.on(
    'leave_room',
    async (data?: { roomId?: string }, callback?: (res: { success: boolean }) => void) => {
      try {
        const result = await roomManager.handleDisconnect(socket.id);
        if (result.room && result.player && result.wasRemoved) {
          socket.leave(result.room.id);
          const remainingPlayers = result.room.getPlayerList().map((p) => p.toDTO());
          io.to(result.room.id).emit('player_left', {
            playerId: result.player.id,
            players: remainingPlayers,
            newHostId: result.newHost?.id,
          });

          // Announce player left in room chat
          const leaveMsg = {
            id: crypto.randomUUID(),
            senderId: 'system',
            senderName: 'System',
            text: `${result.player.name} left the room!`,
            type: 'PLAYER_LEFT',
            timestamp: Date.now(),
          };
          result.room.addChatMessage(leaveMsg);
          io.to(result.room.id).emit('chat_message', leaveMsg);

          if (result.newHost) {
            const newHostMsg = {
              id: crypto.randomUUID(),
              senderId: 'system',
              senderName: 'System',
              text: `${result.newHost.name} is now the room owner!`,
              type: 'ROOM_OWNER',
              timestamp: Date.now() + 1,
            };
            result.room.addChatMessage(newHostMsg);
            io.to(result.room.id).emit('chat_message', newHostMsg);
          }

          checkAndTriggerPublicCountdown(io, result.room);
          await handlePlayerLeftGameCheck(io, result.room, result.player.id);
          console.log(
            `[Socket.IO] Processed leave_room for ${result.player.name} in room ${result.room.id}. Remaining: ${remainingPlayers.length}`
          );
        }
        if (typeof callback === 'function') {
          callback({ success: true });
        }
      } catch (err) {
        console.error('[Socket.IO] Error handling leave_room:', err);
        if (typeof callback === 'function') {
          callback({ success: false });
        }
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

        // Announce player left in room chat
        const leaveMsg = {
          id: crypto.randomUUID(),
          senderId: 'system',
          senderName: 'System',
          text: `${result.player.name} left the room!`,
          type: 'PLAYER_LEFT',
          timestamp: Date.now(),
        };
        result.room.addChatMessage(leaveMsg);
        io.to(result.room.id).emit('chat_message', leaveMsg);

        if (result.newHost) {
          const newHostMsg = {
            id: crypto.randomUUID(),
            senderId: 'system',
            senderName: 'System',
            text: `${result.newHost.name} is now the room owner!`,
            type: 'ROOM_OWNER',
            timestamp: Date.now() + 1,
          };
          result.room.addChatMessage(newHostMsg);
          io.to(result.room.id).emit('chat_message', newHostMsg);
        }

        checkAndTriggerPublicCountdown(io, result.room);
        await handlePlayerLeftGameCheck(io, result.room, result.player.id);
        console.log(
          `[Socket.IO] Emitted player_left for ${result.player.name} in room ${result.room.id}. Remaining: ${remainingPlayers.length}`
        );
      }
    } catch (err) {
      console.error('[Socket.IO] Error handling socket disconnect:', err);
    }
  });
}
