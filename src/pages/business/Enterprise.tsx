import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";

// Galoras Enterprise — strategy alignment and team performance (17 Oct 2026).
// Rules: Meta Team is named, never white-labelled (partner agreement cl. 12).
// Figures in the proof strip are Meta Team's own and are labelled as such.
// Nothing here may claim what isn't built or agreed: no practitioner names
// until accredited, no prices, no client names without permission.

const innerGame = ["Trust", "Resilience", "Purpose", "Focus"];
const outerGame = ["Taking action", "Influencing", "Agility", "Adapting"];

const symptoms = [
  { title: "Decisions get reopened", body: "Agreed in the room, relitigated in the corridor." },
  { title: "Meetings are too polite", body: "The real issues get discussed everywhere except the meeting." },
  { title: "Teams work in silos", body: "Everyone is busy. Not everyone is working on the same thing." },
  { title: "Strategy stalls", body: "The plan is good. Delivery is late, again." },
];

const steps = [
  {
    n: "01",
    title: "Diagnose",
    body: "32 statements, four views of the team: the team itself, its leader, the leader’s boss, and the stakeholders who work with it. Benchmarked by sector and region.",
    when: "About one week",
  },
  {
    n: "02",
    title: "Sequence",
    body: "Of 32 possible workouts, the six that will move this team fastest, in the right order. Nothing generic.",
    when: "Leader debrief",
  },
  {
    n: "03",
    title: "Work",
    body: "Six practical workouts with the team, on its real constraints. Each one ends in commitments and a 30/60/90-day plan.",
    when: "Over about six months",
  },
  {
    n: "04",
    title: "Measure",
    body: "The team is profiled again. You see what changed, habit by habit, against where you started.",
    when: "Reprofile",
  },
];

const proof = [
  { figure: "100,000+", label: "team profiler responses" },
  { figure: "250+", label: "client organisations" },
  { figure: "20+", label: "countries" },
  { figure: "10–30%", label: "trackable improvement in team performance" },
];

const offers = [
  {
    tag: "One team",
    name: "Team programme",
    body: "Diagnostic, debrief, six workouts and a reprofile for one team. Usually the leadership team.",
    featured: false,
  },
  {
    tag: "Teams",
    name: "Leadership and the next layer",
    body: "The leadership team plus the teams that report into it, so clarity at the top reaches delivery.",
    featured: true,
  },
  {
    tag: "Enterprise",
    name: "Managed service",
    body: "Five or more teams, internal benchmarking across them, and a quarterly rhythm of profile, workouts and review. Run for you by Galoras.",
    featured: false,
  },
];

const TEAM_OPTIONS = ["One team", "2–4 teams", "5 or more"];

