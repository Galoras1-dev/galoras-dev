// whereby-webhook · Block 1 · 6 October 2026
//
// Receives Whereby webhook events. Handles transcription.started / finished /
// failed: downloads the finished transcript, stores it in session_transcripts
// against the session it belongs to, then deletes Whereby's copy so the only
// copy is ours (and deleting ours actually deletes it).
//
// verify_jwt = false (Whereby cannot send a Supabase JWT). Authenticity comes
// from the Whereby-Signature header, checked against WHEREBY_WEBHOOK_SECRET.
//
// Whereby gives a webhook 5 seconds and retries only on 5xx/timeout, so the
// response is sent at once and the download runs in the background. If the
// download fails, the row keeps status in_progress with the error, Whereby's
// copy is NOT deleted, and session-transcripts { action: "retry" } recovers it.
//
// Secrets required: WHEREBY_API_KEY (already set), WHEREBY_WEBHOOK_SECRET (new).

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const WHEREBY = "https://api.whereby.dev/v1";
const MAX_AGE_SECONDS = 300;

const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

async function verifySignature(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const t = header.match(/t=([^,]+)/)?.[1];
  const v1 = header.match(/v1=([^,]+)/)?.[1];
  if (!t || !v1) return false;
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return false;

  // Whereby signs `${t}.${JSON body}`. Check the raw body first; fall back to a
  // re-serialised body in case whitespace differs from what they signed.
  if (safeEqual(await hmac(secret, `${t}.${raw}`), v1)) return true;
  try {
    const compact = JSON.stringify(JSON.parse(raw));
    return safeEqual(await hmac(secret, `${t}.${compact}`), v1);
  } catch {
    return false;
  }
}

const roomKey = (name: unknown) => String(name ?? "").replace(/^\//, "");

async function findSessionId(supabase: SupabaseClient, roomName: string): Promise<string | null> {
  if (!roomName) return null;
  const { data } = await supabase
    .from("sessions").select("id").eq("whereby_room_name", roomName).maybeSingle();
  return data?.id ?? null;
}

async function handle(supabase: SupabaseClient, wherebyKey: string, event: any) {
  const d = event?.data ?? {};
  const transcriptionId: string | undefined = d.transcriptionId;
  if (!transcriptionId) return;

  const roomName = roomKey(d.roomName);
  const sessionId = await findSessionId(supabase, roomName);
  const base = {
    whereby_transcription_id: transcriptionId,
    whereby_room_name: roomName,
    whereby_room_session_id: d.roomSessionId ?? null,
    session_id: sessionId,
    updated_at: new Date().toISOString(),
  };

  if (event.type === "transcription.started") {
    // Only create a placeholder; never overwrite a finished row (events can
    // arrive out of order).
    await supabase.from("session_transcripts")
      .upsert({ ...base, status: "in_progress" }, { onConflict: "whereby_transcription_id", ignoreDuplicates: true });
    return;
  }

  if (event.type === "transcription.failed") {
    await supabase.from("session_transcripts")
      .upsert({ ...base, status: "failed", error: String(d.error ?? "Whereby reported failure") },
        { onConflict: "whereby_transcription_id" });
    return;
  }

  if (event.type !== "transcription.finished") return;

  if (d.storageType && d.storageType !== "WHEREBY_HOSTED") {
    await supabase.from("session_transcripts")
      .upsert({ ...base, status: "failed", error: `Unsupported storage ${d.storageType}` },
        { onConflict: "whereby_transcription_id" });
    return;
  }

  try {
    const linkResp = await fetch(`${WHEREBY}/transcriptions/${transcriptionId}/access-link`, {
      headers: { Authorization: `Bearer ${wherebyKey}` },
    });
    if (!linkResp.ok) throw new Error(`access-link ${linkResp.status}: ${await linkResp.text()}`);
    const { accessLink } = await linkResp.json();

    const fileResp = await fetch(accessLink);
    if (!fileResp.ok) throw new Error(`download ${fileResp.status}`);
    const content = await fileResp.text();

    const { error: upErr } = await supabase.from("session_transcripts").upsert({
      ...base,
      status: "ready",
      content,
      filename: d.filename ?? null,
      duration_seconds: d.durationInSeconds != null ? Math.round(Number(d.durationInSeconds)) : null,
      error: null,
    }, { onConflict: "whereby_transcription_id" });
    if (upErr) throw new Error(`store: ${upErr.message}`);

    // Stored safely — now remove Whereby's copy.
    const del = await fetch(`${WHEREBY}/transcriptions/${transcriptionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${wherebyKey}` },
    });
    if (del.ok || del.status === 404) {
      await supabase.from("session_transcripts")
        .update({ whereby_deleted_at: new Date().toISOString() })
        .eq("whereby_transcription_id", transcriptionId);
    } else {
      console.error("Whereby delete failed", del.status, await del.text());
    }
  } catch (err: any) {
    console.error("transcript fetch failed", transcriptionId, err?.message);
    await supabase.from("session_transcripts")
      .upsert({ ...base, status: "in_progress", error: String(err?.message ?? err) },
        { onConflict: "whereby_transcription_id" });
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("WHEREBY_WEBHOOK_SECRET");
  const wherebyKey = Deno.env.get("WHEREBY_API_KEY");
  if (!secret || !wherebyKey) {
    console.error("whereby-webhook: secrets not configured");
    return new Response("Not configured", { status: 500 });
  }

  const raw = await req.text();
  if (!(await verifySignature(raw, req.headers.get("whereby-signature"), secret))) {
    console.error("whereby-webhook: bad signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

  if (!String(event?.type ?? "").startsWith("transcription.")) {
    return new Response("ignored", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const work = handle(supabase, wherebyKey, event).catch((e) =>
    console.error("whereby-webhook handler error", e)
  );
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(work);
  } else {
    await work;
  }
  return new Response("ok", { status: 200 });
});
