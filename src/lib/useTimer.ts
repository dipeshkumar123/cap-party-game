import { useEffect, useState } from "react";
import type { GameView } from "../types";

export interface Countdown {
  remainingMs: number | null;
  totalMs: number | null;
  fraction: number | null;
  seconds: number | null;
  label: string;
  urgent: boolean;
  paused: boolean;
  expired: boolean;
}

export function useCountdown(view: GameView | null): Countdown {
  const [, setTick] = useState(0);
  const phase = view?.state.phase ?? null;
  const paused = view?.state.paused ?? false;
  const phaseEndsAt = view?.state.phaseEndsAt ?? null;
  const receivedAt = view?.receivedAt ?? null;

  useEffect(() => {
    if (!view) return;
    if (!paused && !phaseEndsAt) return;
    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 100);
    return () => window.clearInterval(interval);
  }, [view, paused, phaseEndsAt, phase, receivedAt]);

  if (!view) {
    return {
      remainingMs: null,
      totalMs: null,
      fraction: null,
      seconds: null,
      label: "--:--",
      urgent: false,
      paused: false,
      expired: false,
    };
  }

  const { state } = view;
  let remainingMs: number | null = null;
  if (state.paused) {
    remainingMs = state.pausedRemainingMs;
  } else if (state.phaseEndsAt !== null) {
    const anchor = state.phaseEndsAt - state.serverNow;
    const elapsed = Date.now() - view.receivedAt;
    remainingMs = Math.max(0, anchor - elapsed);
  }

  const totalMs = state.phaseDurationMs;
  const fraction =
    remainingMs !== null && totalMs && totalMs > 0
      ? Math.max(0, Math.min(1, remainingMs / totalMs))
      : null;
  const seconds = remainingMs === null ? null : Math.ceil(remainingMs / 1000);
  const label =
    seconds === null
      ? "--:--"
      : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return {
    remainingMs,
    totalMs,
    fraction,
    seconds,
    label,
    urgent: remainingMs !== null && remainingMs <= 10_000,
    paused: state.paused,
    expired: remainingMs !== null && remainingMs <= 0,
  };
}
