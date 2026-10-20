import { Server as SocketIOServer, Socket } from 'socket.io';
import { RoomManager } from '../game/RoomManager.js';

/**
 * Registers turn management, word selection, and progressive hint socket event listeners.
 */
export function registerGameHandlers(io: SocketIOServer, socket: Socket) {
  const roomManager = RoomManager.getInstance();

  /**
   * Helper function: triggers word selection phase for the active drawer.
   */
  async function triggerWordSelection(roomId: string) {
    const room = roomManager.getRoom(roomId);
    const turnManager = roomManager.getTurnManager(roomId);
    if (!room || !turnManager) return;

    const nextTurn = await turnManager.prepareNextTurn();

    if (nextTurn.isMatchFinished) {
      console.log(`[Game] Room ${roomId} match completed all rounds!`);
      io.to(room.id).emit('match_finished', {
        roomId: room.id,
        scores: room.getPlayerList().map((p) => p.toDTO()),
      });
      return;
    }

    const drawer = room.getPlayer(nextTurn.drawerId || '');
    if (!drawer) return;

    // 1. Send word choices to the designated Drawer only
    io.to(drawer.socketId).emit('word_selection_start', {
      roomId: room.id,
      words: nextTurn.wordOptions,
      durationSeconds: 15,
    });

    // 2. Broadcast waiting banner to all Guessers
    socket.to(room.id).emit('drawer_choosing_word', {
      roomId: room.id,
      drawerId: drawer.id,
      drawerName: drawer.name,
      durationSeconds: 15,
    });

    console.log(`[Game] Room ${roomId}: Drawer ${drawer.name} is choosing from ${nextTurn.wordOptions.length} words.`);
  }

  /**
   * Event: start_game listener extension to immediately begin Turn 1 word selection.
   */
  socket.on('start_game', async (payload: { roomId: string }) => {
    // Note: roomHandler already validates host and changes status to PLAYING.
    // We add a tiny delay to allow client views to transition to GameView.
    setTimeout(() => {
      triggerWordSelection(payload.roomId);
    }, 600);
  });

  /**
   * Event: select_word
   * Emitted by the active drawer when choosing a word.
   */
  socket.on('select_word', async (payload: { roomId: string; word: string }, callback?: (res: { success: boolean }) => void) => {
    try {
      const { roomId, word } = payload;
      const room = roomManager.getRoom(roomId);
      const turnManager = roomManager.getTurnManager(roomId);

      if (!room || !turnManager) {
        if (callback) callback({ success: false });
        return;
      }

      // Security Check: Only the active drawer can pick the word
      if (!room.isDrawer(socket.id)) {
        console.warn(`[Security] Unauthorized select_word attempt from ${socket.id}`);
        if (callback) callback({ success: false });
        return;
      }

      console.log(`[Game] Room ${roomId}: Drawer selected word "${word}"`);

      // Clear previous canvas strokes for the new turn
      room.clearCanvas();
      io.to(room.id).emit('canvas_clear', { roomId: room.id });

      const drawer = room.getPlayer(turnManager.currentDrawerId || '');

      // Start Drawing Turn with Progressive Hints and Countdown Timer
      const { secretWord, initialMask } = await turnManager.startDrawingTurn(
        word,
        // On Hint Reveal Callback
        (newMask) => {
          console.log(`[Hint] Room ${roomId}: Hint revealed! Current mask: "${newMask}"`);
          io.to(room.id).emit('word_hint', {
            roomId: room.id,
            wordMask: newMask,
          });
        },
        // On Time Tick Callback
        (secondsLeft) => {
          io.to(room.id).emit('turn_timer_tick', {
            roomId: room.id,
            timeRemainingSeconds: secondsLeft,
          });
        },
        // On Turn End Callback
        () => {
          console.log(`[Game] Room ${roomId}: Turn ended (Time expired)`);
          io.to(room.id).emit('turn_end', {
            roomId: room.id,
            secretWord,
            reason: 'TIME_UP',
          });

          // Wait 3.5 seconds to show turn results, then advance to next drawer
          setTimeout(() => {
            triggerWordSelection(roomId);
          }, 3500);
        }
      );

      // Emitted to the Drawer: Full plaintext word
      if (drawer) {
        io.to(drawer.socketId).emit('turn_start', {
          role: 'DRAWER',
          secretWord,
          drawTimeSeconds: room.settings.drawTimeSeconds,
          currentRound: turnManager.currentRound,
          totalRounds: room.settings.totalRounds,
          currentTurn: turnManager.currentTurn,
          totalTurnsInRound: room.players.size,
        });
      }

      // Emitted to all Guessers: ZERO-TRUST MASK ONLY!
      socket.to(room.id).emit('turn_start', {
        role: 'GUESSER',
        wordMask: initialMask,
        wordLength: secretWord.length,
        drawTimeSeconds: room.settings.drawTimeSeconds,
        currentRound: turnManager.currentRound,
        totalRounds: room.settings.totalRounds,
        currentTurn: turnManager.currentTurn,
        totalTurnsInRound: room.players.size,
      });

      if (callback) callback({ success: true });
    } catch (err) {
      console.error('[Socket.IO] Error in select_word:', (err as Error).message);
    }
  });
}
