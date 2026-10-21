// Automated Integration Test: Public Room Quick Play Matchmaking (REQ-NH-08)
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Public Room Quick Play Matchmaking Test Suite ===\n');

const clientA = io(SOCKET_URL, { reconnection: false });
let clientB = null;

clientA.on('connect', () => {
  console.log('Client A connected:', clientA.id);

  // Client A triggers quick play: with no open rooms, server should create a public room
  clientA.emit('quick_play', { playerName: 'PlayerA', avatarId: 'skribbl_1_0_0' }, (resA) => {
    assert.strictEqual(resA.success, true);
    assert.ok(resA.room.id, 'Room ID must be returned');
    assert.strictEqual(resA.room.settings.isPrivate, false, 'Room must be public');
    console.log(`✅ Step 1: Client A matched and created public room ${resA.room.id}`);

    const targetRoomId = resA.room.id;

    // Client B triggers quick play: server should match Client B into Client A's public room!
    clientB = io(SOCKET_URL, { reconnection: false });
    clientB.on('connect', () => {
      clientB.emit('quick_play', { playerName: 'PlayerB', avatarId: 'skribbl_2_1_1' }, (resB) => {
        assert.strictEqual(resB.success, true);
        assert.strictEqual(resB.room.id, targetRoomId, 'Client B must match into existing open public room');
        console.log(`✅ Step 2: Client B successfully matched into Client A's public room ${resB.room.id}`);

        console.log('\n🎉 ALL PUBLIC ROOM QUICK PLAY MATCHMAKING TESTS PASSED!');
        clientA.disconnect();
        clientB.disconnect();
        process.exit(0);
      });
    });
  });
});
