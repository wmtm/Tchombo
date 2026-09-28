interface Props {
  secondsLeft: number;
  totalSeconds: number;
  size?: number;
}

// A small circular progress ring, drained smoothly over `totalSeconds`. Driven
// by the same once-a-second `secondsLeft` state the caller already keeps for
// its text countdown -- the 1s linear CSS transition between each step is
// what makes it read as a continuous sweep rather than a tick.
export function CountdownRing({ secondsLeft, totalSeconds, size = 22 }: Props) {
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="-rotate-90 flex-shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" className="stroke-navy/10" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        className="stroke-leaf"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
    </svg>
  );
}
