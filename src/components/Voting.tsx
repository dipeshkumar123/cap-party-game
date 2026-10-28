import { useState } from "react";
import type { PublicState } from "../../shared/types";
import type { SoundCue } from "../lib/sound";
import type { GameActions, GameView, Notify } from "../types";
import { hasSeenHint, markHintSeen } from "../lib/storage";
import { useCountdown } from "../lib/useTimer";
import { Avatar, Icon, PromptText } from "./visual";

export function Voting({
  view,
  actions,
  notify,
  play,
}: {
  view: GameView;
  actions: GameActions;
  notify: Notify;
  play: (cue: SoundCue) => void;
}) {
  const state: PublicState = view.state;
  const prompt = state.prompt;
  const options = state.options ?? [];
  const countdown = useCountdown(view);
  const [selected, setSelected] = useState<string | null>(state.you.voteOptionId);
  const [lockedLocal, setLockedLocal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(() => !hasSeenHint("vote"));

  const locked = state.you.hasVoted || lockedLocal;
  const votedCount =
    state.players.filter((player) => player.voted).length +
    (lockedLocal && !state.you.hasVoted ? 1 : 0);
  const selectedOption = options.find((option) => option.id === selected) ?? null;

  const dismissHint = (): void => {
    setShowHint(false);
    markHintSeen("vote");
  };

  const choose = (optionId: string, isMine: boolean): void => {
    if (locked || isMine) return;
    setError(null);
    setSelected(optionId);
    play("tap");
  };

  const vote = async (): Promise<void> => {
    if (!selected || locked || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await actions.vote(selected);
    setSubmitting(false);
    if (result.ok) {
      setLockedLocal(true);
      dismissHint();
      play("vote");
    } else {
      setError(result.error.message);
      notify(result.error.message, "error");
    }
  };

  if (!prompt) return null;

  return (
    <div className="round-screen voting-screen">
      <div className="round-heading">
        <div>
          <p className="eyebrow">
            ROUND {state.round} OF {state.totalRounds} / VOTE
          </p>
          <h1>Which one is real?</h1>
        </div>
        <span className="multiplier-chip">{state.multiplier}X</span>
      </div>

      {showHint && (
        <div className="hint-card">
          <span className="hint-mark" aria-hidden="true">
            <Icon name="eye" size={17} />
          </span>
          <p>
            <strong>One of these is real.</strong> The rest are the room's best attempts at
            sounding true.
          </p>
          <button
            type="button"
            className="hint-close"
            onClick={dismissHint}
            aria-label="Dismiss tip"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <div className="mini-prompt">
        <span className="category-chip">{prompt.category}</span>
        <p>
          <PromptText text={prompt.text} />
        </p>
      </div>

      <div className="vote-instruction">
        <span className="mono-label">THE SUSPECTS</span>
        <span className="vote-instruction-note">Pick the answer you believe.</span>
      </div>

      <div className="vote-options" role="radiogroup" aria-label="Vote for the real answer">
        {options.map((option, index) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`vote-option ${isSelected ? "is-selected" : ""} ${
                option.isMine ? "is-mine" : ""
              }`}
              onClick={() => choose(option.id, option.isMine)}
              disabled={locked || option.isMine}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="option-letter">{String.fromCharCode(65 + index)}</span>
              <span className="vote-option-text">{option.text}</span>
              {option.isMine ? (
                <span className="option-tag option-tag-mine">YOUR CAP / NO</span>
              ) : isSelected ? (
                <span className="option-check" aria-hidden="true">
                  <Icon name="check" size={15} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="form-error" role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}

      <div className="vote-actions">
        <div className="vote-progress">
          <div className="fake-avatars" aria-hidden="true">
            {state.players.slice(0, 6).map((player) => (
              <span
                key={player.id}
                className={`fake-avatar ${player.voted ? "is-ready" : ""}`}
              >
                <Avatar index={player.avatar} size={22} />
              </span>
            ))}
          </div>
          <span>
            {votedCount}/{state.players.length} votes in
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-large"
          onClick={vote}
          disabled={!selected || locked || submitting || countdown.expired}
        >
          {locked ? (
            <>
              <Icon name="check" size={19} />
              Vote locked
            </>
          ) : submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Locking...
            </>
          ) : (
            <>
              Lock my vote
              <Icon name="lock" size={19} />
            </>
          )}
        </button>
      </div>

      {locked && selectedOption && (
        <p className="locked-note vote-locked-note" role="status">
          Your vote is in. If you picked a lie, you have no one to blame but yourself.
        </p>
      )}
    </div>
  );
}
