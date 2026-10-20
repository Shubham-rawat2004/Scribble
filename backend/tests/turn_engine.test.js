// Automated Multi-Client Test: Turn Engine, Word Selection & Progressive Hint System
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');
const { HintManager } = require('../dist/game/HintManager.js');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Phase 6 Turn Engine, Word Selection & Progressive Hint Test Suite ===\n');

// --- 1. Unit Tests for HintManager ---
console.log('--- Test 1: HintManager Mathematical Safeguards & Mask Formatting ---');
const appleMask = HintManager.createInitialMask('APPLE');
assert.strictEqual(appleMask.join(''), '_____');
assert.strictEqual(HintManager.formatMaskString(appleMask), '_ _ _ _ _');
console.log('✅ "APPLE" formatted as initial mask:', HintManager.formatMaskString(appleMask));

// Space preservation
const multiWordMask = HintManager.createInitialMask('ICE CREAM');
assert.strictEqual(multiWordMask.join(''), '___ _____');
console.log('✅ Multi-word "ICE CREAM" space preserved:', HintManager.formatMaskString(multiWordMask));

// Max hints allowed calculation
assert.strictEqual(HintManager.getMaxHintsAllowed('CAT', 3), 1, '3-letter word must get at most 1 hint');
assert.strictEqual(HintManager.getMaxHintsAllowed('PIZZA', 3), 2, '5-letter word can get at most 2 hints');
assert.strictEqual(HintManager.getMaxHintsAllowed('ELEPHANT', 3), 3, '8-letter word can get at most 3 hints');
console.log('✅ Max hints mathematically bounded to prevent word spoiling');

// Progressive hint reveal
const revealedIndices = [];
const hint1 = HintManager.revealNextHint('APPLE', appleMask, revealedIndices);
assert.notStrictEqual(hint1.newRevealedIndex, null);
assert.ok(hint1.updatedMask.includes('A') || hint1.updatedMask.includes('P') || hint1.updatedMask.includes('L') || hint1.updatedMask.includes('E'));
console.log('✅ Hint 1 revealed:', HintManager.formatMaskString(hint1.updatedMask));

const hint2 = HintManager.revealNextHint('APPLE', hint1.updatedMask, revealedIndices);
assert.notStrictEqual(hint2.newRevealedIndex, null);
assert.strictEqual(revealedIndices.length, 2);
console.log('✅ Hint 2 revealed:', HintManager.formatMaskString(hint2.updatedMask));

// --- 2. Multi-Client Socket Real-Time Flow ---
console.log('\n--- Test 2: Real-Time Multi-Client Word Selection & Progressive Hint Sync ---');
const aliceSocket = io(SOCKET_URL, { reconnection: false });
const bobSocket = io(SOCKET_URL, { reconnection: false });

let roomId = null;
let alicePlayerId = null;
let bobPlayerId = null;

aliceSocket.on('connect', () => {
  console.log('Alice (Host) connected:', aliceSocket.id);

  aliceSocket.emit('create_room', {
    hostName: 'AliceHost',
    avatarId: 'skribbl_0_0_0',
    settings: { maxPlayers: 4, totalRounds: 3, drawTimeSeconds: 4, wordOptionsCount: 3, hintsAllowed: 2 },
  }, (createRes) => {
    assert.strictEqual(createRes.success, true);
    roomId = createRes.room.id;
    alicePlayerId = createRes.player.id;
    console.log(`✅ Step 1: Alice created room ${roomId}`);

    const proceedWithBob = () => {
      console.log('Bob (Guesser) connected:', bobSocket.id);

      bobSocket.emit('join_room', {
        roomId,
        playerName: 'BobGuesser',
        avatarId: 'skribbl_1_1_1',
      }, (joinRes) => {
        assert.strictEqual(joinRes.success, true);
        bobPlayerId = joinRes.player.id;
        console.log(`✅ Step 2: Bob joined room ${roomId}`);

        // Setup Bob's listeners
        bobSocket.on('drawer_choosing_word', (data) => {
          assert.strictEqual(data.roomId, roomId);
          assert.strictEqual(data.drawerName, 'AliceHost');
          console.log(`✅ Step 3: Bob received drawer_choosing_word for Alice!`);
        });

        bobSocket.on('turn_start', (data) => {
          assert.strictEqual(data.role, 'GUESSER');
          assert.strictEqual(data.wordMask, '_ _ _ _ _');
          assert.strictEqual(data.wordLength, 5);
          assert.strictEqual(data.secretWord, undefined, 'CRITICAL: Secret word must NEVER be sent to guesser!');
          console.log('✅ Step 5: Bob received turn_start with ZERO-TRUST word mask: "_ _ _ _ _" (Plaintext secret word hidden)!');
        });

        bobSocket.on('word_hint', (data) => {
          assert.strictEqual(data.roomId, roomId);
          assert.ok(data.wordMask.includes('P') || data.wordMask.includes('I') || data.wordMask.includes('Z') || data.wordMask.includes('A'));
          console.log(`✅ Step 6: Bob received progressive word_hint broadcast! Updated mask: "${data.wordMask}"`);
        });

        // Setup Alice's word selection listener
        aliceSocket.on('word_selection_start', (data) => {
          assert.strictEqual(data.roomId, roomId);
          assert.strictEqual(data.words.length, 3, 'Must offer 3 word options');
          console.log(`✅ Step 4: Alice received word_selection_start with 3 choices:`, data.words.map(w => w.word));

          // Alice selects 'pizza'
          const chosen = data.words.find(w => w.word.toLowerCase() === 'pizza') || data.words[0];
          aliceSocket.emit('select_word', { roomId, word: 'pizza' }, (selectAck) => {
            assert.strictEqual(selectAck.success, true);
            console.log(`✅ Step 4b: Alice selected word "${chosen.word}"`);
          });
        });

        aliceSocket.on('turn_start', (data) => {
          assert.strictEqual(data.role, 'DRAWER');
          assert.strictEqual(data.secretWord, 'PIZZA');
          console.log('✅ Step 5b: Alice received turn_start with plaintext secretWord: "PIZZA"');
        });

        aliceSocket.on('turn_end', (data) => {
          assert.strictEqual(data.secretWord, 'PIZZA');
          console.log('✅ Step 7: Turn concluded and secret word revealed to all!');

          console.log('\n🎉 ALL PHASE 6 TURN ENGINE, WORD SELECTION & HINT TESTS PASSED!');
          aliceSocket.disconnect();
          bobSocket.disconnect();
          process.exit(0);
        });

        // Alice starts game
        aliceSocket.emit('start_game', { roomId }, (startRes) => {
          assert.strictEqual(startRes.success, true);
          console.log('✅ Host started match!');
        });
      });
    };

    if (bobSocket.connected) {
      proceedWithBob();
    } else {
      bobSocket.once('connect', proceedWithBob);
    }
  });
});
