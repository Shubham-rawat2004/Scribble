# Feature 02: Room Creation & Settings Validation

This document details the complete design, code implementation, testing, and interview defense for Phase 2: **Room Creation & Settings Validation**.

---

## 1. Feature Overview
Phase 2 enables any player to become a game **Host** by creating an isolated multiplayer game room. The host specifies their screen name, selects a fun avatar from a visual picker, and configures room rules (max players, total rounds, draw time per turn, word choices count, hints count, and private room toggle). The backend validates all inputs, generates a unique, human-readable 6-character room code, registers in-memory OOP domain models (`Player`, `Room`, `RoomManager`), persists records to MySQL (`rooms` and `players` tables), and isolates the host socket within a dedicated Socket.IO room channel.

---

## 2. Requirements Mapping
From [`docs/requirements-checklist.md`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/docs/requirements-checklist.md):
- **REQ-MH-01:** Create room with configurable settings (max players, rounds, draw time, word count, hints). *(Must Have — Page 1, 2, 5)*
- **REQ-NH-04:** Configurable room settings with exact boundary validation: draw time 15–240s, rounds 2–10, word choices 1–5, max players 2–20. *(Bonus — Page 2, 3, 6)*
- **REQ-NH-05:** Player avatar selection support. *(Bonus — Page 7)*
- **REQ-NH-03:** OOP WebSocket server domain modeling (`Room`, `Player`, `RoomManager`). *(Bonus — Page 6)*
- **Socket.IO Protocol:** Implements the `create_room` event payload matching assignment specification (Page 3).

---

## 3. User Workflow
1. User visits `http://localhost:5173/` and clicks the **"Create Room"** button.
2. The user selects an avatar (e.g. 🦊 Fox, 🐼 Panda, 🤖 Robot) and types their nickname.
3. The user customizes room rules using intuitive sliders or chooses from quick presets (*Quick: 4p/2r/60s*, *Standard: 8p/3r/80s*, *Party: 12p/5r/90s*).
4. The user clicks **"Create Room & Enter Lobby"**.
5. The client emits the `create_room` payload to the backend via Socket.IO.
6. The backend validates rules, generates a 6-character room code (e.g. `SALNXJ`), writes to MySQL, and joins the socket to room `SALNXJ`.
7. The UI transitions to the **Room Created / Lobby Ready** view displaying the room code, copyable invite link, host card, and rules summary.

---

