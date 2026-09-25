const KEY = "tchombo.seenHowToPlay";

export function hasSeenHowToPlay(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markSeenHowToPlay() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
}
