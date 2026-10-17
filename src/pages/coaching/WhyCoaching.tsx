import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

// Galoras Coaching — How it works (replaces the Barnes-era "Why Coaching", 17 Oct 2026).
// Served at /coaching/how-it-works; /coaching/why redirects here.
// Describes the January product (North Star). Pilot findings never go on this page.

const steps = [
  {
    n: "01",
    title: "Find someone who’s done it",
    body: "Galoras coaches are operators. They have led teams, built businesses and made the transitions they coach. Their profiles are written from that real experience, so you can see who fits what you’re working on.",
  },
  {
    n: "02",
    title: "Meet on Galoras",
    body: "Book, pay and meet in one place. Sessions run on Galoras by video, with nothing to install and no links to chase.",
  },
  {
    n: "03",
    title: "The session becomes your next step",
    body: "With both of you agreeing, the session is transcribed. You leave with one to three actions, and the one thing that matters most this week. You decide what your coach sees.",
  },
  {
    n: "04",
    title: "Your coach arrives ready",
    body: "Before you meet again, your coach sees your goals, what you did and what got in the way. You pick up where you left off, not from the beginning.",
  },
];

const pillars = [
  { title: "Human-led", body: "Your coach does the coaching. The technology keeps it moving between sessions." },
  { title: "Measured", body: "Your actions are tracked from one session to the next, so you can both see what’s moving and what’s stuck." },
  { title: "Built by operators", body: "Coaches who have done the job, not just studied it." },
];

const whoFor = [
  "Stepping into a bigger role",
  "Leading a team for the first time",
  "Running your own business",
  "Making a career change",
  "Leading through change or pressure",
  "Stuck on a decision you keep putting off",
];

export default function WhyCoaching() {
  return (
    <Layout>
      <SEO
        title="How Galoras Coaching works"
        description="Find a coach who has done the job, meet on Galoras, and turn every session into your next step. Your coach arrives at the next session already knowing how it went."
        canonical="/coaching/how-it-works"
      />

      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-zinc-950">
        <div className="container-wide max-w-3xl text-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">Galoras Coaching · How it works</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tight text-white mb-6">
            A great session is only <span className="text-gradient">half of it.</span>
          </h1>
          <p className="text-zinc-300 text-lg md:text-xl leading-relaxed">
            Most coaching stops when the call ends. On Galoras, the session becomes the work you do next, and your coach knows how it went before you meet again.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/coaching">
              <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold">
                Find a coach
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Four steps */}
      <section className="section-padding bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="border-t-2 border-primary pt-6">
                <p className="font-display font-black text-sm text-primary">{s.n}</p>
                <h2 className="font-display font-bold text-xl text-white mt-2 mb-3">{s.title}</h2>
                <p className="text-sm text-zinc-300 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="section-padding bg-zinc-950">
        <div className="container-wide">
          <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight text-center mb-12">
            What makes it different
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {pillars.map((p) => (
              <div key={p.title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
                <h3 className="font-display font-bold text-xl text-white mb-3">{p.title}</h3>
                <p className="text-zinc-300 text-sm leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="section-padding bg-zinc-100 text-zinc-900">
        <div className="container-wide max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-8">Who it’s for</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {whoFor.map((w) => (
              <div key={w} className="rounded-xl bg-white px-6 py-4 font-semibold">{w}</div>
            ))}
          </div>
          <p className="mt-8 text-zinc-600">
            Want this for a whole leadership team? That’s{" "}
            <Link to="/enterprise" className="text-primary font-semibold underline underline-offset-4">Galoras Enterprise</Link>.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-zinc-950">
        <div className="container-wide text-center">
          <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight mb-8">Find someone who’s done it.</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/coaching">
              <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold">
                Find a coach
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/apply">
              <Button size="lg" variant="outline" className="border-zinc-600 text-white hover:bg-zinc-800">
                Are you a coach? Apply
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
