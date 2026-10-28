import { useEffect, useState } from "react";
import type { PublicState, ReactionKey } from "../../shared/types";
import type { SoundCue } from "../lib/sound";
import type {
  ConnectionState,
  FloatingReaction,
  GameActions,
  GameView,
  Notify,
} from "../types";
import { copyText } from "../lib/storage";
import { useCountdown } from "../lib/useTimer";
import { Icon, Logo, Timer } from "./visual";
import {
  ConnectionBanner,
  ConfirmDialog,
  PauseNotice,
  ReactionDock,
  ReactionLayer,
} from "./ui";
import { Lobby } from "./Lobby";
import { Writing } from "./Writing";
import { Voting } from "./Voting";
import { Reveal } from "./Reveal";
import { Results } from "./Results";

const PHASE_LABEL: Record<PublicState["phase"], string> = {
  lobby: "LOBBY",
  writing: "WRITE",
  voting: "VOTE",
  reveal: "REVEAL",
  ended: "RESULTS",
};

export function GameShell({
  view,
  actions,
  notify,
  soundOn,
  onToggleSound,
  onRules,
  connection,
  reactions,
  play,
}: {
  view: GameView;
  actions: GameActions;
  notify: Notify;
  soundOn: boolean;
  onToggleSound: () => void;
  onRules: () => void;
  connection: ConnectionState;
  reactions: FloatingReaction[];
  play: (cue: SoundCue) => void;
}) {
  const state = view.state;
  const countdown = useCountdown(view);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const active =
    state.phase === "writing" || state.phase === "voting" || state.phase === "reveal";
  const canReact = state.phase !== "ended" && !state.paused;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.phase, state.round]);

  const copyCode = async (): Promise<void> => {
    play("tap");
    if (await copyText(state.code)) {
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 1600);
      notify("Room code copied.", "success");
    } else {
      notify("Could not copy the code.", "error");
    }
  };

  const leave = async (): Promise<void> => {
    if (leaving) return;
    setLeaving(true);
    const result = await actions.leave();
    setLeaving(false);
    if (!result.ok && result.error.code !== "NOT_IN_ROOM") {
      notify(result.error.message, "error");
    } else {
      setLeaveOpen(false);
    }
  };

  const react = (reaction: ReactionKey): void => {
    play("tap");
    void actions.react(reaction);
  };

  return (
    <div className={`game-shell phase-${state.phase}`}>
      <header className="game-header">
        <div className="game-header-inner">
          <div className="game-brand">
            <Logo compact />
            <button
              type="button"
              className="room-pill"
              onClick={copyCode}
              aria-label={`Copy room code ${state.code}`}
            >
              <span className="room-pill-label">ROOM</span>
              <span className="room-pill-code">{state.code}</span>
              <Icon name={codeCopied ? "check" : "copy"} size={14} />
            </button>
          </div>
          <div className="game-header-actions">
            <button
              type="button"
              className="icon-button"
              onClick={onToggleSound}
              aria-label={soundOn ? "Mute sound" : "Turn sound on"}
            >
              <Icon name={soundOn ? "sound" : "mute"} size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={onRules}
              aria-label="How to play"
            >
              <Icon name="rules" size={18} />
            </button>
            <button
              type="button"
              className="icon-button icon-button-leave"
              onClick={() => setLeaveOpen(true)}
              aria-label="Leave the room"
            >
              <Icon name="leave" size={18} />
            </button>
          </div>
        </div>
        <ConnectionBanner connection={connection} />
      </header>

      {active && (
        <div className="phase-strip">
          <div className="phase-strip-inner">
            <span className="round-label">
              ROUND {state.round}/{state.totalRounds}
            </span>
            <span className={`phase-name phase-name-${state.phase}`}>
              {PHASE_LABEL[state.phase]}
            </span>
            <div className="round-pips" aria-hidden="true">
              {Array.from({ length: state.totalRounds }).map((_, index) => (
                <span
                  key={index}
                  className={
                    index + 1 < state.round
                      ? "is-done"
                      : index + 1 === state.round
                        ? "is-current"
                        : ""
                  }
                />
              ))}
            </div>
            <span
              className={`multiplier-chip multiplier-chip-small ${
                state.multiplier > 1 ? "is-hot" : ""
              }`}
            >
              {state.multiplier}X
            </span>
            <Timer countdown={countdown} />
          </div>
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {state.phase === "lobby"
          ? `Lobby. ${state.players.length} players in the room.`
          : state.phase === "writing"
            ? `Round ${state.round}. Write your lie. ${countdown.seconds ?? 0} seconds.`
            : state.phase === "voting"
              ? `Round ${state.round}. Vote for the truth. ${countdown.seconds ?? 0} seconds.`
              : state.phase === "reveal"
                ? `Round ${state.round} reveal. The truth was ${state.reveal?.truth ?? ""}.`
                : "Final results."}
      </div>

      {state.paused && active && (
        <div className="pause-wrap">
          <PauseNotice state={state} />
        </div>
      )}

      <main className={`game-main ${state.paused ? "is-frozen" : ""}`}>
        {state.phase === "lobby" && (
          <Lobby
            state={state}
            actions={actions}
            notify={notify}
            play={play}
            onRules={onRules}
          />
        )}
        {state.phase === "writing" && (
          <Writing view={view} actions={actions} play={play} />
        )}
        {state.phase === "voting" && (
          <Voting view={view} actions={actions} notify={notify} play={play} />
        )}
        {state.phase === "reveal" && (
          <Reveal view={view} actions={actions} notify={notify} />
        )}
        {state.phase === "ended" && (
          <Results state={state} actions={actions} notify={notify} play={play} />
        )}
      </main>

      <ReactionLayer reactions={reactions} />
      {state.phase !== "ended" && (
        <ReactionDock onReact={react} disabled={!canReact || connection !== "connected"} />
      )}

      <ConfirmDialog
        open={leaveOpen}
        title="Leave the room?"
        confirmLabel="Leave the room"
        onConfirm={leave}
        onClose={() => setLeaveOpen(false)}
        busy={leaving}
        danger
      >
        <p>
          Your seat will be removed. If the room drops below two players, the match pauses
          for everyone else.
        </p>
      </ConfirmDialog>
    </div>
  );
}
