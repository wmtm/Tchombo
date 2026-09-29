import dodoLifeIcon from "../assets/dodo-lifepoint-icon.png";
import ayoMascot from "../assets/ayo-mascot.png";

// The dedicated dodo-head icon stands in for a dodo/life point everywhere one
// is shown: the small icon next to a life count, the question's dodo-penalty
// row, and the reveal screen's "X loses N dodos" banner. "Ayo!" (Mauritian
// Creole for "ouch!") is the separate bigger mascot illustration used for the
// dramatic moment someone loses lives on the reveal screen.

// dodo-lifepoint-icon.png is a wide crop (~1.5:1), so size it by height with
// w-auto -- a fixed square box would letterbox it and it'd read smaller than
// intended. Keeping the exported name AyoIcon since every call site already
// treats it as "the small dodo/life-point glyph", regardless of which
// artwork backs it.
export function AyoIcon({ className = "h-6 w-auto" }: { className?: string }) {
  return <img src={dodoLifeIcon} alt="" className={`${className} object-contain flex-shrink-0`} />;
}

export function AyoMascot({ className = "w-24 h-24" }: { className?: string }) {
  return <img src={ayoMascot} alt="Ayo!" className={`${className} object-contain flex-shrink-0`} />;
}

// Shows remaining lives (dodos left before elimination). The number turns coral
// once low, as a quiet visual cue that someone is close to being knocked out.
export function DodoCount({ count, size = "md", lowAt = 3 }: { count: number; size?: "sm" | "md" | "lg"; lowAt?: number }) {
  const dims = size === "sm" ? "h-4 w-auto" : size === "lg" ? "h-7 w-auto" : "h-5 w-auto";
  const text = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";
  const low = count <= lowAt;
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${text} ${low ? "text-coral" : "text-ink"}`}>
      <AyoIcon className={dims} />
      {/* key={count} remounts on every change, retriggering the bump animation */}
      <span key={count} className="inline-block tabular-nums animate-bump">
        {count}
      </span>
    </span>
  );
}

// A row of small Ayo icons matching a question's dodo_penalty — shows the stakes
// (risk) of a question at a glance, before anyone answers.
export function DodoPenaltyRow({ count, className = "" }: { count: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <AyoIcon key={i} className="h-4 w-auto" />
      ))}
    </span>
  );
}

// Backwards-compatible alias for the few spots that just want "the dodo icon"
// (kept so unrelated files don't need an import rename).
export const DodoIcon = AyoIcon;
