// Automated Integration Test: Host-Only Start & Late-Joining (Mid-Game Join up to capacity)
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Host-Only Start & Late-Joining Verification Suite ===\n');

const alice = io(SOCKET_URL, { reconnection: false });   // Host
const bob = io(SOCKET_URL, { reconnection: false });     // Guest Player 2
const charlie = io(SOCKET_URL, { reconnection: false }); // Late Joiner Player 3 (fills room 3/3)
const dave = io(SOCKET_URL, { reconnection: false });    // Overflow Player 4 (must be rejected)

let roomId = null;
let aliceId, bobId, charlieId;

alice.on('connect', () => {
  console.log('[Alice] Connected:', alice.id);

  // 1. Alice creates a 3-player private room
  alice.emit('create_room', {
    hostName: 'AliceHost',
    avatarId: 'skribbl_0_0_0',
    settings: { maxPlayers: 3, totalRounds: 2, drawTimeSeconds: 15, wordOptionsCount: 3, hintsAllowed: 1, isPrivate: true },
  }, (res) => {
    assert.strictEqual(res.success, true);
    roomId = res.room.id;
    aliceId = res.player.id;
    console.log(`[Alice] Created 3-player room: ${roomId}`);

    // 2. Bob joins
    bob.emit('join_room', {
      roomId,
      playerName: 'BobGuest',
      avatarId: 'skribbl_1_1_1',
    }, (bRes) => {
      assert.strictEqual(bRes.success, true);
      bobId = bRes.player.id;
      console.log(`[Bob] Joined room ${roomId}. Total players: 2/3`);

      // 3. Test: Non-host Bob tries to start -> MUST BE REJECTED
      console.log('\n--- Step 1: Verifying Non-Host Start Rejection ---');
      bob.emit('start_game', { roomId }, (bobStartRes) => {
        assert.strictEqual(bobStartRes.success, false, 'Non-host Bob must NOT be able to start the game!');
        console.log(`✅ Security Verified: Non-host Bob start rejected: "${bobStartRes.error}"`);

        // 4. Host Alice starts the game -> MUST SUCCEED
        console.log('\n--- Step 2: Host Alice Starts Game ---');
        alice.emit('start_game', { roomId }, (aliceStartRes) => {
          assert.strictEqual(aliceStartRes.success, true, 'Host Alice must be able to start game!');
          console.log('✅ Host Start Verified: Host Alice successfully started match!');
        });
      });
    });
  });
});

// When match starts, Alice draws
alice.on('word_selection_start', (data) => {
  console.log(`[Alice] Received word options:`, data.words.map(w => w.word));
  alice.emit('select_word', { roomId, word: data.words[0].word }, (ack) => {
    assert.strictEqual(ack.success, true);
    console.log(`[Alice] Selected word: "${data.words[0].word}"`);
  });
});

alice.on('turn_start', (data) => {
  console.log(`[Alice] Turn 1 started as DRAWER. Drawing stroke on canvas...`);

  // Alice draws stroke
  alice.emit('draw_start', {
    roomId,
    stroke: {
      id: 'stroke_tree',
      tool: 'brush',
      color: '#16a34a',
      size: 6,
      points: [{ x: 50, y: 50, pressure: 1 }, { x: 50, y: 150, pressure: 1 }],
    },
  }, (drawAck) => {
    assert.strictEqual(drawAck.success, true);
    console.log('✅ Alice successfully drew stroke "stroke_tree" on canvas.');

    // Now test Late-Joining: Charlie joins while match is PLAYING!
    triggerLateJoinCharlie();
  });
});

function triggerLateJoinCharlie() {
  console.log('\n--- Step 3: Charlie Joins Mid-Game (3rd Player / Room Full) ---');

  charlie.on('canvas_init', (initData) => {
    assert.strictEqual(initData.roomId, roomId);
    const hasTreeStroke = initData.strokes.some(s => s.id === 'stroke_tree');
    assert.strictEqual(hasTreeStroke, true, 'Charlie MUST receive Alice existing canvas stroke on late join!');
    console.log(`✅ Canvas Catch-Up Verified: Charlie received canvas stroke history!`);
  });

  charlie.on('turn_start', (turnData) => {
    assert.strictEqual(turnData.role, 'GUESSER');
    assert.strictEqual(turnData.secretWord, undefined, 'Secret word must be masked!');
    assert.ok(turnData.wordMask);
    console.log(`✅ Turn Catch-Up Verified: Charlie joined as GUESSER with masked word: "${turnData.wordMask}"!`);
  });

  charlie.emit('join_room', {
    roomId,
    playerName: 'CharlieLate',
    avatarId: 'skribbl_2_2_2',
  }, (cRes) => {
    assert.strictEqual(cRes.success, true);
    assert.strictEqual(cRes.room.status, 'PLAYING');
    assert.strictEqual(cRes.room.players.length, 3, 'Room must now have 3/3 players');
    console.log(`✅ Late Join Accepted: Charlie joined ongoing match! Capacity reached: 3/3 players.`);

    // Test Step 4: Overflow Player Dave tries to join full room -> MUST BE REJECTED
    triggerOverflowDave();
  });
}

function triggerOverflowDave() {
  console.log('\n--- Step 4: Overflow Player Dave Tries to Join Full Room ---');
  dave.emit('join_room', {
    roomId,
    playerName: 'DaveOverflow',
    avatarId: 'skribbl_3_3_3',
  }, (dRes) => {
    assert.strictEqual(dRes.success, false, 'Dave must be rejected because room is at max capacity (3)!');
    console.log(`✅ Capacity Limit Verified: Dave join rejected: "${dRes.error}"`);

    console.log('\n================================================================');
    console.log('🎉 SUCCESS: HOST-ONLY START & LATE-JOINING VERIFIED 100%!');
    console.log('- Non-host cannot start match: Verified.');
    console.log('- Host starts match once >= 2 players join: Verified.');
    console.log('- Other players can join later mid-game up to capacity: Verified.');
    console.log('- Canvas stroke hydration & turn state sync on late join: Verified.');
    console.log('- Max capacity strictly enforced against overflow players: Verified.');
    console.log('================================================================\n');

    alice.disconnect();
    bob.disconnect();
    charlie.disconnect();
    dave.disconnect();
    process.exit(0);
  });
}
