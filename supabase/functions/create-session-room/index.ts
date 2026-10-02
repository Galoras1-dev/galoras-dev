import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const WHEREBY_API = "https://api.whereby.dev/v1/meetings";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const wherebyKey = Deno.env.get("WHEREBY_API_KEY");
    if (!wherebyKey) return json({ error: "Video service not configured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { bookingId } = await req.json();
    if (!bookingId) return json({ error: "Missing bookingId" }, 400);

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, coach_id, client_id, status")
      .eq("id", bookingId)
      .single();
    if (bErr || !booking) return json({ error: "Booking not found" }, 404);
    if (booking.status !== "confirmed") return json({ error: "Booking is not confirmed" }, 400);

    let role: "host" | "guest" | null = null;
    if (booking.client_id === user.id) {
      role = "guest";
    } else {
      const { data: coach } = await supabase
        .from("coaches").select("id")
        .eq("id", booking.coach_id).eq("user_id", user.id).maybeSingle();
      if (coach) role = "host";
    }
    if (!role) return json({ error: "Not your booking" }, 403);

    let { data: session } = await supabase
      .from("sessions").select("*").eq("booking_id", bookingId).maybeSingle();
    if (!session) {
      const { data: created, error: insErr } = await supabase
        .from("sessions")
        .insert({
          booking_id: bookingId,
          coach_id: booking.coach_id,
          client_id: booking.client_id,
          status: "scheduled",
        })
        .select().single();
      if (insErr || !created) {
        console.error("session insert error", insErr);
        return json({ error: "Could not create session" }, 500);
      }
      session = created;
    }

    const now = Date.now();
    const expired = session.whereby_room_end
      ? new Date(session.whereby_room_end).getTime() < now : true;

    if (!session.whereby_meeting_id || expired) {
      // endDate MUST be in the future or Whereby rejects the room.
      // Base on the later of the scheduled time and now, so a past-scheduled
      // session (or a next-day re-join) still mints a valid room.
      const scheduledMs = session.scheduled_at ? new Date(session.scheduled_at).getTime() : now;
      const base = Math.max(scheduledMs, now);
      const windowMs = session.scheduled_at
        ? ((session.duration_minutes ?? 60) + 30) * 60_000
        : 180 * 60_000;
      const endDate = new Date(base + windowMs).toISOString();

      const resp = await fetch(WHEREBY_API, {
        method: "POST",
        headers: { "Authorization": `Bearer ${wherebyKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ endDate, fields: ["hostRoomUrl"] }),
      });
      if (!resp.ok) {
        console.error("Whereby create failed", resp.status, await resp.text());
        return json({ error: "Could not create video room" }, 502);
      }
      const room = await resp.json();

      const { data: updated, error: upErr } = await supabase
        .from("sessions")
        .update({
          whereby_meeting_id: room.meetingId,
          whereby_host_url:   room.hostRoomUrl,
          whereby_room_url:   room.roomUrl,
          whereby_room_end:   room.endDate,
          updated_at:         new Date().toISOString(),
        })
        .eq("id", session.id).select().single();
      if (upErr || !updated) {
        console.error("session update error", upErr);
        return json({ error: "Could not store room" }, 500);
      }
      session = updated;
    }

    const url = role === "host" ? session.whereby_host_url : session.whereby_room_url;
    return json({ url, role, sessionId: session.id }, 200);

  } catch (err: any) {
    console.error("create-session-room error:", err);
    return json({ error: err.message }, 500);
  }
});
