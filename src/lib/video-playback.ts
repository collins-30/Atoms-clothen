// Decides which model videos on the page may play.
//
// Every <ProductVideo> reports how much of it is on screen. Only the most
// visible few play at once (4 on desktop, 2 on phones); the rest pause and
// show their poster. Nothing plays while the tab is in the background, for
// visitors who asked for reduced motion, or with data saver switched on.

const visible = new Map<HTMLVideoElement, number>(); // video -> score (visibility + priority)
const playing = new Set<HTMLVideoElement>();
let scheduled = false;
let listening = false;

const maxPlaying = () => (window.matchMedia("(max-width: 767px)").matches ? 2 : 4);

/** False when the visitor prefers reduced motion or has data saver on. */
export function canAutoplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !connection?.saveData;
}

function rebalance() {
  scheduled = false;
  if (document.hidden) {
    for (const v of playing) v.pause();
    playing.clear();
    return;
  }
  const allowed = new Set(
    [...visible.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxPlaying())
      .map(([v]) => v),
  );
  for (const v of [...playing]) {
    if (!allowed.has(v)) {
      v.pause();
      playing.delete(v);
    }
  }
  for (const v of allowed) {
    if (playing.has(v)) continue;
    playing.add(v);
    // A browser may still refuse (e.g. iPhone low power mode): the poster stays.
    v.play().catch(() => playing.delete(v));
  }
}

function schedule() {
  if (!listening) {
    listening = true;
    document.addEventListener("visibilitychange", schedule);
  }
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(rebalance);
}

/**
 * Report how much of a video is visible (0-1). Below 35% it doesn't count.
 * `priority` lifts large editorial videos above product cards.
 */
export function reportVisibility(video: HTMLVideoElement, ratio: number, priority = 0) {
  if (ratio >= 0.35) visible.set(video, ratio + priority);
  else visible.delete(video);
  schedule();
}

/** Stop managing a video (unmounted, or paused by the visitor). */
export function release(video: HTMLVideoElement) {
  visible.delete(video);
  if (playing.delete(video)) video.pause();
  schedule();
}
