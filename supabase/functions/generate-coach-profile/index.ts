// generate-coach-profile
//
// Takes a coach's five answers plus one uploaded document (resume, biography,
// or a LinkedIn profile saved as PDF) and writes a DRAFT row in `coaches`.
//
// Why this runs server-side rather than in the browser:
//   RLS on `coaches` has no INSERT policy for a non-admin. A coach cannot
//   create their own row from the client — the insert is refused. This
//   function uses the service role, so the write lands, and `coach_applications`
//   drops out of the coach path entirely (which is what caused two rows per
//   coach: the user_id link write in CoachSignup is also blocked by RLS and
//   fails silently).
//
// Every failure is returned to the caller. Nothing is swallowed. The reason
// `analyze-coach-application` appeared to "work" for months while returning
// fit_score 0 is that its caller wrapped it in .catch(() => {}) and its own
// errors went nowhere.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Model is an env var so it can be changed without redeploying this function.
// Check console.anthropic.com for the current model id before first run.
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-5";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function fail(stage: string, message: string, status = 500, extra?: unknown) {
  console.error(`generate-coach-profile FAILED at ${stage}:`, message, extra ?? "");
  return json({ error: message, stage, details: extra ?? null }, status);
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// The prompt. This is the product — the function around it is plumbing.
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You write coach profiles for Galoras, a curated coaching exchange.

You are given five answers a coach wrote about themselves, and one document they
uploaded (a resume, a biography, or their LinkedIn profile saved as PDF).

## What you are optimising for

Not elegance. Bookings. Your job is to make this coach as findable and as
credible as their material honestly allows.

Write for two readers at once:

1. A senior person skimming a directory, deciding who to click.
2. A model answering a question like "who should I hire to coach a CEO through a
   transition?" — which can only recommend this coach if the facts are specific,
   consistent and extractable.

Both reward the same thing: concrete nouns, real numbers, named credentials,
stated plainly and used the same way every time they appear. Abstractions serve
neither.

## Rules that override style

**Never attribute one organisation's scale to work done at another.** Keep every
number attached to the entity that earned it. A buyer who checks one claim and
finds it inflated discounts everything else on the page.

This is the most common way these profiles go wrong, so here is a worked case.
A coach says: "I joined Fireminds when it was small and it rolled up into Brava
at $108m."

WRONG: "I joined Fireminds when it was an early-stage business and scaled it
through its roll-up into Brava at $108m." The reader finishes that sentence
believing the coach took Fireminds to $108m. They did not. Fireminds was absorbed
into a larger business which is now worth $108m.

ALSO WRONG: "scaled Fireminds to $108m", "grew the business from startup to
$108m", "took it from early stage to $108m".

RIGHT: "I joined Fireminds when it was an early-stage business, and I am now CEO
of Brava, the $108m company it was absorbed into."

Apply that test to every number: which entity earned it, and is the sentence still
true if the reader checks?

**Credentials verbatim.** Write qualifications exactly as the coach or their
document states them. "iPEC Certified Professional Coach" is a searchable entity;
"ICF-certified through iPEC" is a paraphrase that is both inaccurate and matches
nothing anyone searches for. Never merge an accrediting body with a programme.

**Preserve the coach's own distinctive phrasing.** Before writing anything, pick
the single most distinctive sentence across the five answers — the one another
coach would not have written. Carry it into the profile VERBATIM, in whichever
field it belongs, and build the sentence around it rather than smoothing it out.
This is not optional. In a market where every profile says the same things, that
one line is the only thing a reader will remember.

**Never invent a position the coach did not take.** Facts are the obvious risk;
opinions are the dangerous one, because nothing about them is checkable. The
philosophy field is where this happens, since it reads as belief.

Worked case. A coach answered: "Most of my clients think it's someone else's
fault. Backing yourself is a skill that can be learned, and confidence and
fulfilment are endeavours that take years, not quick fixes."

WRONG: "I refuse to treat leadership as therapy. I hold myself accountable to
outcomes the client can measure, not feelings they cannot." Well written, and
completely invented. The coach never mentioned therapy, never mentioned
measurement, and had in fact just said that confidence and fulfilment — the
least measurable things there are — take years and matter. The profile puts him
on the opposite side of a debate he never entered.

RIGHT: "Backing yourself is a skill that can be learned, not a temperament you
either have or don't. I work on the timescale that actually takes, which is years
rather than a reset weekend."

