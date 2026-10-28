import type { CSSProperties, ReactNode } from "react";
import { avatarFor, AVATARS } from "../../shared/avatars";
import type { ReactionKey } from "../../shared/types";
import type { Countdown } from "../lib/useTimer";

const AVATAR_ICONS: Record<string, ReactNode> = {
  ghost: (
    <>
      <path d="M15 51V29a17 17 0 0 1 34 0v22l-5-4-4 4-4-4-4 4-4-4-4 4-4-4-1-2Z" />
      <circle cx="24.5" cy="29" r="2.7" fill="currentColor" stroke="none" />
      <circle cx="39.5" cy="29" r="2.7" fill="currentColor" stroke="none" />
    </>
  ),
  eye: (
    <>
      <path d="M6 32s9.5-15 26-15 26 15 26 15-9.5 15-26 15S6 32 6 32Z" />
      <circle cx="32" cy="32" r="7" />
      <circle cx="32" cy="32" r="1.8" fill="currentColor" stroke="none" />
    </>
  ),
  bolt: (
    <path
      d="M37 5 14 36h14l-2 23 24-34H36V5Z"
      fill="currentColor"
      stroke="none"
      strokeLinejoin="round"
    />
  ),
  cherry: (
    <>
      <path d="M23 26c0-8 4-14 10-17M41 26c0-8-4-14-10-17M32 11c7 5 11 11 11 17" />
      <circle cx="21.5" cy="41" r="9" />
      <circle cx="42.5" cy="41" r="9" />
      <path d="M27 9c4-3 8-5 12-6" />
    </>
  ),
  dice: (
    <>
      <rect x="10" y="10" width="44" height="44" rx="10" />
      <circle cx="22" cy="22" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="42" cy="22" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="32" cy="32" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="22" cy="42" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="42" cy="42" r="2.6" fill="currentColor" stroke="none" />
    </>
  ),
  skull: (
    <>
      <path d="M20 50v-6.5C14.8 40 12 34.7 12 29c0-10 8.7-17 20-17s20 7 20 17c0 5.7-2.8 11-8 14.5V50H20Z" />
      <circle cx="24.5" cy="29" r="5" fill="currentColor" stroke="none" />
      <circle cx="39.5" cy="29" r="5" fill="currentColor" stroke="none" />
      <path d="m32 36-3 4h6l-3-4ZM25 50v-6M32 50v-6M39 50v-6" />
    </>
  ),
  alien: (
    <>
      <path d="M32 7c12 0 20 9 20 22 0 17-12 28-20 28S12 46 12 29C12 16 20 7 32 7Z" />
      <path d="M17 28c3-2 7-3 11-2 2 5 1 10-3 12-4 1-7-1-8-4v-6Z" fill="currentColor" stroke="none" />
      <path d="M47 28c-3-2-7-3-11-2-2 5-1 10 3 12 4 1 7-1 8-4v-6Z" fill="currentColor" stroke="none" />
      <path d="M28 47c2.5 1.5 5.5 1.5 8 0" />
    </>
  ),
  crown: (
    <>
      <path d="m9 46 4-27 12 10 7-16 7 16 12-10 4 27H9Z" />
      <path d="M13 46h38" />
      <circle cx="9" cy="16" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="32" cy="10" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="55" cy="16" r="2.4" fill="currentColor" stroke="none" />
    </>
  ),
  flower: (
    <>
      <circle cx="32" cy="30" r="6" fill="currentColor" stroke="none" />
      <circle cx="32" cy="14" r="8" />
      <circle cx="44" cy="22.5" r="8" />
      <circle cx="39.5" cy="38.5" r="8" />
      <circle cx="24.5" cy="38.5" r="8" />
      <circle cx="20" cy="22.5" r="8" />
      <path d="M32 44v13M32 51c-4 0-7-2-8-5M32 55c4 0 7-2 8-5" />
    </>
  ),
  wave: (
    <>
      <path d="M7 21c5-5 10-5 15 0s10 5 15 0 10-5 15 0 5 4 5 4" />
      <path d="M7 32c5-5 10-5 15 0s10 5 15 0 10-5 15 0 5 4 5 4" />
      <path d="M7 43c5-5 10-5 15 0s10 5 15 0 10-5 15 0 5 4 5 4" />
      <path d="M7 54c5-5 10-5 15 0s10 5 15 0 10-5 15 0 5 4 5 4" />
    </>
  ),
  heart: (
    <path
      d="M32 55S7 40 7 23.5C7 14.8 13.4 9 21 9c4.8 0 9 2.5 11 6.4C34 11.5 38.2 9 43 9c7.6 0 14 5.8 14 14.5C57 40 32 55 32 55Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  star: (
    <path
      d="m32 5 7.8 16.9 18.2 2.4-13.4 12.8 3.4 18.4L32 46.8 16 55.5l3.4-18.4L6 24.3l18.2-2.4L32 5Z"
      fill="currentColor"
      stroke="none"
    />
  ),
};

