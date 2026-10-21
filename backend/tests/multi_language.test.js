// Automated Integration Test: Multi-Language Word Bank
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Multi-Language Word Bank Verification Suite ===\n');

// 1. Spanish Room
console.log('--- Step 1: Testing Spanish Word Bank ---');
const hostSpanish = io(SOCKET_URL, { reconnection: false });
const guestSpanish = io(SOCKET_URL, { reconnection: false });

let spanishRoomId = null;

hostSpanish.on('connect', () => {
  hostSpanish.emit('create_room', {
    hostName: 'CarlosHost',
    settings: {
      maxPlayers: 2,
      totalRounds: 1,
      drawTimeSeconds: 20,
      wordOptionsCount: 3,
      language: 'Spanish',
      isPrivate: true,
    },
  }, (res) => {
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.room.settings.language, 'Spanish');
    spanishRoomId = res.room.id;
    console.log(`[Host] Created Spanish room: ${spanishRoomId}`);

    guestSpanish.emit('join_room', {
      roomId: spanishRoomId,
      playerName: 'MateoGuest',
    }, () => {
      hostSpanish.emit('start_game', { roomId: spanishRoomId });
    });
  });
});

hostSpanish.on('word_selection_start', (data) => {
  console.log('[Host] Received Spanish word choices:', data.words.map(w => w.word));
  assert.strictEqual(data.words.length, 3);
  
  const spanishKnown = ['gato', 'perro', 'elefante', 'jirafa', 'pinguino', 'leon', 'guitarra', 'avion', 'cohete', 'computadora', 'bicicleta', 'reloj', 'pizza', 'castillo', 'playa', 'nadar'];
  const allSpanish = data.words.every(w => spanishKnown.includes(w.word.toLowerCase()));
  assert.strictEqual(allSpanish, true, 'All choices must be from Spanish word bank');
  console.log('✅ Spanish Word Bank Verified Successfully!');

  hostSpanish.disconnect();
  guestSpanish.disconnect();
  runGermanTest();
});

// 2. German Room
function runGermanTest() {
  console.log('\n--- Step 2: Testing German Word Bank ---');
  const hostGerman = io(SOCKET_URL, { reconnection: false });
  const guestGerman = io(SOCKET_URL, { reconnection: false });

  let germanRoomId = null;

  hostGerman.on('connect', () => {
    hostGerman.emit('create_room', {
      hostName: 'HansHost',
      settings: {
        maxPlayers: 2,
        totalRounds: 1,
        drawTimeSeconds: 20,
        wordOptionsCount: 3,
        language: 'German',
        isPrivate: true,
      },
    }, (res) => {
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.room.settings.language, 'German');
      germanRoomId = res.room.id;

      guestGerman.emit('join_room', {
        roomId: germanRoomId,
        playerName: 'LukasGuest',
      }, () => {
        hostGerman.emit('start_game', { roomId: germanRoomId });
      });
    });
  });

  hostGerman.on('word_selection_start', (data) => {
    console.log('[Host] Received German word choices:', data.words.map(w => w.word));
    assert.strictEqual(data.words.length, 3);

    const germanKnown = ['katze', 'hund', 'elefant', 'giraffe', 'pinguin', 'loewe', 'gitarre', 'flugzeug', 'rakete', 'computer', 'fahrrad', 'uhr', 'pizza', 'schloss', 'strand', 'schwimmen'];
    const allGerman = data.words.every(w => germanKnown.includes(w.word.toLowerCase()));
    assert.strictEqual(allGerman, true, 'All choices must be from German word bank');
    console.log('✅ German Word Bank Verified Successfully!');

    hostGerman.disconnect();
    guestGerman.disconnect();
    console.log('\n🎉 ALL MULTI-LANGUAGE WORD BANK TESTS PASSED! 🎉\n');
    process.exit(0);
  });
}

setTimeout(() => {
  console.error('❌ Test timed out!');
  process.exit(1);
}, 10000);
