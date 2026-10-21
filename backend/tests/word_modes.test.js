// Automated Integration Test: Word Modes (Hidden & Combination Modes)
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Word Modes (Hidden & Combination) Verification Suite ===\n');

// --- Test A: Hidden Mode ---
console.log('--- Step 1: Testing Hidden Mode (Concealed length and no letter hints) ---');
const alice = io(SOCKET_URL, { reconnection: false }); // Host/Drawer
const bob = io(SOCKET_URL, { reconnection: false });   // Guesser

let hiddenRoomId = null;

alice.on('connect', () => {
  alice.emit('create_room', {
    hostName: 'AliceDrawer',
    settings: {
      maxPlayers: 2,
      totalRounds: 1,
      drawTimeSeconds: 15,
      wordOptionsCount: 3,
      hintsAllowed: 2,
      gameMode: 'Hidden',
      isPrivate: true,
    },
  }, (res) => {
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.room.settings.gameMode, 'Hidden');
    hiddenRoomId = res.room.id;
    console.log(`[Alice] Created Hidden Mode room: ${hiddenRoomId}`);

    bob.emit('join_room', {
      roomId: hiddenRoomId,
      playerName: 'BobGuesser',
    }, (bRes) => {
      assert.strictEqual(bRes.success, true);
      console.log(`[Bob] Joined Hidden Mode room ${hiddenRoomId}`);

      alice.emit('start_game', { roomId: hiddenRoomId });
    });
  });
});

alice.on('word_selection_start', (data) => {
  console.log('[Alice] Selecting word "elephant"...');
  alice.emit('select_word', { roomId: hiddenRoomId, word: 'elephant' });
});

bob.on('turn_start', (data) => {
  console.log(`[Bob] Turn started! Mask: "${data.wordMask}", WordLength: ${data.wordLength}, GameMode: ${data.gameMode}`);
  assert.strictEqual(data.gameMode, 'Hidden', 'GameMode must be Hidden');
  assert.strictEqual(data.wordMask, '? ? ?', 'Word mask in Hidden mode must be "? ? ?"');
  assert.strictEqual(data.wordLength, 0, 'WordLength must be 0 in Hidden mode so length is concealed');
  console.log('✅ Hidden Mode Mask Verification Passed!');

  // Bob guesses the word
  bob.emit('send_chat_message', { roomId: hiddenRoomId, text: 'elephant' }, (ack) => {
    assert.strictEqual(ack.success, true);
    console.log('✅ Bob correctly guessed word in Hidden Mode!');

    alice.disconnect();
    bob.disconnect();
    runCombinationTest();
  });
});

// --- Test B: Combination Mode ---
function runCombinationTest() {
  console.log('\n--- Step 2: Testing Combination Mode (Compound / Combination phrases) ---');
  const host = io(SOCKET_URL, { reconnection: false });
  const guest = io(SOCKET_URL, { reconnection: false });

  let comboRoomId = null;

  host.on('connect', () => {
    host.emit('create_room', {
      hostName: 'HostCombo',
      settings: {
        maxPlayers: 2,
        totalRounds: 1,
        drawTimeSeconds: 20,
        wordOptionsCount: 3,
        gameMode: 'Combination',
        isPrivate: true,
      },
    }, (res) => {
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.room.settings.gameMode, 'Combination');
      comboRoomId = res.room.id;

      guest.emit('join_room', {
        roomId: comboRoomId,
        playerName: 'GuestCombo',
      }, () => {
        host.emit('start_game', { roomId: comboRoomId });
      });
    });
  });

  host.on('word_selection_start', (data) => {
    console.log('[Host] Combination word choices received:', data.words.map(w => w.word));
    assert.ok(data.words.length >= 1);
    // Verify categories are COMBINATION
    const hasCombo = data.words.some(w => w.category === 'COMBINATION');
    assert.strictEqual(hasCombo, true, 'Word choices should contain COMBINATION category words');
    console.log('✅ Combination Mode Word Selection Verified!');

    host.disconnect();
    guest.disconnect();
    console.log('\n🎉 ALL WORD MODES (HIDDEN & COMBINATION) TESTS PASSED! 🎉\n');
    process.exit(0);
  });
}

setTimeout(() => {
  console.error('❌ Test timed out!');
  process.exit(1);
}, 10000);
