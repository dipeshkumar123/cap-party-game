import type {
  ActionResult,
  PublicState,
  ReactionBroadcast,
  ReactionKey,
  SessionInfo,
  SessionResult,
} from "../shared/types";

export interface GameView {
  state: PublicState;
  receivedAt: number;
}

export interface FloatingReaction extends ReactionBroadcast {
  receivedAt: number;
}

export type ConnectionState = "connecting" | "connected" | "offline";

export interface GameActions {
  start: () => Promise<ActionResult>;
  kick: (playerId: string) => Promise<ActionResult>;
  leave: () => Promise<ActionResult>;
  rematch: () => Promise<ActionResult>;
  lobby: () => Promise<ActionResult>;
  skipReveal: () => Promise<ActionResult>;
  submitLie: (text: string) => Promise<ActionResult>;
  vote: (optionId: string) => Promise<ActionResult>;
  react: (reaction: ReactionKey) => Promise<ActionResult>;
}

export interface CapConnection {
  view: GameView | null;
  session: StoredSession | null;
  connection: ConnectionState;
  restoring: boolean;
  reactions: FloatingReaction[];
  notice: string | null;
  createRoom: (name: string, avatar: number) => Promise<SessionResult>;
  joinRoom: (code: string, name: string, avatar: number) => Promise<SessionResult>;
  clearNotice: () => void;
  dismissRestore: () => void;
  actions: GameActions;
}

export interface StoredSession extends SessionInfo {
  savedAt: number;
}

export type ToastTone = "info" | "success" | "error";

export interface ToastInput {
  message: string;
  tone?: ToastTone;
}

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface Notify {
  (message: string, tone?: ToastTone): void;
}