export type UiIconName =
  | "arrow"
  | "check"
  | "chevron"
  | "clock"
  | "copy"
  | "eye"
  | "leave"
  | "lock"
  | "minus"
  | "mute"
  | "plus"
  | "rules"
  | "share"
  | "sound"
  | "spark"
  | "x";

const UI_ICONS: Record<UiIconName, ReactNode> = {
  arrow: <path d="M5 19h25M21 10l9 9-9 9" />,
  check: <path d="m5 20 9 9L31 9" />,
  chevron: <path d="m12 7 10 10-10 10" />,
  clock: (
    <>
      <circle cx="18" cy="18" r="13" />
      <path d="M18 10v9l6 4" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="19" height="19" rx="3" />
      <path d="M23 5h3a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H10" />
    </>
  ),
  eye: (
    <>
      <path d="M3 18s6-9 15-9 15 9 15 9-6 9-15 9S3 18 3 18Z" />
      <circle cx="18" cy="18" r="4" />
    </>
  ),
  leave: <path d="M12 5H5v26h7M20 10l8 8-8 8M28 18H8" />,
  lock: (
    <>
      <rect x="7" y="15" width="22" height="16" rx="3" />
      <path d="M12 15v-4a6 6 0 0 1 12 0v4M18 22v4" />
    </>
  ),
  minus: <path d="M6 18h24" />,
  mute: (
    <>
      <path d="M5 14v8h6l7 6V8l-7 6H5Z" />
      <path d="m22 14 8 8M30 14l-8 8" />
    </>
  ),
  plus: <path d="M18 6v24M6 18h24" />,
  rules: (
    <>
      <circle cx="18" cy="18" r="13" />
      <path d="M14 14a4.2 4.2 0 1 1 6.6 3.4c-1.7 1.1-2.6 2-2.6 4.1" />
      <circle cx="18" cy="27" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  share: (
    <>
      <circle cx="26" cy="8" r="4" />
      <circle cx="8" cy="18" r="4" />
      <circle cx="26" cy="28" r="4" />
      <path d="m11.5 16 11-6M11.5 20l11 6" />
    </>
  ),
  sound: (
    <>
      <path d="M5 14v8h6l7 6V8l-7 6H5Z" />
      <path d="M22 12c3.8 3.4 3.8 8.6 0 12M26 7c7 6.2 7 15.8 0 22" />
    </>
  ),
  spark: (
    <>
      <path d="m18 4 2.8 8.2L29 15l-8.2 2.8L18 26l-2.8-8.2L7 15l8.2-2.8L18 4Z" />
      <path d="m29 24 1.5 4.5L35 30l-4.5 1.5L29 36l-1.5-4.5L23 30l4.5-1.5L29 24Z" />
    </>
  ),
  x: <path d="M7 7l22 22M29 7 7 29" />,
};

const REACTION_ICONS: Record<ReactionKey, ReactNode> = {
  skull: (
    <>
      <path d="M20 50v-6.5C14.8 40 12 34.7 12 29c0-10 8.7-17 20-17s20 7 20 17c0 5.7-2.8 11-8 14.5V50H20Z" />
      <circle cx="24.5" cy="29" r="5" fill="currentColor" stroke="none" />
      <circle cx="39.5" cy="29" r="5" fill="currentColor" stroke="none" />
      <path d="m32 36-3 4h6l-3-4ZM25 50v-6M32 50v-6M39 50v-6" />
    </>
  ),
  cry: (
    <>
      <circle cx="32" cy="32" r="23" />
      <path d="M22 27h6M36 27h6M24 42c2-5 5-7 8-7s6 2 8 7" />
      <path d="M21 35c-2 3-3 5-3 7a3 3 0 0 0 6 0c0-2-1-4-3-7ZM43 35c-2 3-3 5-3 7a3 3 0 0 0 6 0c0-2-1-4-3-7Z" fill="currentColor" stroke="none" />
    </>
  ),
  eyes: (
    <>
      <path d="M5 32s7-10 14-10 14 10 14 10-7 10-14 10S5 32 5 32Z" />
      <circle cx="19" cy="32" r="4.3" fill="currentColor" stroke="none" />
      <path d="M33 32s7-10 14-10 14 10 14 10-7 10-14 10-14-10-14-10Z" />
      <circle cx="47" cy="32" r="4.3" fill="currentColor" stroke="none" />
    </>
  ),
  fire: (
    <path
      d="M33 5c2 12-9 15-9 27 0 4 2 7 5 9-1-6 2-10 5-13 1 8 7 10 7 18 0 3-1 6-3 8 12-3 18-12 18-22 0-12-9-20-15-27-1 7-4 10-8 12 1-6 0-10 0-12Z"
      fill="currentColor"
      stroke="none"
    />
  ),
};

export function Avatar({
  index,
  size = 44,
  className = "",
  title,
  style,
}: {
  index: number;
  size?: number | string;
  className?: string;
  title?: string;
  style?: CSSProperties;
}) {
  const definition = avatarFor(index);
  return (
    <span
      className={`avatar ${className}`}
      style={{ background: definition.background, width: size, height: size, ...style }}
      title={title ?? definition.name}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        {AVATAR_ICONS[definition.icon]}
      </svg>
    </span>
  );
}

export function ReactionGlyph({ reaction }: { reaction: ReactionKey }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {REACTION_ICONS[reaction]}
    </svg>
  );
}

