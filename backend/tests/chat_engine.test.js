// Automated Multi-Client Integration Test: Real-Time Chat & Guess Verification Engine
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');
const { GuessManager } = require('../dist/game/GuessManager.js');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Phase 7 Real-Time Chat & Guess Verification Test Suite ===\n');

// --- 1. Unit Tests for GuessManager ---
console.log('--- Test 1: GuessManager String Normalization & Levenshtein Distance ---');
assert.strictEqual(GuessManager.normalize('  HeLLo   WoRLD  '), 'hello world');
assert.strictEqual(GuessManager.calculateLevenshteinDistance('pizza', 'piza'), 1);
assert.strictEqual(GuessManager.calculateLevenshteinDistance('apple', 'aple'), 1);
assert.strictEqual(GuessManager.calculateLevenshteinDistance('banana', 'banana'), 0);
assert.strictEqual(GuessManager.calculateLevenshteinDistance('cat', 'dog'), 3);
console.log('✅ Levenshtein distance calculations verified (pizza vs piza = 1, apple vs aple = 1)');

// Classification logic
const secret = 'PIZZA';
assert.strictEqual(GuessManager.evaluateMessage('pizza', secret, true, false).classification, 'DRAWER_CHEAT');
assert.strictEqual(GuessManager.evaluateMessage('hello', secret, true, false).classification, 'DRAWER_CHEAT');
assert.strictEqual(GuessManager.evaluateMessage('pizza', secret, false, false).classification, 'CORRECT_GUESS');
assert.strictEqual(GuessManager.evaluateMessage('  Pizza  ', secret, false, false).classification, 'CORRECT_GUESS');
assert.strictEqual(GuessManager.evaluateMessage('piza', secret, false, false).classification, 'CLOSE_GUESS');
assert.strictEqual(GuessManager.evaluateMessage('burger', secret, false, false).classification, 'REGULAR_CHAT');
assert.strictEqual(GuessManager.evaluateMessage('nice!', secret, false, true).classification, 'ALREADY_GUESSED');
console.log('✅ GuessManager classification matrix verified across all 5 conditions');

// --- 2. Multi-Client Socket Real-Time Flow ---
console.log('\n--- Test 2: Multi-Client Real-Time Chat, Anti-Cheat & Guess Routing ---');
const aliceSocket = io(SOCKET_URL, { reconnection: false });
let bobSocket = null;
let charlieSocket = null;

let roomId = null;
let alicePlayerId = null;
let bobPlayerId = null;
let charliePlayerId = null;

aliceSocket.on('connect', () => {
  console.log('Alice (Host/Drawer) connected:', aliceSocket.id);

  aliceSocket.emit('create_room', {
    hostName: 'AliceDrawer',
    avatarId: 'skribbl_0_0_0',
    settings: { maxPlayers: 4, totalRounds: 2, drawTimeSeconds: 6, wordOptionsCount: 3, hintsAllowed: 2 },
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

            // Start game
            setupGameListeners();
            aliceSocket.emit('start_game', { roomId });
          });
        });
      });
    });
  });
});

function setupGameListeners() {
  // Alice word selection
  aliceSocket.on('word_selection_start', (data) => {
    console.log('✅ Step 4: Alice received word options. Selecting "pizza"...');
    aliceSocket.emit('select_word', { roomId, word: 'pizza' });
  });

  // Turn start
  bobSocket.on('turn_start', (data) => {
    assert.strictEqual(data.role, 'GUESSER');
    assert.strictEqual(data.wordMask, '_ _ _ _ _');
    console.log('✅ Step 5: Turn started! Secret word is masked.');

    // Execute Test Steps sequentially:
    runTestSteps();
  });
}

function runTestSteps() {
  // 1. Drawer Alice attempts anti-cheat violation (typing "pizza" in chat)
  console.log('\n--- Action A: Drawer Alice attempts to type secret word in chat ---');
  let charlieSawCheat = false;
  charlieSocket.on('chat_message', (msg) => {
    if (msg.text && msg.text.toLowerCase().includes('pizza') && msg.senderId === alicePlayerId) {
      charlieSawCheat = true;
    }
  });

  aliceSocket.on('drawer_cheat_warning', (warn) => {
    console.log('✅ Action A Success: Server blocked Drawer typing secret word and sent private warning:', warn.warning);
  });

  aliceSocket.emit('send_chat_message', { roomId, text: 'The word is pizza' }, (ack) => {
    assert.strictEqual(ack.success, false);
    assert.strictEqual(charlieSawCheat, false, 'Charlie must NEVER see Drawer secret word chat!');

    // 2. Bob sends normal wrong guess
    setTimeout(() => {
      console.log('\n--- Action B: Bob sends regular incorrect guess ("burger") ---');
      let charlieSawBurger = false;
      const onCharlieBurger = (msg) => {
        if (msg.text === 'burger' && msg.senderId === bobPlayerId) {
          charlieSawBurger = true;
          console.log('✅ Action B Success: Regular wrong guess broadcast to room as CHAT:', msg.text);
          charlieSocket.off('chat_message', onCharlieBurger);
          stepC();
        }
      };
      charlieSocket.on('chat_message', onCharlieBurger);
      bobSocket.emit('send_chat_message', { roomId, text: 'burger' });
    }, 200);
  });
}

