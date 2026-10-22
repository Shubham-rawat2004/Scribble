import { Server as SocketIOServer, Socket } from 'socket.io';
import { RoomManager } from '../game/RoomManager.js';
import { Room } from '../game/Room.js';
import { pool } from '../db/connection.js';
import { PlayerDTO, GameOverPayload } from '../types/room.js';
import crypto from 'crypto';

/**
 * Automatically terminates an active game when the active player count drops below 2
 * (due to player disconnection, leaving, or being kicked).
 * Immediately cancels ongoing rounds, stops drawing/guessing, clears all timers,
 * declares the sole remaining active player as winner by default, and broadcasts game_over.
 */
export async function terminateGameDueToInsufficientPlayers(io: SocketIOServer, roomId: string) {
  const roomManager = RoomManager.getInstance();
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  // Only terminate games that are currently in progress ('PLAYING')
  if (room.status !== 'PLAYING') return;

  // Immediate state transition to 'FINISHED' to prevent duplicate execution from race conditions
  room.setStatus('FINISHED');

  const turnManager = roomManager.getTurnManager(roomId);
  if (turnManager) {
    turnManager.clearAllTimers();
    turnManager.turnPhase = 'MATCH_END';
  }

  // Clear canvas for all connected clients
  room.clearCanvas();
  io.to(room.id).emit('canvas_clear', { roomId: room.id });
  io.in(`room_${roomId}_solved`).socketsLeave(`room_${roomId}_solved`);

  // Identify remaining active players (connected)
  const activePlayers = room.getActivePlayers();
  const allConnected = room.getPlayerList().filter((p) => p.isConnected);

  console.log(
    `[Game] Auto-terminating match in room ${room.id} due to insufficient players (Active remaining: ${activePlayers.length}, Total connected: ${allConnected.length})`
  );

  let winner: PlayerDTO | null = null;
  let podium: PlayerDTO[] = [];
  let leaderboard: PlayerDTO[] = [];

  if (activePlayers.length === 1) {
    const solePlayer = activePlayers[0];
    winner = solePlayer.toDTO();
    podium = [solePlayer.toDTO()];
    leaderboard = [
      solePlayer.toDTO(),
      ...allConnected.filter((p) => p.id !== solePlayer.id).map((p) => p.toDTO()),
    ];
  } else if (allConnected.length > 0) {
    winner = allConnected[0].toDTO();
    podium = [allConnected[0].toDTO()];
    leaderboard = allConnected.map((p) => p.toDTO());
  }

  // Persist completed match status to MySQL
  try {
    if (turnManager && turnManager.sessionId) {
      await pool.execute(
        `UPDATE game_sessions 
         SET status = 'COMPLETED', ended_at = NOW(), winner_player_id = ?, total_rounds_played = ?
         WHERE session_id = ?`,
        [winner?.id || null, turnManager.currentRound, turnManager.sessionId]
      );
    }
    await pool.execute('UPDATE rooms SET status = ? WHERE room_id = ?', ['FINISHED', room.id]);
    console.log(`[Game] Persisted auto-terminated match to MySQL for room ${room.id}. Winner: ${winner?.name}`);
  } catch (err) {
    console.error('[Game] Error persisting auto-terminated match to MySQL:', (err as Error).message);
  }

  const message = 'Game Over! All other players have left. You are the winner!';

  // Announce in room chat feed
  const winAnnouncement = {
    id: crypto.randomUUID(),
    senderId: 'system',
    senderName: 'System',
    text: winner
      ? `Game Over! All other players have left. ${winner.name} is the winner!`
      : 'Game Over! Not enough players to continue.',
    type: 'SYSTEM_INFO',
    timestamp: Date.now(),
  };
  room.addChatMessage(winAnnouncement);
  io.to(room.id).emit('chat_message', winAnnouncement);

  // Broadcast game_over with default winner, podium, and announcement message
  const gameOverPayload: GameOverPayload = {
    roomId: room.id,
    winner,
    podium,
    leaderboard,
    totalRoundsPlayed: turnManager ? turnManager.currentRound : 1,
    reason: 'ALL_PLAYERS_LEFT',
    message,
    winnerByDefault: true,
  };
  io.to(room.id).emit('game_over', gameOverPayload);
}

/**
 * Evaluates whether an active game should terminate due to insufficient players (< 2 active players),
 * or whether the active drawer left and the turn should advance immediately.
 */
