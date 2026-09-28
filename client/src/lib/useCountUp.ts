import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./motion";

function countDecimals(n: number): number {
  if (Number.isInteger(n)) return 0;
  return n.toString().split(".")[1]?.length ?? 0;
}

// Animates from 0 up to `target` on mount / whenever `resetKey` changes, for
// the dramatic "answer reveal" beat. Snaps to the exact target on the final
// frame (and preserves its decimal places throughout) so it never drifts off
// due to floating-point rounding along the way.
export function useCountUp(target: number, durationMs = 700, resetKey?: unknown): number {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(target);
      return;
    }
    const decimals = countDecimals(target);
    const start = performance.now();
    let raf: number;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(t >= 1 ? target : Number((target * eased).toFixed(decimals)));
      if (t < 1) raf = requestAnimationFrame(tick);
    }

    setDisplay(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, resetKey]);

  return display;
}
