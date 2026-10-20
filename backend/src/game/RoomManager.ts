import crypto from 'crypto';
import { RoomSettings, RoomDTO, PlayerDTO, GameSessionDTO } from '../types/room.js';
import { Room } from './Room.js';
import { Player } from './Player.js';
import { TurnManager } from './TurnManager.js';
import { generateRoomCode } from '../utils/codeGenerator.js';
import { pool } from '../db/connection.js';

/**
 * Singleton Service managing all active in-memory rooms and coordinating with MySQL.
 * Equivalent to a Spring Boot @Service bean managing active match state.
 */
export class RoomManager {
  private static instance: RoomManager;
  private rooms: Map<string, Room> = new Map();
  private socketToPlayerMap: Map<string, { roomId: string; playerId: string }> = new Map();
  private turnManagers: Map<string, TurnManager> = new Map();

  private constructor() {}

  public static getInstance(): RoomManager {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  /**
   * Creates a new game room, registers the host, and persists metadata to MySQL.
   */
  public async createRoom(
    hostName: string,
    avatarId: string = 'avatar_1',
    settings: RoomSettings,
    socketId: string
  ): Promise<{ room: Room; host: Player }> {
    let roomId = generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = generateRoomCode();
    }

    const hostPlayerId = crypto.randomUUID();
    const hostPlayer = new Player(hostPlayerId, socketId, hostName, avatarId, true, 0);
    const room = new Room(roomId, hostPlayer, settings, `${hostName}'s Room`);

    try {
      const insertRoomSql = `
        INSERT INTO rooms (
          room_id, room_name, host_name, max_players, total_rounds,
          draw_time_seconds, word_options_count, hints_allowed, is_private, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'LOBBY')
      `;
      await pool.execute(insertRoomSql, [
        roomId,
        room.name,
        hostName,
        settings.maxPlayers,
        settings.totalRounds,
        settings.drawTimeSeconds,
        settings.wordOptionsCount,
        settings.hintsAllowed,
        settings.isPrivate ? 1 : 0,
      ]);

      const insertPlayerSql = `
        INSERT INTO players (
          player_id, room_id, player_name, avatar_id, is_host, total_score, is_connected
        ) VALUES (?, ?, ?, ?, ?, 0, 1)
      `;
      await pool.execute(insertPlayerSql, [
        hostPlayerId,
        roomId,
        hostName,
        avatarId,
        1, // is_host = true
      ]);

      console.log(`[RoomManager] Persisted room ${roomId} and host ${hostName} to MySQL.`);
    } catch (dbError) {
      console.error('[RoomManager] Failed to persist room to MySQL:', (dbError as Error).message);
    }

    this.rooms.set(roomId, room);
    this.socketToPlayerMap.set(socketId, { roomId, playerId: hostPlayerId });

    console.log(`[RoomManager] In-memory room created: ${roomId} by ${hostName} (Socket: ${socketId})`);
    return { room, host: hostPlayer };
  }

  /**
   * Allows a player to join an existing room.
   */
  public async joinRoom(
    roomIdInput: string,
    playerName: string,
    avatarId: string = 'avatar_1',
    socketId: string
  ): Promise<{ room: Room; player: Player }> {
    const roomId = roomIdInput.trim().toUpperCase();
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new Error(`Room "${roomId}" not found.`);
    }

    if (room.status !== 'LOBBY') {
      throw new Error(`Room "${roomId}" is already in an active game or has ended.`);
    }

    if (room.isFull()) {
      throw new Error(`Room "${roomId}" has reached maximum capacity (${room.settings.maxPlayers} players).`);
    }

    if (room.hasPlayerName(playerName)) {
      throw new Error(`The nickname "${playerName}" is already taken in this room.`);
    }

    const playerId = crypto.randomUUID();
    const player = new Player(playerId, socketId, playerName, avatarId, false, 0);

    room.addPlayer(player);
    this.socketToPlayerMap.set(socketId, { roomId, playerId });

    // Persist player to MySQL
    try {
      const insertPlayerSql = `
        INSERT INTO players (
          player_id, room_id, player_name, avatar_id, is_host, total_score, is_connected
        ) VALUES (?, ?, ?, ?, ?, 0, 1)
      `;
      await pool.execute(insertPlayerSql, [
        playerId,
        roomId,
        playerName,
        avatarId,
        0, // is_host = false
      ]);
      console.log(`[RoomManager] Persisted player ${playerName} (${playerId}) in room ${roomId} to MySQL.`);
    } catch (dbError) {
      console.error('[RoomManager] Failed to persist player to MySQL:', (dbError as Error).message);
    }

