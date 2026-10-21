import { Room } from './Room.js';
import { WordManager, WordOption } from './WordManager.js';
import { HintManager } from './HintManager.js';
import { ScoringEngine } from './ScoringEngine.js';
import { pool } from '../db/connection.js';
import crypto from 'crypto';

export type TurnPhase = 'WORD_SELECTION' | 'DRAWING' | 'TURN_END' | 'MATCH_END';

export interface RoundScoreSummaryItem {
  playerId: string;
  playerName: string;
  avatarId: string;
  role: 'DRAWER' | 'GUESSER';
  pointsEarned: number;
  totalScore: number;
  guessedCorrectly: boolean;
}

export interface TurnStateDTO {
  currentRound: number;
  totalRounds: number;
  currentTurn: number;
  totalTurnsInRound: number;
  drawerId: string;
  drawerName: string;
  turnPhase: TurnPhase;
  wordMask?: string;
  wordLength?: number;
  timeRemainingSeconds?: number;
  secretWordForDrawer?: string;
}

export class TurnManager {
  public readonly room: Room;
  public sessionId: string;
  public currentRound: number;
  public currentTurn: number;
  public turnPhase: TurnPhase;
  public drawerQueue: string[];
  public currentDrawerId: string | null;

  public wordOptions: WordOption[];
  public secretWord: string | null;
  public currentMask: string[];
  public revealedIndices: number[];
  public guessedPlayerIds: Set<string>;
  public currentRoundId: string | null;
  public turnScores: Map<string, number>;

  private selectionTimeout: NodeJS.Timeout | null = null;
  private turnInterval: NodeJS.Timeout | null = null;
  private hintTimeouts: NodeJS.Timeout[] = [];
  public timeRemaining: number = 0;
  private onTurnEndCallback: (() => void) | null = null;

  constructor(room: Room, sessionId: string) {
    this.room = room;
    this.sessionId = sessionId;
    this.currentRound = 1;
    this.currentTurn = 0;
    this.turnPhase = 'WORD_SELECTION';
    this.drawerQueue = [];
    this.currentDrawerId = null;
    this.wordOptions = [];
    this.secretWord = null;
    this.currentMask = [];
    this.revealedIndices = [];
    this.guessedPlayerIds = new Set();
    this.currentRoundId = null;
    this.turnScores = new Map();

    this.resetDrawerQueue();
  }

  /**
   * Initializes or resets the queue of players who must draw in the current round.
   */
  public resetDrawerQueue(): void {
    this.drawerQueue = this.room
      .getPlayerList()
      .filter((p) => !p.isSpectator && p.isConnected)
      .map((p) => p.id);
  }

  /**
   * Appends a late-joining player to the current round's drawer queue so they also draw.
   */
  public addPlayerToTurn(playerId: string): void {
    const player = this.room.getPlayer(playerId);
    if (player && player.isSpectator) return;
    if (!this.drawerQueue.includes(playerId) && this.currentDrawerId !== playerId) {
      this.drawerQueue.push(playerId);
      console.log(`[TurnManager] Added late-joining player ${playerId} to drawerQueue for room ${this.room.id}. (Queue: ${this.drawerQueue.length})`);
    }
  }

  /**
   * Advances the match to the next turn or round.
   */
  public async prepareNextTurn(): Promise<{
    hasMoreTurns: boolean;
    isMatchFinished: boolean;
    drawerId: string | null;
    wordOptions: WordOption[];
  }> {
    this.clearAllTimers();

    // If queue is empty, check if we advance round or finish match
    if (this.drawerQueue.length === 0) {
      if (this.currentRound >= this.room.settings.totalRounds) {
        this.turnPhase = 'MATCH_END';
        this.room.setStatus('FINISHED');
        return { hasMoreTurns: false, isMatchFinished: true, drawerId: null, wordOptions: [] };
      }
      this.currentRound += 1;
      this.currentTurn = 0;
      this.resetDrawerQueue();
    }

    this.currentTurn += 1;
    let nextDrawerId = this.drawerQueue.shift();
    while (nextDrawerId && !this.room.getPlayer(nextDrawerId) && this.drawerQueue.length > 0) {
      nextDrawerId = this.drawerQueue.shift();
    }
    this.currentDrawerId = nextDrawerId || this.room.hostPlayerId;
    this.room.setCurrentDrawer(this.currentDrawerId);
    this.turnPhase = 'WORD_SELECTION';
    this.secretWord = null;
    this.currentMask = [];
    this.revealedIndices = [];
    this.guessedPlayerIds.clear();

    // Fetch randomized word options (honoring custom word list if provided)
    const optionsCount = this.room.settings.wordOptionsCount || 3;
    this.wordOptions = await WordManager.getRandomWords(
      optionsCount,
      this.room.settings.customWords,
      this.room.settings.customWordsOnly,
      this.room.settings.gameMode,
      this.room.settings.language
    );

    return {
      hasMoreTurns: true,
      isMatchFinished: false,
      drawerId: this.currentDrawerId,
      wordOptions: this.wordOptions,
    };
  }

