# Project Changelog & Strict Code-Change Record

All notable changes to the codebase, database schema, WebSocket events, and documentation are documented in this file in reverse chronological order.

---

## [Phase 6] Turn-Based Game Engine, Word Selection & Progressive Hint System
**Date:** 2026-10-20  
**Author:** Pair Programming (Developer & AI Architect)  
**Status:** Implemented, Tested & Documented  

### Summary of Actions
Implemented the complete server-authoritative turn engine, word selection modal, zero-trust word masking, and progressive hint reveal system:
1. **Mathematical Hint Engine (`HintManager.ts`):**
   - Implemented mathematical safeguards preventing word spoiling: $\max(\text{hints}) = \min(\text{hintsAllowed}, \max(1, \lfloor(\text{wordLength}-1)/2\rfloor))$.
   - Space preservation for multi-word phrases (`ICE CREAM` $\rightarrow$ `_ _ _   _ _ _ _ _`).
   - Progressive random character reveals scheduled at 50% and 75% elapsed turn time.
2. **Word Manager & Categorization (`WordManager.ts`):**
   - Fetches categorized words (animals, objects, actions, food, places) from MySQL `words` table with in-memory fallback.
   - Provides N randomized word choices for the active drawer.
3. **Turn State Machine & Server Authority (`TurnManager.ts`, `gameHandler.ts`):**
   - Cycles through connected players as drawers with configurable draw time and 15s word selection countdown.
   - Authoritative 1Hz countdown timer ticks (`turn_timer_tick`).
   - Auto-selects a word if the drawer times out.
   - Zero-Trust Network Security: Drawer receives plaintext `secretWord`; guessers strictly receive masked strings (`_ _ _ _ _`).
   - Logs turn conclusion into the MySQL `game_rounds` table.
4. **Authentic Frontend UI (`WordPickerModal.tsx`, `WordMaskBar.tsx`, `GameView.tsx`):**
   - Drawer receives interactive modal with 3 categorized word cards and 15s timer.
   - Guessers receive "Alice is choosing a word..." indicator.
   - Top `WordMaskBar` displays big masked letters with spaces for guessers, secret word for drawer, and live countdown clock.

### Files Created:
1. `backend/src/game/HintManager.ts`
2. `backend/src/game/WordManager.ts`
3. `backend/src/game/TurnManager.ts`
4. `backend/src/sockets/gameHandler.ts`
5. `frontend/src/components/WordPickerModal.tsx`
6. `frontend/src/components/WordMaskBar.tsx`
7. `backend/tests/turn_engine.test.js`
8. `docs/features/06-game-engine-and-words.md`
9. `docs/change-sets/06-game-engine.patch`

### Files Modified:
1. `backend/src/sockets/index.ts`
2. `backend/src/game/RoomManager.ts`
3. `frontend/src/pages/GameView.tsx`
4. `docs/requirements-checklist.md`
5. `docs/CHANGELOG.md`
6. `docs/PROJECT_WALKTHROUGH.md`

### Verification & Testing:
- Multi-client automated test `backend/tests/turn_engine.test.js` passed:
  - Verified `HintManager` mathematical safeguards and space preservation.
  - Verified drawer received 3 word options and selected a word.
  - Verified drawer received plaintext word while guesser Bob received Zero-Trust mask `_ _ _ _ _`.
  - Verified progressive hint broadcasts revealed 2 characters at scheduled intervals.
  - Verified turn concluded and revealed word.
- Backend TypeScript compilation (`npm.cmd --prefix backend run build`): 0 errors.
- Frontend production build (`npm.cmd --prefix frontend run build`): 0 errors.

---

## [Phase 5] Real-Time Drawing Synchronization & Zero-Trust Server Authority
**Date:** 2026-10-20  
**Author:** Pair Programming (Developer & AI Architect)  
**Status:** Implemented, Tested & Documented  

### Summary of Actions
Implemented and verified real-time vector drawing synchronization over WebSockets with server-authoritative role gating:
1. **Network Drawing Event Protocols (`drawingHandler.ts`):**
   - Implemented `draw_start`, `draw_move`, `draw_end`, `draw_undo`, `canvas_clear`, and `request_canvas_state` / `canvas_init`.
   - Streaming normalized vector coordinates $[0.0, 1.0]$ for cross-resolution parity.
   - Maintained in-memory round stroke history in `Room.strokeHistory` for sub-millisecond undo and late-join hydration.
