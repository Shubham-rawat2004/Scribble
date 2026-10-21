// Automated Multi-Turn Rotation & Drawer Privilege Test
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Multi-Turn Rotation & Drawer Privilege Verification Suite ===\n');

const aliceSocket = io(SOCKET_URL, { reconnection: false });
const bobSocket = io(SOCKET_URL, { reconnection: false });

let roomId = null;
let alicePlayerId = null;
let bobPlayerId = null;

let currentTurnNumber = 0;

aliceSocket.on('connect', () => {
  console.log('[Alice] Connected:', aliceSocket.id);

  aliceSocket.emit('create_room', {
    hostName: 'AliceHost',
    avatarId: 'skribbl_0_0_0',
    settings: { maxPlayers: 4, totalRounds: 2, drawTimeSeconds: 3, wordOptionsCount: 3, hintsAllowed: 1 },
  }, (createRes) => {
    assert.strictEqual(createRes.success, true);
    roomId = createRes.room.id;
    alicePlayerId = createRes.player.id;
    console.log(`[Alice] Created room: ${roomId} (Player ID: ${alicePlayerId})`);

    const proceedWithBob = () => {
      console.log('[Bob] Connected:', bobSocket.id);

      bobSocket.emit('join_room', {
        roomId,
        playerName: 'BobDrawer',
        avatarId: 'skribbl_1_1_1',
      }, (joinRes) => {
        assert.strictEqual(joinRes.success, true);
        bobPlayerId = joinRes.player.id;
        console.log(`[Bob] Joined room: ${roomId} (Player ID: ${bobPlayerId})`);

        // --- Turn 1 Listeners ---
        aliceSocket.on('word_selection_start', (data) => {
          console.log(`[Alice] Received word_selection_start (drawerId: ${data.drawerId}, words count: ${data.words?.length})`);
          assert.strictEqual(data.drawerId, alicePlayerId);
          assert.ok(data.words.length > 0);

          // Alice chooses first word
          const chosen = data.words[0].word;
          aliceSocket.emit('select_word', { roomId, word: chosen }, (ack) => {
            assert.strictEqual(ack.success, true);
            console.log(`[Alice] Successfully selected word: "${chosen}"`);
          });
        });

        bobSocket.on('drawer_choosing_word', (data) => {
          if (data.drawerId === alicePlayerId) {
            console.log(`[Bob] Received drawer_choosing_word for Alice: "${data.drawerName}"`);
            assert.strictEqual(data.drawerId, alicePlayerId);
          }
        });

        aliceSocket.on('turn_start', (data) => {
          currentTurnNumber = data.currentTurn;
          if (data.currentTurn === 1) {
            console.log(`[Alice] Turn 1 started as DRAWER. Plaintext word: "${data.secretWord}", drawerId: ${data.drawerId}`);
            assert.strictEqual(data.role, 'DRAWER');
            assert.strictEqual(data.drawerId, alicePlayerId);
            assert.ok(data.secretWord);
          } else if (data.currentTurn === 2) {
            console.log(`[Alice] Turn 2 started as GUESSER! Word mask: "${data.wordMask}", drawerId: ${data.drawerId}`);
            assert.strictEqual(data.role, 'GUESSER');
            assert.strictEqual(data.drawerId, bobPlayerId);
            assert.strictEqual(data.secretWord, undefined, 'Alice must NOT see plaintext word in Turn 2!');

            // Alice tries to draw during Turn 2 (MUST BE REJECTED)
            aliceSocket.emit('draw_start', {
              roomId,
              stroke: {
                id: 'unauthorized_stroke_alice',
                tool: 'brush',
                color: '#ff0000',
                size: 4,
                points: [{ x: 10, y: 10, pressure: 1 }],
              },
            }, (res) => {
              assert.strictEqual(res.success, false, 'Alice draw attempt MUST fail when she is guesser!');
              console.log('✅ Security Verified: Alice (guesser in Turn 2) unauthorized draw rejected as expected!');
            });
          }
        });

        bobSocket.on('turn_start', (data) => {
          if (data.currentTurn === 1) {
            console.log(`[Bob] Turn 1 started as GUESSER. Word mask: "${data.wordMask}", drawerId: ${data.drawerId}`);
            assert.strictEqual(data.role, 'GUESSER');
            assert.strictEqual(data.drawerId, alicePlayerId);
            assert.strictEqual(data.secretWord, undefined, 'Bob must NOT see plaintext word in Turn 1!');
          } else if (data.currentTurn === 2) {
            console.log(`[Bob] Turn 2 started as DRAWER! Plaintext word: "${data.secretWord}", drawerId: ${data.drawerId}`);
            assert.strictEqual(data.role, 'DRAWER');
            assert.strictEqual(data.drawerId, bobPlayerId);
            assert.ok(data.secretWord);

            // Bob draws a stroke (MUST SUCCEED)
            bobSocket.emit('draw_start', {
              roomId,
              stroke: {
                id: 'authorized_stroke_bob',
                tool: 'brush',
                color: '#00ff00',
                size: 6,
                points: [{ x: 50, y: 50, pressure: 1 }],
              },
            }, (res) => {
              assert.strictEqual(res.success, true, 'Bob draw attempt MUST succeed when he is drawer!');
              console.log('✅ Privilege Verified: Bob (drawer in Turn 2) stroke accepted by server!');
            });
          }
        });

        // --- Turn 2 Word Selection for Bob ---
        bobSocket.on('word_selection_start', (data) => {
          console.log(`\n🎯 [Bob] RECEIVED word_selection_start for Turn 2! (drawerId: ${data.drawerId}, words count: ${data.words?.length})`);
          assert.strictEqual(data.drawerId, bobPlayerId, 'word_selection_start drawerId MUST match Bob!');
          assert.ok(data.words.length > 0, 'Word options list MUST not be empty!');
          console.log(`[Bob] Word options: ${data.words.map(w => w.word).join(', ')}`);

          // Bob selects word
          const chosenBob = data.words[0].word;
          setTimeout(() => {
            bobSocket.emit('select_word', { roomId, word: chosenBob }, (ack) => {
              assert.strictEqual(ack.success, true);
              console.log(`[Bob] Successfully selected word: "${chosenBob}"`);
            });
          }, 300);
        });

        aliceSocket.on('drawer_choosing_word', (data) => {
          if (data.drawerId === bobPlayerId) {
            console.log(`\n🎯 [Alice] RECEIVED drawer_choosing_word for Bob! (drawerName: ${data.drawerName}, drawerId: ${data.drawerId})`);
            assert.strictEqual(data.drawerId, bobPlayerId);
            assert.strictEqual(data.drawerName, 'BobDrawer');
          }
        });

        // Verify stroke broadcast
        aliceSocket.on('draw_start', (payload) => {
          if (payload.stroke.id === 'authorized_stroke_bob') {
            console.log('✅ Real-Time Sync Verified: Alice successfully received Bob drawing stroke in Turn 2!');
          }
        });

        // End of test when Turn 2 finishes
        bobSocket.on('turn_end', (data) => {
          console.log(`[Turn End] Turn completed! Secret word was "${data.secretWord}".`);
          if (currentTurnNumber === 2) {
            console.log('\n======================================================');
            console.log('🎉 SUCCESS: MULTI-TURN ROTATION & DRAWER PRIVILEGES VERIFIED!');
            console.log('- Turn 1: Alice received word options and drawer privileges.');
            console.log('- Turn 2: Bob received word options and drawer privileges.');
            console.log('- Role transition and synchronization verified across both clients.');
            console.log('- Server authority correctly enforced drawing privileges.');
            console.log('======================================================\n');
            aliceSocket.disconnect();
            bobSocket.disconnect();
            process.exit(0);
          }
        });

        // Host starts the match
        setTimeout(() => {
          console.log('[Alice] Emitting start_game...');
          aliceSocket.emit('start_game', { roomId }, (res) => {
            assert.strictEqual(res.success, true);
          });
        }, 500);
      });
    };

    if (bobSocket.connected) {
      proceedWithBob();
    } else {
      bobSocket.once('connect', proceedWithBob);
    }
  });
});
