import { useEffect, useMemo, useRef } from "react";

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

export default function YouTubeProtected({ url, title }: { url: string; title?: string }) {
  const videoId = useMemo(() => toId(url), [url]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); return false; };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) &&
        (e.key === "c" || e.key === "u" || e.key === "s" || e.key === "p" || e.key === "a")) {
        e.preventDefault(); return false;
      }
      if (e.key === "F12" || e.key === "F11") { e.preventDefault(); return false; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey &&
        (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) {
        e.preventDefault(); return false;
      }
    };
    const handleDrag = (e: DragEvent) => { e.preventDefault(); return false; };
    const handleSelect = (e: Event) => { e.preventDefault(); };
    const container = containerRef.current;
    if (container) {
      container.addEventListener("contextmenu", handleContextMenu);
      container.addEventListener("dragstart", handleDrag);
      container.addEventListener("selectstart", handleSelect);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      if (container) {
        container.removeEventListener("contextmenu", handleContextMenu);
        container.removeEventListener("dragstart", handleDrag);
        container.removeEventListener("selectstart", handleSelect);
      }
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Block navigation away from the page via YouTube links
  useEffect(() => {
    const blockNavigation = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor) {
        const href = anchor.getAttribute("href") || "";
        if (href.includes("youtube.com") || href.includes("youtu.be") || href.includes("google.com")) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };
    const blockClipboard = (e: ClipboardEvent) => {
      const text = window.getSelection()?.toString() || "";
      if (text.includes("youtube") || text.includes("youtu.be")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const originalOpen = window.open;
    window.open = function (this: unknown, ...args: Parameters<typeof window.open>) {
      const url = String(args[0] || "");
      if (url.includes("youtube.com") || url.includes("youtu.be")) return null;
      return originalOpen.apply(this as typeof window, args);
    } as typeof window.open;

    document.addEventListener("click", blockNavigation, true);
    document.addEventListener("copy", blockClipboard, true);
    return () => {
      document.removeEventListener("click", blockNavigation, true);
      document.removeEventListener("copy", blockClipboard, true);
      window.open = originalOpen;
    };
  }, []);

  if (!videoId) return <div className="text-sm text-muted-foreground">Invalid video link.</div>;

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&fs=0&iv_load_policy=3&cc_load_policy=0&autoplay=0&disablekb=0&controls=1`;

  return (
    <div
      ref={containerRef}
      className="w-full bg-foreground/5 rounded-2xl overflow-hidden relative select-none aspect-video"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <iframe
        src={embedUrl}
        title={title || "Recorded session"}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={false}
        sandbox="allow-scripts allow-same-origin allow-presentation"
        className="border-0 absolute w-full h-full top-0 left-0"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {/* Top gradient bar — blocks title/share/watch-later */}
      <div
        className="absolute top-0 left-0 right-0 h-14 z-20 pointer-events-auto"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)" }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Bottom gradient bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-10 z-20 pointer-events-auto"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)" }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Top-right corner (share/more) */}
      <div
        className="absolute top-0 right-0 w-28 h-28 z-20 pointer-events-auto"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Top-left corner */}
      <div
        className="absolute top-0 left-0 w-16 h-14 z-20 pointer-events-auto"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Bottom-right corner (watch on YouTube) */}
      <div
        className="absolute bottom-0 right-0 w-28 h-12 z-20 pointer-events-auto"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Bottom-left corner (YouTube logo) */}
      <div
        className="absolute bottom-0 left-0 w-28 h-12 z-20 pointer-events-auto"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
