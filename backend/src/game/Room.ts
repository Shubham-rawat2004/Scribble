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
    if (this.players.size < 2) {
      return { canStart: false, reason: 'At least 2 players are required to start the game.' };
    }
    return { canStart: true };
  }

  public setStatus(newStatus: RoomStatus): void {
    this.status = newStatus;
  }

  // --- Real-Time Drawing Turn & Buffer Operations ---
  public setCurrentDrawer(playerId: string | null): void {
    this.currentDrawerId = playerId;
    this.strokeHistory = [];
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