2. **Server-Authoritative Zero-Trust Gatekeeper:**
   - Enforced server-side drawer verification: only sockets matching `room.currentDrawerId` are permitted to emit strokes or canvas clears; non-drawer emissions are rejected with `{ success: false, error: 'Unauthorized: You are not the active drawer.' }`.
3. **Client Dual-Mode Game View (`GameView.tsx`, `useCanvas.ts`):**
   - **Active Drawer:** Interactive canvas, full 22-color toolbar, 4 brush sizes, eraser, undo, and clear, with optimistic 0ms local rendering.
   - **Guessers:** Read-only canvas with `pointer-events: none`, toolbar hidden, spectator banner (`👁️ Watching drawer draw...`), rendering incoming strokes in real time.
   - Live roster sidebar displaying player avatars, scores, and drawer pencil badges.

### Files Created:
1. `backend/src/sockets/drawingHandler.ts`
2. `frontend/src/pages/GameView.tsx`
3. `backend/tests/drawing_sync.test.js`
4. `docs/features/05-drawing-sync.md`
5. `docs/change-sets/05-drawing-sync.patch`

### Files Modified:
1. `backend/src/types/room.ts`
2. `backend/src/game/Room.ts`
3. `backend/src/game/RoomManager.ts`
4. `backend/src/sockets/roomHandler.ts`
5. `backend/src/sockets/index.ts`
6. `frontend/src/types/game.ts`
7. `frontend/src/hooks/useCanvas.ts`
8. `frontend/src/App.tsx`
9. `docs/requirements-checklist.md`
10. `docs/CHANGELOG.md`
11. `docs/PROJECT_WALKTHROUGH.md`

### Verification & Testing:
- Multi-client automated test `backend/tests/drawing_sync.test.js` passed:
  - Verified `draw_start`, `draw_move`, and `draw_end` synchronization between Drawer Alice and Guesser Bob.
  - Verified server gatekeeper blocked unauthorized drawing attempts from Guesser Bob.
  - Verified `draw_undo` and `canvas_clear` broadcasts.
  - Verified late-joining spectator Charlie successfully hydrated canvas with active strokes from server RAM.
- Frontend production build (`npm.cmd --prefix frontend run build`): 0 errors, built in 4.28s.

---

## [Phase 4] Standalone HTML5 Drawing Canvas & Toolbar
**Date:** 2026-10-20  
**Author:** Pair Programming (Developer & AI Architect)  
**Status:** Implemented, Tested & Documented  

### Summary of Actions
Built and verified the standalone 2D HTML5 canvas drawing engine and toolbar:
1. **Interactive HTML5 2D Canvas (`Canvas.tsx`, `useCanvas.ts`):**
   - Implemented High-DPI (Retina) scaling using `window.devicePixelRatio`.
   - Bounded coordinate normalization mapping pointer input to $[0.0, 1.0]$.
   - Midpoint quadratic Bézier curve interpolation with round line caps for smooth calligraphy.
   - Non-destructive vector stroke model supporting instantaneous undo (< 2ms) and canvas clear.
   - Pointer capture and `touch-action: none` to isolate canvas from browser touch gestures.
2. **Authentic Skribbl Toolbar (`CanvasToolbar.tsx`):**
   - 22 Skribbl colors arranged in 2 rows of 11 swatches.
   - 4 brush tip sizes (4px, 10px, 20px, 36px) with physical circle previews.
   - Pen / Brush tool, Eraser tool, Vector Undo button, and Clear Canvas button.
3. **Practice Drawing Sandbox (`CanvasSandbox.tsx`):**
   - Sandbox view allowing standalone drawing testing with live technical telemetry (active strokes, point count, normalized coordinates, and memory footprint).
   - Added direct navigation button on Home screen.

### Files Created:
1. `frontend/src/types/canvas.ts`
2. `frontend/src/hooks/useCanvas.ts`
3. `frontend/src/components/Canvas.tsx`
4. `frontend/src/components/CanvasToolbar.tsx`
5. `frontend/src/pages/CanvasSandbox.tsx`
6. `backend/tests/canvas_vector.test.js`
7. `docs/features/04-drawing-canvas.md`
8. `docs/change-sets/04-drawing-canvas.patch`

