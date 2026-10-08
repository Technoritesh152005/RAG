FROM node:22-slim AS base

RUN apt-get update && apt-get install -y \
    ffmpeg \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

RUN npx prisma generate

COPY . .

RUN useradd --create-home appuser

# Create writable Transformers.js cache
RUN mkdir -p /app/node_modules/@huggingface/transformers/.cache \
    && chown -R appuser:appuser /app/node_modules/@huggingface/transformers/.cache

USER appuser

EXPOSE 4000

CMD ["node", "src/server.js"]