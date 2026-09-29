import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { FounderVideoModal } from "@/components/FounderVideoModal";
import { FeaturedCoaches } from "@/components/FeaturedCoaches";
import { SEO } from "@/components/SEO";
import { PreLaunchNotice } from "@/components/PreLaunchNotice";
import { EarlyAccess } from "@/components/EarlyAccess";
import { ArrowRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// The homepage — built to the Galoras message house (Strategy V2, slide 14).
//
//   BRAND    Do More. Do It Now.
//   CORE     AI that enables human connection
//   COACH    Get work. Do the work. Run the work.
//   COACHEE  Find the human. Do the work together. Keep moving between sessions.
//
// TWO THINGS THAT WERE TRIED AND REMOVED, SO NOBODY PUTS THEM BACK
//
// 1. A section leading with the UAT finding that adherence between sessions was
//    near zero. It is the most valuable thing the business knows and it must not
//    go on a public page: Mitesh is the only coach publicly associated with
//    Galoras, so an anonymised "our pilot" points straight at him, using a real
//    client's behaviour from a relationship she believed was private.
//
// 2. A four-card product story where each card carried a Live now / Partly live
//    / In build badge. That is a roadmap audit, not a homepage. It was written
//    by someone thinking like an engineer rather than a marketer, and it made
//    Galoras look unfinished on its own front page.
//
// HOW HONESTY IS HANDLED INSTEAD
//
// The page describes the product Galoras is launching in January, because that
// is what it is selling and what the pre-launch frame is for. It does not claim
// any of it works today. The mechanism is described in the tense of something
// being built, the PreLaunchNotice carries the date at the top of every page,
// and no screenshot, testimonial, metric or coach count is invented anywhere.
// ─────────────────────────────────────────────────────────────────────────────

const COACH_STEPS = [
  {
    label: "Get work",
    body: "A profile that reads like your practice, in front of people actively looking. Matched on what you actually do, not on a keyword.",
  },
  {
    label: "Do the work",
    body: "Meet your client on Galoras. The session becomes a record — priorities, commitments, what was decided — instead of notes you write up at eleven at night.",
  },
  {
    label: "Run the work",
    body: "Scheduling, clients, payments and the history of every relationship in one place, rather than spread across four tools and your inbox.",
  },
];

const COACHEE_STEPS = [
  {
    label: "Find the human",
    body: "A real coach, chosen for what you're actually trying to do. Not an algorithm having a go at coaching you.",
  },
  {
    label: "Do the work together",
    body: "Meet in one place, with everything from your last session already there — so you don't spend the first ten minutes recapping.",
  },
  {
    label: "Keep moving between sessions",
    body: "What you agreed becomes something you can see and act on. And your coach arrives at the next session knowing how it actually went.",
  },
];

type Audience = "member" | "coach";

// ─────────────────────────────────────────────────────────────────────────────
// Why this is more than a scroll.
//
// The first version of the hero buttons only called scrollIntoView. On a laptop
// the form sits in the right-hand column of the hero, so it is ALREADY on
// screen, nothing moves, and both buttons look broken. On a phone it worked,
// which is exactly how a bug like this survives a quick check.
//
// So a click now does three things, and at least one of them is always visible:
//   1. sets the audience   - the toggle flips, which is the point of the button
//   2. scrolls             - only has an effect where the form is off screen
//   3. focuses and flashes - feedback on a laptop, where nothing scrolled
// ─────────────────────────────────────────────────────────────────────────────
function useFormJump(setAudience: (a: Audience) => void) {
  return (a: Audience) => {
    setAudience(a);
    const el = document.getElementById("early-access");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "rounded-2xl");
    window.setTimeout(() => {
      // preventScroll: the smooth scroll above is already running and focus
      // would otherwise jump it to the top instantly.
      (document.getElementById("ea-name") as HTMLInputElement | null)
        ?.focus({ preventScroll: true });
    }, 350);
    window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "rounded-2xl");
    }, 1400);
  };
}

