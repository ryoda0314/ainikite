/* YouTube IFrame API script loader (singleton) */

let loaded = false;
let loading = false;
const callbacks: (() => void)[] = [];

export function ensureYouTubeAPI(): Promise<void> {
  if (loaded && window.YT?.Player) return Promise.resolve();
  return new Promise<void>((resolve) => {
    callbacks.push(resolve);
    if (loading) return;
    loading = true;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      loaded = true;
      prev?.();
      for (const cb of callbacks) cb();
      callbacks.length = 0;
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
}
