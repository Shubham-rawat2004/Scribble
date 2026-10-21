// Automated Multi-Client Integration Test: Player Disconnection During Active Game
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Player Disconnection & Auto Game Termination Test Suite ===\n');

async function runTest() {
  return new Promise((resolve, reject) => {
    const aliceSocket = io(SOCKET_URL, { reconnection: false });
    let bobSocket = null;
    let charlieSocket = null;

    let roomId = null;
    let alicePlayerId = null;
    let bobPlayerId = null;

    aliceSocket.on('connect', () => {
      console.log('[Alice] Connected:', aliceSocket.id);

      aliceSocket.emit('create_room', {
        hostName: 'AliceDrawer',
        avatarId: 'skribbl_0_0_0',
        settings: { maxPlayers: 4, totalRounds: 3, drawTimeSeconds: 60, wordOptionsCount: 3, hintsAllowed: 2 },
      }, (createRes) => {
        assert.strictEqual(createRes.success, true);
        roomId = createRes.room.id;
        alicePlayerId = createRes.player.id;
        console.log(`[Alice] Created room ${roomId} (PlayerId: ${alicePlayerId})`);

        bobSocket = io(SOCKET_URL, { reconnection: false });
        bobSocket.on('connect', () => {
          console.log('[Bob] Connected:', bobSocket.id);

          bobSocket.emit('join_room', {
            roomId,
            playerName: 'BobGuesser',
            avatarId: 'skribbl_1_1_1',
          }, (joinRes) => {
            assert.strictEqual(joinRes.success, true);
            bobPlayerId = joinRes.player.id;
            console.log(`[Bob] Joined room ${roomId} (PlayerId: ${bobPlayerId})`);

            // Setup listeners for Alice
            aliceSocket.on('word_selection_start', (data) => {
              console.log('[Alice] Received word_selection_start. Choosing word:', data.words[0].word);
              aliceSocket.emit('select_word', { roomId, word: data.words[0].word });
            });

            aliceSocket.on('turn_start', (data) => {
              if (data.role === 'DRAWER') {
                console.log('--- Drawing turn started! Now Bob disconnects during the match... ---');
                
                // Bob disconnects while Alice is drawing!
                setTimeout(() => {
                  console.log('[Bob] Disconnecting socket...');
                  bobSocket.disconnect();
                }, 300);
              }
            });

            aliceSocket.on('game_over', (data) => {
              console.log('\n✅ [Alice] Received game_over event!');
              console.log('   Reason:', data.reason);
              console.log('   Winner by default:', data.winnerByDefault);
              console.log('   Message:', data.message);
              console.log('   Winner:', data.winner?.name, `(Score: ${data.winner?.score})`);

              // Verifications
              try {
                assert.strictEqual(data.reason, 'ALL_PLAYERS_LEFT');
                assert.strictEqual(data.winnerByDefault, true);
                assert.strictEqual(data.winner.id, alicePlayerId);
                assert.strictEqual(data.message, 'Game Over! All other players have left. You are the winner!');
                console.log('✅ Requirement 1, 2, 3, 4: Alice declared winner by default with matching message!');

                // Step 5: Test Return to Lobby and Start with new player
                console.log('\n--- Step 5: Alice returns to lobby and waits for new player ---');
                aliceSocket.emit('return_to_lobby', { roomId }, (res) => {
                  assert.strictEqual(res.success, true);
                  console.log('✅ Alice successfully reset room to LOBBY status');

                  // Verify Alice alone cannot start game
                  aliceSocket.emit('start_game', { roomId }, (startRes) => {
                    assert.strictEqual(startRes.success, false);
                    console.log('✅ Correctly blocked starting with only 1 player:', startRes.error);

                    // Charlie joins
                    charlieSocket = io(SOCKET_URL, { reconnection: false });
                    charlieSocket.on('connect', () => {
                      charlieSocket.emit('join_room', {
                        roomId,
                        playerName: 'CharlieNewPlayer',
                        avatarId: 'skribbl_2_2_2',
                      }, (charlieJoin) => {
                        assert.strictEqual(charlieJoin.success, true);
                        console.log('✅ Charlie joined. Now 2 players in room!');

                        // Now Alice starts new match
                        aliceSocket.emit('start_game', { roomId }, (newStartRes) => {
                          assert.strictEqual(newStartRes.success, true);
                          console.log('✅ Alice successfully started new game with Charlie!');

                          aliceSocket.disconnect();
                          charlieSocket.disconnect();
                          resolve();
                        });
                      });
                    });
                  });
                });
              } catch (err) {
                reject(err);
              }
            });

            // Start game
            console.log('[Alice] Starting game with 2 players...');
            aliceSocket.emit('start_game', { roomId });
          });
        });
      });
    });
  });
}

async function testDrawerLeaves() {
  return new Promise((resolve, reject) => {
    console.log('\n======================================================');
    console.log('=== Test 2: Active Drawer Leaves Match -> Guesser Wins ===');
    console.log('======================================================\n');

    const aliceSocket = io(SOCKET_URL, { reconnection: false });
    let bobSocket = null;

    let roomId = null;
    let alicePlayerId = null;
    let bobPlayerId = null;

    aliceSocket.on('connect', () => {
      console.log('[Test 2 Alice (Drawer)] Connected');

      aliceSocket.emit('create_room', {
        hostName: 'AliceDrawer2',
        avatarId: 'skribbl_0_0_0',
        settings: { maxPlayers: 4, totalRounds: 2, drawTimeSeconds: 60, wordOptionsCount: 3, hintsAllowed: 2 },
      }, (createRes) => {
        roomId = createRes.room.id;
        alicePlayerId = createRes.player.id;

        bobSocket = io(SOCKET_URL, { reconnection: false });
        bobSocket.on('connect', () => {
          console.log('[Test 2 Bob (Guesser)] Connected');

          bobSocket.emit('join_room', {
            roomId,
            playerName: 'BobGuesser2',
            avatarId: 'skribbl_1_1_1',
          }, (joinRes) => {
            bobPlayerId = joinRes.player.id;

            // Bob listens for game_over
            bobSocket.on('game_over', (data) => {
              console.log('\n✅ [Bob (Guesser)] Received game_over event!');
              console.log('   Reason:', data.reason);
              console.log('   Winner by default:', data.winnerByDefault);
              console.log('   Winner:', data.winner?.name);

              try {
                assert.strictEqual(data.reason, 'ALL_PLAYERS_LEFT');
                assert.strictEqual(data.winnerByDefault, true);
                assert.strictEqual(data.winner.id, bobPlayerId);
                assert.strictEqual(data.message, 'Game Over! All other players have left. You are the winner!');
                console.log('✅ Requirement 4 verified: Guesser Bob declared winner by default when drawer leaves!');

                bobSocket.disconnect();
                resolve();
              } catch (err) {
                reject(err);
              }
            });

            // Alice selects word and then disconnects
            aliceSocket.on('word_selection_start', (data) => {
              console.log('[Alice] Selecting word and then disconnecting as drawer...');
              aliceSocket.emit('select_word', { roomId, word: data.words[0].word });
              setTimeout(() => {
                console.log('[Alice] Disconnecting active drawer!');
                aliceSocket.disconnect();
              }, 200);
            });

            aliceSocket.emit('start_game', { roomId });
          });
        });
      });
    });
  });
}

runTest()
  .then(() => testDrawerLeaves())
  .then(() => {
    console.log('\n🎉 ALL PLAYER DISCONNECTION & AUTO TERMINATION TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
