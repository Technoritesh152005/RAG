FROM node:22-slim AS base

# OpenSSL is required by Prisma's query engine.
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy manifest files first — Docker caches this layer separately,
# so `npm install` only re-runs when dependencies actually change,
# not on every code edit
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

# prisma client must be generated against THIS container's platform —
# generating it on your laptop and copying node_modules in would
# silently produce a binary mismatch at runtime
RUN npx prisma generate

COPY . .

# non-root user — standard hardening, since this container has
# network access to Postgres/Redis/Pinecone/external APIs
RUN useradd --create-home appuser
USER appuser

EXPOSE 4000

# default command — overridden per-service in docker-compose.yml
CMD ["node", "src/server.js"]