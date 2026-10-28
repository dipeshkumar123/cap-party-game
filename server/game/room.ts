import { randomBytes, randomInt, randomUUID } from "crypto";
import type {
  Award,
  Category,
  MatchEndReason,
  Phase,
  PromptView,
  PublicOption,
  PublicPlayer,
  PublicState,
  RevealAnswer,
  RevealState,
  RoundDelta,
  ScoreboardEntry,
  YouState,
} from "../../shared/types";
import { MAX_LIE_LENGTH, MAX_PLAYERS, TOTAL_ROUNDS } from "../../shared/types";
import type { Prompt } from "./content";

const BASE_TRUTH = 1000;
const BASE_FOOLED = 500;
const BASE_PERFECT = 1000;
const MULTIPLIERS = [1, 1, 2, 2, 3];
const MIN_REVEAL_HOLD_MS = 1500;

export interface RoomConfig {
  writingMs: number;
  votingMs: number;
  revealMs: number;
  maxPlayers: number;
  totalRounds: number;
  disconnectGraceMs: number;
  pausedRoomTimeoutMs: number;
  prompts: Prompt[];
}

export interface PlayerInternal {
  id: string;
  token: string;
  name: string;
  avatar: number;
  joinedAt: number;
  connected: boolean;
  socketId: string | null;
  disconnectedAt: number | null;
  score: number;
  truthFinds: number;
  votesFooled: number;
  perfectCaps: number;
  truthStreak: number;
  hasSubmitted: boolean;
  hasVoted: boolean;
  lie: string | null;
  autoCap: boolean;
  voteOptionId: string | null;
}

interface OptionInternal {
  id: string;
  text: string;
  authorId: string | null;
  authorName: string | null;
  authorAvatar: number | null;
  autoCap: boolean;
}

export class RoomError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RoomError";
    this.code = code;
  }
}

function normalizeForCompare(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function sanitizeLie(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LIE_LENGTH);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    const value = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = value;
  }
  return copy;
}

function pickPrompts(pool: Prompt[], count: number, used: Set<string>): Prompt[] {
  if (pool.length < count) {
    throw new RoomError("CONTENT_ERROR", "Not enough prompts are configured.");
  }

  let available = pool.filter((prompt) => !used.has(prompt.id));
  if (available.length < count) {
    used.clear();
    available = [...pool];
  }

  const byCategory = new Map<Category, Prompt[]>();
  for (const prompt of available) {
    const list = byCategory.get(prompt.category) ?? [];
    list.push(prompt);
    byCategory.set(prompt.category, list);
  }

  const categories = shuffle([...byCategory.keys()]);
  const picks: Prompt[] = [];

  for (const category of categories) {
    if (picks.length >= count) break;
    const options = byCategory.get(category);
    if (!options || options.length === 0) continue;
    picks.push(options[randomInt(options.length)]);
  }

  if (picks.length < count) {
    const remaining = shuffle(available.filter((prompt) => !picks.includes(prompt)));
    while (picks.length < count && remaining.length > 0) {
      const next = remaining.pop();
      if (next) picks.push(next);
    }
  }

  return shuffle(picks);
}

export class Room {
  readonly code: string;
  readonly config: RoomConfig;
  readonly createdAt: number;
  lastActivityAt: number;
  phase: Phase;
  round: number;
  multiplier: number;
  hostId: string | null;
  players: Map<string, PlayerInternal>;
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  paused: boolean;
  pausedAt: number | null;
  pausedRemainingMs: number | null;
  matchEndReason: MatchEndReason;
  currentPrompt: Prompt | null;
  matchPrompts: Prompt[];
  usedPromptIds: Set<string>;
  options: OptionInternal[];
  truthOptionId: string | null;
  reveal: RevealState | null;

  constructor(code: string, config: RoomConfig, now: number) {
    this.code = code;
    this.config = config;
    this.createdAt = now;
    this.lastActivityAt = now;
    this.phase = "lobby";
    this.round = 0;
    this.multiplier = 1;
    this.hostId = null;
    this.players = new Map();
    this.phaseStartedAt = now;
    this.phaseEndsAt = null;
    this.paused = false;
    this.pausedAt = null;
    this.pausedRemainingMs = null;
    this.matchEndReason = null;
    this.currentPrompt = null;
    this.matchPrompts = [];
    this.usedPromptIds = new Set();
    this.options = [];
    this.truthOptionId = null;
    this.reveal = null;
  }

