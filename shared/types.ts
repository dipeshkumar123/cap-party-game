export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const TOTAL_ROUNDS = 5;
export const MAX_LIE_LENGTH = 60;
export const MAX_NAME_LENGTH = 16;

export type Phase = "lobby" | "writing" | "voting" | "reveal" | "ended";

export type ReactionKey = "skull" | "cry" | "eyes" | "fire";

export const REACTION_KEYS: ReactionKey[] = ["skull", "cry", "eyes", "fire"];

export type Category =
  | "Animals"
  | "Food"
  | "Words"
  | "History"
  | "Geography"
  | "Space"
  | "Nature"
  | "Tech"
  | "Culture";

export interface PromptView {
  category: Category;
  text: string;
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: number;
  connected: boolean;
  isHost: boolean;
  score: number;
  truthFinds: number;
  votesFooled: number;
  perfectCaps: number;
  truthStreak: number;
  submitted: boolean;
  voted: boolean;
}

export interface PublicOption {
  id: string;
  text: string;
  isMine: boolean;
}

export interface RevealVote {
  playerId: string;
  name: string;
  avatar: number;
}

export interface RevealAnswer {
  id: string;
  text: string;
  isTruth: boolean;
  authorId: string | null;
  authorName: string | null;
  authorAvatar: number | null;
  autoCap: boolean;
  votes: RevealVote[];
  perfect: boolean;
  points: number;
}

export interface RoundDelta {
  playerId: string;
  name: string;
  avatar: number;
  points: number;
  truth: boolean;
  fooled: number;
  perfect: boolean;
}

export interface RevealState {
  truth: string;
  factText: string;
  sourceLabel: string;
  sourceUrl: string;
  funFact: string | null;
  answers: RevealAnswer[];
  deltas: RoundDelta[];
  headline: string;
  startedAt: number;
}

export interface ScoreboardEntry {
  playerId: string;
  name: string;
  avatar: number;
  score: number;
  rank: number;
  truthFinds: number;
  votesFooled: number;
  perfectCaps: number;
  connected: boolean;
  isHost: boolean;
}

export interface Award {
  key: "truth" | "liar" | "perfect";
  label: string;
  description: string;
  playerIds: string[];
}

export interface YouState {
  id: string;
  name: string;
  avatar: number;
  isHost: boolean;
  lieSubmitted: boolean;
  lieText: string | null;
  voteOptionId: string | null;
  hasVoted: boolean;
  canSkipReveal: boolean;
}

export type MatchEndReason = "completed" | "room-empty" | null;

export interface PublicState {
  code: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  multiplier: number;
  serverNow: number;
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  phaseDurationMs: number | null;
  paused: boolean;
  pausedRemainingMs: number | null;
  maxPlayers: number;
  hostId: string | null;
  players: PublicPlayer[];
  scoreboard: ScoreboardEntry[];
  winnerIds: string[] | null;
  awards: Award[] | null;
  matchEndReason: MatchEndReason;
  prompt: PromptView | null;
  options: PublicOption[] | null;
  reveal: RevealState | null;
  you: YouState;
}

export interface GameErrorPayload {
  code: string;
  message: string;
}

export type ActionResult =
  | { ok: true }
  | { ok: false; error: GameErrorPayload };

export interface SessionInfo {
  roomCode: string;
  playerId: string;
  token: string;
}

export type SessionResult =
  | { ok: true; session: SessionInfo }
  | { ok: false; error: GameErrorPayload };

export interface CreateRoomPayload {
  name: string;
  avatar: number;
}

export interface JoinRoomPayload {
  code: string;
  name: string;
  avatar: number;
}

export interface ReconnectPayload {
  code: string;
  token: string;
}

export interface LiePayload {
  text: string;
}

export interface VotePayload {
  optionId: string;
}

export interface KickPayload {
  playerId: string;
}

export interface ReactionPayload {
  reaction: ReactionKey;
}

export interface ReactionBroadcast {
  id: string;
  playerId: string;
  name: string;
  avatar: number;
  reaction: ReactionKey;
}

export type RoomClosedReason = "expired" | "kicked" | "server-closed";

export interface RoomClosedPayload {
  reason: RoomClosedReason;
  message: string;
}

export interface ClientToServerEvents {
  "room:create": (
    payload: CreateRoomPayload,
    callback: (result: SessionResult) => void,
  ) => void;
  "room:join": (
    payload: JoinRoomPayload,
    callback: (result: SessionResult) => void,
  ) => void;
  "room:reconnect": (
    payload: ReconnectPayload,
    callback: (result: SessionResult) => void,
  ) => void;
  "room:start": (callback: (result: ActionResult) => void) => void;
  "room:kick": (
    payload: KickPayload,
    callback: (result: ActionResult) => void,
  ) => void;
  "room:leave": (callback: (result: ActionResult) => void) => void;
  "room:rematch": (callback: (result: ActionResult) => void) => void;
  "room:lobby": (callback: (result: ActionResult) => void) => void;
  "room:skipReveal": (callback: (result: ActionResult) => void) => void;
  "round:lie": (
    payload: LiePayload,
    callback: (result: ActionResult) => void,
  ) => void;
  "round:vote": (
    payload: VotePayload,
    callback: (result: ActionResult) => void,
  ) => void;
  reaction: (
    payload: ReactionPayload,
    callback: (result: ActionResult) => void,
  ) => void;
}

export interface ServerToClientEvents {
  state: (state: PublicState) => void;
  "cap:error": (error: GameErrorPayload) => void;
  "cap:reaction": (reaction: ReactionBroadcast) => void;
  "cap:session-replaced": () => void;
  "cap:room-closed": (payload: RoomClosedPayload) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  roomCode?: string;
  playerId?: string;
  reactionLockedUntil?: number;
  actionTimes?: number[];
}