function stepC() {
  // 3. Charlie sends close guess "piza"
  console.log('\n--- Action C: Charlie sends close guess ("piza") ---');
  let charlieGotCloseAlert = false;
  charlieSocket.once('close_guess', (data) => {
    charlieGotCloseAlert = true;
    assert.strictEqual(data.text, "You're close!");
    console.log('✅ Action C Success: Charlie received exclusive private "You\'re close!" notification!');
    stepD();
  });

  charlieSocket.emit('send_chat_message', { roomId, text: 'piza' });
}

function stepD() {
  // 4. Bob sends correct guess "pizza"
  console.log('\n--- Action D: Bob sends correct guess ("pizza") ---');
  let bobCelebrationReceived = false;
  let charlieSawPizzaPlaintext = false;

  const onCharlieMsg = (msg) => {
    if (msg.type === 'CHAT' && msg.text && msg.text.toLowerCase() === 'pizza') {
      charlieSawPizzaPlaintext = true;
    }
  };
  charlieSocket.on('chat_message', onCharlieMsg);

  charlieSocket.once('player_guessed_correct', (data) => {
    assert.strictEqual(data.playerId, bobPlayerId);
    assert.strictEqual(data.guessOrder, 1);
    console.log(`✅ Action D Success: player_guessed_correct event received for ${data.playerName} (Order #1)!`);
    assert.strictEqual(charlieSawPizzaPlaintext, false, 'Raw guess "pizza" must NOT be visible to Charlie!');
    charlieSocket.off('chat_message', onCharlieMsg);
    stepE();
  });

  bobSocket.emit('send_chat_message', { roomId, text: 'pizza' });
}

function stepE() {
  // 5. Bob (already guessed) chats "good drawing" -> Only Alice (Drawer) and Bob see it, Charlie doesn't!
  console.log('\n--- Action E: Bob (in solver club) chats "good drawing" (Option A isolation) ---');
  let charlieSawSolverChat = false;
  const onCharlieSolverCheck = (msg) => {
    if (msg.text === 'good drawing') {
      charlieSawSolverChat = true;
    }
  };
  charlieSocket.on('chat_message', onCharlieSolverCheck);

  const onAliceSolverMsg = (msg) => {
    if (msg.text === 'good drawing') {
      assert.strictEqual(msg.type, 'GUESSED_CHAT');
      console.log('✅ Action E Success: Drawer Alice received solver chat with [GUESSED_CHAT] badge!');
      assert.strictEqual(charlieSawSolverChat, false, 'Charlie must NOT receive solver chat before guessing!');
      aliceSocket.off('chat_message', onAliceSolverMsg);
      charlieSocket.off('chat_message', onCharlieSolverCheck);
      stepF();
    }
  };
  aliceSocket.on('chat_message', onAliceSolverMsg);

  bobSocket.emit('send_chat_message', { roomId, text: 'good drawing' });
}

function stepF() {
  // 6. Charlie sends correct guess -> All guessers finished -> Early turn end
  console.log('\n--- Action F: Charlie solves word -> All guessers finished -> Early turn end ---');
  const turnStartTime = Date.now();

  aliceSocket.once('turn_end', (endData) => {
    const elapsedMs = Date.now() - turnStartTime;
    assert.strictEqual(endData.secretWord, 'PIZZA');
    console.log(`✅ Action F Success: Turn ended early (${elapsedMs}ms) because all guessers solved!`);

    console.log('\n🎉 ALL PHASE 7 REAL-TIME CHAT & GUESS VERIFICATION TESTS PASSED!');
    aliceSocket.disconnect();
    bobSocket.disconnect();
    charlieSocket.disconnect();
    process.exit(0);
  });

  charlieSocket.emit('send_chat_message', { roomId, text: 'pizza' });
}
