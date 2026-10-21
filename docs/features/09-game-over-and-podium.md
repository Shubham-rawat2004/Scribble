# Feature 09: Game Over, Victory Podium & Match Statistics

This document details the complete design, network protocols, MySQL session lifecycle, frontend components, testing, and interview defense for Phase 9: **Game Over, Victory Podium & Match Statistics**.

---

## 1. Feature Overview
Phase 9 delivers the conclusion lifecycle of a Skribbl.io match:
1. **Match End Detection (`TurnManager.ts`):**
   - Automatically tracks completed rounds against `room.settings.totalRounds` (clamped 2 to 10).
   - Once all drawers have completed their turns in the final round, the server transitions the room state: `MATCH_END` / `FINISHED`.
2. **Server-Authoritative Winner & Podium Computation (`gameHandler.ts`):**
   - Ranks all room players by cumulative `total_score` in descending order.
   - Extracts the Winner and top 3 Podium finishers (Gold 🥇, Silver 🥈, Bronze 🥉).
   - Broadcasts `game_over` to all connected clients.
3. **Victory Podium UI (`GameOverModal.tsx`):**
   - Authentic 3-tier Olympic podium with height-staggered pedestals:
     - 1st Place (Center, 155px pedestal, Gold `#fde047`, 👑 Crown, glowing champion banner).
     - 2nd Place (Left, 110px pedestal, Silver `#cbd5e1`).
     - 3rd Place (Right, 80px pedestal, Bronze `#fed7aa`).
   - Displays player avatars (`SkribblAvatar.tsx`) and final score totals.
   - Full scrollable leaderboard list for all remaining players.
4. **"Play Again" / Return to Lobby Flow:**
   - Host has the exclusive ability to click **"Play Again (Return to Lobby)"** (`return_to_lobby`).
   - Server resets `room.status = 'LOBBY'`, resets all player scores to 0 (`player.resetScore()`), and broadcasts `returned_to_lobby` to transition all players together back to the lobby.
   - Non-host players see a polite waiting indicator: *"Waiting for host to start a new match..."*.
   - Any player can leave to the main menu at any time.
5. **Relational Database Lifecycle (MySQL):**
   - Marks `game_sessions`: `status = 'COMPLETED'`, `ended_at = NOW()`, `winner_player_id = ?`, and `total_rounds_played = ?`.
   - Updates `rooms`: `status = 'FINISHED'` (or `'LOBBY'` when returning).
   - Resets `players.total_score = 0` upon return to lobby.

---

## 2. Requirements Mapping
From [`docs/requirements-checklist.md`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/docs/requirements-checklist.md):
- **REQ-MH-09:** Live leaderboard & game end with winner announcement & podium. *(Must Have — Page 1, 2, 4, 5)*
- **REQ-SH-03:** Server-authoritative draw time countdown timer synchronized to all clients. *(Should Have — Page 2, 4, 5)*
- **WebSocket Protocol Events:**
  - `game_over` (Server ➔ Clients)
  - `return_to_lobby` (Client ➔ Server)
  - `returned_to_lobby` (Server ➔ Clients)
- **Database Schema:**
  - `game_sessions` (`status`, `winner_player_id`, `ended_at`, `total_rounds_played`)
  - `rooms` (`status`)

---

## 3. Network Event Protocol & Payload Specifications

| Event | Direction | Payload | Description |
|---|---|---|---|
| `game_over` | Server ➔ Clients | `{ roomId, winner: PlayerDTO, podium: PlayerDTO[], leaderboard: PlayerDTO[], totalRoundsPlayed: number }` | Broadcast upon match completion with winner and podium breakdown. |
| `return_to_lobby` | Host ➔ Server | `{ roomId: string }` | Host requests match reset and lobby return. |
| `returned_to_lobby` | Server ➔ Clients | `{ room: RoomDTO }` | Broadcasts lobby state and reset scores to all clients. |

---

## 4. Victory Podium Architecture

```
+-------------------------------------------------------------+
|                      🏆 VICTORY PODIUM!                     |
|            Match Complete (2 Rounds) - Winner: Alice        |
+-------------------------------------------------------------+
|                                                             |
|                          👑                                 |
|                       [Avatar]                              |
|                        Alice                                |
|                       1,250 pts                             |
|          [Avatar]    +---------+                            |
|            Bob       |         |        [Avatar]            |
|          850 pts     |         |         Charlie            |
|        +---------+   |         |         420 pts            |
|        |    2    |   |    1    |       +---------+          |
|        |  SILVER |   |  WINNER |       |    3    |          |
|        |         |   |         |       |  BRONZE |          |
+--------+---------+---+---------+-------+---------+----------+
|  Full Leaderboard:                                          |
|  🥇 Alice: 1,250 pts  |  🥈 Bob: 850 pts  |  🥉 Charlie: 420|
+-------------------------------------------------------------+
| [Main Menu]                [Play Again (Return to Lobby) 🔄]|
+-------------------------------------------------------------+
```

---

## 5. Testing & Verification

Automated multi-client integration test [`backend/tests/game_over.test.js`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/tests/game_over.test.js) executed cleanly across 6 full turns and 2 rounds:
```text
=== Phase 9 Game Over, Victory Podium & Return to Lobby Test Suite ===

Alice (Host) connected: RNybf_6nR1gYM3_DAAAG
✅ Step 1: Alice created 1-round match room 2QJ246
✅ Step 2: Bob joined room 2QJ246
✅ Step 3: Charlie joined room 2QJ246
✅ Turn 1 Word Selection: Alice is drawer, choosing "burger"...
✅ Turn 2 Word Selection: Bob is drawer, choosing "clock"...
✅ Turn 3 Word Selection: Charlie is drawer, choosing "castle"...
✅ Turn 4 Word Selection: Alice is drawer, choosing "hospital"...
✅ Turn 5 Word Selection: Bob is drawer, choosing "sleeping"...
✅ Turn 6 Word Selection: Charlie is drawer, choosing "flying"...

--- Match Completed: GAME OVER Event Received! ---
✅ Winner announced: 👑 AliceHost with 0 pts!
✅ Podium standings: [
  '#1 AliceHost (0 pts)',
  '#2 BobGuesser (0 pts)',
  '#3 CharlieGuesser (0 pts)'
]

--- Action: Host Alice triggers return_to_lobby ---
✅ Bob received returned_to_lobby broadcast with status LOBBY and reset scores!

--- Verifying Final MySQL Database Records ---
✅ MySQL game_sessions row: {
  status: 'COMPLETED',
  winner_player_id: 'c926896f-7c03-42db-984e-68463d2d1d36',
  ended_at: 2026-10-20T14:26:58.000Z
}
✅ MySQL rooms row status: LOBBY
✅ Complete MySQL database audit passed!

🎉 ALL PHASE 9 GAME OVER & VICTORY PODIUM TESTS PASSED!
```
