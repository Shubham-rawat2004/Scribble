# Feature 01: Project Setup & Baseline Infrastructure

This document details the complete design, code implementation, testing, and interview defense for Phase 1: **Project Setup & Baseline Infrastructure**.

---

## 1. Feature Overview
Phase 1 establishes the full-stack infrastructure for the entire Skribbl.io clone application. It brings together a modern, typed frontend (React 18 + Vite + TypeScript), an event-driven backend (Node.js + Express + Socket.IO + TypeScript), and a containerized relational database (MySQL 8.0 in Docker Compose with persistent disk storage). It also establishes environment configurations (`.env`), database migrations, and bi-directional WebSocket health checks.

---

## 2. Requirements Mapping
From [`docs/requirements-checklist.md`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/docs/requirements-checklist.md):
- **Core Stack Foundations:** React + TypeScript + Vite, Node.js + Express, Socket.IO, Dockerized MySQL.
- **WebSocket Protocol:** Base connection lifecycle, handshake, and roundtrip ping verification.
- **Database Schema:** Execution of `001_initial_schema.sql` creating the 6 foundational tables (`rooms`, `players`, `game_sessions`, `game_rounds`, `player_round_scores`, `words`).

---

## 3. User Workflow
1. Developer runs `docker compose up -d` to spin up MySQL 8.0 on port 3307.
2. Backend starts with `npm run dev` on port 5000, validates database connectivity, runs pending SQL migrations, and exposes `/api/health`.
3. Frontend starts with `npm run dev` on port 5173.
4. User opens browser to `http://localhost:5173`.
5. The UI queries `/api/health` and opens a WebSocket to `ws://localhost:5000`.
6. System displays a real-time status card confirming that the Express server, Socket.IO WebSocket, and MySQL database are all active and connected.
7. Clicking **"Test Socket Ping"** emits a ping to the backend, measuring roundtrip WebSocket latency in milliseconds.

---

## 4. Frontend Implementation
- **[`frontend/src/App.tsx`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/App.tsx):** React component tracking WebSocket connection status, socket ID, server health response, and latency.
- **[`frontend/src/services/socket.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/services/socket.ts):** Socket.IO client singleton configured for automatic reconnection and fallback transports (`websocket`, `polling`). Includes `testSocketLatency()` helper.
- **[`frontend/src/index.css`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/src/index.css):** Clean styling with responsive grid, badges, log viewer, and typography.
- **[`frontend/vite.config.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/frontend/vite.config.ts):** Configures Vite dev server with reverse proxy for `/api` and `/socket.io`.

---

