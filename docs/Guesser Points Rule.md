# Skribbl.io Clone - Guesser & Drawer Points Rule

This document outlines the official points distribution system, mathematical formulas, and winner calculation logic used in our Skribbl.io clone, aligned with authentic Skribbl.io gameplay rules.

---

## 1. Overview of Core Philosophy

In Skribbl.io, points reward two essential skills:
1. **Speed & Quick Recognition (For Guessers):** Players who decipher the drawing and type the correct word quickly receive the highest points.
2. **Clarity & Quality of Drawing (For Drawers):** The drawer's score is directly tied to **how quickly** and **how many** players guess their drawing. A drawing recognized in 5 seconds yields significantly higher points than a drawing solved in the final seconds of the turn.

---

## 2. Guesser Points Distribution Formula

When an active guesser submits the correct secret word in chat, their points are calculated immediately based on **time remaining on the clock** and their **order of arrival** (rank).

### Mathematical Formula:

$$\text{TimeRatio} = \frac{\text{TimeRemainingSeconds}}{\text{TotalDrawTimeSeconds}} \quad (0.0 \le \text{TimeRatio} \le 1.0)$$

$$\text{BasePoints} = \text{round}\left(50 + 350 \times \text{TimeRatio}\right)$$

$$\text{OrderBonus} = \begin{cases} 
+50 & \text{if 1st player to guess correctly} \\
+25 & \text{if 2nd player to guess correctly} \\
+10 & \text{if 3rd player to guess correctly} \\
0 & \text{for 4th and subsequent guessers}
\end{cases}$$

$$\mathbf{\text{Guesser Total Points}} = \min(500, \text{BasePoints} + \text{OrderBonus})$$

### Guesser Points Breakdown (Assuming 80s Round Timer):

| Guess Timing | Clock Time | Time Ratio | Base Points | Order Bonus | Final Points Awarded |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Instant Guess (1st)** | 80s | 1.00 | 400 | +50 | **450 pts** |
| **Fast Guess (1st)** | 70s | 0.875 | 356 | +50 | **406 pts** |
| **Fast Guess (2nd)** | 68s | 0.85 | 348 | +25 | **373 pts** |
| **Mid-Round Guess (1st)** | 40s | 0.50 | 225 | +50 | **275 pts** |
| **Mid-Round Guess (3rd)** | 38s | 0.475 | 216 | +10 | **226 pts** |
| **Late Guess (4th+)** | 15s | 0.1875 | 116 | 0 | **116 pts** |
| **Last-Second Guess** | 2s | 0.025 | 59 | 0 | **59 pts** |

* **Minimum Guaranteed Points:** If a player guesses with 1 second remaining, they still receive **~50 points**.
* **Maximum Score Cap:** Capped at **500 points**, preventing point inflation.

---

## 3. Drawer (Artist) Points Distribution Formula

The drawer's reward reflects the **drawing's clarity** and **room-wide solver rate**.

### Why the Old System Was Inaccurate:
Previously, the drawer was awarded $500 \times (\text{solvers} / \text{totalGuessers})$ regardless of time. Even if everyone guessed at the very last second, the drawer still received maximum points (500 pts), ignoring drawing speed.

### Authentic Speed-Weighted Drawer Formula:
When the drawing turn ends, the drawer's score is computed using the **average speed/points of all solvers**, scaled by the **fraction of eligible guessers** who solved the drawing:

$$\text{AverageSolverPoints} = \frac{\sum_{i=1}^{S} \text{BasePoints}_i}{S}$$

$$\text{SolverRatio} = \frac{S}{N} \quad \begin{cases} S = \text{Count of players who guessed correctly} \\ N = \text{Total eligible guessers (non-spectators)} \end{cases}$$

$$\mathbf{\text{Drawer Total Points}} = \begin{cases}
0 & \text{if } S = 0 \text{ (no one guessed)} \\
\text{round}\left(\text{AverageSolverPoints} \times \text{SolverRatio}\right) & \text{if } S > 0
\end{cases}$$