### Files Modified:
1. `frontend/src/App.tsx`
2. `frontend/src/pages/Home.tsx`
3. `docs/requirements-checklist.md`
4. `docs/CHANGELOG.md`
5. `docs/PROJECT_WALKTHROUGH.md`

### Verification & Testing:
- Unit test suite `backend/tests/canvas_vector.test.js` passed: verified normalization, boundary clamping, cross-resolution reprojection (mobile 400x300, 4K 3840x2160), and vector undo/clear stack operations.
- Production build: `npm.cmd --prefix frontend run build` completed in 3.35s with 0 errors.

---

## [Phase 3 Polish] Authentic Skribbl.io UI, SVG Avatar Customizer & Smart Invite Links
**Date:** 2026-10-20  
**Author:** Pair Programming (Developer & AI Architect)  
**Status:** Implemented, Tested & Documented  

### Summary of Actions
Delivered an authentic Skribbl.io user interface matching the production game aesthetic while preserving full interview-readiness:
1. **Authentic Skribbl.io Landing Page (`Home.tsx`):**
   - Deep blue radial doodle canvas (`DoodleBackground.tsx`) with repeating SVG gaming doodles.
   - Bubbly colorful `skribbl.io` logo with drop shadow, dark strokes, and tilted pencil graphic.
   - Animated top banner of peeking avatars.
   - Clean center card with nickname input, language dropdown, interactive avatar picker, 3D green "Play!" button, and 3D blue "Create Private Room" button.
2. **Modular Vector SVG Avatar System (`SkribblAvatar.tsx` & `SkribblAvatarPicker.tsx`):**
   - 10 vibrant skin colors, 8 eye variations, and 8 mouth expressions providing 640 unique avatar combinations.
   - Interactive carousel controls (`< [Avatar] >`), color swatch drawer, and animated 3D dice randomizer button (🎲).
   - Lightweight serialization format (`skribbl_C_E_M`) with backwards compatibility for legacy avatars.
3. **Authentic Invite Link & Smart Paste Handling:**
   - Link generation now creates authentic Skribbl format: `${window.location.origin}/?${room.id}`.
   - Built a robust regex parser that detects room codes from `/?ROOMCODE`, `?join=CODE`, `/join/CODE`, or raw input.
   - Strictly prevents hostnames (`localhost`) from colliding with room codes.
   - Immediate 1-click joining from home screen when arriving via invite link.
4. **Discreet Architecture & Diagnostics Modal (`DiagnosticsModal.tsx`):**
   - Moved Phase 1 developer metrics (Express health, Socket.IO latency ping, MySQL status, live event log) into a slide-over modal accessible via a discreet floating pill button at the bottom of the screen.

### Files Created:
1. `frontend/src/components/SkribblAvatar.tsx`
2. `frontend/src/components/SkribblAvatarPicker.tsx`
3. `frontend/src/components/SkribblLogo.tsx`
4. `frontend/src/components/DoodleBackground.tsx`
5. `frontend/src/components/DiagnosticsModal.tsx`
6. `frontend/src/pages/Home.tsx`
7. `backend/tests/authentic_flow.test.js`

### Files Modified:
1. `frontend/src/App.tsx`
2. `frontend/src/index.css`
3. `frontend/src/pages/CreateRoom.tsx`
4. `frontend/src/pages/JoinRoom.tsx`
5. `frontend/src/pages/Lobby.tsx`
6. `docs/features/03-join-room-and-lobby.md`
7. `docs/requirements-checklist.md`
8. `docs/CHANGELOG.md`

### Verification & Testing:
- Regression suite `backend/tests/authentic_flow.test.js` executed:
  - 6 URL parsing test cases verified (including `localhost` boundary protection).
  - Multi-client simulation: Host created room with `skribbl_1_2_3`, guest joined via authentic URL with `skribbl_4_1_0`, verified real-time roster update and match start.
- Frontend production build (`npm.cmd --prefix frontend run build`): 0 errors, built in 1.97s.

---