  get playerCount(): number {
    return this.players.size;
  }

  get connectedCount(): number {
    let count = 0;
    for (const player of this.players.values()) {
      if (player.connected) count += 1;
    }
    return count;
  }

  addPlayer(name: string, avatar: number, socketId: string, now: number): PlayerInternal {
    if (this.players.size >= this.config.maxPlayers) {
      throw new RoomError("ROOM_FULL", "This room already has 8 players.");
    }
    const lowered = name.toLowerCase();
    for (const player of this.players.values()) {
      if (player.name.toLowerCase() === lowered) {
        throw new RoomError("NAME_TAKEN", "That name is already in the room.");
      }
    }

    const player: PlayerInternal = {
      id: randomUUID(),
      token: randomBytes(32).toString("hex"),
      name,
      avatar,
      joinedAt: now,
      connected: true,
      socketId,
      disconnectedAt: null,
      score: 0,
      truthFinds: 0,
      votesFooled: 0,
      perfectCaps: 0,
      truthStreak: 0,
      hasSubmitted: false,
      hasVoted: false,
      lie: null,
      autoCap: false,
      voteOptionId: null,
    };

    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    this.lastActivityAt = now;
    return player;
  }

  reconnect(
    token: string,
    socketId: string,
    now: number,
  ): { player: PlayerInternal; replacedSocketId: string | null } {
    const player = this.findPlayerByToken(token);
    if (!player) {
      throw new RoomError("SESSION_NOT_FOUND", "That session has expired. Rejoin from the lobby.");
    }

    const replacedSocketId =
      player.socketId && player.socketId !== socketId ? player.socketId : null;
    player.socketId = socketId;
    player.connected = true;
    player.disconnectedAt = null;
    this.lastActivityAt = now;

    if (!this.hostId) this.hostId = player.id;
    if (this.paused && this.connectedCount >= 2) this.resume(now);
    return { player, replacedSocketId };
  }

  disconnect(playerId: string, socketId: string, now: number): boolean {
    const player = this.players.get(playerId);
    if (!player || player.socketId !== socketId) return false;

    player.connected = false;
    player.socketId = null;
    player.disconnectedAt = now;
    this.transferHostIfNeeded(playerId);
    this.lastActivityAt = now;

    if (this.isActivePhase() && this.connectedCount < 2) {
      this.pause(now);
    }
    return true;
  }

  removePlayer(playerId: string, now: number): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    this.players.delete(playerId);
    this.transferHostIfNeeded(playerId);
    this.lastActivityAt = now;

