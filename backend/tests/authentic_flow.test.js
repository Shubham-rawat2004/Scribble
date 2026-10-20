const { io } = require('../../frontend/node_modules/socket.io-client');

const SOCKET_URL = 'http://localhost:5000';

// Test URL parser function matching the frontend extractCode
function extractCode(input) {
  const trimmed = input.trim();
  // 1. Authentic Skribbl URL: ?ROOMCODE (e.g. ?SALNXJ or https://skribbl.io/?f1CF68YI)
  const authenticMatch = trimmed.match(/\?([A-Za-z0-9]{6,8})(?:$|[&#])/);
  if (authenticMatch) {
    return authenticMatch[1].toUpperCase();
  }
  // 2. Named query parameter: ?join=CODE or ?room=CODE
  const namedQueryMatch = trimmed.match(/[?&](?:join|room)=([A-Za-z0-9]{6,8})/i);
  if (namedQueryMatch) {
    return namedQueryMatch[1].toUpperCase();
  }
  // 3. Path parameter: /join/CODE
  const pathMatch = trimmed.match(/\/join\/([A-Za-z0-9]{6,8})/i);
  if (pathMatch) {
    return pathMatch[1].toUpperCase();
  }
  // 4. Raw code: e.g. "SALNXJ"
  const rawMatch = trimmed.match(/^[A-Za-z0-9]{6,8}$/);
  if (rawMatch) {
    return rawMatch[0].toUpperCase();
  }
  return trimmed.toUpperCase();
}

// 1. Verify URL and Smart Paste Regex
console.log('--- 1. Testing URL and Smart Paste Extraction ---');
const testCases = [
  { input: 'http://localhost:5173/?SALNXJ', expected: 'SALNXJ' },
  { input: 'https://skribbl.io/?f1CF68YI', expected: 'F1CF68YI' },
  { input: 'http://localhost:5173/join/ROOM99', expected: 'ROOM99' },
  { input: 'http://localhost:5173/?join=T3ST42', expected: 'T3ST42' },
  { input: 'ABCDEF', expected: 'ABCDEF' },
  { input: '  gh12jk  ', expected: 'GH12JK' },
];

for (const tc of testCases) {
  const result = extractCode(tc.input);
  if (result === tc.expected) {
    console.log(`✅ Passed: "${tc.input}" -> "${result}"`);
  } else {
    console.error(`❌ FAILED: "${tc.input}" expected "${tc.expected}", got "${result}"`);
    process.exit(1);
  }
}

// 2. Test Socket Flow with authentic avatars
console.log('\n--- 2. Testing End-to-End Real-Time Socket Flow ---');
const hostSocket = io(SOCKET_URL, { reconnection: false });
const guestSocket = io(SOCKET_URL, { reconnection: false });

hostSocket.on('connect', () => {
  console.log('Host connected to Socket.IO with ID:', hostSocket.id);

  // Host creates room with modular Skribbl avatar
  const createPayload = {
    hostName: 'AliceHost',
    avatarId: 'skribbl_1_2_3',
    settings: {
      maxPlayers: 8,
      totalRounds: 3,
      drawTimeSeconds: 80,
      wordOptionsCount: 3,
      hintsAllowed: 2,
      isPrivate: true,
    },
  };

  hostSocket.emit('create_room', createPayload, (createRes) => {
    console.log('Host created room:', createRes.room.id);
    if (!createRes.success || !createRes.room) {
      console.error('Room creation failed:', createRes);
      process.exit(1);
    }

    const roomId = createRes.room.id;
    // Simulate authentic Skribbl link generated in Lobby
    const inviteLink = `http://localhost:5173/?${roomId}`;
    console.log('Generated authentic invite link:', inviteLink);

    // Guest extracts roomId from the invite link
    const extractedCode = extractCode(inviteLink);
    console.log('Guest parsed room code from URL:', extractedCode);

    if (extractedCode !== roomId) {
      console.error(`Extracted code ${extractedCode} does not match ${roomId}`);
      process.exit(1);
    }

    // Guest joins room using extracted code and customized avatar
    guestSocket.emit('join_room', {
      roomId: extractedCode,
      playerName: 'BobGuesser',
      avatarId: 'skribbl_4_1_0',
    }, (joinRes) => {
      console.log('Guest join response:', joinRes.success ? 'SUCCESS' : 'FAILED');
      if (!joinRes.success) {
        console.error('Join failed:', joinRes);
        process.exit(1);
      }

      console.log('Roster after join:');
      joinRes.room.players.forEach(p => {
        console.log(` - Player: ${p.name} (Avatar: ${p.avatarId}, Host: ${p.isHost})`);
      });

      // Host starts game
      hostSocket.emit('start_game', { roomId }, (startRes) => {
        console.log('Start game response:', startRes.success ? 'SUCCESS' : 'FAILED');
        if (!startRes.success) {
          console.error('Start game failed:', startRes);
          process.exit(1);
        }

        console.log('Session ID:', startRes.sessionId);
        console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
        hostSocket.disconnect();
        guestSocket.disconnect();
        process.exit(0);
      });
    });
  });
});
