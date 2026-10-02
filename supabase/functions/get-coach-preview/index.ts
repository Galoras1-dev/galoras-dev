// get-coach-preview
//
// Returns a coach's profile row BEFORE it is published, to exactly two kinds of
// caller: the coach it belongs to, and an admin.
//
// Why this exists:
//   The public profile page queries
//
//       from("coaches").select(...).eq("lifecycle_status", "published")
//
//   which is correct for the public and wrong for everyone who needs to approve
//   the thing. Until now neither the coach nor the admin could see the page
//   before it went live. The coach signed off on six text boxes in the
//   onboarding form; the admin published without having seen it either. Both
//   gates were weaker than they looked.
//
//   The fix is NOT a second renderer. The preview is served to the same
//   CoachProfile component, so what the coach approves is byte-for-byte the page
//   that publishes. A separate "preview view" would drift within a month and the
//   approval would stop meaning anything.
//
// Why an edge function rather than an RLS policy:
//   A draft row must never be readable by the public, and getting that wrong is
//   silent - the row just quietly becomes visible. Here the rule is one
//   if-statement in a place where it can be read and tested, with the service
//   role used only after the caller has been identified.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// The same column list the public page selects. Kept identical on purpose: a
// preview that shows more than the page does is a preview of something that
// does not exist.
// MUST match PROFILE_COLUMNS in src/pages/coaching/CoachProfile.tsx exactly.
// The preview is only worth anything if it shows the same page a visitor gets.
// The LinkedIn and calendar columns are deliberately absent here: they are
// collected on the application and never published, because a link off the
// platform on a coach profile is a link off the platform.
const PROFILE_COLUMNS =
  "id, slug, display_name, headline, bio, positioning_statement, " +
  "methodology, coaching_philosophy, coaching_style, engagement_format, " +
  "primary_pillar, proof_points, specialties, audience, tier, lifecycle_status, " +
  "avatar_url, profile_image_url, video_url";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ---- identify the caller from the token, never from the body -------------

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) {
    return json({ error: "Sign in to preview a profile." }, 401);
  }

  let callerId: string;
  let callerEmail: string | null;
  try {
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await authClient.auth.getUser();
    if (error || !data?.user) {
      return json({ error: "Sign in to preview a profile." }, 401);
    }
    callerId = data.user.id;
    callerEmail = data.user.email ?? null;
  } catch (e) {
    return json({ error: `Could not verify the session: ${String(e)}` }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // An empty body is fine - it means "my own profile".
  }
  const wantedSlug = typeof body.slug === "string" ? body.slug : null;
  const wantedId = typeof body.coachId === "string" ? body.coachId : null;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ---- is the caller an admin? --------------------------------------------

  const { data: adminRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();
  const isAdmin = Boolean(adminRow);

  // ---- find the row -------------------------------------------------------

  let query = supabase.from("coaches").select(PROFILE_COLUMNS);

  if (wantedId) {
    query = query.eq("id", wantedId);
  } else if (wantedSlug) {
    query = query.eq("slug", wantedSlug);
  } else {
    // No target named: the caller's own profile.
    query = query.eq("user_id", callerId);
  }

  const { data: rows, error } = await query.limit(1);
  if (error) {
    console.error("get-coach-preview: read failed", error);
    return json({ error: error.message }, 500);
  }

  const coach = rows?.[0] ?? null;
  if (!coach) {
    return json({ error: "No profile found to preview." }, 404);
  }

  // ---- the one rule -------------------------------------------------------
  //
  // An admin may preview anyone. Anyone else may preview only themselves, and
  // ownership is decided by the verified token - matched on user_id, or on email
  // for a coach whose row was created before their login was linked, which is
  // the normal state for an invited coach.
  if (!isAdmin) {
    const { data: ownRows } = await supabase
      .from("coaches")
      .select("id")
      .eq("id", coach.id)
      .or(
        callerEmail
          ? `user_id.eq.${callerId},email.eq.${callerEmail}`
          : `user_id.eq.${callerId}`,
      )
      .limit(1);

    if (!ownRows || ownRows.length === 0) {
      // Deliberately the same message and status as a missing profile. Telling a
      // stranger that a draft exists but is not theirs is itself a disclosure.
      return json({ error: "No profile found to preview." }, 404);
    }
  }

  return json({
    ok: true,
    coach,
    isAdmin,
    // The page uses this to decide what to say in the banner: a draft the coach
    // still has to sign off, versus one already live.
    published: coach.lifecycle_status === "published",
  });
});
