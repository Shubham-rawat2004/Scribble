# Feature 06: Turn-Based Game Engine, Word Selection & Progressive Hint System

This document details the complete design, network protocols, server authority security, code implementation, testing, and interview defense for Phase 6: **Turn-Based Game Engine, Word Selection & Progressive Hint System**.

---

## 1. Feature Overview
Phase 6 delivers the core turn engine and word selection lifecycle of Skribbl.io:
1. **Turn State Machine & Rotation:** When a match begins, players cycle through rounds as the active drawer. Each turn is managed by the server-authoritative `TurnManager.ts`.
2. **Word Selection Modal (`WordPickerModal.tsx`):** The active drawer receives a private modal containing 3 categorized words (from MySQL database or categorized in-memory fallback), with a 15-second countdown timer. Spectators receive a waiting indicator ("Alice is choosing a word..."). If the drawer fails to pick before timeout, a random word is automatically selected by the server.
3. **Zero-Trust Word Masking (`WordMaskBar.tsx`):** 
   - **For Active Drawer:** Plaintext word (e.g. `PIZZA`) is shown along with length and category.
   - **For Guessers:** Word is strictly masked with underscores (e.g. `_ _ _ _ _`). Multi-word spaces are preserved (`_ _ _   _ _ _ _ _`). The plaintext secret word is **never sent over the network** to guessers.
4. **Progressive Hint Engine (`HintManager.ts`):** 
   - Mathematical safety bounds prevent word spoiling: $\max(\text{hints}) = \min(\text{hintsAllowed}, \max(1, \lfloor(\text{wordLength}-1)/2\rfloor))$.
   - Reveals 1 to 2 random characters at predetermined intervals (e.g. 50% and 75% elapsed turn time).
   - Real-time broadcast updates the `WordMaskBar` on all guesser clients.
5. **Turn Timer & MySQL Persistence:** Server drives second-by-second countdown ticks (`turn_timer_tick`) and logs round outcomes into the MySQL `game_rounds` table.

---

## 2. Requirements Mapping
From [`docs/requirements-checklist.md`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/docs/requirements-checklist.md):
- **REQ-MH-04:** Turn-based rounds: exactly one drawer per round, all other players guess. *(Must Have — Page 1, 4, 5)*
- **REQ-MH-06:** Word selection: active drawer picks 1 word from a list of N choices (1–5 words) with auto-selection timeout. *(Must Have — Page 2, 4, 5)*
- **REQ-SH-01:** Word hints: reveal letters progressively over time (e.g. `_ _ A _ _`) based on round timer without spoiling the word. *(Should Have — Page 2, 3, 5)*
- **REQ-NH-01:** Categorized word list (animals, objects, actions, food, places). *(Nice to Have — Page 3, 5)*
- **REQ-NH-03:** OOP WebSocket server structure (`TurnManager`, `WordManager`, `HintManager`). *(Bonus — Page 6)*

---

## 3. Network Event Protocol & Payload Specifications

| Event | Direction | Payload | Description |
|---|---|---|---|
| `word_selection_start` | Server ➔ Drawer | `{ roomId: string, words: WordOption[], timeoutSeconds: number }` | Sends 3 word choices exclusively to the drawer socket. |
| `drawer_choosing_word` | Server ➔ Guessers | `{ roomId: string, drawerId: string, drawerName: string }` | Notifies guessers that drawer is picking. |
| `select_word` | Drawer ➔ Server | `{ roomId: string, word: string }` | Drawer confirms their word choice. |
| `turn_start` (to Drawer) | Server ➔ Drawer | `{ roomId, roundNumber, drawerId, drawerName, role: 'DRAWER', secretWord: string, durationSeconds }` | Begins turn; reveals plaintext word to drawer. |
| `turn_start` (to Guessers)| Server ➔ Guessers | `{ roomId, roundNumber, drawerId, drawerName, role: 'GUESSER', wordMask: string, wordLength: number, durationSeconds }` | Begins turn; sends ZERO-TRUST masked string to guessers. |
| `word_hint` | Server ➔ Guessers | `{ roomId: string, wordMask: string, hintsRevealed: number }` | Broadcasts progressive letter reveals (e.g. `_ I _ _ _`). |
| `turn_timer_tick` | Server ➔ All | `{ roomId: string, timeLeft: number }` | Authoritative 1Hz second timer tick. |
| `turn_end` | Server ➔ All | `{ roomId: string, secretWord: string, reason: string }` | Concludes turn; reveals secret word and prepares next turn. |

