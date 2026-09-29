import { ButtonHTMLAttributes, PointerEvent, useState } from "react";
import { primeForGesture } from "../lib/sound";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "gold" | "success";

const variants: Record<Variant, string> = {
  primary: "bg-navy text-cream hover:bg-navy-soft active:scale-[0.98]",
  secondary: "bg-white text-navy border-2 border-navy/15 hover:border-navy/30 active:scale-[0.98]",
  danger: "bg-coral text-white hover:brightness-105 active:scale-[0.98]",
  ghost: "bg-transparent text-navy hover:bg-navy/5 active:scale-[0.98]",
  gold: "bg-gold text-navy hover:brightness-105 active:scale-[0.98]",
  success: "bg-leaf text-white hover:brightness-105 active:scale-[0.98]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
  // Renders as a small circular icon button (e.g. the embedded submit arrow
  // in the answer box) instead of the default full-width pill.
  round?: boolean;
}

interface Ripple {
  key: number;
  x: number;
  y: number;
  size: number;
}

export function Button({ variant = "primary", full, round, className = "", children, onPointerDown, ...rest }: Props) {
  const [ripple, setRipple] = useState<Ripple | null>(null);

  function handlePointerDown(e: PointerEvent<HTMLButtonElement>) {
    // Re-prime the audio context synchronously inside this exact gesture --
    // some iOS Safari versions appear to let the audio session lapse again
    // between actions (e.g. around the on-screen keyboard opening/closing),
    // so a single one-time unlock at app start isn't reliable enough for a
    // sound effect that plays moments after this same tap resolves.
    primeForGesture();

    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.5;
    setRipple({ key: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top, size });
    onPointerDown?.(e);
  }

  const shape = round
    ? "w-12 h-12 rounded-full flex items-center justify-center p-0 flex-shrink-0"
    : `rounded-2xl px-6 py-4 text-base ${full ? "w-full" : ""}`;

  return (
    <button
      onPointerDown={handlePointerDown}
      className={`relative overflow-hidden ${variants[variant]} ${shape} font-semibold tracking-wide transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none shadow-sm ${className}`}
      {...rest}
    >
      {children}
      {ripple && (
        <span
          key={ripple.key}
          className="absolute rounded-full bg-white/40 animate-ripple pointer-events-none"
          style={{
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
          }}
        />
      )}
    </button>
  );
}
