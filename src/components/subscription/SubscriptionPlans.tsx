import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Minus } from "lucide-react";
import { CoachTierPayment } from "@/components/coaching/CoachTierPayment";
import { supabase } from "@/integrations/supabase/client";

type Plan = "pro" | "elite" | "master";
type PlanDef = { key: Plan; name: string; tagline: string; price: string; period: string; badge?: string; comingSoon?: boolean; description: string; features: string[]; highlighted?: boolean };

const PLANS: PlanDef[] = [
  {
    key: "pro" as Plan,
    name: "Pro",
    tagline: "Get seen. Get started.",
    price: "$49",
    period: "/month",
    description: "Entry-level visibility for coaches ready to build their practice on the Galoras platform.",
    features: [
      "Verified profile listing",
      "Session booking via platform",
      "Stripe payment integration",
      "In-platform Zoom meetings",
      "AI session summaries",
      "Shared action boards",
      "Community access",
    ],
  },
  {
    key: "elite" as Plan,
    name: "Elite",
    tagline: "Train like a pro. Show up like one.",
    price: "$99",
    period: "/month",
    badge: "Coming Soon",
    comingSoon: true,
    description: "For active coaches seeking structure, credibility, and a validated framework to deliver real results.",
    features: [
      "Everything in Pro",
      "Enhanced profile & priority exposure",
      "Exclusive content & resources (coming soon)",
      "Webinar & teaching roles",
      "Priority community access",
    ],
    highlighted: false,
  },
  {
    key: "master" as Plan,
    name: "Master",
    tagline: "We don't list you. We back you.",
    price: "$197",
    period: "/month",
    badge: "Coming Soon",
    comingSoon: true,
    description: "For established coaches and ex-executives ready for enterprise delivery and featured placement.",
    features: [
      "Everything in Elite",
      "Featured placement & promotion",
      "Meta Team accreditation pathway (ICF-accredited)",
      "Eligible to deliver Galoras Enterprise engagements",
      "Direct leadership access",
      "Published thought leadership",
    ],
  },
];

const COMPARISON_ROWS = [
  { label: "Profile & Visibility",    pro: "Verified listing",          elite: "Enhanced + priority",         master: "Featured & promoted" },
  { label: "Booking & Payments",      pro: "Full Stripe flow",           elite: "Full Stripe flow",            master: "Full Stripe flow" },
  { label: "Platform Tools",          pro: "Video sessions + AI + action boards",  elite: "Video sessions + AI + action boards",   master: "Video sessions + AI + action boards" },
  { label: "Community",               pro: "Standard access",            elite: "Priority + exclusive",        master: "Direct leadership access" },
  { label: "Training",                pro: null,                         elite: null,                          master: "Meta Team accreditation (ICF-accredited)" },
  { label: "Teaching Roles",          pro: null,                         elite: "Webinars & workshops",        master: "Thought leadership & publishing" },
  { label: "Enterprise Delivery",     pro: null,                         elite: null,                          master: "Galoras Enterprise engagements" },
];

export function SubscriptionPlans() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTier, setActiveTier] = useState<Plan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan>(
    (["pro", "elite", "master"].includes(searchParams.get("tier") ?? "") ? searchParams.get("tier") as Plan : "elite")
  );

  // If returning from coach-signup with ?tier=, auto-open payment modal
  useEffect(() => {
    const tierParam = searchParams.get("tier") as Plan | null;
    if (!tierParam || !["pro", "elite", "master"].includes(tierParam)) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setActiveTier(tierParam);
    });
  }, [searchParams]);

  const handleJoin = async (tier: Plan) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate(`/coach-signup?tier=${tier}`);
      return;
    }
    setActiveTier(tier);
  };

  return (
    <>
      {activeTier && (
        <CoachTierPayment
          tier={activeTier}
          onClose={() => setActiveTier(null)}
        />
      )}

      <div className="space-y-10">
        {/* Tier cards */}
        <div className="grid gap-6 md:grid-cols-3 items-start">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.key && !plan.comingSoon;
            return (
            <div
              key={plan.key}
              onClick={() => !plan.comingSoon && setSelectedPlan(plan.key)}
              className={`relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 ${
                plan.comingSoon
                  ? "border-zinc-700 bg-zinc-900/50 opacity-70 cursor-not-allowed"
                  : isSelected
                  ? "border-primary shadow-lg shadow-primary/20 ring-1 ring-primary/40 cursor-pointer"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-500 cursor-pointer"
              }`}
            >
              {plan.badge && (
                <div className={`text-xs font-bold text-center py-1.5 tracking-wider uppercase ${
                  plan.comingSoon
                    ? "bg-zinc-700 text-zinc-400"
                    : "bg-primary text-primary-foreground"
                }`}>
                  {plan.badge}
                </div>
              )}

              <div className={`p-6 border-b border-zinc-700 ${isSelected ? "bg-primary/5" : ""}`}>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{plan.name}</p>
                <p className="text-sm text-zinc-400 italic mb-3">"{plan.tagline}"</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-zinc-500 text-sm mb-1.5">{plan.period}</span>
                </div>
                <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{plan.description}</p>
              </div>

              <div className="p-6 flex flex-col flex-1 gap-5">
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full font-semibold ${
                    plan.comingSoon
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-zinc-700 text-white hover:bg-zinc-600"
                  }`}
                  variant="default"
                  disabled={plan.comingSoon}
                  onClick={(e) => { e.stopPropagation(); if (!plan.comingSoon) handleJoin(plan.key); }}
                >
                  {plan.comingSoon ? "Coming Soon" : "Join Galoras →"}
                </Button>
              </div>
            </div>
            );
          })}
        </div>

        {/* Comparison table */}
        <div className="rounded-2xl border border-zinc-700 overflow-hidden">
          <div className="bg-zinc-800/60 px-6 py-4 border-b border-zinc-700">
            <h3 className="font-semibold text-sm text-white">What each tier unlocks</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left px-6 py-3 text-zinc-400 font-medium w-1/4">Feature</th>
                  <th className="px-4 py-3 text-center font-semibold text-white">Pro<span className="block text-xs text-zinc-500 font-normal">$49/mo</span></th>
                  <th className="px-4 py-3 text-center font-semibold text-primary">Elite<span className="block text-xs text-primary/70 font-normal">$99/mo</span></th>
                  <th className="px-4 py-3 text-center font-semibold text-white">Master<span className="block text-xs text-zinc-500 font-normal">$197/mo</span></th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.label} className={`border-b border-zinc-700 last:border-0 ${i % 2 === 0 ? "" : "bg-zinc-800/30"}`}>
                    <td className="px-6 py-3 text-zinc-400 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-center">
                      {row.pro ? <span className="text-zinc-200">{row.pro}</span> : <Minus className="h-4 w-4 text-zinc-600 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center bg-primary/5">
                      {row.elite ? <span className="text-zinc-200">{row.elite}</span> : <Minus className="h-4 w-4 text-zinc-600 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.master ? <span className="text-zinc-200">{row.master}</span> : <Minus className="h-4 w-4 text-zinc-600 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-zinc-800/20 px-6 py-3 text-xs text-zinc-500 border-t border-zinc-700">
            All plans include the Galoras platform, Zoom integration, AI session tools, and community access.
          </div>
        </div>
      </div>
    </>
  );
}
