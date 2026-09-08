import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ArrowRight, UserCircle2, BarChart3, Sparkles, Target,
  Loader2, RotateCcw,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Answer → weighted tag keys.
//
// Every key below is a real tag_key from the `tags` table. Weights say how
// strongly an answer implies that tag: 3 = the heart of the answer, 1 = a
// supporting signal. Scores are summed per coach and shown as a percentage of
// the highest-scoring coach, so the ranking is relative and always readable.
// ─────────────────────────────────────────────────────────────────────────────

type Weights = Record<string, number>;

const SITUATION_TAGS: Record<string, Weights> = {
  scaling: {
    business_strategy: 3,
    founders_entrepreneurs: 2,
    startups_venture: 1,
    strategic_analytical: 1,
  },
  transition: {
    career_transition: 3,
    outcome_transition: 2,
    executive_presence: 1,
  },
  performance: {
    mindset_performance: 3,
    outcome_performance: 2,
    direct_performance: 1,
    cred_high_performance: 1,
  },
  leadership: {
    leadership_development: 3,
    outcome_leadership: 2,
    executive_presence: 1,
  },
};

const STAGE_TAGS: Record<string, Weights> = {
  early:  { emerging_leaders: 2, founders_entrepreneurs: 1, small_business: 1 },
  growth: { senior_leaders: 2, founders_entrepreneurs: 1, teams_groups: 1 },
  mature: { c_suite: 2, senior_leaders: 1, enterprises: 1, cred_exec: 1 },
};

const URGENCY_TAGS: Record<string, Weights> = {
  high:   { avail_open: 3 },
  medium: { avail_open: 1 },
  low:    {},
};

const OUTCOME_TAGS: Record<string, Weights> = {
  clarity: {
    outcome_clarity: 3,
    mindset_performance: 1,
    wellbeing_balance: 1,
  },
  growth: {
    business_strategy: 3,
    outcome_performance: 1,
    leadership_development: 1,
  },
  execution: {
    outcome_performance: 3,
    direct_performance: 1,
    productivity_time: 1,
  },
  transition: {
    career_transition: 3,
    outcome_transition: 1,
    communication_influence: 1,
  },
};

const TIER_RANK: Record<string, number> = { master: 3, elite: 2, pro: 1 };

const matchingFactors = [
  {
    icon: UserCircle2,
    title: "Your Situation, Not a Category",
    description:
      "You tell us what you're navigating, the stage you're operating at, and the outcome you're after. Every answer maps to how coaches on Galoras are actually described in our database.",
  },
  {
    icon: BarChart3,
    title: "Scored Against Real Attributes",
    description:
      "Each coach carries tags across specialty, audience, style, credentials, industry and availability. We score every published coach against your answers and rank them. Nothing is hand-picked or promoted.",
  },
  {
    icon: Sparkles,
    title: "Shown, Not Hidden",
    description:
      "We tell you exactly which of your answers each coach matched on. If a match looks wrong to you, you can see why it happened rather than trusting a number.",
  },
  {
    icon: Target,
    title: "Contextual Fit, Not Compatibility",
    description:
      "We prioritise coaches who have operated in situations like yours, so you get someone who understands the real constraints rather than the theory.",
  },
];

type TagRow = { tag_key: string; tag_label: string; tag_family: string };

type MatchCoach = {
  id: string;
  slug: string | null;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  cutout_url: string | null;
  tier: string | null;
  primary_pillar: string | null;
  specialties: string[] | null;
};

