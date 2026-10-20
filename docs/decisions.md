# Architectural Decision Records (ADR)

This document records the foundational architectural decisions made for the Skribbl.io clone project. Each record details the context, the decision taken, alternatives evaluated, and the resulting consequences.

---

## ADR-001: Technology Stack Selection

- **Status:** Accepted
- **Date:** 2026-10-19
- **Context:**
  The project requires an interactive, real-time multiplayer drawing and guessing game that can run smoothly on desktop and mobile browsers, scale to multiple concurrent rooms, persist game results, and be demonstrated cleanly in a technical interview. The developer has a strong foundation in Java, Spring Boot, OOP, and relational SQL, and is expanding into full-stack TypeScript/Node.js.
- **Decision:**
  - **Frontend:** React 18+ with TypeScript and Vite.
  - **Canvas Drawing:** HTML5 Canvas API with direct 2D context manipulation.
  - **Backend Server:** Node.js with Express.js and TypeScript.
  - **Real-Time Layer:** Socket.IO v4 (WebSocket transport with HTTP long-polling fallback).
  - **Database:** MySQL 8.0 running in Docker Compose locally with persistent volumes.
- **Alternatives Considered:**
  1. *Spring Boot + STOMP / WebSocket:* Strong familiarity, but Node.js + Socket.IO is the industry standard for lightweight, event-driven, low-latency multiplayer web games and directly addresses learning goals.
  2. *Next.js:* Full-stack framework, but serverless environments struggle with persistent long-lived WebSocket connections required by real-time canvas sync.
  3. *MongoDB:* Flexible document store, but relational integrity (rooms ➔ games ➔ rounds ➔ scores) maps cleanly to MySQL and aligns with the developer's SQL experience.
- **Consequences:**
  - Clean separation between client presentation and server game logic.
  - Rapid local setup via Vite (HMR) and Docker Compose.
  - High fidelity drawing performance with zero third-party canvas overhead.

---

## ADR-002: In-Memory Game State vs Database Persistence Boundary

- **Status:** Accepted
- **Date:** 2026-10-19
- **Context:**
  A Skribbl.io match generates high-frequency real-time events: mouse movement generates 30–60 stroke coordinates per second; timers tick every second; chat messages and guesses arrive concurrently. Writing every mouse coordinate or timer tick directly to MySQL would cause massive I/O bottlenecks, lock contention, and high latency.
- **Decision:**
  - **In-Memory (Ephemeral State):**
    - Active socket connections and mapping (`socket.id` ➔ `player_id`).
    - Live room roster and connection status.
    - Active game phase, current round number, and active drawer index.
    - Active countdown timer (`setInterval` reference and deadline timestamp).
    - Current round's drawing stroke buffer (for late-joining players and undo operations).
    - Secret word and revealed letter mask.
    - Set of players who have already guessed correctly in the current round.
  - **MySQL Database (Persistent State):**
    - Permanent room creation metadata and settings.
    - Completed game session records (start time, end time, final winner).
    - Round summaries (round number, drawer player ID, selected word).
    - Player leaderboard and cumulative game scores.
- **Alternatives Considered:**
  1. *Persist everything to MySQL:* Disastrous for database throughput; disk I/O would lag stroke broadcasts.
  2. *Pure in-memory without database:* Does not satisfy the mandatory requirement for persistent storage, historical records, and Dockerized database operations.
  3. *Redis caching layer:* Great for distributed clusters, but introduces unnecessary infrastructure complexity for a single-server deployment.
- **Consequences:**
  - Sub-millisecond latency for drawing synchronization and guess validation.
  - Zero disk write overhead during high-speed drawing.
  - Complete, structured historical audit trail stored cleanly in MySQL upon round and game completion.

---

## ADR-003: Authoritative Server Architecture

- **Status:** Accepted
- **Date:** 2026-10-19
- **Context:**
  In multiplayer competitive games, trusting the client for game state, timers, scoring, or turn progression leads to desynchronization and trivial cheating (e.g., players modifying client-side timers or claiming points arbitrarily).
