import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "gold";

const variants: Record<Variant, string> = {
  primary: "bg-navy text-cream hover:bg-navy-soft active:scale-[0.98]",
  secondary: "bg-white text-navy border-2 border-navy/15 hover:border-navy/30 active:scale-[0.98]",
  danger: "bg-coral text-white hover:brightness-105 active:scale-[0.98]",
  ghost: "bg-transparent text-navy hover:bg-navy/5 active:scale-[0.98]",
  gold: "bg-gold text-navy hover:brightness-105 active:scale-[0.98]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
}

export function Button({ variant = "primary", full, className = "", ...rest }: Props) {
  return (
    <button
      className={`${variants[variant]} ${full ? "w-full" : ""} rounded-2xl px-6 py-4 text-base font-semibold tracking-wide transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none shadow-sm ${className}`}
      {...rest}
    />
  );
}
