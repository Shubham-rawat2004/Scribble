import { RoomSettings, RoomStatus, RoomDTO, DrawStrokeDTO, DrawPoint } from '../types/room.js';
import { Player } from './Player.js';

/**
 * OOP Domain Model representing an isolated game room.
 * Manages player rosters, room settings, host privileges, lifecycle state,
 * active drawer turns, and vector stroke history.
 */
export class Room {
  public readonly id: string;
  public name: string;
  public hostName: string;
  public hostPlayerId: string;
  public settings: RoomSettings;
  public status: RoomStatus;
  public readonly createdAt: Date;
  public players: Map<string, Player>;

  // Real-Time Drawing Turn & Vector History
  public currentDrawerId: string | null = null;
  public strokeHistory: DrawStrokeDTO[] = [];
  public lastTurnStrokes: DrawStrokeDTO[] = [];
  public lastTurnSecretWord: string = '';
  public lastTurnDrawerName: string = '';
  public chatHistory: { id: string; senderId: string; senderName: string; text: string; type: string; timestamp: number }[] = [];
  public votekickMap: Map<string, Set<string>> = new Map();

  constructor(
    id: string,
    hostPlayer: Player,
    settings: RoomSettings,
    name: string = 'Skribbl Room'
  ) {
    this.id = id;
    this.name = name;
    this.hostName = hostPlayer.name;
    this.hostPlayerId = hostPlayer.id;
    this.settings = settings;
    this.status = 'LOBBY';
    this.createdAt = new Date();
    this.players = new Map<string, Player>();
    this.strokeHistory = [];

    // Register initial host
    this.addPlayer(hostPlayer);
  }

  public addPlayer(player: Player): boolean {
    if (this.isFull()) {
      return false;
    }
    this.players.set(player.id, player);
    return true;
  }

  public removePlayer(playerId: string): { removed: boolean; newHost?: Player } {
    const wasHost = this.hostPlayerId === playerId;
    const removed = this.players.delete(playerId);
    this.clearVotekick(playerId);

    let newHost: Player | undefined;
    if (removed && wasHost && this.players.size > 0) {
      // Migrate host to the next oldest connected player in the room
      const remainingPlayers = this.getPlayerList();
      newHost = remainingPlayers[0];
      newHost.isHost = true;
      this.hostPlayerId = newHost.id;
      this.hostName = newHost.name;
      console.log(`[Room ${this.id}] Host migrated to ${newHost.name} (${newHost.id})`);
    }

    return { removed, newHost };
  }

  public voteKick(voterId: string, targetId: string): { votes: number; threshold: number; passed: boolean } {
    if (!this.hasPlayer(voterId) || !this.hasPlayer(targetId) || voterId === targetId) {
      return { votes: 0, threshold: 0, passed: false };
    }

    if (!this.votekickMap.has(targetId)) {
      this.votekickMap.set(targetId, new Set());
    }

    const voters = this.votekickMap.get(targetId)!;
    voters.add(voterId);

    const totalConnected = this.getPlayerList().filter((p) => p.isConnected).length;
    const threshold = Math.max(1, Math.ceil(totalConnected * 0.5));
    const votes = voters.size;
    const passed = votes >= threshold;

    if (passed) {
      this.votekickMap.delete(targetId);
    }

    return { votes, threshold, passed };
  }

  public clearVotekick(playerId: string): void {
    this.votekickMap.delete(playerId);
    for (const voters of this.votekickMap.values()) {
      voters.delete(playerId);
    }
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  public getPlayerBySocket(socketId: string): Player | undefined {
    for (const player of this.players.values()) {
      if (player.socketId === socketId) {
        return player;
      }
    }
    return undefined;
  }

  public getPlayerList(): Player[] {
    return Array.from(this.players.values());
  }

  public hasPlayerName(name: string): boolean {
    const normalized = name.trim().toLowerCase();
    for (const player of this.players.values()) {
      if (player.name.trim().toLowerCase() === normalized) {
        return true;
      }
    }
    return false;
  }

  public isFull(): boolean {
    return this.players.size >= this.settings.maxPlayers;
  }

  public hasPlayer(playerId: string): boolean {
    return this.players.has(playerId);
  }

  public canStartGame(): { canStart: boolean; reason?: string } {
    if (this.status !== 'LOBBY') {
      return { canStart: false, reason: 'Game is already in progress or completed.' };
    }
    const activePlayers = this.getPlayerList().filter((p) => !p.isSpectator && p.isConnected);
    if (activePlayers.length < 2) {
      return { canStart: false, reason: 'At least 2 active players (non-spectators) are required to start the game.' };
    }
    return { canStart: true };
  }

  public setStatus(newStatus: RoomStatus): void {
    this.status = newStatus;
  }

  // --- Real-Time Drawing Turn & Buffer Operations ---
  public setCurrentDrawer(playerId: string | null): void {
    if (this.strokeHistory.length > 0) {
      this.lastTurnStrokes = [...this.strokeHistory];
    }
    this.currentDrawerId = playerId;
    this.strokeHistory = [];
  }

  public setLastTurnInfo(word: string, drawerName: string, strokes: DrawStrokeDTO[]): void {
    this.lastTurnSecretWord = word;
    this.lastTurnDrawerName = drawerName;
    this.lastTurnStrokes = [...strokes];
  }

  public getLastTurnInfo(): { secretWord: string; drawerName: string; strokes: DrawStrokeDTO[] } {
    return {
      secretWord: this.lastTurnSecretWord,
      drawerName: this.lastTurnDrawerName,
      strokes: [...this.lastTurnStrokes],
    };
  }

  public isDrawer(socketId: string): boolean {
    if (!this.currentDrawerId) return false;
    const player = this.getPlayerBySocket(socketId);
    return Boolean(player && player.id === this.currentDrawerId);
  }

  public addStroke(stroke: DrawStrokeDTO): void {
    this.strokeHistory.push(stroke);
  }

  public appendPoints(strokeId: string, points: DrawPoint[]): void {
    const stroke = this.strokeHistory.find((s) => s.id === strokeId);
    if (stroke) {
      stroke.points.push(...points);
    }
  }

  public undoStroke(): DrawStrokeDTO | undefined {
    return this.strokeHistory.pop();
  }

  public getStrokeHistory(): DrawStrokeDTO[] {
    return [...this.strokeHistory];
  }

  public addChatMessage(msg: { id: string; senderId: string; senderName: string; text: string; type: string; timestamp: number }): void {
    this.chatHistory.push(msg);
    if (this.chatHistory.length > 50) {
      this.chatHistory.shift();
    }
  }

  public getChatHistory(): { id: string; senderId: string; senderName: string; text: string; type: string; timestamp: number }[] {
    return [...this.chatHistory];
  }

  public clearCanvas(): void {
    this.strokeHistory = [];
  }

  public toDTO(): RoomDTO {
    return {
      id: this.id,
      name: this.name,
      hostName: this.hostName,
      hostPlayerId: this.hostPlayerId,
      settings: { ...this.settings },
      status: this.status,
      players: this.getPlayerList().map((p) => p.toDTO()),
      currentDrawerId: this.currentDrawerId,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
