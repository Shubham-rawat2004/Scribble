# Feature 10: Production Hardening, System Polish & Technical Interview Defense

This document details the complete design, bonus features, environment auditing, full test regression, and speakable technical interview defense for **Phase 10: Production Hardening, System Polish & Final Interview Deliverables**.

---

## 1. Feature Overview
Phase 10 elevates the project from a working clone to a hardened, enterprise-grade, interview-ready multiplayer application:
1. **Host Moderation (`kick_player` / `kicked`):**
   - Host has live moderation authority over lobby participants.
   - Non-host kick attempts are strictly rejected with an authoritative security error.
   - Target player is removed from MySQL `players`, notified via `kicked` socket event, removed from the room channel, and remaining participants receive immediate `player_left` broadcasts.
2. **Custom Word Lists (`customWords`):**
   - Room hosts can supply custom comma-separated word lists during room creation (`REQ-NH-07`).
   - Words are validated, sanitized, and stored in room settings.
   - Word selection engine dynamically prioritizes host custom words before falling back to MySQL categorized words.
3. **Public Room Matchmaking (`quick_play`):**
   - Instant "Play!" matchmaking finds any open public lobby and joins it immediately.
   - If no public room with available capacity exists, the server automatically spins up a public room with standard presets.
4. **Zero-Configuration Environment Hardening:**
   - Root, backend, and frontend `.env.example` templates created.
   - Docker Compose MySQL 8.0 healthcheck verified.
   - TypeScript and Vite production builds verified with 0 errors.
5. **Full Regression Test Pass:**
   - All 9 test suites across all phases verified cleanly.

---

## 2. Requirements Mapping
From [`docs/requirements-checklist.md`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/docs/requirements-checklist.md):
- **REQ-NH-06:** Host moderation (kick players from lobby or game with real-time roster sync).
- **REQ-NH-07:** Custom word list uploaded or specified by room host.
- **REQ-NH-08:** Public room matchmaking (instant "Play!" connects to open public rooms).
- **REQ-NH-09:** Canvas vector stroke history & late-join state hydration.
- **Deployment & Final Interview Deliverables:** Complete README, architectural diagrams, protocol tables, and technical defense.

---

## 3. Network Event Protocol Specification

| Event | Direction | Payload | Description |
|---|---|---|---|
| `quick_play` | Client ➔ Server | `{ playerName, avatarId }` | Matches into an open public room or creates one. |
| `kick_player` | Host ➔ Server | `{ roomId, targetPlayerId }` | Host removes a player from the room. |
| `kicked` | Server ➔ Client | `{ reason: string }` | Direct alert sent to the kicked client. |

---

## 4. Technical Interview Defense Guide

### Topic 1: Canvas Synchronization & Continuous Handwriting Scaling
- **Question:** *How did you resolve canvas DPI blurriness and prevent disjointed dots when drawing fast strokes?*
- **Defense:**
  1. **Normalized Float Coordinates $[0.0, 1.0]$:** Drawing coordinates are never transmitted in raw screen pixels. They are normalized against the client canvas dimensions: $x_{\text{norm}} = \frac{x_{\text{client}}}{W}, y_{\text{norm}} = \frac{y_{\text{client}}}{H}$. When rendered on any remote device (whether 400px mobile or 4K desktop), coordinates reproject cleanly via $x_{\text{remote}} = x_{\text{norm}} \times W_{\text{remote}}$.
  2. **Device Pixel Ratio (DPR) Decoupling:** Canvas coordinate buffers are sized to `width = clientWidth * dpr`, while CSS dimensions remain fixed. We observed that setting `canvas.width` on stroke initiation reset canvas rendering state and caused Pointer Events to drop capture. We resolved this by measuring dimensions with a `ResizeObserver`, caching DPI buffers, and avoiding canvas dimension mutations during active pointer interaction.
  3. **Synchronous Immediate Point Rendering:** To ensure zero input lag at 60–120 FPS, pointer positions are rendered immediately via direct `ctx.lineTo()` calls backed by synchronous mutable refs (`isDrawingRef`, `currentStrokeRef`), rather than waiting for React asynchronous state re-renders.

