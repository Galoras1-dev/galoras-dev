import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { EarlyAccess } from "@/components/EarlyAccess";
import { Check } from "lucide-react";

// Galoras Coaching for coachees — early-access page (18 Oct 2026).
// Describes the two coachee offerings from Pricing and Packaging v1.
// Sign-ups go to prelaunch_signups through the shared EarlyAccess form.
// Honest about timing: opening January 2027, some features arrive during 2027.

type Audience = "member" | "coach";

const WITH_COACH = [
  "Find a coach who has done the job, matched to what you want to change",
  "A Discovery session to set your North Star and the habits you want to work on",
  "Book, pay and meet on Galoras, with nothing to install",
  "Each session turns into one to three actions you confirm",
  "You choose what your coach sees",
  "A check-in between sessions on the one thing that matters this week",
  "Before each session, you both see what moved and what's stuck",
];

const COMPANION = [
  "Everything in With a coach",
  "A short daily check-in tied to your habits",
  "Your record across coaches, kept for you",
  "Rebook a coach in one click when you need one",
];

export default function ForYou() {
  const [audience, setAudience] = useState<Audience>("member");

  return (
    <Layout>
      <SEO
        title="Galoras for you: early access"
        description="Coaching that keeps working between sessions. Free with a coach, opening January 2027. Sign up for early access."
        canonical="/coaching/for-you"
      />

      {/* Hero + form */}
      <section className="relative pt-32 pb-20 bg-zinc-950">
        <div className="container-wide grid items-start gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
              Early access · opening January 2027
            </p>
            <h1 className="font-display text-4xl font-black leading-[1.05] text-white md:text-5xl lg:text-6xl">
              Coaching that keeps working <span className="text-gradient">between sessions.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-300">
              Find a coach who has done the job. Meet on Galoras. Leave every session with the next step, and arrive at the next one with your coach already knowing how it went.
            </p>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-zinc-400">
              We’re opening in stages. Sign up and we’ll invite you as places open. Some features arrive during 2027, and we’ll tell you exactly what’s ready when you join.
            </p>
            <Link to="/coaching/how-it-works" className="mt-6 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">
              How Galoras Coaching works →
            </Link>
          </div>
          <div id="early-access" className="scroll-mt-24">
            <EarlyAccess audience={audience} onAudienceChange={setAudience} />
          </div>
        </div>
      </section>

      {/* Two offerings */}
      <section className="section-padding bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide">
          <h2 className="font-display text-3xl font-black text-white md:text-4xl mb-10">What you get</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-primary bg-zinc-950 p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">From January 2027</p>
              <h3 className="mt-3 font-display text-2xl font-black text-white">With a coach</h3>
              <p className="mt-2 font-display text-3xl font-black text-white">Free</p>
              <p className="text-sm text-zinc-400">You pay your coach per session. A Discovery session is $250, credited to your first package.</p>
              <ul className="mt-6 space-y-3">
                {WITH_COACH.map((f) => (
                  <li key={f} className="flex gap-3 text-sm text-zinc-200">
                    <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Later in 2027</p>
              <h3 className="mt-3 font-display text-2xl font-black text-white">Galoras Companion</h3>
              <p className="mt-2 font-display text-3xl font-black text-white">$19<span className="text-base font-semibold text-zinc-400"> / month</span></p>
              <p className="text-sm text-zinc-400">Free while you have an active coach. For the months between coaches.</p>
              <ul className="mt-6 space-y-3">
                {COMPANION.map((f) => (
                  <li key={f} className="flex gap-3 text-sm text-zinc-200">
                    <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-8 text-sm text-zinc-500">Prices are for launch and may change before January. Early-access members hear first.</p>
        </div>
      </section>

      {/* Who it's for */}
      <section className="section-padding bg-zinc-950">
        <div className="container-wide max-w-4xl">
          <h2 className="font-display text-3xl font-black text-white md:text-4xl mb-8">Who it’s for</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Stepping into a bigger role",
              "Leading a team for the first time",
              "Running your own business",
              "Making a career change",
              "Leading through change or pressure",
              "Stuck on a decision you keep putting off",
            ].map((w) => (
              <div key={w} className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-4 font-semibold text-zinc-100">{w}</div>
            ))}
          </div>
          <p className="mt-10 text-zinc-400">
            Leading a whole team?{" "}
            <Link to="/enterprise" className="font-semibold text-primary underline-offset-4 hover:underline">See Galoras Enterprise</Link>.
            {" "}Are you a coach?{" "}
            <Link to="/apply" className="font-semibold text-primary underline-offset-4 hover:underline">Apply to coach on Galoras</Link>.
          </p>
        </div>
      </section>
    </Layout>
  );
}