## [Phase 3] Joining Rooms & Real-Time Lobby System
**Date:** 2026-10-20  
**Author:** Pair Programming (Developer & AI Architect)  
**Status:** Implemented, Tested & Documented  

### Summary of Actions
Implemented the real-time multiplayer joining and lobby rendezvous mechanics. Players can join an active room via 6-character code or deep-link. The backend enforces room capacity, unique nicknames, and lobby status, writes joining player records to MySQL, and maintains live presence. Real-time roster synchronization (`player_joined`, `player_left`) keeps all connected browser tabs synchronized. The lobby UI displays player cards with avatars, live counts, rules summary, and host-authoritative game start controls (`start_game`), writing initial `game_sessions` to MySQL upon match start.

### Files Created:
1. `frontend/src/pages/JoinRoom.tsx`: Join Room UI with code input, nickname, and avatar picker.
2. `frontend/src/pages/Lobby.tsx`: Real-time multiplayer lobby with live roster grid, copy buttons, and host start button.
3. `docs/features/03-join-room-and-lobby.md`: Standalone 13-point documentation for Phase 3.
4. `docs/change-sets/03-join-and-lobby.patch`: Exact code patch set for Phase 3.

### Files Modified:
1. `backend/src/types/room.ts`: Added `JoinRoomPayload`, `JoinRoomResponse`, `GameSessionDTO`, `StartGameResponse`.
2. `backend/src/game/Room.ts`: Added `hasPlayerName()`, `canStartGame()`, and host migration logic.
3. `backend/src/game/RoomManager.ts`: Added `joinRoom()`, `startGame()`, and `handleDisconnect()`.
4. `backend/src/sockets/roomHandler.ts`: Added socket listeners for `join_room`, `start_game`, and `disconnect`.
5. `frontend/src/types/game.ts`: Added frontend join and session data contracts.
6. `frontend/src/App.tsx`: Added seamless navigation router and deep link URL parameter detection (`?join=XXXXXX`).
7. `docs/requirements-checklist.md`: Marked REQ-MH-02, REQ-MH-03, `join_room`, `player_joined`, `player_left`, `start_game` as IMPLEMENTED & TESTED.
8. `docs/PROJECT_WALKTHROUGH.md`: Appended Phase 3 technical log and updated Feature Index.

### Database Changes:
- Rows inserted into `players` table for each joining player (`is_host=0`).
- `rooms.status` updated to `'PLAYING'` upon game start.
- Row inserted into `game_sessions` table (`status='IN_PROGRESS'`, `started_at=NOW()`).

### Verification & Testing:
- Simulated concurrent multi-client session: Host (Alice) created room `6V9GK6`, Bob joined, Alice received `player_joined` broadcast.
- Non-host start attempt by Bob rejected with `{ success: false, error: 'Only the room host can start the game.' }`.
- Host Alice started game: Both Alice and Bob received `start_game` broadcast with session UUID `b5430683-ae21-49a8-8b0c-2b61ee86471b`.
- Verified in MySQL: `rooms.status = 'PLAYING'`, both players registered in `players`, and match recorded in `game_sessions`.
- TypeScript & Vite builds: Backend `tsc` passed with 0 errors; Frontend `vite build` passed with 0 errors.

---

## [Phase 2] Room Creation & Settings Validation
**Date:** 2026-10-20  
**Author:** Pair Programming (Developer & AI Architect)  
**Status:** Implemented, Tested & Documented  

### Summary of Actions
Implemented the complete Room Creation system. Hosts can select their screen name, pick from 8 animated avatars, customize game rules via sliders/presets (player count, rounds, draw time, word count, hints count, private room toggle), and create a room. The backend performs server-side validation and sanitization, generates collision-free 6-character room codes, instantiates in-memory OOP models (`Player`, `Room`, `RoomManager`), persists room metadata and host records to MySQL, and joins the socket to the room channel.

