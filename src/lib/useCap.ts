import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ActionResult,
  ClientToServerEvents,
  GameErrorPayload,
  ReactionBroadcast,
  ReactionKey,
  RoomClosedPayload,
  ServerToClientEvents,
  SessionInfo,
  SessionResult,
} from "../../shared/types";
import type {
  CapConnection,
  ConnectionState,
  FloatingReaction,
  GameActions,
  GameView,
  StoredSession,
} from "../types";
import {
  clearSession,
  loadSession,
  roomCodeFromUrl,
  saveSession,
  setRoomInUrl,
} from "./storage";

type CapSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const REQUEST_TIMEOUT = 10_000;
const REACTION_LIFETIME = 2600;

function offlineError(): { ok: false; error: GameErrorPayload } {
  return {
    ok: false,
    error: {
      code: "OFFLINE",
      message: "You are offline. Give it a second to reconnect.",
    },
  };
}

function timeoutError(): { ok: false; error: GameErrorPayload } {
  return {
    ok: false,
    error: {
      code: "TIMEOUT",
      message: "The server took too long. Try that again.",
    },
  };
}

function requestAction(
  socket: CapSocket,
  send: (callback: (result: ActionResult) => void) => void,
): Promise<ActionResult> {
  if (!socket.connected) return Promise.resolve(offlineError());
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(timeoutError());
    }, REQUEST_TIMEOUT);
    send((result) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(result);
    });
  });
}

function requestSession(
  socket: CapSocket,
  send: (callback: (result: SessionResult) => void) => void,
): Promise<SessionResult> {
  if (!socket.connected) return Promise.resolve(offlineError());
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(timeoutError());
    }, REQUEST_TIMEOUT);
    send((result) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(result);
    });
  });
}

function initialSessionState(): { session: StoredSession | null; resume: boolean } {
  const saved = loadSession();
  const urlCode = roomCodeFromUrl();
  if (!saved) return { session: null, resume: false };
  if (urlCode && urlCode !== saved.roomCode) return { session: null, resume: false };
  return { session: saved, resume: true };
}

