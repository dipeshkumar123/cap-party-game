export type SoundCue =
  | "tap"
  | "join"
  | "lock"
  | "vote"
  | "reveal"
  | "truth"
  | "capped"
  | "win";

let audio: AudioContext | null = null;

function context(): AudioContext | null {
  try {
    if (!audio) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audio = new Ctor();
    }
    if (audio.state === "suspended") void audio.resume();
    return audio;
  } catch {
    return null;
  }
}

export function primeAudio(): void {
  context();
}

function tone(
  frequency: number,
  startOffset: number,
  duration: number,
  options: { type?: OscillatorType; volume?: number; endFrequency?: number } = {},
): void {
  const ctx = context();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + startOffset;
  const volume = options.volume ?? 0.06;

  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  if (options.endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, options.endFrequency),
      start + duration,
    );
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(startOffset: number, duration: number, volume = 0.025): void {
  const ctx = context();
  if (!ctx) return;
  const frames = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < frames; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / frames);
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + startOffset);
}

export function playCue(cue: SoundCue, enabled: boolean): void {
  if (!enabled) return;

  switch (cue) {
    case "tap":
      tone(520, 0, 0.055, { type: "triangle", volume: 0.028 });
      break;
    case "join":
      tone(330, 0, 0.1, { type: "triangle", volume: 0.04 });
      tone(494, 0.07, 0.16, { type: "triangle", volume: 0.035 });
      break;
    case "lock":
      tone(180, 0, 0.08, { type: "square", volume: 0.035 });
      noise(0.01, 0.07, 0.018);
      tone(110, 0.08, 0.14, { type: "triangle", volume: 0.04 });
      break;
    case "vote":
      tone(280, 0, 0.08, { type: "sine", volume: 0.04 });
      tone(420, 0.08, 0.12, { type: "sine", volume: 0.03 });
      break;
    case "reveal":
      tone(220, 0, 0.3, { type: "sine", volume: 0.025, endFrequency: 540 });
      noise(0.15, 0.25, 0.012);
      break;
    case "truth":
      tone(660, 0, 0.12, { type: "triangle", volume: 0.05 });
      tone(880, 0.11, 0.16, { type: "triangle", volume: 0.045 });
      tone(1320, 0.24, 0.22, { type: "sine", volume: 0.035 });
      break;
    case "capped":
      tone(180, 0, 0.18, { type: "sawtooth", volume: 0.025, endFrequency: 90 });
      noise(0.02, 0.12, 0.015);
      break;
    case "win":
      tone(392, 0, 0.14, { type: "triangle", volume: 0.05 });
      tone(494, 0.12, 0.14, { type: "triangle", volume: 0.05 });
      tone(587, 0.24, 0.16, { type: "triangle", volume: 0.05 });
      tone(784, 0.38, 0.34, { type: "triangle", volume: 0.055 });
      tone(988, 0.55, 0.36, { type: "sine", volume: 0.03 });
      break;
    default:
      break;
  }
}
