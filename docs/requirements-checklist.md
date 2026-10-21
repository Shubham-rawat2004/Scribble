# Requirements Implementation & Verification Checklist

This document tracks every single requirement extracted from the official assignment specification:
**`docs/reference/assignment.pdf`** (*Intern Assignment: skribbl.io Clone*).

---

## Status Legend
- `NOT STARTED`: Feature defined but implementation has not begun.
- `IN PROGRESS`: Feature is currently being actively developed.
- `IMPLEMENTED`: Code has been written and passes local developer testing.
- `TESTED`: Full automated and manual multiplayer test suite verified.
- `BLOCKED`: Dependency or decision required before proceeding.

---

## 0. Baseline Infrastructure Requirements (Phase 1)

| ID | Requirement Description | Priority | Planned Phase | Implementation Status | Verification Status | Relevant Implementation Files |
|---|---|---|---|---|---|---|
| **INFRA-01** | React 18 + TypeScript + Vite frontend project setup with HMR | MUST | Phase 1 | `IMPLEMENTED` | `TESTED` | `frontend/package.json`, `frontend/vite.config.ts`, `frontend/src/App.tsx` |
| **INFRA-02** | Node.js + Express + TypeScript backend with health endpoint | MUST | Phase 1 | `IMPLEMENTED` | `TESTED` | `backend/package.json`, `backend/src/server.ts` |
| **INFRA-03** | Socket.IO server & client with roundtrip ping-pong latency check | MUST | Phase 1 | `IMPLEMENTED` | `TESTED` | `backend/src/sockets/index.ts`, `frontend/src/services/socket.ts` |
| **INFRA-04** | Docker Compose MySQL 8.0 with persistent volume on host port 3307 | MUST | Phase 1 | `IMPLEMENTED` | `TESTED` | `docker-compose.yml`, `.env`, `backend/src/db/connection.ts` |
| **INFRA-05** | Database migration runner & 6-table DDL with 25 seed words | MUST | Phase 1 | `IMPLEMENTED` | `TESTED` | `backend/src/db/migrate.ts`, `backend/src/db/migrations/001_initial_schema.sql` |

---

## 1. Must Have Requirements (Core Gameplay)

| ID | Requirement Description | PDF Ref | Priority | Planned Phase | Implementation Status | Verification Status | Relevant Implementation Files |
|---|---|---|---|---|---|---|---|
| **REQ-MH-01** | Create room with configurable settings (max players, rounds, draw time, word count, hints) | Page 1, 2, 5 | MUST | Phase 2 | `IMPLEMENTED` | `TESTED` | `backend/src/game/Room.ts`, `backend/src/sockets/roomHandler.ts`, `frontend/src/pages/CreateRoom.tsx` |
| **REQ-MH-02** | Join room via room code or direct link | Page 1, 5 | MUST | Phase 3 | `IMPLEMENTED` | `TESTED` | `frontend/src/pages/JoinRoom.tsx`, `backend/src/sockets/roomHandler.ts` |
| **REQ-MH-03** | Lobby showing connected players list & host-only game start control | Page 1, 4, 5 | MUST | Phase 3 | `IMPLEMENTED` | `TESTED` | `frontend/src/pages/Lobby.tsx`, `backend/src/sockets/roomHandler.ts` |
| **REQ-MH-04** | Turn-based rounds: exactly one drawer per round, all other players guess | Page 1, 4, 5 | MUST | Phase 6 | `IMPLEMENTED` | `TESTED` | `backend/src/game/TurnManager.ts`, `backend/src/sockets/gameHandler.ts`, `frontend/src/pages/GameView.tsx` |
| **REQ-MH-05** | Real-time drawing sync via WebSockets (strokes visible immediately to all viewers) | Page 1, 4, 5 | MUST | Phase 5 | `IMPLEMENTED` | `TESTED` | `backend/src/sockets/drawingHandler.ts`, `frontend/src/pages/GameView.tsx`, `frontend/src/hooks/useCanvas.ts` |
| **REQ-MH-06** | Word selection: active drawer picks 1 word from a list of N choices (1–5 words) | Page 2, 4, 5 | MUST | Phase 6 | `IMPLEMENTED` | `TESTED` | `frontend/src/components/WordPickerModal.tsx`, `backend/src/game/WordManager.ts`, `backend/src/game/TurnManager.ts` |
| **REQ-MH-07** | Guessing system: players type guesses in chat, server verifies against word | Page 2, 5 | MUST | Phase 7 | `IMPLEMENTED` | `TESTED` | `backend/src/game/GuessManager.ts`, `backend/src/sockets/chatHandler.ts`, `frontend/src/components/ChatBox.tsx` |
| **REQ-MH-08** | Scoring engine: points awarded for correct guesses (faster guesses = more points, drawer points) | Page 1, 2, 5 | MUST | Phase 8 | `IMPLEMENTED` | `TESTED` | `backend/src/game/ScoringEngine.ts`, `backend/src/sockets/chatHandler.ts`, `backend/src/game/TurnManager.ts` |
| **REQ-MH-09** | Live leaderboard & round end score awards / victory podium | Page 1, 2, 4, 5 | MUST | Phase 8, 9 | `IMPLEMENTED` | `TESTED` | `frontend/src/components/GameOverModal.tsx`, `frontend/src/components/TurnScoreboardModal.tsx`, `frontend/src/pages/GameView.tsx` |
| **REQ-MH-10** | Basic drawing tools: Brush/pen, color palette, brush size slider, undo, clear canvas | Page 2, 4, 5 | MUST | Phase 4 | `IMPLEMENTED` | `TESTED` | `frontend/src/components/Canvas.tsx`, `frontend/src/components/CanvasToolbar.tsx`, `frontend/src/hooks/useCanvas.ts` |

