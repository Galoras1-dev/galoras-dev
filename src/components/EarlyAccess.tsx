import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Check, ArrowRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Pre-launch signup.
//
// Galoras is open to invited coaches and opens to the public in January 2027.
// Until then this is what the homepage is for: two audiences, three fields, one
// honest promise.
//
// Deliberately NOT written to `coaching_requests`. That table feeds the admin
// Leads pipeline (new → contacted → qualified → converted → closed) and is about
// to start carrying real coachee enquiries to real coaches. A few hundred
// LinkedIn signups poured into it would drown the queue on day one.
//
// What this must never do, and does not:
//   - invent coaches, testimonials or numbers
//   - manufacture scarcity ("only 12 places left")
//   - imply a coach application is automatically accepted
//   - promise free membership for ever
//   - bundle marketing consent into the signup
// ─────────────────────────────────────────────────────────────────────────────

type Audience = "member" | "coach";

// Host only, never the full referring URL — a referring URL can carry the
// search terms somebody typed, which is more than we need and more than we
// should keep.
function captureSource() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"]) {
      const v = params.get(k);
      if (v) utm[k] = v.slice(0, 120);
    }
    let referrerHost: string | null = null;
    if (document.referrer) {
      try {
        const u = new URL(document.referrer);
        referrerHost = u.host === window.location.host ? null : u.host;
      } catch { referrerHost = null; }
    }
    return {
      referrer_host: referrerHost,
      utm: Object.keys(utm).length ? utm : null,
    };
  } catch {
    return { referrer_host: null, utm: null };
  }
}

// The audience is CONTROLLED from the page.
//
// The hero has two buttons - "Get early access" and "Apply as a founding coach"
// - and they must do more than move the viewport. On a laptop the form sits
// beside the hero, so it is already on screen and a scroll produces no visible
// change at all: the buttons read as broken. They now set the audience, which is
// a visible change wherever the form happens to be.
export function EarlyAccess({
  audience,
  onAudienceChange,
}: {
  audience: Audience;
  onAudienceChange: (a: Audience) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done" | "already">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim()) { setError("Your first name, so we know what to call you."); return; }
    if (!email.trim() || !email.includes("@")) { setError("We need an email address that works."); return; }

    setState("saving");
    const src = captureSource();

    const { error: insertError } = await supabase.from("prelaunch_signups").insert({
      first_name: firstName.trim(),
      email: email.trim().toLowerCase(),
      audience,
      marketing_consent: marketing,
      // Records WHEN they consented, which is the part that matters if anyone
      // ever asks. Null when they did not.
      consent_at: marketing ? new Date().toISOString() : null,
      source: "homepage",
      referrer_host: src.referrer_host,
      utm: src.utm,
    });

    if (insertError) {
      // 23505 is the unique index on (email, audience). Being on the list twice
      // is not an error the person needs to hear about as one.
      if (insertError.code === "23505") { setState("already"); return; }
      console.error("prelaunch signup failed:", insertError);
      setError("That didn't save. Try again, or email hello@galoras.com and we'll add you by hand.");
      setState("idle");
      return;
    }

    // Carried to /apply so a coach is not asked for the same address twice.
    // sessionStorage rather than a query parameter: an email address in a URL
    // ends up in browser history, referrer headers and server logs.
    if (audience === "coach") {
      try {
        sessionStorage.setItem("galoras_prefill_name", firstName.trim());
        sessionStorage.setItem("galoras_prefill_email", email.trim().toLowerCase());
      } catch { /* private browsing - the coach types it again, no worse */ }
    }

    setState("done");
  };

  if (state === "done" || state === "already") {
    const isCoach = audience === "coach";
    return (
      <div className="rounded-2xl border border-primary/30 bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
          <Check className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-display text-xl font-bold text-foreground">
          {state === "already" ? "You're already on the list" : `Thanks, ${firstName.trim()}.`}
        </h3>

        {isCoach ? (
          <>
            {/* A coach who has given an email is warm RIGHT NOW. Sending them
                away to wait for a reply wastes that. The real application is
                built and live, so the honest next step is to offer it here,
                while they are still in the chair. */}
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Next is the application itself: five questions in your own words and
              one document — a CV, a bio, or your LinkedIn saved as a PDF. It takes
              about ten minutes, and we read every one.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 h-12 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <a href="/apply">
                Start your application
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="mt-4 text-xs text-muted-foreground">
              Not now? We have your email and we'll come back to you.
            </p>
          </>
        ) : (
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            We'll email you when Galoras opens to the public in January 2027.
            Nothing else in the meantime.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      {/* Audience first. It changes what we ask and what we promise, so it is
          the first decision rather than a dropdown buried at the bottom. */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-1">
        {([
          ["member", "I'm looking for a coach"],
          ["coach", "I am a coach"],
        ] as [Audience, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onAudienceChange(key)}
            className={[
              "rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              audience === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ea-name">First name</Label>
          <Input
            id="ea-name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            autoComplete="given-name"
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ea-email">Email</Label>
          <Input
            id="ea-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            className="h-12 text-base"
          />
        </div>

      </div>

      {/* Optional, and separate. Being told when Galoras opens is what they just
          asked for; anything beyond that is a different question and has to be
          asked as one. */}
      <div className="mt-6 flex items-start gap-3">
        <Checkbox
          id="ea-marketing"
          checked={marketing}
          onCheckedChange={v => setMarketing(!!v)}
          className="mt-0.5 shrink-0"
        />
        {/* The shared Label is display-font, uppercase and letter-spaced, which
            is right for a field name and wrong for a sentence. normal-case and
            font-sans put it back to something a person reads rather than scans. */}
        <Label
          htmlFor="ea-marketing"
          className="cursor-pointer font-sans text-sm font-normal normal-case leading-relaxed tracking-normal text-muted-foreground"
        >
          Send me the occasional email about coaching and what we're building. Not
          required, and you can stop it any time.
        </Label>
      </div>

      {error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={state === "saving"}
        className="mt-6 h-12 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {state === "saving"
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding you…</>
          : audience === "coach"
            ? <>Continue to the application<ArrowRight className="ml-2 h-4 w-4" /></>
            : <>Get early access<ArrowRight className="ml-2 h-4 w-4" /></>}
      </Button>

      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        {audience === "coach"
          ? "Founding coaches join free at launch, subject to approval. We read every application and take on a small number at a time."
          : "We'll only use your email to tell you when Galoras opens."}{" "}
        <a href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          How we handle your data
        </a>
      </p>
    </form>
  );
}
