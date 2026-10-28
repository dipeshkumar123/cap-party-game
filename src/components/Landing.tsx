import { useEffect, useState } from "react";
import type { SoundCue } from "../lib/sound";
import { Icon, Logo } from "./visual";

const DEMO_OPTIONS = [
  { text: "flamboyance", truth: true },
  { text: "ballet", truth: false },
  { text: "parade", truth: false },
  { text: "congress", truth: false },
];

const TICKER = [
  "EVERYONE'S LYING",
  "2-8 PLAYERS",
  "ONE PHONE EACH",
  "FIND THE TRUTH",
  "NO ACCOUNTS",
  "FIVE ROUNDS",
  "BRING YOUR WORST FRIENDS",
];

function LiveStats() {
  const [stats, setStats] = useState<{ rooms: number; players: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stats", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { rooms?: number; players?: number } | null) => {
        if (!data) return;
        setStats({
          rooms: typeof data.rooms === "number" ? data.rooms : 0,
          players: typeof data.players === "number" ? data.players : 0,
        });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!stats) {
    return (
      <span className="live-stats">
        <span className="live-dot" aria-hidden="true" />
        LIVE PARTY GAME / 2-8 PLAYERS
      </span>
    );
  }

  return (
    <span className="live-stats">
      <span className="live-dot" aria-hidden="true" />
      {stats.rooms === 0
        ? "NO ROOMS YET TONIGHT. FIX THAT."
        : `${stats.rooms} ROOM${stats.rooms === 1 ? "" : "S"} LIVE / ${stats.players} LIAR${
            stats.players === 1 ? "" : "S"
          } ONLINE`}
    </span>
  );
}

