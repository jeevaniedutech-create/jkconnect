// Locked-down YouTube embed:
// - No native controls (nocontrols=1, disablekb, modestbranding, rel=0)
// - Transparent overlays block: entire top bar (title/share), bottom-right (logo & "watch on YouTube")
// - Click on center toggles play/pause via postMessage — no other interactions leak the URL
import { useEffect, useMemo, useRef, useState } from "react";

function toId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/embed\/([^/?#]+)/);
    if (m) return m[1];
  } catch {}
  return null;
}

export default function YouTubeProtected({ url }: { url: string }) {
  const id = useMemo(() => toId(url), [url]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // block right-click on the player area
    const el = iframeRef.current?.parentElement;
    if (!el) return;
    const noCtx = (e: MouseEvent) => e.preventDefault();
    el.addEventListener("contextmenu", noCtx);
    return () => el.removeEventListener("contextmenu", noCtx);
  }, [id]);

  if (!id) return <div className="text-sm text-muted-foreground">Invalid video link.</div>;

  const src = `https://www.youtube-nocookie.com/embed/${id}?controls=0&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1&enablejsapi=1`;

  function togglePlay() {
    const cmd = playing ? "pauseVideo" : "playVideo";
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: cmd, args: [] }),
      "*"
    );
    setPlaying(!playing);
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-black aspect-video select-none">
      <iframe
        ref={iframeRef}
        src={src}
        title="Recorded session"
        allow="autoplay; encrypted-media"
        allowFullScreen={false}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      {/* Top bar overlay — blocks title, share, watch-later */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-transparent z-20" />
      {/* Bottom-right overlay — blocks YouTube logo & "Watch on YouTube" */}
      <div className="absolute bottom-0 right-0 h-14 w-1/2 bg-transparent z-20" />
      {/* Bottom-left overlay — blocks share/title on some layouts */}
      <div className="absolute bottom-0 left-0 h-14 w-24 bg-transparent z-20" />
      {/* Center click area — play/pause only */}
      <button
        aria-label={playing ? "Pause" : "Play"}
        onClick={togglePlay}
        className="absolute inset-x-0 top-14 bottom-14 w-full z-10 bg-transparent"
      />
      {!playing && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
