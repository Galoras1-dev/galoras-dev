import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

// About — the one-page story (Message House v4, 17 Oct 2026).
// One problem at two scales, three offers, three pillars, the people, Meta Team.
// Nothing here may claim what is not built (North Star rule 4).

const MITESH_PHOTO = "https://qbjuomsmnrclsjhdsjcz.supabase.co/storage/v1/object/public/coach-images/Outside_Blue_Mitesh-removebg-preview.png";
const CONOR_PHOTO = "https://qbjuomsmnrclsjhdsjcz.supabase.co/storage/v1/object/public/coach-images/Conor_standing-removebg.png";
const CONOR_PROFILE = "/coach/conor-mcgowan-smyth";

const offers = [
  {
    tag: "For individuals",
    name: "Galoras Coaching",
    body: "A coach who has done the job, and sessions that turn into action between meetings.",
    href: "/coaching",
    cta: "Find a coach",
  },
  {
    tag: "For leadership teams",
    name: "Galoras Enterprise",
    body: "Strategy alignment and team performance, powered by Meta Team. We find what’s slowing execution, remove it, and measure the change.",
    href: "/enterprise",
    cta: "See how it works",
  },
  {
    tag: "For everyone",
    name: "Leadership Labs",
    body: "Conversations with people who have performed under real pressure: athletes, operators and leaders.",
    href: "/labs",
    cta: "Explore Labs",
  },
];

const pillars = [
  {
    title: "Human-led",
    body: "A real coach or practitioner does the work. The technology keeps it moving between the conversations.",
  },
  {
    title: "Measured",
    body: "Actions tracked from one session to the next for individuals. Before-and-after profiles for teams. We show what changed.",
  },
  {
    title: "Built by operators",
    body: "Our coaches and practitioners have done the jobs they coach. No jargon, no theory decks.",
  },
];

// Static showcase list. The homepage keeps its own copy in
// src/components/FeaturedCoaches.tsx — remove a coach from both.
const coaches = [
  {
    name: "Mitesh Kapadia",
    title: "Master Coach",
    slug: "mitesh-kapadia",
    photo: MITESH_PHOTO,
    positioning: "Coached 1,000+ Directors and VPs at Apple, Google, Cisco, and Fortune 500 companies.",
    outcomes: [
      "Leadership capability made visible and deployable",
      "Executive presence built for high-stakes environments",
      "Career-defining performance at Director and VP level",
    ],
  },
];

