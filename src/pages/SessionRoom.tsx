import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// ── Transcription ────────────────────────────────────────────────────────────
// Rooms are created with Session Transcription startTrigger "manual"
// (create-session-room). The coach starts and stops it with Whereby's own
// "Transcribe" button in the room's bottom toolbar — that button is shown to
// hosts only. Tested 6 Oct 2026: Whereby's button works; sending
// start_live_transcription from this page did NOT (the room ignored it), so
// this page does not try to control transcription. It only LISTENS: with
// jsApi=true, we=1 and iframeSource=<subdomain> on the room URL (as Whereby's
// own embed component sets them), the room posts { type, payload } events to
// this page, and transcription_status_change drives the "Transcript on" label
// both people see.
type TranscriptStatus = "off" | "on" | "unknown";

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
  const [transcript, setTranscript] = useState<TranscriptStatus>("unknown");

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
        setTranscript((t) => (t === "unknown" ? "off" : t));
      } else if (type === "transcription_status_change") {
        const s = payload?.status;
        if (s === "started" || s === "starting") setTranscript("on");
        else if (s === "stopped") setTranscript("off");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin]);

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
    ? "Transcription is off until you start it with the Transcribe button in the toolbar at the bottom of the video — agree it with your coachee first. Press it again to stop at any time. The transcript is visible only to the two of you and Galoras administrators, and either of you can delete it."
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
      </div>

      <div style={{ position: "relative", flex: 1 }}>
        <iframe
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
