import { describe, expect, it } from "vitest";
import { PROMPTS } from "../server/game/content";
import { Room, RoomError, type PlayerInternal, type RoomConfig } from "../server/game/room";

function makeConfig(overrides: Partial<RoomConfig> = {}): RoomConfig {
  return {
    writingMs: 60000,
    votingMs: 25000,
    revealMs: 14000,
    maxPlayers: 8,
    totalRounds: 5,
    disconnectGraceMs: 120000,
    pausedRoomTimeoutMs: 300000,
    prompts: PROMPTS,
    ...overrides,
  };
}

interface Fixture {
  room: Room;
  host: PlayerInternal;
  players: PlayerInternal[];
}

function makeRoom(count = 3, config = makeConfig()): Fixture {
  const room = new Room("ABCDE", config, 0);
  const players: PlayerInternal[] = [];
  for (let index = 0; index < count; index += 1) {
    players.push(room.addPlayer(`Player${index + 1}`, index, `socket-${index}`, 0));
  }
  const host = players[0];
  room.startMatch(host.id, 0);
  return { room, host, players };
}

function submitAll(fixture: Fixture, now: number, prefix = "lie"): void {
  fixture.players.forEach((player, index) => {
    fixture.room.submitLie(player.id, `${prefix}-${index}`, now);
  });
}

function optionFor(fixture: Fixture, playerId: string): string {
  const option = fixture.room.options.find((entry) => entry.authorId === playerId);
  if (!option) throw new Error("option not found");
  return option.id;
}

function playPerfectRound(fixture: Fixture, now: number, prefix: string): void {
  submitAll(fixture, now, prefix);
  const truthId = fixture.room.truthOptionId;
  if (!truthId) throw new Error("truth not found");
  const liar = fixture.players[0];
  const others = fixture.players.slice(1);
  fixture.room.vote(liar.id, truthId, now + 100);
  others.forEach((player, index) => {
    fixture.room.vote(player.id, optionFor(fixture, liar.id), now + 200 + index);
  });
}