### Files Created:
1. `backend/src/types/room.ts`: Data contracts for `RoomSettings`, `RoomStatus`, `RoomDTO`, `PlayerDTO`, `CreateRoomPayload`, `CreateRoomResponse`.
2. `backend/src/utils/codeGenerator.ts`: 6-character room code generator excluding ambiguous characters (`0, O, 1, I`).
3. `backend/src/game/Player.ts`: OOP domain model for player instances.
4. `backend/src/game/Room.ts`: OOP domain model for room instances.
5. `backend/src/game/RoomManager.ts`: Singleton managing in-memory room lookups and MySQL synchronization.
6. `backend/src/sockets/roomHandler.ts`: Socket.IO listener for `create_room` with validation and error handling.
7. `frontend/src/types/game.ts`: Frontend mirror of room and player types.
8. `frontend/src/components/AvatarPicker.tsx`: Avatar picker component with 8 distinct choices.
9. `frontend/src/pages/CreateRoom.tsx`: Form UI with sliders, presets, and live value feedback.
10. `docs/features/02-create-room.md`: Standalone 13-point documentation for Phase 2.
11. `docs/change-sets/02-create-room.patch`: Exact code patch set for Phase 2.

### Files Modified:
1. `backend/src/sockets/index.ts`: Registered `registerRoomHandlers(io, socket)`.
2. `frontend/src/App.tsx`: Added view navigation for Create Room and the created room confirmation card with copy buttons.
3. `docs/requirements-checklist.md`: Marked REQ-MH-01, REQ-NH-04, REQ-NH-05, and `create_room` as IMPLEMENTED & TESTED.
4. `docs/PROJECT_WALKTHROUGH.md`: Appended Phase 2 technical log and updated Feature Index.

### Database Changes:
- Rows inserted into `rooms` (status = `'LOBBY'`) and `players` (is_host = `1`) on each room creation.

### Verification & Testing:
- Emitted `create_room` over WebSocket with custom settings: Room `SALNXJ` created.
- Verified in MySQL container: `SELECT * FROM rooms WHERE room_id = 'SALNXJ'` and `SELECT * FROM players WHERE room_id = 'SALNXJ'`.
- Verified validation: Empty nickname rejected with `{ success: false, error: 'Nickname is required.' }`.
- TypeScript & Vite builds: Backend `tsc` passed with 0 errors; Frontend `vite build` passed with 0 errors.

---

## [Phase 1] Project Setup & Baseline Infrastructure
**Date:** 2026-10-20  
**Author:** Pair Programming (Developer & AI Architect)  
**Status:** Implemented, Tested & Documented  

### Summary of Actions
Implemented the complete full-stack project infrastructure comprising React 18 + Vite + TypeScript frontend, Node.js + Express + Socket.IO + TypeScript backend, and Docker Compose MySQL 8.0 on host port 3307 with persistent volume. Configured database migration runner, health check API, and bidirectional ping-pong WebSocket test.

### Files Created:
1. `docker-compose.yml`: Docker configuration for MySQL 8.0 with persistent volume `mysql_data` on host port 3307.
2. `.env`: Local environment configurations (`PORT=5000`, `DB_PORT=3307`, credentials).
3. `.env.example`: Version-controlled environment template.
4. `.gitignore`: Ignores dependencies, build outputs, environment files, and local logs.
5. `package.json` (Root): Monorepo management scripts.
6. `backend/package.json`: Backend dependencies (`express`, `socket.io`, `mysql2`, `cors`, `dotenv`, `tsx`, `typescript`).
7. `backend/tsconfig.json`: TypeScript configuration for backend (ES2022, NodeNext).
8. `backend/src/server.ts`: Express application, CORS middleware, `/api/health` endpoint, and server orchestrator.
9. `backend/src/db/connection.ts`: `mysql2` connection pool with `testConnection()` health ping.
10. `backend/src/db/migrate.ts`: Migration runner executing `.sql` migration files.
11. `backend/src/db/migrations/001_initial_schema.sql`: DDL for 6 tables (`rooms`, `players`, `game_sessions`, `game_rounds`, `player_round_scores`, `words`) + 25 seed words.
12. `backend/src/sockets/index.ts`: Socket.IO server initialization, client connection logger, and `ping_test` handler.
13. `frontend/package.json`: Frontend dependencies (`react`, `react-dom`, `socket.io-client`, `lucide-react`, `vite`).
14. `frontend/tsconfig.json` & `frontend/tsconfig.node.json`: TypeScript compiler settings.
15. `frontend/vite.config.ts`: Vite dev server with reverse proxy for `/api` and `/socket.io`.
16. `frontend/index.html`: Entry HTML template.
17. `frontend/src/vite-env.d.ts`: Vite client environment types.
18. `frontend/src/index.css`: Modern styling variables, status cards, and layout.
19. `frontend/src/services/socket.ts`: Socket.IO client singleton and `testSocketLatency()` helper.
20. `frontend/src/App.tsx`: Real-time system health dashboard, connection badges, and event feed.
21. `frontend/src/main.tsx`: React DOM root render.
22. `docs/features/01-project-setup.md`: Comprehensive 13-point documentation for Phase 1.
23. `docs/change-sets/01-project-setup.patch`: Exact code patch set for Phase 1.

