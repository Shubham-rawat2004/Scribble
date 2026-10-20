# Feature 03: Joining Rooms & Real-Time Lobby System

This document details the complete design, code implementation, testing, and interview defense for Phase 3: **Joining Rooms & Real-Time Lobby System**.

---

## 1. Feature Overview
Phase 3 enables real-time multiplayer participation. Players can join an existing room by entering its 6-character room code or clicking a shared invite link (`/join/:code`). The backend verifies room existence, capacity limits, lobby status, and nickname uniqueness, then registers the new player in MySQL and in-memory room state. Socket.IO broadcasts `player_joined` and `player_left` to synchronize the roster across all connected client tabs in real time. The Lobby provides player cards with avatars, live counts, room rules, and host-authoritative game start controls (`start_game`).

---

## 2. Requirements Mapping
From [`docs/requirements-checklist.md`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/docs/requirements-checklist.md):
- **REQ-MH-02:** Join room via room code or direct link. *(Must Have — Page 1, 5)*
- **REQ-MH-03:** Lobby with real-time connected player list & host-only game start control. *(Must Have — Page 1, 4, 5)*
- **REQ-NH-05:** Player avatars in lobby roster cards. *(Bonus — Page 7)*
- **WebSocket Protocol Events:**
  - `join_room` (Client ➔ Server)
  - `player_joined` (Server ➔ Clients)
  - `player_left` (Server ➔ Clients)
  - `start_game` (Client ➔ Server — Host Only)
  - `game_started` (Server ➔ Clients)

---

## 3. User Workflow
1. User clicks **"Join Room"** on the home screen or opens an invite link with `?join=XXXXXX`.
2. Enters the 6-character room code, chooses an avatar (e.g. 🐱 Cat), and types a nickname.
3. Clicks **"Join Room"**.
4. The backend validates:
   - Does room exist?
   - Is room status still `LOBBY`?
   - Is `players.length < maxPlayers`?
   - Is nickname unique in this room?
5. The player enters the **Lobby View**.
6. The server broadcasts `player_joined` so the host and all existing players immediately see the new player card appear with avatar and "Online" badge.
7. If any player closes their tab, the server catches the disconnect, cleans up the roster, and emits `player_left`.
8. The **Host** clicks **"Start Game"** (disabled when `< 2` players). Non-hosts see a waiting banner.
9. When started, the server updates `rooms.status = 'PLAYING'`, creates a row in `game_sessions` (`status = 'IN_PROGRESS'`), and broadcasts `start_game` / `game_started` to all clients simultaneously.

---

## 4. Frontend Implementation
- **[`frontend/src/pages/JoinRoom.tsx`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/pages/JoinRoom.tsx):** Controlled form with Room Code input (auto-uppercased), Nickname input, `AvatarPicker`, and validation alerts.
- **[`frontend/src/pages/Lobby.tsx`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/pages/Lobby.tsx):**
  - Displays room code, one-click copy buttons for code and URL.
  - Player roster cards with avatar icon, name, `👑 Host` badge, and `(You)` indicator.
  - Match rules sidebar.
  - Host-only **"Start Game"** button with player count guard (`< 2` players disabled).
  - Socket listeners for `player_joined`, `player_left`, and `start_game`.
- **[`frontend/src/App.tsx`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/App.tsx):** Manages view state navigation (`home`, `create_room`, `join_room`, `lobby`, `game_started_preview`) and URL query parsing (`?join=XXXXXX`).

---

## 5. Backend Implementation
- **[`backend/src/game/Room.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/game/Room.ts):**
  - Added `hasPlayerName(name: string)`: case-insensitive check preventing duplicate names.
  - Added `canStartGame()`: enforces minimum 2 players and status `LOBBY`.
  - Added host migration: if the host disconnects during lobby, host privileges migrate to the next connected player.
- **[`backend/src/game/RoomManager.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/game/RoomManager.ts):**
  - `joinRoom()`: validates capacity, persists player to MySQL `players` table, adds to in-memory `Room`.
  - `startGame()`: verifies caller is host, checks >= 2 players, updates `rooms.status = 'PLAYING'`, inserts `game_sessions` row.
  - `handleDisconnect()`: cleans up disconnected players and triggers host migration if necessary.
