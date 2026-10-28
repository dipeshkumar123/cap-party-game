import { useRef, useState, type FormEvent } from "react";
import type { SessionResult } from "../../shared/types";
import type { SoundCue } from "../lib/sound";
import { loadName, pickedAvatar, saveAvatar, saveName } from "../lib/storage";
import { AvatarChoices, Icon, Logo } from "./visual";

const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u;
const CODE_PATTERN = /^[A-Z0-9]{5}$/;

export function Setup({
  mode,
  initialCode,
  onBack,
  onCreate,
  onJoin,
  onRules,
  soundOn,
  onToggleSound,
  play,
}: {
  mode: "create" | "join";
  initialCode?: string;
  onBack: () => void;
  onCreate: (name: string, avatar: number) => Promise<SessionResult>;
  onJoin: (code: string, name: string, avatar: number) => Promise<SessionResult>;
  onRules: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  play: (cue: SoundCue) => void;
}) {
  const [name, setName] = useState(loadName);
  const [code, setCode] = useState(initialCode ?? "");
  const [avatar, setAvatar] = useState(pickedAvatar);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (loading) return;

    const trimmed = name.trim().replace(/\s+/g, " ");
    if (trimmed.length < 2 || trimmed.length > 16) {
      setError("Your name needs 2-16 characters.");
      nameRef.current?.focus();
      return;
    }
    if (!NAME_PATTERN.test(trimmed)) {
      setError("Use letters, numbers, spaces, or . _ - in your name.");
      nameRef.current?.focus();
      return;
    }

    const normalizedCode = code.trim().toUpperCase();
    if (mode === "join" && !CODE_PATTERN.test(normalizedCode)) {
      setError("Room codes are exactly 5 letters or numbers.");
      codeRef.current?.focus();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result =
        mode === "create"
          ? await onCreate(trimmed, avatar)
          : await onJoin(normalizedCode, trimmed, avatar);

      if (!result.ok) {
        setError(result.error.message);
        play("capped");
        if (
          result.error.code === "ROOM_NOT_FOUND" ||
          result.error.code === "CODE_NOT_FOUND"
        ) {
          codeRef.current?.focus();
        } else if (result.error.code === "NAME_TAKEN") {
          nameRef.current?.focus();
        }
        return;
      }

      saveName(trimmed);
      saveAvatar(avatar);
      play("join");
    } catch {
      setError("Something went wrong. Try that again.");
      play("capped");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-screen">
      <header className="site-header">
        <button type="button" className="back-button" onClick={onBack}>
          <Icon name="arrow" size={19} />
          <span>Back</span>
        </button>
        <Logo compact />
        <nav className="site-nav" aria-label="Main">
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
        </nav>
      </header>

      <main className="setup-main">
        <div className="setup-intro">
          <p className="eyebrow">
            {mode === "create" ? "NEW ROOM / 2-8 PLAYERS" : "YOU HAVE A CODE"}
          </p>
          <h1>
            {mode === "create" ? (
              <>
                Start a room.
                <br />
                <span className="text-muted">Invite the liars.</span>
              </>
            ) : (
              <>
                Get in.
                <br />
                <span className="text-muted">Try to be trusted.</span>
              </>
            )}
          </h1>
          <p>
            Pick a name and a totem. That is the entire signup process. Your name stays on
            this device.
          </p>
        </div>

        <form className="setup-card" onSubmit={submit} noValidate>
          {mode === "join" && (
            <div className="field">
              <label htmlFor="room-code">Room code</label>
              <input
                ref={codeRef}
                id="room-code"
                className="input input-code"
                value={code}
                onChange={(event) => {
                  const next = event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 5);
                  setCode(next);
                  setError(null);
                }}
                placeholder="ABCDE"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={5}
                aria-invalid={Boolean(error && !CODE_PATTERN.test(code))}
                aria-describedby="code-hint"
              />
              <p className="field-hint" id="code-hint">
                5 characters. No confusing O, 0, I, or 1 in the good codes.
              </p>
            </div>
          )}

          <div className="field">
            <label htmlFor="display-name">Your name</label>
            <input
              ref={nameRef}
              id="display-name"
              className="input"
              value={name}
              onChange={(event) => {
                setName(event.target.value.slice(0, 16));
                setError(null);
              }}
              placeholder="The trustworthy one"
              autoComplete="nickname"
              maxLength={16}
              aria-invalid={Boolean(error && name.trim().length < 2)}
              aria-describedby="name-count"
            />
            <p className="field-hint field-count" id="name-count">
              {name.length}/16
            </p>
          </div>

          <fieldset className="field avatar-field">
            <legend>Pick your totem</legend>
            <AvatarChoices value={avatar} onChange={setAvatar} />
          </fieldset>

          {error && (
            <p className="form-error" role="alert">
              <span aria-hidden="true">!</span>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-large btn-full"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {mode === "create" ? "Opening the room..." : "Getting you in..."}
              </>
            ) : (
              <>
                {mode === "create" ? "Create the room" : "Join the room"}
                <Icon name="arrow" size={20} />
              </>
            )}
          </button>

          <p className="setup-fineprint">
            By entering, you agree to be lied to and to lie back. Nothing here is saved
            beyond your name on this device.
          </p>
        </form>
      </main>
    </div>
  );
}
