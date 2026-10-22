# Skribbl.io Clone — Official Pointing System & Game Rules

This document serves as the comprehensive, authoritative specification for the **Points Scoring Engine**, **Round Progression**, **Winner Determination**, and **Connection Resilience Rules** in our Skribbl.io platform.

---

## 1. Core Philosophy of the Scoring System

Points in the game reflect two essential gameplay proficiencies:
1. **Speed & Recognition (For Guessers):** Players who decipher drawings and type the correct word quickly receive the highest rewards.
2. **Clarity & Drawing Quality (For Drawers):** Drawers are rewarded dynamically based on **how quickly** and **how many** players correctly solve their sketch. An easily recognizable drawing solved in 5 seconds yields significantly higher rewards than a confusing drawing solved with only 1 second left.

---

## 2. Guesser Points System

When an active guesser submits the correct secret word in chat, their points are calculated immediately on the server based on **clock time remaining** and their **arrival rank**.

### Mathematical Formula:

$$\text{TimeRatio} = \frac{\text{TimeRemainingSeconds}}{\text{TotalDrawTimeSeconds}} \quad (0.0 \le \text{TimeRatio} \le 1.0)$$

$$\text{BasePoints} = \text{round}\left(50 + 350 \times \text{TimeRatio}\right)$$

$$\text{OrderBonus} = \begin{cases} 
+50 & \text{if 1st player to guess correctly} \\
+25 & \text{if 2nd player to guess correctly} \\
+10 & \text{if 3rd player to guess correctly} \\
0 & \text{for 4th and subsequent guessers}
\end{cases}$$

$$\mathbf{\text{Guesser Total Points}} = \min\left(500, \text{BasePoints} + \text{OrderBonus}\right)$$

### Point Bounds & Guarantees:
* **Guaranteed Floor:** Any player guessing with $\ge 1$ second left receives at least **~50–60 points**.
* **Absolute Ceiling:** Maximum points per turn are strictly capped at **500 points**.
* **Zero Trust:** Drawer chat and guesses are strictly prohibited; solvers join an isolated chat channel to prevent spoiler leaks to unsolved guessers.

### Guesser Points Breakdown (Assuming Standard 80s Timer):

| Guess Timing | Remaining Time | Time Ratio | Base Points | Order Bonus | Final Points Awarded |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Instant Guess (1st)** | 80s | 1.000 | 400 | +50 | **450 pts** |
| **Fast Guess (1st)** | 70s | 0.875 | 356 | +50 | **406 pts** |
| **Fast Guess (2nd)** | 68s | 0.850 | 348 | +25 | **373 pts** |
| **Mid-Round Guess (1st)** | 40s | 0.500 | 225 | +50 | **275 pts** |
| **Mid-Round Guess (2nd)** | 39s | 0.488 | 221 | +25 | **246 pts** |
| **Mid-Round Guess (3rd)** | 35s | 0.438 | 203 | +10 | **213 pts** |
| **Late Guess (4th+)** | 15s | 0.188 | 116 | 0 | **116 pts** |
| **Last-Second Save** | 2s | 0.025 | 59 | 0 | **59 pts** |

---

## 3. Drawer (Artist) Points System

The drawer does not guess during their active turn. Instead, at the conclusion of the turn (`TURN_END`), the drawer is awarded points calculated from the **average base points** of all successful solvers, scaled by the **solver ratio** and the authentic **$0.6\times$ drawer multiplier**.

### Mathematical Formula:

$$\text{AverageSolverPoints} = \begin{cases}
0 & \text{if } S = 0 \\
\frac{1}{S} \sum_{i=1}^{S} \text{BasePoints}_i & \text{if } S > 0
\end{cases}$$

$$\text{SolverRatio} = \frac{S}{N} \quad \begin{cases} S = \text{Count of correct guessers in the turn} \\ N = \text{Total eligible guessers (non-drawer active players)} \end{cases}$$

$$\mathbf{\text{Drawer Total Points}} = \begin{cases}
0 & \text{if } S = 0 \text{ (nobody solved the sketch)} \\
\text{round}\left(\text{AverageSolverPoints} \times \text{SolverRatio} \times 0.6\right) & \text{if } S > 0
\end{cases}$$

### Point Bounds:
* **Minimum:** **0 points** (if no player guesses the word before time runs out).
* **Maximum:** **240 points** (when all eligible guessers solve the word instantly at $100\%$ time remaining: $400 \times 1.0 \times 0.6 = 240$).

---

## 4. The 2-Player Match Symmetry & Tie Resolution

### The Previous Commutative Tie Flaw:
Under an unscaled drawer formula ($\text{Multiplier} = 1.0$), in a 2-player match (1 Drawer, 1 Guesser):
* **Turn 1 (Player A draws, Player B guesses with speed $B_1$):**
  * Player B earns: $B_1 + 50$ (as guesser)
  * Player A earns: $B_1$ (as drawer)
* **Turn 2 (Player B draws, Player A guesses with speed $B_2$):**
  * Player A earns: $B_2 + 50$ (as guesser)
  * Player B earns: $B_2$ (as drawer)
* **Round Total:**
  * $\text{Score}(A) = B_1 + B_2 + 50$
  * $\text{Score}(B) = B_1 + 50 + B_2$
  * $\text{Score}(A) - \text{Score}(B) = 0$!

