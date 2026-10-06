// session-transcripts · Block 1 · 6 October 2026
//
// The only way the app reads or deletes a session transcript.
//   { action: "list" }               transcripts for sessions the caller is in
//                                    (admins: all, including unmatched ones)
//   { action: "get",    id }         one transcript with its text
//   { action: "delete", id }         deletes it — from Whereby if still there,
//                                    then from Galoras. Either participant, or
//                                    an admin. There is no soft delete.
//   { action: "retry",  id }         admin only: re-download a transcript whose
//                                    webhook download failed
//
// Called with the user's JWT (verify_jwt stays on). Uses the service role
// internally and checks participation itself.
//
// Secrets: WHEREBY_API_KEY (already set).

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHEREBY = "https://api.whereby.dev/v1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

type Who = { userId: string; isAdmin: boolean; coachIds: string[] };

async function whoAmI(supabase: SupabaseClient, userId: string): Promise<Who> {
  const [{ data: admin }, { data: coaches }] = await Promise.all([
    // Same admin check the other live functions use: a user_roles row.
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    supabase.from("coaches").select("id").eq("user_id", userId),
  ]);
  return { userId, isAdmin: Boolean(admin), coachIds: (coaches ?? []).map((c: any) => c.id) };
}

function isParticipant(who: Who, session: { client_id: string | null; coach_id: string | null } | null) {
  if (!session) return false;
  return session.client_id === who.userId || (session.coach_id != null && who.coachIds.includes(session.coach_id));
}

async function loadOne(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from("session_transcripts")
    .select("*, sessions(id, client_id, coach_id, scheduled_at)")
    .eq("id", id)
    .maybeSingle();
  return data as any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const who = await whoAmI(supabase, user.id);
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "list";

    // ── list ───────────────────────────────────────────────────────────────
    if (action === "list") {
      let q = supabase
        .from("session_transcripts")
        .select("id, session_id, status, duration_seconds, created_at, sessions(id, client_id, coach_id, scheduled_at)")
        .order("created_at", { ascending: false });

      if (!who.isAdmin) {
        const ors = [`client_id.eq.${user.id}`];
        if (who.coachIds.length) ors.push(`coach_id.in.(${who.coachIds.join(",")})`);
        const { data: mine } = await supabase.from("sessions").select("id").or(ors.join(","));
        const ids = (mine ?? []).map((s: any) => s.id);
        if (ids.length === 0) return json({ transcripts: [] });
        q = q.in("session_id", ids);
      }

      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      const rows = (data ?? []) as any[];

      // Name the other person, from the caller's point of view.
      const clientIds = [...new Set(rows.map((r) => r.sessions?.client_id).filter(Boolean))];
      const coachIds = [...new Set(rows.map((r) => r.sessions?.coach_id).filter(Boolean))];
      const [{ data: profiles }, { data: coaches }] = await Promise.all([
        clientIds.length
          ? supabase.from("profiles").select("id, full_name").in("id", clientIds)
          : Promise.resolve({ data: [] as any[] }),
        coachIds.length
          ? supabase.from("coaches").select("id, display_name").in("id", coachIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const clientName = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.full_name ?? "Coachee"]));
      const coachName = Object.fromEntries((coaches ?? []).map((c: any) => [c.id, c.display_name ?? "Coach"]));

      return json({
        transcripts: rows.map((r) => {
          const s = r.sessions;
          const iAmCoach = s?.coach_id && who.coachIds.includes(s.coach_id);
          return {
            id: r.id,
            status: r.status,
            duration_seconds: r.duration_seconds,
            created_at: r.created_at,
            scheduled_at: s?.scheduled_at ?? null,
            with: !s ? "Unmatched session" : iAmCoach ? clientName[s.client_id] ?? "Coachee" : coachName[s.coach_id] ?? "Your coach",
          };
        }),
      });
    }

    const id: string | undefined = body.id;
    if (!id) return json({ error: "Missing id" }, 400);
    const row = await loadOne(supabase, id);
    if (!row) return json({ error: "Not found" }, 404);
    const allowed = who.isAdmin || isParticipant(who, row.sessions);
    if (!allowed) return json({ error: "Not found" }, 404);

    // ── get ────────────────────────────────────────────────────────────────
    if (action === "get") {
      return json({
        transcript: {
          id: row.id,
          status: row.status,
          content: row.content,
          duration_seconds: row.duration_seconds,
          created_at: row.created_at,
          scheduled_at: row.sessions?.scheduled_at ?? null,
        },
      });
    }

    const wherebyKey = Deno.env.get("WHEREBY_API_KEY");
    if (!wherebyKey) return json({ error: "Video service not configured" }, 500);

    // ── delete ─────────────────────────────────────────────────────────────
    if (action === "delete") {
      if (!row.whereby_deleted_at) {
        const del = await fetch(`${WHEREBY}/transcriptions/${row.whereby_transcription_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${wherebyKey}` },
        });
        if (!del.ok && del.status !== 404) {
          console.error("Whereby delete failed", del.status, await del.text());
          return json({ error: "Could not delete the copy held by the video provider. Nothing was deleted; try again." }, 502);
        }
      }
      const { error } = await supabase.from("session_transcripts").delete().eq("id", row.id);
      if (error) return json({ error: error.message }, 500);
      console.log("transcript deleted", row.id, "by", user.id);
      return json({ deleted: true });
    }

    // ── retry (admin) ──────────────────────────────────────────────────────
    if (action === "retry") {
      if (!who.isAdmin) return json({ error: "Admins only" }, 403);
      const linkResp = await fetch(`${WHEREBY}/transcriptions/${row.whereby_transcription_id}/access-link`, {
        headers: { Authorization: `Bearer ${wherebyKey}` },
      });
      if (!linkResp.ok) return json({ error: `access-link ${linkResp.status}` }, 502);
      const { accessLink } = await linkResp.json();
      const fileResp = await fetch(accessLink);
      if (!fileResp.ok) return json({ error: `download ${fileResp.status}` }, 502);
      const content = await fileResp.text();
      await supabase.from("session_transcripts")
        .update({ status: "ready", content, error: null, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      const del = await fetch(`${WHEREBY}/transcriptions/${row.whereby_transcription_id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${wherebyKey}` },
      });
      if (del.ok || del.status === 404) {
        await supabase.from("session_transcripts")
          .update({ whereby_deleted_at: new Date().toISOString() }).eq("id", row.id);
      }
      return json({ retried: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("session-transcripts error:", err);
    return json({ error: err?.message ?? "Error" }, 500);
  }
});