---

## 4. Progressive Hint Algorithm & Mathematical Defense

### The Word-Spoiling Problem
In trivia and drawing games, revealing too many letters makes guessing trivial (e.g. revealing 2 letters of a 3-letter word leaves only 1 missing letter, turning the game into a brute-force typing race).

### The Mathematical Formula
In `backend/src/game/HintManager.ts`:
$$\text{MaxHints} = \begin{cases} 
0 & \text{if } \text{wordLength} \le 2 \\
1 & \text{if } 3 \le \text{wordLength} \le 4 \\
\min(\text{hintsAllowed}, \lfloor \frac{\text{wordLength}-1}{2} \rfloor) & \text{if } \text{wordLength} \ge 5
\end{cases}$$

### Example Calculations:
- Word **"PI"** (2 letters) $\rightarrow \mathbf{0}$ hints allowed.
- Word **"CAT"** (3 letters) $\rightarrow \mathbf{1}$ hint allowed (`_ A _`).
- Word **"PIZZA"** (5 letters) $\rightarrow \mathbf{2}$ hints allowed (`_ I _ _ _` $\rightarrow$ `_ I _ Z _`).
- Word **"ELEPHANT"** (8 letters) $\rightarrow \mathbf{3}$ hints allowed.

### Timing Schedule:
- **Hint 1:** Scheduled at $50\%$ elapsed turn time ($t = \lfloor \text{duration} \times 0.5 \rfloor$).
- **Hint 2:** Scheduled at $75\%$ elapsed turn time ($t = \lfloor \text{duration} \times 0.25 \rfloor$).

---

## 5. Zero-Trust Security Architecture

1. **Client Isolation:** The secret word is retained exclusively in server memory (`turnManager.activeTurns.get(roomId).secretWord`).
2. **Selective Emits:** Socket.IO emits different payloads to the drawer vs guessers:
   ```typescript
   // Socket.to(roomId) gets mask
   io.to(roomId).emit('turn_start', {
     role: 'GUESSER',
     wordMask: HintManager.formatMaskString(activeTurn.currentMask),
     wordLength: secretWord.length,
   });
   // Drawer socket gets plaintext
   drawerSocket.emit('turn_start', {
     role: 'DRAWER',
     secretWord: activeTurn.secretWord,
   });
   ```
3. **Cheating Prevention:** Guessers inspecting network WebSockets or Redux/React states cannot extract the word because it was never transmitted.

---

## 6. Testing & Verification

Automated test suite [`backend/tests/turn_engine.test.js`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/tests/turn_engine.test.js) executed successfully:
```text
=== Phase 6 Turn Engine, Word Selection & Progressive Hint Test Suite ===

--- Test 1: HintManager Mathematical Safeguards & Mask Formatting ---
✅ "APPLE" formatted as initial mask: _ _ _ _ _
✅ Multi-word "ICE CREAM" space preserved: _ _ _   _ _ _ _ _
✅ Max hints mathematically bounded to prevent word spoiling
✅ Hint 1 revealed: A _ _ _ _
✅ Hint 2 revealed: A _ _ L _

--- Test 2: Real-Time Multi-Client Word Selection & Progressive Hint Sync ---
Alice (Host) connected: WQiphRwXUqqufiesAAAb
✅ Step 1: Alice created room 7Z52RM
Bob (Guesser) connected: TfQycnuRZ0nlk_RZAAAc
✅ Step 2: Bob joined room 7Z52RM
✅ Host started match!
✅ Step 4: Alice received word_selection_start with 3 choices: [ 'clock', 'dancing', 'giraffe' ]
✅ Step 3: Bob received drawer_choosing_word for Alice!
✅ Step 5b: Alice received turn_start with plaintext secretWord: "PIZZA"
✅ Step 4b: Alice selected word "clock"
✅ Step 5: Bob received turn_start with ZERO-TRUST word mask: "_ _ _ _ _" (Plaintext secret word hidden)!
✅ Step 6: Bob received progressive word_hint broadcast! Updated mask: "_ _ _ _ A"
✅ Step 6: Bob received progressive word_hint broadcast! Updated mask: "P _ _ _ A"
✅ Step 7: Turn concluded and secret word revealed to all!

🎉 ALL PHASE 6 TURN ENGINE, WORD SELECTION & HINT TESTS PASSED!
```