### Database Changes:
- Executed `001_initial_schema.sql` inside `skribbl_mysql` container.
- Verified creation of 6 tables and insertion of 25 categorized seed words.

### Verification & Testing:
- `docker ps`: MySQL 8.0 container healthy on `0.0.0.0:3307->3306/tcp`.
- `npm run build` (Backend): Clean TypeScript compilation, 0 errors.
- `npm run build` (Frontend): Clean Vite build into `dist/`, 0 errors.
- `GET http://localhost:5000/api/health`: Returned HTTP 200 with `{ status: "ok", database: "connected" }`.
- `http://localhost:5173/`: Frontend returns HTTP 200 with active dashboard.
- Socket.IO connection & ping-pong roundtrip verified with 60ms latency.

---

## [Phase 0] Architecture, Database Design & Project Documentation Baseline
**Date:** 2026-10-19  
**Author:** Pair Programming (Developer & AI Architect)  
**Status:** Completed & Ready for Review  

### Summary of Actions
Established the foundational architecture, database schema, requirement breakdown, and documentation framework for the Skribbl.io clone application. No production application code written in this phase, honoring the architectural pre-requisite.

### Documentation Files Created:
1. `docs/reference/assignment.pdf`: Preserved original assignment specification.
2. `docs/requirements-checklist.md`: Extracted 10 Must-Have, 4 Should-Have, 9 Nice-to-Have/Bonus, and 5 Deliverable requirements.
3. `docs/decisions.md`: Documented ADR-001 through ADR-008 covering tech stack, in-memory vs MySQL boundary, server authority, drawing protocol, 3NF schema, OOP domain model, and anti-cheat mechanisms.
4. `docs/database-schema.md`: Complete relational schema specifications for 6 tables (`rooms`, `players`, `game_sessions`, `game_rounds`, `player_round_scores`, `words`), Mermaid ER diagram, and DDL scripts.
5. `docs/architecture.md`: System architecture overview, 4-player workflow walkthrough, Socket.IO protocol specification, and Spring Boot comparison.
6. `docs/development-roadmap.md`: Dependency-aware 11-phase development roadmap.
7. `docs/PROJECT_WALKTHROUGH.md`: Master chronological interview preparation guide.
8. `docs/CHANGELOG.md`: Central change-tracking register.
9. `docs/features/README.md`: Feature-specific documentation directory placeholder and standard template.
10. `docs/change-sets/README.md`: Feature-specific patch registry placeholder.
11. `docs/architecture-and-database.pdf`: Real, styled, comprehensive PDF document compiling architecture and database designs.

### Database Changes:
- Designed MySQL 8.0 schema with 6 tables (`rooms`, `players`, `game_sessions`, `game_rounds`, `player_round_scores`, `words`). Ready for implementation in Phase 1 Docker Compose setup.

### WebSocket Protocol Defined:
- Defined 20 distinct Socket.IO events matching assignment requirements:
  - Lobby: `create_room`, `join_room`, `player_joined`, `player_left`, `start_game`
  - Game State: `game_state`, `round_start`, `word_chosen`, `round_end`, `game_over`
  - Drawing: `draw_start`, `draw_move`, `draw_end`, `draw_data`, `canvas_clear`, `draw_undo`
  - Guessing/Chat: `guess`, `guess_result`, `chat`, `chat_message`

### Verification & Testing:
- Verified assignment PDF content against requirements.
- Verified Docker version (29.6.1), Docker Compose (v5.1.4), Node (v22.19.0), Python (3.13.7) and ReportLab on host machine.
- Verified PDF generation and formatting.
