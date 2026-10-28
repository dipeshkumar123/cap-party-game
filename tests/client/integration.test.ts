import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { createCapServer, type CapServerBundle } from "../../server/app";
import { io, type Socket } from "socket.io-client";
import { PROMPTS } from "../../server/game/content";

function makeConfig() {
  return {
    writingMs: 60,
    votingMs: 60,
    revealMs: 5000,
    maxPlayers: 8,
    totalRounds: 2,
    disconnectGraceMs: 5000,
    pausedRoomTimeoutMs: 5000,
    prompts: PROMPTS,
  };
}

interface Client {
  socket: Socket;
  latestState: () => any | null;
}

function connectClient(port: number): Promise<Client> {
  return new Promise((resolve, reject) => {
    const socket = io(`http://localhost:${port}`, {
      transports: ["websocket"],
      reconnection: false,
    });
    let latest: any = null;
    socket.on("state", (next: any) => {
      latest = next;
    });
    socket.on("connect", () => {
      resolve({ socket, latestState: () => latest });
    });
    socket.on("connect_error", (error: Error) => reject(error));
    setTimeout(() => reject(new Error("connect timeout")), 10000);
  });
}

function ack(socket: Socket, event: string, data?: unknown): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout awaiting ${event}`)), 10000);
    const done = (result: any) => {
      clearTimeout(timer);
      resolve(result);
    };
    if (data === undefined) socket.emit(event, done);
    else socket.emit(event, data, done);
  });
}

function waitFor(client: Client, predicate: (state: any) => boolean, timeout = 10000): Promise<any> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      const state = client.latestState();
      if (state && predicate(state)) return resolve(state);
      if (Date.now() - start > timeout) return reject(new Error("state predicate timeout"));
      setTimeout(poll, 40);
    };
    poll();
  });
}

describe("CAP socket integration", () => {
  let server: CapServerBundle;
  let port: number;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    const bundle = createCapServer({ config: makeConfig() });
    server = bundle;
    await new Promise<void>((resolve) => {
      bundle.httpServer.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.httpServer.address();
    port = typeof address === "object" && address ? address.port : 0;
  });

  afterAll(async () => {
    for (const socket of sockets) socket.disconnect();
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
  });

  it("runs a two-player match from lobby through results over sockets", async () => {
    const host = await connectClient(port);
    const guest = await connectClient(port);
    sockets.push(host.socket, guest.socket);

    const created = await ack(host.socket, "room:create", { name: "Maya", avatar: 0 });
    expect(created.ok).toBe(true);
    expect(created.session.roomCode).toBeTruthy();
    const code: string = created.session.roomCode;

    const joined = await ack(guest.socket, "room:join", { code, name: "Dev", avatar: 5 });
    expect(joined.ok).toBe(true);

    await waitFor(host, (s) => s.phase === "lobby" && s.players.length === 2);
    await waitFor(guest, (s) => s.phase === "lobby" && s.players.length === 2);

    const started = await ack(host.socket, "room:start");
    expect(started.ok).toBe(true);

    await waitFor(host, (s) => s.phase === "writing");
    await waitFor(guest, (s) => s.phase === "writing");

    await ack(host.socket, "round:lie", { text: "Host cap" });
    await ack(guest.socket, "round:lie", { text: "Guest cap" });
    const hostVoting = await waitFor(host, (s) => s.phase === "voting");
    const guestVoting = await waitFor(guest, (s) => s.phase === "voting");

    const pickOption = (state: any) => {
      const option = state.options.find((entry: any) => !entry.isMine);
      if (!option) throw new Error("no vote option");
      return option.id;
    };

    await ack(host.socket, "round:vote", { optionId: pickOption(hostVoting) });
    await ack(guest.socket, "round:vote", { optionId: pickOption(guestVoting) });

    // Privacy: voting options never expose author id or truth.
    for (const option of hostVoting.options) {
      expect(option.authorId).toBeUndefined();
      expect(option.isTruth).toBeUndefined();
    }

    await waitFor(host, (s) => s.phase === "reveal");
    await waitFor(guest, (s) => s.phase === "reveal");

    // Honor the minimum reveal hold before the host skips ahead.
    await new Promise((resolve) => setTimeout(resolve, 1600));

    const skipped = await ack(host.socket, "room:skipReveal");
    expect(skipped.ok).toBe(true);

    await waitFor(host, (s) => s.phase === "writing" || s.phase === "ended");
    await waitFor(guest, (s) => s.phase === "writing" || s.phase === "ended");

    expect(host.latestState().players.length).toBe(2);
    expect(guest.latestState().players.length).toBe(2);
  }, 30000);

  it("rejects invalid room join codes", async () => {
    const client = await connectClient(port);
    sockets.push(client.socket);
    const result = await ack(client.socket, "room:join", { code: "BAD", name: "Nope", avatar: 1 });
    expect(result.ok).toBe(false);
  });
});