export default function Enterprise() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", teams: "One team", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Same channel as the contact page: emails conor@galoras.com, stores nothing.
    try {
      const { error } = await supabase.functions.invoke("send-admin-alert", {
        body: {
          alertType: "customer_request",
          name: form.name,
          email: form.email,
          coachName: "Galoras Enterprise page",
          product: `Enterprise enquiry: ${form.teams}`,
          goal: form.message,
          context: form.company ? `Company: ${form.company}\nTeams in scope: ${form.teams}` : `Teams in scope: ${form.teams}`,
          urgency: "medium",
        },
      });
      if (error) throw error;
      toast({
        title: "Thanks, that's with us",
        description: "We'll come back within two working days to set up a 30-minute conversation.",
      });
      setForm({ name: "", email: "", company: "", teams: "One team", message: "" });
    } catch (err) {
      console.error("Enterprise enquiry failed:", err);
      toast({
        title: "That didn't send",
        description: "Something on our side failed. Please email conor@galoras.com and it will reach the right person.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <SEO
        title="Galoras Enterprise: strategy alignment and team performance"
        description="Galoras Enterprise, powered by Meta Team. We show your leadership team what's in the way of execution, remove it over six months, and measure the change. First engagements from January 2027."
        canonical="/enterprise"
      />

      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-zinc-950">
        <div className="container-wide relative z-10 grid lg:grid-cols-[1.4fr_1fr] gap-12 items-center">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
              Galoras Enterprise · Strategy alignment &amp; team performance
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black tracking-tight text-white mb-6 leading-[1.05]">
              Your team can see the strategy. It can’t execute it yet.
            </h1>
            <p className="text-zinc-300 text-lg md:text-xl max-w-2xl mb-8">
              In one week we show your leadership team what’s in the way. Over six months we remove it, and we measure the change.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#book">
                <Button size="lg" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold">
                  Book a conversation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="#how">
                <Button size="lg" variant="outline" className="border-zinc-700 text-white hover:bg-zinc-900">
                  How it works
                </Button>
              </a>
            </div>
            <p className="mt-8 text-sm text-zinc-400">
              First engagements start in <span className="text-white font-semibold">January 2027</span>. Powered by{" "}
              <span className="text-white font-semibold">Meta Team</span>, the team performance system used in 20+ countries.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              What we measure: 8 habits of high-performing teams
            </p>
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="space-y-2.5">
                <p className="font-display font-bold text-white">Inner game</p>
                <p className="text-xs text-zinc-400 -mt-1">How the team works together</p>
                {innerGame.map((h) => (
                  <div key={h} className="rounded-md border border-zinc-700 px-3.5 py-2.5 text-zinc-100">{h}</div>
                ))}
              </div>
              <div className="space-y-2.5">
                <p className="font-display font-bold text-white">Outer game</p>
                <p className="text-xs text-zinc-400 -mt-1">The impact it has on everyone else</p>
                {outerGame.map((h) => (
                  <div key={h} className="rounded-md border border-primary/70 px-3.5 py-2.5 text-zinc-100">{h}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="section-padding bg-zinc-100 text-zinc-900">
        <div className="container-wide">
          <h2 className="text-3xl md:text-4xl font-display font-black max-w-3xl mb-4">
            Most teams don’t have a strategy problem. They have an execution problem.
          </h2>
          <p className="text-zinc-600 max-w-2xl mb-10">The team can’t see what’s causing it. They feel the symptoms.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {symptoms.map((s) => (
              <div key={s.title} className="rounded-xl bg-white p-7">
                <h3 className="font-display font-bold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="section-padding bg-zinc-950 scroll-mt-24">
        <div className="container-wide">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">How it works</p>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white mt-3 mb-12">
            Diagnose. Sequence. Work. Measure.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="border-t-2 border-primary pt-6">
                <p className="font-display font-black text-sm text-primary">{s.n}</p>
                <h3 className="font-display font-bold text-xl text-white mt-2 mb-3">{s.title}</h3>
                <p className="text-sm text-zinc-300">{s.body}</p>
                <p className="mt-3 text-xs text-zinc-500">{s.when}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900 p-8 flex flex-wrap gap-6 items-center justify-between">
            <div className="max-w-2xl">
              <h3 className="font-display font-bold text-lg text-white">Between workouts, your leaders keep moving</h3>
              <p className="mt-2 text-sm text-zinc-300">
                Team leaders can work with a Galoras coach, matched to them. Sessions happen on Galoras, and each one turns into actions that are followed up before the next workout.
              </p>
            </div>
            <Link to="/coaching" className="text-primary font-semibold hover:underline underline-offset-4">
              About Galoras Coaching →
            </Link>
          </div>
        </div>
      </section>

      {/* Proof — Meta Team's figures */}
      <section className="py-16 bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {proof.map((p) => (
              <div key={p.label}>
                <p className="font-display font-black text-4xl text-white">{p.figure}</p>
                <p className="text-sm text-zinc-300">{p.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-zinc-500">Source: Meta Team data.</p>
        </div>
      </section>

      {/* Engagements */}
      <section className="section-padding bg-zinc-950">
        <div className="container-wide">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">Engagements</p>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white mt-3 mb-10 max-w-3xl">
            Start with one team. Grow it into how you run the business.
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {offers.map((o) => (
              <div
                key={o.name}
                className={`rounded-xl bg-zinc-900 p-8 border ${o.featured ? "border-primary" : "border-zinc-800"}`}
              >
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{o.tag}</p>
                <h3 className="font-display font-bold text-2xl text-white mt-3">{o.name}</h3>
                <p className="mt-3 text-sm text-zinc-300">{o.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-zinc-400">
            Every engagement is led by a practitioner accredited in the Meta Team method, on its ICF-accredited pathway. Galoras Master coaches can qualify to deliver.
          </p>
        </div>
      </section>

      {/* Leadership Labs add-on */}
      <section className="section-padding bg-zinc-100 text-zinc-900">
        <div className="container-wide flex flex-wrap gap-10 items-center justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">Add a Leadership Labs guest</p>
            <h2 className="text-2xl md:text-3xl font-display font-black mt-3 mb-3">
              Bring someone who has performed under real pressure
            </h2>
            <p className="text-zinc-600">
              Add a fireside conversation with an athlete or operator from the Leadership Labs series to your offsite or workout day. It’s part of the engagement, so there’s no separate vendor set-up.
            </p>
          </div>
          <Link to="/labs">
            <Button size="lg" variant="outline" className="border-zinc-900 text-zinc-900 hover:bg-zinc-200">
              See Leadership Labs
            </Button>
          </Link>
        </div>
      </section>

      {/* Book */}
      <section id="book" className="section-padding bg-primary text-zinc-950 scroll-mt-24">
        <div className="container-wide grid lg:grid-cols-[1fr_1.4fr] gap-12 items-start">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-black mb-3">Start with one team.</h2>
            <p className="text-lg">
              First engagements start in January 2027. Tell us about the team now, and we’ll come back within two working days to set up a 30-minute conversation.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ent-name" className="text-zinc-950 font-semibold">Name *</Label>
              <Input id="ent-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white text-zinc-950 border-0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ent-email" className="text-zinc-950 font-semibold">Work email *</Label>
              <Input id="ent-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white text-zinc-950 border-0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ent-company" className="text-zinc-950 font-semibold">Company</Label>
              <Input id="ent-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="bg-white text-zinc-950 border-0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ent-teams" className="text-zinc-950 font-semibold">Teams in scope</Label>
              <select
                id="ent-teams"
                value={form.teams}
                onChange={(e) => setForm({ ...form, teams: e.target.value })}
                className="flex h-10 w-full rounded-md bg-white px-3 text-sm text-zinc-950"
              >
                {TEAM_OPTIONS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ent-message" className="text-zinc-950 font-semibold">What’s getting in the way? *</Label>
              <Textarea id="ent-message" required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="bg-white text-zinc-950 border-0" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="lg" disabled={isSubmitting} className="bg-zinc-950 text-white hover:bg-zinc-800 font-bold">
                {isSubmitting ? "Sending…" : "Send"}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="py-8 bg-zinc-950">
        <div className="container-wide text-xs text-zinc-500">
          Galoras Enterprise is powered by Meta Team. Meta Team is a trade mark of Meta Team Limited.
        </div>
      </section>
    </Layout>
  );
}
