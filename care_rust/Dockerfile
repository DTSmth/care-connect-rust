# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/front

COPY front/package.json front/package-lock.json ./
RUN npm ci --prefer-offline

COPY front/ ./
# .env.production sets VITE_API_URL="" (same-origin requests)
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Build the Rust backend
# ─────────────────────────────────────────────────────────────────────────────
FROM rust:1.88-slim AS builder
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY care_rust/ .
RUN cargo build --release

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Minimal runtime image (~100MB)
# ─────────────────────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=builder /app/target/release/care_rust ./care_rust
COPY --from=builder /app/migrations ./migrations
COPY --from=frontend-builder /app/front/dist ./frontend

ENV FRONTEND_DIR=/app/frontend
EXPOSE 8080

CMD ["./care_rust"]