---

## 2. Should Have Requirements (Enhanced Experience)

| ID | Requirement Description | PDF Ref | Priority | Planned Phase | Implementation Status | Verification Status | Relevant Implementation Files |
|---|---|---|---|---|---|---|---|
| **REQ-SH-01** | Word hints: reveal letters progressively over time (e.g. `_ _ a _ _`) based on round timer | Page 2, 3, 5 | SHOULD | Phase 6 | `IMPLEMENTED` | `TESTED` | `backend/src/game/HintManager.ts`, `backend/src/game/TurnManager.ts`, `frontend/src/components/WordMaskBar.tsx` |
| **REQ-SH-02** | Dual chat mode: guesses filtered from view if correct; general chat; notification broadcast | Page 2, 4, 5 | SHOULD | Phase 7 | `IMPLEMENTED` | `TESTED` | `backend/src/game/GuessManager.ts`, `backend/src/sockets/chatHandler.ts`, `frontend/src/components/ChatBox.tsx` |
| **REQ-SH-03** | Server-authoritative draw time countdown timer synchronized to all clients | Page 2, 4, 5 | SHOULD | Phase 6, 9 | `IMPLEMENTED` | `TESTED` | `backend/src/game/TurnManager.ts`, `frontend/src/components/WordMaskBar.tsx` |
| **REQ-SH-04** | Private rooms with authentic invite-only links (e.g. `https://host/?ROOMCODE`) with smart extraction | Page 1, 5 | SHOULD | Phase 3 | `IMPLEMENTED` | `TESTED` | `frontend/src/App.tsx`, `frontend/src/pages/Home.tsx`, `frontend/src/pages/JoinRoom.tsx`, `frontend/src/pages/Lobby.tsx` |

---

## 3. Nice to Have & Bonus Requirements