export function Landing({
  onStart,
  onJoin,
  onRules,
  soundOn,
  onToggleSound,
  play,
}: {
  onStart: () => void;
  onJoin: () => void;
  onRules: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  play: (cue: SoundCue) => void;
}) {
  const [pick, setPick] = useState<number | null>(null);

  const choose = (index: number): void => {
    if (pick !== null) return;
    setPick(index);
    play(DEMO_OPTIONS[index].truth ? "truth" : "capped");
  };

  const correct = pick !== null && DEMO_OPTIONS[pick].truth;

  return (
    <div className="landing" id="top">
      <header className="site-header">
        <Logo />
        <nav className="site-nav" aria-label="Main">
          <button
            type="button"
            className="nav-button"
            onClick={onToggleSound}
            aria-label={soundOn ? "Mute sound" : "Turn sound on"}
          >
            <Icon name={soundOn ? "sound" : "mute"} size={18} />
            <span className="nav-button-label">{soundOn ? "Sound on" : "Muted"}</span>
          </button>
          <button type="button" className="nav-button" onClick={onRules}>
            <Icon name="rules" size={18} />
            <span className="nav-button-label">How to play</span>
          </button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <LiveStats />
            <h1 className="hero-title">
              <span>EVERYONE'S</span>
              <span className="hero-title-acid">LYING.</span>
              <span className="hero-title-small">FIND THE TRUTH.</span>
            </h1>
            <p className="hero-lede">
              One bizarre true fact. One real answer. Everyone else is making theirs up.
              Write a lie, spot the truth, and find out who in the group chat is
              dangerously convincing.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary btn-large" onClick={onStart}>
                Start a room
                <Icon name="arrow" size={20} />
              </button>
              <button type="button" className="btn btn-paper btn-large" onClick={onJoin}>
                Join with a code
              </button>
            </div>
            <p className="hero-fineprint">
              No accounts. No downloads. 5 rounds, about 7 minutes.
            </p>
          </div>

          <div className="demo-wrap">
            <div className="demo-tape demo-tape-one" aria-hidden="true" />
            <div className="demo-tape demo-tape-two" aria-hidden="true" />
            <div className="demo-sticker">SAMPLE ROUND</div>
            <div className="demo-card">
              <div className="demo-card-top">
                <span className="mono">ANIMALS / 001</span>
                <span className="demo-card-tag">THE MISSING FACT</span>
              </div>
              <p className="demo-prompt">
                A group of flamingos is called a{" "}
                <span className="demo-blank" aria-label="blank" />
                .
              </p>
              <p className="demo-hint">
                {pick === null
                  ? "One of these is real. The rest are lies."
                  : correct
                    ? "You found the truth. Suspicious."
                    : "You got capped. That's the game."}
              </p>
              <div className="demo-options">
                {DEMO_OPTIONS.map((option, index) => {
                  const isPicked = pick === index;
                  const showTruth = pick !== null && option.truth;
                  const showCap = pick !== null && isPicked && !option.truth;
                  return (
                    <button
                      key={option.text}
                      type="button"
                      className={`demo-option ${showTruth ? "is-truth" : ""} ${
                        showCap ? "is-cap" : ""
                      }`}
                      onClick={() => choose(index)}
                      disabled={pick !== null}
                    >
                      <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                      <span className="demo-option-text">{option.text}</span>
                      {showTruth && <span className="option-stamp option-stamp-truth">TRUTH</span>}
                      {showCap && <span className="option-stamp option-stamp-cap">CAP</span>}
                    </button>
                  );
                })}
              </div>
              <div className="demo-card-bottom">
                {pick === null ? (
                  <span>Tap the answer you think is real.</span>
                ) : (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setPick(null)}
                  >
                    Run the sample again
                  </button>
                )}
                {pick !== null && <span className="demo-source">Source: Merriam-Webster</span>}
              </div>
            </div>
            <div className="demo-note" aria-hidden="true">
              NOW IMAGINE SEVEN FRIENDS DOING THIS TO YOU
            </div>
          </div>
        </section>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">
            {[...TICKER, ...TICKER].map((item, index) => (
              <span key={`${item}-${index}`}>
                {item}
                <span className="ticker-star">*</span>
              </span>
            ))}
          </div>
        </div>

        <section className="loop-section">
          <div className="section-heading">
            <p className="eyebrow">THE LOOP</p>
            <h2>Easy to learn. Hard to trust anyone.</h2>
          </div>
          <div className="loop-grid">
            <article className="loop-card">
              <span className="loop-number">01</span>
              <div className="loop-icon loop-icon-acid">
                <Icon name="spark" size={26} />
              </div>
              <h3>Invent</h3>
              <p>
                Everyone gets the same strange fact. Everyone writes the most believable
                fake answer they can.
              </p>
            </article>
            <article className="loop-card">
              <span className="loop-number">02</span>
              <div className="loop-icon loop-icon-flare">
                <Icon name="share" size={25} />
              </div>
              <h3>Deceive</h3>
              <p>
                The lies and the real answer get shuffled into one deceptively confident
                pile.
              </p>
            </article>
            <article className="loop-card">
              <span className="loop-number">03</span>
              <div className="loop-icon loop-icon-signal">
                <Icon name="eye" size={25} />
              </div>
              <h3>Expose</h3>
              <p>
                Vote for the truth. Score for finding it, and score every time your lie
                fools the room.
              </p>
            </article>
          </div>
        </section>

        <section className="numbers-strip" aria-label="Game at a glance">
          <div>
            <span className="numbers-value">2-8</span>
            <span className="numbers-label">PLAYERS</span>
          </div>
          <div>
            <span className="numbers-value">5</span>
            <span className="numbers-label">ROUNDS</span>
          </div>
          <div>
            <span className="numbers-value">7</span>
            <span className="numbers-label">MINUTES</span>
          </div>
          <div>
            <span className="numbers-value">0</span>
            <span className="numbers-label">DOWNLOADS</span>
          </div>
        </section>

        <section className="final-cta">
          <div className="final-cta-copy">
            <p className="eyebrow">YOUR GROUP CHAT IS READY</p>
            <h2>Somebody in there is a very good liar.</h2>
            <p>Start a room, send one link, and find out in about seven minutes.</p>
          </div>
          <div className="final-cta-actions">
            <button type="button" className="btn btn-primary btn-large" onClick={onStart}>
              Start a room
              <Icon name="arrow" size={20} />
            </button>
            <button type="button" className="btn btn-ghost btn-large" onClick={onJoin}>
              I have a code
            </button>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-brand">
          <Logo compact />
          <span>A game of creative deception.</span>
        </div>
        <div className="footer-links">
          <button type="button" className="text-button" onClick={onRules}>
            How to play
          </button>
          <span className="footer-sep">/</span>
          <span>2-8 players</span>
          <span className="footer-sep">/</span>
          <span>Made for the group chat</span>
        </div>
      </footer>
    </div>
  );
}
