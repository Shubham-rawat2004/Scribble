import { Room } from './Room.js';
import { WordManager, WordOption } from './WordManager.js';
import { HintManager } from './HintManager.js';
import { pool } from '../db/connection.js';
import crypto from 'crypto';

export type TurnPhase = 'WORD_SELECTION' | 'DRAWING' | 'TURN_END' | 'MATCH_END';

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

  private selectionTimeout: NodeJS.Timeout | null = null;
  private turnInterval: NodeJS.Timeout | null = null;
  private hintTimeouts: NodeJS.Timeout[] = [];
  public timeRemaining: number = 0;

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

    this.resetDrawerQueue();
  }

  /**
   * Initializes or resets the queue of players who must draw in the current round.
   */
  public resetDrawerQueue(): void {
    this.drawerQueue = this.room.getPlayerList().map((p) => p.id);
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
    this.currentDrawerId = this.drawerQueue.shift() || this.room.hostPlayerId;
    this.room.setCurrentDrawer(this.currentDrawerId);
    this.turnPhase = 'WORD_SELECTION';
    this.secretWord = null;
    this.currentMask = [];
    this.revealedIndices = [];

    // Fetch randomized word options
    const optionsCount = this.room.settings.wordOptionsCount || 3;
    this.wordOptions = await WordManager.getRandomWords(optionsCount);

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
    this.currentMask = HintManager.createInitialMask(this.secretWord);
    this.revealedIndices = [];
    this.turnPhase = 'DRAWING';

    const drawTime = this.room.settings.drawTimeSeconds || 80;
    this.timeRemaining = drawTime;

    // Persist round record in MySQL `game_rounds`
    try {
      const roundId = crypto.randomUUID();
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

    // Schedule progressive hints based on room settings (hintsAllowed)
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
