// Automated Verification Suite: Democratic Votekick System
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Democratic Votekick Test ===\n');

const alice = io(SOCKET_URL, { reconnection: false });
const bob = io(SOCKET_URL, { reconnection: false });
const troll = io(SOCKET_URL, { reconnection: false });

let roomId = null;
let alicePlayer = null;
let bobPlayer = null;
let trollPlayer = null;

let aliceChat = [];
let bobChat = [];
let trollChat = [];
let trollKicked = false;

alice.on('chat_message', (msg) => aliceChat.push(msg));
bob.on('chat_message', (msg) => bobChat.push(msg));
troll.on('chat_message', (msg) => trollChat.push(msg));

troll.on('kicked', (data) => {
  console.log('[Troll] Received kicked event:', data);
  trollKicked = true;
});

async function runTest() {
  try {
    // 1. Alice creates room
    await new Promise((resolve) => {
      alice.emit('create_room', {
        hostName: 'AliceHost',
        avatarId: 'skribbl_0_0_0',
        settings: { maxPlayers: 6, totalRounds: 3, drawTimeSeconds: 60, isPrivate: true },
      }, (res) => {
        assert.strictEqual(res.success, true);
        roomId = res.room.id;
        alicePlayer = res.player;
        console.log(`[Alice] Created room ${roomId} (PlayerId: ${alicePlayer.id})`);
        resolve();
      });
    });

    // 2. Bob joins room
    await new Promise((resolve) => {
      bob.emit('join_room', {
        roomId,
        playerName: 'BobGuest',
        avatarId: 'skribbl_1_1_1',
      }, (res) => {
        assert.strictEqual(res.success, true);
        bobPlayer = res.player;
        console.log(`[Bob] Joined room (PlayerId: ${bobPlayer.id})`);
        resolve();
      });
    });

    // 3. Troll joins room
    await new Promise((resolve) => {
      troll.emit('join_room', {
        roomId,
        playerName: 'TrollUser',
        avatarId: 'skribbl_2_2_2',
      }, (res) => {
        assert.strictEqual(res.success, true);
        trollPlayer = res.player;
        console.log(`[Troll] Joined room (PlayerId: ${trollPlayer.id})`);
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 400));

    // 4. Bob votes to kick Troll (1 out of 2 needed with 3 players)
    console.log('\n--- Step 1: Bob votes to kick Troll ---');
    await new Promise((resolve) => {
      bob.emit('vote_kick', {
        roomId,
        targetPlayerId: trollPlayer.id,
      }, (res) => {
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.votes, 1);
        assert.strictEqual(res.threshold, 2);
        console.log(`[Bob] Vote registered: ${res.votes}/${res.threshold}`);
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 400));

    // Verify chat notice for vote progress
    const notice1 = aliceChat.find((m) => m.text.includes('BobGuest voted to kick TrollUser (1/2)'));
    assert.ok(notice1, 'Alice should see vote progress notice in chat feed');
    assert.strictEqual(trollKicked, false, 'Troll should not be kicked yet');
    console.log('✅ Progress notice broadcast successfully to room chat!');

    // 5. Alice casts second vote to kick Troll (reaches 2/2 threshold)
    console.log('\n--- Step 2: Alice votes to kick Troll (reaching threshold) ---');
    await new Promise((resolve) => {
      alice.emit('vote_kick', {
        roomId,
        targetPlayerId: trollPlayer.id,
      }, (res) => {
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.votes, 2);
        assert.strictEqual(res.threshold, 2);
        console.log(`[Alice] Vote passed: ${res.votes}/${res.threshold}`);
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 500));

    // Verify Troll received 'kicked' event
    assert.strictEqual(trollKicked, true, 'Troll must have received kicked event');
    console.log('✅ Troll was kicked by democratic votekick!');

    // Verify kick message broadcast in chat
    const kickNotice = bobChat.find((m) => m.text.includes('TrollUser was kicked from the room by vote!'));
    assert.ok(kickNotice, 'Room chat should have announcement that Troll was kicked by vote');
    console.log('✅ Kicked notice broadcasted to chat feed!');

    // 6. Verify room roster now has only 2 players
    await new Promise((resolve) => {
      alice.emit('get_room_players', { roomId }, (res) => {
        assert.strictEqual(res.players.length, 2);
        assert.ok(!res.players.some((p) => p.id === trollPlayer.id), 'Troll should no longer be in player roster');
        console.log(`✅ Remaining player roster count: ${res.players.length} (Alice & Bob)`);
        resolve();
      });
    });

    console.log('\n🎉 ALL VOTEKICK TESTS PASSED SUCCESSFULLY!\n');
    alice.disconnect();
    bob.disconnect();
    troll.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test Failed:', err);
    alice.disconnect();
    bob.disconnect();
    troll.disconnect();
    process.exit(1);
  }
}

alice.on('connect', () => {
  runTest();
});
