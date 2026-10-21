// Automated Integration Test: Skribbl.io Chat Separation for Solved and Unsolved Players
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Chat Separation Integration Test Suite ===\n');

async function runTest() {
  return new Promise((resolve, reject) => {
    const aliceSocket = io(SOCKET_URL, { reconnection: false });
    let bobSocket = null;
    let charlieSocket = null;

    let roomId = null;
    let alicePlayerId = null;
    let bobPlayerId = null;
    let charliePlayerId = null;

    let charlieReceivedSolvedChat = false;
    let bobReceivedSolvedChatCount = 0;
    let aliceReceivedSolvedChatCount = 0;

    aliceSocket.on('connect', () => {
      console.log('[Alice] Connected:', aliceSocket.id);

      aliceSocket.emit('create_room', {
        hostName: 'AliceDrawer',
        avatarId: 'skribbl_0_0_0',
        settings: { maxPlayers: 4, totalRounds: 2, drawTimeSeconds: 60, wordOptionsCount: 3, hintsAllowed: 2 },
      }, (createRes) => {
        assert.strictEqual(createRes.success, true);
        roomId = createRes.room.id;
        alicePlayerId = createRes.player.id;

        bobSocket = io(SOCKET_URL, { reconnection: false });
        bobSocket.on('connect', () => {
          bobSocket.emit('join_room', {
            roomId,
            playerName: 'BobGuesser',
            avatarId: 'skribbl_1_1_1',
          }, (joinBob) => {
            assert.strictEqual(joinBob.success, true);
            bobPlayerId = joinBob.player.id;

            charlieSocket = io(SOCKET_URL, { reconnection: false });
            charlieSocket.on('connect', () => {
              charlieSocket.emit('join_room', {
                roomId,
                playerName: 'CharlieGuesser',
                avatarId: 'skribbl_2_2_2',
              }, (joinCharlie) => {
                assert.strictEqual(joinCharlie.success, true);
                charliePlayerId = joinCharlie.player.id;

                console.log(`[Setup] Room ${roomId} assembled with Alice (Host), Bob, Charlie.`);
                setupListenersAndStart();
              });
            });
          });
        });
      });
    });

    function setupListenersAndStart() {
      // 1. Charlie listener: Charlie must NEVER receive GUESSED_CHAT while unsolved!
      charlieSocket.on('chat_message', (msg) => {
        if (msg.type === 'GUESSED_CHAT') {
          console.error('❌ LEAK DETECTED: Unsolved Charlie received GUESSED_CHAT:', msg);
          charlieReceivedSolvedChat = true;
        }
      });

      // 2. Bob listener: Bob receives GUESSED_CHAT after he guesses
      bobSocket.on('chat_message', (msg) => {
        if (msg.type === 'GUESSED_CHAT') {
          bobReceivedSolvedChatCount++;
          console.log(`✅ [Bob] Received solved green chat #${bobReceivedSolvedChatCount}: "${msg.text}" from ${msg.senderName}`);
        }
      });

      // 3. Alice (Drawer) listener: Alice receives GUESSED_CHAT
      aliceSocket.on('chat_message', (msg) => {
        if (msg.type === 'GUESSED_CHAT') {
          aliceReceivedSolvedChatCount++;
          console.log(`✅ [Alice (Drawer)] Received solved green chat #${aliceReceivedSolvedChatCount}: "${msg.text}" from ${msg.senderName}`);
        }
      });

      // Turn selection: Alice picks word
      aliceSocket.on('word_selection_start', (data) => {
        console.log('[Alice] Selecting word: "burger"');
        aliceSocket.emit('select_word', { roomId, word: 'burger' });
      });

      aliceSocket.on('turn_start', async (data) => {
        if (data.role === 'DRAWER') {
          console.log('\n--- Turn Started! Testing Chat Separation Lifecycle ---');
          await executeTestSteps();
        }
      });

      aliceSocket.emit('start_game', { roomId });
    }

    async function executeTestSteps() {
      try {
        // Step 1: Unsolved Bob sends regular wrong guess
        console.log('\n--- Step 1: Bob sends regular wrong guess ("pizza") ---');
        await new Promise((res) => {
          const onMsg = (msg) => {
            if (msg.text === 'pizza') {
              console.log('✅ Charlie received normal guess from Bob: "pizza"');
              charlieSocket.off('chat_message', onMsg);
              res();
            }
          };
          charlieSocket.on('chat_message', onMsg);
          bobSocket.emit('send_chat_message', { roomId, text: 'pizza' });
        });

        // Step 2: Bob guesses correctly ("burger")
        console.log('\n--- Step 2: Bob guesses correctly ("burger") ---');
        await new Promise((res) => {
          let charlieSawSuccess = false;
          let bobSawSelfSuccess = false;

          const checkDone = () => {
            if (charlieSawSuccess && bobSawSelfSuccess) res();
          };

          charlieSocket.on('chat_message', (msg) => {
            if (msg.type === 'SUCCESS' && msg.text.includes('BobGuesser')) {
              console.log('✅ Charlie received public notification: "BobGuesser guessed the word!"');
              charlieSawSuccess = true;
              checkDone();
            }
          });

          bobSocket.on('chat_message', (msg) => {
            if (msg.type === 'SELF_SUCCESS') {
              console.log('✅ Bob received private notification: "You guessed the word!"');
              bobSawSelfSuccess = true;
              checkDone();
            }
          });

          bobSocket.emit('send_chat_message', { roomId, text: 'burger' });
        });

        // Step 3: Solved Bob sends subsequent messages ("it was so easy burger")
        console.log('\n--- Step 3: Solved Bob sends messages while Charlie is still guessing ---');
        bobSocket.emit('send_chat_message', { roomId, text: 'haha it was so easy burger' });
        bobSocket.emit('send_chat_message', { roomId, text: 'look at the green bun' });

        // Wait 500ms to allow delivery and verify Charlie received NONE
        await new Promise((r) => setTimeout(r, 600));

        assert.strictEqual(charlieReceivedSolvedChat, false, 'Charlie must NOT receive solved chat!');
        assert.ok(bobReceivedSolvedChatCount >= 2, 'Bob must receive his own solved chat messages');
        assert.ok(aliceReceivedSolvedChatCount >= 2, 'Drawer Alice must receive solved chat messages');
        console.log('✅ Requirement 2 & 3 Verified: Solved messages delivered to Solved Bob & Drawer Alice, but 100% hidden from Unsolved Charlie!');

        // Step 4: Verify Drawer cannot chat
        console.log('\n--- Step 4: Verify Drawer Alice is prevented from chatting ---');
        aliceSocket.emit('send_chat_message', { roomId, text: 'I am drawing a burger' }, (res) => {
          assert.strictEqual(res.success, false);
          console.log('✅ Drawer chat blocked by backend:', res.error);
        });

        // Step 5: Charlie requests chat history: Must NOT contain GUESSED_CHAT
        console.log('\n--- Step 5: Test chat history filtering for unsolved Charlie ---');
        charlieSocket.emit('get_chat_history', { roomId }, (historyRes) => {
          assert.ok(historyRes.messages && historyRes.messages.length > 0);
          const hasSolvedInHistory = historyRes.messages.some((m) => m.type === 'GUESSED_CHAT');
          assert.strictEqual(hasSolvedInHistory, false, 'Chat history for unsolved player must NOT contain GUESSED_CHAT');
          console.log('✅ Requirement 8 Verified: Unsolved player chat history does not leak solved messages!');

          // Cleanup and finish
          aliceSocket.disconnect();
          bobSocket.disconnect();
          charlieSocket.disconnect();
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    }
  });
}

runTest()
  .then(() => {
    console.log('\n🎉 ALL CHAT SEPARATION & ANTI-SPOILER TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
