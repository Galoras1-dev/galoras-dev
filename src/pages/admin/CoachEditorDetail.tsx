import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Clock, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";

const LIFECYCLE_OPTIONS = [
  { value: "draft",             label: "Draft",           color: "text-zinc-400" },
  { value: "submitted",         label: "Submitted",       color: "text-sky-400" },
  { value: "under_review",      label: "Under Review",    color: "text-amber-400" },
  { value: "revision_required", label: "Revision Required", color: "text-orange-400" },
  { value: "approved",          label: "Approved",        color: "text-emerald-400" },
  { value: "published",         label: "Published",       color: "text-emerald-300" },
  { value: "rejected",          label: "Rejected",        color: "text-red-400" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function inputClass() {
  return "w-full bg-[#1a2f4a] border border-[#2a4a6f] text-slate-200 text-sm rounded-xl px-3 py-2.5 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50";
}

function formatTs(ts: string | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

export default function CoachEditorDetail() {
  const { id } = useParams();
  const { toast } = useToast();

  const [coach, setCoach] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [debugError, setDebugError] = useState("");

  useEffect(() => { fetchCoach(); }, [id]);

  const fetchCoach = async () => {
    setLoading(true);
    setDebugError("");
    if (!id) { setDebugError("Missing ID"); setLoading(false); return; }

    const { data, error } = await supabase
      .from("coaches")
      .select(`
        id, display_name, email, headline, bio,
        positioning_statement, methodology, slug,
        status, lifecycle_status, reviewer_notes,
        submitted_at, reviewed_at, published_at, suspended_at,
        tier, avatar_url, booking_url, user_id
      `)
      .eq("id", id)
      .single();

    if (error) { setDebugError(JSON.stringify(error)); setCoach(null); setLoading(false); return; }
    setCoach(data);
    setLoading(false);
  };

  const updateCoach = async () => {
    if (!coach) return;
    setSaving(true);

    // Auto-stamp timestamps based on lifecycle transition
    const now = new Date().toISOString();
    const timestampPatch: Record<string, string | null> = {};
    if (coach.lifecycle_status === "submitted" && !coach.submitted_at) timestampPatch.submitted_at = now;
    if (coach.lifecycle_status === "under_review" && !coach.reviewed_at) timestampPatch.reviewed_at = now;
    if (coach.lifecycle_status === "published" && !coach.published_at) timestampPatch.published_at = now;
    if (coach.lifecycle_status === "rejected" || coach.lifecycle_status === "revision_required") {
      timestampPatch.published_at = null;
    }

    const { error } = await supabase
      .from("coaches")
      .update({
        display_name: coach.display_name,
        headline: coach.headline,
        bio: coach.bio,
        positioning_statement: coach.positioning_statement,
        methodology: coach.methodology,
        slug: coach.slug,
        status: coach.status,
        lifecycle_status: coach.lifecycle_status,
        reviewer_notes: coach.reviewer_notes,
        tier: coach.tier,
        booking_url: coach.booking_url,
        ...timestampPatch,
      })
      .eq("id", coach.id);

    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: "Coach profile updated." });
    fetchCoach();
  };

  if (loading) {
    return (
      <AdminLayout title="Coach Editor">
        <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading coach…</span>
        </div>
      </AdminLayout>
    );
  }

  if (!coach) {
    return (
      <AdminLayout title="Coach Editor">
        <div className="p-8 text-slate-400">
          <Link to="/admin/coaches" className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Coaches
          </Link>
          <p>Coach not found. ID: {id}</p>
          {debugError && <pre className="mt-3 text-xs text-red-400 whitespace-pre-wrap">{debugError}</pre>}
        </div>
      </AdminLayout>
    );
  }

  const currentLifecycle = LIFECYCLE_OPTIONS.find(o => o.value === coach.lifecycle_status);

  return (
    <AdminLayout title="Coach Editor">
      <div className="px-6 pt-5 pb-3 border-b border-[#1e2d45]">
        <Link to="/admin/coaches" className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Coaches
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-white tracking-wide">
              {coach.display_name || "Unnamed Coach"}
            </h2>
            <p className="text-xs text-slate-400">{coach.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {currentLifecycle && (
              <span className={`text-sm font-semibold ${currentLifecycle.color}`}>
                ● {currentLifecycle.label}
              </span>
            )}
            {coach.slug && (
              <a
                href={`/coach/${coach.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[#2a4a6f] px-3 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View live page
              </a>
            )}
            <Button
              onClick={updateCoach}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <section className="p-6 bg-[#0a1628] min-h-full">
        <div className="max-w-3xl space-y-6">

          {/* Timestamps row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Submitted", icon: Clock, value: formatTs(coach.submitted_at) },
              { label: "Reviewed",  icon: Clock, value: formatTs(coach.reviewed_at) },
              { label: "Published", icon: CheckCircle2, value: formatTs(coach.published_at) },
              { label: "Suspended", icon: AlertTriangle, value: formatTs(coach.suspended_at) },
            ].map(({ label, icon: Icon, value }) => (
              <div key={label} className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3 w-3 text-slate-500" />
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{label}</span>
                </div>
                <p className="text-xs text-slate-300 font-medium">{value}</p>
              </div>
            ))}
          </div>

          {/* Core identity */}
          <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Display Name">
                <input
                  value={coach.display_name || ""}
                  onChange={(e) => setCoach({ ...coach, display_name: e.target.value })}
                  className={inputClass()}
                />
              </Field>
              <Field label="Slug">
                <input
                  value={coach.slug || ""}
                  onChange={(e) => setCoach({ ...coach, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                  className={inputClass()}
                  placeholder="e.g. coach-name"
                />
              </Field>
            </div>
            <Field label="Headline">
              <input
                value={coach.headline || ""}
                onChange={(e) => setCoach({ ...coach, headline: e.target.value })}
                className={inputClass()}
              />
            </Field>
            <Field label="Booking URL">
              <input
                value={coach.booking_url || ""}
                onChange={(e) => setCoach({ ...coach, booking_url: e.target.value })}
                className={inputClass()}
                placeholder="https://calendly.com/..."
              />
            </Field>
          </div>

          {/* Status & Tier */}
          <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status & Tier</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Lifecycle Status">
                <select
                  value={coach.lifecycle_status || "draft"}
                  onChange={(e) => setCoach({ ...coach, lifecycle_status: e.target.value })}
                  className={inputClass()}
                >
                  {LIFECYCLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tier">
                <select
                  value={coach.tier || ""}
                  onChange={(e) => setCoach({ ...coach, tier: e.target.value })}
                  className={inputClass()}
                >
                  <option value="">— unset —</option>
                  <option value="pro">Pro</option>
                  <option value="elite">Elite</option>
                  <option value="master">Master</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Reviewer Notes */}
          <div className="rounded-xl border border-amber-700/30 bg-amber-950/20 p-5 space-y-3">
            <h3 className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider">
              Reviewer Notes
              <span className="ml-2 text-slate-500 normal-case font-normal">(internal — not visible to coach)</span>
            </h3>
            <textarea
              value={coach.reviewer_notes || ""}
              onChange={(e) => setCoach({ ...coach, reviewer_notes: e.target.value })}
              rows={4}
              placeholder="Add assessment notes, feedback rationale, or flagged concerns…"
              className={`${inputClass()} resize-none border-amber-700/30 focus:ring-amber-500/50`}
            />
          </div>

          {/* Profile content */}
          <div className="rounded-xl border border-[#1e3a5f] bg-[#0d1f35] p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Profile Content</h3>
            <Field label="Bio">
              <textarea
                value={coach.bio || ""}
                onChange={(e) => setCoach({ ...coach, bio: e.target.value })}
                rows={5}
                className={`${inputClass()} resize-vertical`}
              />
            </Field>
            <Field label="Positioning Statement">
              <textarea
                value={coach.positioning_statement || ""}
                onChange={(e) => setCoach({ ...coach, positioning_statement: e.target.value })}
                rows={4}
                className={`${inputClass()} resize-vertical`}
              />
            </Field>
            <Field label="Methodology">
              <textarea
                value={coach.methodology || ""}
                onChange={(e) => setCoach({ ...coach, methodology: e.target.value })}
                rows={4}
                className={`${inputClass()} resize-vertical`}
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={updateCoach}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}
