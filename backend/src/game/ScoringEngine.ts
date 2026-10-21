// ScoringEngine: Dynamic Speed-Based Points & Drawer Rewards Engine
export interface GuesserScoreResult {
  basePoints: number;
  orderBonus: number;
  totalPoints: number;
  timeRemainingRatio: number;
}

export class ScoringEngine {
  /**
   * Calculates points awarded to a guesser based on speed (remaining time) and order of arrival.
   *
   * Formula:
   * TimeRatio = timeRemaining / totalDrawTime
   * BasePoints = round(100 + 400 * TimeRatio)
   * OrderBonus: 1st: +50, 2nd: +25, 3rd: +10
   * Total = BasePoints + OrderBonus
   *
   * Bounds: [100, 550]
   */
  public static calculateGuesserScore(
    timeRemaining: number,
    totalDrawTime: number,
    guessOrder: number
  ): GuesserScoreResult {
    const validTotalTime = Math.max(1, totalDrawTime);
    const clampedTimeRemaining = Math.max(0, Math.min(validTotalTime, timeRemaining));
    const timeRatio = clampedTimeRemaining / validTotalTime;

    const basePoints = Math.round(100 + 400 * timeRatio);

    let orderBonus = 0;
    if (guessOrder === 1) {
      orderBonus = 50;
    } else if (guessOrder === 2) {
      orderBonus = 25;
    } else if (guessOrder === 3) {
      orderBonus = 10;
    }

    const totalPoints = basePoints + orderBonus;

    return {
      basePoints,
      orderBonus,
      totalPoints,
      timeRemainingRatio: parseFloat(timeRatio.toFixed(3)),
    };
  }

  /**
   * Calculates points awarded to the drawer based on the fraction of guessers who solved the drawing.
   *
   * Formula:
   * If solvers == 0: 0 points
   * If solvers > 0: round(500 * (solvers / totalGuessers))
   *
   * Bounds: [0, 500]
   */
  public static calculateDrawerScore(solversCount: number, totalGuessers: number): number {
    if (totalGuessers <= 0 || solversCount <= 0) {
      return 0;
    }

    const fraction = Math.min(1, solversCount / totalGuessers);
    return Math.round(500 * fraction);
  }
}