export default function CoachMatching() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    situation: "",
    stage: "",
    urgency: "",
    outcome: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Data ───────────────────────────────────────────────────────────────────

  const { data: coaches, isLoading: coachesLoading } = useQuery({
    queryKey: ["matching-coaches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coaches")
        .select("id, slug, display_name, headline, bio, avatar_url, cutout_url, tier, primary_pillar, specialties")
        .eq("lifecycle_status", "published");
      if (error) throw error;
      return (data || []) as MatchCoach[];
    },
  });

  const { data: tagMap, isLoading: tagsLoading } = useQuery({
    queryKey: ["matching-coach-tags"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("coach_tag_map")
        .select("coach_id, tags(tag_key, tag_label, tag_family)");
      if (error) throw error;
      return (data || []) as { coach_id: string; tags: TagRow | null }[];
    },
  });

  const tagsByCoach = useMemo(() => {
    const map: Record<string, TagRow[]> = {};
    (tagMap || []).forEach((row) => {
      if (!row.tags) return;
      (map[row.coach_id] ||= []).push(row.tags);
    });
    return map;
  }, [tagMap]);

  // ── Scoring ────────────────────────────────────────────────────────────────

  const desiredWeights = useMemo<Weights>(() => {
    const merged: Weights = {};
    const sources = [
      SITUATION_TAGS[form.situation],
      STAGE_TAGS[form.stage],
      URGENCY_TAGS[form.urgency],
      OUTCOME_TAGS[form.outcome],
    ];
    sources.forEach((src) => {
      if (!src) return;
      Object.entries(src).forEach(([key, weight]) => {
        merged[key] = (merged[key] ?? 0) + weight;
      });
    });
    return merged;
  }, [form]);

  const results = useMemo(() => {
    if (!coaches || coaches.length === 0) return [];

    const scored = coaches.map((coach) => {
      const coachTags = tagsByCoach[coach.id] || [];
      const coachKeys = new Set(coachTags.map((t) => t.tag_key));

      // Fallback for coaches carrying free-text specialties but no tags yet,
      // so an untagged coach is never silently invisible.
      const legacy = new Set(
        (coach.specialties || []).map((s) => s.toLowerCase().trim().replace(/[^a-z]+/g, "_"))
      );

      let score = 0;
      const reasons: string[] = [];

      Object.entries(desiredWeights).forEach(([key, weight]) => {
        if (coachKeys.has(key)) {
          score += weight;
          const label = coachTags.find((t) => t.tag_key === key)?.tag_label;
          if (label && !reasons.includes(label)) reasons.push(label);
        } else if (legacy.has(key)) {
          score += weight * 0.5;
        }
      });

      return { coach, score, reasons, tagCount: coachTags.length };
    });

    const best = Math.max(...scored.map((s) => s.score), 0);

    return scored
      .map((s) => ({
        ...s,
        percent: best > 0 ? Math.round((s.score / best) * 100) : 0,
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const tierDiff = (TIER_RANK[b.coach.tier ?? ""] ?? 0) - (TIER_RANK[a.coach.tier ?? ""] ?? 0);
        if (tierDiff !== 0) return tierDiff;
        return (a.coach.display_name || "").localeCompare(b.coach.display_name || "");
      });
  }, [coaches, tagsByCoach, desiredWeights]);

  const anyMatched = results.some((r) => r.score > 0);
  const loading = coachesLoading || tagsLoading;

  const restart = () => {
    setForm({ situation: "", stage: "", urgency: "", outcome: "" });
    setStep(1);
    setSubmitted(false);
  };

  const coachPath = (c: MatchCoach) => (c.slug ? `/coach/${c.slug}` : `/coaching/${c.id}`);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout>

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_55%)]" />
        <div className="container-wide relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">
              Galoras Platform — Coach Matching
            </p>
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight text-white uppercase mb-5">
              How Matching <span className="text-primary">Works</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Galoras doesn't surface coaches based on popularity or profile polish. We score every coach against your goals, context and operating environment to find someone who has genuinely been where you are.
            </p>
          </div>
        </div>
      </section>

      {/* ── How matching works ── */}
      <section className="py-16 bg-zinc-900 border-y border-zinc-800">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
              Finding Your Best <span className="text-gradient">Match</span>
            </h2>
            <p className="text-zinc-400 text-base">
              Every match starts with you. Your answers are scored against how each coach is actually described, and we show you which attributes matched.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {matchingFactors.map((factor, i) => (
              <div
                key={i}
                className="flex gap-4 p-6 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <factor.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-1">{factor.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Form / Results ── */}
      <section className="py-16 bg-zinc-950">
        <div className="container-wide">

          {!submitted ? (
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-display font-bold text-white mb-2">
                  Map Your <span className="text-gradient">Context</span>
                </h2>
                <p className="text-zinc-400 text-sm">
                  Four quick questions. We'll rank every coach on the platform against your answers.
                </p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-between mb-8">
                {[1, 2, 3, 4].map((s) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        s < step
                          ? "bg-primary text-zinc-950"
                          : s === step
                          ? "bg-primary text-zinc-950 ring-2 ring-primary/30"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {s}
                    </div>
                    {s < 4 && (
                      <div className={`flex-1 h-px transition-colors ${s < step ? "bg-primary/50" : "bg-zinc-800"}`} />
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">

                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">What are you dealing with?</h3>
                      <p className="text-sm text-zinc-500">Select the situation that best describes where you are right now.</p>
                    </div>
                    <Select value={form.situation} onValueChange={(v) => update("situation", v)}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-11">
                        <SelectValue placeholder="Select your situation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scaling">Scaling a business</SelectItem>
                        <SelectItem value="transition">Career transition</SelectItem>
                        <SelectItem value="performance">Performance pressure</SelectItem>
                        <SelectItem value="leadership">Leadership challenge</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => setStep(2)} className="w-full bg-primary text-zinc-950 font-bold h-11" disabled={!form.situation}>
                      Next <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">What stage are you in?</h3>
                      <p className="text-sm text-zinc-500">This helps us match coaches who've operated at your level.</p>
                    </div>
                    <Select value={form.stage} onValueChange={(v) => update("stage", v)}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-11">
                        <SelectValue placeholder="Select your stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="early">Early stage</SelectItem>
                        <SelectItem value="growth">Growth stage</SelectItem>
                        <SelectItem value="mature">Mature organisation</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-zinc-700 text-zinc-300 h-11">Back</Button>
                      <Button onClick={() => setStep(3)} className="flex-1 bg-primary text-zinc-950 font-bold h-11" disabled={!form.stage}>
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">How urgent is this?</h3>
                      <p className="text-sm text-zinc-500">We'll prioritise coaches with immediate availability if needed.</p>
                    </div>
                    <Select value={form.urgency} onValueChange={(v) => update("urgency", v)}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-11">
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Exploring options</SelectItem>
                        <SelectItem value="medium">Ready to start soon</SelectItem>
                        <SelectItem value="high">Need support now</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-zinc-700 text-zinc-300 h-11">Back</Button>
                      <Button onClick={() => setStep(4)} className="flex-1 bg-primary text-zinc-950 font-bold h-11" disabled={!form.urgency}>
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">What outcome do you want?</h3>
                      <p className="text-sm text-zinc-500">Your goal shapes which coaches are surfaced for you.</p>
                    </div>
                    <Select value={form.outcome} onValueChange={(v) => update("outcome", v)}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-11">
                        <SelectValue placeholder="Select your desired outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clarity">More clarity and focus</SelectItem>
                        <SelectItem value="growth">Accelerated growth</SelectItem>
                        <SelectItem value="execution">Better execution</SelectItem>
                        <SelectItem value="transition">Successful transition</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(3)} className="flex-1 border-zinc-700 text-zinc-300 h-11">Back</Button>
                      <Button
                        onClick={() => setSubmitted(true)}
                        className="flex-1 bg-primary text-zinc-950 font-bold h-11"
                        disabled={!form.outcome}
                      >
                        See My Matches
                        <Sparkles className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            /* ── RESULTS ── */
            <div className="max-w-3xl mx-auto">

              <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold text-white mb-2">
                  Your <span className="text-gradient">Matches</span>
                </h2>
                {loading ? (
                  <p className="text-zinc-400 text-sm">Scoring coaches against your answers…</p>
                ) : anyMatched ? (
                  <p className="text-zinc-400 text-sm">
                    {results.filter((r) => r.score > 0).length} of {results.length} coaches match your context, ranked strongest first.
                  </p>
                ) : (
                  <p className="text-zinc-400 text-sm">
                    No coach is a close fit for that exact combination yet. Here is everyone currently on the platform.
                  </p>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-zinc-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading coaches…</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((r, i) => (
                    <div
                      key={r.coach.id}
                      className={`rounded-2xl border p-5 transition-colors ${
                        i === 0 && r.score > 0
                          ? "border-primary/50 bg-primary/5"
                          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Avatar */}
                        <div className="shrink-0">
                          {r.coach.cutout_url || r.coach.avatar_url ? (
                            <img
                              src={(r.coach.cutout_url || r.coach.avatar_url) as string}
                              alt={r.coach.display_name ?? ""}
                              className="w-16 h-16 rounded-xl object-cover border border-zinc-700"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                              <UserCircle2 className="h-7 w-7 text-zinc-600" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {i === 0 && r.score > 0 && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-zinc-950 px-2 py-0.5 rounded-full">
                                    Best match
                                  </span>
                                )}
                                <h3 className="text-base font-bold text-white truncate">
                                  {r.coach.display_name}
                                </h3>
                                {r.coach.tier && (
                                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">
                                    {r.coach.tier}
                                  </span>
                                )}
                              </div>
                              {r.coach.headline && (
                                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{r.coach.headline}</p>
                              )}
                            </div>

                            {r.score > 0 && (
                              <div className="text-right shrink-0">
                                <p className="text-xl font-black text-primary leading-none">{r.percent}%</p>
                                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Match</p>
                              </div>
                            )}
                          </div>

                          {/* Why this coach matched */}
                          {r.reasons.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">
                                Matched on
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {r.reasons.slice(0, 6).map((reason) => (
                                  <span
                                    key={reason}
                                    className="text-[11px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full"
                                  >
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.score === 0 && r.tagCount === 0 && (
                            <p className="mt-3 text-[11px] text-amber-500/80">
                              This coach hasn't been tagged yet, so they can't be scored.
                            </p>
                          )}

                          <div className="mt-4 flex gap-2">
                            <Link to={coachPath(r.coach)}>
                              <Button size="sm" className="bg-primary text-zinc-950 hover:bg-primary/90 font-bold h-8">
                                View &amp; Book
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer actions */}
              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={restart}
                  className="border-zinc-700 text-zinc-300 h-11"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Change my answers
                </Button>
                <Button
                  onClick={() => navigate("/coaching")}
                  className="bg-zinc-800 text-white hover:bg-zinc-700 h-11"
                >
                  Browse all coaches
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <p className="mt-8 text-center text-xs text-zinc-600 max-w-md mx-auto">
                Matches are scored against how each coach is described on the platform. Create a free profile and your saved goals will sharpen future matches.
              </p>

              <div className="mt-4 text-center">
                <Link to="/signup?redirect=/coaching/matching">
                  <Button size="sm" variant="ghost" className="text-primary hover:text-primary/80">
                    Create your free profile
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </section>

    </Layout>
  );
}
