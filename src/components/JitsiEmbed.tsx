import { useEffect, useRef } from "react";

// Loads external Jitsi Meet API script once, then mounts an iframe in target div.
declare global {
  interface Window { JitsiMeetExternalAPI?: any }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://meet.jit.si/external_api.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("Failed to load meet")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function JitsiEmbed({
  meetLink,
  displayName,
  onLeft,
}: {
  meetLink: string;
  displayName: string;
  onLeft?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    const roomName = meetLink.split("/").pop() || "JC-CLASS";

    loadScript().then(() => {
      if (cancelled || !ref.current) return;
      apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: ref.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName },
        configOverwrite: {
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          startWithAudioMuted: true,
          startWithVideoMuted: true,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      });
      apiRef.current.addListener("videoConferenceLeft", () => onLeft?.());
      apiRef.current.addListener("readyToClose", () => onLeft?.());
    }).catch(() => {});

    return () => {
      cancelled = true;
      try { apiRef.current?.dispose(); } catch {}
      apiRef.current = null;
    };
  }, [meetLink, displayName, onLeft]);

  return <div ref={ref} className="w-full h-full min-h-[520px] bg-black rounded-2xl overflow-hidden" />;
}