- **Decision:**
  Adopt a strictly **Server-Authoritative** model:
  - The server alone chooses the drawer, picks the random word options, selects the secret word, runs the countdown timer, computes points, and declares round/game conclusions.
  - Clients are purely "dumb renderers" and input emitters: they render the canvas strokes received from the server, display the masked word sent by the server, and submit guess strings.
  - Only the currently designated drawer's socket is permitted to emit `draw_start`, `draw_move`, `draw_end`, `draw_undo`, and `canvas_clear` events. Any drawing event from a guessing player is rejected by server-side validation.
- **Alternatives Considered:**
  - *Peer-to-Peer (WebRTC):* Low latency, but complex NAT traversal, no central authority for word secrecy, and prone to cheating.
  - *Client-coordinated timers:* Client drift causes players to have mismatched deadlines.
- **Consequences:**
  - Absolute fairness and synchronization across all clients.
  - Secure game logic that cannot be manipulated via browser developer tools.

---

## ADR-004: Stroke-Based Vector Drawing Protocol vs Bitmap Streaming

- **Status:** Accepted
- **Date:** 2026-10-19
- **Context:**
  Synchronizing drawings between the drawer and up to 20 guessers requires an efficient network transmission strategy.
- **Decision:**
  Transmit discrete **vector stroke packets** rather than raster images (PNG/JPEG) or video streams:
  - When the drawer moves their mouse/stylus, coordinate pairs `{ x, y }` normalized to a standard canvas coordinate system (e.g. `800x600` or percentages `[0..1]`) are emitted.
  - Stroke definitions include tool type (`pen` or `eraser`), color (hex string), stroke width (pixels), and line segment points.
  - The backend broadcasts these stroke segments directly to the room.
  - Full stroke history is retained in the server's room memory to support `undo` (pop last stroke and notify room) and full canvas reconstruction for players who join mid-round.
- **Alternatives Considered:**
  1. *Canvas `toDataURL()` image streaming:* Extremely high network bandwidth (megabytes per second) and blurry rendering on high-DPI screens.
  2. *WebRTC MediaStream (video):* Overkill, high CPU encoding overhead, and lacks stroke vector history for replay/undo.
- **Consequences:**
  - Negligible bandwidth consumption (kilobytes per round).
  - Crisp vector rendering across diverse client screen resolutions and aspect ratios.
  - Effortless support for `undo` and canvas replay.

---

## ADR-005: Normalized Relational Schema for Game History

- **Status:** Accepted
- **Date:** 2026-10-19
- **Context:**
  We need to persist room settings, player participation, game outcomes, and score breakdowns in MySQL using clean relational modeling principles.
- **Decision:**
  Design a 3rd Normal Form (3NF) relational schema comprising:
  - `rooms`: Persistent room metadata, custom configuration, host reference.
  - `players`: Player records associated with rooms and sessions.
  - `game_sessions`: Master match record linked to a room, including game timestamps and winner.
  - `game_rounds`: Individual turns within a game, recording round number, drawer ID, and chosen word.
  - `player_round_scores`: Detailed audit of points earned per round by each player.
  - `words`: Catalog of available words, categories, and difficulty levels.
- **Alternatives Considered:**
  - *Single denormalized JSON column:* Storing entire game JSON in a single `rooms.data` column. While quick to implement, it defeats SQL relational queries, indexing, and analytics.
- **Consequences:**
  - Allows rich queries (e.g. highest scores, average guess time, most drawn words).
  - Clear foreign key constraints enforce referential integrity.
  - Easy to explain and defend in database architecture interview questions.

---

## ADR-006: Object-Oriented Domain Model for WebSocket Server (Bonus Architecture)

- **Status:** Accepted
- **Date:** 2026-10-19
- **Context:**
  The assignment specification explicitly highlights structuring the WebSocket server using OOP principles as a high-value bonus idea (Page 6). In Node.js, unstructured event handlers often degenerate into "spaghetti code" with global state dictionaries.
