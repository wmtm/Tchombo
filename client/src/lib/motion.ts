// CSS alone (see the prefers-reduced-motion block in index.css) can't stop a
// JS-driven animation like a requestAnimationFrame count-up or a randomly
// generated confetti burst -- those need to check this explicitly and skip
// straight to the end state.
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
