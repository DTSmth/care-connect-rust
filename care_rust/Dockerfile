# ---- Stage 1: Recipe (cargo-chef caches dependencies) ----
FROM rust:1.83-slim AS chef
RUN cargo install cargo-chef --locked
WORKDIR /app

# ---- Stage 2: Planner ----
FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# ---- Stage 3: Builder ----
FROM chef AS builder
# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# 1. Build dependencies only (cached layer — only re-runs on Cargo.toml changes)
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json

# 2. Build the application
COPY . .
RUN cargo build --release

# ---- Stage 4: Runtime (minimal image) ----
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=builder /app/target/release/care_rust .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080
CMD ["./care_rust"]