export async function handlePlayerLeftGameCheck(
  io: SocketIOServer,
  room: Room,
  departedPlayerId?: string
) {
  if (room.status !== 'PLAYING') return;

  const roomManager = RoomManager.getInstance();

  // If any player in the room is currently in their reconnection grace period, do NOT terminate!
  const hasPlayerInGrace = room.getPlayerList().some((p) => roomManager.isPlayerInGrace(p.id));
  if (hasPlayerInGrace) {
    console.log(`[Game] Room ${room.id} has disconnected player(s) in grace period. Deferring auto-termination.`);
    return;
  }

  const activePlayers = room.getActivePlayers();

  // If active player count drops below 2, immediately terminate the match!
  if (activePlayers.length < 2) {
    await terminateGameDueToInsufficientPlayers(io, room.id);
    return;
  }

  // Active players count is >= 2.
  const turnManager = roomManager.getTurnManager(room.id);
  if (!turnManager) return;

  if (departedPlayerId) {
    turnManager.removePlayerFromTurn(departedPlayerId);
  }

  // If the active drawer just departed, advance to next turn immediately!
  if (departedPlayerId && turnManager.currentDrawerId === departedPlayerId) {
    console.log(`[Game] Active drawer (${departedPlayerId}) left room ${room.id}. Advancing to next turn.`);
    turnManager.clearAllTimers();
    room.clearCanvas();
    io.to(room.id).emit('canvas_clear', { roomId: room.id });

    const drawerLeftMsg = {
      id: crypto.randomUUID(),
      senderId: 'system',
      senderName: 'System',
      text: 'The drawer left the game! Advancing to the next turn...',
      type: 'SYSTEM_INFO',
      timestamp: Date.now(),
    };
    room.addChatMessage(drawerLeftMsg);
    io.to(room.id).emit('chat_message', drawerLeftMsg);

    // Trigger next turn selection
    setTimeout(() => {
      if (room.status === 'PLAYING') {
        triggerWordSelection(io, room.id);
      }
    }, 1500);
    return;
  }

  // If a guesser departed, check if all remaining eligible guessers have now guessed
  if (turnManager.turnPhase === 'DRAWING') {
    const eligibleGuessers = room
      .getActivePlayers()
      .filter((p) => p.id !== turnManager.currentDrawerId);
    if (
      eligibleGuessers.length > 0 &&
      eligibleGuessers.every((p) => turnManager.hasPlayerGuessed(p.id))
    ) {
      console.log(`[Game] All remaining guessers in room ${room.id} have guessed correctly after departure. Ending turn.`);
      turnManager.endTurnEarly('ALL_GUESSED');
    }
  }
}

/**
 * Helper function: Finalizes the match, updates MySQL session, and broadcasts game_over with podium.
 */
export async function finalizeMatch(io: SocketIOServer, roomId: string) {
  const roomManager = RoomManager.getInstance();
  const room = roomManager.getRoom(roomId);
  const turnManager = roomManager.getTurnManager(roomId);
  if (!room || !turnManager) return;

  room.setStatus('FINISHED');

  const leaderboard = room
    .getPlayerList()
    .map((p) => p.toDTO())
    .sort((a, b) => b.score - a.score);

  const winner = leaderboard[0];
  const podium = leaderboard.slice(0, 3);

  // Update MySQL game_sessions and rooms tables
  try {
    if (turnManager.sessionId) {
      await pool.execute(
        `UPDATE game_sessions 
         SET status = 'COMPLETED', ended_at = NOW(), winner_player_id = ?, total_rounds_played = ?
         WHERE session_id = ?`,
        [winner?.id || null, turnManager.currentRound, turnManager.sessionId]
      );
    }
    await pool.execute('UPDATE rooms SET status = ? WHERE room_id = ?', ['FINISHED', roomId]);
    console.log(`[Game] Successfully persisted completed match to MySQL for room ${roomId}. Winner: ${winner?.name}`);
  } catch (err) {
    console.error('[Game] Error finalizing match in MySQL:', (err as Error).message);
  }

  // Broadcast game_over event with winner, podium, and complete leaderboard
  io.to(room.id).emit('game_over', {
    roomId: room.id,
    winner,
    podium,
    leaderboard,
    totalRoundsPlayed: turnManager.currentRound,
  });
}

/**
 * Helper function: executes drawing turn start, schedules hints & timers, and broadcasts to drawer & guessers.
 */
