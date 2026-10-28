import { createServer as createHttpServer, type Server as HttpServer } from "http";
import fs from "fs";
import path from "path";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import { AVATARS } from "../shared/avatars";
import {
  MAX_LIE_LENGTH,
  MAX_NAME_LENGTH,
  REACTION_KEYS,
  type ActionResult,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SessionResult,
  type SocketData,
} from "../shared/types";
import { PROMPTS } from "./game/content";
import { RoomManager } from "./game/manager";
import { defaultRoomConfig, RoomError, type RoomConfig } from "./game/room";

type CapServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
export type { CapServer };
type CapSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(MAX_NAME_LENGTH, `Name must be ${MAX_NAME_LENGTH} characters or fewer.`)
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u,
    "Use letters, numbers, spaces, or . _ -",
  );

const avatarSchema = z
  .number()
  .int()
  .min(0)
  .max(AVATARS.length - 1, "Pick a valid avatar.");

const codeSchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .pipe(
    z
      .string()
      .regex(/^[A-Z0-9]{5}$/, "Room codes are 5 letters or numbers."),
  );

const tokenSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/i, "That session token is not valid.");

const createSchema = z.object({
  name: nameSchema,
  avatar: avatarSchema,
});

const joinSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  avatar: avatarSchema,
});

const reconnectSchema = z.object({
  code: codeSchema,
  token: tokenSchema,
});

const lieSchema = z.object({
  text: z
    .string()
    .min(1, "Write a lie first.")
    .max(MAX_LIE_LENGTH, `Keep it under ${MAX_LIE_LENGTH} characters.`),
});

const voteSchema = z.object({
  optionId: z.string().min(1).max(64),
});

const kickSchema = z.object({
  playerId: z.string().min(1).max(64),
});

const reactionSchema = z.object({
  reaction: z.enum(["skull", "cry", "eyes", "fire"]),
});

function safeAck<T>(callback: ((result: T) => void) | undefined): (result: T) => void {
  return typeof callback === "function" ? callback : () => undefined;
}

function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check your input.";
}

function errorPayload(error: unknown): { code: string; message: string } {
  if (error instanceof RoomError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof z.ZodError) {
    return { code: "BAD_INPUT", message: zodMessage(error) };
  }
  console.error("[cap] unexpected error", error);
  return { code: "INTERNAL", message: "Something broke on our end. Try again." };
}

function failAction(callback: (result: ActionResult) => void, error: unknown): void {
  callback({ ok: false, error: errorPayload(error) });
}

function failSession(callback: (result: SessionResult) => void, error: unknown): void {
  callback({ ok: false, error: errorPayload(error) });
}

function ipKey(socket: CapSocket): string {
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return socket.handshake.address || "unknown";
}

function makeIpLimiter() {
  const windows = new Map<string, number[]>();

  return function allowIp(socket: CapSocket, bucket: string, limit: number, windowMs: number): boolean {
    const key = `${bucket}:${ipKey(socket)}`;
    const now = Date.now();
    const times = (windows.get(key) ?? []).filter((time) => now - time < windowMs);
    if (times.length >= limit) {
      windows.set(key, times);
      return false;
    }
    times.push(now);
    windows.set(key, times);
    return true;
  };
}

export interface CreateServerOptions {
  config?: Partial<Omit<RoomConfig, "prompts">>;
  roomTtlMs?: number;
  maxRooms?: number;
  serveClient?: boolean;
}

export interface CapServerBundle {
  app: express.Express;
  httpServer: HttpServer;
  io: CapServer;
  manager: RoomManager;
  config: RoomConfig;
}

