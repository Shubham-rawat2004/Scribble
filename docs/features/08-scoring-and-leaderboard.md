# Feature 08: Dynamic Scoring Engine, Round Scoreboard & Live Leaderboard

This document details the complete design, mathematical formulas, network protocols, MySQL persistence, frontend components, and interview defense for Phase 8: **Dynamic Scoring Engine, Round Scoreboard & Live Leaderboard**.

---

## 1. Feature Overview
Phase 8 transforms the guessing and drawing mechanisms into a competitive multiplayer game:
1. **Dynamic Guesser Scoring Engine (`ScoringEngine.ts`):**
   - Faster solvers earn significantly more points.
   - Base points scale linearly with remaining round time from 100 to 500 points:
     $$\text{TimeRatio} = \frac{\text{timeRemaining}}{\text{drawTimeSeconds}}, \quad \text{BasePoints} = \text{round}(100 + 400 \times \text{TimeRatio})$$
   - Order bonus rewards fast solvers: 1st solver $+50$, 2nd solver $+25$, 3rd solver $+10$.
   - Total guesser score ranges from 100 to 550 points per round.
2. **Drawer Performance Reward:**
   - Drawer earns points proportional to how many players solved their drawing:
     $$\text{DrawerPoints} = \text{round}\left(500 \times \frac{\text{solversCount}}{\text{totalGuessers}}\right) \quad (0 \text{ to } 500 \text{ pts})$$
   - If 0 guessers solve, the drawer earns 0 points (encourages clear drawing).
3. **Live Leaderboard & Animated Increments (`GameView.tsx`):**
   - When a guesser solves the secret word, `score_update` is broadcast in real time.
   - The left player roster displays real-time animated score increment badges (`+550`) and dynamically re-ranks players in descending order with rank medals (`🥇`, `🥈`, `🥉`, `#4`).
4. **End-of-Turn Scoreboard Overlay (`TurnScoreboardModal.tsx`):**
   - During the 4-second transition between turns, all clients see a celebratory modal revealing the secret word, role badges, points earned this turn, total cumulative scores, and a countdown timer to the next turn.
5. **Relational Database Persistence (MySQL):**
   - Updates `players.total_score` on turn completion.
   - Inserts audit records into `player_round_scores` (`round_id`, `player_id`, `guessed_correctly`, `score_awarded`, `is_drawer`).
   - Marks `game_rounds.ended_at = NOW()`.

---

## 2. Requirements Mapping
From [`docs/requirements-checklist.md`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/docs/requirements-checklist.md):
- **REQ-MH-08:** Scoring engine: points awarded for correct guesses (faster guesses = more points, drawer points). *(Must Have — Page 1, 2, 5)*
- **REQ-MH-09:** Live leaderboard & round end score awards / podium. *(Must Have — Page 1, 2, 4, 5)*
- **WebSocket Protocol Events:**
  - `score_update` (Server ➔ Clients)
  - `turn_end` / `round_end` with score summary payload (Server ➔ Clients)
- **Database Schema:**
  - `players` (`total_score`)
  - `game_rounds` (`ended_at`)
  - `player_round_scores` (`score_awarded`, `guessed_correctly`, `is_drawer`)

---

## 3. Network Event Protocol & Payload Specifications

| Event | Direction | Payload | Description |
|---|---|---|---|
| `score_update` | Server ➔ Clients | `{ roomId, playerId, playerName, pointsEarned, newScore }` | Real-time score notification when a guesser solves the word. |
| `turn_end` | Server ➔ Clients | `{ roomId, secretWord, reason, scores: PlayerDTO[], roundScores: RoundScoreItem[] }` | Concludes turn; reveals secret word and distributes full points breakdown. |

### Data Structures:
```typescript
export interface RoundScoreItem {
  playerId: string;
  playerName: string;
  avatarId: string;
  role: 'DRAWER' | 'GUESSER';
  pointsEarned: number;
  totalScore: number;
  guessedCorrectly: boolean;
}
```

