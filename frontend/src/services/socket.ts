import { io, Socket } from 'socket.io-client';

// Connect to backend server. In Vite development, either relative URL or direct backend origin
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const socket: Socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

export function testSocketLatency(): Promise<number> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      reject(new Error('Socket ping timeout'));
    }, 5000);

    socket.emit('ping_test', { clientTime: startTime }, (_response: unknown) => {
      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      resolve(latency);
    });
  });
}
