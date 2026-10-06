import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// ── Transcription control ────────────────────────────────────────────────────
// Rooms are created with Session Transcription startTrigger "manual"
// (create-session-room). Whereby has NO button for manual transcription in its
// own room UI: it is started only by the embedding page sending a command, and
// only on behalf of a host. Whereby's own <whereby-embed> web component does
// exactly this — it adds jsApi=true, we=1 and iframeSource=<subdomain> to the
// room URL, then postMessages { command, args } to the iframe, and the room
// postMessages { type, payload } events back. We do the same here directly so
// the site carries no extra dependency. Verified against
// @whereby.com/browser-sdk 3.31.0 dist/embed, 6 Oct 2026.
type TranscriptStatus = "off" | "starting" | "on" | "unknown";

function buildEmbedUrl(raw: string): { src: string; origin: string } | null {
  try {
    const u = new URL(raw);
    const m = /^([^.]+)\.whereby\.com$/.exec(u.hostname);
    if (!m) return null;
    const params: Record<string, string> = {
      jsApi: "true",
      we: "1",
      iframeSource: m[1],
      skipMediaPermissionPrompt: "",
    };
    for (const [k, v] of Object.entries(params)) {
      if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    }
    return { src: u.href, origin: u.origin };
  } catch {
    return null;
  }
}

export default function SessionRoom() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [url, setUrl] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [joined, setJoined] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptStatus>("unknown");
  const [confirmStart, setConfirmStart] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!bookingId) {
        setError("No session specified.");
        setLoading(false);
        return;
      }
      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "create-session-room",
          { body: { bookingId } }
        );
        if (!active) return;
        if (fnError || !data?.url) {
          setError(data?.error || fnError?.message || "Could not open this session.");
        } else {
          setUrl(data.url);
          setRole(data.role ?? null);
        }
      } catch (e: any) {
        if (active) setError(e?.message || "Something went wrong opening the session.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [bookingId]);

  const embed = url ? buildEmbedUrl(url) : null;
  const origin = embed?.origin ?? null;

  // Events from the room.
  useEffect(() => {
    if (!origin) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || !e.data || typeof e.data !== "object") return;
      const { type, payload } = e.data as { type?: string; payload?: any };
      if (type === "join") {
        setJoined(true);
        setTranscript((t) => (t === "unknown" ? "off" : t));
      } else if (type === "leave") {
        setJoined(false);
      } else if (type === "transcription_status_change") {
        const s = payload?.status;
        if (s === "started") setTranscript("on");
        else if (s === "starting") setTranscript("starting");
        else if (s === "stopped") setTranscript("off");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin]);

  // If the room never confirms a start (e.g. this login is not the room host),
  // don't leave the button stuck on "Starting…".
  useEffect(() => {
    if (transcript !== "starting") return;
    const t = setTimeout(() => setTranscript((s) => (s === "starting" ? "off" : s)), 20000);
    return () => clearTimeout(t);
  }, [transcript]);

  const send = (command: string) => {
    if (!origin || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({ command, args: [] }, origin);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <p>Setting up your session room…</p>
      </div>
    );
  }

  if (error || !url || !embed) {
    return (
      <div style={{ display: "flex", height: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
        <h2>Session unavailable</h2>
        <p>{error || "We couldn't open this session room."}</p>
        <p style={{ opacity: 0.7, fontSize: 14 }}>
          Make sure you're logged in with the account that booked or hosts this session.
          If you were logged in a while ago, log out and back in, then reopen this link.
        </p>
      </div>
    );
  }

  const isHost = role === "host";
  const notice = isHost
    ? "Transcription is off until you press Start transcript (top right) — agree it with your coachee first. You can stop it at any time. The transcript is visible only to the two of you and Galoras administrators, and either of you can delete it."
    : "Transcription is off unless your coach starts it, and they can stop it whenever you ask. You'll see \"Transcript on\" at the top while it runs. The transcript is visible only to the two of you and Galoras administrators, and either of you can delete it.";

  const pill: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
    borderRadius: 999, fontSize: 13, fontWeight: 600, border: 0,
  };
  const dot = (color: string) => (
    <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: "inline-block" }} />
  );

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#0b1220" }}>
      {noticeOpen && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", background: "#0b1220", color: "#e5e7eb", fontSize: 13, lineHeight: 1.4, borderBottom: "1px solid #1f2937" }}>
          <span style={{ flex: 1 }}>{notice}</span>
          <button
            onClick={() => setNoticeOpen(false)}
            style={{ background: "transparent", color: "#e5e7eb", border: "1px solid #4b5563", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}
          >
            Got it
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "#0b1220", color: "#e5e7eb", fontSize: 13 }}>
        <span style={{ flex: 1, opacity: 0.8 }}>{isHost ? "You are the host" : "Galoras session"}</span>

        {transcript === "on" && (
          <span style={{ ...pill, background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>
            {dot("#ef4444")} Transcript on
          </span>
        )}
        {transcript === "starting" && (
          <span style={{ ...pill, background: "rgba(234,179,8,0.15)", color: "#fde68a" }}>
            {dot("#eab308")} Starting transcript…
          </span>
        )}

        {isHost && (transcript === "off" || transcript === "unknown") && !confirmStart && (
          <button
            disabled={!joined}
            title={joined ? "" : "Join the room first"}
            onClick={() => setConfirmStart(true)}
            style={{ ...pill, background: joined ? "#e5e7eb" : "#374151", color: joined ? "#0b1220" : "#9ca3af", cursor: joined ? "pointer" : "not-allowed" }}
          >
            {dot(joined ? "#ef4444" : "#6b7280")} Start transcript
          </button>
        )}
        {isHost && confirmStart && transcript !== "on" && (
          <>
            <span style={{ opacity: 0.9 }}>Has your coachee agreed?</span>
            <button
              onClick={() => { setConfirmStart(false); setTranscript("starting"); send("start_live_transcription"); }}
              style={{ ...pill, background: "#ef4444", color: "#fff", cursor: "pointer" }}
            >
              Yes, start
            </button>
            <button
              onClick={() => setConfirmStart(false)}
              style={{ ...pill, background: "transparent", color: "#e5e7eb", border: "1px solid #4b5563", cursor: "pointer" }}
            >
              Cancel
            </button>
          </>
        )}
        {isHost && (transcript === "on" || transcript === "starting") && (
          <button
            onClick={() => send("stop_live_transcription")}
            style={{ ...pill, background: "#e5e7eb", color: "#0b1220", cursor: "pointer" }}
          >
            ■ Stop transcript
          </button>
        )}
      </div>

      <div style={{ position: "relative", flex: 1 }}>
        <iframe
          ref={iframeRef}
          title="Galoras session"
          src={embed.src}
          allow="autoplay; camera; microphone; fullscreen; display-capture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      </div>
    </div>
  );
}