## 5. Backend Implementation
- **[`backend/src/server.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/server.ts):** Express application, HTTP server, CORS middleware, `/api/health` REST endpoint, and startup orchestrator.
- **[`backend/src/sockets/index.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/sockets/index.ts):** Socket.IO server initialization, client connection logging, and `ping_test` latency response.
- **[`backend/src/db/connection.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/db/connection.ts):** MySQL connection pool created with `mysql2/promise` using environment variables with fail-safe ping check.
- **[`backend/src/db/migrate.ts`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/backend/src/db/migrate.ts):** Automatic migration runner reading versioned SQL scripts.

---

## 6. Database and Data Flow
- **Environment:** Container `skribbl_mysql` running MySQL 8.0 on host port `3307` mapped to container port `3306`.
- **Migration:** `backend/src/db/migrations/001_initial_schema.sql` executed on startup.
- **Tables Initialized:**
  - `rooms`: Stores room code, host, settings, status.
  - `players`: Stores session UUID, room FK, name, avatar, score.
  - `game_sessions`: Tracks match status, winner, duration.
  - `game_rounds`: Tracks turn number, drawer ID, secret word.
  - `player_round_scores`: Detailed score audit per player per turn.
  - `words`: Pre-populated with 25 categorized words across `ANIMALS`, `OBJECTS`, `FOOD`, `PLACES`, and `ACTIONS`.

---

## 7. File-by-File Explanation

| File | Purpose |
|---|---|
| `docker-compose.yml` | Declarative container specification for MySQL 8.0 with persistent volume `mysql_data` |
| `.env` / `.env.example` | Database credentials and port configurations |
| `package.json` (Root) | Monorepo helper scripts to manage backend, frontend, and Docker |
| `backend/package.json` | Backend dependencies: `express`, `socket.io`, `mysql2`, `cors`, `dotenv`, `tsx` |
| `backend/tsconfig.json` | Strict TypeScript compiler configuration (ES2022, NodeNext) |
| `backend/src/server.ts` | Express entry point, HTTP routing, and startup flow |
| `backend/src/db/connection.ts` | `mysql2` connection pool with `testConnection()` |
| `backend/src/db/migrate.ts` | Migration execution script |
| `backend/src/db/migrations/001_initial_schema.sql` | Table definitions (DDL) and initial seed data |
| `backend/src/sockets/index.ts` | Socket.IO server setup and test handlers |
| `frontend/package.json` | Frontend dependencies: `react`, `react-dom`, `socket.io-client`, `lucide-react`, `vite` |
| `frontend/vite.config.ts` | Vite bundler config with API reverse proxy |
| `frontend/src/services/socket.ts` | Socket.IO client singleton |
| `frontend/src/App.tsx` | Status dashboard and WebSocket ping-pong tester |
| `frontend/src/index.css` | Design styling |

---

## 8. Code Explanation with Snippets

### 1. Database Connection Pooling (`connection.ts`)
```typescript
const dbConfig: mysql.PoolOptions = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3307', 10),
  user: process.env.DB_USER || 'skribbl_user',
  password: process.env.DB_PASSWORD || 'skribbl_password',
  database: process.env.DB_NAME || 'skribbl_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};
export const pool = mysql.createPool(dbConfig);
```
*Why this matters:* Rather than opening and closing a TCP socket for every SQL query, a connection pool keeps 10 connections alive in memory, reusing them instantly for minimal latency.

### 2. Socket.IO Connection & Ping-Pong Latency (`sockets/index.ts`)
```typescript
io.on('connection', (socket: Socket) => {
  socket.emit('connected', { socketId: socket.id, timestamp: new Date().toISOString() });

  socket.on('ping_test', (data, callback) => {
    const serverTime = Date.now();
    if (typeof callback === 'function') {
      callback({ serverTime, received: data });
    }
  });
});
```
*Why this matters:* Proves full-duplex WebSocket capability and measures network latency directly between browser and server.

---

## 9. Complete Code-Change Record
- **Created Files:**
  - `docker-compose.yml`, `.env`, `.env.example`, `.gitignore`, `package.json`
  - `backend/package.json`, `backend/tsconfig.json`, `backend/src/server.ts`, `backend/src/db/connection.ts`, `backend/src/db/migrate.ts`, `backend/src/db/migrations/001_initial_schema.sql`, `backend/src/sockets/index.ts`
  - `frontend/package.json`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/vite.config.ts`, `frontend/index.html`, `frontend/src/vite-env.d.ts`, `frontend/src/index.css`, `frontend/src/services/socket.ts`, `frontend/src/App.tsx`, `frontend/src/main.tsx`
- **Patch Set:** Saved to [`docs/change-sets/01-project-setup.patch`](file:///C:/Users/shub1/OneDrive/Desktop/Scribble/docs/change-sets/01-project-setup.patch).

---

## 10. Testing & Verification
1. **Docker Container Health:**
   - Command: `docker ps --filter "name=skribbl_mysql"`
   - Result: `skribbl_mysql` container running and `healthy` on `0.0.0.0:3307->3306/tcp`.
2. **Database Migration:**
   - Command: `npm --prefix backend run migrate`
   - Result: Executed `001_initial_schema.sql` successfully. Verified 6 tables created and 25 seed words present in `skribbl_db`.
3. **Backend Type Checking & Build:**
   - Command: `npm --prefix backend run build`
   - Result: Compiled with 0 errors.
4. **Frontend Type Checking & Build:**
   - Command: `npm --prefix frontend run build`
   - Result: Built production bundle in 3.14s with 0 errors.
5. **REST API Health Check:**
   - Request: `GET http://localhost:5000/api/health`
   - Response: `{"status":"ok","database":"connected","service":"skribbl-backend"}` (HTTP 200).
6. **Socket.IO Ping-Pong Roundtrip:**
   - Verification: Connected client `0gD99T8DDAQU6xSIAAAA`, emitted `ping_test`, received acknowledgment with 60ms RTT.

---

## 11. Technical Interview Preparation (5 Questions & Answers)

### Q1: Why did you use `3307:3306` port mapping in Docker Compose instead of `3306:3306`?
**Answer:** "The host Windows machine was already running a background `mysqld` service on port 3306. Binding Docker to `3306:3306` resulted in a port collision error. By mapping host port 3307 to container port 3306 (`3307:3306`), the containerized MySQL instance runs in full isolation without interfering with the host system, and the backend connects seamlessly via `DB_PORT=3307`."

### Q2: How does Socket.IO differ from standard raw WebSockets?
**Answer:** "Raw WebSockets provide a low-level byte/string stream without rooms, channels, or connection fallback. Socket.IO builds on top of WebSockets by providing built-in room clustering (`socket.join(roomId)`), automatic reconnection with exponential backoff, transport fallbacks (falling back to HTTP long-polling if WebSockets are blocked by corporate firewalls), and typed event acknowledgments."

### Q3: Why is database migration automation important on server startup?
**Answer:** "Automating database migrations guarantees schema consistency across all environments (local developer machines, CI/CD test runners, and production cloud containers). Any new developer or cloud deployment can boot up the application from scratch with zero manual SQL execution."

### Q4: How does Vite compare to Webpack for React development?
**Answer:** "Webpack bundles the entire application codebase before serving it, resulting in slow startup times on large projects. Vite uses native browser ES Modules (ESM) during development, compiling code on demand and providing near-instantaneous Hot Module Replacement (HMR) under 50ms, greatly accelerating development iteration."

### Q5: What is the role of `mysql2` connection pooling?
**Answer:** "Establishing a new database connection involves TCP handshakes, TLS negotiation, and authentication, which takes 50–100ms. A connection pool keeps a set of authenticated database connections alive in memory. When a query is made, it borrows an existing connection, executes the query in 1–2ms, and releases it back to the pool, dramatically increasing throughput."

---

## 12. Spring Boot Comparison
- Express server + middleware = Spring MVC DispatcherServlet + Filters
- `mysql2.createPool` = Spring HikariCP `HikariDataSource`
- `.sql` migration runner = Flyway / Liquibase database migrations
- `docker-compose.yml` = Spring Boot 3.1+ Docker Compose support
- `tsx` watch mode = `spring-boot-devtools` live reload

---

## 13. Future Improvements
- Implement connection retry loop with exponential backoff in `connection.ts` if MySQL container takes longer to start on slow cloud machines.
- Add Prometheus-compatible metrics endpoint for monitoring connection pool saturation.
