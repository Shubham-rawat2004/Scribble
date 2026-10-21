// Automated Verification Suite: Stroke Replay System
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Stroke Replay Verification Test ===\n');

const alice = io(SOCKET_URL, { reconnection: false });
const bob = io(SOCKET_URL, { reconnection: false });

let roomId = null;
let alicePlayer = null;
let bobPlayer = null;
let turnEndReceived = null;

alice.on('connect', async () => {
  try {
    // 1. Create Room
    await new Promise((resolve) => {
      alice.emit('create_room', {
        hostName: 'AliceArtist',
        avatarId: 'skribbl_0_0_0',
        settings: { maxPlayers: 4, totalRounds: 2, drawTimeSeconds: 15, isPrivate: true },
      }, (res) => {
        assert.strictEqual(res.success, true);
        roomId = res.room.id;
        alicePlayer = res.player;
        console.log(`[Alice] Created room ${roomId}`);
        resolve();
      });
    });

    // 2. Bob joins
    await new Promise((resolve) => {
      bob.emit('join_room', {
        roomId,
        playerName: 'BobGuesser',
        avatarId: 'skribbl_1_1_1',
      }, (res) => {
        assert.strictEqual(res.success, true);
        bobPlayer = res.player;
        console.log(`[Bob] Joined room ${roomId}`);
        resolve();
      });
    });

    // Setup turn_end listener on Bob
    bob.on('turn_end', (data) => {
      console.log('[Bob] Received turn_end event:', {
        secretWord: data.secretWord,
        drawerName: data.drawerName,
        strokesCount: data.strokes ? data.strokes.length : 0,
      });
      turnEndReceived = data;
    });

    // 3. Start Game
    await new Promise((resolve) => {
      alice.emit('start_game', { roomId }, (res) => {
        assert.strictEqual(res.success, true);
        console.log('[Alice] Game started successfully');
        resolve();
      });
    });

    // Wait for word selection
    const chosenWord = await new Promise((resolve) => {
      alice.on('word_selection_start', (data) => {
        console.log('[Alice] Word selection started with options:', data.words);
        const selected = data.words[0].word;
        alice.emit('select_word', { roomId, word: selected }, () => {
          console.log(`[Alice] Chose word: "${selected}"`);
          resolve(selected);
        });
      });
    });

    await new Promise((r) => setTimeout(r, 600));

    // 4. Alice draws a stroke
    console.log('\n--- Step 1: Alice draws a test stroke ---');
    const strokeId = 'test-stroke-1';
    alice.emit('draw_start', {
      roomId,
      stroke: {
        id: strokeId,
        tool: 'brush',
        color: '#ff0000',
        size: 10,
        points: [{ x: 0.1, y: 0.1 }],
      },
    });

    alice.emit('draw_move', {
      roomId,
      strokeId,
      points: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.3 }],
    });

    alice.emit('draw_end', { roomId, strokeId });
    console.log('✅ Alice emitted draw_start, draw_move, draw_end');

    await new Promise((r) => setTimeout(r, 600));

    // 5. Bob guesses word correctly to trigger early turn end
    console.log(`\n--- Step 2: Bob guesses word "${chosenWord}" ---`);
    bob.emit('send_chat_message', { roomId, text: chosenWord });

    // Wait for turn_end
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (turnEndReceived) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });

    // 6. Verify turn_end payload contains strokes
    assert.ok(turnEndReceived.strokes, 'turn_end must contain strokes array');
    assert.strictEqual(turnEndReceived.strokes.length, 1, 'turn_end must have 1 stroke');
    assert.strictEqual(turnEndReceived.strokes[0].id, strokeId);
    assert.strictEqual(turnEndReceived.strokes[0].points.length, 3);
    assert.strictEqual(turnEndReceived.secretWord.toLowerCase(), chosenWord.toLowerCase());
    console.log('✅ turn_end event delivered stroke history and secret word accurately!');

    // 7. Verify get_last_replay socket query
    console.log('\n--- Step 3: Querying get_last_replay from socket ---');
    await new Promise((resolve) => {
      bob.emit('get_last_replay', { roomId }, (res) => {
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.secretWord.toLowerCase(), chosenWord.toLowerCase());
        assert.ok(res.strokes && res.strokes.length === 1);
        assert.strictEqual(res.strokes[0].id, strokeId);
        console.log(`✅ get_last_replay returned word "${res.secretWord}" and ${res.strokes.length} strokes!`);
        resolve();
      });
    });

    console.log('\n🎉 ALL STROKE REPLAY TESTS PASSED SUCCESSFULLY!\n');
    alice.disconnect();
    bob.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test Failed:', err);
    alice.disconnect();
    bob.disconnect();
    process.exit(1);
  }
});