export function useCap(): CapConnection {
  const socketRef = useRef<CapSocket | null>(null);
  const initial = useRef(initialSessionState());
  const [session, setSession] = useState<StoredSession | null>(initial.current.session);
  const [view, setView] = useState<GameView | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [restoring, setRestoring] = useState(initial.current.resume);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const sessionRef = useRef<StoredSession | null>(initial.current.session);
  const autoResumeRef = useRef(initial.current.resume);
  const reactionTimers = useRef<Map<string, number>>(new Map());

  if (!socketRef.current) {
    socketRef.current = io({
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10_000,
    });
  }

  const applySession = useCallback((info: SessionInfo): void => {
    const stored: StoredSession = { ...info, savedAt: Date.now() };
    sessionRef.current = stored;
    autoResumeRef.current = true;
    setSession(stored);
    saveSession(stored);
    setRoomInUrl(info.roomCode);
    setRestoring(false);
  }, []);

  const forgetSession = useCallback((message?: string): void => {
    sessionRef.current = null;
    autoResumeRef.current = false;
    setSession(null);
    setView(null);
    setRestoring(false);
    setReactions([]);
    clearSession();
    setRoomInUrl(null);
    if (message) setNotice(message);
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onConnect = (): void => {
      setConnection("connected");
      const saved = sessionRef.current;
      if (!saved || !autoResumeRef.current) {
        setRestoring(false);
        return;
      }

      setRestoring(true);
      socket.emit(
        "room:reconnect",
        { code: saved.roomCode, token: saved.token },
        (result) => {
          if (result.ok) {
            applySession(result.session);
            return;
          }
          if (
            result.error.code === "ROOM_NOT_FOUND" ||
            result.error.code === "SESSION_NOT_FOUND"
          ) {
            forgetSession(result.error.message);
            return;
          }
          setRestoring(false);
          setNotice(result.error.message);
        },
      );
    };

    const onDisconnect = (reason: string): void => {
      if (reason === "io client disconnect") return;
      setConnection("offline");
    };

    const onConnectError = (): void => {
      setConnection("offline");
    };

    const onState = (state: GameView["state"]): void => {
      setView({ state, receivedAt: Date.now() });
      setConnection("connected");
      setRestoring(false);
    };

    const onReaction = (reaction: ReactionBroadcast): void => {
      const item: FloatingReaction = { ...reaction, receivedAt: Date.now() };
      setReactions((current) => [...current.slice(-11), item]);
      const timer = window.setTimeout(() => {
        setReactions((current) => current.filter((entry) => entry.id !== item.id));
        reactionTimers.current.delete(item.id);
      }, REACTION_LIFETIME);
      reactionTimers.current.set(item.id, timer);
    };

    const onRoomClosed = (payload: RoomClosedPayload): void => {
      forgetSession(payload.message);
    };

    const onSessionReplaced = (): void => {
      forgetSession("This room was opened in another tab, so this one was disconnected.");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("state", onState);
    socket.on("cap:reaction", onReaction);
    socket.on("cap:room-closed", onRoomClosed);
    socket.on("cap:session-replaced", onSessionReplaced);
    socket.on("cap:error", (error) => setNotice(error.message));

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("state", onState);
      socket.off("cap:reaction", onReaction);
      socket.off("cap:room-closed", onRoomClosed);
      socket.off("cap:session-replaced", onSessionReplaced);
      socket.off("cap:error");
      socket.disconnect();
      for (const timer of reactionTimers.current.values()) {
        window.clearTimeout(timer);
      }
      reactionTimers.current.clear();
    };
  }, [applySession, forgetSession]);

  const createRoom = useCallback(
    (name: string, avatar: number): Promise<SessionResult> => {
      const socket = socketRef.current;
      if (!socket) return Promise.resolve(offlineError());
      return requestSession(socket, (callback) => {
        socket.emit("room:create", { name, avatar }, callback);
      }).then((result) => {
        if (result.ok) applySession(result.session);
        return result;
      });
    },
    [applySession],
  );

  const joinRoom = useCallback(
    (code: string, name: string, avatar: number): Promise<SessionResult> => {
      const socket = socketRef.current;
      if (!socket) return Promise.resolve(offlineError());
      return requestSession(socket, (callback) => {
        socket.emit("room:join", { code, name, avatar }, callback);
      }).then((result) => {
        if (result.ok) applySession(result.session);
        return result;
      });
    },
    [applySession],
  );

  const actions = useMemo<GameActions>(() => {
    const socket = socketRef.current;
    if (!socket) {
      const fail = (): Promise<ActionResult> => Promise.resolve(offlineError());
      return {
        start: fail,
        kick: fail,
        leave: fail,
        rematch: fail,
        lobby: fail,
        skipReveal: fail,
        submitLie: fail,
        vote: fail,
        react: fail,
      };
    }

    return {
      start: () => requestAction(socket, (callback) => socket.emit("room:start", callback)),
      kick: (playerId) =>
        requestAction(socket, (callback) => socket.emit("room:kick", { playerId }, callback)),
      leave: () =>
        requestAction(socket, (callback) => socket.emit("room:leave", callback)).then(
          (result) => {
            if (
              result.ok ||
              result.error.code === "NOT_IN_ROOM" ||
              result.error.code === "ROOM_NOT_FOUND"
            ) {
              forgetSession();
            }
            return result;
          },
        ),
      rematch: () =>
        requestAction(socket, (callback) => socket.emit("room:rematch", callback)),
      lobby: () => requestAction(socket, (callback) => socket.emit("room:lobby", callback)),
      skipReveal: () =>
        requestAction(socket, (callback) => socket.emit("room:skipReveal", callback)),
      submitLie: (text) =>
        requestAction(socket, (callback) => socket.emit("round:lie", { text }, callback)),
      vote: (optionId) =>
        requestAction(socket, (callback) => socket.emit("round:vote", { optionId }, callback)),
      react: (reaction: ReactionKey) =>
        requestAction(socket, (callback) => socket.emit("reaction", { reaction }, callback)),
    };
  }, [forgetSession]);

  const clearNotice = useCallback((): void => setNotice(null), []);

  const dismissRestore = useCallback((): void => {
    autoResumeRef.current = false;
    setRestoring(false);
    setSession(null);
  }, []);

  return {
    view,
    session,
    connection,
    restoring,
    reactions,
    notice,
    createRoom,
    joinRoom,
    clearNotice,
    dismissRestore,
    actions,
  };
}