export function createCapServer(options: CreateServerOptions = {}): CapServerBundle {
  const config: RoomConfig = {
    ...defaultRoomConfig(PROMPTS),
    ...options.config,
    prompts: PROMPTS,
  };

  const app = express();
  const httpServer = createHttpServer(app);
  const io: CapServer = new Server(httpServer, {
    serveClient: false,
    maxHttpBufferSize: 10_000,
    pingInterval: 10_000,
    pingTimeout: 15_000,
  });

  const manager = new RoomManager(io, config, {
    roomTtlMs: options.roomTtlMs,
    maxRooms: options.maxRooms,
  });
  manager.start();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", "data:"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'", "ws:", "wss:"],
          workerSrc: ["'self'", "blob:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
        },
      },
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "2kb" }));

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      version: "1.0.0",
      uptime: Math.round(process.uptime()),
      ...manager.getStats(),
      now: Date.now(),
    });
  });

  app.get("/api/stats", (_request, response) => {
    const stats = manager.getStats();
    response.setHeader("Cache-Control", "no-store");
    response.json({
      rooms: stats.rooms,
      players: stats.players,
      matchesCompleted: stats.matchesCompleted,
    });
  });

  app.use("/api", (_request, response) => {
    response.status(404).json({ error: "Not found" });
  });

  const serveClient = options.serveClient !== false;
  if (serveClient) {
    const clientDir = path.resolve(__dirname, "..", "client");
    if (fs.existsSync(clientDir)) {
      app.use(
        express.static(clientDir, {
          index: false,
          setHeaders: (response, filePath) => {
            if (filePath.includes(`${path.sep}assets${path.sep}`)) {
              response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            } else {
              response.setHeader("Cache-Control", "no-cache");
            }
          },
        }),
      );

      app.use((request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD") return next();
        if (request.path.startsWith("/api") || request.path.startsWith("/socket.io")) {
          return next();
        }
        response.setHeader("Cache-Control", "no-cache");
        response.sendFile(path.join(clientDir, "index.html"));
      });
    } else if (process.env.NODE_ENV === "production") {
      console.warn("[cap] client build not found. Run npm run build before starting.");
    }
  }

  app.use((_request, response) => {
    response.status(404).type("text").send("Not found");
  });

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("[cap] http error", error);
      response.status(500).json({ error: "Internal server error" });
    },
  );

  const allowIp = makeIpLimiter();

  io.on("connection", (socket) => {
    const allowAction = (): boolean => {
      const now = Date.now();
      const recent = (socket.data.actionTimes ?? []).filter((time) => now - time < 10_000);
      if (recent.length >= 30) {
        socket.data.actionTimes = recent;
        return false;
      }
      recent.push(now);
      socket.data.actionTimes = recent;
      return true;
    };

    socket.on("room:create", (payload, callback) => {
      const reply = safeAck<SessionResult>(callback);
      try {
        if (!allowAction()) throw new RoomError("RATE_LIMITED", "Slow down for a second.");
        if (!allowIp(socket, "create", 10, 60_000)) {
          throw new RoomError("RATE_LIMITED", "Too many rooms from this connection. Try again soon.");
        }
        const parsed = createSchema.parse(payload);
        const session = manager.createRoom(parsed.name, parsed.avatar, socket);
        reply({ ok: true, session });
      } catch (error) {
        failSession(reply, error);
      }
    });

    socket.on("room:join", (payload, callback) => {
      const reply = safeAck<SessionResult>(callback);
      try {
        if (!allowAction()) throw new RoomError("RATE_LIMITED", "Slow down for a second.");
        if (!allowIp(socket, "join", 30, 60_000)) {
          throw new RoomError("RATE_LIMITED", "Too many join attempts. Try again soon.");
        }
        const parsed = joinSchema.parse(payload);
        const session = manager.joinRoom(parsed.code, parsed.name, parsed.avatar, socket);
        reply({ ok: true, session });
      } catch (error) {
        failSession(reply, error);
      }
    });

    socket.on("room:reconnect", (payload, callback) => {
      const reply = safeAck<SessionResult>(callback);
      try {
        if (!allowAction()) throw new RoomError("RATE_LIMITED", "Slow down for a second.");
        if (!allowIp(socket, "reconnect", 60, 60_000)) {
          throw new RoomError("RATE_LIMITED", "Too many reconnects. Try again soon.");
        }
        const parsed = reconnectSchema.parse(payload);
        const session = manager.reconnect(parsed.code, parsed.token, socket);
        reply({ ok: true, session });
      } catch (error) {
        failSession(reply, error);
      }
    });

    const action =
      (callback: ((result: ActionResult) => void) | undefined, handler: () => void) => {
        const reply = safeAck<ActionResult>(callback);
        try {
          if (!allowAction()) throw new RoomError("RATE_LIMITED", "Slow down for a second.");
          handler();
          reply({ ok: true });
        } catch (error) {
          failAction(reply, error);
        }
      };

    socket.on("room:start", (callback) => {
      action(callback, () => manager.startMatch(socket));
    });

    socket.on("room:rematch", (callback) => {
      action(callback, () => manager.rematch(socket));
    });

    socket.on("room:lobby", (callback) => {
      action(callback, () => manager.returnToLobby(socket));
    });

    socket.on("room:skipReveal", (callback) => {
      action(callback, () => manager.skipReveal(socket));
    });

    socket.on("room:leave", (callback) => {
      action(callback, () => manager.leave(socket));
    });

    socket.on("room:kick", (payload, callback) => {
      action(callback, () => {
        const parsed = kickSchema.parse(payload);
        manager.kick(socket, parsed.playerId);
      });
    });

    socket.on("round:lie", (payload, callback) => {
      action(callback, () => {
        const parsed = lieSchema.parse(payload);
        manager.submitLie(socket, parsed.text);
      });
    });

    socket.on("round:vote", (payload, callback) => {
      action(callback, () => {
        const parsed = voteSchema.parse(payload);
        manager.vote(socket, parsed.optionId);
      });
    });

    socket.on("reaction", (payload, callback) => {
      const reply = safeAck<ActionResult>(callback);
      try {
        if (!allowAction()) throw new RoomError("RATE_LIMITED", "Slow down for a second.");
        const now = Date.now();
        if ((socket.data.reactionLockedUntil ?? 0) > now) {
          throw new RoomError("RATE_LIMITED", "One reaction at a time.");
        }
        const parsed = reactionSchema.parse(payload);
        if (!REACTION_KEYS.includes(parsed.reaction)) {
          throw new RoomError("BAD_INPUT", "That reaction is not available.");
        }
        socket.data.reactionLockedUntil = now + 800;
        manager.sendReaction(socket, parsed.reaction);
        reply({ ok: true });
      } catch (error) {
        failAction(reply, error);
      }
    });

    socket.on("disconnect", () => {
      manager.handleDisconnect(socket);
    });
  });

  return { app, httpServer, io, manager, config };
}
