# Project Changelog & Strict Code-Change Record

All notable changes to the codebase, database schema, WebSocket events, and documentation are documented in this file in reverse chronological order.

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
