import tchomboIcon from "../assets/tchombo-icon.png";

export function Logo({ size = "lg" }: { size?: "sm" | "lg" }) {
  const isLg = size === "lg";
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img
        src={tchomboIcon}
        alt=""
        className={`object-contain flex-shrink-0 w-auto ${isLg ? "h-14" : "h-9"}`}
      />
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
