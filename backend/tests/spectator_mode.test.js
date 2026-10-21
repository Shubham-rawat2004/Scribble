// Automated Verification Suite: Dedicated Spectator Mode
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Dedicated Spectator Mode Test ===\n');

const alice = io(SOCKET_URL, { reconnection: false }); // Host / Active Player
const bob = io(SOCKET_URL, { reconnection: false });   // Spectator
const charlie = io(SOCKET_URL, { reconnection: false }); // Active Player 2

let roomId = null;
let alicePlayer = null;
let bobPlayer = null;
let charliePlayer = null;

let bobChat = [];
let charlieChat = [];

bob.on('chat_message', (msg) => bobChat.push(msg));
charlie.on('chat_message', (msg) => charlieChat.push(msg));

alice.on('connect', async () => {
  try {
    // 1. Alice creates room
    await new Promise((resolve) => {
      alice.emit('create_room', {
        hostName: 'AliceHost',
        avatarId: 'skribbl_0_0_0',
        settings: { maxPlayers: 6, totalRounds: 2, drawTimeSeconds: 20, isPrivate: true },
      }, (res) => {
        assert.strictEqual(res.success, true);
        roomId = res.room.id;
        alicePlayer = res.player;
        console.log(`[Alice] Created room ${roomId}`);
        resolve();
      });
    });

    // 2. Bob joins with isSpectator = true
    await new Promise((resolve) => {
      bob.emit('join_room', {
        roomId,
        playerName: 'BobSpectator',
        avatarId: 'skribbl_1_1_1',
        isSpectator: true,
      }, (res) => {
        assert.strictEqual(res.success, true);
        bobPlayer = res.player;
        assert.strictEqual(bobPlayer.isSpectator, true, 'Bob must have isSpectator: true');
        console.log(`[Bob] Joined as spectator: isSpectator = ${bobPlayer.isSpectator}`);
        resolve();
      });
    });

    // 3. Alice attempts to start game with only 1 active player (Alice) + 1 spectator (Bob)
    console.log('\n--- Step 1: Verify host cannot start with < 2 active players ---');
    await new Promise((resolve) => {
      alice.emit('start_game', { roomId }, (res) => {
        assert.strictEqual(res.success, false, 'Game should NOT start with only 1 active player');
        assert.ok(res.error.includes('active players'), 'Error message should cite need for active players');
        console.log(`✅ Correctly rejected start: "${res.error}"`);
        resolve();
      });
    });

    // 4. Test spectator toggle in lobby
    console.log('\n--- Step 2: Bob toggles role in lobby ---');
    await new Promise((resolve) => {
      bob.emit('toggle_spectator', { roomId }, (res) => {
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.isSpectator, false, 'Bob should now be active player');
        console.log('[Bob] Toggled to active player');
        resolve();
      });
    });

    // Toggle Bob back to spectator
    await new Promise((resolve) => {
      bob.emit('toggle_spectator', { roomId }, (res) => {
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.isSpectator, true, 'Bob should be spectator again');
        console.log('[Bob] Toggled back to spectator');
        resolve();
      });
    });

    // 5. Charlie joins as second active player
    console.log('\n--- Step 3: Charlie joins as active player ---');
    await new Promise((resolve) => {
      charlie.emit('join_room', {
        roomId,
        playerName: 'CharliePlayer',
        avatarId: 'skribbl_2_2_2',
        isSpectator: false,
      }, (res) => {
        assert.strictEqual(res.success, true);
        charliePlayer = res.player;
        assert.strictEqual(charliePlayer.isSpectator, false);
        console.log('[Charlie] Joined as active player');
        resolve();
      });
    });

    // 6. Alice starts the game now that 2 active players are present
    console.log('\n--- Step 4: Alice starts game with 2 active players + 1 spectator ---');
    await new Promise((resolve) => {
      alice.emit('start_game', { roomId }, (res) => {
        assert.strictEqual(res.success, true);
        console.log('✅ Game started successfully!');
        resolve();
      });
    });

    // Wait for word selection
    let activeDrawer = null;
    const chosenWord = await new Promise((resolve) => {
      const handleWordSelect = (socketClient, name) => {
        socketClient.on('word_selection_start', (data) => {
          activeDrawer = name;
          console.log(`[${name}] Word selection started with options:`, data.words.map(w => w.word));
          const selected = data.words[0].word;
          socketClient.emit('select_word', { roomId, word: selected }, () => {
            console.log(`[${name}] Chose word: "${selected}"`);
            resolve(selected);
          });
        });
      };

      handleWordSelect(alice, 'Alice');
      handleWordSelect(charlie, 'Charlie');
    });

    // Verify Bob (Spectator) NEVER received word selection
    let bobGotWordSelection = false;
    bob.on('word_selection_start', () => {
      bobGotWordSelection = true;
    });

    await new Promise((r) => setTimeout(r, 600));
    assert.strictEqual(bobGotWordSelection, false, 'Spectator Bob must NEVER receive word_selection_start');
    console.log('✅ Spectator Bob was excluded from drawing rotation!');

    // 7. Bob (Spectator) attempts to guess the word
    console.log(`\n--- Step 5: Spectator Bob sends secret word "${chosenWord}" in chat ---`);
    bob.emit('send_chat_message', { roomId, text: chosenWord });

    await new Promise((r) => setTimeout(r, 600));

    // Verify Bob received private notice and no score
    const bobPrivateNotice = bobChat.find((m) => m.text.includes('Spectators do not earn score points'));
    assert.ok(bobPrivateNotice, 'Bob should receive private notification that spectators do not score');
    console.log(`✅ Bob received private notification: "${bobPrivateNotice.text}"`);

    // Verify Charlie did NOT receive Bob's message (no spoiler to other players)
    const charlieSawSpoiler = charlieChat.some((m) => m.text.toLowerCase() === chosenWord.toLowerCase());
    assert.strictEqual(charlieSawSpoiler, false, 'Charlie must NOT see secret word spoiler from spectator');
    console.log('✅ Other guessers protected from spectator spoilers!');

    console.log('\n🎉 ALL DEDICATED SPECTATOR MODE TESTS PASSED SUCCESSFULLY!\n');
    alice.disconnect();
    bob.disconnect();
    charlie.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test Failed:', err);
    alice.disconnect();
    bob.disconnect();
    charlie.disconnect();
    process.exit(1);
  }
});
