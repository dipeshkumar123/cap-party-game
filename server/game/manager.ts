import { randomInt } from "crypto";
import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ReactionPayload,
  SessionInfo,
  SocketData,
  ServerToClientEvents,
} from "../../shared/types";
import { Room, RoomConfig, RoomError, type PlayerInternal } from "./room";

type CapServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type CapSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 5;
const TICK_MS = 250;

interface Counters {
  roomsCreated: number;
  playersJoined: number;
  matchesStarted: number;
  matchesCompleted: number;
  rematches: number;
}

export interface ManagerStats {
  rooms: number;
  players: number;
  matchesCompleted: number;
  matchesStarted: number;
  roomsCreated: number;
  rematches: number;
}

export class RoomManager {
  private readonly io: CapServer;
  private readonly config: RoomConfig;
  private readonly roomTtlMs: number;
  private readonly maxRooms: number;
  private readonly rooms = new Map<string, Room>();
  private readonly notifiedEnded = new WeakSet<Room>();
  private readonly counters: Counters = {
    roomsCreated: 0,
    playersJoined: 0,
    matchesStarted: 0,
    matchesCompleted: 0,
    rematches: 0,
  };
  private interval: NodeJS.Timeout | null = null;

  constructor(io: CapServer, config: RoomConfig, options?: { roomTtlMs?: number; maxRooms?: number }) {
    this.io = io;
    this.config = config;
    this.roomTtlMs = options?.roomTtlMs ?? 2 * 60 * 60 * 1000;
    this.maxRooms = options?.maxRooms ?? 500;
  }

  start(): void {
    if (this.interval) return;
    this.interval = setInterval(() => this.tick(), TICK_MS);
    this.interval.unref?.();
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getStats(): ManagerStats {
    let players = 0;
    for (const room of this.rooms.values()) {
      players += room.connectedCount;
    }
    return {
      rooms: this.rooms.size,
      players,
      matchesCompleted: this.counters.matchesCompleted,
      matchesStarted: this.counters.matchesStarted,
      roomsCreated: this.counters.roomsCreated,
      rematches: this.counters.rematches,
    };
  }

  createRoom(name: string, avatar: number, socket: CapSocket): SessionInfo {
    if (this.rooms.size >= this.maxRooms) {
      throw new RoomError("SERVER_BUSY", "The server is full right now. Try again in a moment.");
    }
    this.assertSocketFree(socket);

    const code = this.generateCode();
    const now = Date.now();
    const room = new Room(code, this.config, now);
    this.rooms.set(code, room);

    const player = room.addPlayer(name, avatar, socket.id, now);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerId = player.id;

    this.counters.roomsCreated += 1;
    this.counters.playersJoined += 1;
    this.broadcast(room);
    return { roomCode: code, playerId: player.id, token: player.token };
  }

  joinRoom(code: string, name: string, avatar: number, socket: CapSocket): SessionInfo {
    this.assertSocketFree(socket);
    const room = this.rooms.get(code);
    if (!room) throw new RoomError("ROOM_NOT_FOUND", "That room does not exist. Check the code.");
    if (room.phase !== "lobby") {
      throw new RoomError("ROOM_IN_PROGRESS", "That match is already running. Ask the host for the next game.");
    }

    const now = Date.now();
    const player = room.addPlayer(name, avatar, socket.id, now);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerId = player.id;

    this.counters.playersJoined += 1;
    this.broadcast(room);
    return { roomCode: code, playerId: player.id, token: player.token };
  }

  reconnect(code: string, token: string, socket: CapSocket): SessionInfo {
    const room = this.rooms.get(code);
    if (!room) throw new RoomError("ROOM_NOT_FOUND", "That room has ended.");
    if (socket.data.roomCode && socket.data.roomCode !== code) {
      throw new RoomError("ALREADY_IN_ROOM", "Leave your current room first.");
    }

    const now = Date.now();
    const { player, replacedSocketId } = room.reconnect(token, socket.id, now);

    if (replacedSocketId && replacedSocketId !== socket.id) {
      const previous = this.io.sockets.sockets.get(replacedSocketId);
      if (previous) {
        previous.emit("cap:session-replaced");
        previous.data.roomCode = undefined;
        previous.data.playerId = undefined;
        previous.disconnect(true);
      }
    }

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerId = player.id;
    this.broadcast(room);
    return { roomCode: code, playerId: player.id, token: player.token };
  }

  leave(socket: CapSocket): void {
    const context = this.contextFor(socket);
    if (!context) throw new RoomError("NOT_IN_ROOM", "You are not in a room.");
    const { room, player } = context;

    socket.leave(room.code);
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;

    const empty = room.removePlayer(player.id, Date.now());
    if (empty) {
      this.rooms.delete(room.code);
    } else {
      this.broadcast(room);
    }
  }

  handleDisconnect(socket: CapSocket): void {
    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;
    if (!roomCode || !playerId) return;
    const room = this.rooms.get(roomCode);
    if (!room) return;
    if (room.disconnect(playerId, socket.id, Date.now())) {
      this.broadcast(room);
    }
  }

  startMatch(socket: CapSocket): void {
    const { room, player } = this.requireContext(socket);
    room.startMatch(player.id, Date.now());
    this.counters.matchesStarted += 1;
    this.notifiedEnded.delete(room);
    this.broadcast(room);
  }

  rematch(socket: CapSocket): void {
    const { room, player } = this.requireContext(socket);
    room.rematch(player.id, Date.now());
    this.counters.matchesStarted += 1;
    this.counters.rematches += 1;
    this.notifiedEnded.delete(room);
    this.broadcast(room);
  }

  returnToLobby(socket: CapSocket): void {
    const { room, player } = this.requireContext(socket);
    room.returnToLobby(player.id, Date.now());
    this.notifiedEnded.delete(room);
    this.broadcast(room);
  }

  submitLie(socket: CapSocket, text: string): void {
    const { room, player } = this.requireContext(socket);
    room.submitLie(player.id, text, Date.now());
    this.broadcast(room);
  }

  vote(socket: CapSocket, optionId: string): void {
    const { room, player } = this.requireContext(socket);
    room.vote(player.id, optionId, Date.now());
    this.broadcast(room);
  }

  skipReveal(socket: CapSocket): void {
    const { room, player } = this.requireContext(socket);
    room.skipReveal(player.id, Date.now());
    this.broadcast(room);
  }

  kick(socket: CapSocket, targetId: string): void {
    const { room, player } = this.requireContext(socket);
    const target = room.kick(player.id, targetId, Date.now());
    const targetSocketId = target.socketId;
    if (targetSocketId) {
      const targetSocket = this.io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit("cap:room-closed", {
          reason: "kicked",
          message: "The host removed you from the room.",
        });
        targetSocket.data.roomCode = undefined;
        targetSocket.data.playerId = undefined;
        targetSocket.disconnect(true);
      }
    }
    this.broadcast(room);
  }