    console.log(`[RoomManager] Player "${playerName}" joined room ${roomId} (Total: ${room.players.size})`);
    return { room, player };
  }

  /**
   * Transitions room from LOBBY to PLAYING and records session in MySQL.
   */
  public async startGame(roomId: string, socketId: string): Promise<{ room: Room; session: GameSessionDTO }> {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) {
      throw new Error('Room not found.');
    }

    // Verify caller is the host
    const caller = room.getPlayerBySocket(socketId);
    if (!caller || caller.id !== room.hostPlayerId) {
      throw new Error('Only the room host can start the game.');
    }

    const check = room.canStartGame();
    if (!check.canStart) {
      throw new Error(check.reason || 'Cannot start game.');
    }

    const sessionId = crypto.randomUUID();
    room.setStatus('PLAYING');

    // Designate initial drawer (host player starts as active drawer)
    const initialDrawerId = room.hostPlayerId;
    room.setCurrentDrawer(initialDrawerId);

    // Initialize TurnManager for this room
    const turnManager = new TurnManager(room, sessionId);
    this.turnManagers.set(room.id, turnManager);

    // Persist status change and game session in MySQL
    try {
      await pool.execute(`UPDATE rooms SET status = 'PLAYING' WHERE room_id = ?`, [room.id]);
      await pool.execute(
        `INSERT INTO game_sessions (session_id, room_id, status, started_at) VALUES (?, ?, 'IN_PROGRESS', NOW())`,
        [sessionId, room.id]
      );
      console.log(`[RoomManager] Game session ${sessionId} started for room ${room.id} in MySQL (Drawer: ${initialDrawerId}).`);
    } catch (dbError) {
      console.error('[RoomManager] Failed to persist game session in MySQL:', (dbError as Error).message);
    }

    const session: GameSessionDTO = {
      sessionId,
      roomId: room.id,
      status: 'IN_PROGRESS',
      currentDrawerId: initialDrawerId,
      startedAt: new Date().toISOString(),
    };

    return { room, session };
  }

  /**
   * Handles player disconnection, roster cleanup, and host migration.
   */
  public async handleDisconnect(socketId: string): Promise<{
    room?: Room;
    player?: Player;
    wasRemoved: boolean;
    newHost?: Player;
  }> {
    const mapping = this.socketToPlayerMap.get(socketId);
    if (!mapping) {
      return { wasRemoved: false };
    }

    this.socketToPlayerMap.delete(socketId);
    const room = this.rooms.get(mapping.roomId);
    if (!room) {
      return { wasRemoved: false };
    }

    const player = room.getPlayer(mapping.playerId);
    if (!player) {
      return { room, wasRemoved: false };
    }

    player.setConnectionStatus(false);

    // If still in lobby, remove player from the roster
    if (room.status === 'LOBBY') {
      const { removed, newHost } = room.removePlayer(player.id);
      console.log(`[RoomManager] Removed player ${player.name} from lobby ${room.id}.`);

      // Update player connection status in MySQL
      try {
        await pool.execute(`UPDATE players SET is_connected = 0 WHERE player_id = ?`, [player.id]);
      } catch (err) {
        console.error('[RoomManager] Failed to update player disconnect in MySQL:', err);
      }

      // If room is empty, delete it
      if (room.players.size === 0) {
        this.rooms.delete(room.id);
        console.log(`[RoomManager] Room ${room.id} is empty. Deleted from memory.`);
        try {
          await pool.execute(`UPDATE rooms SET status = 'ABANDONED' WHERE room_id = ?`, [room.id]);
        } catch (err) {
          console.error('[RoomManager] Failed to mark room abandoned in MySQL:', err);
        }
      }

      return { room, player, wasRemoved: removed, newHost };
    }

    return { room, player, wasRemoved: false };
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId.toUpperCase());
  }

  public getPlayerBySocket(socketId: string): { room: Room; player: Player } | undefined {
    const mapping = this.socketToPlayerMap.get(socketId);
    if (!mapping) return undefined;

    const room = this.rooms.get(mapping.roomId);
    if (!room) return undefined;

    const player = room.getPlayer(mapping.playerId);
    if (!player) return undefined;

    return { room, player };
  }

  public getTurnManager(roomId: string): TurnManager | undefined {
    return this.turnManagers.get(roomId.toUpperCase());
  }

  public getActiveRoomCount(): number {
    return this.rooms.size;
  }
}
