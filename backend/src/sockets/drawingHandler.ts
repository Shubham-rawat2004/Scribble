import { Server, Socket } from 'socket.io';
import { RoomManager } from '../game/RoomManager.js';
import {
  DrawStartPayload,
  DrawMovePayload,
  DrawEndPayload,
  DrawUndoPayload,
  CanvasClearPayload,
} from '../types/room.js';

/**
 * Registers real-time WebSocket drawing event listeners.
 * Enforces strict Server Authority: only the active designated drawer
 * is authorized to emit stroke and clear events.
 */
export function registerDrawingHandlers(io: Server, socket: Socket) {
  const roomManager = RoomManager.getInstance();
  /**
   * Event: draw_start
   * Initiates a new vector stroke on the canvas.
   */
  socket.on('draw_start', (payload: DrawStartPayload, callback?: (res: { success: boolean; error?: string }) => void) => {
    try {
      const { roomId, stroke } = payload;
      const room = roomManager.getRoom(roomId);

      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found.' });
        return;
      }

      // Security check: only the active drawer can draw
      if (!room.isDrawer(socket.id)) {
        console.warn(`[Security] Unauthorized draw_start rejected from socket ${socket.id} in room ${roomId}`);
        if (callback) callback({ success: false, error: 'Unauthorized: You are not the active drawer.' });
        return;
      }

      // Append stroke to in-memory room buffer
      room.addStroke(stroke);

      // Broadcast to all other players in the room (guessers)
      socket.to(room.id).emit('draw_start', payload);

      if (callback) callback({ success: true });
    } catch (err) {
      console.error('[Socket.IO] Error in draw_start:', (err as Error).message);
    }
  });

  /**
   * Event: draw_move
   * Streams ongoing normalized stroke points to other players.
   */
  socket.on('draw_move', (payload: DrawMovePayload) => {
    try {
      const { roomId, strokeId, points } = payload;
      const room = roomManager.getRoom(roomId);

      if (!room || !room.isDrawer(socket.id)) {
        return; // Reject silently to avoid network flooding on fast mouse moves
      }

      // Append coordinates to server vector buffer
      room.appendPoints(strokeId, points);

      // Stream to other players in room
      socket.to(room.id).emit('draw_move', payload);
    } catch (err) {
      console.error('[Socket.IO] Error in draw_move:', (err as Error).message);
    }
  });

  /**
   * Event: draw_end
   * Marks conclusion of active stroke.
   */
  socket.on('draw_end', (payload: DrawEndPayload) => {
    try {
      const { roomId } = payload;
      const room = roomManager.getRoom(roomId);

      if (!room || !room.isDrawer(socket.id)) {
        return;
      }

      socket.to(room.id).emit('draw_end', payload);
    } catch (err) {
      console.error('[Socket.IO] Error in draw_end:', (err as Error).message);
    }
  });

  /**
   * Event: draw_undo
   * Pops the last stroke from server buffer and signals other players to re-render.
   */
  socket.on('draw_undo', (payload: DrawUndoPayload, callback?: (res: { success: boolean }) => void) => {
    try {
      const { roomId } = payload;
      const room = roomManager.getRoom(roomId);

      if (!room || !room.isDrawer(socket.id)) {
        if (callback) callback({ success: false });
        return;
      }

      room.undoStroke();
      socket.to(room.id).emit('draw_undo', payload);

      if (callback) callback({ success: true });
    } catch (err) {
      console.error('[Socket.IO] Error in draw_undo:', (err as Error).message);
    }
  });

  /**
   * Event: canvas_clear
   * Wipes the vector stroke buffer and resets other players' canvases to blank.
   */
  socket.on('canvas_clear', (payload: CanvasClearPayload, callback?: (res: { success: boolean }) => void) => {
    try {
      const { roomId } = payload;
      const room = roomManager.getRoom(roomId);

      if (!room || !room.isDrawer(socket.id)) {
        if (callback) callback({ success: false });
        return;
      }

      room.clearCanvas();
      socket.to(room.id).emit('canvas_clear', payload);

      if (callback) callback({ success: true });
    } catch (err) {
      console.error('[Socket.IO] Error in canvas_clear:', (err as Error).message);
    }
  });

  /**
   * Event: request_canvas_state
   * Hydrates late-joining or reconnecting players with full current drawing.
   */
  socket.on('request_canvas_state', (data: { roomId: string }, callback?: (res: { strokes: any[] }) => void) => {
    try {
      const room = roomManager.getRoom(data.roomId);
      if (!room) return;

      if (callback) {
        callback({ strokes: room.strokeHistory });
      } else {
        socket.emit('canvas_init', { roomId: data.roomId, strokes: room.strokeHistory });
      }
    } catch (err) {
      console.error('[Socket.IO] Error in request_canvas_state:', (err as Error).message);
    }
  });
}
