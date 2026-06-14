# syntax=docker/dockerfile:1

# ----------------------------------------------------------------------------
# Build stage: install dependencies and produce the Fresh production bundle.
# ----------------------------------------------------------------------------
FROM denoland/deno:2.4.3 AS build
WORKDIR /app

# Install dependencies first so this layer is cached when only source changes.
COPY deno.json deno.lock ./
RUN deno install

# Build the app. `deno task build` (vite) emits a fully self-contained server
# bundle under _fresh/ — no node_modules or source are needed at runtime.
COPY . .
RUN deno task build

# ----------------------------------------------------------------------------
# Runtime stage: serve the built bundle. Small image — just Deno + _fresh/.
# ----------------------------------------------------------------------------
FROM denoland/deno:2.4.3 AS runtime
WORKDIR /app

# Sessions, credentials and schedules live in Deno KV. Self-hosted, KV is a
# SQLite file — point it at a mounted volume so data survives restarts.
ENV DENO_KV_PATH=/data/kv.sqlite3
RUN mkdir -p /data
VOLUME ["/data"]

COPY --from=build /app/_fresh ./_fresh

EXPOSE 8000

# --unstable-kv:  SQLite-backed Deno KV
# --unstable-cron: the every-minute control loop registered in main.ts
# (the denoland/deno image's ENTRYPOINT is `deno`, so these are its args)
CMD ["serve", "-A", "--unstable-kv", "--unstable-cron", "--host", "0.0.0.0", "--port", "8000", "_fresh/server.js"]
