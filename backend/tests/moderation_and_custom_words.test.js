// Automated Integration Test: Host Moderation (Kick Player) & Custom Words Support
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');
const mysql = require('../node_modules/mysql2/promise');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Phase 10 Host Moderation & Custom Words Test Suite ===\n');

const aliceSocket = io(SOCKET_URL, { reconnection: false });
let bobSocket = null;
let charlieSocket = null;

let roomId = null;
let alicePlayerId = null;
let bobPlayerId = null;
let charliePlayerId = null;

aliceSocket.on('connect', () => {
  console.log('Alice (Host) connected:', aliceSocket.id);

  // 1. Create Room with Custom Word List
  const customWords = ['superhero', 'telescope', 'marshmallow'];
  aliceSocket.emit(
    'create_room',
    {
      hostName: 'AliceModerator',
      avatarId: 'skribbl_0_0_0',
      settings: {
        maxPlayers: 5,
        totalRounds: 2,
        drawTimeSeconds: 5,
        wordOptionsCount: 3,
        hintsAllowed: 1,
        customWords,
      },
    },
    (createRes) => {
      assert.strictEqual(createRes.success, true);
      roomId = createRes.room.id;
      alicePlayerId = createRes.player.id;
      assert.deepStrictEqual(createRes.room.settings.customWords, customWords);
      console.log(`✅ Step 1: Alice created room ${roomId} with custom words: [${customWords.join(', ')}]`);

      // 2. Bob joins room
      bobSocket = io(SOCKET_URL, { reconnection: false });
      bobSocket.on('connect', () => {
        bobSocket.emit(
          'join_room',
          { roomId, playerName: 'BobTroll', avatarId: 'skribbl_1_1_1' },
          (joinBobRes) => {
            assert.strictEqual(joinBobRes.success, true);
            bobPlayerId = joinBobRes.player.id;
            console.log(`✅ Step 2: Bob joined room ${roomId}`);

            // 3. Charlie joins room
            charlieSocket = io(SOCKET_URL, { reconnection: false });
            charlieSocket.on('connect', () => {
              charlieSocket.emit(
                'join_room',
                { roomId, playerName: 'CharliePlayer', avatarId: 'skribbl_2_2_2' },
                (joinCharlieRes) => {
                  assert.strictEqual(joinCharlieRes.success, true);
                  charliePlayerId = joinCharlieRes.player.id;
                  console.log(`✅ Step 3: Charlie joined room ${roomId}`);

                  runModerationTests();
                }
              );
            });
          }
        );
      });
    }
  );
});

function runModerationTests() {
  console.log('\n--- Testing Host Moderation & Security Boundaries ---');

  // Security Check 1: Non-host Bob tries to kick Alice -> MUST FAIL
  bobSocket.emit('kick_player', { roomId, targetPlayerId: alicePlayerId }, (failRes) => {
    assert.strictEqual(failRes.success, false);
    assert.strictEqual(failRes.error, 'Only the host can kick players.');
    console.log('✅ Security Check 1 Passed: Non-host cannot kick players');

    // Security Check 2: Host Alice tries to kick herself -> MUST FAIL
    aliceSocket.emit('kick_player', { roomId, targetPlayerId: alicePlayerId }, (selfKickRes) => {
      assert.strictEqual(selfKickRes.success, false);
      assert.strictEqual(selfKickRes.error, 'Cannot kick the room host.');
      console.log('✅ Security Check 2 Passed: Host cannot kick herself');

    // Action 3: Host Alice kicks disruptive player Bob
    bobSocket.once('kicked', (kickData) => {
      console.log(`✅ Action 3 Passed: Bob received kicked event! Reason: "${kickData.reason}"`);

      // Verify remaining roster broadcast to Charlie
      charlieSocket.once('player_left', async (leftData) => {
        assert.strictEqual(leftData.playerId, bobPlayerId);
        assert.strictEqual(leftData.players.length, 2);
        assert.ok(!leftData.players.some((p) => p.id === bobPlayerId));
        console.log('✅ Action 3 Passed: Charlie received player_left broadcast for kicked player Bob');

        // Verify MySQL database deletion
        try {
          const dbConn = await mysql.createConnection({
            host: '127.0.0.1',
            port: 3307,
            user: 'skribbl_user',
            password: 'skribbl_password',
            database: 'skribbl_db',
          });

          const [rows] = await dbConn.execute('SELECT * FROM players WHERE player_id = ?', [bobPlayerId]);
          assert.strictEqual(rows.length, 0, 'Kicked player must be deleted from MySQL players table');
          await dbConn.end();
          console.log('✅ MySQL Database Check: Bob verified completely removed from database!');

          testCustomWordGameStart();
        } catch (dbErr) {
          console.error('MySQL audit error:', dbErr);
          process.exit(1);
        }
      });
    });

    aliceSocket.emit('kick_player', { roomId, targetPlayerId: bobPlayerId });
    });
  });
}

function testCustomWordGameStart() {
  console.log('\n--- Testing Custom Word List Selection on Game Start ---');

  aliceSocket.once('word_selection_start', (data) => {
    console.log('✅ Word options received by drawer Alice:', data.words.map((w) => w.word));
    const customWordsExpected = ['superhero', 'telescope', 'marshmallow'];
    const matched = data.words.every((w) => customWordsExpected.includes(w.word) && w.category === 'CUSTOM');
    assert.ok(matched, 'All word options must be drawn from custom words with CUSTOM category');
    console.log('✅ Custom Words Check: Drawer received words exclusively from host-configured custom list!');

    console.log('\n🎉 ALL PHASE 10 HOST MODERATION & CUSTOM WORDS TESTS PASSED!');
    aliceSocket.disconnect();
    bobSocket.disconnect();
    charlieSocket.disconnect();
    process.exit(0);
  });

  aliceSocket.emit('start_game', { roomId });
}