  sendReaction(socket: CapSocket, reaction: ReactionPayload["reaction"]): void {
    const { room, player } = this.requireContext(socket);
    this.io.to(room.code).emit("cap:reaction", {
      id: `${player.id}-${Date.now()}-${randomInt(1000, 9999)}`,
      playerId: player.id,
      name: player.name,
      avatar: player.avatar,
      reaction,
    });
  }

  private tick(): void {
    const now = Date.now();

    for (const [code, room] of this.rooms) {
      const changed = room.tick(now);
      if (changed) this.broadcast(room);
      this.noteCompleted(room);

      if (room.playerCount === 0) {
        this.rooms.delete(code);
        continue;
      }

      if (now - room.lastActivityAt > this.roomTtlMs) {
        this.closeRoom(room);
        this.rooms.delete(code);
      }
    }
  }

  private noteCompleted(room: Room): void {
    if (
      room.phase === "ended" &&
      room.matchEndReason === "completed" &&
      !this.notifiedEnded.has(room)
    ) {
      this.notifiedEnded.add(room);
      this.counters.matchesCompleted += 1;
    }
    if (room.phase !== "ended") {
      this.notifiedEnded.delete(room);
    }
  }

  private closeRoom(room: Room): void {
    this.io.to(room.code).emit("cap:room-closed", {
      reason: "expired",
      message: "This room expired after a long break.",
    });
    for (const player of room.players.values()) {
      if (!player.socketId) continue;
      const socket = this.io.sockets.sockets.get(player.socketId);
      if (socket) {
        socket.data.roomCode = undefined;
        socket.data.playerId = undefined;
        socket.leave(room.code);
        socket.disconnect(true);
      }
    }
  }

  private broadcast(room: Room): void {
    const now = Date.now();
    for (const player of room.players.values()) {
      if (!player.connected || !player.socketId) continue;
      try {
        const state = room.buildState(player.id, now);
        this.io.to(player.socketId).emit("state", state);
      } catch {
        const socket = this.io.sockets.sockets.get(player.socketId);
        if (socket) {
          socket.data.roomCode = undefined;
          socket.data.playerId = undefined;
        }
      }
    }
  }

  private contextFor(socket: CapSocket): { room: Room; player: PlayerInternal } | null {
    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;
    if (!roomCode || !playerId) return null;
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const player = room.players.get(playerId);
    if (!player) return null;
    return { room, player };
  }

  private requireContext(socket: CapSocket): { room: Room; player: PlayerInternal } {
    const context = this.contextFor(socket);
    if (!context) throw new RoomError("NOT_IN_ROOM", "You are not in a room.");
    return context;
  }

  private assertSocketFree(socket: CapSocket): void {
    if (socket.data.roomCode) {
      throw new RoomError("ALREADY_IN_ROOM", "You are already in a room.");
    }
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      let code = "";
      for (let index = 0; index < CODE_LENGTH; index += 1) {
        code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new RoomError("ROOM_CODE_FAILED", "Could not create a room. Try again.");
  }
}
