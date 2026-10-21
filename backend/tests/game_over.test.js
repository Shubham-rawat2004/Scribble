// Automated Multi-Client Integration Test: Game Over, Victory Podium & Return to Lobby
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');
const mysql = require('../node_modules/mysql2/promise');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Phase 9 Game Over, Victory Podium & Return to Lobby Test Suite ===\n');

const aliceSocket = io(SOCKET_URL, { reconnection: false });
let bobSocket = null;
let charlieSocket = null;

let roomId = null;
let alicePlayerId = null;
let bobPlayerId = null;
let charliePlayerId = null;

let turnCounter = 0;

aliceSocket.on('connect', () => {
  console.log('Alice (Host) connected:', aliceSocket.id);

  // 1 round with 3 players = 3 turns total!
  aliceSocket.emit('create_room', {
    hostName: 'AliceHost',
    avatarId: 'skribbl_0_0_0',
    settings: { maxPlayers: 4, totalRounds: 1, drawTimeSeconds: 4, wordOptionsCount: 3, hintsAllowed: 2 },
  }, (createRes) => {
    assert.strictEqual(createRes.success, true);
    roomId = createRes.room.id;
    alicePlayerId = createRes.player.id;
    console.log(`✅ Step 1: Alice created 1-round match room ${roomId}`);

    bobSocket = io(SOCKET_URL, { reconnection: false });
    bobSocket.on('connect', () => {
      bobSocket.emit('join_room', {
        roomId,
        playerName: 'BobGuesser',
        avatarId: 'skribbl_1_1_1',
      }, (joinBobRes) => {
        assert.strictEqual(joinBobRes.success, true);
        bobPlayerId = joinBobRes.player.id;
        console.log(`✅ Step 2: Bob joined room ${roomId}`);

        charlieSocket = io(SOCKET_URL, { reconnection: false });
        charlieSocket.on('connect', () => {
          charlieSocket.emit('join_room', {
            roomId,
            playerName: 'CharlieGuesser',
            avatarId: 'skribbl_2_2_2',
          }, (joinCharlieRes) => {
            assert.strictEqual(joinCharlieRes.success, true);
            charliePlayerId = joinCharlieRes.player.id;
            console.log(`✅ Step 3: Charlie joined room ${roomId}`);

            setupMatchListeners();
            aliceSocket.emit('start_game', { roomId });
          });
        });
      });
    });
  });
});

function setupMatchListeners() {
  // Whenever any client receives word_selection_start, automatically pick a word
  aliceSocket.on('word_selection_start', (data) => {
    turnCounter++;
    console.log(`✅ Turn ${turnCounter} Word Selection: Alice is drawer, choosing "${data.words[0].word}"...`);
    aliceSocket.emit('select_word', { roomId, word: data.words[0].word });
  });

  bobSocket.on('word_selection_start', (data) => {
    turnCounter++;
    console.log(`✅ Turn ${turnCounter} Word Selection: Bob is drawer, choosing "${data.words[0].word}"...`);
    bobSocket.emit('select_word', { roomId, word: data.words[0].word });
  });

  charlieSocket.on('word_selection_start', (data) => {
    turnCounter++;
    console.log(`✅ Turn ${turnCounter} Word Selection: Charlie is drawer, choosing "${data.words[0].word}"...`);
    charlieSocket.emit('select_word', { roomId, word: data.words[0].word });
  });

  // When turn starts, guessers solve the word after 100ms
  aliceSocket.on('turn_start', (data) => {
    if (data.role === 'GUESSER') {
      // Alice guesses
    }
  });

  bobSocket.on('turn_start', (data) => {
    if (data.role === 'GUESSER') {
      setTimeout(() => {
        // Find secret word from previous drawer or guess word
        bobSocket.emit('send_chat_message', { roomId, text: 'test guess' });
      }, 100);
    }
  });

  // Listen for GAME OVER
  aliceSocket.on('game_over', async (gameOverData) => {
    console.log('\n--- Match Completed: GAME OVER Event Received! ---');
    assert.strictEqual(gameOverData.roomId, roomId);
    assert.ok(gameOverData.winner, 'Must identify winner');
    assert.ok(gameOverData.podium && gameOverData.podium.length >= 2, 'Must include podium array');
    assert.strictEqual(gameOverData.leaderboard.length, 3, 'Must include all 3 players in leaderboard');
    console.log(`✅ Winner announced: 👑 ${gameOverData.winner.name} with ${gameOverData.winner.score} pts!`);
    console.log('✅ Podium standings:', gameOverData.podium.map((p, idx) => `#${idx + 1} ${p.name} (${p.score} pts)`));

    // Test Action: Host triggers return_to_lobby
    console.log('\n--- Action: Host Alice triggers return_to_lobby ---');
    bobSocket.once('returned_to_lobby', async (lobbyData) => {
      assert.strictEqual(lobbyData.room.status, 'LOBBY');
      assert.ok(lobbyData.room.players.every(p => p.score === 0), 'All player scores must reset to 0 in lobby');
      console.log('✅ Bob received returned_to_lobby broadcast with status LOBBY and reset scores!');

      // Verify MySQL Database State
      console.log('\n--- Verifying Final MySQL Database Records ---');
      try {
        const dbConn = await mysql.createConnection({
          host: '127.0.0.1',
          port: 3307,
          user: 'skribbl_user',
          password: 'skribbl_password',
          database: 'skribbl_db',
        });

        // 1. Verify game_sessions record marked COMPLETED
        const [sessionRows] = await dbConn.execute(
          'SELECT status, winner_player_id, ended_at FROM game_sessions WHERE room_id = ? ORDER BY started_at DESC LIMIT 1',
          [roomId]
        );
        console.log('✅ MySQL game_sessions row:', sessionRows[0]);
        assert.strictEqual(sessionRows[0].status, 'COMPLETED');
        assert.ok(sessionRows[0].ended_at !== null, 'ended_at must be populated');
        assert.strictEqual(sessionRows[0].winner_player_id, gameOverData.winner.id);

        // 2. Verify rooms table reset to LOBBY
        const [roomRows] = await dbConn.execute(
          'SELECT status FROM rooms WHERE room_id = ?',
          [roomId]
        );
        console.log('✅ MySQL rooms row status:', roomRows[0].status);
        assert.strictEqual(roomRows[0].status, 'LOBBY');

        await dbConn.end();
        console.log('✅ Complete MySQL database audit passed!');

        console.log('\n🎉 ALL PHASE 9 GAME OVER & VICTORY PODIUM TESTS PASSED!');
        aliceSocket.disconnect();
        bobSocket.disconnect();
        charlieSocket.disconnect();
        process.exit(0);
      } catch (err) {
        console.error('MySQL audit error:', err);
        process.exit(1);
      }
    });

    aliceSocket.emit('return_to_lobby', { roomId });
  });
}