function Track({
  eyebrow,
  title,
  steps,
}: {
  eyebrow: string;
  title: string;
  steps: { label: string; body: string }[];
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-8 lg:p-10">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-primary">
        {eyebrow}
      </p>
      <h3 className="mb-9 font-display text-2xl font-bold leading-tight text-foreground lg:text-3xl">
        {title}
      </h3>

      <ol className="space-y-7">
        {steps.map((s, i) => (
          <li key={s.label} className="flex gap-5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-display text-sm font-bold text-primary">
              {i + 1}
            </span>
            <div>
              <p className="font-display text-base font-bold text-foreground">{s.label}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

    </div>
  );
}

export default function Index() {
  const [audience, setAudience] = useState<Audience>("member");
  const jump = useFormJump(setAudience);

  return (
    <Layout>
      <SEO
        title="AI that enables human connection"
        description="Galoras is a coaching platform built around the relationship between a coach and the person they coach. Find the human, do the work together, keep moving between sessions. Opening January 2027."
        canonical="/"
      />
      <FounderVideoModal />
      <PreLaunchNotice />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[80vh] items-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--accent)/0.10),transparent_55%)]" />

        <div className="container-wide relative z-10 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">

            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
                Opening January 2027
              </p>

              <h1 className="font-display text-5xl font-extrabold leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
                Do More.<br />
                <span className="text-gradient">Do It Now.</span>
              </h1>

              <p className="mt-7 max-w-xl font-display text-2xl font-bold leading-snug text-foreground">
                AI that enables human connection.
              </p>

              {/* The mechanism, in Conor's own words rather than as an
                  abstraction. This is the paragraph that separates Galoras from
                  every "AI coaching" product in the category: the intelligence is
                  tethered at both ends to a real coach and a real client. */}
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                A real coach, matched to you properly. You meet on Galoras. The
                session becomes the work — what you agreed, turned into something
                you can act on — and your coach arrives at the next one already
                knowing how it went.
              </p>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground">
                The coaching is human. The technology is what makes it continue.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => jump("member")}
                  className="h-14 bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90 glow-primary"
                >
                  Get early access
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => jump("coach")}
                  className="h-14 border-primary/50 px-8 text-base text-foreground hover:bg-primary/10"
                >
                  Apply as a founding coach
                </Button>
              </div>
            </div>

            <div id="early-access" className="scroll-mt-24">
              <EarlyAccess audience={audience} onAudienceChange={setAudience} />
            </div>
          </div>
        </div>
      </section>

      {/* ── The two journeys ─────────────────────────────────────────────────
          Slides 10 and 11. A visitor should recognise which of the two they are
          within a second, and not have to read the other one. */}
      <section className="section-padding border-y border-border bg-background">
        <div className="container-wide">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Two sides of the same{" "}
              <span className="text-gradient">relationship</span>
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Track
              eyebrow="If you coach"
              title="Get work. Do the work. Run the work."
              steps={COACH_STEPS}
            />
            <Track
              eyebrow="If you're looking for a coach"
              title="Find the human. Do the work together. Keep moving."
              steps={COACHEE_STEPS}
            />
          </div>
        </div>
      </section>

      {/* Real published coaches. Renders nothing while there are none. */}
      <FeaturedCoaches />

      {/* ── Close ──────────────────────────────────────────────────────────
          ONE call to action, and it is a different one from the hero.

          An earlier version had five buttons on this page — two in the hero,
          two on the journey cards, one here — and every single one scrolled to
          the same form. A visitor cannot tell five identical buttons apart, so
          they read as a page that does not know what it wants. This section now
          does the only job the hero cannot: it speaks to somebody who has
          already read the whole page and has still not moved. */}
      <section className="section-padding hero-gradient">
        <div className="container-wide max-w-3xl text-center">
          <h2 className="mb-5 font-display text-3xl font-bold md:text-4xl">
            We're building this with our{" "}
            <span className="text-gradient">founding coaches</span>
          </h2>
          <p className="mb-9 text-lg leading-relaxed text-muted-foreground">
            Galoras opens to everyone in January 2027. Between now and then we're
            building it alongside a small group of coaches who get in early, help
            shape it, and join free at launch — subject to approval. We read every
            application and take on a few at a time.
          </p>
          <Button asChild size="lg"
            className="h-14 bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90">
            <Link to="/apply">
              Start a coach application
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-6 text-sm text-muted-foreground">
            Five questions in your own words and one document. About ten minutes.
          </p>
        </div>
      </section>

    </Layout>
  );
}
