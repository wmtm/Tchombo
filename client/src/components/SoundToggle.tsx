import { useState } from "react";
import { isSoundEnabled, setSoundEnabled, sound } from "../lib/sound";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled());

  return (
    <button
      onClick={() => {
        const next = !enabled;
        setSoundEnabled(next);
        setEnabled(next);
        if (next) sound.unlock();
      }}
      aria-label={enabled ? "Sound on" : "Sound off"}
      className="grid place-items-center w-10 h-10 rounded-full bg-white/70 text-navy hover:bg-white transition-colors shadow-sm"
    >
      {enabled ? (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M4 9v6h4l5 5V4L8 9H4z" />
          <path d="M16.5 12a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
          <path d="M14 4.5v1.05A7.5 7.5 0 0 1 19.5 12 7.5 7.5 0 0 1 14 18.45v1.05A8.5 8.5 0 0 0 20.5 12 8.5 8.5 0 0 0 14 4.5z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M4 9v6h4l5 5V4L8 9H4z" />
          <path d="M15.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
