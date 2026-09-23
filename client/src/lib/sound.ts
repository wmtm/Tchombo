// All sound effects here are synthesized at runtime with the Web Audio API —
// no audio files, so there is nothing to license and nothing to pay for.

const STORAGE_KEY = "tchombo.soundEnabled";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === "1";
}

export function setSoundEnabled(enabled: boolean) {
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
}

interface Tone {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

function playTones(tones: Tone[]) {
  if (!isSoundEnabled()) return;
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;

  for (const tone of tones) {
    const osc = audio.createOscillator();
    const gainNode = audio.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.setValueAtTime(tone.freq, now + tone.start);

    const peak = tone.gain ?? 0.15;
    const t0 = now + tone.start;
    const t1 = t0 + tone.duration;
    gainNode.gain.setValueAtTime(0, t0);
    gainNode.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.015, tone.duration / 4));
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t1);

    osc.connect(gainNode);
    gainNode.connect(audio.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }
}

export const sound = {
  unlock() {
    getContext();
  },
  turn() {
    playTones([{ freq: 720, start: 0, duration: 0.09, type: "sine", gain: 0.12 }, { freq: 980, start: 0.08, duration: 0.12, type: "sine", gain: 0.12 }]);
  },
  submit() {
    playTones([{ freq: 520, start: 0, duration: 0.07, type: "triangle", gain: 0.14 }]);
  },
  tchomboCall() {
    playTones([
      { freq: 260, start: 0, duration: 0.12, type: "sawtooth", gain: 0.14 },
      { freq: 200, start: 0.1, duration: 0.16, type: "sawtooth", gain: 0.14 },
    ]);
  },
  success() {
    playTones([
      { freq: 523, start: 0, duration: 0.1, type: "sine", gain: 0.14 },
      { freq: 659, start: 0.09, duration: 0.1, type: "sine", gain: 0.14 },
      { freq: 784, start: 0.18, duration: 0.18, type: "sine", gain: 0.16 },
    ]);
  },
  fail() {
    playTones([
      { freq: 300, start: 0, duration: 0.16, type: "sine", gain: 0.14 },
      { freq: 220, start: 0.14, duration: 0.22, type: "sine", gain: 0.14 },
    ]);
  },
  dodoAwarded(count: number) {
    const tones: Tone[] = [];
    for (let i = 0; i < Math.min(count, 5); i++) {
      tones.push({ freq: 180 + (i % 2) * 40, start: i * 0.09, duration: 0.08, type: "square", gain: 0.09 });
    }
    playTones(tones);
  },
  gameOver() {
    playTones([
      { freq: 392, start: 0, duration: 0.14, type: "triangle", gain: 0.14 },
      { freq: 330, start: 0.13, duration: 0.14, type: "triangle", gain: 0.14 },
      { freq: 262, start: 0.26, duration: 0.3, type: "triangle", gain: 0.16 },
    ]);
  },
};