If the answers contain no stated belief, build the philosophy from what the coach
said about how they work. If there is still nothing, return null and name it in
needs_more. An invented conviction is worse than a missing one: the coach has to
notice it is not theirs before they can remove it, and a polished sentence is
exactly what people skim past.

**Use only facts present in the five answers or the document.** Invent nothing.
Where two sources disagree on a number, use the more conservative one.

**Never state a duration, count or year-span that was not given to you.** Not
"two decades", not "over 15 years", not "hundreds of leaders", not "a career
spanning". If the coach did not say how long or how many, the profile does not
say either. A plausible number is still an invented one, and it is the kind a
buyer checks.

**An accrediting body accredits a programme, not a person.** If a coach says
they trained through an ICF-approved programme, write that they trained through
an ICF-approved programme. Do not promote it to "accredited by the ICF", which
is a claim about them rather than about the course. Same for every other body.
Write the credential at exactly the strength the coach stated it.

**Return null rather than padding.** If an answer is too thin to write a field
honestly, set that field to null. A thin honest profile can be improved. A padded
one has to be unpicked.

"needs_more" is ALWAYS an array, never null. Every field you set to null must
appear in it by name. If nothing is null, return an empty array. That array is how
a human reviewer knows what to go back and ask the coach for, so it is not
optional.

## The five fields

1. headline — one line, pipe-separated, three parts: role | the proof | Galoras
   Coaching Exchange. The proof segment is the only part a competitor cannot copy:
   a real number, a real company, a real scale. Use the words a buyer would
   actually search. 90-115 characters. No em dashes.

2. positioning_statement — EXACTLY THREE SENTENCES, 45 to 65 words. THIS IS AN
   ARGUMENT, NOT A BIOGRAPHY.
   Sentence 1: name what their client believes the problem is.
   Sentence 2: say why it is actually something else.
   Sentence 3: say what you do about it, with proof inside the sentence.
   If it will not fit in three, cut a claim rather than adding a fourth sentence.
   One proof per sentence; never stack two credentials into one clause.
   Answer the buyer's real question in the language they would use. Never open
   with "I help..." or "With over X years of experience...".

3. methodology — 120 to 190 words. How they work, NAMED. If their answer gives a
   name for their approach, use it and explain its parts concretely. Name the
   qualification or experience that entitles them to it. This is where every coach
   sounds identical, so specificity is the whole game. Never write "bespoke",
   "holistic", "journey", "unlock", "empower", "transformational", or "tailored to
   your needs".

4. coaching_philosophy — 2 sentences. What they refuse to do, or what they hold
   themselves to. Not a restatement of the positioning. Every clause must trace
   to something the coach actually said — if you cannot point at the words it
   came from, it does not go in.

5. coaching_style — one line, under 20 words. How it feels to be coached by them.

## Also produce

- bio — 80 to 120 words, first person. Credibility first, with numbers in the
  opening sentence. Then the qualification. Then one human line. Career facts come
  from the uploaded document, attributed to the right employers.
- specialties — exactly 5, two to four words each, title case. These are SEARCH
  TERMS, not descriptions. Before writing each one ask: would a buyer type this
  into a search box, or say it to an assistant? "Executive Coaching", "Leadership
  Development", "Founder Coaching", "Succession Planning" pass that test.
  "CEO Confidence", "Executive Resilience", "Corporate Athlete Framework" fail it
  — they describe how the coach thinks, not what the buyer is looking for. Use
  the buyer's words.
- proof_points — 3 to 5 short lines, each one a fact a buyer could check. This is
  the field the public page displays as the coach's evidence, so it carries more
  weight than anything else here and is the easiest to get wrong.
  Each line is a scale, a name, a number, a credential or a title — 8 to 14 words,
  no sentence, no verb padding, no adjectives.
    PASS: "Led a $108m revenue portfolio as CEO of Brava"
    PASS: "iPEC Certified Professional Coach (ICF ACC)"
    PASS: "Coached 1,000+ leaders at Apple, Google and Cisco"
    FAIL: "Extensive experience driving transformational growth"  (no fact)
    FAIL: "Passionate about unlocking leadership potential"       (no fact)
  Every line must trace to something in the coach's answers or the uploaded
  document. If you cannot point at the words it came from, it does not go in —
  invent nothing, round nothing up, and never move one organisation's scale onto
  another. Do not restate the same proof twice in different words. If there are
  fewer than three checkable facts, return only the ones that are real and put
  "proof_points" in needs_more.
