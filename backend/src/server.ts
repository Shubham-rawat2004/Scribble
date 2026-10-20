import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { testConnection } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { initializeSockets } from './sockets/index.js';

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '5000', 10);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true
}));
app.use(express.json());

// API Health Check Endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  const dbStatus = await testConnection();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'skribbl-backend',
    database: dbStatus ? 'connected' : 'disconnected'
  });
});

// Initialize Socket.IO
export const io = initializeSockets(server, CLIENT_ORIGIN);

// Start Server
async function startServer() {
  console.log('==================================================');
  console.log('   SKRIBBL.IO CLONE — BACKEND SERVER');
  console.log('==================================================');

  // Attempt database connectivity and run initial migration if possible
  const dbConnected = await testConnection();
  if (dbConnected) {
    try {
      await runMigrations();
    } catch (err) {
      console.warn('[Database] Migration warning:', (err as Error).message);
    }
  } else {
    console.warn('[Database] Warning: MySQL is not yet reachable. Start Docker with "docker compose up -d"');
  }

  server.listen(PORT, () => {
    console.log(`[Server] Express & Socket.IO running on port ${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Accepting requests from: ${CLIENT_ORIGIN}`);
    console.log('==================================================');
  });
}

startServer();

export { app, server };
