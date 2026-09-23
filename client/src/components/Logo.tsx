import { DodoIcon } from "./Dodo";

export function Logo({ size = "lg" }: { size?: "sm" | "lg" }) {
  const isLg = size === "lg";
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className={`grid place-items-center rounded-2xl bg-navy text-gold shadow-card ${
          isLg ? "w-14 h-14" : "w-9 h-9"
        }`}
      >
        <DodoIcon className={isLg ? "w-8 h-8" : "w-5 h-5"} />
      </div>
      <span
        className={`font-display font-semibold tracking-tight text-navy ${
          isLg ? "text-4xl" : "text-xl"
        }`}
      >
        TCHOMBO
      </span>
    </div>
  );
}