export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: UiIconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {UI_ICONS[name]}
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`logo ${compact ? "logo-compact" : ""}`} aria-label="CAP">
      <span className="logo-word">CAP</span>
      <span className="logo-dot" aria-hidden="true" />
    </span>
  );
}

export function PromptText({
  text,
  blank = false,
}: {
  text: string;
  blank?: boolean;
}) {
  const parts = text.split("_____");
  const suffixes = parts.slice(1).map((part) => {
    const match = part.match(/^([.,;:!?)]+)([\s\S]*)$/u);
    return {
      punctuation: match?.[1] ?? "",
      rest: match?.[2] ?? part,
    };
  });

  return (
    <>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index === 0 ? part : (suffixes[index - 1]?.rest ?? "")}
          {index < parts.length - 1 && (
            <span className="prompt-blank-unit">
              {blank ? (
                <span className="prompt-blank" aria-label="blank">
                  <span className="prompt-caret" aria-hidden="true" />
                </span>
              ) : (
                <span className="prompt-blank prompt-blank-static" aria-hidden="true" />
              )}
              {suffixes[index]?.punctuation ?? ""}
            </span>
          )}
        </span>
      ))}
    </>
  );
}

export function FactText({ text, truth }: { text: string; truth: string }) {
  const index = text.toLowerCase().indexOf(truth.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + truth.length)}</mark>
      {text.slice(index + truth.length)}
    </>
  );
}

export function Timer({ countdown }: { countdown: Countdown }) {
  if (countdown.remainingMs === null) return null;
  return (
    <div
      className={`timer ${countdown.urgent ? "timer-urgent" : ""} ${
        countdown.paused ? "timer-paused" : ""
      }`}
      role="timer"
      aria-label={
        countdown.paused
          ? "Timer paused"
          : `${countdown.seconds ?? 0} seconds remaining in this phase`
      }
    >
      <span className="timer-label">
        <Icon name="clock" size={15} />
        {countdown.paused ? "HOLD" : countdown.label}
      </span>
      <span className="timer-track" aria-hidden="true">
        <span
          className="timer-fill"
          style={{ transform: `scaleX(${countdown.fraction ?? 0})` }}
        />
      </span>
    </div>
  );
}

export function AvatarChoices({
  value,
  onChange,
}: {
  value: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="avatar-grid" role="radiogroup" aria-label="Choose an avatar">
      {AVATARS.map((avatar, index) => (
        <button
          key={avatar.id}
          type="button"
          className={`avatar-choice ${value === index ? "is-selected" : ""}`}
          onClick={() => onChange(index)}
          role="radio"
          aria-checked={value === index}
          aria-label={avatar.name}
        >
          <Avatar index={index} size="100%" />
          <span className="avatar-choice-check" aria-hidden="true">
            <Icon name="check" size={13} />
          </span>
        </button>
      ))}
    </div>
  );
}