## 4. Frontend Implementation
- **[`frontend/src/types/game.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/types/game.ts):** Shared TypeScript interfaces for `RoomSettings`, `RoomDTO`, `PlayerDTO`, `CreateRoomPayload`, and `CreateRoomResponse`.
- **[`frontend/src/components/AvatarPicker.tsx`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/components/AvatarPicker.tsx):** Grid of 8 distinct avatars with custom emojis, background tints, and selection rings.
- **[`frontend/src/pages/CreateRoom.tsx`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/pages/CreateRoom.tsx):** Controlled React form managing sliders, presets, and the `create_room` Socket.IO emission with loading state.
- **[`frontend/src/App.tsx`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/App.tsx):** Manages navigation flow between Home, Create Room, and the Room Created confirmation screen with clipboard copy buttons.

---

## 5. Backend Implementation
- **[`backend/src/types/room.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/types/room.ts):** Server-side TypeScript interfaces.
- **[`backend/src/utils/codeGenerator.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/utils/codeGenerator.ts):** Generates 6-character room codes from safe alphanumeric characters (excluding `0, O, 1, I` to prevent human confusion).
- **[`backend/src/game/Player.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/game/Player.ts):** OOP domain model encapsulating player identity, socket connection, avatar, and score.
- **[`backend/src/game/Room.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/game/Room.ts):** OOP domain model encapsulating room settings, player roster, host reference, and status.
- **[`backend/src/game/RoomManager.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/game/RoomManager.ts):** Singleton service managing the in-memory room map, socket reverse lookups, and MySQL persistence.
- **[`backend/src/sockets/roomHandler.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/sockets/roomHandler.ts):** Socket.IO event handler for `create_room` with boundary sanitization and error handling.

---

## 6. Database and Data Flow
```
[Client emit 'create_room']
       │
       ▼
[Server Validation & Code Gen] ──► Generates 'SALNXJ'
       │
       ├── MySQL INSERT INTO `rooms`: (room_id, host_name, max_players, total_rounds, draw_time_seconds, status='LOBBY')
       ├── MySQL INSERT INTO `players`: (player_id=UUID, room_id='SALNXJ', player_name, avatar_id, is_host=TRUE)
       ├── RAM: new Room('SALNXJ', hostPlayer, settings) added to RoomManager map
       └── Socket: socket.join('SALNXJ')
       │
       ▼
[Client callback response: { success: true, roomId: 'SALNXJ', room: {...}, player: {...} }]
```

---

## 7. File-by-File Explanation

| File | Purpose |
|---|---|
| `backend/src/types/room.ts` | Type definitions for rooms, players, settings, and socket payloads |
| `backend/src/utils/codeGenerator.ts` | 6-character room code generator |
| `backend/src/game/Player.ts` | OOP domain entity for a player |
| `backend/src/game/Room.ts` | OOP domain entity for a room |
| `backend/src/game/RoomManager.ts` | Singleton managing in-memory active rooms and MySQL persistence |
| `backend/src/sockets/roomHandler.ts` | Socket.IO listener for `create_room` |
| `backend/src/sockets/index.ts` | Registered `registerRoomHandlers` |
| `frontend/src/types/game.ts` | Frontend data contracts |
| `frontend/src/components/AvatarPicker.tsx` | Visual avatar picker component |
| `frontend/src/pages/CreateRoom.tsx` | Form UI with sliders, presets, and validation |
| `frontend/src/App.tsx` | View state navigation and room code confirmation card |

---

## 8. Code Explanation with Snippets

### 1. Unique Room Code Generation (`codeGenerator.ts`)
```typescript
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length: number = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  return code;
}
```
*Why this matters:* Eliminating lookalike characters like zero and letter 'O', or one and uppercase 'I', prevents transcription errors when players type room codes on mobile phones.

### 2. Room Creation & Persistence (`RoomManager.ts`)
```typescript
public async createRoom(hostName: string, avatarId: string, settings: RoomSettings, socketId: string) {
  let roomId = generateRoomCode();
  while (this.rooms.has(roomId)) {
    roomId = generateRoomCode();
  }

  const hostPlayerId = crypto.randomUUID();
  const hostPlayer = new Player(hostPlayerId, socketId, hostName, avatarId, true, 0);
  const room = new Room(roomId, hostPlayer, settings);

  // Persist to MySQL
  await pool.execute('INSERT INTO rooms (...) VALUES (...)', [...]);
  await pool.execute('INSERT INTO players (...) VALUES (...)', [...]);

  // Keep in server memory
  this.rooms.set(roomId, room);
  this.socketToPlayerMap.set(socketId, { roomId, playerId: hostPlayerId });
  return { room, host: hostPlayer };
}
```
*Why this matters:* Seamlessly coordinates both storage tiers: writes persistent records to MySQL for long-term audit and keeps live objects in Node.js RAM for sub-millisecond gameplay lookups.

---

## 9. Complete Code-Change Record
- **Created Files:**
  - `backend/src/types/room.ts`, `backend/src/utils/codeGenerator.ts`, `backend/src/game/Player.ts`, `backend/src/game/Room.ts`, `backend/src/game/RoomManager.ts`, `backend/src/sockets/roomHandler.ts`
  - `frontend/src/types/game.ts`, `frontend/src/components/AvatarPicker.tsx`, `frontend/src/pages/CreateRoom.tsx`
- **Modified Files:**
  - `backend/src/sockets/index.ts` (registered room handlers)
  - `frontend/src/App.tsx` (added Create Room navigation and created room confirmation card)
- **Patch Set:** Saved to [`docs/change-sets/02-create-room.patch`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/docs/change-sets/02-create-room.patch).

---

## 10. Testing & Verification
1. **Automated Socket Creation Test:**
   - Emitted `create_room` with `{ hostName: 'AliceHost', avatarId: 'avatar_2', settings: { maxPlayers: 6, totalRounds: 4, drawTimeSeconds: 75, wordOptionsCount: 3, hintsAllowed: 2, isPrivate: true } }`.
   - Result: Received `{ success: true, roomId: 'SALNXJ', room: {...}, player: {...} }`.
2. **Database Verification (MySQL in Docker):**
   - Query: `SELECT * FROM rooms WHERE room_id = 'SALNXJ';`
   - Verified: Row exists with `host_name = 'AliceHost'`, `max_players = 6`, `total_rounds = 4`, `draw_time_seconds = 75`, `status = 'LOBBY'`.
   - Query: `SELECT * FROM players WHERE room_id = 'SALNXJ';`
   - Verified: Row exists with `player_name = 'AliceHost'`, `is_host = 1`, `avatar_id = 'avatar_2'`.
3. **Input Validation Edge Cases:**
   - Emitted empty nickname (`"   "`).
   - Result: Correctly rejected with HTTP/Socket error `{ success: false, error: 'Nickname is required.' }`.
4. **TypeScript & Vite Builds:**
   - Backend `tsc`: 0 errors.
   - Frontend `vite build`: 0 errors (built in 11.87s).

---

## 11. Technical Interview Preparation (5 Questions & Answers)

### Q1: Why use in-memory classes (`Room`, `Player`) alongside MySQL rather than querying MySQL directly?
**Answer:** "Multiplayer games demand real-time responsiveness. Looking up room rosters or checking if a room is full on every socket event via SQL queries would introduce 5–15ms of database latency per event. By maintaining an in-memory `Map<string, Room>` in Node.js RAM, room lookups take less than 0.1ms. MySQL is reserved for durable state: initial room creation, player registration, round end scores, and match results."

### Q2: What happens if two hosts generate the same room code simultaneously?
**Answer:** "The `RoomManager` generates a 6-character code and executes a `while (this.rooms.has(roomId))` loop to verify uniqueness against all currently active rooms. Furthermore, the `room_id` column in MySQL is designated as the `PRIMARY KEY`, meaning the database itself strictly enforces uniqueness at the storage layer."

### Q3: How does `socket.join(roomId)` work internally in Socket.IO?
**Answer:** "In Socket.IO, an Adapter (by default, the in-memory adapter) maintains a hash table mapping room strings to Sets of socket IDs. When a socket calls `socket.join(roomId)`, its ID is added to that Set. When the server later calls `io.to(roomId).emit(...)`, Socket.IO iterates over only the sockets in that specific room set, achieving efficient room isolation with zero cross-room event bleeding."

### Q4: How do you prevent malicious clients from sending invalid room settings (e.g., negative rounds or 1,000 players)?
**Answer:** "Never trust client-supplied input. In `backend/src/sockets/roomHandler.ts`, we implement server-side validation and sanitization using `Math.min(Math.max(value, min), max)`. For example, `maxPlayers` is clamped between 2 and 20, and `drawTimeSeconds` is clamped between 15 and 240, ensuring that even if a user manipulates network payloads, the backend enforces server-authoritative boundaries."

### Q5: How would room creation work in a clustered, multi-server Node.js setup?
**Answer:** "In a multi-server setup, sockets connect to different server instances. To support this, we would replace the default in-memory Socket.IO adapter with the `@socket.io/redis-adapter` and store active room state in a Redis key-value store or Redis Hash. When an event is broadcast to a room, Redis Pub/Sub publishes the packet across all server instances to reach every connected socket regardless of which server holds the TCP connection."

---

## 12. Spring Boot Comparison
- `RoomManager.ts` = Spring `@Service` managing in-memory cache and `RoomRepository`
- `Player.ts` & `Room.ts` = Java domain classes / `@Entity` models
- `socket.join(roomId)` = Spring STOMP client subscribing to `/topic/room/{roomId}`
- `socket.on('create_room', callback)` = Spring `@MessageMapping("/create-room")` returning DTO
- Server-side input sanitization = Spring `@Valid` with JSR-380 annotations (`@Min`, `@Max`, `@NotBlank`)

---

## 13. Future Improvements
- Add custom room password protection option for private rooms.
- Allow the host to select specific word categories (e.g. only Animals or only Food) during creation.
