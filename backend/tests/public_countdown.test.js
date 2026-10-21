// Automated Integration Test: Public Matchmaking with Auto-Start Countdown
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Public Matchmaking Auto-Start Countdown Test Suite ===\n');

const clientA = io(SOCKET_URL, { reconnection: false });
let clientB = null;

let targetRoomId = null;
let countdownTicks = [];

clientA.on('connect', () => {
  console.log('Client A connected:', clientA.id);

  // Client A triggers quick play
  clientA.emit('quick_play', { playerName: 'RandomAlice', avatarId: 'skribbl_0_0_0' }, (resA) => {
    assert.strictEqual(resA.success, true);
    targetRoomId = resA.room.id;
    assert.strictEqual(resA.room.settings.isPrivate, false, 'Room must be public');
    console.log(`✅ Step 1: Client A created open public room ${targetRoomId}`);

    // Client B triggers quick play (joins Client A's public room)
    clientB = io(SOCKET_URL, { reconnection: false });
    clientB.on('connect', () => {
      clientB.on('game_started', () => {
        clientBGameStarted = true;
        checkFinished();
      });

      // Set up countdown listener on Client A and Client B
      clientA.on('lobby_countdown', (data) => {
        countdownTicks.push(data.countdown);
        console.log(`⏱️ Client A received lobby_countdown: ${data.countdown}s remaining`);
      });

      clientB.on('lobby_countdown', (data) => {
        console.log(`⏱️ Client B received lobby_countdown: ${data.countdown}s remaining`);
      });

      clientB.emit('quick_play', { playerName: 'RandomBob', avatarId: 'skribbl_1_1_1' }, (resB) => {
        assert.strictEqual(resB.success, true);
        assert.strictEqual(resB.room.id, targetRoomId, 'Client B must match into Client A public room');
        console.log(`✅ Step 2: Client B matched into Client A public room ${targetRoomId}`);

        // Wait 2.5 seconds to observe countdown ticks, then simulate host "Start Immediately"
        setTimeout(() => {
          assert.ok(countdownTicks.length >= 1, 'Must have received at least one countdown tick');
          console.log(`✅ Step 3: Verified countdown ticks received: [${countdownTicks.join(', ')}]`);

          // Test: Host triggers start_game to begin immediately
          clientA.emit('start_game', { roomId: targetRoomId }, (startRes) => {
            assert.strictEqual(startRes.success, true);
            console.log('✅ Step 4: Host clicked start_game, successfully launched public match!');
          });
        }, 2200);
      });
    });
  });
});

// Verify game start broadcast received on both clients
let clientAGameStarted = false;
let clientBGameStarted = false;

clientA.on('game_started', () => {
  clientAGameStarted = true;
  checkFinished();
});

function checkFinished() {
  if (clientAGameStarted && clientBGameStarted) {
    console.log('✅ Step 5: Both random clients received game_started broadcast!');
    console.log('\n🎉 ALL PUBLIC MATCHMAKING & AUTO-START TESTS PASSED!');
    clientA.disconnect();
    clientB.disconnect();
    process.exit(0);
  }
}