---

## 4. Mathematical Defense & Competitive Balance

### Why Decay + Order Bonus?
1. **Decay without order bonus** creates ties when two players submit within the same second tick.
2. **Order bonus without decay** ignores whether a player took 5 seconds or 75 seconds to guess.
3. Combining continuous linear time ratio with discrete arrival bonuses ensures:
   - A fast guess in the first 5 seconds yields $\sim 500\text{--}550$ points.
   - A guess at halfway mark yields $\sim 300\text{--}325$ points.
   - A last-second clutch guess yields $\sim 100\text{--}110$ points.

### Why Proportional Drawer Reward?
- In Skribbl.io, if a drawer draws something unrecognizable or inappropriate, 0 players will solve it, earning the drawer 0 points.
- If the drawing is clear, recognizable, and engaging, all players solve it, and the drawer earns the full 500 points reward.

---

## 5. Testing & Verification

Automated test suite [`backend/tests/scoring_engine.test.js`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/tests/scoring_engine.test.js) executed successfully:
```text
=== Phase 8 Dynamic Scoring Engine & Live Leaderboard Test Suite ===

--- Test 1: Pure Scoring Formulas (Speed Decay, Order Bonus & Drawer Reward) ---
✅ Instant guess (80s/80s, 1st place): { basePoints: 500, orderBonus: 50, totalPoints: 550, timeRemainingRatio: 1 }
✅ Mid guess (40s/80s, 2nd place): { basePoints: 300, orderBonus: 25, totalPoints: 325, timeRemainingRatio: 0.5 }
✅ Slow guess (0s/80s, 3rd place): { basePoints: 100, orderBonus: 10, totalPoints: 110, timeRemainingRatio: 0 }
✅ Drawer points formula verified (0/3 = 0, 1/2 = 250, 2/2 = 500)

--- Test 2: Multi-Client Real-Time Scoring Flow & MySQL Persistence ---
Alice (Host/Drawer) connected: 300u70L6BKTbuNquAAAS
✅ Step 1: Alice created room AWKBMT
Bob (Guesser 1) connected: mFrGYP0jptWP2iQRAAAT
✅ Step 2: Bob joined room AWKBMT
Charlie (Guesser 2) connected: mhIgkL1JpVZ0dLBJAAAU
✅ Step 3: Charlie joined room AWKBMT
✅ Step 4: Alice received word options. Selecting "pizza"...
✅ Step 5: Turn started! Beginning guess timing tests...

--- Action A: Bob guesses "pizza" immediately (1st place) ---
✅ Score Update broadcast received by Alice: Player b84d7426-8578-40bc-b867-6a8e04b9b182 earned +550 pts (Total: 550)

--- Action B: Charlie guesses "pizza" later (2nd place) ---
✅ Score Update broadcast received by Alice: Player ad10ee23-979e-4c6d-ac6e-bd1b029768f3 earned +525 pts (Total: 525)

--- Action C: Turn ended and score summary received ---
✅ Round score summary items received: [
  'BobGuesser (GUESSER): +550 pts (Total: 550)',
  'CharlieGuesser (GUESSER): +525 pts (Total: 525)',
  'AliceDrawer (DRAWER): +500 pts (Total: 500)'
]
✅ Speed & order bonus verified: Bob (550 pts) > Charlie (525 pts)
✅ Drawer points verified: Alice received 500 drawer points!

--- Action D: Verifying MySQL database persistence ---
✅ MySQL players table cumulative scores: [
  { player_name: 'BobGuesser', total_score: 550 },
  { player_name: 'CharlieGuesser', total_score: 525 },
  { player_name: 'AliceDrawer', total_score: 500 }
]
✅ MySQL player_round_scores table contains 3 recorded entries.
✅ MySQL database audit completely verified!

🎉 ALL PHASE 8 DYNAMIC SCORING & LEADERBOARD TESTS PASSED!
```
