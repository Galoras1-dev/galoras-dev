import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

// Pricing (rebuilt 20 Oct 2026 from Pricing and Packaging v1.1, signed off 20 Oct).
// No checkout on this page: founding coaches are free to 31 Dec 2026 and no card is taken.
// Features describe the January 2027 product; anything later is labelled. Enterprise pricing is never published.

type Tier = {
  name: string;
  list: string;
  founding: string;
  forWho: string;
  highlight?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: "Pro",
    list: "$49",
    founding: "$34",
    forWho: "Coaches building a practice",
    features: [
      "A profile written by AI from five questions and your CV",
      "Matched to clients on what they want to change, with the reasons shown",
      "Booking, payments and video sessions on Galoras",
      "Each session turned into actions your client confirms",
      "A brief before every session: goals, actions and what's moving",
      "A check-in for your client between sessions",
    ],
  },
  {
    name: "Elite",
    list: "$99",
    founding: "$69",
    forWho: "Established coaches who want to grow",
    highlight: true,
    features: [
      "Everything in Pro",
      "An intro video on your profile",
      "Priority when Galoras introduces new clients",
      "Apply to write for or appear in Leadership Labs",
      "Send a plan or exercise to many clients at once (during 2027)",
    ],
  },
  {
    name: "Master",
    list: "$197",
    founding: "$138",
    forWho: "Senior coaches and operators who want enterprise work",
    features: [
      "Everything in Elite",
      "First priority for Galoras introductions",
      "Featured on the homepage and in Leadership Labs",
      "Meta Team accreditation pathway (ICF-accredited; course fee applies)",
      "Eligible to deliver Galoras Enterprise engagements",
      "A named support contact",
    ],
  },
];

export default function Pricing() {
  return (
    <Layout>
      <SEO
        title="Pricing: plans for coaches, free for clients"
        description="Coach plans from $49 a month, with founding coaches free until the end of 2026. Clients join free with a coach. No fee on the clients you bring."
        canonical="/pricing"
      />

      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-zinc-950">
        <div className="container-wide max-w-3xl text-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">Pricing</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tight text-white mb-6 leading-[1.05]">
            Simple for coaches. <span className="text-gradient">Free for clients.</span>
          </h1>
          <p className="text-zinc-300 text-lg leading-relaxed">
            Coaches pay a monthly plan. Clients join free with their coach and pay the coach for sessions. Galoras opens in January 2027.
          </p>
        </div>
      </section>

      {/* Founding offer */}
      <section className="bg-zinc-950 pb-6">
        <div className="container-wide max-w-5xl">
          <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-6 md:p-8">
            <p className="font-display text-xl font-bold text-emerald-300">Founding coaches: free until 31 December 2026</p>
            <p className="mt-2 text-zinc-300">
              No card and no charge while we test the platform with a small group of coaches. From January, founding coaches keep 30% off their plan for 12 months.
            </p>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="section-padding bg-zinc-950 pt-10">
        <div className="container-wide max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-3">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl border p-8 flex flex-col ${t.highlight ? "border-primary bg-zinc-900" : "border-zinc-800 bg-zinc-900"}`}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-primary">{t.forWho}</p>
                <h2 className="mt-3 font-display text-2xl font-black text-white">{t.name}</h2>
                <p className="mt-3 font-display text-4xl font-black text-white">
                  {t.list}
                  <span className="text-base font-semibold text-zinc-400"> / month</span>
                </p>
                <p className="mt-1 text-sm text-emerald-300">Founding coaches: {t.founding} / month for 12 months from January 2027</p>
                <ul className="mt-6 space-y-3 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-zinc-200">
                      <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="font-display text-lg font-bold text-white">0% on your own clients</p>
              <p className="mt-2 text-sm text-zinc-400">Bring your clients onto Galoras and we take nothing from your session fees.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="font-display text-lg font-bold text-white">15% on clients we introduce</p>
              <p className="mt-2 text-sm text-zinc-400">Only when Galoras finds the client for you. Card fees on session payments are paid by the coach.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="font-display text-lg font-bold text-white">$250 Discovery session</p>
              <p className="mt-2 text-sm text-zinc-400">Every new client starts with a Discovery session, credited to their first package.</p>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/apply">
              <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold w-full sm:w-auto">
                Apply as a founding coach
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Clients and teams */}
      <section className="section-padding bg-zinc-900 border-t border-zinc-800">
        <div className="container-wide max-w-5xl grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">For clients</p>
            <h2 className="mt-3 font-display text-2xl font-black text-white">Free with a coach</h2>
            <p className="mt-3 text-zinc-300">
              You pay your coach for sessions. Galoras is free while you're working with a coach. Galoras Companion, for the months between coaches, is planned for later in 2027 at $19 a month.
            </p>
            <Link to="/coaching/for-you" className="mt-6 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Get early access →
            </Link>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">For teams</p>
            <h2 className="mt-3 font-display text-2xl font-black text-white">Galoras Enterprise</h2>
            <p className="mt-3 text-zinc-300">
              Team performance and strategy alignment, powered by Meta Team. Every engagement is scoped to the team, so we price it in conversation.
            </p>
            <Link to="/enterprise" className="mt-6 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Book a conversation →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10 bg-zinc-950">
        <p className="container-wide text-center text-sm text-zinc-500">
          Prices in US dollars. Prices are for launch and may change before January 2027; founding coaches hear first.
        </p>
      </section>
    </Layout>
  );
}