| ID | Requirement Description | PDF Ref | Priority | Planned Phase | Implementation Status | Verification Status | Relevant Implementation Files |
|---|---|---|---|---|---|---|---|
| **REQ-NH-01** | Categorized word list (animals, objects, actions, food, places) | Page 3, 5 | NICE | Phase 6 | `IMPLEMENTED` | `TESTED` | `backend/src/game/WordManager.ts`, `backend/src/db/migrations/001_initial_schema.sql` |
| **REQ-NH-02** | Eraser drawing tool (draws with background color / erase composite mode) | Page 2, 5 | NICE | Phase 4 | `IMPLEMENTED` | `TESTED` | `frontend/src/components/CanvasToolbar.tsx`, `frontend/src/hooks/useCanvas.ts` |
| **REQ-NH-03** | OOP WebSocket server structure (`Room`, `Game`, `Player`, `MessageHandler`, `Round`) | Page 6 | BONUS | Phase 1–6 | `IMPLEMENTED` | `TESTED` | `backend/src/game/*`, `backend/src/sockets/*` |
| **REQ-NH-04** | Configurable room settings (draw time 15–240s, rounds 2–10, word choices 1–5, max players 2–20) | Page 2, 3, 6 | BONUS | Phase 2 | `IMPLEMENTED` | `TESTED` | `backend/src/types/room.ts`, `backend/src/sockets/roomHandler.ts`, `frontend/src/pages/CreateRoom.tsx` |
| **REQ-NH-05** | Player avatars in lobby and in-game player cards (modular SVG faces & randomizer) | Page 7 | BONUS | Phase 2, 3 | `IMPLEMENTED` | `TESTED` | `frontend/src/components/SkribblAvatar.tsx`, `frontend/src/components/SkribblAvatarPicker.tsx` |
| **REQ-NH-06** | Host moderation (kick disruptive players from lobby with live roster sync) | Page 5, 7 | NICE | Phase 10 | `IMPLEMENTED` | `TESTED` | `backend/src/sockets/roomHandler.ts`, `frontend/src/pages/Lobby.tsx`, `backend/src/game/RoomManager.ts` |
| **REQ-NH-07** | Custom word list uploaded or specified by room host | Page 7 | BONUS | Phase 10 | `IMPLEMENTED` | `TESTED` | `backend/src/game/WordManager.ts`, `frontend/src/pages/CreateRoom.tsx` |
| **REQ-NH-08** | Public room matchmaking (instant "Play!" matches open public lobbies) | Page 1 | BONUS | Phase 10 | `IMPLEMENTED` | `TESTED` | `backend/src/game/RoomManager.ts`, `backend/src/sockets/roomHandler.ts`, `frontend/src/App.tsx` |
| **REQ-NH-09** | Canvas vector stroke history & late-join state hydration | Page 7 | BONUS | Phase 5, 10 | `IMPLEMENTED` | `TESTED` | `backend/src/sockets/drawingHandler.ts`, `frontend/src/hooks/useCanvas.ts` |

---

## 4. Architectural & Protocol Requirements (PDF Specified Events)

