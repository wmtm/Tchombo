import { useState } from "react";
import { prefersReducedMotion } from "../lib/motion";

const COLORS = ["#D9553C", "#D9A441", "#2E6E52", "#0E1E3A", "#F0CF8C"];

interface Piece {
  key: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotate: number;
}

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    key: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.8 + Math.random() * 1.2,
    size: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length],
    rotate: Math.random() * 360,
  }));
}

// A one-shot confetti burst for the game's two biggest payoff moments (a
// winner, an exact call). CSS-only falling pieces -- no canvas, no library.
// Pieces are generated once via lazy useState init so re-renders of the
// parent screen (e.g. a ticking countdown) don't reshuffle them mid-fall.
export function Confetti({ count = 44 }: { count?: number }) {
  const [pieces] = useState(() => makePieces(count));
  if (prefersReducedMotion()) return null;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-40" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.key}
          className="absolute top-0 rounded-sm animate-confetti-fall"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
