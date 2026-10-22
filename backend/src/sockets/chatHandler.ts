import { Server as SocketIOServer, Socket } from 'socket.io';
import { RoomManager } from '../game/RoomManager.js';
import { GuessManager } from '../game/GuessManager.js';
import { ScoringEngine } from '../game/ScoringEngine.js';
import crypto from 'crypto';

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

export interface ChatMessageDTO {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type: ChatMessageType;
  timestamp: number;
}

/**
 * Registers real-time chat, guess verification, anti-cheat, and fuzzy matching handlers.
 */
export function registerChatHandlers(io: SocketIOServer, socket: Socket) {
  const roomManager = RoomManager.getInstance();

  socket.on(
    'send_chat_message',
    (data: { roomId: string; text: string }, callback?: (res: { success: boolean; error?: string }) => void) => {
      if (!data || !data.roomId || !data.text || typeof data.text !== 'string') {
        if (callback) callback({ success: false, error: 'Invalid message payload' });
        return;
      }

      const text = data.text.trim();
      if (text.length === 0 || text.length > 150) {
        if (callback) callback({ success: false, error: 'Message must be between 1 and 150 characters' });
        return;
      }

      const room = roomManager.getRoom(data.roomId);
      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found' });
        return;
      }

      const player = room.getPlayerBySocket(socket.id);
      if (!player) {
        if (callback) callback({ success: false, error: 'Player not recognized in room' });
        return;
      }

      const turnManager = roomManager.getTurnManager(room.id);
      const isDrawer = room.currentDrawerId === player.id;
      const hasAlreadyGuessed = turnManager ? turnManager.hasPlayerGuessed(player.id) : false;
      const secretWord =
        turnManager && turnManager.turnPhase === 'DRAWING' ? turnManager.secretWord : null;

      // Evaluate message against game rules
      const evalResult = GuessManager.evaluateMessage(
        text,
        secretWord,
        isDrawer,
        hasAlreadyGuessed
      );

      const msgId = crypto.randomUUID();
      const now = Date.now();

      switch (evalResult.classification) {
        case 'DRAWER_CHEAT': {
          // Drawer attempted to chat or guess while drawing turn is active
          const warnText = evalResult.warning || 'You cannot chat while drawing!';
          socket.emit('drawer_cheat_warning', {
            warning: warnText,
          });
          socket.emit('chat_message', {
            id: msgId,
            senderId: 'system',
            senderName: 'System',
            text: `⚠️ ${warnText}`,
            type: 'WARNING',
            timestamp: now,
          });
          if (callback) callback({ success: false, error: warnText });
          return;
        }

        case 'CORRECT_GUESS': {
          // Immediately join the solved players chat channel
          socket.join(`room_${room.id}_solved`);

          // Guesser solved the secret word!
          if (!turnManager) return;

          const { isAllGuessed, guessOrder } = turnManager.markPlayerGuessed(player.id);

          // Calculate score based on remaining time and arrival order
          const drawTime = room.settings.drawTimeSeconds || 80;
          const scoreResult = ScoringEngine.calculateGuesserScore(
            turnManager.timeRemaining,
            drawTime,
            guessOrder
          );
          const newTotalScore = turnManager.awardGuesserPoints(
            player.id,
            scoreResult.totalPoints,
            scoreResult.basePoints
          );

          // 1. Send success event to room
          io.to(room.id).emit('player_guessed_correct', {
            roomId: room.id,
            playerId: player.id,
            playerName: player.name,
            guessOrder,
            pointsEarned: scoreResult.totalPoints,
            newScore: newTotalScore,
          });

          // 2. Broadcast live score update for real-time leaderboard
          io.to(room.id).emit('score_update', {
            roomId: room.id,
            playerId: player.id,
            playerName: player.name,
            pointsEarned: scoreResult.totalPoints,
            newScore: newTotalScore,
          });

          // 3. Broadcast green celebration banner to room (hiding exact word)
          const isFirstGuesser = guessOrder === 1;
          const broadcastText = `${player.name} guessed the word!`;

          const successMsg: ChatMessageDTO = {
            id: msgId,
            senderId: 'system',
            senderName: 'System',
            text: broadcastText,
            type: 'SUCCESS',
            timestamp: now,
          };
          room.addChatMessage(successMsg);
          io.to(room.id).emit('chat_message', successMsg);

          // 4. Send private celebration to the solver
          const selfText = isFirstGuesser
            ? `🥇 You guessed the word first! (+${scoreResult.totalPoints} pts)`
            : `🎉 You guessed the word! (+${scoreResult.totalPoints} pts)`;

          socket.emit('chat_message', {
            id: crypto.randomUUID(),
            senderId: 'system',
            senderName: 'System',
            text: selfText,
            type: 'SELF_SUCCESS',
            timestamp: now,
          });

          if (callback) callback({ success: true });

          // 5. Early turn termination if all eligible guessers have solved
          if (isAllGuessed) {
            console.log(`[TurnManager] All players in room ${room.id} have guessed the word! Ending turn early.`);
            turnManager.endTurnEarly('ALL_GUESSED');
          }
          return;
        }

        case 'CLOSE_GUESS': {
          // Broadcast normal wrong guess to the room
          const wrongMsg: ChatMessageDTO = {
            id: msgId,
            senderId: player.id,
            senderName: player.name,
            text,
            type: 'CHAT',
            timestamp: now,
          };
          room.addChatMessage(wrongMsg);
          io.to(room.id).emit('chat_message', wrongMsg);

          // Send private "You're close!" alert only to this player
          socket.emit('close_guess', { text: "You're close!" });
          socket.emit('chat_message', {
            id: crypto.randomUUID(),
            senderId: 'system',
            senderName: 'System',
            text: `⚠️ You're close!`,
            type: 'CLOSE_HINT',
            timestamp: now,
          });

          if (callback) callback({ success: true });
          return;
        }

        case 'ALREADY_GUESSED': {
          // Ensure sender socket is in the solved chat channel
          socket.join(`room_${room.id}_solved`);

          const chatMsg: ChatMessageDTO = {
            id: msgId,
            senderId: player.id,
            senderName: player.name,
            text,
            type: 'GUESSED_CHAT',
            timestamp: now,
          };

          // Store in room history (filtered out for unsolved players)
          room.addChatMessage(chatMsg);

          // Broadcast strictly to solved players room and active drawer
          io.to(`room_${room.id}_solved`).emit('chat_message', chatMsg);

          // Redundant fallback to ensure all known solvers & drawer receive it
          if (turnManager) {
            for (const guessedId of turnManager.guessedPlayerIds) {
              const p = room.getPlayer(guessedId);
              if (p && p.socketId) {
                const s = io.sockets.sockets.get(p.socketId);
                if (s && !s.rooms.has(`room_${room.id}_solved`)) {
                  s.join(`room_${room.id}_solved`);
                  s.emit('chat_message', chatMsg);
                }
              }
            }
            if (turnManager.currentDrawerId) {
              const drawer = room.getPlayer(turnManager.currentDrawerId);
              if (drawer && drawer.socketId) {
                const ds = io.sockets.sockets.get(drawer.socketId);
                if (ds && !ds.rooms.has(`room_${room.id}_solved`)) {
                  ds.join(`room_${room.id}_solved`);
                  ds.emit('chat_message', chatMsg);
                }
              }
            }
          }

          if (callback) callback({ success: true });
          return;
        }

        case 'REGULAR_CHAT':
        default: {
          // Standard chat / wrong guess broadcast to room
          const regularMsg: ChatMessageDTO = {
            id: msgId,
            senderId: player.id,
            senderName: player.name,
            text,
            type: 'CHAT',
            timestamp: now,
          };
          room.addChatMessage(regularMsg);
          io.to(room.id).emit('chat_message', regularMsg);

          if (callback) callback({ success: true });
          return;
        }
      }
    }
  );

  /**
   * Event: get_chat_history
   * Allows newly joined or view-transitioning clients to synchronize recent messages.
   */
  socket.on(
    'get_chat_history',
    (data: { roomId: string }, callback?: (res: { messages: ChatMessageDTO[] }) => void) => {
      const room = roomManager.getRoom(data?.roomId);
      if (!room) {
        if (callback) callback({ messages: [] });
        return;
      }
      const player = room.getPlayerBySocket(socket.id);
      const turnManager = roomManager.getTurnManager(room.id);
      const isSolvedOrDrawer = Boolean(
        player &&
          turnManager &&
          (turnManager.hasPlayerGuessed(player.id) || turnManager.currentDrawerId === player.id)
      );
      const messages = room.getChatHistory(isSolvedOrDrawer) as ChatMessageDTO[];
      if (typeof callback === 'function') {
        callback({ messages });
      } else {
        socket.emit('chat_history', { roomId: data?.roomId, messages });
      }
    }
  );
}
