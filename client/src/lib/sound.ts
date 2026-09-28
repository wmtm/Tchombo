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

// Like a Tone, but its pitch can glide from `freq` to `glideTo` over the note's
// duration -- needed for the wordless vocal-ish inflections below (a skeptical
// "hmmm" dip, a surprised "ooooh" rise) that a flat frequency can't fake.
interface GlideTone extends Tone {
  glideTo?: number;
}

function playGlideTones(tones: GlideTone[]) {
  if (!isSoundEnabled()) return;
  const audio = getContext();
  if (!audio) return;
  const now = audio.currentTime;

  for (const tone of tones) {
    const osc = audio.createOscillator();
    const gainNode = audio.createGain();
    osc.type = tone.type ?? "sine";
    const t0 = now + tone.start;
    const t1 = t0 + tone.duration;
    osc.frequency.setValueAtTime(tone.freq, t0);
    if (tone.glideTo !== undefined) {
      osc.frequency.linearRampToValueAtTime(tone.glideTo, t1);
    }

    const peak = tone.gain ?? 0.15;
    gainNode.gain.setValueAtTime(0, t0);
    gainNode.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.015, tone.duration / 4));
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t1);

    osc.connect(gainNode);
    gainNode.connect(audio.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }
}

// Wordless, comedic "judging" reactions played only on the submitting player's
// own device right after they lock in a guess. Deliberately meaningless -- the
// pattern is picked at random and has nothing to do with whether the guess is
// good, so nobody can read anything into which one plays.
const JUDGMENT_REACTIONS: GlideTone[][] = [
  // skeptical "hmmm" -- a slow downward dip
  [{ freq: 340, glideTo: 230, start: 0, duration: 0.38, type: "sine", gain: 0.13 }],
  // bright "aha!" -- a quick upward blip
  [{ freq: 420, glideTo: 760, start: 0, duration: 0.14, type: "triangle", gain: 0.15 }],
  // nodding "uh-huh" -- two short notes
  [
    { freq: 360, start: 0, duration: 0.1, type: "sine", gain: 0.13 },
    { freq: 300, start: 0.12, duration: 0.12, type: "sine", gain: 0.13 },
  ],
  // impressed "ooooh" -- a slow rise
  [{ freq: 260, glideTo: 520, start: 0, duration: 0.5, type: "sine", gain: 0.12 }],
  // comedic "uh-oh" -- a falling third
  [
    { freq: 500, start: 0, duration: 0.12, type: "sine", gain: 0.14 },
    { freq: 330, start: 0.17, duration: 0.18, type: "sine", gain: 0.14 },
  ],
  // disapproving "tsk-tsk" -- two dry staccato clicks
  [
    { freq: 650, start: 0, duration: 0.05, type: "square", gain: 0.08 },
    { freq: 650, start: 0.11, duration: 0.05, type: "square", gain: 0.08 },
  ],
];

export const sound = {
  unlock() {
    getContext();
  },
  turn() {
    playTones([{ freq: 720, start: 0, duration: 0.09, type: "sine", gain: 0.12 }, { freq: 980, start: 0.08, duration: 0.12, type: "sine", gain: 0.12 }]);
  },
  // A random wordless "judging" reaction to your own guess -- see JUDGMENT_REACTIONS.
  judge() {
    const pattern = JUDGMENT_REACTIONS[Math.floor(Math.random() * JUDGMENT_REACTIONS.length)];
    playGlideTones(pattern);
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