export async function executeStartDrawingTurn(
  io: SocketIOServer,
  roomId: string,
  chosenWord: string
) {
  const roomManager = RoomManager.getInstance();
  const room = roomManager.getRoom(roomId);
  const turnManager = roomManager.getTurnManager(roomId);
  if (!room || !turnManager) return;

  // Clear previous canvas strokes for the new turn
  room.clearCanvas();
  io.to(room.id).emit('canvas_clear', { roomId: room.id });

  // Reset solved chat channel membership for the new turn
  io.in(`room_${roomId}_solved`).socketsLeave(`room_${roomId}_solved`);

  const drawer = room.getPlayer(turnManager.currentDrawerId || '');
  if (drawer?.socketId) {
    const drawerSocket = io.sockets.sockets.get(drawer.socketId);
    if (drawerSocket) {
      drawerSocket.join(`room_${roomId}_solved`);
    }
  }

  // Start Drawing Turn with Progressive Hints and Countdown Timer
  const { secretWord, initialMask } = await turnManager.startDrawingTurn(
    chosenWord,
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
    async () => {
      console.log(`[Game] Room ${roomId}: Turn ended`);

      // 1. Calculate and award drawer points based on solver count
      turnManager.calculateAndAwardDrawerPoints();

      // 2. Build round score summary and persist to MySQL
      const roundScores = turnManager.getRoundScoreSummary();
      await turnManager.persistScoresToDatabase();

      // 3. Emit turn_end with full score summary and updated player roster
      const eligibleGuessers = room
        .getPlayerList()
        .filter((p) => p.id !== turnManager.currentDrawerId && p.isConnected);
      const isAllGuessed =
        eligibleGuessers.length > 0 &&
        eligibleGuessers.every((p) => turnManager.guessedPlayerIds.has(p.id));

      const strokes = room.getStrokeHistory();
      room.setLastTurnInfo(secretWord, drawer?.name || 'Drawer', strokes);

      // Reset solved channel on turn end
      io.in(`room_${roomId}_solved`).socketsLeave(`room_${roomId}_solved`);

      io.to(room.id).emit('turn_end', {
        roomId: room.id,
        secretWord,
        reason: isAllGuessed ? 'ALL_GUESSED' : 'TIME_UP',
        scores: room.getPlayerList().map((p) => p.toDTO()),
        roundScores,
        strokes,
        drawerName: drawer?.name,
      });

      // Wait 4 seconds for players to review turn summary scoreboard, then advance
      const postTimer = setTimeout(() => {
        if (room.status === 'PLAYING') {
          triggerWordSelection(io, roomId);
        }
      }, 4000);
      turnManager.setPostTurnTimeout(postTimer);
    }
  );

  // Emitted to the Drawer: Full plaintext word + drawerId
  if (drawer) {
    io.to(drawer.socketId).emit('turn_start', {
      role: 'DRAWER',
      drawerId: drawer.id,
      secretWord,
      drawTimeSeconds: room.settings.drawTimeSeconds,
      currentRound: turnManager.currentRound,
      totalRounds: room.settings.totalRounds,
      currentTurn: turnManager.currentTurn,
      totalTurnsInRound: room.players.size,
      gameMode: room.settings.gameMode || 'Normal',
    });
  }

  // Emitted to all Guessers: ZERO-TRUST MASK ONLY with drawerId!
  for (const player of room.getPlayerList()) {
    if (!drawer || player.id !== drawer.id) {
      io.to(player.socketId).emit('turn_start', {
        role: 'GUESSER',
        drawerId: drawer?.id,
        wordMask: initialMask,
        wordLength: room.settings.gameMode === 'Hidden' ? 0 : secretWord.length,
        drawTimeSeconds: room.settings.drawTimeSeconds,
        currentRound: turnManager.currentRound,
        totalRounds: room.settings.totalRounds,
        currentTurn: turnManager.currentTurn,
        totalTurnsInRound: room.players.size,
        gameMode: room.settings.gameMode || 'Normal',
      });
    }
  }
}

/**
 * Helper function: triggers word selection phase for the active drawer.
 */
