import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2, XCircle, RefreshCw, Clock, User,
  Linkedin, Globe, Mail, Phone, Loader2, Sparkles, Zap,
  AlertTriangle, TrendingUp, Tags, Save,
} from "lucide-react";

type FitDimension = { score: number; note: string };
type FitDimensions = {
  overall_score?: number;
  dimensions?: {
    pillar_alignment?: FitDimension;
    professional_credibility?: FitDimension;
    sport_of_business_fit?: FitDimension;
    communication_quality?: FitDimension;
    market_positioning?: FitDimension;
    growth_potential?: FitDimension;
  };
  summary?: string;
  recommendation?: string;
};

type Application = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  bio: string | null;
  why_galoras: string | null;
  coaching_philosophy: string | null;
  coach_background: string | null;
  coaching_experience_years: number | null;
  coaching_experience_level: string | null;
  avatar_url: string | null;
  status: string | null;
  review_status: string;
  reviewer_notes: string | null;
  decision_reason: string | null;
  fit_score: number;
  fit_score_dimensions: FitDimensions | null;
  created_at: string | null;
  user_id?: string | null;
  specialty_tags: string[] | null;
  audience_tags: string[] | null;
  style_tags: string[] | null;
  industry_tags: string[] | null;
  availability_tag: string | null;
  enterprise_tags: string[] | null;
  credential_tags: string[] | null;
  outcome_tags: string[] | null;
  format_tags: string[] | null;
};

type PortfolioCount = { tier: string; count: number };

type VocabTag = { id: string; tag_key: string; tag_label: string; tag_family: string };

// Tag families the approval flow can write, mapped to their column on
// coach_applications. approve-coach reads exactly these columns and turns them
// into coach_tag_map rows, so what is set here is what the coach is matched on.
const TAG_FAMILIES: { family: string; column: string; label: string; single?: boolean }[] = [
  { family: "specialty",    column: "specialty_tags",   label: "Specialties" },
  { family: "outcome",      column: "outcome_tags",     label: "Outcomes they deliver" },
  { family: "audience",     column: "audience_tags",    label: "Audience" },
  { family: "style",        column: "style_tags",       label: "Coaching style" },
  { family: "format",       column: "format_tags",      label: "Format" },
  { family: "industry",     column: "industry_tags",    label: "Industry" },
  { family: "credential",   column: "credential_tags",  label: "Credentials" },
  { family: "enterprise",   column: "enterprise_tags",  label: "Enterprise offering" },
  { family: "availability", column: "availability_tag", label: "Availability", single: true },
];

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending:            { label: "Pending",        color: "bg-zinc-700/60 text-zinc-300 border-zinc-600" },
  under_review:       { label: "AI Analysing",   color: "bg-sky-900/60 text-sky-300 border-sky-700" },
  approved:           { label: "Approved",       color: "bg-emerald-900/60 text-emerald-300 border-emerald-700" },
  revision_requested: { label: "Needs Revision", color: "bg-amber-900/60 text-amber-300 border-amber-700" },
  rejected:           { label: "Rejected",       color: "bg-red-900/60 text-red-400 border-red-800" },
  auto_rejected:      { label: "Auto-Rejected",  color: "bg-red-950/80 text-red-400 border-red-900" },
};