- audience — 2 to 4 role titles, plural, e.g. ["CEOs","Founders","CROs"].
- primary_pillar — one of: Executive Performance, Executive Presence, Leadership
  Development, Commercial Leadership, Career Transition, Founder & Startup,
  Team Performance.
- engagement_format — one of: online, in_person, hybrid. Null if not stated.
- proposed_tags — your reading of what they said, as free text arrays, for
  specialty, audience, style, industry, credential. The coach confirms these
  against a controlled list afterwards, so approximate wording is fine here.

## The standard to match

headline: "Executive Performance Coach | 1,000+ leaders at Apple . Google . Cisco | Galoras Coaching Exchange"

positioning_statement: "Most high-achieving Directors and VPs are not held back by
skill. They are held back by visibility - by how they show up under pressure, and
whether the people who matter can see their full capability. I coach leaders at
Apple, Google, Cisco, and Fortune 500 companies to close that gap: from capable to
undeniable."

Sentence one removes the obvious explanation. Sentence two replaces it. Sentence
three is the offer with proof baked in. Every proper noun in it is checkable.

Return ONLY a JSON object, no prose around it, with exactly these keys:
headline, positioning_statement, methodology, coaching_philosophy, coaching_style,
bio, proof_points, specialties, audience, primary_pillar, engagement_format,
proposed_tags, needs_more.`;

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!ANTHROPIC_KEY) {
    return fail(
      "config",
      "ANTHROPIC_API_KEY is not set on this project. Add it in Project Settings -> Edge Functions -> Secrets.",
      500,
    );
  }

  // The anon key is published in the front-end bundle, so "has a valid JWT" is
  // not a meaningful gate - anyone could call this in a loop and spend the
  // project's Anthropic credit. Require an actual signed-in user.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return fail("auth", "Sign in before generating a profile.", 401);
  }
  try {
    const authClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return fail("auth", "Sign in before generating a profile.", 401);
    }
  } catch (e) {
    return fail("auth", `Could not verify the session: ${String(e)}`, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (e) {
    return fail("parse", `Body is not valid JSON: ${String(e)}`, 400);
  }

  const {
    userId,
    email,
    fullName,
    answers,
    documentBase64,
    documentMediaType,
    avatarUrl,
  } = body as {
    userId?: string;
    email?: string;
    fullName?: string;
    answers?: Record<string, string>;
    documentBase64?: string;
    documentMediaType?: string;
    avatarUrl?: string;
  };

  if (!fullName) return fail("validate", "fullName is required", 400);
  if (!userId && !email) {
    return fail("validate", "one of userId or email is required", 400);
  }
  if (!answers || Object.keys(answers).length === 0) {
    return fail("validate", "answers are required", 400);
  }

  // ---- build the message ---------------------------------------------------

  const answerBlock = `
The coach is ${fullName}.

Q1. How would you describe your coaching practice today?
${answers.practice ?? "(not answered)"}

Q2. Who do you most want to work with?
${answers.audience ?? "(not answered)"}

Q3. What do your clients get wrong about their own problem?
${answers.misdiagnosis ?? "(not answered)"}

Q4. What have you done that nobody can argue with?
${answers.proof ?? "(not answered)"}

