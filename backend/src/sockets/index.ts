import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { registerRoomHandlers } from './roomHandler.js';
import { registerDrawingHandlers } from './drawingHandler.js';
import { registerGameHandlers } from './gameHandler.js';
import { registerChatHandlers } from './chatHandler.js';

/**
 * Initializes and configures the Socket.IO server.
 */
export function initializeSockets(httpServer: HTTPServer, allowedOrigin: string): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
        if (!origin) return callback(null, true);
        if (allowedOrigin === '*' || origin === allowedOrigin) return callback(null, true);
        const origins = allowedOrigin.split(',').map((s) => s.trim());
        if (origins.includes(origin)) return callback(null, true);
        // Allow Vercel, Render, Railway, or local development domains automatically
        if (
          origin.endsWith('.vercel.app') ||
          origin.endsWith('.onrender.com') ||
          origin.endsWith('.railway.app') ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id} (Transport: ${socket.conn.transport.name})`);

    // Emit initial handshake welcome payload
    socket.emit('connected', {
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      server: 'skribbl-backend'
    });

    // Register modular feature socket handlers
    registerRoomHandlers(io, socket);
    registerDrawingHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerChatHandlers(io, socket);

    // Test ping-pong roundtrip event for latency and connectivity verification
    socket.on('ping_test', (data, callback) => {
      const serverTime = Date.now();
      if (typeof callback === 'function') {
        callback({ serverTime, received: data });
      } else {
        socket.emit('pong_test', { serverTime, received: data });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  return io;
}
