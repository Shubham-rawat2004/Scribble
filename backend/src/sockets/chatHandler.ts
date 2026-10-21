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
          // If player is a spectator, do not spoil or score; notify spectator privately
          if (player.isSpectator) {
            socket.emit('chat_message', {
              id: msgId,
              senderId: 'system',
              senderName: 'System',
              text: '🎉 You guessed the secret word! (Spectators do not earn score points)',
              type: 'SYSTEM_INFO',
              timestamp: now,
            });
            if (callback) callback({ success: true });
            return;
          }

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
          const newTotalScore = turnManager.awardGuesserPoints(player.id, scoreResult.totalPoints);

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
          const broadcastText = isFirstGuesser
            ? `🥇 ${player.name} guessed the word first! (+${scoreResult.totalPoints} pts)`
            : `${player.name} guessed the word! (+${scoreResult.totalPoints} pts)`;

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
          // Option A: Message is broadcast exclusively to players who have already guessed + drawer
          const chatMsg: ChatMessageDTO = {
            id: msgId,
            senderId: player.id,
            senderName: player.name,
            text,
            type: 'GUESSED_CHAT',
            timestamp: now,
          };

          if (turnManager) {
            // Emit to each guessed player's socket
            for (const guessedId of turnManager.guessedPlayerIds) {
              const p = room.getPlayer(guessedId);
              if (p) io.to(p.socketId).emit('chat_message', chatMsg);
            }
            // Also emit to the active drawer
            if (turnManager.currentDrawerId) {
              const drawer = room.getPlayer(turnManager.currentDrawerId);
              if (drawer) io.to(drawer.socketId).emit('chat_message', chatMsg);
            }
          } else {
            socket.emit('chat_message', chatMsg);
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
      const messages = room ? room.getChatHistory() as ChatMessageDTO[] : [];
      if (typeof callback === 'function') {
        callback({ messages });
      } else {
        socket.emit('chat_history', { roomId: data?.roomId, messages });
      }
    }
  );
}
