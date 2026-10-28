import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { ReactionKey } from "../../shared/types";
import type { ToastItem } from "../types";
import type { FloatingReaction } from "../types";
import type { ConnectionState } from "../types";
import type { PublicState } from "../../shared/types";
import { Icon, Logo, ReactionGlyph, Avatar } from "./visual";

export function Modal({
  open,
  onClose,
  title,
  children,
  className = "",
  eyebrow,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  eyebrow?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    document.body.classList.add("modal-open");
    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusables?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
      restoreFocus.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`modal-panel ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Never mind",
  onConfirm,
  onClose,
  busy = false,
  danger = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} className="confirm-panel">
      <div className="confirm-body">{children}</div>
      <div className="button-row confirm-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Working..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function RulesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How to play CAP"
      eyebrow="The whole rulebook"
      className="rules-panel"
    >
      <div className="rules-body">
        <ol className="rules-list">
          <li>
            <span>01</span>
            <p>You get a real fact with one detail missing.</p>
          </li>
          <li>
            <span>02</span>
            <p>Everyone writes a lie that sounds like the truth.</p>
          </li>
          <li>
            <span>03</span>
            <p>All the lies are shuffled together with the real answer.</p>
          </li>
          <li>
            <span>04</span>
            <p>Vote for the answer you think is real. You cannot vote for your own lie.</p>
          </li>
          <li>
            <span>05</span>
            <p>Find the truth, fool the room, and run it back for five rounds.</p>
          </li>
        </ol>

        <div className="rules-score">
          <div>
            <span className="mono-label">SCORING</span>
            <p>
              <strong>+1,000</strong> for finding the truth
            </p>
            <p>
              <strong>+500</strong> per player fooled by your lie
            </p>
            <p>
              <strong>+1,000</strong> for a Perfect Cap, when every other player votes for
              your lie
            </p>
          </div>
          <div>
            <span className="mono-label">MULTIPLIERS</span>
            <div className="multiplier-row">
              <span>R1 x1</span>
              <span>R2 x1</span>
              <span>R3 x2</span>
              <span>R4 x2</span>
              <span className="is-final">R5 x3</span>
            </div>
            <p className="rules-note">
              Five rounds. The Final Cap is worth triple. Highest score wins.
            </p>
          </div>
        </div>

        <div className="rules-footer">
          <p>2-8 players. One phone each. No download. No account. Bring your worst friends.</p>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`} role="status">
          <span className="toast-mark" aria-hidden="true">
            {toast.tone === "error" ? "!" : toast.tone === "success" ? "OK" : "i"}
          </span>
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss message"
            onClick={() => onDismiss(toast.id)}
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

const REACTIONS: Array<{ key: ReactionKey; label: string }> = [
  { key: "skull", label: "Dead" },
  { key: "cry", label: "Crying" },
  { key: "eyes", label: "Watching" },
  { key: "fire", label: "Fire" },
];

export function ReactionDock({
  onReact,
  disabled = false,
}: {
  onReact: (reaction: ReactionKey) => void;
  disabled?: boolean;
}) {
  const [cooldown, setCooldown] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const react = (reaction: ReactionKey): void => {
    if (cooldown || disabled) return;
    setCooldown(true);
    onReact(reaction);
    timer.current = window.setTimeout(() => setCooldown(false), 750);
  };

  return (
    <div className="reaction-dock" aria-label="Send a reaction">
      {REACTIONS.map((reaction) => (
        <button
          key={reaction.key}
          type="button"
          className="reaction-button"
          onClick={() => react(reaction.key)}
          disabled={disabled || cooldown}
          aria-label={`React with ${reaction.label}`}
          title={reaction.label}
        >
          <ReactionGlyph reaction={reaction.key} />
        </button>
      ))}
    </div>
  );
}

function positionFor(id: string): { left: number; drift: number; tilt: number } {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return {
    left: 7 + (hash % 76),
    drift: ((hash >>> 8) % 120) - 60,
    tilt: ((hash >>> 16) % 16) - 8,
  };
}

export function ReactionLayer({ reactions }: { reactions: FloatingReaction[] }) {
  return (
    <div className="reaction-layer" aria-hidden="true">
      {reactions.map((reaction) => {
        const position = positionFor(reaction.id);
        return (
          <div
            key={reaction.id}
            className="floating-reaction"
            style={
              {
                left: `${position.left}%`,
                "--drift": `${position.drift}px`,
                "--tilt": `${position.tilt}deg`,
              } as CSSProperties
            }
          >
            <span className="floating-reaction-bubble">
              <ReactionGlyph reaction={reaction.reaction} />
            </span>
            <span className="floating-reaction-name">
              <Avatar index={reaction.avatar} size={18} />
              {reaction.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ConnectionBanner({ connection }: { connection: ConnectionState }) {
  if (connection === "connected") return null;
  return (
    <div className="connection-banner" role="status">
      <span className="signal-dot" aria-hidden="true" />
      {connection === "connecting"
        ? "Connecting to the room..."
        : "Connection lost. Holding your seat while we reconnect."}
    </div>
  );
}

export function PauseNotice({ state }: { state: PublicState }) {
  const missing = state.players.filter((player) => !player.connected);
  return (
    <div className="pause-notice" role="status">
      <div className="pause-icon" aria-hidden="true">
        <span />
        <span />
      </div>
      <div>
        <p className="eyebrow">ROOM PAUSED</p>
        <h2>The clock is holding.</h2>
        <p>
          Waiting for{" "}
          {missing.length > 0
            ? missing.map((player) => player.name).join(", ")
            : "another player"}{" "}
          to reconnect.
        </p>
      </div>
      <div className="pause-avatars" aria-hidden="true">
        {missing.slice(0, 4).map((player) => (
          <Avatar key={player.id} index={player.avatar} size={34} />
        ))}
      </div>
    </div>
  );
}

export function RestoreScreen({
  roomCode,
  connection,
  onCancel,
}: {
  roomCode: string;
  connection: ConnectionState;
  onCancel: () => void;
}) {
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowCancel(true), 4500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="restore-screen">
      <div className="restore-card">
        <Logo />
        <p className="eyebrow">REJOINING ROOM {roomCode}</p>
        <h1>Back to the room.</h1>
        <p>
          {connection === "offline"
            ? "The server is not answering yet. Your seat is still waiting."
            : "Pulling your seat, your score, and your terrible lies back in."}
        </p>
        <div className="restore-progress" aria-hidden="true">
          <span />
        </div>
        {showCancel && (
          <button type="button" className="text-button" onClick={onCancel}>
            Use the lobby instead
          </button>
        )}
      </div>
    </main>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Icon name="spark" size={26} />
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
