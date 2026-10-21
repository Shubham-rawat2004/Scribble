// Dedicated Verification: Turn only ends when ALL guessers guess or time expires
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Turn Completion Rule Verification Suite ===\n');

const alice = io(SOCKET_URL, { reconnection: false }); // Host / Drawer
const bob = io(SOCKET_URL, { reconnection: false });   // Guesser 1
const charlie = io(SOCKET_URL, { reconnection: false }); // Guesser 2

let roomId = null;
let aliceId, bobId, charlieId;

alice.on('connect', () => {
  alice.emit('create_room', {
    hostName: 'AliceHost',
    avatarId: 'skribbl_0_0_0',
    settings: { maxPlayers: 4, totalRounds: 1, drawTimeSeconds: 4, wordOptionsCount: 3, hintsAllowed: 1 },
  }, (res) => {
    assert.strictEqual(res.success, true);
    roomId = res.room.id;
    aliceId = res.player.id;
    console.log(`[Setup] Alice created room ${roomId}`);

    bob.emit('join_room', { roomId, playerName: 'BobGuesser', avatarId: 'skribbl_1_1_1' }, (r2) => {
      assert.strictEqual(r2.success, true);
      bobId = r2.player.id;
      console.log(`[Setup] Bob joined room ${roomId}`);

      charlie.emit('join_room', { roomId, playerName: 'CharlieGuesser', avatarId: 'skribbl_2_2_2' }, (r3) => {
        assert.strictEqual(r3.success, true);
        charlieId = r3.player.id;
        console.log(`[Setup] Charlie joined room ${roomId}`);

        runTurnRuleTest();
      });
    });
  });
});

function runTurnRuleTest() {
  console.log('\n--- Scenario: 1 Drawer (Alice) + 2 Guessers (Bob & Charlie) ---');

  let turnEnded = false;

  alice.on('word_selection_start', (data) => {
    console.log(`[Alice] Selecting word "${data.words[0].word}"...`);
    alice.emit('select_word', { roomId, word: data.words[0].word });
  });

  alice.on('turn_start', (data) => {
    console.log(`[Game] Turn started! Secret word: "${data.secretWord}". Draw time: 4s.`);
    const chosenWord = data.secretWord;

    // After 1 second, ONLY Bob guesses correctly
    setTimeout(() => {
      console.log('\n[Action] Bob guesses the correct word...');
      bob.emit('send_chat_message', { roomId, text: chosenWord });
    }, 1000);

    // After 2.5 seconds (halfway through turn), verify turn is STILL ACTIVE!
    setTimeout(() => {
      assert.strictEqual(turnEnded, false, 'CRITICAL: Turn MUST NOT end when only 1 of 2 guessers guessed!');
      console.log('✅ Rule Verified: Halfway through turn, Bob has guessed, but turn is STILL RUNNING for Charlie!');
    }, 2500);
  });

  bob.on('player_guessed_correct', (data) => {
    if (data.playerId === bobId) {
      console.log('✅ Bob received player_guessed_correct confirmation.');
    }
  });

  alice.on('turn_end', (data) => {
    turnEnded = true;
    console.log(`\n[Turn End] Turn concluded! Reason: "${data.reason}".`);
    assert.strictEqual(data.reason, 'TIME_UP', 'Turn should have ended due to TIME_UP because Charlie never guessed!');
    console.log('✅ Verification Passed: Turn only ended when time ran out because not all guessers solved.');

    console.log('\n🎉 ALL TURN COMPLETION RULES FULLY SATISFIED!');
    alice.disconnect();
    bob.disconnect();
    charlie.disconnect();
    process.exit(0);
  });

  // Start the match
  setTimeout(() => {
    console.log('[Host] Starting match...');
    alice.emit('start_game', { roomId });
  }, 400);
}
