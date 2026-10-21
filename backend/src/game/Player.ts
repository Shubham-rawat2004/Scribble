import { PlayerDTO } from '../types/room.js';

/**
 * OOP Domain Model representing an active participant in a room.
 */
export class Player {
  public readonly id: string;
  public socketId: string;
  public name: string;
  public avatarId: string;
  public isHost: boolean;
  public score: number;
  public isConnected: boolean;
  public isSpectator: boolean;

  constructor(
    id: string,
    socketId: string,
    name: string,
    avatarId: string = 'avatar_1',
    isHost: boolean = false,
    initialScore: number = 0,
    isSpectator: boolean = false
  ) {
    this.id = id;
    this.socketId = socketId;
    this.name = name;
    this.avatarId = avatarId;
    this.isHost = isHost;
    this.score = initialScore;
    this.isConnected = true;
    this.isSpectator = isSpectator;
  }

  public addScore(points: number): void {
    if (points > 0) {
      this.score += points;
    }
  }

  public resetScore(): void {
    this.score = 0;
  }

  public updateSocketId(newSocketId: string): void {
    this.socketId = newSocketId;
    this.isConnected = true;
  }

  public setConnectionStatus(connected: boolean): void {
    this.isConnected = connected;
  }

  public toDTO(): PlayerDTO {
    return {
      id: this.id,
      name: this.name,
      avatarId: this.avatarId,
      isHost: this.isHost,
      score: this.score,
      isConnected: this.isConnected,
      isSpectator: this.isSpectator,
    };
  }
}
