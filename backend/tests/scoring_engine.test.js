// Automated Multi-Client Integration Test: Scoring Engine, Round Scoreboard & MySQL Persistence
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');
const { ScoringEngine } = require('../dist/game/ScoringEngine.js');
const mysql = require('../node_modules/mysql2/promise');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Phase 8 Dynamic Scoring Engine & Live Leaderboard Test Suite ===\n');

// --- 1. Unit Tests for ScoringEngine ---
console.log('--- Test 1: Pure Scoring Formulas (Speed Decay, Order Bonus & Drawer Reward) ---');

// Speed decay
const maxFastGuess = ScoringEngine.calculateGuesserScore(80, 80, 1);
assert.strictEqual(maxFastGuess.basePoints, 400, 'Max base points at 100% time should be 400');
assert.strictEqual(maxFastGuess.orderBonus, 50, '1st place bonus should be 50');
assert.strictEqual(maxFastGuess.totalPoints, 450, 'Max total points should be 450');
console.log('✅ Instant guess (80s/80s, 1st place):', maxFastGuess);

const midGuess = ScoringEngine.calculateGuesserScore(40, 80, 2);
assert.strictEqual(midGuess.basePoints, 225, 'Base points at 50% time should be 225');
assert.strictEqual(midGuess.orderBonus, 25, '2nd place bonus should be 25');
assert.strictEqual(midGuess.totalPoints, 250, 'Mid guess total points should be 250');
console.log('✅ Mid guess (40s/80s, 2nd place):', midGuess);

const slowGuess = ScoringEngine.calculateGuesserScore(0, 80, 3);
assert.strictEqual(slowGuess.basePoints, 50, 'Min base points at 0% time should be 50');
assert.strictEqual(slowGuess.orderBonus, 10, '3rd place bonus should be 10');
assert.strictEqual(slowGuess.totalPoints, 60, 'Slow guess total points should be 60');
console.log('✅ Slow guess (0s/80s, 3rd place):', slowGuess);

// Drawer speed-weighted rewards
assert.strictEqual(ScoringEngine.calculateDrawerScore([], 3), 0, '0 solvers must yield 0 drawer points');
assert.strictEqual(ScoringEngine.calculateDrawerScore([350], 1), 350, '1 fast solver (350) out of 1 guesser must yield 350 drawer points');
assert.strictEqual(ScoringEngine.calculateDrawerScore([100], 1), 100, '1 slow solver (100) out of 1 guesser must yield 100 drawer points');
assert.strictEqual(ScoringEngine.calculateDrawerScore([300, 300], 2), 300, '2 solvers (avg 300) out of 2 guessers must yield 300 drawer points');
assert.strictEqual(ScoringEngine.calculateDrawerScore([300], 2), 150, '1 solver (300) out of 2 guessers must yield 150 drawer points (half ratio)');
console.log('✅ Speed-weighted drawer points formula verified successfully!');

// --- 2. Multi-Client Socket Real-Time Flow & Leaderboard Sync ---
console.log('\n--- Test 2: Multi-Client Real-Time Scoring Flow & MySQL Persistence ---');
const aliceSocket = io(SOCKET_URL, { reconnection: false });
let bobSocket = null;
let charlieSocket = null;

let roomId = null;
let alicePlayerId = null;
let bobPlayerId = null;
let charliePlayerId = null;

let bobPointsEarned = 0;
let charliePointsEarned = 0;

aliceSocket.on('connect', () => {
  console.log('Alice (Host/Drawer) connected:', aliceSocket.id);

  aliceSocket.emit('create_room', {
    hostName: 'AliceDrawer',
    avatarId: 'skribbl_0_0_0',
    settings: { maxPlayers: 4, totalRounds: 1, drawTimeSeconds: 6, wordOptionsCount: 3, hintsAllowed: 2 },
  }, (createRes) => {
    assert.strictEqual(createRes.success, true);
    roomId = createRes.room.id;
    alicePlayerId = createRes.player.id;
    console.log(`✅ Step 1: Alice created room ${roomId}`);

    bobSocket = io(SOCKET_URL, { reconnection: false });
    bobSocket.on('connect', () => {
      console.log('Bob (Guesser 1) connected:', bobSocket.id);

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
          console.log('Charlie (Guesser 2) connected:', charlieSocket.id);

          charlieSocket.emit('join_room', {
            roomId,
            playerName: 'CharlieGuesser',
            avatarId: 'skribbl_2_2_2',
          }, (joinCharlieRes) => {
            assert.strictEqual(joinCharlieRes.success, true);
            charliePlayerId = joinCharlieRes.player.id;
            console.log(`✅ Step 3: Charlie joined room ${roomId}`);

            setupGameFlow();
            aliceSocket.emit('start_game', { roomId });
          });
        });
      });
    });
  });
});

