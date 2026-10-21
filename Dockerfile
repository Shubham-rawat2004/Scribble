# ==========================================
# Stage 1: Build Frontend (Vite + React)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Backend (TypeScript -> JS)
# ==========================================
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build

# ==========================================
# Stage 3: Production Runner (Lean Alpine Image)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only for backend
COPY backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev

# Copy compiled backend and frontend distribution assets
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 5000

CMD ["node", "backend/dist/server.js"]
