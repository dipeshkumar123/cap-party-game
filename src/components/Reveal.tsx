import { useEffect, useMemo, useState } from "react";
import type { PublicState, RevealAnswer } from "../../shared/types";
import type { GameActions, GameView, Notify } from "../types";
import { score } from "../lib/storage";
import { useCountdown } from "../lib/useTimer";
import { Avatar, FactText, Icon } from "./visual";

function VoteChips({ answer }: { answer: RevealAnswer }) {
  if (answer.votes.length === 0) {
    return <span className="vote-empty">Nobody voted for this.</span>;
  }
  return (
    <span className="vote-chips">
      {answer.votes.map((vote) => (
        <span key={vote.playerId} className="vote-chip" title={vote.name}>
          <Avatar index={vote.avatar} size={20} />
          <span>{vote.name}</span>
        </span>
      ))}
    </span>
  );
}

export function Reveal({
  view,
  actions,
  notify,
}: {
  view: GameView;
  actions: GameActions;
  notify: Notify;
}) {
  const state: PublicState = view.state;
  const reveal = state.reveal;
  const countdown = useCountdown(view);
  const [skipping, setSkipping] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  const isFinal = state.round === state.totalRounds;
  const isHost = state.you.canSkipReveal;

  useEffect(() => {
    setCanSkip(false);
    const timer = window.setTimeout(() => setCanSkip(true), 1600);
    return () => window.clearTimeout(timer);
  }, [state.round, reveal?.startedAt]);

  const ledger = useMemo(() => {
    if (!reveal) return [];
    const deltas = new Map(reveal.deltas.map((delta) => [delta.playerId, delta]));
    return state.players
      .map((player) => ({
        player,
        delta: deltas.get(player.id),
      }))
      .sort((a, b) => b.player.score - a.player.score);
  }, [reveal, state.players]);

  if (!reveal) return null;

  const next = async (): Promise<void> => {
    if (skipping) return;
    setSkipping(true);
    const result = await actions.skipReveal();
    setSkipping(false);
    if (!result.ok) notify(result.error.message, "error");
  };

  const selectedDelta = reveal.deltas.find((delta) => delta.playerId === state.you.id);

  return (
    <div className="round-screen reveal-screen">
      <div className="round-heading">
        <div>
          <p className="eyebrow">
            {isFinal ? "THE FINAL CAP" : `ROUND ${state.round} OF ${state.totalRounds}`} / REVEAL
          </p>
          <h1>{reveal.headline}</h1>
        </div>
        <span className={`multiplier-chip ${isFinal ? "is-final" : ""}`}>
          {state.multiplier}X
        </span>
      </div>

      <div className="truth-hero">
        <div className="truth-hero-top">
          <span className="truth-stamp">THE TRUTH</span>
          {selectedDelta?.truth && <span className="truth-you">YOU FOUND IT</span>}
        </div>
        <p className="truth-answer">{reveal.truth}</p>
        <p className="truth-fact">
          <FactText text={reveal.factText} truth={reveal.truth} />
        </p>
        {selectedDelta && (
          <div className="truth-personal">
            <span>
              Your round: {selectedDelta.truth ? "truth found" : "truth missed"}
            </span>
            <span className={selectedDelta.points > 0 ? "is-positive" : ""}>
              +{score(selectedDelta.points)}
            </span>
          </div>
        )}
      </div>

      <section className="answer-section" aria-labelledby="answers-title">
        <div className="panel-head reveal-panel-head">
          <div>
            <p className="eyebrow">THE WHOLE PILE</p>
            <h2 id="answers-title">What the room believed.</h2>
          </div>
          <span className="panel-note">{reveal.answers.length} answers</span>
        </div>

        <ol className="answer-list">
          {reveal.answers.map((answer, index) => {
            const isMine = answer.authorId === state.you.id;
            return (
              <li
                key={answer.id}
                className={`answer-row ${answer.isTruth ? "is-truth" : ""} ${
                  answer.perfect ? "is-perfect" : ""
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className="answer-letter">{String.fromCharCode(65 + index)}</span>
                <div className="answer-main">
                  <div className="answer-tags">
                    {answer.isTruth ? (
                      <span className="option-tag option-tag-truth">THE REAL ANSWER</span>
                    ) : (
                      <span className="option-tag">
                        {answer.autoCap
                          ? "AUTO-CAP"
                          : isMine
                            ? "YOUR CAP"
                            : `${answer.authorName ?? "Anonymous"}'S CAP`}
                      </span>
                    )}
                    {answer.perfect && <span className="option-tag option-tag-perfect">PERFECT CAP</span>}
                  </div>
                  <p className="answer-text">{answer.text}</p>
                  <VoteChips answer={answer} />
                </div>
                <span className={`answer-points ${answer.points > 0 ? "is-positive" : ""}`}>
                  {answer.isTruth ? "TRUTH" : answer.points > 0 ? `+${score(answer.points)}` : "+0"}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="reveal-bottom-grid">
        <section className="round-ledger" aria-labelledby="ledger-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">THE DAMAGE</p>
              <h2 id="ledger-title">Round {state.round} ledger</h2>
            </div>
          </div>
          <ul>
            {ledger.map(({ player, delta }, index) => (
              <li key={player.id} className={player.id === state.you.id ? "is-you" : ""}>
                <span className="ledger-rank">{index + 1}</span>
                <Avatar index={player.avatar} size={30} />
                <span className="ledger-name">{player.name}</span>
                <span className={`ledger-delta ${delta && delta.points > 0 ? "is-positive" : ""}`}>
                  {delta ? `+${score(delta.points)}` : "+0"}
                </span>
                <span className="ledger-total">{score(player.score)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="fact-check panel">
          <p className="eyebrow">FACT CHECK</p>
          <p className="fact-source-label">{reveal.sourceLabel}</p>
          {reveal.funFact && <p className="fact-fun">{reveal.funFact}</p>}
          <a
            href={reveal.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="source-link"
          >
            Check the source
            <Icon name="arrow" size={16} />
          </a>
          <div className="reveal-actions">
            {isHost ? (
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={next}
                disabled={skipping || !canSkip || state.paused}
              >
                {skipping ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Moving...
                  </>
                ) : isFinal ? (
                  "See the final scores"
                ) : (
                  <>
                    Next round
                    <Icon name="arrow" size={18} />
                  </>
                )}
              </button>
            ) : (
              <p className="auto-next">
                {isFinal ? "Final scores" : "Next round"} in{" "}
                <span className="mono">{countdown.label}</span>
              </p>
            )}
            {isHost && (
              <p className="auto-next auto-next-small">
                Auto-advances in <span className="mono">{countdown.label}</span>
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
