export function DodoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="38" rx="20" ry="16" fill="currentColor" />
      <circle cx="47" cy="24" r="11" fill="currentColor" />
      <path d="M56 22c5 .5 9 2.6 9 5s-4.5 4-9.5 3.6c1-2.8 1-5.8.5-8.6z" fill="currentColor" />
      <circle cx="50" cy="21" r="2.1" fill="#F6F2E9" />
      <ellipse cx="18" cy="42" rx="7" ry="4.5" fill="currentColor" opacity="0.55" />
      <path d="M14 54l3-8m6 8l-1-8m8 8l-2-8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function DodoCount({ count, size = "md" }: { count: number; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-7 h-7" : "w-5 h-5";
  const text = size === "sm" ? "text-sm" : size === "lg" ? "text-xl" : "text-base";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${text}`}>
      <DodoIcon className={`${dims} text-navy/70`} />
      {count}
    </span>
  );
}
