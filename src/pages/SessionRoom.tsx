import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function SessionRoom() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [url, setUrl] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <p>Setting up your session room…</p>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div style={{ display: "flex", height: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
        <h2>Session unavailable</h2>
        <p>{error || "We couldn't open this session room."}</p>
        <p style={{ opacity: 0.7, fontSize: 14 }}>
          Make sure you're logged in with the account that booked or hosts this session.
        </p>
      </div>
    );
  }

  const embedUrl = `${url}${url.includes("?") ? "&" : "?"}skipMediaPermissionPrompt`;

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      {role === "host" && (
        <div style={{ position: "absolute", top: 8, left: 8, zIndex: 10, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 6, fontSize: 12 }}>
          Host
        </div>
      )}
      <iframe
        title="Galoras session"
        src={embedUrl}
        allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
        allowFullScreen
        style={{ width: "100%", height: "100%", border: 0 }}
      />
    </div>
  );
}