- **Decision:**
  Implement a clear domain-driven OOP hierarchy in TypeScript:
  - `Player`: Encapsulates player identity, socket reference, connection status, avatar, and total score.
  - `Room`: Manages room configuration, player roster, host privileges, room lifecycle, and room-level broadcasts.
  - `Game`: Manages round progression, turn rotation queue, overall game state machine, and winner determination.
  - `Round`: Manages active drawer, word selection, secret word, hint schedule, countdown timer, and stroke buffer.
  - `ScoringEngine`: Encapsulates mathematical score calculation based on remaining time and guess order.
  - `MessageHandler`: Routes incoming Socket.IO events to appropriate domain entities.
- **Comparison with Spring Boot:**
  - In Spring Boot, this resembles domain models (`@Entity` or POJOs) managed by `@Service` beans, with `@Controller` / `@MessageMapping` handling WebSocket STOMP frames.
- **Consequences:**
  - Clean, testable, decoupled domain logic.
  - Code is easy to explain to an interviewer evaluating OOP proficiency.

---

## ADR-007: Secret Word Concealment & Anti-Cheating Strategy

- **Status:** Accepted
- **Date:** 2026-10-19
- **Context:**
  If the server sends the actual secret word string to guessing clients (even if hidden in the UI), anyone inspecting WebSocket frames in Chrome DevTools Network tab can instantly read the word and cheat.
- **Decision:**
  - The secret word is strictly stored in the server's `Round` memory.
  - Guessing clients receive only a masked hint string (e.g., `_ _ _ _ _` or `_ p _ l _`) with word character count.
  - Only the socket of the active drawer receives the plain text word in the `round_start` or `word_chosen` payload.
  - The secret word is broadcast to guessing players only after the round has officially ended (`round_end`).
- **Consequences:**
  - 100% leak-proof secret word handling.
  - Demonstrates strong security awareness in technical interviews.

---

## ADR-008: Word Normalization, Levenshtein Distance & "Close Guess" Feedback

- **Status:** Accepted
- **Date:** 2026-10-19
- **Context:**
  Players might type `" Elephant "` or `"elephant"` or minor typos like `"elefant"`. Exact string comparison can frustrate users. Furthermore, once a player guesses correctly, their subsequent messages must not reveal the word to other guessers.
- **Decision:**
  - Normalization: String trimmed, lowercase converted, multiple spaces collapsed.
  - If normalized guess === normalized secret word:
    - Mark player as solved.
    - Award points based on elapsed time.
    - Emit `guess_result` to the guesser and notify the room: `"{PlayerName} guessed the word!"` without displaying the text.
    - Suppress the word from the public chat stream for players who have not yet guessed.
  - If guess differs by Levenshtein edit distance = 1 (and length >= 4):
    - Emit private notification to the guesser: `"You are very close!"` (classic Skribbl.io feature).
- **Consequences:**
  - Authentic Skribbl.io gameplay feel and polished user experience.

---

## ADR-009: Host Port Isolation for Docker MySQL Service

- **Status:** Accepted
- **Date:** 2026-10-20
- **Context:**
  During Phase 1 local startup, the host Windows machine already had a background `mysqld` service listening on port `3306`. Attempting to bind `3306:3306` in Docker Compose caused an address collision error (`bind: Only one usage of each socket address is normally permitted`).
- **Decision:**
  - Map external host port `3307` to internal container port `3306` (`3307:3306`) in `docker-compose.yml`.
  - Configure `DB_PORT=3307` in `.env` and `.env.example`.
  - Inside the container, MySQL continues listening on standard port `3306`.
- **Alternatives Considered:**
  1. *Stopping host `mysqld` service:* Risky, as it could disrupt other developer projects or databases on the machine.
  2. *Using host MySQL directly:* Violates requirement for reproducible, isolated Docker Compose environment.
- **Consequences:**
  - Zero conflict with pre-existing local databases.
  - Complete portability across different developer machines.
  - Excellent interview discussion point showcasing real-world container networking and port binding knowledge.