  /**
   * Called when the drawer selects a word from the options.
   * Starts the drawing phase and schedules progressive hints.
   */
  public async startDrawingTurn(
    chosenWord: string,
    onHintReveal: (newMask: string) => void,
    onTimeTick: (secondsLeft: number) => void,
    onTurnEnd: () => void
  ): Promise<{ secretWord: string; initialMask: string }> {
    this.clearAllTimers();

    this.secretWord = chosenWord.trim().toUpperCase();
    this.currentMask = HintManager.createInitialMask(this.secretWord, this.room.settings.gameMode);
    this.revealedIndices = [];
    this.guessedPlayerIds.clear();
    this.turnScores.clear();
    this.turnPhase = 'DRAWING';
    this.onTurnEndCallback = onTurnEnd;

    const drawTime = this.room.settings.drawTimeSeconds || 80;
    this.timeRemaining = drawTime;

    // Persist round record in MySQL `game_rounds`
    try {
      const roundId = crypto.randomUUID();
      this.currentRoundId = roundId;
      await pool.execute(
        `INSERT INTO game_rounds (
          round_id, session_id, round_number, turn_number,
          drawer_player_id, secret_word, time_allocated, started_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          roundId,
          this.sessionId,
          this.currentRound,
          this.currentTurn,
          this.currentDrawerId,
          this.secretWord,
          drawTime,
        ]
      );
      console.log(`[TurnManager] Persisted round ${this.currentRound} turn ${this.currentTurn} to MySQL.`);
    } catch (dbErr) {
      console.error('[TurnManager] Failed to persist game_rounds to MySQL:', (dbErr as Error).message);
    }

    // Schedule progressive hints based on room settings (hintsAllowed) - DISABLED in 'Hidden' mode
    if (this.room.settings.gameMode !== 'Hidden') {
      const maxHints = HintManager.getMaxHintsAllowed(this.secretWord, this.room.settings.hintsAllowed);

      if (maxHints >= 1) {
        // Hint 1 at 50% time remaining (e.g. after drawTime * 0.5 seconds)
        const hint1DelayMs = Math.floor(drawTime * 0.5 * 1000);
        const t1 = setTimeout(() => {
          if (this.turnPhase === 'DRAWING' && this.secretWord) {
            const res = HintManager.revealNextHint(this.secretWord, this.currentMask, this.revealedIndices);
            this.currentMask = res.updatedMask;
            onHintReveal(HintManager.formatMaskString(this.currentMask));
          }
        }, hint1DelayMs);
        this.hintTimeouts.push(t1);
      }

      if (maxHints >= 2) {
        // Hint 2 at 25% time remaining (e.g. after drawTime * 0.75 seconds)
        const hint2DelayMs = Math.floor(drawTime * 0.75 * 1000);
        const t2 = setTimeout(() => {
          if (this.turnPhase === 'DRAWING' && this.secretWord) {
            const res = HintManager.revealNextHint(this.secretWord, this.currentMask, this.revealedIndices);
            this.currentMask = res.updatedMask;
            onHintReveal(HintManager.formatMaskString(this.currentMask));
          }
        }, hint2DelayMs);
        this.hintTimeouts.push(t2);
      }
    }

    // Countdown Timer interval
    this.turnInterval = setInterval(() => {
      this.timeRemaining -= 1;
      onTimeTick(this.timeRemaining);

      if (this.timeRemaining <= 0) {
        this.clearAllTimers();
        this.turnPhase = 'TURN_END';
        onTurnEnd();
      }
    }, 1000);

    return {
      secretWord: this.secretWord,
      initialMask: HintManager.formatMaskString(this.currentMask),
    };
  }

  public markPlayerGuessed(playerId: string): { isAllGuessed: boolean; guessOrder: number } {
    this.guessedPlayerIds.add(playerId);
    const guessOrder = this.guessedPlayerIds.size;

    // Total eligible guessers are all currently connected non-spectator players except the active drawer
    const eligibleGuessers = this.room
      .getPlayerList()
      .filter((p) => p.id !== this.currentDrawerId && p.isConnected && !p.isSpectator);

    const isAllGuessed = eligibleGuessers.length > 0 && eligibleGuessers.every((p) => this.guessedPlayerIds.has(p.id));

    return { isAllGuessed, guessOrder };
  }

  public hasPlayerGuessed(playerId: string): boolean {
    return this.guessedPlayerIds.has(playerId);
  }

  /**
   * Awards points to a guesser and records it in this turn's score map.
   */
  public awardGuesserPoints(playerId: string, points: number): number {
    const player = this.room.getPlayer(playerId);
    if (!player || player.isSpectator) return 0;
    player.addScore(points);
    this.turnScores.set(playerId, points);
    return player.score;
  }

  /**
   * Awards points to the drawer based on the proportion of guessers who solved the drawing.
   */
  public calculateAndAwardDrawerPoints(): { drawerId: string; points: number; totalScore: number } | null {
    if (!this.currentDrawerId) return null;
    const drawer = this.room.getPlayer(this.currentDrawerId);
    if (!drawer) return null;

    const eligibleGuessers = this.room
      .getPlayerList()
      .filter((p) => p.id !== this.currentDrawerId && p.isConnected);
    const totalGuessers = Math.max(1, eligibleGuessers.length);
    const solversCount = this.guessedPlayerIds.size;
    const drawerPoints = ScoringEngine.calculateDrawerScore(solversCount, totalGuessers);

    drawer.addScore(drawerPoints);
    this.turnScores.set(drawer.id, drawerPoints);

    return {
      drawerId: drawer.id,
      points: drawerPoints,
      totalScore: drawer.score,
    };
  }

  /**
   * Generates a complete turn score summary for all players.
   */
  public getRoundScoreSummary(): RoundScoreSummaryItem[] {
    const summary: RoundScoreSummaryItem[] = [];

    for (const player of this.room.getPlayerList()) {
      if (player.isSpectator) continue;
      const isDrawer = player.id === this.currentDrawerId;
      const pointsEarned = this.turnScores.get(player.id) || 0;
      const guessedCorrectly = this.guessedPlayerIds.has(player.id);

      summary.push({
        playerId: player.id,
        playerName: player.name,
        avatarId: player.avatarId,
        role: isDrawer ? 'DRAWER' : 'GUESSER',
        pointsEarned,
        totalScore: player.score,
        guessedCorrectly,
      });
    }

    // Sort summary: highest points earned first
    summary.sort((a, b) => b.pointsEarned - a.pointsEarned || b.totalScore - a.totalScore);
    return summary;
  }

  /**
   * Persists round outcome and cumulative player scores to MySQL database.
   */
  public async persistScoresToDatabase(): Promise<void> {
    try {
      if (this.currentRoundId) {
        await pool.execute(
          'UPDATE game_rounds SET ended_at = NOW() WHERE round_id = ?',
          [this.currentRoundId]
        );
      }

      for (const player of this.room.getPlayerList()) {
        await pool.execute(
          'UPDATE players SET total_score = ? WHERE player_id = ?',
          [player.score, player.id]
        );

        if (this.currentRoundId) {
          const isDrawer = player.id === this.currentDrawerId;
          const guessedCorrectly = this.guessedPlayerIds.has(player.id);
          const scoreAwarded = this.turnScores.get(player.id) || 0;
          const scoreId = crypto.randomUUID();

          await pool.execute(
            `INSERT INTO player_round_scores (
              score_id, round_id, player_id, guessed_correctly, score_awarded, is_drawer
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [scoreId, this.currentRoundId, player.id, guessedCorrectly, scoreAwarded, isDrawer]
          );
        }
      }
      console.log(`[TurnManager] Successfully persisted round scores to MySQL for room ${this.room.id}.`);
    } catch (err) {
      console.error('[TurnManager] Failed to persist scores to MySQL:', (err as Error).message);
    }
  }

  public endTurnEarly(reason: string = 'ALL_GUESSED'): void {
    if (this.turnPhase !== 'DRAWING') return;
    this.clearAllTimers();
    this.turnPhase = 'TURN_END';
    if (this.onTurnEndCallback) {
      this.onTurnEndCallback();
    }
  }

  public clearAllTimers(): void {
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
      this.selectionTimeout = null;
    }
    if (this.turnInterval) {
      clearInterval(this.turnInterval);
      this.turnInterval = null;
    }
    for (const t of this.hintTimeouts) {
      clearTimeout(t);
    }
    this.hintTimeouts = [];
  }

  public getTurnStateDTO(): TurnStateDTO {
    const drawerPlayer = this.room.getPlayer(this.currentDrawerId || '') || this.room.getPlayerList()[0];
    return {
      currentRound: this.currentRound,
      totalRounds: this.room.settings.totalRounds,
      currentTurn: this.currentTurn,
      totalTurnsInRound: this.room.players.size,
      drawerId: this.currentDrawerId || '',
      drawerName: drawerPlayer?.name || 'Drawer',
      turnPhase: this.turnPhase,
      wordMask: HintManager.formatMaskString(this.currentMask),
      wordLength: this.secretWord?.length || 0,
      timeRemainingSeconds: this.timeRemaining,
      secretWordForDrawer: this.secretWord || undefined,
    };
  }
}
