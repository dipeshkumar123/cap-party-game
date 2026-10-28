const SESSION_KEY = "cap.session.v1";
const NAME_KEY = "cap.name.v1";
const AVATAR_KEY = "cap.avatar.v1";
const SOUND_KEY = "cap.sound.v1";
const HINT_KEY = "cap.hint.";

import type { StoredSession } from "../types";

function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function loadSession(): StoredSession | null {
  const session = readJson<StoredSession>(SESSION_KEY);
  if (
    !session ||
    typeof session.roomCode !== "string" ||
    typeof session.playerId !== "string" ||
    typeof session.token !== "string"
  ) {
    return null;
  }
  return session;
}

export function saveSession(session: StoredSession): void {
  writeJson(SESSION_KEY, session);
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    return;
  }
}

export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    return;
  }
}

export function loadAvatar(): number | null {
  const raw = Number(localStorage.getItem(AVATAR_KEY));
  return Number.isInteger(raw) && raw >= 0 ? raw : null;
}

export function saveAvatar(avatar: number): void {
  try {
    localStorage.setItem(AVATAR_KEY, String(avatar));
  } catch {
    return;
  }
}

export function loadSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveSound(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch {
    return;
  }
}

export function hasSeenHint(name: string): boolean {
  try {
    return localStorage.getItem(`${HINT_KEY}${name}`) === "1";
  } catch {
    return false;
  }
}

export function markHintSeen(name: string): void {
  try {
    localStorage.setItem(`${HINT_KEY}${name}`, "1");
  } catch {
    return;
  }
}

export function roomCodeFromUrl(): string | null {
  try {
    const code = new URLSearchParams(window.location.search).get("room");
    if (!code) return null;
    const normalized = code.trim().toUpperCase();
    return /^[A-Z0-9]{5}$/.test(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function setRoomInUrl(code: string | null): void {
  try {
    const url = new URL(window.location.href);
    if (code) {
      if (url.searchParams.get("room") === code) return;
      url.searchParams.set("room", code);
    } else {
      if (!url.searchParams.has("room")) return;
      url.searchParams.delete("room");
    }
    window.history.replaceState({}, "", url);
  } catch {
    return;
  }
}

export function inviteLink(code: string): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("room", code);
  return url.toString();
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }
}

export async function shareText(
  title: string,
  text: string,
  url?: string,
): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }
  const payload = url ? `${text}\n${url}` : text;
  return (await copyText(payload)) ? "copied" : "failed";
}

export function score(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function pickedAvatar(): number {
  const saved = loadAvatar();
  if (saved !== null) return saved % 12;
  return Math.floor(Math.random() * 12);
}