describe("Room engine", () => {
  it("runs a full three-round match and applies multipliers", () => {
    const fixture = makeRoom(3, makeConfig({ totalRounds: 3 }));
    const { room, host } = fixture;

    expect(room.phase).toBe("writing");
    expect(room.round).toBe(1);
    expect(room.multiplier).toBe(1);

    playPerfectRound(fixture, 1000, "round-one");
    expect(room.phase).toBe("reveal");
    const firstReveal = room.reveal;
    expect(firstReveal).not.toBeNull();
    expect(firstReveal?.answers.find((answer) => answer.perfect)?.points).toBe(2000);
    expect(host.score).toBe(3000);

    expect(room.skipReveal(host.id, 5000)).toBe(true);
    expect(room.round).toBe(2);
    expect(room.multiplier).toBe(1);

    playPerfectRound(fixture, 6000, "round-two");
    expect(host.score).toBe(6000);
    expect(room.skipReveal(host.id, 10000)).toBe(true);
    expect(room.round).toBe(3);
    expect(room.multiplier).toBe(2);

    playPerfectRound(fixture, 11000, "round-three");
    expect(host.score).toBe(12000);

    expect(room.skipReveal(host.id, 16000)).toBe(true);
    expect(room.phase).toBe("ended");
    expect(room.matchEndReason).toBe("completed");
    expect(room.buildState(host.id, 16000).winnerIds).toEqual([host.id]);
  });

  it("never leaks the truth marker or authorship during voting", () => {
    const fixture = makeRoom(3);
    submitAll(fixture, 1000);

    const state = fixture.room.buildState(fixture.players[1].id, 1200);
    expect(state.phase).toBe("voting");
    expect(state.options).not.toBeNull();
    expect(state.options?.length).toBe(4);
    expect(JSON.stringify(state.options)).not.toContain("isTruth");
    expect(JSON.stringify(state.options)).not.toContain("authorId");
    expect(JSON.stringify(state)).not.toContain("\"answer\"");
    expect(state.prompt && Object.keys(state.prompt).sort()).toEqual(["category", "text"]);
    expect(state.options?.filter((option) => option.isMine)).toHaveLength(1);
  });

  it("rejects the truth and duplicate lies", () => {
    const fixture = makeRoom(2);
    const { room, players } = fixture;
    const answer = room.currentPrompt?.answer;
    if (!answer) throw new Error("missing prompt");

    expect(() => room.submitLie(players[0].id, answer, 1000)).toThrowError(RoomError);

    room.submitLie(players[0].id, "Same Lie", 1000);
    try {
      room.submitLie(players[1].id, " same   lie ", 1000);
      throw new Error("expected duplicate rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(RoomError);
      expect((error as RoomError).code).toBe("DUPLICATE_LIE");
    }
  });

  it("blocks voting for your own lie", () => {
    const fixture = makeRoom(2);
    submitAll(fixture, 1000);
    const player = fixture.players[0];
    const ownOption = optionFor(fixture, player.id);

    try {
      fixture.room.vote(player.id, ownOption, 1200);
      throw new Error("expected self-vote rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(RoomError);
      expect((error as RoomError).code).toBe("SELF_VOTE");
    }
  });

  it("auto-caps missing players when writing time runs out", () => {
    const fixture = makeRoom(3);
    const { room } = fixture;
    room.submitLie(fixture.players[0].id, "a very specific lie", 1000);

    expect(room.tick(60001)).toBe(true);
    expect(room.phase).toBe("voting");
    expect(room.options.filter((option) => option.autoCap)).toHaveLength(2);

    expect(room.tick(85002)).toBe(true);
    expect(room.phase).toBe("reveal");
    expect(room.reveal?.answers.filter((answer) => answer.autoCap)).toHaveLength(2);
  });

  it("pauses when a two-player room loses a connection and resumes on reconnect", () => {
    const fixture = makeRoom(2);
    const { room } = fixture;
    const player = fixture.players[1];

    room.disconnect(player.id, "socket-1", 1000);
    expect(room.paused).toBe(true);
    const pausedState = room.buildState(fixture.players[0].id, 1000);
    expect(pausedState.phaseEndsAt).toBeNull();
    expect(pausedState.pausedRemainingMs).toBe(59000);

    const { player: reconnected } = room.reconnect(player.token, "socket-1b", 2000);
    expect(reconnected.connected).toBe(true);
    expect(room.paused).toBe(false);
    expect(room.buildState(fixture.players[0].id, 2000).phaseEndsAt).toBe(61000);
  });

  it("transfers host and ends a two-player match when a seat is removed", () => {
    const fixture = makeRoom(2);
    const { room, host } = fixture;
    const other = fixture.players[1];

    room.disconnect(host.id, "socket-0", 1000);
    expect(room.hostId).toBe(other.id);

    const { player: reconnected } = room.reconnect(host.token, "socket-0b", 2000);
    expect(reconnected.id).toBe(host.id);
    expect(room.hostId).toBe(other.id);

    room.removePlayer(host.id, 3000);
    expect(room.phase).toBe("ended");
    expect(room.matchEndReason).toBe("room-empty");
  });

  it("holds reveal for a moment before the host can skip", () => {
    const fixture = makeRoom(2);
    submitAll(fixture, 1000);
    const truthId = fixture.room.truthOptionId;
    if (!truthId) throw new Error("missing truth");
    const lie = optionFor(fixture, fixture.players[0].id);
    fixture.room.vote(fixture.players[0].id, truthId, 1200);
    fixture.room.vote(fixture.players[1].id, lie, 1200);

    expect(fixture.room.phase).toBe("reveal");
    expect(() => fixture.room.skipReveal(fixture.host.id, 1500)).toThrowError(RoomError);
    expect(fixture.room.skipReveal(fixture.host.id, 4000)).toBe(true);
    expect(fixture.room.round).toBe(2);
  });

  it("rejects a bad reconnect token", () => {
    const fixture = makeRoom(2);
    expect(() =>
      fixture.room.reconnect("0".repeat(64), "socket-x", 1000),
    ).toThrowError(RoomError);
  });
});
