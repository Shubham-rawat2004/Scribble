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
   * BasePoints = round(50 + 350 * TimeRatio)
   * OrderBonus: 1st: +50, 2nd: +25, 3rd: +10, 4th+: 0
   * Total = min(500, BasePoints + OrderBonus)
   *
   * Bounds: [50, 500]
   */
  public static calculateGuesserScore(
    timeRemaining: number,
    totalDrawTime: number,
    guessOrder: number
  ): GuesserScoreResult {
    const validTotalTime = Math.max(1, totalDrawTime);
    const clampedTimeRemaining = Math.max(0, Math.min(validTotalTime, timeRemaining));
    const timeRatio = clampedTimeRemaining / validTotalTime;

    const basePoints = Math.round(50 + 350 * timeRatio);

    let orderBonus = 0;
    if (guessOrder === 1) {
      orderBonus = 50;
    } else if (guessOrder === 2) {
      orderBonus = 25;
    } else if (guessOrder === 3) {
      orderBonus = 10;
    }

    const totalPoints = Math.min(500, basePoints + orderBonus);

    return {
      basePoints,
      orderBonus,
      totalPoints,
      timeRemainingRatio: parseFloat(timeRatio.toFixed(3)),
    };
  }

  /**
   * Calculates points awarded to the drawer based on how quickly and how many
   * players guessed their drawing (speed-weighted solver ratio).
   *
   * Formula:
   * AverageSolverPoints = sum(solverBasePoints) / solversCount
   * SolverRatio = min(1, solversCount / totalEligibleGuessers)
   * DrawerPoints = round(AverageSolverPoints * SolverRatio)
   *
   * Bounds: [0, 400]
   */
  public static calculateDrawerScore(
    solverBasePoints: number[] | number,
    totalEligibleGuessers?: number
  ): number {
    // Overload support if passed as (solversCount: number, totalGuessers: number)
    if (typeof solverBasePoints === 'number') {
      const solversCount = solverBasePoints;
      const totalGuessers = totalEligibleGuessers || 1;
      if (totalGuessers <= 0 || solversCount <= 0) return 0;
      const fraction = Math.min(1, solversCount / totalGuessers);
      return Math.round(400 * fraction);
    }

    const totalGuessers = Math.max(1, totalEligibleGuessers || 1);
    if (!solverBasePoints || solverBasePoints.length === 0) {
      return 0;
    }

    const sum = solverBasePoints.reduce((acc, pts) => acc + pts, 0);
    const averageSolverPoints = sum / solverBasePoints.length;
    const solverRatio = Math.min(1, solverBasePoints.length / totalGuessers);

    return Math.round(averageSolverPoints * solverRatio);
  }
}
