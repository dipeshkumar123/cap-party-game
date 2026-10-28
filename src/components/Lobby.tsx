import { useState } from "react";
import type { ActionResult, PublicPlayer, PublicState } from "../../shared/types";
import type { SoundCue } from "../lib/sound";
import type { GameActions, Notify } from "../types";
import { copyText, inviteLink, shareText } from "../lib/storage";
import { Avatar, Icon } from "./visual";
import { ConfirmDialog } from "./ui";

export function Lobby({
  state,
  actions,
  notify,
  play,
  onRules,
}: {
  state: PublicState;
  actions: GameActions;
  notify: Notify;
  play: (cue: SoundCue) => void;
  onRules: () => void;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [kickTarget, setKickTarget] = useState<PublicPlayer | null>(null);
  const [kicking, setKicking] = useState(false);
  const [starting, setStarting] = useState(false);

  const isHost = state.you.isHost;
  const connected = state.players.filter((player) => player.connected);
  const host = state.players.find((player) => player.id === state.hostId);
  const link = inviteLink(state.code);

  const flashCopied = (what: "code" | "link"): void => {
    setCopied(what);
    window.setTimeout(() => setCopied(null), 1800);
  };

  const copyCode = async (): Promise<void> => {
    play("tap");
    if (await copyText(state.code)) {
      flashCopied("code");
      notify("Room code copied.", "success");
    } else {
      notify("Could not copy the code. Select it manually.", "error");
    }
  };

  const copyLink = async (): Promise<void> => {
    play("tap");
    if (await copyText(link)) {
      flashCopied("link");
      notify("Invite link copied.", "success");
    } else {
      notify("Could not copy the link.", "error");
    }
  };

  const invite = async (): Promise<void> => {
    play("tap");
    const result = await shareText(
      "CAP - Everyone's lying.",
      `Join my CAP room. Code: ${state.code}`,
      link,
    );
    if (result === "copied") notify("Invite copied. Send it to a liar.", "success");
    if (result === "shared") notify("Invite shared.", "success");
    if (result === "failed") notify("Could not share the invite.", "error");
  };

  const start = async (): Promise<void> => {
    if (starting) return;
    setStarting(true);
    play("join");
    const result = await actions.start();
    setStarting(false);
    if (!result.ok) notify(result.error.message, "error");
  };

  const confirmKick = async (): Promise<void> => {
    if (!kickTarget || kicking) return;
    setKicking(true);
    const result: ActionResult = await actions.kick(kickTarget.id);
    setKicking(false);
    if (result.ok) {
      notify(`${kickTarget.name} was removed.`, "info");
      setKickTarget(null);
    } else {
      notify(result.error.message, "error");
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-top">
        <div className="lobby-ticket-wrap">
          <div className="lobby-ticket">
            <div className="ticket-top">
              <span className="mono-label">ROOM CODE</span>
              <span className="ticket-stamp">5 CHARACTERS</span>
            </div>
            <button
              type="button"
              className="room-code"
              onClick={copyCode}
              aria-label={`Copy room code ${state.code}`}
            >
              {state.code.split("").map((letter, index) => (
                <span key={`${letter}-${index}`}>{letter}</span>
              ))}
            </button>
            <div className="ticket-actions">
              <button type="button" className="btn btn-small btn-ghost-dark" onClick={copyLink}>
                <Icon name={copied === "link" ? "check" : "copy"} size={16} />
                {copied === "link" ? "Link copied" : "Copy link"}
              </button>
              <button type="button" className="btn btn-small btn-ghost-dark" onClick={invite}>
                <Icon name="share" size={16} />
                Invite
              </button>
            </div>
          </div>
          <span className="ticket-tear ticket-tear-left" aria-hidden="true" />
          <span className="ticket-tear ticket-tear-right" aria-hidden="true" />
          <span className="ticket-sticker" aria-hidden="true">
            NO ACCOUNTS
          </span>
        </div>

        <div className="lobby-copy">
          <p className="eyebrow">
            {isHost ? "YOU'RE THE HOST" : "THE ROOM IS OPEN"}
          </p>
          <h1>
            {connected.length < 2
              ? "One more liar needed."
              : "The room is ready to lie."}
          </h1>
          <p>
            {connected.length < 2
              ? "Send the code to one friend. Two players is a full game."
              : `${connected.length} players are in. The host starts when everyone stops lurking.`}
          </p>
          <button type="button" className="text-button" onClick={onRules}>
            Read the 60-second rules
          </button>
        </div>
      </div>

      <div className="lobby-grid">
        <section className="panel players-panel" aria-labelledby="players-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">IN THE ROOM</p>
              <h2 id="players-title">
                {state.players.length}/{state.maxPlayers} liars
              </h2>
            </div>
            <span className="panel-note">
              {state.maxPlayers - state.players.length} seats open
            </span>
          </div>

          <ul className="player-list">
            {state.players.map((player) => (
              <li key={player.id} className="player-row">
                <Avatar index={player.avatar} size={48} />
                <div className="player-row-copy">
                  <span className="player-name">
                    {player.name}
                    {player.id === state.you.id && <span className="you-tag">YOU</span>}
                  </span>
                  <span className="player-meta">
                    {player.isHost ? "HOST" : "GUEST"} /{" "}
                    {player.connected ? "READY" : "RECONNECTING"}
                  </span>
                </div>
                <span
                  className={`player-status ${player.connected ? "is-on" : "is-off"}`}
                  aria-label={player.connected ? "Connected" : "Disconnected"}
                />
                {isHost && player.id !== state.you.id && (
                  <button
                    type="button"
                    className="mini-kick"
                    onClick={() => setKickTarget(player)}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
            {Array.from({ length: Math.min(2, state.maxPlayers - state.players.length) }).map(
              (_, index) => (
                <li key={`empty-${index}`} className="player-row player-row-empty">
                  <span className="empty-avatar" aria-hidden="true">
                    <Icon name="plus" size={18} />
                  </span>
                  <div className="player-row-copy">
                    <span className="player-name">Open seat</span>
                    <span className="player-meta">SEND THE CODE</span>
                  </div>
                </li>
              ),
            )}
          </ul>
        </section>

        <aside className="lobby-side">
          <section className="panel start-panel">
            {isHost ? (
              <>
                <p className="eyebrow">YOUR CALL</p>
                <h2>Start the first round.</h2>
                <p>
                  Five rounds. The Final Cap is worth triple. Everyone starts at zero and
                  gets worse from there.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-large btn-full"
                  onClick={start}
                  disabled={starting || connected.length < 2}
                >
                  {starting ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Starting...
                    </>
                  ) : connected.length < 2 ? (
                    "Need one more player"
                  ) : (
                    <>
                      Start the match
                      <Icon name="arrow" size={20} />
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <p className="eyebrow">HOST CONTROLS</p>
                <h2>Waiting on {host?.name ?? "the host"}.</h2>
                <p>
                  The room is live. The host starts when at least two players are connected.
                </p>
                <div className="waiting-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </>
            )}
            <div className="lobby-rule-line">
              <span className="rule-number">+1000</span>
              <span>find the truth</span>
              <span className="rule-number">+500</span>
              <span>per fool</span>
            </div>
          </section>

          <section className="lobby-how">
            <span className="loopsign" aria-hidden="true">
              <Icon name="spark" size={18} />
            </span>
            <div>
              <strong>One sentence to play.</strong>
              <p>
                Everyone writes a lie. One answer is real. Vote for the truth. Do not trust
                the host.
              </p>
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(kickTarget)}
        title={`Remove ${kickTarget?.name ?? "this player"}?`}
        confirmLabel="Remove player"
        onConfirm={confirmKick}
        onClose={() => setKickTarget(null)}
        busy={kicking}
        danger
      >
        <p>
          They will lose their seat in this lobby and have to rejoin with the room code.
        </p>
      </ConfirmDialog>
    </div>
  );
}
