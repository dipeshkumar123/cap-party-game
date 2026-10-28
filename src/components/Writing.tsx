import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { PublicState } from "../../shared/types";
import type { SoundCue } from "../lib/sound";
import type { GameActions, GameView } from "../types";
import { hasSeenHint, markHintSeen } from "../lib/storage";
import { useCountdown } from "../lib/useTimer";
import { Avatar, Icon, PromptText } from "./visual";

export function Writing({
  view,
  actions,
  play,
}: {
  view: GameView;
  actions: GameActions;
  play: (cue: SoundCue) => void;
}) {
  const state: PublicState = view.state;
  const prompt = state.prompt;
  const countdown = useCountdown(view);
  const [lie, setLie] = useState(state.you.lieText ?? "");
  const [submittedLocal, setSubmittedLocal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(() => !hasSeenHint("write"));
  const formRef = useRef<HTMLFormElement>(null);

  const locked = state.you.lieSubmitted || submittedLocal;
  const lockedText = state.you.lieText ?? lie;
  const submittedCount =
    state.players.filter((player) => player.submitted).length +
    (submittedLocal && !state.you.lieSubmitted ? 1 : 0);
  const allPlayers = state.players.length;
  const progress = allPlayers > 0 ? submittedCount / allPlayers : 0;
  const isFinal = state.round === state.totalRounds;
  const expired = countdown.expired;

  const dismissHint = (): void => {
    setShowHint(false);
    markHintSeen("write");
  };

  const reopenHint = (): void => {
    setShowHint(true);
  };

  const submit = async (event?: FormEvent): Promise<void> => {
    event?.preventDefault();
    if (locked || submitting || expired) return;
    const trimmed = lie.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      setError("Write something first. A bad lie beats an empty one.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await actions.submitLie(trimmed);
    setSubmitting(false);
    if (result.ok) {
      setSubmittedLocal(true);
      dismissHint();
      play("lock");
    } else {
      setError(result.error.message);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  if (!prompt) return null;

  return (
    <div className="round-screen writing-screen">
      <div className="round-heading">
        <div>
          <p className="eyebrow">
            {isFinal ? "THE FINAL CAP" : `ROUND ${state.round} OF ${state.totalRounds}`}
          </p>
          <h1>{isFinal ? "Make the last lie count." : "Make it sound real."}</h1>
        </div>
        <span className={`multiplier-chip ${isFinal ? "is-final" : ""}`}>
          {state.multiplier}X
        </span>
      </div>

      {showHint && (
        <div className="hint-card">
          <span className="hint-mark" aria-hidden="true">
            <Icon name="spark" size={17} />
          </span>
          <p>
            <strong>First time?</strong> Write the most believable lie. Not the truth.
          </p>
          <button type="button" className="hint-close" onClick={dismissHint} aria-label="Dismiss tip">
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <article className="prompt-card">
        <div className="prompt-meta">
          <span className="category-chip">{prompt.category}</span>
          <span className="mono-label">THE MISSING FACT</span>
        </div>
        <p className="prompt-text">
          <PromptText text={prompt.text} blank />
        </p>
        <p className="prompt-footnote">
          This is true. The blank is the only thing you have to invent around.
        </p>
      </article>

      {locked ? (
        <section className="locked-card" aria-live="polite">
          <div className="locked-stamp">LOCKED IN</div>
          <p className="locked-label">YOUR CAP</p>
          <blockquote>{lockedText}</blockquote>
          <p className="locked-note">
            Your lie is in the pile. Try to look innocent when the votes come in.
          </p>
          <div className="lock-progress">
            <div className="lock-progress-head">
              <span>{submittedCount} of {allPlayers} liars locked in</span>
              <span className="mono">{Math.round(progress * 100)}%</span>
            </div>
            <div className="progress-track">
              <span style={{ transform: `scaleX(${progress})` }} />
            </div>
          </div>
          <button type="button" className="text-button" onClick={reopenHint}>
            Read the tip again
          </button>
        </section>
      ) : (
        <form ref={formRef} className="lie-form" onSubmit={submit}>
          <label htmlFor="lie-input" className="lie-label">
            <span>Your lie</span>
            <span className="mono">{lie.length}/60</span>
          </label>
          <textarea
            id="lie-input"
            className="lie-input"
            value={lie}
            onChange={(event) => {
              setLie(event.target.value);
              setError(null);
            }}
            placeholder="Type it with completely unearned confidence..."
            rows={2}
            maxLength={60}
            enterKeyHint="send"
            autoComplete="off"
            spellCheck={false}
            onKeyDown={onKeyDown}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "lie-error" : "lie-tip"}
          />
          {error ? (
            <p className="form-error form-error-inline" id="lie-error" role="alert">
              <span aria-hidden="true">!</span>
              {error}
            </p>
          ) : (
            <p className="field-hint" id="lie-tip">
              Specific beats vague. A real-sounding number helps. Confidence is free.
            </p>
          )}
          <div className="writing-actions">
            <div className="writing-progress" aria-label={`${submittedCount} of ${allPlayers} players locked in`}>
              <div className="fake-avatars" aria-hidden="true">
                {state.players.slice(0, 5).map((player) => (
                  <span
                    key={player.id}
                    className={`fake-avatar ${player.submitted ? "is-ready" : ""}`}
                  >
                    <Avatar index={player.avatar} size={23} />
                  </span>
                ))}
              </div>
              <span>{submittedCount}/{allPlayers} locked in</span>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={submitting || expired || !lie.trim()}
            >
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Locking...
                </>
              ) : (
                <>
                  Lock my lie
                  <Icon name="lock" size={19} />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