| Event Name | Direction | Specified Payload | Purpose | Phase | Status |
|---|---|---|---|---|---|
| `create_room` | Client ➔ Server | `{ hostName, settings }` | Host requests new room creation | Phase 2 | `IMPLEMENTED` |
| `join_room` | Client ➔ Server | `{ roomId, playerName }` | Player joins existing room | Phase 3 | `IMPLEMENTED` |
| `quick_play` | Client ➔ Server | `{ playerName, avatarId }` | Instant public lobby matchmaking | Phase 10 | `IMPLEMENTED` |
| `kick_player` | Client ➔ Server | `{ roomId, targetPlayerId }` | Host moderates room by kicking a player | Phase 10 | `IMPLEMENTED` |
| `kicked` | Server ➔ Client | `{ reason }` | Direct alert to kicked client | Phase 10 | `IMPLEMENTED` |
| `player_joined` | Server ➔ Clients | `{ player, players }` | Broadcast updated room roster | Phase 3 | `IMPLEMENTED` |
| `player_left` | Server ➔ Clients | `{ playerId, players }` | Broadcast player departure/disconnect | Phase 3 | `IMPLEMENTED` |
| `start_game` | Client ➔ Server | `{}` (Host only) | Host initiates game start | Phase 3 | `IMPLEMENTED` |
| `game_state` | Server ➔ Clients | `{ phase, round, drawerId, word, hints }` | Full game state synchronization | Phase 6 | `IMPLEMENTED` |
| `round_start` / `turn_start` | Server ➔ Clients | `{ drawerId, wordOptions, drawTime, wordMask }` | Round initialization (options to drawer, zero-trust mask to guessers) | Phase 6 | `IMPLEMENTED` |
| `word_chosen` / `select_word`| Client ➔ Server | `{ word }` | Drawer selects word, server starts timer | Phase 6 | `IMPLEMENTED` |
| `round_end` / `turn_end` | Server ➔ Clients | `{ word, scores, roundScores, nextDrawer }` | Round concludes, word revealed, scores | Phase 6, 8 | `IMPLEMENTED` |
| `game_over` | Server ➔ Clients | `{ winner, podium, leaderboard, totalRoundsPlayed }` | Match completed, show victory podium | Phase 9 | `IMPLEMENTED` |
| `return_to_lobby` | Client ➔ Server | `{ roomId }` | Host resets match and returns to lobby | Phase 9 | `IMPLEMENTED` |
| `returned_to_lobby` | Server ➔ Clients | `{ room }` | Broadcasts lobby state & reset scores | Phase 9 | `IMPLEMENTED` |
| `draw_start` | Client ➔ Server | `{ x, y, color, size }` | Drawer starts stroke | Phase 5 | `IMPLEMENTED` |
| `draw_move` | Client ➔ Server | `{ x, y }` | Drawer continues stroke | Phase 5 | `IMPLEMENTED` |
| `draw_end` | Client ➔ Server | `{}` | Drawer ends stroke | Phase 5 | `IMPLEMENTED` |
| `draw_data` | Server ➔ Clients | `{ ...stroke }` | Broadcast stroke coordinates to room | Phase 5 | `IMPLEMENTED` |
| `canvas_clear` | Client ➔ Server | `{}` | Drawer clears canvas; broadcast to all | Phase 4, 5 | `IMPLEMENTED` |
| `draw_undo` | Client ➔ Server | `{}` | Drawer undos last stroke; broadcast | Phase 4, 5 | `IMPLEMENTED` |
| `guess` / `send_chat_message` | Client ➔ Server | `{ roomId, text }` | Unified chat & guess submission | Phase 7 | `IMPLEMENTED` |
| `guess_result` / `player_guessed_correct` | Server ➔ Clients | `{ roomId, playerId, playerName, guessOrder }` | Guess correctness broadcast | Phase 7 | `IMPLEMENTED` |
| `chat` / `close_guess` | Server ➔ Client | `{ text: "You're close!" }` | Private fuzzy match alert | Phase 7 | `IMPLEMENTED` |
| `chat_message` | Server ➔ Clients | `{ id, senderId, senderName, text, type, timestamp }` | Broadcast chat message to room / solvers | Phase 7 | `IMPLEMENTED` |

---

## 5. Deployment & Final Interview Deliverables

| Deliverable | Requirement | Verification Target | Status |
|---|---|---|---|
| **Working Application** | Runs locally with Docker Compose MySQL and dev servers | WebSocket connects, 0 build errors | `IMPLEMENTED` |
| **README.md** | Complete setup instructions, architecture summary, interview defense | Clear, step-by-step reproduction instructions | `IMPLEMENTED` |
| **Architecture Documentation** | `architecture.md`, `database-schema.md`, `architecture-and-database.pdf` | Comprehensive, consistent with codebase | `IMPLEMENTED (Phase 0)` |
| **Consolidated Walkthrough** | `PROJECT_WALKTHROUGH.md` with every feature explained chronologically | Complete technical depth, interview-ready | `IMPLEMENTED (Phases 1–10)` |
| **Changelog & Patches** | `CHANGELOG.md` + `docs/change-sets/*.patch` for every single feature | 100% reproducible diffs without secrets | `IMPLEMENTED` |
| **Code Walkthrough Readiness** | Defend turns, timers, canvas sync, anti-cheat, database boundaries | Technical questions documented with speakable answers | `IMPLEMENTED` |