export async function triggerWordSelection(io: SocketIOServer, roomId: string) {
  const roomManager = RoomManager.getInstance();
  const room = roomManager.getRoom(roomId);
  const turnManager = roomManager.getTurnManager(roomId);
  if (!room || !turnManager) return;

  const nextTurn = await turnManager.prepareNextTurn();

  if (nextTurn.isMatchFinished) {
    console.log(`[Game] Room ${roomId} match completed all rounds! Finalizing game...`);
    await finalizeMatch(io, roomId);
    return;
  }

  // Broadcast round_start to all players at the beginning of each new round (Round 1, Round 2, etc.)
  if (turnManager.currentTurn === 1) {
    console.log(`[Game] Room ${roomId}: Starting Round ${turnManager.currentRound} of ${room.settings.totalRounds}`);
    io.to(room.id).emit('round_start', {
      roomId: room.id,
      roundNumber: turnManager.currentRound,
      totalRounds: room.settings.totalRounds,
    });
  }

  const drawer = room.getPlayer(nextTurn.drawerId || '');
  if (!drawer) return;

  const durationSeconds = 15;

  // 1. Send word choices to the designated Drawer only (including drawerId)
  io.to(drawer.socketId).emit('word_selection_start', {
    roomId: room.id,
    drawerId: drawer.id,
    words: nextTurn.wordOptions,
    durationSeconds,
  });

  // 2. Broadcast waiting banner to all Guessers
  for (const player of room.getPlayerList()) {
    if (player.id !== drawer.id) {
      io.to(player.socketId).emit('drawer_choosing_word', {
        roomId: room.id,
        drawerId: drawer.id,
        drawerName: drawer.name,
        durationSeconds,
      });
    }
  }

  console.log(`[Game] Room ${roomId}: Drawer ${drawer.name} (${drawer.id}) is choosing from ${nextTurn.wordOptions.length} words.`);

  // 3. Fallback: Auto-select first word if drawer is AFK or does not choose within 16 seconds
  const currentTurn = turnManager.currentTurn;
  const currentRound = turnManager.currentRound;
  const selTimeout = setTimeout(async () => {
    if (
      room.status === 'PLAYING' &&
      turnManager.turnPhase === 'WORD_SELECTION' &&
      turnManager.currentTurn === currentTurn &&
      turnManager.currentRound === currentRound &&
      nextTurn.wordOptions.length > 0
    ) {
      const autoWord = nextTurn.wordOptions[0].word;
      console.log(`[Game] Room ${roomId}: Drawer timed out. Auto-selecting word "${autoWord}"`);
      await executeStartDrawingTurn(io, roomId, autoWord);
    }
  }, (durationSeconds + 1) * 1000);
  turnManager.setSelectionTimeout(selTimeout);
}

/**
 * Registers turn management, word selection, and progressive hint socket event listeners.
 */
export function registerGameHandlers(io: SocketIOServer, socket: Socket) {
  const roomManager = RoomManager.getInstance();

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

      if (turnManager.turnPhase !== 'WORD_SELECTION') {
        if (callback) callback({ success: false });
        return;
      }

      console.log(`[Game] Room ${roomId}: Drawer selected word "${word}"`);
      await executeStartDrawingTurn(io, roomId, word);

      if (callback) callback({ success: true });
    } catch (err) {
      console.error('[Socket.IO] Error in select_word:', (err as Error).message);
      if (callback) callback({ success: false });
    }
  });

  /**
   * Event: return_to_lobby
   * Host resets the match and transitions all connected players back to the lobby.
   */
  socket.on(
    'return_to_lobby',
    async (data: { roomId: string }, callback?: (res: { success: boolean; error?: string }) => void) => {
      if (!data || !data.roomId) return;
      const room = roomManager.getRoom(data.roomId);
      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found' });
        return;
      }

      const player = room.getPlayerBySocket(socket.id);
      if (!player || !player.isHost) {
        if (callback) callback({ success: false, error: 'Only the host can return to the lobby.' });
        return;
      }

      // Reset room state and player scores
      room.setStatus('LOBBY');
      room.setCurrentDrawer(null);
      io.in(`room_${data.roomId}_solved`).socketsLeave(`room_${data.roomId}_solved`);
      for (const p of room.getPlayerList()) {
        p.resetScore();
      }

      // Reset in MySQL
      try {
        await pool.execute('UPDATE rooms SET status = ? WHERE room_id = ?', ['LOBBY', room.id]);
        await pool.execute('UPDATE players SET total_score = 0 WHERE room_id = ?', [room.id]);
        console.log(`[Game] Room ${room.id} reset to LOBBY status in MySQL.`);
      } catch (dbErr) {
        console.error('[Game] Error resetting room to lobby in MySQL:', (dbErr as Error).message);
      }

      // Broadcast to room channel
      io.to(room.id).emit('returned_to_lobby', {
        room: room.toDTO(),
      });

      if (callback) callback({ success: true });
    }
  );

  /**
   * Event: get_last_replay
   * Provides full vector strokes and metadata of the most recent completed turn.
   */
  socket.on(
    'get_last_replay',
    (
      data: { roomId: string },
      callback?: (res: {
        success: boolean;
        error?: string;
        secretWord?: string;
        drawerName?: string;
        strokes?: any[];
      }) => void
    ) => {
      try {
        if (!data || !data.roomId) {
          if (callback) callback({ success: false, error: 'Invalid parameters.' });
          return;
        }

        const targetRoom = roomManager.getRoom(data.roomId);
        if (!targetRoom) {
          if (callback) callback({ success: false, error: 'Room not found.' });
          return;
        }

        const info = targetRoom.getLastTurnInfo();
        if (callback) {
          callback({
            success: true,
            secretWord: info.secretWord,
            drawerName: info.drawerName,
            strokes: info.strokes,
          });
        }
      } catch (err) {
        console.error('[Socket.IO] Error in get_last_replay:', err);
        if (callback) callback({ success: false, error: 'Failed to retrieve replay.' });
      }
    }
  );
}