function Badge({ status }: { status: string }) {
  const b = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${b.color}`}>
      {b.label}
    </span>
  );
}

const RADAR_DIMS = [
  { key: "pillar_alignment",        label: "Pillar Align" },
  { key: "professional_credibility",label: "Credibility" },
  { key: "sport_of_business_fit",   label: "Sport of Biz" },
  { key: "communication_quality",   label: "Communication" },
  { key: "market_positioning",      label: "Positioning" },
  { key: "growth_potential",        label: "Growth" },
] as const;

export default function Applicants() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selected, setSelected] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [fitScore, setFitScore] = useState(0);
  const [portfolio, setPortfolio] = useState<PortfolioCount[]>([]);

  // ── Tag review ─────────────────────────────────────────────────────────────
  const [vocab, setVocab] = useState<VocabTag[]>([]);
  const [tagSel, setTagSel] = useState<Record<string, string[]>>({});
  const [tagsDirty, setTagsDirty] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

  const loadTagsFor = (app: Application) => {
    const next: Record<string, string[]> = {};
    TAG_FAMILIES.forEach(({ column, single }) => {
      const raw = (app as any)[column];
      next[column] = single ? (raw ? [raw as string] : []) : ((raw as string[]) ?? []);
    });
    setTagSel(next);
    setTagsDirty(false);
  };

  const toggleTag = (column: string, tagKey: string, single?: boolean) => {
    setTagSel((prev) => {
      const current = prev[column] ?? [];
      const next = single
        ? (current[0] === tagKey ? [] : [tagKey])
        : current.includes(tagKey)
          ? current.filter((k) => k !== tagKey)
          : [...current, tagKey];
      return { ...prev, [column]: next };
    });
    setTagsDirty(true);
  };

  const saveTags = async () => {
    if (!selected) return;
    setSavingTags(true);
    const payload: Record<string, any> = {};
    TAG_FAMILIES.forEach(({ column, single }) => {
      const vals = tagSel[column] ?? [];
      payload[column] = single ? (vals[0] ?? null) : vals;
    });
    const { error } = await supabase
      .from("coach_applications")
      .update(payload as any)
      .eq("id", selected.id);
    setSavingTags(false);
    if (error) {
      toast({ title: "Could not save tags", description: error.message, variant: "destructive" });
      return;
    }
    setTagsDirty(false);
    toast({ title: "Tags saved", description: "These are what the coach will be matched on." });
    fetchAll();
  };

  const totalSelected = Object.values(tagSel).reduce((n, arr) => n + arr.length, 0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: apps }, { data: coaches }, { data: tagRows }] = await Promise.all([
      supabase.from("coach_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("coaches").select("tier").eq("lifecycle_status", "published"),
      supabase.from("tags").select("id, tag_key, tag_label, tag_family")
        .eq("is_active", true).order("tag_family").order("display_order"),
    ]);

    setVocab((tagRows as VocabTag[]) ?? []);

    const rows = (apps as unknown as Application[]) ?? [];
    setApplications(rows);
    if (rows.length > 0 && !selected) {
      setSelected(rows[0]);
      setFitScore(rows[0].fit_score ?? 0);
      setDecisionNotes(rows[0].reviewer_notes ?? "");
      loadTagsFor(rows[0]);
    }

    const counts: Record<string, number> = {};
    (coaches ?? []).forEach((c: any) => {
      const t = c.tier ?? "unset";
      counts[t] = (counts[t] ?? 0) + 1;
    });
    setPortfolio(Object.entries(counts).map(([tier, count]) => ({ tier, count })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const selectApp = (app: Application) => {
    setSelected(app);
    setFitScore(app.fit_score ?? 0);
    setDecisionNotes(app.reviewer_notes ?? "");
    loadTagsFor(app);
  };

  const saveDraft = async () => {
    if (!selected) return;
    setSaving(true);
    const now = new Date().toISOString();
    await supabase.from("coach_applications").update({
      fit_score: fitScore, reviewer_notes: decisionNotes,
      review_status: "under_review", status: "under_review",
    }).eq("id", selected.id);

    // Stamp reviewed_at + lifecycle on coaches record if it exists
    const { data: reg } = await supabase.from("coach_registrations").select("user_id").eq("email", selected.email).maybeSingle();
    if (reg?.user_id) {
      await supabase.from("coaches")
        .update({ reviewed_at: now, lifecycle_status: "under_review" })
        .eq("user_id", reg.user_id);
    }

    toast({ title: "Saved", description: "Notes and score updated." });
    setSaving(false);
    fetchAll();
  };

  const decide = async (action: "approved" | "revision_requested" | "rejected") => {
    if (!selected) return;
    if (action !== "approved" && !decisionNotes.trim()) {
      toast({ title: "Notes required", description: "Please provide a reason before rejecting or requesting revision.", variant: "destructive" });
      return;
    }
    if (action === "approved" && tagsDirty) {
      toast({
        title: "Unsaved tags",
        description: "Save the match tags first, or the coach will be approved with the old ones.",
        variant: "destructive",
      });
      return;
    }
    if (action === "approved" && totalSelected === 0) {
      toast({
        title: "No match tags set",
        description: "This coach would be invisible to search and matching. Set their tags before approving.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const now = new Date().toISOString();

    if (action === "approved") {
      // A registration only exists for a coach who chose a paid tier and saved
      // a card. An INVITED coach never sees that step, so this must not block
      // approval: approve-coach falls back to the application for everything
      // it needs, and accepts a null coachUserId.
      const { data: reg } = await supabase
        .from("coach_registrations").select("user_id")
        .eq("email", selected.email).limit(1).maybeSingle();

      const { error: fnError } = await supabase.functions.invoke("approve-coach", {
        body: {
          applicationId: selected.id,
          coachUserId: reg?.user_id ?? selected.user_id ?? null,
          decisionReason: decisionNotes,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (fnError) {
        toast({ title: "Approval failed", description: fnError.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      // Stamp reviewed_at + published_at on coaches record
      // Stamp by email when there is no user id - an invited coach has none,
      // and .eq("user_id", null) matches nothing rather than meaning IS NULL.
      const stampedBy = reg?.user_id ?? selected.user_id ?? null;
      if (stampedBy) {
        await supabase.from("coaches")
          .update({ reviewed_at: now, published_at: now, reviewer_notes: decisionNotes || null })
          .eq("user_id", stampedBy);
      } else if (selected.email) {
        await supabase.from("coaches")
          .update({ reviewed_at: now, published_at: now, reviewer_notes: decisionNotes || null })
          .eq("email", selected.email);
      }
      toast({ title: "Coach approved!", description: "Subscription activated and coach published." });
    } else {
      await supabase.from("coach_applications").update({
        review_status: action, status: action,
        reviewer_notes: decisionNotes, decision_reason: decisionNotes, fit_score: fitScore,
      }).eq("id", selected.id);

      // Stamp reviewed_at + lifecycle on coaches record if it exists
      const lifecycleMap: Record<string, string> = {
        revision_requested: "revision_required",
        rejected: "rejected",
      };
      const { data: reg } = await supabase.from("coach_registrations").select("user_id").eq("email", selected.email).maybeSingle();
      if (reg?.user_id) {
        await supabase.from("coaches")
          .update({
            reviewed_at: now,
            lifecycle_status: lifecycleMap[action] ?? action,
            reviewer_notes: decisionNotes,
          })
          .eq("user_id", reg.user_id);
      }

      toast({ title: action === "rejected" ? "Application rejected" : "Revision requested", description: "Application status updated." });
    }
    setSaving(false);
    fetchAll();
  };

  // Radar data
  const radarData = RADAR_DIMS.map(({ key, label }) => ({
    subject: label,
    value: selected?.fit_score_dimensions?.dimensions?.[key]?.score ?? Math.round((selected?.fit_score ?? 0) * 0.17),
    fullMark: 100,
  }));

  // Portfolio saturation signals
  const totalCoaches = portfolio.reduce((s, p) => s + p.count, 0);
  const saturationAlerts = portfolio
    .filter(p => totalCoaches > 0 && p.count / totalCoaches > 0.35)
    .map(p => ({ type: "warning" as const, label: `High Saturation in ${p.tier.charAt(0).toUpperCase() + p.tier.slice(1)}` }));
  const gapAlerts = ["pro", "elite", "master"]
    .filter(t => !portfolio.find(p => p.tier === t) || (portfolio.find(p => p.tier === t)?.count ?? 0) < 2)
    .map(t => ({ type: "gap" as const, label: `Priority Gap in ${t.charAt(0).toUpperCase() + t.slice(1)}` }));

  // Comparative rank
  const rank = applications.length > 0
    ? Math.round(((applications.filter(a => (a.fit_score ?? 0) <= fitScore).length) / applications.length) * 100)
    : 0;

  return (
    <AdminLayout title="Coach Approval">
      {/* ── Page header ── */}
      <div className="px-6 pt-5 pb-3 border-b border-[#1e2d45]">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-amber-400 fill-amber-400" />
          <div>
            <h2 className="text-lg font-black text-white tracking-wide uppercase">
              Coach Approval Dashboard
            </h2>
            <p className="text-xs text-slate-400 italic">
              Intelligent Selection for Elite <em>Performance Network</em>
            </p>
          </div>
        </div>
      </div>

      <section className="p-5 bg-[#0a1628] min-h-full">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading applications…</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* ── TOP ROW: 3 columns ── */}
            <div className="grid grid-cols-[260px_1fr_220px] gap-4">

              {/* LEFT: Applicant list + snapshot */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Applications ({applications.length})
                </p>
                <div className="space-y-1.5">
                  {applications.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => selectApp(app)}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all ${
                        selected?.id === app.id
                          ? "border-amber-500/60 bg-amber-500/10"
                          : "border-[#1e3a5f] bg-[#0d1f35] hover:border-[#2a4a6f]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{app.full_name || "Unnamed"}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{app.email}</p>
                        </div>
                        {app.fit_score > 0 && (
                          <span className="text-sm font-black text-amber-400 shrink-0">{app.fit_score}</span>
                        )}
                      </div>
                      <div className="mt-1.5">
                        <Badge status={app.review_status ?? "pending"} />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Coach Snapshot card */}
                {selected && (
                  <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-4 mt-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Coach Snapshot
                    </p>

                    {/* Avatar */}
                    <div className="flex justify-center mb-3">
                      {selected.avatar_url ? (
                        <img src={selected.avatar_url} alt={selected.full_name ?? ""} className="w-20 h-20 rounded-xl object-cover border border-[#1e3a5f]" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-[#1a2f4a] border border-[#1e3a5f] flex items-center justify-center">
                          <User className="h-8 w-8 text-slate-600" />
                        </div>
                      )}
                    </div>

                    <p className="text-sm font-bold text-white text-center mb-3">{selected.full_name}</p>

                    {/* Credential list */}
                    <div className="space-y-1.5">
                      {[
                        { label: "Experience", value: selected.coaching_experience_years ? `${selected.coaching_experience_years}+ Years` : null },
                        { label: "Level", value: selected.coaching_experience_level },
                        { label: "Background", value: selected.coach_background },
                      ].filter(r => r.value).map(({ label, value }) => (
                        <div key={label} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span className="text-slate-400">{label}:</span>
                          <span className="text-slate-200 font-medium">{value}</span>
                        </div>
                      ))}
                      {selected.linkedin_url && (
                        <div className="flex items-center gap-2 text-xs">
                          <Linkedin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <a href={selected.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">LinkedIn Profile</a>
                        </div>
                      )}
                      {selected.website_url && (
                        <div className="flex items-center gap-2 text-xs">
                          <Globe className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          <a href={selected.website_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Website</a>
                        </div>
                      )}
                    </div>

                    {selected.bio && (
                      <div className="mt-3 pt-3 border-t border-[#1e3a5f]">
                        <p className="text-xs text-slate-500 line-clamp-4 leading-relaxed">{selected.bio}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CENTER: Radar + AI + score */}
              {selected ? (
                <div className="space-y-4">

                  {/* Fit Score card */}
                  <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-black text-white uppercase tracking-wide">
                        Ecosystem Fit Score:
                        <span className="text-amber-400 ml-2">{fitScore}</span>
                      </h3>
                      <div className="flex items-center gap-2">
                        {selected.fit_score_dimensions && (
                          <span className="flex items-center gap-1 text-xs text-amber-400">
                            <Sparkles className="h-3 w-3" /> AI Scored
                          </span>
                        )}
                        <input
                          type="number" min={0} max={100} value={fitScore}
                          onChange={(e) => setFitScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-14 text-center bg-[#1a2f4a] border border-[#2a4a6f] text-amber-400 font-black text-lg rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                        />
                      </div>
                    </div>

                    {/* Radar chart */}
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                          <PolarGrid stroke="#1e3a5f" />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
                          />
                          <Radar
                            name="Score"
                            dataKey="value"
                            stroke="#f59e0b"
                            fill="#f59e0b"
                            fillOpacity={0.25}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Dimension list */}
                    <div className="mt-3 space-y-1.5 border-t border-[#1e3a5f] pt-3">
                      {RADAR_DIMS.map(({ key, label }) => {
                        const dim = selected.fit_score_dimensions?.dimensions?.[key];
                        const score = dim?.score ?? Math.round(fitScore * 0.17);
                        return (
                          <div key={key} className="flex items-start gap-2 text-xs">
                            <span className="text-amber-400 shrink-0 mt-0.5">◆</span>
                            <span className="text-slate-300 font-semibold w-28 shrink-0">{label}</span>
                            <span className="text-amber-400 font-bold w-8 shrink-0">{score}</span>
                            {dim?.note && <span className="text-slate-500 line-clamp-1">{dim.note}</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* AI summary */}
                    {selected.fit_score_dimensions?.summary && (
                      <div className="mt-3 pt-3 border-t border-[#1e3a5f]">
                        <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider mb-1">AI Assessment</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{selected.fit_score_dimensions.summary}</p>
                      </div>
                    )}

                    {selected.review_status === "under_review" && !selected.fit_score_dimensions && (
                      <div className="flex items-center gap-2 text-slate-500 text-xs mt-3">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        AI analysis in progress…
                      </div>
                    )}
                  </div>

                  {/* Decision Panel — directly below fit score */}
                  <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-5">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest text-center mb-4">
                      Decision Panel
                    </h3>

                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                        Action Notes
                        <span className="text-slate-600 font-normal ml-1">(required for reject or revision)</span>
                      </label>
                      <textarea
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        rows={2}
                        placeholder="Internal notes about this application…"
                        className="w-full bg-[#1a2f4a] border border-[#2a4a6f] text-slate-200 text-sm rounded-xl px-3 py-2.5 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <button
                        onClick={() => decide("approved")}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 h-14 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="h-5 w-5" /> Approve</>}
                      </button>
                      <button
                        onClick={() => decide("revision_requested")}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 h-14 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-base uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className="h-5 w-5" /> Rewrite
                      </button>
                      <button
                        onClick={() => decide("rejected")}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 h-14 rounded-xl bg-red-700 hover:bg-red-600 text-white font-black text-base uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-5 w-5" /> Reject
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#1e3a5f] text-xs text-slate-500">
                      <span>● <span className="text-slate-400">Rank:</span> Top {rank}%</span>
                      <span>● <span className="text-slate-400">Status:</span> <span className="capitalize">{selected.review_status?.replace("_", " ") ?? "Pending"}</span></span>
                      <span>● <span className="text-slate-400">AI Rec:</span> <span className={
                        selected.fit_score_dimensions?.recommendation === "approve" ? "text-emerald-400 capitalize" :
                        selected.fit_score_dimensions?.recommendation === "reject" ? "text-red-400 capitalize" :
                        "text-amber-400 capitalize"
                      }>{selected.fit_score_dimensions?.recommendation ?? "—"}</span></span>
                      <button onClick={saveDraft} disabled={saving} className="hover:text-slate-300 transition-colors">
                        ● Save draft
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center text-slate-600 rounded-xl border border-[#1e3a5f] bg-[#0d1f35]">
                  <p>Select an application to review.</p>
                </div>
              )}

              {/* RIGHT: Portfolio density + pipeline */}
              <div className="space-y-3">
                <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Portfolio Density
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Current Coach Mix:
                    <span className="text-white font-semibold ml-1">{totalCoaches} active</span>
                  </p>

                  <div className="space-y-2.5 mb-4">
                    {[
                      { tier: "master", color: "bg-amber-500" },
                      { tier: "elite",  color: "bg-sky-500" },
                      { tier: "pro",    color: "bg-emerald-500" },
                    ].map(({ tier, color }) => {
                      const count = portfolio.find(p => p.tier === tier)?.count ?? 0;
                      const pct = totalCoaches > 0 ? Math.round((count / totalCoaches) * 100) : 0;
                      return (
                        <div key={tier}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400 capitalize">{tier}</span>
                            <span className="text-slate-300 font-semibold">{pct}%</span>
                          </div>
                          <div className="h-2.5 bg-[#1a2f4a] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Saturation / gap alerts */}
                  <div className="space-y-1.5">
                    {saturationAlerts.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-900/30 border border-amber-700/40 text-xs text-amber-300">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {a.label}
                      </div>
                    ))}
                    {gapAlerts.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/40 text-xs text-emerald-300">
                        <TrendingUp className="h-3 w-3 shrink-0" />
                        {a.label}
                      </div>
                    ))}
                    {saturationAlerts.length === 0 && gapAlerts.length === 0 && (
                      <p className="text-xs text-slate-600 italic">Portfolio balanced.</p>
                    )}
                  </div>
                </div>

                {/* Pipeline */}
                <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pipeline</h3>
                  {[
                    { label: "Pending",       status: "pending",            icon: Clock },
                    { label: "AI Analysing",  status: "under_review",       icon: Sparkles },
                    { label: "Approved",      status: "approved",           icon: CheckCircle2 },
                    { label: "Revision",      status: "revision_requested", icon: RefreshCw },
                    { label: "Rejected",      status: "rejected",           icon: XCircle },
                    { label: "Auto-Rejected", status: "auto_rejected",      icon: XCircle },
                  ].map(({ label, status, icon: Icon }) => {
                    const count = applications.filter(a => (a.review_status ?? "pending") === status).length;
                    return (
                      <div key={status} className="flex items-center justify-between py-1.5 border-b border-[#1e3a5f] last:border-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-slate-600" />
                          <span className="text-xs text-slate-400">{label}</span>
                        </div>
                        <span className="text-xs font-bold text-white">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── TAG REVIEW ── */}
            {selected && (
              <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Tags className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">
                      Match Tags
                    </h3>
                    <span className="text-xs text-slate-500">
                      {totalSelected} selected
                    </span>
                  </div>
                  <button
                    onClick={saveTags}
                    disabled={savingTags || !tagsDirty}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                      tagsDirty
                        ? "bg-amber-500 text-[#0a1628] hover:bg-amber-400"
                        : "bg-[#1a2f4a] text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    {savingTags
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Save className="h-3.5 w-3.5" />}
                    {tagsDirty ? "Save tags" : "Saved"}
                  </button>
                </div>

                <p className="text-xs text-slate-500 mb-4">
                  These decide who this coach is surfaced to in search and matching.
                  What the coach chose is pre-selected. Correct it before approving.
                </p>

                {totalSelected === 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-red-950/50 border border-red-900/60 text-xs text-red-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    No tags set. If approved now this coach will not appear under any
                    filter and will never be matched to a coachee.
                  </div>
                )}

                <div className="space-y-4">
                  {TAG_FAMILIES.map(({ family, column, label, single }) => {
                    const options = vocab.filter((t) => t.tag_family === family);
                    if (options.length === 0) return null;
                    const chosen = tagSel[column] ?? [];
                    return (
                      <div key={column}>
                        <div className="flex items-baseline gap-2 mb-2">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {label}
                          </p>
                          {single && (
                            <span className="text-[10px] text-slate-600">pick one</span>
                          )}
                          {chosen.length === 0 && (
                            <span className="text-[10px] text-amber-500/70">none set</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {options.map((t) => {
                            const active = chosen.includes(t.tag_key);
                            return (
                              <button
                                key={t.id}
                                onClick={() => toggleTag(column, t.tag_key, single)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                  active
                                    ? "bg-amber-500/15 border-amber-500/60 text-amber-300 font-semibold"
                                    : "bg-[#0a1628] border-[#1e3a5f] text-slate-500 hover:border-[#2a4a6f] hover:text-slate-300"
                                }`}
                              >
                                {t.tag_label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {tagsDirty && (
                  <p className="mt-4 text-xs text-amber-400/80">
                    Unsaved changes. Save before approving, or they will be lost.
                  </p>
                )}
              </div>
            )}

          </div>
        )}
      </section>
    </AdminLayout>
  );
}