Q5. How do you work, and what do you call it?
${answers.method ?? "(not answered)"}
`.trim();

  const content: unknown[] = [];

  if (documentBase64) {
    content.push({
      type: "document",
      source: {
        type: "base64",
        media_type: documentMediaType ?? "application/pdf",
        data: documentBase64,
      },
    });
  }
  content.push({ type: "text", text: answerBlock });

  // ---- call Anthropic ------------------------------------------------------

  let generated: Record<string, unknown>;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      }),
    });

    const raw = await res.text();

    if (!res.ok) {
      return fail("anthropic", `Anthropic returned ${res.status}`, 502, raw.slice(0, 1200));
    }

    const payload = JSON.parse(raw);
    const text = payload?.content?.[0]?.text;
    if (!text) {
      return fail("anthropic", "No text block in the response", 502, raw.slice(0, 1200));
    }

    // The model is told to return bare JSON, but tolerate a fenced block.
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
    try {
      generated = JSON.parse(cleaned);
    } catch (e) {
      return fail("parse-model", `Model output was not JSON: ${String(e)}`, 502, cleaned.slice(0, 1200));
    }
  } catch (e) {
    return fail("anthropic", `Request to Anthropic failed: ${String(e)}`, 502);
  }

  // ---- write the draft row -------------------------------------------------

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const row: Record<string, unknown> = {
    display_name: fullName,
    email: email ?? null,
    headline: generated.headline ?? null,
    bio: generated.bio ?? null,
    positioning_statement: generated.positioning_statement ?? null,
    methodology: generated.methodology ?? null,
    coaching_philosophy: generated.coaching_philosophy ?? null,
    coaching_style: generated.coaching_style ?? null,
    // proof_points is what the public page shows as the coach's evidence. The
    // column has existed all along, the page has always rendered it, and nothing
    // has ever written it - so every profile published so far had an empty proof
    // section. Normalised to a clean string array here: the page accepts strings
    // or {text} objects, and a half-shaped value is worse than none.
    proof_points: Array.isArray(generated.proof_points)
      ? generated.proof_points
          .map((p: unknown) =>
            typeof p === "string" ? p.trim()
            : p && typeof p === "object" && typeof (p as any).text === "string"
              ? (p as any).text.trim()
              : "")
          .filter((p: string) => p.length > 0)
      : null,
    specialties: generated.specialties ?? null,
    audience: generated.audience ?? null,
    primary_pillar: generated.primary_pillar ?? null,
    engagement_format: normaliseEngagementFormat(generated.engagement_format),
    lifecycle_status: "draft",
    status: "pending",
    updated_at: new Date().toISOString(),
  };

  if (userId) row.user_id = userId;
  if (avatarUrl) row.avatar_url = avatarUrl;

  // Find an existing row before inserting, so a coach who reruns generation
  // updates their draft rather than collecting duplicates.
  let existingId: string | null = null;
  if (userId) {
    const { data } = await supabase
      .from("coaches").select("id").eq("user_id", userId).limit(1).maybeSingle();
    existingId = data?.id ?? null;
  }
  if (!existingId && email) {
    const { data } = await supabase
      .from("coaches").select("id").eq("email", email).limit(1).maybeSingle();
    existingId = data?.id ?? null;
  }

  let coachId: string;

  if (existingId) {
    const { error } = await supabase
      .from("coaches").update(row).eq("id", existingId).select("id").single();
    if (error) return fail("db-update", error.message, 500, error);
    coachId = existingId;
  } else {
    // Resolve the slug BEFORE inserting. There is a unique index on slug, so a
    // collision fails the insert outright - fixing it afterwards is too late.
    const base = slugify(fullName) || "coach";
    let candidate = base;
    for (let n = 2; n <= 20; n++) {
      const { data: taken } = await supabase
        .from("coaches").select("id").eq("slug", candidate).limit(1).maybeSingle();
      if (!taken) break;
      candidate = `${base}-${n}`;
    }
    row.slug = candidate;

    const { data, error } = await supabase
      .from("coaches").insert(row).select("id").single();
    if (error || !data) {
      return fail("db-insert", error?.message ?? "insert returned no row", 500, error);
    }
    coachId = data.id;
  }

  // The slug is returned so the onboarding page can link the coach straight to a
  // preview of their own page. On the insert path it is the slug just resolved;
  // on the update path the row already has one, so read it back rather than
  // guessing - a coach whose name produced a collision has a suffixed slug.
  let slug: string | null = (row.slug as string | undefined) ?? null;
  if (!slug) {
    const { data: slugRow } = await supabase
      .from("coaches").select("slug").eq("id", coachId).maybeSingle();
    slug = slugRow?.slug ?? null;
  }

  return json({
    ok: true,
    coachId,
    slug,
    generated,
    needs_more: generated.needs_more ?? [],
  });
});

// The coaches table only accepts 'online', 'in_person' or 'hybrid'
// (coaches_engagement_format_check). The model's wording varies ("virtual",
// "remote", "video", "in-person", "face to face"), so map it here rather than
// let one field fail the whole insert. Unrecognised values fall back to
// 'online'; missing values stay null.
function normaliseEngagementFormat(value: unknown): "online" | "in_person" | "hybrid" | null {
  if (value === null || value === undefined) return null;
  const s = String(value).toLowerCase().replace(/[\s_\-]+/g, " ").trim();
  if (!s || s === "null" || s === "none" || s === "not stated") return null;
  if (s.includes("hybrid") || s.includes("both") || s.includes("blend")) return "hybrid";
  if (s.includes("in person") || s.includes("face to face") || s.includes("on site") || s.includes("onsite")) return "in_person";
  return "online";
}