function setupGameFlow() {
  aliceSocket.on('word_selection_start', (data) => {
    console.log('✅ Step 4: Alice received word options. Selecting "pizza"...');
    aliceSocket.emit('select_word', { roomId, word: 'pizza' });
  });

  bobSocket.on('turn_start', (data) => {
    console.log('✅ Step 5: Turn started! Beginning guess timing tests...');

    // Setup live score_update listeners
    let bobScoreUpdateReceived = false;
    let charlieScoreUpdateReceived = false;

    aliceSocket.on('score_update', (scoreData) => {
      console.log(`✅ Score Update broadcast received by Alice: Player ${scoreData.playerId} earned +${scoreData.pointsEarned} pts (Total: ${scoreData.newScore})`);
      if (scoreData.playerId === bobPlayerId) {
        bobScoreUpdateReceived = true;
        bobPointsEarned = scoreData.pointsEarned;
      }
      if (scoreData.playerId === charliePlayerId) {
        charlieScoreUpdateReceived = true;
        charliePointsEarned = scoreData.pointsEarned;
      }
    });

    // Step A: Bob guesses immediately
    setTimeout(() => {
      console.log('\n--- Action A: Bob guesses "pizza" immediately (1st place) ---');
      bobSocket.emit('send_chat_message', { roomId, text: 'pizza' });
    }, 200);

    // Step B: Charlie guesses shortly after
    setTimeout(() => {
      console.log('\n--- Action B: Charlie guesses "pizza" later (2nd place) ---');
      charlieSocket.emit('send_chat_message', { roomId, text: 'pizza' });
    }, 800);

    // Step C: Listen for turn_end
    aliceSocket.on('turn_end', async (endData) => {
      console.log('\n--- Action C: Turn ended and score summary received ---');
      assert.strictEqual(endData.secretWord, 'PIZZA');
      assert.ok(endData.roundScores && endData.roundScores.length === 3, 'Must include roundScores for all 3 players');
      console.log('✅ Round score summary items received:', endData.roundScores.map(r => `${r.playerName} (${r.role}): +${r.pointsEarned} pts (Total: ${r.totalScore})`));

      // Verify Bob got more points than Charlie (speed + order bonus)
      assert.ok(bobPointsEarned > charliePointsEarned, `Bob (${bobPointsEarned}) must earn more points than Charlie (${charliePointsEarned})`);
      console.log(`✅ Speed & order bonus verified: Bob (${bobPointsEarned} pts) > Charlie (${charliePointsEarned} pts)`);

      // Verify Drawer Alice got speed-weighted drawer points because 2/2 solved quickly
      const aliceSummary = endData.roundScores.find(r => r.playerId === alicePlayerId);
      assert.ok(aliceSummary);
      assert.strictEqual(aliceSummary.pointsEarned, 400, 'Drawer Alice must receive 400 points (2/2 fast solvers)');
      console.log('✅ Speed-weighted drawer points verified: Alice received 400 drawer points!');

      // Step D: Verify MySQL database persistence
      console.log('\n--- Action D: Verifying MySQL database persistence ---');
      try {
        const dbConn = await mysql.createConnection({
          host: '127.0.0.1',
          port: 3307,
          user: 'skribbl_user',
          password: 'skribbl_password',
          database: 'skribbl_db',
        });

        const [playerRows] = await dbConn.execute(
          'SELECT player_name, total_score FROM players WHERE room_id = ? ORDER BY total_score DESC',
          [roomId]
        );
        console.log('✅ MySQL players table cumulative scores:', playerRows);
        assert.strictEqual(playerRows.length, 3);
        assert.ok(playerRows.every(p => p.total_score > 0), 'All players must have positive cumulative scores');

        const [scoreRows] = await dbConn.execute(
          'SELECT player_id, score_awarded, is_drawer FROM player_round_scores'
        );
        console.log(`✅ MySQL player_round_scores table contains ${scoreRows.length} recorded entries.`);
        assert.ok(scoreRows.length >= 3, 'Must have at least 3 entries in player_round_scores');

        await dbConn.end();
        console.log('✅ MySQL database audit completely verified!');

        console.log('\n🎉 ALL PHASE 8 DYNAMIC SCORING & LEADERBOARD TESTS PASSED!');
        aliceSocket.disconnect();
        bobSocket.disconnect();
        charlieSocket.disconnect();
        process.exit(0);
      } catch (dbErr) {
        console.error('MySQL verification error:', dbErr);
        process.exit(1);
      }
    });
  });
}