- **[`backend/src/sockets/roomHandler.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/sockets/roomHandler.ts):**
  - Handlers for `join_room`, `start_game`, and `disconnect` with room broadcasting.

---

## 6. Database and Data Flow
```
[Client emit 'join_room']
       │
       ▼
[Server Validation] ──► Checks capacity & unique nickname
       │
       ├── MySQL INSERT INTO `players`: (player_id=UUID, room_id, player_name, avatar_id, is_host=FALSE)
       ├── RAM: room.addPlayer(newPlayer)
       ├── Socket: socket.join(room.id)
       └── Broadcast: socket.to(room.id).emit('player_joined', { player, players })
       │
       ▼
[Host emit 'start_game']
       │
       ├── Check: caller == room.hostPlayerId AND players.length >= 2
       ├── MySQL UPDATE `rooms` SET status = 'PLAYING' WHERE room_id = ?
       ├── MySQL INSERT INTO `game_sessions`: (session_id, room_id, status='IN_PROGRESS', started_at=NOW())
       └── Broadcast: io.to(room.id).emit('start_game', { roomId, session })
```

---

## 7. File-by-File Explanation

| File | Purpose |
|---|---|
| `backend/src/types/room.ts` | Data contracts for join payloads, responses, and game session DTOs |
| `backend/src/game/Room.ts` | Added `hasPlayerName`, `canStartGame`, and host migration logic |
| `backend/src/game/RoomManager.ts` | Implemented `joinRoom`, `startGame`, and disconnect cleanup |
| `backend/src/sockets/roomHandler.ts` | Event listeners for `join_room`, `start_game`, and `disconnect` |
| `frontend/src/types/game.ts` | Frontend contracts for join payloads and session DTOs |
| `frontend/src/pages/JoinRoom.tsx` | Join Room UI form with room code input and avatar picker |
| `frontend/src/pages/Lobby.tsx` | Real-time multiplayer lobby view with roster cards and host start button |
| `frontend/src/App.tsx` | View switcher connecting home, create, join, lobby, and match preview |

---

## 8. Code Explanation with Snippets

### 1. Real-Time Player Join Broadcast (`roomHandler.ts`)
```typescript
const { room, player } = await roomManager.joinRoom(rawCode, rawName, avatarId, socket.id);
await socket.join(room.id);

const allPlayers = room.getPlayerList().map((p) => p.toDTO());

// Broadcast to existing room participants
socket.to(room.id).emit('player_joined', {
  player: player.toDTO(),
  players: allPlayers,
});
```
*Why this matters:* `socket.to(room.id)` excludes the sender (who receives the full room in their acknowledgment callback), avoiding redundant event processing while instantly updating everyone else.

### 2. Host-Only Authorization Guard (`RoomManager.ts`)
```typescript
public async startGame(roomId: string, socketId: string) {
  const room = this.rooms.get(roomId.toUpperCase());
  if (!room) throw new Error('Room not found.');

  const caller = room.getPlayerBySocket(socketId);
  if (!caller || caller.id !== room.hostPlayerId) {
    throw new Error('Only the room host can start the game.');
  }

  const check = room.canStartGame();
  if (!check.canStart) throw new Error(check.reason);

  const sessionId = crypto.randomUUID();
  room.setStatus('PLAYING');
  // ... writes to MySQL rooms & game_sessions
}
```
*Why this matters:* Strictly enforces server-authoritative security so malicious clients cannot start a match without host privileges.

---

## 9. Complete Code-Change Record
- **Created Files:**
  - `frontend/src/pages/JoinRoom.tsx`, `frontend/src/pages/Lobby.tsx`
  - `docs/features/03-join-room-and-lobby.md`, `docs/change-sets/03-join-and-lobby.patch`
- **Modified Files:**
  - `backend/src/types/room.ts`, `backend/src/game/Room.ts`, `backend/src/game/RoomManager.ts`, `backend/src/sockets/roomHandler.ts`
  - `frontend/src/types/game.ts`, `frontend/src/App.tsx`
  - `docs/requirements-checklist.md`, `docs/CHANGELOG.md`, `docs/PROJECT_WALKTHROUGH.md`

---

## 10. Testing & Verification
1. **Multi-Client Real-Time Simulation:**
   - Host (Alice) created room `6V9GK6`.
   - Bob joined `6V9GK6`. Alice's socket received `player_joined` for `BobGuesser` (roster = 2).
   - Non-host start attempt by Bob was rejected: `{ success: false, error: 'Only the room host can start the game.' }`.
   - Host Alice started the game. Both Alice and Bob received `start_game` with session UUID `b5430683-ae21-49a8-8b0c-2b61ee86471b`.
2. **Database Verification (MySQL in Docker):**
   - Query: `SELECT * FROM rooms WHERE room_id = '6V9GK6';` ➔ Verified `status = 'PLAYING'`.
   - Query: `SELECT * FROM players WHERE room_id = '6V9GK6';` ➔ Verified Alice (`is_host=1`) and Bob (`is_host=0`).
   - Query: `SELECT * FROM game_sessions WHERE room_id = '6V9GK6';` ➔ Verified row with `status = 'IN_PROGRESS'`.
3. **Build Verifications:**
   - Backend `tsc`: 0 errors.
   - Frontend `vite build`: 0 errors (built in 8.75s).

---

## 11. Technical Interview Preparation (5 Questions & Answers)

### Q1: How do you synchronize player roster updates between multiple browser tabs without polling?
**Answer:** "When a new player joins, the server adds them to the room channel via `socket.join(roomId)` and immediately broadcasts a `player_joined` event with the updated roster to `socket.to(roomId)`. On the client side, React components listen via `socket.on('player_joined')` and update state with `setPlayers(data.players)`, re-rendering the UI instantaneously over the existing persistent WebSocket."

### Q2: How do you prevent unauthorized players from starting the game?
**Answer:** "Security is server-authoritative. The client UI disables the 'Start Game' button for non-hosts, but we never rely on frontend guards alone. On the backend, `RoomManager.startGame()` extracts the caller's player record from their `socket.id` and validates that `caller.id === room.hostPlayerId`. If a non-host attempts to emit `start_game`, the server rejects the request with an error."

### Q3: What happens if the room host leaves during the lobby?
**Answer:** "In `Room.removePlayer()`, we check if the departing player was the host. If so, and players still remain in the room, host status is automatically migrated to the next oldest connected player (`remainingPlayers[0].isHost = true`). The updated host ID is broadcasted to the room via `player_left`, ensuring the lobby never becomes unmanageable."

### Q4: Why is it important to check for duplicate nicknames within a room?
**Answer:** "In a guessing game where guesses are attributed to screen names and points are awarded to specific individuals, duplicate nicknames create confusion for players and chat moderation. We enforce case-insensitive uniqueness in `Room.hasPlayerName()` before allowing entry."

### Q5: How do you handle deep-linking for room invites?
**Answer:** "The invite URL contains the room code as a parameter or path (e.g. `?join=6V9GK6`). On initial render, `App.tsx` reads `window.location.search`, extracts the code, pre-fills the Room Code input field, and automatically presents the Join Room view, giving users a seamless 1-click joining experience."

---

## 12. Spring Boot Comparison
- `socket.to(roomId).emit('player_joined', data)` = Spring STOMP `simpMessagingTemplate.convertAndSend("/topic/room/" + roomId, data)`
- `socket.on('disconnect')` = Spring `SessionDisconnectEvent`
- Host authorization check = Spring Security `@PreAuthorize("hasRole('HOST')")`
- `room.canStartGame()` = Spring service-layer domain rule validation

---

## 13. Future Improvements
- Add spectator mode toggle for players who join after the room reaches capacity.
- Add ready-up toggle checkboxes for each player before the host can start.