### Topic 2: Zero-Trust Word Concealment & Anti-Cheat
- **Question:** *How do you prevent players from inspecting browser DevTools or WebSocket frames to cheat and reveal the secret word?*
- **Defense:**
  1. **Server-Side Secret Word Isolation:** The plaintext word is never sent to guessers over WebSockets. On `turn_start`, the server sends the plaintext `secretWord` strictly to the designated drawer's socket ID, while guesser sockets receive a Zero-Trust underscore mask (e.g. `_ _ _ _ _`).
  2. **Winning Guess Interception:** When a guesser submits the correct word, the server's `GuessManager` catches the match, conceals the word, records the guess timestamp, and broadcasts a generic celebration banner: `🎉 [Player] guessed the word!`. The actual winning text never reaches other guessers' network tabs.
  3. **Drawer Anti-Cheat:** If the active drawer attempts to type the secret word or obvious substrings in chat, the server intercepts the message and delivers an exclusive warning to the drawer.

### Topic 3: Levenshtein Distance Dynamic Programming & $O(\min(m, n))$ Memory
- **Question:** *How does the "You're close!" notification algorithm work efficiently under heavy chat loads?*
- **Defense:**
  1. We implement the Wagner-Fischer dynamic programming algorithm for Levenshtein edit distance.
  2. Instead of maintaining an $O(m \times n)$ full matrix, we maintain only two rows (`previousRow` and `currentRow`), reducing memory complexity to $O(\min(m, n))$.
  3. If $\text{distance}(G, W) \le 1$ and $|W| \ge 4$, the guess is classified as `CLOSE_GUESS`. The room sees the raw attempt as an incorrect guess, but the guesser receives an exclusive amber alert: `⚠️ You're close!`.

### Topic 4: Dynamic Speed Decay Scoring & Game Theory
- **Question:** *How are points calculated, and how does the system discourage drawer griefing or inactive play?*
- **Defense:**
  1. **Guesser Points:** Points scale continuously from 100 to 500 based on remaining draw time ratio: $\text{Base} = \text{round}(100 + 400 \times \frac{t_{\text{remaining}}}{T_{\text{total}}})$. Order bonuses ($+50, +25, +10$) reward the quickest solvers, making top guesses worth up to 550 points.
  2. **Drawer Rewards:** Drawers earn points proportionally to the percentage of guessers who solved: $\text{DrawerPoints} = \text{round}(500 \times \frac{\text{solvers}}{\text{totalGuessers}})$. If nobody guesses the word, the drawer earns 0 points, aligning incentives so drawers strive for clarity rather than confusion.

### Topic 5: In-Memory Speed vs MySQL Persistence Architecture
- **Question:** *Why did you pair in-memory state machines with MySQL instead of querying MySQL on every stroke or guess?*
- **Defense:**
  1. Real-time drawing and guessing requires sub-15ms roundtrip latency. Reading or writing MySQL on every canvas coordinate or chat keystroke would overwhelm database connection pools.
  2. Therefore, active room state, stroke buffers, timers, and turn state machines live in high-speed Node.js memory (`Room`, `TurnManager`, `StrokeHistory`).
  3. Relational MySQL persistence acts as the authoritative system of record at key lifecycle milestones: room creation, match start, round completion (`player_round_scores`), game over (`game_sessions.status = 'COMPLETED'`), and player disconnects.

---

## 5. Regression Test Suite Results
All test suites executed with 100% pass rates:
1. `backend/tests/authentic_flow.test.js`: URL parsing, lobby join, host control — **PASSED**
2. `backend/tests/canvas_vector.test.js`: Normalization, cross-resolution vector projection, undo buffer — **PASSED**
3. `backend/tests/drawing_sync.test.js`: Real-time stroke broadcasting, spectator sync, late-join hydration — **PASSED**
4. `backend/tests/turn_engine.test.js`: Word options, drawer rotation, Zero-Trust masks, progressive hints — **PASSED**
5. `backend/tests/chat_engine.test.js`: Guess verification, anti-cheat, Option A solver isolation — **PASSED**
6. `backend/tests/scoring_engine.test.js`: Speed decay scoring, drawer rewards, live leaderboard — **PASSED**
7. `backend/tests/game_over.test.js`: Victory podium, Olympic standings, replay lobby reset — **PASSED**
8. `backend/tests/moderation_and_custom_words.test.js`: Host kick moderation, custom word lists — **PASSED**
9. `backend/tests/quick_play.test.js`: Public lobby matchmaking — **PASSED**
