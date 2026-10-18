import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { PATTERNS, SPECTRA, HOW_COACHING_HELPS, SCENARIOS, FAQ } from "@/data/patternsContent";

// Is coaching for me? (18 Oct 2026). Served at /coaching/is-coaching-for-me.
// Helps a prospective coachee recognise a pattern in themselves and see how coaching helps.
// No test, no score, no trait labels. Content lives in src/data/patternsContent.ts.
// Conversion goes to the existing early-access page; ?from=patterns marks the source.

const CTA_URL = "/coaching/for-you?from=patterns#early-access";

export default function IsCoachingForMe() {
  const [picked, setPicked] = useState<string[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const pickedPatterns = PATTERNS.filter((p) => picked.includes(p.id));

  return (
    <Layout>
      <SEO
        title="Is coaching for me? Understand what drives you, and what holds you back"
        description="Can't switch off, overthinking decisions, putting things off, finding it hard to say no? See how the strengths that got you here can get in the way, and how a coach helps."
        canonical="/coaching/is-coaching-for-me"
      />

      {/* 1. Hero */}
      <section className="relative pt-32 pb-20 bg-zinc-950">
        <div className="container-wide max-w-3xl">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">Galoras Coaching · Is coaching for me?</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tight text-white mb-6 leading-[1.05]">
            Understand what drives you. <span className="text-gradient">And what holds you back.</span>
          </h1>
          <p className="text-zinc-300 text-lg md:text-xl leading-relaxed">
            The qualities that help you succeed can be the same ones that make things harder. Coaching helps you see the difference, and decide what to do about it.
          </p>
          <p className="mt-6 text-sm text-zinc-400">No test. No score. Pick anything below that sounds like you.</p>
        </div>
      </section>

      {/* 2. Recognise yourself */}
      <section className="section-padding bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide">
          <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight mb-3">Does any of this sound like you?</h2>
          <p className="text-zinc-400 mb-10 max-w-2xl">Tap the ones that ring true. You can pick as many as you like.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PATTERNS.map((p) => {
              const on = picked.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                  className={`text-left rounded-2xl border p-6 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    on ? "border-primary bg-primary/10" : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-display text-lg font-bold text-white leading-snug">
                      {p.headline} <span className="text-primary">{p.turn}</span>
                    </p>
                    <span
                      className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        on ? "border-primary bg-primary text-zinc-950" : "border-zinc-600"
                      }`}
                      aria-hidden="true"
                    >
                      {on && <Check className="h-4 w-4" />}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-300 leading-relaxed">{p.body}</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">{on ? "That’s me" : "Sounds like me?"}</p>
                </button>
              );
            })}
          </div>

          <div aria-live="polite" className="mt-10">
            {pickedPatterns.length > 0 && (
              <div className="rounded-2xl border border-primary/40 bg-zinc-950 p-6 md:p-8">
                <p className="font-display text-xl font-bold text-white">
                  {pickedPatterns.length === 1 ? "That’s a common place to start." : `You picked ${pickedPatterns.length}. You’re not unusual.`}
                </p>
                <p className="mt-2 text-zinc-400">These are exactly the kinds of things people work on with a coach:</p>
                <ul className="mt-4 space-y-2">
                  {pickedPatterns.map((p) => (
                    <li key={p.id} className="flex gap-3 text-zinc-200">
                      <Check className="h-4 w-4 shrink-0 text-primary mt-1" aria-hidden="true" />
                      {p.coachingFocus}
                    </li>
                  ))}
                </ul>
                <Link to={CTA_URL} className="mt-6 block sm:inline-block">
                  <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold w-full sm:w-auto h-auto min-h-11 py-3 whitespace-normal">
                    Get early access to a coach
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Strengths and the cost of them */}
      <section className="section-padding bg-zinc-950">
        <div className="container-wide">
          <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight mb-3">Every strength has a cost</h2>
          <p className="text-zinc-400 mb-10 max-w-2xl">
            There’s no ideal type. Each tendency helps you in some moments and gets in the way in others. Both ends of each line are normal.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            {SPECTRA.map((s) => (
              <div key={s.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">{s.theme}</p>
                <div className="mt-4 flex items-center gap-3" aria-hidden="true">
                  <span className="h-3 w-3 rounded-full bg-primary" />
                  <span className="h-px flex-1 bg-gradient-to-r from-primary via-zinc-600 to-accent" />
                  <span className="h-3 w-3 rounded-full bg-accent" />
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {s.ends.map((e, i) => (
                    <div key={e.label} className={i === 1 ? "sm:text-right" : ""}>
                      <p className={`font-display text-lg font-bold ${i === 0 ? "text-primary" : "text-accent"}`}>{e.label}</p>
                      <p className="mt-2 text-sm text-zinc-200">
                        <span className="font-semibold text-white">Helps: </span>
                        {e.helps}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        <span className="font-semibold text-zinc-300">Gets in the way: </span>
                        {e.hinders}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How coaching helps */}
      <section className="section-padding bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide">
          <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight mb-3">Coaching doesn’t change who you are</h2>
          <p className="text-zinc-400 mb-10 max-w-2xl">It helps you notice what you do, decide when it’s working, and choose something different when it isn’t.</p>
          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {HOW_COACHING_HELPS.map((h, i) => (
              <li key={h.title} className="border-t-2 border-primary pt-6">
                <p className="font-display font-black text-sm text-primary">0{i + 1}</p>
                <h3 className="font-display font-bold text-lg text-white mt-2 mb-2">{h.title}</h3>
                <p className="text-sm text-zinc-300 leading-relaxed">{h.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. Real situations */}
      <section className="section-padding bg-zinc-100 text-zinc-900">
        <div className="container-wide">
          <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-10">What it looks like in real life</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {SCENARIOS.map((s) => (
              <div key={s.situation} className="rounded-2xl bg-white p-6">
                <p className="font-semibold text-zinc-900">{s.situation}</p>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{s.coaching}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Find the right coach + 7. between sessions */}
      <section className="section-padding bg-zinc-950">
        <div className="container-wide grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight mb-4">Work on it with someone who’s been there</h2>
            <p className="text-zinc-300 leading-relaxed">
              Galoras coaches are operators. They’ve led teams, built businesses and made the moves they coach. You’re matched with someone who fits what you want to change, and your first session sets the one or two things that matter most.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link to={CTA_URL}>
                <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold w-full sm:w-auto">
                  Get early access
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/coaching/how-it-works">
                <Button size="lg" variant="outline" className="border-zinc-600 text-white hover:bg-zinc-800 w-full sm:w-auto">
                  How Galoras Coaching works
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-zinc-500">Opening January 2027. Invited coaches are joining now.</p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Between sessions · from January 2027</p>
            <h3 className="mt-3 font-display text-2xl font-bold text-white">The work doesn’t stop when the call ends</h3>
            <p className="mt-3 text-zinc-300 leading-relaxed">
              Patterns change in the days between sessions, not during them. On Galoras, each session ends with the next step you’ve chosen, a short check-in follows up on it, and your coach sees how it went before you meet again. You decide what your coach sees.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-zinc-900 border-t border-zinc-800">
        <div className="container-wide max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight mb-8">Common questions</h2>
          <div className="divide-y divide-zinc-800 border-y border-zinc-800">
            {FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {f.q}
                    <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                  {open && <p className="pb-5 text-zinc-300 leading-relaxed">{f.a}</p>}
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-sm text-zinc-500">
            Leading a whole team?{" "}
            <Link to="/enterprise" className="font-semibold text-primary underline-offset-4 hover:underline">See Galoras Enterprise</Link>.
          </p>
        </div>
      </section>
    </Layout>
  );
}
