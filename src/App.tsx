import { useCallback, useEffect, useRef, useState } from "react";
import type { SoundCue } from "./lib/sound";
import { playCue, primeAudio } from "./lib/sound";
import { roomCodeFromUrl, setRoomInUrl } from "./lib/storage";
import { loadSound, saveSound } from "./lib/storage";
import { useCap } from "./lib/useCap";
import type { Notify, ToastItem, ToastTone } from "./types";
import { Landing } from "./components/Landing";
import { Setup } from "./components/Setup";
import { GameShell } from "./components/GameShell";
import { RestoreScreen, RulesDialog, Toasts } from "./components/ui";

type Screen =
  | { kind: "landing" }
  | { kind: "setup"; mode: "create" | "join"; code?: string };

function initialScreen(): Screen {
  const code = roomCodeFromUrl();
  return code ? { kind: "setup", mode: "join", code } : { kind: "landing" };
}

export function App() {
  const cap = useCap();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(loadSound);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);
  const toastTimers = useRef<Map<number, number>>(new Map());
  const soundRef = useRef(soundOn);
  const previousPhase = useRef<string | null>(null);
  const hadView = useRef(false);

  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    if (!soundOn) return;
    const unlock = (): void => primeAudio();
    window.addEventListener("pointerdown", unlock, { once: true, capture: true });
    return () => window.removeEventListener("pointerdown", unlock, { capture: true });
  }, [soundOn]);

  const play = useCallback((cue: SoundCue): void => {
    playCue(cue, soundRef.current);
  }, []);

  const dismissToast = useCallback((id: number): void => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimers.current.delete(id);
    }
  }, []);

  const notify = useCallback<Notify>((message: string, tone: ToastTone = "info"): void => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((current) => [...current.slice(-3), { id, message, tone }]);
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      toastTimers.current.delete(id);
    }, 4800);
    toastTimers.current.set(id, timer);
  }, []);

  useEffect(
    () => () => {
      for (const timer of toastTimers.current.values()) window.clearTimeout(timer);
      toastTimers.current.clear();
    },
    [],
  );

  useEffect(() => {
    if (!cap.notice) return;
    if (!cap.view) setScreen({ kind: "landing" });
    notify(cap.notice, "error");
    cap.clearNotice();
  }, [cap.notice, cap.view, cap.clearNotice, notify]);

  useEffect(() => {
    if (cap.view) {
      hadView.current = true;
      setScreen({ kind: "landing" });
      return;
    }
    if (hadView.current && !cap.restoring) {
      hadView.current = false;
      setScreen({ kind: "landing" });
    }
  }, [cap.view, cap.restoring]);

  useEffect(() => {
    const phase = cap.view?.state.phase ?? null;
    const previous = previousPhase.current;
    if (cap.view && phase && phase !== previous) {
      if (phase === "writing" && previous !== null) {
        play("join");
      } else if (phase === "voting") {
        play("vote");
      } else if (phase === "reveal") {
        const state = cap.view.state;
        const delta = state.reveal?.deltas.find(
          (entry) => entry.playerId === state.you.id,
        );
        play("reveal");
        const timer = window.setTimeout(() => {
          if (delta?.truth) play("truth");
          else if (delta && delta.fooled > 0) play("lock");
          else play("capped");
        }, 620);
        previousPhase.current = phase;
        return () => window.clearTimeout(timer);
      } else if (phase === "ended" && cap.view.state.matchEndReason === "completed") {
        play("win");
      }
    }
    previousPhase.current = phase;
  }, [cap.view, play]);

  const toggleSound = (): void => {
    const next = !soundOn;
    setSoundOn(next);
    saveSound(next);
    if (next) {
      primeAudio();
      playCue("tap", true);
    }
  };

  const openStart = (): void => {
    play("tap");
    setRoomInUrl(null);
    setScreen({ kind: "setup", mode: "create" });
  };

  const openJoin = (): void => {
    play("tap");
    setScreen({ kind: "setup", mode: "join", code: roomCodeFromUrl() ?? undefined });
  };

  const closeSetup = (): void => {
    play("tap");
    setRoomInUrl(null);
    setScreen({ kind: "landing" });
  };

  let content;
  if (cap.view) {
    content = (
      <GameShell
        view={cap.view}
        actions={cap.actions}
        notify={notify}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onRules={() => setRulesOpen(true)}
        connection={cap.connection}
        reactions={cap.reactions}
        play={play}
      />
    );
  } else if (cap.restoring) {
    content = (
      <RestoreScreen
        roomCode={cap.session?.roomCode ?? roomCodeFromUrl() ?? "-----"}
        connection={cap.connection}
        onCancel={cap.dismissRestore}
      />
    );
  } else if (screen.kind === "setup") {
    content = (
      <Setup
        key={`${screen.mode}-${screen.code ?? ""}`}
        mode={screen.mode}
        initialCode={screen.code}
        onBack={closeSetup}
        onCreate={cap.createRoom}
        onJoin={cap.joinRoom}
        onRules={() => setRulesOpen(true)}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        play={play}
      />
    );
  } else {
    content = (
      <Landing
        onStart={openStart}
        onJoin={openJoin}
        onRules={() => setRulesOpen(true)}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        play={play}
      />
    );
  }

  return (
    <div className={`app ${cap.view ? "app-in-game" : ""}`}>
      <div className="ambient" aria-hidden="true">
        <span className="ambient-word ambient-word-one">TRUTH</span>
        <span className="ambient-word ambient-word-two">CAP</span>
        <span className="ambient-cross ambient-cross-one">+</span>
        <span className="ambient-cross ambient-cross-two">+</span>
      </div>
      <div className="grain" aria-hidden="true" />
      {content}
      <Toasts toasts={toasts} onDismiss={dismissToast} />
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}
