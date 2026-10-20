// Automated Multi-Client Test: Real-Time Drawing Synchronization & Zero-Trust Server Authority
const { io } = require('../../frontend/node_modules/socket.io-client');
const assert = require('assert');

const SOCKET_URL = 'http://localhost:5000';

console.log('=== Phase 5 Real-Time Drawing Sync & Security Test Suite ===\n');

const aliceSocket = io(SOCKET_URL, { reconnection: false });
const bobSocket = io(SOCKET_URL, { reconnection: false });
let charlieSocket = null;

let roomId = null;
let alicePlayerId = null;
let bobPlayerId = null;

// Connect Alice
aliceSocket.on('connect', () => {
  console.log('Alice (Host) connected:', aliceSocket.id);

  // 1. Alice creates room
  aliceSocket.emit('create_room', {
    hostName: 'AliceDrawer',
    avatarId: 'skribbl_0_0_0',
    settings: { maxPlayers: 4, totalRounds: 3, drawTimeSeconds: 60 },
  }, (createRes) => {
    assert.strictEqual(createRes.success, true);
    roomId = createRes.room.id;
    alicePlayerId = createRes.player.id;
    console.log(`✅ Step 1: Alice created room ${roomId} (Player ID: ${alicePlayerId})`);

    // Connect Bob and join room
    const proceedWithBob = () => {
      console.log('Bob (Guesser) connected:', bobSocket.id);

      // 2. Bob joins room
      bobSocket.emit('join_room', {
        roomId,
        playerName: 'BobGuesser',
        avatarId: 'skribbl_1_1_1',
      }, (joinRes) => {
        assert.strictEqual(joinRes.success, true);
        bobPlayerId = joinRes.player.id;
        console.log(`✅ Step 2: Bob joined room ${roomId} (Player ID: ${bobPlayerId})`);

        // 3. Alice starts game
        aliceSocket.emit('start_game', { roomId }, (startRes) => {
          assert.strictEqual(startRes.success, true);
          assert.strictEqual(startRes.currentDrawerId, alicePlayerId, 'Alice must be designated active drawer');
          console.log(`✅ Step 3: Match started! Active Drawer: ${startRes.currentDrawerId}`);

          // Setup Bob's drawing listeners
          let bobReceivedStart = false;
          let bobReceivedMove = false;
          let bobReceivedEnd = false;
          let bobReceivedUndo = false;
          let bobReceivedClear = false;

          bobSocket.on('draw_start', (data) => {
            assert.strictEqual(data.roomId, roomId);
            assert.strictEqual(data.stroke.id, 'stroke_101');
            assert.strictEqual(data.stroke.color, '#ef130b');
            assert.strictEqual(data.stroke.points[0].x, 0.25);
            assert.strictEqual(data.stroke.points[0].y, 0.35);
            bobReceivedStart = true;
            console.log('✅ Step 4: Bob received draw_start broadcast with identical normalized coordinates!');
          });

          bobSocket.on('draw_move', (data) => {
            assert.strictEqual(data.strokeId, 'stroke_101');
            assert.strictEqual(data.points.length, 2);
            assert.strictEqual(data.points[0].x, 0.26);
            bobReceivedMove = true;
            console.log('✅ Step 5: Bob received draw_move broadcast with 2 points!');
          });

          bobSocket.on('draw_end', (data) => {
            assert.strictEqual(data.strokeId, 'stroke_101');
            bobReceivedEnd = true;
            console.log('✅ Step 6: Bob received draw_end broadcast!');

            // 7. Security check: Bob (Guesser) attempts to draw
            testUnauthorizedDrawing();
          });

          bobSocket.on('draw_undo', (data) => {
            assert.strictEqual(data.roomId, roomId);
            bobReceivedUndo = true;
            console.log('✅ Step 8: Bob received draw_undo broadcast!');
          });

          bobSocket.on('canvas_clear', (data) => {
            assert.strictEqual(data.roomId, roomId);
            bobReceivedClear = true;
            console.log('✅ Step 9: Bob received canvas_clear broadcast!');

            // Test Late-Join Hydration
            testLateJoinHydration();
          });

          // 4. Alice (Drawer) begins drawing
          setTimeout(() => {
            const strokeData = {
              id: 'stroke_101',
              tool: 'brush',
              color: '#ef130b',
              size: 10,
              points: [{ x: 0.25, y: 0.35 }],
            };

            aliceSocket.emit('draw_start', { roomId, stroke: strokeData }, (ack) => {
              assert.strictEqual(ack.success, true);

              // 5. Alice streams move points
              aliceSocket.emit('draw_move', {
                roomId,
                strokeId: 'stroke_101',
                points: [{ x: 0.26, y: 0.36 }, { x: 0.28, y: 0.38 }],
              });

              // 6. Alice ends stroke
              setTimeout(() => {
                aliceSocket.emit('draw_end', { roomId, strokeId: 'stroke_101' });
              }, 50);
            });
          }, 100);

          // 7. Security Check Function
          function testUnauthorizedDrawing() {
            console.log('\n--- Testing Server-Authoritative Security Boundary ---');
            bobSocket.emit('draw_start', {
              roomId,
              stroke: {
                id: 'illegal_stroke',
                tool: 'brush',
                color: '#000000',
                size: 20,
                points: [{ x: 0.5, y: 0.5 }],
              },
            }, (res) => {
              assert.strictEqual(res.success, false, 'Server must reject drawing from a non-drawer');
              assert.strictEqual(res.error, 'Unauthorized: You are not the active drawer.');
              console.log('✅ Step 7: Server successfully BLOCKED unauthorized drawing attempt by Guesser Bob!');

              // Test Undo by Alice
              aliceSocket.emit('draw_undo', { roomId }, (undoRes) => {
                assert.strictEqual(undoRes.success, true);

                // Test Clear by Alice
                setTimeout(() => {
                  aliceSocket.emit('canvas_clear', { roomId }, (clearRes) => {
                    assert.strictEqual(clearRes.success, true);
                  });
                }, 50);
              });
            });
          }

          // 10. Late-Join Canvas Hydration Test
          function testLateJoinHydration() {
            console.log('\n--- Testing Late-Join Canvas State Hydration ---');
            bobSocket.off('draw_start');
            // Alice draws a final stroke
            const finalStroke = {
              id: 'final_stroke_202',
              tool: 'brush',
              color: '#00cc00',
              size: 20,
              points: [{ x: 0.8, y: 0.8 }],
            };

            aliceSocket.emit('draw_start', { roomId, stroke: finalStroke }, () => {
              // Connect Charlie as a late-joining spectator
              charlieSocket = io(SOCKET_URL, { reconnection: false });
              charlieSocket.on('connect', () => {
                charlieSocket.emit('request_canvas_state', { roomId }, (stateRes) => {
                  assert.ok(stateRes.strokes, 'Server must return strokes array');
                  assert.strictEqual(stateRes.strokes.length, 1);
                  assert.strictEqual(stateRes.strokes[0].id, 'final_stroke_202');
                  assert.strictEqual(stateRes.strokes[0].color, '#00cc00');
                  console.log('✅ Step 10: Late-joining Charlie successfully hydrated canvas with active strokes from server RAM!');

                  console.log('\n🎉 ALL PHASE 5 REAL-TIME DRAWING SYNC & SECURITY TESTS PASSED!');
                  aliceSocket.disconnect();
                  bobSocket.disconnect();
                  charlieSocket.disconnect();
                  process.exit(0);
                });
              });
            });
          }
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
