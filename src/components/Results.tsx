import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import type { PublicState } from "../../shared/types";
import type { SoundCue } from "../lib/sound";
import type { GameActions, Notify } from "../types";
import { prefersReducedMotion, score, shareText } from "../lib/storage";
import { Avatar, Icon } from "./visual";
import { ConfirmDialog } from "./ui";

function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const reduced = useRef(prefersReducedMotion());
  const [display, setDisplay] = useState(reduced.current ? value : 0);

  useEffect(() => {
    if (reduced.current) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{score(display)}</>;
}

export function Results({
  state,
  actions,
  notify,
  play,
}: {
  state: PublicState;
  actions: GameActions;
  notify: Notify;
  play: (cue: SoundCue) => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState<"rematch" | "lobby" | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const celebrated = useRef(false);

  const winners = (state.winnerIds ?? [])
    .map((id) => state.scoreboard.find((entry) => entry.playerId === id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  const winnerNames = winners.map((entry) => entry.name);
  const connected = state.players.filter((player) => player.connected).length;
  const top = state.scoreboard.slice(0, 3);
  const isHost = state.you.isHost;
  const hostName =
    state.players.find((player) => player.id === state.hostId)?.name ?? "the host";
  const completed = state.matchEndReason === "completed";

  useEffect(() => {
    if (celebrated.current || !completed || winners.length === 0) return;
    celebrated.current = true;
    if (prefersReducedMotion()) return;

    const colors = ["#D9FF43", "#5B5BFF", "#FF6B4A", "#F3EFE3"];
    confetti({
      particleCount: 120,
      spread: 74,
      startVelocity: 44,
      origin: { x: 0.5, y: 0.36 },
      colors,
      scalar: 0.95,
      disableForReducedMotion: true,
    });
    const timerOne = window.setTimeout(() => {
      confetti({
        particleCount: 54,
        angle: 58,
        spread: 58,
        origin: { x: 0.08, y: 0.7 },
        colors,
        disableForReducedMotion: true,
      });
    }, 180);
    const timerTwo = window.setTimeout(() => {
      confetti({
        particleCount: 54,
        angle: 122,
        spread: 58,
        origin: { x: 0.92, y: 0.7 },
        colors,
        disableForReducedMotion: true,
      });
    }, 310);
    return () => {
      window.clearTimeout(timerOne);
      window.clearTimeout(timerTwo);
    };
  }, [completed, winners.length]);

  const share = async (): Promise<void> => {
    if (sharing) return;
    setSharing(true);
    play("tap");
    const lines = [
      "CAP - Everyone's lying.",
      winners.length > 0
        ? `Winner${winners.length > 1 ? "s" : ""}: ${winnerNames.join(", ")} (${
            winners.length === 1 ? score(winners[0].score) : "shared"
          })`
        : "No winner. The room emptied.",
    ];
    for (const award of state.awards ?? []) {
      const names = award.playerIds
        .map((id) => state.scoreboard.find((entry) => entry.playerId === id)?.name)
        .filter((name): name is string => Boolean(name));
      if (names.length > 0) lines.push(`${award.label}: ${names.join(", ")}`);
    }
    lines.push(`${state.totalRounds} rounds. ${state.players.length} liars. 1 truth.`);
    lines.push(`Play: ${window.location.origin}/`);

    const result = await shareText(
      "CAP - Everyone's lying.",
      lines.join("\n"),
      undefined,
    );
    setSharing(false);
    if (result === "copied") notify("Result copied. Go start something.", "success");
    if (result === "shared") notify("Result shared.", "success");
    if (result === "failed") notify("Could not share the result.", "error");
  };

  const rematch = async (): Promise<void> => {
    if (busy) return;
    setBusy("rematch");
    play("join");
    const result = await actions.rematch();
    if (!result.ok) {
      notify(result.error.message, "error");
      setBusy(null);
    } else {
      setBusy(null);
    }
  };

  const lobby = async (): Promise<void> => {
    if (busy) return;
    setBusy("lobby");
    play("tap");
    const result = await actions.lobby();
    if (!result.ok) {
      notify(result.error.message, "error");
      setBusy(null);
    } else {
      setBusy(null);
    }
  };

  const leave = async (): Promise<void> => {
    if (leaving) return;
    setLeaving(true);
    const result = await actions.leave();
    if (!result.ok && result.error.code !== "NOT_IN_ROOM") {
      notify(result.error.message, "error");
    }
    setLeaving(false);
    setLeaveOpen(false);
  };

  return (
    <div className="results-screen">
      <div className="results-kicker">
        <span className="eyebrow">{completed ? "MATCH COMPLETE" : "MATCH ENDED"}</span>
        <span className="results-rounds">
          {state.totalRounds} ROUNDS / {state.players.length} LIARS
        </span>
      </div>

      <header className="winner-header">
        <p className="eyebrow">
          {winners.length > 1 ? "CO-WINNERS" : "THE ROOM HAS SPOKEN"}
        </p>
        <h1>
          {winners.length > 0
            ? winners.length > 1
              ? "A shared crown. Deeply suspicious."
              : `${winnerNames[0]} wins. Act natural.`
            : "The truth got away."}
        </h1>
        {winners.length > 0 && (
          <div className="winner-display">
            {winners.map((winner) => (
              <div key={winner.playerId} className="winner-person">
                <Avatar index={winner.avatar} size={72} />
                <div>
                  <span className="winner-name">{winner.name}</span>
                  <span className="winner-score">
                    <CountUp value={winner.score} />
                    <small> points</small>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      {top.length > 0 && (
        <div className="podium" aria-label="Top three players">
          {top.map((entry, index) => (
            <div
              key={entry.playerId}
              className={`podium-step podium-${index + 1} ${
                state.you.id === entry.playerId ? "is-you" : ""
              }`}
            >
              <span className="podium-rank">{index + 1}</span>
              <Avatar index={entry.avatar} size={index === 0 ? 56 : 44} />
              <span className="podium-name">{entry.name}</span>
              <span className="podium-score">{score(entry.score)}</span>
              <span className="podium-block" aria-hidden="true">
                <span>{index === 0 ? "TOP" : index === 1 ? "2ND" : "3RD"}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="results-grid">
        <section className="panel results-board" aria-labelledby="standings-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">FINAL STANDINGS</p>
              <h2 id="standings-title">The full damage.</h2>
            </div>
            <span className="panel-note">SCORE</span>
          </div>
          <ol className="standings">
            {state.scoreboard.map((entry) => (
              <li
                key={entry.playerId}
                className={state.you.id === entry.playerId ? "is-you" : ""}
              >
                <span className="standing-rank">{entry.rank}</span>
                <Avatar index={entry.avatar} size={34} />
                <span className="standing-name">
                  {entry.name}
                  {state.you.id === entry.playerId && <span className="you-tag">YOU</span>}
                </span>
                <span className="standing-stats">
                  {entry.truthFinds} truth / {entry.votesFooled} fooled / {entry.perfectCaps} perfect
                </span>
                <span className="standing-score">{score(entry.score)}</span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="results-side">
          {(state.awards?.length ?? 0) > 0 && (
            <section className="panel awards-panel" aria-labelledby="awards-title">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">THE TROPHY SHELF</p>
                  <h2 id="awards-title">Awards nobody asked for.</h2>
                </div>
              </div>
              <ul className="awards-list">
                {(state.awards ?? []).map((award) => {
                  const names = award.playerIds
                    .map((id) => state.scoreboard.find((entry) => entry.playerId === id))
                    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
                  return (
                    <li key={award.key}>
                      <span
                        className={`award-mark award-${award.key}`}
                        aria-hidden="true"
                      >
                        <Icon
                          name={
                            award.key === "truth"
                              ? "eye"
                              : award.key === "liar"
                                ? "spark"
                                : "check"
                          }
                          size={18}
                        />
                      </span>
                      <div>
                        <span className="award-label">{award.label}</span>
                        <span className="award-names">
                          {names.map((entry) => entry.name).join(", ")}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="results-actions-panel">
            {isHost ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-large btn-full"
                  onClick={rematch}
                  disabled={busy !== null || connected < 2}
                >
                  {busy === "rematch" ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Resetting...
                    </>
                  ) : connected < 2 ? (
                    "Need 2 players to rematch"
                  ) : (
                    <>
                      Run it back
                      <Icon name="arrow" size={20} />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-paper btn-full"
                  onClick={lobby}
                  disabled={busy !== null}
                >
                  {busy === "lobby" ? "Opening lobby..." : "Back to lobby"}
                </button>
                {connected < 2 && (
                  <p className="action-note">
                    Send the room code and get one more liar in here.
                  </p>
                )}
              </>
            ) : (
              <p className="waiting-for-host">
                Waiting for {hostName} to start the next round.
              </p>
            )}
            <button type="button" className="btn btn-ghost btn-full" onClick={share} disabled={sharing}>
              <Icon name="share" size={17} />
              {sharing ? "Sharing..." : "Share the result"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-full results-leave"
              onClick={() => setLeaveOpen(true)}
            >
              Leave the room
            </button>
          </section>
        </aside>
      </div>

      <div className="results-footer">
        <span>
          ROOM {state.code} / {state.players.length} LIARS
        </span>
        <span>FIVE ROUNDS / ONE TRUTH</span>
      </div>

      <ConfirmDialog
        open={leaveOpen}
        title="Leave the room?"
        confirmLabel="Leave for good"
        onConfirm={leave}
        onClose={() => setLeaveOpen(false)}
        busy={leaving}
        danger
      >
        <p>Your results stay with the room. You will need the code to get back in.</p>
      </ConfirmDialog>
    </div>
  );
}
