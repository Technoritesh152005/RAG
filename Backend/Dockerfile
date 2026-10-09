FROM node:22-slim AS base

RUN apt-get update && apt-get install -y \
    ffmpeg \
    openssl \
    procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

RUN npx prisma generate

COPY . .

RUN useradd --create-home appuser

# Create writable runtime directories for Transformers.js and Crawlee
RUN mkdir -p /app/node_modules/@huggingface/transformers/.cache \
    /app/storage \
    && chown -R appuser:appuser \
      /app/node_modules/@huggingface/transformers/.cache \
      /app/storage

USER appuser

EXPOSE 4000

CMD ["node", "src/server.js"]