Because addition is commutative, **both players were mathematically guaranteed to finish with identical scores**, regardless of who guessed faster.

### The Authentic $0.6\times$ Scaling Solution:
With $\text{DRAWER\_SCALE\_FACTOR} = 0.6$:
* **Player A Total:** $0.6 B_1 + B_2 + 50$
* **Player B Total:** $B_1 + 50 + 0.6 B_2$
* **Score Difference:**
  $$\mathbf{\Delta} = \text{Score}(A) - \text{Score}(B) = (1 - 0.6)(B_2 - B_1) = \mathbf{0.4 \times (B_2 - B_1)}$$

### Result:
* If Player A solves Bob's drawing faster ($B_2 > B_1$), **Player A earns more points and wins cleanly**.
* If Player B solves Alice's drawing faster ($B_1 > B_2$), **Player B earns more points and wins cleanly**.
* Unintentional dead-ties (e.g. $1991 \text{ pts vs } 1991 \text{ pts}$) are completely eliminated.

---

## 5. Worked Scoring Scenarios

### Scenario 1: 2-Player Match (Speed Advantage)
* **Turn 1:** Alice draws. Bob guesses in 2 seconds ($B_1 = 390$).
  * Bob receives: $390 + 50 = \mathbf{440\text{ pts}}$
  * Alice receives: $\text{round}(390 \times 1.0 \times 0.6) = \mathbf{234\text{ pts}}$
* **Turn 2:** Bob draws. Alice guesses in 70 seconds ($B_2 = 100$).
  * Alice receives: $100 + 50 = \mathbf{150\text{ pts}}$
  * Bob receives: $\text{round}(100 \times 1.0 \times 0.6) = \mathbf{60\text{ pts}}$
* **Round Standings:**
  * **Bob (1st Place):** $440 + 60 = \mathbf{500\text{ pts}}$ 🥇
  * **Alice (2nd Place):** $234 + 150 = \mathbf{384\text{ pts}}$ 🥈
  * *Outcome:* Bob is decisively rewarded for fast guessing.

### Scenario 2: 4-Player Match (Partial Solvers)
* Total eligible guessers: $N = 3$.
* Player 1 draws.
  * Guesser 2 solves in 10s ($B_2 = 360$, Order 1): $+410\text{ pts}$ ($360 + 50$)
  * Guesser 3 solves in 30s ($B_3 = 260$, Order 2): $+285\text{ pts}$ ($260 + 25$)
  * Guesser 4 fails to guess: $+0\text{ pts}$
* Solvers count $S = 2$.
  * $\text{AverageSolverPoints} = (360 + 260) / 2 = 310$
  * $\text{SolverRatio} = 2 / 3 \approx 0.667$
  * $\text{Drawer Points} = \text{round}(310 \times 0.667 \times 0.6) = \mathbf{124\text{ pts}}$

### Scenario 3: Zero Solvers
* Nobody guesses the secret word before time reaches 0s.
  * All guessers: $\mathbf{0\text{ pts}}$
  * Drawer: $\mathbf{0\text{ pts}}$

---

## 6. Winner Determination & Victory Podium

1. **Cumulative Aggregation:**
   Match score is the cumulative sum of all points earned across all turns and rounds:
   $$\text{FinalScore}_p = \sum_{r=1}^{R} \left(\text{GuesserPoints}_{p, r} + \text{DrawerPoints}_{p, r}\right)$$
2. **Podium Ranks:**
   * **1st Place (Gold Medal / Winner):** Player with the highest cumulative match score.
   * **2nd Place (Silver Medal):** Player with the 2nd highest score.
   * **3rd Place (Bronze Medal):** Player with the 3rd highest score.
3. **Tie-Breaker Hierarchy:**
   In the rare event of identical total scores:
   1. **Primary:** Highest number of correct guesses as a Guesser.
   2. **Secondary:** Highest number of 1st-place fastest guesses ($\text{GuessOrder} = 1$).
   3. **Tertiary:** Lowest cumulative solve time.

---

## 7. Connection Resilience & Grace Period Rules

To ensure fair play and prevent premature match termination when playing with friends over invite links (e.g. mobile tab switches, WhatsApp in-app browser pauses, or brief Wi-Fi drops):

1. **20-Second Disconnection Grace Period:**
   * When a player's socket drops unexpectedly during an active game (`PLAYING`), the server does **not** immediately delete the player or cancel the match.
   * The player is marked as `isTemporarilyDisconnected`, and a **20-second reconnection timer** begins.
   * In-game chat announces: `⚠️ [PlayerName] disconnected. Waiting 20s for them to reconnect...`
   * Player card displays: `⚠️ Reconnecting...`
2. **Seamless Session Re-attachment:**
   * When the player re-opens the app or foregrounds the browser, the client emits `reconnect_player`.
   * The server cancels the 20-second grace timer, re-attaches their socket ID to their player seat, rejoins the socket rooms, re-hydrates canvas strokes, and resynchronizes the turn state.
   * In-game chat announces: `✅ [PlayerName] reconnected to the game!`
3. **Default Win on Abandonment:**
   * If the 20-second grace timer expires without reconnection, and active players drop below 2, the game cleanly transitions to `game_over`:
     > **"Game Over! All other players have left. You are the winner!"**