export default function About() {
  return (
    <Layout>
      <SEO
        title="About Galoras"
        description="Galoras closes the gap between deciding and doing: coaching for individuals, and Galoras Enterprise for leadership teams, powered by Meta Team. Meet the founder and the coaches."
        canonical="/about"
      />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.10),transparent_55%)]" />
        <div className="container-wide relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">About Galoras</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tight text-white mb-6">
              Close the gap between <span className="text-gradient">deciding and doing.</span>
            </h1>
            <p className="text-zinc-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              People leave a good coaching session and don’t act on it. Leadership teams agree a strategy and don’t execute it. It’s the same problem at two scales, and Galoras exists to fix it.
            </p>
          </div>
        </div>
      </section>

      {/* Three offers */}
      <section className="section-padding bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">What we do</p>
            <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">
              One problem. Three ways we work on it.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {offers.map((o) => (
              <Link
                key={o.name}
                to={o.href}
                className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-8 flex flex-col gap-3 hover:border-primary/60 transition-colors"
              >
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{o.tag}</p>
                <h3 className="text-2xl font-display font-black text-white">{o.name}</h3>
                <p className="text-zinc-300 text-sm leading-relaxed flex-1">{o.body}</p>
                <span className="text-primary font-semibold text-sm group-hover:underline underline-offset-4">
                  {o.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="section-padding bg-zinc-950">
        <div className="container-wide">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">How we’re different</p>
            <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">What every Galoras engagement has</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {pillars.map((p) => (
              <div key={p.title} className="border-t-2 border-primary pt-6">
                <h3 className="font-display font-bold text-xl text-white mb-3">{p.title}</h3>
                <p className="text-zinc-300 text-sm leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDER ── */}
      <section className="py-24 bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-3 rounded-2xl border border-primary/20 pointer-events-none" />
                <img src={CONOR_PHOTO} alt="Conor McGowan Smyth" className="w-72 object-contain" style={{ maxHeight: 400 }} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Founder</p>
              <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tight mb-2">
                Conor <span className="text-gradient">McGowan Smyth</span>
              </h2>
              <p className="text-zinc-500 text-sm font-semibold uppercase tracking-widest mb-6">
                Operator · Executive coach · Founder
              </p>
              <p className="text-zinc-300 text-base leading-relaxed mb-4">
                Conor has spent his career running businesses. He has led organisations of $100M+ in revenue across Europe, the Caribbean, Latin America and the United States, through growth, mergers and transformation.
              </p>
              <p className="text-zinc-400 text-base leading-relaxed mb-4">
                He is a trained executive coach, and coaching is how he leads. Galoras came from what he saw from both sides of the table: leadership teams that agreed a strategy and couldn’t execute it, and good coaching that stopped the moment the call ended.
              </p>
              <p className="text-zinc-400 text-base leading-relaxed mb-8">
                Conor works with a small number of CEOs and leadership teams, one to one and through Galoras Enterprise.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to={CONOR_PROFILE}>
                  <Button className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold">
                    Work with Conor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/enterprise#book">
                  <Button variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800">
                    Talk about your leadership team
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MASTER COACHES ── */}
      <section className="py-24 bg-zinc-950">
        <div className="container-wide">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Our coaches</p>
            <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tight mb-4">
              Master <span className="text-gradient">Coaches</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Every Galoras Master Coach has operated at the level they coach. Master Coaches can qualify to deliver Galoras Enterprise engagements through Meta Team’s ICF-accredited pathway.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {coaches.map((coach) => (
              <div key={coach.slug} className="grid md:grid-cols-2 gap-12 items-center mb-16 last:mb-0">
                <div className="flex justify-center">
                  <Link to={`/coach/${coach.slug}`} className="group relative block">
                    <div className="absolute -inset-3 rounded-2xl border border-primary/15 group-hover:border-primary/40 transition-colors pointer-events-none" />
                    <img src={coach.photo} alt={coach.name} className="w-64 object-contain" style={{ maxHeight: 360 }} />
                  </Link>
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">{coach.title}</p>
                  <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight mb-4">{coach.name}</h3>
                  <p className="text-zinc-400 text-base leading-relaxed mb-5">{coach.positioning}</p>
                  <ul className="space-y-2 mb-6">
                    {coach.outcomes.map((outcome, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                        {outcome}
                      </li>
                    ))}
                  </ul>
                  <Link to={`/coach/${coach.slug}`}>
                    <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                      View Full Profile
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARTNER ── */}
      <section className="py-20 bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide max-w-3xl text-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Our partner</p>
          <h2 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight mb-4">Meta Team</h2>
          <p className="text-zinc-300 text-base leading-relaxed">
            Galoras Enterprise is powered by Meta Team, the team performance system used by 250+ client organisations in 20+ countries. Its diagnostic and workouts are delivered by practitioners on Meta Team’s ICF-accredited pathway.
          </p>
          <p className="mt-4 text-xs text-zinc-500">Figures: Meta Team data. Meta Team is a trade mark of Meta Team Limited.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-zinc-950">
        <div className="container-wide text-center">
          <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight mb-8">Where would you like to start?</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/coaching">
              <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold">
                Find a coach
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/enterprise#book">
              <Button size="lg" variant="outline" className="border-zinc-600 text-white hover:bg-zinc-800">
                Book a conversation for your team
              </Button>
            </Link>
            <Link to="/apply">
              <Button size="lg" variant="outline" className="border-zinc-600 text-white hover:bg-zinc-800">
                Apply as a coach
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
