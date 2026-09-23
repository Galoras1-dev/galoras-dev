import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const MITESH_PHOTO = "https://qbjuomsmnrclsjhdsjcz.supabase.co/storage/v1/object/public/coach-images/Outside_Blue_Mitesh-removebg-preview.png";


const advisors = [
  { initials: "TBA", name: "Advisory Board", note: "Being established. Senior, credible, strategic." },
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
        description="Galoras is a performance organisation built around one standard. Meet the architect, the advisors, and the master coaches who deliver the Sport of Business."
        canonical="/about"
      />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.10),transparent_55%)]" />
        <div className="container-wide relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
              The Organisation
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tight text-white uppercase mb-6">
              Built for <span className="text-gradient">Performance.</span>
            </h1>
            <p className="text-zinc-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Galoras is not a marketplace. It is a performance organisation with one framework, one standard, and coaches who have operated at the level they coach.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOUNDER & CHAIRMAN ── */}
      <section className="py-24 bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide">
          <div className="text-center mb-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">
              Architect
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-16 items-center mt-12">

            {/* Photo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-3 rounded-2xl border border-primary/20 pointer-events-none" />
                <img
                  src="https://qbjuomsmnrclsjhdsjcz.supabase.co/storage/v1/object/public/coach-images/Conor_standing-removebg.png"
                  alt="Conor McGowan Smyth"
                  className="w-72 object-contain"
                  style={{ maxHeight: 400 }}
                />
              </div>
            </div>

            {/* Copy */}
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                Founder & Chairman
              </p>
              <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tight mb-2">
                Conor <span className="text-gradient">McGowan Smyth</span>
              </h2>
              <p className="text-zinc-500 text-sm font-semibold uppercase tracking-widest mb-6">
                Author · The Sport of Business
              </p>
              <p className="text-zinc-300 text-base leading-relaxed mb-4">
                Conor built Galoras from decades of operating experience leading $100M+ revenue organisations across Europe, the Caribbean, Latin America, and the United States — through growth, transformation, and disruption.
              </p>
              <p className="text-zinc-400 text-base leading-relaxed mb-6">
                The Sport of Business framework emerged from that experience. Conor is its architect — responsible for strategic direction, methodology, and the standard every Galoras coach is held to. He is not an operational or bookable resource.
              </p>
              <div className="border-l-2 border-primary/40 pl-4">
                <p className="text-zinc-400 text-sm italic leading-relaxed">
                  "The disciplines that move organisations forward under pressure are the same ones that separate elite sports teams from the rest. Galoras exists to make that capability accessible."
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── ADVISORY BOARD ── */}
      <section className="py-20 bg-zinc-950">
        <div className="container-wide">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Strategic Direction
            </p>
            <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tight mb-4">
              Advisory <span className="text-gradient">Board</span>
            </h2>
            <p className="text-zinc-400 text-base max-w-xl mx-auto">
              A small group of senior advisors who provide strategic counsel. Not operational. Not bookable. Credibility without noise.
            </p>
          </div>

          <div className="max-w-sm mx-auto">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center mb-4">
                <span className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">TBA</span>
              </div>
              <p className="text-zinc-500 text-sm">
                Advisory board being established. Announcements coming.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MASTER COACHES ── */}
      <section className="py-24 bg-zinc-900 border-t border-zinc-800">
        <div className="container-wide">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              The Delivery Engine
            </p>
            <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tight mb-4">
              Master <span className="text-gradient">Coaches</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Every Galoras Master Coach has operated at the level they coach. Selected to deliver the Sport of Business framework. Not just accredited — proven.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {coaches.map((coach) => (
              <div key={coach.slug} className="grid md:grid-cols-2 gap-12 items-center mb-16 last:mb-0">

                {/* Photo */}
                <div className="flex justify-center">
                  <Link to={`/coach/${coach.slug}`} className="group relative block">
                    <div className="absolute -inset-3 rounded-2xl border border-primary/15 group-hover:border-primary/40 transition-colors pointer-events-none" />
                    <img
                      src={coach.photo}
                      alt={coach.name}
                      className="w-64 object-contain"
                      style={{ maxHeight: 360 }}
                    />
                    <div className="absolute bottom-2 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-xs font-semibold text-primary bg-zinc-950/80 px-3 py-1.5 rounded-full">
                        View Profile
                      </span>
                    </div>
                  </Link>
                </div>

                {/* Copy */}
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
                    {coach.title}
                  </p>
                  <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight mb-4">
                    {coach.name}
                  </h3>
                  <p className="text-zinc-400 text-base leading-relaxed mb-5">
                    {coach.positioning}
                  </p>
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

            {/* Placeholder for future coaches */}
            <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center mt-8">
              <p className="text-zinc-600 text-sm font-semibold uppercase tracking-widest mb-2">More Coaches</p>
              <p className="text-zinc-500 text-sm">
                Additional Master Coaches being onboarded. Each selected against the same standard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-zinc-950 border-t border-zinc-800">
        <div className="container-wide text-center">
          <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tight mb-4">
            One Standard. No <span className="text-gradient">Exceptions.</span>
          </h2>
          <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">
            If you want to work with a Galoras coach or bring the Sport of Business framework to your organisation, start here.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/coaching">
              <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold">
                Find a Coach
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-zinc-600 text-white hover:bg-zinc-800">
                Talk to Us About Your Organisation
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