### Drawer Points Scenarios:

#### Scenario A: High-Quality Drawing (Fast Guesses, Full Room Solve)
* 3 out of 3 guessers solve the word within the first 15 seconds.
* Guessers average 360 base points.
* $\text{Drawer Points} = 360 \times \frac{3}{3} = \mathbf{360\text{ pts}}$.
* **Result:** Drawer is heavily rewarded for drawing clearly and quickly!

#### Scenario B: Unclear / Slow Drawing (Late Guesses, Full Room Solve)
* 3 out of 3 guessers struggle and solve it in the final 5 seconds.
* Guessers average 75 base points.
* $\text{Drawer Points} = 75 \times \frac{3}{3} = \mathbf{75\text{ pts}}$.
* **Result:** Drawer receives modest points because the drawing was confusing and slow.

#### Scenario C: Partial Solve (Only 1 out of 3 Players Guessed)
* Only 1 player managed to guess (in 30s, 225 base points).
* $\text{Drawer Points} = 225 \times \frac{1}{3} = \mathbf{75\text{ pts}}$.

#### Scenario D: Zero Solvers
* Nobody guessed the word before the timer reached 0s.
* **Drawer Points = 0 pts**.

#### Scenario E: 2-Player Match (1 Drawer, 1 Guesser)
* $\text{SolverRatio} = 1 / 1 = 1.0$.
* Drawer points equal the base score of the single guesser:
  * Guessed at 75s left: Drawer receives **~380 pts**.
  * Guessed at 10s left: Drawer receives **~90 pts**.

---

## 4. Winner Calculation & Podium Ranking

### 1. Cumulative Multi-Round Scoring
* Each match consists of $R$ rounds (e.g. 3 rounds).
* Every player takes turns drawing once per round.
* A player's total match score is the sum of:
  * Points earned as a **Guesser** across all turns.
  * Points earned as a **Drawer** across all turns.

$$\text{TotalScore}_p = \sum \text{GuesserPoints}_p + \sum \text{DrawerPoints}_p$$

### 2. Podium Standings
When all rounds conclude (`totalTurnsInRound` across all rounds completed):
1. **1st Place (Gold Medal):** Player with the highest total score ($\max \text{TotalScore}$).
2. **2nd Place (Silver Medal):** Player with the second highest score.
3. **3rd Place (Bronze Medal):** Player with the third highest score.

### 3. Tie-Breaking Hierarchy
If two or more players have the exact same total score:
1. **Primary Tie-Breaker:** Higher number of correct guesses as a Guesser.
2. **Secondary Tie-Breaker:** Higher number of 1st-place fastest guesses (Guess Order = 1).
3. **Tertiary Tie-Breaker:** Earliest player joined timestamp in room.

### 4. Default Win (Player Disconnection Rule)
If all other active players leave or disconnect mid-game, leaving only **one active player**:
* The match immediately transitions to `game_over`.
* The sole remaining player is declared **Winner by Default**, regardless of score.
* The message displayed is:
  > **"Game Over! All other players have left. You are the winner!"**
* Their cumulative earned score is preserved on the scoreboard.

---

## 5. Summary Comparison: Old vs New Logic

| Dimension | Previous Implementation | Authentic Skribbl.io Implementation |
| :--- | :--- | :--- |
| **Guesser Max Score** | 550 pts (Unbounded above 500) | **450–500 pts max** (Capped cleanly) |
| **Guesser Min Score** | 100+ pts even at 0s remaining | **~50 pts** for last-second saves |
| **Drawer Speed Factor** | Ignored (flat $500 \times \text{ratio}$) | **Proportional to guesser speed** |
| **Slow Drawing Penalty** | Drawer still got 500 pts at 1s left | Drawer gets lower score (~75 pts) |
| **Zero Solvers Penalty** | 0 pts | **0 pts** |
| **Winner Determination** | Highest cumulative points | **Highest cumulative points + tie-breakers** |