    if (this.isActivePhase() && this.players.size < 2) {
      this.endMatch("room-empty", now);
    }
    return this.players.size === 0;
  }

  kick(hostId: string, targetId: string, now: number): PlayerInternal {
    if (this.phase !== "lobby") {
      throw new RoomError("WRONG_PHASE", "Players can only be removed in the lobby.");
    }
    if (hostId !== this.hostId) {
      throw new RoomError("NOT_HOST", "Only the host can remove players.");
    }
    if (targetId === hostId) {
      throw new RoomError("INVALID_TARGET", "The host cannot remove themselves.");
    }
    const target = this.players.get(targetId);
    if (!target) {
      throw new RoomError("PLAYER_NOT_FOUND", "That player is no longer in the room.");
    }
    this.removePlayer(targetId, now);
    return target;
  }

  startMatch(hostId: string, now: number): boolean {
    if (this.phase !== "lobby") {
      throw new RoomError("WRONG_PHASE", "The match is already running.");
    }
    if (hostId !== this.hostId) {
      throw new RoomError("NOT_HOST", "Only the host can start the match.");
    }
    if (this.connectedCount < 2) {
      throw new RoomError("NOT_ENOUGH_PLAYERS", "At least 2 players need to be connected.");
    }
    return this.beginMatch(now);
  }

  rematch(hostId: string, now: number): boolean {
    if (this.phase !== "ended") {
      throw new RoomError("WRONG_PHASE", "The match has not finished yet.");
    }
    if (hostId !== this.hostId) {
      throw new RoomError("NOT_HOST", "Only the host can start a rematch.");
    }
    if (this.connectedCount < 2) {
      throw new RoomError("NOT_ENOUGH_PLAYERS", "At least 2 players need to be connected.");
    }
    return this.beginMatch(now);
  }

  returnToLobby(hostId: string, now: number): boolean {
    if (this.phase !== "ended") {
      throw new RoomError("WRONG_PHASE", "The match is still running.");
    }
    if (hostId !== this.hostId) {
      throw new RoomError("NOT_HOST", "Only the host can return the room to the lobby.");
    }

    for (const player of this.players.values()) {
      this.resetPlayerForMatch(player);
    }
    this.phase = "lobby";
    this.round = 0;
    this.multiplier = 1;
    this.phaseStartedAt = now;
    this.phaseEndsAt = null;
    this.paused = false;
    this.pausedAt = null;
    this.pausedRemainingMs = null;
    this.matchEndReason = null;
    this.currentPrompt = null;
    this.matchPrompts = [];
    this.options = [];
    this.truthOptionId = null;
    this.reveal = null;
    this.lastActivityAt = now;
    return true;
  }

  submitLie(playerId: string, rawText: string, now: number): boolean {
    if (this.phase !== "writing") {
      throw new RoomError("WRONG_PHASE", "The writing window is closed.");
    }
    const player = this.players.get(playerId);
    if (!player) throw new RoomError("PLAYER_NOT_FOUND", "You are not in this room.");
    if (player.hasSubmitted) {
      throw new RoomError("ALREADY_SUBMITTED", "Your lie is already locked in.");
    }
    if (!this.currentPrompt) {
      throw new RoomError("NO_PROMPT", "No prompt is active.");
    }

    const text = sanitizeLie(rawText);
    if (!text || !normalizeForCompare(text)) {
      throw new RoomError("EMPTY_LIE", "Write an actual lie.");
    }
    if (text.length > MAX_LIE_LENGTH) {
      throw new RoomError("LIE_TOO_LONG", `Keep it under ${MAX_LIE_LENGTH} characters.`);
    }

    const normalized = normalizeForCompare(text);
    if (normalized === normalizeForCompare(this.currentPrompt.answer)) {
      throw new RoomError("TRUTH_GUARD", "That one is already on the board. Cap harder.");
    }
    for (const other of this.players.values()) {
      if (other.id !== playerId && other.lie && normalizeForCompare(other.lie) === normalized) {
        throw new RoomError("DUPLICATE_LIE", "Someone already capped that. Try another.");
      }
    }

    player.lie = text;
    player.autoCap = false;
    player.hasSubmitted = true;
    this.lastActivityAt = now;

    const allSubmitted = [...this.players.values()].every((entry) => entry.hasSubmitted);
    if (allSubmitted) this.startVoting(now);
    return true;
  }

  vote(playerId: string, optionId: string, now: number): boolean {
    if (this.phase !== "voting") {
      throw new RoomError("WRONG_PHASE", "Voting is closed.");
    }
    const player = this.players.get(playerId);
    if (!player) throw new RoomError("PLAYER_NOT_FOUND", "You are not in this room.");
    if (player.hasVoted) {
      throw new RoomError("ALREADY_VOTED", "Your vote is already locked in.");
    }
    const option = this.options.find((entry) => entry.id === optionId);
    if (!option) {
      throw new RoomError("OPTION_NOT_FOUND", "That answer is no longer available.");
    }
    if (option.authorId === playerId) {
      throw new RoomError("SELF_VOTE", "You cannot vote for your own lie.");
    }

    player.voteOptionId = option.id;
    player.hasVoted = true;
    this.lastActivityAt = now;

    const allVoted = [...this.players.values()].every((entry) => entry.hasVoted);
    if (allVoted) this.startReveal(now);
    return true;
  }

  skipReveal(hostId: string, now: number): boolean {
    if (this.phase !== "reveal") {
      throw new RoomError("WRONG_PHASE", "There is no reveal to skip.");
    }
    if (this.paused) {
      throw new RoomError("ROOM_PAUSED", "The room is waiting for a player to reconnect.");
    }
    if (hostId !== this.hostId) {
      throw new RoomError("NOT_HOST", "Only the host can move the room along.");
    }
    if (this.phaseStartedAt !== null && now - this.phaseStartedAt < MIN_REVEAL_HOLD_MS) {
      throw new RoomError("TOO_SOON", "Give the room a second to read it.");
    }
    return this.advanceFromReveal(now);
  }

  tick(now: number): boolean {
    let changed = false;

    const expiredDisconnects = [...this.players.values()]
      .filter(
        (player) =>
          !player.connected &&
          player.disconnectedAt !== null &&
          now - player.disconnectedAt >= this.config.disconnectGraceMs,
      )
      .map((player) => player.id);

    for (const playerId of expiredDisconnects) {
      this.removePlayer(playerId, now);
      changed = true;
    }

    if (this.players.size === 0) return changed;
    if (this.phase === "lobby" || this.phase === "ended") return changed;

    if (this.players.size < 2) {
      this.endMatch("room-empty", now);
      return true;
    }

    if (this.paused) {
      if (this.connectedCount >= 2) {
        this.resume(now);
        changed = true;
      } else if (
        this.pausedAt !== null &&
        now - this.pausedAt >= this.config.pausedRoomTimeoutMs
      ) {
        this.endMatch("room-empty", now);
        changed = true;
      }
      return changed;
    }

    if (this.connectedCount < 2) {
      this.pause(now);
      return true;
    }

    if (this.phaseEndsAt !== null && now >= this.phaseEndsAt) {
      if (this.phase === "writing") {
        this.startVoting(now);
        changed = true;
      } else if (this.phase === "voting") {
        this.startReveal(now);
        changed = true;
      } else if (this.phase === "reveal") {
        this.advanceFromReveal(now);
        changed = true;
      }
    }

    return changed;
  }

  buildState(playerId: string, now: number): PublicState {
    const player = this.players.get(playerId);
    if (!player) throw new RoomError("PLAYER_NOT_FOUND", "You are not in this room.");

    const scoreboard = this.getScoreboard();
    const players = [...this.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map<PublicPlayer>((entry) => this.publicPlayer(entry));

    const you: YouState = {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      isHost: player.id === this.hostId,
      lieSubmitted: player.hasSubmitted,
      lieText: player.hasSubmitted ? player.lie : null,
      voteOptionId: player.voteOptionId,
      hasVoted: player.hasVoted,
      canSkipReveal: player.id === this.hostId && this.phase === "reveal",
    };

    let prompt: PromptView | null = null;
    if ((this.phase === "writing" || this.phase === "voting") && this.currentPrompt) {
      prompt = { category: this.currentPrompt.category, text: this.currentPrompt.text };
    }

    let options: PublicOption[] | null = null;
    if (this.phase === "voting") {
      options = this.options.map((option) => ({
        id: option.id,
        text: option.text,
        isMine: option.authorId === player.id,
      }));
    }

    const ended = this.phase === "ended";
    const reveal = this.phase === "reveal" ? this.reveal : null;
    const winnerIds = ended ? this.computeWinnerIds(scoreboard) : null;
    const awards = ended ? this.computeAwards() : null;

    return {
      code: this.code,
      phase: this.phase,
      round: this.round,
      totalRounds: this.config.totalRounds,
      multiplier: this.multiplier,
      serverNow: now,
      phaseStartedAt: this.phaseStartedAt,
      phaseEndsAt: this.paused ? null : this.phaseEndsAt,
      phaseDurationMs: this.phaseDuration(),
      paused: this.paused,
      pausedRemainingMs: this.pausedRemainingMs,
      maxPlayers: this.config.maxPlayers,
      hostId: this.hostId,
      players,
      scoreboard,
      winnerIds,
      awards,
      matchEndReason: this.matchEndReason,
      prompt,
      options,
      reveal,
      you,
    };
  }

  findPlayerByToken(token: string): PlayerInternal | null {
    for (const player of this.players.values()) {
      if (player.token === token) return player;
    }
    return null;
  }

  private beginMatch(now: number): boolean {
    this.phaseStartedAt = now;
    this.phaseEndsAt = null;
    this.paused = false;
    this.pausedAt = null;
    this.pausedRemainingMs = null;
    this.matchEndReason = null;
    this.round = 0;
    this.reveal = null;
    this.options = [];
    this.truthOptionId = null;

    for (const player of this.players.values()) {
      this.resetPlayerForMatch(player);
    }

    this.matchPrompts = pickPrompts(this.config.prompts, this.config.totalRounds, this.usedPromptIds);
    for (const prompt of this.matchPrompts) this.usedPromptIds.add(prompt.id);

    this.startRound(1, now);
    return true;
  }

  private startRound(round: number, now: number): void {
    this.round = round;
    this.multiplier = MULTIPLIERS[round - 1] ?? 1;
    this.currentPrompt = this.matchPrompts[round - 1] ?? null;
    this.options = [];
    this.truthOptionId = null;
    this.reveal = null;
    this.phase = "writing";
    this.phaseStartedAt = now;
    this.phaseEndsAt = now + this.config.writingMs;
    this.paused = false;
    this.pausedAt = null;
    this.pausedRemainingMs = null;
    this.lastActivityAt = now;

    for (const player of this.players.values()) {
      player.hasSubmitted = false;
      player.hasVoted = false;
      player.lie = null;
      player.autoCap = false;
      player.voteOptionId = null;
    }

    if (!this.currentPrompt) {
      this.endMatch("room-empty", now);
    }
  }

  private startVoting(now: number): void {
    if (this.phase !== "writing" || !this.currentPrompt) return;
    if (this.players.size < 2) {
      this.endMatch("room-empty", now);
      return;
    }

    for (const player of this.players.values()) {
      if (!player.hasSubmitted) this.assignHouseCap(player);
    }

    const options: OptionInternal[] = [];
    for (const player of this.players.values()) {
      if (!player.lie) continue;
      options.push({
        id: randomUUID(),
        text: player.lie,
        authorId: player.id,
        authorName: player.name,
        authorAvatar: player.avatar,
        autoCap: player.autoCap,
      });
    }
    const truthOption: OptionInternal = {
      id: randomUUID(),
      text: this.currentPrompt.answer,
      authorId: null,
      authorName: null,
      authorAvatar: null,
      autoCap: false,
    };
    this.options = shuffle([...options, truthOption]);
    this.truthOptionId = truthOption.id;
    this.phase = "voting";
    this.phaseStartedAt = now;
    this.phaseEndsAt = now + this.config.votingMs;
    this.lastActivityAt = now;

    for (const player of this.players.values()) {
      player.hasVoted = false;
      player.voteOptionId = null;
    }
  }

  private startReveal(now: number): void {
    if (this.phase !== "voting" || !this.currentPrompt || !this.truthOptionId) return;
    if (this.players.size < 2) {
      this.endMatch("room-empty", now);
      return;
    }

    const players = [...this.players.values()];
    const votersByOption = new Map<string, PlayerInternal[]>();
    for (const player of players) {
      if (!player.voteOptionId) continue;
      const option = this.options.find((entry) => entry.id === player.voteOptionId);
      if (!option) continue;
      const voters = votersByOption.get(option.id) ?? [];
      voters.push(player);
      votersByOption.set(option.id, voters);
    }

    const truthVoters = new Set((votersByOption.get(this.truthOptionId) ?? []).map((p) => p.id));
    const deltas = new Map<string, RoundDelta>();
    for (const player of players) {
      deltas.set(player.id, {
        playerId: player.id,
        name: player.name,
        avatar: player.avatar,
        points: 0,
        truth: false,
        fooled: 0,
        perfect: false,
      });
    }

    for (const player of players) {
      const delta = deltas.get(player.id);
      if (!delta) continue;
      if (truthVoters.has(player.id)) {
        const points = BASE_TRUTH * this.multiplier;
        player.score += points;
        player.truthFinds += 1;
        player.truthStreak += 1;
        delta.points += points;
        delta.truth = true;
      } else {
        player.truthStreak = 0;
      }
    }

    const answers: RevealAnswer[] = this.options.map((option) => {
      const voters = votersByOption.get(option.id) ?? [];
      if (option.id === this.truthOptionId) {
        return {
          id: option.id,
          text: option.text,
          isTruth: true,
          authorId: null,
          authorName: null,
          authorAvatar: null,
          autoCap: false,
          votes: voters.map((voter) => ({
            playerId: voter.id,
            name: voter.name,
            avatar: voter.avatar,
          })),
          perfect: false,
          points: 0,
        };
      }

      const author = option.authorId ? this.players.get(option.authorId) : null;
      const perfect =
        Boolean(author) && players.length > 1 && voters.length === players.length - 1;
      const points = author
        ? (voters.length * BASE_FOOLED + (perfect ? BASE_PERFECT : 0)) * this.multiplier
        : 0;

      if (author) {
        author.score += points;
        author.votesFooled += voters.length;
        if (perfect) author.perfectCaps += 1;
        const delta = deltas.get(author.id);
        if (delta) {
          delta.points += points;
          delta.fooled += voters.length;
          delta.perfect = delta.perfect || perfect;
        }
      }

      return {
        id: option.id,
        text: option.text,
        isTruth: false,
        authorId: option.authorId,
        authorName: option.authorName,
        authorAvatar: option.authorAvatar,
        autoCap: option.autoCap,
        votes: voters.map((voter) => ({
          playerId: voter.id,
          name: voter.name,
          avatar: voter.avatar,
        })),
        perfect,
        points,
      };
    });

    const anyPerfect = answers.some((answer) => answer.perfect);
    let headline = "The truth always comes out.";
    if (truthVoters.size === 0) {
      headline = "The room got capped.";
    } else if (truthVoters.size === players.length) {
      headline = "Suspiciously well-read.";
    } else if (anyPerfect) {
      headline = "A certified perfect cap.";
    }

    const factText = this.currentPrompt.text.replace("_____", this.currentPrompt.answer);

    this.reveal = {
      truth: this.currentPrompt.answer,
      factText,
      sourceLabel: this.currentPrompt.sourceLabel,
      sourceUrl: this.currentPrompt.sourceUrl,
      funFact: this.currentPrompt.funFact,
      answers,
      deltas: [...deltas.values()],
      headline,
      startedAt: now,
    };

    this.phase = "reveal";
    this.phaseStartedAt = now;
    this.phaseEndsAt = now + this.config.revealMs;
    this.lastActivityAt = now;
  }

  private advanceFromReveal(now: number): boolean {
    if (this.phase !== "reveal") return false;
    if (this.round < this.config.totalRounds) {
      this.startRound(this.round + 1, now);
      return true;
    }
    this.endMatch("completed", now);
    return true;
  }

  private endMatch(reason: MatchEndReason, now: number): void {
    this.phase = "ended";
    this.phaseStartedAt = now;
    this.phaseEndsAt = null;
    this.paused = false;
    this.pausedAt = null;
    this.pausedRemainingMs = null;
    this.matchEndReason = reason;
    this.lastActivityAt = now;
  }

  private assignHouseCap(player: PlayerInternal): void {
    if (!this.currentPrompt) return;
    const used = new Set<string>();
    for (const other of this.players.values()) {
      if (other.lie) used.add(normalizeForCompare(other.lie));
    }
    used.add(normalizeForCompare(this.currentPrompt.answer));

    let chosen = this.currentPrompt.decoys.find(
      (decoy) => !used.has(normalizeForCompare(decoy)),
    );
    if (!chosen) {
      const base = this.currentPrompt.decoys[0] ?? "a mystery";
      let suffix = 1;
      chosen = base;
      while (used.has(normalizeForCompare(chosen))) {
        chosen = `${base} ${suffix}`;
        suffix += 1;
      }
    }

    player.lie = sanitizeLie(chosen);
    player.autoCap = true;
    player.hasSubmitted = true;
  }

  private pause(now: number): void {
    if (this.paused || !this.isActivePhase()) return;
    this.pausedRemainingMs = Math.max(0, (this.phaseEndsAt ?? now) - now);
    this.phaseEndsAt = null;
    this.paused = true;
    this.pausedAt = now;
    this.lastActivityAt = now;
  }

  private resume(now: number): void {
    if (!this.paused) return;
    const remaining = this.pausedRemainingMs ?? 0;
    this.phaseEndsAt = now + remaining;
    this.paused = false;
    this.pausedAt = null;
    this.pausedRemainingMs = null;
    this.lastActivityAt = now;
  }

  private transferHostIfNeeded(removedPlayerId: string): void {
    if (this.hostId !== removedPlayerId) return;
    const candidates = [...this.players.values()]
      .filter((player) => player.id !== removedPlayerId)
      .sort((a, b) => {
        if (a.connected !== b.connected) return a.connected ? -1 : 1;
        return a.joinedAt - b.joinedAt;
      });
    this.hostId = candidates[0]?.id ?? null;
  }

  private resetPlayerForMatch(player: PlayerInternal): void {
    player.score = 0;
    player.truthFinds = 0;
    player.votesFooled = 0;
    player.perfectCaps = 0;
    player.truthStreak = 0;
    player.hasSubmitted = false;
    player.hasVoted = false;
    player.lie = null;
    player.autoCap = false;
    player.voteOptionId = null;
  }

  private publicPlayer(player: PlayerInternal): PublicPlayer {
    return {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      connected: player.connected,
      isHost: player.id === this.hostId,
      score: player.score,
      truthFinds: player.truthFinds,
      votesFooled: player.votesFooled,
      perfectCaps: player.perfectCaps,
      truthStreak: player.truthStreak,
      submitted: player.hasSubmitted,
      voted: player.hasVoted,
    };
  }

  private getScoreboard(): ScoreboardEntry[] {
    const players = [...this.players.values()].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.truthFinds !== a.truthFinds) return b.truthFinds - a.truthFinds;
      if (b.votesFooled !== a.votesFooled) return b.votesFooled - a.votesFooled;
      if (b.perfectCaps !== a.perfectCaps) return b.perfectCaps - a.perfectCaps;
      return a.joinedAt - b.joinedAt;
    });

    let previousKey: string | null = null;
    let rank = 0;
    return players.map((player, index) => {
      const key = [
        player.score,
        player.truthFinds,
        player.votesFooled,
        player.perfectCaps,
      ].join(":");
      if (key !== previousKey) {
        rank = index + 1;
        previousKey = key;
      }
      return {
        playerId: player.id,
        name: player.name,
        avatar: player.avatar,
        score: player.score,
        rank,
        truthFinds: player.truthFinds,
        votesFooled: player.votesFooled,
        perfectCaps: player.perfectCaps,
        connected: player.connected,
        isHost: player.id === this.hostId,
      };
    });
  }

  private computeWinnerIds(scoreboard: ScoreboardEntry[]): string[] {
    if (scoreboard.length === 0) return [];
    const topScore = Math.max(...scoreboard.map((entry) => entry.score));
    let candidates = scoreboard.filter((entry) => entry.score === topScore);

    const metrics: Array<keyof Pick<ScoreboardEntry, "truthFinds" | "votesFooled" | "perfectCaps">> = [
      "truthFinds",
      "votesFooled",
      "perfectCaps",
    ];

    for (const metric of metrics) {
      if (candidates.length <= 1) break;
      const best = Math.max(...candidates.map((entry) => entry[metric]));
      candidates = candidates.filter((entry) => entry[metric] === best);
    }

    return candidates.map((entry) => entry.playerId);
  }

  private computeAwards(): Award[] {
    const awards: Award[] = [];
    const groups: Array<{
      key: Award["key"];
      label: string;
      description: string;
      value: (entry: ScoreboardEntry) => number;
    }> = [
      {
        key: "truth",
        label: "Truth Seeker",
        description: "Found the truth most often.",
        value: (entry) => entry.truthFinds,
      },
      {
        key: "liar",
        label: "Biggest Liar",
        description: "Fooled the most votes.",
        value: (entry) => entry.votesFooled,
      },
      {
        key: "perfect",
        label: "Perfect Cap",
        description: "Pulled off the cleanest deception.",
        value: (entry) => entry.perfectCaps,
      },
    ];

    const scoreboard = this.getScoreboard();
    for (const group of groups) {
      if (scoreboard.length === 0) continue;
      const max = Math.max(...scoreboard.map(group.value));
      if (max <= 0) continue;
      awards.push({
        key: group.key,
        label: group.label,
        description: group.description,
        playerIds: scoreboard.filter((entry) => group.value(entry) === max).map((entry) => entry.playerId),
      });
    }

    return awards;
  }

  private phaseDuration(): number | null {
    if (this.phase === "writing") return this.config.writingMs;
    if (this.phase === "voting") return this.config.votingMs;
    if (this.phase === "reveal") return this.config.revealMs;
    return null;
  }

  private isActivePhase(): boolean {
    return this.phase === "writing" || this.phase === "voting" || this.phase === "reveal";
  }
}

export function defaultRoomConfig(prompts: Prompt[]): RoomConfig {
  return {
    writingMs: Number(process.env.WRITING_MS ?? 60000),
    votingMs: Number(process.env.VOTING_MS ?? 25000),
    revealMs: Number(process.env.REVEAL_MS ?? 14000),
    maxPlayers: MAX_PLAYERS,
    totalRounds: TOTAL_ROUNDS,
    disconnectGraceMs: 120000,
    pausedRoomTimeoutMs: 300000,
    prompts,
  };
}
