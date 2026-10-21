// Automated Verification Suite: Skribbl Activity Feed & Roster Sync
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Skribbl Activity Feed & Player Roster Sync Test ===\n');

const alice = io(SOCKET_URL, { reconnection: false }); // Host
const bob = io(SOCKET_URL, { reconnection: false });   // Guest

let roomId = null;
let aliceMessages = [];
let bobMessages = [];

alice.on('chat_message', (msg) => {
  aliceMessages.push(msg);
  console.log(`[Alice Chat] Received (${msg.type}): "${msg.text}"`);
});

bob.on('chat_message', (msg) => {
  bobMessages.push(msg);
  console.log(`[Bob Chat] Received (${msg.type}): "${msg.text}"`);
});

alice.on('connect', () => {
  console.log('[Alice] Connected:', alice.id);

  // 1. Alice creates room
  alice.emit('create_room', {
    hostName: 'AliceHost',
    avatarId: 'skribbl_0_0_0',
    settings: { maxPlayers: 4, totalRounds: 2, drawTimeSeconds: 20, wordOptionsCount: 3, hintsAllowed: 1, isPrivate: true },
  }, (res) => {
    assert.strictEqual(res.success, true);
    roomId = res.room.id;
    console.log(`[Alice] Created room ${roomId}`);

    setTimeout(() => {
      // Verify Alice received ROOM_OWNER and SYSTEM_INFO notices
      const hasOwnerMsg = aliceMessages.some(m => m.type === 'ROOM_OWNER' && m.text.includes('AliceHost is now the room owner!'));
      const hasMinPlayersMsg = aliceMessages.some(m => m.type === 'SYSTEM_INFO' && m.text.includes('You need at least 2 players to start the game!'));
      assert.strictEqual(hasOwnerMsg, true, 'Alice should have received ROOM_OWNER notice');
      assert.strictEqual(hasMinPlayersMsg, true, 'Alice should have received SYSTEM_INFO notice');
      console.log('✅ Step 1 Passed: Room owner and minimum player notice received!');

      // 2. Bob joins room
      bob.emit('join_room', {
        roomId,
        playerName: 'BobGuest',
        avatarId: 'skribbl_1_1_1',
      }, (bRes) => {
        assert.strictEqual(bRes.success, true);
        console.log(`[Bob] Joined room ${roomId}`);

        setTimeout(() => {
          // Verify both Alice and Bob received PLAYER_JOINED notice
          const aliceSawBobJoin = aliceMessages.some(m => m.type === 'PLAYER_JOINED' && m.text.includes('BobGuest joined the room!'));
          const bobSawBobJoin = bobMessages.some(m => m.type === 'PLAYER_JOINED' && m.text.includes('BobGuest joined the room!'));
          assert.strictEqual(aliceSawBobJoin, true, 'Alice should see Bob joined notice in chat feed');
          assert.strictEqual(bobSawBobJoin, true, 'Bob should see Bob joined notice in chat feed');
          console.log('✅ Step 2 Passed: Green "BobGuest joined the room!" notice verified on both clients!');

          // 3. Verify get_chat_history returns all messages
          bob.emit('get_chat_history', { roomId }, (histRes) => {
            assert.ok(histRes.messages.length >= 3, 'Chat history should contain at least owner, min players, and join messages');
            console.log(`✅ Step 3 Passed: Chat history verified (${histRes.messages.length} messages)`);

            // 4. Verify get_room_players returns 2 players
            alice.emit('get_room_players', { roomId }, (playersRes) => {
              assert.strictEqual(playersRes.players.length, 2, 'Room players count should be 2');
              console.log(`✅ Step 4 Passed: get_room_players verified with ${playersRes.players.length} players!`);

              // 5. Alice starts game -> verify broadcast includes roomDTO with 2 players
              alice.emit('start_game', { roomId }, (startRes) => {
                assert.strictEqual(startRes.success, true);
                console.log('✅ Step 5 Passed: Match started!');
              });
            });
          });
        }, 300);
      });
    }, 300);
  });
});

let startEventCount = 0;
function checkStartEvent(clientName, data) {
  assert.ok(data.room, 'start_game must contain roomDTO');
  assert.strictEqual(data.room.players.length, 2, 'roomDTO must contain both Alice and Bob');
  console.log(`✅ Verified ${clientName} received roomDTO with ${data.room.players.length} players!`);
  startEventCount++;

  if (startEventCount === 2) {
    // 6. Test Player Leaving notice
    console.log('\n--- Step 6: Testing Player Leave Notice ---');
    bob.disconnect();

    setTimeout(() => {
      const aliceSawBobLeave = aliceMessages.some(m => m.type === 'PLAYER_LEFT' && m.text.includes('BobGuest left the room!'));
      assert.strictEqual(aliceSawBobLeave, true, 'Alice should receive red "BobGuest left the room!" notice');
      console.log('✅ Step 6 Passed: Red "BobGuest left the room!" notice verified!');

      console.log('\n🎉 ALL SKRIBBL ACTIVITY FEED & ROSTER SYNC TESTS PASSED SUCCESSFULLY! 🎉\n');
      alice.disconnect();
      process.exit(0);
    }, 600);
  }
}

alice.on('start_game', (data) => checkStartEvent('Alice', data));
bob.on('start_game', (data) => checkStartEvent('Bob', data));

setTimeout(() => {
  console.error('❌ Test timed out!');
  process.exit(1);
}, 10000);
