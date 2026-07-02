// Opens a Jitsi meet link in a new tab with prejoin skipped so users
// land straight in the room (browser handles its own fullscreen).
export function openMeet(link: string, opts: { asHost?: boolean; displayName?: string } = {}) {
  if (!link) return;
  try {
    const url = new URL(link);
    const params: string[] = [
      "config.prejoinPageEnabled=false",
      "config.disableDeepLinking=true",
      `config.startWithAudioMuted=${opts.asHost ? "false" : "true"}`,
      `config.startWithVideoMuted=${opts.asHost ? "false" : "true"}`,
    ];
    if (opts.displayName) {
      params.push(`userInfo.displayName=%22${encodeURIComponent(opts.displayName)}%22`);
    }
    url.hash = params.join("&");
    const win = window.open(url.toString(), "_blank", "noopener,noreferrer");
    if (!win) {
      // popup blocked — fall back to same-tab nav so user still reaches the room
      window.location.href = url.toString();
    }
  } catch {
    window.open(link, "_blank", "noopener,noreferrer");
  }
}
