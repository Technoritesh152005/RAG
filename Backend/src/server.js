import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";
import Redis from "ioredis";
import dotenv from "dotenv";
import { registerWorkspaceRoute } from "./modules/workspace/workspace_routes.js";
import { verifyToken } from "./modules/auth/auth_service.js";
import { registerSourceRoutes } from "./modules/sources/source.routes.js";
import { registerChatGateway } from "./modules/chat/chat.gateway.js";
import { chatRoutes } from "./modules/chat/chat.routes.js";
import rateLimit from "@fastify/rate-limit";
import { faqRoutes } from "./modules/chat/faq.routes.js";
import prisma from "./lib/prisma.js";
import { getPineconeIndex } from "./lib/pinecone.js";
import {registerUsageRoutes} from './modules/analytics/usage.routes.js'
import {evalRoutes} from './modules/eval/eval.routes.js'
import redis from './lib/redis.js'

dotenv.config();

const app = Fastify({ logger: true });

app.register(faqRoutes, { prefix: "/api/workspaces" });

await app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: "5 minute",

  errorResponseBuilder: (request, context) => ({
    error: "Too many request",
    message: "Rate limit exceeded. Try again later.",
    statusCode: 429,
  }),
});

//strict rate limit for workspace based routes
await app.register(rateLimit, {
  prefix: "/api/workspace",
  config: {
    rateLimit: {
      max: 10,
      timeWindow: "1 hour",
    },
  },
});

await app.register(cors, {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
});

app.register(registerWorkspaceRoute, { prefix: "/api/workspace" });
app.register(registerSourceRoutes, { prefix: "/api/workspaces" });
app.register(chatRoutes, { prefix: "/api/workspaces" });
app.register(registerUsageRoutes, { prefix: "/api/workspaces" });
app.register(evalRoutes, {prefix:"/api/workspaces"})

// create http server for socket.io
const httpServer = app.server;

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

// socket middleware
io.use(async (socket, next) => {
  try {
    if (
      process.env.NODE_ENV !== "production" &&
      process.env.LOCAL_AUTH_BYPASS === "true"
    ) {
      socket.user = {
        id: process.env.LOCAL_USER_ID || "local-dev-user",
        app_metadata: { role: "admin" },
      };

      return next();
    }

    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("No Token"));
    }

    socket.user = await verifyToken(token);
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});
registerChatGateway(io);

// seperate redis client for subscriber
const subRedis = new Redis(process.env.REDIS_URL);

// whenever some msg comes in source:status channle notify
subRedis.subscribe("source:status", (err) => {
  if (err) console.error("Redis subscribe error:", err);
  else console.log("Subscribed to source:status channel");
});

// when workerpublish emit status update it
// it returns message in string like workspaceid, chunk and all data from worker
subRedis.on("message", (channel, message) => {
  if (channel === "source:status") {
    const data = JSON.parse(message);
    console.log(data);

    // emit to clients in workspace room via socket
    // only those in room of socket will receive this messgae and load in frontend
    io.to(data.workspaceId).emit("source:status", {
      sourceId: data.sourceId,
      status: data.status,
      pageCount: data.pageCount,
      chunkCount: data.chunkCount,
      error: data.error,
    });
  }
});

app.get("/health", async (request, reply) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {},
  };

  // check Postgres
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.postgres = "ok";
  } catch {
    health.services.postgres = "error";
    health.status = "degraded";
  }

  // check Redis
  try {
    await redis.ping();
    health.services.redis = "ok";
  } catch {
    health.services.redis = "error";
    health.status = "degraded";
  }

  // check Pinecone
  try {
    const index = getPineconeIndex();
    await index.describeIndexStats();
    health.services.pinecone = "ok";
  } catch {
    health.services.pinecone = "error";
    health.status = "degraded";
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  return reply.status(statusCode).send(health);
});

// start server
const PORT = process.env.PORT || 4000;

try {
  await app.ready();
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
